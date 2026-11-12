// 中性子線源（POKER 2.3.0、particle: neutron）の通しテスト
//
//   node tests/neutron-source.test.mjs [POKER 2.3.0 の POKER_CUI.exe があるフォルダ]
//
// 検証すること:
//   1. 光子のデッキに emission の線源を足すと止まる（先に particle: neutron が要る）
//   2. setParticle neutron → applyChanges で YAML の先頭に particle: neutron が入る
//   3. 核種（Cf252）とエネルギ線（14 MeV + 2.5 MeV、spectrum 省略）の中性子線源を足せる。子孫核種は付かない
//   4. 中性子のデッキに radioactivity の線源を足すと止まる。emission と radioactivity の混在も止まる
//   5. 中性子の線源があるうちは setParticle photon が止まる
//   6. 計算（POKER 2.3.0 の POKER_CUI）が通り、summary に neutron: の節と中性子の線量が出る
//   7. poker_getSchema の properties.particle に中性子の核種・材料が載っている
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const POKER_DIR = process.argv[2] || 'C:/Users/yoshi/Desktop/poker177E/src230/GUI/bin/x64/Release';
const T = path.join(os.tmpdir(), 'poker_test_neutron_tmp').replace(/\\/g, '/');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
fs.writeFileSync(T + '/tasks/poker.yaml', [
  'unit: { length: cm, angle: degree, density: g/cm3, radioactivity: Bq }',
  'body:',
  '  - { name: wall, type: RPP, min: 30 -100 -100, max: 80 100 100 }',
  'zone:',
  '  - { body_name: wall, material: Concrete, density: 2.1 }',
  '  - { body_name: ATMOSPHERE, material: VOID }',
  'transform: []',
  'buildup_factor: []',
  'source: []',
  'detector:',
  '  - name: line',
  '    origin: 10 0 0',
  '    show_path_trace: false',
  '    grid:',
  '      - { edge: 100 0 0, number: 11 }',
  ''
].join('\n'), 'utf8');

const cf = { name: 'n1', type: 'POINT', position: '0 0 0', inventory: [{ nuclide: 'Cf252', emission: 1e10 }], cutoff_rate: 0.0001 };
const lines = { name: 'n2', type: 'POINT', position: '0 0 0',
  inventory: [{ energy: 14, spectrum: 0.3, emission: 1e10 }, { energy: 2.5, emission: 1e9 }], cutoff_rate: 0.0001 };
const calls = [
  // [ラベル, ツール, 引数, 期待: 'ok' | 'error']
  ['1 光子のデッキに emission', 'poker_proposeSource', cf, 'error'],
  ['2 setParticle neutron', 'poker_setParticle', { particle: 'neutron' }, 'ok'],
  ['  getParticle (保留)', 'poker_getParticle', {}, 'ok'],
  ['3 核種の中性子線源', 'poker_proposeSource', cf, 'ok'],
  ['3 エネルギ線の中性子線源', 'poker_proposeSource', lines, 'ok'],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok'],
  ['  getParticle', 'poker_getParticle', {}, 'ok'],
  ['4 中性子のデッキに radioactivity', 'poker_proposeSource',
    { name: 'g1', type: 'POINT', position: '0 0 0', inventory: [{ nuclide: 'Co60', radioactivity: 1e9 }], cutoff_rate: 0.0001 }, 'error'],
  ['4 emission と radioactivity の混在', 'poker_proposeSource',
    { name: 'g2', type: 'POINT', position: '0 0 0', inventory: [{ nuclide: 'Cf252', emission: 1e9 }, { nuclide: 'Co60', radioactivity: 1e9 }], cutoff_rate: 0.0001 }, 'error'],
  ['5 setParticle photon（中性子線源あり）', 'poker_setParticle', { particle: 'photon' }, 'error'],
  ['6 計算', 'poker_executeCalculation', { yaml_file: T + '/tasks/poker.yaml',
    summary_options: { show_total_dose: true } }, 'ok'],
  ['7 getSchema', 'poker_getSchema', {}, 'ok'],
];

const msgs = [
  JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } }),
  JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
];
calls.forEach(([, name, args], i) => msgs.push(JSON.stringify({ jsonrpc: '2.0', id: i + 10, method: 'tools/call', params: { name, arguments: args } })));

// poker_cui は PATH で探すので、POKER 2.3.0 のフォルダを先頭に置く
const env = { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: POKER_DIR,
  PATH: POKER_DIR.replace(/\//g, '\\') + ';' + process.env.PATH };
const proc = spawn(process.execPath, ['src/mcp_server_stdio_v4.js'], { env, stdio: ['pipe', 'pipe', 'ignore'] });
let buf = '';
proc.stdout.on('data', d => buf += d);
const res = {};
const waitFor = async id => {
  for (let k = 0; k < 600; k++) {
    for (const l of buf.split('\n')) {
      if (!l.trim()) continue;
      try { const o = JSON.parse(l); if (o.id !== undefined) res[o.id] = o; } catch (e) { /* 途中の行 */ }
    }
    if (res[id]) return;
    await new Promise(r => setTimeout(r, 100));
  }
};
proc.stdin.write(msgs[0] + '\n'); await waitFor(1);
proc.stdin.write(msgs[1] + '\n');
for (let i = 0; i < calls.length; i++) { proc.stdin.write(msgs[i + 2] + '\n'); await waitFor(i + 10); }
proc.stdin.end();
await new Promise(r => proc.on('close', r));

const text = o => {
  if (!o || !o.result) return '';
  let t = o.result.content[0].text;
  try { const j = JSON.parse(t); if (j.content && j.content[0]) t = j.content[0].text; } catch (e) { /* そのまま */ }
  return t;
};
let ng = 0;
calls.forEach(([label, name, , want], i) => {
  const o = res[i + 10];
  const isErr = !o || !!o.error || (o.result && o.result.isError) || /"success":\s*false|エラー|Error/.test(text(o).slice(0, 200));
  const got = isErr ? 'error' : 'ok';
  const detail = o && o.error ? o.error.message : text(o);
  if (got !== want) ng++;
  console.log((got === want ? 'OK ' : 'NG ') + label.padEnd(30), (got + ' ' + detail.replace(/\s+/g, ' ')).slice(0, 150));
});
const y = fs.readFileSync(T + '/tasks/poker.yaml', 'utf8');
const first = y.split('\n')[0];
const okYaml = first.startsWith('particle: neutron') && /emission/.test(y) && !/x_meta/.test(y);
console.log((okYaml ? 'OK ' : 'NG ') + 'YAML の先頭 = ' + first + '、emission あり、子孫核種なし');
if (!okYaml) ng++;
// 出力の置き場所は MCP の既定（作業フォルダの下）。summary を探す
const found = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/summary/i.test(e.name)) found.push(p); } };
walk(T);
const sum = found.map(f => fs.readFileSync(f, 'utf8')).join('\n');
console.log('   summary: ' + (found.join(', ') || '(見つからない)'));
const okSum = /^neutron:/m.test(sum) && /energy lines in 2 group/.test(sum) && /nuclide Cf252/.test(sum);
console.log((okSum ? 'OK ' : 'NG ') + 'summary に neutron: の節と 2 つの中性子線源の説明');
if (!okSum) ng++;
const schema = text(res[10 + calls.length - 1]);
const okSchema = /x-poker-neutron-nuclides/.test(schema) && /AmBe-Sources4C/.test(schema);
console.log((okSchema ? 'OK ' : 'NG ') + 'getSchema に中性子の核種の一覧');
if (!okSchema) ng++;
console.log(ng === 0 ? '\n全て OK' : `\n${ng} 件 NG`);
process.exit(ng ? 1 : 0);
