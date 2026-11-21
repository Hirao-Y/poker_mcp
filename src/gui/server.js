// gui/server.js - Web GUI（poker-gui）の HTTP サーバ
//
//   GET  /                     シェル画面（src/gui/public/index.html）
//   GET  /app/<file>           シェル画面の JS・CSS（src/gui/public）
//   GET  /html/<path>          POKER のインストール先の html（エディタ・3D・グラフ。配布版をそのまま）
//   GET  /api/info             版・作業フォルダ・html の有無
//   GET  /api/files?dir=       作業フォルダの中の一覧
//   GET  /api/file?path=       ファイルを読む（作業フォルダの中だけ）
//   PUT  /api/file?path=       入力（.yaml / .yml）を保存する
//   POST /api/validate         {text} → 検査の結果
//   POST /api/geometry         {text, polygon} → 3D 表示の JS
//   POST /api/run              {path, mode: all|trace} → ジョブ
//   GET  /api/jobs/:id         ジョブの状態（画面が 0.5 秒ごとに読む）
//   POST /api/jobs/:id/cancel  取り消し
//
// /api はトークン必須。すべての要求で Host・Origin・Sec-Fetch-Site を検査する（security.js）。
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkRequestSource, checkToken, resolveInside, PAGE_HEADERS } from './security.js';
import { validateText, geometryJs, runCui, JobRunner } from './pokerRunner.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MAX_BODY = 20 * 1024 * 1024;        // 入力の YAML の上限
const MAX_READ = 50 * 1024 * 1024;        // 読み出すファイル（サマリーなど）の上限
const LIST_EXT = new Set(['.yaml', '.yml', '.summary', '.dose', '.txt', '.paths']);
const WRITE_EXT = new Set(['.yaml', '.yml']);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json; charset=utf-8',
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

/**
 * @param {{port:number, token:string, workspace:string, htmlDir:string, cui:string}} cfg  workspace は realpath 済み
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

      if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveStatic(res, PUBLIC_DIR, 'index.html');
      if (req.method === 'GET' && p.startsWith('/app/')) return serveStatic(res, PUBLIC_DIR, p.slice(5));
      if (req.method === 'GET' && p.startsWith('/html/')) return serveStatic(res, cfg.htmlDir, p.slice(6));
      if (!p.startsWith('/api/')) return fail(res, 404, 'not found');

      if (!checkToken(req, cfg.token)) return fail(res, 401, 'unauthorized');

      if (req.method === 'GET' && p === '/api/info') {
        if (version === null) {
          try { const r = await runCui(cfg.cui, ['-v'], { timeoutMs: 15000 }); version = (r.stdout.match(/version:\s*(\S+)/) || [])[1] || ''; }
          catch { version = ''; }
        }
        return sendJson(res, 200, {
          version, workspace: cfg.workspace, html: fs.existsSync(path.join(cfg.htmlDir, '3D_view', 'view.html')),
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
        const { text } = await readJson(req);
        return sendJson(res, 200, await validateText(cfg.cui, String(text ?? '')));
      }

      if (req.method === 'POST' && p === '/api/geometry') {
        const { text, polygon } = await readJson(req);
        return sendJson(res, 200, await geometryJs(cfg.cui, String(text ?? ''), String(polygon || 'low')));
      }

      if (req.method === 'POST' && p === '/api/run') {
        const body = await readJson(req);
        const abs = resolveInside(cfg.workspace, String(body.path || ''));
        if (!WRITE_EXT.has(path.extname(abs).toLowerCase()) || !fs.existsSync(abs)) return fail(res, 400, 'save the input (.yaml) first');
        const job = jobs.start(abs, body.mode === 'trace' ? 'trace' : 'all');
        return sendJson(res, 200, { id: job.id });
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
