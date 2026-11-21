// POKER Web GUI の入力ダイアログの「中身」（画面に依らない部分）
//
// Windows の GUI の入力ダイアログ（Form_追加_*）の状態と、作る YAML を、C# の処理をそのまま書き写して持つ。
// 画面（dialogs.js）はこの状態を表示・操作するだけ。Node の試験（tests/dialogs-model.test.mjs）からも同じものを使い、
// Windows の GUI のダイアログ（POKER.exe をリフレクションで操作したもの）と同じ YAML になることを確かめる。
//   - YAML の改行は Windows と同じ "\r\n"（エディタに入れるときはどちらでもよい）。
//   - 数値の欄の検査は .NET の double.TryParse と同じ受け付け方（netTryParse）。
// 入力の節の扱い（どこに足すか・ダイアログに読む範囲・書き直すときに消す範囲）も Form_MainWindow と同じもの（nodeTools）。
(function (root) {
  'use strict';
  const NL = '\r\n';

  // ---- .NET Framework の double.TryParse（NumberStyles.Float | AllowThousands、ja-JP／en-US：小数点 '.'、桁区切り ','）----
  function netTryParse(s) {
    if (s === null || s === undefined) return { ok: false, value: 0 };
    const t = String(s).replace(/^[\s ]+|[\s ]+$/g, '');
    if (/^[+-]?(\d[\d,]*)?(\.\d*)?([eE][+-]?\d+)?$/.test(t) && /\d/.test(t.replace(/[eE][+-]?\d+$/, ''))) {
      const v = Number(t.replace(/,/g, ''));
      if (Number.isFinite(v)) return { ok: true, value: v };
    }
    if (/^[+-]?(Infinity|∞)$/.test(t)) return { ok: true, value: t[0] === '-' ? -Infinity : Infinity };
    if (t === 'NaN') return { ok: true, value: NaN };
    return { ok: false, value: 0 };
  }

  // ---- 入力の節（Form_MainWindow の FindNode・AbstractNode・NodeInsertRow・DeleteNode・nameCandidate）----
  const isBlankOrComment = (line) => { const t = line.trim(); return t.length === 0 || t[0] === '#'; };
  const isTopLevel = (line) => line.length > 0 && !/\s/.test(line[0]) && line[0] !== '#' && line[0] !== '-';
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function findNode(lines, name) {
    let head = -1, last = -1;
    const header = new RegExp(`^${escapeRe(name)}\\s*:`);
    for (let i = 0; i < lines.length; i++) if (header.test(lines[i])) { head = i; break; }
    if (head < 0) return { head, last };
    last = head;
    for (let i = head + 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r+$/, '');
      if (line.trim().length === 0) continue;
      if (line.trimStart()[0] === '#') { if (/\s/.test(line[0])) last = i; continue; }
      if (isTopLevel(line)) break;
      last = i;
    }
    return { head, last };
  }
  // 画面のエディタの文字は "\n" 区切り（Windows の GUI は Environment.NewLine で分けるが、エディタから来る文字は "\r\n"）
  function abstractNode(name, yaml) {
    const lines = yaml.split(/\r?\n/);
    const { head, last } = findNode(lines, name);
    if (head < 0) return '';
    let sb = '';
    for (let i = head; i <= last; i++) if (i === head || !isBlankOrComment(lines[i])) sb += lines[i] + NL;
    return sb;
  }
  function nodeInsertRow(name, yaml) {
    const lines = yaml.split('\n');
    if (!yaml.endsWith('\n')) lines.push('');
    const { head, last } = findNode(lines, name);
    return { found: head >= 0, row: head >= 0 ? last + 1 : lines.length };
  }
  /** AddNode：挿入する行と文字（エディタの insertText(row, text) に渡す） */
  function addNode(name, value, yaml) {
    const { found, row } = nodeInsertRow(name, yaml);
    return { row, text: found ? value : `\n${name}:\n${value}` };
  }
  function deleteNode(name, yaml) {
    const lines = yaml.split(/\r?\n/);
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const { head, last } = findNode(lines, name);
    if (head >= 0 && last > head) {
      const comments = [];
      for (let i = head + 1; i <= last; i++) { const t = lines[i].trim(); if (t.length > 0 && t[0] === '#') comments.push(lines[i]); }
      lines.splice(head + 1, last - head);
      lines.splice(head, 0, ...comments);
    }
    return lines.map(l => l + '\n').join('');
  }
  function nameCandidate(prefix, yaml) {
    const re = new RegExp(`^[^#].*name\\s*:\\s+${escapeRe(prefix)}(\\d+)`, 'gm');
    let max = null;
    for (const m of yaml.matchAll(re)) { const v = parseInt(m[1], 10); if (max === null || v > max) max = v; }
    return max === null ? `${prefix}1` : `${prefix}${max + 1}`;
  }

  // ===================================================================================
  // transform（Form_追加_回転と平行移動）
  // ===================================================================================
  const T_OPS = {
    x: 'rotate_around_x', y: 'rotate_around_y', z: 'rotate_around_z', axis: 'rotate_by_axis_angle', matrix: 'rotate_by_matrix',
    translate: 'translate', rpy: 'rotate_by_rpy', zxz: 'rotate_by_eulerzxz', xyz: 'rotate_by_eulerxyz',
  };
  /** 単一操作の表（行 × 3 列）の既定値と、使わない欄（null） */
  function transformGrid(kind) {
    switch (kind) {
      case 'x': case 'y': case 'z': return [['0', null, null]];
      case 'axis': return [['0', '0', '1'], ['0', null, null]];
      case 'matrix': return [['1', '0', '0'], ['0', '1', '0'], ['0', '0', '1']];
      default: return [['0', '0', '0']];
    }
  }
  class TransformModel {
    constructor(name) { this.name = name; this.kind = 'x'; this.grid = transformGrid('x'); this.ops = []; this.block = 'Unchecked'; }
    setKind(kind) { this.kind = kind; this.grid = transformGrid(kind); }
    /** 「操作を追加」。エラーのときは { error: 'ROTATELENGTHZERO' } を返し、追加しない */
    addOperation() {
      const g = this.grid;
      const vec = (i) => g[i].map(c => (c === null ? '' : c)).join(' ');
      let name = '', operation = '';
      const k = this.kind;
      if (k === 'x' || k === 'y' || k === 'z') { name = T_OPS[k]; operation = g[0][0]; }
      if (k === 'axis') {
        const d = [0, 1, 2].map(i => netTryParse(g[0][i]).value);
        const d1 = netTryParse(g[0][0]).ok ? d[0] : 0, d2 = netTryParse(g[0][1]).ok ? d[1] : 0, d3 = netTryParse(g[0][2]).ok ? d[2] : 0;
        if (d1 * d1 + d2 * d2 + d3 * d3 === 0.0) return { error: 'ROTATELENGTHZERO' };
        name = T_OPS.axis; operation = `axis: ${vec(0)}, angle: ${g[1][0]}`;
      }
      if (k === 'matrix') { name = T_OPS.matrix; operation = `row_1: ${vec(0)}, row_2: ${vec(1)}, row_3: ${vec(2)}`; }
      if (k === 'translate' || k === 'rpy' || k === 'zxz' || k === 'xyz') { name = T_OPS[k]; operation = vec(0); }
      this.ops.push({ name, value: operation });
      return { error: null };
    }
    removeOperation(i) { this.ops.splice(i, 1); }
    get yaml() {
      let yaml = '';
      const operations = [];
      const st = this.block;
      for (const { name, value } of this.ops) {
        if (name === T_OPS.axis) {
          const s = value.split(/[:,]/).map(x => x.trim());
          if (st === 'Checked') yaml += `      - ${name}:${NL}          axis: ${s[1]}${NL}          angle: ${s[3]}${NL}`;
          else if (st === 'Indeterminate') yaml += `      - ${name}: {axis: ${s[1]}, angle: ${s[3]}}${NL}`;
          else operations.push(`${name}: {axis: ${s[1]}, angle: ${s[3]}}`);
        } else if (name === T_OPS.matrix) {
          const s = value.split(/[:,]/).map(x => x.trim());
          if (st === 'Checked') yaml += `      - ${name}:${NL}          row_1: ${s[1]}${NL}          row_2: ${s[3]}${NL}          row_3: ${s[5]}${NL}`;
          else if (st === 'Indeterminate') yaml += `      - ${name}: {row_1: ${s[1]}, row_2: ${s[3]}, row_3: ${s[5]}}${NL}`;
          else operations.push(`${name}: {row_1: ${s[1]}, row_2: ${s[3]}, row_3: ${s[5]}}`);
        } else {
          if (st === 'Unchecked') operations.push(`${name}: ${value}`);
          else yaml += `      - ${name}: ${value}${NL}`;
        }
      }
      if (st === 'Unchecked') return `  - { name: ${this.name}, operation: [{${operations.join('}, {')}}] }${NL}`;
      return `  - name: ${this.name}${NL}    operation:${NL}` + yaml;
    }
    /** 閉じるときの検査（Form_追加_回転と平行移動_FormClosing） */
    closeError() { return this.ops.length < 1 ? 'NOTITEMLIST' : null; }
  }

  // ===================================================================================
  // body（Form_追加_立体）
  // ===================================================================================
  // 行：[見出し, 既定値（3 列。null は使わない欄）]。help は Properties.Resources の説明の名前
  const BODY_TYPES = {
    BOX: { help: 'BOXDESC', rows: [['vertex', ['0', '0', '0']], ['edge_1', ['1', '0', '0']], ['edge_2', ['0', '1', '0']], ['edge_3', ['0', '0', '1']]] },
    RPP: { help: 'RPPDESC', rows: [['min', ['0', '0', '0']], ['max', ['1', '1', '1']]] },
    WED: { help: 'WEDGEDESC', rows: [['vertex', ['0', '0', '0']], ['width_vector', ['1', '0', '0']], ['height_vector', ['0', '1', '0']], ['depth_vector', ['0', '0', '1']]] },
    RCC: { help: 'RCCDESC', radius: true, rows: [['bottom_center', ['0', '0', '0']], ['height_vector', ['0', '0', '1']], ['radius', ['1', null, null]]] },
    REC: { help: 'RECDESC', rows: [['bottom_center', ['0', '0', '0']], ['height_vector', ['0', '0', '1']], ['radius_vector_1', ['1', '0', '0']], ['radius_vector_2', ['0', '1', '0']]] },
    TRC: { help: 'TRCDESC', radius: true, rows: [['bottom_center', ['0', '0', '0']], ['height_vector', ['0', '0', '1']], ['bottom_radius', ['1', null, null]], ['top_radius', ['0.5', null, null]]] },
    SPH: { help: 'SPHDESC', radius: true, rows: [['center', ['0', '0', '0']], ['radius', ['1', null, null]]] },
    ELL: { help: 'ELLDESC', rows: [['center', ['0', '0', '0']], ['radius_vector_1', ['1', '0', '0']], ['radius_vector_2', ['0', '1', '0']], ['radius_vector_3', ['0', '0', '1']]] },
    TOR: { help: 'TORDESC', radius: true, rows: [['center', ['0', '0', '0']], ['normal', ['0', '0', '1']], ['major_radius', ['1', null, null]], ['minor_radius_horizontal', ['0.2', null, null]], ['minor_radius_vertical', ['0.2', null, null]]] },
    CMB: { help: 'CMBDESC', cmb: true, rows: [['expression', ['a + (b & c - d)', null, null]]] },
  };
  class BodyModel {
    constructor(name) { this.name = name; this.transform = ''; this.block = false; this.setType('BOX'); }
    setType(type) { this.type = type; this.grid = BODY_TYPES[type].rows.map(([h, v]) => ({ header: h, values: [...v] })); }
    get yaml() {
      const elements = [`name: ${this.name}`, `type: ${this.type}`];
      for (const row of this.grid) elements.push(`${row.header}: ${row.values.filter(v => v !== null).join(' ')}`);
      if (this.transform.trim() !== '') elements.push(`transform: ${this.transform}`);
      if (this.block) return elements.map((e, i) => (i === 0 || e === elements[0] ? `  - ${e}` : `    ${e}`) + NL).join('');
      return `  - { ${elements.join(', ')} }${NL}`;
    }
  }

  // ===================================================================================
  // zone（Form_追加_遮蔽体）
  // ===================================================================================
  const ATMOSPHERE = 'ATMOSPHERE', VOID = 'VOID';
  class ZoneModel {
    /** bodyNames：入力の body の名前（Windows は body 節を YamlDotNet で読む）。null は body 節が無いとき */
    constructor(bodyNames) {
      this.items = bodyNames ? [ATMOSPHERE, ...bodyNames] : [];
      this.bodyName = this.items.length ? this.items[0] : '';
      this.material = ''; this.density = '0';
      this.atmosphere = false; this.isVoid = false; this.block = false;
    }
    setAtmosphere(on) { this.atmosphere = on; this.bodyName = on ? (this.items.includes(ATMOSPHERE) ? ATMOSPHERE : '') : ''; }
    setVoid(on) { this.isVoid = on; if (on) { this.material = VOID; this.density = '0'; } else { this.material = ''; } }
    get yaml() {
      const elements = [`body_name: ${this.bodyName}`, `material: ${this.material}`];
      if (!this.isVoid) elements.push(`density: ${this.density}`);
      if (this.block) return elements.map((e, i) => (i === 0 || e === elements[0] ? `  - ${e}` : `    ${e}`) + NL).join('');
      return `  - { ${elements.join(', ')} }${NL}`;
    }
    /** 閉じるときの検査（Form_追加_遮蔽体_FormClosing）：空の欄の名前を返す */
    closeError() {
      if (!this.bodyName) return 'Body_name';
      if (!this.material) return 'Material';
      if (!this.density) return 'Density';
      return null;
    }
    /** 密度の欄の検査（textBox_密度_Validating）：非負の実数 */
    static densityOk(s) { const r = netTryParse(s); return r.ok && !(r.value < 0.0); }
  }

  const api = { NL, netTryParse, findNode, abstractNode, addNode, deleteNode, nameCandidate,
    TransformModel, transformGrid, T_OPS, BodyModel, BODY_TYPES, ZoneModel, ATMOSPHERE, VOID };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PokerDialogs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
