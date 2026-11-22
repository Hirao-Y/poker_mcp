// gui/security.js - Web GUI（poker-gui）の守り
//
// 待ち受けは 127.0.0.1 だけ。そのうえで次を検査する（設計書 7 章）。
//   - Host ヘッダ: 127.0.0.1 / localhost / [::1] と自分のポートだけ（DNS rebinding 対策）
//   - Origin: 付いていれば自分のオリジンと一致すること（他のサイトから呼ばせない）
//   - Sec-Fetch-Site: 付いていれば same-origin か none（同上。古いブラウザは付けない）
//   - トークン: /api は Authorization: Bearer <起動ごとの乱数>。比較は時間一定
//   - ファイル: 作業フォルダの中だけ（.. やシンボリックリンクで外へ出るものを拒否）
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const LOOPBACK = ['127.0.0.1', 'localhost', '[::1]'];

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** 長さが違っても時間差で中身が漏れないよう、ハッシュ同士を比べる（poker-mcp の httpServer と同じ） */
export function tokenMatches(given, expected) {
  if (!given || !expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

/** 受け付ける Host ヘッダの一覧（"127.0.0.1:<port>" など） */
export function allowedHosts(port) {
  return LOOPBACK.map(h => `${h}:${port}`);
}

/** 受け付けるオリジンの一覧（"http://127.0.0.1:<port>" など） */
export function allowedOrigins(port) {
  return allowedHosts(port).map(h => `http://${h}`);
}

/**
 * 要求の出どころを検査する。問題があれば理由の文字列、無ければ null。
 * @param {import('http').IncomingMessage} req
 * @param {number} port
 */
export function checkRequestSource(req, port) {
  const host = String(req.headers.host || '').toLowerCase();
  // 画面の読み込み（アドレス欄・リンクからのページ遷移で GET /）は、他のサイトのリンクから開いても通す（2.3.3 の後）。
  //   画面そのものに秘密は無く（トークンは URL の # の後ろでサーバには届かない）、/api はトークンと出どころの検査を通らないと使えない。
  //   iframe に埋めることは frame-ancestors 'self' で防いでいる。Host の検査（DNS rebinding 対策）はこの場合もする。
  if (isPageNavigation(req)) return allowedHosts(port).includes(host) ? null : `Host not allowed: ${host || '(none)'}`;
  if (!allowedHosts(port).includes(host)) return `Host not allowed: ${host || '(none)'}`;
  const origin = req.headers.origin;
  if (origin !== undefined && !allowedOrigins(port).includes(String(origin).toLowerCase())) {
    return `Origin not allowed: ${origin}`;
  }
  const site = req.headers['sec-fetch-site'];
  if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    return `Cross-site request rejected: ${site}`;
  }
  return null;
}

/** 画面（GET / または /index.html）のページ遷移か。ブラウザが付ける Sec-Fetch-Mode: navigate と Sec-Fetch-Dest: document で見分ける */
export function isPageNavigation(req) {
  if (req.method !== 'GET') return false;
  const p = String(req.url || '').split(/[?#]/)[0];
  if (p !== '/' && p !== '/index.html') return false;
  return req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document';
}

/** Authorization: Bearer <token> の検査 */
export function checkToken(req, token) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(req.headers.authorization || ''));
  return Boolean(m) && tokenMatches(m[1], token);
}

/**
 * 作業フォルダからの相対パスを、作業フォルダの中の絶対パスに直す。外に出るものは例外。
 * 実在するものはシンボリックリンクを解いてから判定する。まだ無いもの（新規保存）は親フォルダで判定する。
 * @param {string} root 作業フォルダ（realpath 済み）
 * @param {string} rel  相対パス（'/' 区切り。空なら作業フォルダそのもの）
 */
export function resolveInside(root, rel) {
  const r = String(rel ?? '');
  if (r.includes('\0')) throw Object.assign(new Error('invalid path'), { status: 400 });
  if (path.isAbsolute(r) || /^[a-zA-Z]:/.test(r)) throw Object.assign(new Error('absolute path is not allowed'), { status: 400 });
  const abs = path.resolve(root, r);
  const inside = (p) => p === root || p.startsWith(root + path.sep);
  if (!inside(abs)) throw Object.assign(new Error('outside of the workspace'), { status: 403 });
  let real;
  try {
    real = fs.realpathSync(abs);
  } catch {
    // まだ無い（新規保存など）：親フォルダが作業フォルダの中で実在すること
    let parent;
    try { parent = fs.realpathSync(path.dirname(abs)); } catch { throw Object.assign(new Error('not found'), { status: 404 }); }
    if (!inside(parent)) throw Object.assign(new Error('outside of the workspace'), { status: 403 });
    return path.join(parent, path.basename(abs));
  }
  if (!inside(real)) throw Object.assign(new Error('outside of the workspace'), { status: 403 });
  return real;
}

/** 応答に付ける守りのヘッダ（画面・静的ファイル用） */
export const PAGE_HEADERS = {
  // 既存の画面（エディタ・3D・グラフ）は inline スクリプトと eval（3D の図）を使う。外部のスクリプトは読まない。
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' data: blob:; font-src 'self' data:; " +
    "frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
