// mcp/handlers/index.js
import { createBodyHandlers } from './bodyHandlers.js';
import { createZoneHandlers } from './zoneHandlers.js';
import { createTransformHandlers } from './transformHandlers.js';
import { createBuildupFactorHandlers } from './buildupFactorHandlers.js';
import { createSourceHandlers } from './sourceHandlers.js';
import { createDetectorHandlers } from './detectorHandlers.js';
import { createUnitHandlers } from './unitHandlers.js';
import { createCalculationHandlers } from './calculationHandlers.js';

export function createAllHandlers(taskManager) {
  return {
    // 立体操作
    ...createBodyHandlers(taskManager),
    
    // ゾーン操作
    ...createZoneHandlers(taskManager),
    
    // 変換操作
    ...createTransformHandlers(taskManager),
    
    // ビルドアップ係数操作
    ...createBuildupFactorHandlers(taskManager),
    
    // 線源操作
    ...createSourceHandlers(taskManager),
    
    // 検出器操作
    ...createDetectorHandlers(taskManager),
    
    // 単位操作
    ...createUnitHandlers(taskManager),
    
    // 計算操作
    ...createCalculationHandlers(taskManager),
    
    // 共通操作
    async applyChanges(args) {
      const result = await taskManager.applyChanges();
      return { success: true, message: '変更を適用しました', details: result };
    }
  };
}
