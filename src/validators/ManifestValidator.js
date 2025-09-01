// validators/ManifestValidator.js
// 最終的なエラー処理は呈出先で実装（循環依存解消のため）
import { MaterialAlternatives } from '../utils/MaterialAlternatives.js';

/**
 * マニフェスト仕様準拠バリデーター（循環依存解消版）
 * マニフェストで定義されたパラメータ制約を厳密に実装
 */
export class ManifestValidator {
  
  // オブジェクト名の検証（英数字とアンダースコアのみ、50文字以内）
  static validateObjectName(name, fieldName = 'name') {
    if (!name || typeof name !== 'string') {
      const error = new Error(`${fieldName} is required and must be a string`);
      error.field = fieldName;
      error.value = name;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    // ATMOSPHERE予約語チェック
    if (name === 'ATMOSPHERE') {
      const error = new Error(`ATMOSPHERE is reserved - cannot be used as ${fieldName}`);
      error.field = fieldName;
      error.value = name;
      error.code = 'ATMOSPHERE_RESERVED';
      throw error;
    }
    
    // ハイフンチェック
    if (name.includes('-')) {
      const error = new Error(`Invalid name format - hyphens not allowed: ${name}`);
      error.field = 'name';
      error.value = name;
      error.code = 'INVALID_NAME_FORMAT_HYPHENS';
      throw error;
    }
    
    // パターンチェック: 英数字とアンダースコアのみ
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      const invalidChars = name.match(/[^a-zA-Z0-9_]/g) || [];
      const error = new Error(`Name contains forbidden characters: ${name} (invalid: ${invalidChars.join(', ')})`);
      error.field = 'name';
      error.value = name;
      error.code = 'NAME_FORBIDDEN_CHARACTERS';
      throw error;
    }
    
    // 長さチェック
    if (name.length > 50) {
      const error = new Error(`${fieldName} must be 50 characters or less`);
      error.field = fieldName;
      error.value = name;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    return true;
  }

  // 座標文字列の検証（x y z形式）
  static validateCoordinateString(coordString, fieldName) {
    if (!coordString || typeof coordString !== 'string') {
      const error = new Error(`${fieldName} must be a coordinate string`);
      error.field = fieldName;
      error.value = coordString;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    const pattern = /^-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?$/;
    if (!pattern.test(coordString.trim())) {
      const error = new Error(`${fieldName} must be in "x y z" format with numeric values`);
      error.field = fieldName;
      error.value = coordString;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    return true;
  }

  // 正の半径値検証
  static validatePositiveRadius(radius, fieldName) {
    if (typeof radius !== 'number' || radius <= 0) {
      const error = new Error(`${fieldName} must be a positive number`);
      error.field = fieldName;
      error.value = radius;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    if (radius < 0.001 || radius > 10000) {
      const error = new Error(`${fieldName} must be between 0.001 and 10000`);
      error.field = fieldName;
      error.value = radius;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    return true;
  }

  // 密度値検証
  static validateDensityValue(density, fieldName) {
    if (typeof density !== 'number' || density <= 0) {
      const error = new Error(`${fieldName} must be a positive number`);
      error.field = fieldName;
      error.value = density;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    if (density < 0.001 || density > 30.0) {
      const error = new Error(`${fieldName} must be between 0.001 and 30.0 g/cm³`);
      error.field = fieldName;
      error.value = density;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    
    return true;
  }

  // 放射能値検証
  static validateRadioactivityValue(radioactivity, fieldName) {
    if (typeof radioactivity !== 'number' || radioactivity <= 0) {
      throw PokerMcpError.validationError(`${fieldName} must be a positive number`, fieldName, radioactivity);
    }
    
    if (radioactivity < 0.001 || radioactivity > 1e15) {
      throw PokerMcpError.validationError(`${fieldName} must be between 0.001 and 1e15 Bq`, fieldName, radioactivity);
    }
    
    return true;
  }

  // 回転角度検証
  static validateRotationAngle(angle, fieldName) {
    if (typeof angle !== 'number') {
      throw PokerMcpError.validationError(`${fieldName} must be a number`, fieldName, angle);
    }
    
    if (angle < -360 || angle > 360) {
      throw PokerMcpError.validationError(`${fieldName} must be between -360 and 360 degrees`, fieldName, angle);
    }
    
    return true;
  }

  // カットオフ率検証
  static validateCutoffRate(rate, fieldName) {
    if (typeof rate !== 'number') {
      throw PokerMcpError.validationError(`${fieldName} must be a number`, fieldName, rate);
    }
    
    if (rate < 0.0001 || rate > 1.0) {
      throw PokerMcpError.validationError(`${fieldName} must be between 0.0001 and 1.0`, fieldName, rate);
    }
    
    return true;
  }

  // ビルドアップ係数インデックス検証
  static validateBuildupIndex(index, fieldName) {
    if (!Number.isInteger(index) || index < 0 || index > 100) {
      throw PokerMcpError.validationError(`${fieldName} must be an integer between 0 and 100`, fieldName, index);
    }
    
    return true;
  }

  // グリッド分割数検証
  static validateGridDivision(number, fieldName) {
    if (!Number.isInteger(number) || number < 1 || number > 1000) {
      throw PokerMcpError.validationError(`${fieldName} must be an integer between 1 and 1000`, fieldName, number);
    }
    
    return true;
  }

  // サポートされる材料の検証（代替提案機能付き）
  static validateSupportedMaterial(material, fieldName) {
    // MaterialAlternativesクラスを使用して包括的なチェック
    try {
      return MaterialAlternatives.validateMaterialWithSuggestion(material, fieldName);
    } catch (error) {
      // エラーをそのまま再スロー（代替提案付きエラー含む）
      throw error;
    }
  }

  // 単位検証
  static validateSupportedLengthUnit(unit, fieldName) {
    const supportedUnits = ['m', 'cm', 'mm'];
    if (!supportedUnits.includes(unit)) {
      throw PokerMcpError.unitInvalidValue(fieldName, unit, supportedUnits);
    }
    return true;
  }

  static validateSupportedAngleUnit(unit, fieldName) {
    const supportedUnits = ['radian', 'degree'];
    if (!supportedUnits.includes(unit)) {
      throw PokerMcpError.unitInvalidValue(fieldName, unit, supportedUnits);
    }
    return true;
  }

  static validateSupportedDensityUnit(unit, fieldName) {
    const supportedUnits = ['g/cm3'];
    if (!supportedUnits.includes(unit)) {
      throw PokerMcpError.unitInvalidValue(fieldName, unit, supportedUnits);
    }
    return true;
  }

  static validateSupportedRadioactivityUnit(unit, fieldName) {
    const supportedUnits = ['Bq'];
    if (!supportedUnits.includes(unit)) {
      throw PokerMcpError.unitInvalidValue(fieldName, unit, supportedUnits);
    }
    return true;
  }

  // 立体タイプ検証
  static validateBodyType(type, fieldName) {
    const supportedTypes = ['SPH', 'RCC', 'RPP', 'BOX', 'CMB', 'TOR', 'ELL', 'REC', 'TRC', 'WED'];
    
    if (!supportedTypes.includes(type)) {
      throw PokerMcpError.invalidBodyType(type);
    }
    
    return true;
  }

  // コメント長検証
  static validateCommentLength(comment, fieldName) {
    if (typeof comment !== 'string') {
      throw PokerMcpError.validationError(`${fieldName} must be a string`, fieldName, comment);
    }
    
    if (comment.length > 200) {
      throw PokerMcpError.validationError(`${fieldName} must be 200 characters or less`, fieldName, comment);
    }
    
    return true;
  }
}
