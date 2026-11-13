// utils/doseMapParser.js
// POKER の .dose ファイルからグリッド（1D/2D/3D）検出器の全評価点線量を抽出する。
// サマリーはグリッドを間引く（一部省略）ため、完全なマップはこのパーサで .dose から取得する。
//
// 【.dose の構造】
//   冒頭は YAML（information）、それ以降は '#' で区切られた数値行列。
//   列は [dose, ray, energy] の入れ子で、energy が最も速く回る。
//   列数は dose_type の数 × ray_type の数 × その線源の energy_bin の数。
//   行は評価点で、索引は i + j*number_i + k*number_i*number_j（j,k は 0 始まり）。
//   POKER_CUI --schema --kind=dose の x-poker-data-layout に同じ説明がある。
//
// 【列数を information から読む理由】
//   以前は dose 3 種・ray 4 種を決め打ちし、TOTAL 線源のブロックを「12 列」で
//   見分けていた。線量種別はライブラリ設定で増えるため（E(PA) や空気カーマ）、
//   その場合に誤った列を読むか、ブロックを見つけられず null を返していた。
import fs from 'fs';
import { logger } from './logger.js';

const NUM_RE = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
const nums = (s) => (s.match(NUM_RE) || []).map(Number);

// 【線量の種類と列の対応（v1.13.0）】
//   出力される線量の種類と並びは POKER の lib/lib_setting.dat（利用者が手で編集する）で決まる。
//   以前は E(AP)・DskinM(AP)・H*(10) の並びを決め打ちしていたため、設定が違うと別の線量の列を
//   黙って返していた（例: 2 番目が空気カーマの設定で DskinM(AP) を求めると Kair の列）。
//   今は .dose の dose_type（表示名と単位）を、同じ計算の .summary の result_total.columns
//   （name = lib_setting.dat の summary_name、display、unit。.dose と同じ並び）で名前に直す。
//   .summary が読めないときは、lib_setting.dat の既知の表示名（KNOWN_DOSE）で直す。

// .dose に dose_type の見出しが無い古い形式のときだけ使う並び
const FALLBACK_DOSE = ['E(AP)', 'DskinM(AP)', 'H*(10)'];
// ray の並びは POKER が決める（lib_setting.dat では変わらない）
const FALLBACK_RAY  = ['g1', 'n', 'g12', 'TOTAL'];

// lib_setting.dat の full_name（表示名の先頭）→ summary_name。.summary が読めないときの予備
const KNOWN_DOSE = [
  ['実効線量(AP)', 'E(AP)'], ['実効線量(PA)', 'E(PA)'], ['実効線量(LLAT)', 'E(LLAT)'],
  ['実効線量(RLAT)', 'E(RLAT)'], ['実効線量(ROT)', 'E(ROT)'], ['実効線量(ISO)', 'E(ISO)'],
  ['水晶体(AP)', 'Dlens(AP)'], ['皮膚男性(AP)', 'DskinM(AP)'], ['皮膚女性(AP)', 'DskinF(AP)'],
  ['空気カーマ', 'Kair'], ['水の吸収線量', 'Dwater'], ['1cm線量当量', 'H*(10)'], ['3mm線量当量', 'Hp(3)']
];
const squash = (s) => String(s || '').replace(/\s+/g, '');

/**
 * .summary の result_total.columns（name / display / unit）を読む。読めなければ null。
 * summary 全体を YAML として読むと大きな計算で重いので、columns の節だけを行で拾う。
 */
export function readSummaryColumns(summaryPath) {
  let raw;
  try { raw = fs.readFileSync(summaryPath, 'utf8'); } catch (e) { return null; }
  const lines = raw.split(/\r?\n/);
  const rt = lines.findIndex(l => /^result_total\s*:/.test(l));
  if (rt < 0) return null;
  let k = -1;
  for (let i = rt + 1; i < lines.length && !/^\S/.test(lines[i]); i++) {
    if (/^\s+columns\s*:/.test(lines[i])) { k = i; break; }
  }
  if (k < 0) return null;
  const indent = lines[k].match(/^(\s*)/)[1].length;
  const cols = [];
  let cur = null;
  const val = (s) => s.replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
  for (let i = k + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (l.match(/^(\s*)/)[1].length <= indent && !/^\s*-/.test(l)) break;
    let m;
    if ((m = l.match(/^\s*-\s*name\s*:\s*(.+)$/))) { cur = { name: val(m[1]) }; cols.push(cur); }
    else if (cur && (m = l.match(/^\s+display\s*:\s*(.+)$/))) cur.display = val(m[1]);
    else if (cur && (m = l.match(/^\s+unit\s*:\s*(.+)$/))) cur.unit = val(m[1]);
    else if (/^\s*-/.test(l) || !/^\s+(display|unit)\s*:/.test(l)) break;
  }
  return cols.length ? cols : null;
}

/**
 * .dose の dose_type の見出し（表示名・単位）を名前に直す。
 * @returns {Array<{name: string|null, display: string, unit: string|null, from: string}>}
 */
function resolveDoses(labels, columns) {
  if (Array.isArray(columns) && columns.length === labels.length && columns.every(c => c && c.name)) {
    return labels.map((l, i) => ({ name: columns[i].name, display: columns[i].display || l.label,
      unit: columns[i].unit || l.unit, from: 'summary' }));
  }
  return labels.map(l => {
    const hit = KNOWN_DOSE.find(([full]) => squash(l.label).startsWith(squash(full)));
    return { name: hit ? hit[1] : null, display: l.label, unit: l.unit, from: hit ? 'lib_setting' : 'unknown' };
  });
}

//|
//| 冒頭の YAML（information）から、列の構成を決める数を読む。
//|   yaml パッケージに依存せず、必要な数だけを数える。キーは
//|   dose[1] / ray[1] / energy[1] の形で、値（名前）は表示言語で変わるため使わない。
//|
function readInformation(lines) {
  let end = lines.length;
  for (let i = 1; i < lines.length; i++) {
    if (/^#/.test(lines[i])) { end = i; break; }
  }
  const head = lines.slice(0, end);

  const doseLabels = [];
  for (const l of head) {
    const m = l.match(/^\s+dose\[\d+\]\s*:\s*(.*?)\s*(?:\[([^\]]*)\])?\s*$/);
    if (m) doseLabels.push({ label: m[1], unit: m[2] || null });
  }
  const nDose = doseLabels.length;
  const nRay  = head.filter(l => /^\s+ray\[\d+\]\s*:/.test(l)).length;

  // 線源ごとの energy_bin の数。source ノードの name: の出現順に数える。
  // detector ノードの name は 'name  : D - N次元検出器' の形なので除く。
  const sources = [];
  let cur = null;
  for (const l of head) {
    const m = l.match(/^\s+name\s*:\s*(.+?)\s*$/);
    if (m && !/検出器|detector/i.test(l)) { cur = { name: m[1], energies: 0 }; sources.push(cur); continue; }
    if (cur && /^\s+energy\[\d+\]\s*:/.test(l)) cur.energies++;
  }
  return { nDose, nRay, sources, doseLabels };
}

/**
 * @param {string} dosePath
 * @param {string} detectorName
 * @param {{doseType?: string, ray?: string, columns?: Array}} opts
 *   columns: 同じ計算の .summary の result_total.columns（readSummaryColumns）。線量の名前と単位に使う。
 * @returns {null | {error, available_dose_types} | map}
 *   null は .dose がまだ読めない・検出器が無いなど（呼び出し側で待って読み直す）。
 *   error は求めた dose_type / ray がこの計算に無いとき（読み直しても変わらない）。
 */
export function parseDoseMap(dosePath, detectorName, opts = {}) {
  const ray = opts.ray || 'TOTAL';

  let raw;
  try { raw = fs.readFileSync(dosePath, 'utf8'); }
  catch (e) { logger.warn('.dose 読取失敗', { dosePath, error: e.message }); return null; }
  const lines = raw.split(/\r?\n/);

  // 0) information から列の構成を読む
  const info = readInformation(lines);
  const nDose = info.nDose || FALLBACK_DOSE.length;
  const nRay  = info.nRay  || FALLBACK_RAY.length;
  const doses = info.nDose
    ? resolveDoses(info.doseLabels, opts.columns)
    : FALLBACK_DOSE.map(n => ({ name: n, display: n, unit: n === 'DskinM(AP)' ? 'µGy/h' : 'µSv/h', from: 'fallback' }));
  const available = doses.map(d => d.name).filter(Boolean);
  const doseType = opts.doseType || (available.includes('E(AP)') ? 'E(AP)' : available[0]);
  const doseIdx = doses.findIndex(d => d.name === doseType);
  const rayIdx  = FALLBACK_RAY.indexOf(ray);
  if (doseIdx < 0 || doseIdx >= nDose) {
    logger.warn('getDoseMap: この計算に無い dose_type', { doseType, available });
    return {
      error: `dose_type '${doseType}' はこの計算の .dose にありません。出力される線量の種類と並びは ` +
        `POKER の lib/lib_setting.dat の設定で決まります。使える dose_type: ${available.join(', ') || '（名前を特定できませんでした）'}`,
      available_dose_types: available,
      dose_labels: doses.map(d => d.display)
    };
  }
  if (rayIdx < 0 || rayIdx >= nRay) {
    return { error: `ray '${ray}' は不明です。使える ray: ${FALLBACK_RAY.slice(0, nRay).join(', ')}`,
      available_dose_types: available };
  }

  // TOTAL 線源（最後の線源）の energy_bin 数。読めなければ 1 とみなす。
  const totalSrc = info.sources.length ? info.sources[info.sources.length - 1] : null;
  const E = (totalSrc && totalSrc.energies) ? totalSrc.energies : 1;
  const nCols = nDose * nRay * E;

  // 1) 検出器メタデータ（name : X - N次元検出器 / origin / edge_i.. ）
  let meta = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/name\s*:\s*(\S+)\s*-\s*([^\s]+?)検出器/);
    if (m && m[1] === detectorName) {
      const origin = nums(lines[i + 1] || '').slice(0, 3);
      const edges = [];
      for (let k = i + 2; k < lines.length; k++) {
        if (/edge_[ijk]\s*:/.test(lines[k])) {
          const v = nums(lines[k]);
          edges.push({ vec: v.slice(0, 3), num: v[v.length - 1] });
        } else break;
      }
      meta = { origin, edges, dimWord: m[2] };
      break;
    }
  }
  if (!meta) { logger.warn('getDoseMap: 検出器メタ未検出', { detectorName }); return null; }
  if (meta.edges.length === 0) {
    return { detector: detectorName, dimensionality: 0,
      note: '点検出器のためマップはありません（executeCalculation の result_total を参照）' };
  }

  const dims = meta.edges.map(e => e.num);
  const ni = dims[0], nj = dims[1] || 1, nk = dims[2] || 1;
  const nTotal = ni * nj * nk;

  // 2) TOTAL線源の集計ブロックを後方から探す。
  //    線源ごとのブロックは energy_bin が多いぶん列数が大きいので、列数で見分ける。
  const esc = detectorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerRe = new RegExp('検出器[：:]\\s*' + esc + '(?:\\s|\\(|$)');
  const headerIdxs = [];
  for (let i = 0; i < lines.length; i++)
    if (lines[i].trimStart().startsWith('#') && headerRe.test(lines[i])) headerIdxs.push(i);

  let rows = null;
  for (let h = headerIdxs.length - 1; h >= 0 && !rows; h--) {
    const collected = [];
    for (let k = headerIdxs[h] + 1; k < lines.length && collected.length < nTotal; k++) {
      const t = lines[k].trim();
      if (!t || t.startsWith('#')) { if (collected.length) break; else continue; }
      const cols = t.split(/\s+/).map(Number);
      if (cols.some(Number.isNaN)) break;
      collected.push(cols);
    }
    if (collected.length >= nTotal && collected[0].length === nCols) rows = collected;
  }
  if (!rows) {
    logger.warn('getDoseMap: TOTAL集計ブロック未検出/データ不足',
      { detectorName, nTotal, expectedColumns: nCols });
    return null;
  }

  // 列 = (dose, ray, energy) の入れ子。energy は TOTAL（最後の bin）を取る。
  const col = doseIdx * nRay * E + rayIdx * E + (E - 1);
  const sp = meta.edges.map(e => e.num > 1 ? e.vec.map(v => v / (e.num - 1)) : [0, 0, 0]);
  const points = [];
  let min = Infinity, max = -Infinity, maxAt = null;
  for (let r = 0; r < nTotal; r++) {
    const i = r % ni, j = Math.floor(r / ni) % nj, k = Math.floor(r / (ni * nj));
    const x = meta.origin[0] + i*sp[0][0] + (sp[1]?j*sp[1][0]:0) + (sp[2]?k*sp[2][0]:0);
    const y = meta.origin[1] + i*sp[0][1] + (sp[1]?j*sp[1][1]:0) + (sp[2]?k*sp[2][1]:0);
    const z = meta.origin[2] + i*sp[0][2] + (sp[1]?j*sp[1][2]:0) + (sp[2]?k*sp[2][2]:0);
    const value = rows[r][col];
    if (value < min) min = value;
    if (value > max) { max = value; maxAt = { i, j, k, x, y, z }; }
    points.push({ i, j, ...(nk > 1 ? { k } : {}), x, y, z, value });
  }
  // 入れ子配列 grid: 1D → [i], 2D → [j][i], 3D → [k][j][i]
  const at = (i, j, k) => points[i + j * ni + k * ni * nj].value;
  let grid;
  if (meta.edges.length === 1) {
    grid = []; for (let i = 0; i < ni; i++) grid.push(at(i, 0, 0));
  } else if (meta.edges.length === 2) {
    grid = [];
    for (let j = 0; j < nj; j++) { const row = []; for (let i = 0; i < ni; i++) row.push(at(i, j, 0)); grid.push(row); }
  } else {
    grid = [];
    for (let k = 0; k < nk; k++) {
      const plane = [];
      for (let j = 0; j < nj; j++) { const row = []; for (let i = 0; i < ni; i++) row.push(at(i, j, k)); plane.push(row); }
      grid.push(plane);
    }
  }
  return {
    detector: detectorName, dimensionality: meta.edges.length,
    dims: { i: ni, j: nj, ...(nk > 1 ? { k: nk } : {}) },
    dose_type: doseType, dose_display: doses[doseIdx].display, ray,
    unit: doses[doseIdx].unit || (doseType === 'DskinM(AP)' ? 'µGy/h' : 'µSv/h'),
    available_dose_types: available,
    total_points: nTotal, min, max, max_at: maxAt, grid, points
  };
}
