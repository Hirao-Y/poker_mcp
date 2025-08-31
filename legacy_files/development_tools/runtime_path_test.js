// runtime_path_test.js - 実行時パス解決テスト
import path from 'path';
import fs from 'fs/promises';

console.log('=== 実行時パス解決テスト ===');

async function testRuntimePaths() {
  // 実行時環境情報
  console.log('\n🔧 実行時環境:');
  console.log('現在の作業ディレクトリ:', process.cwd());
  console.log('スクリプトファイルURL:', import.meta.url);
  console.log('スクリプトファイルパス:', new URL(import.meta.url).pathname);
  
  // プラットフォーム固有のパス処理
  let scriptPath = new URL(import.meta.url).pathname;
  if (process.platform === 'win32') {
    scriptPath = scriptPath.replace(/^\/([A-Za-z]:)/, '$1');
  }
  console.log('プラットフォーム調整後パス:', scriptPath);
  console.log('スクリプトディレクトリ:', path.dirname(scriptPath));
  
  // 相対パス解決のテスト関数
  async function testPathResolution(basePath, relativePath) {
    console.log(`\n📍 パス解決テスト:`);
    console.log(`   ベースパス: ${basePath}`);
    console.log(`   相対パス: ${relativePath}`);
    
    const resolved = path.resolve(basePath, relativePath);
    console.log(`   解決結果: ${resolved}`);
    
    try {
      const stat = await fs.stat(resolved);
      console.log(`   ✅ 存在 (${stat.isFile() ? 'ファイル' : 'ディレクトリ'})`);
      return true;
    } catch (error) {
      console.log(`   ❌ 存在しない (${error.code})`);
      return false;
    }
  }
  
  // 重要なパス解決テスト
  console.log('\n🎯 重要ファイルのパス解決テスト:');
  
  const basePaths = [
    process.cwd(),
    path.dirname(scriptPath),
    path.resolve('.')
  ];
  
  const testFiles = [
    'src/mcp_server_stdio_v4.js',
    'src/mcp/server.js',
    'src/utils/logger.js',
    'tasks/pokerinputs.yaml',
    'package.json'
  ];
  
  for (const base of basePaths) {
    console.log(`\n📂 ベースパス: ${base}`);
    for (const file of testFiles) {
      await testPathResolution(base, file);
    }
  }
  
  // import.meta.resolve のテスト（Node.js 20.6.0以降）
  console.log('\n🔗 import.meta.resolve テスト:');
  
  const modules = [
    './src/utils/logger.js',
    './src/mcp/server.js',
    'winston',
    'js-yaml',
    '@modelcontextprotocol/sdk/server/index.js'
  ];
  
  for (const module of modules) {
    try {
      if (import.meta.resolve) {
        const resolved = import.meta.resolve(module);
        console.log(`✅ ${module} → ${resolved}`);
      } else {
        console.log(`⚠️ import.meta.resolve not available (Node.js version: ${process.version})`);
        break;
      }
    } catch (error) {
      console.log(`❌ ${module} → ${error.message}`);
    }
  }
  
  // 異なる作業ディレクトリでのテスト
  console.log('\n📁 作業ディレクトリ変更テスト:');
  
  const originalCwd = process.cwd();
  const testDirs = [
    path.resolve('.'),
    path.resolve('src'),
    path.resolve('src/mcp')
  ];
  
  for (const testDir of testDirs) {
    try {
      const stat = await fs.stat(testDir);
      if (stat.isDirectory()) {
        console.log(`\n📂 作業ディレクトリを ${testDir} に変更:`);
        process.chdir(testDir);
        console.log(`   新しいcwd: ${process.cwd()}`);
        
        // 相対パスでの解決テスト
        const relativeTests = [
          '../utils/logger.js',
          '../../tasks/pokerinputs.yaml',
          './server.js'
        ];
        
        for (const rel of relativeTests) {
          const resolved = path.resolve(rel);
          try {
            await fs.access(resolved);
            console.log(`   ✅ ${rel} → ${resolved}`);
          } catch (error) {
            console.log(`   ❌ ${rel} → 存在しない`);
          }
        }
        
        // 元に戻す
        process.chdir(originalCwd);
      }
    } catch (error) {
      console.log(`   ⚠️ ${testDir} はディレクトリではない`);
    }
  }
  
  // Windows固有のパス問題チェック
  if (process.platform === 'win32') {
    console.log('\n🪟 Windows固有のパス問題チェック:');
    
    const windowsTests = [
      'C:\\Users\\tora\\Desktop\\poker_mcp\\src\\utils\\logger.js',
      '/c/Users/tora/Desktop/poker_mcp/src/utils/logger.js',
      '\\Users\\tora\\Desktop\\poker_mcp\\src\\utils\\logger.js'
    ];
    
    for (const winPath of windowsTests) {
      try {
        const normalized = path.normalize(winPath);
        console.log(`   パス正規化: ${winPath} → ${normalized}`);
        
        await fs.access(normalized);
        console.log(`   ✅ アクセス可能`);
      } catch (error) {
        console.log(`   ❌ アクセス不可 (${error.code})`);
      }
    }
  }
  
  console.log('\n✅ 実行時パス解決テスト完了');
}

testRuntimePaths().catch(error => {
  console.error('パステストエラー:', error);
  process.exit(1);
});
