#!/usr/bin/env node
// debug_mcp_connection.js - MCP接続テスト

import { PokerMcpServer } from './src/mcp/server.js';
import { logger } from './src/utils/logger.js';

console.log('Starting MCP connection debug test...');

async function main() {
    try {
        console.log('1. PokerMcpServer作成・初期化...');
        const server = new PokerMcpServer();
        await server.initialize();
        
        console.log('2. MCP接続開始...');
        
        // 5秒後に強制終了するタイマーを設定
        const timer = setTimeout(() => {
            console.log('タイムアウト - プロセス終了');
            process.exit(0);
        }, 5000);
        
        await server.start();
        
        clearTimeout(timer);
        console.log('3. MCP接続成功');
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
