// mcp/handlers/index.js
import { createBodyHandlers } from './bodyHandlers.js';
import { createZoneHandlers } from './zoneHandlers.js';
import { createTransformHandlers } from './transformHandlers.js';
import { createBuildupFactorHandlers } from './buildupFactorHandlers.js';
import { createSourceHandlers } from './sourceHandlers.js';
import { createDetectorHandlers } from './detectorHandlers.js';
import { createUnitHandlers } from './unitHandlers.js';
import { createThinnedIndicesHandlers } from './thinnedIndicesHandlers.js';
import { createCadHandlers } from './cadHandlers.js';
import { createCalculationHandlers } from './calculationHandlers.js';
import { resetHandlers } from './resetHandlers.js';
import { createDaughterNuclideHandler } from './daughterNuclideHandler.js';
import { createGuiHandlers } from './guiHandlers.js';
import { createSchemaHandlers } from './schemaHandlers.js';
import { createJobHandlers } from './jobHandlers.js';

/**
 * @param {Object} taskManager
 * @param {Object} [opts]
 * @param {import('../../services/JobManager.js').JobManager|null} [opts.jobManager]
 *   非同期ジョブが有効なときだけ渡される。null ならジョブ系のハンドラは登録しない。
 * @param {boolean} [opts.guiEnabled=true]
 *   false なら poker_openGui のハンドラを登録しない（ツール名で直接呼ばれても実行しない）。
 */
export function createAllHandlers(taskManager, { jobManager = null, guiEnabled = true } = {}) {
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
    ...createThinnedIndicesHandlers(taskManager),
    ...createCadHandlers(taskManager),
    
    // 計算操作
    ...createCalculationHandlers(taskManager, { jobManager }),

    // 非同期ジョブ（POKER_MCP_ASYNC=1 のときだけ）
    ...(jobManager ? createJobHandlers(taskManager, jobManager) : {}),

    // 子孫核種確認操作
    confirmDaughterNuclides: createDaughterNuclideHandler(taskManager),

    // リセット操作
    resetYaml: resetHandlers.resetYaml(taskManager),

    // GUI表示操作（Windows で POKER.exe があり、POKER_MCP_GUI=0 でないときだけ）
    ...(guiEnabled ? createGuiHandlers(taskManager) : {}),

    // スキーマ取得（poker_cui --schema）
    ...createSchemaHandlers(),
    
    // 共通操作
    async applyChanges(args) {
      const result = await taskManager.applyChanges();
      return { success: true, message: '変更を適用しました', details: result };
    }
  };
}
