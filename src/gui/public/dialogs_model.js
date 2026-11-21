// POKER Web GUI の入力ダイアログの「中身」（画面に依らない部分）
//
// Windows の GUI の入力ダイアログ（Form_追加_*・Form_Add_Buildupfactor・Form_NeutronCorrection）の状態と、作る YAML を、
// C# の処理をそのまま書き写して持つ。
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

  // ===================================================================================
  // 共通：Windows の YamlDotNet（DeserializerBuilder、UnderscoredNamingConvention、IgnoreUnmatchedProperties なし）と同じ読み方
  //   doc は値を文字のまま読んだもの（/api/parse の scalars: 'text'）。知らないキー・型の違いはエラー（Windows は一覧が空になる）
  // ===================================================================================
  function yamlBool(v, key) {
    if (typeof v !== 'string') throw new Error(`${key}: not a boolean`);
    if (/^(true|y|yes|on)$/i.test(v)) return true;
    if (/^(false|n|no|off)$/i.test(v)) return false;
    throw new Error(`${key}: '${v}' is not a boolean`);
  }
  function yamlStr(v, key) {
    if (v === null || v === undefined) return null;
    if (typeof v !== 'string') throw new Error(`${key}: not a scalar`);
    return v;
  }
  function checkKeys(obj, allowed, where) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error(`${where}: not a mapping`);
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw new Error(`Property '${k}' not found on type '${where}'.`);
  }
  // 最上位の { <node>: [...] } から一覧を取る（節が空なら空の一覧）
  function topList(doc, node) {
    if (doc === null || doc === undefined) return [];
    checkKeys(doc, [node], node + 'Obj');
    const list = doc[node];
    if (list === null || list === undefined || list === '') return [];
    if (!Array.isArray(list)) throw new Error(`${node}: not a sequence`);
    return list;
  }

  // ===================================================================================
  // detector（Form_追加_検出器）
  // ===================================================================================
  /** 入力の detector 節（値を文字のまま読んだもの）から一覧を作る。{ list, error } */
  function detectorsFromDoc(doc) {
    try {
      const list = topList(doc, 'detector').map((o) => {
        checkKeys(o, ['name', 'origin', 'grid', 'transform', 'show_path_trace', 'd_type'], 'Detector');
        let grid = null;
        if (o.grid !== undefined && o.grid !== null && o.grid !== '') {
          if (!Array.isArray(o.grid)) throw new Error('grid: not a sequence');
          grid = o.grid.map((g) => {
            checkKeys(g, ['edge', 'number'], 'Grid1');
            const edge = yamlStr(g.edge, 'edge'), number = yamlStr(g.number, 'number');
            return { edge: edge === null ? '1 0 0' : edge, number: number === null ? '10' : number };
          });
        }
        const origin = yamlStr(o.origin, 'origin');
        return {
          name: yamlStr(o.name, 'name'), origin: o.origin === undefined ? '0 0 0' : origin, grid,
          transform: o.transform === undefined ? null : yamlStr(o.transform, 'transform'),
          show: o.show_path_trace === undefined ? true : yamlBool(o.show_path_trace, 'show_path_trace'),
          dtype: grid === null ? 0 : grid.length >= 1 && grid.length <= 3 ? grid.length : 0,
        };
      });
      return { list, error: null };
    } catch (e) { return { list: [], error: e.message }; }
  }
  const D_DEFAULT = [['0', '0', '0', null], ['1', '0', '0', '2'], ['0', '1', '0', '2'], ['0', '0', '1', '2']];
  const csBool = (b) => (b ? 'True' : 'False');   // C# の bool をそのまま書くと True / False
  class DetectorModel {
    constructor(list) {
      this.list = list;            // [{ name, origin, grid: [{edge, number}] | null, transform, show, dtype: 0..3 }]
      this.cur = -1;               // 一覧で選んでいる行
      this.block = true;           // ブロック形式（既定で入）
      this.editor = { kind: 0, grid: D_DEFAULT.slice(0, 1).map(r => [...r]), name: '', transform: '', show: true };
      this.dirty = false;
      if (list.length) this.select(0);   // 画面を開くと一覧の先頭の行が選ばれる
    }
    /** 点・1・2・3 次元（RadioButton_CheckedChanged。同じものを選び直しても何も起きない） */
    setKind(k) {
      if (k === this.editor.kind) return;
      this.editor.kind = k;
      if (k === 0) this.editor.transform = '';
      this.editor.grid = D_DEFAULT.slice(0, k + 1).map(r => [...r]);
      this.dirty = true;
    }
    setCell(r, c, v) { this.editor.grid[r][c] = v; this.dirty = true; }
    setTransform(v) { this.editor.transform = v; this.dirty = true; }
    setShow(v) { this.editor.show = v; this.dirty = true; }
    /** 名前の欄の検査（textBox_Name_Validating）。だめなら 'NOEMPTYVALUE' / 'NODUPLICATE' */
    setName(v) {
      if (v.length <= 0) return 'NOEMPTYVALUE';
      if (this.list.some(d => d.name === v)) return 'NODUPLICATE';
      this.editor.name = v; this.dirty = true; return null;
    }
    find(i) { const name = this.list[i] ? this.list[i].name : undefined; return this.list.find(d => d.name === name); }
    /** 一覧の行を選ぶ（dgvDetectorsList_SelectionChanged） */
    select(i) {
      this.cur = i;
      const d = this.find(i);
      if (!d) return;
      this.setKind(d.grid === null ? 0 : (d.grid.length >= 1 && d.grid.length <= 3 ? d.grid.length : this.editor.kind));
      this.editor.name = d.name;
      if (d.origin !== null) { const o = d.origin.split(' '); for (let c = 0; c < 3; c++) this.editor.grid[0][c] = o[c] === undefined ? this.editor.grid[0][c] : o[c]; }
      if (d.grid !== null) d.grid.forEach((g, j) => {
        if (!this.editor.grid[j + 1]) return;
        const e = g.edge.split(' '); for (let c = 0; c < 3; c++) this.editor.grid[j + 1][c] = e[c] === undefined ? this.editor.grid[j + 1][c] : e[c];
        this.editor.grid[j + 1][3] = g.number;
      });
      this.editor.transform = d.transform ?? '';
      this.editor.show = d.show;
      this.dirty = false;
    }
    /** 「更新」（btnRegister_Click） */
    register() {
      if (this.cur < 0) return;
      this.dirty = false;
      const index = this.cur;
      const d = this.find(index);
      if (!d) return 'NOTEXISTINLIST';
      const ed = this.editor;
      d.name = ed.name;
      d.dtype = ed.kind;
      d.origin = ed.grid[0].slice(0, 3).join(' ');
      if (d.grid !== null) d.grid = [];
      if (d.dtype !== 0) d.grid = [];
      for (let i = 1; i < ed.grid.length; i++) d.grid.push({ edge: `${ed.grid[i][0]} ${ed.grid[i][1]} ${ed.grid[i][2]}`, number: ed.grid[i][3] });
      d.transform = ed.transform ? ed.transform : null;
      d.show = ed.show;
      this.select(Math.min(index, this.list.length - 1));
      return null;
    }
    /** 「追加」（btnNew_Click）。編集中なら先に呼ぶ側で更新するか確かめる */
    add() {
      let maxd = 0;
      for (const d of this.list) { const m = /\b[Dd](\d+)\b/.exec(d.name ?? ''); if (m) { const n = parseInt(m[1], 10); if (n > maxd) maxd = n; } }
      this.list.push({ name: 'd' + (maxd + 1), origin: '0 0 0', grid: null, transform: null, show: true, dtype: 0 });
      this.dirty = false;
      this.select(this.list.length - 1);
    }
    /** 「削除」（btnRemove_Click）。削除した後は同じ位置（末尾なら一つ前）の行が選ばれる */
    remove() {
      if (this.cur < 0 || !this.list.length) return;
      const d = this.find(this.cur);
      const i = this.list.indexOf(d);
      if (i >= 0) this.list.splice(i, 1);
      if (this.list.length) this.select(Math.min(this.cur, this.list.length - 1)); else this.cur = -1;
      this.dirty = false;
    }
    get yaml() {
      let yaml = '';
      for (const d of this.list) {
        if (d.dtype === 0) {
          if (!this.block) {
            yaml += d.transform === null
              ? `  - {name: ${d.name}, origin: ${d.origin}, show_path_trace: ${csBool(d.show)}}${NL}`
              : `  - {name: ${d.name}, origin: ${d.origin}, transform: ${d.transform}, show_path_trace: ${csBool(d.show)}}${NL}`;
          } else {
            yaml += `  - name: ${d.name}${NL}    origin: ${d.origin}${NL}` + (d.transform === null ? '' : `    transform: ${d.transform}${NL}`) + `    show_path_trace: ${csBool(d.show)}${NL}`;
          }
        } else if (!this.block) {
          const ops = d.grid.map(g => ` edge: ${g.edge}, number: ${g.number}`);
          yaml += d.transform === null
            ? `  - {name: ${d.name}, origin: ${d.origin}, grid: [{${ops.join('}, {')}}] , show_path_trace: ${csBool(d.show)} }${NL}`
            : `  - {name: ${d.name}, origin: ${d.origin}, grid: [{${ops.join('}, {')}}] , transform: ${d.transform}, show_path_trace: ${csBool(d.show)} }${NL}`;
        } else {
          const grids = d.grid.map(g => `      - {edge: ${g.edge}, number: ${g.number}}${NL}`).join('');
          yaml += `  - name: ${d.name}${NL}    origin: ${d.origin}${NL}    grid:${NL}` + grids
            + (d.transform === null ? '' : `    transform: ${d.transform}${NL}`) + `    show_path_trace: ${csBool(d.show)}${NL}`;
        }
      }
      return yaml;
    }
    /** 一覧の表示（addDetectorToList） */
    row(d) { return [d.name, d.origin, d.grid === null ? '' : '[' + d.grid.map(g => `{edge: ${g.edge}, number: ${g.number}}`).join(', ') + ']', d.transform ?? '', csBool(d.show)]; }
  }
  /** 欄の検査（dataGridView_単一操作_CellValidating）：x・y・z は実数、分割数は 1 以上の整数 */
  function detectorCellOk(r, c, v) {
    if (c < 3) return netTryParse(v).ok ? null : 'REALINPUT';
    if (r > 0 && c === 3) return /^\s*[+-]?\d+\s*$/.test(v) && parseInt(v, 10) > 0 && parseInt(v, 10) <= 2147483647 ? null : 'MOREINTINPUT';
    return null;
  }

  // ===================================================================================
  // buildup_factor（Form_Add_Buildupfactor）
  // ===================================================================================
  function buildupsFromDoc(doc) {
    try {
      const list = topList(doc, 'buildup_factor').map((o) => {
        checkKeys(o, ['material', 'equivalent', 'use_slant_correction', 'use_finite_medium_correction', 'num_layers'], 'Buildupfactor');
        const material = o.material === undefined ? '' : yamlStr(o.material, 'material');
        const equivalent = o.equivalent === undefined ? '' : yamlStr(o.equivalent, 'equivalent');
        const lays = (material ?? '').split('').filter(ch => ch === '-').length;
        if (lays > 2) throw new Error('The number of layers is not between 1 and 3.');
        return {
          material, equivalent,
          slant: o.use_slant_correction === undefined ? false : yamlBool(o.use_slant_correction, 'use_slant_correction'),
          finite: o.use_finite_medium_correction === undefined ? false : yamlBool(o.use_finite_medium_correction, 'use_finite_medium_correction'),
          layers: lays + 1,
        };
      });
      return { list, error: null };
    } catch (e) { return { list: [], error: e.message }; }
  }
  class BuildupModel {
    /** lists：{ materials, one, two, three }（/api/names の buildup） */
    constructor(list, lists) {
      this.list = list; this.lists = lists; this.cur = -1; this.block = true;
      this.editor = { layers: 1, first: '', second: '', third: '', equiv: '', finite: false, slant: false };
      this.dirty = false;
      if (list.length) this.select(0);
    }
    items(which) { return which === 'first' ? this.lists.materials : which === 'equiv' ? this.lists.one : which === 'second' ? this.lists.two : this.lists.three; }
    /** DropDownList の SelectedItem：一覧に同じ文字（大文字小文字も）があるときだけ選び直す */
    selectItem(which, value) { if (this.items(which).includes(value)) this.editor[which] = value; }
    setLayers(n) { if (n !== this.editor.layers) { this.editor.layers = n; this.dirty = true; } }   // 同じものを選び直しても何も起きない
    choose(which, value) { this.editor[which] = value; if (this.list.length) this.dirty = true; }
    setFinite(v) { this.editor.finite = v; this.dirty = true; }
    setSlant(v) { this.editor.slant = v; this.dirty = true; }
    find(i) { const r = this.list[i]; return r ? this.list.find(b => b.layers === r.layers && b.material === r.material) : undefined; }
    select(i) {
      this.cur = i;
      const b = this.find(i);
      if (!b) return;
      this.editor.layers = b.layers;
      if (b.layers === 1) { this.selectItem('first', b.material); this.selectItem('equiv', b.equivalent); }
      else if (b.layers === 2) this.selectItem('second', b.material);
      else this.selectItem('third', b.material);
      this.editor.finite = b.finite; this.editor.slant = b.slant;
      this.dirty = false;
    }
    /** 同じ材料の重複の検査（dupcheck）。false なら更新しない（error があれば知らせる） */
    dupcheck() {
      if (!this.list.length) return { ok: true };
      const text = this.editor.layers === 1 ? this.editor.first : this.editor.layers === 2 ? this.editor.second : this.editor.third;
      const curRow = this.list[this.cur];
      if (!curRow || !text) return { ok: false };
      if (text === curRow.material) return { ok: true };
      if (this.list.some(b => b.material === text)) return { ok: false, error: 'EXISTSAMENODE' };
      return { ok: true };
    }
    register() {
      const dc = this.dupcheck();
      if (!dc.ok) return dc.error || 'SILENT';
      this.dirty = false;
      const index = this.cur;
      const b = this.find(index);
      if (!b) return 'NOTEXISTINLIST';
      const ed = this.editor;
      if (ed.layers === 1) { b.layers = 1; b.material = ed.first; b.equivalent = ed.equiv; }
      else if (ed.layers === 2) { b.layers = 2; b.material = ed.second; }
      else { b.layers = 3; b.material = ed.third; }
      b.slant = ed.slant; b.finite = ed.finite;
      this.select(Math.min(index, this.list.length - 1));
      return null;
    }
    add() {
      let maxd = 0;
      for (const b of this.list) { const m = /\b[Bb]uildup(\d+)\b/.exec(b.material); if (m) { const n = parseInt(m[1], 10); if (n > maxd) maxd = n; } }
      this.list.push({ material: 'buildup' + (maxd + 1), equivalent: '', slant: false, finite: false, layers: 1 });
      this.dirty = false;
      this.select(this.list.length - 1);
    }
    remove() {
      if (this.cur < 0 || !this.list.length) return;
      const b = this.find(this.cur);
      const i = this.list.indexOf(b);
      if (i >= 0) this.list.splice(i, 1);
      if (this.list.length) this.select(Math.min(this.cur, this.list.length - 1)); else this.cur = -1;
      this.dirty = false;
    }
    moveUp() {
      const index = this.cur;
      if (index > 0 && this.find(index)) {
        [this.list[index], this.list[index - 1]] = [this.list[index - 1], this.list[index]];
        this.select(index - 1);
      }
    }
    /** 閉じるときの検査（FormClosing）：一覧に無い材料、材料の重複。{ error, detail } */
    closeError() {
      const findString = (items, s) => items.some(it => it.toLowerCase().startsWith((s ?? '').toLowerCase()));
      for (const b of this.list) {
        const items = b.layers === 1 ? this.lists.materials : b.layers === 2 ? this.lists.two : this.lists.three;
        if (!findString(items, b.material)) return { error: 'NOTEXISTINLIST', detail: b.material };
      }
      const seen = new Map();
      for (const b of this.list) { const k = b.material.toUpperCase(); seen.set(k, (seen.get(k) || 0) + 1); }
      const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
      if (dup.length) return { error: 'DUPLICATE', detail: dup.join(', ') };
      return null;
    }
    get yaml() {
      let yaml = '';
      for (const b of this.list) {
        if (!this.block) {
          yaml += b.equivalent === ''
            ? `  - {material: ${b.material}, use_slant_correction: ${csBool(b.slant)}, use_finite_medium_correction: ${csBool(b.finite)} }${NL}`
            : `  - {material: ${b.material}, equivalent: ${b.equivalent}, use_slant_correction: ${csBool(b.slant)}, use_finite_medium_correction: ${csBool(b.finite)} }${NL}`;
        } else {
          yaml += `  - material: ${b.material}${NL}` + (b.equivalent === '' ? '' : `    equivalent: ${b.equivalent}${NL}`)
            + `    use_slant_correction: ${csBool(b.slant)}${NL}    use_finite_medium_correction: ${csBool(b.finite)}${NL}`;
        }
      }
      return yaml;
    }
    row(b) { return [String(b.layers), b.material, b.equivalent, csBool(b.finite), csBool(b.slant)]; }
  }

  // ===================================================================================
  // neutron_correction（Form_NeutronCorrection・NeutronCatalog）
  // ===================================================================================
  function isNeutronDeck(yaml) {
    if (!yaml) return false;
    return /^particle\s*:\s*['"]?neutron['"]?\s*(#.*)?$/im.test(yaml.replace(/\r\n/g, '\n'));
  }
  function splitLinesNl(yaml) { return { nl: yaml.includes('\r\n') ? '\r\n' : '\n', lines: yaml.replace(/\r\n/g, '\n').split('\n') }; }
  function findCorrectionBlock(lines) {
    let start = -1, end = -1;
    for (let i = 0; i < lines.length; i++) if (/^neutron_correction\s*:/.test(lines[i])) { start = i; break; }
    if (start < 0) return { start, end };
    end = start + 1;
    while (end < lines.length && lines[end].length > 0 && (lines[end][0] === ' ' || lines[end][0] === '\t')) end++;
    return { start, end };
  }
  function readCorrection(yaml) {
    const r = { written: false, geometry: null, finiteMedium: null };
    if (!yaml) return r;
    const { lines } = splitLinesNl(yaml);
    const { start, end } = findCorrectionBlock(lines);
    if (start < 0) return r;
    r.written = true;
    let text = lines.slice(start, end).map(l => l.replace(/#.*$/, '')).join('\n');
    text = text.substring(text.indexOf(':') + 1);
    const get = (key) => { const m = new RegExp(key + '\\s*:\\s*(true|false)\\b', 'i').exec(text); return m ? m[1].toLowerCase() === 'true' : null; };
    r.geometry = get('use_geometry_correction');
    r.finiteMedium = get('use_finite_medium_correction');
    return r;
  }
  function writeCorrection(yaml, geometry, finiteMedium) {
    const line = 'neutron_correction: { use_geometry_correction: ' + (geometry ? 'true' : 'false')
      + ', use_finite_medium_correction: ' + (geometry && finiteMedium ? 'true' : 'false') + ' }';
    const { lines, nl } = splitLinesNl(yaml ?? '');
    const { start, end } = findCorrectionBlock(lines);
    if (start >= 0) { lines.splice(start, end - start, line); return lines.join(nl); }
    let at = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^unit\s*:/.test(lines[i])) {
        at = i + 1;
        while (at < lines.length && lines[at].length > 0 && (lines[at][0] === ' ' || lines[at][0] === '\t')) at++;
        break;
      }
    }
    if (at < 0) for (let i = 0; i < lines.length; i++) if (/^particle\s*:/.test(lines[i])) { at = i + 1; break; }
    if (at < 0) at = 0;
    lines.splice(at, 0, line);
    return lines.join(nl);
  }
  /** ダイアログの状態（Form_NeutronCorrection）：G を外すと F も外れて選べず、G を戻すと F も前の状態に戻る */
  class NeutronCorrectionModel {
    constructor({ geometry, finiteMedium }) {
      const g = geometry ?? true, f = finiteMedium ?? true;
      this.fWhenG = f; this.g = g; this.f = g && f; this.fEnabled = g;
    }
    setG(on) {
      if (on === this.g) return;
      this.g = on;
      if (on) { this.fEnabled = true; this.f = this.fWhenG; } else { this.fWhenG = this.f; this.f = false; this.fEnabled = false; }
    }
    setF(on) { if (this.fEnabled) this.f = on; }
    get geometryCorrection() { return this.g; }
    get finiteMediumCorrection() { return this.g && this.f; }
  }

  const api = { NL, netTryParse, findNode, abstractNode, addNode, deleteNode, nameCandidate,
    TransformModel, transformGrid, T_OPS, BodyModel, BODY_TYPES, ZoneModel, ATMOSPHERE, VOID,
    detectorsFromDoc, DetectorModel, detectorCellOk, buildupsFromDoc, BuildupModel,
    isNeutronDeck, readCorrection, writeCorrection, NeutronCorrectionModel };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PokerDialogs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
