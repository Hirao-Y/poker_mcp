// mcp/handlers/transformHandlers.js
import { validateTransformRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';

export function createTransformHandlers(taskManager) {
  return {
    async proposeTransform(args) {
      validateTransformRequest(args);
      const result = await taskManager.proposeTransform(args.name, args.operations);
      return { success: true, message: result };
    },

    async updateTransform(args) {
      if (!args.name) throw new ValidationError('変換名は必須です', 'name', args.name);
      const { name, ...updates } = args;
      const result = await taskManager.updateTransform(name, updates);
      return { success: true, message: result };
    },

    async deleteTransform(args) {
      if (!args.name) throw new ValidationError('変換名は必須です', 'name', args.name);
      const result = await taskManager.deleteTransform(args.name);
      return { success: true, message: result };
    }
  };
}
