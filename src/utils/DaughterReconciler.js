/**
 * DaughterReconciler — 子孫核種の再計算（全消し再構築方式）
 *
 * 設計方針:
 *  1. 派生エントリは x_meta.derived_from を持つ「導出データ」として扱う
 *  2. propose/update のたびに派生エントリを全破棄し、親から再生成する
 *     → 親の放射能変更・親の削除・線源削除が自動的に伝播する
 *  3. ユーザが明示入力したエントリ（x_meta を持たない）は一切変更しない
 *  4. 拒否は source.x_meta.excluded_daughters に記録し、再生成時に尊重する
 *
 * 注意: x_meta は POKER の線量計算には一切使用されない注釈ノードである。
 *       POKER 側では受理して読み捨てる実装であることを前提とする。
 */

import { logger } from './logger.js';

export const X_META = 'x_meta';

// 多世代連鎖の打ち切り（無限ループ防止）
const MAX_GENERATIONS = 8;

/** 核種名の正規化 (Cs-137 / Cs_137 → Cs137) */
export function normalizeNuclide(name) {
  return String(name || '').replace(/[-_]/g, '');
}

/** エントリが自動生成された派生エントリか */
export function isDerived(entry) {
  return !!(entry && entry[X_META] && entry[X_META].derived_from);
}

/** 線源の除外リストを取得（正規化済み） */
export function getExcludedDaughters(source) {
  const meta = source && source[X_META];
  if (!meta || !Array.isArray(meta.excluded_daughters)) return [];
  return meta.excluded_daughters.map(normalizeNuclide);
}

/** 線源の除外リストを設定（空なら x_meta ごと削除して YAML を汚さない） */
export function setExcludedDaughters(source, list) {
  const cleaned = Array.from(new Set((list || []).map(normalizeNuclide)));
  if (cleaned.length === 0) {
    if (source[X_META]) {
      delete source[X_META].excluded_daughters;
      if (Object.keys(source[X_META]).length === 0) delete source[X_META];
    }
    return source;
  }
  if (!source[X_META]) source[X_META] = {};
  source[X_META].excluded_daughters = cleaned.sort();
  return source;
}

/**
 * 平衡タイプと放射能係数の決定
 *
 * secular   : T_parent > 100*T_daughter  → A_d = A_p * br
 * transient : T_parent > T_daughter      → A_d = A_p * br / (1 - T_d/T_p)
 * none      : T_parent <= T_daughter     → 冷却時間なしでは決定不能（生成しない）
 */
export function determineEquilibrium(halfLifeParent, halfLifeDaughter, branchingRatio) {
  const Tp = halfLifeParent;
  const Td = halfLifeDaughter;
  if (!Tp || !Td || !isFinite(Tp) || !isFinite(Td)) {
    return { type: 'unknown', factor: branchingRatio, reliable: false };
  }
  if (Tp > 100 * Td) {
    return { type: 'secular_equilibrium', factor: branchingRatio, reliable: true };
  }
  if (Tp > Td) {
    return {
      type: 'transient_equilibrium',
      factor: branchingRatio / (1 - Td / Tp),
      reliable: true
    };
  }
  return { type: 'no_equilibrium', factor: null, reliable: false };
}

/**
 * インベントリの再計算
 *
 * @param {Array}  inventory        - 既存インベントリ（派生エントリを含みうる）
 * @param {Object} opts
 * @param {Object} opts.nuclideManager - NuclideManager インスタンス
 * @param {Array}  opts.excluded       - 除外する娘核種名の配列
 * @param {string} opts.sourceName     - ログ用の線源名
 * @param {number} opts.threshold      - 分岐比の下限
 * @returns {Promise<Object>} { inventory, added, skipped, warnings, changed }
 */
export async function reconcileInventory(inventory, opts = {}) {
  const {
    nuclideManager,
    excluded = [],
    sourceName = '(unnamed)',
    threshold = 0.05
  } = opts;

  const original = Array.isArray(inventory) ? inventory : [];
  const userEntries = original.filter(e => !isDerived(e));
  const excludedSet = new Set(excluded.map(normalizeNuclide));
  const userNuclides = new Set(userEntries.map(e => normalizeNuclide(e.nuclide)));

  const added = [];
  const skipped = [];
  const warnings = [];

  if (!nuclideManager) {
    warnings.push('NuclideManager が利用できないため子孫核種の再計算を省略しました');
    return { inventory: userEntries, added, skipped, warnings, changed: false };
  }

  await nuclideManager.ensureLoaded();

  // 世代ごとに展開。各世代の親から娘を生成し、生成物を次世代の親とする
  let generation = userEntries.map(e => ({
    nuclide: normalizeNuclide(e.nuclide),
    radioactivity: e.radioactivity
  }));
  const emitted = new Set(); // "親->娘" の重複生成防止

  for (let gen = 0; gen < MAX_GENERATIONS && generation.length > 0; gen++) {
    const next = [];

    for (const parent of generation) {
      const daughters = nuclideManager.getDaughters(parent.nuclide) || [];

      for (const d of daughters) {
        const dName = normalizeNuclide(d.name);
        if (!d.branchingRatio || d.branchingRatio < threshold) continue;

        const link = `${parent.nuclide}->${dName}`;
        if (emitted.has(link)) continue;

        if (excludedSet.has(dName)) {
          skipped.push({ nuclide: dName, parent: parent.nuclide, reason: 'excluded_by_user' });
          continue;
        }
        if (userNuclides.has(dName)) {
          skipped.push({ nuclide: dName, parent: parent.nuclide, reason: 'user_specified' });
          continue;
        }

        const eq = determineEquilibrium(
          nuclideManager.getHalfLifeSeconds(parent.nuclide),
          nuclideManager.getHalfLifeSeconds(dName),
          d.branchingRatio
        );

        if (eq.factor === null) {
          warnings.push(
            `${sourceName}: ${parent.nuclide} → ${dName} は平衡が成立しません` +
            `（娘の半減期が親以上）。放射能を推定できないため自動生成しません。` +
            `必要であれば ${dName} を明示的に指定してください`
          );
          skipped.push({ nuclide: dName, parent: parent.nuclide, reason: 'no_equilibrium' });
          continue;
        }

        const activity = parent.radioactivity * eq.factor;
        const entry = {
          nuclide: dName,
          radioactivity: activity,
          [X_META]: {
            derived_from: parent.nuclide,
            equilibrium: eq.type
          }
        };
        if (!eq.reliable) entry[X_META].reliable = false;

        added.push(entry);
        emitted.add(link);
        next.push({ nuclide: dName, radioactivity: activity });
      }
    }
    generation = next;
  }

  const result = [...userEntries, ...added];
  const changed = !sameInventory(original, result);

  if (changed) {
    logger.info('子孫核種を再計算しました', {
      source: sourceName,
      userEntries: userEntries.length,
      derived: added.length,
      skipped: skipped.length
    });
  }

  return { inventory: result, added, skipped, warnings, changed };
}

/** インベントリの等価判定（再計算で実質変化がなければ pending change を汚さない） */
function sameInventory(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (normalizeNuclide(x.nuclide) !== normalizeNuclide(y.nuclide)) return false;
    if (Math.abs((x.radioactivity - y.radioactivity) / (y.radioactivity || 1)) > 1e-12) return false;
    const xf = x[X_META] && x[X_META].derived_from;
    const yf = y[X_META] && y[X_META].derived_from;
    if ((xf || null) !== (yf || null)) return false;
  }
  return true;
}

export default {
  X_META,
  normalizeNuclide,
  isDerived,
  getExcludedDaughters,
  setExcludedDaughters,
  determineEquilibrium,
  reconcileInventory
};
