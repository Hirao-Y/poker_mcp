// mcp_server_v2.1_fixed.js
console.log("改善版MCPサーバー v2.1 (修正版) を開始します...");

import express from 'express';
import cors from 'cors';
import { TaskManager } from './src/services/TaskManager.js';
import { handleError } from './src/utils/errorHandler.js';
import { logger } from './src/utils/logger.js';
import { createRestApiRoutes } from './src/routes/restApi.js';

// デフォルト設定（設定ファイルなしでも動作）
const defaultConfig = {
  server: {
    port: process.env.PORT || 3001,
    host: "localhost",
    cors: {
      enabled: true,
      origins: ["*"]
    }
  },
  data: {
    yamlFile: "tasks/pokerinputs.yaml",
    pendingFile: "tasks/pending_changes.json"
  }
};

// タスクマネージャーのインスタンスを作成
const manager = new TaskManager(defaultConfig.data.yamlFile, defaultConfig.data.pendingFile);

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
const PORT = defaultConfig.server.port;

// CORS設定
app.use(cors({
  origin: defaultConfig.server.cors.origins,
  credentials: true
}));

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
      "pokerinput.updateBody",
      "pokerinput.deleteBody", 
      "pokerinput.proposeZone",
      "pokerinput.updateZone",
      "pokerinput.deleteZone",
      "pokerinput.proposeTransform",
      "pokerinput.updateTransform",
      "pokerinput.deleteTransform",
      "pokerinput.proposeBuildupFactor",
      "pokerinput.updateBuildupFactor",
      "pokerinput.deleteBuildupFactor",
      "pokerinput.changeOrderBuildupFactor",
      "pokerinput.proposeSource",
      "pokerinput.applyChanges"
    ],
    features: [
      "JSON-RPC 2.0 API",
      "RESTful API",
      "Enhanced Error Handling",
      "Automatic Backups",
      "Physics Validation",
      "Complete MCP Support"
    ]
  });
});

// REST API routes
app.use('/api/v1', createRestApiRoutes(manager));
// JSON-RPC エンドポイント
app.post('/mcp', async (req, res) => {
  try {
    const jsonBody = req.body;
    
    if (!jsonBody.method) {
      return res.json({
        jsonrpc: '2.0',
        id: jsonBody.id,
        error: { code: -32600, message: '無効なリクエスト: methodが必要です' }
      });
    }

    logger.info('MCP要求を受信しました', { method: jsonBody.method, params: jsonBody.params });
    console.log(`DEBUG: Received method: ${jsonBody.method}`);

    switch (jsonBody.method) {
      case 'pokerinput.proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          if (!name || !type) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameとtypeは必須です' }
            });
          }
          const result = await manager.proposeBody(name, type, options);
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

      case 'pokerinput.deleteBody':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameは必須です' }
            });
          }
          const result = await manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.updateBody':
        console.log('DEBUG: Entered updateBody case');
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameは必須です' }
            });
          }
          const result = await manager.updateBody(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          if (!body_name || !material) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: body_nameとmaterialは必須です' }
            });
          }
          const result = await manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.updateZone':
        try {
          const { body_name, material, density, new_body_name } = jsonBody.params;
          if (!body_name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: body_nameは必須です' }
            });
          }
          const updates = {};
          if (material !== undefined) updates.material = material;
          if (density !== undefined) updates.density = density;
          if (new_body_name !== undefined) updates.new_body_name = new_body_name;
          const result = await manager.updateZone(body_name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.deleteZone':
        try {
          const { body_name } = jsonBody.params;
          if (!body_name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: body_nameは必須です' }
            });
          }
          const result = await manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.proposeTransform':
        try {
          const { name, operation } = jsonBody.params;
          if (!name || !operation) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameとoperationは必須です' }
            });
          }
          const result = await manager.proposeTransform(name, operation);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.updateTransform':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameは必須です' }
            });
          }
          const result = await manager.updateTransform(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.deleteTransform':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: nameは必須です' }
            });
          }
          const result = await manager.deleteTransform(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.proposeBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: materialは必須です' }
            });
          }
          const result = await manager.proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.updateBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: materialは必須です' }
            });
          }
          const result = await manager.updateBuildupFactor(material, { use_slant_correction, use_finite_medium_correction });
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.deleteBuildupFactor':
        try {
          const { material } = jsonBody.params;
          if (!material) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: materialは必須です' }
            });
          }
          const result = await manager.deleteBuildupFactor(material);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.changeOrderBuildupFactor':
        try {
          const { material, newIndex } = jsonBody.params;
          if (!material) {
            return res.json({
              jsonrpc: '2.0', id: jsonBody.id,
              error: { code: -32602, message: '無効なパラメータ: materialは必須です' }
            });
          }
          const result = await manager.changeOrderBuildupFactor(material, newIndex);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      case 'pokerinput.proposeSource':
        try {
          const result = await manager.proposeSource(jsonBody.params);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return handleError(error, req, res);
        }

      default:
        console.log(`DEBUG: Reached default case for method: ${jsonBody.method}`);
        return res.json({
          jsonrpc: '2.0', id: jsonBody.id,
          error: { code: -32601, message: `未知のメソッド: ${jsonBody.method}` }
        });
    }
  } catch (error) {
    logger.error('予期しないエラー', { error: error.message });
    return res.json({
      jsonrpc: '2.0', id: req.body?.id,
      error: { code: -32603, message: 'サーバー内部エラー' }
    });
  }
});

// サーバー起動処理
async function startServer() {
  try {
    await manager.initialize();
    
    app.listen(PORT, () => {
      console.log(`改善版MCPサーバPokerInput v2.1 (修正版) が起動: http://localhost:${PORT}`);
      console.log('利用可能なエンドポイント:');
      console.log('- JSON-RPC: POST /mcp');
      console.log('- REST API: /api/v1/*');
      console.log('- Status: GET /api/v1/status');
      console.log('利用可能なMCPメソッド:');
      console.log('- pokerinput.proposeBody, updateBody, deleteBody');
      console.log('- pokerinput.proposeZone, updateZone, deleteZone');
      console.log('- pokerinput.proposeTransform, updateTransform, deleteTransform');
      console.log('- pokerinput.proposeBuildupFactor, updateBuildupFactor, deleteBuildupFactor');
      console.log('- pokerinput.changeOrderBuildupFactor, proposeSource, applyChanges');
      
      logger.info('改善版MCPサーバ v2.1 (修正版) が起動しました', { port: PORT });
    });
  } catch (error) {
    console.error('サーバーの起動に失敗しました:', error.message);
    logger.error('サーバー起動エラー', { error: error.message });
    process.exit(1);
  }
}

// 終了時の処理
process.on('SIGINT', () => {
  console.log('\nサーバーを停止しています...');
  logger.info('サーバーが停止されました');
  process.exit(0);
});

// サーバー開始
startServer();
