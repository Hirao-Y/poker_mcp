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
