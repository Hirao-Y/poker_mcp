jsonBody.id, -32602, '無効なパラメータ: materialは必須です'));
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
    logger.error('予期しないエラー', { error: error.message, stack: error.stack });
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
  
  logger.info('Complete MCP Server起動完了', { 
    port: PORT, 
    version: '3.0.0',
    pendingChanges: manager.pendingChanges.length 
  });
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n⏹️  サーバーを停止しています...');
  logger.info('サーバー停止');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕捉例外', { error: error.message, stack: error.stack });
  console.error('Fatal error:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未処理のPromise拒否', { reason, promise });
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
