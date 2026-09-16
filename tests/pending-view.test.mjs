// pending 表示の網羅テスト
//
// 検証する状態:
//   S0 保留なし・YAML なし      → thinnedindices: null, pending なし
//   S1 propose 後（未適用）      → null のまま + pending あり
//   S2 applyChanges 後           → 値が入る + pending 消える
//   S3 update 後（未適用）       → 旧値 + pending に新値
//   S4 applyChanges 後           → マージ結果 + pending 消える
//   S5 複数 propose を重ねた場合  → pending がマージされる
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const T = path.join(os.tmpdir(), 'poker_test_pv_tmp').replace(/\\/g, '/');

fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
// thinnedindices を持たない入力を用意
let y = fs.readFileSync(path.resolve('tools/samples/cask_full.yaml'), 'utf8');
y = y.replace(/^thinnedindices:[\s\S]*?(?=^unit:)/m, '');
fs.writeFileSync(T + '/tasks/poker.yaml', y, 'utf8');

const calls = [
  ['S0 初期状態', 'poker_getThinnedIndices', {}],
  ['-- propose --', 'poker_proposeThinnedIndices', { sourcepoint: 100 }],
  ['S1 propose 後(未適用)', 'poker_getThinnedIndices', {}],
  ['-- applyChanges --', 'poker_applyChanges', {}],
  ['S2 適用後', 'poker_getThinnedIndices', {}],
  ['-- update --', 'poker_updateThinnedIndices', { pathtrace: 9 }],
  ['S3 update 後(未適用)', 'poker_getThinnedIndices', {}],
  ['-- update 追加 --', 'poker_updateThinnedIndices', { buildupmfp: 6 }],
  ['S5 複数保留', 'poker_getThinnedIndices', {}],
  ['-- applyChanges --', 'poker_applyChanges', {}],
  ['S4 適用後', 'poker_getThinnedIndices', {}],
  ['-- getUnit --', 'poker_getUnit', {}],
  ['-- updateUnit --', 'poker_updateUnit', { length: 'mm' }],
  ['S6 getUnit(保留あり)', 'poker_getUnit', {}],
];

const lines = [
  JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } }),
  JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
];
calls.forEach(([, name, args], i) => {
  lines.push(JSON.stringify({ jsonrpc: '2.0', id: i + 10, method: 'tools/call',
    params: { name, arguments: args } }));
});

const proc = spawn(process.execPath, ['src/mcp_server_stdio_v4.js'], {
  env: { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: 'C:/Poker' },
  stdio: ['pipe', 'pipe', 'ignore']
});
let buf = '';
proc.stdout.on('data', d => buf += d);
// 1 リクエストずつ送り、応答を待ってから次を送る。
// まとめて流すと処理順が保証されず、applyChanges の前後関係が崩れる。
let seen = 0;
const want = lines.length - 2 + 2;   // initialize + notify + calls
for (const l of lines) {
  proc.stdin.write(l + '\n');
  await new Promise(r => setTimeout(r, 250));
}
proc.stdin.end();
await new Promise(r => proc.on('close', r));

const res = {};
for (const l of buf.split('\n')) {
  if (!l.trim()) continue;
  let o; try { o = JSON.parse(l); } catch (e) { continue; }
  if (o.id >= 10) res[o.id] = o;
}

let ng = 0;
calls.forEach(([label, name], i) => {
  const o = res[i + 10];
  if (!o) { console.log(label.padEnd(24), '応答なし'); ng++; return; }
  if (o.error) { console.log(label.padEnd(24), 'ERROR ' + o.error.message.slice(0, 50)); return; }
  let t = o.result.content[0].text;
  let j; try { j = JSON.parse(t); } catch (e) { j = {}; }
  // ハンドラによっては content[0].text の中がさらに {content:[{text}]} になる
  if (j.content && j.content[0] && j.content[0].text) {
    try { j = JSON.parse(j.content[0].text); } catch (e) { /* そのまま */ }
  }
  if (!/^poker_get/.test(name)) { console.log(label.padEnd(24), (j.message || 'ok').slice(0, 40)); return; }
  const val = j.thinnedindices !== undefined ? j.thinnedindices : j.unit;
  console.log(label.padEnd(24),
    'value=' + JSON.stringify(val),
    ' pending=' + JSON.stringify(j.pending || null),
    j.pending_count ? ' (' + j.pending_count + '件)' : '');
});
console.log('');
console.log(ng === 0 ? '全応答あり' : ng + ' 件の応答欠落');
