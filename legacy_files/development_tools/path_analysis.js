// path_analysis.js - パスと作業ディレクトリの詳細分析
import path from 'path';
import fs from 'fs/promises';

console.log('=== パスと作業ディレクトリ分析 ===');

async function analyzePaths() {
  try {
    // 1. 現在の作業ディレクトリ情報
    console.log('\n📁 作業ディレクトリ情報:');
    console.log('process.cwd():', process.cwd());
    console.log('__dirname相当:', path.dirname(new URL(import.meta.url).pathname));
    console.log('スクリプト位置:', new URL(import.meta.url).pathname);
    
    // 2. 重要なディレクトリの存在確認
    console.log('\n📂 重要ディレクトリの確認:');
    const importantDirs = [
      'src',
      'src/mcp',
      'src/utils',
      'src/services',
      'src/validators',
      'tasks',
      'node_modules',
      'logs'
    ];
    
    for (const dir of importantDirs) {
      try {
        const stat = await fs.stat(dir);
        console.log(`✅ ${dir} - 存在 (${stat.isDirectory() ? 'Directory' : 'File'})`);
      } catch (error) {
        console.log(`❌ ${dir} - 存在しない (${error.code})`);
      }
    }
    
    // 3. 相対パス解決テスト
    console.log('\n🔍 相対パス解決テスト:');
    const testPaths = [
      './src/utils/logger.js',
      './src/mcp/server.js',
      './src/services/TaskManager.js',
      './tasks/pokerinputs.yaml',
      './package.json'
    ];
    
    for (const testPath of testPaths) {
      const resolved = path.resolve(testPath);
      console.log(`📍 ${testPath}`);
      console.log(`   → 解決済み: ${resolved}`);
      
      try {
        await fs.access(resolved);
        console.log(`   ✅ アクセス可能`);
      } catch (error) {
        console.log(`   ❌ アクセス不可 (${error.code})`);
      }
    }
    
    // 4. package.json の main フィールド確認
    console.log('\n📋 package.json 解析:');
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      console.log('メインエントリ:', packageJson.main);
      console.log('タイプ:', packageJson.type);
      
      // mainエントリの存在確認
      if (packageJson.main) {
        const mainPath = path.resolve(packageJson.main);
        console.log(`メインエントリ解決済みパス: ${mainPath}`);
        try {
          await fs.access(mainPath);
          console.log('✅ メインエントリファイル - 存在');
        } catch (error) {
          console.log(`❌ メインエントリファイル - 存在しない (${error.code})`);
        }
      }
    } catch (error) {
      console.log(`❌ package.json読み込みエラー: ${error.message}`);
    }
    
    // 5. 実際のコードからのimportパス解析
    console.log('\n🔗 実際のimportパス解析:');
    
    // mcp_server_stdio_v4.js のimport文チェック
    try {
      const serverCode = await fs.readFile('src/mcp_server_stdio_v4.js', 'utf8');
      const importMatches = serverCode.match(/import .* from ['"`]([^'"`]+)['"`]/g);
      
      if (importMatches) {
        console.log('mcp_server_stdio_v4.js のimport文:');
        for (const match of importMatches) {
          const pathMatch = match.match(/from ['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            const importPath = pathMatch[1];
            console.log(`  📥 ${importPath}`);
            
            // 相対パスを現在のファイルの位置から解決
            const basePath = path.dirname(path.resolve('src/mcp_server_stdio_v4.js'));
            const resolvedImportPath = path.resolve(basePath, importPath);
            console.log(`     → 解決: ${resolvedImportPath}`);
            
            try {
              await fs.access(resolvedImportPath);
              console.log(`     ✅ 存在`);
            } catch (error) {
              console.log(`     ❌ 存在しない (${error.code})`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`エントリファイル解析エラー: ${error.message}`);
    }
    
    // 6. logger.js のimportパス解析
    try {
      const loggerCode = await fs.readFile('src/utils/logger.js', 'utf8');
      const importMatches = loggerCode.match(/import .* from ['"`]([^'"`]+)['"`]/g);
      
      if (importMatches) {
        console.log('\nlogger.js のimport文:');
        for (const match of importMatches) {
          const pathMatch = match.match(/from ['"`]([^'"`]+)['"`]/);
          if (pathMatch) {
            const importPath = pathMatch[1];
            console.log(`  📥 ${importPath}`);
            
            // npm モジュールか相対パスかを判定
            if (!importPath.startsWith('.') && !path.isAbsolute(importPath)) {
              // npm モジュール
              const nodeModulePath = path.resolve('node_modules', importPath);
              console.log(`     → npm モジュール: ${nodeModulePath}`);
              try {
                await fs.access(nodeModulePath);
                console.log(`     ✅ 存在`);
              } catch (error) {
                console.log(`     ❌ 存在しない (${error.code})`);
              }
            } else {
              // 相対パス
              const basePath = path.dirname(path.resolve('src/utils/logger.js'));
              const resolvedImportPath = path.resolve(basePath, importPath);
              console.log(`     → 相対パス解決: ${resolvedImportPath}`);
              try {
                await fs.access(resolvedImportPath);
                console.log(`     ✅ 存在`);
              } catch (error) {
                console.log(`     ❌ 存在しない (${error.code})`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log(`logger.js 解析エラー: ${error.message}`);
    }
    
    // 7. 環境変数とNode.js設定
    console.log('\n🔧 環境情報:');
    console.log('Node.js バージョン:', process.version);
    console.log('プラットフォーム:', process.platform);
    console.log('アーキテクチャ:', process.arch);
    console.log('NODE_PATH:', process.env.NODE_PATH || 'undefined');
    console.log('PATH (Node関連のみ):', (process.env.PATH || '').split(path.delimiter).filter(p => p.includes('node')));
    
  } catch (error) {
    console.error('パス分析エラー:', error);
    process.exit(1);
  }
}

analyzePaths();
