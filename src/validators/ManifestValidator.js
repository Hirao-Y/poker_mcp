// validators/ManifestValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';

/**
 * マニフェスト仕様準拠バリデーター
 * マニフェストで定義されたパラメータ制約を厳密に実装
 */
export class ManifestValidator {
  
  // オブジェクト名の検証（英数字とアンダースコアのみ、50文字以内）
  static validateObjectName(name, fieldName = 'name') {
    if (!name || typeof name !== 'string') {
      throw PokerMcpError.validationError(`${fieldName} is required and must be a string`, fieldName, name);
    }
    
    // ハイフンチェック
    if (name.includes('-')) {
      throw PokerMcpError.invalidNameFormatHyphens(name);
    }
    
    // パターンチェック: 英数字とアンダースコアのみ
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      const invalidChars = name.match(/[^a-zA-Z0-9_]/g) || [];
      throw PokerMcpError.nameForbiddenCharacters(name, [...new Set(invalidChars)]);
    }
    
    // 長さチェック
    if (name.length > 50) {
      throw PokerMcpError.validationError(`${fieldName} must be 50 characters or less`, fieldName, name);
    }
    
    return true;
  }

  // 座標文字列の検証（x y z形式）
  static validateCoordinateString(coordString, fieldName) {
    if (!coordString || typeof coordString !== 'string') {
      throw PokerMcpError.validationError(`${fieldName} must be a coordinate string`, fieldName, coordString);
    }
    
    const pattern = /^-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?$/;
    if (!pattern.test(coordString.trim())) {
      throw PokerMcpError.validationError(
        `${fieldName} must be in "x y z" format with numeric values`,
        fieldName,
        coordString
      );
    }
    
    return true;
  }

  // 正の半径値検証
  static validatePositiveRadius(radius, fieldName) {
    if (typeof radius !== 'number' || radius <= 0) {
      throw PokerMcpError.validationError(`${fieldName} must be a positive number`, fieldName, radius);
    }
    
    if (radius < 0.001 || radius > 10000) {
      throw PokerMcpError.validationError(`${fieldName} must be between 0.001 and 10000`, fieldName, radius);
    }
    
    return true;
  }

  // 密度値検証
  static validateDensityValue(density, fieldName) {
    if (typeof density !== 'number' || density <= 0) {
      throw PokerMcpError.validationError(`${fieldName} must be a positive number`, fieldName, density);
    }
    
    if (density < 0.001 || density > 30.0) {
      throw PokerMcpError.validationError(`${fieldName} must be between 0.001 and 30.0 g/cm³`, fieldName, density);
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

  // サポートされる材料の検証
  static validateSupportedMaterial(material, fieldName) {
    const supportedMaterials = [
      'Carbon', 'Concrete', 'Iron', 'Lead', 'Aluminum', 
      'Copper', 'Tungsten', 'Air', 'Water', 'PyrexGlass', 
      'AcrylicResin', 'Polyethylene', 'Soil'
    ];
    
    if (!supportedMaterials.includes(material)) {
      throw PokerMcpError.validationError(
        `${fieldName} must be one of supported materials: ${supportedMaterials.join(', ')}`,
        fieldName,
        material
      );
    }
    
    return true;
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
