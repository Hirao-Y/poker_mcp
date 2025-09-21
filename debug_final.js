#!/usr/bin/env node
// debug_final.js - 最終的なサーバー起動テスト

console.log('=== POKER MCP サーバー診断 ===');

try {
    console.log('1. 環境確認...');
    console.log('Node.js Version:', process.version);
    console.log('Current Directory:', process.cwd());
    
    console.log('2. モジュールimport確認...');
    const { PokerMcpServer } = await import('./src/mcp/server.js');
    console.log('✓ PokerMcpServer imported');
    
    console.log('3. サーバー初期化...');
    const server = new PokerMcpServer();
    await server.initialize();
    console.log('✓ Server initialized');
    
    console.log('4. ハンドラー確認...');
    const handlerNames = Object.keys(server.handlers);
    console.log(`✓ ${handlerNames.length} handlers registered`);
    
    // confirmDaughterNuclidesハンドラーがあるかチェック
    if (server.handlers.confirmDaughterNuclides) {
        console.log('✓ confirmDaughterNuclides handler exists');
    } else {
        console.log('✗ confirmDaughterNuclides handler missing!');
    }
    
    console.log('5. 簡単なハンドラーテスト...');
    try {
        const result = await server.handlers.confirmDaughterNuclides({
            action: 'check'
        });
        console.log('✓ confirmDaughterNuclides test passed:', result.status);
    } catch (handlerError) {
        console.log('✗ confirmDaughterNuclides test failed:', handlerError.message);
    }
    
    console.log('\n=== 診断完了 ===');
    console.log('サーバー準備完了。MCP接続を開始してください。');
    
} catch (error) {
    console.error('診断エラー:', error.message);
    console.error('スタック:', error.stack);
    process.exit(1);
}
