// mcp_server_improved.js
console.log("改善版MCPサーバを開始します...");

import express from 'express';
import { TaskManager } from './src/services/TaskManager.js';
import { handleError } from './src/utils/errorHandler.js';
import { logger } from './src/utils/logger.js';

// タスクマネージャーのインスタンスを作成
const manager = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');

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
const PORT = 3001; // 元のサーバーと区別するため3001を使用

// JSONボディパーサーミドルウェア
app.use(express.json());

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({
    name: "pokerinput-mcp-improved",
    version: "2.0.0",
    description: "改善版PokerInput MCP Server",
    endpoints: {
      jsonrpc: "/mcp"
    },
    methods: [
      "pokerinput.proposeBody",
      "pokerinput.deleteBody", 
      "pokerinput.proposeZone",
      "pokerinput.deleteZone",
      "pokerinput.applyChanges"
    ]
  });
});
// MCPエンドポイント
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
      console.log(`改善版MCPサーバPokerInputが起動: http://localhost:${PORT}`);
      console.log('以下の改善が実装されました:');
      console.log('- 構造化されたエラーハンドリング');
      console.log('- 非同期データ操作とバックアップ機能');
      console.log('- 物理的制約の検証');
      console.log('- モジュール化されたコード構造');
      console.log('- 詳細なログ機能');
      
      logger.info('改善版MCPサーバが起動しました', { port: PORT });
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
