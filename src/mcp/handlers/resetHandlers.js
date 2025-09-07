// handlers/resetHandlers.js - YAML初期化ハンドラー
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';

/**
 * poker_resetYaml ハンドラー
 * マニフェストのreset_level_definitionsに基づく段階的YAML初期化
 */
export function createResetYamlHandler(taskManager) {
  return async (args) => {
    try {
      const {
        backup_comment = 'Manual reset before initialization',
        force = false,
        preserve_units = true,
        reset_level = 'standard',
        atmosphere_material = 'VOID',
        atmosphere_density = undefined
      } = args;

      logger.info('poker_resetYaml ハンドラー開始', {
        backup_comment,
        force,
        preserve_units,
        reset_level,
        atmosphere_material,
        atmosphere_density
      });

      // パラメータの基本検証
      if (typeof backup_comment !== 'string') {
        throw new McpError(ErrorCode.InvalidParams, 'backup_comment は文字列である必要があります');
      }

      if (backup_comment.length > 200) {
        throw new McpError(ErrorCode.InvalidParams, 'backup_comment は200文字以下である必要があります');
      }

      if (typeof force !== 'boolean') {
        throw new McpError(ErrorCode.InvalidParams, 'force はブール値である必要があります');
      }

      if (typeof preserve_units !== 'boolean') {
        throw new McpError(ErrorCode.InvalidParams, 'preserve_units はブール値である必要があります');
      }

      const validResetLevels = ['minimal', 'standard', 'complete'];
      if (!validResetLevels.includes(reset_level)) {
        throw new McpError(ErrorCode.InvalidParams, `reset_level は ${validResetLevels.join(', ')} のいずれかである必要があります`);
      }

      const validMaterials = [
        'Carbon', 'Concrete', 'Iron', 'Lead', 'Aluminum', 'Copper', 'Tungsten',
        'Air', 'Water', 'PyrexGlass', 'AcrylicResin', 'Polyethylene', 'Soil', 'VOID'
      ];
      if (!validMaterials.includes(atmosphere_material)) {
        throw new McpError(ErrorCode.InvalidParams, `atmosphere_material は ${validMaterials.join(', ')} のいずれかである必要があります`);
      }

      // VOID材料の密度指定チェック
      if (atmosphere_material === 'VOID' && atmosphere_density !== undefined) {
        logger.warn('VOID材料では密度指定を無視します', { atmosphere_density });
      }

      // VOID以外の材料で密度未指定チェック
      if (atmosphere_material !== 'VOID' && atmosphere_density === undefined) {
        throw new McpError(ErrorCode.InvalidParams, `材料 ${atmosphere_material} には密度の指定が必要です`);
      }

      // 密度の範囲チェック
      if (atmosphere_density !== undefined) {
        if (typeof atmosphere_density !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, 'atmosphere_density は数値である必要があります');
        }
        if (atmosphere_density < 0.001 || atmosphere_density > 30.0) {
          throw new McpError(ErrorCode.InvalidParams, '密度は0.001から30.0の範囲で指定してください');
        }
      }

      // TaskManagerでリセット実行
      const result = await taskManager.resetYaml({
        backupComment: backup_comment,
        force,
        preserveUnits: preserve_units,
        resetLevel: reset_level,
        atmosphereMaterial: atmosphere_material,
        atmosphereDensity: atmosphere_density
      });

      logger.info('poker_resetYaml ハンドラー完了', { result });

      return {
        content: [
          {
            type: 'text',
            text: `YAMLファイルの初期化が完了しました

**リセット情報:**
- リセットレベル: ${result.parameters.resetLevel}
- 単位設定保持: ${result.parameters.preserveUnits ? 'はい' : 'いいえ'}
- ATMOSPHEREゾーン材料: ${result.parameters.atmosphereMaterial}
${result.parameters.atmosphereDensity ? `- 密度: ${result.parameters.atmosphereDensity} g/cm³` : ''}

**バックアップ情報:**
- バックアップ作成: ${result.result.backup_created ? '完了' : '失敗'}
- コメント: ${backup_comment}

**現在の状態:**
- 単位設定: 4キー完全性保証
- ATMOSPHEREゾーン: 必須保護
- 他のセクション: リセットレベルに応じて初期化

${result.result.message}`
          }
        ]
      };

    } catch (error) {
      logger.error('poker_resetYaml ハンドラーエラー', { error: error.message });
      
      // エラーの種類に応じた適切なエラーコード設定
      if (error instanceof McpError) {
        throw error;
      }
      
      // ValidationErrorやDataErrorのマッピング
      if (error.code === 'INVALID_RESET_LEVEL') {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      } else if (error.code === 'ATMOSPHERE_VALIDATION_FAILED') {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      } else if (error.code === 'RESET_FAILED') {
        throw new McpError(ErrorCode.InternalError, `リセット操作に失敗しました: ${error.message}`);
      } else if (error.code === 'POST_RESET_VALIDATION_FAILED') {
        throw new McpError(ErrorCode.InternalError, `リセット後の検証に失敗しました: ${error.message}`);
      }
      
      // 一般的なエラー
      throw new McpError(ErrorCode.InternalError, `YAML初期化エラー: ${error.message}`);
    }
  };
}

export const resetHandlers = {
  resetYaml: (taskManager) => createResetYamlHandler(taskManager)
};
