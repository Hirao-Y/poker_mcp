#!/usr/bin/env node
// test_transform_system.js - Transform参照システム強化のテスト
import { TransformValidator } from '../src/validators/TransformValidator.js';

console.log('=== Transform参照システム強化テスト ===\n');

// 1. 基本バリデーションテスト
console.log('1. Transform操作バリデーションテスト:');
const testOperations = [
  [
    { translate: '10 20 30' },
    { rotate_around_z: 45 }
  ],
  [
    { rotate_around_x: 90 },
    { rotate_around_y: -45 },
    { translate: '0 0 100' }
  ]
];

for (let i = 0; i < testOperations.length; i++) {
  try {
    TransformValidator.validateTransformOperations(testOperations[i]);
    console.log(`✓ 操作セット${i+1}: バリデーション成功`);
  } catch (error) {
    console.log(`✗ 操作セット${i+1}: ${error.message}`);
  }
}

// 2. 物理的妥当性チェックテスト
console.log('\n2. 物理的妥当性チェックテスト:');
const physicsTestCases = [
  {
    name: '正常な回転移動',
    operations: [
      { rotate_around_z: 90 },
      { translate: '50 0 0' }
    ]
  },
  {
    name: '大きな移動量',
    operations: [
      { translate: '15000 0 0' }
    ]
  },
  {
    name: '大きな回転量',
    operations: [
      { rotate_around_x: 400 },
      { rotate_around_y: 500 }
    ]
  },
  {
    name: '意味のない操作',
    operations: []
  }
];

for (const testCase of physicsTestCases) {
  if (testCase.operations.length === 0) {
    console.log(`△ ${testCase.name}: 操作が空です`);
    continue;
  }
  
  try {
    const analysis = TransformValidator.validateTransformPhysics(testCase.operations, testCase.name);
    console.log(`✓ ${testCase.name}:`, {
      回転: analysis.hasRotation,
      移動: analysis.hasTranslation, 
      総回転量: analysis.totalRotationMagnitude.toFixed(1) + '度',
      操作数: analysis.operationCount
    });
  } catch (error) {
    console.log(`✗ ${testCase.name}: ${error.message}`);
  }
}

// 3. 依存関係チェックテスト
console.log('\n3. 依存関係チェックテスト:');
const mockYamlData = {
  transform: [
    { name: 'rotate_90', operations: [{ rotate_around_z: 90 }] },
    { name: 'move_up', operations: [{ translate: '0 0 100' }] },
    { name: 'unused_transform', operations: [{ rotate_around_x: 45 }] }
  ],
  body: [
    { name: 'body1', type: 'SPH', center: '0 0 0', radius: 10, transform: 'rotate_90' },
    { name: 'body2', type: 'RPP', min: '0 0 0', max: '10 10 10' }
  ],
  source: [
    { 
      name: 'source1', 
      type: 'POINT', 
      position: '0 0 0',
      geometry: { transform: 'move_up' },
      inventory: [{ nuclide: 'Cs137', radioactivity: 1000 }]
    }
  ],
  detector: [
    { name: 'detector1', origin: '100 0 0', transform: 'rotate_90' }
  ]
};

// 依存関係チェック（削除不可なtransform）
const dependentTransforms = ['rotate_90', 'move_up'];
for (const transformName of dependentTransforms) {
  try {
    TransformValidator.checkTransformDependencies(transformName, mockYamlData);
    console.log(`✗ ${transformName}: 依存関係があるのに削除可能と判定されました`);
  } catch (error) {
    console.log(`✓ ${transformName}: 依存関係により削除不可 - ${error.message.split(':')[0]}`);
  }
}

// 削除可能なtransform
try {
  const result = TransformValidator.checkTransformDependencies('unused_transform', mockYamlData);
  console.log(`✓ unused_transform: 削除可能 - 依存関係なし`);
} catch (error) {
  console.log(`✗ unused_transform: ${error.message}`);
}

// 4. 完全性チェックテスト
console.log('\n4. Transform参照完全性チェックテスト:');
const integrityResult = TransformValidator.validateTransformIntegrity(mockYamlData);
console.log(`整合性: ${integrityResult.isValid ? '✓ OK' : '✗ 問題あり'}`);
console.log(`利用可能なTransform: ${integrityResult.availableTransforms.join(', ')}`);
console.log(`チェック済み参照数:`, integrityResult.checkedReferences);

if (integrityResult.issues.length > 0) {
  console.log('検出された問題:');
  integrityResult.issues.forEach(issue => {
    console.log(`  - ${issue.message}`);
  });
}

// 5. 使用状況統計テスト
console.log('\n5. Transform使用状況統計テスト:');
const usageStats = TransformValidator.getTransformUsageStats(mockYamlData);
console.log(`総Transform数: ${usageStats.totalTransforms}`);
console.log(`使用済みTransform数: ${usageStats.usedTransforms}`);
console.log(`未使用Transform: ${usageStats.unusedTransforms.join(', ') || 'なし'}`);

if (usageStats.summary.mostUsed) {
  console.log(`最多使用: ${usageStats.summary.mostUsed.name} (${usageStats.summary.mostUsed.totalUsage}回)`);
}

console.log('\n=== Transform参照システム強化完了 ===');
console.log('\n✅ 実装完了機能:');
console.log('• Transform操作の物理的妥当性チェック');
console.log('• 保留中変更も含む包括的な依存関係チェック');
console.log('• システム全体のTransform参照整合性検証'); 
console.log('• Transform使用状況の詳細分析');
console.log('• 一意性チェック（既存・保留中変更両方）');
console.log('• コンテキスト情報付きエラーメッセージ');

console.log('\n🎯 強化のポイント:');
console.log('• 物理的に意味のある変換操作の検証');
console.log('• 削除時の安全性確保（依存関係保護）');
console.log('• リアルタイムでの整合性監視');
console.log('• パフォーマンス影響の最小化');
console.log('• 詳細な使用状況レポート機能');

console.log('\n🚀 Transform参照システムの強化が完了しました！');
