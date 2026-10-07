// poker_getSchema と .dose パーサの回帰テスト
//
//   前半: POKER_CUI --schema を poker_getSchema 経由で呼び、4 種のスキーマが
//         JSON として取れて、それぞれの種類を名乗っているか。
//   後半: tests/fixtures/dosemap.yaml を計算して .dose を解析し、
//         サマリーの statistics_total（min/max）と一致するか。
//         列の索引（dose, ray, energy）と行の索引（i + j*ni + k*ni*nj）が
//         両方正しくないと一致しない。
//
//   C:\Poker が無い環境では該当部分をスキップする。
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { parseDoseMap } from '../src/utils/doseMapParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__dirname, '..');
const pokerDir = process.env.POKER_INSTALL_PATH || 'C:/Poker';
const pokerCui = path.join(pokerDir, 'poker_cui.exe');

let ng = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? '  OK   ' : '  NG   ') + label + (detail ? ' : ' + detail : ''));
  if (!cond) ng++;
};

// ----------------------------------------------------------------- スキーマ
console.log('=== poker_getSchema ===');
if (!fs.existsSync(pokerCui)) {
  console.log('  poker_cui.exe が無いためスキップ: ' + pokerCui);
} else {
  const T = path.join(os.tmpdir(), 'poker_schema_test');
  fs.rmSync(T, { recursive: true, force: true });
  fs.mkdirSync(path.join(T, 'tasks'), { recursive: true });

  const proc = spawn(process.execPath, ['src/mcp_server_stdio_v4.js'], {
    cwd: repo,
    env: { ...process.env, POKER_MCP_HOME: T, POKER_INSTALL_PATH: pokerDir },
    stdio: ['pipe', 'pipe', 'ignore']
  });
  let buf = '';
  const pending = new Map();
  proc.stdout.on('data', d => {
    buf += d;
    let k;
    while ((k = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, k); buf = buf.slice(k + 1);
      if (!line.trim()) continue;
      let o; try { o = JSON.parse(line); } catch { continue; }
      if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); }
    }
  });
  const call = (id, name, a) => new Promise(r => {
    pending.set(id, r);
    proc.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: a }
    }) + '\n');
  });
  proc.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } }
  }) + '\n');
  await new Promise(r => setTimeout(r, 600));
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

  const unwrap = o => {
    if (o.error) return { _e: o.error.message };
    let j = JSON.parse(o.result.content[0].text);
    if (j.content) j = JSON.parse(j.content[0].text);
    return j;
  };

  let id = 2;
  // 既定（kind 省略）は input
  const def = unwrap(await call(id++, 'poker_getSchema', {}));
  ok(def.success === true && def.kind === 'input', 'kind 省略で input が返る',
     def.success ? def.kind : (def.error || def._e));

  for (const kind of ['input', 'paths', 'summary', 'dose']) {
    const r = unwrap(await call(id++, 'poker_getSchema', { kind }));
    if (!r.success) { ok(false, kind, r.error || r._e || r.hint); continue; }
    const s = r.schema;
    const hasDraft = typeof s.$schema === 'string' && s.$schema.includes('json-schema.org');
    const idOk = typeof s.$id === 'string' && s.$id.includes(kind);
    // 出力系は information.format が種類を名乗る
    const fmt = s.$defs && s.$defs.information
      && s.$defs.information.properties && s.$defs.information.properties.format;
    const fmtOk = kind === 'input' ? true : (fmt && fmt.const === kind);
    ok(hasDraft && idOk && fmtOk, kind,
       '$id=' + s.$id + (kind === 'input' ? '' : ' format.const=' + (fmt && fmt.const)));
  }

  // 入力スキーマだけはライブラリ由来の名前一覧（x-poker-names）を持つ
  const inp = unwrap(await call(id++, 'poker_getSchema', { kind: 'input' }));
  const list = (def) => {
    const d = inp.success && inp.schema.$defs && inp.schema.$defs[def];
    const v = d && d['x-poker-names'];
    return Array.isArray(v) ? v : null;
  };
  const mats = list('material'), nucs = list('nuclide'), bups = list('buildupMaterial');
  ok(mats && mats.length > 1 && mats.includes('VOID'),
     '入力スキーマに材料名の一覧がある', mats ? mats.length + ' 件' : '無し');
  ok(nucs && nucs.length > 1 && nucs.includes('CO60'),
     '入力スキーマに核種名の一覧がある', nucs ? nucs.length + ' 件' : '無し');
  ok(bups && bups.length > 1,
     '入力スキーマにビルドアップ材料名の一覧がある', bups ? bups.length + ' 件' : '無し');

  // 不正な kind はツール定義の enum で弾かれる（サーバ側のエラー）
  const bad = unwrap(await call(id++, 'poker_getSchema', { kind: 'nosuch' }));
  ok(bad.success !== true, '不正な kind は失敗になる', bad._e || bad.error || JSON.stringify(bad).slice(0, 80));

  proc.stdin.end();
}

// --------------------------------------------------------------- .dose 解析
console.log('=== .dose パーサ ===');
if (!fs.existsSync(pokerCui)) {
  console.log('  poker_cui.exe が無いためスキップ: ' + pokerCui);
} else {
  const T = path.join(os.tmpdir(), 'poker_dosemap_test');
  fs.rmSync(T, { recursive: true, force: true });
  fs.mkdirSync(T, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'dosemap.yaml'), path.join(T, 'dosemap.yaml'));

  const run = spawn(pokerCui, ['-t', '-s', 'dosemap.yaml'], { cwd: T, stdio: 'ignore' });
  const code = await new Promise(r => run.on('close', r));
  ok(code === 0, 'poker_cui の実行', 'exit=' + code);

  const dosePath = path.join(T, 'dosemap.yaml.dose');
  // 改行は CRLF なので、以降の検索を楽にするため LF に揃える
  const summary = fs.readFileSync(path.join(T, 'dosemap.yaml.summary'), 'utf8').replace(/\r/g, '');

  // サマリーの statistics_total から min/max を拾う（比較の基準）
  const stats = (det, doseType) => {
    const d = summary.indexOf('\n    - name: ' + det + '\n');
    if (d < 0) return null;
    const s = summary.indexOf('statistics_total', d);
    const next = summary.indexOf('\n    - name: ', s);
    const block = summary.slice(s, next < 0 ? summary.length : next);
    const k = block.indexOf('\n        ' + doseType + ': ');
    if (k < 0) return null;
    const seg = block.slice(k, k + 400);
    const min = seg.match(/min:\s*(\S+)/), max = seg.match(/max:\s*(\S+)/);
    return min && max ? { min: Number(min[1]), max: Number(max[1]) } : null;
  };

  const near = (a, b) => Math.abs(a - b) <= Math.abs(b) * 5e-4 + 1e-12;

  // dims は 1D でも j: 1 が入る（parseDoseMap の仕様）
  const cases = [
    ['D_1d', 1, { i: 4, j: 1 }],
    ['D_2d', 2, { i: 4, j: 3 }],
    ['D_3d', 3, { i: 3, j: 2, k: 2 }]
  ];
  for (const [det, dim, dims] of cases) {
    for (const doseType of ['E(AP)', 'DskinM(AP)', 'H*(10)']) {
      const m = parseDoseMap(dosePath, det, { doseType, ray: 'TOTAL' });
      if (!m) { ok(false, det + ' / ' + doseType, '解析に失敗'); continue; }
      const st = stats(det, doseType);
      const shapeOk = m.dimensionality === dim &&
        JSON.stringify(m.dims) === JSON.stringify(dims) &&
        m.total_points === Object.values(dims).reduce((a, b) => a * b, 1);
      const valOk = st && near(m.min, st.min) && near(m.max, st.max);
      ok(shapeOk && valOk, det + ' / ' + doseType,
         'dims=' + JSON.stringify(m.dims) +
         ' min=' + m.min.toExponential(4) + '(' + (st ? st.min.toExponential(4) : '?') + ')' +
         ' max=' + m.max.toExponential(4) + '(' + (st ? st.max.toExponential(4) : '?') + ')');
    }
  }

  // ray の指定で読む列が変わること。光子だけの線源なので中性子線は 0 になる。
  const neu = parseDoseMap(dosePath, 'D_1d', { doseType: 'E(AP)', ray: 'n' });
  const tot = parseDoseMap(dosePath, 'D_1d', { doseType: 'E(AP)', ray: 'TOTAL' });
  ok(neu && tot && neu.max === 0 && tot.max > 0, 'ray の指定で列が変わる',
     'n=' + (neu && neu.max) + ' TOTAL=' + (tot && tot.max.toExponential(4)));

  // dose_type の指定で読む列が変わること。E(AP) と DskinM(AP) は別の量。
  const e = parseDoseMap(dosePath, 'D_1d', { doseType: 'E(AP)', ray: 'TOTAL' });
  const d = parseDoseMap(dosePath, 'D_1d', { doseType: 'DskinM(AP)', ray: 'TOTAL' });
  ok(e && d && e.max !== d.max, 'dose_type の指定で列が変わる',
     'E(AP)=' + (e && e.max.toExponential(4)) + ' DskinM(AP)=' + (d && d.max.toExponential(4)));

  // 点検出器はマップ無し
  const pt = parseDoseMap(dosePath, 'D_pt', {});
  ok(pt && pt.dimensionality === 0, '点検出器は dimensionality 0', pt ? String(pt.dimensionality) : 'null');

  // 異常系
  ok(parseDoseMap(dosePath, 'NOSUCH', {}) === null, '未知の検出器は null');
  ok(parseDoseMap(path.join(T, 'nosuch.dose'), 'D_1d', {}) === null, '存在しないファイルは null');
  ok(parseDoseMap(dosePath, 'D_1d', { doseType: 'NOSUCH' }) === null, '未知の dose_type は null');

  // --------------------------------------------------- 線種別線量と斜め補正
  // 斜め補正を立てると result_total から g1 の行が落ちる（斜め補正は全光子に
  // 一括で掛かるため、一次光子だけを分離できない）。その分岐で線種のキーと
  // 値の対応が崩れたことがあるので、.dose を基準に突き合わせる。
  console.log('=== result_total の線種別線量 ===');

  const DOSES = ['E(AP)', 'DskinM(AP)', 'H*(10)'];
  const RAYS = ['g1', 'n', 'g12', 'TOTAL'];

  // .dose の TOTAL 線源は energy_bin が 1 本なので 12 列 = 3 線量 x 4 線種。
  // 検出器ごとに 1 点目（1 行目）を取る。
  const doseRef = (file) => {
    const L = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let start = -1;
    for (let i = 0; i < L.length; i++) if (/^#\s*\S+[：:]\s*TOTAL/.test(L[i])) start = i;
    const out = {};
    let det = null;
    for (let i = start; i < L.length; i++) {
      const m = L[i].match(/検出器[：:]\s*(\S+)/);
      if (m) { det = m[1]; continue; }
      const t = L[i].trim();
      if (det && t && !t.startsWith('#')) {
        const c = t.split(/\s+/).map(Number);
        const o = {};
        DOSES.forEach((d, di) => { o[d] = {}; RAYS.forEach((r, ri) => { o[d][r] = c[di * 4 + ri]; }); });
        out[det] = o; det = null;
      }
    }
    return out;
  };

  // summary の result_total.detector から、検出器ごとに 1 点目の線種別線量を取る
  const summaryRays = (file) => {
    const s = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
    const detKey = s.indexOf('\n  detector:', s.indexOf('\nresult_total:'));
    const out = {};
    const re = /\n    - name: (\S+)\n/g;
    re.lastIndex = detKey;
    let m;
    while ((m = re.exec(s))) {
      const blk = s.slice(m.index, s.indexOf('statistics_total', m.index));
      const first = blk.indexOf('doses:');
      const nextPoint = blk.indexOf('\n        - id:', first);
      const one = nextPoint > 0 ? blk.slice(first, nextPoint) : blk.slice(first);
      const o = {};
      for (const d of DOSES) {
        const e = one.indexOf('\n            ' + d + ': ');
        if (e < 0) continue;
        const kv = {};
        for (const l of one.slice(e + 1).split('\n').slice(1)) {
          const q = l.match(/^ {14}(\S+):\s*(\S+)\s*$/);
          if (!q) break;
          kv[q[1]] = Number(q[2]);
        }
        o[d] = kv;
      }
      out[m[1]] = o;
    }
    return out;
  };

  for (const [tag, slant] of [['slant_off', false], ['slant_on', true]]) {
    const y = path.join(T, tag + '.yaml');
    fs.writeFileSync(y, slant
      ? fs.readFileSync(path.join(__dirname, 'fixtures', 'dosemap.yaml'), 'utf8')
      : fs.readFileSync(path.join(__dirname, 'fixtures', 'dosemap.yaml'), 'utf8')
          .replace('use_slant_correction: true', 'use_slant_correction: false'));
    const p = spawn(pokerCui, ['-t', '-s', tag + '.yaml'], { cwd: T, stdio: 'ignore' });
    const c = await new Promise(r => p.on('close', r));
    if (c !== 0) { ok(false, tag + ' の計算', 'exit=' + c); continue; }

    const ref = doseRef(path.join(T, tag + '.yaml.dose'));
    const got = summaryRays(path.join(T, tag + '.yaml.summary'));
    const label = tag + '（斜め補正' + (slant ? 'あり' : 'なし') + '）';
    let bad = 0, checked = 0;
    const detail = [];
    for (const det of Object.keys(got)) {
      for (const d of DOSES) {
        const g = got[det][d], r = ref[det] && ref[det][d];
        if (!g || !r) { bad++; detail.push(det + ' ' + d + ': 見つからず'); continue; }
        checked++;
        for (const ray of ['TOTAL', 'n', 'g12']) {
          if (g[ray] !== r[ray]) { bad++; detail.push(det + ' ' + d + ' ' + ray + '=' + g[ray] + ' / .dose ' + r[ray]); }
        }
        // g1 は斜め補正ありで落ちる
        if (slant && 'g1' in g) { bad++; detail.push(det + ' ' + d + ': 斜め補正ありなのに g1 がある'); }
        if (!slant) {
          if (!('g1' in g)) { bad++; detail.push(det + ' ' + d + ': g1 が無い'); }
          else if (g.g1 !== r.g1) { bad++; detail.push(det + ' ' + d + ' g1=' + g.g1 + ' / .dose ' + r.g1); }
        }
      }
    }
    ok(bad === 0, label, checked + ' 組を .dose と照合' + (bad ? ' / ' + detail.slice(0, 4).join('; ') : ''));
  }
}

console.log(ng === 0 ? '\nすべて一致' : '\n' + ng + ' 件の不一致');
process.exit(ng === 0 ? 0 : 1);
