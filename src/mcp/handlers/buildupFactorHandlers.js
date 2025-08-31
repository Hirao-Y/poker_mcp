// mcp/handlers/buildupFactorHandlers.js
import { validateBuildupFactorRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';

export function createBuildupFactorHandlers(taskManager) {
  return {
    async proposeBuildupFactor(args) {
      validateBuildupFactorRequest(args);
      
      // デフォルト値を明示的に適用
      const useSlantCorrection = args.use_slant_correction ?? false;
      const useFiniteMediumCorrection = args.use_finite_medium_correction ?? false;
      
      const result = await taskManager.proposeBuildupFactor(
        args.material, 
        useSlantCorrection, 
        useFiniteMediumCorrection
      );
      return { success: true, message: result };
    },

    async updateBuildupFactor(args) {
      if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
      const { material, ...updates } = args;
      const result = await taskManager.updateBuildupFactor(material, updates);
      return { success: true, message: result };
    },

    async deleteBuildupFactor(args) {
      if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
      const result = await taskManager.deleteBuildupFactor(args.material);
      return { success: true, message: result };
    },

    async changeOrderBuildupFactor(args) {
      if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
      if (typeof args.newIndex !== 'number') throw new ValidationError('新しいインデックスは数値です', 'newIndex', args.newIndex);
      const result = await taskManager.changeOrderBuildupFactor(args.material, args.newIndex);
      return { success: true, message: result };
    }
  };
}
