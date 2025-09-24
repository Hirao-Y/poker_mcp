// services/DataManager.js
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { logger } from '../utils/logger.js';
import { DataError } from '../utils/errors.js';
import CollisionDetector from '../utils/CollisionDetector.js';
import NuclideManager from '../utils/NuclideManager.js';
import EnhancedValidator from '../utils/EnhancedValidator.js';

export class SafeDataManager {
  constructor(yamlFile, pendingFile) {
    this.yamlFile = yamlFile;
    this.pendingFile = pendingFile;
    this.backupDir = 'backups';
    this.maxBackups = 10;
    this.data = null;
    this.pendingChanges = [];
    
    // 干渉検出器の初期化
    this.collisionDetector = new CollisionDetector({
      overlap_tolerance: 1e-6,
      contact_tolerance: 1e-9,
      max_auto_corrections: 10
    });
    
    // 核種管理の初期化
    this.nuclideManager = new NuclideManager({
      contribution_threshold: 0.05,
      user_confirmation: true,
      database_file: 'data/ICRP-07.NDX'
    });
    
    // 強化検証の初期化
    this.enhancedValidator = new EnhancedValidator();
    
    // 子孫核種確認状態管理
    this.pendingDaughterNuclideCheck = null;
    this.daughterNuclideCheckDisabled = false;
  }

  async initialize() {
    try {
      // 必要なフォルダをすべて作成
      await fs.mkdir(this.backupDir, { recursive: true });  // backups
      await fs.mkdir('logs', { recursive: true });          // logs  
      await fs.mkdir('tasks', { recursive: true });         // tasks

      // 初期ファイル配置（既存ファイルがない場合のみ）
      await this.ensureInitialFiles();

      // データ読み込み
      await this.loadData();
      await this.loadPendingChanges();
      
      // NuclideManagerのデータベース読み込み
      await this.nuclideManager.loadNuclideDatabase();
      
      logger.info('データマネージャーを初期化しました');
    } catch (error) {
      logger.error('データマネージャーの初期化に失敗しました', { error: error.message });
      throw new DataError(`初期化に失敗: ${error.message}`, 'INITIALIZATION');
    }
  }

  // 新規メソッド: 初期ファイルの確実な配置
  async ensureInitialFiles() {
    try {
      // poker.yamlの初期配置
      await this.ensureYamlFile();
      
      // pending_changes.jsonの初期配置  
      await this.ensurePendingFile();
      
    } catch (error) {
      logger.error('初期ファイル配置エラー', { error: error.message });
      throw error;
    }
  }

  async ensureYamlFile() {
    try {
      // ファイル存在チェック
      await fs.access(this.yamlFile);
      logger.info('YAMLファイルは既に存在します', { file: this.yamlFile });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // ファイルが存在しない場合のみ作成
        const initialData = this.createInitialYamlData();
        await fs.writeFile(this.yamlFile, yaml.dump(initialData, { flowLevel: 1 }));
        logger.info('初期YAMLファイルを作成しました', { file: this.yamlFile });
      } else {
        throw error;
      }
    }
  }

  async ensurePendingFile() {
    try {
      // ファイル存在チェック
      await fs.access(this.pendingFile);
      logger.info('保留変更ファイルは既に存在します', { file: this.pendingFile });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // ファイルが存在しない場合のみ作成
        await fs.writeFile(this.pendingFile, JSON.stringify([], null, 2));
        logger.info('初期保留変更ファイルを作成しました', { file: this.pendingFile });
      } else {
        throw error;
      }
    }
  }

  createInitialYamlData() {
    return {
      "unit": {
        "length": "cm",
        "angle": "radian", 
        "density": "g/cm3",
        "radioactivity": "Bq"
      },
      "body": [],
      "zone": [
        {
          "body_name": "ATMOSPHERE",
          "material": "VOID"
        }
      ],
      "transform": [],
      "buildup_factor": [],
      "source": [],
      "detector": []
    };
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.yamlFile, 'utf8');
      this.data = yaml.load(data);
      
      // Unit セクション自動検証・修復
      await this.validateAndRepairUnit();
      
      logger.info('YAMLデータを読み込みました', { file: this.yamlFile });
    } catch (error) {
      // ensureInitialFiles()で初期ファイルが既に配置されているため、
      // 通常はENOENTエラーは発生しないはず
      logger.error('YAMLファイルの読み込みに失敗しました', { error: error.message });
      throw new DataError(`YAML読み込みに失敗: ${error.message}`, 'LOAD_DATA');
    }
  }

  async loadPendingChanges() {
    try {
      const data = await fs.readFile(this.pendingFile, 'utf8');
      this.pendingChanges = JSON.parse(data || '[]');
      logger.info('保留変更を読み込みました', { count: this.pendingChanges.length });
    } catch (error) {
      // ensureInitialFiles()で初期ファイルが既に配置されているため、
      // 通常はENOENTエラーは発生しないはず
      logger.error('保留変更の読み込みに失敗しました', { error: error.message });
      throw new DataError(`保留変更読み込みに失敗: ${error.message}`, 'LOAD_PENDING');
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
      quotingType: "'",
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

  // pending changesからbody情報を取得する新規メソッド
  getPendingBodies() {
    const pending = this.pendingChanges.filter(change => 
      change.action === 'add_body' || change.action === 'update_body'
    );
    
    return pending.map(change => change.data.body).filter(Boolean);
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
          
          // cutoff_rateの追加（必須パラメータ）
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
            show_path_trace: data.show_path_trace  // 必須パラメータのためデフォルト値適用削除
          };
          
          // gridが存在し、かつ空でない場合のみ追加（点検出器は除外）
          if (data.grid && Array.isArray(data.grid) && data.grid.length > 0) {
            detectorObject.grid = data.grid;
          }
          
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
                } else if (key === 'grid') {
                  // gridの特別処理：空配列や空の場合は削除
                  if (Array.isArray(data[key]) && data[key].length > 0) {
                    detector[key] = data[key];
                  } else {
                    delete detector[key];
                  }
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
      
      // 部分更新用データ検証
      this.validateUnitOperation('updateUnit', data);
      
      // Unit セクション部分更新（既存値を保持してマージ）
      this.data.unit = {
        ...this.data.unit,
        ...data
      };
      
      logger.info('unit セクションを更新しました', this.data.unit);
      
    } catch (error) {
      logger.error('updateUnit適用エラー', { data, error: error.message });
      throw error;
    }
  }
  
  validateUnitOperation(action, data) {
    if (action === 'proposeUnit') {
      // proposeUnitは4キー完全性必須
      const requiredKeys = ['length', 'angle', 'density', 'radioactivity'];
      for (const key of requiredKeys) {
        if (!data[key]) {
          throw new DataError(`unit ${action}に必須キー ${key} がありません`, 'UNIT_KEY_MISSING');
        }
      }
    } else if (action === 'updateUnit') {
      // updateUnitは部分更新許可、提供されたキーのみ検証
      if (Object.keys(data).length === 0) {
        throw new DataError('updateUnitには少なくとも1つのキーが必要です', 'UNIT_NO_UPDATES');
      }
    }
    
    // 単位値妥当性チェック（提供されたキーのみ）
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

  /**
   * 立体干渉チェック (マニフェスト enhanced_features.geometry_validation.collision_detection)
   * @param {string} timing - チェックタイミング ('realtime_basic', 'batch_detailed', 'pre_calculation')
   * @returns {Object} 干渉チェック結果
   */
  async performCollisionCheck(timing = 'batch_detailed') {
    try {
      logger.info(`立体干渉チェックを開始 (${timing})`);
      
      if (!this.data || !this.data.body) {
        return { hasCollisions: false, message: '立体データが存在しません' };
      }

      const bodies = this.data.body;
      const zones = this.data.zone || []; // ゾーン情報を取得
      let result;

      switch (timing) {
        case 'realtime_basic':
          // リアルタイム: 基本的な重複のみ
          result = this.collisionDetector.detectCollisions(bodies, zones);
          break;
          
        case 'batch_detailed':
          // バッチ: 詳細な干渉解析
          result = this.collisionDetector.detectCollisions(bodies, zones);
          if (result.hasCollisions) {
            result.resolutions = this.collisionDetector.generateResolutions(result.collisions, bodies);
          }
          break;
          
        case 'pre_calculation':
          // 計算前: 完全な検証
          result = this.collisionDetector.detectCollisions(bodies, zones);
          if (result.hasCollisions) {
            result.resolutions = this.collisionDetector.generateResolutions(result.collisions, bodies);
            result.mustResolve = true;
          }
          break;
          
        default:
          throw new Error(`無効なタイミング指定: ${timing}`);
      }

      if (result.hasCollisions) {
        logger.warn('立体干渉を検出', {
          collisionCount: result.collisions.length,
          contactCount: result.contacts.length,
          timing
        });
      } else {
        logger.info('立体干渉は検出されませんでした', { timing });
      }

      return result;
      
    } catch (error) {
      logger.error('立体干渉チェック中にエラーが発生', { error: error.message, timing });
      throw new DataError(`干渉チェックエラー: ${error.message}`, 'COLLISION_CHECK');
    }
  }

  /**
   * 干渉解決の実行
   * @param {Array} resolutions - 解決策配列
   * @param {boolean} userConfirmation - ユーザー確認済みかどうか
   * @returns {Object} 解決結果
   */
  async applyCollisionResolutions(resolutions, userConfirmation = false) {
    try {
      logger.info('干渉解決を開始', { resolutionCount: resolutions.length, userConfirmation });
      
      const appliedActions = [];
      
      for (const resolution of resolutions) {
        switch (resolution.type) {
          case 'delete':
            if (userConfirmation) {
              await this.removeBody(resolution.target);
              appliedActions.push({
                type: 'body_deleted',
                name: resolution.target,
                reason: resolution.reason
              });
            }
            break;
            
          case 'boolean_operation':
            // CMB立体として新しい立体を作成
            const cmbName = `resolved_${Date.now()}`;
            await this.addCombinationBody(cmbName, resolution.expression);
            appliedActions.push({
              type: 'cmb_created',
              name: cmbName,
              expression: resolution.expression
            });
            break;
        }
      }

      logger.info('干渉解決完了', { appliedCount: appliedActions.length });
      return { success: true, appliedActions };
      
    } catch (error) {
      logger.error('干渉解決中にエラー', { error: error.message });
      throw new DataError(`干渉解決エラー: ${error.message}`, 'RESOLUTION_ERROR');
    }
  }

  /**
   * CMB立体の追加 (内部用)
   */
  async addCombinationBody(name, expression) {
    const cmbBody = {
      name,
      type: 'CMB',
      expression
    };
    
    if (!this.data.body) {
      this.data.body = [];
    }
    
    this.data.body.push(cmbBody);
    logger.info('CMB立体を追加', { name, expression });
  }

  /**
   * 立体の削除 (内部用)
   */
  async removeBody(bodyName) {
    if (!this.data.body) {
      return;
    }
    
    const index = this.data.body.findIndex(body => body.name === bodyName);
    if (index !== -1) {
      this.data.body.splice(index, 1);
      logger.info('立体を削除', { bodyName });
    }
  }

  /**
   * 子孫核種自動補間チェック (マニフェスト enhanced_features.nuclide_management.daughter_auto_completion)
   * @param {Array} sources - 線源配列
   * @returns {Object} 補間結果
   */
  async performDaughterNuclideCheck(sources = null) {
    try {
      logger.info('子孫核種自動補間チェックを開始');
      
      // 線源データの取得
      const sourcesToCheck = sources || (this.data && this.data.source) || [];
      
      if (sourcesToCheck.length === 0) {
        return { 
          success: true, 
          message: '線源データが存在しません',
          additionsCount: 0 
        };
      }

      const allResults = [];
      let totalAdditions = 0;

      // 各線源の inventory をチェック
      for (const source of sourcesToCheck) {
        if (!source.inventory || source.inventory.length === 0) {
          continue;
        }

        logger.info(`線源 ${source.name} の核種をチェック中`, { 
          inventoryCount: source.inventory.length 
        });

        const result = await this.nuclideManager.autoCompleteDaughters(source.inventory);
        
        if (result.additionsCount > 0) {
          allResults.push({
            sourceName: source.name,
            result: result
          });
          totalAdditions += result.additionsCount;
        }
      }

      logger.info('子孫核種チェック完了', { 
        checkedSources: sourcesToCheck.length,
        totalAdditions: totalAdditions
      });

      return {
        success: true,
        checkedSources: sourcesToCheck.length,
        sourcesWithAdditions: allResults.length,
        totalAdditions,
        results: allResults,
        requiresConfirmation: totalAdditions > 0
      };

    } catch (error) {
      logger.error('子孫核種チェック中にエラー', { error: error.message });
      throw new DataError(`子孫核種チェックエラー: ${error.message}`, 'DAUGHTER_NUCLIDE_CHECK');
    }
  }

  /**
   * 子孫核種の自動追加実行
   * @deprecated updateSourceを使用したhandleConfirmに置き換えられました
   * @param {Array} additionResults - 追加結果配列
   * @param {boolean} userConfirmation - ユーザー確認済み
   * @returns {Object} 実行結果
   */
  async applyDaughterNuclideAdditions(additionResults, userConfirmation = false) {
    logger.warn('applyDaughterNuclideAdditions は非推奨です。updateSourceベースの実装を使用してください');
    try {
      logger.info('子孫核種の自動追加を開始', { 
        resultCount: additionResults.length,
        userConfirmation 
      });

      if (!userConfirmation) {
        return { 
          success: false, 
          message: 'ユーザー確認が必要です',
          requiresConfirmation: true 
        };
      }

      let totalAdded = 0;
      const appliedActions = [];

      for (const sourceResult of additionResults) {
        const source = this.data.source.find(s => s.name === sourceResult.sourceName);
        
        if (!source) {
          logger.warn('線源が見つかりません', { sourceName: sourceResult.sourceName });
          continue;
        }

        for (const addition of sourceResult.result.additions) {
          // 重複チェック
          const duplicate = source.inventory.find(inv => 
            inv.nuclide === addition.nuclide
          );
          
          if (!duplicate) {
            source.inventory.push({
              nuclide: addition.nuclide,
              radioactivity: addition.radioactivity
            });
            
            appliedActions.push({
              type: 'daughter_added',
              sourceName: source.name,
              nuclide: addition.nuclide,
              radioactivity: addition.radioactivity,
              parent: addition.parent,
              branchingRatio: addition.branchingRatio
            });
            
            totalAdded++;
            
            logger.info('子孫核種を追加', {
              source: source.name,
              nuclide: addition.nuclide,
              parent: addition.parent,
              activity: addition.radioactivity
            });
          }
        }
      }

      logger.info('子孫核種追加完了', { totalAdded });
      
      const result = {
        success: true,
        totalAdded,
        appliedActions
      };
      
      // 非推奨警告を追加
      if (totalAdded > 0) {
        result.warning = 'この方法で追加された子孫核種は永続化されません。poker_applyChanges の実行前にサーバーを再起動しないでください。';
        result.recommendation = 'updateSourceベースの子孫核種追加機能の使用を検討してください。';
      }
      
      return result;

    } catch (error) {
      logger.error('子孫核種追加中にエラー', { error: error.message });
      throw new DataError(`子孫核種追加エラー: ${error.message}`, 'DAUGHTER_ADDITION_ERROR');
    }
  }

  /**
   * 核種データベース統計の取得
   * @returns {Object} データベース統計
   */
  async getNuclideDatabaseStats() {
    try {
      if (this.nuclideManager.nuclideData.size === 0) {
        await this.nuclideManager.loadNuclideDatabase();
      }
      
      return this.nuclideManager.getDatabaseStats();
    } catch (error) {
      logger.error('核種データベース統計取得エラー', { error: error.message });
      throw new DataError(`データベース統計エラー: ${error.message}`, 'DATABASE_STATS_ERROR');
    }
  }

  /**
   * 強化された検証の実行 (マニフェスト enhanced_features.enhanced_validation)
   * @param {string} validationType - 検証タイプ ('full', 'physics', 'units', 'materials')
   * @returns {Object} 検証結果
   */
  async performEnhancedValidation(validationType = 'full') {
    try {
      logger.info(`強化検証を開始 (${validationType})`);
      
      if (!this.data) {
        return { 
          success: false, 
          message: 'データが存在しません',
          overall: false
        };
      }

      let validationResult;

      switch (validationType) {
        case 'full':
          validationResult = await this.enhancedValidator.performComprehensiveValidation(this.data);
          break;
        case 'physics':
          validationResult = await this.runSpecificValidation('physics_consistency');
          break;
        case 'units':
          validationResult = await this.runSpecificValidation('units_compatibility');
          break;
        case 'materials':
          validationResult = await this.runSpecificValidation('material_property');
          break;
        default:
          throw new Error(`無効な検証タイプ: ${validationType}`);
      }

      if (validationResult.overall) {
        logger.info('強化検証成功', {
          type: validationType,
          warningCount: validationResult.warnings.length
        });
      } else {
        logger.warn('強化検証で問題を検出', {
          type: validationType,
          errorCount: validationResult.errors.length
        });
      }

      return {
        success: true,
        validationType,
        ...validationResult
      };

    } catch (error) {
      logger.error('強化検証中にエラー', { error: error.message });
      throw new DataError(`強化検証エラー: ${error.message}`, 'ENHANCED_VALIDATION_ERROR');
    }
  }

  /**
   * 計算実行前の統合検証
   * @returns {Object} 統合検証結果
   */
  async performPreCalculationValidation() {
    try {
      logger.info('計算実行前の統合検証を開始');
      
      const validationResults = {
        overall: true,
        collisionCheck: null,
        daughterNuclideCheck: null,
        enhancedValidation: null,
        criticalErrors: [],
        warnings: [],
        mustResolve: false
      };

      // 1. 立体干渉チェック
      try {
        validationResults.collisionCheck = await this.performCollisionCheck('pre_calculation');
        if (validationResults.collisionCheck.hasCollisions) {
          validationResults.overall = false;
          validationResults.mustResolve = true;
          validationResults.criticalErrors.push({
            type: 'collision_detected',
            message: '立体干渉が検出されました'
          });
        }
      } catch (error) {
        validationResults.warnings.push({
          type: 'collision_check_failed',
          message: '立体干渉チェックに失敗'
        });
      }

      // 2. 子孫核種チェック
      try {
        validationResults.daughterNuclideCheck = await this.performDaughterNuclideCheck();
        if (validationResults.daughterNuclideCheck.totalAdditions > 0) {
          validationResults.warnings.push({
            type: 'missing_daughter_nuclides',
            count: validationResults.daughterNuclideCheck.totalAdditions,
            message: `${validationResults.daughterNuclideCheck.totalAdditions}個の重要な子孫核種が未設定`
          });
        }
      } catch (error) {
        validationResults.warnings.push({
          type: 'daughter_check_failed',
          message: '子孫核種チェックに失敗'
        });
      }

      // 3. 強化検証
      try {
        validationResults.enhancedValidation = await this.performEnhancedValidation('full');
        if (!validationResults.enhancedValidation.overall) {
          validationResults.overall = false;
          
          const criticalErrors = validationResults.enhancedValidation.errors.filter(err => 
            err.type === 'density_out_of_range' || 
            err.type === 'detector_too_close' ||
            err.type === 'missing_unit_section'
          );
          
          if (criticalErrors.length > 0) {
            validationResults.mustResolve = true;
            validationResults.criticalErrors.push(...criticalErrors);
          }
        }
      } catch (error) {
        validationResults.warnings.push({
          type: 'enhanced_validation_failed',
          message: '強化検証に失敗'
        });
      }

      logger.info('統合検証完了', {
        overall: validationResults.overall,
        mustResolve: validationResults.mustResolve,
        criticalErrorCount: validationResults.criticalErrors.length
      });

      return validationResults;

    } catch (error) {
      logger.error('統合検証中にエラー', { error: error.message });
      throw new DataError(`統合検証エラー: ${error.message}`, 'INTEGRATED_VALIDATION_ERROR');
    }
  }

  /**
   * 特定カテゴリの検証実行
   */
  async runSpecificValidation(category) {
    const rules = this.enhancedValidator.validationRules.get(category);
    if (!rules) {
      throw new Error(`未知の検証カテゴリ: ${category}`);
    }

    const result = await this.enhancedValidator.runCategoryValidation(category, rules, this.data);
    
    return {
      overall: result.passed,
      categories: { [category]: result },
      errors: result.errors,
      warnings: result.warnings,
      recommendations: result.recommendations
    };
  }

  /**
   * YAML初期化メソッド - poker_resetYaml用
   * ATMOSPHEREゾーンの保護と段階的リセットを実装
   */
  async resetToInitialState(options = {}) {
    const {
      backupComment = 'Manual reset before initialization',
      preserveUnits = true,
      resetLevel = 'standard',
      atmosphereMaterial = 'VOID',
      atmosphereDensity = undefined,
      force = false
    } = options;

    try {
      logger.info('YAML初期化を開始', { resetLevel, preserveUnits, atmosphereMaterial });

      // 1. 現在の単位設定を保存（必要に応じて）
      let currentUnits = null;
      if (preserveUnits && this.data && this.data.unit) {
        currentUnits = { ...this.data.unit };
        logger.info('既存の単位設定を保持します', currentUnits);
      }

      // 2. 自動バックアップ作成
      await this.createBackup(backupComment);
      logger.info('リセット前のバックアップを作成しました');

      // 3. 保留中の変更をクリア
      this.pendingChanges = [];
      await fs.writeFile(this.pendingFile, JSON.stringify([], null, 2));
      logger.info('保留中の変更をクリアしました');

      // 4. リセットレベルに応じた初期データ作成
      const initialData = await this.createResetData(resetLevel, currentUnits, atmosphereMaterial, atmosphereDensity);

      // 5. ATMOSPHEREゾーンの必須検証
      await this.validateAtmosphereZone(initialData);

      // 6. YAMLファイルを初期状態で上書き
      const yaml = await import('js-yaml');
      await fs.writeFile(this.yamlFile, yaml.dump(initialData, { flowLevel: 1 }));

      // 7. データを再読み込み
      await this.loadData();

      // 8. リセット後の検証
      await this.validateAfterReset();

      const result = {
        success: true,
        message: 'YAMLファイルが初期状態にリセットされました',
        backup_created: true,
        reset_level: resetLevel,
        units_preserved: preserveUnits,
        atmosphere_zone: {
          material: atmosphereMaterial,
          density: atmosphereDensity,
          body_name: 'ATMOSPHERE'
        }
      };

      logger.info('YAML初期化が完了しました', result);
      return result;

    } catch (error) {
      logger.error('YAML初期化に失敗しました', { error: error.message });
      throw new DataError(`YAML初期化失敗: ${error.message}`, 'RESET_FAILED');
    }
  }

  /**
   * リセットレベルに応じたデータ作成
   */
  async createResetData(resetLevel, currentUnits, atmosphereMaterial, atmosphereDensity) {
    // 基本的な初期データを作成
    let initialData = this.createInitialYamlData();

    switch (resetLevel) {
      case 'minimal':
        // 単位・変換・ビルドアップ係数・ゾーンを保持
        if (currentUnits) {
          initialData.unit = currentUnits;
        }
        if (this.data && this.data.transform) {
          initialData.transform = this.data.transform;
        }
        if (this.data && this.data.buildup_factor) {
          initialData.buildup_factor = this.data.buildup_factor;
        }
        if (this.data && this.data.zone) {
          // ATMOSPHEREを含む全ゾーンを保持
          initialData.zone = this.data.zone;
        }
        break;

      case 'standard':
        // 単位とATMOSPHEREゾーンのみ保持
        if (currentUnits) {
          initialData.unit = currentUnits;
        }
        // ATMOSPHEREゾーンは後で設定
        break;

      case 'complete':
        // 完全初期化（デフォルトの初期データを使用）
        break;

      default:
        throw new DataError(`無効なリセットレベル: ${resetLevel}`, 'INVALID_RESET_LEVEL');
    }

    // ATMOSPHEREゾーンの設定
    await this.configureAtmosphereZone(initialData, atmosphereMaterial, atmosphereDensity);

    return initialData;
  }

  /**
   * ATMOSPHEREゾーンの設定
   */
  async configureAtmosphereZone(data, material, density) {
    // ゾーンセクションが配列でない場合は初期化
    if (!data.zone || !Array.isArray(data.zone)) {
      data.zone = [];
    }

    // ATMOSPHEREゾーンの設定
    const atmosphereZone = {
      body_name: "ATMOSPHERE",
      material: material
    };

    // VOID以外の材料の場合は密度を設定
    if (material !== 'VOID') {
      if (density === undefined) {
        throw new DataError(`材料 ${material} には密度の指定が必要です`, 'ATMOSPHERE_DENSITY_REQUIRED');
      }
      atmosphereZone.density = density;
    } else {
      // VOID材料の場合、密度が指定されていれば警告して削除
      if (density !== undefined) {
        logger.warn('VOID材料では密度指定を無視します', { density });
      }
    }

    // 既存のATMOSPHEREゾーンを削除して新しいものを追加
    data.zone = data.zone.filter(z => z.body_name !== 'ATMOSPHERE');
    data.zone.push(atmosphereZone);
    logger.info('ATMOSPHEREゾーンを設定しました', atmosphereZone);
  }

  /**
   * ATMOSPHEREゾーンの必須検証
   */
  async validateAtmosphereZone(data) {
    if (!data.zone || !Array.isArray(data.zone)) {
      throw new DataError('ゾーンセクションが存在しないか配列ではありません', 'ATMOSPHERE_VALIDATION');
    }

    const atmosphereZone = data.zone.find(z => z.body_name === 'ATMOSPHERE');
    if (!atmosphereZone) {
      throw new DataError('ATMOSPHEREゾーンが存在しません', 'ATMOSPHERE_MISSING');
    }

    if (!atmosphereZone.material) {
      throw new DataError('ATMOSPHEREゾーンに材料が指定されていません', 'ATMOSPHERE_NO_MATERIAL');
    }

    // VOID材料の場合、密度指定は禁止
    if (atmosphereZone.material === 'VOID' && atmosphereZone.density !== undefined) {
      logger.warn('VOID材料では密度指定を削除します');
      delete atmosphereZone.density;
    }

    // VOID以外の材料で密度が未指定の場合はエラー
    if (atmosphereZone.material !== 'VOID' && atmosphereZone.density === undefined) {
      throw new DataError(`材料 ${atmosphereZone.material} には密度の指定が必要です`, 'ATMOSPHERE_DENSITY_MISSING');
    }

    logger.info('ATMOSPHEREゾーンの検証が完了しました', atmosphereZone);
    return true;
  }

  /**
   * リセット後の検証
   */
  async validateAfterReset() {
    try {
      // 基本的な構造検証
      if (!this.data.unit) {
        throw new DataError('単位セクションが存在しません', 'POST_RESET_VALIDATION');
      }

      if (!this.data.zone || !Array.isArray(this.data.zone)) {
        throw new DataError('ゾーンセクションが存在しないか配列ではありません', 'POST_RESET_VALIDATION');
      }

      const atmosphereZone = this.data.zone.find(z => z.body_name === 'ATMOSPHERE');
      if (!atmosphereZone) {
        throw new DataError('ATMOSPHEREゾーンが存在しません', 'POST_RESET_VALIDATION');
      }

      // 単位セクションの4キー検証
      const requiredUnitKeys = ['length', 'angle', 'density', 'radioactivity'];
      const missingKeys = requiredUnitKeys.filter(key => !this.data.unit[key]);
      if (missingKeys.length > 0) {
        throw new DataError(`単位セクションに不足キー: ${missingKeys.join(', ')}`, 'POST_RESET_VALIDATION');
      }

      logger.info('リセット後の検証が完了しました');
      return true;

    } catch (error) {
      logger.error('リセット後の検証に失敗', { error: error.message });
      throw new DataError(`リセット後検証失敗: ${error.message}`, 'POST_RESET_VALIDATION_FAILED');
    }
  }

  /**
   * 子孫核種チェック無効化の設定
   * @param {boolean} disabled - 無効化するかどうか
   */
  setDaughterNuclideCheckDisabled(disabled) {
    this.daughterNuclideCheckDisabled = disabled;
    logger.info('子孫核種チェック無効化設定', { disabled });
  }

  /**
   * 修正された子孫核種データを適用
   * @param {Array} modifications - 修正データ配列
   * @returns {Object} 適用結果
   */
  async applyModifiedDaughterNuclides(modifications) {
    try {
      logger.info('修正された子孫核種データの適用開始', { 
        modificationCount: modifications.length 
      });

      let appliedCount = 0;
      const appliedActions = [];

      for (const mod of modifications) {
        if (!mod.include) {
          continue; // 含めないものはスキップ
        }

        const source = this.data.source.find(s => s.name === mod.source_name);
        if (!source) {
          logger.warn('線源が見つかりません', { sourceName: mod.source_name });
          continue;
        }

        // 既存の核種をチェック
        const existingIndex = source.inventory.findIndex(inv => 
          this.nuclideManager.normalizeNuclideName(inv.nuclide) === 
          this.nuclideManager.normalizeNuclideName(mod.nuclide)
        );

        if (existingIndex >= 0) {
          // 既存の核種を更新
          source.inventory[existingIndex].radioactivity = mod.radioactivity;
          appliedActions.push({
            action: 'update',
            source: mod.source_name,
            nuclide: mod.nuclide,
            radioactivity: mod.radioactivity
          });
        } else {
          // 新しい核種を追加
          source.inventory.push({
            nuclide: mod.nuclide,
            radioactivity: mod.radioactivity
          });
          appliedActions.push({
            action: 'add',
            source: mod.source_name,
            nuclide: mod.nuclide,
            radioactivity: mod.radioactivity
          });
        }

        appliedCount++;
      }

      // データを保存
      await this.saveData();

      logger.info('修正された子孫核種データの適用完了', { 
        appliedCount,
        appliedActions: appliedActions.length
      });

      return {
        success: true,
        appliedCount,
        appliedActions,
        message: `${appliedCount}個の子孫核種を適用しました`
      };

    } catch (error) {
      logger.error('修正された子孫核種データの適用エラー', { error: error.message });
      throw new DataError(`修正子孫核種適用エラー: ${error.message}`, 'MODIFIED_DAUGHTER_APPLY');
    }
  }
}
