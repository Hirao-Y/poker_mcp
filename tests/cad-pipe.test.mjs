// 曲がった配管の遮蔽評価を MCP の 3 呼び出しで
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FCSTD = (process.env.POKER_TEST_PIPE ||
  path.resolve('tools/samples/curved_pipe.FCStd')).replace(/\\/g, '/');
const T = path.join(os.tmpdir(), 'poker_pipe').replace(/\\/g, '/');
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

console.log('=== 1. CAD から YAML を生成 ===');
const a = un(await send(2, 'poker_generateInput', { fcstd: FCSTD }));
if (a._e || a.error) { console.log('NG: ' + (a._e || a.error) + ' | ' + (a.hint || '')); process.exit(1); }
console.log('  ' + JSON.stringify(a.summary));
if (a.note) console.log('  ' + a.note);
if (a.validation) console.log('  検証: ' + (a.validation.ok ? 'OK' : 'NG ' + a.validation.detail));

console.log('=== 2. 経路を抽出 ===');
const b = un(await send(3, 'poker_generatePaths', { fcstd: FCSTD }));
if (b._e || b.error) { console.log('NG: ' + (b._e || b.error)); process.exit(1); }
console.log('  ' + JSON.stringify(b.summary));

console.log('=== 3. 計算 ===');
const c = un(await send(4, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml', path_input: 'poker.paths',
    summary_options: { show_total_dose: true, show_source_data: false } }));
if (c._e || !c.success) { console.log('NG: ' + (c._e || c.error)); process.exit(1); }
for (const d of (c.result_total || []))
  console.log('  ' + d.name.padEnd(16) + d.points[0].doses['H*(10)'].TOTAL.toExponential(3) + ' uSv/h');
proc.stdin.end();
