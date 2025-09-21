// validators/PhysicsValidator.js
import { z } from 'zod';
import { ValidationError, PhysicsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { CMBValidator } from './CMBValidator.js';

export class PhysicsValidator {
  static getMaterialProperties() {
    // fallbackデータを返す
    return {
      'Carbon': { densityRange: { min: 2.0, max: 2.3 } },
      'Concrete': { densityRange: { min: 1.8, max: 2.5 } },
      'Iron': { densityRange: { min: 7.6, max: 7.9 } },
      'Lead': { densityRange: { min: 11.0, max: 11.4 } },
      'Aluminum': { densityRange: { min: 2.6, max: 2.8 } },
      'Copper': { densityRange: { min: 8.8, max: 9.0 } },
      'Tungsten': { densityRange: { min: 18.5, max: 19.5 } },
      'Air': { densityRange: { min: 0.001, max: 0.002 } },
      'Water': { densityRange: { min: 0.95, max: 1.05 } },
      'PyrexGlass': { densityRange: { min: 2.2, max: 2.3 } },
      'AcrylicResin': { densityRange: { min: 1.1, max: 1.2 } },
      'Polyethylene': { densityRange: { min: 0.92, max: 0.97 } },
      'Soil': { densityRange: { min: 1.3, max: 2.0 } },
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
    },
    'TOR': {
      requiredParams: ['center', 'normal', 'major_radius', 'minor_radius_horizontal', 'minor_radius_vertical'],
      description: 'トーラス（ドーナツ形状）'
    },
    'ELL': {
      requiredParams: ['center', 'radius_vector_1', 'radius_vector_2', 'radius_vector_3'],
      description: '楕円体（3つの半径ベクトル）'
    },
    'REC': {
      requiredParams: ['bottom_center', 'height_vector', 'radius_vector_1', 'radius_vector_2'],
      description: '楕円円柱（2つの半径ベクトル）'
    },
    'TRC': {
      requiredParams: ['bottom_center', 'height_vector', 'bottom_radius', 'top_radius'],
      description: '円錐台（異なる上下半径）'
    },
    'WED': {
      requiredParams: ['vertex', 'width_vector', 'height_vector', 'depth_vector'],
      description: 'くさび形（頂点＋3方向ベクトル）'
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

  static validateGeometry(type, params, context = null) {
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
      case 'BOX':
        this.validateBox(params);
        break;
      case 'CMB':
        this.validateCombination(params, context);
        break;
      case 'TOR':
        this.validateTorus(params);
        break;
      case 'ELL':
        this.validateEllipsoid(params);
        break;
      case 'REC':
        this.validateEllipticalCylinder(params);
        break;
      case 'TRC':
        this.validateTruncatedCone(params);
        break;
      case 'WED':
        this.validateWedge(params);
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

  static validateBox(params) {
    this.VectorSchema.parse(params.vertex);
    this.VectorSchema.parse(params.edge_1);
    this.VectorSchema.parse(params.edge_2);
    this.VectorSchema.parse(params.edge_3);
    
    // エッジベクトルの長さチェック
    const edges = [params.edge_1, params.edge_2, params.edge_3];
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = edges[i].split(/\s+/).map(Number);
      const length = Math.sqrt(x*x + y*y + z*z);
      if (length === 0) {
        throw new PhysicsError(
          `BOXのエッジ${i+1}ベクトルは零ベクトルにできません`,
          'ZERO_EDGE_VECTOR'
        );
      }
    }
  }

  static validateCombination(params, context = null) {
    if (!params.expression || typeof params.expression !== 'string' || params.expression.trim() === '') {
      throw new ValidationError(
        'CMB型にはexpressionパラメータが必要です',
        'expression',
        params.expression
      );
    }

    // 新しいCMBValidatorを使用した詳細バリデーション
    if (context && context.name && context.existingBodies) {
      CMBValidator.validateExpression(params.expression, context.name, context.existingBodies);
    } else {
      // contextがない場合は基本チェックのみ
      CMBValidator.validateBasicSyntax(params.expression);
    }
  }

  static validateTorus(params) {
    this.VectorSchema.parse(params.center);
    this.VectorSchema.parse(params.normal);
    
    const majorRadius = this.PositiveNumberSchema.parse(params.major_radius);
    const minorRadiusH = this.PositiveNumberSchema.parse(params.minor_radius_horizontal);
    const minorRadiusV = this.PositiveNumberSchema.parse(params.minor_radius_vertical);
    
    // 法線ベクトルの長さチェック
    const [nx, ny, nz] = params.normal.split(/\s+/).map(Number);
    const normalLength = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (normalLength === 0) {
      throw new PhysicsError(
        'TORの法線ベクトルは零ベクトルにできません',
        'ZERO_NORMAL_VECTOR'
      );
    }
    
    // 主半径と副半径の関係チェック
    if (majorRadius <= Math.max(minorRadiusH, minorRadiusV)) {
      throw new PhysicsError(
        'TORの主半径は副半径より大きくなければなりません',
        'INVALID_TORUS_RADII'
      );
    }
  }

  static validateEllipsoid(params) {
    this.VectorSchema.parse(params.center);
    this.VectorSchema.parse(params.radius_vector_1);
    this.VectorSchema.parse(params.radius_vector_2);
    this.VectorSchema.parse(params.radius_vector_3);
    
    // 半径ベクトルの長さチェック
    const vectors = [params.radius_vector_1, params.radius_vector_2, params.radius_vector_3];
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = vectors[i].split(/\s+/).map(Number);
      const length = Math.sqrt(x*x + y*y + z*z);
      if (length === 0) {
        throw new PhysicsError(
          `ELLの半径ベクトル${i+1}は零ベクトルにできません`,
          'ZERO_RADIUS_VECTOR'
        );
      }
    }
  }

  static validateEllipticalCylinder(params) {
    this.VectorSchema.parse(params.bottom_center);
    this.VectorSchema.parse(params.height_vector);
    this.VectorSchema.parse(params.radius_vector_1);
    this.VectorSchema.parse(params.radius_vector_2);
    
    // 高さベクトルの長さチェック
    const [hx, hy, hz] = params.height_vector.split(/\s+/).map(Number);
    const height = Math.sqrt(hx*hx + hy*hy + hz*hz);
    if (height === 0) {
      throw new PhysicsError(
        'RECの高さベクトルは零ベクトルにできません',
        'ZERO_HEIGHT_VECTOR'
      );
    }
    
    // 半径ベクトルの長さチェック
    const vectors = [params.radius_vector_1, params.radius_vector_2];
    for (let i = 0; i < 2; i++) {
      const [x, y, z] = vectors[i].split(/\s+/).map(Number);
      const length = Math.sqrt(x*x + y*y + z*z);
      if (length === 0) {
        throw new PhysicsError(
          `RECの半径ベクトル${i+1}は零ベクトルにできません`,
          'ZERO_RADIUS_VECTOR'
        );
      }
    }
  }

  static validateTruncatedCone(params) {
    this.VectorSchema.parse(params.bottom_center);
    this.VectorSchema.parse(params.height_vector);
    
    const bottomRadius = this.PositiveNumberSchema.parse(params.bottom_radius);
    const topRadius = this.PositiveNumberSchema.parse(params.top_radius);
    
    // 高さベクトルの長さチェック
    const [hx, hy, hz] = params.height_vector.split(/\s+/).map(Number);
    const height = Math.sqrt(hx*hx + hy*hy + hz*hz);
    if (height === 0) {
      throw new PhysicsError(
        'TRCの高さベクトルは零ベクトルにできません',
        'ZERO_HEIGHT_VECTOR'
      );
    }
    
    // 半径の物理的妃当性チェック
    if (bottomRadius === topRadius) {
      logger.warn('TRCの上下半径が同じです。RCCの使用を検討してください', {
        bottomRadius, topRadius
      });
    }
  }

  static validateWedge(params) {
    this.VectorSchema.parse(params.vertex);
    this.VectorSchema.parse(params.width_vector);
    this.VectorSchema.parse(params.height_vector);
    this.VectorSchema.parse(params.depth_vector);
    
    // ベクトルの長さチェック
    const vectors = [
      { name: 'width_vector', value: params.width_vector },
      { name: 'height_vector', value: params.height_vector },
      { name: 'depth_vector', value: params.depth_vector }
    ];
    
    for (const vector of vectors) {
      const [x, y, z] = vector.value.split(/\s+/).map(Number);
      const length = Math.sqrt(x*x + y*y + z*z);
      if (length === 0) {
        throw new PhysicsError(
          `WEDの${vector.name}は零ベクトルにできません`,
          'ZERO_VECTOR'
        );
      }
    }
    
    // ベクトルの線形独立性チェック（簡単なチェック）
    const [wx, wy, wz] = params.width_vector.split(/\s+/).map(Number);
    const [hx, hy, hz] = params.height_vector.split(/\s+/).map(Number);
    const [dx, dy, dz] = params.depth_vector.split(/\s+/).map(Number);
    
    // 外積で平行性をチェック
    const cross1 = [
      wy * hz - wz * hy,
      wz * hx - wx * hz,
      wx * hy - wy * hx
    ];
    const crossLength = Math.sqrt(cross1[0]*cross1[0] + cross1[1]*cross1[1] + cross1[2]*cross1[2]);
    if (crossLength < 1e-10) {
      throw new PhysicsError(
        'WEDのwidth_vectorとheight_vectorが平行です',
        'PARALLEL_VECTORS'
      );
    }
  }
}
