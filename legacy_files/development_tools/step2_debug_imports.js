// step2_debug_imports.js - 段階的importテスト（簡略版）
console.log('=== Step 2: Import デバッグテスト開始 ===');

async function testImportsStep2() {
  try {
    console.log('\n1. 基本エラーファイル確認...');
    const { ValidationError, PhysicsError } = await import('./src/utils/errors.js');
    console.log('✅ errors.js - インポート成功');
    
    console.log('\n2. MCP エラーファイル確認...');
    const { PokerMcpError } = await import('./src/utils/mcpErrors.js');
    console.log('✅ mcpErrors.js - インポート成功');
    
    console.log('\n3. Winston確認...');
    const winston = await import('winston');
    console.log('✅ winston - インポート成功');
    
    console.log('\n4. logger.js 確認...');
    const { logger } = await import('./src/utils/logger.js');
    console.log('✅ logger.js - インポート成功');
    
    // loggerの実際の動作テスト
    logger.info('loggerテストメッセージ');
    console.log('✅ logger動作 - 成功');
    
    console.log('\n5. YAML関連確認...');
    const yaml = await import('js-yaml');
    console.log('✅ js-yaml - インポート成功');
    
    console.log('\n6. DataManager確認...');
    const { SafeDataManager } = await import('./src/services/DataManager.js');
    console.log('✅ DataManager.js - インポート成功');
    
    // DataManagerのインスタンス作成テスト
    const dm = new SafeDataManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('✅ DataManager インスタンス - 作成成功');
    
    console.log('\n7. Validator群確認...');
    const { PhysicsValidator } = await import('./src/validators/PhysicsValidator.js');
    const { ManifestValidator } = await import('./src/validators/ManifestValidator.js');
    console.log('✅ Validator群 - インポート成功');
    
    console.log('\n8. TaskManager確認...');
    const { TaskManager } = await import('./src/services/TaskManager.js');
    console.log('✅ TaskManager.js - インポート成功');
    
    console.log('\n9. MCP SDKの確認...');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    console.log('✅ MCP SDK - インポート成功');
    
    console.log('\n10. MCP tools確認...');
    const { allTools } = await import('./src/mcp/tools/index.js');
    console.log('✅ tools/index.js - インポート成功, ツール数:', allTools.length);
    
    console.log('\n11. MCP handlers確認...');
    const { createAllHandlers } = await import('./src/mcp/handlers/index.js');
    console.log('✅ handlers/index.js - インポート成功');
    
    console.log('\n12. server.js 最終確認...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✅ server.js - インポート成功');
    
    console.log('\n🎉 Step 2: 全てのimportが成功しました！');
    
  } catch (error) {
    console.error('\n❌ Step 2 Import エラー発生:');
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

testImportsStep2();
