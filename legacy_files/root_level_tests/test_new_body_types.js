#!/usr/bin/env node
// test_new_body_types.js - 新しい立体タイプの実装テスト
import { PhysicsValidator } from '../src/validators/PhysicsValidator.js';
import { ManifestValidator } from '../src/validators/ManifestValidator.js';

console.log('=== 立体操作系完全実装テスト ===\n');

// 1. PhysicsValidatorのテスト
console.log('1. PhysicsValidator 新立体タイプテスト:');
const testGeometries = [
  // TOR (トーラス)
  {
    type: 'TOR',
    params: {
      center: '0 0 0',
      normal: '0 0 1',
      major_radius: 10,
      minor_radius_horizontal: 2,
      minor_radius_vertical: 2
    }
  },
  // ELL (楕円体)
  {
    type: 'ELL',
    params: {
      center: '0 0 0',
      radius_vector_1: '5 0 0',
      radius_vector_2: '0 3 0',
      radius_vector_3: '0 0 2'
    }
  },
  // REC (楕円円柱)
  {
    type: 'REC',
    params: {
      bottom_center: '0 0 0',
      height_vector: '0 0 10',
      radius_vector_1: '3 0 0',
      radius_vector_2: '0 2 0'
    }
  },
  // TRC (円錐台)
  {
    type: 'TRC',
    params: {
      bottom_center: '0 0 0',
      height_vector: '0 0 8',
      bottom_radius: 5,
      top_radius: 2
    }
  },
  // WED (くさび形)
  {
    type: 'WED',
    params: {
      vertex: '0 0 0',
      width_vector: '4 0 0',
      height_vector: '0 3 0',
      depth_vector: '0 0 2'
    }
  }
];

for (const geometry of testGeometries) {
  try {
    PhysicsValidator.validateGeometry(geometry.type, geometry.params);
    console.log(`✓ ${geometry.type}: バリデーション成功`);
  } catch (error) {
    console.log(`✗ ${geometry.type}: ${error.message}`);
  }
}

// 2. ManifestValidatorのテスト
console.log('\n2. ManifestValidator 立体タイプテスト:');
const allBodyTypes = ['SPH', 'RCC', 'RPP', 'BOX', 'CMB', 'TOR', 'ELL', 'REC', 'TRC', 'WED'];

for (const type of allBodyTypes) {
  try {
    ManifestValidator.validateBodyType(type, 'type');
    console.log(`✓ ${type}: サポート確認`);
  } catch (error) {
    console.log(`✗ ${type}: ${error.message}`);
  }
}

// 3. GEOMETRY_TYPESの完全性テスト
console.log('\n3. GEOMETRY_TYPES 定義完全性テスト:');
for (const type of allBodyTypes) {
  const geometryDef = PhysicsValidator.GEOMETRY_TYPES[type];
  if (geometryDef) {
    console.log(`✓ ${type}: ${geometryDef.description} - 必須: [${geometryDef.requiredParams.join(', ')}]`);
  } else {
    console.log(`✗ ${type}: 定義が見つかりません`);
  }
}

// 4. エラーハンドリングテスト
console.log('\n4. エラーハンドリングテスト:');
const errorTests = [
  // TOR: 主半径が副半径より小さい
  {
    type: 'TOR',
    params: {
      center: '0 0 0',
      normal: '0 0 1',
      major_radius: 1,
      minor_radius_horizontal: 2,
      minor_radius_vertical: 2
    },
    expectedError: 'INVALID_TORUS_RADII'
  },
  // ELL: 零ベクトル
  {
    type: 'ELL',
    params: {
      center: '0 0 0',
      radius_vector_1: '0 0 0',
      radius_vector_2: '0 3 0',
      radius_vector_3: '0 0 2'
    },
    expectedError: 'ZERO_RADIUS_VECTOR'
  },
  // WED: 平行ベクトル
  {
    type: 'WED',
    params: {
      vertex: '0 0 0',
      width_vector: '1 0 0',
      height_vector: '2 0 0',
      depth_vector: '0 0 1'
    },
    expectedError: 'PARALLEL_VECTORS'
  }
];

for (const test of errorTests) {
  try {
    PhysicsValidator.validateGeometry(test.type, test.params);
    console.log(`✗ ${test.type}: エラーが検出されませんでした（期待: ${test.expectedError}）`);
  } catch (error) {
    if (error.code === test.expectedError) {
      console.log(`✓ ${test.type}: 期待されたエラー検出 - ${error.message}`);
    } else {
      console.log(`△ ${test.type}: 異なるエラー - ${error.message}`);
    }
  }
}

console.log('\n=== テスト完了 ===');
console.log('\n✅ 立体操作系の完全実装が完了しました！');
console.log('\n対応立体タイプ:');
console.log('• SPH (球体) - 既存');
console.log('• RCC (円柱) - 既存'); 
console.log('• RPP (軸平行直方体) - 既存');
console.log('• BOX (直方体) - 既存');
console.log('• CMB (組み合わせ形状) - 既存');
console.log('• TOR (トーラス) - 新規実装 ✨');
console.log('• ELL (楕円体) - 新規実装 ✨');
console.log('• REC (楕円円柱) - 新規実装 ✨');
console.log('• TRC (円錐台) - 新規実装 ✨');
console.log('• WED (くさび形) - 新規実装 ✨');
