// validators/PhysicsValidator.js
import { z } from 'zod';
import { ValidationError, PhysicsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class PhysicsValidator {
  static getMaterialProperties() {
    // fallbackデータを返す
    return {
      'Concrete': { densityRange: { min: 1.8, max: 2.5 } },
      'Iron': { densityRange: { min: 7.6, max: 7.9 } },
      'Lead': { densityRange: { min: 11.0, max: 11.4 } },
      'Water': { densityRange: { min: 0.95, max: 1.05 } },
      'Air': { densityRange: { min: 0.001, max: 0.002 } },
      'VOID': { densityRange: { min: 0, max: 0 } }
    };
  }

  static GEOMETRY_TYPES = {
    'BOX': {
      requiredParams: ['vertex', 'edge_1', 'edge_2', 'edge_3'],
      description: '直方体（頂点＋3つの辺）'
    },
    'RPP': {
      requiredParams: ['min', 'max'],
      description: '軸平行直方体（最小・最大座標）'
    },
    'SPH': {
      requiredParams: ['center', 'radius'],
      description: '球体'
    },
    'RCC': {
      requiredParams: ['bottom_center', 'height_vector', 'radius'],
      description: '円柱'
    },
    'CMB': {
      requiredParams: ['expression'],
      description: '組み合わせ形状'
    }
  };

  static VectorSchema = z.string().refine(val => {
    const parts = val.trim().split(/\s+/);
    return parts.length === 3 && parts.every(x => !isNaN(Number(x)) && isFinite(Number(x)));
  }, "3つの有限数値（空白区切り）で指定してください");

  static PositiveNumberSchema = z.union([
    z.number().positive(),
    z.string().refine(val => {
      const num = Number(val);
      return !isNaN(num) && num > 0 && isFinite(num);
    }, "正の数値を指定してください")
  ]).transform(val => Number(val));

  static validateMaterialDensity(material, density) {
    const materialProperties = this.getMaterialProperties();
    const properties = materialProperties[material];
    
    if (!properties) {
      throw new ValidationError(
        `未知の材料です: ${material}`,
        'material',
        material
      );
    }

    if (material === 'VOID') {
      if (density !== undefined && density !== 0) {
        throw new PhysicsError(
          'VOID材料の密度は0でなければなりません',
          'VOID_DENSITY_ERROR'
        );
      }
      return true;
    }

    if (density === undefined || density === null) {
      throw new ValidationError(
        `材料 ${material} には密度の指定が必要です`,
        'density',
        density
      );
    }

    const numDensity = Number(density);
    const { min, max } = properties.densityRange;

    if (numDensity < min || numDensity > max) {
      throw new PhysicsError(
        `材料 ${material} の密度 ${numDensity} は物理的範囲 [${min}, ${max}] g/cm³ を外れています`,
        'DENSITY_OUT_OF_RANGE'
      );
    }

    return true;
  }

  static validateGeometry(type, params) {
    const geometryDef = this.GEOMETRY_TYPES[type];
    
    if (!geometryDef) {
      throw new ValidationError(
        `未サポートの形状タイプ: ${type}`,
        'type',
        type
      );
    }

    // 必須パラメータのチェック
    for (const param of geometryDef.requiredParams) {
      if (!(param in params) || params[param] === undefined) {
        throw new ValidationError(
          `${type}型には${param}パラメータが必須です`,
          param,
          undefined
        );
      }
    }

    // 型別の詳細バリデーション
    switch (type) {
      case 'SPH':
        this.validateSphere(params);
        break;
      case 'RCC':
        this.validateCylinder(params);
        break;
      case 'RPP':
        this.validateRectangularParallelepiped(params);
        break;
    }

    return true;
  }

  static validateSphere(params) {
    this.VectorSchema.parse(params.center);
    const radius = this.PositiveNumberSchema.parse(params.radius);
    
    if (radius > 1000) {
      logger.warn('非常に大きな球体が定義されています', { radius });
    }
  }

  static validateCylinder(params) {
    this.VectorSchema.parse(params.bottom_center);
    this.VectorSchema.parse(params.height_vector);
    const radius = this.PositiveNumberSchema.parse(params.radius);
    
    const [hx, hy, hz] = params.height_vector.split(/\s+/).map(Number);
    const height = Math.sqrt(hx*hx + hy*hy + hz*hz);
    
    if (height === 0) {
      throw new PhysicsError(
        '円柱の高さベクトルは零ベクトルにできません',
        'ZERO_HEIGHT_VECTOR'
      );
    }
  }

  static validateRectangularParallelepiped(params) {
    this.VectorSchema.parse(params.min);
    this.VectorSchema.parse(params.max);
    
    const [minX, minY, minZ] = params.min.split(/\s+/).map(Number);
    const [maxX, maxY, maxZ] = params.max.split(/\s+/).map(Number);
    
    if (minX >= maxX || minY >= maxY || minZ >= maxZ) {
      throw new PhysicsError(
        'RPPの最小座標は最大座標より小さくなければなりません',
        'INVALID_RPP_BOUNDS'
      );
    }
  }
}
