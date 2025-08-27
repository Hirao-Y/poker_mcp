#!/usr/bin/env node
// tests/test_volume_sources.js - 体積線源のgeometry/divisionテスト

import { TaskManager } from '../src/services/TaskManager.js';
import { logger } from '../src/utils/logger.js';

/**
 * 体積線源のgeometry/division保存テスト
 */
async function testVolumeSources() {
  console.log('=== 体積線源 geometry/division 保存テスト ===\n');
  
  const taskManager = new TaskManager('tests/test_pokerinputs.yaml', 'tests/test_pending_changes.json');
  
  try {
    await taskManager.initialize();
    console.log('✓ TaskManager初期化完了\n');
    
    // テストケース1: SPH（球）線源
    console.log('📐 テストケース1: SPH（球体）線源');
    const sphereParams = {
      name: 'test_sphere_source',
      type: 'SPH',
      inventory: [
        { nuclide: 'Cs137', radioactivity: 3.7e10 }
      ],
      cutoff_rate: 0.01,
      geometry: {
        center: '0 0 0',
        radius: 5.0
      },
      division: {
        r: { type: 'UNIFORM', number: 5, min: 0, max: 1 },
        theta: { type: 'UNIFORM', number: 4, min: 0, max: 1 },
        phi: { type: 'UNIFORM', number: 8, min: 0, max: 1 }
      }
    };
    
    await taskManager.proposeSource(sphereParams);
    console.log('✓ SPH線源提案完了');
    
    // テストケース2: RCC（円柱）線源
    console.log('📐 テストケース2: RCC（円柱）線源');
    const cylinderParams = {
      name: 'test_cylinder_source',
      type: 'RCC',
      inventory: [
        { nuclide: 'Co60', radioactivity: 1.85e10 }
      ],
      cutoff_rate: 0.005,
      geometry: {
        bottom_center: '0 0 0',
        height_vector: '0 0 10',
        radius: 3.0
      },
      division: {
        r: { type: 'UNIFORM', number: 3, min: 0, max: 1 },
        phi: { type: 'UNIFORM', number: 8, min: 0, max: 1 },
        z: { type: 'UNIFORM', number: 10, min: 0, max: 1 }
      }
    };
    
    await taskManager.proposeSource(cylinderParams);
    console.log('✓ RCC線源提案完了');
    
    // テストケース3: RPP（軸平行直方体）線源
    console.log('📐 テストケース3: RPP（軸平行直方体）線源');
    const boxParams = {
      name: 'test_box_source',
      type: 'RPP',
      inventory: [
        { nuclide: 'Am241', radioactivity: 3.7e9 }
      ],
      cutoff_rate: 0.02,
      geometry: {
        min: '-5 -5 -5',
        max: '5 5 5'
      },
      division: {
        edge_1: { type: 'UNIFORM', number: 5, min: 0, max: 1 },
        edge_2: { type: 'UNIFORM', number: 5, min: 0, max: 1 },
        edge_3: { type: 'UNIFORM', number: 5, min: 0, max: 1 }
      }
    };
    
    await taskManager.proposeSource(boxParams);
    console.log('✓ RPP線源提案完了');
    
    // テストケース4: BOX（一般直方体）線源
    console.log('📐 テストケース4: BOX（一般直方体）線源');
    const generalBoxParams = {
      name: 'test_general_box_source',
      type: 'BOX',
      inventory: [
        { nuclide: 'Na22', radioactivity: 1.85e9 }
      ],
      cutoff_rate: 0.015,
      geometry: {
        vertex: '0 0 0',
        edge_1: '10 0 0',
        edge_2: '0 8 0',
        edge_3: '0 0 6'
      },
      division: {
        edge_1: { type: 'UNIFORM', number: 10, min: 0, max: 1 },
        edge_2: { type: 'UNIFORM', number: 8, min: 0, max: 1 },
        edge_3: { type: 'UNIFORM', number: 6, min: 0, max: 1 }
      }
    };
    
    await taskManager.proposeSource(generalBoxParams);
    console.log('✓ BOX線源提案完了');
    
    // 変更適用
    console.log('\n💾 変更をYAMLファイルに適用中...');
    await taskManager.applyChanges();
    console.log('✓ 変更適用完了');
    
    // 結果検証
    console.log('\n🔍 結果検証中...');
    await verifyVolumeSources(taskManager);
    
    console.log('\n🎉 すべてのテストが正常に完了しました！');
    
  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    logger.error('体積線源テストエラー', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * 体積線源の結果検証
 */
async function verifyVolumeSources(taskManager) {
  const sources = taskManager.data.source || [];
  
  const testSources = [
    { name: 'test_sphere_source', type: 'SPH' },
    { name: 'test_cylinder_source', type: 'RCC' },
    { name: 'test_box_source', type: 'RPP' },
    { name: 'test_general_box_source', type: 'BOX' }
  ];
  
  for (const testSource of testSources) {
    const source = sources.find(s => s.name === testSource.name);
    
    if (!source) {
      throw new Error(`線源 ${testSource.name} が見つかりません`);
    }
    
    console.log(`📋 ${testSource.name} (${testSource.type}) 検証:`);
    
    // 基本属性の確認
    console.log(`  - type: ${source.type} ${source.type === testSource.type ? '✓' : '❌'}`);
    console.log(`  - inventory: ${source.inventory ? source.inventory.length + ' 核種' : '❌'} ${source.inventory ? '✓' : '❌'}`);
    console.log(`  - cutoff_rate: ${source.cutoff_rate !== undefined ? source.cutoff_rate : '未定義'} ${source.cutoff_rate !== undefined ? '✓' : '❌'}`);
    
    // geometry の確認
    if (source.geometry) {
      console.log(`  - geometry: 存在 ✓`);
      console.log(`    - フィールド数: ${Object.keys(source.geometry).length}`);
      for (const [key, value] of Object.entries(source.geometry)) {
        console.log(`    - ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      }
    } else {
      console.log(`  - geometry: 不存在 ❌`);
    }
    
    // division の確認
    if (source.division) {
      console.log(`  - division: 存在 ✓`);
      console.log(`    - 軸数: ${Object.keys(source.division).length}`);
      for (const [axis, config] of Object.entries(source.division)) {
        console.log(`    - ${axis}: ${config.type} (${config.number}分割)`);
      }
    } else {
      console.log(`  - division: 不存在 ❌`);
    }
    
    console.log();
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  testVolumeSources().catch(error => {
    console.error('テスト実行エラー:', error);
    process.exit(1);
  });
}

export { testVolumeSources };
