// mcp/middleware/errorHandler.js
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError, PhysicsError, CalculationError } from '../../utils/errors.js';
import { PokerMcpError } from '../../utils/mcpErrors.js';
import { logger } from '../../utils/logger.js';

export function handleMcpError(error, context = {}) {
  logger.error('MCP操作エラー', { error: error.message, context });

  // PokerMcpErrorは既に適切なMcpErrorなのでそのまま返す
  if (error instanceof PokerMcpError) {
    return error;
  }
  
  // CalculationError の処理 - MCPエラーコードが指定されている場合は使用
  if (error instanceof CalculationError) {
    const mcpCode = error.mcpErrorCode || ErrorCode.InternalError;
    return new McpError(mcpCode, `計算エラー: ${error.message}`, error.context);
  }
  
  // 従来の ValidationError を適切な PokerMcpError に変換
  if (error instanceof ValidationError) {
    return PokerMcpError.validationError(error.message, error.field, error.value);
  }
  
  // PhysicsError の処理
  if (error instanceof PhysicsError) {
    return PokerMcpError.validationError(`物理パラメータエラー: ${error.message}`, error.field, error.value);
  }
  
  // 既存のMcpError
  if (error instanceof McpError) {
    return error;
  }
  
  // その他の予期しないエラー
  return new McpError(ErrorCode.InternalError, `内部エラー: ${error.message}`);
}

/**
 * ハンドラの戻り値を MCP の CallToolResult に整える。
 *  - すでに CallToolResult の形（content 配列を持つ）ならそのまま返す。
 *    包み直すと isError が text の中に埋もれ、失敗が成功として伝わってしまう。
 *  - { success: false, ... } を返すハンドラは失敗として isError: true を付ける。
 *    AI クライアントは本文を読まずに isError で成否を判断することがあるため。
 */
export function toCallToolResult(result) {
  if (result && typeof result === 'object' && Array.isArray(result.content)) {
    return result;
  }
  const wrapped = { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  if (result && typeof result === 'object' && result.success === false) {
    wrapped.isError = true;
  }
  return wrapped;
}

export function safeExecute(fn, context = {}) {
  return async (request) => {
    try {
      const result = await fn(request);
      return toCallToolResult(result);
    } catch (error) {
      throw handleMcpError(error, context);
    }
  };
}
