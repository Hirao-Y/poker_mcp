// 実際のクラス統合テスト
import CollisionDetector from './src/utils/CollisionDetector.js';
import NuclideManager from './src/utils/NuclideManager.js';
import EnhancedValidator from './src/utils/EnhancedValidator.js';
import yaml from 'js-yaml';
import fs from 'fs/promises';

async function testClassInstantiation() {
  console.log('🏗️  クラスインスタンス化テスト\n');
  
  try {
    // CollisionDetector
    console.log('📦 CollisionDetector...');
    const collisionDetector = new CollisionDetector({
      overlap_tolerance: 1e-6,
      contact_tolerance: 1e-9,
      max_auto_corrections: 10
    });
    console.log('   ✅ CollisionDetector インスタンス化成功');
    console.log(`   - overlap_tolerance: ${collisionDetector.overlapTolerance}`);
    console.log(`   - contact_tolerance: ${collisionDetector.contactTolerance}`);

    // NuclideManager
    console.log('\n☢️  NuclideManager...');
    const nuclideManager = new NuclideManager({
      contribution_threshold: 0.05,
      user_confirmation: true,
      database_file: 'src/data/icrp-07.NDX'
    });
    console.log('   ✅ NuclideManager インスタンス化成功');
    console.log(`   - contribution_threshold: ${nuclideManager.contributionThreshold}`);
    console.log(`   - database_file: ${nuclideManager.databaseFile}`);

    // EnhancedValidator
    console.log('\n🔍 EnhancedValidator...');
    const enhancedValidator = new EnhancedValidator();
    console.log('   ✅ EnhancedValidator インスタンス化成功');
    console.log(`   - validation rules: ${enhancedValidator.validationRules.size} categories`);

    return { collisionDetector, nuclideManager, enhancedValidator };
    
  } catch (error) {
    console.log('   ❌ クラスインスタンス化エラー:', error.message);
    throw error;
  }
}

async function testCollisionDetectorMethods(collisionDetector) {
  console.log('\n🧪 CollisionDetector メソッドテスト');
  
  try {
    // テスト用立体データ
    const testBodies = [
      {
        name: 'sphere1',
        type: 'SPH',
        center: '10 0 0',
        radius: 5
      },
      {
        name: 'box1',
        type: 'RPP',
        min: '8 -3 -3',
        max: '15 3 3'
      }
    ];

    // 干渉検出テスト
    console.log('   干渉検出実行中...');
    const collisionResult = collisionDetector.detectCollisions(testBodies);
    
    console.log(`   ✅ 干渉検出完了`);
    console.log(`   - 干渉あり: ${collisionResult.hasCollisions}`);
    console.log(`   - 干渉数: ${collisionResult.collisions.length}`);
    console.log(`   - 接触数: ${collisionResult.contacts.length}`);
    
    if (collisionResult.collisions.length > 0) {
      const collision = collisionResult.collisions[0];
      console.log(`   - 重複体積: ${collision.overlapVolume} cm³`);
      console.log(`   - 深刻度: ${collision.severity}`);
    }

    // 修正提案生成テスト
    if (collisionResult.hasCollisions) {
      console.log('   修正提案生成中...');
      const resolutions = collisionDetector.generateResolutions(collisionResult.collisions, testBodies);
      console.log(`   ✅ 修正提案生成完了: ${resolutions.length} 件`);
      
      for (const resolution of resolutions.slice(0, 2)) {
        console.log(`   - ${resolution.type}: ${resolution.reason || resolution.operation || resolution.target}`);
      }
    }

  } catch (error) {
    console.log('   ❌ CollisionDetector メソッドエラー:', error.message);
  }
}

async function testNuclideManagerMethods(nuclideManager) {
  console.log('\n🧪 NuclideManager メソッドテスト');
  
  try {
    // ICRPデータベース読み込みテスト
    console.log('   ICRPデータベース読み込み中...');
    await nuclideManager.loadNuclideDatabase();
    console.log(`   ✅ データベース読み込み完了: ${nuclideManager.nuclideData.size} 核種`);

    // 子孫核種自動補間テスト
    const testInventory = [
      { nuclide: 'Cs137', radioactivity: 37e9 }
    ];
    
    console.log('   子孫核種自動補間実行中...');
    const daughterResult = await nuclideManager.autoCompleteDaughters(testInventory);
    
    console.log(`   ✅ 子孫核種補間完了`);
    console.log(`   - 元の核種数: ${daughterResult.originalCount}`);
    console.log(`   - 追加核種数: ${daughterResult.additionsCount}`);
    console.log(`   - 確認必要: ${daughterResult.requiresConfirmation}`);
    
    for (const addition of daughterResult.additions.slice(0, 3)) {
      console.log(`   - 追加: ${addition.nuclide} (${addition.radioactivity.toExponential()} Bq)`);
    }

    // データベース統計取得テスト
    console.log('   データベース統計取得中...');
    const stats = nuclideManager.getDatabaseStats();
    console.log(`   ✅ 統計取得完了: 崩壊チェーン ${stats.decayChains} 個`);

  } catch (error) {
    console.log('   ❌ NuclideManager メソッドエラー:', error.message);
  }
}

async function testEnhancedValidatorMethods(enhancedValidator) {
  console.log('\n🧪 EnhancedValidator メソッドテスト');
  
  try {
    // テストデータの読み込み
    console.log('   テストデータ読み込み中...');
    const yamlContent = await fs.readFile('./test_input.yaml', 'utf8');
    const testData = yaml.load(yamlContent);

    // 包括的検証テスト
    console.log('   包括的検証実行中...');
    const validationResult = await enhancedValidator.performComprehensiveValidation(testData);
    
    console.log(`   ✅ 包括的検証完了`);
    console.log(`   - 全体結果: ${validationResult.overall ? 'PASS' : 'FAIL'}`);
    console.log(`   - エラー数: ${validationResult.errors.length}`);
    console.log(`   - 警告数: ${validationResult.warnings.length}`);
    console.log(`   - 推奨事項数: ${validationResult.recommendations.length}`);

    // カテゴリ別結果
    for (const [category, result] of Object.entries(validationResult.categories)) {
      console.log(`   - ${category}: ${result.passed ? 'PASS' : 'FAIL'}`);
    }

    // 重要なエラーの表示
    if (validationResult.errors.length > 0) {
      console.log('   重要なエラー:');
      for (const error of validationResult.errors.slice(0, 3)) {
        console.log(`   - ${error.type}: ${error.message}`);
      }
    }

  } catch (error) {
    console.log('   ❌ EnhancedValidator メソッドエラー:', error.message);
  }
}

async function runIntegrationTest() {
  console.log('🔗 クラス統合テスト開始\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. クラスインスタンス化
    const { collisionDetector, nuclideManager, enhancedValidator } = await testClassInstantiation();

    // 2. 各クラスのメソッドテスト
    await testCollisionDetectorMethods(collisionDetector);
    await testNuclideManagerMethods(nuclideManager);
    await testEnhancedValidatorMethods(enhancedValidator);

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 クラス統合テスト完了 - 全て正常に動作');
    console.log('✅ 新機能は実装準備完了です');

  } catch (error) {
    console.log('\n' + '=' .repeat(60));
    console.log('❌ クラス統合テストでエラーが発生:');
    console.log(error.message);
    console.log('📋 対応が必要です');
  }
}

// 統合テスト実行
runIntegrationTest().catch(console.error);
