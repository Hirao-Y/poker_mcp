// utils/logger.js - MCP専用版（stdout汚染防止）
import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { LOGS_DIR } from './paths.js';

// ログディレクトリを起動時に確実に作成（相対パス問題を回避）
fs.mkdirSync(LOGS_DIR, { recursive: true });

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'combined.log') 
    })
    // Console transportは削除（MCPサーバーではstdout汚染禁止）
  ]
});

export { logger };
