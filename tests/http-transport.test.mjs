// tests/http-transport.test.mjs - HTTP の入口（mcp_server_http.js）の検証
//
//   1. 設定の判定 resolveHttpConfig: 外から届く設定でトークンが無ければ起動しない、など
//   2. トークンなし（127.0.0.1 だけ）: ツール一覧が stdio 版と同じ、計算結果も stdio 版と同じ。
//      空白を含むパスの YAML も計算できる
//   3. 守り: 知らない Host、ブラウザ（Origin 付き）、GET、壊れた JSON を拒否する
//   4. トークンあり: 無し・誤りは 401、正しければ通る。許可した外の Host 名も通る
//   5. 外から届く設定でトークンが無いと、起動せずに終わる（終了コード 2）
//   6. 非同期ジョブを HTTP 越しに使う（投入 → 状態 → 結果）
//
// 実行: npm run test:http （POKER 本体が必要。POKER_INSTALL_PATH 既定 C:/Poker）
// 待ち受けは 127.0.0.1 だけ（Windows のファイアウォールの確認は出ない）。
// いずれかが失敗すると終了コード 1 で終わる。

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const ROOT = process.cwd();
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const T = path.join(os.tmpdir(), 'poker_test_http_ws');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'tasks'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'tools/samples/article_fillet/poker.yaml'), path.join(T, 'tasks', 'fillet.yaml'));
const INSTALL = process.env.POKER_INSTALL_PATH || 'C:/Poker';
const TOKEN = 'test-token-0123456789abcdef0123456789';
const OPTS = { show_total_dose: true, show_source_data: false };

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  OK ' : '  NG '} ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function baseEnv(extra = {}) {
  const e = { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: INSTALL };
  for (const k of Object.keys(e)) if (k.startsWith('POKER_MCP_HTTP_') || k === 'POKER_MCP_ASYNC' || k === 'POKER_MCP_GUI') delete e[k];
  return Object.assign(e, extra);
}

/** HTTP 版を起動し、待ち受けたポートを返す。起動に失敗したら終了コードを返す。 */
function startHttp(env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'src/mcp_server_http.js')], {
      env: baseEnv({ POKER_MCP_HTTP_PORT: '0', ...env }), stdio: ['ignore', 'ignore', 'pipe']
    });
    let err = '';
    const timer = setTimeout(() => { child.kill(); resolve({ child, port: null, exitCode: null, stderr: err }); }, 30000);
    child.stderr.on('data', (d) => {
      err += d.toString();
      const m = /listening on http:\/\/[^:]+:(\d+)\/mcp/.exec(err);
      if (m) { clearTimeout(timer); resolve({ child, port: Number(m[1]), exitCode: null, stderr: err }); }
    });
    child.on('exit', (code) => { clearTimeout(timer); resolve({ child, port: null, exitCode: code, stderr: err }); });
  });
}

async function httpClient(port, token) {
  const opts = token ? { requestInit: { headers: { Authorization: `Bearer ${token}` } } } : {};
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), opts);
  const client = new Client({ name: 'http-test', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

async function stdioClient(env = {}) {
  const transport = new StdioClientTransport({
    command: process.execPath, args: [path.join(ROOT, 'src/mcp_server_stdio_v4.js')], env: baseEnv(env), stderr: 'ignore'
  });
  const client = new Client({ name: 'http-test-stdio', version: '0.1.0' });
  await client.connect(transport);
  return client;
}

async function call(c, name, args) {
  const r = await c.callTool({ name, arguments: args }, undefined, { timeout: 600000 });
  return { isError: !!r.isError, j: JSON.parse(r.content[0].text) };
}

/** 生の HTTP 要求（Host や Origin を自由に付けるため fetch ではなく http.request） */
function raw(port, { method = 'POST', pathname = '/mcp', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: pathname, headers }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}
const LIST = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
const MCP_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

// ------------------------------------------------------------------ 1. 設定の判定
console.log('1. 設定の判定 resolveHttpConfig');
{
  const { resolveHttpConfig, hostnameOf } = await import(pathToFileURL(path.join(ROOT, 'src/utils/httpConfig.js')).href);
  const ok = (env) => resolveHttpConfig(env).errors.length === 0;

  const d = resolveHttpConfig({});
  check('既定は 127.0.0.1:3939、トークンなしで可', ok({}) && d.host === '127.0.0.1' && d.port === 3939 && !d.exposed);
  check('0.0.0.0 でトークンなしは不可', !ok({ POKER_MCP_HTTP_HOST: '0.0.0.0' }));
  check('0.0.0.0 でトークンありは可', ok({ POKER_MCP_HTTP_HOST: '0.0.0.0', POKER_MCP_HTTP_TOKEN: TOKEN }));
  check('外の Host 名を許してトークンなしは不可（トンネル経由の素通しを防ぐ）',
    !ok({ POKER_MCP_HTTP_ALLOWED_HOSTS: 'poker.example.com' }));
  check('外の Host 名 + トークンは可',
    ok({ POKER_MCP_HTTP_ALLOWED_HOSTS: 'poker.example.com', POKER_MCP_HTTP_TOKEN: TOKEN }));
  check('短いトークンは不可', !ok({ POKER_MCP_HTTP_TOKEN: 'short' }));
  check('不正なポートは不可', !ok({ POKER_MCP_HTTP_PORT: '70000' }) && !ok({ POKER_MCP_HTTP_PORT: 'abc' }));
  check('Host ヘッダからポートを外す',
    hostnameOf('Poker.Example.com:443') === 'poker.example.com' && hostnameOf('[::1]:3939') === '[::1]' &&
    hostnameOf('localhost') === 'localhost');
}

// ------------------------------------------------------------------ 2. トークンなし
console.log('2. トークンなし（127.0.0.1 だけ）: stdio 版と同じに動く');
let srv = await startHttp({});
check('起動した', !!srv.port, srv.port ? `port ${srv.port}` : srv.stderr.trim());
if (srv.port) {
  const h = await raw(srv.port, { method: 'GET', pathname: '/health' });
  const hj = JSON.parse(h.body);
  check('/health は 200 で版を返す', h.status === 200 && hj.status === 'ok' && hj.version === PKG.version, h.body);

  const hc = await httpClient(srv.port);
  const sc = await stdioClient();
  check('serverInfo の版が package.json と同じ', hc.getServerVersion()?.version === PKG.version);
  const ht = (await hc.listTools()).tools.map((t) => t.name).sort();
  const st = (await sc.listTools()).tools.map((t) => t.name).sort();
  check('ツール一覧が stdio 版と同じ', JSON.stringify(ht) === JSON.stringify(st), `(${ht.length} 個)`);

  const rh = await call(hc, 'poker_executeCalculation', { yaml_file: 'fillet.yaml', summary_options: OPTS });
  const rs = await call(sc, 'poker_executeCalculation', { yaml_file: 'fillet.yaml', summary_options: OPTS });
  check('HTTP 経由の計算が成功', !rh.isError && rh.j.success === true && rh.j.result_total?.length === 3);
  check('計算結果（result_total）が stdio 版と同じ',
    JSON.stringify(rh.j.result_total) === JSON.stringify(rs.j.result_total));

  const bad = await hc.callTool({ name: 'poker_executeCalculation', arguments: { yaml_file: 'no_such.yaml' } })
    .then((r) => ({ isError: !!r.isError })).catch((e) => ({ thrown: e.message }));
  check('誤りも stdio 版と同じ形で返る', bad.isError === true || !!bad.thrown, JSON.stringify(bad).slice(0, 80));

  // 空白を含むパス（v1.11.0 で POKER_CUI の起動から shell を外した。以前は計算できなかった）
  const spaceDir = path.join(T, 'dir with space');
  fs.mkdirSync(spaceDir, { recursive: true });
  const spaceYaml = path.join(spaceDir, 'fillet.yaml').replace(/\\/g, '/');
  fs.copyFileSync(path.join(T, 'tasks', 'fillet.yaml'), spaceYaml);
  const rsp = await call(hc, 'poker_executeCalculation', { yaml_file: spaceYaml, summary_options: OPTS });
  check('空白を含むパスの YAML も計算できる', !rsp.isError && rsp.j.success === true &&
    JSON.stringify(rsp.j.result_total) === JSON.stringify(rs.j.result_total), rsp.isError ? rsp.j.error?.message || '' : '');

  // 同時に 2 つのクライアント
  const hc2 = await httpClient(srv.port);
  const [a, b] = await Promise.all([hc.listTools(), hc2.listTools()]);
  check('2 つのクライアントから同時に使える', a.tools.length === b.tools.length && a.tools.length === ht.length);
  await hc2.close();
  await hc.close();
  await sc.close();

  // ------------------------------------------------------------------ 3. 守り
  console.log('3. 守り');
  const evil = await raw(srv.port, { headers: { ...MCP_HEADERS, Host: 'evil.example.com' }, body: LIST });
  check('知らない Host は 403', evil.status === 403, `${evil.status}`);
  const org = await raw(srv.port, { headers: { ...MCP_HEADERS, Origin: 'https://evil.example.com' }, body: LIST });
  check('Origin 付き（ブラウザから）は 403', org.status === 403, `${org.status}`);
  const get = await raw(srv.port, { method: 'GET', headers: { Accept: 'text/event-stream' } });
  check('GET /mcp は 405', get.status === 405, `${get.status}`);
  const broken = await raw(srv.port, { headers: MCP_HEADERS, body: '{not json' });
  check('壊れた JSON は 400', broken.status === 400, `${broken.status}`);
  const nf = await raw(srv.port, { method: 'GET', pathname: '/other' });
  check('ほかのパスは 404', nf.status === 404, `${nf.status}`);
}
srv.child?.kill();

// ------------------------------------------------------------------ 4. トークンあり
console.log('4. トークンあり（外の Host 名 poker.example.test を許可）');
srv = await startHttp({ POKER_MCP_HTTP_TOKEN: TOKEN, POKER_MCP_HTTP_ALLOWED_HOSTS: 'poker.example.test' });
check('起動した', !!srv.port, srv.port ? `port ${srv.port}` : srv.stderr.trim());
if (srv.port) {
  const none = await raw(srv.port, { headers: MCP_HEADERS, body: LIST });
  check('トークンなしは 401', none.status === 401 && /Bearer/.test(none.headers['www-authenticate'] || ''), `${none.status}`);
  const wrong = await raw(srv.port, { headers: { ...MCP_HEADERS, Authorization: `Bearer ${TOKEN}x` }, body: LIST });
  check('誤ったトークンは 401', wrong.status === 401, `${wrong.status}`);
  const ext = await raw(srv.port, {
    headers: { ...MCP_HEADERS, Authorization: `Bearer ${TOKEN}`, Host: 'poker.example.test:443' }, body: LIST
  });
  check('許可した外の Host 名 + 正しいトークンは通る', ext.status === 200 && JSON.parse(ext.body).result?.tools?.length > 0,
    `${ext.status}`);
  const evil = await raw(srv.port, {
    headers: { ...MCP_HEADERS, Authorization: `Bearer ${TOKEN}`, Host: 'evil.example.com' }, body: LIST
  });
  check('許可していない Host はトークンがあっても 403', evil.status === 403, `${evil.status}`);

  let rejected = false;
  try { await httpClient(srv.port); } catch { rejected = true; }
  check('SDK のクライアントもトークンなしでは接続できない', rejected);
  const c = await httpClient(srv.port, TOKEN);
  const { tools } = await c.listTools();
  check('正しいトークンなら SDK のクライアントで使える', tools.length > 0, `(${tools.length} 個)`);
  await c.close();
}
srv.child?.kill();

// ------------------------------------------------------------------ 5. 起動を拒む設定
console.log('5. 外から届く設定でトークンなし');
for (const env of [{ POKER_MCP_HTTP_HOST: '0.0.0.0' }, { POKER_MCP_HTTP_ALLOWED_HOSTS: 'poker.example.test' }]) {
  const s = await startHttp(env);
  check(`${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ')} は起動しない（終了コード 2）`,
    !s.port && s.exitCode === 2, `exit=${s.exitCode}`);
  s.child?.kill();
}

// ------------------------------------------------------------------ 6. 非同期ジョブ
console.log('6. 非同期ジョブを HTTP 越しに使う');
srv = await startHttp({ POKER_MCP_ASYNC: '1', POKER_MCP_HTTP_TOKEN: TOKEN });
check('起動した', !!srv.port, srv.port ? `port ${srv.port}` : srv.stderr.trim());
if (srv.port) {
  const c = await httpClient(srv.port, TOKEN);
  const sub = await call(c, 'poker_submitCalculation', { yaml_file: 'fillet.yaml', summary_options: OPTS });
  check('ジョブを受け付け', !sub.isError && !!sub.j.job_id, sub.j.job_id);
  let status = '';
  const t0 = Date.now();
  while (Date.now() - t0 < 300000) {
    status = (await call(c, 'poker_getJobStatus', { job_id: sub.j.job_id })).j.status;
    if (status === 'succeeded' || status === 'failed') break;
    await sleep(300);
  }
  check('ジョブが完了', status === 'succeeded', status);
  const res = await call(c, 'poker_getJobResult', { job_id: sub.j.job_id });
  const sc = await stdioClient();
  const sync = await call(sc, 'poker_executeCalculation', { yaml_file: 'fillet.yaml', summary_options: OPTS });
  await sc.close();
  check('ジョブの結果が同期の計算と同じ',
    res.j.ready === true && JSON.stringify(res.j.result_total) === JSON.stringify(sync.j.result_total));
  await c.close();
}
srv.child?.kill();

console.log(failures === 0 ? '\nすべて合格' : `\n${failures} 件が不合格`);
process.exit(failures === 0 ? 0 : 1);
