// mcp/handlers/sourceHandlers.js
import { validateSourceRequest } from '../middleware/requestValidator.js';

export function createSourceHandlers(taskManager) {
  return {
    async proposeSource(args) {
      validateSourceRequest(args);
      const result = await taskManager.proposeSource(args);
      return { success: true, message: result };
    }
  };
}
