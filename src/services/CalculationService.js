// services/CalculationService.js
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { CalculationError } from '../utils/errors.js';

/**
 * 放射線遮蔽計算実行サービス
 * poker_cuiコマンドとの連携を担当
 */
export class CalculationService {
  constructor() {
    this.pokercuiCommand = 'poker_cui';
    this.defaultTimeout = 300000; // 5分
  }

  /**
   * poker_cuiコマンドの利用可能性をチェック
   * @returns {Promise<boolean>} コマンドが利用可能かどうか
   */
  async checkPokerCuiAvailability() {
    return new Promise((resolve) => {
      const child = spawn(this.pokercuiCommand, ['--version'], { 
        stdio: 'pipe',
        shell: true 
      });
      
      let hasOutput = false;
      
      child.stdout.on('data', (data) => {
        hasOutput = true;
        logger.debug('poker_cui version check output', { output: data.toString() });
      });
      
      child.stderr.on('data', (data) => {
        hasOutput = true;
        logger.debug('poker_cui version check stderr', { error: data.toString() });
      });
      
      child.on('close', (code) => {
        // コードが0でなくても、出力があればコマンドが存在する
        resolve(hasOutput || code === 0);
      });
      
      child.on('error', (error) => {
        logger.debug('poker_cui availability check failed', { error: error.message });
        resolve(false);
      });
      
      // 3秒でタイムアウト
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 3000);
    });
  }

  /**
   * YAMLファイルパスが絶対パス形式かどうかを検証
   * @param {string} yamlFile YAMLファイルパス
   * @returns {boolean} 絶対パス形式かどうか
   */
  validateAbsolutePath(yamlFile) {
    // 新しい絶対パス対応パターン（マニフェストと同じ）
    const pattern = /^([a-zA-Z]:[\\\/]|\/)/;
    return pattern.test(yamlFile);
  }

  /**
   * YAMLファイルの完全検証（絶対パス + 存在 + 読み取り可能性）
   * @param {string} yamlFile YAMLファイルパス
   * @returns {Promise<{valid: boolean, error?: string}>} 検証結果
   */
  async validateYamlFile(yamlFile) {
    // 1. 絶対パス形式の検証
    if (!this.validateAbsolutePath(yamlFile)) {
      return {
        valid: false,
        error: 'YAMLファイルは絶対パスで指定してください。例: C:\\path\\to\\file.yaml または /path/to/file.yaml'
      };
    }

    // 2. ファイル拡張子の検証
    const extPattern = /\.(yaml|yml)$/i;
    if (!extPattern.test(yamlFile)) {
      return {
        valid: false,
        error: 'YAMLファイルは .yaml または .yml 拡張子を持つ必要があります'
      };
    }

    // 3. ファイル存在確認
    try {
      const stats = await fs.stat(yamlFile);
      if (!stats.isFile()) {
        return {
          valid: false,
          error: '指定されたパスはファイルではありません'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `指定されたファイルが存在しません: ${yamlFile}`
      };
    }

    // 4. ファイルアクセス権限確認
    try {
      await fs.access(yamlFile, fs.constants.R_OK);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `ファイルへの読み取り権限がありません: ${yamlFile}`
      };
    }
  }

  /**
   * YAMLファイルの存在と読み取り可能性をチェック（後方互換用）
   * @param {string} yamlFile YAMLファイルパス
   * @returns {Promise<boolean>} ファイルが存在し読み取り可能かどうか
   */
  async checkYamlFileExistence(yamlFile) {
    const validation = await this.validateYamlFile(yamlFile);
    return validation.valid;
  }

  /**
   * YAML構文の基本チェック
   * @param {string} yamlFile YAMLファイルパス
   * @returns {Promise<{valid: boolean, error?: string}>} 構文チェック結果
   */
  async validateYamlSyntax(yamlFile) {
    try {
      const content = await fs.readFile(yamlFile, 'utf8');
      
      // 基本的な構文チェック（簡易版）
      const lines = content.split('\n');
      let indentLevel = 0;
      let hasBody = false;
      let hasZone = false;
      let hasSource = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '' || line.startsWith('#')) continue;
        
        // セクション存在チェック
        if (line === 'body:') hasBody = true;
        if (line === 'zone:') hasZone = true;
        if (line === 'source:') hasSource = true;
        
        // 基本的なYAML構文チェック
        if (line.includes(':') && !line.startsWith('-')) {
          const colonIndex = line.indexOf(':');
          const key = line.substring(0, colonIndex).trim();
          if (key.includes(' ') && !key.startsWith('"') && !key.startsWith("'")) {
            return {
              valid: false,
              error: `Line ${i + 1}: Invalid key format '${key}' - keys with spaces must be quoted`
            };
          }
        }
      }
      
      // 必須セクションチェック
      if (!hasBody) {
        return { valid: false, error: 'Missing required section: body' };
      }
      if (!hasZone) {
        return { valid: false, error: 'Missing required section: zone' };
      }
      if (!hasSource) {
        return { valid: false, error: 'Missing required section: source' };
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `YAML syntax error: ${error.message}` 
      };
    }
  }

  /**
   * サマリーオプションの検証と正規化
   * @param {Object} summaryOptions サマリーオプション
   * @returns {Object} 正規化されたサマリーオプション
   */
  validateAndNormalizeSummaryOptions(summaryOptions = {}) {
    const normalized = {
      show_parameters: summaryOptions.show_parameters || false,
      show_source_data: summaryOptions.show_source_data !== false, // デフォルトtrue
      show_total_dose: summaryOptions.show_total_dose !== false    // デフォルトtrue
    };
    
    // 少なくとも一つはtrueでなければならない
    if (!normalized.show_source_data && !normalized.show_total_dose) {
      logger.warn('Both show_source_data and show_total_dose are false, forcing show_total_dose to true');
      normalized.show_total_dose = true;
    }
    
    return normalized;
  }

  /**
   * 出力ディレクトリの作成と書き込み権限チェック
   * @param {Object} outputFiles 出力ファイル設定
   * @returns {Promise<boolean>} ディレクトリアクセス可能かどうか
   */
  async ensureOutputDirectories(outputFiles = {}) {
    const filePaths = Object.values(outputFiles).filter(Boolean);
    
    for (const filePath of filePaths) {
      const dir = path.dirname(filePath);
      try {
        await fs.mkdir(dir, { recursive: true });
        // 書き込み権限をテスト
        const testFile = path.join(dir, '.write_test');
        await fs.writeFile(testFile, '');
        await fs.unlink(testFile);
      } catch (error) {
        logger.error('Output directory access failed', { dir, error: error.message });
        return false;
      }
    }
    
    return true;
  }

  /**
   * poker_cui計算を実行
   * @param {string} yamlFile 入力YAMLファイルパス
   * @param {Object} summaryOptions サマリーオプション
   * @param {Object} outputFiles 出力ファイル設定
   * @param {number} timeout タイムアウト時間（ミリ秒）
   * @returns {Promise<Object>} 計算結果
   */
  async executeCalculation(yamlFile, summaryOptions = {}, outputFiles = {}, timeout = this.defaultTimeout) {
    // 前処理: 各種検証
    logger.info('Starting calculation validation', { yamlFile, summaryOptions, outputFiles });
    
    // 1. poker_cui利用可能性チェック
    const isPokerCuiAvailable = await this.checkPokerCuiAvailability();
    if (!isPokerCuiAvailable) {
      throw new CalculationError(
        'poker_cui command is not available',
        'POKER_CUI_NOT_AVAILABLE',
        { yamlFile },
        -32042
      );
    }

    // 2. YAMLファイル完全検証（絶対パス + 存在 + アクセス権限）
    const yamlValidation = await this.validateYamlFile(yamlFile);
    if (!yamlValidation.valid) {
      throw new CalculationError(
        yamlValidation.error,
        'YAML_FILE_VALIDATION_FAILED',
        { 
          yamlFile,
          expectedFormat: '絶対パス形式（例: C:\\path\\to\\file.yaml または /path/to/file.yaml）'
        },
        -32040
      );
    }

    // 3. YAML構文チェック
    const syntaxCheck = await this.validateYamlSyntax(yamlFile);
    if (!syntaxCheck.valid) {
      throw new CalculationError(
        `Invalid YAML syntax: ${syntaxCheck.error}`,
        'INVALID_YAML_SYNTAX',
        { yamlFile, syntaxError: syntaxCheck.error },
        -32041
      );
    }

    // 4. サマリーオプション正規化
    const normalizedSummary = this.validateAndNormalizeSummaryOptions(summaryOptions);

    // 5. 出力ディレクトリ確保
    const directoriesOk = await this.ensureOutputDirectories(outputFiles);
    if (!directoriesOk) {
      throw new CalculationError(
        'Output directory access denied or creation failed',
        'OUTPUT_DIRECTORY_ACCESS_DENIED',
        { outputFiles },
        -32046
      );
    }

    // コマンドライン引数の構築
    const absoluteYamlPath = path.resolve(yamlFile);
    const args = [absoluteYamlPath];
    
    // サマリーオプション
    if (normalizedSummary.show_parameters) args.push('-p');
    if (normalizedSummary.show_source_data) args.push('-s');  
    if (normalizedSummary.show_total_dose) args.push('-t');
    
    // 出力ファイル指定
    if (outputFiles.summary_file) {
      args.push('-o', outputFiles.summary_file);
    }
    if (outputFiles.dose_file) {
      args.push('-d', outputFiles.dose_file);
    }

    logger.info('Executing poker_cui calculation', { 
      command: this.pokercuiCommand,
      args,
      timeout 
    });

    // poker_cui実行
    return await this._executePokercui(args, timeout, {
      yamlFile,
      summaryOptions: normalizedSummary,
      outputFiles
    });
  }

  /**
   * poker_cuiプロセスの実際の実行
   * @param {Array<string>} args コマンドライン引数
   * @param {number} timeout タイムアウト時間
   * @param {Object} context 実行コンテキスト
   * @returns {Promise<Object>} 実行結果
   */
  async _executePokercui(args, timeout, context) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let isTimedOut = false;
      let isCompleted = false;
      
      const child = spawn(this.pokercuiCommand, args, {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      // データ収集
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        logger.debug('poker_cui stdout chunk', { chunk: chunk.substring(0, 200) });
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug('poker_cui stderr chunk', { chunk: chunk.substring(0, 200) });
      });

      // プロセス終了処理
      child.on('close', (code, signal) => {
        if (isCompleted) return;
        isCompleted = true;

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        logger.info('poker_cui execution completed', {
          code,
          signal,
          executionTime,
          stdoutLength: stdout.length,
          stderrLength: stderr.length
        });

        if (isTimedOut) {
          reject(new CalculationError(
            `Calculation timed out after ${timeout}ms`,
            'CALCULATION_TIMEOUT',
            { ...context, executionTime, timeout },
            -32044
          ));
          return;
        }

        if (code !== 0) {
          reject(new CalculationError(
            `poker_cui execution failed with exit code ${code}`,
            'CALCULATION_EXECUTION_FAILED',
            { 
              ...context, 
              exitCode: code, 
              signal,
              stdout: stdout.substring(0, 1000),
              stderr: stderr.substring(0, 1000),
              executionTime
            },
            -32043
          ));
          return;
        }

        // 成功時の結果処理
        resolve({
          success: true,
          executionTime,
          outputs: {
            stdout: stdout.trim(),
            stderr: stderr.trim()
          },
          files: this._identifyOutputFiles(context.outputFiles),
          summary: {
            message: 'Calculation completed successfully',
            yamlFile: context.yamlFile,
            options: context.summaryOptions,
            timestamp: new Date().toISOString()
          }
        });
      });

      // エラー処理
      child.on('error', (error) => {
        if (isCompleted) return;
        isCompleted = true;

        logger.error('poker_cui process error', { error: error.message, context });
        
        if (error.code === 'ENOENT') {
          reject(new CalculationError(
            'poker_cui command not found',
            'POKER_CUI_NOT_AVAILABLE',
            { ...context, systemError: error.message },
            -32042
          ));
        } else {
          reject(new CalculationError(
            `Process execution error: ${error.message}`,
            'CALCULATION_EXECUTION_FAILED',
            { ...context, systemError: error.message },
            -32043
          ));
        }
      });

      // タイムアウト処理
      const timeoutId = setTimeout(() => {
        if (isCompleted) return;
        
        isTimedOut = true;
        logger.warn('poker_cui calculation timeout, killing process', { 
          timeout, 
          context 
        });
        
        child.kill('SIGKILL');
      }, timeout);

      // プロセス完了時にタイマーをクリア
      child.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * 出力ファイルの存在確認と情報取得
   * @param {Object} outputFiles 出力ファイル設定（絶対パス）
   * @returns {Object} ファイル情報
   */
  _identifyOutputFiles(outputFiles = {}) {
    const fileInfo = {};
    
    for (const [key, filePath] of Object.entries(outputFiles)) {
      if (filePath) {
        fileInfo[key] = {
          path: path.basename(filePath),  // ファイル名のみを返す（レスポンス用）
          fullPath: filePath,            // 内部用の完全パス
          exists: false,  // 後で実際にチェックする場合は async にする
          name: path.basename(filePath),
          directory: path.dirname(filePath)
        };
      }
    }
    
    return fileInfo;
  }

  /**
   * 計算結果ファイルの後処理検証
   * @param {Object} outputFiles 出力ファイル設定
   * @returns {Promise<Object>} ファイル検証結果
   */
  async verifyOutputFiles(outputFiles = {}) {
    const verification = {
      summary_file: null,
      dose_file: null,
      allFilesGenerated: true
    };

    for (const [key, filePath] of Object.entries(outputFiles)) {
      if (filePath) {
        try {
          const stats = await fs.stat(filePath);
          verification[key] = {
            exists: true,
            size: stats.size,
            modified: stats.mtime,
            path: filePath
          };
        } catch (error) {
          verification[key] = {
            exists: false,
            error: error.message,
            path: filePath
          };
          verification.allFilesGenerated = false;
        }
      }
    }

    return verification;
  }

  /**
   * 計算実行（統合検証付き）
   * @param {string} yamlFile - 入力YAMLファイル
   * @param {Object} summaryOptions - サマリーオプション
   * @param {Object} outputFiles - 出力ファイル設定
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @param {Object} dataManager - データマネージャーインスタンス（オプション）
   * @returns {Promise<Object>} 実行結果
   */
  async executeWithValidation(yamlFile, summaryOptions = {}, outputFiles = {}, timeout = this.defaultTimeout, dataManager = null) {
    try {
      logger.info('統合検証付き計算実行を開始', { yamlFile });

      // 事前検証の実行
      if (dataManager) {
        logger.info('計算実行前の統合検証を実行中...');
        
        const validationResult = await dataManager.performPreCalculationValidation();
        
        if (validationResult.mustResolve) {
          logger.error('計算実行前に解決が必要な重大エラーを検出', {
            criticalErrorCount: validationResult.criticalErrors.length
          });
          
          return {
            success: false,
            stage: 'pre_validation',
            error: 'CRITICAL_VALIDATION_ERRORS',
            message: '計算実行前に解決が必要な重大エラーがあります',
            validationResult,
            criticalErrors: validationResult.criticalErrors
          };
        }

        // 子孫核種検出時の処理
        if (validationResult.daughterNuclideCheck?.totalAdditions > 0 && 
            !dataManager.daughterNuclideCheckDisabled) {
          logger.info('子孫核種が検出されました - 計算を中断してユーザー確認を要求');
          
          return {
            success: false,
            stage: 'requires_confirmation',
            status: 'requires_confirmation',
            calculation_blocked: true,
            error: 'DAUGHTER_NUCLIDE_CONFIRMATION_REQUIRED',
            message: '子孫核種が検出されました。poker_confirmDaughterNuclidesで確認してください',
            daughter_nuclide_suggestions: this.formatDaughterNuclideSuggestions(validationResult.daughterNuclideCheck),
            total_additions: validationResult.daughterNuclideCheck.totalAdditions,
            available_actions: [
              'poker_confirmDaughterNuclides action="check" - 詳細確認',
              'poker_confirmDaughterNuclides action="confirm" - 承認して適用',
              'poker_confirmDaughterNuclides action="confirm_with_modifications" - 修正して適用',
              'poker_confirmDaughterNuclides action="reject" - 拒否'
            ],
            next_step: 'poker_confirmDaughterNuclidesを実行後、再度poker_executeCalculationを実行してください'
          };
        }

        if (!validationResult.overall) {
          logger.warn('検証で警告が検出されましたが、計算を継続します', {
            warningCount: validationResult.warnings.length
          });
        }

        // 検証結果をログに記録
        logger.info('事前検証完了', {
          overall: validationResult.overall,
          collisionCheck: validationResult.collisionCheck?.hasCollisions || false,
          daughterNuclideIssues: validationResult.daughterNuclideCheck?.totalAdditions || 0,
          enhancedValidationPassed: validationResult.enhancedValidation?.overall || false
        });
      }

      // 通常の計算実行
      const calculationResult = await this.executeCalculation(yamlFile, summaryOptions, outputFiles, timeout);

      // 結果に検証情報を追加
      if (dataManager) {
        calculationResult.preValidation = {
          performed: true,
          passed: true,
          details: 'Pre-calculation validation completed successfully'
        };
      }

      return calculationResult;

    } catch (error) {
      logger.error('統合検証付き計算実行でエラー', { error: error.message, yamlFile });
      throw new CalculationError(`統合計算実行エラー: ${error.message}`, 'INTEGRATED_EXECUTION_ERROR');
    }
  }

  /**
   * 子孫核種提案のフォーマット
   * @param {Object} daughterNuclideCheck - 子孫核種チェック結果
   * @returns {Array} フォーマットされた提案
   */
  formatDaughterNuclideSuggestions(daughterNuclideCheck) {
    const suggestions = [];
    
    if (daughterNuclideCheck.results) {
      for (const sourceResult of daughterNuclideCheck.results) {
        const sourceData = {
          source_name: sourceResult.sourceName,
          detected_daughters: []
        };
        
        if (sourceResult.result && sourceResult.result.additions) {
          for (const addition of sourceResult.result.additions) {
            sourceData.detected_daughters.push({
              nuclide: addition.nuclide,
              radioactivity: addition.radioactivity,
              parent_nuclide: addition.parent,
              branching_ratio: addition.branchingRatio,
              equilibrium_type: addition.equilibriumType,
              calculation_basis: `${addition.parent} → ${addition.nuclide} (分岐比: ${(addition.branchingRatio * 100).toFixed(2)}%)`
            });
          }
        }
        
        if (sourceData.detected_daughters.length > 0) {
          suggestions.push(sourceData);
        }
      }
    }
    
    return suggestions;
  }
}
