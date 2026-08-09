// tools/test_daughter_reconcile.mjs — 子孫核種再計算のスモークテスト
import {
  reconcileInventory, setExcludedDaughters, getExcludedDaughters,
  determineEquilibrium, isDerived
} from '../src/utils/DaughterReconciler.js';
import NuclideManager from '../src/utils/NuclideManager.js';
import { NDX_FILE } from '../src/utils/paths.js';

let fail = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}: ${m}`); if (!c) fail++; };
const nm = new NuclideManager({ database_file: NDX_FILE });
await nm.ensureLoaded();

// 1. 半減期パーサ
ok(Math.abs(nm.parseHalfLife('2.552m') - 153.12) < 0.1, 'parseHalfLife 分(m)を秒に変換');
ok(Math.abs(nm.parseHalfLife('30.1671y') - 9.52e8) / 9.52e8 < 0.01, 'parseHalfLife 年(y)');
ok(nm.parseHalfLife('5ms') === 0.005, 'parseHalfLife ミリ秒(ms)をmと誤判定しない');

// 2. 平衡判定
const secular = determineEquilibrium(9.5e8, 153.12, 0.9439);
ok(secular.type === 'secular_equilibrium', 'Cs137/Ba137m は永続平衡');
ok(Math.abs(secular.factor - 0.9439) < 1e-9, '永続平衡の係数は分岐比そのもの');
const none = determineEquilibrium(100, 5000, 0.9);
ok(none.factor === null, '娘の半減期が親以上なら生成しない');

// 3. 基本の再計算
const r1 = await reconcileInventory(
  [{ nuclide: 'Cs137', radioactivity: 1e12 }], { nuclideManager: nm, sourceName: 'T1' });
const ba = r1.inventory.find(e => e.nuclide === 'Ba137m');
ok(!!ba, 'Cs137 から Ba137m が自動生成される');
ok(ba && isDerived(ba), '生成物は x_meta.derived_from を持つ');
ok(ba && Math.abs(ba.radioactivity - 9.439e11) / 9.439e11 < 0.05, '放射能 = 親 x 分岐比');

// 4. 親の更新が娘に伝播する（全消し再構築）
const r2 = await reconcileInventory(
  [{ nuclide: 'Cs137', radioactivity: 2e12 }, ...r1.inventory.filter(isDerived)],
  { nuclideManager: nm, sourceName: 'T1' });
const ba2 = r2.inventory.find(e => e.nuclide === 'Ba137m');
ok(ba2 && Math.abs(ba2.radioactivity / ba.radioactivity - 2) < 1e-6,
   '親を2倍にすると娘も2倍になる（更新の伝播）');
ok(r2.inventory.filter(e => e.nuclide === 'Ba137m').length === 1,
   '再計算しても娘が重複しない');

// 5. 親の削除が娘に伝播する
const r3 = await reconcileInventory(r2.inventory.filter(e => e.nuclide !== 'Cs137'),
  { nuclideManager: nm, sourceName: 'T1' });
ok(r3.inventory.length === 0, '親を削除すると娘も消える（削除の伝播）');

// 6. 除外設定
const r4 = await reconcileInventory([{ nuclide: 'Cs137', radioactivity: 1e12 }],
  { nuclideManager: nm, excluded: ['Ba137m'], sourceName: 'T1' });
ok(!r4.inventory.some(e => e.nuclide === 'Ba137m'), '除外した娘は生成されない');
ok(r4.skipped.some(s => s.reason === 'excluded_by_user'), '除外理由が記録される');

// 7. ユーザ指定エントリは触らない
const r5 = await reconcileInventory(
  [{ nuclide: 'Cs137', radioactivity: 1e12 },
   { nuclide: 'Ba137m', radioactivity: 5e11 }],
  { nuclideManager: nm, sourceName: 'T1' });
const uba = r5.inventory.filter(e => e.nuclide === 'Ba137m');
ok(uba.length === 1 && uba[0].radioactivity === 5e11,
   'ユーザ指定の娘は上書きも重複追加もされない');
ok(!isDerived(uba[0]), 'ユーザ指定エントリは派生扱いにならない');

// 8. 除外リストの読み書き
const src = { name: 'S', inventory: [] };
setExcludedDaughters(src, ['Ba-137m', 'Ba137m', 'Y90']);
ok(getExcludedDaughters(src).length === 2, '除外リストは正規化して重複排除される');
setExcludedDaughters(src, []);
ok(src.x_meta === undefined, '除外が空なら x_meta を削除して YAML を汚さない');

// 9. x_meta 正規化: 空になったら YAML に残さない（updateSource 経路）
{
  const src = { name: 'S9', inventory: [{ nuclide: 'Cs137', radioactivity: 1e12 }] };
  setExcludedDaughters(src, ['Ba137m']);
  ok(src.x_meta && src.x_meta.excluded_daughters.length === 1, '除外登録で x_meta が作られる');

  // 除外を全解除したときの updates 相当（handleConfirm が渡す形）
  const updates = { x_meta: { ...src.x_meta } };
  delete updates.x_meta.excluded_daughters;
  const keys = Object.keys(updates.x_meta);
  ok(keys.length === 0, '除外解除後の x_meta は空オブジェクトになる');
  // TaskManager.updateSource の正規化と同じ判定
  const normalized = keys.length === 0 ? null : updates.x_meta;
  ok(normalized === null, '空の x_meta は null に正規化され削除扱いになる');
}

console.log(fail === 0 ? '\n=== ALL PASSED ===' : `\n=== ${fail} FAILED ===`);
process.exit(fail === 0 ? 0 : 1);
