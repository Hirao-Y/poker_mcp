// mcp/handlers/bodyHandlers.js
import { validateBodyRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';

export function createBodyHandlers(taskManager) {
  return {
    async proposeBody(args) {
      validateBodyRequest(args);
      const result = await taskManager.proposeBody(args.name, args.type, args);
      return { success: true, message: result };
    },

    async updateBody(args) {
      if (!args.name) throw new ValidationError('立体名は必須です', 'name', args.name);
      const { name, ...updates } = args;
      const result = await taskManager.updateBody(name, updates);
      return { success: true, message: result };
    },

    async deleteBody(args) {
      if (!args.name) throw new ValidationError('立体名は必須です', 'name', args.name);
      const result = await taskManager.deleteBody(args.name);
      return { success: true, message: result };
    }
  };
}
