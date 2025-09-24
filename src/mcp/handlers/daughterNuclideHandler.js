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
          return await handleConfirm(dataManager, taskManager, source_name);
          
        case 'confirm_with_modifications':
          return await handleConfirmWithModifications(dataManager, taskManager, modifications);
          
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
  
  if (!checkResult.success) {
    return {
      success: false,
      status: 'check_failed',
      message: checkResult.message || '子孫核種チェックに失敗しました'
    };
  }
  
  if (checkResult.totalAdditions === 0) {
    return {
      success: true,
      status: 'no_suggestions',
      message: '追加すべき子孫核種は検出されませんでした',
      suggestions: []
    };
  }
  
  const suggestions = formatSuggestions(checkResult.results || []);
  
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

async function handleConfirm(dataManager, taskManager, targetSourceName = null) {
  const sources = targetSourceName ? 
    dataManager.data.source.filter(s => s.name === targetSourceName) :
    dataManager.data.source;
    
  const checkResult = await dataManager.performDaughterNuclideCheck(sources);
  
  if (!checkResult.success) {
    return {
      success: false,
      status: 'check_failed',
      message: checkResult.message || '子孫核種チェックに失敗しました'
    };
  }
  
  if (checkResult.totalAdditions === 0) {
    return {
      success: true,
      status: 'no_changes',
      message: '適用すべき子孫核種がありません'
    };
  }
  
  // updateSourceを使用した永続化対応の実装
  const appliedActions = [];
  let totalAdded = 0;
  
  try {
    for (const sourceResult of (checkResult.results || [])) {
      const currentSourceName = sourceResult.sourceName;
      const currentSource = dataManager.data.source.find(s => s.name === currentSourceName);
      
      if (!currentSource) {
        logger.warn('線源が見つかりません', { sourceName: currentSourceName });
        continue;
      }
      
      // 現在のinventoryをコピー
      const updatedInventory = [...currentSource.inventory];
      const addedInThisSource = [];
      
      // 子孫核種を追加
      for (const addition of sourceResult.result.additions) {
        const duplicate = updatedInventory.find(inv => 
          inv.nuclide === addition.nuclide
        );
        
        if (!duplicate) {
          updatedInventory.push({
            nuclide: addition.nuclide,
            radioactivity: addition.radioactivity
          });
          
          addedInThisSource.push(addition);
          totalAdded++;
        }
      }
      
      // updateSourceを使用してpending changesに記録
      if (addedInThisSource.length > 0) {
        await taskManager.updateSource(currentSourceName, {
          inventory: updatedInventory
        });
        
        // 適用アクションを記録
        for (const addition of addedInThisSource) {
          appliedActions.push({
            type: 'daughter_added_via_update',
            sourceName: currentSourceName,
            nuclide: addition.nuclide,
            radioactivity: addition.radioactivity,
            parent: addition.parent,
            branchingRatio: addition.branchingRatio
          });
        }
        
        logger.info('子孫核種をupdateSourceで追加', {
          source: currentSourceName,
          addedCount: addedInThisSource.length,
          nuclides: addedInThisSource.map(a => a.nuclide)
        });
      }
    }
    
    if (totalAdded > 0) {
      return {
        success: true,
        status: 'applied_to_pending',
        message: `${totalAdded}個の子孫核種をpending changesに追加しました`,
        applied_count: totalAdded,
        applied_actions: appliedActions,
        next_actions: [
          'poker_applyChanges で変更を永続化してください',
          'poker_executeCalculation で計算を実行してください'
        ]
      };
    } else {
      return {
        success: true,
        status: 'no_changes_needed',
        message: '追加すべき子孫核種がありませんでした'
      };
    }
    
  } catch (error) {
    logger.error('子孫核種のupdateSource処理でエラー', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      success: false,
      status: 'update_failed',
      message: `子孫核種の追加に失敗しました: ${error.message}`,
      error: error.message
    };
  }
}

async function handleConfirmWithModifications(dataManager, taskManager, modifications) {
  if (!modifications || modifications.length === 0) {
    throw new Error('modifications パラメータが必要です');
  }
  
  // updateSourceを使用した修正版実装
  const appliedActions = [];
  let totalAdded = 0;
  
  try {
    // 線源ごとにグループ化
    const sourceGroups = {};
    for (const mod of modifications) {
      if (mod.include) {
        if (!sourceGroups[mod.source_name]) {
          sourceGroups[mod.source_name] = [];
        }
        sourceGroups[mod.source_name].push(mod);
      }
    }
    
    // 各線源について updateSource を実行
    for (const [sourceName, mods] of Object.entries(sourceGroups)) {
      const currentSource = dataManager.data.source.find(s => s.name === sourceName);
      
      if (!currentSource) {
        logger.warn('線源が見つかりません', { sourceName });
        continue;
      }
      
      // 現在のinventoryをコピー
      const updatedInventory = [...currentSource.inventory];
      
      // 修正された子孫核種を追加
      for (const mod of mods) {
        const duplicate = updatedInventory.find(inv => 
          inv.nuclide === mod.nuclide
        );
        
        if (!duplicate) {
          updatedInventory.push({
            nuclide: mod.nuclide,
            radioactivity: mod.radioactivity || 0
          });
          
          appliedActions.push({
            type: 'daughter_modified_and_added',
            sourceName: sourceName,
            nuclide: mod.nuclide,
            radioactivity: mod.radioactivity || 0,
            modification: mod
          });
          
          totalAdded++;
        }
      }
      
      // updateSourceを使用してpending changesに記録
      if (mods.length > 0) {
        await taskManager.updateSource(sourceName, {
          inventory: updatedInventory
        });
        
        logger.info('修正された子孫核種をupdateSourceで追加', {
          source: sourceName,
          addedCount: mods.length,
          nuclides: mods.map(m => m.nuclide)
        });
      }
    }
    
    return {
      success: true,
      status: 'applied_with_modifications_to_pending',
      message: `${totalAdded}個の子孫核種を修正してpending changesに追加しました`,
      applied_count: totalAdded,
      applied_modifications: modifications.filter(m => m.include),
      applied_actions: appliedActions,
      next_actions: [
        'poker_applyChanges で変更を永続化してください',
        'poker_executeCalculation で計算を実行してください'
      ]
    };
    
  } catch (error) {
    logger.error('修正版子孫核種のupdateSource処理でエラー', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      success: false,
      status: 'update_failed',
      message: `修正された子孫核種の追加に失敗しました: ${error.message}`,
      error: error.message
    };
  }
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
