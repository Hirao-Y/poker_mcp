// validators/TransformValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';
import { ManifestValidator } from './ManifestValidator.js';

/**
 * Transform参照の検証を行うクラス
 * YAMLデータのtransformセクション内での名前存在確認
 */
export class TransformValidator {
  
  /**
   * Transform参照の存在確認
   * @param {string} transformName - 参照するtransform名
   * @param {Array} existingTransforms - YAMLファイル内のtransform配列
   * @param {string} fieldName - フィールド名（エラー表示用）
   */
  static validateTransformReference(transformName, existingTransforms, fieldName = 'transform') {
    // transform名自体のバリデーション
    ManifestValidator.validateObjectName(transformName, fieldName);
    
    // 既存transformsがnullまたは未定義の場合
    if (!existingTransforms || !Array.isArray(existingTransforms)) {
      throw PokerMcpError.transformNotFound(transformName);
    }
    
    // transform名の存在確認
    const transformExists = existingTransforms.some(t => t && t.name === transformName);
    
    if (!transformExists) {
      throw PokerMcpError.invalidTransformReference(transformName);
    }
    
    return true;
  }

  /**
   * Transform操作の検証
   * @param {Array} operations - 変換操作の配列
   */
  static validateTransformOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw PokerMcpError.validationError(
        'operations must be a non-empty array',
        'operations',
        operations
      );
    }

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      if (!operation || typeof operation !== 'object') {
        throw PokerMcpError.validationError(
          `operation[${i}] must be an object`,
          `operations[${i}]`,
          operation
        );
      }

      const keys = Object.keys(operation);
      if (keys.length !== 1) {
        throw PokerMcpError.validationError(
          `operation[${i}] must have exactly one key`,
          `operations[${i}]`,
          operation
        );
      }

      const operationType = keys[0];
      const operationValue = operation[operationType];

      switch (operationType) {
        case 'translate':
          ManifestValidator.validateCoordinateString(operationValue, `operations[${i}].translate`);
          break;
          
        case 'rotate_around_x':
        case 'rotate_around_y':
        case 'rotate_around_z':
          ManifestValidator.validateRotationAngle(operationValue, `operations[${i}].${operationType}`);
          break;
          
        default:
          throw PokerMcpError.validationError(
            `Invalid operation type: ${operationType}. Valid types: translate, rotate_around_x, rotate_around_y, rotate_around_z`,
            `operations[${i}]`,
            operationType
          );
      }
    }
    
    return true;
  }

  /**
   * Body/Source/DetectorのTransform参照を検証
   * @param {string} transformName - 参照するtransform名
   * @param {Object} yamlData - YAMLデータ全体
   * @param {string} contextType - コンテキストタイプ（body/source/detector）
   * @param {string} contextName - コンテキスト名
   */
  static validateContextTransformReference(transformName, yamlData, contextType, contextName) {
    if (!transformName) {
      return true; // transform参照はオプション
    }
    
    try {
      this.validateTransformReference(transformName, yamlData.transform, 'transform');
    } catch (error) {
      // エラーメッセージにコンテキスト情報を追加
      if (error instanceof PokerMcpError) {
        throw new PokerMcpError(
          error.code,
          `${contextType} '${contextName}' references invalid transform: ${error.message}`,
          'transform',
          transformName
        );
      }
      throw error;
    }
    
    return true;
  }

  /**
   * Transform依存関係チェック
   * Transform削除時に、そのTransformを参照しているBody/Source/Detectorがないかチェック
   * @param {string} transformName - 削除対象のtransform名
   * @param {Object} yamlData - YAMLデータ全体
   */
  static checkTransformDependencies(transformName, yamlData) {
    const dependencies = [];
    
    // Body内のtransform参照をチェック
    if (yamlData.body && Array.isArray(yamlData.body)) {
      for (const body of yamlData.body) {
        if (body.transform === transformName) {
          dependencies.push(`body: ${body.name}`);
        }
      }
    }
    
    // Source内のtransform参照をチェック
    if (yamlData.source && Array.isArray(yamlData.source)) {
      for (const source of yamlData.source) {
        // geometry内のtransform参照をチェック
        if (source.geometry && source.geometry.transform === transformName) {
          dependencies.push(`source: ${source.name}`);
        }
      }
    }
    
    // Detector内のtransform参照をチェック
    if (yamlData.detector && Array.isArray(yamlData.detector)) {
      for (const detector of yamlData.detector) {
        if (detector.transform === transformName) {
          dependencies.push(`detector: ${detector.name}`);
        }
      }
    }
    
    if (dependencies.length > 0) {
      throw PokerMcpError.dependencyExists(transformName, dependencies);
    }
    
    return true;
  }
}
