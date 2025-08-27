// services/DataManager.js
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger.js';
import { DataError } from '../utils/errors.js';

export class SafeDataManager {
  constructor(yamlFile, pendingFile) {
    this.yamlFile = yamlFile;
    this.pendingFile = pendingFile;
    this.backupDir = 'backups';
    this.maxBackups = 10;
    this.data = null;
    this.pendingChanges = [];
  }

  async initialize() {
    try {
      // バックアップディレクトリ作成
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir('logs', { recursive: true });
      
      // 初期データ読み込み
      await this.loadData();
      await this.loadPendingChanges();
      
      logger.info('データマネージャーを初期化しました');
    } catch (error) {
      logger.error('データマネージャーの初期化に失敗しました', { error: error.message });
      throw new DataError(`初期化に失敗: ${error.message}`, 'INITIALIZATION');
    }
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.yamlFile, 'utf8');
      this.data = yaml.load(data);
      
      // Unit セクション自動検証・修復
      await this.validateAndRepairUnit();
      
      logger.info('YAMLデータを読み込みました', { file: this.yamlFile });
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn('YAMLファイルが見つかりません。初期データを作成します', { file: this.yamlFile });
        this.data = { body: [], zone: [], transform: [], buildup_factor: [], source: [], detector: [] };
        
        // 初期データにunit セクションを作成
        this.data.unit = this.createDefaultUnitSection();
        
        await this.saveData();
      } else {
        logger.error('YAMLファイルの読み込みに失敗しました', { error: error.message });
        throw new DataError(`YAML読み込みに失敗: ${error.message}`, 'LOAD_DATA');
      }
    }
  }

  async loadPendingChanges() {
    try {
      const data = await fs.readFile(this.pendingFile, 'utf8');
      this.pendingChanges = JSON.parse(data || '[]');
      logger.info('保留変更を読み込みました', { count: this.pendingChanges.length });
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.pendingChanges = [];
        await this.savePendingChanges();
      } else {
        logger.error('保留変更の読み込みに失敗しました', { error: error.message });
        throw new DataError(`保留変更読み込みに失敗: ${error.message}`, 'LOAD_PENDING');
      }
    }
  }

  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `${path.basename(this.yamlFile)}-${timestamp}`);
      await fs.copyFile(this.yamlFile, backupFile);
      
      // 古いバックアップを削除
      await this.cleanupBackups();
      
      logger.info('バックアップを作成しました', { backupFile });
    } catch (error) {
      logger.error('バックアップの作成に失敗しました', { error: error.message });
    }
  }

  async cleanupBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(f => f.startsWith(path.basename(this.yamlFile)))
                              .map(f => ({ name: f, path: path.join(this.backupDir, f) }))
                              .sort((a, b) => b.name.localeCompare(a.name));
      
      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          logger.info('古いバックアップを削除しました', { file: file.name });
        }
      }
    } catch (error) {
      logger.error('バックアップのクリーンアップに失敗しました', { error: error.message });
    }
  }

  async saveData() {
    try {
      await this.createBackup();
      const yamlData = yaml.dump(this.data, { 
      flowLevel: -1,  // すべてのレベルでブロックスタイルを使用
      lineWidth: 120,
      noRefs: true,
        quotingType: '"',
      forceQuotes: false
    });
      await fs.writeFile(this.yamlFile, yamlData, 'utf8');
      logger.info('YAMLデータを保存しました', { file: this.yamlFile });
    } catch (error) {
      logger.error('データの保存に失敗しました', { error: error.message });
      throw new DataError(`データの保存に失敗: ${error.message}`, 'SAVE_DATA');
    }
  }

  async savePendingChanges() {
    try {
      const jsonData = JSON.stringify(this.pendingChanges, null, 2);
      await fs.writeFile(this.pendingFile, jsonData, 'utf8');
      logger.info('保留変更を保存しました', { count: this.pendingChanges.length });
    } catch (error) {
      logger.error('保留変更の保存に失敗しました', { error: error.message });
      throw new DataError(`保留変更の保存に失敗: ${error.message}`, 'SAVE_PENDING');
    }
  }

  async addPendingChange(change) {
    this.pendingChanges.push({
      ...change,
      timestamp: new Date().toISOString(),
      id: Date.now()
    });
    await this.savePendingChanges();
    logger.info('保留変更を追加しました', { action: change.action });
  }

  async applyChanges() {
    if (this.pendingChanges.length === 0) {
      return '適用する変更がありません';
    }

    try {
      logger.info('変更の適用を開始します', { count: this.pendingChanges.length });
      
      for (const change of this.pendingChanges) {
        await this.applyChange(change);
      }

      await this.saveData();
      
      // 適用後は保留変更をクリア
      this.pendingChanges = [];
      await this.savePendingChanges();

      logger.info('すべての変更を適用しました');
      return '変更を正常に適用しました';
      
    } catch (error) {
      logger.error('変更の適用に失敗しました', { error: error.message });
      throw new DataError(`変更の適用に失敗: ${error.message}`, 'APPLY_CHANGES');
    }
  }

  async applyChange(change) {
    const { action, data } = change;
    
    switch (action) {
      case 'add_body':
        if (!this.data.body) this.data.body = [];
        const existingBody = this.data.body.find(b => b.name === data.body.name);
        if (existingBody) {
          Object.assign(existingBody, data.body);
        } else {
          this.data.body.push(data.body);
        }
        break;

      case 'add_zone':
        if (!this.data.zone) this.data.zone = [];
        const existingZone = this.data.zone.find(z => z.body_name === data.zone.body_name);
        if (existingZone) {
          Object.assign(existingZone, data.zone);
        } else {
          this.data.zone.push(data.zone);
        }
        break;

      case 'delete_body':
        if (this.data.body) {
          const bodyIndex = this.data.body.findIndex(b => b.name === data.name);
          if (bodyIndex !== -1) {
            this.data.body.splice(bodyIndex, 1);
          }
        }
        break;

      case 'delete_zone':
        if (data.body_name === 'ATMOSPHERE') break; // ATMOSPHERE削除禁止
        if (this.data.zone) {
          const zoneIndex = this.data.zone.findIndex(z => z.body_name === data.body_name);
          if (zoneIndex !== -1) {
            this.data.zone.splice(zoneIndex, 1);
          }
        }
        break;

      case 'updateBody':
        if (this.data.body) {
          const body = this.data.body.find(b => b.name === data.name);
          if (body) {
            Object.keys(data).forEach(key => {
              if (key !== 'name') {
                if (data[key] === null) {
                  delete body[key];
                } else {
                  body[key] = data[key];
                }
              }
            });
          }
        }
        break;

      case 'updateZone':
        if (this.data.zone) {
          const zone = this.data.zone.find(z => z.body_name === data.body_name);
          if (zone) {
            if (data.new_body_name !== undefined) zone.body_name = data.new_body_name;
            if (data.material !== undefined) zone.material = data.material;
            if (data.density !== undefined) {
              if (data.density === null) {
                delete zone.density;
              } else {
                zone.density = data.density;
              }
            }
          }
        }
        break;

      case 'proposeTransform':
        if (!this.data.transform) this.data.transform = [];
        const existingTransform = this.data.transform.find(t => t.name === data.name);
        if (existingTransform) {
          existingTransform.operation = data.operations;
        } else {
          this.data.transform.push({
            name: data.name,
            operation: data.operations
          });
        }
        break;

      case 'updateTransform':
        if (this.data.transform) {
          const transform = this.data.transform.find(t => t.name === data.name);
          if (transform) {
            Object.keys(data).forEach(key => {
              if (key !== 'name') {
                transform[key] = data[key];
              }
            });
          }
        }
        break;

      case 'deleteTransform':
        if (this.data.transform) {
          const transformIndex = this.data.transform.findIndex(t => t.name === data.name);
          if (transformIndex !== -1) {
            this.data.transform.splice(transformIndex, 1);
          }
        }
        break;

      case 'proposeBuildupFactor':
        if (!this.data.buildup_factor) this.data.buildup_factor = [];
        const existingBuildup = this.data.buildup_factor.find(bf => bf.material === data.material);
        if (existingBuildup) {
          Object.assign(existingBuildup, data);
        } else {
          this.data.buildup_factor.push({
            material: data.material,
            use_slant_correction: data.use_slant_correction,
            use_finite_medium_correction: data.use_finite_medium_correction
          });
        }
        break;

      case 'updateBuildupFactor':
        if (this.data.buildup_factor) {
          const buildup = this.data.buildup_factor.find(bf => bf.material === data.material);
          if (buildup) {
            if ('use_slant_correction' in data) {
              buildup.use_slant_correction = data.use_slant_correction;
            }
            if ('use_finite_medium_correction' in data) {
              buildup.use_finite_medium_correction = data.use_finite_medium_correction;
            }
          }
        }
        break;

      case 'deleteBuildupFactor':
        if (this.data.buildup_factor) {
          const buildupIndex = this.data.buildup_factor.findIndex(bf => bf.material === data.material);
          if (buildupIndex !== -1) {
            this.data.buildup_factor.splice(buildupIndex, 1);
          }
        }
        break;

      case 'changeOrderBuildupFactor':
        if (this.data.buildup_factor) {
          const buildupIndex = this.data.buildup_factor.findIndex(bf => bf.material === data.material);
          if (buildupIndex !== -1 && typeof data.newIndex === 'number' && 
              data.newIndex >= 0 && data.newIndex < this.data.buildup_factor.length) {
            const [item] = this.data.buildup_factor.splice(buildupIndex, 1);
            this.data.buildup_factor.splice(data.newIndex, 0, item);
          }
        }
        break;

      case 'proposeSource':
        if (!this.data.source) this.data.source = [];
        const existingSource = this.data.source.find(s => s.name === data.name);
        if (existingSource) {
          Object.assign(existingSource, data);
        } else {
          // 完全なsourceオブジェクトを構築
          const sourceObject = {
            name: data.name,
            type: data.type,
            inventory: data.inventory
          };
          
          // cutoff_rateの追加（デフォルト値処理）
          if (data.cutoff_rate !== undefined) {
            sourceObject.cutoff_rate = data.cutoff_rate;
          }
          
          // POINT線源の場合はpositionを追加
          if (data.type === 'POINT' && data.position) {
            sourceObject.position = data.position;
            logger.info('POINT線源にpositionを追加', { name: data.name, position: data.position });
          }
          
          // 体積線源の場合はgeometryとdivisionを追加
          if (data.type !== 'POINT') {
            // geometryの確実な追加
            if (data.geometry) {
              sourceObject.geometry = data.geometry;
              logger.info('体積線源にgeometryを追加', { name: data.name, geometry: data.geometry });
            } else {
              logger.warn('体積線源にgeometryがありません', { name: data.name, type: data.type });
            }
            
            // divisionの確実な追加
            if (data.division) {
              sourceObject.division = data.division;
              logger.info('体積線源にdivisionを追加', { name: data.name, division: data.division });
            } else {
              logger.warn('体積線源にdivisionがありません', { name: data.name, type: data.type });
            }
          }
          
          logger.info('最終的なsourceObject', { 
            name: sourceObject.name,
            type: sourceObject.type,
            hasGeometry: !!sourceObject.geometry,
            hasDivision: !!sourceObject.division,
            hasPosition: !!sourceObject.position,
            fullObject: sourceObject 
          });
          this.data.source.push(sourceObject);
        }
        break;

      case 'updateSource':
        if (this.data.source) {
          const source = this.data.source.find(s => s.name === data.name);
          if (source) {
            Object.keys(data).forEach(key => {
              if (key !== 'name') {
                if (data[key] === null) {
                  delete source[key];
                } else {
                  source[key] = data[key];
                }
              }
            });
          }
        }
        break;

      case 'deleteSource':
        if (this.data.source) {
          const sourceIndex = this.data.source.findIndex(s => s.name === data.name);
          if (sourceIndex !== -1) {
            this.data.source.splice(sourceIndex, 1);
          }
        }
        break;

      case 'proposeDetector':
        if (!this.data.detector) this.data.detector = [];
        const existingDetector = this.data.detector.find(d => d.name === data.name);
        if (existingDetector) {
          Object.assign(existingDetector, data);
        } else {
          // 完全なdetectorオブジェクトを構築
          const detectorObject = {
            name: data.name,
            origin: data.origin,
            grid: data.grid || [],
            show_path_trace: data.show_path_trace || false
          };
          
          // transformが指定されている場合は追加
          if (data.transform) {
            detectorObject.transform = data.transform;
          }
          
          this.data.detector.push(detectorObject);
        }
        break;

      case 'updateDetector':
        if (this.data.detector) {
          const detector = this.data.detector.find(d => d.name === data.name);
          if (detector) {
            Object.keys(data).forEach(key => {
              if (key !== 'name') {
                if (data[key] === null) {
                  delete detector[key];
                } else {
                  detector[key] = data[key];
                }
              }
            });
          }
        }
        break;

      case 'deleteDetector':
        if (this.data.detector) {
          const detectorIndex = this.data.detector.findIndex(d => d.name === data.name);
          if (detectorIndex !== -1) {
            this.data.detector.splice(detectorIndex, 1);
          }
        }
        break;

      case 'proposeUnit':
        await this.applyProposeUnit(data);
        break;

      case 'updateUnit':
        await this.applyUpdateUnit(data);
        break;

      default:
        logger.warn('未知の変更アクション', { action });
        break;
    }
  }

  // Unit専用処理メソッド
  async applyProposeUnit(data) {
    try {
      // Unit セクション存在チェック
      if (this.data.unit) {
        throw new DataError('unit セクションは既に存在します', 'UNIT_ALREADY_EXISTS');
      }
      
      // 4つのキー完全性チェック
      this.validateUnitOperation('proposeUnit', data);
      
      // Unit セクション作成
      this.data.unit = {
        length: data.length,
        angle: data.angle,
        density: data.density,
        radioactivity: data.radioactivity
      };
      
      logger.info('unit セクションを作成しました', this.data.unit);
      
    } catch (error) {
      logger.error('proposeUnit適用エラー', { data, error: error.message });
      throw error;
    }
  }
  
  async applyUpdateUnit(data) {
    try {
      // Unit セクション存在チェック
      if (!this.data.unit) {
        throw new DataError('unit セクションが存在しません', 'UNIT_NOT_FOUND');
      }
      
      // データ完全性チェック
      this.validateUnitOperation('updateUnit', data);
      
      // Unit セクション更新（4つのキー全て更新）
      this.data.unit = {
        length: data.length,
        angle: data.angle,
        density: data.density,
        radioactivity: data.radioactivity
      };
      
      logger.info('unit セクションを更新しました', this.data.unit);
      
    } catch (error) {
      logger.error('updateUnit適用エラー', { data, error: error.message });
      throw error;
    }
  }
  
  validateUnitOperation(action, data) {
    // 4つのキー完全性チェック
    const requiredKeys = ['length', 'angle', 'density', 'radioactivity'];
    for (const key of requiredKeys) {
      if (!data[key]) {
        throw new DataError(`unit ${action}に必須キー ${key} がありません`, 'UNIT_KEY_MISSING');
      }
    }
    
    // 単位値妥当性チェック
    const validUnits = {
      length: ['m', 'cm', 'mm'],
      angle: ['radian', 'degree'],
      density: ['g/cm3'],
      radioactivity: ['Bq']
    };
    
    for (const [key, value] of Object.entries(data)) {
      if (validUnits[key] && !validUnits[key].includes(value)) {
        throw new DataError(
          `${key} の値 '${value}' は無効です。有効な値: ${validUnits[key].join(', ')}`,
          'UNIT_INVALID_VALUE'
        );
      }
    }
    
    return true;
  }

  // Unit自動検証・修復メソッド
  async validateAndRepairUnit() {
    try {
      let repairActions = [];
      
      // Unit セクション存在チェック
      if (!this.data.unit) {
        this.data.unit = this.createDefaultUnitSection();
        repairActions.push('未存在unit セクションをデフォルト値で作成');
        logger.warn('unit セクションが存在しないため、デフォルト値で作成しました');
      } else {
        // 不完全unit セクションの修復
        const repairedUnit = this.repairIncompleteUnitSection(this.data.unit);
        if (repairedUnit.repaired) {
          this.data.unit = repairedUnit.data;
          repairActions.push(...repairedUnit.actions);
        }
      }
      
      // 修復アクションのログ
      if (repairActions.length > 0) {
        this.logUnitRepairActions(repairActions);
        // 修復した場合はファイルを保存
        await this.saveData();
      }
      
    } catch (error) {
      logger.error('Unit自動修復に失敗しました', { error: error.message });
      // 修復失敗時はデフォルト値で強制作成
      this.data.unit = this.createDefaultUnitSection();
      logger.warn('Unit修復失敗のため、デフォルト値で強制作成しました');
    }
  }
  
  createDefaultUnitSection() {
    const defaultUnit = {
      length: 'cm',
      angle: 'radian',
      density: 'g/cm3',
      radioactivity: 'Bq'
    };
    
    logger.info('unit デフォルトセクションを作成しました', defaultUnit);
    return defaultUnit;
  }
  
  repairIncompleteUnitSection(unitData) {
    const defaultValues = {
      length: 'cm',
      angle: 'radian', 
      density: 'g/cm3',
      radioactivity: 'Bq'
    };
    
    const validUnits = {
      length: ['m', 'cm', 'mm'],
      angle: ['radian', 'degree'],
      density: ['g/cm3'],
      radioactivity: ['Bq']
    };
    
    let repaired = false;
    let actions = [];
    const repairedData = { ...unitData };
    
    // 不足キーの補完
    for (const [key, defaultValue] of Object.entries(defaultValues)) {
      if (!repairedData[key]) {
        repairedData[key] = defaultValue;
        repaired = true;
        actions.push(`不足キー ${key} をデフォルト値 '${defaultValue}' で補完`);
        logger.warn(`Unitキー ${key} が不足しているためデフォルト値で補完しました`, { key, defaultValue });
      }
    }
    
    // 無効値の修正
    for (const [key, value] of Object.entries(repairedData)) {
      if (validUnits[key] && !validUnits[key].includes(value)) {
        const defaultValue = defaultValues[key];
        repairedData[key] = defaultValue;
        repaired = true;
        actions.push(`無効値 ${key}:'${value}' をデフォルト値 '${defaultValue}' で置換`);
        logger.warn(`Unitキー ${key} の値 '${value}' が無効のためデフォルト値で置換しました`, { key, oldValue: value, newValue: defaultValue });
      }
    }
    
    return {
      repaired,
      data: repairedData,
      actions
    };
  }
  
  logUnitRepairActions(actions) {
    logger.info('Unitセクションの自動修復を実行しました', { 
      repairCount: actions.length,
      repairs: actions 
    });
    
    // 特別ログ: 重要な自動修復情報
    for (const action of actions) {
      logger.warn('Unit自動修復', { action });
    }
  }
}
