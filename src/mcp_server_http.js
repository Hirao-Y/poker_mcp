#!/usr/bin/env node
// mcp_server_http.js - MCP を HTTP（Streamable HTTP）で受ける版
//
// 使い方（この機械の中だけで試す）:
//   node src/mcp_server_http.js            → http://127.0.0.1:3939/mcp
//
// 外から使う（トンネルや別の機械から）ときは POKER_MCP_HTTP_TOKEN が必須。
// 設定は src/utils/httpConfig.js と docs/manuals/ADMIN_GUIDE.md を参照。
import { PokerMcpServer } from './mcp/server.js';
import { createHttpServer, MCP_PATH } from './mcp/httpServer.js';
import { resolveHttpConfig } from './utils/httpConfig.js';
import { logger } from './utils/logger.js';

const say = (msg) => process.stderr.write(`[poker-mcp-http] ${msg}\n`);

async function main() {
  const cfg = resolveHttpConfig();
  if (cfg.errors.length > 0) {
    for (const e of cfg.errors) say(`設定の誤り: ${e}`);
    process.exit(2);
  }
  for (const w of cfg.warnings) say(`注意: ${w}`);

  const pokerServer = new PokerMcpServer();
  await pokerServer.initialize();

  const httpServer = createHttpServer(pokerServer, cfg);
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(cfg.port, cfg.host, resolve);
  });

  const { port } = httpServer.address();
  const shownHost = cfg.host.includes(':') ? `[${cfg.host}]` : cfg.host;
  const auth = cfg.token ? 'トークン必須' : 'トークンなし（この機械の中だけ）';
  say(`listening on http://${shownHost}:${port}${MCP_PATH}  （${auth}）`);
  if (cfg.allowedHosts) say(`受け付ける Host: ${cfg.allowedHosts.join(', ')}`);
  logger.info('Poker MCP Server started on HTTP', {
    host: cfg.host, port, auth: Boolean(cfg.token), allowedHosts: cfg.allowedHosts
  });

  const shutdown = (sig) => {
    logger.info(`${sig}受信、HTTP サーバーを終了します`);
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  say(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  say(`Unhandled Rejection: ${reason?.message || reason}`);
  process.exit(1);
});

main().catch((error) => {
  logger.error('HTTP サーバー起動失敗', { error: error.message });
  say(`Fatal: ${error.message}`);
  process.exit(1);
});
