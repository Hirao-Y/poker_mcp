// gui/pokerRunner.js - Web GUI から poker_cui を呼ぶ
//
// 起動するのは poker_cui だけ。引数は決まった組み合わせから作り、シェルを通さない（spawn の配列渡し）。
//   検査   : poker_cui <tmp.yaml> --validate --format=yaml
//   3D 表示: poker_cui <tmp.yaml> --babylon --polygon=<low|middle|high>   （POKER の段階 0 で追加したオプション）
//   計算   : poker_cui <入力> -a --progress -o <入力>.summary -d <入力>.dose      （全て）
//            poker_cui <入力> -c -p -s --progress -o <入力>.summary           （透視線のみ）
// 編集中のテキストを検査・描画するときは一時フォルダに書いてから呼び、終わったら消す。
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';

const MAX_OUT = 64 * 1024 * 1024;   // 標準出力の上限（3D の JS は 10 万点で数 MB）

/**
 * poker_cui を 1 回起動して終わるのを待つ。
 * @returns {Promise<{code:number|null, stdout:string, stderr:string, timedOut:boolean}>}
 */
export function runCui(cui, args, { cwd, timeoutMs = 120000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cui, args, { cwd, env, windowsHide: true, shell: false });
    const out = []; const err = []; let size = 0; let timedOut = false;
    child.stdout.on('data', (c) => { size += c.length; if (size <= MAX_OUT) out.push(c); else child.kill(); });
    child.stderr.on('data', (c) => err.push(c));
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), timedOut });
    });
  });
}

/** 編集中のテキストを一時フォルダの input.yaml に書き、fn(そのパス) を呼んで、終わったらフォルダごと消す */
async function withTempYaml(text, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'poker-gui-'));
  const file = path.join(dir, 'input.yaml');
  try {
    fs.writeFileSync(file, text, 'utf8');
    return await fn(file, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** --validate の結果（YAML）を、画面で使う形に直す */
export function parseValidateYaml(text) {
  let doc;
  try { doc = yaml.load(text); } catch { return null; }
  if (!doc || typeof doc !== 'object') return null;
  const issues = Array.isArray(doc.issues) ? doc.issues.map(i => ({
    severity: String(i.severity || ''),
    line: Number.isInteger(i.line) ? i.line : null,
    column: Number.isInteger(i.column) ? i.column : null,
    path: i.path ? String(i.path) : '',
    message: String(i.message || ''),
    hint: i.hint ? String(i.hint) : '',
  })) : [];
  return { ok: doc.ok === true, stage: doc.stage ? String(doc.stage) : '', summary: doc.summary || {}, note: doc.note ? String(doc.note) : '', issues };
}

export async function validateText(cui, text) {
  return withTempYaml(text, async (file, dir) => {
    const r = await runCui(cui, [file, '--validate', '--format=yaml'], { cwd: dir, timeoutMs: 60000 });
    const parsed = parseValidateYaml(r.stdout);
    return { exitCode: r.code, result: parsed, raw: parsed ? undefined : (r.stdout + r.stderr) };
  });
}

const POLYGONS = ['low', 'middle', 'high'];

export async function geometryJs(cui, text, polygon = 'low') {
  const q = POLYGONS.includes(polygon) ? polygon : 'low';
  return withTempYaml(text, async (file, dir) => {
    const r = await runCui(cui, [file, '--babylon', `--polygon=${q}`], { cwd: dir, timeoutMs: 180000 });
    if (r.code !== 0) return { exitCode: r.code, error: (r.stderr || r.stdout).trim() || `poker_cui exited with ${r.code}` };
    return { exitCode: 0, js: r.stdout };
  });
}

/**
 * 計算（同時に 1 つだけ）。状態は画面から GET /api/jobs/:id で読む。
 *   status: running | done | failed | canceled
 *   stage/percent: --progress の最後の値（中性子のデッキは進み具合を出さないので null のまま）
 */
export class JobRunner {
  constructor(cui) {
    this.cui = cui;
    this.jobs = new Map();
    this.current = null;
  }

  busy() { return Boolean(this.current); }

  start(inputAbs, mode) {
    if (this.current) throw Object.assign(new Error('another calculation is running'), { status: 409 });
    const id = crypto.randomBytes(8).toString('hex');
    const summary = `${inputAbs}.summary`;
    const dose = `${inputAbs}.dose`;
    // 入力のフォルダで、ファイル名だけを渡す（サマリーの input_file がファイル名になる。コマンドラインで計算したときと同じ）
    const b = path.basename(inputAbs);
    const args = mode === 'trace'
      ? [b, '-c', '-p', '-s', '--progress', '-o', `${b}.summary`]
      : [b, '-a', '--progress', '-o', `${b}.summary`, '-d', `${b}.dose`];
    const job = {
      id, mode: mode === 'trace' ? 'trace' : 'all', input: inputAbs, summary, dose,
      status: 'running', stage: null, percent: null, exitCode: null,
      startedAt: new Date().toISOString(), finishedAt: null, log: [], child: null,
    };
    const child = spawn(this.cui, args, { cwd: path.dirname(inputAbs), windowsHide: true, shell: false });
    job.child = child;
    let buf = '';
    child.stderr.on('data', (c) => {
      buf += c.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1);
        const m = /^progress: (\w+) (\d+)$/.exec(line);
        if (m) { job.stage = m[1]; job.percent = Number(m[2]); }
        else if (line.trim()) { job.log.push(line); if (job.log.length > 200) job.log.shift(); }
      }
    });
    child.stdout.on('data', () => {});   // サマリーはファイルに書かれる。標準出力は捨てる
    child.on('error', (e) => { job.status = 'failed'; job.log.push(String(e.message)); this._finish(job, null); });
    child.on('close', (code) => {
      if (job.status === 'running') job.status = (code === 0 || code === 1) ? 'done' : 'failed';
      this._finish(job, code);
    });
    this.jobs.set(id, job);
    this.current = job;
    return job;
  }

  _finish(job, code) {
    if (job.finishedAt) return;
    job.exitCode = code;
    job.finishedAt = new Date().toISOString();
    job.child = null;
    if (this.current === job) this.current = null;
  }

  cancel(id) {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'running' || !job.child) return false;
    job.status = 'canceled';
    job.child.kill();
    return true;
  }

  view(job) {
    const { child, ...rest } = job;
    return rest;
  }
}
