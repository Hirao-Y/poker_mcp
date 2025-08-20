// test/sourceOperations.test.js
// updateSource と deleteSource のユニットテスト

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { TaskManager } from '../src/services/TaskManager.js';
import { ValidationError } from '../src/utils/errors.js';
import fs from 'fs/promises';
import path from 'path';

describe('Source Operations Tests', () => {
  let taskManager;
  const testYamlFile = 'test/test_pokerinputs.yaml';
  const testPendingFile = 'test/test_pending_changes.json';

  beforeEach(async () => {
    // テスト用の初期データを作成
    const initialData = {
      body: [
        { name: 'test_sphere', type: 'SPH', center: '0 0 0', radius: 10 }
      ],
      zone: [
        { body_name: 'test_sphere', material: 'Steel', density: 7.8 }
      ],
      source: [
        {
          name: 'test_co60_source',
          type: 'point',
          position: '0 0 0',
          inventory: [{ nuclide: 'Co-60', radioactivity: 3.7e10 }],
          cutoff_rate: 0.01
        },
        {
          name: 'test_cs137_source',
          type: 'point',
          position: '5 0 0',
          inventory: [{ nuclide: 'Cs-137', radioactivity: 1.85e10 }],
          cutoff_rate: 0.01
        }
      ],
      transform: [],
      buildup_factor: []
    };
    
    await fs.mkdir('test', { recursive: true });
    await fs.writeFile(testYamlFile, JSON.stringify(initialData));
    await fs.writeFile(testPendingFile, '[]');
    
    taskManager = new TaskManager(testYamlFile, testPendingFile);
    await taskManager.initialize();
  });

  afterEach(async () => {
    // テストファイルのクリーンアップ
    try {
      await fs.unlink(testYamlFile);
      await fs.unlink(testPendingFile);
    } catch (error) {
      // ファイルが存在しない場合は無視
    }
  });

  describe('updateSource Tests', () => {
    test('正常系: 位置を更新できる', async () => {
      const result = await taskManager.updateSource('test_co60_source', {
        position: '10 10 10'
      });
      
      expect(result).toContain('提案: 線源 test_co60_source の更新を保留しました');
      expect(taskManager.pendingChanges).toHaveLength(1);
      expect(taskManager.pendingChanges[0].action).toBe('updateSource');
      expect(taskManager.pendingChanges[0].data.position).toBe('10 10 10');
    });

    test('正常系: 放射能を更新できる', async () => {
      const newInventory = [{ nuclide: 'Co-60', radioactivity: 2.5e10 }];
      
      const result = await taskManager.updateSource('test_co60_source', {
        inventory: newInventory
      });
      
      expect(result).toContain('提案: 線源 test_co60_source の更新を保留しました');
      expect(taskManager.pendingChanges).toHaveLength(1);
      expect(taskManager.pendingChanges[0].data.inventory).toEqual(newInventory);
    });

    test('正常系: カットオフレートを更新できる', async () => {
      const result = await taskManager.updateSource('test_co60_source', {
        cutoff_rate: 0.005
      });
      
      expect(result).toContain('提案: 線源 test_co60_source の更新を保留しました');
      expect(taskManager.pendingChanges[0].data.cutoff_rate).toBe(0.005);
    });

    test('正常系: 複数パラメータを同時更新できる', async () => {
      const result = await taskManager.updateSource('test_co60_source', {
        position: '20 20 20',
        cutoff_rate: 0.002,
        inventory: [{ nuclide: 'Co-60', radioactivity: 1.8e10 }]
      });
      
      expect(result).toContain('提案: 線源 test_co60_source の更新を保留しました');
      const changeData = taskManager.pendingChanges[0].data;
      expect(changeData.position).toBe('20 20 20');
      expect(changeData.cutoff_rate).toBe(0.002);
      expect(changeData.inventory[0].radioactivity).toBe(1.8e10);
    });

    test('異常系: 存在しない線源名', async () => {
      await expect(taskManager.updateSource('nonexistent_source', {
        position: '0 0 0'
      })).rejects.toThrow(ValidationError);
      
      await expect(taskManager.updateSource('nonexistent_source', {
        position: '0 0 0'
      })).rejects.toThrow('線源 nonexistent_source が見つかりません');
    });

    test('異常系: name未指定', async () => {
      await expect(taskManager.updateSource('', {
        position: '0 0 0'
      })).rejects.toThrow(ValidationError);
      
      await expect(taskManager.updateSource(null, {
        position: '0 0 0'
      })).rejects.toThrow('線源のnameは必須です');
    });

    test('異常系: 無効な位置形式', async () => {
      // 座標数不正
      await expect(taskManager.updateSource('test_co60_source', {
        position: '0 0'
      })).rejects.toThrow('positionは3つの座標値（x y z）で指定してください');
      
      // 非数値
      await expect(taskManager.updateSource('test_co60_source', {
        position: 'a b c'
      })).rejects.toThrow('positionの座標値は数値で指定してください');
      
      // 空文字
      await expect(taskManager.updateSource('test_co60_source', {
        position: ''
      })).rejects.toThrow('positionは文字列で指定してください');
    });

    test('異常系: 無効なインベントリ', async () => {
      // 配列でない
      await expect(taskManager.updateSource('test_co60_source', {
        inventory: 'invalid'
      })).rejects.toThrow('inventoryは配列で1つ以上の要素が必要です');
      
      // 空配列
      await expect(taskManager.updateSource('test_co60_source', {
        inventory: []
      })).rejects.toThrow('inventoryは配列で1つ以上の要素が必要です');
      
      // nuclide未指定
      await expect(taskManager.updateSource('test_co60_source', {
        inventory: [{ radioactivity: 1e10 }]
      })).rejects.toThrow('inventory要素にnuclideが必要');
      
      // 負の放射能
      await expect(taskManager.updateSource('test_co60_source', {
        inventory: [{ nuclide: 'Co-60', radioactivity: -1e10 }]
      })).rejects.toThrow('radioactivityは0以上の数値が必要');
    });

    test('異常系: 無効なカットオフレート', async () => {
      // 負の値
      await expect(taskManager.updateSource('test_co60_source', {
        cutoff_rate: -0.01
      })).rejects.toThrow('cutoff_rateは0以上の数値が必要');
      
      // 非数値
      await expect(taskManager.updateSource('test_co60_source', {
        cutoff_rate: 'invalid'
      })).rejects.toThrow('cutoff_rateは0以上の数値が必要');
    });

    test('制限事項: typeの変更禁止', async () => {
      await expect(taskManager.updateSource('test_co60_source', {
        type: 'surface'
      })).rejects.toThrow('線源のtypeは変更できません');
    });
  });

  describe('deleteSource Tests', () => {
    test('正常系: 線源を削除できる', async () => {
      const result = await taskManager.deleteSource('test_co60_source');
      
      expect(result).toContain('提案: 線源 test_co60_source を削除');
      expect(taskManager.pendingChanges).toHaveLength(1);
      expect(taskManager.pendingChanges[0].action).toBe('deleteSource');
      expect(taskManager.pendingChanges[0].data.name).toBe('test_co60_source');
    });

    test('異常系: 存在しない線源名', async () => {
      await expect(taskManager.deleteSource('nonexistent_source'))
        .rejects.toThrow(ValidationError);
      
      await expect(taskManager.deleteSource('nonexistent_source'))
        .rejects.toThrow('線源 nonexistent_source が見つかりません');
    });

    test('異常系: name未指定', async () => {
      await expect(taskManager.deleteSource(''))
        .rejects.toThrow(ValidationError);
      
      await expect(taskManager.deleteSource(null))
        .rejects.toThrow('線源のnameは必須です');
    });
  });

  describe('findSourceByName Tests', () => {
    test('正常系: 存在する線源を取得できる', () => {
      const source = taskManager.findSourceByName('test_co60_source');
      expect(source).toBeDefined();
      expect(source.name).toBe('test_co60_source');
      expect(source.type).toBe('point');
    });

    test('正常系: 存在しない線源はundefined', () => {
      const source = taskManager.findSourceByName('nonexistent_source');
      expect(source).toBeUndefined();
    });
  });

  describe('validatePosition Tests', () => {
    test('正常系: 有効な位置座標', () => {
      // 正の数値
      expect(() => taskManager.validatePosition('10 20 30')).not.toThrow();
      
      // 負の数値
      expect(() => taskManager.validatePosition('-10 -20 -30')).not.toThrow();
      
      // 小数点
      expect(() => taskManager.validatePosition('1.5 2.5 3.5')).not.toThrow();
      
      // ゼロ
      expect(() => taskManager.validatePosition('0 0 0')).not.toThrow();
    });

    test('異常系: 無効な位置座標', () => {
      // 空文字
      expect(() => taskManager.validatePosition('')).toThrow(ValidationError);
      
      // null/undefined
      expect(() => taskManager.validatePosition(null)).toThrow(ValidationError);
      expect(() => taskManager.validatePosition(undefined)).toThrow(ValidationError);
      
      // 座標数不正
      expect(() => taskManager.validatePosition('10 20')).toThrow(ValidationError);
      expect(() => taskManager.validatePosition('10 20 30 40')).toThrow(ValidationError);
      
      // 非数値
      expect(() => taskManager.validatePosition('a b c')).toThrow(ValidationError);
      expect(() => taskManager.validatePosition('10 b 30')).toThrow(ValidationError);
    });
  });

  describe('Integration Tests', () => {
    test('統合テスト: 線源のCRUD完全サイクル', async () => {
      // 1. 線源作成
      await taskManager.proposeSource({
        name: 'integration_test_source',
        type: 'point',
        position: '0 0 0',
        inventory: [{ nuclide: 'Ir-192', radioactivity: 1e11 }],
        cutoff_rate: 0.01
      });
      
      // 2. 線源更新
      await taskManager.updateSource('integration_test_source', {
        position: '50 50 50',
        cutoff_rate: 0.005
      });
      
      // 3. 線源削除
      await taskManager.deleteSource('integration_test_source');
      
      // 4. 変更適用
      const applyResult = await taskManager.applyChanges();
      
      expect(applyResult).toContain('変更を正常に適用しました');
      
      // 最終的に線源が存在しないことを確認
      const finalSource = taskManager.findSourceByName('integration_test_source');
      expect(finalSource).toBeUndefined();
    });

    test('エラー回復テスト: 無効な操作後の正常操作', async () => {
      // 無効な操作（存在しない線源の更新）
      await expect(taskManager.updateSource('invalid_source', {
        position: '0 0 0'
      })).rejects.toThrow();
      
      // 正常な操作が引き続き動作することを確認
      const result = await taskManager.updateSource('test_co60_source', {
        position: '1 1 1'
      });
      
      expect(result).toContain('提案: 線源 test_co60_source の更新を保留しました');
    });
  });
});
