// mcp/handlers/thinnedIndicesHandlers.js
//
// thinnedindices（サマリー出力量の制御）のハンドラ。
// 既定値は poker_mcp 側で持たず、POKER の .summary に出力される値を正とする。

import { logger } from '../../utils/logger.js';

export function createThinnedIndicesHandlers(taskManager) {
  return {
    async proposeThinnedIndices(args) {
      const result = await taskManager.proposeThinnedIndices(args || {});
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'thinnedindices を提案しました（applyChanges で確定）',
            ...result
          }, null, 2)
        }]
      };
    },

    async getThinnedIndices() {
      const result = await taskManager.getThinnedIndices();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    },

    async updateThinnedIndices(args) {
      const result = await taskManager.updateThinnedIndices(args || {});
      const msg = (args && args.fit_for_paths)
        ? 'thinnedindices を更新しました（入力の分割数・評価点数に合わせました）'
        : 'thinnedindices を更新しました（applyChanges で確定）';
      logger.info(msg, { indices: result.thinnedindices });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, message: msg, ...result }, null, 2)
        }]
      };
    }
  };
}
