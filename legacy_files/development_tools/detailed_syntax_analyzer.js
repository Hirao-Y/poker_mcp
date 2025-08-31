// detailed_syntax_analyzer.js - 詳細構文解析
console.log('=== 詳細構文解析ツール ===');

import fs from 'fs/promises';
import path from 'path';

class DetailedSyntaxAnalyzer {
  constructor() {
    this.patterns = {
      // よくある構文エラーパターン
      missingTry: /catch\s*\([^)]*\)\s*\{[^}]*\}/g,
      missingCatch: /try\s*\{[^}]*\}\s*(?!catch)/g,
      unclosedStrings: /(['"`])[^'"`]*(?!\1)/g,
      missingCommas: /\}\s*\{/g,
      asyncAwaitIssues: /await\s+(?![\w$])/g,
      arrowFunctionIssues: /=>\s*{[^}]*(?!})/g,
      templateLiteralIssues: /`[^`]*(?!`)/g
    };
    
    this.results = [];
  }

  async analyzeFile(filePath) {
    console.log(`\n🔍 詳細分析: ${filePath}`);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const fileResult = {
        file: filePath,
        issues: [],
        complexity: this.calculateComplexity(content),
        metrics: this.calculateMetrics(content)
      };
      
      // パターンマッチング検査
      await this.patternAnalysis(content, lines, fileResult);
      
      // AST風構造解析
      await this.structureAnalysis(content, lines, fileResult);
      
      // 特定構文チェック
      await this.specificSyntaxCheck(content, lines, fileResult);
      
      this.results.push(fileResult);
      
      if (fileResult.issues.length === 0) {
        console.log(`✅ ${path.basename(filePath)} - 構文問題なし`);
      } else {
        console.log(`⚠️  ${path.basename(filePath)} - ${fileResult.issues.length}個の潜在的問題`);
      }
      
    } catch (error) {
      console.error(`❌ ${filePath} - 読み込みエラー: ${error.message}`);
    }
  }

  async patternAnalysis(content, lines, result) {
    // try-catch ブロックの整合性
    const tryBlocks = (content.match(/try\s*\{/g) || []).length;
    const catchBlocks = (content.match(/catch\s*\(/g) || []).length;
    
    if (tryBlocks !== catchBlocks) {
      result.issues.push({
        type: 'try-catch-mismatch',
        severity: 'high',
        message: `try ブロック数(${tryBlocks})と catch ブロック数(${catchBlocks})が一致しません`
      });
    }
    
    // 括弧バランスの詳細チェック
    const bracketBalance = this.checkDetailedBracketBalance(content);
    if (bracketBalance.issues.length > 0) {
      result.issues.push(...bracketBalance.issues);
    }
    
    // テンプレートリテラル構文
    const templateLiteralIssues = this.checkTemplateLiterals(content, lines);
    if (templateLiteralIssues.length > 0) {
      result.issues.push(...templateLiteralIssues);
    }
  }

  async structureAnalysis(content, lines, result) {
    // クラス構造の整合性
    const classIssues = this.analyzeClassStructure(content, lines);
    if (classIssues.length > 0) {
      result.issues.push(...classIssues);
    }
    
    // 関数構造の整合性
    const functionIssues = this.analyzeFunctionStructure(content, lines);
    if (functionIssues.length > 0) {
      result.issues.push(...functionIssues);
    }
    
    // import/export構造
    const moduleIssues = this.analyzeModuleStructure(content, lines);
    if (moduleIssues.length > 0) {
      result.issues.push(...moduleIssues);
    }
  }

  async specificSyntaxCheck(content, lines, result) {
    // ES6+ 構文の正確性
    const es6Issues = this.checkES6Syntax(content, lines);
    if (es6Issues.length > 0) {
      result.issues.push(...es6Issues);
    }
    
    // 非同期処理構文
    const asyncIssues = this.checkAsyncPatterns(content, lines);
    if (asyncIssues.length > 0) {
      result.issues.push(...asyncIssues);
    }
    
    // エラーハンドリング構文
    const errorHandlingIssues = this.checkErrorHandling(content, lines);
    if (errorHandlingIssues.length > 0) {
      result.issues.push(...errorHandlingIssues);
    }
  }

  checkDetailedBracketBalance(content) {
    const brackets = [];
    const issues = [];
    const stack = [];
    
    const bracketPairs = {
      '(': ')', '[': ']', '{': '}',
      "'": "'", '"': '"', '`': '`'
    };
    
    let inString = false;
    let stringChar = null;
    let escaped = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = content[i - 1];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\') {
        escaped = true;
        continue;
      }
      
      // 文字列処理
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
        stack.push({ char, pos: i, type: 'string' });
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = null;
        stack.pop();
      } else if (inString) {
        continue;
      }
      
      // 括弧処理
      if (bracketPairs[char] && !inString) {
        stack.push({ char, pos: i, type: 'bracket' });
      } else if (Object.values(bracketPairs).includes(char) && !inString) {
        const expectedOpen = Object.keys(bracketPairs).find(k => bracketPairs[k] === char);
        const last = stack[stack.length - 1];
        
        if (!last || last.char !== expectedOpen) {
          const line = content.substring(0, i).split('\n').length;
          issues.push({
            type: 'bracket-mismatch',
            severity: 'high',
            line: line,
            message: `予期しない閉じ括弧 '${char}' (位置: ${i})`
          });
        } else {
          stack.pop();
        }
      }
    }
    
    // 未閉じ括弧
    for (const item of stack) {
      const line = content.substring(0, item.pos).split('\n').length;
      issues.push({
        type: 'unclosed-bracket',
        severity: 'high',
        line: line,
        message: `未閉じの '${item.char}' (位置: ${item.pos})`
      });
    }
    
    return { issues };
  }

  checkTemplateLiterals(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const backticks = line.match(/`/g);
      
      if (backticks && backticks.length % 2 !== 0) {
        // 複数行テンプレートリテラルの可能性をチェック
        let openBackticks = 0;
        for (let j = 0; j <= i; j++) {
          const checkLine = lines[j];
          const ticksInLine = (checkLine.match(/`/g) || []).length;
          openBackticks += ticksInLine;
        }
        
        if (openBackticks % 2 !== 0 && !this.isMultilineTemplate(lines, i)) {
          issues.push({
            type: 'template-literal-unclosed',
            severity: 'medium',
            line: i + 1,
            message: 'テンプレートリテラルが適切に閉じられていない可能性があります'
          });
        }
      }
      
      // テンプレート内の式チェック
      const templateExpressions = line.match(/\$\{[^}]*\}/g);
      if (templateExpressions) {
        for (const expr of templateExpressions) {
          if (!expr.endsWith('}')) {
            issues.push({
              type: 'template-expression-unclosed',
              severity: 'high',
              line: i + 1,
              message: `テンプレート式が閉じられていません: ${expr}`
            });
          }
        }
      }
    }
    
    return issues;
  }

  analyzeClassStructure(content, lines) {
    const issues = [];
    const classRegex = /^(\s*)class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{?/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(classRegex);
      
      if (match) {
        const className = match[2];
        const indentation = match[1];
        
        // コンストラクター存在チェック
        let hasConstructor = false;
        let braceLevel = 0;
        let inClass = true;
        
        for (let j = i + 1; j < lines.length && inClass; j++) {
          const checkLine = lines[j];
          
          braceLevel += (checkLine.match(/\{/g) || []).length;
          braceLevel -= (checkLine.match(/\}/g) || []).length;
          
          if (braceLevel < 0) {
            inClass = false;
          }
          
          if (checkLine.trim().startsWith('constructor(')) {
            hasConstructor = true;
          }
          
          // メソッド構文チェック
          const methodMatch = checkLine.match(/^\s*(async\s+)?(\w+)\s*\(/);
          if (methodMatch && !checkLine.includes('function')) {
            const methodName = methodMatch[2];
            if (methodName !== 'constructor' && !checkLine.includes('{')) {
              const nextLine = lines[j + 1];
              if (!nextLine || !nextLine.trim().startsWith('{')) {
                issues.push({
                  type: 'method-syntax-error',
                  severity: 'high',
                  line: j + 1,
                  message: `メソッド ${methodName} の開き括弧が見つかりません`
                });
              }
            }
          }
        }
        
        // 警告: コンストラクターがない場合（必須ではないが推奨）
        if (!hasConstructor && className !== 'Error') {
          issues.push({
            type: 'missing-constructor',
            severity: 'low',
            line: i + 1,
            message: `クラス ${className} にコンストラクターがありません（推奨）`
          });
        }
      }
    }
    
    return issues;
  }

  analyzeFunctionStructure(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 関数定義パターンチェック
      const functionPatterns = [
        /^(\s*)(async\s+)?function\s+(\w+)\s*\(/,
        /^(\s*)(\w+)\s*:\s*(async\s+)?function\s*\(/,
        /^(\s*)(async\s+)?(\w+)\s*\(/,  // メソッド形式
        /^(\s*)const\s+(\w+)\s*=\s*(async\s+)?\(/,  // アロー関数
        /^(\s*)const\s+(\w+)\s*=\s*(async\s+)?function/
      ];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          // 関数の括弧バランスチェック
          if (!this.checkFunctionParentheses(line)) {
            issues.push({
              type: 'function-parentheses-mismatch',
              severity: 'high',
              line: i + 1,
              message: '関数定義の括弧が正しくありません'
            });
          }
          
          // async関数でのawait使用チェック
          if (match[2] && match[2].includes('async')) {
            if (!this.checkAsyncFunction(lines, i)) {
              issues.push({
                type: 'async-without-await',
                severity: 'low',
                line: i + 1,
                message: 'async関数内でawaitが使用されていません（必須ではありませんが確認推奨）'
              });
            }
          }
        }
      }
    }
    
    return issues;
  }

  analyzeModuleStructure(content, lines) {
    const issues = [];
    const imports = [];
    const exports = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // import文解析
      if (line.startsWith('import ')) {
        imports.push({ line: i + 1, content: line });
        
        // 構文チェック
        if (!line.includes('from ') && !line.match(/^import\s+['"`]/)) {
          issues.push({
            type: 'invalid-import-syntax',
            severity: 'high',
            line: i + 1,
            message: 'import文の構文が無効です'
          });
        }
        
        // 相対パスチェック
        const pathMatch = line.match(/from\s+['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          const importPath = pathMatch[1];
          if ((importPath.startsWith('./') || importPath.startsWith('../'))) {
            if (!importPath.endsWith('.js')) {
              issues.push({
                type: 'missing-js-extension',
                severity: 'medium',
                line: i + 1,
                message: `相対import "${importPath}" に.js拡張子がありません`
              });
            }
          }
        }
      }
      
      // export文解析
      if (line.startsWith('export ')) {
        exports.push({ line: i + 1, content: line });
        
        // export構文チェック
        if (!line.match(/^export\s+(default\s+|const\s+|let\s+|var\s+|function\s+|class\s+|async\s+function\s+|\{)/)) {
          issues.push({
            type: 'invalid-export-syntax',
            severity: 'high',
            line: i + 1,
            message: 'export文の構文が無効です'
          });
        }
      }
    }
    
    // モジュール構造の推奨チェック
    if (imports.length === 0 && exports.length === 0) {
      issues.push({
        type: 'no-module-pattern',
        severity: 'info',
        line: 1,
        message: 'このファイルはモジュールパターンを使用していません（問題ない場合もあります）'
      });
    }
    
    return issues;
  }

  checkES6Syntax(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 分割代入チェック
      const destructuringMatches = [
        line.match(/const\s*\{([^}]*)\}\s*=/),
        line.match(/const\s*\[([^\]]*)\]\s*=/),
        line.match(/let\s*\{([^}]*)\}\s*=/),
        line.match(/let\s*\[([^\]]*)\]\s*=/)
      ];
      
      for (const match of destructuringMatches) {
        if (match && match[1]) {
          const items = match[1].split(',');
          for (const item of items) {
            if (item.trim() && !item.trim().match(/^\w+(\s*:\s*\w+)?(\s*=.*)?$/)) {
              issues.push({
                type: 'invalid-destructuring',
                severity: 'medium',
                line: i + 1,
                message: `分割代入の構文が無効です: ${item.trim()}`
              });
            }
          }
        }
      }
      
      // スプレッド演算子チェック
      if (line.includes('...')) {
        const spreadContexts = line.match(/\.{3}\w+/g);
        if (spreadContexts) {
          for (const context of spreadContexts) {
            if (!this.isValidSpreadContext(line, context)) {
              issues.push({
                type: 'invalid-spread-usage',
                severity: 'medium',
                line: i + 1,
                message: `スプレッド演算子の使用が無効な可能性があります: ${context}`
              });
            }
          }
        }
      }
    }
    
    return issues;
  }

  checkAsyncPatterns(content, lines) {
    const issues = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // await の使用チェック
      if (line.includes('await ')) {
        const awaitMatches = line.match(/await\s+/g);
        if (awaitMatches) {
          // async関数内かチェック
          if (!this.isInAsyncFunction(lines, i)) {
            issues.push({
              type: 'await-outside-async',
              severity: 'high',
              line: i + 1,
              message: 'awaitがasync関数外で使用されています'
            });
          }
        }
      }
      
      // Promise.then/catch パターン
      if (line.includes('.then(') || line.includes('.catch(')) {
        if (line.includes('await ')) {
          issues.push({
            type: 'mixed-async-patterns',
            severity: 'medium',
            line: i + 1,
            message: 'await と .then/.catch が混在しています（統一を推奨）'
          });
        }
      }
    }
    
    return issues;
  }

  checkErrorHandling(content, lines) {
    const issues = [];
    let tryBlockCount = 0;
    let catchBlockCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('try {') || line.match(/try\s*$/)) {
        tryBlockCount++;
      }
      
      if (line.includes('} catch') || line.startsWith('catch')) {
        catchBlockCount++;
      }
      
      // エラーハンドリングパターンチェック
      if (line.includes('throw new Error(') || line.includes('throw ')) {
        if (!this.isInTryCatch(lines, i)) {
          issues.push({
            type: 'unhandled-throw',
            severity: 'medium',
            line: i + 1,
            message: 'エラーのthrowがtry-catch外で行われています（適切な場合もあります）'
          });
        }
      }
    }
    
    return issues;
  }

  // ヘルパーメソッド
  isMultilineTemplate(lines, currentLine) {
    // 複数行テンプレートリテラルの検出ロジック
    let openTicks = 0;
    for (let i = currentLine; i >= 0; i--) {
      const ticks = (lines[i].match(/`/g) || []).length;
      openTicks += ticks;
    }
    return openTicks % 2 === 1;
  }

  checkFunctionParentheses(line) {
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    return openParens === closeParens;
  }

  checkAsyncFunction(lines, startLine) {
    const functionContent = this.getFunctionContent(lines, startLine);
    return functionContent.includes('await ');
  }

  getFunctionContent(lines, startLine) {
    let content = '';
    let braceLevel = 0;
    let started = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      content += line + '\n';
      
      if (line.includes('{')) {
        started = true;
        braceLevel += (line.match(/\{/g) || []).length;
      }
      
      if (started) {
        braceLevel -= (line.match(/\}/g) || []).length;
        if (braceLevel <= 0) break;
      }
    }
    
    return content;
  }

  isValidSpreadContext(line, spreadUsage) {
    // スプレッド演算子の有効なコンテキストチェック
    const validContexts = [
      /\[.*\.{3}\w+.*\]/,  // 配列内
      /\{.*\.{3}\w+.*\}/,  // オブジェクト内
      /\(.*\.{3}\w+.*\)/   // 関数呼び出し内
    ];
    
    return validContexts.some(pattern => pattern.test(line));
  }

  isInAsyncFunction(lines, currentLine) {
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('async ') && (line.includes('function') || line.includes('=>'))) {
        return true;
      }
      if (line.includes('function ') && !line.includes('async ')) {
        return false;
      }
    }
    return false;
  }

  isInTryCatch(lines, currentLine) {
    let tryLevel = 0;
    for (let i = currentLine; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('} catch')) tryLevel--;
      if (line.includes('try {') || line.match(/try\s*$/)) tryLevel++;
    }
    return tryLevel > 0;
  }

  calculateComplexity(content) {
    const complexityFactors = {
      functions: (content.match(/function\s+/g) || []).length,
      classes: (content.match(/class\s+/g) || []).length,
      loops: (content.match(/\b(for|while|do)\b/g) || []).length,
      conditionals: (content.match(/\b(if|switch)\b/g) || []).length,
      tryCatch: (content.match(/try\s*\{/g) || []).length
    };
    
    return Object.values(complexityFactors).reduce((sum, count) => sum + count, 0);
  }

  calculateMetrics(content) {
    const lines = content.split('\n');
    return {
      totalLines: lines.length,
      codeLines: lines.filter(line => line.trim() && !line.trim().startsWith('//')).length,
      commentLines: lines.filter(line => line.trim().startsWith('//')).length,
      emptyLines: lines.filter(line => !line.trim()).length
    };
  }

  generateDetailedReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 詳細構文解析レポート');
    console.log('='.repeat(80));
    
    const totalIssues = this.results.reduce((sum, file) => sum + file.issues.length, 0);
    const highSeverityIssues = this.results.reduce((sum, file) => 
      sum + file.issues.filter(issue => issue.severity === 'high').length, 0);
    
    console.log(`\n📈 全体統計:`);
    console.log(`   解析ファイル数: ${this.results.length}`);
    console.log(`   総問題数: ${totalIssues}`);
    console.log(`   高重要度問題: ${highSeverityIssues}`);
    
    // 重要度別問題集計
    const severityCounts = { high: 0, medium: 0, low: 0, info: 0 };
    for (const file of this.results) {
      for (const issue of file.issues) {
        severityCounts[issue.severity]++;
      }
    }
    
    console.log(`\n⚠️  重要度別問題:`);
    console.log(`   高: ${severityCounts.high}件`);
    console.log(`   中: ${severityCounts.medium}件`);
    console.log(`   低: ${severityCounts.low}件`);
    console.log(`   情報: ${severityCounts.info}件`);
    
    // 最も複雑なファイル
    const mostComplexFile = this.results.reduce((max, file) => 
      file.complexity > max.complexity ? file : max, { complexity: 0 });
    
    if (mostComplexFile.complexity > 0) {
      console.log(`\n🧮 最も複雑なファイル:`);
      console.log(`   ${path.basename(mostComplexFile.file)} (複雑度: ${mostComplexFile.complexity})`);
    }
    
    // 問題のあるファイル詳細
    const problematicFiles = this.results.filter(file => file.issues.length > 0);
    
    if (problematicFiles.length > 0) {
      console.log(`\n⚠️  問題のあるファイル詳細:`);
      
      for (const file of problematicFiles) {
        console.log(`\n📄 ${path.basename(file.file)}:`);
        console.log(`   問題数: ${file.issues.length}, 複雑度: ${file.complexity}`);
        console.log(`   メトリクス: ${file.metrics.codeLines}行のコード, ${file.metrics.commentLines}行のコメント`);
        
        // 高重要度の問題のみ表示
        const highIssues = file.issues.filter(issue => issue.severity === 'high');
        if (highIssues.length > 0) {
          console.log(`   🔥 高重要度問題:`);
          for (const issue of highIssues.slice(0, 3)) { // 最大3個まで表示
            console.log(`      Line ${issue.line}: ${issue.message}`);
          }
          if (highIssues.length > 3) {
            console.log(`      ... 他 ${highIssues.length - 3}件`);
          }
        }
      }
    }
    
    // 正常なファイル
    const healthyFiles = this.results.filter(file => file.issues.length === 0);
    if (healthyFiles.length > 0) {
      console.log(`\n✅ 問題のないファイル (${healthyFiles.length}個):`);
      for (const file of healthyFiles.slice(0, 5)) {
        console.log(`   ✅ ${path.basename(file.file)} (複雑度: ${file.complexity})`);
      }
      if (healthyFiles.length > 5) {
        console.log(`   ... 他 ${healthyFiles.length - 5}個`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// 主要ファイルの詳細解析
const criticalFiles = [
  'src/mcp_server_stdio_v4.js',
  'src/mcp/server.js',
  'src/services/TaskManager.js',
  'src/services/DataManager.js',
  'src/utils/logger.js'
];

async function runDetailedAnalysis() {
  const analyzer = new DetailedSyntaxAnalyzer();
  
  console.log('重要ファイルの詳細構文解析を開始します...');
  
  for (const file of criticalFiles) {
    await analyzer.analyzeFile(file);
  }
  
  analyzer.generateDetailedReport();
}

runDetailedAnalysis().catch(error => {
  console.error('詳細解析エラー:', error);
  process.exit(1);
});
