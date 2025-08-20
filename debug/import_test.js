#!/usr/bin/env node
// debug/import_test.js - import テストのみ実行
console.log('=== Import Test ===');

async function testImportsOnly() {
  const tests = [
    { name: 'utils/logger.js', path: '../src/utils/logger.js' },
    { name: 'utils/errors.js', path: '../src/utils/errors.js' },
    { name: 'validators/PhysicsValidator.js', path: '../src/validators/PhysicsValidator.js' },
    { name: 'services/DataManager.js', path: '../src/services/DataManager.js' },
    { name: 'services/TaskManager.js', path: '../src/services/TaskManager.js' },
    { name: 'mcp/middleware/errorHandler.js', path: '../src/mcp/middleware/errorHandler.js' },
    { name: 'mcp/tools/index.js', path: '../src/mcp/tools/index.js' },
    { name: 'mcp/handlers/index.js', path: '../src/mcp/handlers/index.js' },
    { name: 'mcp/server.js', path: '../src/mcp/server.js' }
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      await import(test.path);
      console.log(`✅ ${test.name} - OK`);
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        console.log(`   Missing dependency: ${error.message}`);
      }
    }
  }
}

testImportsOnly().catch(console.error);
