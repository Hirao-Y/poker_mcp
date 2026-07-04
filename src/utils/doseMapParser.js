// utils/doseMapParser.js
// POKER の .dose ファイルからグリッド（1D/2D/3D）検出器の全評価点線量を抽出する。
// サマリーはグリッドを間引く（一部省略）ため、完全なマップはこのパーサで .dose から取得する。
import fs from 'fs';
import { logger } from './logger.js';

const DOSE_IDX = { 'E(AP)': 0, 'DskinM(AP)': 1, 'H*(10)': 2 };
const RAY_IDX  = { 'g1': 0, 'n': 1, 'g12': 2, 'TOTAL': 3 };
const NUM_RE = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;

const nums = (s) => (s.match(NUM_RE) || []).map(Number);

export function parseDoseMap(dosePath, detectorName, opts = {}) {
  const doseType = opts.doseType || 'E(AP)';
  const ray = opts.ray || 'TOTAL';
  const doseIdx = DOSE_IDX[doseType], rayIdx = RAY_IDX[ray];
  if (doseIdx === undefined || rayIdx === undefined) {
    logger.warn('getDoseMap: 不明な dose_type/ray', { doseType, ray }); return null;
  }
  let raw;
  try { raw = fs.readFileSync(dosePath, 'utf8'); }
  catch (e) { logger.warn('.dose 読取失敗', { dosePath, error: e.message }); return null; }
  const lines = raw.split(/\r?\n/);

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

  // 2) TOTAL線源の集計ブロック（12列 = dose3種 × ray4種）を後方から探す
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
    if (collected.length >= nTotal && collected[0].length === 12) rows = collected;
  }
  if (!rows) { logger.warn('getDoseMap: TOTAL集計ブロック未検出/データ不足', { detectorName, nTotal }); return null; }

  const col = doseIdx * 4 + rayIdx;
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
