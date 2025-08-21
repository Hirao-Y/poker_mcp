#!/usr/bin/env node
// debug/syntax_check.js - 構文チェック専用
console.log('=== Syntax Check ===');

// 各ファイルを個別にテスト
const filesToTest = [
  'src/utils/logger.js',
  'src/utils/errors.js', 
  'src/mcp/middleware/errorHandler.js',
  'src/mcp/tools/index.js',
  'src/mcp/handlers/index.js',
  'src/mcp/server.js'
];

async function testFile(filePath) {
  try {
    console.log(`Testing ${filePath}...`);
    await import(`./../${filePath}`);
    console.log(`✅ ${filePath} - Syntax OK`);
    return true;
  } catch (error) {
    console.log(`❌ ${filePath} - Error: ${error.message}`);
    if (error.message.includes('Unexpected token')) {
      console.log(`   🚨 SYNTAX ERROR in ${filePath}`);
      console.log(`   Line info: ${error.stack?.split('\n')[1] || 'Unknown'}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('Starting syntax tests...\n');
  
  let allPassed = true;
  for (const file of filesToTest) {
    const result = await testFile(file);
    allPassed = allPassed && result;
    console.log(''); // 空行
  }
  
  console.log(`=== Results: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'} ===`);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
});
