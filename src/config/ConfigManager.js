// src/config/ConfigManager.js
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { DataError } from '../utils/errors.js';

export class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = 'src/config/default.json';
    this.userConfigPath = 'config.json';
  }

  async load() {
    try {
      // デフォルト設定を読み込み
      const defaultConfig = await this.loadJsonFile(this.configPath);
      
      // ユーザー設定があれば読み込んでマージ
      let userConfig = {};
      try {
        userConfig = await this.loadJsonFile(this.userConfigPath);
        logger.info('ユーザー設定をロードしました', { path: this.userConfigPath });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          logger.warn('ユーザー設定の読み込みに失敗しました', { error: error.message });
        }
      }

      // 環境変数でオーバーライド
      this.config = this.mergeConfigs(defaultConfig, userConfig);
      this.applyEnvironmentOverrides();

      logger.info('設定を読み込みました', { 
        port: this.config.server.port,
        logLevel: this.config.logging.level 
      });

    } catch (error) {
      logger.error('設定の読み込みに失敗しました', { error: error.message });
      throw new DataError('設定の読み込みに失敗しました', 'CONFIG_LOAD');
    }
  }

  async loadJsonFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }
  mergeConfigs(defaultConfig, userConfig) {
    return this.deepMerge(defaultConfig, userConfig);
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  applyEnvironmentOverrides() {
    // 環境変数による設定オーバーライド
    if (process.env.PORT) {
      this.config.server.port = parseInt(process.env.PORT);
    }
    
    if (process.env.LOG_LEVEL) {
      this.config.logging.level = process.env.LOG_LEVEL;
    }
    
    if (process.env.MAX_BACKUPS) {
      this.config.data.maxBackups = parseInt(process.env.MAX_BACKUPS);
    }
  }

  get(path, defaultValue = undefined) {
    return this.getByPath(this.config, path, defaultValue);
  }

  getByPath(obj, path, defaultValue) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    
    return result;
  }

  // よく使う設定のゲッター
  getServerConfig() {
    return this.config.server;
  }

  getDataConfig() {
    return this.config.data;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getMaterialProperties() {
    return this.config.physics.materials;
  }
}

// シングルトンインスタンス
export const configManager = new ConfigManager();
