// corrected_syntax_checker.js - 修正された構文検査ツール（Windows対応）
console.log('=== 修正版：MCPサーバープログラム構文検査 ===');

import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

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
  
  // バリデーター（主要なもの）
  'src/validators/PhysicsValidator.js',
  'src/validators/ManifestValidator.js',
  'src/validators/UnitValidator.js',
  
  // MCP Tools（主要なもの）
  'src/mcp/tools/index.js',
  'src/mcp/tools/commonTools.js',
  'src/mcp/tools/unitTools.js',
  
  // MCP Handlers（主要なもの）
  'src/mcp/handlers/index.js',
  'src/mcp/handlers/unitHandlers.js',
  
  // MCP Middleware
  'src/mcp/middleware/errorHandler.js'
];

class CorrectedSyntaxChecker {
  constructor() {
    this.results = {
      totalFiles: 0,
      checkedFiles: 0,
      syntaxErrors: [],
      importErrors: [],
      successFiles: [],
      warnings: []
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
      const staticIssues = this.performStaticSyntaxCheck(filePath, content);
      
      if (staticIssues.length > 0) {
        this.results.syntaxErrors.push({
          file: filePath,
          issues: staticIssues
        });
        console.log(`⚠️  ${filePath} - ${staticIssues.length}個の構文問題`);
      } else {
        // 動的importテスト
        await this.testDynamicImport(filePath);
        console.log(`✅ ${filePath} - 構文OK`);
        this.results.successFiles.push(filePath);
      }
      
      this.results.checkedFiles++;
      
    } catch (error) {
      console.log(`❌ ${filePath} - エラー: ${error.message.slice(0, 100)}...`);
      this.categorizeError(filePath, error);
      this.results.checkedFiles++;
    }
  }

  performStaticSyntaxCheck(filePath, content) {
    const issues = [];
    const lines = content.split('\n');
    
    // 1. 括弧バランスチェック
    const bracketIssues = this.checkBracketBalance(content, lines);
    issues.push(...bracketIssues);
    
    // 2. try-catch ペアチェック
    const tryCatchIssues = this.checkTryCatchPairs(content, lines);
    issues.push(...tryCatchIssues);
    
    // 3. 関数・メソッド構文チェック
    const functionIssues = this.checkFunctionSyntax(content, lines);
    issues.push(...functionIssues);
    
    // 4. import/export 文チェック
    const moduleIssues = this.checkModuleSyntax(content, lines);
    issues.push(...moduleIssues);
    
    // 5. クラス構文チェック
    const classIssues = this.checkClassSyntax(content, lines);
    issues.push(...classIssues);
    
    return issues;
  }

  checkBracketBalance(content, lines) {
    const issues = [];
    const stack = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };
    
    let lineNum = 0;
    let inString = false;
    let stringChar = null;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '\n') lineNum++;
      
      // 文字列内かチェック
      if ((char === '"' || char === "'" || char === '`') && content[i-1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
      }
      
      if (inString) continue;
      
      // 開き括弧
      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1, pos: i });
      }
      // 閉じ括弧
      else if (Object.values(pairs).includes(char)) {
        const expectedOpen = Object.keys(pairs).find(k => pairs[k] === char);
        const last = stack.pop();
        
        if (!last || last.char !== expectedOpen) {
          issues.push({
            type: 'bracket-mismatch',
            line: lineNum + 1,
            message: `予期しない閉じ括弧 '${char}' または対応する開き括弧がありません`
          });
        }
      }
    }
    
    // 未閉じ括弧
    for (const item of stack) {
      issues.push({
        type: 'unclosed-bracket',
        line: item.line,
        message: `未閉じの '${item.char}'`
      });
    }
    
    return issues;
  }

  checkTryCatchPairs(content, lines) {
    const issues = [];
    const tryPositions = [];
    const catchPositions = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.match(/^\s*try\s*\{/) || line === 'try {') {
        tryPositions.push(i + 1);
      }
      
      if (line.match(/^\s*\}\s*catch\s*\(/) || line.includes('} catch')) {
        catchPositions.push(i + 1);
      }
    }
    
    // try-catch のペアチェック
    if (tryPositions.length !== catchPositions.length) {
      issues.push({
        type: 'try-catch-mismatch',
        line: tryPositions.length > 0 ? tryPositions[0] : 1,
        message: `try ブロック数(${tryPositions.length})と catch ブロック数(${catchPositions.length})が一致しません`
      });
    }
    
    return issues;
  }

  checkFunctionSyntax(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 関数定義パターン
      const functionPatterns = [
        /^\s*(async\s+)?function\s+\w+\s*\(/,
        /^\s*(async\s+)?\w+\s*\([^)]*\)\s*\{/,
        /^\s*\w+\s*:\s*(async\s+)?function\s*\(/,
      ];
      
      for (const pattern of functionPatterns) {
        if (pattern.test(line)) {
          // 基本的な括弧チェック
          const openParens = (line.match(/\(/g) || []).length;
          const closeParens = (line.match(/\)/g) || []).length;
          
          if (openParens > closeParens) {
            // 次の行もチェック
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim();
              const nextCloseParens = (nextLine.match(/\)/g) || []).length;
              if (openParens > closeParens + nextCloseParens) {
                issues.push({
                  type: 'function-syntax',
                  line: i + 1,
                  message: '関数定義の括弧が不完全です'
                });
              }
            } else {
              issues.push({
                type: 'function-syntax',
                line: i + 1,
                message: '関数定義の括弧が不完全です'
              });
            }
          }
        }
      }
      
      // メソッド定義の特別チェック
      if (line.match(/^\s*\w+\s*\(/)) {
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        const openBraces = (line.match(/\{/g) || []).length;
        
        if (openParens > closeParens && openBraces === 0) {
          issues.push({
            type: 'method-syntax',
            line: i + 1,
            message: 'メソッド定義の括弧が不完全な可能性があります'
          });
        }
      }
    }
    
    return issues;
  }

  checkModuleSyntax(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // import文チェック
      if (line.startsWith('import ')) {
        if (!line.includes('from ') && !line.match(/^import\s+['"`]/)) {
          issues.push({
            type: 'import-syntax',
            line: i + 1,
            message: 'import文の構文が不正です'
          });
        }
      }
      
      // export文チェック
      if (line.startsWith('export ')) {
        if (!line.match(/^export\s+(default\s+|const\s+|let\s+|var\s+|function\s+|class\s+|async\s+function\s+|\{)/)) {
          issues.push({
            type: 'export-syntax',
            line: i + 1,
            message: 'export文の構文が不正です'
          });
        }
      }
    }
    
    return issues;
  }

  checkClassSyntax(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // クラス定義チェック
      if (line.startsWith('class ')) {
        const classMatch = line.match(/class\s+(\w+)/);
        if (!classMatch) {
          issues.push({
            type: 'class-syntax',
            line: i + 1,
            message: 'クラス定義の構文が不正です'
          });
        }
      }
    }
    
    return issues;
  }

  async testDynamicImport(filePath) {
    try {
      // Windows パス対応：絶対パスをfile://URLに変換
      const absolutePath = path.resolve(filePath);
      const fileUrl = pathToFileURL(absolutePath).href;
      
      // 動的import実行
      await import(fileUrl);
    } catch (error) {
      // importエラーの場合は例外を投げる
      if (error.message.includes('SyntaxError')) {
        throw new Error(`構文エラー: ${error.message}`);
      } else {
        throw new Error(`インポートエラー: ${error.message}`);
      }
    }
  }

  categorizeError(filePath, error) {
    const errorInfo = {
      file: filePath,
      message: error.message,
      type: error.constructor.name
    };
    
    if (error.message.includes('SyntaxError') || 
        error.message.includes('構文エラー')) {
      this.results.syntaxErrors.push(errorInfo);
    } else {
      this.results.importErrors.push(errorInfo);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 修正版MCPサーバープログラム構文検査結果');
    console.log('='.repeat(60));
    
    console.log(`\n📈 検査統計:`);
    console.log(`   対象ファイル数: ${this.results.totalFiles}`);
    console.log(`   検査完了ファイル数: ${this.results.checkedFiles}`);
    console.log(`   成功ファイル数: ${this.results.successFiles.length}`);
    
    const successRate = ((this.results.successFiles.length / this.results.totalFiles) * 100).toFixed(1);
    console.log(`   成功率: ${successRate}%`);
    
    // エラー概要
    console.log(`\n⚠️  エラー概要:`);
    console.log(`   構文エラー: ${this.results.syntaxErrors.length}ファイル`);
    console.log(`   インポートエラー: ${this.results.importErrors.length}ファイル`);
    
    // 構文エラー詳細
    if (this.results.syntaxErrors.length > 0) {
      console.log(`\n❌ 構文エラー詳細:`);
      for (const errorFile of this.results.syntaxErrors) {
        console.log(`\n📄 ${errorFile.file}:`);
        if (errorFile.issues) {
          for (const issue of errorFile.issues) {
            console.log(`   Line ${issue.line}: [${issue.type}] ${issue.message}`);
          }
        } else {
          console.log(`   ${errorFile.message}`);
        }
      }
    }
    
    // インポートエラー詳細
    if (this.results.importErrors.length > 0) {
      console.log(`\n🔗 インポートエラー詳細:`);
      for (const error of this.results.importErrors.slice(0, 5)) { // 最大5個まで表示
        console.log(`\n📄 ${path.basename(error.file)}:`);
        const shortMessage = error.message.length > 100 ? 
          error.message.substring(0, 100) + '...' : error.message;
        console.log(`   ${shortMessage}`);
      }
      
      if (this.results.importErrors.length > 5) {
        console.log(`   ... 他 ${this.results.importErrors.length - 5}個のインポートエラー`);
      }
    }
    
    // 成功ファイル一覧
    if (this.results.successFiles.length > 0) {
      console.log(`\n✅ 構文OK ファイル一覧:`);
      for (const file of this.results.successFiles) {
        console.log(`   ✅ ${path.basename(file)}`);
      }
    }
    
    // 総合判定
    console.log(`\n` + '='.repeat(60));
    const totalIssues = this.results.syntaxErrors.length;
    
    if (totalIssues === 0) {
      console.log(`🎉 総合判定: 検査対象ファイルの構文は正常です！`);
      if (this.results.importErrors.length > 0) {
        console.log(`💡 インポートエラーは依存関係の問題である可能性があります`);
      }
    } else {
      console.log(`⚠️  総合判定: ${totalIssues}個のファイルに構文問題があります`);
    }
    
    console.log('='.repeat(60));
  }
}

// 検査実行
async function runCorrectedSyntaxCheck() {
  const checker = new CorrectedSyntaxChecker();
  await checker.checkAllFiles();
}

runCorrectedSyntaxCheck().catch(error => {
  console.error('検査実行エラー:', error);
  process.exit(1);
});
