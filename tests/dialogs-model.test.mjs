// Web GUI の入力ダイアログの中身（src/gui/public/dialogs_model.js）が、Windows の GUI のダイアログと同じ YAML を作るかの試験
//   tests/fixtures/dialogs_windows.json：シナリオ（操作の手順）と、Windows の GUI（POKER.exe のダイアログをリフレクションで
//   操作したもの。POKER の src230web\webgui_dev\phase3\ref_dialogs.ps1）が作った YAML。Windows が無くても流せる。
//   使い方: node tests/dialogs-model.test.mjs
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'gui', 'public', 'dialogs_model.js'), 'utf8'), ctx);
const D = ctx.PokerDialogs;
const { scenarios, windows } = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'dialogs_windows.json'), 'utf8'));
const byId = new Map(scenarios.map(s => [s.id, s]));
const bodyNames = (doc) => doc ? [...doc.matchAll(/name\s*:\s*([^,\s}]+)/g)].map(m => m[1]) : null;

export function runScenario(D, s, byId) {
  if (s.form === 'transform') {
    const m = new D.TransformModel(s.name);
    for (const op of (s.same_ops_as ? byId.get(s.same_ops_as).ops : s.ops)) {
      m.setKind(op.kind);
      if (op.cells) op.cells.forEach((row, r) => row.forEach((v, c) => { m.grid[r][c] = String(v); }));
      m.addOperation();
    }
    for (const i of (s.remove || [])) m.removeOperation(i);
    m.block = s.block;
    return m.yaml;
  }
  if (s.form === 'body') {
    const m = new D.BodyModel(s.name);
    m.setType(s.type);
    if (s.cells) s.cells.forEach((row, r) => row.forEach((v, c) => { m.grid[r].values[c] = String(v); }));
    if (s.transform !== undefined) m.transform = s.transform;
    m.block = Boolean(s.block);
    if (s.then_type) m.setType(s.then_type);
    return m.yaml;
  }
  if (s.form === 'zone') {
    const m = new D.ZoneModel(bodyNames(s.doc));
    if (s.select !== undefined) m.bodyName = m.items[s.select];
    if (s.atmosphere) m.setAtmosphere(true);
    if (s.atmosphere_off) m.setAtmosphere(false);
    if (s.void) m.setVoid(true);
    if (s.void_off) m.setVoid(false);
    if (s.material !== undefined) m.material = s.material;
    if (s.density !== undefined) m.density = s.density;
    m.block = Boolean(s.block);
    return m.yaml;
  }
  throw new Error('unknown form ' + s.form);
}

let failures = 0;
for (const s of scenarios) {
  const want = windows[s.id];
  let got;
  try { got = runScenario(D, s, byId); } catch (e) { got = 'ERROR ' + e.message; }
  if (got !== want) { failures++; console.log(`NG ${s.id}\n  Windows: ${JSON.stringify(want)}\n  Web    : ${JSON.stringify(got)}`); }
}
// 入力の節の扱い（Form_MainWindow）
const doc = 'unit:\n  length: cm\n\nbody:\n  - { name: b1, type: SPH, center: 0 0 0, radius: 1 }\n  # - { name: b9, type: SPH }\n\n# zone の説明\nzone:\n  - { body_name: b1, material: IRON, density: 7.8 }\n';
const checks = [
  ['nameCandidate（Windows と同じく、1 桁目が # の行だけ飛ばす。字下げしたコメントの b9 は数える）', D.nameCandidate('b', doc), 'b10'],
  ['nameCandidate（無ければ 1）', D.nameCandidate('tr', doc), 'tr1'],
  ['addNode（節の中身の最後の行の後。字下げしたコメントも節の中）', JSON.stringify(D.addNode('body', 'X', doc)), JSON.stringify({ row: 6, text: 'X' })],
  ['addNode（節が無ければ末尾に節ごと）', JSON.stringify(D.addNode('transform', 'X', doc)), JSON.stringify({ row: 11, text: '\ntransform:\nX' })],
  ['abstractNode（コメント・空行は飛ばす）', D.abstractNode('body', doc), 'body:\r\n  - { name: b1, type: SPH, center: 0 0 0, radius: 1 }\r\n'],
  ['deleteNode（コメントは見出しの前に残す）', D.deleteNode('body', doc).split('\n').slice(3, 6).join('|'), '  # - { name: b9, type: SPH }|body:|'],
];
for (const [label, got, want] of checks) if (got !== want) { failures++; console.log(`NG ${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
console.log(failures ? `\n${failures} 件失敗` : `\nすべて成功（Windows と比べたシナリオ ${scenarios.length} 件、節の扱い ${checks.length} 件）`);
process.exit(failures ? 1 : 0);
