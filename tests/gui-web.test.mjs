// tests/gui-web.test.mjs - Web GUI（poker-gui）のサーバの検証
//
//   1. 守り: 知らない Host、他のオリジン、cross-site、トークン無し・誤り、作業フォルダの外（..・絶対パス・
//      シンボリックリンク）、.yaml 以外の保存を拒否する
//   2. 働き（poker_cui があるとき）: 版、保存と読み込み、検査、3D 表示の JS（--babylon）、
//      計算（全て・透視線のみ）の結果が poker_cui を直接呼んだときと同じ、取り消し
//
// 実行: npm run test:gui-web
//   poker_cui は POKER_CUI_PATH、POKER_INSTALL_PATH、PATH の順に探す（poker-mcp と同じ）。--babylon・--progress の
//   ある poker_cui（POKER の段階 0 以降）が必要。無ければ 2 は飛ばす。サンプルは <インストール先>/sample。
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { createGuiServer } from '../src/gui/server.js';
import { resolveStartArg } from '../src/gui/startArgs.js';
import { newToken } from '../src/gui/security.js';
import { pokerInstallDir, pokerCuiInInstallDir, findOnPath, POKER_CUI_NAME } from '../src/utils/paths.js';

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  OK ' : '  NG '} ${label}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

const WS = path.join(os.tmpdir(), 'poker_test_gui_web');
fs.rmSync(WS, { recursive: true, force: true });
fs.mkdirSync(path.join(WS, 'sub'), { recursive: true });
const OUTSIDE = path.join(os.tmpdir(), 'poker_test_gui_web_outside');
fs.rmSync(OUTSIDE, { recursive: true, force: true });
fs.mkdirSync(OUTSIDE);
fs.writeFileSync(path.join(OUTSIDE, 'secret.yaml'), 'secret: 1\n');
let symlinkMade = false;
try { fs.symlinkSync(OUTSIDE, path.join(WS, 'link'), 'dir'); symlinkMade = true; } catch { /* Windows で権限が無い */ }

const cui = pokerCuiInInstallDir() || findOnPath(POKER_CUI_NAME);
const htmlDir = process.env.POKER_GUI_HTML || path.join(pokerInstallDir(), 'webgui_html');
const hasNewCui = Boolean(cui) && /--babylon/.test(spawnSync(cui, ['-h'], { encoding: 'utf8' }).stdout || '');

const token = newToken();
const server = createGuiServer({ token, workspace: fs.realpathSync(WS), htmlDir, cui: cui || 'poker_cui' });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

function req(method, p, { body, headers = {}, auth = true } = {}) {
  return new Promise((resolve, reject) => {
    const h = { Host: `127.0.0.1:${port}`, ...headers };
    if (auth) h.Authorization = `Bearer ${token}`;
    let data;
    if (body !== undefined) { data = typeof body === 'string' ? body : JSON.stringify(body); h['Content-Type'] = typeof body === 'string' ? 'text/plain' : 'application/json'; }
    const r = http.request({ host: '127.0.0.1', port, method, path: p, headers: h }, (res) => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => {
        const text = Buffer.concat(c).toString('utf8');
        let json = null; try { json = JSON.parse(text); } catch { /* 本文が JSON でない */ }
        resolve({ status: res.statusCode, text, json, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (data !== undefined) r.write(data);
    r.end();
  });
}

console.log('1. 守り');
check('知らない Host は 403', (await req('GET', '/api/info', { headers: { Host: `evil.example:${port}` } })).status === 403);
check('ポート違いの Host は 403', (await req('GET', '/api/info', { headers: { Host: `127.0.0.1:${port + 1}` } })).status === 403);
check('他のオリジンは 403', (await req('GET', '/api/info', { headers: { Origin: 'https://evil.example' } })).status === 403);
check('cross-site は 403', (await req('GET', '/api/info', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status === 403);
check('トークン無しは 401', (await req('GET', '/api/info', { auth: false })).status === 401);
check('トークン誤りは 401', (await req('GET', '/api/info', { auth: false, headers: { Authorization: 'Bearer ' + '0'.repeat(64) } })).status === 401);
check('同じオリジンは通る', (await req('GET', '/api/info', { headers: { Origin: `http://127.0.0.1:${port}`, 'Sec-Fetch-Site': 'same-origin' } })).status === 200);
check('画面は トークン無しで読める', (await req('GET', '/', { auth: false })).status === 200);
const page = await req('GET', '/', { auth: false });
check('画面に CSP と X-Frame-Options', Boolean(page.headers['content-security-policy']) && page.headers['x-frame-options'] === 'SAMEORIGIN');
check('/app の外は 404', (await req('GET', '/app/../../package.json', { auth: false })).status === 404);
check('/html の外は 404', (await req('GET', '/html/%2e%2e/%2e%2e/package.json', { auth: false })).status === 404);
check('.. で作業フォルダの外を読むと 403', (await req('GET', '/api/file?path=' + encodeURIComponent('../poker_test_gui_web_outside/secret.yaml'))).status === 403);
check('絶対パスは 400', (await req('GET', '/api/file?path=' + encodeURIComponent(path.join(OUTSIDE, 'secret.yaml')))).status === 400);
if (symlinkMade) check('シンボリックリンクで外へ出ると 403', (await req('GET', '/api/file?path=link/secret.yaml')).status === 403);
else console.log('  -- シンボリックリンクの試験は飛ばした（作れない）');
check('.yaml 以外は保存できない（400）', (await req('PUT', '/api/file?path=x.sh', { body: 'echo' })).status === 400);
check('作業フォルダの外へ保存できない（403）', (await req('PUT', '/api/file?path=' + encodeURIComponent('../x.yaml'), { body: 'a: 1' })).status === 403);
check('知らない API は 404', (await req('GET', '/api/nothing')).status === 404);
// 2.3.3 の後：画面の読み込み（ページ遷移）は他のサイトのリンクからでも通す。API・遷移でないもの・知らない Host は今までどおり拒む
const NAV = { 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document' };
check('他のサイトのリンクからの画面の読み込みは通る', (await req('GET', '/', { auth: false, headers: NAV })).status === 200);
check('他のサイトからの画面の読み込みでも知らない Host は 403', (await req('GET', '/', { auth: false, headers: { ...NAV, Host: `evil.example:${port}` } })).status === 403);
check('他のサイトからの /api はページ遷移の見出しでも 403', (await req('GET', '/api/info', { headers: NAV })).status === 403);
check('他のサイトからの画面の読み込みでも iframe（Dest: iframe）は 403', (await req('GET', '/', { auth: false, headers: { ...NAV, 'Sec-Fetch-Dest': 'iframe' } })).status === 403);
check('他のサイトからの /app のファイルは 403', (await req('GET', '/app/app.js', { auth: false, headers: NAV })).status === 403);
// 2.3.3 の後：名前を付けて保存の上書きの確認（create=1）、書けないときの code
fs.writeFileSync(path.join(WS, 'exists.yaml'), 'a: 1\n');
const cr = await req('PUT', '/api/file?path=exists.yaml&create=1', { body: 'a: 2' });
check('create=1 で既にあるファイルは 409 EXISTS（書かない）', cr.status === 409 && cr.json.code === 'EXISTS' && fs.readFileSync(path.join(WS, 'exists.yaml'), 'utf8') === 'a: 1\n');
check('create=1 で無いファイルは保存できる', (await req('PUT', '/api/file?path=new1.yaml&create=1', { body: 'a: 3' })).status === 200);
fs.chmodSync(path.join(WS, 'exists.yaml'), 0o444);
const ro = await req('PUT', '/api/file?path=exists.yaml', { body: 'a: 4' });
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
if (isRoot) console.log('  -- 読み取り専用の試験は飛ばした（root）');
else check('読み取り専用のファイルへの保存は 403 と code（EACCES・EPERM）', ro.status === 403 && ['EACCES', 'EPERM'].includes(ro.json.code) && !/internal/.test(ro.json.error), JSON.stringify(ro.json));
fs.chmodSync(path.join(WS, 'exists.yaml'), 0o644);
const nf = await req('GET', '/api/file?path=nothing.yaml');
check('無いファイルは 404 で、絶対パスを返さない', nf.status === 404 && nf.json.code === 'ENOENT' && !nf.text.includes(os.tmpdir().slice(3)), nf.text);
const tp = await req('GET', '/api/template');
check('ひな形の API は 200（文字列を返す）', tp.status === 200 && typeof tp.json.text === 'string');

console.log('2. 働き');
if (!hasNewCui) {
  console.log(`  -- poker_cui（--babylon のあるもの）が無いので飛ばした: ${cui || '(なし)'}`);
} else {
  const info = await req('GET', '/api/info');
  check('版が返る', info.status === 200 && /^\d+\.\d+\.\d+/.test(info.json.version), info.json && info.json.version);
  const sampleDir = path.join(pokerInstallDir(), 'sample');
  const sample = fs.readFileSync(path.join(sampleDir, 'cs137_constants.yaml'), 'utf8');
  check('保存', (await req('PUT', '/api/file?path=sub/s.yaml', { body: sample })).status === 200);
  const back = await req('GET', '/api/file?path=sub/s.yaml');
  check('読み込みが保存した内容と同じ', back.text === sample);
  const list = await req('GET', '/api/files?dir=sub');
  check('一覧に出る', list.json.entries.some(e => e.name === 's.yaml'));

  // 2.3.3 の後：ひな形は画面の言語で選ぶ（ja は template.yaml、en は template_e.yaml）
  const tja = await req('GET', '/api/template?lang=ja'); const ten = await req('GET', '/api/template?lang=en');
  check('ひな形：日本語は template.yaml、英語は template_e.yaml', tja.json.file === 'template.yaml' && ten.json.file === 'template_e.yaml' && /^# POKER input yaml template/.test(ten.json.text) && tja.json.text !== ten.json.text,
    `${tja.json.file} / ${ten.json.file}`);
  const v = await req('POST', '/api/validate', { body: { text: sample } });
  check('検査: サンプルはエラーなし', v.json.result && v.json.result.issues.filter(i => i.severity === 'error').length === 0, JSON.stringify(v.json.result && v.json.result.summary));
  const bad = sample.replace(/^unit:/m, 'unit_typo:');
  const vb = await req('POST', '/api/validate', { body: { text: bad } });
  check('検査: 壊した入力はエラーあり（行番号つき）', vb.json.result && vb.json.result.issues.some(i => i.severity === 'error'));

  if (process.platform !== 'win32') {
    const ve = await req('POST', '/api/validate', { body: { text: bad, lang: 'en' } });
    const vj = await req('POST', '/api/validate', { body: { text: bad, lang: 'ja' } });
    const msg = (r) => r.json.result.issues.map(i => i.message).join(' ');
    check('検査: 言語の指定で poker_cui のメッセージが変わる（en は ASCII、ja は日本語）',
      /^[\x20-\x7e]*$/.test(msg(ve)) && /[\u3040-\u30ff\u4e00-\u9fff]/.test(msg(vj)), `${msg(ve).slice(0, 60)} / ${msg(vj).slice(0, 30)}`);
  }
  const g = await req('POST', '/api/geometry', { body: { text: sample, polygon: 'middle' } });
  const direct = spawnSync(cui, [path.join(sampleDir, 'cs137_constants.yaml'), '--babylon', '--polygon=middle'], { encoding: 'utf8' }).stdout;
  check('3D 表示の JS が poker_cui --babylon と同じ', g.json.exitCode === 0 && g.json.js === direct && /removeAll\(\)/.test(g.json.js));
  const gb = await req('POST', '/api/geometry', { body: { text: 'body: [' } });
  check('3D 表示: 壊れた入力はエラーを返す', gb.json.exitCode !== 0 && Boolean(gb.json.error));

  const strip = (t) => t.split(/\r?\n/).filter(l => !/generated_at|elapsed_time|計算時間|calculation time/i.test(l)).join('\n');
  for (const mode of ['all', 'trace']) {
    const r = await req('POST', '/api/run', { body: { path: 'sub/s.yaml', mode } });
    check(`計算（${mode}）を始められる`, r.status === 200 && Boolean(r.json.id));
    let j;
    for (let i = 0; i < 600; i++) { j = (await req('GET', `/api/jobs/${r.json.id}`)).json; if (j.status !== 'running') break; await new Promise(s => setTimeout(s, 200)); }
    check(`計算（${mode}）が終わる`, j.status === 'done', `${j.status} ${j.exitCode} ${j.log.slice(-2).join(' / ')}`);
    const ref = path.join(WS, `ref_${mode}.yaml`);
    fs.copyFileSync(path.join(WS, 'sub', 's.yaml'), ref);
    const rb = path.basename(ref);   // サーバと同じくファイル名だけを渡す
    const args = mode === 'trace' ? [rb, '-c', '-p', '-s', '-o', rb + '.summary'] : [rb, '-a', '-o', rb + '.summary', '-d', rb + '.dose'];
    spawnSync(cui, args, { cwd: WS });
    const same = (a, b) => strip(fs.readFileSync(a, 'utf8')).replace(/ref_(all|trace)\.yaml/g, 's.yaml') === strip(fs.readFileSync(b, 'utf8'));
    check(`計算（${mode}）のサマリーが直接の計算と同じ`, same(ref + '.summary', path.join(WS, 'sub', 's.yaml.summary')));
    if (mode === 'all') {
      check('計算（all）の .dose が直接の計算と同じ', same(ref + '.dose', path.join(WS, 'sub', 's.yaml.dose')));
      check('進み具合（--progress）を読めた', j.percent === 100 && j.stage !== null, `${j.stage} ${j.percent}`);
    }
  }
  // 線量表示（Form_線量表示）：点・1 次元・2 次元・3 次元の検出器があるサンプル
  const vis = path.join(sampleDir, 'storage_dose_vis1.yaml');
  if (fs.existsSync(vis)) {
    fs.copyFileSync(vis, path.join(WS, 'vis.yaml'));
    const r = await req('POST', '/api/run', { body: { path: 'vis.yaml', mode: 'all' } });
    let j;
    for (let i = 0; i < 3000; i++) { j = (await req('GET', `/api/jobs/${r.json.id}`)).json; if (j.status !== 'running') break; await new Promise(s => setTimeout(s, 200)); }
    check('線量表示: サンプルの計算が終わる', j.status === 'done', j.status);
    const info = (await req('GET', '/api/dose/info?path=vis.yaml.dose')).json;
    check('線量表示: 見出しを読める（検出器 4 つ、edge 0〜3 本）', JSON.stringify(info.detectors?.map(d => d.edges.length)) === '[0,1,2,3]' &&
      info.dose_types.length > 0 && info.ray_types.length > 0 && info.sources.length > 0, JSON.stringify(info.detectors?.map(d => d.edges.length)));
    const last = info.sources.length - 1, ray = info.ray_types.length - 1, energy = info.sources[last].energy_bins.length - 1;
    const view = async (det, extra = '') => (await req('GET', `/api/dose/view?path=vis.yaml.dose&det=${det}&dose=0&ray=${ray}&src=${last}&energy=${energy}${extra}`)).json;
    const v0 = await view(0), v1 = await view(1, '&yaxis=log'), v2 = await view(2), v3 = await view(3, '&plane=1&slice=5');
    check('線量表示: 点検出器は図を消すだけ', v0.kind === 'point' && v0.viewJs === 'slice__hide();');
    check('線量表示: 1 次元はグラフ', v1.kind === 'graph' && /graph__update\(y, y_label, length, yaxistype\)/.test(v1.graphJs) && /yaxistype = 'log'/.test(v1.graphJs));
    check('線量表示: 2・3 次元はスライス', v2.kind === 'slice' && v3.kind === 'slice' && /slice__show\(/.test(v3.viewJs) && v3.sliceMax === info.detectors[3].edges[0].number - 1,
      `${v2.kind} ${v3.kind} ${v3.sliceMax}`);
    const csv = await req('GET', `/api/dose/csv?path=vis.yaml.dose&det=3&dose=0&ray=${ray}&src=${last}&energy=${energy}`);
    const n3 = info.detectors[3].edges.reduce((a, e) => a * e.number, 1);
    check('線量表示: 線量保存（CSV）', csv.status === 200 && csv.text.startsWith('#  Poker: output dose values\n') &&
      csv.text.trim().split('\n').filter(l => !l.startsWith('#')).length === n3 + 1, `${csv.status}`);
    check('線量表示: .dose 以外は読まない', (await req('GET', '/api/dose/info?path=vis.yaml')).status === 400);
    check('線量表示: 作業フォルダの外は拒否', [403, 404].includes((await req('GET', '/api/dose/info?path=../x.dose')).status));
    check('線量表示: 無い .dose は 404', (await req('GET', '/api/dose/info?path=none.yaml.dose')).status === 404);
  }
  // 材料リスト・核種リスト
  const names = (await req('GET', '/api/names')).json;
  check('一覧: 材料（名前と密度）・核種の名前', names.materials?.length > 0 && names.materials.every(m => m.name && m.density) &&
    names.nuclides?.includes('CS137') && names.neutronNuclides?.length > 0, `${names.materials?.length} ${names.nuclides?.length} ${names.materialsError}`);

  // 取り消し：大きいデッキで始めてすぐ止める
  const big = path.join(sampleDir, 'ans-ii-1.yaml');
  if (fs.existsSync(big)) {
    fs.copyFileSync(big, path.join(WS, 'big.yaml'));
    const r = await req('POST', '/api/run', { body: { path: 'big.yaml', mode: 'all' } });
    const r2 = await req('POST', '/api/run', { body: { path: 'big.yaml', mode: 'all' } });
    check('計算中に 2 つ目は始められない（409）', r2.status === 409);
    await new Promise(s => setTimeout(s, 300));
    const c = await req('POST', `/api/jobs/${r.json.id}/cancel`, { body: {} });
    let j;
    for (let i = 0; i < 100; i++) { j = (await req('GET', `/api/jobs/${r.json.id}`)).json; if (j.status !== 'running') break; await new Promise(s => setTimeout(s, 100)); }
    check('取り消せる', (c.json.canceled && j.status === 'canceled') || j.status === 'done', `${c.json.canceled} ${j.status}`);
  }
}

// poker-gui の引数（2.3.3 の後）：フォルダ／入力ファイル（そのフォルダで開く）／無い .yaml・.yaml 以外は止める
{
  const A = path.join(WS, 'args');
  fs.mkdirSync(A, { recursive: true });
  fs.writeFileSync(path.join(A, 'in put.yaml'), 'title: t\n');
  fs.writeFileSync(path.join(A, 'note.txt'), 'x');
  const real = fs.realpathSync(A);
  const r1 = resolveStartArg(undefined, path.join(A, 'default_ws'));
  check('引数なし：既定の作業フォルダを作る', r1.open === null && r1.workspace === path.join(real, 'default_ws') && fs.statSync(r1.workspace).isDirectory());
  const r2 = resolveStartArg(path.join(A, 'newdir'), '/nonexistent');
  check('フォルダ：無ければ作る', r2.open === null && r2.workspace === path.join(real, 'newdir') && fs.statSync(r2.workspace).isDirectory());
  const r3 = resolveStartArg(path.join(A, 'in put.yaml'), '/nonexistent');
  check('入力ファイル：そのフォルダを作業フォルダにして開く', r3.workspace === real && r3.open === 'in put.yaml', JSON.stringify(r3));
  const code = (a) => { try { resolveStartArg(a, '/nonexistent'); return 'ok'; } catch (e) { return e.code; } };
  check('無い .yaml は止める（フォルダを作らない）', code(path.join(A, 'missing.yaml')) === 'NO_FILE' && !fs.existsSync(path.join(A, 'missing.yaml')));
  check('.yaml 以外のファイルは止める', code(path.join(A, 'note.txt')) === 'NOT_YAML');
}

server.close();
// 取り消した計算のファイルが Windows でしばらく掴まれていることがあるので、消せなくても失敗にしない
for (const d of [WS, OUTSIDE]) {
  try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); }
  catch (e) { console.log(`  -- 後片付けできなかった: ${d} (${e.code})`); }
}
console.log(failures ? `\n${failures} 件失敗` : '\nすべて成功');
process.exit(failures ? 1 : 0);
