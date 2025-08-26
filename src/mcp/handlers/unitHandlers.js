// mcp/handlers/unitHandlers.js
export function createUnitHandlers(taskManager) {
  return {
    async proposeUnit(args) {
      const { length, angle, density, radioactivity } = args;
      const result = await taskManager.proposeUnit(length, angle, density, radioactivity);
      return { success: true, message: result };
    },

    async getUnit(args) {
      const result = await taskManager.getUnit();
      return { success: true, data: result };
    },

    async updateUnit(args) {
      const result = await taskManager.updateUnit(args);
      return { success: true, message: result };
    }
  };
}
