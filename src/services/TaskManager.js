// services/TaskManager.js
import { SafeDataManager } from './DataManager.js';
import { PhysicsValidator } from '../validators/PhysicsValidator.js';
import { ManifestValidator } from '../validators/ManifestValidator.js';
import { TransformValidator } from '../validators/TransformValidator.js';
import { NuclideValidator } from '../validators/NuclideValidator.js';
import { PokerMcpError } from '../utils/mcpErrors.js';
import { logger } from '../utils/logger.js';
import { ValidationError, PhysicsError } from '../utils/errors.js';

export class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.dataManager = new SafeDataManager(yamlFile, pendingFile);
  }

  // Unit操作メソッド
  async proposeUnit(length, angle, density, radioactivity) {
    try {
      // デフォルト値適用
      const unitData = {
        length: length || 'cm',
        angle: angle || 'radian',
        density: density || 'g/cm3',
        radioactivity: radioactivity || 'Bq'
      };
      
      // 单位値バリデーション（マニフェスト準拠）
      ManifestValidator.validateSupportedLengthUnit(unitData.length, 'length');
      ManifestValidator.validateSupportedAngleUnit(unitData.angle, 'angle');
      ManifestValidator.validateSupportedDensityUnit(unitData.density, 'density');
      ManifestValidator.validateSupportedRadioactivityUnit(unitData.radioactivity, 'radioactivity');
      
      // Unit セクション存在チェック
      if (this.data.unit) {
        throw PokerMcpError.unitAlreadyExists();
      }
      
      // 4つのキー完全性チェック
      this.validateUnitCompleteness(unitData);
      
      await this.dataManager.addPendingChange({
        action: 'proposeUnit',
        data: unitData
      });
      
      logger.info('Unit提案を追加しました', unitData);
      return `提案: unit セクションを追加 - ${JSON.stringify(unitData)}`;
      
    } catch (error) {
      logger.error('Unit提案エラー', { error: error.message });
      throw error;
    }
  }
  
  async updateUnit(updates) {
    try {
      if (!updates || Object.keys(updates).length === 0) {
        throw PokerMcpError.validationError('更新する内容が指定されていません', 'updates', updates);
      }
      
      // Unit セクション存在チェック
      if (!this.data.unit) {
        throw PokerMcpError.unitNotFound();
      }
      
      // 更新値のバリデーション
      if (updates.length) ManifestValidator.validateSupportedLengthUnit(updates.length, 'length');
      if (updates.angle) ManifestValidator.validateSupportedAngleUnit(updates.angle, 'angle');
      if (updates.density) ManifestValidator.validateSupportedDensityUnit(updates.density, 'density');
      if (updates.radioactivity) ManifestValidator.validateSupportedRadioactivityUnit(updates.radioactivity, 'radioactivity');
      
      // 既存データと更新データをマージ
      const mergedData = { ...this.data.unit, ...updates };
      
      // 4つのキー完全性保証
      this.ensureUnitIntegrity(mergedData);
      
      await this.dataManager.addPendingChange({
        action: 'updateUnit',
        data: mergedData
      });
      
      logger.info('Unit更新を提案しました', { updates, merged: mergedData });
      return `提案: unit セクションを更新 - ${JSON.stringify(updates)}`;
      
    } catch (error) {
      logger.error('Unit更新エラー', { updates, error: error.message });
      throw error;
    }
  }
  
  async getUnit() {
    try {
      let unitData = this.data.unit || {};
      
      // 4つのキー完全性確認と修復
      unitData = this.repairIncompleteUnit(unitData);
      
      const result = {
        length: unitData.length,
        angle: unitData.angle,
        density: unitData.density,
        radioactivity: unitData.radioactivity,
        exists: !!this.data.unit,
        complete: this.checkUnitCompleteness(unitData)
      };
      
      logger.info('Unit設定を取得しました', result);
      return result;
      
    } catch (error) {
      logger.error('Unit取得エラー', { error: error.message });
      throw error;
    }
  }
  
  // Unit検証・整合性メソッド
  validateUnitExists() {
    if (!this.data.unit) {
      throw new ValidationError('unit セクションが存在しません', 'unit', null);
    }
    return true;
  }
  
  validateUnitCompleteness(unitData) {
    const requiredKeys = ['length', 'angle', 'density', 'radioactivity'];
    for (const key of requiredKeys) {
      if (!unitData[key]) {
        throw new ValidationError(`unit セクションに必須キー ${key} がありません`, key, unitData[key]);
      }
    }
    return true;
  }
  
  ensureUnitIntegrity(unitData) {
    const defaults = this.getDefaultUnitValues();
    const requiredKeys = ['length', 'angle', 'density', 'radioactivity'];
    
    for (const key of requiredKeys) {
      if (!unitData[key]) {
        unitData[key] = defaults[key];
        logger.warn(`Unit キー ${key} が不足しているためデフォルト値を適用しました`, { key, default: defaults[key] });
      }
    }
    
    return unitData;
  }
  
  validateUnitValues(unitData) {
    const validUnits = {
      length: ['m', 'cm', 'mm'],
      angle: ['radian', 'degree'],
      density: ['g/cm3'],
      radioactivity: ['Bq']
    };
    
    for (const [key, value] of Object.entries(unitData)) {
      if (validUnits[key] && !validUnits[key].includes(value)) {
        throw new ValidationError(
          `${key} の値 '${value}' は無効です。有効な値: ${validUnits[key].join(', ')}`,
          key,
          value
        );
      }
    }
    return true;
  }
  
  getDefaultUnitValues() {
    return {
      length: 'cm',
      angle: 'radian',
      density: 'g/cm3',
      radioactivity: 'Bq'
    };
  }
  
  repairIncompleteUnit(unitData) {
    try {
      const defaults = this.getDefaultUnitValues();
      const repairedData = { ...defaults, ...unitData };
      
      // 有効性チェック
      this.validateUnitValues(repairedData);
      
      return repairedData;
    } catch (error) {
      logger.error('Unit修復失敗', { unitData, error: error.message });
      // 修復失敗時はデフォルト値を返却
      return this.getDefaultUnitValues();
    }
  }
  
  checkUnitCompleteness(unitData) {
    const requiredKeys = ['length', 'angle', 'density', 'radioactivity'];
    return requiredKeys.every(key => unitData[key]);
  }

  async initialize() {
    // ConfigManager初期化
    try {
      await this.dataManager.initialize();
      logger.info('TaskManagerを初期化しました');
    } catch (error) {
      // ConfigManagerが見つからない場合は警告のみ
      logger.warn('ConfigManagerの初期化をスキップしました', { error: error.message });
      await this.dataManager.initialize();
      logger.info('TaskManagerを初期化しました（ConfigManagerなし）');
    }
  }

  // データアクセサ
  get data() {
    return this.dataManager.data;
  }

  get pendingChanges() {
    return this.dataManager.pendingChanges;
  }

  // ヘルパーメソッド
  findBodyByName(name) {
    return this.data.body?.find(b => b.name === name);
  }

  findZoneByBodyName(bodyName) {
    return this.data.zone?.find(z => z.body_name === bodyName);
  }

  findSourceByName(name) {
    return this.data.source?.find(s => s.name === name);
  }

  findDetectorByName(name) {
    return this.data.detector?.find(d => d.name === name);
  }

  validatePosition(position) {
    if (typeof position !== 'string' || position.trim() === '') {
      throw new ValidationError('positionは文字列で指定してください', 'position', position);
    }
    const coords = position.trim().split(/\s+/);
    if (coords.length !== 3) {
      throw new ValidationError('positionは3つの座標値（x y z）で指定してください', 'position', position);
    }
    for (const coord of coords) {
      if (isNaN(Number(coord))) {
        throw new ValidationError('positionの座標値は数値で指定してください', 'position', position);
      }
    }
  }

  validateBodyName(name) {
    ManifestValidator.validateObjectName(name, 'body name');
  }

  // 座標文字列を正規化（引用符なしの数値として処理）
  normalizeCoordinates(coordString) {
    if (typeof coordString !== 'string') return coordString;
    // "x y z" 形式の文字列を数値として正規化
    const coords = coordString.trim().split(/\s+/).map(Number);
    if (coords.length === 3 && coords.every(n => !isNaN(n))) {
      return coords.join(' ');
    }
    return coordString;
  }

  // グリッドデータ正規化（検出器用）
  normalizeGridData(grid) {
    if (!Array.isArray(grid)) return grid;
    
    return grid.map(gridItem => ({
      edge: this.normalizeCoordinates(gridItem.edge),
      number: Number(gridItem.number)
    }));
  }

  // 検出器バリデーション
  validateDetectorData(name, origin, grid) {
    // 名前バリデーション
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('検出器名は必須です', 'name', name);
    }
    if (name.length > 50) {
      throw new ValidationError('検出器名は50文字以内で指定してください', 'name', name);
    }
    
    // 座標バリデーション
    this.validatePosition(origin);
    
    // グリッドバリデーション
    if (grid && Array.isArray(grid)) {
      if (grid.length > 3) {
        throw new ValidationError('gridの次元は3次元以下である必要があります', 'grid', grid);
      }
      for (const gridItem of grid) {
        if (!gridItem.edge || !gridItem.number) {
          throw new ValidationError('gridの各要素にはedgeとnumberが必要です', 'grid', gridItem);
        }
        this.validatePosition(gridItem.edge);
        if (!Number.isInteger(gridItem.number) || gridItem.number <= 0) {
          throw new ValidationError('gridのnumberは正の整数である必要があります', 'number', gridItem.number);
        }
      }
    }
  }

  // グリッドデータのバリデーション（更新用）
  validateGridData(grid) {
    if (!Array.isArray(grid)) {
      throw new ValidationError('gridは配列である必要があります', 'grid', grid);
    }
    if (grid.length > 3) {
      throw new ValidationError('gridの次元は3次元以下である必要があります', 'grid', grid);
    }
    for (const gridItem of grid) {
      if (!gridItem.edge || !gridItem.number) {
        throw new ValidationError('gridの各要素にはedgeとnumberが必要です', 'grid', gridItem);
      }
      this.validatePosition(gridItem.edge);
      if (!Number.isInteger(gridItem.number) || gridItem.number <= 0) {
        throw new ValidationError('gridのnumberは正の整数である必要があります', 'number', gridItem.number);
      }
    }
  }
  // 立体関連メソッド
  async proposeBody(name, type, options = {}) {
    try {
      // 入力バリデーション
      this.validateBodyName(name);
      ManifestValidator.validateBodyType(type, 'type');
      PhysicsValidator.validateGeometry(type, options);
      
      // Transform参照チェック
      if (options.transform) {
        TransformValidator.validateContextTransformReference(
          options.transform, 
          this.data, 
          'body', 
          name
        );
      }

      // 重複チェック
      if (this.findBodyByName(name)) {
        throw PokerMcpError.duplicateName(name, 'body');
      }

      const newBody = this.createBodyObject(name, type, options);
      
      await this.dataManager.addPendingChange({
        action: 'add_body',
        data: { body: newBody }
      });

      logger.info('立体を提案しました', { name, type });
      return `提案: 立体 ${name} を追加`;
      
    } catch (error) {
      logger.error('立体提案エラー', { name, type, error: error.message });
      throw error;
    }
  }

  createBodyObject(name, type, options) {
    const body = { name, type };
    
    // 型別のパラメータ設定（座標の正規化適用）
    switch (type) {
      case 'SPH':
        body.center = this.normalizeCoordinates(options.center);
        body.radius = Number(options.radius);
        break;
      case 'RCC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.radius = Number(options.radius);
        break;
      case 'RPP':
        body.min = this.normalizeCoordinates(options.min);
        body.max = this.normalizeCoordinates(options.max);
        break;
      case 'BOX':
        body.vertex = this.normalizeCoordinates(options.vertex);
        body.edge_1 = this.normalizeCoordinates(options.edge_1);
        body.edge_2 = this.normalizeCoordinates(options.edge_2);
        body.edge_3 = this.normalizeCoordinates(options.edge_3);
        break;
      case 'CMB':
        body.expression = options.expression;
        break;
      case 'TOR':
        body.center = this.normalizeCoordinates(options.center);
        body.normal = this.normalizeCoordinates(options.normal);
        body.major_radius = Number(options.major_radius);
        body.minor_radius_horizontal = Number(options.minor_radius_horizontal);
        body.minor_radius_vertical = Number(options.minor_radius_vertical);
        break;
      case 'ELL':
        body.center = this.normalizeCoordinates(options.center);
        body.radius_vector_1 = this.normalizeCoordinates(options.radius_vector_1);
        body.radius_vector_2 = this.normalizeCoordinates(options.radius_vector_2);
        body.radius_vector_3 = this.normalizeCoordinates(options.radius_vector_3);
        break;
      case 'REC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.radius_vector_1 = this.normalizeCoordinates(options.radius_vector_1);
        body.radius_vector_2 = this.normalizeCoordinates(options.radius_vector_2);
        break;
      case 'TRC':
        body.bottom_center = this.normalizeCoordinates(options.bottom_center);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.bottom_radius = Number(options.bottom_radius);
        body.top_radius = Number(options.top_radius);
        break;
      case 'WED':
        body.vertex = this.normalizeCoordinates(options.vertex);
        body.width_vector = this.normalizeCoordinates(options.width_vector);
        body.height_vector = this.normalizeCoordinates(options.height_vector);
        body.depth_vector = this.normalizeCoordinates(options.depth_vector);
        break;
    }

    if (options.transform) {
      body.transform = options.transform;
    }

    return body;
  }
  async deleteBody(name) {
    try {
      const body = this.findBodyByName(name);
      if (!body) {
        throw new ValidationError(`立体 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック
      const dependentZones = this.data.zone?.filter(z => z.body_name === name) || [];
      if (dependentZones.length > 0) {
        throw new PhysicsError(
          `立体 ${name} には依存するゾーンが存在します: ${dependentZones.map(z => z.body_name).join(', ')}`,
          'DEPENDENT_ZONES_EXIST'
        );
      }

      await this.dataManager.addPendingChange({
        action: 'delete_body',
        data: { name: name }
      });

      logger.info('立体削除を提案しました', { name });
      return `提案: 立体 ${name} を削除`;
      
    } catch (error) {
      logger.error('立体削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // ゾーン関連メソッド
  async proposeZone(body_name, material, density) {
    try {
      // バリデーション
      this.validateZoneProposal(body_name, material, density);
      PhysicsValidator.validateMaterialDensity(material, density);

      const newZone = { body_name, material };
      if (material !== 'VOID') {
        newZone.density = Number(density);
      }

      await this.dataManager.addPendingChange({
        action: 'add_zone',
        data: { zone: newZone }
      });

      logger.info('ゾーンを提案しました', { body_name, material });
      return `提案: ゾーン ${body_name} (${material}) を追加`;
      
    } catch (error) {
      logger.error('ゾーン提案エラー', { body_name, material, error: error.message });
      throw error;
    }
  }

  validateZoneProposal(body_name, material, density) {
    if (body_name !== 'ATMOSPHERE') {
      const body = this.findBodyByName(body_name);
      if (!body) {
        throw new ValidationError(`立体 ${body_name} が存在しません`, 'body_name', body_name);
      }
    }

    const existingZone = this.findZoneByBodyName(body_name);
    if (existingZone) {
      throw new ValidationError(`ゾーン ${body_name} は既に存在します`, 'body_name', body_name);
    }
  }

  async deleteZone(body_name) {
    try {
      if (body_name === 'ATMOSPHERE') {
        throw new ValidationError('ATMOSPHEREゾーンは削除できません', 'body_name', body_name);
      }

      const zone = this.findZoneByBodyName(body_name);
      if (!zone) {
        throw new ValidationError(`ゾーン ${body_name} が見つかりません`, 'body_name', body_name);
      }

      await this.dataManager.addPendingChange({
        action: 'delete_zone',
        data: { body_name: body_name }
      });

      logger.info('ゾーン削除を提案しました', { body_name });
      return `提案: ゾーン ${body_name} を削除`;
      
    } catch (error) {
      logger.error('ゾーン削除エラー', { body_name, error: error.message });
      throw error;
    }
  }

  async applyChanges() {
    try {
      const result = await this.dataManager.applyChanges();
      logger.info('変更を適用しました');
      return result;
    } catch (error) {
      logger.error('変更適用エラー', { error: error.message });
      throw error;
    }
  }

  // Transform操作
  async proposeTransform(name, operations) {
    try {
      if (!name) throw new ValidationError('回転移動のnameは必須です', 'name', name);
      if (!Array.isArray(operations) || operations.length === 0) {
        throw new ValidationError('operationは配列で1つ以上必要です', 'operation', operations);
      }

      // operationバリデーション
      for (const op of operations) {
        const keys = Object.keys(op);
        if (keys.length !== 1) throw new ValidationError('各operationは1つのキーのみ指定してください', 'operation', op);
        const key = keys[0];
        const val = op[key];
        switch (key) {
          case 'rotate_around_x':
          case 'rotate_around_y':
          case 'rotate_around_z':
            if (!(typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val))))) {
              throw new ValidationError(`${key}の値は数値で指定してください`, key, val);
            }
            break;
          case 'translate':
            if (typeof val !== 'string' || val.trim().split(/\s+/).length !== 3) {
              throw new ValidationError('translateは3つの数字（空白区切り）で指定してください', 'translate', val);
            }
            break;
          default:
            throw new ValidationError(`未対応の操作: ${key}`, 'operation', key);
        }
      }

      await this.dataManager.addPendingChange({
        action: 'proposeTransform',
        data: { name, operations }
      });
      logger.info('変換提案を追加しました', { name, operations });
      return `回転移動 ${name} を追加しました`;
      
    } catch (error) {
      logger.error('変換提案エラー', { name, error: error.message });
      throw error;
    }
  }

  async updateTransform(name, updates) {
    try {
      if (!name) throw new ValidationError('変換のnameは必須です', 'name', name);
      
      await this.dataManager.addPendingChange({
        action: 'updateTransform',
        data: { name, ...updates }
      });
      logger.info('変換更新を提案しました', { name, updates });
      return `提案: 変換 ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
      
    } catch (error) {
      logger.error('変換更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteTransform(name) {
    try {
      if (!name) throw PokerMcpError.validationError('変換のnameは必須です', 'name', name);
      
      // Transform名の検証
      ManifestValidator.validateObjectName(name, 'transform name');
      
      // 依存関係チェック
      TransformValidator.checkTransformDependencies(name, this.data);
      
      await this.dataManager.addPendingChange({
        action: 'deleteTransform',
        data: { name }
      });
      logger.info('変換削除を提案しました', { name });
      return `提案: 変換 ${name} の削除を保留しました`;
      
    } catch (error) {
      logger.error('変換削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // Buildup Factor操作
  async proposeBuildupFactor(material, useSlantCorrection, useFiniteMediumCorrection) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'proposeBuildupFactor',
        data: { 
          material, 
          use_slant_correction: useSlantCorrection, 
          use_finite_medium_correction: useFiniteMediumCorrection 
        }
      });
      logger.info('ビルドアップ係数提案を追加しました', { material });
      return `ビルドアップ係数 ${material} を追加しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数提案エラー', { material, error: error.message });
      throw error;
    }
  }

  async updateBuildupFactor(material, updates) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'updateBuildupFactor',
        data: { material, ...updates }
      });
      logger.info('ビルドアップ係数更新を提案しました', { material, updates });
      return `提案: ビルドアップ係数 ${material} の更新を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数更新エラー', { material, error: error.message });
      throw error;
    }
  }

  async deleteBuildupFactor(material) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'deleteBuildupFactor',
        data: { material }
      });
      logger.info('ビルドアップ係数削除を提案しました', { material });
      return `提案: ビルドアップ係数 ${material} の削除を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数削除エラー', { material, error: error.message });
      throw error;
    }
  }

  async changeOrderBuildupFactor(material, newIndex) {
    try {
      if (!material) throw new ValidationError('materialは必須です', 'material', material);
      
      await this.dataManager.addPendingChange({
        action: 'changeOrderBuildupFactor',
        data: { material, newIndex }
      });
      logger.info('ビルドアップ係数順序変更を提案しました', { material, newIndex });
      return `提案: ビルドアップ係数 ${material} の順序変更を保留しました`;
      
    } catch (error) {
      logger.error('ビルドアップ係数順序変更エラー', { material, error: error.message });
      throw error;
    }
  }

  // Source操作
  async proposeSource(params) {
    try {
      const { name, type, position, inventory, cutoff_rate } = params;
      
      // 基本バリデーション
      if (!name) throw PokerMcpError.validationError('線源のnameは必須です', 'name', name);
      ManifestValidator.validateObjectName(name, 'source name');
      
      if (!type) throw PokerMcpError.validationError('線源のtypeは必須です', 'type', type);
      if (!position) throw PokerMcpError.validationError('線源のpositionは必須です', 'position', position);
      
      // 座標検証
      ManifestValidator.validateCoordinateString(position, 'position');
      
      // インベントリ検証（核種名連結形式チェック含む）
      NuclideValidator.validateInventory(inventory);
      
      // Transform参照チェック（geometry内にある場合）
      if (params.geometry && params.geometry.transform) {
        TransformValidator.validateContextTransformReference(
          params.geometry.transform,
          this.data,
          'source',
          name
        );
      }
      
      // 座標データの正規化
      const normalizedParams = {
        ...params,
        position: this.normalizeCoordinates(position)
      };
      
      await this.dataManager.addPendingChange({
        action: 'proposeSource',
        data: normalizedParams
      });
      logger.info('線源提案を追加しました', { name, type });
      return `提案: 線源 ${name} を追加`;
      
    } catch (error) {
      logger.error('線源提案エラー', { params, error: error.message });
      throw error;
    }
  }

  async updateSource(name, updates) {
    try {
      if (!name) throw new ValidationError('線源のnameは必須です', 'name', name);
      
      // 既存線源の存在確認
      const existingSource = this.findSourceByName(name);
      if (!existingSource) {
        throw new ValidationError(`線源 ${name} が見つかりません`, 'name', name);
      }

      // 更新内容のバリデーションと正規化
      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.position) {
        this.validatePosition(normalizedUpdates.position);
        normalizedUpdates.position = this.normalizeCoordinates(normalizedUpdates.position);
      }
      
      if (normalizedUpdates.inventory) {
        if (!Array.isArray(normalizedUpdates.inventory) || normalizedUpdates.inventory.length === 0) {
          throw new ValidationError('inventoryは配列で1つ以上の要素が必要です', 'inventory', normalizedUpdates.inventory);
        }
        // inventoryの検証
        for (const item of normalizedUpdates.inventory) {
          if (!item.nuclide) throw new ValidationError('inventory要素にnuclideが必要', 'nuclide', item);
          if (typeof item.radioactivity !== 'number' || item.radioactivity < 0) {
            throw new ValidationError('radioactivityは0以上の数値が必要', 'radioactivity', item);
          }
        }
      }
      
      if (normalizedUpdates.cutoff_rate !== undefined) {
        if (typeof normalizedUpdates.cutoff_rate !== 'number' || normalizedUpdates.cutoff_rate < 0) {
          throw new ValidationError('cutoff_rateは0以上の数値が必要', 'cutoff_rate', normalizedUpdates.cutoff_rate);
        }
      }
      
      // typeの変更は禁止（物理的整合性のため）
      if (normalizedUpdates.type && normalizedUpdates.type !== existingSource.type) {
        throw new ValidationError('線源のtypeは変更できません', 'type', normalizedUpdates.type);
      }
      
      await this.dataManager.addPendingChange({
        action: 'updateSource',
        data: { name, ...normalizedUpdates }
      });
      logger.info('線源更新を提案しました', { name, updates: normalizedUpdates });
      return `提案: 線源 ${name} の更新を保留しました`;
      
    } catch (error) {
      logger.error('線源更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteSource(name) {
    try {
      if (!name) throw new ValidationError('線源のnameは必須です', 'name', name);
      
      // 既存線源の存在確認
      const existingSource = this.findSourceByName(name);
      if (!existingSource) {
        throw new ValidationError(`線源 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック（将来の拡張用）
      // 現在は線源を直接参照する他要素はないが、将来の機能追加に備える
      
      await this.dataManager.addPendingChange({
        action: 'deleteSource',
        data: { name }
      });
      logger.info('線源削除を提案しました', { name });
      return `提案: 線源 ${name} を削除`;
      
    } catch (error) {
      logger.error('線源削除エラー', { name, error: error.message });
      throw error;
    }
  }

  // Body操作の追加メソッド
  async updateBody(name, updates) {
    try {
      if (!name) throw new ValidationError('立体のnameは必須です', 'name', name);
      
      // 座標データの正規化
      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.min) normalizedUpdates.min = this.normalizeCoordinates(normalizedUpdates.min);
      if (normalizedUpdates.max) normalizedUpdates.max = this.normalizeCoordinates(normalizedUpdates.max);
      if (normalizedUpdates.center) normalizedUpdates.center = this.normalizeCoordinates(normalizedUpdates.center);
      if (normalizedUpdates.bottom_center) normalizedUpdates.bottom_center = this.normalizeCoordinates(normalizedUpdates.bottom_center);
      if (normalizedUpdates.height_vector) normalizedUpdates.height_vector = this.normalizeCoordinates(normalizedUpdates.height_vector);
      if (normalizedUpdates.vertex) normalizedUpdates.vertex = this.normalizeCoordinates(normalizedUpdates.vertex);
      if (normalizedUpdates.edge_1) normalizedUpdates.edge_1 = this.normalizeCoordinates(normalizedUpdates.edge_1);
      if (normalizedUpdates.edge_2) normalizedUpdates.edge_2 = this.normalizeCoordinates(normalizedUpdates.edge_2);
      if (normalizedUpdates.edge_3) normalizedUpdates.edge_3 = this.normalizeCoordinates(normalizedUpdates.edge_3);
      // 新しい立体タイプのパラメータ対応
      if (normalizedUpdates.normal) normalizedUpdates.normal = this.normalizeCoordinates(normalizedUpdates.normal);
      if (normalizedUpdates.radius_vector_1) normalizedUpdates.radius_vector_1 = this.normalizeCoordinates(normalizedUpdates.radius_vector_1);
      if (normalizedUpdates.radius_vector_2) normalizedUpdates.radius_vector_2 = this.normalizeCoordinates(normalizedUpdates.radius_vector_2);
      if (normalizedUpdates.radius_vector_3) normalizedUpdates.radius_vector_3 = this.normalizeCoordinates(normalizedUpdates.radius_vector_3);
      if (normalizedUpdates.width_vector) normalizedUpdates.width_vector = this.normalizeCoordinates(normalizedUpdates.width_vector);
      if (normalizedUpdates.depth_vector) normalizedUpdates.depth_vector = this.normalizeCoordinates(normalizedUpdates.depth_vector);
      
      await this.dataManager.addPendingChange({
        action: 'updateBody',
        data: { name, ...normalizedUpdates }
      });
      logger.info('立体更新を提案しました', { name, updates: normalizedUpdates });
      return `提案: 立体 ${name} の更新を保留しました: ${JSON.stringify(normalizedUpdates)}`;
      
    } catch (error) {
      logger.error('立体更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async updateZone(bodyName, updates) {
    try {
      if (!bodyName) throw new ValidationError('ゾーンのbody_nameは必須です', 'body_name', bodyName);
      
      await this.dataManager.addPendingChange({
        action: 'updateZone',
        data: { body_name: bodyName, ...updates }
      });
      logger.info('ゾーン更新を提案しました', { bodyName, updates });
      return `提案: ゾーン ${bodyName} の更新を保留しました: ${JSON.stringify(updates)}`;
      
    } catch (error) {
      logger.error('ゾーン更新エラー', { bodyName, error: error.message });
      throw error;
    }
  }

  // Detector操作
  async proposeDetector(name, origin, grid = [], show_path_trace = false) {
    try {
      // 入力バリデーション
      this.validateDetectorData(name, origin, grid);

      // 重複チェック
      if (this.findDetectorByName(name)) {
        throw new ValidationError(`検出器名 ${name} は既に存在します`, 'name', name);
      }

      const newDetector = {
        name,
        origin: this.normalizeCoordinates(origin),
        grid: this.normalizeGridData(grid),
        show_path_trace
      };
      
      await this.dataManager.addPendingChange({
        action: 'proposeDetector',
        data: newDetector
      });

      logger.info('検出器を提案しました', { name, origin, gridDimensions: grid.length });
      return `提案: 検出器 ${name} を追加`;
      
    } catch (error) {
      logger.error('検出器提案エラー', { name, origin, error: error.message });
      throw error;
    }
  }

  async updateDetector(name, updates) {
    try {
      if (!name) throw new ValidationError('検出器のnameは必須です', 'name', name);
      
      // 既存検出器の存在確認
      const existingDetector = this.findDetectorByName(name);
      if (!existingDetector) {
        throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
      }

      // 更新内容のバリデーションと正規化
      const normalizedUpdates = { ...updates };
      if (normalizedUpdates.origin) {
        this.validatePosition(normalizedUpdates.origin);
        normalizedUpdates.origin = this.normalizeCoordinates(normalizedUpdates.origin);
      }
      
      if (normalizedUpdates.grid) {
        this.validateGridData(normalizedUpdates.grid);
        normalizedUpdates.grid = this.normalizeGridData(normalizedUpdates.grid);
      }
      
      if (normalizedUpdates.show_path_trace !== undefined) {
        if (typeof normalizedUpdates.show_path_trace !== 'boolean') {
          throw new ValidationError('show_path_traceは真偽値である必要があります', 'show_path_trace', normalizedUpdates.show_path_trace);
        }
      }
      
      await this.dataManager.addPendingChange({
        action: 'updateDetector',
        data: { name, ...normalizedUpdates }
      });
      logger.info('検出器更新を提案しました', { name, updates: normalizedUpdates });
      return `提案: 検出器 ${name} の更新を保留しました`;
      
    } catch (error) {
      logger.error('検出器更新エラー', { name, error: error.message });
      throw error;
    }
  }

  async deleteDetector(name) {
    try {
      if (!name) throw new ValidationError('検出器のnameは必須です', 'name', name);
      
      // 既存検出器の存在確認
      const existingDetector = this.findDetectorByName(name);
      if (!existingDetector) {
        throw new ValidationError(`検出器 ${name} が見つかりません`, 'name', name);
      }

      // 依存関係チェック（将来の拡張用）
      // 現在は検出器を直接参照する他要素はないが、将来の機能追加に備える
      
      await this.dataManager.addPendingChange({
        action: 'deleteDetector',
        data: { name }
      });
      logger.info('検出器削除を提案しました', { name });
      return `提案: 検出器 ${name} を削除`;
      
    } catch (error) {
      logger.error('検出器削除エラー', { name, error: error.message });
      throw error;
    }
  }
}
