// src/validators/PhysicsValidatorSimple.js
import { z } from 'zod';
import { ValidationError, PhysicsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class PhysicsValidator {
  static MATERIAL_PROPERTIES = {
    'Concrete': { densityRange: { min: 1.8, max: 2.5 }, type: 'structural' },
    'Iron': { densityRange: { min: 7.6, max: 7.9 }, type: 'metal' },
    'Lead': { densityRange: { min: 11.0, max: 11.4 }, type: 'heavy_metal' },
    'Water': { densityRange: { min: 0.95, max: 1.05 }, type: 'liquid' },
    'Air': { densityRange: { min: 0.001, max: 0.002 }, type: 'gas' },
    'VOID': { densityRange: { min: 0, max: 0 }, type: 'void' }
  };

  static GEOMETRY_TYPES = {
    'SPH': { requiredParams: ['center', 'radius'] },
    'RCC': { requiredParams: ['bottom_center', 'height_vector', 'radius'] },
    'RPP': { requiredParams: ['min', 'max'] },
    'BOX': { requiredParams: ['vertex', 'edge_1', 'edge_2', 'edge_3'] },
    'CMB': { requiredParams: ['expression'] }
  };

  static VectorSchema = z.string().refine(val => {
    const parts = val.trim().split(/\s+/);
    return parts.length === 3 && parts.every(x => !isNaN(Number(x)));
  }, "3つの数値（空白区切り）で指定してください");

  static PositiveNumberSchema = z.union([
    z.number().positive(),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "正の数値")
  ]).transform(val => Number(val));

  static validateMaterialDensity(material, density) {
    const properties = this.MATERIAL_PROPERTIES[material];
    
    if (!properties) {
      throw new ValidationError(`未知の材料: ${material}`, 'material', material);
    }

    if (material === 'VOID') {
      if (density !== undefined && density !== 0) {
        throw new PhysicsError('VOID材料の密度は0である必要があります');
      }
      return true;
    }

    if (density === undefined || density === null) {
      throw new ValidationError(`材料 ${material} には密度が必要です`, 'density', density);
    }

    const numDensity = Number(density);
    const { min, max } = properties.densityRange;

    if (numDensity < min || numDensity > max) {
      throw new PhysicsError(
        `材料 ${material} の密度 ${numDensity} は範囲 [${min}, ${max}] g/cm³ を外れています`
      );
    }

    return true;
  }

  static validateGeometry(type, params) {
    const geometryDef = this.GEOMETRY_TYPES[type];
    
    if (!geometryDef) {
      throw new ValidationError(`未サポートの形状: ${type}`, 'type', type);
    }

    for (const param of geometryDef.requiredParams) {
      if (!(param in params) || params[param] === undefined) {
        throw new ValidationError(`${type}型には${param}が必須です`, param, undefined);
      }
    }

    // 基本的な値のバリデーション
    if (type === 'SPH' && params.radius) {
      this.PositiveNumberSchema.parse(params.radius);
    }
    if (type === 'RCC' && params.radius) {
      this.PositiveNumberSchema.parse(params.radius);
    }

    return true;
  }
}
