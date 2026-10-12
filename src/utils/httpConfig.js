// utils/httpConfig.js - HTTP の入口（mcp_server_http.js）の設定
//
//   POKER_MCP_HTTP_HOST           待ち受けるアドレス（既定 127.0.0.1 = この機械の中からだけ）
//   POKER_MCP_HTTP_PORT           ポート（既定 3939）
//   POKER_MCP_HTTP_TOKEN          接続に要る合い言葉（Authorization: Bearer <token>）
//   POKER_MCP_HTTP_ALLOWED_HOSTS  受け付ける Host 名（カンマ区切り。トンネルの公開名など）
//
// 外から届く設定（127.0.0.1 以外で待ち受ける、または外の Host 名を許す）では
// トークンを必須にし、無ければ起動しない。トークン無しで動くのは、この機械の中だけ。

const LOOPBACK_NAMES = ['localhost', '127.0.0.1', '::1', '[::1]'];
export const DEFAULT_HTTP_PORT = 3939;
export const MIN_TOKEN_LENGTH = 16;

export function isLoopbackHost(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return LOOPBACK_NAMES.includes(n) || /^127\.\d+\.\d+\.\d+$/.test(n);
}

/** Host ヘッダ（"example.com:443" や "[::1]:3939"）から名前の部分だけを取り出す */
export function hostnameOf(hostHeader) {
  if (!hostHeader) return '';
  const h = String(hostHeader).trim().toLowerCase();
  if (h.startsWith('[')) {
    const end = h.indexOf(']');
    return end > 0 ? h.slice(0, end + 1) : h;
  }
  const colon = h.lastIndexOf(':');
  return colon > 0 && h.indexOf(':') === colon ? h.slice(0, colon) : h;
}

/**
 * 環境変数から設定を作る。誤りは errors に入れて返す（呼び出し側が起動を止める）。
 * @returns {{host, port, token, allowedHosts: string[]|null, exposed: boolean, errors: string[], warnings: string[]}}
 */
export function resolveHttpConfig(env = process.env) {
  const errors = [];
  const warnings = [];

  const host = (env.POKER_MCP_HTTP_HOST || '127.0.0.1').trim();

  let port = DEFAULT_HTTP_PORT;
  if (env.POKER_MCP_HTTP_PORT !== undefined && env.POKER_MCP_HTTP_PORT !== '') {
    port = Number(env.POKER_MCP_HTTP_PORT);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      errors.push(`POKER_MCP_HTTP_PORT が不正です: ${env.POKER_MCP_HTTP_PORT}`);
    }
  }

  const token = env.POKER_MCP_HTTP_TOKEN ? String(env.POKER_MCP_HTTP_TOKEN).trim() : '';
  if (token && token.length < MIN_TOKEN_LENGTH) {
    errors.push(`POKER_MCP_HTTP_TOKEN が短すぎます（${MIN_TOKEN_LENGTH} 文字以上。32 文字以上の乱数を推奨）`);
  }

  const extra = (env.POKER_MCP_HTTP_ALLOWED_HOSTS || '')
    .split(',').map(s => hostnameOf(s)).filter(Boolean);

  // 外から届く設定か
  const exposed = !isLoopbackHost(host) || extra.some(h => !isLoopbackHost(h));
  if (exposed && !token) {
    errors.push(
      '外から接続できる設定（POKER_MCP_HTTP_HOST が 127.0.0.1 以外、または POKER_MCP_HTTP_ALLOWED_HOSTS に外の名前）では ' +
      'POKER_MCP_HTTP_TOKEN が必須です'
    );
  }

  // Host ヘッダの検査に使う名前の一覧。null は検査しない。
  let allowedHosts;
  if (extra.length > 0) {
    allowedHosts = [...new Set([...LOOPBACK_NAMES, ...extra])];
  } else if (isLoopbackHost(host)) {
    allowedHosts = [...LOOPBACK_NAMES];
  } else {
    allowedHosts = null;
    warnings.push('POKER_MCP_HTTP_ALLOWED_HOSTS が未設定のため Host ヘッダを検査しません（トークンで保護）');
  }

  return { host, port, token, allowedHosts, exposed, errors, warnings };
}
