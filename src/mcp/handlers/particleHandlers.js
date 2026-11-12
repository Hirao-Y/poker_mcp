// mcp/handlers/particleHandlers.js
//
// particle（photon / neutron）のハンドラ。POKER 2.3.0 から。

export function createParticleHandlers(taskManager) {
  return {
    async setParticle(args) {
      const result = await taskManager.setParticle((args || {}).particle);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, ...result }, null, 2)
        }]
      };
    },

    async getParticle() {
      const result = await taskManager.getParticle();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  };
}
