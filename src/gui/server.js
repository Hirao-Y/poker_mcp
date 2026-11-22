// gui/server.js - Web GUI（poker-gui）の HTTP サーバ
//
//   GET  /                     シェル画面（src/gui/public/index.html）
//   GET  /app/<file>           シェル画面の JS・CSS（src/gui/public）
//   GET  /html/<path>          Web GUI 用の画面ファイル（POKER の webgui_html：エディタ・3D・グラフ）
//   GET  /api/info             版・作業フォルダ・html の有無
//   GET  /api/files?dir=       作業フォルダの中の一覧
//   GET  /api/file?path=       ファイルを読む（作業フォルダの中だけ）
//   PUT  /api/file?path=       入力（.yaml / .yml）を保存する
//   POST /api/validate         {text} → 検査の結果
//   POST /api/geometry         {text, polygon} → 3D 表示の JS
//   POST /api/run              {path, mode: all|trace} → ジョブ
//   GET  /api/jobs/:id         ジョブの状態（画面が 0.5 秒ごとに読む）
//   POST /api/jobs/:id/cancel  取り消し
//   GET  /api/dose/info?path=  .dose の見出し（検出器・線量の種類・線種・線源・エネルギ）    ┐ 線量表示（Windows の GUI の
//   GET  /api/dose/view?path=&det=&dose=&ray=&src=&energy=&plane=&slice=&yaxis=  図・グラフの JS │ Form_線量表示。doseFile.js）
//   GET  /api/dose/csv?…       「線量保存」の CSV                                                ┘
//   GET  /api/names            材料リスト・核種リスト（libLists.js）
//   POST /api/parse            {text, scalars?} → 入力の節を YAML として読んだもの（入力ダイアログが今の中身を読むため）
//
// /api はトークン必須。すべての要求で Host・Origin・Sec-Fetch-Site を検査する（security.js）。
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkRequestSource, checkToken, resolveInside, PAGE_HEADERS } from './security.js';
import { validateText, geometryJs, runCui, JobRunner } from './pokerRunner.js';
import { loadDose, headerView, doseView, doseCsv } from './doseFile.js';
import { libLists } from './libLists.js';
import yaml from 'js-yaml';

// シェル画面のファイル。1 ファイルの実行ファイル（Node SEA、poker_gui_sea.js）では、実行ファイルに埋めたものを
// globalThis.__POKER_GUI_PUBLIC（名前 → Buffer の Map）で受け取る。それ以外はこのファイルの隣の public/
const PUBLIC_FILES = globalThis.__POKER_GUI_PUBLIC instanceof Map ? globalThis.__POKER_GUI_PUBLIC : null;
const PUBLIC_DIR = PUBLIC_FILES ? null : path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MAX_BODY = 20 * 1024 * 1024;        // 入力の YAML の上限
const MAX_READ = 50 * 1024 * 1024;        // 読み出すファイル（サマリーなど）の上限
const LIST_EXT = new Set(['.yaml', '.yml', '.summary', '.dose', '.txt', '.paths']);
const WRITE_EXT = new Set(['.yaml', '.yml']);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',   // 3D 表示の組み合わせ立体（Manifold、viewer3d/manifold/）
};

function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { 'Cache-Control': 'no-store', ...PAGE_HEADERS, ...headers });
  res.end(body);
}
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
const fail = (res, status, message) => sendJson(res, status, { error: message });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('body too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req) {
  try { return JSON.parse(await readBody(req)); }
  catch (e) { throw Object.assign(new Error(e.status ? e.message : 'invalid JSON'), { status: e.status || 400 }); }
}

/** base の中のファイルを配る（base の外・隠しファイルは 404） */
function serveStatic(res, base, rel) {
  const abs = path.resolve(base, rel);
  if (!(abs === base || abs.startsWith(base + path.sep)) || rel.split('/').some(s => s.startsWith('.'))) return fail(res, 404, 'not found');
  let st;
  try { st = fs.statSync(abs); } catch { return fail(res, 404, 'not found'); }
  if (!st.isFile()) return fail(res, 404, 'not found');
  const type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
  send(res, 200, fs.readFileSync(abs), { 'Content-Type': type });
}

/** シェル画面のファイルを配る（実行ファイルに埋めたもの、または public/） */
function servePublic(res, rel) {
  if (!PUBLIC_FILES) return serveStatic(res, PUBLIC_DIR, rel);
  const buf = PUBLIC_FILES.get(rel);
  if (!buf) return fail(res, 404, 'not found');
  send(res, 200, buf, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream' });
}

/**
 * @param {{port:number, token:string, workspace:string, htmlDir:string, cui:string, libDir?:string}} cfg  workspace は realpath 済み
 *   libDir は POKER の lib（既定は poker_cui と同じ場所の lib）
 */
export function createGuiServer(cfg) {
  const jobs = new JobRunner(cfg.cui);
  let version = null;

  const server = http.createServer(async (req, res) => {
    try {
      const port = server.address().port;
      const reason = checkRequestSource(req, port);
      if (reason) return fail(res, 403, reason);

      const url = new URL(req.url, 'http://local');
      const p = decodeURIComponent(url.pathname);

      if (req.method === 'GET' && (p === '/' || p === '/index.html')) return servePublic(res, 'index.html');
      if (req.method === 'GET' && p.startsWith('/app/')) return servePublic(res, p.slice(5));
      if (req.method === 'GET' && p.startsWith('/html/')) return serveStatic(res, cfg.htmlDir, p.slice(6));
      if (!p.startsWith('/api/')) return fail(res, 404, 'not found');

      if (!checkToken(req, cfg.token)) return fail(res, 401, 'unauthorized');

      if (req.method === 'GET' && p === '/api/info') {
        if (version === null) {
          try { const r = await runCui(cfg.cui, ['-v'], { timeoutMs: 15000 }); version = (r.stdout.match(/version:\s*(\S+)/) || [])[1] || ''; }
          catch { version = ''; }
        }
        return sendJson(res, 200, {
          version, workspace: cfg.workspace, html: fs.existsSync(path.join(cfg.htmlDir, 'viewer3d', 'viewer3d.html')),
          busy: jobs.busy(),
        });
      }

      if (req.method === 'GET' && p === '/api/files') {
        const dir = resolveInside(cfg.workspace, url.searchParams.get('dir') || '');
        const entries = fs.readdirSync(dir, { withFileTypes: true })
          .filter(e => !e.name.startsWith('.'))
          .filter(e => e.isDirectory() || LIST_EXT.has(path.extname(e.name).toLowerCase()))
          .map(e => {
            const st = fs.statSync(path.join(dir, e.name));
            return { name: e.name, dir: e.isDirectory(), size: st.size, mtime: st.mtime.toISOString() };
          })
          .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
        return sendJson(res, 200, { dir: path.relative(cfg.workspace, dir).split(path.sep).join('/'), entries });
      }

      if (p === '/api/file') {
        const rel = url.searchParams.get('path') || '';
        const abs = resolveInside(cfg.workspace, rel);
        if (req.method === 'GET') {
          const st = fs.statSync(abs);
          if (!st.isFile()) return fail(res, 400, 'not a file');
          if (st.size > MAX_READ) return fail(res, 413, 'file too large');
          return send(res, 200, fs.readFileSync(abs), { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        if (req.method === 'PUT') {
          if (!WRITE_EXT.has(path.extname(abs).toLowerCase())) return fail(res, 400, 'only .yaml / .yml can be saved');
          const text = await readBody(req);
          fs.writeFileSync(abs, text, 'utf8');
          return sendJson(res, 200, { saved: path.relative(cfg.workspace, abs).split(path.sep).join('/') });
        }
        return fail(res, 405, 'method not allowed');
      }

      if (req.method === 'POST' && p === '/api/validate') {
        const { text, lang } = await readJson(req);
        return sendJson(res, 200, await validateText(cfg.cui, String(text ?? ''), lang));
      }

      if (req.method === 'POST' && p === '/api/geometry') {
        const { text, polygon, lang } = await readJson(req);
        return sendJson(res, 200, await geometryJs(cfg.cui, String(text ?? ''), String(polygon || 'low'), lang));
      }

      if (req.method === 'POST' && p === '/api/run') {
        const body = await readJson(req);
        const abs = resolveInside(cfg.workspace, String(body.path || ''));
        if (!WRITE_EXT.has(path.extname(abs).toLowerCase()) || !fs.existsSync(abs)) return fail(res, 400, 'save the input (.yaml) first');
        const job = jobs.start(abs, body.mode === 'trace' ? 'trace' : 'all', body.lang);
        return sendJson(res, 200, { id: job.id });
      }

      if (req.method === 'GET' && /^\/api\/dose\/(info|view|csv)$/.test(p)) {
        const abs = resolveInside(cfg.workspace, url.searchParams.get('path') || '');
        if (path.extname(abs).toLowerCase() !== '.dose') return fail(res, 400, 'not a .dose file');
        const d = await loadDose(abs);
        if (p === '/api/dose/info') return sendJson(res, 200, headerView(d));
        const int = (k) => { const v = parseInt(url.searchParams.get(k) ?? '0', 10); return Number.isInteger(v) ? v : 0; };
        const sel = { det: int('det'), dose: int('dose'), ray: int('ray'), src: int('src'), energy: int('energy'),
          plane: int('plane'), slice: int('slice'), yaxis: url.searchParams.get('yaxis') === 'log' ? 'log' : 'linear' };
        if (p === '/api/dose/view') return sendJson(res, 200, doseView(d, sel));
        return send(res, 200, doseCsv(d, sel), { 'Content-Type': 'text/csv; charset=utf-8' });
      }

      if (req.method === 'POST' && p === '/api/parse') {
        const { text, scalars } = await readJson(req);
        const opts = scalars === 'text' ? { schema: yaml.FAILSAFE_SCHEMA } : {};   // text：値を文字のまま（数・真偽に直さない）
        try { return sendJson(res, 200, { doc: yaml.load(String(text ?? ''), opts) ?? null }); }
        catch (e) { return sendJson(res, 200, { error: String(e.message || e).split('\n')[0] }); }
      }

      if (req.method === 'GET' && p === '/api/names') {
        return sendJson(res, 200, await libLists(cfg.cui, cfg.libDir || path.join(path.dirname(cfg.cui), 'lib')));
      }

      const m = /^\/api\/jobs\/([0-9a-f]{16})(\/cancel)?$/.exec(p);
      if (m) {
        const job = jobs.jobs.get(m[1]);
        if (!job) return fail(res, 404, 'no such job');
        if (m[2] && req.method === 'POST') return sendJson(res, 200, { canceled: jobs.cancel(job.id) });
        if (!m[2] && req.method === 'GET') {
          const v = jobs.view(job);
          const rel = (a) => path.relative(cfg.workspace, a).split(path.sep).join('/');
          return sendJson(res, 200, { ...v, input: rel(v.input), summary: rel(v.summary), dose: rel(v.dose) });
        }
      }
      return fail(res, 404, 'not found');
    } catch (e) {
      const status = e.status || (e.code === 'ENOENT' ? 404 : e instanceof URIError ? 400 : 500);
      if (status === 500) console.error('poker-gui:', e);
      return fail(res, status, status === 500 ? 'internal error' : e.message);
    }
  });
  server.requestTimeout = 0;
  server.headersTimeout = 60000;
  return server;
}
