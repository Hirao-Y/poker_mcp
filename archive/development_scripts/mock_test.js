// 新機能のモックテストスクリプト
const fs = require('fs').promises;
const yaml = require('js-yaml');
const path = require('path');

// テスト用のモックデータマネージャー
class MockDataManager {
  constructor() {
    this.data = null;
  }

  async loadTestData() {
    try {
      const yamlContent = await fs.readFile('./test_input.yaml', 'utf8');
      this.data = yaml.load(yamlContent);
      console.log('✅ テストデータ読み込み完了');
      return true;
    } catch (error) {
      console.log('❌ テストデータ読み込みエラー:', error.message);
      return false;
    }
  }
}

// テスト関数群
async function testCollisionDetection() {
  console.log('\n🔍 立体干渉チェックテスト');
  
  try {
    // 基本的な立体干渉ロジックのテスト
    const bodies = [
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

    // 境界ボックス重複の手動計算
    const sphere1_bb = {
      min: [5, -5, -5],
      max: [15, 5, 5]
    };
    
    const box1_bb = {
      min: [8, -3, -3],
      max: [15, 3, 3]
    };

    // 重複領域の計算
    const overlapMin = [
      Math.max(sphere1_bb.min[0], box1_bb.min[0]), // max(5, 8) = 8
      Math.max(sphere1_bb.min[1], box1_bb.min[1]), // max(-5, -3) = -3
      Math.max(sphere1_bb.min[2], box1_bb.min[2])  // max(-5, -3) = -3
    ];
    
    const overlapMax = [
      Math.min(sphere1_bb.max[0], box1_bb.max[0]), // min(15, 15) = 15
      Math.min(sphere1_bb.max[1], box1_bb.max[1]), // min(5, 3) = 3
      Math.min(sphere1_bb.max[2], box1_bb.max[2])  // min(5, 3) = 3
    ];

    const overlapVolume = (overlapMax[0] - overlapMin[0]) * 
                         (overlapMax[1] - overlapMin[1]) * 
                         (overlapMax[2] - overlapMin[2]);

    console.log(`   重複領域: [${overlapMin.join(', ')}] - [${overlapMax.join(', ')}]`);
    console.log(`   重複体積: ${overlapVolume} cm³`);
    
    if (overlapVolume > 0) {
      console.log('   ✅ 干渉検出ロジック: 期待通り重複を検出');
    } else {
      console.log('   ❌ 干渉検出ロジック: 重複が検出されない');
    }

  } catch (error) {
    console.log('   ❌ 干渉チェックテストエラー:', error.message);
  }
}

async function testNuclideManagement() {
  console.log('\n☢️  子孫核種管理テスト');
  
  try {
    // ICRPモックデータの読み込みテスト
    const icrpContent = await fs.readFile('./src/data/icrp-07.NDX', 'utf8');
    const lines = icrpContent.split('\n').filter(line => 
      line.trim() && !line.startsWith('#')
    );
    
    console.log(`   ICRPモックデータ: ${lines.length} 核種`);
    
    // Cs-137のテストケース
    const cs137Line = lines.find(line => line.includes('Cs137'));
    if (cs137Line) {
      console.log('   ✅ Cs137データ存在確認');
      console.log(`      ${cs137Line.substring(0, 50)}...`);
      
      // Ba-137m への崩壊データ検証
      if (cs137Line.includes('Ba137m')) {
        console.log('   ✅ Cs137→Ba137m 崩壊チェーン確認');
      } else {
        console.log('   ❌ Cs137→Ba137m 崩壊チェーン未確認');
      }
    } else {
      console.log('   ❌ Cs137データが見つかりません');
    }

    // 子孫核種自動追加のロジックテスト
    const testInventory = [
      { nuclide: 'Cs137', radioactivity: 37e9 }
    ];
    
    // 寄与率閾値（5%）以上の子孫核種を特定
    console.log('   子孫核種自動追加シミュレーション:');
    console.log(`   - 親核種: Cs137 (${testInventory[0].radioactivity.toExponential()} Bq)`);
    console.log(`   - 予想される追加: Ba137m (94.39% * ${testInventory[0].radioactivity.toExponential()} Bq)`);
    
    const expectedBa137mActivity = testInventory[0].radioactivity * 0.9439;
    console.log(`   - Ba137m 計算値: ${expectedBa137mActivity.toExponential()} Bq`);

  } catch (error) {
    console.log('   ❌ 核種管理テストエラー:', error.message);
  }
}

async function testEnhancedValidation() {
  console.log('\n🔍 強化検証テスト');
  
  try {
    const mockData = new MockDataManager();
    await mockData.loadTestData();
    
    // 材料密度検証テスト
    console.log('   材料密度検証:');
    for (const zone of mockData.data.zone) {
      if (zone.material === 'VOID') continue;
      
      const density = zone.density;
      let status = '✅';
      let message = '正常範囲';
      
      // 密度範囲チェック
      const densityRanges = {
        'LEAD': { min: 10.0, max: 12.0 },
        'CONCRETE': { min: 1.8, max: 2.8 },
        'Iron': { min: 7.0, max: 8.5 },
        'Air': { min: 0.001, max: 0.002 }
      };
      
      const range = densityRanges[zone.material];
      if (range && (density < range.min || density > range.max)) {
        status = '⚠️';
        message = `範囲外 (${range.min}-${range.max})`;
      }
      
      console.log(`      ${zone.material}: ${density} g/cm³ ${status} ${message}`);
    }

    // 検出器配置検証テスト
    console.log('   検出器配置検証:');
    for (const detector of mockData.data.detector) {
      const detPos = detector.origin.split(' ').map(Number);
      
      // 線源との距離計算
      for (const source of mockData.data.source) {
        let sourcePos;
        if (source.position) {
          sourcePos = source.position.split(' ').map(Number);
        } else if (source.geometry && source.geometry.center) {
          sourcePos = source.geometry.center.split(' ').map(Number);
        } else {
          continue;
        }
        
        const distance = Math.sqrt(
          (detPos[0] - sourcePos[0])**2 + 
          (detPos[1] - sourcePos[1])**2 + 
          (detPos[2] - sourcePos[2])**2
        );
        
        let status = '✅';
        let message = '適切な距離';
        
        if (distance < 1.0) {
          status = '❌';
          message = '近すぎます';
        } else if (distance > 1e5) {
          status = '⚠️';
          message = '遠すぎます';
        }
        
        console.log(`      ${detector.name} - ${source.name}: ${distance.toFixed(2)} cm ${status} ${message}`);
      }
    }

  } catch (error) {
    console.log('   ❌ 強化検証テストエラー:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 新機能モックテスト開始\n');
  console.log('=' .repeat(50));
  
  // ファイル存在確認
  const requiredFiles = [
    './test_input.yaml',
    './src/data/icrp-07.NDX',
    './src/utils/CollisionDetector.js',
    './src/utils/NuclideManager.js',
    './src/utils/EnhancedValidator.js'
  ];
  
  console.log('📁 必要ファイルの存在確認:');
  for (const file of requiredFiles) {
    try {
      await fs.access(file);
      console.log(`   ✅ ${file}`);
    } catch {
      console.log(`   ❌ ${file} (存在しません)`);
    }
  }
  
  await testCollisionDetection();
  await testNuclideManagement();
  await testEnhancedValidation();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 モックテスト完了');
  console.log('📋 次のステップ: 実際のクラス統合テスト');
}

// テスト実行
runAllTests().catch(console.error);
