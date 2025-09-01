// mcp/handlers/bodyHandlers.js
import { validateBodyRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createBodyHandlers(taskManager) {
  return {
    async proposeBody(args) {
      try {
        validateBodyRequest(args);
        const result = await taskManager.proposeBody(args.name, args.type, args);
        return { success: true, message: result };
      } catch (error) {
        logger.error('proposeBodyハンドラーエラー', { args, error: error.message });
        
        // CMB専用エラーハンドリング
        if (error.message && (
          error.message.includes('演算式で参照されている立体が存在しません') ||
          error.message.includes('循環参照が検出されました') ||
          error.message.includes('禁止された演算子') ||
          error.message.includes('括弧が正しく対応していません') ||
          error.message.includes('CMB演算式は空にできません') ||
          error.message.includes('参照が複雑すぎます')
        )) {
          return {
            success: false,
            error: error.message,
            details: {
              field: error.field || 'expression',
              value: error.value,
              type: 'CMB_VALIDATION_ERROR'
            }
          };
        }
        
        throw error;
      }
    },

    async updateBody(args) {
      try {
        if (!args.name) throw new ValidationError('立体名は必須です', 'name', args.name);
        const { name, ...updates } = args;
        const result = await taskManager.updateBody(name, updates);
        return { success: true, message: result };
      } catch (error) {
        logger.error('updateBodyハンドラーエラー', { args, error: error.message });
        throw error;
      }
    },

    async deleteBody(args) {
      try {
        if (!args.name) throw new ValidationError('立体名は必須です', 'name', args.name);
        const result = await taskManager.deleteBody(args.name);
        return { success: true, message: result };
      } catch (error) {
        logger.error('deleteBodyハンドラーエラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
