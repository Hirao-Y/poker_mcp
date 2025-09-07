// 構文チェック用スクリプト
const fs = require('fs');
const path = require('path');

const files = [
  './src/utils/CollisionDetector.js',
  './src/utils/NuclideManager.js', 
  './src/utils/EnhancedValidator.js',
  './src/services/DataManager.js',
  './src/services/CalculationService.js'
];

console.log('🔍 JavaScript構文チェックを開始...\n');

for (const file of files) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // 基本的な構文チェック
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;
      const lines = content.split('\n');
      
      for (const line of lines) {
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
      }
      
      const fileName = path.basename(file);
      let hasErrors = false;
      const errors = [];
      
      if (braceCount !== 0) {
        errors.push(`波括弧の不一致: ${braceCount}`);
        hasErrors = true;
      }
      if (parenCount !== 0) {
        errors.push(`丸括弧の不一致: ${parenCount}`);
        hasErrors = true;
      }
      if (bracketCount !== 0) {
        errors.push(`角括弧の不一致: ${bracketCount}`);
        hasErrors = true;
      }
      
      if (hasErrors) {
        console.log(`❌ ${fileName}:`);
        errors.forEach(error => console.log(`   ${error}`));
      } else {
        console.log(`✅ ${fileName}: 構文OK (${lines.length}行)`);
      }
      
    } else {
      console.log(`❌ ${file}: ファイルが存在しません`);
    }
    
  } catch (error) {
    console.log(`❌ ${file}: エラー - ${error.message}`);
  }
}

console.log('\n📊 構文チェック完了');

// モジュール読み込みテスト
console.log('\n🧪 モジュール読み込みテスト...');
try {
  // ES6モジュールの基本的なチェック
  const testFiles = [
    './src/utils/CollisionDetector.js',
    './src/utils/NuclideManager.js',
    './src/utils/EnhancedValidator.js'
  ];
  
  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // import/export の存在チェック
      const hasImport = content.includes('import');
      const hasExport = content.includes('export');
      
      console.log(`📄 ${path.basename(file)}: import=${hasImport}, export=${hasExport}`);
      
      // class定義チェック
      const classMatches = content.match(/class\s+(\w+)/g);
      if (classMatches) {
        console.log(`   クラス: ${classMatches.join(', ')}`);
      }
    }
  }
  
} catch (error) {
  console.log(`❌ モジュールテストエラー: ${error.message}`);
}
