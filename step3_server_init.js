// step3_server_init.js - サーバー初期化テスト
console.log('=== Step 3: サーバー初期化テスト開始 ===');

async function testServerInit() {
  try {
    console.log('\n1. PokerMcpServer クラスのインポート...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✅ PokerMcpServer - インポート成功');
    
    console.log('\n2. PokerMcpServer インスタンス作成...');
    const server = new PokerMcpServer();
    console.log('✅ PokerMcpServer - インスタンス作成成功');
    console.log('   YAML ファイル:', server.taskManager.dataManager.yamlFile);
    console.log('   Pending ファイル:', server.taskManager.dataManager.pendingFile);
    
    console.log('\n3. サーバー初期化開始...');
    await server.initialize();
    console.log('✅ サーバー初期化 - 成功');
    
    console.log('\n4. データ確認...');
    console.log('   読み込みデータキー:', Object.keys(server.taskManager.data));
    console.log('   保留変更数:', server.taskManager.pendingChanges.length);
    
    console.log('\n5. ツール確認...');
    console.log('   利用可能ハンドラー数:', Object.keys(server.handlers).length);
    const handlerNames = Object.keys(server.handlers).slice(0, 10); // 最初の10個のみ表示
    console.log('   ハンドラー例:', handlerNames);
    
    console.log('\n6. サーバー開始テスト（5秒後に自動終了）...');
    
    // 5秒のタイマーを設定
    const timeout = setTimeout(() => {
      console.log('✅ Step 3: テスト正常終了');
      process.exit(0);
    }, 5000);
    
    // サーバー開始
    await server.start();
    console.log('✅ サーバー開始 - 成功');
    
    // サーバーが正常に開始された場合
    clearTimeout(timeout);
    console.log('\n🎉 Step 3: サーバーが正常に起動しました！');
    
    // グレースフルシャットダウンのため3秒待機
    setTimeout(() => {
      console.log('テスト完了 - プロセス終了');
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ Step 3 サーバー初期化エラー:');
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
  console.log('\nSIGINT受信 - テスト終了');
  process.exit(0);
});

testServerInit();
