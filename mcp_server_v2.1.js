// mcp_server_v2.1.js
console.log("改善版MCPサーバー v2.1 を開始します...");

import express from 'express';
import cors from 'cors';
import { TaskManager } from './src/services/TaskManager.js';
import { handleError } from './src/utils/errorHandler.js';
import { logger } from './src/utils/logger.js';
import { configManager } from './src/config/ConfigManager.js';
import { createRestApiRoutes } from './src/routes/restApi.js';

// 設定を最初に読み込み
await configManager.load();

// 設定に基づいてタスクマネージャーのインスタンスを作成
const dataConfig = configManager.getDataConfig();
const manager = new TaskManager(dataConfig.yamlFile, dataConfig.pendingFile);

// JSON-RPCレスポンスヘルパー関数
function jsonRpcSuccess(id, result) {
  return {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
}

// Expressアプリを作成
const app = express();
const serverConfig = configManager.getServerConfig();
const PORT = serverConfig.port;

// CORS設定
if (serverConfig.cors.enabled) {
  app.use(cors({
    origin: serverConfig.cors.origins,
    credentials: true
  }));
}

// JSONボディパーサーミドルウェア
app.use(express.json({ limit: '10mb' }));

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    name: "pokerinput-mcp-improved",
    version: "2.1.0",
    description: "改善版PokerInput MCP Server with REST API",
    endpoints: {
      jsonrpc: "/mcp",
      rest: "/api/v1"
    },
    methods: [
      "pokerinput.proposeBody",
      "pokerinput.deleteBody", 
      "pokerinput.proposeZone",
      "pokerinput.deleteZone",
      "pokerinput.applyChanges"
    ],
    features: [
      "JSON-RPC 2.0 API",
      "RESTful API",
      "Configuration Management", 
      "Enhanced Error Handling",
      "Automatic Backups",
      "Physics Validation"
    ]
  });
});

// REST API routes
app.use('/api/v1', createRestApiRoutes(manager));
// MCPエンドポイント（既存の JSON-RPC）
app.post('/mcp', async (req, res) => {
  try {
    const jsonBody = req.body;
    
    if (!jsonBody.method) {
      return res.json({
        jsonrpc: '2.0',
        id: jsonBody.id,
        error: {
          code: -32600,
          message: '無効なリクエスト: methodが必要です'
        }
      });
    }

    logger.info('MCP要求を受信しました', { 
      method: jsonBody.method, 
      params: jsonBody.params 
    });

    switch (jsonBody.method) {
      case 'pokerinput.proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          if (!name || !type) {
            return res.json({
              jsonrpc: '2.0',
              id: jsonBody.id,
              error: {
                code: -32602,
                message: '無効なパラメータ: nameとtypeは必須です'
              }
            });
          }
          const result = await manager.proposeBody(name, type, options);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.deleteBody':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json({
              jsonrpc: '2.0',
              id: jsonBody.id,
              error: {
                code: -32602,
                message: '無効なパラメータ: nameは必須です'
              }
            });
          }
          const result = await manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          if (!body_name || !material) {
            return res.json({
              jsonrpc: '2.0',
              id: jsonBody.id,
              error: {
                code: -32602,
                message: '無効なパラメータ: body_nameとmaterialは必須です'
              }
            });
          }
          const result = await manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }
      case 'pokerinput.deleteZone':
        try {
          const { body_name } = jsonBody.params;
          if (!body_name) {
            return res.json({
              jsonrpc: '2.0',
              id: jsonBody.id,
              error: {
                code: -32602,
                message: '無効なパラメータ: body_nameは必須です'
              }
            });
          }
          const result = await manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.applyChanges':
        try {
          const result = await manager.applyChanges();
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      default:
        return res.json({
          jsonrpc: '2.0',
          id: jsonBody.id,
          error: {
            code: -32601,
            message: `未知のメソッド: ${jsonBody.method}`
          }
        });
    }

  } catch (error) {
    logger.error('予期しないエラー', { error: error.message, stack: error.stack });
    return res.json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: 'サーバー内部エラー'
      }
    });
  }
});

// サーバー起動処理
async function startServer() {
  try {
    // TaskManagerを初期化
    await manager.initialize();
    
    // サーバー開始
    app.listen(PORT, () => {
      console.log(`改善版MCPサーバPokerInput v2.1が起動: http://localhost:${PORT}`);
      console.log('新機能:');
      console.log('- REST API エンドポイント: /api/v1');
      console.log('- 設定管理システム');
      console.log('- CORS サポート');
      console.log('- 拡張されたエラーハンドリング');
      
      logger.info('改善版MCPサーバ v2.1が起動しました', { port: PORT });
    });

  } catch (error) {
    console.error('サーバーの起動に失敗しました:', error.message);
    logger.error('サーバー起動エラー', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// 終了時の処理
process.on('SIGINT', () => {
  console.log('\nサーバーを停止しています...');
  logger.info('サーバーが停止されました');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nサーバーを停止しています...');
  logger.info('サーバーが停止されました');
  process.exit(0);
});

// サーバー開始
startServer();
