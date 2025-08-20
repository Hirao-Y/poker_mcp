// mcp/handlers/sourceHandlers.js
import { validateSourceRequest, validateUpdateSourceRequest, validateDeleteSourceRequest } from '../middleware/requestValidator.js';

export function createSourceHandlers(taskManager) {
  return {
    async proposeSource(args) {
      validateSourceRequest(args);
      const result = await taskManager.proposeSource(args);
      return { success: true, message: result };
    },
    
    async updateSource(args) {
      validateUpdateSourceRequest(args);
      const { name, ...updates } = args;
      const result = await taskManager.updateSource(name, updates);
      return { success: true, message: result };
    },
    
    async deleteSource(args) {
      validateDeleteSourceRequest(args);
      const result = await taskManager.deleteSource(args.name);
      return { success: true, message: result };
    }
  };
}
