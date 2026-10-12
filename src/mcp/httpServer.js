// mcp/httpServer.js - MCP を HTTP（Streamable HTTP）で受ける入口
//
// 道具の処理は stdio 版と同じもの（PokerMcpServer）を使い、通信路だけが違う。
// セッションを持たない方式（stateless）で、POST /mcp 1 回ごとに Server と transport を作って捨てる。
// 応答は SSE ではなく素の JSON（enableJsonResponse）で返す。プロキシやトンネルを通しやすい。
//
//   POST /mcp     MCP の要求（Authorization: Bearer <POKER_MCP_HTTP_TOKEN>）
//   GET  /health  死活確認（認証なし。版と状態だけを返す）

import http from 'http';
import crypto from 'crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PKG_VERSION } from './server.js';
import { hostnameOf } from '../utils/httpConfig.js';
import { logger } from '../utils/logger.js';

export const MCP_PATH = '/mcp';
const MAX_BODY_BYTES = 10 * 1024 * 1024;

function sendJson(res, status, obj, headers = {}) {
  if (res.headersSent) return;
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
}

function rpcError(res, status, code, message, headers = {}) {
  sendJson(res, status, { jsonrpc: '2.0', error: { code, message }, id: null }, headers);
}

/** 長さが違っても時間差で中身が漏れないよう、ハッシュ同士を比べる */
function tokenMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * @param {import('./server.js').PokerMcpServer} pokerServer initialize() 済みのもの
 * @param {ReturnType<import('../utils/httpConfig.js').resolveHttpConfig>} cfg
 * @returns {http.Server}
 */
export function createHttpServer(pokerServer, cfg) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    const remote = req.socket.remoteAddress;

    try {
      // Host ヘッダの検査（DNS rebinding 対策）。/health も含めて行う。
      if (cfg.allowedHosts) {
        const name = hostnameOf(req.headers.host);
        if (!cfg.allowedHosts.includes(name)) {
          logger.warn('HTTP: Host を拒否', { host: req.headers.host, remote });
          return rpcError(res, 403, -32000, `Host not allowed: ${req.headers.host || '(none)'}`);
        }
      }

      if (url.pathname === '/health') {
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' }, { Allow: 'GET' });
        return sendJson(res, 200, { status: 'ok', name: 'poker-mcp', version: PKG_VERSION });
      }

      if (url.pathname !== MCP_PATH) {
        return sendJson(res, 404, { error: 'not found' });
      }

      // ブラウザからの呼び出し（Origin 付き）は受けない。MCP のクライアントは Origin を付けない。
      if (req.headers.origin) {
        logger.warn('HTTP: Origin 付きの要求を拒否', { origin: req.headers.origin, remote });
        return rpcError(res, 403, -32000, 'Requests from browsers are not accepted');
      }

      if (cfg.token) {
        const auth = req.headers.authorization || '';
        const m = /^Bearer\s+(.+)$/i.exec(auth);
        if (!m || !tokenMatches(m[1].trim(), cfg.token)) {
          logger.warn('HTTP: 認証失敗', { remote, hasAuth: Boolean(auth) });
          return rpcError(res, 401, -32001, 'Unauthorized', { 'WWW-Authenticate': 'Bearer' });
        }
      }

      // セッションを持たないので、サーバからの通知の受け口（GET）と終了（DELETE）は無い
      if (req.method !== 'POST') {
        return rpcError(res, 405, -32000, 'Method not allowed', { Allow: 'POST' });
      }

      let body;
      try {
        const text = await readBody(req);
        body = JSON.parse(text);
      } catch (e) {
        if (e.status === 413) return rpcError(res, 413, -32000, 'Request body too large');
        return rpcError(res, 400, -32700, 'Parse error');
      }

      const mcp = pokerServer.createProtocolServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      res.on('close', () => {
        transport.close().catch(() => {});
        mcp.close().catch(() => {});
      });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      logger.error('HTTP: 要求の処理でエラー', { error: error.message, stack: error.stack });
      rpcError(res, 500, -32603, 'Internal server error');
    }
  });

  // 同期の計算は数分かかることがある。Node の既定（300 秒）で切らない。
  server.requestTimeout = 0;
  server.headersTimeout = 60_000;
  return server;
}
