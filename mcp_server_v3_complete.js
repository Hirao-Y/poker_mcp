      "pokerinput.proposeZone", "pokerinput.updateZone", "pokerinput.deleteZone",
      "pokerinput.proposeTransform", "pokerinput.updateTransform", "pokerinput.deleteTransform",
      "pokerinput.proposeBuildupFactor", "pokerinput.updateBuildupFactor", "pokerinput.deleteBuildupFactor",
      "pokerinput.changeOrderBuildupFactor", "pokerinput.proposeSource", "pokerinput.applyChanges"
    ]
  });
});

// JSON-RPC エンドポイント
app.post('/mcp', (req, res) => {
  try {
    const jsonBody = req.body;
    
    if (!jsonBody.method) {
      return res.json(jsonRpcError(jsonBody.id, -32600, '無効なリクエスト: methodが必要です'));
    }

    console.log('MCP要求受信:', { method: jsonBody.method, id: jsonBody.id });

    switch (jsonBody.method) {
      case 'pokerinput.proposeBody':
        try {
          const { name, type, ...options } = jsonBody.params;
          if (!name || !type) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameとtypeは必須です'));
          }
          const result = manager.proposeBody(name, type, options);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateBody':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.updateBody(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteBody':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.deleteBody(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `立体削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeZone':
        try {
          const { body_name, material, density } = jsonBody.params;
          if (!body_name || !material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameとmaterialは必須です'));
          }
          const result = manager.proposeZone(body_name, material, density);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateZone':
        try {
          const { body_name, ...updates } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameは必須です'));
          }
          const result = manager.updateZone(body_name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteZone':
        try {
          const { body_name } = jsonBody.params;
          if (!body_name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: body_nameは必須です'));
          }
          const result = manager.deleteZone(body_name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ゾーン削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeTransform':
        try {
          const { name, operation } = jsonBody.params;
          if (!name || !operation) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameとoperationは必須です'));
          }
          const result = manager.proposeTransform(name, operation);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateTransform':
        try {
          const { name, ...updates } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.updateTransform(name, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteTransform':
        try {
          const { name } = jsonBody.params;
          if (!name) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: nameは必須です'));
          }
          const result = manager.deleteTransform(name);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変換削除エラー: ${error.message}`));
        }

      case 'pokerinput.proposeBuildupFactor':
        try {
          const { material, use_slant_correction, use_finite_medium_correction } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.proposeBuildupFactor(material, use_slant_correction, use_finite_medium_correction);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数提案エラー: ${error.message}`));
        }

      case 'pokerinput.updateBuildupFactor':
        try {
          const { material, ...updates } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.updateBuildupFactor(material, updates);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数更新エラー: ${error.message}`));
        }

      case 'pokerinput.deleteBuildupFactor':
        try {
          const { material } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.deleteBuildupFactor(material);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数削除エラー: ${error.message}`));
        }

      case 'pokerinput.changeOrderBuildupFactor':
        try {
          const { material, newIndex } = jsonBody.params;
          if (!material) {
            return res.json(jsonRpcError(jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
          }
          const result = manager.changeOrderBuildupFactor(material, newIndex);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `ビルドアップ係数順序変更エラー: ${error.message}`));
        }

      case 'pokerinput.proposeSource':
        try {
          const result = manager.proposeSource(jsonBody.params);
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `線源提案エラー: ${error.message}`));
        }

      case 'pokerinput.applyChanges':
        try {
          const result = manager.applyChanges();
          return res.json(jsonRpcSuccess(jsonBody.id, { result }));
        } catch (error) {
          return res.json(jsonRpcError(jsonBody.id, -32000, `変更適用エラー: ${error.message}`));
        }

      default:
        return res.json(jsonRpcError(jsonBody.id, -32601, `未知のメソッド: ${jsonBody.method}`));
    }
  } catch (error) {
    console.error('予期しないエラー:', error.message, error.stack);
    return res.json(jsonRpcError(req.body?.id, -32603, 'サーバー内部エラー'));
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    pendingChanges: manager.pendingChanges.length
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Complete MCP Server v3.0 が起動しました`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📋 利用可能なエンドポイント:`);
  console.log(`   - JSON-RPC: POST /mcp`);
  console.log(`   - 情報取得: GET /`);
  console.log(`   - ヘルスチェック: GET /health`);
  console.log(`✨ 全15のMCPメソッドが利用可能です`);
  console.log(`📁 データファイル: ${manager.yamlFile}`);
  console.log(`🔄 保留変更: ${manager.pendingChanges.length}件`);
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n⏹️  サーバーを停止しています...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('未捕捉例外:', error.message, error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未処理のPromise拒否:', reason, promise);
});
