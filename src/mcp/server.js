// mcp/server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { TaskManager } from '../services/TaskManager.js';
import { allTools } from './tools/index.js';
import { createAllHandlers } from './handlers/index.js';
import { safeExecute } from './middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { YAML_FILE, PENDING_FILE } from '../utils/paths.js';
import { isAsyncEnabled, getAsyncConfig } from '../utils/asyncConfig.js';
import { JobManager } from '../services/JobManager.js';
import { getGuiStatus } from '../utils/guiConfig.js';
import { readFileSync } from 'fs';

// initialize の serverInfo で返す版。クライアント（Claude Desktop 等）が
// 表示するのはこの値なので、package.json から読んで実際の版と揃える。
// 以前は '1.0.0' を直書きしていたため、どの版を入れても 1.0.0 と出ていた。
// package.json は npm の tarball に必ず含まれるので、公開後も読める。
export const PKG_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

export class PokerMcpServer {
  constructor(yamlFile = YAML_FILE, pendingFile = PENDING_FILE) {
    this.taskManager = new TaskManager(yamlFile, pendingFile);
    this.handlers = null;
    this.jobManager = null;
    this.server = null; // stdio 用（start() で作る）
  }

  async initialize() {
    try {
      // TaskManager初期化
      await this.taskManager.initialize();
      
      // 非同期ジョブ（POKER_MCP_ASYNC=1 のときだけ）
      if (isAsyncEnabled()) {
        this.jobManager = new JobManager(getAsyncConfig());
        await this.jobManager.init();
      }

      // POKER の GUI（poker_openGui）を使えるか
      const gui = getGuiStatus();
      logger.info(`poker_openGui: ${gui.enabled ? '有効' : '無効'}（${gui.reason}）`);

      // ハンドラー作成
      this.handlers = createAllHandlers(this.taskManager, {
        jobManager: this.jobManager,
        guiEnabled: gui.enabled
      });
      
      logger.info('PokerMcpServer初期化完了');
    } catch (error) {
      logger.error('PokerMcpServer初期化エラー', { error: error.message });
      throw error;
    }
  }

  /**
   * MCP のプロトコル処理（Server）を 1 つ作る。
   * 道具の処理（handlers）と TaskManager / JobManager は全体で 1 つを共有し、
   * Server は通信路ごとに作る。stdio は 1 つ、HTTP はリクエストごとに 1 つ。
   */
  createProtocolServer() {
    if (!this.handlers) {
      throw new Error('initialize() の前に createProtocolServer() は呼べません');
    }
    const server = new Server(
      { name: 'poker-mcp', version: PKG_VERSION },
      { capabilities: { tools: {} } }
    );

    // ツール一覧ハンドラー
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: allTools };
    });

    // ツール実行ハンドラー
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`MCP Tool実行: ${name}`, { args });

      // ハンドラー名をツール名から生成（プレフィックス除去）
      const handlerName = name.replace('poker_', '');

      const handler = this.handlers[handlerName];
      if (!handler) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      return await safeExecute(async () => handler(args), { tool: name })();
    });

    return server;
  }

  async start() {
    try {
      this.server = this.createProtocolServer();
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('Poker MCP Server started on stdio');
    } catch (error) {
      logger.error('MCPサーバー開始エラー', { error: error.message });
      throw error;
    }
  }
}
