// validators/SourceValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';
import { ManifestValidator } from './ManifestValidator.js';
import { NuclideValidator } from './NuclideValidator.js';

/**
 * Source構造の複雑なgeometry/divisionバリデーター
 * マニフェスト仕様に完全準拠した高度なSource構造検証
 */
export class SourceValidator {
  
  /**
   * サポートされるSource型定義
   */
  static SUPPORTED_SOURCE_TYPES = {
    'POINT': {
      description: '点線源',
      requiresGeometry: false,
      requiresDivision: false,
      requiredFields: ['position']
    },
    'BOX': {
      description: '直方体線源', 
      requiresGeometry: true,
      requiresDivision: true,
      geometryFields: ['vertex', 'edge_1', 'edge_2', 'edge_3'],
      divisionFields: ['edge_1', 'edge_2', 'edge_3']
    },
    'RPP': {
      description: '軸平行直方体線源',
      requiresGeometry: true,
      requiresDivision: true,
      geometryFields: ['min', 'max'],
      divisionFields: ['edge_1', 'edge_2', 'edge_3']
    },
    'SPH': {
      description: '球体線源',
      requiresGeometry: true,
      requiresDivision: true,
      geometryFields: ['center', 'radius'],
      divisionFields: ['r', 'theta', 'phi']
    },
    'RCC': {
      description: '円柱線源',
      requiresGeometry: true,
      requiresDivision: true,
      geometryFields: ['bottom_center', 'height_vector', 'radius'],
      divisionFields: ['r', 'phi', 'z']
    }
  };

  /**
   * 分割タイプの定義
   */
  static DIVISION_TYPES = {
    'UNIFORM': { description: '均等分割', default: true },
    'GAUSS_FIRST': { description: 'ガウス分割（最初に集中）' },
    'GAUSS_LAST': { description: 'ガウス分割（最後に集中）' },
    'GAUSS_BOTH': { description: 'ガウス分割（両端に集中）' },
    'GAUSS_CENTER': { description: 'ガウス分割（中央に集中）' }
  };

  /**
   * Source基本情報の検証
   */
  static validateSourceBasics(sourceData) {
    const { name, type, inventory } = sourceData;
    
    // 基本フィールドの検証
    ManifestValidator.validateObjectName(name, 'source name');
    
    if (!type || !this.SUPPORTED_SOURCE_TYPES[type]) {
      throw PokerMcpError.validationError(
        `Unsupported source type: ${type}. Supported types: ${Object.keys(this.SUPPORTED_SOURCE_TYPES).join(', ')}`,
        'type',
        type
      );
    }
    
    // インベントリの検証
    NuclideValidator.validateInventory(inventory);
    
    return true;
  }

  /**
   * POINT線源の検証
   */
  static validatePointSource(sourceData) {
    const { position } = sourceData;
    
    if (!position) {
      throw PokerMcpError.validationError(
        'POINT source requires position',
        'position',
        position
      );
    }
    
    ManifestValidator.validateCoordinateString(position, 'position');
    
    // POINT線源では geometry と division は不要
    if (sourceData.geometry) {
      console.warn('POINT source does not require geometry parameter');
    }
    
    if (sourceData.division) {
      console.warn('POINT source does not require division parameter');
    }
    
    return true;
  }

  /**
   * BOX線源のgeometry検証
   */
  static validateBoxGeometry(geometry) {
    const { vertex, edge_1, edge_2, edge_3, transform } = geometry;
    
    // 必須フィールドの検証
    ManifestValidator.validateCoordinateString(vertex, 'geometry.vertex');
    ManifestValidator.validateCoordinateString(edge_1, 'geometry.edge_1');
    ManifestValidator.validateCoordinateString(edge_2, 'geometry.edge_2');
    ManifestValidator.validateCoordinateString(edge_3, 'geometry.edge_3');
    
    // エッジベクトルの物理的妥当性チェック
    const edges = [edge_1, edge_2, edge_3];
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = edges[i].split(/\s+/).map(Number);
      const length = Math.sqrt(x*x + y*y + z*z);
      if (length < 1e-10) {
        throw PokerMcpError.validationError(
          `BOX geometry edge_${i+1} cannot be zero vector`,
          `geometry.edge_${i+1}`,
          edges[i]
        );
      }
    }
    
    // Transform参照の検証（存在する場合）
    if (transform) {
      ManifestValidator.validateObjectName(transform, 'geometry.transform');
    }
    
    return true;
  }

  /**
   * RPP線源のgeometry検証
   */
  static validateRppGeometry(geometry) {
    const { min, max, transform } = geometry;
    
    // 必須フィールドの検証
    ManifestValidator.validateCoordinateString(min, 'geometry.min');
    ManifestValidator.validateCoordinateString(max, 'geometry.max');
    
    // 最小・最大座標の妥当性チェック
    const [minX, minY, minZ] = min.split(/\s+/).map(Number);
    const [maxX, maxY, maxZ] = max.split(/\s+/).map(Number);
    
    if (minX >= maxX || minY >= maxY || minZ >= maxZ) {
      throw PokerMcpError.validationError(
        'RPP geometry: min coordinates must be less than max coordinates',
        'geometry',
        { min, max }
      );
    }
    
    // Transform参照の検証（存在する場合）
    if (transform) {
      ManifestValidator.validateObjectName(transform, 'geometry.transform');
    }
    
    return true;
  }

  /**
   * SPH線源のgeometry検証
   */
  static validateSphGeometry(geometry) {
    const { center, radius, transform } = geometry;
    
    // 必須フィールドの検証
    ManifestValidator.validateCoordinateString(center, 'geometry.center');
    ManifestValidator.validatePositiveRadius(radius, 'geometry.radius');
    
    // Transform参照の検証（存在する場合）
    if (transform) {
      ManifestValidator.validateObjectName(transform, 'geometry.transform');
    }
    
    return true;
  }

  /**
   * RCC線源のgeometry検証
   */
  static validateRccGeometry(geometry) {
    const { bottom_center, height_vector, radius, transform } = geometry;
    
    // 必須フィールドの検証
    ManifestValidator.validateCoordinateString(bottom_center, 'geometry.bottom_center');
    ManifestValidator.validateCoordinateString(height_vector, 'geometry.height_vector');
    ManifestValidator.validatePositiveRadius(radius, 'geometry.radius');
    
    // 高さベクトルの妥当性チェック
    const [hx, hy, hz] = height_vector.split(/\s+/).map(Number);
    const height = Math.sqrt(hx*hx + hy*hy + hz*hz);
    if (height < 1e-10) {
      throw PokerMcpError.validationError(
        'RCC geometry height_vector cannot be zero vector',
        'geometry.height_vector',
        height_vector
      );
    }
    
    // Transform参照の検証（存在する場合）
    if (transform) {
      ManifestValidator.validateObjectName(transform, 'geometry.transform');
    }
    
    return true;
  }

  /**
   * Source geometry全体の検証
   */
  static validateSourceGeometry(type, geometry) {
    const sourceType = this.SUPPORTED_SOURCE_TYPES[type];
    
    if (!sourceType.requiresGeometry) {
      return true; // geometry不要な線源タイプ
    }
    
    if (!geometry || typeof geometry !== 'object') {
      throw PokerMcpError.validationError(
        `${type} source requires geometry object`,
        'geometry',
        geometry
      );
    }
    
    // タイプ別の詳細検証
    switch (type) {
      case 'BOX':
        return this.validateBoxGeometry(geometry);
      case 'RPP':
        return this.validateRppGeometry(geometry);
      case 'SPH':
        return this.validateSphGeometry(geometry);
      case 'RCC':
        return this.validateRccGeometry(geometry);
      default:
        throw PokerMcpError.validationError(
          `Unknown geometry validation for type: ${type}`,
          'type',
          type
        );
    }
  }

  /**
   * 分割軸の検証
   */
  static validateDivisionAxis(axis, fieldName) {
    if (!axis || typeof axis !== 'object') {
      throw PokerMcpError.validationError(
        `${fieldName} must be a division axis object`,
        fieldName,
        axis
      );
    }
    
    const { type, number, min = 0.0, max = 1.0 } = axis;
    
    // 分割タイプの検証
    if (!type || !this.DIVISION_TYPES[type]) {
      throw PokerMcpError.validationError(
        `Invalid division type: ${type}. Valid types: ${Object.keys(this.DIVISION_TYPES).join(', ')}`,
        `${fieldName}.type`,
        type
      );
    }
    
    // 分割数の検証
    ManifestValidator.validateGridDivision(number, `${fieldName}.number`);
    
    // 分割範囲の検証
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw PokerMcpError.validationError(
        `${fieldName} min and max must be numbers`,
        fieldName,
        { min, max }
      );
    }
    
    if (min < 0.0 || min > 1.0 || max < 0.0 || max > 1.0) {
      throw PokerMcpError.validationError(
        `${fieldName} min and max must be between 0.0 and 1.0`,
        fieldName,
        { min, max }
      );
    }
    
    if (min >= max) {
      throw PokerMcpError.validationError(
        `${fieldName} min must be less than max`,
        fieldName,
        { min, max }
      );
    }
    
    return true;
  }

  /**
   * BOX/RPP線源のdivision検証
   */
  static validateCartesianDivision(division) {
    const { edge_1, edge_2, edge_3 } = division;
    
    this.validateDivisionAxis(edge_1, 'division.edge_1');
    this.validateDivisionAxis(edge_2, 'division.edge_2');
    this.validateDivisionAxis(edge_3, 'division.edge_3');
    
    return true;
  }

  /**
   * SPH線源のdivision検証
   */
  static validateSphericalDivision(division) {
    const { r, theta, phi } = division;
    
    this.validateDivisionAxis(r, 'division.r');
    this.validateDivisionAxis(theta, 'division.theta');
    this.validateDivisionAxis(phi, 'division.phi');
    
    // 球面座標特有の検証
    if (theta.max > 1.0) {
      console.warn('SPH division theta.max > 1.0 may represent angles > π');
    }
    
    if (phi.max > 1.0) {
      console.warn('SPH division phi.max > 1.0 may represent angles > 2π');
    }
    
    return true;
  }

  /**
   * RCC線源のdivision検証
   */
  static validateCylindricalDivision(division) {
    const { r, phi, z } = division;
    
    this.validateDivisionAxis(r, 'division.r');
    this.validateDivisionAxis(phi, 'division.phi');
    this.validateDivisionAxis(z, 'division.z');
    
    // 円柱座標特有の検証
    if (phi.max > 1.0) {
      console.warn('RCC division phi.max > 1.0 may represent angles > 2π');
    }
    
    return true;
  }

  /**
   * Source division全体の検証
   */
  static validateSourceDivision(type, division) {
    const sourceType = this.SUPPORTED_SOURCE_TYPES[type];
    
    if (!sourceType.requiresDivision) {
      return true; // division不要な線源タイプ
    }
    
    if (!division || typeof division !== 'object') {
      throw PokerMcpError.validationError(
        `${type} source requires division object`,
        'division',
        division
      );
    }
    
    // タイプ別の詳細検証
    switch (type) {
      case 'BOX':
      case 'RPP':
        return this.validateCartesianDivision(division);
      case 'SPH':
        return this.validateSphericalDivision(division);
      case 'RCC':
        return this.validateCylindricalDivision(division);
      default:
        throw PokerMcpError.validationError(
          `Unknown division validation for type: ${type}`,
          'type',
          type
        );
    }
  }

  /**
   * カットオフ率の検証（必須パラメータ）
   */
  static validateCutoffRate(cutoff_rate) {
    if (cutoff_rate === undefined) {
      throw PokerMcpError.validationError(
        'cutoff_rate parameter is required for radiation shielding calculation accuracy',
        'cutoff_rate',
        cutoff_rate,
        -32050
      );
    }
    
    ManifestValidator.validateCutoffRate(cutoff_rate, 'cutoff_rate');
    
    return true;
  }

  /**
   * Source構造全体の包括的検証
   */
  static validateCompleteSourceStructure(sourceData) {
    const { name, type, position, geometry, division, inventory, cutoff_rate } = sourceData;
    
    // 基本情報の検証
    this.validateSourceBasics(sourceData);
    
    // タイプ別の詳細検証
    if (type === 'POINT') {
      this.validatePointSource(sourceData);
    } else {
      // 複雑なSource構造の検証
      this.validateSourceGeometry(type, geometry);
      this.validateSourceDivision(type, division);
    }
    
    // カットオフ率の検証
    this.validateCutoffRate(cutoff_rate);
    
    return {
      name,
      type,
      isPoint: type === 'POINT',
      requiresGeometry: this.SUPPORTED_SOURCE_TYPES[type].requiresGeometry,
      requiresDivision: this.SUPPORTED_SOURCE_TYPES[type].requiresDivision,
      inventoryCount: inventory.length,
      hasTransform: !!(geometry && geometry.transform),
      divisionComplexity: this._calculateDivisionComplexity(type, division)
    };
  }

  /**
   * Division複雑度の計算
   * @private
   */
  static _calculateDivisionComplexity(type, division) {
    if (type === 'POINT' || !division) {
      return 0;
    }
    
    let complexity = 1;
    const sourceType = this.SUPPORTED_SOURCE_TYPES[type];
    
    for (const field of sourceType.divisionFields) {
      if (division[field]) {
        complexity *= division[field].number || 1;
      }
    }
    
    return complexity;
  }

  /**
   * Source構造の最適化提案
   */
  static analyzeSrcStructureOptimization(sourceData) {
    const analysis = this.validateCompleteSourceStructure(sourceData);
    const suggestions = [];
    
    // 分割数最適化の提案
    if (analysis.divisionComplexity > 1000) {
      suggestions.push({
        type: 'performance',
        message: `High division complexity (${analysis.divisionComplexity}). Consider reducing division numbers for better performance.`
      });
    }
    
    // 不要なgeometry/division警告
    if (analysis.isPoint && (sourceData.geometry || sourceData.division)) {
      suggestions.push({
        type: 'cleanup',
        message: 'POINT source does not need geometry or division parameters.'
      });
    }
    
    // インベントリ最適化
    if (analysis.inventoryCount > 10) {
      suggestions.push({
        type: 'complexity',
        message: `Large inventory (${analysis.inventoryCount} nuclides). Consider grouping similar nuclides.`
      });
    }
    
    return {
      analysis,
      suggestions,
      isOptimal: suggestions.length === 0
    };
  }
}
