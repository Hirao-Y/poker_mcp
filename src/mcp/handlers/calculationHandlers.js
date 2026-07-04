// mcp/handlers/calculationHandlers.js
import { CalculationService } from '../../services/CalculationService.js';
import { ValidationError, CalculationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import { TASKS_DIR } from '../../utils/paths.js';
import { parseDoseSummary } from '../../utils/summaryParser.js';

export function createCalculationHandlers(taskManager) {
  const calculationService = new CalculationService();

  return {
    async executeCalculation(args) {
      try {
        // 引数検証
        if (!args.yaml_file) {
          throw new ValidationError('YAML file is required', 'yaml_file', args.yaml_file);
        }

        // パス解決:
        //   絶対パスが渡された場合 → そのまま使用（後方互換）
        //   ファイル名のみの場合  → TASKS_DIR と結合して絶対パスに解決
        const absolutePathPattern = /^([a-zA-Z]:[\\\/]|\/)/;
        const resolvedYamlFile = absolutePathPattern.test(args.yaml_file)
          ? args.yaml_file
          : path.join(TASKS_DIR, args.yaml_file);

        logger.info('yaml_file path resolved', {
          input: args.yaml_file,
          resolved: resolvedYamlFile,
          tasksDir: TASKS_DIR
        });

        // YAML拡張子チェック
        if (!resolvedYamlFile.match(/\.(yaml|yml)$/i)) {
          throw new ValidationError(
            'YAML file must have .yaml or .yml extension',
            'yaml_file',
            args.yaml_file
          );
        }

        // サマリーオプション検証
        const summaryOptions = args.summary_options || {};
        if (summaryOptions.show_source_data === false && 
            summaryOptions.show_total_dose === false) {
          logger.warn('Both show_source_data and show_total_dose are false, this may result in minimal output');
        }

        // 出力ファイルの自動パス解決
        const outputFiles = args.output_files || {};
        const resolvedOutputFiles = {};
        
        if (Object.keys(outputFiles).length > 0) {
          // 解決済みの入力YAMLファイルのディレクトリを取得
          const inputDir = path.dirname(resolvedYamlFile);
          
          // 各出力ファイルの絶対パス化
          for (const [key, fileName] of Object.entries(outputFiles)) {
            if (fileName) {
              if (!fileName.match(/\.(yaml|yml)$/i)) {
                throw new ValidationError(
                  `Output file ${key} must have .yaml or .yml extension`,
                  `output_files.${key}`,
                  fileName
                );
              }
              resolvedOutputFiles[key] = path.join(inputDir, fileName);
              logger.debug('Output file path resolved', {
                key, fileName, inputDir,
                resolvedPath: resolvedOutputFiles[key]
              });
            }
          }
        }

        logger.info('Starting radiation shielding calculation', {
          yamlFile: resolvedYamlFile,
          summaryOptions,
          outputFiles,
          resolvedOutputFiles
        });

        // 計算実行（統合検証付き）
        const result = await calculationService.executeWithValidation(
          resolvedYamlFile,
          summaryOptions,
          resolvedOutputFiles,
          undefined,
          taskManager.dataManager
        );

        // 事前検証で重大エラーが検出された場合の処理
        if (result.success === false && result.stage === 'pre_validation') {
          logger.error('Pre-calculation validation failed', {
            yamlFile: resolvedYamlFile,
            criticalErrors: result.criticalErrors
          });
          
          return {
            success: false,
            error: result.error,
            error_type: 'PRE_VALIDATION_FAILED',
            message: result.message,
            mcp_error_code: -32048, // Custom code for pre-validation failure
            validation_details: result.validationResult,
            critical_errors: result.criticalErrors,
            details: {
              category: 'pre_validation_error',
              recoverable: true,
              suggestions: [
                'Check daughter nuclide configurations',
                'Review material definitions',
                'Ensure all required parameters are properly defined',
                'Note: Geometry collisions will not block calculation'
              ]
            }
          };
        }

        // 出力ファイル検証（絶対パス化済みのパスを使用）
        const fileVerification = await calculationService.verifyOutputFiles(resolvedOutputFiles);

        // 成功レスポンス
        const response = {
          success: true,
          message: 'Radiation shielding calculation completed successfully',
          calculation: {
            input_file: resolvedYamlFile,
            execution_time_ms: result.executionTime,
            timestamp: result.summary.timestamp,
            options: result.summary.options
          },
          validation: {
            pre_calculation_performed: result.preValidation?.performed || false,
            pre_calculation_passed: result.preValidation?.passed || false,
            details: result.preValidation?.details || 'No pre-validation performed'
          },
          outputs: {
            console: {
              stdout: result.outputs.stdout ? 'Available (see details)' : 'Empty',
              stderr: result.outputs.stderr ? 'Available (see details)' : 'Empty',
              stdout_length: result.outputs.stdout.length,
              stderr_length: result.outputs.stderr.length
            },
            files: fileVerification
          },
          details: {
            stdout: result.outputs.stdout,
            stderr: result.outputs.stderr,
            summary_options_applied: result.summary.options,
            poker_cui_command: 'poker_cui executed successfully'
          }
        };

        // 出力ファイル生成の警告
        if (!fileVerification.allFilesGenerated) {
          response.warnings = ['Some output files were not generated. Check calculation logs for details.'];
        }

        // .summary(YAML) をパースして構造化 result_total を付加
        try {
          const summaryPath = (resolvedOutputFiles && resolvedOutputFiles.summary_file)
            ? resolvedOutputFiles.summary_file
            : resolvedYamlFile + '.summary';
          const parsed = parseDoseSummary(summaryPath);
          if (parsed) {
            response.result_total = parsed.result_total;
            response.dose_columns = parsed.columns;
            if (parsed.notes && parsed.notes.length) response.calculation_notes = parsed.notes;
            if (parsed.elapsed_time) response.calculation.elapsed_time = parsed.elapsed_time;
            if (parsed.warnings && parsed.warnings.length) {
              response.calculation_warnings = parsed.warnings;
            }
          }
        } catch (e) {
          logger.warn('summary 構造化パースをスキップ', { error: e.message });
        }

        logger.info('Calculation completed successfully', {
          yamlFile: resolvedYamlFile,
          executionTime: result.executionTime,
          outputFiles: Object.keys(fileVerification).filter(k => k !== 'allFilesGenerated')
        });

        return response;

      } catch (error) {
        logger.error('executeCalculation handler error', { 
          args, 
          error: error.message,
          errorType: error.constructor.name
        });

        // CalculationErrorの場合はMCPエラーコードも含める
        if (error instanceof CalculationError) {
          return {
            success: false,
            error: error.message,
            error_type: error.code,
            context: error.context,
            mcp_error_code: error.mcpErrorCode,
            details: {
              category: 'calculation_error',
              recoverable: this._isRecoverableError(error.code),
              suggestions: this._getErrorSuggestions(error.code, error.context)
            }
          };
        }

        // ValidationErrorの場合
        if (error instanceof ValidationError) {
          return {
            success: false,
            error: error.message,
            error_type: 'VALIDATION_ERROR',
            field: error.field,
            value: error.value,
            mcp_error_code: -32047, // Invalid calculation parameters
            details: {
              category: 'parameter_error',
              recoverable: true,
              suggestions: ['Check parameter format and values', 'Ensure all required parameters are provided']
            }
          };
        }

        // その他のエラー
        throw error;
      }
    },

    /**
     * エラーが回復可能かどうかを判定
     * @param {string} errorCode エラーコード
     * @returns {boolean} 回復可能かどうか
     */
    _isRecoverableError(errorCode) {
      const recoverableErrors = [
        'YAML_FILE_NOT_FOUND',
        'INVALID_YAML_SYNTAX', 
        'OUTPUT_DIRECTORY_ACCESS_DENIED',
        'INVALID_CALCULATION_PARAMETERS'
      ];
      return recoverableErrors.includes(errorCode);
    },

    /**
     * エラーに対する解決提案を生成
     * @param {string} errorCode エラーコード
     * @param {Object} context エラーコンテキスト
     * @returns {Array<string>} 解決提案のリスト
     */
    _getErrorSuggestions(errorCode, context = {}) {
      switch (errorCode) {
        case 'POKER_CUI_NOT_AVAILABLE':
          return [
            'Install poker_cui command',
            'Ensure poker_cui is in your system PATH',
            'Check if poker package is properly installed'
          ];

        case 'YAML_FILE_VALIDATION_FAILED':
          return [
            'Use absolute path format: C:\\path\\to\\file.yaml (Windows) or /path/to/file.yaml (Unix/Linux)',
            `Check if file exists: ${context.yamlFile}`,
            'Ensure file has proper read permissions',
            'Verify file has .yaml or .yml extension'
          ];

        case 'YAML_FILE_NOT_FOUND':
          return [
            `Check if file exists: ${context.yamlFile}`,
            'Use absolute path to the YAML file',
            'Ensure file has proper read permissions'
          ];

        case 'INVALID_YAML_SYNTAX':
          return [
            'Validate YAML syntax using a YAML validator',
            'Check for proper indentation and structure',
            'Ensure all required sections (body, zone, source) are present',
            context.syntaxError ? `Fix: ${context.syntaxError}` : 'Review YAML format'
          ];

        case 'OUTPUT_DIRECTORY_ACCESS_DENIED':
          return [
            'Check write permissions on output directory',
            'Create output directory if it does not exist',
            'Use absolute paths for output files'
          ];

        case 'CALCULATION_TIMEOUT':
          return [
            'Simplify the calculation model to reduce computation time',
            'Increase timeout value if calculation is expected to take longer',
            'Check system resources (CPU, memory)'
          ];

        case 'CALCULATION_EXECUTION_FAILED':
          return [
            'Review calculation input parameters',
            'Check YAML file for physics validity',
            'Examine poker_cui output for specific error messages',
            context.stderr ? 'Check stderr output for detailed error information' : 'Review calculation setup'
          ];

        default:
          return [
            'Review input parameters',
            'Check system requirements',
            'Consult documentation for troubleshooting'
          ];
      }
    }
  };
}
