// utils/summaryParser.js
// POKER の .summary（YAML形式）から result_total を構造化抽出する。
//
// POKER 2.1.2 以降は次の形になった。
//   - 先頭に # POKER-SUMMARY のマジックコメント
//   - ヘッダが information: 配下（format / format_version / generator ...）
//   - 検出事項が warnings: ノード（code / severity / count / message / occurrences）
//   - -s 付きでも線源ごとが sources: の配列になり YAML として読める
//
// それ以前は次の 2 点で標準の YAML パーサに掛けられなかった。
//   - 末尾に非YAMLの警告フッタ（"[!] ..."）が付く
//   - -s 付きだと intermediate: / result: がトップレベルで繰り返され重複キーになる
//
// 手元に古いサマリーが残っていても読めるよう、両方に対応する。
import fs from 'fs';
import yaml from 'js-yaml';
import { logger } from './logger.js';

// 旧形式: トップレベルで重複するキーに添字を付けてからパースし、配列に戻す。
// 書き換えるのは行頭から始まるキー行だけなので、ネストした内容には触れない。
function loadWithDuplicateKeys(text) {
  const lines = text.split(/\r?\n/);
  const marks = [];
  lines.forEach((l, i) => {
    const m = l.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (m) marks.push({ line: i, key: m[1] });
  });
  const count = {};
  for (const m of marks) count[m.key] = (count[m.key] || 0) + 1;
  const dup = Object.keys(count).filter(k => count[k] > 1);
  if (dup.length === 0) return null;   // 重複が無ければ通常のパースで足りる

  const seen = {};
  for (const m of marks) {
    if (!dup.includes(m.key)) continue;
    const n = (seen[m.key] = (seen[m.key] || 0) + 1) - 1;
    lines[m.line] = `${m.key}__${n}:`;
  }
  const doc = yaml.load(lines.join('\n'));
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    const m = k.match(/^(.*)__(\d+)$/);
    if (m) (out[m[1]] = out[m[1]] || [])[Number(m[2])] = v;
    else out[k] = v;
  }
  return out;
}

/**
 * @param {string} summaryPath  .summary ファイルの絶対パス
 * @returns {null | {result_total, warnings, notes, columns, elapsed_time, information, sources}}
 *          読み取り/パース不能時は null（呼び出し側で計算成功を損なわないこと）
 */
export function parseDoseSummary(summaryPath) {
  let raw;
  try {
    raw = fs.readFileSync(summaryPath, 'utf8');
  } catch (e) {
    logger.warn('summary ファイル読取失敗', { summaryPath, error: e.message });
    return null;
  }

  // 旧形式の警告フッタを除去（新形式では出ないので該当行が無いだけ）
  const legacyWarnings = [];
  const kept = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line.trimStart().startsWith('[!]')) {
      const t = line.trim();
      if (t) legacyWarnings.push(t);
    } else {
      kept.push(line);
    }
  }
  const text = kept.join('\n');

  let doc;
  try {
    doc = yaml.load(text);
  } catch (e) {
    // 旧形式の -s 付き（intermediate/result の重複キー）を救済する
    try {
      doc = loadWithDuplicateKeys(text);
      if (!doc) throw e;
      logger.info('重複キーを含む旧形式の summary を読み込みました', { summaryPath });
    } catch (e2) {
      logger.warn('summary YAML パース失敗', { summaryPath, error: e2.message });
      return null;
    }
  }
  if (!doc) return null;

  // 検出事項。新形式は warnings ノード、旧形式は [!] 行。
  // code は文面に依存しないので、判定にはこちらを使う。
  const warnings = [];
  if (Array.isArray(doc.warnings)) {
    for (const w of doc.warnings) {
      warnings.push({
        code: w.code || null,
        severity: w.severity || 'info',
        count: typeof w.count === 'number' ? w.count : null,
        message: w.message || '',
        occurrences: w.occurrences || []
      });
    }
  }
  for (const t of legacyWarnings) {
    warnings.push({ code: null, severity: 'info', count: null, message: t, occurrences: [] });
  }

  // 80 mfp クランプは打ち切りではなく、それ以上の精度が意味を持たない領域での
  // 保守側の近似。結果はそのまま採用してよい。
  const notes = [];
  const hasTooThick = warnings.some(w =>
    w.code === 'BUILDUP_MFP_EXCEEDED' ||
    /最大厚さ|ビルドアップ係数の最大厚|too\s*thick/i.test(w.message));
  if (hasTooThick) {
    notes.push('ビルドアップ係数の最大厚さ(全材料 80 mfp)を超える透過線は 80 mfp の値にクランプされ、保守側の評価になります。該当線が高エネルギー主成分でなければ線量への寄与は小さいことが多いです。');
  }
  const hasTooSlanted = warnings.some(w =>
    w.code === 'SLANT_ANGLE_EXCEEDED' || /スラント|slant/i.test(w.message));
  if (hasTooSlanted) {
    notes.push('スラント補正の角度上限を超える透過線があります。計算自体は行われており、結果は採用できます（角度が急な経路は検出器位置のわずかなずれで値が大きく変わるため上限が設けられています）。');
  }

  const information = doc.information || null;
  const sources = Array.isArray(doc.sources) ? doc.sources.map(s => s && s.name).filter(Boolean) : [];

  const rt = doc.result_total;
  if (!rt) {
    return { result_total: [], warnings, notes, columns: [], elapsed_time: null, information, sources };
  }

  const detectors = (rt.detector || []).map(d => ({
    name: d.name,
    dimensionality: d.dimensionality,
    total_points: d.total_points,
    points: (d.points || []).map(p => ({
      coords: p.coords,   // { x, y, z, unit }
      doses: p.doses      // { 'E(AP)': {TOTAL,g1,n,g12,DOSE0}, 'DskinM(AP)': {...}, 'H*(10)': {...} }
    }))
  }));

  return {
    result_total: detectors,
    warnings,
    notes,
    columns: rt.columns || [],   // 各線量の表示名・単位
    elapsed_time: rt.elapsed_time || null,
    information,                 // format / format_version / generator など
    sources                      // 線源名の一覧（-s 付きのとき）
  };
}
