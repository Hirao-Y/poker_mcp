// mcp_path_trace.js - MCPサーバー起動時のパストレース
console.log('=== MCPサーバー起動パストレース ===');

// 元のrequire関数を保存
const originalRequire = global.require;

// importをトレースするためのラッパー
const importTrace = new Map();

// Dynamic importのトレース
const originalImport = global.import;

// console.logを一時的に拡張してimport情報を記録
const originalLog = console.log;
console.log = function(...args) {
  if (args[0] && args[0].toString().includes('import')) {
    importTrace.set(Date.now(), args);
  }
  originalLog.apply(console, args);
};

async function traceServerStartup() {
  try {
    console.log('\n📊 MCPサーバー起動時のパス解決をトレース中...');
    console.log('開始時刻:', new Date().toISOString());
    console.log('作業ディレクトリ:', process.cwd());
    
    // ステップ1: エントリファイルの解析
    console.log('\n🎯 Step 1: エントリファイル確認');
    
    const entryPoint = 'src/mcp_server_stdio_v4.js';
    console.log(`エントリポイント: ${entryPoint}`);
    
    import path from 'path';
    const absoluteEntry = path.resolve(entryPoint);
    console.log(`絶対パス: ${absoluteEntry}`);
    
    // ファイル存在確認
    import fs from 'fs/promises';
    try {
      await fs.access(absoluteEntry);
      console.log('✅ エントリファイル存在確認');
    } catch (error) {
      console.log('❌ エントリファイル見つからず:', error.code);
      return;
    }
    
    // ステップ2: 段階的import
    console.log('\n🔗 Step 2: 段階的import実行');
    
    const importSteps = [
      { name: 'PokerMcpServer', path: './src/mcp/server.js' },
      { name: 'logger', path: './src/utils/logger.js' }
    ];
    
    for (const step of importSteps) {
      try {
        console.log(`\n📥 ${step.name} をインポート中...`);
        console.log(`   パス: ${step.path}`);
        
        const resolvedPath = path.resolve(step.path);
        console.log(`   解決パス: ${resolvedPath}`);
        
        const startTime = performance.now();
        const module = await import(step.path);
        const endTime = performance.now();
        
        console.log(`✅ ${step.name} インポート成功 (${(endTime - startTime).toFixed(2)}ms)`);
        console.log(`   エクスポート: ${Object.keys(module).join(', ')}`);
        
      } catch (error) {
        console.log(`❌ ${step.name} インポートエラー:`);
        console.log(`   エラータイプ: ${error.constructor.name}`);
        console.log(`   エラーメッセージ: ${error.message}`);
        console.log(`   スタック (最初の3行):`);
        const stackLines = error.stack.split('\n').slice(0, 3);
        stackLines.forEach(line => console.log(`     ${line}`));
        
        // より詳細な診断
        if (error.code) {
          console.log(`   エラーコード: ${error.code}`);
        }
        
        // パス関連の詳細分析
        if (error.message.includes('Cannot resolve') || error.message.includes('Module not found')) {
          console.log('\n🔍 パス解決詳細診断:');
          
          const requestedPath = step.path;
          console.log(`   要求されたパス: ${requestedPath}`);
          
          // 可能な解決パスを試す
          const possiblePaths = [
            path.resolve(requestedPath),
            path.resolve(process.cwd(), requestedPath),
            path.resolve(__dirname, requestedPath),
            path.resolve(path.dirname(absoluteEntry), requestedPath.replace('./', ''))
          ];
          
          console.log('   可能な解決パス:');
          for (const possiblePath of possiblePaths) {
            try {
              await fs.access(possiblePath);
              console.log(`     ✅ ${possiblePath}`);
            } catch (e) {
              console.log(`     ❌ ${possiblePath} (${e.code})`);
            }
          }
        }
        
        // 診断を続行
        continue;
      }
    }
    
    // ステップ3: 実際のサーバー起動テスト
    console.log('\n🚀 Step 3: 実際のサーバー起動テスト');
    
    try {
      console.log('サーバークラス取得中...');
      const { PokerMcpServer } = await import('./src/mcp/server.js');
      
      console.log('サーバーインスタンス作成中...');
      const server = new PokerMcpServer();
      
      console.log('サーバー初期化中...');
      await server.initialize();
      
      console.log('✅ サーバー初期化成功');
      
      console.log('サーバー起動テスト中...');
      // タイムアウト付きで起動
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('起動タイムアウト')), 10000);
      });
      
      const startPromise = server.start();
      
      await Promise.race([startPromise, timeoutPromise]);
      console.log('✅ サーバー起動成功');
      
    } catch (error) {
      console.log('❌ サーバー起動エラー:');
      console.log(`   エラータイプ: ${error.constructor.name}`);
      console.log(`   エラーメッセージ: ${error.message}`);
      
      // TaskManager関連エラーの詳細診断
      if (error.message.includes('TaskManager') || error.message.includes('DataManager')) {
        console.log('\n🔍 TaskManager/DataManager診断:');
        
        try {
          const yamlFile = 'tasks/pokerinputs.yaml';
          const pendingFile = 'tasks/pending_changes.json';
          
          console.log(`   YAMLファイル: ${path.resolve(yamlFile)}`);
          await fs.access(yamlFile);
          console.log('   ✅ YAML ファイル存在');
          
          console.log(`   Pendingファイル: ${path.resolve(pendingFile)}`);
          await fs.access(pendingFile);
          console.log('   ✅ Pending ファイル存在');
          
        } catch (fileError) {
          console.log(`   ❌ ファイルアクセスエラー: ${fileError.message}`);
        }
      }
    }
    
    // トレース情報の出力
    console.log('\n📋 インポートトレース情報:');
    if (importTrace.size > 0) {
      for (const [timestamp, logArgs] of importTrace) {
        console.log(`   ${new Date(timestamp).toISOString()}: ${logArgs.join(' ')}`);
      }
    } else {
      console.log('   トレース情報なし');
    }
    
  } catch (error) {
    console.error('\n💥 トレース中にエラー発生:', error);
    console.error('スタックトレース:', error.stack);
  } finally {
    // 元のconsole.logを復元
    console.log = originalLog;
  }
}

// グローバルエラーハンドラー
process.on('uncaughtException', (error) => {
  console.error('\n💥 未処理の例外:', error.message);
  console.error('スタックトレース:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 未処理のプロミス拒否:', reason);
});

traceServerStartup();
