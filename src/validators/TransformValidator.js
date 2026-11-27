// validators/TransformValidator.js
import { PokerMcpError } from '../utils/mcpErrors.js';
import { ManifestValidator } from './ManifestValidator.js';

/**
 * Transform参照の検証を行うクラス（強化版）
 * YAMLデータのtransformセクション内での名前存在確認と依存関係管理
 */
export class TransformValidator {

  /** [追加 2026-11-27] POKER 2.3.4 の transform の操作とオイラー角の軸の並び（CUI と同じ） */
  static OPERATION_TYPES = ['rotate_around_x', 'rotate_around_y', 'rotate_around_z', 'rotate_by_axis_angle', 'rotate_by_euler', 'rotate_by_rpy', 'rotate_by_matrix', 'translate'];
  static EULER_SEQUENCES = ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx', 'xyx', 'xzx', 'yxy', 'yzy', 'zxz', 'zyz'];
  
  /**
   * Transform参照の存在確認
   * @param {string} transformName - 参照するtransform名
   * @param {Array} existingTransforms - YAMLファイル内のtransform配列
   * @param {string} fieldName - フィールド名（エラー表示用）
   */
  static validateTransformReference(transformName, existingTransforms, fieldName = 'transform') {
    // transform名自体のバリデーション
    ManifestValidator.validateObjectName(transformName, fieldName);
    
    // 既存transformsがnullまたは未定義の場合
    if (!existingTransforms || !Array.isArray(existingTransforms)) {
      throw PokerMcpError.transformNotFound(transformName);
    }
    
    // transform名の存在確認
    const transformExists = existingTransforms.some(t => t && t.name === transformName);
    
    if (!transformExists) {
      throw PokerMcpError.invalidTransformReference(transformName);
    }
    
    return true;
  }

  /**
   * Transform操作の基本バリデーション
   * [変更 2026-11-27] POKER 2.3.4 の transform の作り直しに合わせた（CUI の YAMLInput.IO.cpp と同じ操作）:
   *   rotate_around_x/y/z: 角度、または { angle, center }
   *   rotate_by_axis_angle: { axis, angle, center? }
   *   rotate_by_euler: { sequence（12 通り）, angles: "a b c", frame: intrinsic|extrinsic, center? }
   *   rotate_by_rpy: { roll, pitch, yaw, center? }（R = Rz(yaw)·Ry(pitch)·Rx(roll)）
   *   rotate_by_matrix: { row_1, row_2, row_3, center? }（正規直交で行列式 +1。鏡映は不可）
   *   translate: "x y z"
   *   旧 rotate_by_rpy（3 値）・rotate_by_eulerzxz・rotate_by_eulerxyz は POKER 2.3.4 で廃止
   * @param {Array} operations - 変換操作の配列
   */
  static validateTransformOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw PokerMcpError.validationError(
        'operations must be a non-empty array',
        'operations',
        operations
      );
    }

    const fail = (msg, field, value) => { throw PokerMcpError.validationError(msg, field, value); };
    const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    const onlyKeys = (v, keys, required, field) => {
      if (!isObj(v)) fail(`${field} must be an object`, field, v);
      for (const k of Object.keys(v)) if (!keys.includes(k)) fail(`${field} has an unknown key '${k}' (allowed: ${keys.join(', ')})`, field, v);
      for (const k of required) if (v[k] === undefined) fail(`${field}.${k} is required`, `${field}.${k}`, v);
    };
    const num = (v, field) => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${field} must be a number`, field, v); };
    const vec = (v, field) => ManifestValidator.validateCoordinateString(v, field);
    const vec3 = (s) => String(s).trim().split(/\s+/).map(Number);
    const center = (v, field) => { if (v.center !== undefined) vec(v.center, `${field}.center`); };

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const f = `operations[${i}]`;

      if (!operation || typeof operation !== 'object') {
        fail(`operation[${i}] must be an object`, f, operation);
      }

      const keys = Object.keys(operation);
      if (keys.length !== 1) {
        fail(`operation[${i}] must have exactly one key`, f, operation);
      }

      const operationType = keys[0];
      const v = operation[operationType];
      const field = `${f}.${operationType}`;

      switch (operationType) {
        case 'translate':
          vec(v, field);
          break;

        case 'rotate_around_x':
        case 'rotate_around_y':
        case 'rotate_around_z':
          if (typeof v === 'number') ManifestValidator.validateRotationAngle(v, field);
          else { onlyKeys(v, ['angle', 'center'], ['angle'], field); ManifestValidator.validateRotationAngle(v.angle, `${field}.angle`); center(v, field); }
          break;

        case 'rotate_by_axis_angle': {
          onlyKeys(v, ['axis', 'angle', 'center'], ['axis', 'angle'], field);
          vec(v.axis, `${field}.axis`);
          if (vec3(v.axis).every(x => x === 0)) fail(`${field}.axis must not be the zero vector`, `${field}.axis`, v.axis);
          ManifestValidator.validateRotationAngle(v.angle, `${field}.angle`);
          center(v, field);
          break;
        }

        case 'rotate_by_euler': {
          onlyKeys(v, ['sequence', 'angles', 'frame', 'center'], ['sequence', 'angles', 'frame'], field);
          const seq = String(v.sequence).trim().toLowerCase();
          if (!TransformValidator.EULER_SEQUENCES.includes(seq)) fail(`${field}.sequence must be one of ${TransformValidator.EULER_SEQUENCES.join(', ')}`, `${field}.sequence`, v.sequence);
          if (!['intrinsic', 'extrinsic'].includes(String(v.frame).trim().toLowerCase())) fail(`${field}.frame must be intrinsic or extrinsic`, `${field}.frame`, v.frame);
          vec(v.angles, `${field}.angles`);
          center(v, field);
          break;
        }

        case 'rotate_by_rpy':
          onlyKeys(v, ['roll', 'pitch', 'yaw', 'center'], ['roll', 'pitch', 'yaw'], field);
          for (const k of ['roll', 'pitch', 'yaw']) num(v[k], `${field}.${k}`);
          center(v, field);
          break;

        case 'rotate_by_matrix': {
          onlyKeys(v, ['row_1', 'row_2', 'row_3', 'center'], ['row_1', 'row_2', 'row_3'], field);
          for (const k of ['row_1', 'row_2', 'row_3']) vec(v[k], `${field}.${k}`);
          const m = [vec3(v.row_1), vec3(v.row_2), vec3(v.row_3)];
          const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
          // POKER の CUI と同じ許容（1e-3）で、行の長さが 1・互いに直交・行列式 +1 を確かめる
          m.forEach((r, k) => { if (Math.abs(1 - Math.sqrt(dot(r, r))) > 1e-3) fail(`${field}.row_${k + 1}: the length must be 1`, `${field}.row_${k + 1}`, v[`row_${k + 1}`]); });
          if (Math.abs(dot(m[0], m[1])) > 1e-3 || Math.abs(dot(m[0], m[2])) > 1e-3 || Math.abs(dot(m[1], m[2])) > 1e-3) fail(`${field}: the rows must be orthogonal`, field, v);
          const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
          if (det < 0) fail(`${field}: the determinant is -1 (a reflection, not a rotation); a rotation matrix must have determinant +1`, field, v);
          center(v, field);
          break;
        }

        default:
          fail(`Invalid operation type: ${operationType}. Valid types: ${TransformValidator.OPERATION_TYPES.join(', ')}`, f, operationType);
      }
    }

    return true;
  }

  /**
   * Transform操作の物理的妥当性チェック
   * @param {Array} operations - 変換操作の配列
   * @param {string} transformName - Transform名（エラー表示用）
   */
  static validateTransformPhysics(operations, transformName = 'transform') {
    let hasRotation = false;
    let hasTranslation = false;
    let totalRotationMagnitude = 0;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const operationType = Object.keys(operation)[0];
      const operationValue = operation[operationType];

      switch (operationType) {
        case 'translate': {
          hasTranslation = true;
          // 移動量の大きさチェック
          const [dx, dy, dz] = operationValue.trim().split(/\s+/).map(Number);
          const translationMagnitude = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (translationMagnitude > 10000) {
            console.warn(`Transform '${transformName}': 非常に大きな移動量です (${translationMagnitude.toFixed(2)})`);
          }
          break;
        }

        case 'rotate_around_x':
        case 'rotate_around_y':
        case 'rotate_around_z':
        case 'rotate_by_axis_angle': {
          hasRotation = true;
          const angle = typeof operationValue === 'number' ? operationValue : operationValue.angle;
          totalRotationMagnitude += Math.abs(angle);
          if (operationValue && operationValue.center !== undefined) hasTranslation = true;   // 中心が原点でない回転は位置も動かす
          // 異常な回転角度のチェック
          if (Math.abs(angle) > 360) {
            console.warn(`Transform '${transformName}': 360度を超える回転角度です (${angle}度)`);
          }
          break;
        }

        case 'rotate_by_euler':
        case 'rotate_by_rpy':
        case 'rotate_by_matrix':
          hasRotation = true;
          if (operationValue && operationValue.center !== undefined) hasTranslation = true;
          break;
      }
    }

    // 総回転量のチェック
    if (totalRotationMagnitude > 720) {
      console.warn(`Transform '${transformName}': 総回転量が非常に大きいです (${totalRotationMagnitude.toFixed(1)}度)`);
    }

    // Transformの意味チェック
    if (!hasRotation && !hasTranslation) {
      console.warn(`Transform '${transformName}': 回転も移動も含まれていません`);
    }

    return {
      hasRotation,
      hasTranslation,
      totalRotationMagnitude,
      operationCount: operations.length
    };
  }

  /**
   * Transform名の一意性チェック
   * @param {string} transformName - 新しいTransform名
   * @param {Array} existingTransforms - 既存Transform配列
   * @param {Array} pendingChanges - 保留中の変更配列
   */
  static validateTransformUniqueness(transformName, existingTransforms = [], pendingChanges = []) {
    // 既存Transformとの重複チェック
    if (existingTransforms.some(t => t && t.name === transformName)) {
      throw PokerMcpError.duplicateName(transformName, 'transform');
    }
    
    // 保留中の変更との重複チェック
    const pendingTransformChanges = pendingChanges.filter(
      change => change.action === 'proposeTransform'
    );
    
    for (const change of pendingTransformChanges) {
      if (change.data && change.data.name === transformName) {
        throw PokerMcpError.duplicateName(transformName, 'transform (pending)');
      }
    }
    
    return true;
  }

  /**
   * Body/Source/DetectorのTransform参照を検証
   * @param {string} transformName - 参照するtransform名
   * @param {Object} yamlData - YAMLデータ全体
   * @param {string} contextType - コンテキストタイプ（body/source/detector）
   * @param {string} contextName - コンテキスト名
   */
  static validateContextTransformReference(transformName, yamlData, contextType, contextName) {
    if (!transformName) {
      return true; // transform参照はオプション
    }
    
    try {
      this.validateTransformReference(transformName, yamlData.transform, 'transform');
    } catch (error) {
      // エラーメッセージにコンテキスト情報を追加
      if (error instanceof PokerMcpError) {
        throw new PokerMcpError(
          error.code,
          `${contextType} '${contextName}' references invalid transform: ${error.message}`,
          'transform',
          transformName
        );
      }
      throw error;
    }
    
    return true;
  }

  /**
   * Transform依存関係チェック（詳細版）
   * Transform削除時に、そのTransformを参照しているBody/Source/Detectorがないかチェック
   * @param {string} transformName - 削除対象のtransform名
   * @param {Object} yamlData - YAMLデータ全体
   * @param {Array} pendingChanges - 保留中の変更配列
   */
  static checkTransformDependencies(transformName, yamlData, pendingChanges = []) {
    const dependencies = [];
    
    // 既存データの依存関係チェック
    this._checkExistingDependencies(transformName, yamlData, dependencies);
    
    // 保留中の変更の依存関係チェック
    this._checkPendingDependencies(transformName, pendingChanges, dependencies);
    
    if (dependencies.length > 0) {
      throw PokerMcpError.dependencyExists(transformName, dependencies);
    }
    
    return {
      dependencies: [],
      canDelete: true,
      checkedSections: ['body', 'source', 'detector', 'pending_changes']
    };
  }

  /**
   * 既存データの依存関係チェック
   * @private
   */
  static _checkExistingDependencies(transformName, yamlData, dependencies) {
    // Body内のtransform参照をチェック
    if (yamlData.body && Array.isArray(yamlData.body)) {
      for (const body of yamlData.body) {
        if (body.transform === transformName) {
          dependencies.push({
            type: 'body',
            name: body.name,
            context: `Body '${body.name}' uses transform '${transformName}'`
          });
        }
      }
    }
    
    // Source内のtransform参照をチェック
    if (yamlData.source && Array.isArray(yamlData.source)) {
      for (const source of yamlData.source) {
        // geometry内のtransform参照をチェック
        if (source.geometry && source.geometry.transform === transformName) {
          dependencies.push({
            type: 'source',
            name: source.name,
            context: `Source '${source.name}' geometry uses transform '${transformName}'`
          });
        }
      }
    }
    
    // Detector内のtransform参照をチェック
    if (yamlData.detector && Array.isArray(yamlData.detector)) {
      for (const detector of yamlData.detector) {
        if (detector.transform === transformName) {
          dependencies.push({
            type: 'detector',
            name: detector.name,
            context: `Detector '${detector.name}' uses transform '${transformName}'`
          });
        }
      }
    }
  }

  /**
   * 保留中の変更の依存関係チェック
   * @private
   */
  static _checkPendingDependencies(transformName, pendingChanges, dependencies) {
    for (const change of pendingChanges) {
      // Body関連の保留中変更
      if (change.action === 'add_body' || change.action === 'updateBody') {
        const bodyData = change.data.body || change.data;
        if (bodyData && bodyData.transform === transformName) {
          dependencies.push({
            type: 'pending_body',
            name: bodyData.name,
            context: `Pending body '${bodyData.name}' will use transform '${transformName}'`
          });
        }
      }
      
      // Source関連の保留中変更
      if (change.action === 'proposeSource' || change.action === 'updateSource') {
        const sourceData = change.data;
        if (sourceData && sourceData.geometry && sourceData.geometry.transform === transformName) {
          dependencies.push({
            type: 'pending_source',
            name: sourceData.name,
            context: `Pending source '${sourceData.name}' will use transform '${transformName}'`
          });
        }
      }
      
      // Detector関連の保留中変更
      if (change.action === 'proposeDetector' || change.action === 'updateDetector') {
        const detectorData = change.data;
        if (detectorData && detectorData.transform === transformName) {
          dependencies.push({
            type: 'pending_detector',
            name: detectorData.name,
            context: `Pending detector '${detectorData.name}' will use transform '${transformName}'`
          });
        }
      }
    }
  }

  /**
   * Transform参照の完全性チェック
   * システム全体で参照されているtransformが実際に存在するかチェック
   * @param {Object} yamlData - YAMLデータ全体
   */
  static validateTransformIntegrity(yamlData) {
    const issues = [];
    const availableTransforms = new Set();
    
    // 利用可能なTransform名を収集
    if (yamlData.transform && Array.isArray(yamlData.transform)) {
      for (const transform of yamlData.transform) {
        if (transform && transform.name) {
          availableTransforms.add(transform.name);
        }
      }
    }
    
    // Bodyのtransform参照をチェック
    if (yamlData.body && Array.isArray(yamlData.body)) {
      for (const body of yamlData.body) {
        if (body.transform && !availableTransforms.has(body.transform)) {
          issues.push({
            type: 'missing_transform',
            context: 'body',
            name: body.name,
            missingTransform: body.transform,
            message: `Body '${body.name}' references non-existent transform '${body.transform}'`
          });
        }
      }
    }
    
    // Sourceのtransform参照をチェック
    if (yamlData.source && Array.isArray(yamlData.source)) {
      for (const source of yamlData.source) {
        if (source.geometry && source.geometry.transform && !availableTransforms.has(source.geometry.transform)) {
          issues.push({
            type: 'missing_transform',
            context: 'source',
            name: source.name,
            missingTransform: source.geometry.transform,
            message: `Source '${source.name}' references non-existent transform '${source.geometry.transform}'`
          });
        }
      }
    }
    
    // Detectorのtransform参照をチェック
    if (yamlData.detector && Array.isArray(yamlData.detector)) {
      for (const detector of yamlData.detector) {
        if (detector.transform && !availableTransforms.has(detector.transform)) {
          issues.push({
            type: 'missing_transform',
            context: 'detector',
            name: detector.name,
            missingTransform: detector.transform,
            message: `Detector '${detector.name}' references non-existent transform '${detector.transform}'`
          });
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      availableTransforms: Array.from(availableTransforms),
      checkedReferences: {
        body: yamlData.body?.length || 0,
        source: yamlData.source?.length || 0,
        detector: yamlData.detector?.length || 0
      }
    };
  }

  /**
   * Transform使用状況の統計情報を取得
   * @param {Object} yamlData - YAMLデータ全体
   */
  static getTransformUsageStats(yamlData) {
    const stats = new Map();
    const allTransforms = new Set();
    
    // 定義されているTransformを登録
    if (yamlData.transform && Array.isArray(yamlData.transform)) {
      for (const transform of yamlData.transform) {
        if (transform && transform.name) {
          allTransforms.add(transform.name);
          stats.set(transform.name, {
            name: transform.name,
            operationCount: transform.operations?.length || 0,
            usedBy: {
              body: [],
              source: [],
              detector: []
            },
            totalUsage: 0
          });
        }
      }
    }
    
    // Bodyでの使用状況を記録
    if (yamlData.body && Array.isArray(yamlData.body)) {
      for (const body of yamlData.body) {
        if (body.transform && stats.has(body.transform)) {
          const stat = stats.get(body.transform);
          stat.usedBy.body.push(body.name);
          stat.totalUsage++;
        }
      }
    }
    
    // Sourceでの使用状況を記録
    if (yamlData.source && Array.isArray(yamlData.source)) {
      for (const source of yamlData.source) {
        if (source.geometry && source.geometry.transform && stats.has(source.geometry.transform)) {
          const stat = stats.get(source.geometry.transform);
          stat.usedBy.source.push(source.name);
          stat.totalUsage++;
        }
      }
    }
    
    // Detectorでの使用状況を記録
    if (yamlData.detector && Array.isArray(yamlData.detector)) {
      for (const detector of yamlData.detector) {
        if (detector.transform && stats.has(detector.transform)) {
          const stat = stats.get(detector.transform);
          stat.usedBy.detector.push(detector.name);
          stat.totalUsage++;
        }
      }
    }
    
    return {
      totalTransforms: allTransforms.size,
      usedTransforms: Array.from(stats.values()).filter(s => s.totalUsage > 0).length,
      unusedTransforms: Array.from(stats.values()).filter(s => s.totalUsage === 0).map(s => s.name),
      detailedStats: Array.from(stats.values()),
      summary: {
        mostUsed: Array.from(stats.values()).sort((a, b) => b.totalUsage - a.totalUsage)[0],
        averageUsage: Array.from(stats.values()).reduce((sum, s) => sum + s.totalUsage, 0) / allTransforms.size || 0
      }
    };
  }
}
