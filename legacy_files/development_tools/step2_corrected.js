// step2_corrected.js - 修正されたStep2テスト
console.log('=== Step 2: Import デバッグテスト（修正版） ===');

async function testImportsStep2Corrected() {
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
    console.log('   winston main export:', typeof winston.createLogger);
    
    console.log('\n4. path モジュール確認（Node.js内蔵）...');
    const path = await import('path');
    console.log('✅ path - インポート成功（内蔵モジュール）');
    console.log('   path.resolve:', typeof path.resolve);
    
    console.log('\n5. logger.js 確認...');
    const { logger } = await import('./src/utils/logger.js');
    console.log('✅ logger.js - インポート成功');
    console.log('   logger type:', typeof logger);
    console.log('   logger methods:', Object.getOwnPropertyNames(logger).filter(prop => typeof logger[prop] === 'function').slice(0, 5));
    
    // loggerの実際の動作テスト
    console.log('\n6. Logger動作テスト...');
    logger.info('Step2 loggerテストメッセージ');
    console.log('✅ logger動作 - 成功');
    
    console.log('\n7. YAML関連確認...');
    const yaml = await import('js-yaml');
    console.log('✅ js-yaml - インポート成功');
    console.log('   yaml.load:', typeof yaml.load);
    
    console.log('\n8. DataManager確認...');
    const { SafeDataManager } = await import('./src/services/DataManager.js');
    console.log('✅ DataManager.js - インポート成功');
    
    // DataManagerのインスタンス作成テスト
    console.log('\n9. DataManager インスタンス作成テスト...');
    const dm = new SafeDataManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('✅ DataManager インスタンス - 作成成功');
    console.log('   YAML file:', dm.yamlFile);
    console.log('   Pending file:', dm.pendingFile);
    
    console.log('\n10. Validator群確認...');
    const { PhysicsValidator } = await import('./src/validators/PhysicsValidator.js');
    console.log('✅ PhysicsValidator - インポート成功');
    
    const { ManifestValidator } = await import('./src/validators/ManifestValidator.js');
    console.log('✅ ManifestValidator - インポート成功');
    
    const { UnitValidator } = await import('./src/validators/UnitValidator.js');
    console.log('✅ UnitValidator - インポート成功');
    
    console.log('\n11. TaskManager確認...');
    const { TaskManager } = await import('./src/services/TaskManager.js');
    console.log('✅ TaskManager.js - インポート成功');
    
    console.log('\n12. TaskManager インスタンス作成テスト...');
    const tm = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('✅ TaskManager インスタンス - 作成成功');
    
    console.log('\n13. MCP SDKの確認...');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    console.log('✅ MCP Server - インポート成功');
    console.log('   Server constructor:', typeof Server);
    
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    console.log('✅ StdioServerTransport - インポート成功');
    
    const { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } = await import('@modelcontextprotocol/sdk/types.js');
    console.log('✅ MCP Types - インポート成功');
    
    console.log('\n14. MCP tools確認...');
    const { allTools } = await import('./src/mcp/tools/index.js');
    console.log('✅ tools/index.js - インポート成功');
    console.log('   ツール数:', allTools.length);
    console.log('   最初の3つのツール:', allTools.slice(0, 3).map(t => t.name));
    
    console.log('\n15. MCP handlers確認...');
    const { createAllHandlers } = await import('./src/mcp/handlers/index.js');
    console.log('✅ handlers/index.js - インポート成功');
    console.log('   createAllHandlers type:', typeof createAllHandlers);
    
    console.log('\n16. server.js 最終確認...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✅ server.js - インポート成功');
    console.log('   PokerMcpServer constructor:', typeof PokerMcpServer);
    
    console.log('\n🎉 Step 2: 全てのimportが成功しました！');
    console.log('   → 次のStep3で実際のサーバー初期化をテストします');
    
  } catch (error) {
    console.error('\n❌ Step 2 Import エラー発生:');
    console.error('エラー名:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    
    // エラーの詳細情報
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    if (error.path) {
      console.error('エラーパス:', error.path);
    }
    
    // スタックトレースから重要な部分を抽出
    if (error.stack) {
      console.error('\nスタックトレース (重要部分):');
      const stackLines = error.stack.split('\n');
      const relevantLines = stackLines.filter(line => 
        line.includes('poker_mcp') || 
        line.includes('import') || 
        line.includes('Module')
      ).slice(0, 5);
      
      relevantLines.forEach(line => console.error('  ', line.trim()));
      
      if (stackLines.length > relevantLines.length) {
        console.error(`  ... (${stackLines.length - relevantLines.length} more lines)`);
      }
    }
    
    // より詳細なエラー情報
    if (error.cause) {
      console.error('\n原因:');
      console.error(error.cause);
    }
    
    // import関連エラーの場合の追加診断
    if (error.message.includes('Cannot resolve') || 
        error.message.includes('Module not found') ||
        error.message.includes('Failed to resolve')) {
      console.error('\n🔍 Import エラー詳細診断:');
      console.error('これはモジュール解決の問題です。');
      console.error('可能性:');
      console.error('1. ファイルパスの問題');
      console.error('2. npmモジュールの不足');
      console.error('3. ES Module vs CommonJS の混在');
      console.error('4. 循環依存関係');
    }
    
    process.exit(1);
  }
}

testImportsStep2Corrected();
