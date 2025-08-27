// check_dependencies.js - 依存関係とファイル存在チェック
import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'src/mcp/server.js',
  'src/utils/logger.js',
  'src/services/TaskManager.js',
  'src/services/DataManager.js',
  'src/mcp/tools/index.js',
  'src/mcp/handlers/index.js',
  'src/mcp/middleware/errorHandler.js',
  'tasks/pokerinputs.yaml',
  'package.json'
];

const requiredModules = [
  '@modelcontextprotocol/sdk/server/index.js',
  '@modelcontextprotocol/sdk/server/stdio.js',
  '@modelcontextprotocol/sdk/types.js',
  'winston',
  'js-yaml'
];

console.log('=== 依存関係とファイル存在チェック ===\n');

// ファイル存在チェック
console.log('📁 必要ファイルの存在確認:');
let missingFiles = [];

for (const file of requiredFiles) {
  try {
    fs.accessSync(file, fs.constants.F_OK);
    console.log(`✅ ${file}`);
  } catch (error) {
    console.log(`❌ ${file} - NOT FOUND`);
    missingFiles.push(file);
  }
}

// npm modules チェック
console.log('\n📦 npmモジュールの存在確認:');
let missingModules = [];

for (const module of requiredModules) {
  try {
    await import(module);
    console.log(`✅ ${module}`);
  } catch (error) {
    console.log(`❌ ${module} - ${error.message}`);
    missingModules.push({ module, error: error.message });
  }
}

// package.json確認
console.log('\n📋 package.json内容確認:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('✅ Package name:', packageJson.name);
  console.log('✅ Version:', packageJson.version);
  console.log('✅ Type:', packageJson.type || 'commonjs');
  console.log('✅ Main entry:', packageJson.main);
  
  if (packageJson.dependencies) {
    console.log('\n📦 依存関係:');
    for (const [dep, version] of Object.entries(packageJson.dependencies)) {
      console.log(`  ${dep}: ${version}`);
    }
  }
} catch (error) {
  console.log('❌ package.json読み込みエラー:', error.message);
}

// サマリー
console.log('\n=== 結果サマリー ===');
if (missingFiles.length === 0 && missingModules.length === 0) {
  console.log('✅ すべての必要ファイルとモジュールが見つかりました');
} else {
  if (missingFiles.length > 0) {
    console.log(`❌ 不足ファイル (${missingFiles.length}):`, missingFiles);
  }
  if (missingModules.length > 0) {
    console.log(`❌ 不足/問題モジュール (${missingModules.length}):`, missingModules);
  }
}

// Node.js バージョン確認
console.log('\n🔧 環境情報:');
console.log('Node.js バージョン:', process.version);
console.log('プラットフォーム:', process.platform);
console.log('作業ディレクトリ:', process.cwd());
