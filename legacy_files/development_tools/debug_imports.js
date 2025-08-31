// debug_imports.js - import の段階的テスト
console.log('=== Import デバッグテスト開始 ===');

// 段階的にimportしてどこで失敗するかを特定

async function testImports() {
  try {
    console.log('\n1. logger.js をテスト...');
    const { logger } = await import('./src/utils/logger.js');
    console.log('✅ logger.js - インポート成功');
    
    console.log('\n2. DataManager.js をテスト...');
    const { SafeDataManager } = await import('./src/services/DataManager.js');
    console.log('✅ DataManager.js - インポート成功');
    
    console.log('\n3. TaskManager.js をテスト...');
    const { TaskManager } = await import('./src/services/TaskManager.js');
    console.log('✅ TaskManager.js - インポート成功');
    
    console.log('\n4. tools/index.js をテスト...');
    const { allTools } = await import('./src/mcp/tools/index.js');
    console.log('✅ tools/index.js - インポート成功, ツール数:', allTools.length);
    
    console.log('\n5. handlers/index.js をテスト...');
    const { createAllHandlers } = await import('./src/mcp/handlers/index.js');
    console.log('✅ handlers/index.js - インポート成功');
    
    console.log('\n6. middleware/errorHandler.js をテスト...');
    const { safeExecute } = await import('./src/mcp/middleware/errorHandler.js');
    console.log('✅ errorHandler.js - インポート成功');
    
    console.log('\n7. MCPサーバー関連をテスト...');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
    console.log('✅ MCP SDK - インポート成功');
    
    console.log('\n8. server.js をテスト...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✅ server.js - インポート成功');
    
    console.log('\n9. TaskManager インスタンス作成テスト...');
    const taskManager = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('✅ TaskManager インスタンス - 作成成功');
    
    console.log('\n10. TaskManager 初期化テスト...');
    await taskManager.initialize();
    console.log('✅ TaskManager - 初期化成功');
    
    console.log('\n11. PokerMcpServer インスタンス作成テスト...');
    const server = new PokerMcpServer();
    console.log('✅ PokerMcpServer インスタンス - 作成成功');
    
    console.log('\n12. PokerMcpServer 初期化テスト...');
    await server.initialize();
    console.log('✅ PokerMcpServer - 初期化成功');
    
    console.log('\n🎉 すべてのテストが成功しました！');
    
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error('エラー名:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    console.error('エラーコード:', error.code);
    console.error('エラーパス:', error.path);
    console.error('\nスタックトレース:');
    console.error(error.stack);
    
    // より詳細なエラー情報
    if (error.cause) {
      console.error('\n原因:');
      console.error(error.cause);
    }
    
    process.exit(1);
  }
}

testImports();
