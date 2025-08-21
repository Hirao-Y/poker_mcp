// test/coordinate_normalization_test.js
// 座標正規化機能のテスト

import { TaskManager } from '../services/TaskManager.js';
import fs from 'fs/promises';
import yaml from 'js-yaml';

class CoordinateNormalizationTest {
  constructor() {
    this.testYamlFile = 'test_output/test_pokerinputs.yaml';
    this.testPendingFile = 'test_output/test_pending_changes.json';
    this.manager = null;
  }

  async setup() {
    // テスト用ディレクトリ作成
    await fs.mkdir('test_output', { recursive: true });
    
    // TaskManager初期化
    this.manager = new TaskManager(this.testYamlFile, this.testPendingFile);
    await this.manager.initialize();
    
    console.log('✅ テスト環境をセットアップしました');
  }

  async cleanup() {
    try {
      await fs.rm('test_output', { recursive: true, force: true });
      console.log('✅ テスト環境をクリーンアップしました');
    } catch (error) {
      console.log('⚠️ クリーンアップ警告:', error.message);
    }
  }

  async testCoordinateNormalization() {
    console.log('\n=== 座標正規化テスト ===');
    
    // テスト1: normalizeCoordinatesメソッドの単体テスト
    console.log('\n1. normalizeCoordinatesメソッドのテスト');
    
    const testCases = [
      { input: '-25 -25 0', expected: '-25 -25 0' },
      { input: '25  25   5', expected: '25 25 5' },  // 複数スペース
      { input: ' 10 20 30 ', expected: '10 20 30' }, // 前後スペース
      { input: '-10.5 20.7 -30.2', expected: '-10.5 20.7 -30.2' }, // 小数点
      { input: 'invalid', expected: 'invalid' }, // 無効な入力
      { input: 123, expected: 123 }, // 非文字列
    ];
    
    for (const testCase of testCases) {
      const result = this.manager.normalizeCoordinates(testCase.input);
      const passed = result === testCase.expected;
      console.log(`  ${passed ? '✅' : '❌'} Input: "${testCase.input}" → Output: "${result}" (Expected: "${testCase.expected}")`);
    }
  }

  async testBodyCreation() {
    console.log('\n2. 立体作成時の座標正規化テスト');
    
    // RPP立体作成
    await this.manager.proposeBody('test_rpp', 'RPP', {
      min: '-25  -25   0',  // 複数スペース
      max: ' 25 25 5 '      // 前後スペース
    });
    
    // SPH立体作成
    await this.manager.proposeBody('test_sph', 'SPH', {
      center: ' 0  0  0 ',  // 複数スペース
      radius: 10
    });
    
    // 変更を適用
    await this.manager.applyChanges();
    
    console.log('  ✅ 立体作成完了');
  }

  async testSourceCreation() {
    console.log('\n3. 線源作成時の座標正規化テスト');
    
    await this.manager.proposeSource({
      name: 'test_source',
      type: 'point',
      position: ' -50  0   0 ',  // 複数スペース
      inventory: [{ nuclide: 'Co-60', radioactivity: 37000000000 }],
      cutoff_rate: 0.01
    });
    
    await this.manager.applyChanges();
    console.log('  ✅ 線源作成完了');
  }

  async testUpdateOperations() {
    console.log('\n4. 更新操作での座標正規化テスト');
    
    // 立体更新
    await this.manager.updateBody('test_rpp', {
      min: ' -30  -30   0 ',  // スペース付き更新
      max: '30  30  10'       // スペース付き更新
    });
    
    // 線源更新
    await this.manager.updateSource('test_source', {
      position: '  -60   5   10  '  // スペース付き更新
    });
    
    await this.manager.applyChanges();
    console.log('  ✅ 更新操作完了');
  }

  async verifyYAMLOutput() {
    console.log('\n5. YAML出力の検証');
    
    // YAMLファイルを読み込み
    const yamlContent = await fs.readFile(this.testYamlFile, 'utf8');
    const data = yaml.load(yamlContent);
    
    console.log('\n--- 生成されたYAML内容 ---');
    console.log(yamlContent);
    console.log('--- YAML内容終了 ---\n');
    
    // 座標の引用符チェック
    const hasQuotedCoordinates = yamlContent.includes('min: \'') || yamlContent.includes('max: \'') || yamlContent.includes('position: \'');
    const hasUnquotedCoordinates = /min: -?\d+/.test(yamlContent) || /max: \d+/.test(yamlContent) || /position: -?\d+/.test(yamlContent);
    
    console.log(`  引用符付き座標: ${hasQuotedCoordinates ? '発見' : '未発見'}`);
    console.log(`  引用符なし座標: ${hasUnquotedCoordinates ? '発見' : '未発見'}`);
    
    // データの整合性チェック
    console.log('\n6. データ整合性チェック');
    
    const testRppBody = data.body?.find(b => b.name === 'test_rpp');
    if (testRppBody) {
      console.log(`  ✅ test_rpp.min: "${testRppBody.min}"`);
      console.log(`  ✅ test_rpp.max: "${testRppBody.max}"`);
      
      // スペースが正規化されているかチェック
      const hasExtraSpaces = testRppBody.min.includes('  ') || testRppBody.max.includes('  ');
      console.log(`  ${hasExtraSpaces ? '❌' : '✅'} スペース正規化: ${hasExtraSpaces ? '失敗' : '成功'}`);
    }
    
    const testSource = data.source?.find(s => s.name === 'test_source');
    if (testSource) {
      console.log(`  ✅ test_source.position: "${testSource.position}"`);
      
      const hasExtraSpaces = testSource.position.includes('  ');
      console.log(`  ${hasExtraSpaces ? '❌' : '✅'} 線源座標正規化: ${hasExtraSpaces ? '失敗' : '成功'}`);
    }
    
    return {
      hasQuotedCoordinates,
      hasUnquotedCoordinates,
      dataConsistent: !hasQuotedCoordinates && hasUnquotedCoordinates
    };
  }

  async runAllTests() {
    console.log('🧪 座標正規化機能のテスト開始');
    
    try {
      await this.setup();
      
      await this.testCoordinateNormalization();
      await this.testBodyCreation();
      await this.testSourceCreation();
      await this.testUpdateOperations();
      
      const results = await this.verifyYAMLOutput();
      
      console.log('\n=== テスト結果サマリー ===');
      console.log(`座標正規化機能: ${results.dataConsistent ? '✅ 成功' : '❌ 失敗'}`);
      console.log(`YAML引用符統一: ${!results.hasQuotedCoordinates ? '✅ 成功' : '❌ 失敗'}`);
      
      if (results.dataConsistent && !results.hasQuotedCoordinates) {
        console.log('\n🎉 全てのテストが成功しました！');
        return true;
      } else {
        console.log('\n⚠️ 一部のテストが失敗しました。');
        return false;
      }
      
    } catch (error) {
      console.error('❌ テスト実行エラー:', error.message);
      console.error(error.stack);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// テスト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new CoordinateNormalizationTest();
  test.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { CoordinateNormalizationTest };
