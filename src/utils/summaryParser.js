// utils/summaryParser.js
// POKER の .summary（YAML形式）から result_total を構造化抽出する。
// 末尾に付く非YAMLの警告フッタ（例: "[!] ..."）は除去し warnings として返す。
import fs from 'fs';
import yaml from 'js-yaml';
import { logger } from './logger.js';

/**
 * @param {string} summaryPath  .summary ファイルの絶対パス
 * @returns {null | { result_total: Array, warnings: string[], columns: Array, elapsed_time: any }}
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
  const warnings = [];
  const kept = [];
  for (const line of raw.split(/\r?\n/)) {
    // 非YAMLの警告フッタ（"[!]" 始まり）を除去
    if (line.trimStart().startsWith('[!]')) {
      const t = line.trim();
      if (t) warnings.push(t);
    } else {
      kept.push(line);
    }
  }
  let doc;
  try {
    doc = yaml.load(kept.join('\n'));
  } catch (e) {
    logger.warn('summary YAML パース失敗', { summaryPath, error: e.message });
    return null;
  }
  // 既知の良性警告（ビルドアップ最大厚さ超過）への保守側クランプ注記
  const notes = [];
  if (warnings.some(w => /最大厚さ|ビルドアップ係数の最大厚|too\s*thick/i.test(w))) {
    notes.push('ビルドアップ係数の最大厚さ(全材料 80 mfp)を超える透過線は 80 mfp の値にクランプされ、保守側の評価になります。該当線が高エネルギー主成分でなければ線量への寄与は小さいことが多いです。');
  }

  const rt = doc && doc.result_total;
  if (!rt) return { result_total: [], warnings, notes, columns: [], elapsed_time: null };

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
    elapsed_time: rt.elapsed_time || null
  };
}
