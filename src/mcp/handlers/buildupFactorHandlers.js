// mcp/handlers/buildupFactorHandlers.js
import { validateBuildupFactorRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createBuildupFactorHandlers(taskManager) {
  return {
    async proposeBuildupFactor(args) {
      try {
        validateBuildupFactorRequest(args);
        
        // 両方の補正に統一的なデフォルト適用
        const useSlantCorrection = args.use_slant_correction ?? false;
        const useFiniteMediumCorrection = args.use_finite_medium_correction ?? false;
        
        // 標準計算の推奨ログ
        logger.info('ビルドアップ係数パラメータ', {
          material: args.material,
          use_slant_correction: useSlantCorrection,
          use_finite_medium_correction: useFiniteMediumCorrection,
          note: '標準計算では両方ともfalseが推奨'
        });
        
        // 高精度計算使用時の警告
        if (useSlantCorrection || useFiniteMediumCorrection) {
          logger.info('高精度補正が有効です', {
            slant: useSlantCorrection,
            finite: useFiniteMediumCorrection,
            material: args.material
          });
        }
        
        const result = await taskManager.proposeBuildupFactor(
          args.material, 
          useSlantCorrection, 
          useFiniteMediumCorrection
        );
        return { success: true, message: result };
      } catch (error) {
        logger.error('proposeBuildupFactorハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のpropose専用エラーコード処理
        if (error.code === -32070) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'updateBuildupFactorメソッドを使用してください',
              existingObject: args.material,
              objectType: 'ビルドアップ係数'
            }
          };
        }
        
        throw error;
      }
    },

    async updateBuildupFactor(args) {
      try {
        if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
        const { material, ...updates } = args;
        const result = await taskManager.updateBuildupFactor(material, updates);
        return { success: true, message: result };
      } catch (error) {
        logger.error('updateBuildupFactorハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のupdate専用エラーコード処理
        if (error.code === -32071) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'proposeBuildupFactorメソッドを使用してください',
              missingObject: args.material,
              objectType: 'ビルドアップ係数'
            }
          };
        }
        
        throw error;
      }
    },

    async deleteBuildupFactor(args) {
      try {
        if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
        const result = await taskManager.deleteBuildupFactor(args.material);
        return { success: true, message: result };
      } catch (error) {
        logger.error('deleteBuildupFactorハンドラーエラー', { args, error: error.message });
        throw error;
      }
    },

    async changeOrderBuildupFactor(args) {
      try {
        if (!args.material) throw new ValidationError('材料名は必須です', 'material', args.material);
        if (typeof args.newIndex !== 'number') throw new ValidationError('新しいインデックスは数値です', 'newIndex', args.newIndex);
        const result = await taskManager.changeOrderBuildupFactor(args.material, args.newIndex);
        return { success: true, message: result };
      } catch (error) {
        logger.error('changeOrderBuildupFactorハンドラーエラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
