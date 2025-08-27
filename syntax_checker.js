// syntax_checker.js - 全体構文エラー検査
console.log('=== MCPサーバープログラム全体構文エラー検査 ===');

import fs from 'fs/promises';
import path from 'path';

// 検査対象ファイルリスト
const targetFiles = [
  // メインエントリポイント
  'src/mcp_server_stdio_v4.js',
  
  // コアサーバー
  'src/mcp/server.js',
  
  // サービス層
  'src/services/TaskManager.js',
  'src/services/DataManager.js',
  
  // ユーティリティ
  'src/utils/logger.js',
  'src/utils/errors.js',
  'src/utils/mcpErrors.js',
  
  // バリデーター
  'src/validators/PhysicsValidator.js',
  'src/validators/ManifestValidator.js',
  'src/validators/TransformValidator.js',
  'src/validators/NuclideValidator.js',
  'src/validators/SourceValidator.js',
  'src/validators/DetectorValidator.js',
  'src/validators/UnitValidator.js',
  
  // MCP Tools
  'src/mcp/tools/index.js',
  'src/mcp/tools/bodyTools.js',
  'src/mcp/tools/zoneTools.js',
  'src/mcp/tools/transformTools.js',
  'src/mcp/tools/buildupFactorTools.js',
  'src/mcp/tools/sourceTools.js',
  'src/mcp/tools/detectorTools.js',
  'src/mcp/tools/commonTools.js',
  'src/mcp/tools/unitTools.js',
  
  // MCP Handlers
  'src/mcp/handlers/index.js',
  'src/mcp/handlers/bodyHandlers.js',
  'src/mcp/handlers/zoneHandlers.js',
  'src/mcp/handlers/transformHandlers.js',
  'src/mcp/handlers/buildupFactorHandlers.js',
  'src/mcp/handlers/sourceHandlers.js',
  'src/mcp/handlers/detectorHandlers.js',
  'src/mcp/handlers/unitHandlers.js',
  
  // MCP Middleware
  'src/mcp/middleware/errorHandler.js',
  'src/mcp/middleware/requestValidator.js'
];

class SyntaxChecker {
  constructor() {
    this.results = {
      totalFiles: 0,
      checkedFiles: 0,
      syntaxErrors: [],
      importErrors: [],
      logicErrors: [],
      warnings: [],
      successFiles: []
    };
  }

  async checkAllFiles() {
    console.log(`📁 検査対象ファイル数: ${targetFiles.length}`);
    this.results.totalFiles = targetFiles.length;
    
    for (const file of targetFiles) {
      await this.checkSingleFile(file);
    }
    
    this.generateReport();
  }

  async checkSingleFile(filePath) {
    console.log(`\n📄 検査中: ${filePath}`);
    
    try {
      // ファイル存在確認
      await fs.access(filePath);
      
      // ファイル内容読み込み
      const content = await fs.readFile(filePath, 'utf8');
      
      // 基本的な構文チェック
      await this.performSyntaxChecks(filePath, content);
      
      // importテスト
      await this.testImport(filePath);
      
      console.log(`✅ ${filePath} - 構文OK`);
      this.results.successFiles.push(filePath);
      this.results.checkedFiles++;
      
    } catch (error) {
      console.log(`❌ ${filePath} - エラー検出`);
      await this.analyzeError(filePath, error);
      this.results.checkedFiles++;
    }
  }

  async performSyntaxChecks(filePath, content) {
    const issues = [];
    
    // 1. 基本的な括弧バランスチェック
    const bracketIssues = this.checkBracketBalance(content);
    if (bracketIssues.length > 0) {
      issues.push(...bracketIssues.map(issue => ({ type: 'bracket', ...issue })));
    }
    
    // 2. import/export文チェック
    const importIssues = this.checkImportExport(content);
    if (importIssues.length > 0) {
      issues.push(...importIssues.map(issue => ({ type: 'import', ...issue })));
    }
    
    // 3. 関数/メソッド構文チェック
    const functionIssues = this.checkFunctions(content);
    if (functionIssues.length > 0) {
      issues.push(...functionIssues.map(issue => ({ type: 'function', ...issue })));
    }
    
    // 4. クラス構文チェック
    const classIssues = this.checkClasses(content);
    if (classIssues.length > 0) {
      issues.push(...classIssues.map(issue => ({ type: 'class', ...issue })));
    }
    
    // 5. ES6+ 構文チェック
    const es6Issues = this.checkES6Syntax(content);
    if (es6Issues.length > 0) {
      issues.push(...es6Issues.map(issue => ({ type: 'es6', ...issue })));
    }
    
    if (issues.length > 0) {
      this.results.syntaxErrors.push({
        file: filePath,
        issues: issues
      });
      
      throw new Error(`構文エラー検出: ${issues.length}個の問題`);
    }
  }

  checkBracketBalance(content) {
    const issues = [];
    const brackets = {
      '(': { close: ')', count: 0 },
      '[': { close: ']', count: 0 },
      '{': { close: '}', count: 0 }
    };
    
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (brackets[char]) {
          brackets[char].count++;
        } else if (Object.values(brackets).some(b => b.close === char)) {
          const openBracket = Object.keys(brackets).find(k => brackets[k].close === char);
          if (brackets[openBracket].count > 0) {
            brackets[openBracket].count--;
          } else {
            issues.push({
              line: lineNum + 1,
              column: i + 1,
              message: `閉じ括弧 '${char}' に対応する開き括弧がありません`
            });
          }
        }
      }
    }
    
    // 未閉じ括弧チェック
    for (const [open, info] of Object.entries(brackets)) {
      if (info.count > 0) {
        issues.push({
          line: 'EOF',
          message: `未閉じの '${open}' が ${info.count}個あります`
        });
      }
    }
    
    return issues;
  }

  checkImportExport(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      
      // import文チェック
      if (line.startsWith('import ')) {
        if (!line.includes('from ') && !line.match(/^import\s+['"`]/)) {
          issues.push({
            line: lineNum + 1,
            message: 'import文の構文が不正です'
          });
        }
        
        // 相対パスチェック
        const pathMatch = line.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            if (!importPath.endsWith('.js')) {
              this.results.warnings.push({
                file: 'current',
                line: lineNum + 1,
                message: `相対importで.js拡張子がありません: ${importPath}`
              });
            }
          }
        }
      }
      
      // export文チェック
      if (line.startsWith('export ')) {
        if (!line.match(/^export\s+(default\s+|const\s+|let\s+|var\s+|function\s+|class\s+|\{)/)) {
          issues.push({
            line: lineNum + 1,
            message: 'export文の構文が不正です'
          });
        }
      }
    }
    
    return issues;
  }

  checkFunctions(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      
      // 関数定義チェック
      if (line.match(/^\s*(async\s+)?function\s+/)) {
        if (!line.includes('(') || !line.includes(')')) {
          issues.push({
            line: lineNum + 1,
            message: '関数定義の括弧が不正です'
          });
        }
      }
      
      // アロー関数チェック
      if (line.includes('=>')) {
        const arrowPos = line.indexOf('=>');
        const beforeArrow = line.substring(0, arrowPos).trim();
        
        if (!beforeArrow.includes('(') && !beforeArrow.match(/^\w+$/)) {
          issues.push({
            line: lineNum + 1,
            message: 'アロー関数の引数部分が不正です'
          });
        }
      }
      
      // メソッド定義チェック（クラス内）
      if (line.match(/^\s*(async\s+)?\w+\s*\(/)) {
        if (!line.includes(')')) {
          issues.push({
            line: lineNum + 1,
            message: 'メソッド定義の括弧が不完全です'
          });
        }
      }
    }
    
    return issues;
  }

  checkClasses(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      
      // クラス定義チェック
      if (line.startsWith('class ')) {
        if (!line.includes('{') && !lines[lineNum + 1]?.trim().startsWith('{')) {
          issues.push({
            line: lineNum + 1,
            message: 'クラス定義の開き括弧が見つかりません'
          });
        }
        
        const className = line.match(/class\s+(\w+)/);
        if (!className) {
          issues.push({
            line: lineNum + 1,
            message: 'クラス名が不正です'
          });
        }
      }
      
      // constructor チェック
      if (line.includes('constructor(')) {
        if (!line.includes(')')) {
          issues.push({
            line: lineNum + 1,
            message: 'constructor定義の括弧が不完全です'
          });
        }
      }
    }
    
    return issues;
  }

  checkES6Syntax(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      
      // テンプレートリテラルチェック
      const backtickCount = (line.match(/`/g) || []).length;
      if (backtickCount % 2 !== 0) {
        issues.push({
          line: lineNum + 1,
          message: 'テンプレートリテラルの閉じバッククォートが不足している可能性があります'
        });
      }
      
      // 分割代入チェック
      if (line.match(/const\s*\{[^}]*\}\s*=/) || line.match(/const\s*\[[^\]]*\]\s*=/)) {
        if (!line.includes('=')) {
          issues.push({
            line: lineNum + 1,
            message: '分割代入の構文が不正です'
          });
        }
      }
      
      // async/await チェック
      if (line.includes('await ') && !content.includes('async')) {
        this.results.warnings.push({
          file: 'current',
          line: lineNum + 1,
          message: 'awaitがasync関数外で使用されている可能性があります'
        });
      }
    }
    
    return issues;
  }

  async testImport(filePath) {
    try {
      // Node.js での動的importテスト
      await import(path.resolve(filePath));
    } catch (error) {
      this.results.importErrors.push({
        file: filePath,
        error: error.message,
        type: error.constructor.name
      });
      throw error;
    }
  }

  async analyzeError(filePath, error) {
    const errorInfo = {
      file: filePath,
      type: error.constructor.name,
      message: error.message
    };
    
    if (error.message.includes('SyntaxError')) {
      this.results.syntaxErrors.push(errorInfo);
    } else if (error.message.includes('Cannot resolve') || error.message.includes('Module not found')) {
      this.results.importErrors.push(errorInfo);
    } else {
      this.results.logicErrors.push(errorInfo);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MCPサーバープログラム構文検査結果');
    console.log('='.repeat(60));
    
    console.log(`\n📈 検査統計:`);
    console.log(`   対象ファイル数: ${this.results.totalFiles}`);
    console.log(`   検査完了ファイル数: ${this.results.checkedFiles}`);
    console.log(`   成功ファイル数: ${this.results.successFiles.length}`);
    
    // エラー概要
    console.log(`\n⚠️  エラー概要:`);
    console.log(`   構文エラー: ${this.results.syntaxErrors.length}ファイル`);
    console.log(`   importエラー: ${this.results.importErrors.length}ファイル`);
    console.log(`   論理エラー: ${this.results.logicErrors.length}ファイル`);
    console.log(`   警告: ${this.results.warnings.length}件`);
    
    // 構文エラー詳細
    if (this.results.syntaxErrors.length > 0) {
      console.log(`\n❌ 構文エラー詳細:`);
      for (const error of this.results.syntaxErrors) {
        console.log(`\n📄 ${error.file}:`);
        if (error.issues) {
          for (const issue of error.issues) {
            console.log(`   ${issue.type} - Line ${issue.line}: ${issue.message}`);
          }
        } else {
          console.log(`   ${error.message}`);
        }
      }
    }
    
    // importエラー詳細
    if (this.results.importErrors.length > 0) {
      console.log(`\n🔗 Importエラー詳細:`);
      for (const error of this.results.importErrors) {
        console.log(`\n📄 ${error.file}:`);
        console.log(`   ${error.type}: ${error.message}`);
      }
    }
    
    // 論理エラー詳細
    if (this.results.logicErrors.length > 0) {
      console.log(`\n🧠 論理エラー詳細:`);
      for (const error of this.results.logicErrors) {
        console.log(`\n📄 ${error.file}:`);
        console.log(`   ${error.type}: ${error.message}`);
      }
    }
    
    // 警告詳細
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  警告詳細:`);
      for (const warning of this.results.warnings) {
        console.log(`   Line ${warning.line}: ${warning.message}`);
      }
    }
    
    // 成功ファイル一覧
    if (this.results.successFiles.length > 0) {
      console.log(`\n✅ 構文OK ファイル一覧:`);
      for (const file of this.results.successFiles) {
        console.log(`   ✅ ${file}`);
      }
    }
    
    // 総合判定
    console.log(`\n` + '='.repeat(60));
    const totalErrors = this.results.syntaxErrors.length + 
                       this.results.importErrors.length + 
                       this.results.logicErrors.length;
    
    if (totalErrors === 0) {
      console.log(`🎉 総合判定: すべてのファイルが構文的に正常です！`);
      console.log(`📊 成功率: ${((this.results.successFiles.length / this.results.totalFiles) * 100).toFixed(1)}%`);
    } else {
      console.log(`⚠️  総合判定: ${totalErrors}個のファイルに問題があります`);
      console.log(`📊 成功率: ${((this.results.successFiles.length / this.results.totalFiles) * 100).toFixed(1)}%`);
    }
    
    if (this.results.warnings.length > 0) {
      console.log(`💡 ${this.results.warnings.length}件の警告があります（動作には影響しない可能性があります）`);
    }
    
    console.log('='.repeat(60));
  }
}

// 検査実行
async function runSyntaxCheck() {
  const checker = new SyntaxChecker();
  await checker.checkAllFiles();
}

runSyntaxCheck().catch(error => {
  console.error('検査実行エラー:', error);
  process.exit(1);
});
