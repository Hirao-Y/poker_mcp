// utils/MaterialCatalog.js - POKER material library (lib_material.dat) loader + photon effective-Z buildup equivalent
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

// ビルドアップデータを持つ標準材料（綴りは Aluminium に統一）
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

const ZEFF_EXPONENT = 2.94; // Mayneord 型 光子実効Z

export class MaterialCatalog {
  static _catalog = null;   // { name: {density, composition:{Z:wtFrac}, isStandard} }
  static _stdZeff = null;   // { name: Zeff }
  static _canon = null;     // { lowercaseName: CanonicalName }

  static _libPath() {
    const base = process.env.POKER_INSTALL_PATH || 'C:\\Poker';
    return path.join(base, 'LIB', 'lib_material.dat');
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
      cat[name] = { density, composition: comp, isStandard: STANDARD_MATERIALS.includes(name) };
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
      for (const m of STANDARD_MATERIALS) this._catalog[m] = { density: null, composition: null, isStandard: true };
    }
    this._canon = null;
    this._computeStdZeff();
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
    for (const m of STANDARD_MATERIALS) {
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
    for (const m of STANDARD_MATERIALS) add(m);
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

  static isStandard(name) { return STANDARD_MATERIALS.includes(this.normalizeName(name)); }

  static has(name) {
    const n = this.normalizeName(name);
    if (STANDARD_MATERIALS.includes(n) || n === 'VOID') return true;
    return Object.prototype.hasOwnProperty.call(this.load(), n);
  }

  static getDensity(name) {
    const n = this.normalizeName(name);
    const c = this.load()[n];
    return c ? c.density : null;
  }

  static allMaterials() {
    return [...new Set([...STANDARD_MATERIALS, 'VOID', ...Object.keys(this.load())])];
  }

  // 組成の光子実効Zで最近傍の標準材料を返す（非標準材料の buildup 等価材料）
  static nearestBuildupEquivalent(name) {
    const n = this.normalizeName(name);
    if (this.isStandard(n)) return n;
    const entry = this.load()[n];
    if (!this._stdZeff) this._computeStdZeff();
    if (!entry || !entry.composition) return 'Iron';
    const ze = this._zeffFromComposition(entry.composition);
    let best = 'Iron', bestD = Infinity;
    for (const [m, z] of Object.entries(this._stdZeff)) {
      const d = Math.abs(z - ze);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }
}
