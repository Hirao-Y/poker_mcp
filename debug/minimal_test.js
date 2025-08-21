#!/usr/bin/env node
// debug/minimal_test.js - 最小限のテスト
console.log('=== Minimal Syntax Test ===');

// Step 1: Basic imports
console.log('Step 1: Testing basic Node.js modules...');
try {
  const path = require('path');
  console.log('✅ path module OK');
} catch (e) {
  console.log('❌ path module failed:', e.message);
}

// Step 2: ES6 imports
console.log('Step 2: Testing ES6 import syntax...');
try {
  // Test basic ES6 import
  (async () => {
    try {
      console.log('Testing js-yaml...');
      const yaml = await import('js-yaml');
      console.log('✅ js-yaml import OK');
    } catch (e) {
      console.log('❌ js-yaml import failed:', e.message);
    }

    try {
      console.log('Testing winston...');
      const winston = await import('winston');
      console.log('✅ winston import OK');
    } catch (e) {
      console.log('❌ winston import failed:', e.message);
    }

    try {
      console.log('Testing MCP SDK...');
      const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
      console.log('✅ MCP SDK import OK');
    } catch (e) {
      console.log('❌ MCP SDK import failed:', e.message);
    }

    console.log('=== Test Complete ===');
  })();
} catch (e) {
  console.log('❌ ES6 test failed:', e.message);
}
