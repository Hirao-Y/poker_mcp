import { logger } from '../../utils/logger.js';
import {
  X_META,
  normalizeNuclide,
  isDerived,
  getExcludedDaughters
} from '../../utils/DaughterReconciler.js';

/**
 * poker_confirmDaughterNuclides ハンドラ
 *
 * v1.4.0 で「拒否を線源ごとに記録する」方式へ変更した。
 * 旧実装は reject でグローバルフラグ (daughterNuclideCheckDisabled) を立てており、
 * 1つの線源で拒否すると全線源の検出が無効になっていた。
 *
 * 現行の役割:
 *   check   : 現在の派生状態と除外設定を表示する
 *   confirm : 除外を解除して派生エントリを復活させる
 *   confirm_with_modifications : 娘核種の放射能を手動指定する（派生管理から外す）
 *   reject  : 対象線源の x_meta.excluded_daughters に記録する
 *
 * 娘核種の生成そのものは propose/updateSource 時に自動で行われるため、
 * このツールは「自動生成結果の事後調整」に位置づけが変わっている。
 */
export function createDaughterNuclideHandler(taskManager) {
  return async function confirmDaughterNuclides(args) {
    try {
      const { action, source_name, modifications, nuclides } = args;

      logger.info('子孫核種確認処理開始', { action, source_name, nuclides });

      const dataManager = taskManager.dataManager;

      switch (action) {
        case 'check':
          return await handleCheck(dataManager, source_name);

        case 'confirm':
          return await handleConfirm(taskManager, source_name, nuclides);

        case 'confirm_with_modifications':
          return await handleConfirmWithModifications(taskManager, modifications);

        case 'reject':
          return await handleReject(taskManager, source_name, nuclides);

        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (error) {
      logger.error('子孫核種確認処理エラー', { error: error.message });
      throw error;
    }
  };
}

/** 対象線源の抽出（source_name 省略時は全線源） */
function selectSources(dataManager, sourceName) {
  const all = (dataManager.data && dataManager.data.source) || [];
  if (!sourceName) return all;
  const hit = all.filter(s => s.name === sourceName);
  if (hit.length === 0) {
    throw new Error(`線源 '${sourceName}' が見つかりません`);
  }
  return hit;
}

/**
 * check: 派生状態と除外設定の一覧表示
 */
async function handleCheck(dataManager, sourceName = null) {
  const sources = selectSources(dataManager, sourceName);

  const report = sources.map(src => {
    const derived = (src.inventory || [])
      .filter(isDerived)
      .map(e => ({
        nuclide: e.nuclide,
        radioactivity: e.radioactivity,
        derived_from: e[X_META].derived_from,
        equilibrium: e[X_META].equilibrium,
        reliable: e[X_META].reliable !== false
      }));

    return {
      source_name: src.name,
      derived_nuclides: derived,
      user_specified: (src.inventory || [])
        .filter(e => !isDerived(e))
        .map(e => e.nuclide),
      excluded_daughters: getExcludedDaughters(src)
    };
  });

  const totalDerived = report.reduce((n, r) => n + r.derived_nuclides.length, 0);
  const totalExcluded = report.reduce((n, r) => n + r.excluded_daughters.length, 0);

  return {
    success: true,
    status: 'reconciled_state',
    message: `派生核種 ${totalDerived} 件、除外設定 ${totalExcluded} 件`,
    sources: report,
    note: '娘核種は proposeSource/updateSource 時に自動生成されます。' +
          'このツールは生成結果の除外・復活・手動指定に使用します',
    next_actions: [
      'poker_confirmDaughterNuclides action="reject" source_name="..." nuclides=["Ba137m"] で除外',
      'poker_confirmDaughterNuclides action="confirm" source_name="..." で除外を解除',
      'poker_confirmDaughterNuclides action="confirm_with_modifications" で放射能を手動指定'
    ]
  };
}

/**
 * reject: 娘核種を線源ごとに除外登録する
 *
 * nuclides 省略時は、その線源で現在生成されている派生核種すべてを除外する。
 * 除外は x_meta.excluded_daughters に永続化されるため、
 * 以後 updateSource で親を変更しても復活しない。
 */
async function handleReject(taskManager, sourceName, nuclides = null) {
  const dataManager = taskManager.dataManager;

  if (!sourceName) {
    return {
      success: false,
      status: 'source_name_required',
      message: 'reject には source_name が必要です。除外は線源ごとに管理されます',
      hint: '全線源を対象にしたい場合は線源ごとに reject を実行してください'
    };
  }

  const [src] = selectSources(dataManager, sourceName);

  const targets = (nuclides && nuclides.length > 0)
    ? nuclides.map(normalizeNuclide)
    : (src.inventory || []).filter(isDerived).map(e => normalizeNuclide(e.nuclide));

  if (targets.length === 0) {
    return {
      success: true,
      status: 'no_targets',
      message: `線源 ${sourceName} に除外対象の派生核種がありません`
    };
  }

  const current = getExcludedDaughters(src);
  const merged = Array.from(new Set([...current, ...targets])).sort();
  const newMeta = { ...(src[X_META] || {}), excluded_daughters: merged };

  await taskManager.updateSource(sourceName, {
    inventory: (src.inventory || []).filter(e => !isDerived(e)),
    [X_META]: newMeta
  });

  return {
    success: true,
    status: 'excluded',
    message: `${targets.join(', ')} を線源 ${sourceName} の除外リストに登録しました`,
    source_name: sourceName,
    excluded_daughters: merged,
    scope: 'この線源のみ。他の線源の自動生成には影響しません',
    next_actions: ['poker_applyChanges で永続化してください']
  };
}

/**
 * confirm: 除外を解除し、派生エントリを復活させる
 *
 * nuclides 省略時は当該線源の除外をすべて解除する。
 * 実際の再生成は updateSource 内の reconcile が行う。
 */
async function handleConfirm(taskManager, sourceName, nuclides = null) {
  const dataManager = taskManager.dataManager;

  if (!sourceName) {
    return {
      success: false,
      status: 'source_name_required',
      message: 'confirm には source_name が必要です'
    };
  }

  const [src] = selectSources(dataManager, sourceName);
  const current = getExcludedDaughters(src);

  if (current.length === 0) {
    return {
      success: true,
      status: 'no_exclusions',
      message: `線源 ${sourceName} に除外設定はありません。娘核種は自動生成されています`
    };
  }

  const release = (nuclides && nuclides.length > 0)
    ? nuclides.map(normalizeNuclide)
    : current;
  const remaining = current.filter(n => !release.includes(n));

  const newMeta = { ...(src[X_META] || {}) };
  if (remaining.length > 0) {
    newMeta.excluded_daughters = remaining;
  } else {
    delete newMeta.excluded_daughters;
  }

  await taskManager.updateSource(sourceName, {
    inventory: (src.inventory || []).filter(e => !isDerived(e)),
    [X_META]: newMeta
  });

  return {
    success: true,
    status: 'exclusion_released',
    message: `${release.join(', ')} の除外を解除しました。次回の再計算で自動生成されます`,
    source_name: sourceName,
    remaining_exclusions: remaining,
    next_actions: ['poker_applyChanges で永続化してください']
  };
}

/**
 * confirm_with_modifications: 娘核種の放射能を手動で指定する
 *
 * 指定された核種は「ユーザ指定エントリ」として登録される（x_meta を持たない）。
 * 同時に除外リストへ入れることで、再計算が同名の派生エントリを重ねて生成するのを防ぐ。
 * これは非平衡状態（ジェネレータ溶出直後など）の実測値を入れる用途を想定している。
 *
 * modifications: [{ source_name, nuclide, include, radioactivity }]
 */
async function handleConfirmWithModifications(taskManager, modifications) {
  const dataManager = taskManager.dataManager;

  if (!Array.isArray(modifications) || modifications.length === 0) {
    return {
      success: false,
      status: 'no_modifications',
      message: 'modifications 配列が空です'
    };
  }

  const bySource = new Map();
  for (const m of modifications) {
    if (!m.source_name || !m.nuclide) continue;
    if (!bySource.has(m.source_name)) bySource.set(m.source_name, []);
    bySource.get(m.source_name).push(m);
  }

  const applied = [];

  for (const [sourceName, mods] of bySource) {
    const [src] = selectSources(dataManager, sourceName);

    // ユーザ指定エントリのみ残し、そこへ手動値を足す
    const inventory = (src.inventory || []).filter(e => !isDerived(e));
    const excluded = new Set(getExcludedDaughters(src));

    for (const m of mods) {
      const nuc = normalizeNuclide(m.nuclide);
      const idx = inventory.findIndex(e => normalizeNuclide(e.nuclide) === nuc);

      if (m.include === false) {
        excluded.add(nuc);
        if (idx >= 0) inventory.splice(idx, 1);
        applied.push({ source_name: sourceName, nuclide: nuc, action: 'excluded' });
        continue;
      }

      if (typeof m.radioactivity !== 'number' || !(m.radioactivity > 0)) {
        throw new Error(`${sourceName}/${nuc}: include=true には正の radioactivity が必要です`);
      }

      // 手動指定は自動再生成と競合するため除外登録もあわせて行う
      excluded.add(nuc);
      if (idx >= 0) {
        inventory[idx] = { nuclide: nuc, radioactivity: m.radioactivity };
      } else {
        inventory.push({ nuclide: nuc, radioactivity: m.radioactivity });
      }
      applied.push({
        source_name: sourceName,
        nuclide: nuc,
        action: 'manual_value',
        radioactivity: m.radioactivity
      });
    }

    const newMeta = { ...(src[X_META] || {}) };
    const exList = Array.from(excluded).sort();
    if (exList.length > 0) newMeta.excluded_daughters = exList;

    await taskManager.updateSource(sourceName, {
      inventory,
      [X_META]: newMeta
    });
  }

  return {
    success: true,
    status: 'applied_with_modifications',
    message: `${applied.length}件の修正を pending changes に登録しました`,
    applied,
    note: '手動指定した核種は自動再生成の対象外になります（除外リストに登録済み）',
    next_actions: ['poker_applyChanges で永続化してください']
  };
}
