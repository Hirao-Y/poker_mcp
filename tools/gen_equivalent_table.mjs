// gen_equivalent_table.mjs -- lib_equivalent.dat を生成する
//
//   node tools/gen_equivalent_table.mjs [出力先]
//
// カスタム材料（lib_material.dat に登録されているが lib_setting.dat の
// buildup_material に無い材料）について、ビルドアップ等価材料を選定した表を
// 出力する。標準材料は自前のビルドアップデータを持つため表に載せない。
//
// 選定は組成と減衰係数のみで決まり、問題ごとに変わらないため事前計算できる。
// 入力は lib_material.dat と lib_setting.dat の両方に依存する（標準材料が
// 増えれば既存カスタム材料の選定結果も変わりうる）ので、表は常に全件を
// 再構築すること。追記だけでは古い選定が残る。
import fs from 'fs';
import path from 'path';
import { MaterialCatalog, BUILDUP_MATCH_WARN } from '../src/utils/MaterialCatalog.js';

const LIB = path.join(process.env.POKER_INSTALL_PATH || 'C:\\Poker', 'LIB');
const OUT = process.argv[2] || path.join(LIB, 'lib_equivalent.dat');

function stamp(p) {
  try {
    const s = fs.statSync(p);
    return s.mtime.toISOString().replace('T', ' ').slice(0, 19);
  } catch { return 'unknown'; }
}

const cat = MaterialCatalog.load();
const std = MaterialCatalog.standard();
const custom = Object.keys(cat)
  .filter(m => !std.includes(m) && cat[m].composition)
  .sort();

const rows = custom.map(m => {
  const ranked = MaterialCatalog.rankBuildupEquivalents(m);
  const eq = MaterialCatalog.nearestBuildupEquivalent(m);
  const hit = ranked.find(r => r.material === eq);
  const score = hit ? hit.score : null;
  return { m, eq, score, coarse: score != null && score > BUILDUP_MATCH_WARN };
});

const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const E = MaterialCatalog.BUILDUP_MATCH_ENERGIES;
const L = [];
L.push('# POKER equivalent buildup material table 1.0');
L.push(`generated : ${now}  by poker_mcp tools/gen_equivalent_table.mjs`);
L.push(`source    : lib_material.dat   ${stamp(path.join(LIB, 'lib_material.dat'))}   ${Object.keys(cat).length} materials`);
L.push(`source    : lib_setting.dat    ${stamp(path.join(LIB, 'lib_setting.dat'))}   ${std.length} standard`);
L.push(`source    : ${MaterialCatalog.atten_file || 'atten2_xcom2.dat'}  ${stamp(MaterialCatalog._attenPath())}`);
L.push('method    : scatter/absorb ratio  r(E) = mu_incoherent / (mu_total - mu_incoherent)');
L.push(`            log-RMS over ${E.length} points, ${E[0]}-${E[E.length - 1]} MeV`);
L.push('            tie-break by effective Z within 10% of best score');
L.push(`            "coarse" marks score > ${BUILDUP_MATCH_WARN} (no close standard material)`);
L.push('#');
L.push(`custom    : ${rows.length}`);
L.push('#');
L.push('# material          equivalent    score   note');
for (const r of rows) {
  L.push(`${r.m.padEnd(20)}${r.eq.padEnd(14)}${String(r.score).padEnd(8)}${r.coarse ? 'coarse' : ''}`.trimEnd());
}

fs.writeFileSync(OUT, L.join('\r\n') + '\r\n', 'utf8');
console.log(`written: ${OUT}  (${rows.length} custom materials, ${L.length} lines)`);
console.log(`coarse : ${rows.filter(r => r.coarse).map(r => r.m).join(', ') || '(none)'}`);
