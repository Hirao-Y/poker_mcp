// utils/paths.js - 実行時データの格納先を一元管理
//
// 優先順位:
//   1. 環境変数 POKER_MCP_HOME が設定されていれば、その値を使用
//   2. 未設定なら os.homedir()/.poker-mcp/ をデフォルトとする
//
// claude_desktop_config.json での設定例:
//   "env": { "POKER_MCP_HOME": "C:\\Users\\yoshi\\poker_mcp_workspace" }
//
import path from 'path';
import os from 'os';

export const BASE_DIR = process.env.POKER_MCP_HOME
  ?? path.join(os.homedir(), '.poker-mcp');

export const LOGS_DIR   = path.join(BASE_DIR, 'logs');
export const TASKS_DIR  = path.join(BASE_DIR, 'tasks');
export const BACKUPS_DIR = path.join(BASE_DIR, 'backups');
export const DATA_DIR   = path.join(BASE_DIR, 'data');

export const YAML_FILE    = path.join(TASKS_DIR,  'poker.yaml');
export const PENDING_FILE = path.join(TASKS_DIR,  'pending_changes.json');
export const NDX_FILE     = path.join(DATA_DIR,   'ICRP-07.NDX');
export const USER_CONFIG  = path.join(BASE_DIR,   'config.json');
