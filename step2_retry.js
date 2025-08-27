// step2_retry.js - 修正後のStep2テスト
console.log('=== Step 2: 修正後のImport デバッグテスト ===');

async function testImportsAfterFix() {
  try {
    console.log('構文エラー修正後のテストを開始します...\n');
    
    console.log('1. 基本エラーファイル確認...');
    const { ValidationError, PhysicsError } = await import('./src/utils/errors.js');
    console.log('✅ errors.js - OK');
    
    console.log('2. MCP エラーファイル確認...');
    const { PokerMcpError } = await import('./src/utils/mcpErrors.js');
    console.log('✅ mcpErrors.js - OK');
    
    console.log('3. Logger確認...');
    const { logger } = await import('./src/utils/logger.js');
    console.log('✅ logger.js - OK');
    
    console.log('4. DataManager確認...');
    const { SafeDataManager } = await import('./src/services/DataManager.js');
    console.log('✅ DataManager.js - OK');
    
    console.log('5. 修正された TaskManager確認...');
    const { TaskManager } = await import('./src/services/TaskManager.js');
    console.log('✅ TaskManager.js - 修正済み、インポート成功！');
    
    console.log('6. TaskManager インスタンス作成テスト...');
    const tm = new TaskManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('✅ TaskManager インスタンス - 作成成功');
    
    console.log('7. MCP tools確認...');
    const { allTools } = await import('./src/mcp/tools/index.js');
    console.log(`✅ tools/index.js - インポート成功, ツール数: ${allTools.length}`);
    
    console.log('8. MCP handlers確認...');
    const { createAllHandlers } = await import('./src/mcp/handlers/index.js');
    console.log('✅ handlers/index.js - インポート成功');
    
    console.log('9. MCP server確認...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✅ server.js - インポート成功');
    
    console.log('10. MCP SDK確認...');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    console.log('✅ MCP SDK - インポート成功');
    
    console.log('\n🎉 Step 2: 修正後、全てのimportが成功しました！');
    console.log('   → 構文エラーが解決されました');
    console.log('   → Step 3でサーバー初期化テストを実行可能です');
    
  } catch (error) {
    console.error('\n❌ Step 2 修正後エラー:');
    console.error('エラー名:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    
    if (error.stack) {
      console.error('\nスタックトレース (重要部分):');
      const stackLines = error.stack.split('\n');
      const relevantLines = stackLines.filter(line => 
        line.includes('poker_mcp') || 
        line.includes('import') || 
        line.includes('TaskManager')
      ).slice(0, 3);
      
      relevantLines.forEach(line => console.error('  ', line.trim()));
    }
    
    process.exit(1);
  }
}

testImportsAfterFix();
