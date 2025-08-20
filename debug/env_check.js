#!/usr/bin/env node
// debug/env_check.js - 環境チェック
console.log('=== Environment Check ===');

console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current working directory:', process.cwd());

// ES Modules サポート確認
try {
  console.log('ES Modules support: YES');
  import('path').then(() => {
    console.log('✅ Dynamic import works');
  }).catch(e => {
    console.log('❌ Dynamic import failed:', e.message);
  });
} catch (e) {
  console.log('❌ ES Modules not supported:', e.message);
}

// package.json の type 確認
const fs = require('fs');
const path = require('path');

try {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log('Package type:', pkg.type || 'commonjs');
  console.log('Package name:', pkg.name);
  console.log('Package version:', pkg.version);
} catch (e) {
  console.log('❌ Cannot read package.json:', e.message);
}

console.log('=== Environment Check Complete ===');
