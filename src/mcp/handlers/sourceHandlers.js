// mcp/handlers/sourceHandlers.js
import { validateSourceRequest, validateUpdateSourceRequest, validateDeleteSourceRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createSourceHandlers(taskManager) {
  return {
    async proposeSource(args) {
      try {
        validateSourceRequest(args);
        const result = await taskManager.proposeSource(args);
        return { success: true, message: result };
      } catch (error) {
        logger.error('proposeSourceハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のpropose専用エラーコード処理
        if (error.code === -32078) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'updateSourceメソッドを使用してください',
              existingObject: args.name,
              objectType: '線源'
            }
          };
        }
        
        throw error;
      }
    },
    
    async updateSource(args) {
      try {
        validateUpdateSourceRequest(args);
        const { name, ...updates } = args;
        const result = await taskManager.updateSource(name, updates);
        return { success: true, message: result };
      } catch (error) {
        logger.error('updateSourceハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のupdate専用エラーコード処理
        if (error.code === -32079) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'proposeSourceメソッドを使用してください',
              missingObject: args.name,
              objectType: '線源'
            }
          };
        }
        
        throw error;
      }
    },
    
    async deleteSource(args) {
      try {
        validateDeleteSourceRequest(args);
        const result = await taskManager.deleteSource(args.name);
        return { success: true, message: result };
      } catch (error) {
        logger.error('deleteSourceハンドラーエラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
