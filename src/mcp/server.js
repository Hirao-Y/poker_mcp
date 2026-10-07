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
import { readFileSync } from 'fs';

// initialize の serverInfo で返す版。クライアント（Claude Desktop 等）が
// 表示するのはこの値なので、package.json から読んで実際の版と揃える。
// 以前は '1.0.0' を直書きしていたため、どの版を入れても 1.0.0 と出ていた。
// package.json は npm の tarball に必ず含まれるので、公開後も読める。
const PKG_VERSION = (() => {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

export class PokerMcpServer {
  constructor(yamlFile = YAML_FILE, pendingFile = PENDING_FILE) {
    this.server = new Server(
      {
        name: 'poker-mcp',
        version: PKG_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.taskManager = new TaskManager(yamlFile, pendingFile);
    this.handlers = null;
  }

  async initialize() {
    try {
      // TaskManager初期化
      await this.taskManager.initialize();
      
      // ハンドラー作成
      this.handlers = createAllHandlers(this.taskManager);
      
      // ツール一覧ハンドラー
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: allTools };
      });

      // ツール実行ハンドラー
      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
      
      logger.info('PokerMcpServer初期化完了');
    } catch (error) {
      logger.error('PokerMcpServer初期化エラー', { error: error.message });
      throw error;
    }
  }

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('Poker MCP Server started on stdio');
    } catch (error) {
      logger.error('MCPサーバー開始エラー', { error: error.message });
      throw error;
    }
  }
}
