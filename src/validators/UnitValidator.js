// validators/UnitValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';
import { ManifestValidator } from './ManifestValidator.js';

/**
 * Unit系の4キー完全性保証バリデーター
 * length, angle, density, radioactivityの4キー必須性を厳格管理
 */
export class UnitValidator {

  /**
   * 必須4キーの完全定義（遅延初期化版）
   * マニフェスト仕様に完全準拠
   */
  static get REQUIRED_UNIT_KEYS() {
    if (!this._cachedUnitKeys) {
      this._cachedUnitKeys = {
        length: {
          description: '長さの単位',
          allowedValues: ['m', 'cm', 'mm'],
          default: 'cm',
          physicalDimension: 'L',
          siBase: 'm',
          conversionFactors: {
            'm': 1.0,
            'cm': 0.01,
            'mm': 0.001
          }
        },
        angle: {
          description: '角度の単位', 
          allowedValues: ['radian', 'degree'],
          default: 'radian',
          physicalDimension: 'dimensionless',
          siBase: 'radian',
          conversionFactors: {
            'radian': 1.0,
            'degree': Math.PI / 180.0  // 遅延計算
          }
        },
        density: {
          description: '密度の単位',
          allowedValues: ['g/cm3'],
          default: 'g/cm3',
          physicalDimension: 'ML^-3',
          siBase: 'kg/m3',
          conversionFactors: {
            'g/cm3': 1000.0  // g/cm³ to kg/m³
          }
        },
        radioactivity: {
          description: '放射能の単位',
          allowedValues: ['Bq'],
          default: 'Bq',
          physicalDimension: 'T^-1',
          siBase: 'Bq',
          conversionFactors: {
            'Bq': 1.0
          }
        }
      };
    }
    return this._cachedUnitKeys;
  }

  /**
   * 単位システムの物理的整合性チェック用定数
   */
  static PHYSICAL_CONSISTENCY = {
    dimensionalAnalysis: {
      'L': 'length',        // 長さ次元
      'T': 'time',          // 時間次元  
      'M': 'mass',          // 質量次元
      'ML^-3': 'density',   // 密度次元
      'T^-1': 'frequency'   // 頻度次元（放射能）
    },
    unitCompatibility: {
      volume: ['length^3'],
      area: ['length^2'], 
      mass: ['density * volume'],
      activity: ['radioactivity']
    }
  };

  /**
   * 4キー完全性の基本検証
   * 全ての必須キーの存在と型を確認
   */
  static validateFourKeyCompleteness(unitData) {
    if (!unitData || typeof unitData !== 'object') {
      throw PokerMcpError.validationError(
        'Unit data must be an object with all 4 required keys',
        'unitData',
        unitData
      );
    }

    const providedKeys = Object.keys(unitData);
    const requiredKeys = Object.keys(this.REQUIRED_UNIT_KEYS);
    
    // 必須キーの存在チェック
    const missingKeys = requiredKeys.filter(key => !providedKeys.includes(key));
    if (missingKeys.length > 0) {
      throw PokerMcpError.validationError(
        `Missing required unit keys: ${missingKeys.join(', ')}. All 4 keys (length, angle, density, radioactivity) are mandatory`,
        'missingKeys',
        missingKeys
      );
    }

    // 余分なキーの検出
    const extraKeys = providedKeys.filter(key => !requiredKeys.includes(key));
    if (extraKeys.length > 0) {
      throw PokerMcpError.validationError(
        `Unknown unit keys found: ${extraKeys.join(', ')}. Only the 4 required keys are allowed`,
        'extraKeys',
        extraKeys
      );
    }

    // 各キーの値検証
    for (const [key, value] of Object.entries(unitData)) {
      this.validateSingleUnitKey(key, value);
    }

    return true;
  }

  /**
   * 単一単位キーの詳細検証
   */
  static validateSingleUnitKey(key, value) {
    const keySpec = this.REQUIRED_UNIT_KEYS[key];
    
    if (!keySpec) {
      throw PokerMcpError.validationError(
        `Invalid unit key: ${key}`,
        'key',
        key
      );
    }

    // 値の型チェック
    if (typeof value !== 'string') {
      throw PokerMcpError.validationError(
        `Unit key '${key}' value must be a string`,
        key,
        value
      );
    }

    // 値の空文字チェック
    if (!value.trim()) {
      throw PokerMcpError.validationError(
        `Unit key '${key}' cannot be empty`,
        key,
        value
      );
    }

    // 許可値チェック
    if (!keySpec.allowedValues.includes(value)) {
      throw PokerMcpError.validationError(
        `Invalid value '${value}' for unit key '${key}'. Allowed values: ${keySpec.allowedValues.join(', ')}`,
        key,
        value,
        `Expected one of: ${keySpec.allowedValues.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Unit構造の物理的整合性検証
   * 単位系の物理的な一貫性をチェック
   */
  static validatePhysicalConsistency(unitData) {
    this.validateFourKeyCompleteness(unitData);

    const consistencyReport = {
      isConsistent: true,
      warnings: [],
      recommendations: []
    };

    // SI単位系との整合性チェック
    for (const [key, value] of Object.entries(unitData)) {
      const keySpec = this.REQUIRED_UNIT_KEYS[key];
      const conversionFactor = keySpec.conversionFactors[value];
      
      if (Math.abs(conversionFactor - 1.0) > 1e-10) {
        consistencyReport.warnings.push({
          type: 'non_si_unit',
          key,
          value,
          message: `Using non-SI unit '${value}' for ${key}. SI base unit is '${keySpec.siBase}'`,
          conversionFactor
        });
      }
    }

    // 単位系の組み合わせ整合性
    const lengthUnit = unitData.length;
    const densityUnit = unitData.density;
    
    // 密度と長さの単位の組み合わせチェック
    if (lengthUnit === 'cm' && densityUnit === 'g/cm3') {
      // CGS系の組み合わせ - 良好
      consistencyReport.recommendations.push({
        type: 'unit_system_consistency',
        message: 'Using consistent CGS unit system (cm + g/cm³)'
      });
    } else if (lengthUnit === 'm' && densityUnit === 'g/cm3') {
      // 混合系 - 注意喚起
      consistencyReport.warnings.push({
        type: 'mixed_unit_system',
        message: 'Mixing SI length (m) with CGS density (g/cm³). Consider using consistent unit system'
      });
    }

    // 角度単位の使用状況チェック
    const angleUnit = unitData.angle;
    if (angleUnit === 'degree') {
      consistencyReport.warnings.push({
        type: 'angle_unit_warning',
        message: 'Using degree for angles. Radian is preferred for scientific calculations'
      });
    }

    return consistencyReport;
  }

  /**
   * Unit更新時の4キー保持検証
   * 部分更新でも4キー構造の維持を保証
   */
  static validatePartialUpdate(currentUnits, updates) {
    if (!currentUnits) {
      throw PokerMcpError.validationError(
        'Current unit data is required for partial update validation',
        'currentUnits',
        currentUnits
      );
    }

    // 現在の単位データの完全性を事前確認
    this.validateFourKeyCompleteness(currentUnits);

    if (!updates || typeof updates !== 'object') {
      throw PokerMcpError.validationError(
        'Update data must be an object',
        'updates',
        updates
      );
    }

    const updateKeys = Object.keys(updates);
    
    // 更新キーの妥当性チェック
    const invalidKeys = updateKeys.filter(key => 
      !Object.keys(this.REQUIRED_UNIT_KEYS).includes(key)
    );
    
    if (invalidKeys.length > 0) {
      throw PokerMcpError.validationError(
        `Invalid unit keys in update: ${invalidKeys.join(', ')}`,
        'invalidKeys',
        invalidKeys
      );
    }

    // 更新後の仮想データを構築して検証
    const updatedUnits = { ...currentUnits, ...updates };
    this.validateFourKeyCompleteness(updatedUnits);

    // 更新される各キーの個別検証
    for (const [key, value] of Object.entries(updates)) {
      this.validateSingleUnitKey(key, value);
    }

    return {
      isValid: true,
      updatedStructure: updatedUnits,
      changedKeys: updateKeys,
      preservedIntegrity: true
    };
  }

  /**
   * Unit構造の正規化処理
   * 4キー完全性を保持しつつデータを正規化
   */
  static normalizeUnitStructure(unitData) {
    // 基本検証
    this.validateFourKeyCompleteness(unitData);

    const normalized = {};
    
    // 必須4キーを順序保証で処理
    const keyOrder = ['length', 'angle', 'density', 'radioactivity'];
    
    for (const key of keyOrder) {
      const value = unitData[key];
      const keySpec = this.REQUIRED_UNIT_KEYS[key];
      
      // 値の正規化（空白除去、小文字化）
      let normalizedValue = value.trim();
      
      // 特別な正規化ルール
      if (key === 'angle') {
        if (normalizedValue === 'deg') normalizedValue = 'degree';
        if (normalizedValue === 'rad') normalizedValue = 'radian';
      }
      
      // 最終検証
      this.validateSingleUnitKey(key, normalizedValue);
      
      normalized[key] = normalizedValue;
    }

    return normalized;
  }

  /**
   * Unit変換係数の計算
   * 異なる単位系間の変換係数を提供
   */
  static calculateConversionFactors(fromUnits, toUnits) {
    this.validateFourKeyCompleteness(fromUnits);
    this.validateFourKeyCompleteness(toUnits);

    const conversionFactors = {};
    
    for (const key of Object.keys(this.REQUIRED_UNIT_KEYS)) {
      const fromValue = fromUnits[key];
      const toValue = toUnits[key];
      const keySpec = this.REQUIRED_UNIT_KEYS[key];
      
      const fromFactor = keySpec.conversionFactors[fromValue];
      const toFactor = keySpec.conversionFactors[toValue];
      
      // SI基準での変換係数計算
      conversionFactors[key] = fromFactor / toFactor;
    }

    return {
      factors: conversionFactors,
      fromUnits,
      toUnits,
      isIdentity: Object.values(conversionFactors).every(f => Math.abs(f - 1.0) < 1e-10)
    };
  }

  /**
   * Unit系のシステム全体整合性検証
   * YAMLファイル内でのUnit使用状況を包括チェック
   */
  static validateSystemUnitIntegrity(unitData, yamlData) {
    this.validateFourKeyCompleteness(unitData);

    const integrityReport = {
      unitStructure: 'valid',
      usageConsistency: [],
      potentialIssues: [],
      recommendations: []
    };

    // 長さ単位の使用状況チェック
    const lengthUnit = unitData.length;
    const lengthUsages = this.findLengthUsagesInYaml(yamlData);
    
    if (lengthUsages.length > 0) {
      integrityReport.usageConsistency.push({
        unit: lengthUnit,
        usageCount: lengthUsages.length,
        contexts: lengthUsages.map(u => u.context)
      });
    }

    // 密度単位の使用状況チェック
    const densityUnit = unitData.density;
    const densityUsages = this.findDensityUsagesInYaml(yamlData);
    
    if (densityUsages.length > 0) {
      integrityReport.usageConsistency.push({
        unit: densityUnit,
        usageCount: densityUsages.length,
        contexts: densityUsages.map(u => u.context)
      });
    }

    // 放射能単位の使用状況チェック
    const radioactivityUnit = unitData.radioactivity;
    const radioactivityUsages = this.findRadioactivityUsagesInYaml(yamlData);
    
    if (radioactivityUsages.length > 0) {
      integrityReport.usageConsistency.push({
        unit: radioactivityUnit,
        usageCount: radioactivityUsages.length,
        contexts: radioactivityUsages.map(u => u.context)
      });
    }

    // 角度単位の使用状況チェック（Transform）
    if (yamlData.transform && yamlData.transform.length > 0) {
      integrityReport.usageConsistency.push({
        unit: unitData.angle,
        usageCount: yamlData.transform.length,
        contexts: ['transform_rotations']
      });
    }

    return integrityReport;
  }

  /**
   * YAML内の長さ使用箇所を検索
   * @private
   */
  static findLengthUsagesInYaml(yamlData) {
    const usages = [];
    
    // Body座標での使用
    if (yamlData.body) {
      yamlData.body.forEach(body => {
        usages.push({ context: `body.${body.name}`, type: 'coordinates' });
      });
    }
    
    // Detector座標での使用
    if (yamlData.detector) {
      yamlData.detector.forEach(detector => {
        usages.push({ context: `detector.${detector.name}`, type: 'coordinates' });
        if (detector.grid) {
          detector.grid.forEach((_, idx) => {
            usages.push({ context: `detector.${detector.name}.grid[${idx}]`, type: 'edge_vector' });
          });
        }
      });
    }
    
    // Source位置での使用
    if (yamlData.source) {
      yamlData.source.forEach(source => {
        usages.push({ context: `source.${source.name}`, type: 'position' });
      });
    }
    
    return usages;
  }

  /**
   * YAML内の密度使用箇所を検索
   * @private
   */
  static findDensityUsagesInYaml(yamlData) {
    const usages = [];
    
    if (yamlData.zone) {
      yamlData.zone.forEach(zone => {
        if (zone.density !== undefined) {
          usages.push({ context: `zone.${zone.body_name}`, type: 'material_density' });
        }
      });
    }
    
    return usages;
  }

  /**
   * YAML内の放射能使用箇所を検索
   * @private
   */
  static findRadioactivityUsagesInYaml(yamlData) {
    const usages = [];
    
    if (yamlData.source) {
      yamlData.source.forEach(source => {
        if (source.inventory) {
          source.inventory.forEach((nuclide, idx) => {
            usages.push({ 
              context: `source.${source.name}.inventory[${idx}]`, 
              type: 'radioactivity',
              nuclide: nuclide.nuclide 
            });
          });
        }
      });
    }
    
    return usages;
  }

  /**
   * Unit系の完全性診断レポート
   * 4キー構造の健全性を包括的に診断
   */
  static generateIntegrityDiagnosticReport(unitData, yamlData = null) {
    const report = {
      timestamp: new Date().toISOString(),
      unitStructure: null,
      physicalConsistency: null,
      systemIntegrity: null,
      overallHealth: 'unknown',
      criticalIssues: [],
      warnings: [],
      recommendations: []
    };

    try {
      // 4キー完全性検証
      this.validateFourKeyCompleteness(unitData);
      report.unitStructure = {
        status: 'valid',
        hasAllFourKeys: true,
        keys: Object.keys(unitData),
        values: unitData
      };

      // 物理的整合性検証
      report.physicalConsistency = this.validatePhysicalConsistency(unitData);

      // システム整合性検証（YAML提供時）
      if (yamlData) {
        report.systemIntegrity = this.validateSystemUnitIntegrity(unitData, yamlData);
      }

      // 総合健康度判定
      const hasCriticalIssues = report.physicalConsistency.warnings
        .some(w => w.type === 'mixed_unit_system');
      
      if (hasCriticalIssues) {
        report.overallHealth = 'warning';
        report.warnings.push('Mixed unit systems detected - may affect calculation accuracy');
      } else if (report.physicalConsistency.warnings.length > 0) {
        report.overallHealth = 'minor_warnings';
      } else {
        report.overallHealth = 'excellent';
      }

      // 推奨事項の生成
      if (unitData.angle === 'degree') {
        report.recommendations.push('Consider using radian for angle unit in scientific calculations');
      }
      
      if (unitData.length !== 'cm' || unitData.density !== 'g/cm3') {
        report.recommendations.push('Current setup uses mixed unit systems. CGS (cm + g/cm³) is commonly preferred in radiation calculations');
      }

    } catch (error) {
      report.unitStructure = {
        status: 'invalid',
        error: error.message
      };
      report.overallHealth = 'critical';
      report.criticalIssues.push(error.message);
    }

    return report;
  }
}
