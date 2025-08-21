// test/mock_logger.js
// テスト用のシンプルなloggerモック

export const logger = {
  info: (message, meta) => console.log('[INFO]', message, meta || ''),
  warn: (message, meta) => console.log('[WARN]', message, meta || ''),
  error: (message, meta) => console.log('[ERROR]', message, meta || ''),
  debug: (message, meta) => console.log('[DEBUG]', message, meta || '')
};
