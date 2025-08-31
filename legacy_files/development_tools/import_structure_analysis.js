// import_structure_analysis.js - import文の詳細構造分析
import fs from 'fs/promises';
import path from 'path';

console.log('=== Import文構造分析 ===');

async function analyzeImportStructure() {
  try {
    // 分析対象ファイル
    const targetFiles = [
      'src/mcp_server_stdio_v4.js',
      'src/mcp/server.js',
      'src/utils/logger.js',
      'src/services/TaskManager.js',
      'src/services/DataManager.js',
      'src/mcp/tools/index.js',
      'src/mcp/handlers/index.js'
    ];
    
    const importGraph = {};
    const circularDependencies = [];
    
    console.log('\n📊 各ファイルのimport分析:');
    
    for (const file of targetFiles) {
      console.log(`\n📄 ${file}:`);
      
      try {
        const code = await fs.readFile(file, 'utf8');
        const imports = extractImports(code);
        importGraph[file] = imports;
        
        console.log(`   Import数: ${imports.length}`);
        
        for (const imp of imports) {
          console.log(`   📥 ${imp.module}`);
          console.log(`      → タイプ: ${imp.type}`);
          console.log(`      → インポート: ${imp.imports.join(', ')}`);
          
          if (imp.type === 'relative') {
            const basePath = path.dirname(path.resolve(file));
            const resolvedPath = path.resolve(basePath, imp.module);
            console.log(`      → 解決パス: ${resolvedPath}`);
            
            // ファイル存在確認
            try {
              await fs.access(resolvedPath);
              console.log(`      ✅ 存在`);
            } catch (error) {
              console.log(`      ❌ 存在しない`);
            }
          } else if (imp.type === 'npm') {
            console.log(`      → npmモジュール`);
          } else if (imp.type === 'builtin') {
            console.log(`      → Node.js内蔵`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ファイル読み込みエラー: ${error.message}`);
      }
    }
    
    // 循環依存の検出
    console.log('\n🔄 循環依存チェック:');
    for (const [file, imports] of Object.entries(importGraph)) {
      const visited = new Set();
      const stack = new Set();
      
      function hasCycle(currentFile) {
        if (stack.has(currentFile)) {
          return true; // 循環発見
        }
        
        if (visited.has(currentFile)) {
          return false;
        }
        
        visited.add(currentFile);
        stack.add(currentFile);
        
        const fileImports = importGraph[currentFile] || [];
        for (const imp of fileImports) {
          if (imp.type === 'relative') {
            const basePath = path.dirname(path.resolve(currentFile));
            const resolvedPath = path.resolve(basePath, imp.module);
            const normalizedPath = path.relative(process.cwd(), resolvedPath);
            
            if (hasCycle(normalizedPath)) {
              circularDependencies.push({
                from: currentFile,
                to: normalizedPath,
                module: imp.module
              });
              return true;
            }
          }
        }
        
        stack.delete(currentFile);
        return false;
      }
      
      hasCycle(file);
    }
    
    if (circularDependencies.length > 0) {
      console.log('⚠️ 循環依存が検出されました:');
      for (const cycle of circularDependencies) {
        console.log(`   ${cycle.from} → ${cycle.to} (${cycle.module})`);
      }
    } else {
      console.log('✅ 循環依存は検出されませんでした');
    }
    
    // パッケージ.json のエクスポート設定確認
    console.log('\n📦 package.json設定確認:');
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      console.log('type:', packageJson.type);
      console.log('main:', packageJson.main);
      if (packageJson.exports) {
        console.log('exports:', JSON.stringify(packageJson.exports, null, 2));
      }
      if (packageJson.imports) {
        console.log('imports:', JSON.stringify(packageJson.imports, null, 2));
      }
    } catch (error) {
      console.log('package.json確認エラー:', error.message);
    }
    
    // ディレクトリ別importパターン分析
    console.log('\n📁 ディレクトリ別importパターン:');
    const patterns = {};
    
    for (const [file, imports] of Object.entries(importGraph)) {
      const dir = path.dirname(file);
      if (!patterns[dir]) patterns[dir] = { npm: 0, relative: 0, builtin: 0 };
      
      for (const imp of imports) {
        patterns[dir][imp.type]++;
      }
    }
    
    for (const [dir, counts] of Object.entries(patterns)) {
      console.log(`   ${dir}:`);
      console.log(`     npm: ${counts.npm}, relative: ${counts.relative}, builtin: ${counts.builtin}`);
    }
    
  } catch (error) {
    console.error('Import構造分析エラー:', error);
    process.exit(1);
  }
}

function extractImports(code) {
  const imports = [];
  
  // ES6 import文のパターン
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*)?)+\s+from\s+['"`]([^'"`]+)['"`]/g;
  const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  
  let match;
  
  // 静的import
  while ((match = importRegex.exec(code)) !== null) {
    const module = match[1];
    const importStatement = match[0];
    const imports_detail = extractImportDetails(importStatement);
    
    imports.push({
      module,
      type: categorizeImport(module),
      imports: imports_detail,
      statement: importStatement
    });
  }
  
  // 動的import
  while ((match = dynamicImportRegex.exec(code)) !== null) {
    const module = match[1];
    imports.push({
      module,
      type: categorizeImport(module),
      imports: ['dynamic'],
      statement: match[0]
    });
  }
  
  return imports;
}

function extractImportDetails(importStatement) {
  const details = [];
  
  // デフォルトimport
  const defaultMatch = importStatement.match(/import\s+(\w+)/);
  if (defaultMatch) {
    details.push(defaultMatch[1] + ' (default)');
  }
  
  // 名前付きimport
  const namedMatch = importStatement.match(/\{([^}]+)\}/);
  if (namedMatch) {
    const named = namedMatch[1].split(',').map(s => s.trim());
    details.push(...named);
  }
  
  // namespace import
  const namespaceMatch = importStatement.match(/\*\s+as\s+(\w+)/);
  if (namespaceMatch) {
    details.push(namespaceMatch[1] + ' (namespace)');
  }
  
  return details;
}

function categorizeImport(module) {
  // 相対パス
  if (module.startsWith('./') || module.startsWith('../')) {
    return 'relative';
  }
  
  // Node.js内蔵モジュール
  const builtinModules = [
    'fs', 'path', 'url', 'util', 'crypto', 'os', 'process',
    'fs/promises', 'child_process', 'stream', 'events'
  ];
  
  if (builtinModules.includes(module)) {
    return 'builtin';
  }
  
  // npmモジュール
  return 'npm';
}

analyzeImportStructure();
