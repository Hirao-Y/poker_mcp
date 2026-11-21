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

server.close();
// 取り消した計算のファイルが Windows でしばらく掴まれていることがあるので、消せなくても失敗にしない
for (const d of [WS, OUTSIDE]) {
  try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); }
  catch (e) { console.log(`  -- 後片付けできなかった: ${d} (${e.code})`); }
}
console.log(failures ? `\n${failures} 件失敗` : '\nすべて成功');
process.exit(failures ? 1 : 0);
