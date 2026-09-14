// utils/pendingView.js
//
// get 系ツールで「保留中の変更」を可視化するためのヘルパ。
//
// この MCP サーバは propose → applyChanges の二段階を採る。複数の変更をまとめて
// 原子的に適用するための仕組みで、途中で失敗しても中途半端な YAML が残らない。
// POKER 側の「立体を確定してからゾーンを定義する」という制約にも対応している。
//
// ただし get が this.data（YAML の内容）しか見ないため、propose の直後に get を
// 呼ぶと変更が見えない。利用者からは「提案が成功したのに反映されていない」と
// 映り、再度 propose して重複エラーになる流れが起こり得る。
//
// そこで get の応答に pending を添える。data は書き換えず、保留分を別項目として
// 示すことで、確定済みと未確定を区別できるようにする。

/**
 * 指定した action の保留中変更を抜き出す
 * @param {Array} pendingChanges  [{action, data}, ...]
 * @param {string|string[]} actions  対象の action 名
 * @returns {Array} 該当する data の配列（新しい順ではなく提案順）
 */
export function pickPending(pendingChanges, actions) {
  const list = Array.isArray(actions) ? actions : [actions];
  return (pendingChanges || [])
    .filter(c => c && list.includes(c.action))
    .map(c => c.data);
}

/**
 * get 系の応答に添える pending 情報を作る
 * @param {Array} pendingChanges
 * @param {string|string[]} actions
 * @param {object} [opts]
 * @param {boolean} [opts.merge]  複数の保留を 1 つにマージして返す（部分更新系）
 * @returns {object|null} { pending, pending_count, note } または null
 */
export function pendingInfo(pendingChanges, actions, opts = {}) {
  const hits = pickPending(pendingChanges, actions);
  if (hits.length === 0) return null;

  const pending = opts.merge
    ? hits.reduce((acc, d) => Object.assign(acc, d), {})
    : (hits.length === 1 ? hits[0] : hits);

  return {
    pending,
    pending_count: hits.length,
    note: '保留中の変更があります。poker_applyChanges で確定するまで YAML には反映されません'
  };
}
