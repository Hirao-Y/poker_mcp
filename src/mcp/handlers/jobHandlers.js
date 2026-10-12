// mcp/handlers/jobHandlers.js - 計算の非同期実行のハンドラ
import fs from 'fs';
import path from 'path';
import { ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { TASKS_DIR } from '../../utils/paths.js';
import { parseDoseSummary } from '../../utils/summaryParser.js';
import { TERMINAL_STATUSES } from '../../services/JobManager.js';

const ABSOLUTE = /^([a-zA-Z]:[\\\/]|\/)/;
const resolveTaskPath = (p) => (ABSOLUTE.test(p) ? p : path.join(TASKS_DIR, p));

export function createJobHandlers(taskManager, jobManager) {
  const statusView = (job) => {
    const now = Date.now();
    const start = job.started_at ? Date.parse(job.started_at) : null;
    const end = job.finished_at ? Date.parse(job.finished_at) : null;
    return {
      job_id: job.id,
      status: job.status,
      submitted_at: job.submitted_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      queue_position: jobManager.queuePosition(job.id),
      running_seconds: start ? Math.round(((end || now) - start) / 1000) : null,
      input_file: job.input.yaml_source,
      path_input: job.input.path_input_source,
      ...(job.status === 'failed' ? { error: job.error } : {})
    };
  };

  return {
    async submitCalculation(args) {
      if (!args.yaml_file) {
        throw new ValidationError('YAML file is required', 'yaml_file', args.yaml_file);
      }
      const yamlFile = resolveTaskPath(args.yaml_file);
      if (!/\.(yaml|yml)$/i.test(yamlFile)) {
        throw new ValidationError('YAML file must have .yaml or .yml extension', 'yaml_file', args.yaml_file);
      }
      if (!fs.existsSync(yamlFile)) {
        throw new ValidationError(`YAML file not found: ${yamlFile}`, 'yaml_file', args.yaml_file);
      }
      let pathInput = null;
      if (args.path_input) {
        pathInput = resolveTaskPath(args.path_input);
        if (!fs.existsSync(pathInput)) {
          throw new ValidationError(`path_input not found: ${pathInput}`, 'path_input', args.path_input);
        }
      }
      const outputFiles = args.output_files || {};
      for (const [key, name] of Object.entries(outputFiles)) {
        if (name && !/^[a-zA-Z0-9_\-\.]+\.(yaml|yml)$/.test(name)) {
          throw new ValidationError(`Output file ${key} must be a file name ending with .yaml or .yml`, `output_files.${key}`, name);
        }
      }

      // 同期の executeCalculation と同じ事前検証を、投入の時点で行う。
      // 重大エラー（立体干渉を除く）があれば受け付けない。
      if (taskManager?.dataManager) {
        const v = await taskManager.dataManager.performPreCalculationValidation();
        const critical = (v.criticalErrors || []).filter((e) => e.type !== 'collision_detected');
        if (critical.length > 0) {
          return {
            success: false,
            error: 'CRITICAL_VALIDATION_ERRORS',
            error_type: 'PRE_VALIDATION_FAILED',
            message: '計算実行前に解決が必要な重大エラーがあるため、ジョブを受け付けませんでした',
            critical_errors: critical
          };
        }
      }

      const job = await jobManager.submit({
        yamlFile,
        pathInput,
        summaryOptions: args.summary_options || {},
        outputFiles
      });

      return {
        success: true,
        message: '計算を受け付けました。poker_getJobStatus で進み具合を確認し、終わったら poker_getJobResult で結果を取得してください。',
        job_id: job.id,
        status: job.status,
        queue_position: jobManager.queuePosition(job.id),
        input: {
          yaml_file: yamlFile,
          yaml_sha256: job.input.yaml_sha256,
          path_input: pathInput
        }
      };
    },

    async getJobStatus(args = {}) {
      if (!args.job_id) {
        const jobs = jobManager.list(20).map(statusView);
        return {
          success: true,
          running: jobManager.running.size,
          queued: jobManager.queue.length,
          concurrency: jobManager.concurrency,
          jobs
        };
      }
      const job = jobManager.get(args.job_id);
      if (!job) {
        return { success: false, error: `ジョブが見つかりません: ${args.job_id}`, error_type: 'JOB_NOT_FOUND' };
      }
      return { success: true, ...statusView(job) };
    },

    async getJobResult(args) {
      const job = jobManager.get(args.job_id);
      if (!job) {
        return { success: false, error: `ジョブが見つかりません: ${args.job_id}`, error_type: 'JOB_NOT_FOUND' };
      }
      if (!TERMINAL_STATUSES.has(job.status)) {
        return {
          success: true,
          ready: false,
          ...statusView(job),
          message: 'まだ終わっていません。しばらくおいて poker_getJobStatus で確認してください。'
        };
      }
      if (job.status === 'failed') {
        return {
          success: false,
          ready: true,
          ...statusView(job),
          error: job.error?.message,
          error_type: job.error?.code || 'JOB_FAILED',
          details: job.error
        };
      }

      const files = {};
      for (const [key, p] of Object.entries(job.outputs)) {
        try {
          const st = fs.statSync(p);
          files[key] = { exists: true, size: st.size, path: p };
        } catch (e) {
          files[key] = { exists: false, path: p };
        }
      }
      const stdout = jobManager.readOutput(job.id, 'stdout.txt');
      const stderr = jobManager.readOutput(job.id, 'stderr.txt');

      const response = {
        success: true,
        ready: true,
        ...statusView(job),
        message: 'Radiation shielding calculation completed successfully',
        calculation: {
          input_file: job.input.yaml_source,
          snapshot_file: job.input.yaml_file,
          yaml_sha256: job.input.yaml_sha256,
          execution_time_ms: job.execution_time_ms,
          options: job.summary_options
        },
        outputs: {
          console: { stdout_length: stdout.length, stderr_length: stderr.length },
          files
        },
        details: { stdout, stderr }
      };

      try {
        const parsed = parseDoseSummary(job.outputs.summary_file);
        if (parsed) {
          response.result_total = parsed.result_total;
          response.dose_columns = parsed.columns;
          if (parsed.notes && parsed.notes.length) response.calculation_notes = parsed.notes;
          if (parsed.elapsed_time) response.calculation.elapsed_time = parsed.elapsed_time;
          if (parsed.warnings && parsed.warnings.length) response.calculation_warnings = parsed.warnings;
        }
      } catch (e) {
        logger.warn('summary 構造化パースをスキップ', { job: job.id, error: e.message });
      }
      return response;
    }
  };
}
