// mcp/middleware/errorHandler.js
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError, PhysicsError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export function handleMcpError(error, context = {}) {
  logger.error('MCP操作エラー', { error: error.message, context });

  if (error instanceof ValidationError) {
    return new McpError(ErrorCode.InvalidParams, `入力エラー: ${error.message}`);
  }
  
  if (error instanceof PhysicsError) {
    return new McpError(ErrorCode.InvalidParams, `物理パラメータエラー: ${error.message}`);
  }
  
  if (error instanceof McpError) {
    return error;
  }
  
  // 予期しないエラー
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
