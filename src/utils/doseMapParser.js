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

// 既定の並び順。information から数が読めなかった場合にだけ使う。
const FALLBACK_DOSE = ['E(AP)', 'DskinM(AP)', 'H*(10)'];
const FALLBACK_RAY  = ['g1', 'n', 'g12', 'TOTAL'];

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

  const nDose = head.filter(l => /^\s+dose\[\d+\]\s*:/.test(l)).length;
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
  return { nDose, nRay, sources };
}

export function parseDoseMap(dosePath, detectorName, opts = {}) {
  const doseType = opts.doseType || 'E(AP)';
  const ray = opts.ray || 'TOTAL';

  let raw;
  try { raw = fs.readFileSync(dosePath, 'utf8'); }
  catch (e) { logger.warn('.dose 読取失敗', { dosePath, error: e.message }); return null; }
  const lines = raw.split(/\r?\n/);

  // 0) information から列の構成を読む
  const info = readInformation(lines);
  const nDose = info.nDose || FALLBACK_DOSE.length;
  const nRay  = info.nRay  || FALLBACK_RAY.length;
  const doseIdx = FALLBACK_DOSE.indexOf(doseType);
  const rayIdx  = FALLBACK_RAY.indexOf(ray);
  if (doseIdx < 0 || rayIdx < 0 || doseIdx >= nDose || rayIdx >= nRay) {
    logger.warn('getDoseMap: 不明な dose_type/ray', { doseType, ray, nDose, nRay });
    return null;
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
    dose_type: doseType, ray, unit: doseType === 'DskinM(AP)' ? 'µGy/h' : 'µSv/h',
    total_points: nTotal, min, max, max_at: maxAt, grid, points
  };
}
