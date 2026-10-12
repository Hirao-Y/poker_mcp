// services/JobManager.js - 計算の非同期実行（ジョブ）の管理
//
// 方針
//  - 計算そのものは同期の executeCalculation と同じ CalculationService.executeCalculation
//    を呼ぶ。計算の中身を二通りに持たない。
//  - 投入した時点の入力（YAML と .paths）をジョブ専用フォルダにコピーし、それで計算する。
//    投入後に作業中の YAML を編集しても、実行中・待機中のジョブには混ざらない。
//  - 出力もジョブ専用フォルダに書く。作業フォルダの poker.yaml.summary 等は上書きしない。
//  - ジョブの状態は job.json に保存する。サーバを再起動しても消えない。
//    実行中に再起動した場合、その計算プロセスは失われているので failed にする。
//    待機中だったものは再び並べる（入力は既にコピー済みなので、そのまま実行できる）。
//  - 終わったジョブは retentionDays を過ぎたら削除する。

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { CalculationService } from './CalculationService.js';

export const TERMINAL_STATUSES = new Set(['succeeded', 'failed']);

export class JobManager {
  constructor({ jobsDir, concurrency = 1, retentionDays = 7, timeoutMs = 24 * 3600 * 1000, calculationService } = {}) {
    if (!jobsDir) throw new Error('JobManager: jobsDir is required');
    this.jobsDir = jobsDir;
    this.concurrency = concurrency;
    this.retentionDays = retentionDays;
    this.timeoutMs = timeoutMs;
    this.calculationService = calculationService || new CalculationService();
    this.jobs = new Map();       // id -> job
    this.queue = [];             // 待機中のジョブ ID（投入順）
    this.running = new Set();    // 実行中のジョブ ID
    this.waiters = new Map();    // id -> [resolve]（テスト・内部用の完了待ち）
  }

  async init() {
    await fsp.mkdir(this.jobsDir, { recursive: true });
    const entries = await fsp.readdir(this.jobsDir, { withFileTypes: true });
    const requeue = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const file = path.join(this.jobsDir, e.name, 'job.json');
      let job;
      try {
        job = JSON.parse(await fsp.readFile(file, 'utf8'));
      } catch {
        continue; // 作成途中で落ちたフォルダなど。触らない
      }
      if (job.status === 'running') {
        job.status = 'failed';
        job.finished_at = new Date().toISOString();
        job.error = {
          message: '計算の実行中にサーバが再起動したため、計算は完了していません。投入し直してください。',
          code: 'INTERRUPTED_BY_RESTART'
        };
        await this._save(job);
      } else if (job.status === 'queued') {
        requeue.push(job);
      }
      this.jobs.set(job.id, job);
    }
    requeue.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
    for (const job of requeue) this.queue.push(job.id);
    await this.cleanup();
    logger.info('JobManager 初期化', {
      jobsDir: this.jobsDir, jobs: this.jobs.size, requeued: requeue.length,
      concurrency: this.concurrency, retentionDays: this.retentionDays
    });
    this._pump();
  }

  /** 保存期間を過ぎた、終わったジョブを削除する */
  async cleanup(now = Date.now()) {
    const limit = this.retentionDays * 24 * 3600 * 1000;
    for (const job of [...this.jobs.values()]) {
      if (!TERMINAL_STATUSES.has(job.status) || !job.finished_at) continue;
      if (now - Date.parse(job.finished_at) <= limit) continue;
      try {
        await fsp.rm(this._dir(job.id), { recursive: true, force: true });
        this.jobs.delete(job.id);
        logger.info('期限切れのジョブを削除', { id: job.id });
      } catch (e) {
        logger.warn('ジョブの削除に失敗', { id: job.id, error: e.message });
      }
    }
  }

  /**
   * 計算を投入する。入力をジョブ専用フォルダへコピーしてから待ち行列に並べる。
   * @param {Object} p
   * @param {string} p.yamlFile    入力 YAML（絶対パス）
   * @param {string|null} p.pathInput  .paths（絶対パス）または null
   * @param {Object} p.summaryOptions
   * @param {Object} p.outputFiles  { summary_file?, dose_file? }（ファイル名のみ）
   */
  async submit({ yamlFile, pathInput = null, summaryOptions = {}, outputFiles = {} }) {
    const id = this._newId();
    const dir = this._dir(id);
    await fsp.mkdir(dir, { recursive: true });

    const yamlName = path.basename(yamlFile);
    const jobYaml = path.join(dir, yamlName);
    await fsp.copyFile(yamlFile, jobYaml);

    let jobPaths = null;
    if (pathInput) {
      jobPaths = path.join(dir, path.basename(pathInput));
      await fsp.copyFile(pathInput, jobPaths);
    }

    const job = {
      id,
      status: 'queued',
      submitted_at: new Date().toISOString(),
      started_at: null,
      finished_at: null,
      input: {
        yaml_source: yamlFile,
        yaml_file: jobYaml,
        yaml_sha256: await sha256(jobYaml),
        path_input_source: pathInput,
        path_input: jobPaths,
        path_input_sha256: jobPaths ? await sha256(jobPaths) : null
      },
      summary_options: summaryOptions,
      outputs: {
        summary_file: path.join(dir, outputFiles.summary_file || `${yamlName}.summary`),
        dose_file: path.join(dir, outputFiles.dose_file || `${yamlName}.dose`)
      },
      timeout_ms: this.timeoutMs,
      execution_time_ms: null,
      error: null
    };

    await this._save(job);
    this.jobs.set(id, job);
    this.queue.push(id);
    logger.info('ジョブを受け付けました', { id, yaml: yamlFile, pathInput });
    this._pump();
    return job;
  }

  get(id) {
    return this.jobs.get(id) || null;
  }

  /** 新しい順に返す */
  list(limit = 20) {
    return [...this.jobs.values()]
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
      .slice(0, limit);
  }

  /** 待機中なら 1 始まりの順番、それ以外は null */
  queuePosition(id) {
    const i = this.queue.indexOf(id);
    return i < 0 ? null : i + 1;
  }

  /** ジョブが終わるまで待つ（テストと内部用） */
  waitFor(id, timeoutMs = 600000) {
    const job = this.get(id);
    if (!job) return Promise.reject(new Error(`job not found: ${id}`));
    if (TERMINAL_STATUSES.has(job.status)) return Promise.resolve(job);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for job ${id}`)), timeoutMs);
      const list = this.waiters.get(id) || [];
      list.push((j) => { clearTimeout(t); resolve(j); });
      this.waiters.set(id, list);
    });
  }

  readOutput(id, name) {
    const file = path.join(this._dir(id), name);
    try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
  }

  // ---------------------------------------------------------------- 内部

  _pump() {
    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const id = this.queue.shift();
      this._run(id).catch((e) => logger.error('ジョブ実行の内部エラー', { id, error: e.message }));
    }
  }

  async _run(id) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.running.add(id);
    job.status = 'running';
    job.started_at = new Date().toISOString();
    await this._save(job);
    logger.info('ジョブ開始', { id });

    try {
      const r = await this.calculationService.executeCalculation(
        job.input.yaml_file,
        job.summary_options,
        job.outputs,
        job.timeout_ms,
        job.input.path_input
      );
      await fsp.writeFile(path.join(this._dir(id), 'stdout.txt'), r.outputs?.stdout || '', 'utf8');
      await fsp.writeFile(path.join(this._dir(id), 'stderr.txt'), r.outputs?.stderr || '', 'utf8');
      job.status = 'succeeded';
      job.execution_time_ms = r.executionTime ?? null;
    } catch (e) {
      const ctx = e.context || {};
      job.status = 'failed';
      job.error = {
        message: e.message,
        code: e.code || null,
        exit_code: ctx.exitCode ?? null,
        stderr: ctx.stderr || null,
        stdout: ctx.stdout || null
      };
      if (ctx.stderr) await fsp.writeFile(path.join(this._dir(id), 'stderr.txt'), ctx.stderr, 'utf8').catch(() => {});
      logger.warn('ジョブ失敗', { id, error: e.message });
    } finally {
      job.finished_at = new Date().toISOString();
      await this._save(job).catch((e) => logger.error('job.json の保存に失敗', { id, error: e.message }));
      this.running.delete(id);
      logger.info('ジョブ終了', { id, status: job.status });
      for (const resolve of this.waiters.get(id) || []) resolve(job);
      this.waiters.delete(id);
      this._pump();
      this.cleanup().catch(() => {});
    }
  }

  _dir(id) {
    return path.join(this.jobsDir, id);
  }

  _newId() {
    // 例: 20261013-053012-a1b2c3（UTC）。並べると投入順になる
    const s = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    return `${s}-${crypto.randomBytes(3).toString('hex')}`;
  }

  async _save(job) {
    const file = path.join(this._dir(job.id), 'job.json');
    const tmp = `${file}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(job, null, 2), 'utf8');
    await fsp.rename(tmp, file);
  }
}

async function sha256(file) {
  const buf = await fsp.readFile(file);
  return crypto.createHash('sha256').update(buf).digest('hex');
}
