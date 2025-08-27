// mcp/handlers/unitHandlers.js
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createUnitHandlers(taskManager) {
  // ヘルパー関数をローカルスコープで定義
  function generateUnitUsageStats(integrityResult) {
    const stats = {
      totalUsages: 0,
      usagesByKey: {
        length: 0,
        angle: 0,
        density: 0,
        radioactivity: 0
      },
      contextTypes: {
        coordinates: 0,
        geometry: 0,
        material_properties: 0,
        radiation: 0
      }
    };

    if (integrityResult.systemIntegrity && integrityResult.systemIntegrity.usageConsistency) {
      integrityResult.systemIntegrity.usageConsistency.forEach(usage => {
        stats.totalUsages += usage.usageCount;
        
        // 使用コンテキストの分類
        usage.contexts.forEach(context => {
          if (context.includes('coordinates') || context.includes('position')) {
            stats.contextTypes.coordinates++;
          } else if (context.includes('geometry') || context.includes('edge')) {
            stats.contextTypes.geometry++;
          } else if (context.includes('density')) {
            stats.contextTypes.material_properties++;
          } else if (context.includes('radioactivity') || context.includes('inventory')) {
            stats.contextTypes.radiation++;
          }
        });
      });
    }

    return stats;
  }

  function organizeRecommendations(integrityResult) {
    const recommendations = [];
    
    // 診断レポートからの推奨事項
    if (integrityResult.diagnosticReport && integrityResult.diagnosticReport.recommendations) {
      integrityResult.diagnosticReport.recommendations.forEach(rec => {
        recommendations.push({
          type: 'system_optimization',
          priority: 'medium',
          category: 'unit_consistency',
          message: rec,
          source: 'diagnostic_report'
        });
      });
    }
    
    // 物理的整合性からの推奨事項
    if (integrityResult.physicalConsistency && integrityResult.physicalConsistency.recommendations) {
      integrityResult.physicalConsistency.recommendations.forEach(rec => {
        recommendations.push({
          type: 'physical_consistency',
          priority: 'high',
          category: 'unit_physics',
          message: rec.message,
          source: 'physical_consistency'
        });
      });
    }
    
    // 健全性に基づく一般的推奨事項
    const overallHealth = integrityResult.summary.overallHealth;
    if (overallHealth === 'warning' || overallHealth === 'minor_warnings') {
      recommendations.push({
        type: 'health_improvement',
        priority: 'medium',
        category: 'system_health',
        message: 'Consider reviewing unit system warnings to improve overall consistency',
        source: 'health_analysis'
      });
    } else if (overallHealth === 'excellent') {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        category: 'system_health', 
        message: 'Unit system is in excellent condition. Continue current practices.',
        source: 'health_analysis'
      });
    }
    
    return recommendations;
  }

  return {
    // 単位設定提案（4キー完全性保証）
    async proposeUnit(args) {
      try {
        const { length, angle, density, radioactivity } = args;
        
        logger.info('4キー完全単位設定提案開始', { length, angle, density, radioactivity });
        
        // TaskManagerの4キー完全性保証機能を利用
        const result = await taskManager.proposeUnit(length, angle, density, radioactivity);
        
        logger.info('4キー完全単位設定提案完了', { 
          units: { length, angle, density, radioactivity }
        });
        
        return { 
          success: true, 
          message: result,
          unit: {
            length,
            angle,
            density,
            radioactivity,
            integrity: '4-key-complete'
          }
        };
        
      } catch (error) {
        logger.error('単位設定提案エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // 単位設定取得（4キー完全性検証付き）
    async getUnit(args) {
      try {
        logger.info('4キー完全単位設定取得開始');
        
        // TaskManagerの4キー完全性保証取得機能を利用
        const result = await taskManager.getUnit();
        
        logger.info('4キー完全単位設定取得完了', { 
          unit: result.unit,
          integrity: result.integrity 
        });
        
        return { 
          success: true, 
          message: '4キー完全単位設定を取得しました',
          ...result
        };
        
      } catch (error) {
        logger.error('単位設定取得エラー', { error: error.message });
        throw error;
      }
    },
    
    // 単位設定更新（4キー保持保証）
    async updateUnit(args) {
      try {
        if (!args || Object.keys(args).length === 0) {
          throw new ValidationError('更新する内容が指定されていません', 'updates', args);
        }
        
        logger.info('4キー保持単位更新開始', { updates: args });
        
        // TaskManagerの4キー保持更新機能を利用
        const result = await taskManager.updateUnit(args);
        
        logger.info('4キー保持単位更新完了', { 
          updates: args
        });
        
        return { 
          success: true, 
          message: result,
          updated: {
            ...args,
            integrity: '4-key-preserved'
          }
        };
        
      } catch (error) {
        logger.error('単位設定更新エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // 単位完全性検証
    async validateUnitIntegrity(args) {
      try {
        const { includeSystemAnalysis = true, generateReport = true } = args;
        
        logger.info('単位完全性検証開始', { includeSystemAnalysis, generateReport });
        
        // TaskManagerの包括的完全性検証を利用
        const result = await taskManager.validateUnitIntegrity(includeSystemAnalysis, generateReport);
        
        logger.info('単位完全性検証完了', { 
          fourKeyComplete: result.fourKeyComplete,
          overallHealth: result.summary.overallHealth
        });
        
        return {
          success: true,
          message: `単位完全性検証完了 - 健全性: ${result.summary.overallHealth}`,
          integrity: result
        };
        
      } catch (error) {
        logger.error('単位完全性検証エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // 単位変換分析
    async analyzeUnitConversion(args) {
      try {
        const { targetUnits, includePhysicalAnalysis = true } = args;
        
        if (!targetUnits) {
          throw new ValidationError('変換先単位系（targetUnits）は必須です', 'targetUnits', targetUnits);
        }
        
        logger.info('単位変換分析開始', { targetUnits, includePhysicalAnalysis });
        
        // TaskManagerの変換係数分析機能を利用
        const result = await taskManager.analyzeUnitConversion(targetUnits, includePhysicalAnalysis);
        
        logger.info('単位変換分析完了', { 
          isIdentityConversion: result.conversion.isIdentity,
          recommendationCount: result.recommendations.length
        });
        
        return {
          success: true,
          message: `単位変換分析完了 - ${result.conversion.isIdentity ? '変換不要' : '変換が必要'}`,
          conversion: result
        };
        
      } catch (error) {
        logger.error('単位変換分析エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // システム単位使用状況分析
    async analyzeUnitUsage(args) {
      try {
        logger.info('システム単位使用状況分析開始');
        
        // 現在の単位設定を取得
        const currentUnit = await taskManager.getUnit();
        
        // システム全体での単位使用状況を分析
        const result = await taskManager.validateUnitIntegrity(true, true);
        
        // 使用状況統計を生成
        const usageStats = generateUnitUsageStats(result);
        
        logger.info('システム単位使用状況分析完了', usageStats);
        
        return {
          success: true,
          message: `システム単位使用状況分析完了 - 使用箇所: ${usageStats.totalUsages}`,
          currentUnit: currentUnit.unit,
          usageAnalysis: usageStats,
          systemIntegrity: result.systemIntegrity
        };
        
      } catch (error) {
        logger.error('システム単位使用状況分析エラー', { error: error.message });
        throw error;
      }
    },
    
    // 単位推奨事項取得
    async getUnitRecommendations(args) {
      try {
        logger.info('単位推奨事項取得開始');
        
        // 完全性診断レポートを生成
        const integrityResult = await taskManager.validateUnitIntegrity(true, true);
        
        // 推奨事項を整理
        const recommendations = organizeRecommendations(integrityResult);
        
        logger.info('単位推奨事項取得完了', {
          recommendationCount: recommendations.length
        });
        
        return {
          success: true,
          message: `単位推奨事項を${recommendations.length}件取得しました`,
          recommendations,
          overallHealth: integrityResult.summary.overallHealth,
          criticalIssues: integrityResult.summary.criticalIssues,
          warnings: integrityResult.summary.warnings
        };
        
      } catch (error) {
        logger.error('単位推奨事項取得エラー', { error: error.message });
        throw error;
      }
    }
  };
}
