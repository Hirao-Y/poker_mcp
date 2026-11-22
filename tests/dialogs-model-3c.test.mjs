// 段階 3c：Web GUI の線源のダイアログの中身（src/gui/public/dialogs_model.js の SourceModel・ManualModel）が、
// Windows の GUI と同じ YAML・書き出すファイル・メッセージ（英語）になるかの試験
//   tests/fixtures/dialogs_windows_3c.json：シナリオと、Windows の GUI（Form_追加_線源・Form_追加_MANUAL をリフレクションで操作したもの。
//   表の欄は DataGridView の編集の流れで入れ、読み込み・書き出しはファイルのダイアログに名前を答えて動かした。POKER の
//   src230web\webgui_dev\phase3\ref_dialogs_3c.ps1）の結果。入力は /api/parse の scalars: 'text' と同じく js-yaml の FAILSAFE で読む。
//   使い方: node tests/dialogs-model-3c.test.mjs
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'gui', 'public', 'dialogs_model.js'), 'utf8'), ctx);
const D = ctx.PokerDialogs;
const all = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'dialogs_windows_3c.json'), 'utf8'));
const parse = (t) => (t ? yaml.load(t, { schema: yaml.FAILSAFE_SCHEMA }) : null);
// Windows の英語のメッセージ（Properties.Resources）
const MSG = {
  REALINPUT: 'Enter a real number: ‘{0}’', TWOTOHUNDRED: 'Enter an integer between 2 and 100.', UNIFORMNUMBER: 'Enter an integer of 1 or more for UNIFORM.',
  UNIFORMPHI: 'For phi, enter an integer of 2 or more (with 1, all source points are placed on one side, at phi = 180 degrees).', POSREALINPUT: 'Enter a positive real number: ‘{0}’',
  LESSPOSREALINPUT: 'Enter a positive real number less than ‘{0}’.', MOREPOSREALINPUT: 'Enter a positive real number greater than ‘{0}’.',
  RINAMEINPUT: 'Enter RI name.', FIRSTALPHABET: 'The first letter must begin with a letter of the alphabet.', NOMOREROWDELETE: 'No more lines can be deleted.',
  NOEMPTYVALUE: 'No blanks allowed.', NODUPLICATE: 'The same name is already defined.', ZEROTOONEREAL: 'Enter a real number between 0 and 1.',
  LESSPREVIOUS: 'Change the previous value to a value less than {0}.', NUMENDPOINT: 'Specify two or more segments for end_point.',
  NOTEMPTYCELL: 'Fill in the blank cell : {0}', NUMWEIGHT: 'The number of elements in weight must be equal to the number of segments in end_point minus 1.',
  INVALIDHEADERRA: 'Radioactivity column not readable from file header.\nCheck data format of the file.', NOTREADNODE: 'Unable to read source node from YAML input.',
};
const text = (e) => (MSG[e.error] || e.error).replace(/\{(\d)\}/g, (_, i) => (e.args || [])[Number(i)] ?? '');

function runSource(D, all, s, defaultNeutron) {
  const msgs = [], exports = [];
  const say = (e) => { if (e && e.error) for (const x of e.all || [e]) msgs.push(text(x)); };
  const src = s.doc ? all.docs[s.doc] : '', unit = s.unit ? all.docs[s.unit] : '';
  const r = D.sourcesFromDoc(parse(src), unit);
  if (r.error) msgs.push(MSG.NOTREADNODE);
  const m = new D.SourceModel(r.list, { name: 's9', neutron: !!s.neutron, angle: r.angle, defaultNuclide: s.neutron ? defaultNeutron : 'Co60' });
  const ed = m.editor;
  for (const st of s.steps) {
    switch (st.op) {
      case 'select': m.select(st.i); break;
      case 'type': m.setType(st.t); break;
      case 'geo': say(m.setGeo(st.r, st.c, st.v)); break;
      case 'transform': m.setTransform(st.v); break;
      case 'name': say(m.setName(st.v)); break;
      case 'divtype': say(m.setDivType(st.r, st.t)); break;
      case 'div': say(m.setDivCell(st.r, st.c, st.v)); break;
      case 'manual': {
        const mm = new D.ManualModel(ed.div[st.r].n);
        for (const o of st.ops) {
          if (o.op === 'end') say(mm.setEnd(o.i, o.v));
          else if (o.op === 'w') say(mm.setW(o.i, o.v));
          else if (o.op === 'weight') mm.setWeight(o.v);
          else if (o.op === 'insert') mm.insertRow(o.i);
          else if (o.op === 'remove') say(mm.removeRow(o.i));
          else if (o.op === 'normalize') mm.normalize();
        }
        const e = mm.check();
        if (e) say(e); else m.setDivManual(st.r, mm.result());
        break;
      }
      case 'invkind': m.setInvKind(st.k); break;
      case 'inv': if (st.r === ed.inv.length) m.addInvRow(); say(m.setInv(st.r, st.c, st.v)); break;
      case 'insinv': m.insertInvRow(st.i); break;
      case 'delinv': say(m.removeInvRow(st.i)); break;
      case 'back': m.clearInv(st.r, st.c); break;
      case 'pick': m.pickNuclide(st.r, st.v); break;
      case 'paste': m.pasteInv(st.r, st.c, st.text); break;
      case 'cutoff': say(m.setCutoff(st.v)); break;
      case 'pos': if (st.r === ed.positions.length) m.addPosition(); say(m.setPosition(st.r, st.c, st.v)); break;
      case 'delpos': m.removePosition(st.r); break;
      case 'box': if (st.r === ed.bounding.length) m.addBounding(st.v); else m.setBounding(st.r, st.v); break;
      case 'delbox': m.removeBounding(st.r); break;
      case 'register': m.register(); break;
      case 'add': m.add(); break;
      case 'remove': m.remove(); break;
      case 'block': m.block = st.v; break;
      case 'import': { const x = m.importInventory(all.files[st.file]); if (x.error) msgs.push(MSG[x.error] || x.error); break; }
      case 'export': exports.push(m.exportInventory()); break;
      default: throw new Error('op ' + st.op);
    }
  }
  return { yaml: m.yaml, exports, messages: msgs };
}


let failures = 0;
for (const s of all.scenarios) {
  let got;
  try { got = runSource(D, all, s, s.defaultNeutron); } catch (e) { got = { error: e.message }; }
  if (JSON.stringify(got) !== JSON.stringify(s.expected)) {
    failures++;
    console.log(`NG ${s.id}`);
    for (const k of ['yaml', 'exports', 'messages']) if (JSON.stringify(got[k]) !== JSON.stringify(s.expected[k])) console.log(`  ${k}\n    Windows: ${JSON.stringify(s.expected[k])}\n    Web    : ${JSON.stringify(got[k])}`);
  }
}
// .NET の数の書き方（期待値は Windows PowerShell 5.1＝.NET Framework で ToString した値）
const checks = [
  ['fmtNet（G15）', [1e-4, 1e10, 1e15, 0.1 + 0.2, -0.5, 1 / 3].map(D.fmtNet).join(' '), '0.0001 10000000000 1E+15 0.3 -0.5 0.333333333333333'],
  ['fmtG(4)', [0.33333, 1e-5, 12345, 0.5].map(v => D.fmtG(v, 4)).join(' '), '0.3333 1E-05 1.235E+04 0.5'],
  ['fmtE', [1e10, 0.662, -2].map(D.fmtE).join(' '), '1.000000E+010 6.620000E-001 -2.000000E+000'],
];
for (const [label, got, want] of checks) if (got !== want) { failures++; console.log(`NG ${label}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
console.log(failures ? `\n${failures} 件失敗` : `\nすべて成功（Windows と比べたシナリオ ${all.scenarios.length} 件、数の書き方 ${checks.length} 件）`);
process.exit(failures ? 1 : 0);