// utils/paths.js - 実行時データの格納先を一元管理
//
// 優先順位:
//   1. 環境変数 POKER_MCP_HOME が設定されていれば、その値を使用
//   2. 未設定なら os.homedir()/.poker-mcp/ をデフォルトとする
//
// claude_desktop_config.json での設定例:
//   "env": {
//     "POKER_MCP_HOME": "C:\\Users\\yoshi\\poker_mcp_workspace",
//     "POKER_INSTALL_PATH": "C:\\Poker"
//   }
//
import path from 'path';
import os from 'os';

export const BASE_DIR = process.env.POKER_MCP_HOME
  ?? path.join(os.homedir(), '.poker-mcp');

export const LOGS_DIR   = path.join(BASE_DIR, 'logs');
export const TASKS_DIR  = path.join(BASE_DIR, 'tasks');
export const BACKUPS_DIR = path.join(BASE_DIR, 'backups');

// POKER 本体のインストール先。核データ・材料カタログの正本はここの LIB 配下にある。
export const POKER_INSTALL_DIR = process.env.POKER_INSTALL_PATH ?? 'C:/Poker';
export const POKER_LIB_DIR = path.join(POKER_INSTALL_DIR, 'LIB');

export const YAML_FILE    = path.join(TASKS_DIR,  'poker.yaml');
export const PENDING_FILE = path.join(TASKS_DIR,  'pending_changes.json');
export const USER_CONFIG  = path.join(BASE_DIR,   'config.json');

// 核種データベース（ICRP-07）
//
// v1.4.0 変更: POKER_MCP_HOME/data/ へのコピーを廃止し、LIB を直接参照する。
// 旧実装は初回起動時に LIB からコピーを作り、以後「存在すればスキップ」していたため、
// POKER をバージョンアップして LIB の核データが更新されても、古いコピーを
// 読み続ける状態になっていた（静かに古い値を使う）。
// lib_material.dat を読む MaterialCatalog は元々 LIB 直接参照であり、流儀も揃う。
export const NDX_FILE = path.join(POKER_LIB_DIR, 'ICRP-07.NDX');

// 旧構成の互換フォールバック先（POKER_MCP_HOME/data/ICRP-07.NDX）
// LIB に見つからない場合のみ使用する。新規に作成することはない。
export const LEGACY_DATA_DIR = path.join(BASE_DIR, 'data');
export const LEGACY_NDX_FILE = path.join(LEGACY_DATA_DIR, 'ICRP-07.NDX');
