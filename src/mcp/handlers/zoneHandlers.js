// mcp/handlers/zoneHandlers.js
import { validateZoneRequest } from '../middleware/requestValidator.js';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function createZoneHandlers(taskManager) {
  return {
    async proposeZone(args) {
      try {
        validateZoneRequest(args);
        
        // VOID材料での密度指定チェック
        if (args.material === 'VOID' && args.density !== undefined) {
          throw new ValidationError(
            'Density cannot be specified for VOID material', 
            'density', 
            args.density
          );
        }

        // 非VOID材料での密度必須チェック
        if (args.material !== 'VOID' && args.density === undefined) {
          throw new ValidationError(
            'Density must be specified for non-VOID materials', 
            'density', 
            args.density
          );
        }

        const result = await taskManager.proposeZone(args.body_name, args.material, args.density);
        return { success: true, message: result };
      } catch (error) {
        logger.error('proposeZoneハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のpropose専用エラーコード処理
        if (error.code === -32060) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'updateZoneメソッドを使用してください',
              existingObject: args.body_name,
              objectType: 'ゾーン'
            }
          };
        }
        
        throw error;
      }
    },

    async updateZone(args) {
      try {
        if (!args.body_name) throw new ValidationError('立体名は必須です', 'body_name', args.body_name);
        
        // 材料更新時の密度制約チェック
        if (args.material !== undefined) {
          // VOID材料での密度指定チェック
          if (args.material === 'VOID' && args.density !== undefined) {
            throw new ValidationError(
              'Density cannot be specified for VOID material', 
              'density', 
              args.density
            );
          }
          
          // 非VOID材料への変更時の密度必須チェック
          if (args.material !== 'VOID' && args.density === undefined) {
            throw new ValidationError(
              'Density must be specified for non-VOID materials', 
              'density', 
              args.density
            );
          }
        }

        const { body_name, ...updates } = args;
        const result = await taskManager.updateZone(body_name, updates);
        return { success: true, message: result };
      } catch (error) {
        logger.error('updateZoneハンドラーエラー', { args, error: error.message });
        
        // マニフェスト仕様のupdate専用エラーコード処理
        if (error.code === -32061) {
          return {
            success: false,
            error: error.message,
            details: {
              errorCode: error.code,
              suggestion: 'proposeZoneメソッドを使用してください',
              missingObject: args.body_name,
              objectType: 'ゾーン'
            }
          };
        }
        
        throw error;
      }
    },

    async deleteZone(args) {
      try {
        if (!args.body_name) throw new ValidationError('立体名は必須です', 'body_name', args.body_name);
        const result = await taskManager.deleteZone(args.body_name);
        return { success: true, message: result };
      } catch (error) {
        logger.error('deleteZoneハンドラーエラー', { args, error: error.message });
        throw error;
      }
    }
  };
}
