// generatePaths が thinnedindices を自動で合わせるか確かめる。
//   小さい値（sourcepoint: 5）を設定した状態から始め、
//   generatePaths の後に入力の分割数（3x6x8=144）へ合わせられることを見る。
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FCSTD = path.resolve('tools/samples/gi_test.FCStd').replace(/\\/g, '/');
const T = path.join(os.tmpdir(), 'poker_fit_test').replace(/\\/g, '/');
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
const thinned = () => {
  const y = fs.readFileSync(T + '/tasks/poker.yaml', 'utf8');
  const m = y.match(/sourcepoint:\s*(\d+)/);
  const m2 = y.match(/detectorevaluation:\s*(\d+)/);
  return `sourcepoint=${m ? m[1] : '-'} detectorevaluation=${m2 ? m2[1] : '-'}`;
};

console.log('1. CAD から YAML を生成');
const a = un(await send(2, 'poker_generateInput', { fcstd: FCSTD }));
if (a._e || a.error) { console.log('  NG: ' + (a._e || a.error)); process.exit(1); }
console.log('   ' + JSON.stringify(a.summary));
console.log('   thinnedindices: ' + thinned());

console.log('2. わざと小さい値にする（sourcepoint: 5）');
await send(3, 'poker_updateThinnedIndices', { sourcepoint: 5, detectorevaluation: 5 });
await send(4, 'poker_applyChanges', {});
console.log('   thinnedindices: ' + thinned());

console.log('3. generatePaths（ここで自動的に合うはず）');
const b = un(await send(5, 'poker_generatePaths', { fcstd: FCSTD }));
if (b._e || b.error) { console.log('  NG: ' + (b._e || b.error)); process.exit(1); }
console.log('   ' + JSON.stringify(b.summary));
if (b.note) console.log('   note: ' + b.note);
console.log('   thinnedindices: ' + thinned());

console.log('4. 計算');
const c = un(await send(6, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml', path_input: 'poker.paths',
    summary_options: { show_total_dose: true, show_source_data: false } }));
if (c._e || !c.success) { console.log('  NG: ' + (c._e || c.error)); process.exit(1); }
for (const d of (c.result_total || []))
  console.log('   ' + d.name.padEnd(10) + d.points[0].doses['H*(10)'].TOTAL.toExponential(4) + ' uSv/h');
proc.stdin.end();
