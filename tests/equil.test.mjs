// equil_* ツール（EquilibriumSheet_CUI）と、暗号化 NDX からの核種データベース読み込みの試験
//
//   POKER_INSTALL_PATH（既定 C:/Poker）に EquilibriumSheet_CUI.exe が無い環境ではスキップする。
//   EQUIL_PLAIN_NDX に平文の ICRP-07.NDX を指定すると、平文を直接解析した結果と
//   暗号化 NDX を EquilibriumSheet_CUI 経由で読んだ結果を全核種で比べる。
import fs from 'fs';
import path from 'path';

const pokerDir = process.env.POKER_INSTALL_PATH || 'C:/Poker';
const cui = process.env.EQUIL_CUI_PATH || path.join(pokerDir, 'EquilibriumSheet_CUI.exe');

let ng = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? '  OK   ' : '  NG   ') + label + (detail ? ' : ' + detail : ''));
  if (!cond) ng++;
};

if (!fs.existsSync(cui)) {
  console.log('EquilibriumSheet_CUI.exe が無いためスキップ: ' + cui);
  process.exit(0);
}

const { createEquilHandlers } = await import('../src/mcp/handlers/equilHandlers.js');
const { default: NuclideManager } = await import('../src/utils/NuclideManager.js');
const { allTools } = await import('../src/mcp/tools/index.js');
const h = createEquilHandlers();

console.log('=== ツール登録 ===');
for (const n of ['equil_listNuclides', 'equil_getChain', 'equil_calculateDecay', 'equil_getSeries', 'equil_getEmissions']) {
  ok(allTools.some((t) => t.name === n) && typeof h[n] === 'function', n);
}

console.log('=== equil_listNuclides ===');
let r = await h.equil_listNuclides({});
ok(r.success && r.count > 1200, '全核種', `count=${r.count}`);
r = await h.equil_listNuclides({ filter: 'Cs-13' });
ok(r.success && r.nuclides.some((n) => n.nuclide === 'Cs-137'), 'filter Cs-13 に Cs-137');

console.log('=== equil_getChain ===');
r = await h.equil_getChain({ nuclide: 'Cs-137' });
ok(r.success && r.equilibrium_table.length === 2 && r.equilibrium_table[1].nuclide === 'Ba-137m'
  && r.equilibrium_table[1].equilibrium === 'secular', 'Cs-137 → Ba-137m 永続平衡');
ok(r.tree === undefined, 'detail=table ではツリーを返さない');
r = await h.equil_getChain({ nuclide: 'Ra-226', detail: 'full' });
ok(r.success && r.tree && r.all_progeny.length > 10, 'Ra-226 full');
r = await h.equil_getChain({ nuclide: 'Xx-999' });
ok(!r.success && r.code === 'NUCLIDE_NOT_FOUND', '存在しない核種', r.code);

console.log('=== equil_calculateDecay ===');
r = await h.equil_calculateDecay({ nuclide: 'Cs-137', time: '30.1671y', initial: { activity_Bq: 1000 } });
const cs = r.success && r.rows[0];
ok(cs && Math.abs(cs.activity_Bq - 500) < 1e-6, '1 半減期で 1/2', cs && String(cs.activity_Bq));
const ba = r.success && r.rows[1];
ok(ba && Math.abs(ba.ratio_activity_to_parent - 0.94399) < 1e-4, 'Ba-137m / Cs-137 = 分岐比', ba && String(ba.ratio_activity_to_parent));
r = await h.equil_calculateDecay({ nuclide: 'Sr-90', time: '1y', initial: { activity_Bq: 1, mass_g: 1 } }).catch((e) => ({ thrown: e.message }));
ok(r.thrown !== undefined, 'initial を 2 つ指定するとエラー');
r = await h.equil_calculateDecay({ nuclide: 'Sr-90', time: '10 years' }).catch((e) => ({ thrown: e.message }));
ok(r.thrown !== undefined, '時間の書式の誤りはエラー');

console.log('=== equil_getSeries ===');
r = await h.equil_getSeries({ nuclide: 'Sr-90', time: '30d', points: 10, quantity: 'activity', initial: { activity_Bq: 1 } });
ok(r.success && r.time_h.length === 9 && r.series.length === 2 && r.total.length === 9, '点数と系列数');

console.log('=== equil_getEmissions ===');
r = await h.equil_getEmissions({ nuclide: 'Ba-137m', types: ['Gamma'], min_yield: 0.5 });
ok(r.success && r.radiations.length === 1 && Math.abs(r.radiations[0].energy_MeV - 0.6617) < 1e-6 && Math.abs(r.radiations[0].per_decay - 0.8974) < 1e-9, 'Ba-137m の 661.7 keV（0.8974 /壊変）', r.success ? JSON.stringify(r.radiations) : r.error);
r = await h.equil_getEmissions({ nuclide: 'Y-90', kind: 'beta' });
ok(r.success && Array.isArray(r.beta_spectrum) && r.beta_spectrum.length > 10, 'Y-90 のベータスペクトル');

console.log('=== 核種データベース（暗号化 NDX → EquilibriumSheet_CUI） ===');
const libNdx = path.join(pokerDir, 'lib', 'ICRP-07.NDX');
const enc = new NuclideManager({ database_file: libNdx });
await enc.loadNuclideDatabase();
ok(enc.nuclideData.size > 1200, '読み込んだ核種数', String(enc.nuclideData.size));
ok(enc.parseHalfLife(enc.nuclideData.get('Ra219').halfLife) === 0.01, 'Ra-219 の半減期 10 ms', enc.nuclideData.get('Ra219').halfLife);
const plainNdx = process.env.EQUIL_PLAIN_NDX;
if (plainNdx && fs.existsSync(plainNdx)) {
  const pl = new NuclideManager({ database_file: plainNdx });
  await pl.loadNuclideDatabase();
  ok(pl.nuclideData.size === enc.nuclideData.size, '平文と同じ核種数', `${pl.nuclideData.size} / ${enc.nuclideData.size}`);
  const diffs = [];
  for (const [name, a] of pl.nuclideData) {
    const b = enc.nuclideData.get(name);
    if (!b) { diffs.push(name + ' 無し'); continue; }
    const why = [];
    if (pl.parseHalfLife(a.halfLife) !== enc.parseHalfLife(b.halfLife)) why.push(`halfLife ${a.halfLife} / ${b.halfLife}`);
    if (a.decayMode !== b.decayMode) why.push(`decayMode ${a.decayMode} / ${b.decayMode}`);
    if (JSON.stringify(a.daughters) !== JSON.stringify(b.daughters)) why.push('daughters');
    if (why.length) diffs.push(name + ': ' + why.join(', '));
  }
  console.log('  平文との違い: ' + (diffs.length ? diffs.join(' | ') : 'なし'));
  // 平文の直接解析は ms・us の単位を読み違える（Ra-219 の "10ms" を "10m"、Rn-215 の "2.30us" を "2.30u"）。
  // 違ってよいのはこの 2 核種だけ。
  ok(diffs.every((d) => d.startsWith('Ra219:') || d.startsWith('Rn215:')), '違いは Ra-219・Rn-215 の半減期の単位だけ');
} else {
  console.log('  EQUIL_PLAIN_NDX が無いため平文との比較はスキップ');
}

console.log(ng === 0 ? '\nすべて合格' : `\n不合格 ${ng} 件`);
process.exit(ng === 0 ? 0 : 1);
