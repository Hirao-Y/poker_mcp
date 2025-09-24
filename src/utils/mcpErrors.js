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
  
  // 新しい必須パラメータエラーコード（Phase 1追加）
  static CUTOFF_RATE_REQUIRED = -32050;
  static SHOW_PATH_TRACE_REQUIRED = -32051;
  static USE_SLANT_CORRECTION_REQUIRED = -32052;
  static USE_FINITE_MEDIUM_CORRECTION_REQUIRED = -32053;
  
  // 材料制約強化エラーコード
  static UNSUPPORTED_MATERIAL_WITH_SUGGESTION = -32054;

  // propose/update専用エラーコード（マニフェスト仕様準拠）
  static ZONE_ALREADY_EXISTS_FOR_PROPOSE = -32060;
  static ZONE_NOT_FOUND_FOR_UPDATE = -32061;
  static BODY_ALREADY_EXISTS_FOR_PROPOSE = -32064;
  static BODY_NOT_FOUND_FOR_UPDATE = -32065;
  static BUILDUP_FACTOR_ALREADY_EXISTS_FOR_PROPOSE = -32070;
  static BUILDUP_FACTOR_NOT_FOUND_FOR_UPDATE = -32071;
  static TRANSFORM_ALREADY_EXISTS_FOR_PROPOSE = -32074;
  static TRANSFORM_NOT_FOUND_FOR_UPDATE = -32075;
  static SOURCE_ALREADY_EXISTS_FOR_PROPOSE = -32078;
  static SOURCE_NOT_FOUND_FOR_UPDATE = -32079;
  static DETECTOR_ALREADY_EXISTS_FOR_PROPOSE = -32082;
  static DETECTOR_NOT_FOUND_FOR_UPDATE = -32083;
  static UNIT_ALREADY_EXISTS_FOR_PROPOSE = -32086;
  static UNIT_NOT_FOUND_FOR_UPDATE = -32087;
  
  // 保留中の立体エラーコード（フェーズ1追加）
  static BODY_IN_PENDING_CHANGES = -32090;

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

  // 新しい必須パラメータエラー用便利メソッド
  static cutoffRateRequired() {
    return new PokerMcpError(this.CUTOFF_RATE_REQUIRED, 'cutoff_rate parameter is required for radiation shielding calculation accuracy', 'cutoff_rate', undefined);
  }

  static showPathTraceRequired() {
    return new PokerMcpError(this.SHOW_PATH_TRACE_REQUIRED, 'show_path_trace parameter is required for radiation path analysis', 'show_path_trace', undefined);
  }

  static useSlantCorrectionRequired() {
    return new PokerMcpError(this.USE_SLANT_CORRECTION_REQUIRED, 'use_slant_correction parameter is required for high-precision radiation shielding calculation', 'use_slant_correction', undefined);
  }

  static useFiniteMediumCorrectionRequired() {
    return new PokerMcpError(this.USE_FINITE_MEDIUM_CORRECTION_REQUIRED, 'use_finite_medium_correction parameter is required for accurate boundary effect analysis', 'use_finite_medium_correction', undefined);
  }

  static unsupportedMaterialWithSuggestion(material, suggestedSubstitute, supportedList = []) {
    const message = `Unsupported material '${material}'. Did you mean '${suggestedSubstitute}'? Supported materials: ${supportedList.join(', ')}`;
    return new PokerMcpError(this.UNSUPPORTED_MATERIAL_WITH_SUGGESTION, message, 'material', material);
  }

  // propose/update専用エラー用便利メソッド（マニフェスト仕様準拠）
  static bodyAlreadyExistsForPropose(name) {
    return new PokerMcpError(this.BODY_ALREADY_EXISTS_FOR_PROPOSE, `立体'${name}'は既に存在します。更新する場合はupdateBodyメソッドを使用してください`, 'name', name);
  }

  static bodyNotFoundForUpdate(name) {
    return new PokerMcpError(this.BODY_NOT_FOUND_FOR_UPDATE, `立体'${name}'が存在しません。新規作成する場合はproposeBodyメソッドを使用してください`, 'name', name);
  }

  static zoneAlreadyExistsForPropose(bodyName) {
    return new PokerMcpError(this.ZONE_ALREADY_EXISTS_FOR_PROPOSE, `ゾーン'${bodyName}'は既に存在します。更新する場合はupdateZoneメソッドを使用してください`, 'body_name', bodyName);
  }

  static zoneNotFoundForUpdate(bodyName) {
    return new PokerMcpError(this.ZONE_NOT_FOUND_FOR_UPDATE, `ゾーン'${bodyName}'が存在しません。新規作成する場合はproposeZoneメソッドを使用してください`, 'body_name', bodyName);
  }

  static buildupFactorAlreadyExistsForPropose(material) {
    return new PokerMcpError(this.BUILDUP_FACTOR_ALREADY_EXISTS_FOR_PROPOSE, `ビルドアップ係数'${material}'は既に存在します。更新する場合はupdateBuildupFactorメソッドを使用してください`, 'material', material);
  }

  static buildupFactorNotFoundForUpdate(material) {
    return new PokerMcpError(this.BUILDUP_FACTOR_NOT_FOUND_FOR_UPDATE, `ビルドアップ係数'${material}'が存在しません。新規作成する場合はproposeBuildupFactorメソッドを使用してください`, 'material', material);
  }

  static transformAlreadyExistsForPropose(name) {
    return new PokerMcpError(this.TRANSFORM_ALREADY_EXISTS_FOR_PROPOSE, `変換'${name}'は既に存在します。更新する場合はupdateTransformメソッドを使用してください`, 'name', name);
  }

  static transformNotFoundForUpdate(name) {
    return new PokerMcpError(this.TRANSFORM_NOT_FOUND_FOR_UPDATE, `変換'${name}'が存在しません。新規作成する場合はproposeTransformメソッドを使用してください`, 'name', name);
  }

  static sourceAlreadyExistsForPropose(name) {
    return new PokerMcpError(this.SOURCE_ALREADY_EXISTS_FOR_PROPOSE, `線源'${name}'は既に存在します。更新する場合はupdateSourceメソッドを使用してください`, 'name', name);
  }

  static sourceNotFoundForUpdate(name) {
    return new PokerMcpError(this.SOURCE_NOT_FOUND_FOR_UPDATE, `線源'${name}'が存在しません。新規作成する場合はproposeSourceメソッドを使用してください`, 'name', name);
  }

  static detectorAlreadyExistsForPropose(name) {
    return new PokerMcpError(this.DETECTOR_ALREADY_EXISTS_FOR_PROPOSE, `検出器'${name}'は既に存在します。更新する場合はupdateDetectorメソッドを使用してください`, 'name', name);
  }

  static detectorNotFoundForUpdate(name) {
    return new PokerMcpError(this.DETECTOR_NOT_FOUND_FOR_UPDATE, `検出器'${name}'が存在しません。新規作成する場合はproposeDetectorメソッドを使用してください`, 'name', name);
  }

  static unitAlreadyExistsForPropose() {
    return new PokerMcpError(this.UNIT_ALREADY_EXISTS_FOR_PROPOSE, `単位設定は既に存在します。更新する場合はupdateUnitメソッドを使用してください`);
  }

  static unitNotFoundForUpdate() {
    return new PokerMcpError(this.UNIT_NOT_FOUND_FOR_UPDATE, `単位設定が存在しません。新規作成する場合はproposeUnitメソッドを使用してください`);
  }
  
  // 保留中の立体エラー（フェーズ1追加）
  static bodyInPendingChanges(bodyName) {
    return new PokerMcpError(
      this.BODY_IN_PENDING_CHANGES, 
      `立体 '${bodyName}' は保留中です。先にapplyChangesを実行して立体を永続化してください。\n推奨手順:\n1. すべての立体を定義\n2. applyChangesで永続化\n3. ゾーンを定義`,
      'body_name',
      bodyName
    );
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
  [-32030]: 'Missing required density parameter for physical material',
  [-32050]: 'cutoff_rate parameter is required',
  [-32051]: 'show_path_trace parameter is required',
  [-32052]: 'use_slant_correction parameter is required',
  [-32053]: 'use_finite_medium_correction parameter is required',
  [-32054]: 'Unsupported material with suggestion',
  [-32060]: 'Zone already exists for propose',
  [-32061]: 'Zone not found for update',
  [-32064]: 'Body already exists for propose',
  [-32065]: 'Body not found for update',
  [-32070]: 'Buildup factor already exists for propose',
  [-32071]: 'Buildup factor not found for update',
  [-32074]: 'Transform already exists for propose',
  [-32075]: 'Transform not found for update',
  [-32078]: 'Source already exists for propose',
  [-32079]: 'Source not found for update',
  [-32082]: 'Detector already exists for propose',
  [-32083]: 'Detector not found for update',
  [-32086]: 'Unit already exists for propose',
  [-32087]: 'Unit not found for update',
  [-32090]: 'Body is in pending changes - apply changes first'
};
