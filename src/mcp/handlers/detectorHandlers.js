// mcp/handlers/detectorHandlers.js
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createDetectorHandlers(taskManager) {
  return {
    // 検出器提案
    async proposeDetector(args) {
      try {
        const { name, origin, show_path_trace, transform = null } = args;
        let grid = args.grid; // デフォルト値なしで取得
        
        // gridパラメータの文字列→配列変換
        if (typeof grid === 'string') {
          try {
            grid = JSON.parse(grid);
          } catch (e) {
            grid = undefined;
          }
        }
        
        // show_path_traceの型変換（文字列から真偽値へ）
        const pathTrace = typeof show_path_trace === 'string' 
          ? show_path_trace === 'true' 
          : show_path_trace;
        
        // show_path_trace が必須になったことを確認
        if (pathTrace === undefined) {
          throw new ValidationError('show_path_trace は必須パラメータです');
        }
        
        logger.info('検出器提案開始', { 
          name, 
          origin, 
          gridCount: grid ? grid.length : 0,
          hasTransform: !!transform,
          pathTrace: pathTrace
        });
        
        // DetectorValidator統合のため、TaskManagerの包括的検証を利用
        const result = await taskManager.proposeDetector(name, origin, pathTrace, { grid, transform });
        
        // 検出器の分析情報を追加取得
        const detectorData = {
          name,
          origin,
          show_path_trace: pathTrace,
          ...(grid !== undefined && { grid }),
          ...(transform && { transform })
        };
        const analysisResult = taskManager.analyzeDetectorStructure(detectorData);
        
        logger.info('検出器提案完了', { 
          name, 
          dimension: analysisResult.dimension,
          complexity: analysisResult.complexity 
        });
        
        return { 
          success: true, 
          message: result,
          detector: {
            name,
            type: analysisResult.type,
            dimension: analysisResult.dimension,
            complexity: analysisResult.complexity,
            origin,
            gridDimensions: grid ? grid.length : 0,
            hasTransform: !!transform,
            pathTrace: show_path_trace
          },
          analysis: {
            isOptimal: analysisResult.isOptimal,
            suggestions: analysisResult.suggestions,
            performance: analysisResult.performance
          }
        };
        
      } catch (error) {
        logger.error('検出器提案エラー', { args, error: error.message });
        
        // マニフェスト仕様のpropose専用エラーコード処理
        if (error.code === -32082) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'updateDetectorメソッドを使用してください',
              existingObject: args.name,
              objectType: '検出器'
            }
          };
        }
        
        throw error;
      }
    },

    // 検出器更新
    async updateDetector(args) {
      try {
        const { name, ...updates } = args;
        
        logger.info('検出器更新開始', { name, updates });
        
        // TaskManagerの包括的更新処理を利用
        const result = await taskManager.updateDetector(name, updates);
        
        // 更新後の分析情報
        const existingDetector = taskManager.findDetectorByName(name);
        const updatedDetectorData = { ...existingDetector, ...updates };
        const analysisResult = taskManager.analyzeDetectorStructure(updatedDetectorData);
        
        logger.info('検出器更新完了', { 
          name, 
          newComplexity: analysisResult.complexity 
        });
        
        return { 
          success: true, 
          message: result,
          updated: {
            name,
            ...updates,
            analysisAfterUpdate: {
              complexity: analysisResult.complexity,
              dimension: analysisResult.dimension,
              isOptimal: analysisResult.isOptimal
            }
          }
        };
        
      } catch (error) {
        logger.error('検出器更新エラー', { args, error: error.message });
        
        // マニフェスト仕様のupdate専用エラーコード処理
        if (error.code === -32083) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'proposeDetectorメソッドを使用してください',
              missingObject: args.name,
              objectType: '検出器'
            }
          };
        }
        
        throw error;
      }
    },
    
    // 検出器削除
    async deleteDetector(args) {
      try {
        const { name } = args;
        
        logger.info('検出器削除開始', { name });
        
        // 存在確認
        const existingDetector = taskManager.findDetectorByName(name);
        if (!existingDetector) {
          throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
        }
        
        // 削除前の分析情報を記録
        const preDeleteAnalysis = taskManager.analyzeDetectorStructure(existingDetector);
        
        const result = await taskManager.deleteDetector(name);
        
        logger.info('検出器削除完了', { 
          name, 
          deletedComplexity: preDeleteAnalysis.complexity 
        });
        
        return { 
          success: true, 
          message: result,
          deleted: {
            name,
            type: preDeleteAnalysis.type,
            dimension: preDeleteAnalysis.dimension,
            complexity: preDeleteAnalysis.complexity
          }
        };
        
      } catch (error) {
        logger.error('検出器削除エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // 検出器互換性分析
    async analyzeDetectorCompatibility(args) {
      try {
        const { detector1Name, detector2Name } = args;
        
        logger.info('検出器互換性分析開始', { detector1Name, detector2Name });
        
        const result = await taskManager.analyzeDetectorCompatibility(detector1Name, detector2Name);
        
        logger.info('検出器互換性分析完了', { 
          detector1Name, 
          detector2Name,
          compatibility: result.compatibility.overall 
        });
        
        return {
          success: true,
          message: `検出器互換性分析完了: ${result.compatibility.overall}`,
          compatibility: result
        };
        
      } catch (error) {
        logger.error('検出器互換性分析エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // システム検出器性能分析
    async analyzeSystemDetectorPerformance(args) {
      try {
        logger.info('システム検出器性能分析開始');
        
        const result = await taskManager.analyzeSystemDetectorPerformance();
        
        logger.info('システム検出器性能分析完了', {
          totalDetectors: result.totalDetectors,
          averageComplexity: result.averageComplexity,
          totalMemoryMB: result.memoryEstimate.total
        });
        
        return {
          success: true,
          message: `システム検出器性能分析完了: ${result.totalDetectors}個の検出器を分析`,
          performance: result
        };
        
      } catch (error) {
        logger.error('システム検出器性能分析エラー', { error: error.message });
        throw error;
      }
    }
  };
}
