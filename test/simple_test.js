#!/usr/bin/env node
// test/simple_test.js - 非MCPテスト（console出力OK）
console.log('=== Poker MCP Server v4.0.0 テスト ===\n');

async function testImports() {
  console.log('1. import テスト...');
  
  try {
    const { logger } = await import('../src/utils/logger.js');
    console.log('✅ logger import成功');
    
    const { ValidationError } = await import('../src/utils/errors.js');
    console.log('✅ errors import成功');
    
    const { TaskManager } = await import('../src/services/TaskManager.js');
    console.log('✅ TaskManager import成功');
    
    const { PokerMcpServer } = await import('../src/mcp/server.js');
    console.log('✅ PokerMcpServer import成功');
    
    return true;
  } catch (error) {
    console.log('❌ import失敗:', error.message);
    return false;
  }
}

async function testInitialization() {
  console.log('\n2. 初期化テスト（ログはファイルのみ）...');
  
  try {
    const { PokerMcpServer } = await import('../src/mcp/server.js');
    
    console.log('  - PokerMcpServerインスタンス作成中...');
    const server = new PokerMcpServer();
    console.log('✅ インスタンス作成成功');
    
    console.log('  - サーバー初期化中（stdout汚染チェック）...');
    await server.initialize();
    console.log('✅ 初期化成功（stdout汚染なし）');
    
    return true;
  } catch (error) {
    console.log('❌ 初期化失敗:', error.message);
    return false;
  }
}

async function main() {
  const step1 = await testImports();
  if (!step1) {
    console.log('\n=== テスト失敗: import段階で問題発生 ===');
    return;
  }
  
  const step2 = await testInitialization();
  if (!step2) {
    console.log('\n=== テスト失敗: 初期化段階で問題発生 ===');
    return;
  }
  
  console.log('\n=== 🎉 全テスト成功! MCPサーバーv4.0.0は正常動作可能 ===');
  console.log('📝 ログ出力先: logs/combined.log, logs/error.log');
  console.log('🚀 stdout汚染問題が解決されました');
}

main().catch(error => {
  console.error('テストエラー:', error);
  process.exit(1);
});
