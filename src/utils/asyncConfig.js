// utils/asyncConfig.js - 非同期ジョブ（submitCalculation など）の設定
//
// 非同期ジョブは既定で無効。環境変数 POKER_MCP_ASYNC=1 のときだけ有効になり、
// ツール一覧に poker_submitCalculation / poker_getJobStatus / poker_getJobResult が
// 加わる。無効のときのツール一覧と動作は、非同期ジョブを持たない版と同じ。
//
//   POKER_MCP_ASYNC               1 / true / yes / on で有効（既定: 無効）
//   POKER_MCP_ASYNC_CONCURRENCY   同時に実行する計算の数（既定: 1）
//   POKER_MCP_JOB_RETENTION_DAYS  終わったジョブを残す日数（既定: 7）
//   POKER_MCP_JOB_TIMEOUT_MIN     1 件の計算の打ち切り時間 [分]（既定: 1440 = 24 時間）
//
// ジョブは POKER_MCP_HOME/jobs/<ジョブID>/ に置く。

import path from 'path';
import { BASE_DIR } from './paths.js';

export function isAsyncEnabled() {
  const v = String(process.env.POKER_MCP_ASYNC || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(v);
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAsyncConfig() {
  return {
    jobsDir: path.join(BASE_DIR, 'jobs'),
    concurrency: Math.max(1, Math.floor(positive(process.env.POKER_MCP_ASYNC_CONCURRENCY, 1))),
    retentionDays: positive(process.env.POKER_MCP_JOB_RETENTION_DAYS, 7),
    timeoutMs: positive(process.env.POKER_MCP_JOB_TIMEOUT_MIN, 1440) * 60 * 1000
  };
}
