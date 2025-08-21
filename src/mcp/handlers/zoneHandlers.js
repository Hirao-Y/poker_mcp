// mcp/handlers/zoneHandlers.js
import { validateZoneRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';

export function createZoneHandlers(taskManager) {
  return {
    async proposeZone(args) {
      validateZoneRequest(args);
      const result = await taskManager.proposeZone(args.body_name, args.material, args.density);
      return { success: true, message: result };
    },

    async updateZone(args) {
      if (!args.body_name) throw new ValidationError('立体名は必須です', 'body_name', args.body_name);
      const { body_name, ...updates } = args;
      const result = await taskManager.updateZone(body_name, updates);
      return { success: true, message: result };
    },

    async deleteZone(args) {
      if (!args.body_name) throw new ValidationError('立体名は必須です', 'body_name', args.body_name);
      const result = await taskManager.deleteZone(args.body_name);
      return { success: true, message: result };
    }
  };
}
