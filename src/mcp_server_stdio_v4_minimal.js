#!/usr/bin/env node
// mcp_server_stdio_v4_minimal.js - MCP専用最小版（stdout汚染防止）
import { PokerMcpServer } from './mcp/server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // console出力は一切なし（MCPではstdout汚染禁止）
    const server = new PokerMcpServer();
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Error starting server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// エラーハンドリング（console出力なし）
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason, promise });
  process.exit(1);
});

main().catch((error) => {
  logger.error('Main function error', { error: error.message });
  process.exit(1);
});
