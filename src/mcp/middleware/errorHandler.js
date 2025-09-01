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

export function safeExecute(fn, context = {}) {
  return async (request) => {
    try {
      const result = await fn(request);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      throw handleMcpError(error, context);
    }
  };
}
