// 段階 3b：Web GUI の検出器・ビルドアップ係数・中性子の補正のダイアログの中身（src/gui/public/dialogs_model.js）が、
// Windows の GUI と同じ YAML を作るかの試験
//   tests/fixtures/dialogs_windows_3b.json：シナリオと、Windows の GUI（Form_追加_検出器・Form_Add_Buildupfactor・
//   Form_NeutronCorrection と NeutronCatalog をリフレクションで操作したもの。POKER の
//   src230web\webgui_dev\phase3\ref_dialogs_3b.ps1）の結果。ビルドアップ係数の材料の一覧はシナリオに出てくる名前だけを入れてある。
//   入力は /api/parse の scalars: 'text' と同じく js-yaml の FAILSAFE で読む。
//   使い方: node tests/dialogs-model-3b.test.mjs
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'gui', 'public', 'dialogs_model.js'), 'utf8'), ctx);
const D = ctx.PokerDialogs;
const { lists, docs, scenarios } = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'dialogs_windows_3b.json'), 'utf8'));
const parse = (t) => (t ? yaml.load(t, { schema: yaml.FAILSAFE_SCHEMA }) : null);
const show = (v) => (v === null ? '' : v ? 'True' : 'False');

function run(s) {
  const doc = s.doc ? docs[s.doc] : '';
  if (s.form === 'detector') {
    const m = new D.DetectorModel(D.detectorsFromDoc(parse(doc)).list);
    for (const st of s.steps) {
      if (st.op === 'select') m.select(st.i);
      else if (st.op === 'kind') m.setKind(st.k);
      else if (st.op === 'cell') m.setCell(st.r, st.c, st.v);
      else if (st.op === 'name') m.setName(st.v);
      else if (st.op === 'transform') m.setTransform(st.v);
      else if (st.op === 'show') m.setShow(st.v);
      else if (st.op === 'register') m.register();
      else if (st.op === 'add') m.add();
      else if (st.op === 'remove') m.remove();
      else if (st.op === 'block') m.block = st.v;
      else throw new Error('op ' + st.op);
    }
    return m.yaml;
  }
  if (s.form === 'buildup') {
    const m = new D.BuildupModel(D.buildupsFromDoc(parse(doc)).list, lists);
    for (const st of s.steps) {
      if (st.op === 'select') m.select(st.i);
      else if (st.op === 'layers') m.setLayers(st.n);
      else if (st.op === 'choose') { if (!m.items(st.which).includes(st.v)) throw new Error('not in list: ' + st.v); m.choose(st.which, st.v); }
      else if (st.op === 'finite') m.setFinite(st.v);
      else if (st.op === 'slant') m.setSlant(st.v);
      else if (st.op === 'register') m.register();
      else if (st.op === 'add') m.add();
      else if (st.op === 'remove') m.remove();
      else if (st.op === 'moveup') m.moveUp();
      else if (st.op === 'block') m.block = st.v;
      else throw new Error('op ' + st.op);
    }
    return m.yaml;
  }
  if (s.form === 'ncorr') {
    const r = D.readCorrection(s.yaml);
    const m = new D.NeutronCorrectionModel(r);
    for (const st of s.steps) { if (st.op === 'g') m.setG(st.v); else if (st.op === 'f') m.setF(st.v); }
    return `read: ${show(r.written)} ${show(r.geometry)} ${show(r.finiteMedium)} | G=${show(m.geometryCorrection)} F=${show(m.finiteMediumCorrection)}\n`
      + D.writeCorrection(s.yaml, m.geometryCorrection, m.finiteMediumCorrection);
  }
  throw new Error('unknown form ' + s.form);
}

let failures = 0;
for (const s of scenarios) {
  let got;
  try { got = run(s); } catch (e) { got = 'ERROR ' + e.message; }
  if (got !== s.expected) { failures++; console.log(`NG ${s.id}\n  Windows: ${JSON.stringify(s.expected)}\n  Web    : ${JSON.stringify(got)}`); }
}
// 読み方の検査（Windows の YamlDotNet：知らないキーはエラー、bool は true/yes/on など、値は文字のまま）
const checks = [
  ['detector：知らないキーはエラーで一覧が空', JSON.stringify(D.detectorsFromDoc(parse('detector:\n  - {name: a, colour: red}\n'))).includes('"list":[]'), true],
  ['detector：bool でない値はエラー', D.detectorsFromDoc(parse('detector:\n  - {name: a, show_path_trace: maybe}\n')).error !== null, true],
  ['buildup：4 層以上はエラー', D.buildupsFromDoc(parse('buildup_factor:\n  - {material: A-B-C-D}\n')).error !== null, true],
  ['buildup：閉じるときの検査は FindString と同じく前方一致・大文字小文字を区別しない（iron は Iron で通る）', JSON.stringify(new D.BuildupModel(D.buildupsFromDoc(parse(docs.bu1)).list, lists).closeError()), 'null'],
  ['buildup：閉じるとき一覧に無い材料', JSON.stringify(new D.BuildupModel(D.buildupsFromDoc(parse('buildup_factor:\n  - {material: Gold}\n')).list, lists).closeError()), JSON.stringify({ error: 'NOTEXISTINLIST', detail: 'Gold' })],
  ['buildup：閉じるとき材料の重複（大文字小文字を区別しない）', JSON.stringify(new D.BuildupModel(D.buildupsFromDoc(parse('buildup_factor:\n  - {material: Iron}\n  - {material: IRON}\n')).list, lists).closeError()), JSON.stringify({ error: 'DUPLICATE', detail: 'IRON' })],
  ['isNeutronDeck', [D.isNeutronDeck('particle: neutron\n'), D.isNeutronDeck("particle: 'neutron'  # n\n"), D.isNeutronDeck('particle: photon\n')].join(), 'true,true,false'],
];
for (const [label, got, want] of checks) if (got !== want) { failures++; console.log(`NG ${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
console.log(failures ? `\n${failures} 件失敗` : `\nすべて成功（Windows と比べたシナリオ ${scenarios.length} 件、読み方 ${checks.length} 件）`);
process.exit(failures ? 1 : 0);
