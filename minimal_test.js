// minimal_test.js - 最小限のテスト
console.log('=== 最小限のテスト開始 ===');

// まず基本的なモジュールをテスト
import { logger } from './src/utils/logger.js';

console.log('Logger インポート成功');

// ログテスト
logger.info('テストログメッセージ');
console.log('Logger 動作テスト完了');

console.log('✅ 最小限のテスト成功');
