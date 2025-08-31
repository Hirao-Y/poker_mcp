// test_startup.js - MCPサーバー起動テスト
import { PokerMcpServer } from './src/mcp/server.js';
import { logger } from './src/utils/logger.js';

console.log('=== MCP サーバー起動テスト開始 ===');

async function testStartup() {
  try {
    console.log('1. PokerMcpServer インスタンス作成中...');
    const server = new PokerMcpServer();
    
    console.log('2. サーバー初期化中...');
    await server.initialize();
    
    console.log('3. サーバー開始中...');
    await server.start();
    
    console.log('✅ MCPサーバーが正常に起動しました');
    
    // 5秒後に終了
    setTimeout(() => {
      console.log('テスト完了 - プロセス終了');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ MCPサーバー起動エラー:');
    console.error('エラー名:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    console.error('スタックトレース:', error.stack);
    
    // より詳細な情報
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    if (error.path) {
      console.error('エラーパス:', error.path);
    }
    
    process.exit(1);
  }
}

// 未処理の例外とプロミス拒否のハンドリング
process.on('uncaughtException', (error) => {
  console.error('❌ 未処理の例外:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未処理のプロミス拒否:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('SIGINT受信 - テスト終了');
  process.exit(0);
});

testStartup();
