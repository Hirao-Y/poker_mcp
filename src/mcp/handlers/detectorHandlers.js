// mcp/handlers/detectorHandlers.js
// 検出器関連のリクエストハンドラー

import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createDetectorHandlers(taskManager) {
  return {
    // 検出器提案
    async proposeDetector(args) {
      try {
        const { name, origin, grid = [], show_path_trace = false } = args;
        
        logger.info('検出器提案開始', { name, origin, gridCount: grid.length });
        
        // バリデーション
        taskManager.validateDetectorData(name, origin, grid);
        
        // 重複チェック
        if (taskManager.findDetectorByName(name)) {
          throw new ValidationError(`検出器名 ${name} は既に存在します`, 'name', name);
        }
        
        const result = await taskManager.proposeDetector(name, origin, grid, show_path_trace);
        
        logger.info('検出器提案完了', { name, origin });
        return { 
          success: true, 
          message: result,
          detector: {
            name,
            type: grid.length === 0 ? 'POINT' : `GRID_${grid.length}D`,
            origin,
            gridDimensions: grid.length
          }
        };
        
      } catch (error) {
        logger.error('検出器提案エラー', { args, error: error.message });
        throw error;
      }
    },
    
    // 検出器更新
    async updateDetector(args) {
      try {
        const { name, ...updates } = args;
        
        logger.info('検出器更新開始', { name, updates });
        
        // 存在確認
        if (!taskManager.findDetectorByName(name)) {
          throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
        }
        
        // 更新データのバリデーション
        if (updates.origin) {
          taskManager.validatePosition(updates.origin);
        }
        if (updates.grid) {
          taskManager.validateGridData(updates.grid);
        }
        
        const result = await taskManager.updateDetector(name, updates);
        
        logger.info('検出器更新完了', { name, updates });
        return { 
          success: true, 
          message: result,
          updated: {
            name,
            ...updates
          }
        };
        
      } catch (error) {
        logger.error('検出器更新エラー', { args, error: error.message });
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
        
        // 依存関係チェック（将来の拡張用）
        // 現在は検出器を直接参照する他要素はないが、将来の機能追加に備える
        
        const result = await taskManager.deleteDetector(name);
        
        logger.info('検出器削除完了', { name });
        return { 
          success: true, 
          message: result,
          deleted: {
            name,
            type: existingDetector.grid?.length === 0 ? 'POINT' : `GRID_${existingDetector.grid?.length || 0}D`
          }
        };
        
      } catch (error) {
        logger.error('検出器削除エラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
