// mcp/handlers/transformHandlers.js
import { validateTransformRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createTransformHandlers(taskManager) {
  return {
    async proposeTransform(args) {
      try {
        validateTransformRequest(args);
        const result = await taskManager.proposeTransform(args.name, args.operations);
        return { success: true, message: result };
      } catch (error) {
        logger.error('proposeTransformハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のpropose専用エラーコード処理
        if (error.code === -32074) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'updateTransformメソッドを使用してください',
              existingObject: args.name,
              objectType: '変換'
            }
          };
        }
        
        throw error;
      }
    },

    async updateTransform(args) {
      try {
        if (!args.name) throw new ValidationError('変換名は必須です', 'name', args.name);
        const { name, ...updates } = args;
        const result = await taskManager.updateTransform(name, updates);
        return { success: true, message: result };
      } catch (error) {
        logger.error('updateTransformハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のupdate専用エラーコード処理
        if (error.code === -32075) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'proposeTransformメソッドを使用してください',
              missingObject: args.name,
              objectType: '変換'
            }
          };
        }
        
        throw error;
      }
    },

    async deleteTransform(args) {
      try {
        if (!args.name) throw new ValidationError('変換名は必須です', 'name', args.name);
        const result = await taskManager.deleteTransform(args.name);
        return { success: true, message: result };
      } catch (error) {
        logger.error('deleteTransformハンドラーエラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
