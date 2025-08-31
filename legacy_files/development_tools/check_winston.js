// check_winston.js - Winston と MCP SDK のインストールチェック
console.log('=== Winston & MCP SDK チェック ===');

async function checkModules() {
  try {
    console.log('\n1. Winston チェック...');
    const winston = await import('winston');
    console.log('✅ Winston - インポート成功');
    console.log('   バージョン:', winston.version || 'version情報なし');
    
    // Winston logger 作成テスト
    const testLogger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({ silent: true }) // サイレントモード
      ]
    });
    console.log('✅ Winston Logger - 作成成功');
    
    console.log('\n2. js-yaml チェック...');
    const yaml = await import('js-yaml');
    console.log('✅ js-yaml - インポート成功');
    
    console.log('\n3. MCP SDK チェック...');
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } = await import('@modelcontextprotocol/sdk/types.js');
    console.log('✅ MCP SDK - インポート成功');
    
    // MCP Server インスタンス作成テスト
    const testServer = new Server(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    console.log('✅ MCP Server - インスタンス作成成功');
    
    console.log('\n4. Node.js 内蔵モジュールチェック...');
    const fs = await import('fs/promises');
    const path = await import('path');
    console.log('✅ Node.js fs/promises & path - インポート成功');
    
    console.log('\n🎉 すべてのモジュールが正常です！');
    
    // node_modules の状態確認
    console.log('\n📦 node_modules 確認...');
    const fsSync = await import('fs');
    
    const modulesToCheck = [
      'node_modules/winston',
      'node_modules/@modelcontextprotocol',
      'node_modules/js-yaml'
    ];
    
    for (const module of modulesToCheck) {
      try {
        const stat = fsSync.statSync(module);
        console.log(`✅ ${module} - 存在確認`);
      } catch (error) {
        console.log(`❌ ${module} - NOT FOUND`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ モジュールチェックエラー:');
    console.error('エラー名:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    if (error.code) console.error('エラーコード:', error.code);
    if (error.path) console.error('エラーパス:', error.path);
    console.error('\nスタックトレース:');
    console.error(error.stack);
    
    process.exit(1);
  }
}

checkModules();
