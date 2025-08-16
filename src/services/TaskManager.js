// services/TaskManager.js
import { SafeDataManager } from './DataManager.js';
import { PhysicsValidator } from '../validators/PhysicsValidator.js';
import { logger } from '../utils/logger.js';
import { ValidationError, PhysicsError } from '../utils/errors.js';

export class TaskManager {
  constructor(yamlFile, pendingFile) {
    this.dataManager = new SafeDataManager(yamlFile, pendingFile);
  }

  async initialize() {
    await this.dataManager.initialize();
    logger.info('TaskManagerを初期化しました');
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

  validateBodyName(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('立体名は必須です', 'name', name);
    }
    if (name.length > 50) {
      throw new ValidationError('立体名は50文字以内で指定してください', 'name', name);
    }
  }
  // 立体関連メソッド
  async proposeBody(name, type, options = {}) {
    try {
      // 入力バリデーション
      this.validateBodyName(name);
      PhysicsValidator.validateGeometry(type, options);

      // 重複チェック
      if (this.findBodyByName(name)) {
        throw new ValidationError(`立体名 ${name} は既に存在します`, 'name', name);
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
    
    // 型別のパラメータ設定
    switch (type) {
      case 'SPH':
        body.center = options.center;
        body.radius = Number(options.radius);
        break;
      case 'RCC':
        body.bottom_center = options.bottom_center;
        body.height_vector = options.height_vector;
        body.radius = Number(options.radius);
        break;
      case 'RPP':
        body.min = options.min;
        body.max = options.max;
        break;
      case 'BOX':
        body.vertex = options.vertex;
        body.edge_1 = options.edge_1;
        body.edge_2 = options.edge_2;
        body.edge_3 = options.edge_3;
        break;
      case 'CMB':
        body.expression = options.expression;
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
      if (!name) throw new ValidationError('変換のnameは必須です', 'name', name);
      
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
      
      if (!name) throw new ValidationError('線源のnameは必須です', 'name', name);
      if (!type) throw new ValidationError('線源のtypeは必須です', 'type', type);
      if (!position) throw new ValidationError('線源のpositionは必須です', 'position', position);
      if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
        throw new ValidationError('inventoryは必須で、配列である必要があります', 'inventory', inventory);
      }
      
      // inventoryの検証
      for (const item of inventory) {
        if (!item.nuclide) throw new ValidationError('inventory要素にnuclideが必要', 'nuclide', item);
        if (typeof item.radioactivity !== 'number') throw new ValidationError('inventory要素にradioactivityが必要', 'radioactivity', item);
      }
      
      await this.dataManager.addPendingChange({
        action: 'proposeSource',
        data: params
      });
      logger.info('線源提案を追加しました', { name, type });
      return `提案: 線源 ${name} を追加`;
      
    } catch (error) {
      logger.error('線源提案エラー', { params, error: error.message });
      throw error;
    }
  }

  // Body操作の追加メソッド
  async updateBody(name, updates) {
    try {
      if (!name) throw new ValidationError('立体のnameは必須です', 'name', name);
      
      await this.dataManager.addPendingChange({
        action: 'updateBody',
        data: { name, ...updates }
      });
      logger.info('立体更新を提案しました', { name, updates });
      return `提案: 立体 ${name} の更新を保留しました: ${JSON.stringify(updates)}`;
      
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
}
