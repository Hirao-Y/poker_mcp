#!/usr/bin/env node
// debug_server.js - PokerMcpServer初期化のみテスト

import { PokerMcpServer } from './src/mcp/server.js';
import { logger } from './src/utils/logger.js';

console.log('Starting PokerMcpServer debug test...');

try {
    console.log('1. PokerMcpServer作成...');
    const server = new PokerMcpServer();
    
    console.log('2. initialize()実行...');
    await server.initialize();
    
    console.log('3. 初期化完了 - MCPサーバー開始はスキップ');
    console.log('handlers count:', Object.keys(server.handlers).length);
    console.log('handlers:', Object.keys(server.handlers));
    
} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}
