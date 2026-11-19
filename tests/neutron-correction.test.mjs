// 中性子の有限媒質補正（neutron_correction、POKER 2.3.2 以降）の通しテスト（v1.15.0）
//
//   node tests/neutron-correction.test.mjs [POKER 2.3.2 の POKER_CUI があるフォルダ]
//
// 検証すること:
//   1. 光子のデッキでは設定できない
//   2. setParticle photon で neutron_correction も消える（光子のデッキに残さない）
//   3. G false・F true、reset と値の同時指定は止まる
//   4. 値は両方を明示して unit の直後に書く。保留中は getNeutronCorrection の pending に出る
//   5. 計算（POKER 2.3.2 の POKER_CUI）の summary に設定どおりの neutron_correction の行が出る
//   6. G だけ false にすると F も false になる（note が付く）
//   7. 引数なし（reset）で節を消し、既定（G・F とも true）に戻る
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

import { POKER_INSTALL_DIR as DEFAULT_POKER_DIR } from '../src/utils/paths.js';

const IS_WINDOWS = process.platform === 'win32';
const POKER_DIR = process.argv[2]
  || (IS_WINDOWS ? 'C:/Users/yoshi/Desktop/poker177E/src230/GUI/bin/x64/Release'
                 : (process.env.POKER_INSTALL_PATH || DEFAULT_POKER_DIR));
const T = path.join(os.tmpdir(), 'poker_test_ncorr_tmp').replace(/\\/g, '/');
const Y = T + '/tasks/poker.yaml';
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
fs.writeFileSync(Y, [
  'unit: { length: cm, angle: degree, density: g/cm3, radioactivity: Bq }',
  'body:',
  '  - { name: wall, type: RPP, min: 100 -1000 -1000, max: 160 1000 1000 }',
  'zone:',
  '  - { body_name: wall, material: Concrete, density: 2.1 }',
  '  - { body_name: ATMOSPHERE, material: VOID }',
  'transform: []',
  'buildup_factor: []',
  'source: []',
  'detector:',
  '  - { name: b100, origin: 260 0 0, show_path_trace: false }',
  ''
].join('\n'), 'utf8');

const cf = { name: 'n1', type: 'POINT', position: '0 0 0', inventory: [{ nuclide: 'Cf252', emission: 1e10 }], cutoff_rate: 0.0001 };
const yaml = () => fs.readFileSync(Y, 'utf8');
const ncLines = (y) => {   // トップレベルの neutron_correction の節（行の配列）。無ければ null
  const L = y.split(/\r?\n/);
  const i = L.findIndex(l => /^neutron_correction\s*:/.test(l));
  if (i < 0) return null;
  const out = [L[i]];
  for (let k = i + 1; k < L.length && /^\s+\S/.test(L[k]); k++) out.push(L[k]);
  return { at: i, before: L[i - 1] || '', lines: out };
};

// [ラベル, ツール, 引数, 期待 'ok'|'error', 追加の確認 (text, yaml) => true|string]
const calls = [
  ['1 光子のデッキで設定', 'poker_setNeutronCorrection', { use_finite_medium_correction: false }, 'error',
    t => /particle: neutron/.test(t) || 'エラーの理由が particle でない'],
  ['  setParticle neutron', 'poker_setParticle', { particle: 'neutron' }, 'ok'],
  ['  F false', 'poker_setNeutronCorrection', { use_finite_medium_correction: false }, 'ok'],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok',
    (t, y) => { const n = ncLines(y); return (n && /use_finite_medium_correction: false/.test(n.lines.join('\n'))) || '書かれていない'; }],
  ['2 setParticle photon（線源なし）', 'poker_setParticle', { particle: 'photon' }, 'ok',
    t => /neutron_correction も消します/.test(t) || '消す旨の説明が無い'],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok',
    (t, y) => (!/^particle:/m.test(y) && ncLines(y) === null) || 'particle か neutron_correction が残っている'],
  ['  getNeutronCorrection（光子）', 'poker_getNeutronCorrection', {}, 'ok',
    t => (/"particle": "photon"/.test(t) && /"effective": null/.test(t)) || t.slice(0, 80)],
  ['  setParticle neutron', 'poker_setParticle', { particle: 'neutron' }, 'ok'],
  ['3 G false・F true', 'poker_setNeutronCorrection', { use_geometry_correction: false, use_finite_medium_correction: true }, 'error'],
  ['3 reset と値の同時指定', 'poker_setNeutronCorrection', { reset: true, use_geometry_correction: true }, 'error'],
  ['3 真偽値でない', 'poker_setNeutronCorrection', { use_geometry_correction: 'yes' }, 'error'],
  ['4 F false', 'poker_setNeutronCorrection', { use_finite_medium_correction: false }, 'ok',
    t => /use_geometry_correction: true, use_finite_medium_correction: false/.test(t) || t.slice(0, 120)],
  ['  getNeutronCorrection（保留）', 'poker_getNeutronCorrection', {}, 'ok',
    t => (/"pending"/.test(t) && /"pending_count": 1/.test(t)) || '保留が見えない'],
  ['  核種の中性子線源', 'poker_proposeSource', cf, 'ok'],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok',
    (t, y) => {
      const n = ncLines(y);
      if (!n) return '書かれていない';
      const body = n.lines.join('\n');
      if (!/use_geometry_correction: true/.test(body) || !/use_finite_medium_correction: false/.test(body)) return '値が違う: ' + body;
      if (!/^unit\s*:/.test(n.before) && !/^\s/.test(n.before)) return 'unit の直後でない: ' + n.before;
      const L = y.split(/\r?\n/); const u = L.findIndex(l => /^unit\s*:/.test(l));
      const next = L.findIndex((l, k) => k > u && /^\S/.test(l));
      return next === n.at || `unit の直後でない（unit=${u}, 次=${next}, nc=${n.at}）`;
    }],
  ['  getNeutronCorrection', 'poker_getNeutronCorrection', {}, 'ok',
    t => (/"effective": \{\s*"use_geometry_correction": true,\s*"use_finite_medium_correction": false/.test(t) && !/"pending"/.test(t)) || t.slice(0, 160)],
  ['5 計算', 'poker_executeCalculation', { yaml_file: Y, summary_options: { show_total_dose: true } }, 'ok'],
  ['6 G だけ false', 'poker_setNeutronCorrection', { use_geometry_correction: false }, 'ok',
    t => /use_geometry_correction: false, use_finite_medium_correction: false/.test(t) || t.slice(0, 160)],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok',
    (t, y) => { const n = ncLines(y); return (n && /use_geometry_correction: false/.test(n.lines.join('\n')) && /use_finite_medium_correction: false/.test(n.lines.join('\n'))) || '値が違う'; }],
  ['7 引数なし（既定に戻す）', 'poker_setNeutronCorrection', {}, 'ok'],
  ['  applyChanges', 'poker_applyChanges', {}, 'ok', (t, y) => ncLines(y) === null || '消えていない'],
  ['  getNeutronCorrection', 'poker_getNeutronCorrection', {}, 'ok',
    t => (/"neutron_correction": null/.test(t) && /"use_finite_medium_correction": true/.test(t)) || t.slice(0, 160)],
  ['6 既定（F true）から G だけ false', 'poker_setNeutronCorrection', { use_geometry_correction: false }, 'ok',
    t => (/use_geometry_correction: false, use_finite_medium_correction: false/.test(t) && /F も false にしました/.test(t)) || t.slice(0, 160)],
];

const env = { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: POKER_DIR,
  PATH: (IS_WINDOWS ? POKER_DIR.replace(/\//g, '\\') : POKER_DIR) + path.delimiter + process.env.PATH };
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
const send = o => proc.stdin.write(JSON.stringify(o) + '\n');
const text = o => {
  if (!o || !o.result) return '';
  let t = o.result.content[0].text;
  try { const j = JSON.parse(t); if (j.content && j.content[0]) t = j.content[0].text; } catch (e) { /* そのまま */ }
  return t;
};

send({ jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
await waitFor(1);
send({ jsonrpc: '2.0', method: 'notifications/initialized' });

let ng = 0;
for (let i = 0; i < calls.length; i++) {
  const [label, name, args, want, check] = calls[i];
  send({ jsonrpc: '2.0', id: i + 10, method: 'tools/call', params: { name, arguments: args } });
  await waitFor(i + 10);
  const o = res[i + 10];
  const t = text(o);
  const isErr = !o || !!o.error || (o.result && o.result.isError) || /"success":\s*false|エラー|Error/.test(t.slice(0, 200));
  const got = isErr ? 'error' : 'ok';
  let extra = true;
  if (got === want && check) extra = check(o && o.error ? o.error.message : t, yaml());
  const pass = got === want && extra === true;
  if (!pass) ng++;
  const detail = o && o.error ? o.error.message : t;
  console.log((pass ? 'OK ' : 'NG ') + label.padEnd(32),
    (got + ' ' + (extra === true ? '' : '[' + extra + '] ') + detail.replace(/\s+/g, ' ')).slice(0, 150));
}
proc.stdin.end();
await new Promise(r => proc.on('close', r));

// 5 の計算の summary（G true・F false の行）
const found = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/summary/i.test(e.name)) found.push(p); } };
walk(T);
const sum = found.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const okSum = /neutron_correction: \{ use_geometry_correction: true, use_finite_medium_correction: false \}/.test(sum);
console.log((okSum ? 'OK ' : 'NG ') + 'summary の neutron_correction の行（G true・F false）' + (found.length ? '' : '（summary が見つからない）'));
if (!okSum) ng++;
console.log(ng === 0 ? '\n全て OK' : `\n${ng} 件 NG`);
process.exit(ng ? 1 : 0);
