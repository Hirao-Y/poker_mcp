// mcp/handlers/daughterNuclideHandler.js
import { logger } from '../../utils/logger.js';

export function createDaughterNuclideHandler(taskManager) {
  return async function confirmDaughterNuclides(args) {
    try {
      const { action, source_name, modifications } = args;
      
      logger.info('子孫核種確認処理開始', { action, source_name });
      
      const dataManager = taskManager.dataManager;
      
      switch (action) {
        case 'check':
          return await handleCheck(dataManager, source_name);
          
        case 'confirm':
          return await handleConfirm(dataManager, source_name);
          
        case 'confirm_with_modifications':
          return await handleConfirmWithModifications(dataManager, modifications);
          
        case 'reject':
          return await handleReject(dataManager);
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
    } catch (error) {
      logger.error('子孫核種確認処理エラー', { error: error.message });
      throw error;
    }
  };
}

async function handleCheck(dataManager, sourceName = null) {
  // 現在の検出状況を表示
  const sources = sourceName ? 
    dataManager.data.source.filter(s => s.name === sourceName) :
    dataManager.data.source;
    
  const checkResult = await dataManager.performDaughterNuclideCheck(sources);
  
  if (checkResult.totalAdditions === 0) {
    return {
      success: true,
      status: 'no_suggestions',
      message: '追加すべき子孫核種は検出されませんでした',
      suggestions: []
    };
  }
  
  const suggestions = formatSuggestions(checkResult.results);
  
  return {
    success: true,
    status: 'suggestions_available',
    message: `${checkResult.totalAdditions}個の子孫核種が検出されました`,
    total_additions: checkResult.totalAdditions,
    suggestions: suggestions,
    next_actions: [
      'poker_confirmDaughterNuclides action="confirm" で承認',
      'poker_confirmDaughterNuclides action="confirm_with_modifications" で修正して承認',
      'poker_confirmDaughterNuclides action="reject" で拒否'
    ]
  };
}

async function handleConfirm(dataManager, sourceName = null) {
  const sources = sourceName ? 
    dataManager.data.source.filter(s => s.name === sourceName) :
    dataManager.data.source;
    
  const checkResult = await dataManager.performDaughterNuclideCheck(sources);
  
  if (checkResult.totalAdditions === 0) {
    return {
      success: true,
      status: 'no_changes',
      message: '適用すべき子孫核種がありません'
    };
  }
  
  // 自動適用実行
  const applyResult = await dataManager.applyDaughterNuclideAdditions(
    checkResult.results, 
    true // userConfirmation = true
  );
  
  if (applyResult.success) {
    return {
      success: true,
      status: 'applied',
      message: `${applyResult.totalAdded}個の子孫核種を自動適用しました`,
      applied_count: applyResult.totalAdded,
      applied_actions: applyResult.appliedActions,
      next_action: 'poker_executeCalculation で計算を実行してください'
    };
  } else {
    return {
      success: false,
      status: 'apply_failed',
      message: applyResult.message || '子孫核種の適用に失敗しました'
    };
  }
}

async function handleConfirmWithModifications(dataManager, modifications) {
  if (!modifications || modifications.length === 0) {
    throw new Error('modifications パラメータが必要です');
  }
  
  // 修正データを適用
  const applyResult = await dataManager.applyModifiedDaughterNuclides(modifications);
  
  return {
    success: true,
    status: 'applied_with_modifications',
    message: `${modifications.filter(m => m.include).length}個の子孫核種を修正して適用しました`,
    applied_modifications: modifications.filter(m => m.include),
    next_action: 'poker_executeCalculation で計算を実行してください'
  };
}

async function handleReject(dataManager) {
  // 子孫核種を無視して処理を継続
  // 特別なフラグを設定して今後の検出を無効にする
  dataManager.setDaughterNuclideCheckDisabled(true);
  
  return {
    success: true,
    status: 'rejected',
    message: '子孫核種の追加を拒否しました。今後の自動検出も無効になります',
    note: 'この設定は新しいセッションまで有効です',
    next_action: 'poker_executeCalculation で計算を実行してください'
  };
}

function formatSuggestions(results) {
  const suggestions = [];
  
  for (const sourceResult of results) {
    const sourceData = {
      source_name: sourceResult.sourceName,
      detected_daughters: []
    };
    
    for (const addition of sourceResult.result.additions) {
      sourceData.detected_daughters.push({
        nuclide: addition.nuclide,
        radioactivity: addition.radioactivity,
        parent_nuclide: addition.parent,
        branching_ratio: addition.branchingRatio,
        equilibrium_type: addition.equilibriumType,
        calculation_basis: `${addition.parent} → ${addition.nuclide} (分岐比: ${(addition.branchingRatio * 100).toFixed(2)}%)`
      });
    }
    
    suggestions.push(sourceData);
  }
  
  return suggestions;
}
