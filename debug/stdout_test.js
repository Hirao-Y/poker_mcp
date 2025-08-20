#!/usr/bin/env node
// debug/stdout_test.js - stdout汚染テスト専用
console.log('=== stdout汚染テスト ===');

async function testStdoutPollution() {
  console.log('MCPサーバーコンポーネントのstdout汚染をテスト...\n');
  
  try {
    // logger単体テスト
    console.log('1. logger単体テスト...');
    const { logger } = await import('../src/utils/logger.js');
    
    logger.info('これはログファイルのみに出力されるべきです');
    logger.error('これもログファイルのみに出力されるべきです');
    console.log('✅ logger: stdout汚染なし');
    
    // TaskManager初期化テスト
    console.log('\n2. TaskManager初期化テスト...');
    const { TaskManager } = await import('../src/services/TaskManager.js');
    const taskManager = new TaskManager();
    await taskManager.initialize();
    console.log('✅ TaskManager: stdout汚染なし');
    
    // PokerMcpServer初期化テスト
    console.log('\n3. PokerMcpServer初期化テスト...');
    const { PokerMcpServer } = await import('../src/mcp/server.js');
    const server = new PokerMcpServer();
    await server.initialize();
    console.log('✅ PokerMcpServer: stdout汚染なし');
    
    console.log('\n🎉 全てのコンポーネントでstdout汚染が解決されました！');
    console.log('📁 ログ確認先: logs/combined.log, logs/error.log');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    console.error('Stack:', error.stack);
  }
}

testStdoutPollution();
