// generatePaths -> executeCalculation を逐次実行する（応答を待ってから次を送る）
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const T = path.join(os.tmpdir(), 'poker_test_seq_ws').replace(/\\/g, '/');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
fs.copyFileSync(path.resolve('tools/samples/cask_full.yaml'), T + '/tasks/poker.yaml');

const proc = spawn(process.execPath, ['src/mcp_server_stdio_v4.js'], {
  env: { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: 'C:/Poker' },
  stdio: ['pipe', 'pipe', 'ignore']
});

let buf = '';
const pending = new Map();
proc.stdout.on('data', d => {
  buf += d;
  let k;
  while ((k = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, k); buf = buf.slice(k + 1);
    if (!line.trim()) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); }
  }
});

function send(id, name, args) {
  return new Promise(resolve => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id, method: 'tools/call',
      params: { name, arguments: args }
    }) + '\n');
  });
}

proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) + '\n');
await new Promise(r => setTimeout(r, 500));
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

const show = (label, o) => {
  process.stdout.write(label + ': ');
  if (o.error) { console.log('ERROR ' + o.error.message.slice(0, 70)); return; }
  let j = JSON.parse(o.result.content[0].text);
  if (j.content) j = JSON.parse(j.content[0].text);
  if (j.summary) { console.log(j.success ? 'OK 経路数 ' + j.summary['経路数'] : 'NG ' + j.error); return; }
  const rt = j.result_total || [];
  console.log(j.success ? 'OK 検出器' + rt.length + (rt[0] ? ' ' + rt[0].name + '=' + rt[0].points[0].doses['H*(10)'].TOTAL.toExponential(4) : '') : 'NG ' + (j.error || ''));
};

show('経路生成    ', await send(2, 'poker_generatePaths',
  { fcstd: (process.env.POKER_TEST_FCSTD || path.resolve('tools/samples/gi_test.FCStd')).replace(/\\/g, '/') }));
show('.paths 経由 ', await send(3, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml', path_input: 'poker.paths',
    summary_options: { show_total_dose: true, show_source_data: false } }));
show('CSG 経由    ', await send(4, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml',
    summary_options: { show_total_dose: true, show_source_data: false } }));

proc.stdin.end();
