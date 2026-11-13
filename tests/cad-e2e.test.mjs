// CAD 連携の E2E: generatePaths -> executeCalculation(.paths) -> executeCalculation(CSG) -> generatePaths（もう一度）
// を逐次実行する（応答を待ってから次を送る）。
//
//   経路（.paths）と入力（YAML）は同じモデルから作る。
//   - 既定: tools/samples/gi_test.FCStd から poker_generateInput で入力を作り、同じモデルで経路を作る。
//   - POKER_TEST_FCSTD と POKER_TEST_YAML を両方指定すると、その組（手で作った入力とそのモデル）を使う。
//     例: POKER_TEST_FCSTD=C:/.../cask_simple.FCStd  POKER_TEST_YAML=tools/samples/cask_full.yaml
//     POKER_TEST_FCSTD だけを指定した場合は、そのモデルから入力を作る。
//
//   最後の generatePaths は v1.8.3 の不具合（計算が <yaml>.summary を上書きした後に generatePaths が
//   「point_source が見つかりません」で失敗した）の再発を見る。
//   POKER_TEST_YAML を指定したときだけ、.paths 経由と CSG 経由の線量を比べる（差はテッセレーション由来で、
//   TOL（既定 5%）以内であること）。生成した入力の立体はダミーで、CSG 経由は遮蔽体の無い計算になるため比べない。
//
// 実行: npm run test:cad（POKER 本体と FreeCAD が必要）。NG があれば終了コード 1。
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const FCSTD = (process.env.POKER_TEST_FCSTD || path.resolve('tools/samples/gi_test.FCStd')).replace(/\\/g, '/');
const YAML = process.env.POKER_TEST_YAML ? path.resolve(process.env.POKER_TEST_YAML) : null;
const TOL = Number(process.env.POKER_TEST_TOL || 0.05);

const T = path.join(os.tmpdir(), 'poker_test_seq_ws').replace(/\\/g, '/');
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(T + '/tasks', { recursive: true });
if (YAML) {
  fs.copyFileSync(YAML, T + '/tasks/poker.yaml');
} else {
  // 空の YAML を置いておく（サーバ起動に必要）。中身は poker_generateInput で作る
  fs.writeFileSync(T + '/tasks/poker.yaml',
    'unit:\n  length: cm\n  angle: degree\n  density: g/cm3\n  radioactivity: Bq\n' +
    'body: []\nzone:\n  - body_name: ATMOSPHERE\n    material: VOID\n' +
    'transform: []\nbuildup_factor: []\nsource: []\ndetector: []\n', 'utf8');
}

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

const un = o => {
  if (o.error) return { _e: o.error.message };
  let j = JSON.parse(o.result.content[0].text);
  if (j.content) j = JSON.parse(j.content[0].text);
  return j;
};
let failures = 0;
const ng = (label, msg) => { failures++; console.log(label + ': NG ' + msg); };
const firstDose = (j) => {
  const d = (j.result_total || [])[0];
  return d ? { name: d.name, total: d.points[0].doses['H*(10)'].TOTAL, n: j.result_total.length } : null;
};

console.log('モデル: ' + path.basename(FCSTD) + '　入力: ' + (YAML ? path.basename(YAML) : 'poker_generateInput で作る'));

if (!YAML) {
  const a = un(await send(2, 'poker_generateInput', { fcstd: FCSTD }));
  if (a._e || a.error || a.success === false) ng('入力生成    ', (a._e || a.error) + (a.hint ? ' | ' + a.hint : ''));
  else console.log('入力生成    : OK ' + JSON.stringify(a.summary || {}));
}

const b = un(await send(3, 'poker_generatePaths', { fcstd: FCSTD }));
if (b._e || !b.success) ng('経路生成    ', b._e || b.error);
else console.log('経路生成    : OK 経路数 ' + b.summary['経路数']);

const c = un(await send(4, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml', path_input: 'poker.paths',
    summary_options: { show_total_dose: true, show_source_data: false } }));
const cp = c._e || !c.success ? null : firstDose(c);
if (!cp) ng('.paths 経由 ', c._e || c.error || '線量なし');
else console.log(`.paths 経由 : OK 検出器${cp.n} ${cp.name}=${cp.total.toExponential(4)}`);

const d = un(await send(5, 'poker_executeCalculation',
  { yaml_file: 'poker.yaml',
    summary_options: { show_total_dose: true, show_source_data: false } }));
const dc = d._e || !d.success ? null : firstDose(d);
if (!dc) ng('CSG 経由    ', d._e || d.error || '線量なし');
else console.log(`CSG 経由    : OK 検出器${dc.n} ${dc.name}=${dc.total.toExponential(4)}`);

if (!YAML) {
  // poker_generateInput の入力の立体は材料・密度のためのダミー（tools/gen_input.py）で、遮蔽体の形は .paths にしか無い。
  // CSG 経由は遮蔽体の無い計算になるので、線量は比べない（計算が通ることと、.summary の上書き後の経路再生成だけを見る）。
  console.log('.paths/CSG  : 比べない（生成した入力の立体はダミー。比べるには POKER_TEST_YAML に手で作った入力を指定）');
} else if (cp && dc) {
  const rel = Math.abs(cp.total / dc.total - 1);
  const ok = cp.name === dc.name && rel <= TOL;
  if (ok) console.log(`.paths/CSG  : OK 差 ${(rel * 100).toFixed(2)}%（許容 ${(TOL * 100).toFixed(0)}%）`);
  else ng('.paths/CSG  ', `差 ${(rel * 100).toFixed(2)}%（許容 ${(TOL * 100).toFixed(0)}%）、検出器 ${cp.name} / ${dc.name}`);
}

// 計算の後にもう一度 generatePaths（v1.8.3 のサマリー衝突の再発確認）
const e = un(await send(6, 'poker_generatePaths', { fcstd: FCSTD }));
if (e._e || !e.success) ng('経路再生成  ', e._e || e.error);
else console.log('経路再生成  : OK 経路数 ' + e.summary['経路数']);

proc.stdin.end();
console.log(failures ? `\n${failures} 件の NG` : '\nすべて合格');
process.exit(failures ? 1 : 0);
