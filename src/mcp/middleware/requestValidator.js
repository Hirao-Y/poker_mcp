// mcp/middleware/requestValidator.js
import { ValidationError } from '../../utils/errors.js';
import { MaterialAlternatives } from '../../utils/MaterialAlternatives.js';

export function validateBodyRequest(args) {
  if (!args.name || typeof args.name !== 'string') {
    throw new ValidationError('立体名は必須です', 'name', args.name);
  }
  
  if (!args.type || typeof args.type !== 'string') {
    throw new ValidationError('立体タイプは必須です', 'type', args.type);
  }
  
  const validTypes = ['SPH', 'RCC', 'RPP', 'BOX', 'CMB', 'TOR', 'ELL', 'REC', 'TRC', 'WED'];
  if (!validTypes.includes(args.type)) {
    throw new ValidationError(`無効な立体タイプ: ${args.type}`, 'type', args.type);
  }
}

export function validateZoneRequest(args) {
  if (!args.body_name || typeof args.body_name !== 'string') {
    throw new ValidationError('立体名は必須です', 'body_name', args.body_name);
  }
  
  if (!args.material || typeof args.material !== 'string') {
    throw new ValidationError('材料名は必須です', 'material', args.material);
  }
  
  // 材料代替機能付きバリデーション
  try {
    MaterialAlternatives.validateMaterialWithSuggestion(args.material, 'material');
  } catch (error) {
    // MaterialAlternativesからのエラーをValidationErrorに変換
    throw new ValidationError(error.message, 'material', args.material);
  }
}

export function validateTransformRequest(args) {
  if (!args.name || typeof args.name !== 'string') {
    throw new ValidationError('変換名は必須です', 'name', args.name);
  }
  
  if (!args.operations || !Array.isArray(args.operations)) {
    throw new ValidationError('操作配列は必須です', 'operations', args.operations);
  }
}

export function validateSourceRequest(args) {
  if (!args.name || typeof args.name !== 'string') {
    throw new ValidationError('線源名は必須です', 'name', args.name);
  }
  
  if (!args.type || typeof args.type !== 'string') {
    throw new ValidationError('線源タイプは必須です', 'type', args.type);
  }
  
  if (!args.inventory || !Array.isArray(args.inventory)) {
    throw new ValidationError('インベントリは必須の配列です', 'inventory', args.inventory);
  }
}

export function validateBuildupFactorRequest(args) {
  if (!args.material || typeof args.material !== 'string') {
    throw new ValidationError('材料名は必須です', 'material', args.material);
  }
  
  // スラント補正パラメータの必須チェック
  if (args.use_slant_correction === undefined) {
    throw new ValidationError(
      'use_slant_correction parameter is required for high-precision radiation shielding calculation',
      'use_slant_correction',
      args.use_slant_correction
    );
  }
  
  if (typeof args.use_slant_correction !== 'boolean') {
    throw new ValidationError(
      'use_slant_correction must be boolean',
      'use_slant_correction', 
      args.use_slant_correction
    );
  }
  
  // 有限媒体補正パラメータの必須チェック
  if (args.use_finite_medium_correction === undefined) {
    throw new ValidationError(
      'use_finite_medium_correction parameter is required for accurate boundary effect analysis',
      'use_finite_medium_correction',
      args.use_finite_medium_correction
    );
  }
  
  if (typeof args.use_finite_medium_correction !== 'boolean') {
    throw new ValidationError(
      'use_finite_medium_correction must be boolean',
      'use_finite_medium_correction',
      args.use_finite_medium_correction
    );
  }
}

export function validateUpdateSourceRequest(args) {
  if (!args.name || typeof args.name !== 'string') {
    throw new ValidationError('線源名は必須です', 'name', args.name);
  }
  
  // 更新可能なフィールドのみチェック
  const allowedFields = ['name', 'position', 'inventory', 'cutoff_rate'];
  const providedFields = Object.keys(args);
  const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
  
  if (invalidFields.length > 0) {
    throw new ValidationError(`更新不可なフィールド: ${invalidFields.join(', ')}`, 'fields', invalidFields);
  }
  
  if (args.inventory && !Array.isArray(args.inventory)) {
    throw new ValidationError('インベントリは配列で指定してください', 'inventory', args.inventory);
  }
  
  if (args.cutoff_rate !== undefined && (typeof args.cutoff_rate !== 'number' || args.cutoff_rate < 0)) {
    throw new ValidationError('cutoff_rateは0以上の数値で指定してください', 'cutoff_rate', args.cutoff_rate);
  }
}

export function validateDeleteSourceRequest(args) {
  if (!args.name || typeof args.name !== 'string') {
    throw new ValidationError('線源名は必須です', 'name', args.name);
  }
}
