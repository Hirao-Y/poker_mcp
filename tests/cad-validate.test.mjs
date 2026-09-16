// generateInput の検証（poker_cui -c）が働くか
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const T = path.join(os.tmpdir(), 'poker_val_test').replace(/\\/g, '/');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
fs.writeFileSync(T + '/tasks/poker.yaml',
  'unit:\n  length: cm\n  angle: degree\n  density: g/cm3\n  radioactivity: Bq\n' +
  'body: []\nzone:\n  - body_name: ATMOSPHERE\n    material: VOID\n' +
  'transform: []\nbuildup_factor: []\nsource: []\ndetector: []\n', 'utf8');

const proc = spawn(process.execPath, ['src/mcp_server_stdio_v4.js'], {
  env: { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: 'C:/Poker' },
  stdio: ['pipe', 'pipe', 'ignore']
});
let buf = ''; const pending = new Map();
proc.stdout.on('data', d => {
  buf += d; let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k); buf = buf.slice(k + 1);
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); }
  }
});
const send = (id, name, a) => new Promise(r => {
  pending.set(id, r);
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call',
    params: { name, arguments: a } }) + '\n');
});
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) + '\n');
await new Promise(r => setTimeout(r, 600));
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

const un = o => {
  if (o.error) return { _e: o.error.message };
  let j = JSON.parse(o.result.content[0].text);
  if (j.content) j = JSON.parse(j.content[0].text);
  return j;
};

const cases = [
  ['正常なモデル', path.resolve('tools/samples/gi_test.FCStd')],
  ['線源が遮蔽体の外', 'C:/Users/tora/emev_chk/outside_test.FCStd'],
];

let id = 2;
for (const [label, fcstd] of cases) {
  if (!fs.existsSync(fcstd)) { console.log(label + ': モデルなし（スキップ）'); continue; }
  const r = un(await send(id++, 'poker_generateInput', { fcstd: fcstd.replace(/\\/g, '/') }));
  console.log('--- ' + label + ' ---');
  if (r._e || r.error) { console.log('  生成失敗: ' + (r._e || r.error)); continue; }
  console.log('  生成: OK');
  if (r.validation) {
    console.log('  検証: ' + (r.validation.ok ? 'OK' : 'NG') + ' - ' + r.validation.message);
    if (r.validation.detail) console.log('    ' + r.validation.detail.split('\n')[0]);
  } else console.log('  検証: （実行されず）');
}
proc.stdin.end();
