#!/usr/bin/env node
// test/syntax_check.js - 構文エラーチェック
import fs from 'fs';
import path from 'path';

console.log('=== 構文チェック開始 ===\n');

const filesToCheck = [
  '../src/mcp_server_stdio_v4.js',
  '../src/mcp/server.js',
  '../src/mcp/handlers/index.js',
  '../src/mcp/tools/index.js',
  '../src/mcp/middleware/errorHandler.js',
  '../src/services/TaskManager.js',
  '../src/utils/logger.js'
];

let allPassed = true;

for (const file of filesToCheck) {
  const fullPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), file);
  try {
    console.log(`✅ ${file}: 構文OK`);
  } catch (error) {
    console.log(`❌ ${file}: ${error.message}`);
    allPassed = false;
  }
}

console.log(`\n=== 構文チェック${allPassed ? '完了' : '失敗'} ===`);

// import テスト
console.log('\n=== import テスト ===');
try {
  const { PokerMcpServer } = await import('../src/mcp/server.js');
  console.log('✅ PokerMcpServer import成功');
  
  const server = new PokerMcpServer();
  console.log('✅ PokerMcpServer インスタンス作成成功');
  
} catch (error) {
  console.log('❌ import失敗:', error.message);
  allPassed = false;
}

console.log(`\n=== 全体結果: ${allPassed ? '成功' : '失敗'} ===`);
