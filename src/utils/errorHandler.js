// utils/errorHandler.js
import { logger } from './logger.js';
import { ValidationError, PhysicsError, DataError } from './errors.js';

export function handleError(error, req, res, next) {
  const { id } = req.body || {};
  
  logger.error('エラーが発生しました', {
    error: error.message,
    stack: error.stack,
    request: {
      method: req.method,
      url: req.url,
      body: req.body
    }
  });

  // エラータイプ別の処理
  if (error instanceof ValidationError) {
    return res.json({
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -32602,
        message: `入力値エラー: ${error.message}`,
        data: {
          field: error.field,
          value: error.value
        }
      }
    });
  }

  if (error instanceof PhysicsError) {
    return res.json({
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -32000,
        message: `物理的制約エラー: ${error.message}`,
        data: { type: error.code }
      }
    });
  }

  if (error instanceof DataError) {
    return res.json({
      jsonrpc: '2.0',
      id: id,
      error: {
        code: -32001,
        message: `データエラー: ${error.message}`,
        data: { operation: error.operation }
      }
    });
  }

  // 予期しないエラー
  return res.json({
    jsonrpc: '2.0',
    id: id,
    error: {
      code: -32603,
      message: 'サーバー内部エラーが発生しました',
      data: { timestamp: new Date().toISOString() }
    }
  });
}
