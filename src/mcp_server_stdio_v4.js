#!/usr/bin/env node
// mcp_server_stdio_v4.js - MCP専用版（stdout汚染防止）
import path from 'path';
import { PokerMcpServer } from './mcp/server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // 環境変数から作業ディレクトリとファイルパスを取得
    const workDir = process.env.POKER_WORK_DIR || './';
    const tasksDir = path.resolve(workDir, process.env.POKER_TASKS_DIR || 'tasks');
    
    // ファイル名のみを環境変数から取得
    const yamlFileName = process.env.POKER_YAML_FILE || 'poker.yaml';
    const pendingFileName = process.env.POKER_PENDING_FILE || 'pending_changes.json';
    
    // tasksDir基準でパス生成
    const yamlFile = path.resolve(tasksDir, yamlFileName);
    const pendingFile = path.resolve(tasksDir, pendingFileName);
    
    logger.info('Poker MCP Server 起動', {
      workDir: path.resolve(workDir),
      tasksDir,
      yamlFile,
      pendingFile,
      environmentVariables: {
        POKER_WORK_DIR: process.env.POKER_WORK_DIR || '(default)',
        POKER_TASKS_DIR: process.env.POKER_TASKS_DIR || '(default)',
        POKER_YAML_FILE: process.env.POKER_YAML_FILE || '(default)',
        POKER_PENDING_FILE: process.env.POKER_PENDING_FILE || '(default)'
      }
    });
    
    const server = new PokerMcpServer(yamlFile, pendingFile);
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('サーバー起動失敗', { error: error.message });
    // console.errorは削除（stdout汚染防止）
    process.exit(1);
  }
}

// 未処理の例外とプロミス拒否のハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // console.errorは削除（stdout汚染防止）
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason, promise });
  // console.errorは削除（stdout汚染防止）
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  logger.info('SIGINT受信、サーバーを終了します');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM受信、サーバーを終了します');
  process.exit(0);
});

main().catch((error) => {
  logger.error('メイン関数エラー', { error: error.message });
  process.exit(1);
});
