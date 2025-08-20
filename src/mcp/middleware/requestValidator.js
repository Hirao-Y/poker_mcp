// mcp/middleware/requestValidator.js
import { ValidationError } from '../../utils/errors.js';

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
