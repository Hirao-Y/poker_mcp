// utils/MaterialCatalog.js - POKER material library (lib_material.dat) loader + photon effective-Z buildup equivalent
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

// ビルドアップデータを持つ標準材料の既定値（綴りは Aluminium に統一）。
// 実際の一覧は lib_setting.dat の buildup_material から読み込み、
// これはファイルが読めない場合のフォールバックとして使う。
export const STANDARD_MATERIALS = [
  'Carbon', 'Aluminium', 'Iron', 'Copper', 'Tungsten', 'Lead',
  'Air', 'Water', 'Concrete', 'PyrexGlass', 'AcrylicResin', 'Polyethylene', 'Soil'
];

// 旧綴り(米)を入力として受理し Aluminium に正規化
const NAME_ALIASES = { 'aluminum': 'Aluminium' }; // キーは小文字（大文字小文字無視で照合）

// 実効Z計算用の原子量 (g/mol)
const ATOMIC_WEIGHT = {
  1:1.008, 5:10.81, 6:12.011, 7:14.007, 8:15.999, 9:18.998, 11:22.990, 12:24.305,
  13:26.982, 14:28.085, 15:30.974, 16:32.06, 17:35.45, 18:39.948, 19:39.098, 20:40.078,
  22:47.867, 24:51.996, 25:54.938, 26:55.845, 28:58.693, 29:63.546, 40:91.224, 50:118.71,
  56:137.33, 74:183.84, 82:207.2, 90:232.04, 92:238.03
};

const ZEFF_EXPONENT = 2.94; // Mayneord 型 光子実効Z（同点時のタイブレークに使用）

// 散乱/吸収比の一致スコア（対数RMS）がこれを超えたら等価材料として粗い
export const BUILDUP_MATCH_WARN = 0.30;

export class MaterialCatalog {
  static _catalog = null;   // { name: {density, composition:{Z:wtFrac}, isStandard} }
  static _stdZeff = null;   // { name: Zeff }
  static _canon = null;     // { lowercaseName: CanonicalName }

  static _libPath() {
    const base = process.env.POKER_INSTALL_PATH || 'C:\\Poker';
    return path.join(base, 'LIB', 'lib_material.dat');
  }

  static _settingPath() {
    const base = process.env.POKER_INSTALL_PATH || 'C:\\Poker';
    return path.join(base, 'LIB', 'lib_setting.dat');
  }

  // 単層ビルドアップデータを持つ標準材料。lib_setting.dat が正。
  static _standard = null;
  static standard() {
    if (this._standard) return this._standard;
    try {
      const s = fs.readFileSync(this._settingPath(), 'utf-8');
      const m = s.match(/buildup_material\s*:\s*\[([^\]]*)\]/);
      const list = m ? m[1].split(',').map(x => x.trim()).filter(Boolean) : [];
      if (list.length) {
        this._standard = list;
        logger.info('標準材料一覧を lib_setting.dat から読み込みました', { count: list.length });
        return list;
      }
    } catch (e) {
      logger.warn('lib_setting.dat を読み込めません。既定の標準材料一覧を使用します', { error: e.message });
    }
    this._standard = [...STANDARD_MATERIALS];
    return this._standard;
  }

  // ライブラリ更新後にキャッシュを捨てる（カスタム材料の追加を反映）
  static reload() {
    this._catalog = null; this._standard = null; this._atten = null;
    this._stdZeff = null; this._canon = null;
    return this.load(true);
  }

  static _parse(text) {
    const cat = {};
    const raw = text.split(/\r?\n/);
    let i = 0;
    while (i < raw.length && !/matNum\s*=/.test(raw[i])) i++;
    i++; // matNum 行の次から
    while (i < raw.length) {
      const line = raw[i].trim();
      if (line === '') { i++; continue; }
      const name = line; i++;
      while (i < raw.length && raw[i].trim().startsWith('!')) i++; // コメント行
      if (i >= raw.length) break;
      const head = raw[i].trim().split(/\s+/); i++;
      const density = parseFloat(head[0]);
      const nElem = parseInt(head[1], 10);
      const comp = {};
      for (let k = 0; k < nElem && i < raw.length; k++, i++) {
        const p = raw[i].trim().split(/\s+/);
        comp[parseInt(p[0], 10)] = parseFloat(p[1]);
      }
      if (nElem === 1) { const z = Object.keys(comp)[0]; comp[z] = 1.0; } // 単一元素は分率=1
      cat[name] = { density, composition: comp, isStandard: this.standard().includes(name) };
    }
    return cat;
  }

  static load(force = false) {
    if (this._catalog && !force) return this._catalog;
    try {
      const text = fs.readFileSync(this._libPath(), 'utf-8');
      this._catalog = this._parse(text);
      logger.info('材料カタログを読み込みました', { path: this._libPath(), count: Object.keys(this._catalog).length });
    } catch (e) {
      logger.warn('lib_material.dat を読み込めません。標準材料のみ有効化します', { error: e.message });
      this._catalog = {};
      for (const m of this.standard()) this._catalog[m] = { density: null, composition: null, isStandard: true };
    }
    this._canon = null;
    this._computeStdZeff();
    // 標準材料は lib_setting.dat と lib_material.dat の両方に登録される。
    // 片方だけの登録は設定ミスなので検出して知らせる。
    const orphan = this.standard().filter(m => !this._catalog[m]);
    if (orphan.length) {
      logger.warn('lib_setting.dat の標準材料が lib_material.dat に見つかりません', {
        materials: orphan,
        hint: '標準材料は両方のファイルに登録してください'
      });
    }
    return this._catalog;
  }

  static _zeffFromComposition(comp) {
    let tot = 0; const e = {};
    for (const [zs, w] of Object.entries(comp)) {
      const Z = parseInt(zs, 10);
      const A = ATOMIC_WEIGHT[Z] || (2 * Z);
      e[Z] = (w * Z) / A; tot += e[Z];
    }
    let num = 0, den = 0;
    for (const [zs, ev] of Object.entries(e)) {
      const Z = parseInt(zs, 10);
      const a = ev / tot;
      num += a * Math.pow(Z, ZEFF_EXPONENT);
      den += a * Z;
    }
    return Math.pow(num / den, 1.0 / (ZEFF_EXPONENT - 1));
  }

  static _computeStdZeff() {
    this._stdZeff = {};
    const cat = this._catalog || {};
    const elemental = { Carbon: 6, Aluminium: 13, Iron: 26, Copper: 29, Tungsten: 74, Lead: 82 };
    for (const m of this.standard()) {
      if (cat[m] && cat[m].composition) this._stdZeff[m] = this._zeffFromComposition(cat[m].composition);
      else if (elemental[m] != null) this._stdZeff[m] = elemental[m];
    }
    const fallback = { Air: 7.6, Water: 7.4, Concrete: 13.3, PyrexGlass: 11.0, AcrylicResin: 6.5, Polyethylene: 5.4, Soil: 12.0 };
    for (const [m, z] of Object.entries(fallback)) if (this._stdZeff[m] == null) this._stdZeff[m] = z;
  }

  static _canonicalIndex() {
    if (this._canon) return this._canon;
    const idx = {};
    const add = (n) => { if (n) idx[n.toLowerCase()] = n; };
    for (const m of this.standard()) add(m);
    add('VOID');
    for (const n of Object.keys(this.load())) add(n);
    this._canon = idx;
    return idx;
  }

  // 材料名を正式名(lib_material.dat 表記)へ解決。大文字小文字無視＋米綴りエイリアス対応。
  static normalizeName(name) {
    if (!name || typeof name !== 'string') return name;
    const aliased = NAME_ALIASES[name.toLowerCase()] || name;
    const idx = this._canonicalIndex();
    return idx[aliased.toLowerCase()] || aliased;
  }

  static isStandard(name) { return this.standard().includes(this.normalizeName(name)); }

  static has(name) {
    const n = this.normalizeName(name);
    if (this.standard().includes(n) || n === 'VOID') return true;
    return Object.prototype.hasOwnProperty.call(this.load(), n);
  }

  static getDensity(name) {
    const n = this.normalizeName(name);
    const c = this.load()[n];
    return c ? c.density : null;
  }

  static allMaterials() {
    return [...new Set([...this.standard(), 'VOID', ...Object.keys(this.load())])];
  }

  // ---- 光子減衰係数 (atten2_xcom2.dat) --------------------------------
  // ビルドアップ係数を支配するのは「散乱で生き残る光子の割合」、すなわち
  // 非干渉散乱と吸収(光電+対生成)の競合である。等価材料はこの比を実用帯域
  // 全体で合わせて選ぶ。単一エネルギーでの一致は選ぶエネルギーに依存する
  // ため用いない。
  static _atten = null;     // { Z: {e:[], inc:[], tot:[]} } | 読み込み失敗時 {}
  static BUILDUP_MATCH_ENERGIES =
    [0.1, 0.15, 0.2, 0.3, 0.5, 0.662, 1.0, 1.25, 1.5, 2.0, 3.0];

  static _attenPath() {
    const base = process.env.POKER_INSTALL_PATH || 'C:\\Poker';
    let file = 'atten2_xcom2.dat';
    try {
      const s = fs.readFileSync(path.join(base, 'LIB', 'lib_setting.dat'), 'utf-8');
      const m = s.match(/file_attenuation\s*:\s*(\S+)/);
      if (m) file = m[1];
    } catch (e) { /* 既定名を使う */ }
    return path.join(base, 'LIB', file);
  }

  static _loadAtten() {
    if (this._atten) return this._atten;
    this._atten = {};
    try {
      const raw = fs.readFileSync(this._attenPath(), 'utf-8').split(/\r?\n/);
      let i = 0;
      while (i < raw.length) {
        const mz = raw[i].match(/^\s*z=\s*(\d+)/);
        if (!mz) { i++; continue; }
        const Z = parseInt(mz[1], 10); i++;
        let n = null;
        while (i < raw.length) {
          const mg = raw[i].match(/^\s*EGrp=\s*(\d+)/);
          if (mg) { n = parseInt(mg[1], 10); i += 2; break; }  // 列見出しを飛ばす
          i++;
        }
        if (n == null) break;
        const e = [], inc = [], tot = [];
        for (let k = 0; k < n && i < raw.length; k++, i++) {
          const p = raw[i].trim().split(/\s+/);
          if (p.length >= 3) { e.push(+p[0]); inc.push(+p[1]); tot.push(+p[2]); }
        }
        if (e.length) this._atten[Z] = { e, inc, tot };
      }
      logger.info('光子減衰係数を読み込みました', { path: this._attenPath(), elements: Object.keys(this._atten).length });
    } catch (err) {
      logger.warn('減衰係数ファイルを読み込めません。実効Zで等価材料を選定します', { error: err.message });
    }
    return this._atten;
  }

  static _interpLog(xs, ys, x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let k = 1;
    while (k < xs.length - 1 && xs[k] < x) k++;
    const t = (Math.log(x) - Math.log(xs[k - 1])) / (Math.log(xs[k]) - Math.log(xs[k - 1]));
    return Math.exp(Math.log(ys[k - 1]) + t * (Math.log(ys[k]) - Math.log(ys[k - 1])));
  }

  // 散乱/吸収比（密度は比なので相殺し、組成のみで決まる）
  static _scatterAbsorbRatio(comp, energy) {
    const at = this._loadAtten();
    let inc = 0, tot = 0;
    for (const [zs, w] of Object.entries(comp)) {
      const d = at[parseInt(zs, 10)];
      if (!d) return null;
      inc += w * this._interpLog(d.e, d.inc, energy);
      tot += w * this._interpLog(d.e, d.tot, energy);
    }
    const abs = Math.max(tot - inc, 1e-12);
    return inc / abs;
  }

  static _matchScore(compA, compB, energies) {
    let s = 0, n = 0;
    for (const E of energies) {
      const a = this._scatterAbsorbRatio(compA, E);
      const b = this._scatterAbsorbRatio(compB, E);
      if (a == null || b == null || a <= 0 || b <= 0) return null;
      const d = Math.log(a) - Math.log(b);
      s += d * d; n++;
    }
    return n ? Math.sqrt(s / n) : null;
  }

  // 非標準材料の buildup 等価材料。減衰係数データがあれば散乱/吸収比の
  // 一致で、無ければ実効Zの最近傍で選ぶ。
  static nearestBuildupEquivalent(name, energy = null) {
    const n = this.normalizeName(name);
    if (this.isStandard(n)) return n;
    const cat = this.load();
    const entry = cat[n];
    if (!entry || !entry.composition) return 'Iron';
    const energies = energy == null ? this.BUILDUP_MATCH_ENERGIES
      : (Array.isArray(energy) ? energy : [energy]);

    let best = null, bestScore = Infinity;
    const scored = [];
    for (const m of this.standard()) {
      const c = cat[m];
      if (!c || !c.composition) continue;
      const sc = this._matchScore(entry.composition, c.composition, energies);
      if (sc == null) continue;
      scored.push([m, sc]);
      if (sc < bestScore) { bestScore = sc; best = m; }
    }
    if (best) {
      // 同点圏内（スコア差がわずか）は指標への過適合を避け、実効Zで決める
      if (!this._stdZeff) this._computeStdZeff();
      const zt = this._zeffFromComposition(entry.composition);
      const lim = bestScore * 1.10 + 0.02;
      for (const [m, sc] of scored) {
        if (sc <= lim && Math.abs((this._stdZeff[m] ?? 1e9) - zt)
            < Math.abs((this._stdZeff[best] ?? 1e9) - zt)) {
          best = m; bestScore = sc;
        }
      }
      if (bestScore > BUILDUP_MATCH_WARN) {
        logger.warn('buildup 等価材料の一致が良くありません。結果の解釈に注意してください',
          { material: n, equivalent: best, score: +bestScore.toFixed(4) });
      } else {
        logger.info('buildup 等価材料を選定しました',
          { material: n, equivalent: best, score: +bestScore.toFixed(4) });
      }
      return best;
    }

    // フォールバック: 実効Z 最近傍
    if (!this._stdZeff) this._computeStdZeff();
    const ze = this._zeffFromComposition(entry.composition);
    let fb = 'Iron', fbD = Infinity;
    for (const [m, z] of Object.entries(this._stdZeff)) {
      const d = Math.abs(z - ze);
      if (d < fbD) { fbD = d; fb = m; }
    }
    return fb;
  }

  // 等価材料候補の順位（説明・検証用）
  static rankBuildupEquivalents(name, energy = null) {
    const n = this.normalizeName(name);
    const cat = this.load();
    const entry = cat[n];
    if (!entry || !entry.composition) return [];
    const energies = energy == null ? this.BUILDUP_MATCH_ENERGIES
      : (Array.isArray(energy) ? energy : [energy]);
    const out = [];
    for (const m of this.standard()) {
      const c = cat[m];
      if (!c || !c.composition) continue;
      const sc = this._matchScore(entry.composition, c.composition, energies);
      if (sc != null) out.push({ material: m, score: +sc.toFixed(4) });
    }
    return out.sort((a, b) => a.score - b.score);
  }
}
