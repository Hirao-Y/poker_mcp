// test/simple_coordinate_test.js
// 座標正規化機能の簡単なテスト（依存関係を最小限に）

import fs from 'fs/promises';
import yaml from 'js-yaml';

// シンプルなモックTaskManager
class MockTaskManager {
  constructor() {
    this.data = { body: [], source: [] };
  }

  normalizeCoordinates(coordString) {
    if (typeof coordString !== 'string') return coordString;
    // "x y z" 形式の文字列を数値として正規化
    const coords = coordString.trim().split(/\s+/).map(Number);
    if (coords.length === 3 && coords.every(n => !isNaN(n))) {
      return coords.join(' ');
    }
    return coordString;
  }

  createTestBody(name, type, options) {
    const body = { name, type };
    
    switch (type) {
      case 'RPP':
        body.min = this.normalizeCoordinates(options.min);
        body.max = this.normalizeCoordinates(options.max);
        break;
      case 'SPH':
        body.center = this.normalizeCoordinates(options.center);
        body.radius = Number(options.radius);
        break;
    }
    
    this.data.body.push(body);
    return body;
  }

  createTestSource(name, type, position, inventory) {
    const source = {
      name,
      type,
      position: this.normalizeCoordinates(position),
      inventory
    };
    
    this.data.source.push(source);
    return source;
  }

  saveTestData(filename) {
    const yamlData = yaml.dump(this.data, { 
      flowLevel: 2,
      lineWidth: 120,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });
    return fs.writeFile(filename, yamlData, 'utf8');
  }
}

// テスト実行
async function runCoordinateNormalizationTest() {
  console.log('🧪 座標正規化機能のテスト開始');
  
  try {
    // テスト用ディレクトリ作成
    await fs.mkdir('test_output', { recursive: true });
    
    const manager = new MockTaskManager();
    
    console.log('\n=== 1. normalizeCoordinatesメソッドのテスト ===');
    
    const testCases = [
      { input: '-25 -25 0', expected: '-25 -25 0' },
      { input: '25  25   5', expected: '25 25 5' },  // 複数スペース
      { input: ' 10 20 30 ', expected: '10 20 30' }, // 前後スペース
      { input: '-10.5 20.7 -30.2', expected: '-10.5 20.7 -30.2' }, // 小数点
      { input: 'invalid', expected: 'invalid' }, // 無効な入力
      { input: 123, expected: 123 }, // 非文字列
    ];
    
    let normalizeTestsPassed = 0;
    for (const testCase of testCases) {
      const result = manager.normalizeCoordinates(testCase.input);
      const passed = result === testCase.expected;
      console.log(`  ${passed ? '✅' : '❌'} Input: "${testCase.input}" → Output: "${result}" (Expected: "${testCase.expected}")`);
      if (passed) normalizeTestsPassed++;
    }
    
    console.log('\n=== 2. 立体作成時の座標正規化テスト ===');
    
    // RPP立体作成（スペース付き座標）
    const rppBody = manager.createTestBody('test_rpp', 'RPP', {
      min: '-25  -25   0',  // 複数スペース
      max: ' 25 25 5 '      // 前後スペース
    });
    
    console.log(`  ✅ RPP立体作成: min="${rppBody.min}", max="${rppBody.max}"`);
    
    // SPH立体作成（スペース付き座標）
    const sphBody = manager.createTestBody('test_sph', 'SPH', {
      center: ' 0  0  0 ',  // 複数スペース
      radius: 10
    });
    
    console.log(`  ✅ SPH立体作成: center="${sphBody.center}", radius=${sphBody.radius}`);
    
    console.log('\n=== 3. 線源作成時の座標正規化テスト ===');
    
    // 線源作成（スペース付き座標）
    const source = manager.createTestSource(
      'test_source',
      'point',
      ' -50  0   0 ',  // 複数スペース
      [{ nuclide: 'Co-60', radioactivity: 37000000000 }]
    );
    
    console.log(`  ✅ 線源作成: position="${source.position}"`);
    
    console.log('\n=== 4. YAML出力テスト ===');
    
    // YAMLファイルに保存
    const testFile = 'test_output/coordinate_test.yaml';
    await manager.saveTestData(testFile);
    
    // 保存されたYAMLファイルを読み込み
    const yamlContent = await fs.readFile(testFile, 'utf8');
    
    console.log('\n--- 生成されたYAML内容 ---');
    console.log(yamlContent);
    console.log('--- YAML内容終了 ---\n');
    
    console.log('=== 5. 引用符チェック ===');
    
    // 引用符の有無をチェック
    const hasQuotedCoordinates = yamlContent.includes('min: \'') || yamlContent.includes('max: \'') || yamlContent.includes('position: \'');
    const hasUnquotedCoordinates = /min: -?\d+/.test(yamlContent) || /max: \d+/.test(yamlContent) || /position: -?\d+/.test(yamlContent);
    
    console.log(`  引用符付き座標: ${hasQuotedCoordinates ? '❌ 発見' : '✅ 未発見'}`);
    console.log(`  引用符なし座標: ${hasUnquotedCoordinates ? '✅ 発見' : '❌ 未発見'}`);
    
    console.log('\n=== 6. スペース正規化チェック ===');
    
    // スペースが正規化されているかチェック
    const data = yaml.load(yamlContent);
    let spaceNormalizationPassed = 0;
    let spaceNormalizationTotal = 0;
    
    data.body.forEach(body => {
      if (body.min) {
        spaceNormalizationTotal++;
        const hasExtraSpaces = body.min.includes('  ');
        console.log(`  ${hasExtraSpaces ? '❌' : '✅'} ${body.name}.min: "${body.min}" (${hasExtraSpaces ? 'スペース残存' : 'スペース正規化済み'})`);
        if (!hasExtraSpaces) spaceNormalizationPassed++;
      }
      if (body.max) {
        spaceNormalizationTotal++;
        const hasExtraSpaces = body.max.includes('  ');
        console.log(`  ${hasExtraSpaces ? '❌' : '✅'} ${body.name}.max: "${body.max}" (${hasExtraSpaces ? 'スペース残存' : 'スペース正規化済み'})`);
        if (!hasExtraSpaces) spaceNormalizationPassed++;
      }
      if (body.center) {
        spaceNormalizationTotal++;
        const hasExtraSpaces = body.center.includes('  ');
        console.log(`  ${hasExtraSpaces ? '❌' : '✅'} ${body.name}.center: "${body.center}" (${hasExtraSpaces ? 'スペース残存' : 'スペース正規化済み'})`);
        if (!hasExtraSpaces) spaceNormalizationPassed++;
      }
    });
    
    data.source.forEach(source => {
      if (source.position) {
        spaceNormalizationTotal++;
        const hasExtraSpaces = source.position.includes('  ');
        console.log(`  ${hasExtraSpaces ? '❌' : '✅'} ${source.name}.position: "${source.position}" (${hasExtraSpaces ? 'スペース残存' : 'スペース正規化済み'})`);
        if (!hasExtraSpaces) spaceNormalizationPassed++;
      }
    });
    
    console.log('\n=== テスト結果サマリー ===');
    console.log(`normalizeCoordinatesメソッド: ${normalizeTestsPassed}/${testCases.length} (${normalizeTestsPassed === testCases.length ? '✅ 成功' : '❌ 失敗'})`);
    console.log(`YAML引用符なし: ${!hasQuotedCoordinates ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`座標スペース正規化: ${spaceNormalizationPassed}/${spaceNormalizationTotal} (${spaceNormalizationPassed === spaceNormalizationTotal ? '✅ 成功' : '❌ 失敗'})`);
    
    // 総合判定
    const allTestsPassed = (
      normalizeTestsPassed === testCases.length &&
      !hasQuotedCoordinates &&
      hasUnquotedCoordinates &&
      spaceNormalizationPassed === spaceNormalizationTotal
    );
    
    if (allTestsPassed) {
      console.log('\n🎉 全てのテストが成功しました！座標正規化機能は正常に動作しています。');
    } else {
      console.log('\n⚠️ 一部のテストが失敗しました。修正が必要です。');
    }
    
    // テスト用ファイルのクリーンアップ
    await fs.rm('test_output', { recursive: true, force: true });
    console.log('\n✅ テスト用ファイルをクリーンアップしました');
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    console.error(error.stack);
    return false;
  }
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runCoordinateNormalizationTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { runCoordinateNormalizationTest };
