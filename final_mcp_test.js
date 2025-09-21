#!/usr/bin/env node
// final_mcp_test.js - MCP接続最終テスト

import { PokerMcpServer } from './src/mcp/server.js';
import { logger } from './src/utils/logger.js';

console.log('=== FINAL MCP TEST ===');

async function main() {
    try {
        console.log('1. Creating and initializing server...');
        const server = new PokerMcpServer();
        await server.initialize();
        console.log('✓ Server initialized successfully');
        
        console.log('2. Starting MCP server...');
        // 正常なMCP接続の場合、この部分で待機状態になる
        await server.start();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// グレースフルシャットダウンのハンドリング
process.on('SIGINT', () => {
    console.log('\n✓ Graceful shutdown requested');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n✓ Graceful shutdown requested');
    process.exit(0);
});

main();
