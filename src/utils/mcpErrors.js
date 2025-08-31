// utils/mcpErrors.js
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Poker MCP専用エラークラス
 * マニフェストで定義された22個のカスタムエラーコードを実装
 */
export class PokerMcpError extends McpError {
  // エラーコード定数
  static BODY_NOT_FOUND = -32001;
  static ZONE_NOT_FOUND = -32002;
  static DUPLICATE_NAME = -32003;
  static INVALID_BODY_TYPE = -32004;
  static DEPENDENCY_EXISTS = -32005;
  static FILE_ACCESS_ERROR = -32006;
  static VALIDATION_ERROR = -32007;
  static BACKUP_ERROR = -32008;
  static UNIT_ALREADY_EXISTS = -32009;
  static UNIT_NOT_FOUND = -32010;
  static UNIT_INCOMPLETE = -32011;
  static UNIT_KEY_MISSING = -32012;
  static UNIT_INVALID_VALUE = -32013;
  static UNIT_DELETE_FORBIDDEN = -32014;
  static UNIT_REPAIR_FAILED = -32015;
  static UNIT_VALIDATION_FAILED = -32016;
  static TRANSFORM_NOT_FOUND = -32017;
  static INVALID_TRANSFORM_REFERENCE = -32018;
  static INVALID_NAME_FORMAT_HYPHENS = -32019;
  static NAME_FORBIDDEN_CHARACTERS = -32020;
  static INVALID_NUCLIDE_FORMAT = -32021;
  static NUCLIDE_FORBIDDEN_HYPHEN = -32022;
  static ATMOSPHERE_RESERVED = -32023;
  static ATMOSPHERE_ZONE_MANDATORY = -32024;
  static ATMOSPHERE_ZONE_DELETE_FORBIDDEN = -32025;
  static ATMOSPHERE_ZONE_MUST_EXIST = -32026;
  static ATMOSPHERE_MATERIAL_REQUIRED = -32027;
  static VOID_DENSITY_PROHIBITED = -32028;
  static NON_VOID_DENSITY_REQUIRED = -32029;
  static MISSING_DENSITY_PARAMETER = -32030;

  constructor(code, message, field = null, value = null) {
    super(code, message);
    this.field = field;
    this.value = value;
  }

  // 便利メソッド：エラーコードから適切なエラーを生成
  static bodyNotFound(name) {
    return new PokerMcpError(this.BODY_NOT_FOUND, `Body not found: ${name}`, 'name', name);
  }

  static zoneNotFound(bodyName) {
    return new PokerMcpError(this.ZONE_NOT_FOUND, `Zone not found: ${bodyName}`, 'body_name', bodyName);
  }

  static duplicateName(name, type = 'object') {
    return new PokerMcpError(this.DUPLICATE_NAME, `Duplicate ${type} name: ${name}`, 'name', name);
  }

  static invalidBodyType(type) {
    return new PokerMcpError(this.INVALID_BODY_TYPE, `Invalid body type: ${type}`, 'type', type);
  }

  static dependencyExists(name, dependencies) {
    return new PokerMcpError(this.DEPENDENCY_EXISTS, `Cannot delete ${name} - dependencies exist: ${dependencies.join(', ')}`, 'name', name);
  }

  static fileAccessError(filename, operation) {
    return new PokerMcpError(this.FILE_ACCESS_ERROR, `File access error: ${operation} failed for ${filename}`, 'filename', filename);
  }

  static validationError(message, field, value) {
    return new PokerMcpError(this.VALIDATION_ERROR, message, field, value);
  }

  static backupError(message) {
    return new PokerMcpError(this.BACKUP_ERROR, `Backup error: ${message}`);
  }

  static unitAlreadyExists() {
    return new PokerMcpError(this.UNIT_ALREADY_EXISTS, 'Unit section already exists');
  }

  static unitNotFound() {
    return new PokerMcpError(this.UNIT_NOT_FOUND, 'Unit section not found');
  }

  static unitIncomplete(missingKeys) {
    return new PokerMcpError(this.UNIT_INCOMPLETE, `Unit section incomplete - missing keys: ${missingKeys.join(', ')}`, 'keys', missingKeys);
  }

  static unitKeyMissing(key) {
    return new PokerMcpError(this.UNIT_KEY_MISSING, `Unit key missing: ${key}`, 'key', key);
  }

  static unitInvalidValue(key, value, validValues) {
    return new PokerMcpError(this.UNIT_INVALID_VALUE, `Unit invalid value for ${key}: ${value}. Valid values: ${validValues.join(', ')}`, key, value);
  }

  static unitDeleteForbidden() {
    return new PokerMcpError(this.UNIT_DELETE_FORBIDDEN, 'Unit section cannot be deleted - use update instead');
  }

  static unitRepairFailed(reason) {
    return new PokerMcpError(this.UNIT_REPAIR_FAILED, `Unit repair failed: ${reason}`);
  }

  static unitValidationFailed(details) {
    return new PokerMcpError(this.UNIT_VALIDATION_FAILED, `Unit validation failed: ${details}`);
  }

  static transformNotFound(name) {
    return new PokerMcpError(this.TRANSFORM_NOT_FOUND, `Transform not found: ${name}`, 'transform', name);
  }

  static invalidTransformReference(name) {
    return new PokerMcpError(this.INVALID_TRANSFORM_REFERENCE, `Invalid transform reference: ${name} does not exist in YAML transform section`, 'transform', name);
  }

  static invalidNameFormatHyphens(name) {
    return new PokerMcpError(this.INVALID_NAME_FORMAT_HYPHENS, `Invalid name format - hyphens not allowed: ${name}`, 'name', name);
  }

  static nameForbiddenCharacters(name, invalidChars) {
    return new PokerMcpError(this.NAME_FORBIDDEN_CHARACTERS, `Name contains forbidden characters: ${name} (invalid: ${invalidChars.join(', ')})`, 'name', name);
  }

  static invalidNuclideFormat(nuclide) {
    return new PokerMcpError(this.INVALID_NUCLIDE_FORMAT, `Invalid nuclide format - use concatenated format (e.g., Cs137): ${nuclide}`, 'nuclide', nuclide);
  }

  static nuclideForbiddenHyphen(nuclide) {
    return new PokerMcpError(this.NUCLIDE_FORBIDDEN_HYPHEN, `Nuclide contains forbidden hyphen: ${nuclide}`, 'nuclide', nuclide);
  }

  static atmosphereReserved(name) {
    return new PokerMcpError(this.ATMOSPHERE_RESERVED, `ATMOSPHERE is reserved - cannot be used as body name: ${name}`, 'name', name);
  }

  static atmosphereZoneDeleteForbidden() {
    return new PokerMcpError(this.ATMOSPHERE_ZONE_DELETE_FORBIDDEN, 'ATMOSPHERE zone is mandatory and cannot be deleted');
  }

  static voidDensityProhibited(density) {
    return new PokerMcpError(this.VOID_DENSITY_PROHIBITED, `Density cannot be specified for VOID material: ${density}`, 'density', density);
  }

  static nonVoidDensityRequired(material) {
    return new PokerMcpError(this.NON_VOID_DENSITY_REQUIRED, `Density must be specified for non-VOID materials: ${material}`, 'material', material);
  }

  static missingDensityParameter(material) {
    return new PokerMcpError(this.MISSING_DENSITY_PARAMETER, `Missing required density parameter for physical material: ${material}`, 'density', undefined);
  }
}

// エラーコードマッピング（逆引き用）
export const ERROR_CODE_MAP = {
  [-32001]: 'Body not found',
  [-32002]: 'Zone not found',
  [-32003]: 'Duplicate name',
  [-32004]: 'Invalid body type',
  [-32005]: 'Dependency exists',
  [-32006]: 'File access error',
  [-32007]: 'Validation error',
  [-32008]: 'Backup error',
  [-32009]: 'Unit already exists',
  [-32010]: 'Unit not found',
  [-32011]: 'Unit incomplete',
  [-32012]: 'Unit key missing',
  [-32013]: 'Unit invalid value',
  [-32014]: 'Unit delete forbidden',
  [-32015]: 'Unit repair failed',
  [-32016]: 'Unit validation failed',
  [-32017]: 'Transform not found',
  [-32018]: 'Invalid transform reference',
  [-32019]: 'Invalid name format - hyphens not allowed',
  [-32020]: 'Name contains forbidden characters',
  [-32021]: 'Invalid nuclide format - use concatenated format',
  [-32022]: 'Nuclide contains forbidden hyphen',
  [-32023]: 'ATMOSPHERE is reserved - cannot be used as body name',
  [-32024]: 'ATMOSPHERE zone is mandatory and cannot be deleted',
  [-32025]: 'Multiple ATMOSPHERE zones not allowed',
  [-32026]: 'ATMOSPHERE zone must exist in zone section',
  [-32027]: 'ATMOSPHERE zone material assignment required',
  [-32028]: 'Density cannot be specified for VOID material',
  [-32029]: 'Density must be specified for non-VOID materials',
  [-32030]: 'Missing required density parameter for physical material'
};
