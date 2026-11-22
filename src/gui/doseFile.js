// gui/doseFile.js - Web GUI の線量表示：.dose を読み、Windows の GUI（Form_線量表示）と同じ図・グラフ・CSV を作る
//
// 読み方は CUIWrapper の CUIDoseData と同じ。
//   冒頭（最初の空行まで）は YAML の information。dose_type・ray_type・source（name・energy_bin）・detector（name・origin・edge_i/j/k）。
//   その後に「線源ごと × 検出器ごと」の数値の表が続く。'#' で始まる行と空行は飛ばす。
//   1 行が 1 評価点、列は [dose, ray, energy] の入れ子（energy が最も速く回る）。行数は edge の number の積（点検出器は 1）。
//   min は double の最大値から、max は 0 から始めて求める（CUIDoseData と同じ）。
// 3D 表示・グラフに渡す JS は Form_線量表示.UpdateGraph と同じ文字列にする。数値は .NET Framework の double.ToString()
// （15 桁の "G" 形式）と同じ書き方（fmtNet）。Windows の GUI と同じ値が描画側に渡る。
import fs from 'fs';
import readline from 'readline';
import yaml from 'js-yaml';

// ---- .NET Framework の double.ToString()（"G" = 15 桁）と同じ書き方 ----
export function fmtNet(d) {
  if (Number.isNaN(d)) return 'NaN';
  if (d === Infinity) return 'Infinity';
  if (d === -Infinity) return '-Infinity';
  if (d === 0) return '0';                       // .NET Framework は -0 も "0"
  const sign = d < 0 ? '-' : '';
  const [mant, expStr] = Math.abs(d).toExponential(14).split('e');
  let digits = mant.replace('.', '').replace(/0+$/, '');
  const e = Number(expStr);
  if (e > -5 && e < 15) {                        // 固定小数点
    if (e >= 0) {
      const int = digits.length > e + 1 ? digits.slice(0, e + 1) : digits.padEnd(e + 1, '0');
      const frac = digits.length > e + 1 ? digits.slice(e + 1) : '';
      return sign + int + (frac ? '.' + frac : '');
    }
    return sign + '0.' + '0'.repeat(-e - 1) + digits;
  }
  const m = digits.length > 1 ? digits[0] + '.' + digits.slice(1) : digits;
  return sign + m + 'E' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
}

const toVector = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).map(Number).filter(v => !Number.isNaN(v));
const values = (node) => (node && typeof node === 'object') ? Object.values(node).map(String) : [];

function parseHeader(text, abs) {
  let doc;
  try { doc = yaml.load(text, { schema: yaml.FAILSAFE_SCHEMA }); } catch { doc = null; }
  const info = doc && doc.information;
  if (!info) throw Object.assign(new Error(`The file with extension [dose] is invalid: ${abs}`), { status: 400 });
  const edge = (n) => { if (n === undefined || n === null) return null; const v = toVector(n); return { x: v[0], y: v[1], z: v[2], number: Math.trunc(v[3]) }; };
  return {
    generated_at: String(info.generated_at ?? ''),
    dose_types: values(info.dose_type),
    ray_types: values(info.ray_type),
    sources: (Array.isArray(info.source) ? info.source : []).map(s => ({ name: String(s.name ?? ''), energy_bins: values(s.energy_bin) })),
    detectors: (Array.isArray(info.detector) ? info.detector : []).map(d => {
      const o = toVector(d.origin);
      return { name: String(d.name ?? ''), ox: o[0], oy: o[1], oz: o[2], edges: [edge(d.edge_i), edge(d.edge_j), edge(d.edge_k)].filter(Boolean) };
    }),
  };
}

const numPoints = (det) => det.edges.reduce((a, e) => a * e.number, 1);

/** .dose をすべて読む。blocks[src][det] = { cols, rows, data: Float64Array(rows*cols) } */
export async function readDose(abs) {
  const input = fs.createReadStream(abs, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  const it = rl[Symbol.asyncIterator]();
  const next = async () => { const r = await it.next(); return r.done ? null : r.value; };
  try {
    const head = [];
    for (let line; (line = await next()) !== null && line !== '';) head.push(line);
    const h = parseHeader(head.join('\n'), abs);
    const nDose = h.dose_types.length, nRay = h.ray_types.length;
    const blocks = [];
    for (let src = 0; src < h.sources.length; src++) {
      const row = [];
      const cols = nDose * nRay * h.sources[src].energy_bins.length;
      for (let det = 0; det < h.detectors.length; det++) {
        const rows = numPoints(h.detectors[det]);
        const data = new Float64Array(rows * cols);
        for (let pt = 0; pt < rows;) {
          const line = await next();
          if (line === null) throw Object.assign(new Error(`Not enough data in the [dose] file for visualization: ${abs}`), { status: 400 });
          if (line === '' || line[0] === '#') continue;
          const tok = line.trim().split(/\s+/);
          for (let c = 0; c < cols; c++) { const v = Number(tok[c]); data[pt * cols + c] = Number.isNaN(v) ? 0 : v; }
          pt++;
        }
        row.push({ cols, rows, data });
      }
      blocks.push(row);
    }
    for (let line; (line = await next()) !== null;) {
      if (line.trim() !== '') throw Object.assign(new Error(`Too much data in the [dose] file for visualization: ${abs}`), { status: 400 });
    }
    return { ...h, blocks };
  } finally {
    rl.close(); input.destroy();
  }
}

/** 最後に読んだ .dose を 1 つだけ覚えておく（同じファイルを何度も読まない。Windows の GUI の静的変数と同じ考え） */
let cache = null;
export async function loadDose(abs) {
  let st;
  try { st = fs.statSync(abs); }
  catch { throw Object.assign(new Error(`Failed to open the file with extension [dose], which is created to visualize calculated doses: ${abs}`), { status: 404 }); }
  const key = `${abs}|${st.mtimeMs}|${st.size}`;
  if (cache && cache.key === key) return cache.promise;
  const promise = readDose(abs);
  cache = { key, promise };
  promise.catch(() => { if (cache && cache.key === key) cache = null; });
  return promise;
}

/** 画面のための見出し（コンボボックスの中身） */
export function headerView(d) {
  return {
    generated_at: d.generated_at, dose_types: d.dose_types, ray_types: d.ray_types,
    sources: d.sources, detectors: d.detectors.map(x => ({ name: x.name, ox: x.ox, oy: x.oy, oz: x.oz, edges: x.edges })),
  };
}

/** 選んだ組み合わせの線量（Dose：data・min・max） */
function pickDose(d, sel) {
  const det = d.detectors[sel.det], src = d.sources[sel.src];
  if (!det || !src || !(sel.dose >= 0 && sel.dose < d.dose_types.length) || !(sel.ray >= 0 && sel.ray < d.ray_types.length) ||
      !(sel.energy >= 0 && sel.energy < src.energy_bins.length)) {
    throw Object.assign(new Error('no such dose'), { status: 400 });
  }
  const b = d.blocks[sel.src][sel.det];
  const nE = src.energy_bins.length;
  const col = sel.dose * d.ray_types.length * nE + sel.ray * nE + sel.energy;
  const data = new Array(b.rows);
  let min = Number.MAX_VALUE, max = 0;
  for (let r = 0; r < b.rows; r++) { const v = b.data[r * b.cols + col]; data[r] = v; min = Math.min(min, v); max = Math.max(max, v); }
  return { det, data, min, max };
}

/** スライス面の <row, col, 残り> の edge の番号（Form_線量表示.SliceIndex） */
function sliceIndex(edges, plane) {
  if (edges.length <= 2) return [0, 1, 2];
  return [[0, 1, 2], [1, 2, 0], [0, 2, 1]][plane] || [0, 1, 2];
}

const yLabel = (s) => String(s).trim().replace(/ +/g, ' ');
const jsStr = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/**
 * Form_線量表示.UpdateGraph と同じ結果を返す。
 * @param sel {det, dose, ray, src, energy, plane, slice, yaxis('linear'|'log')}
 * @returns {{kind:'point'|'graph'|'slice', viewJs:string, graphJs?:string, sliceMax?:number}}
 */
export function doseView(d, sel) {
  const { det, data: all, min, max } = pickDose(d, sel);
  const E = det.edges;
  if (E.length === 0) return { kind: 'point', viewJs: 'slice__hide();' };
  if (E.length === 1) {
    const length = Math.sqrt(Math.pow(E[0].x, 2) + Math.pow(E[0].y, 2) + Math.pow(E[0].z, 2));
    const graphJs = '{' + 'const y = [' + all.map(v => fmtNet(v) + ',').join('') + '];' +
      `const length = ${fmtNet(length)};` + `const y_label = '${jsStr(yLabel(d.dose_types[sel.dose]))}';` +
      `const yaxistype = '${sel.yaxis === 'log' ? 'log' : 'linear'}';` + 'graph__update(y, y_label, length, yaxistype);' + '}';
    return { kind: 'graph', viewJs: 'slice__hide();', graphJs };
  }
  const [i1, i2, i3] = sliceIndex(E, sel.plane);
  const edge1 = E[i1], edge2 = E[i2];
  const o = [det.ox, det.oy, det.oz];
  let data, sliceMax;
  if (E.length === 2) {
    data = all;
  } else {
    const edge3 = E[i3];
    sliceMax = edge3.number - 1;
    const v = Math.max(0, Math.min(sliceMax, Math.trunc(sel.slice || 0)));
    const ratio = v / (edge3.number - 1.0);
    o[0] += ratio * edge3.x; o[1] += ratio * edge3.y; o[2] += ratio * edge3.z;
    const n = [E[0].number, E[1].number, E[2].number];
    const cap = edge1.number * edge2.number;
    data = new Array(cap);
    if (sel.plane === 1) { const start = v; for (let i = 0; i < cap; i++) data[i] = all[start + (i % n[1]) * n[0] + Math.trunc(i / n[1]) * n[0] * n[1]]; }
    else if (sel.plane === 2) { const start = n[0] * v; for (let i = 0; i < cap; i++) data[i] = all[start + (i % n[0]) + Math.trunc(i / n[0]) * n[0] * n[1]]; }
    else { const start = n[0] * n[1] * v; for (let i = 0; i < cap; i++) data[i] = all[start + i]; }
  }
  const viewJs = '{' + 'const vals = [' + data.map(x => fmtNet(x) + ',').join('') + '];' +
    `const rows = ${edge2.number};` + `const cols = ${edge1.number};` +
    `const origin = new BABYLON.Vector3(${fmtNet(o[0])}, ${fmtNet(o[1])}, ${fmtNet(o[2])});` +
    `const row_vector = new BABYLON.Vector3(${fmtNet(edge2.x)}, ${fmtNet(edge2.y)}, ${fmtNet(edge2.z)});` +
    `const col_vector = new BABYLON.Vector3(${fmtNet(edge1.x)}, ${fmtNet(edge1.y)}, ${fmtNet(edge1.z)});` +
    `const min = ${fmtNet(min)};` + `const max = ${fmtNet(max)};` +
    'slice__show(vals, rows, cols, origin, row_vector, col_vector, min, max);' + '}';
  return { kind: 'slice', viewJs, sliceMax };
}

/**
 * Form_線量表示.SaveButton_Click と同じ CSV。
 * 3 次元の検出器は、スライス面の選び方によらず edge_i・edge_j・edge_k の順に全点を書く
 * （Windows の GUI でスライス面「edge 1-2」を選んだときと同じ。他の面を選ぶと Windows の GUI では座標と値の並びがずれる）。
 */
export function doseCsv(d, sel) {
  const { det, data, min, max } = pickDose(d, sel);
  const E = det.edges;
  const label = yLabel(d.dose_types[sel.dose]);
  const names = { det: det.name, ray: d.ray_types[sel.ray], src: d.sources[sel.src].name, energy: d.sources[sel.src].energy_bins[sel.energy] };
  const len = (e) => Math.sqrt(Math.pow(e.x, 2) + Math.pow(e.y, 2) + Math.pow(e.z, 2));
  const f = fmtNet;
  let s = '#  Poker: output dose values\n';
  s += `#  detector_name = ${names.det}\n#  detector_dimension = ${E.length}\n`;
  if (E.length === 1) s += `#  detector_length = ${f(len(E[0]))}\n`;
  s += `#  ray_type = '${names.ray}'\n#  source_name = '${names.src}'\n#  energy_bin = '${names.energy}'\n#  dose_type = '${label}'\n`;
  if (E.length >= 1) s += `#  dose_min = ${f(min)}\n#  dose_max = ${f(max)}\n`;
  s += `#  dose_count = ${data.length}\n`;
  if (E.length === 0) {
    s += 'x,  y,  z,  dose_value\n';
    s += `${f(det.ox)}, ${f(det.oy)}, ${f(det.oz)}, ${f(data[0])}\n`;
    return s;
  }
  if (E.length === 1) {
    const num = E[0].number;
    s += 'idx, x,  y,  z,  dose_value\n';
    for (let i = 0; i < num; i++) {
      const ratio = i / (num - 1.0);
      s += `${i + 1}, ${f(det.ox + E[0].x * ratio)}, ${f(det.oy + E[0].y * ratio)}, ${f(det.oz + E[0].z * ratio)}, ${f(data[i])}\n`;
    }
    return s;
  }
  const [e1, e2, e3] = [E[0], E[1], E[2]];
  const num1 = e1.number, num2 = e2.number;
  s += `#  edge1_num = ${num1}\n#  edge1_length = ${f(len(e1))}\n#  edge2_num = ${num2}\n#  edge2_length = ${f(len(e2))}\n`;
  const out = [s];
  if (E.length === 2) {
    out.push('edge1_idx, edge2_idx, x,  y,  z,  dose_value\n');
    for (let i = 0; i < num2; i++) {
      const r2 = i / (num2 - 1.0);
      for (let j = 0; j < num1; j++) {
        const r1 = j / (num1 - 1.0);
        out.push(`${j + 1}, ${i + 1}, ${f(det.ox + e1.x * r1 + e2.x * r2)}, ${f(det.oy + e1.y * r1 + e2.y * r2)}, ${f(det.oz + e1.z * r1 + e2.z * r2)}, ${f(data[i * num1 + j])}\n`);
      }
    }
    return out.join('');
  }
  const num3 = e3.number;
  out.push(`#  edge3_num = ${num3}\n#  edge3_length = ${f(len(e3))}\n`);
  out.push('edge1_idx, edge2_idx, edge3_idx, x,  y,  z,  dose_value\n');
  for (let i = 0; i < num3; i++) {
    const r3 = i / (num3 - 1.0);
    for (let j = 0; j < num2; j++) {
      const r2 = j / (num2 - 1.0);
      for (let k = 0; k < num1; k++) {
        const r1 = k / (num1 - 1.0);
        out.push(`${k + 1}, ${j + 1}, ${i + 1}, ${f(det.ox + e1.x * r1 + e2.x * r2 + e3.x * r3)}, ${f(det.oy + e1.y * r1 + e2.y * r2 + e3.y * r3)}, ${f(det.oz + e1.z * r1 + e2.z * r2 + e3.z * r3)}, ${f(data[i * num1 * num2 + j * num1 + k])}\n`);
      }
    }
  }
  return out.join('');
}
