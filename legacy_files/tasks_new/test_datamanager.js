// DataManager初期化テスト
import { SafeDataManager } from './src/services/DataManager.js';

async function testDataManager() {
  console.log('=== DataManager初期化テスト開始 ===');
  
  try {
    const dataManager = new SafeDataManager('tasks/pokerinputs.yaml', 'tasks/pending_changes.json');
    console.log('1. DataManager作成完了');
    
    await dataManager.initialize();
    console.log('2. 初期化完了');
    
    console.log('3. データ確認:');
    console.log('   - data存在:', !!dataManager.data);
    console.log('   - pendingChanges存在:', !!dataManager.pendingChanges);
    console.log('   - unit設定:', dataManager.data?.unit);
    
  } catch (error) {
    console.error('テストエラー:', error.message);
  }
}

testDataManager();