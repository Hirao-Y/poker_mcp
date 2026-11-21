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
  /** 欄の検査（dataGridView_単一操作_CellValidating）：x・y・z は実数、number（点の数）は 2 以上 1000 以下の整数 */
  function detectorCellOk(r, c, v) {
    if (c < 3) return netTryParse(v).ok ? null : 'REALINPUT';
    // number は両端を含む点の数。CUI（DetectorGrid::throw_if_invalid）と同じく 2 以上 1000 以下（Windows も 2026-11-22 に同じにした）
    if (r > 0 && c === 3) return /^\s*[+-]?\d+\s*$/.test(v) && parseInt(v, 10) >= 2 && parseInt(v, 10) <= 1000 ? null : 'GRIDNUMBER';
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

  // ===================================================================================
  // source（Form_追加_線源・Form_追加_MANUAL）
  //   画面の表の欄の値は、Windows の DataGridView のセルと同じく文字で持つ。コードが数で入れる欄（形状の既定値・分割数の 2 など）は
  //   .NET の double.ToString() の書き方（fmtNet）にする。放射能・エネルギ・分布の欄は ValueType が double なので、
  //   利用者が打った値は数に直してから fmtNet で書く（DataGridView が打った文字を double に変えるため）。
  //   リストの線源（list）は Windows の Source オブジェクトと同じ形。YAML は Update_YAML の書き写し。
  // ===================================================================================
  /** .NET の ToString("G<p>")（p 桁。指数が -5 未満か p 以上なら指数表記 "E+05"） */
  function fmtG(d, p) {
    if (Number.isNaN(d)) return 'NaN';
    if (d === Infinity) return 'Infinity';
    if (d === -Infinity) return '-Infinity';
    if (d === 0) return '0';
    const sign = d < 0 ? '-' : '';
    const [mant, expStr] = Math.abs(d).toExponential(p - 1).split('e');
    const digits = mant.replace('.', '').replace(/0+$/, '') || '0';
    const e = Number(expStr);
    if (e > -5 && e < p) {
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
  /** .NET Framework の double.ToString()（G15） */
  const fmtNet = (d) => fmtG(d, 15);
  /** .NET の ToString("E")（小数 6 桁、指数は符号つき 3 桁） */
  function fmtE(d) {
    if (!Number.isFinite(d)) return fmtNet(d);
    const [m, e] = d.toExponential(6).split('e');
    const n = Number(e);
    return m + 'E' + (n < 0 ? '-' : '+') + String(Math.abs(n)).padStart(3, '0');
  }
  const cellStr = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? fmtNet(v) : String(v));

  const S_TYPES = ['POINT', 'BOX', 'RPP', 'SPH', 'RCC'];
  const DIV_TYPES = ['UNIFORM', 'GAUSS_FIRST', 'GAUSS_LAST', 'GAUSS_BOTH', 'GAUSS_CENTER', 'MANUAL'];
  const GEO_ROWS = { POINT: ['position'], BOX: ['vertex', 'edge_1', 'edge_2', 'edge_3'], RPP: ['min', 'max'], SPH: ['center', 'radius'], RCC: ['bottom_center', 'height_vector', 'radius'] };
  const GEO_DEFAULT = {
    POINT: [[0, 0, 0]], BOX: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], RPP: [[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
    SPH: [[0, 0, 0], [0.5, null, null]], RCC: [[0, 0, -0.5], [0, 0, 1], [0.5, null, null]],
  };
  const DIV_ROWS = { BOX: ['edge_1', 'edge_2', 'edge_3'], RPP: ['edge_1', 'edge_2', 'edge_3'], SPH: ['r', 'theta', 'phi'], RCC: ['r', 'phi', 'z'] };
  const EDGE_KEYS = ['edge_1', 'edge_2', 'edge_3', 'r', 'theta', 'phi', 'z'];
  const newEdge = () => ({ type: 'UNIFORM', number: '2', min: null, max: null, end_point: null, weight: null });

  // ---- 入力の source 節を読む（YAML2Object。YamlDotNet：知らないキーはエラー、enum は大文字小文字を問わない） ----
  function yamlEnum(v, names, key) {
    const s = yamlStr(v, key);
    if (s === null || s === '') throw new Error(`${key}: empty`);
    const hit = names.find(n => n.toLowerCase() === s.trim().toLowerCase());
    if (!hit) throw new Error(`Requested value '${s}' was not found.`);
    return hit;
  }
  const optStr = (o, k) => (o[k] === undefined || o[k] === null || o[k] === '' ? null : yamlStr(o[k], k));
  function strList(v, key) {
    if (v === undefined || v === null || v === '') return null;
    if (!Array.isArray(v)) throw new Error(`${key}: not a sequence`);
    return v.map(x => yamlStr(x, key));
  }
  /** unit 節の文字から角度の単位（Windows は行を ':' と '#' で分けて angle の値を見る） */
  function angleFromUnit(text) {
    let angle = 'radian';
    for (const line of String(text ?? '').split(/\r\n|\r|\n/)) {
      const p = line.split(/[:#]/);
      if (p.length >= 2 && p[0].trim().toLowerCase() === 'angle') {
        const v = p[1].trim().toLowerCase();
        if (v === 'degree' || v === 'radian') angle = v;
      }
    }
    return angle;
  }
  /** source 節（値を文字のまま読んだもの）と unit 節の文字から。{ list, error, angle }。unit 節が無ければ Windows と同じく読まない */
  function sourcesFromDoc(doc, unitText) {
    if (!doc || !unitText) return { list: [], error: null, angle: 'radian' };
    try {
      const list = topList(doc, 'source').map((o) => {
        checkKeys(o, ['type', 'name', 'position', 'geometry', 'division', 'inventory', 'cutoff_rate', 'path_trace', 'inv_type'], 'Source');
        const s = {
          type: o.type === undefined ? 'POINT' : yamlEnum(o.type, S_TYPES, 'type'),
          name: optStr(o, 'name'), position: optStr(o, 'position'), geometry: null, division: null, inventory: null,
          cutoff: 1e-4, pathTrace: null, invType: o.inv_type === undefined ? 'NUCLIDE' : yamlEnum(o.inv_type, ['NUCLIDE', 'ENERGY'], 'inv_type'),
        };
        if (o.geometry !== undefined && o.geometry !== null && o.geometry !== '') {
          const keys = ['vertex', 'edge_1', 'edge_2', 'edge_3', 'min', 'max', 'center', 'radius', 'bottom_center', 'height_vector', 'transform'];
          checkKeys(o.geometry, keys, 'GeometryClass');
          s.geometry = {}; for (const k of keys) s.geometry[k] = optStr(o.geometry, k);
        }
        if (o.division !== undefined && o.division !== null && o.division !== '') {
          checkKeys(o.division, EDGE_KEYS, 'DivisionClass');
          s.division = {};
          for (const k of EDGE_KEYS) {
            const e = o.division[k];
            if (e === undefined || e === null || e === '') { s.division[k] = null; continue; }
            checkKeys(e, ['type', 'number', 'min', 'max', 'end_point', 'weight'], 'Edge');
            s.division[k] = {
              type: e.type === undefined ? 'UNIFORM' : yamlEnum(e.type, DIV_TYPES, 'type'),
              number: e.number === undefined ? '2' : optStr(e, 'number'),
              min: optStr(e, 'min'), max: optStr(e, 'max'), end_point: optStr(e, 'end_point'), weight: optStr(e, 'weight'),
            };
          }
        }
        if (o.inventory === undefined || o.inventory === null || o.inventory === '') throw new Error('inventory: missing');
        if (!Array.isArray(o.inventory)) throw new Error('inventory: not a sequence');
        s.inventory = o.inventory.map((inv) => {
          checkKeys(inv, ['nuclide', 'energy', 'spectrum', 'radioactivity', 'emission'], 'InventoryClass');
          const r = { nuclide: optStr(inv, 'nuclide'), energy: optStr(inv, 'energy'), spectrum: optStr(inv, 'spectrum'), radioactivity: optStr(inv, 'radioactivity') };
          const emission = optStr(inv, 'emission');
          if (emission !== null && r.radioactivity === null) r.radioactivity = emission;   // [追加 2026-11-12] 中性子の emission
          return r;
        });
        for (const inv of s.inventory) s.invType = inv.nuclide !== null ? 'NUCLIDE' : 'ENERGY';
        if (o.cutoff_rate !== undefined) {
          const c = netTryParse(yamlStr(o.cutoff_rate, 'cutoff_rate'));
          if (!c.ok) throw new Error('cutoff_rate: not a number');
          s.cutoff = c.value;
        }
        if (o.path_trace !== undefined && o.path_trace !== null && o.path_trace !== '') {
          checkKeys(o.path_trace, ['position', 'bounding_box'], 'PathTrace');
          s.pathTrace = { position: strList(o.path_trace.position, 'position'), bounding_box: strList(o.path_trace.bounding_box, 'bounding_box') };
        }
        return s;
      });
      return { list, error: null, angle: angleFromUnit(unitText) };
    } catch (e) { return { list: [], error: e.message, angle: 'radian' }; }
  }

  // ---- 一覧・YAML の文字（GetListInventory・GetListGeometry・GetListDivision・GetStringPathTrace） ----
  function srcInventory(s, key) {
    if (s.invType === 'NUCLIDE') return s.inventory.map(i => `{nuclide: ${cellStr(i.nuclide)}, ${key}: ${cellStr(i.radioactivity)}}`);
    return s.inventory.map(i => `{energy: ${cellStr(i.energy)}, spectrum: ${cellStr(i.spectrum)}, ${key}: ${cellStr(i.radioactivity)}}`);
  }
  function srcGeometry(s, block) {
    const g = s.geometry, out = [], v = (k) => cellStr(g[k]);
    const add = (k, label = k) => out.push(block ? `      ${label}: ${v(k)}${NL}` : `${k}: ${v(k)}`);
    if (s.type === 'BOX') { add('vertex'); add('edge_1'); add('edge_2'); add('edge_3'); if (g.transform !== null) add('transform'); }
    else if (s.type === 'RPP') { add('min'); add('max'); if (g.transform !== null) add('transform'); }
    else if (s.type === 'SPH') { add('center'); add('radius'); if (g.transform !== null) add('transform'); }
    else if (s.type === 'RCC') {
      add('bottom_center'); add('height_vector'); add('radius', 'radius       ');
      // Windows は流れ形式で transform の代わりに radius をもう一度書いていた（2026-11-22 に Windows も直した）
      if (g.transform !== null) add('transform', 'transform    ');
    }
    return out;
  }
  function srcDivision(s, block) {
    const names = DIV_ROWS[s.type];
    const labels = s.type === 'SPH' || s.type === 'RCC' ? names.map(n => (block ? n.padEnd(6) : n)) : names;
    return names.map((n, i) => {
      const e = s.division[n];
      let value;
      if (e.type === 'MANUAL') value = e.weight === null ? `${labels[i]}: {type: ${e.type}, end_point: ${cellStr(e.end_point)}}` : `${labels[i]}: {type: ${e.type}, end_point: ${cellStr(e.end_point)}, weight: ${e.weight}}`;
      else value = !e.min || !e.max ? `${labels[i]}: {type: ${e.type}, number: ${cellStr(e.number)}}` : `${labels[i]}: {type: ${e.type}, number: ${cellStr(e.number)}, min: ${e.min}, max: ${e.max}}`;
      return block ? `      ${value}${NL}` : value;
    });
  }
  const ptPositions = (s) => (s.pathTrace && s.pathTrace.position ? s.pathTrace.position.slice() : []);
  const ptBoxes = (s) => (s.pathTrace && s.pathTrace.bounding_box ? s.pathTrace.bounding_box.slice() : []);
  function srcPathTrace(pos, box) {
    if (box.length && pos.length) return `{position: [${pos.join(', ')}], bounding_box: [${box.join(', ')}]}`;
    if (box.length) return `{ bounding_box: [${box.join(', ')}] }`;
    if (pos.length) return `{ position: [${pos.join(', ')}] }`;
    return '';
  }

  // ---- 分割の欄の検査（dgvDivision_CellValidating）。theta・phi は角度、その他は 0～1 ----
  const UNIT_PI = 3.14159265358979323846;

  class SourceModel {
    /** opts：{ name（線源が無いときの名前の欄）, neutron, angle, defaultNuclide } */
    constructor(list, opts = {}) {
      this.list = list;
      this.neutron = !!opts.neutron;
      this.angle = opts.angle || 'radian';
      this.defaultNuclide = opts.defaultNuclide || (this.neutron ? 'Cf252' : 'Co60');
      this.block = true; this.cur = -1; this.dirty = false;
      this.editor = { type: null, name: opts.name || '', transform: '', transformEnabled: false, geo: [], div: [], invKind: null, inv: [], cutoff: '', positions: [], bounding: [] };
      this._radioType('POINT');        // Load：点
      this._radioInv('nuclide');       //       核種
      if (list.length) this.select(0); // 画面を開くと一覧の先頭の行が選ばれる
      this.dirty = false;
    }
    get strengthKey() { return this.neutron ? 'emission' : 'radioactivity'; }
    // ---- コードが表を作り直す所（RadioButton_CheckedChanged_*、dgvDivision_CellValueChanged） ----
    _radioType(t) {
      const ed = this.editor;
      if (t === ed.type) return;   // 同じものを選び直しても CheckedChanged は起きない
      ed.type = t;
      ed.geo = GEO_DEFAULT[t].map(r => r.map(v => (v === null ? null : fmtNet(v))));
      if (t === 'POINT') { ed.transform = ''; ed.transformEnabled = false; ed.div = []; return; }
      ed.transformEnabled = true;
      if (ed.div.length !== 3) ed.div = [0, 1, 2].map(() => ({ type: null, n: null, min: null, max: null, ro: false }));
      for (let r = 0; r < 3; r++) { this._divTypeCell(r, 'UNIFORM'); ed.div[r].n = '2'; }   // 分割の行は残し（min・max も残る）、種類と数だけ入れ直す
    }
    _divTypeCell(r, t) {   // 種類の欄に値が入ったとき：MANUAL なら min・max を空にして入れられなくする
      const row = this.editor.div[r];
      row.type = t;
      if (t === 'MANUAL') { row.min = null; row.max = null; row.ro = true; } else row.ro = false;
    }
    _radioInv(k) {
      const ed = this.editor;
      if (k === ed.invKind) return;
      ed.invKind = k;
      if (k === 'nuclide') ed.inv = [[this.defaultNuclide, '1']];
      else ed.inv = this.neutron ? [['2', '1', '1']] : [['1.173', '0.9997', '1'], ['1.332', '0.9999', '1']];
    }
    find(i) { const name = this.list[i] ? this.list[i].name : undefined; return this.list.find(s => s.name === name); }
    divLabels() { return DIV_ROWS[this.editor.type] || []; }
    geoLabels() { return GEO_ROWS[this.editor.type]; }

    /** 一覧の行を選ぶ（dgvSourceList_SelectionChanged） */
    select(i) {
      this.cur = i;
      const s = this.find(i);
      if (!s) return;
      const ed = this.editor;
      const fill = (row, str) => { if (str === null) return; String(str).split(' ').forEach((v, c) => { if (c < 3) ed.geo[row][c] = v; }); };
      if (s.type === 'POINT') {
        ed.name = s.name ?? '';
        this._radioType('POINT');
        fill(0, s.position);
      } else {
        ed.name = s.name ?? '';
        ed.transform = (s.geometry && s.geometry.transform) ?? '';
        this._radioType(s.type);
        const g = s.geometry || {};
        if (s.type === 'BOX') { fill(0, g.vertex); fill(1, g.edge_1); fill(2, g.edge_2); fill(3, g.edge_3); }
        else if (s.type === 'RPP') { fill(0, g.min); fill(1, g.max); }
        else if (s.type === 'SPH') { fill(0, g.center); ed.geo[1][0] = g.radius; }
        else { fill(0, g.bottom_center); fill(1, g.height_vector); ed.geo[2][0] = g.radius; }
        DIV_ROWS[s.type].forEach((n, r) => {
          const e = s.division[n], row = ed.div[r];
          this._divTypeCell(r, e.type);
          if (e.type === 'MANUAL') { row.n = e.end_point; if (e.weight !== null) row.n = (row.n ?? '') + ', ' + e.weight; }
          else { row.n = e.number; row.min = e.min ?? ''; row.max = e.max ?? ''; }
        });
      }
      ed.cutoff = fmtNet(s.cutoff);
      this._radioInv(s.invType === 'NUCLIDE' ? 'nuclide' : 'energy');
      ed.inv = s.inventory.map(v => (s.invType === 'NUCLIDE' ? [v.nuclide, v.radioactivity] : [v.energy, v.spectrum, v.radioactivity]));
      ed.positions = ptPositions(s).map(p => { const v = p.split(' '); return [v[0], v[1], v[2]]; });
      ed.bounding = ptBoxes(s);
      this.dirty = false;
    }

    // ---- 利用者の操作（値の欄の検査は Windows の CellValidating と同じ。だめなら { error, args } を返して値は変えない） ----
    setType(t) { this._radioType(t); this.dirty = true; }
    setTransform(v) { this.editor.transform = v; this.dirty = true; }
    /** 名前（textBox_Name_Validating）：空・一覧の名前と同じはだめ */
    setName(v) {
      if (v.length <= 0) return { error: 'NOEMPTYVALUE' };
      if (this.list.some(s => s.name === v)) return { error: 'NODUPLICATE' };
      this.editor.name = v; this.dirty = true; return null;
    }
    setGeo(r, c, v) {
      if (cellStr(this.editor.geo[r][c]) === v) return null;
      if (!netTryParse(v).ok) return { error: 'REALINPUT', args: [v] };
      this.editor.geo[r][c] = v; this.dirty = true; return null;
    }
    /** 分割の種類を選ぶ：MANUAL にすると数の欄が "0.0 1.0"、MANUAL から戻すと "2" */
    setDivType(r, t) {
      const row = this.editor.div[r];
      if (row.type === t) return null;
      if (row.type === 'MANUAL') row.n = '2';
      else if (t === 'MANUAL') row.n = '0.0 1.0';
      this._divTypeCell(r, t); this.dirty = true; return null;
    }
    /** 分割の数・min・max の欄（c：1・2・3） */
    setDivCell(r, c, v) {
      const row = this.editor.div[r];
      const key = c === 1 ? 'n' : c === 2 ? 'min' : 'max';
      if (c === 1) {
        if (row.type !== 'MANUAL') {
          const ok = /^\s*[+-]?\d+\s*$/.test(v) && Number(v) > 1 && Number(v) <= 100;
          if (!ok) return { error: 'TWOTOHUNDRED' };
        }
      } else {
        if (row.ro) return { error: 'READONLY' };
        // Windows は範囲の検査と min・max の大小の検査を続けて行い、両方だめならメッセージを 2 つ出す
        const p = netTryParse(v), label = this.divLabels()[r], errs = [];
        const x = p.ok ? p.value : 0;
        if (label === 'theta') { if (!p.ok || x < 0 || x > (this.angle === 'degree' ? 180 : UNIT_PI)) errs.push({ error: 'POSREALINPUT', args: [this.angle === 'degree' ? '0 - 180' : '0 - Pi'] }); }
        else if (label === 'phi') { if (!p.ok || x < 0 || x > (this.angle === 'degree' ? 360 : 2 * UNIT_PI)) errs.push({ error: 'POSREALINPUT', args: [this.angle === 'degree' ? '0 - 360' : '0 - 2Pi'] }); }
        else if (!p.ok || x < 0 || x > 1) errs.push({ error: 'POSREALINPUT', args: ['0 - 1'] });
        const other = netTryParse(c === 2 ? row.max : row.min);
        if (c === 2 && other.ok && x >= other.value) errs.push({ error: 'LESSPOSREALINPUT', args: [fmtNet(other.value)] });
        if (c === 3 && other.ok && x <= other.value) errs.push({ error: 'MOREPOSREALINPUT', args: [fmtNet(other.value)] });
        if (errs.length) return { ...errs[0], all: errs };
      }
      row[key] = v; this.dirty = true; return null;
    }
    /** MANUAL の小さいダイアログ（Form_追加_MANUAL）の結果を数の欄に入れる */
    setDivManual(r, value) { this.editor.div[r].n = value; this.dirty = true; }
    setInvKind(k) { this._radioInv(k); this.dirty = true; }
    /** 線源強度の表（dgvInventory_CellValidating）。核種名は空でなく英字で始まる。数の欄は正の実数で、DataGridView が double に直す */
    setInv(r, c, v) {
      const row = this.editor.inv[r];
      if (cellStr(row[c]) === v) return null;
      if (this.editor.invKind === 'nuclide' && c === 0) {
        if (!v.trim()) return { error: 'RINAMEINPUT' };
        if (!/^\p{L}/u.test(v)) return { error: 'FIRSTALPHABET' };
        row[c] = v; this.dirty = true; return null;
      }
      const p = netTryParse(v);
      if (!p.ok || p.value <= 0) return { error: 'POSREALINPUT', args: [v] };
      row[c] = fmtNet(p.value); this.dirty = true; return null;
    }
    /** 表の最後の空の行に入れ始めたとき（DefaultValuesNeeded：核種は既定の核種と 0、エネルギは 0） */
    addInvRow() { this.editor.inv.push(this.editor.invKind === 'nuclide' ? [this.defaultNuclide, '0'] : ['0', '0', '0']); this.dirty = true; return this.editor.inv.length - 1; }
    /** Insert キー：選んだ行の前に行を入れる */
    insertInvRow(i) { this.editor.inv.splice(i, 0, this.editor.invKind === 'nuclide' ? [this.defaultNuclide, '0'] : ['0', '0', '0']); this.dirty = true; }
    /** 行の削除（UserDeletingRow：最後の 1 行は消せない） */
    removeInvRow(i) { if (this.editor.inv.length <= 1) return { error: 'NOMOREROWDELETE' }; this.editor.inv.splice(i, 1); this.dirty = true; return null; }
    /** BackSpace キー：核種名の欄は既定の核種、それ以外は 0 */
    clearInv(r, c) { this.editor.inv[r][c] = this.editor.invKind === 'nuclide' && c === 0 ? this.defaultNuclide : '0'; this.dirty = true; }
    /** 核種リストから選んだ名前を今の行に入れる */
    pickNuclide(r, name) { this.editor.inv[r][0] = name; this.dirty = true; }
    /** cutoff_rate（txtCutoff_Validating：正の実数） */
    setCutoff(v) { const p = netTryParse(v); if (!p.ok || p.value <= 0) return { error: 'POSREALINPUT', args: [v] }; this.editor.cutoff = v; this.dirty = true; return null; }
    addPosition() { this.editor.positions.push(['0', '0', '0']); this.dirty = true; return this.editor.positions.length - 1; }
    setPosition(r, c, v) { if (!netTryParse(v).ok) return { error: 'REALINPUT', args: [v] }; this.editor.positions[r][c] = v; this.dirty = true; return null; }
    removePosition(r) { this.editor.positions.splice(r, 1); this.dirty = true; }
    addBounding(v) { this.editor.bounding.push(v); this.dirty = true; return this.editor.bounding.length - 1; }
    setBounding(r, v) { this.editor.bounding[r] = v; this.dirty = true; }
    removeBounding(r) { this.editor.bounding.splice(r, 1); this.dirty = true; }

    /** 「更新」（btnRegister_Click） */
    register() {
      if (this.cur < 0) return null;
      this.dirty = false;
      const index = this.cur, s = this.find(index);
      if (!s) return 'NOTEXISTNODE';
      const ed = this.editor;
      const join = (row) => row.map(cellStr).join(' ');
      if (ed.type === 'POINT') {
        s.type = 'POINT'; s.name = ed.name; s.position = join(ed.geo[0]); s.geometry = null; s.division = null;
      } else {
        s.type = ed.type; s.name = ed.name; s.position = null;
        const g = { vertex: null, edge_1: null, edge_2: null, edge_3: null, min: null, max: null, center: null, radius: null, bottom_center: null, height_vector: null, transform: null };
        if (ed.type === 'BOX') { g.vertex = join(ed.geo[0]); g.edge_1 = join(ed.geo[1]); g.edge_2 = join(ed.geo[2]); g.edge_3 = join(ed.geo[3]); }
        else if (ed.type === 'RPP') { g.min = join(ed.geo[0]); g.max = join(ed.geo[1]); }
        else if (ed.type === 'SPH') { g.center = join(ed.geo[0]); g.radius = cellStr(ed.geo[1][0]); }
        else { g.bottom_center = join(ed.geo[0]); g.height_vector = join(ed.geo[1]); g.radius = cellStr(ed.geo[2][0]); }
        if (ed.transform) g.transform = ed.transform;
        s.geometry = g;
        s.division = {}; for (const k of EDGE_KEYS) s.division[k] = newEdge();
        DIV_ROWS[ed.type].forEach((n, r) => {
          const row = ed.div[r], e = s.division[n];
          e.type = row.type;
          if (row.type === 'MANUAL') {
            const v = cellStr(row.n).split(',');
            e.end_point = v[0];
            if (v.length > 1) e.weight = v[1].trim();
          } else {
            e.number = cellStr(row.n);
            e.min = row.min === null || row.min === undefined ? null : cellStr(row.min);
            e.max = row.max === null || row.max === undefined ? null : cellStr(row.max);
          }
        });
      }
      s.inventory = [];
      s.cutoff = netTryParse(ed.cutoff).value;
      if (ed.invKind === 'nuclide') { s.invType = 'NUCLIDE'; s.inventory = ed.inv.map(r => ({ nuclide: cellStr(r[0]), energy: null, spectrum: null, radioactivity: cellStr(r[1]) })); }
      else { s.invType = 'ENERGY'; s.inventory = ed.inv.map(r => ({ nuclide: null, energy: cellStr(r[0]), spectrum: cellStr(r[1]), radioactivity: cellStr(r[2]) })); }
      if (!s.pathTrace) s.pathTrace = { position: null, bounding_box: null };
      // 透過線の確認の表が空なら消す（Windows は表を空にしても前の値が残っていた。2026-11-22 に Windows も直した）
      s.pathTrace.position = ed.positions.length ? ed.positions.map(r => r.map(cellStr).join(' ')) : null;
      s.pathTrace.bounding_box = ed.bounding.length ? ed.bounding.map(cellStr) : null;
      this.select(Math.min(index, this.list.length - 1));
      return null;
    }
    /** 「追加」（btnNew_Click）。新しい線源は点・既定の核種 1 */
    add() {
      let maxs = 0;
      for (const s of this.list) { const m = /\b[Ss](\d+)\b/.exec(s.name ?? ''); if (m) { const n = parseInt(m[1], 10); if (n > maxs) maxs = n; } }
      this.list.push({ type: 'POINT', name: 's' + (maxs + 1), position: '0 0 0', geometry: null, division: null,
        inventory: [{ nuclide: this.defaultNuclide, energy: null, spectrum: null, radioactivity: '1' }], cutoff: 1e-4, pathTrace: null, invType: 'NUCLIDE' });
      this.dirty = false;
      this.select(this.list.length - 1);
    }
    /** 「削除」（btnRemove_Click） */
    remove() {
      if (this.cur < 0 || !this.list.length) return;
      const i = this.list.indexOf(this.find(this.cur));
      if (i >= 0) this.list.splice(i, 1);
      if (this.list.length) this.select(Math.min(this.cur, this.list.length - 1)); else this.cur = -1;
      this.dirty = false;
    }
    get yaml() {
      const key = this.strengthKey;
      let yaml = '';
      for (const s of this.list) {
        const inv = srcInventory(s, key), pos = ptPositions(s), box = ptBoxes(s), pt = srcPathTrace(pos, box), cut = fmtNet(s.cutoff);
        const tail = () => {
          let t = `    inventory: ${NL}` + inv.map(i => `      - ${i}${NL}`).join('') + `    cutoff_rate: ${cut}${NL}`;
          if (pos.length || box.length) {
            t += `    path_trace: ${NL}`;
            if (pos.length) t += `      position: ${NL}` + pos.map(p => `        - ${p}${NL}`).join('');
            if (box.length) t += `      bounding_box: ${NL}` + box.map(b => `        - ${b}${NL}`).join('');
          }
          return t;
        };
        const flowEnd = pt ? `, path_trace: ${pt}}${NL}` : ` }${NL}`;
        if (s.type === 'POINT') {
          if (!this.block) yaml += `  - { type: ${s.type}, name: ${cellStr(s.name)}, position: ${cellStr(s.position)}, inventory: [${inv.join(', ')}], cutoff_rate: ${cut}` + flowEnd;
          else yaml += `  - type: ${s.type}${NL}    name: ${cellStr(s.name)}${NL}    position: ${cellStr(s.position)}${NL}` + tail();
        } else {
          const geos = srcGeometry(s, this.block), divs = srcDivision(s, this.block);
          if (!this.block) yaml += `  - { type: ${s.type}, name: ${cellStr(s.name)}, geometry: {${geos.join(', ')}}, division: {${divs.join(', ')}}, inventory: [${inv.join(', ')}], cutoff_rate: ${cut}` + flowEnd;
          else yaml += `  - type: ${s.type}${NL}    name: ${cellStr(s.name)}${NL}    geometry:${NL}` + geos.join('') + `    division:${NL}` + divs.join('') + tail();
        }
      }
      return yaml;
    }
    /** 一覧の表示（addSourceToList） */
    row(s) {
      const inv = '{' + srcInventory(s, this.strengthKey).join(', ') + '}', pt = srcPathTrace(ptPositions(s), ptBoxes(s));
      if (s.type === 'POINT') return [s.type, cellStr(s.name), cellStr(s.position), '', inv, fmtNet(s.cutoff), pt];
      return [s.type, cellStr(s.name), '{' + srcGeometry(s, false).join(', ') + '}', '{' + srcDivision(s, false).join(', ') + '}', inv, fmtNet(s.cutoff), pt];
    }
    /** 線源強度の読み込み（btnImport_Click）。文字は CSV（',' かタブ区切り）。{ error } か { count } */
    importInventory(text) {
      const ed = this.editor;
      let isHeader = true, first = false, ir = -1, inn = -1, is = -1, ie = -1, count = 0;
      for (const line of String(text).split(/\r\n|\r|\n/)) {
        // Windows は空白だけの行で例外になっていた（2026-11-22 に Windows も直した）
        if (!line.trim() || line.trim()[0] === '#') continue;
        if (isHeader) {
          const h = line.split(/[,\t]/);
          ir = this.neutron ? h.findIndex(n => n.trim().toLowerCase() === 'emission') : h.findIndex(n => n === 'Radioactive intensity [Bq]' || n === 'radioactivity');
          inn = h.findIndex(n => n === 'Parent & unstable daughters' || n === 'nuclide');
          is = h.findIndex(n => n === 'spectrum');
          ie = h.findIndex(n => n === 'energy');
          if (ir < 0) return { error: this.neutron ? 'IMPORTHEADERNEUTRON' : 'INVALIDHEADERRA' };
          isHeader = false; continue;
        }
        const v = line.split(/[,\t]/);
        if (ed.invKind === 'nuclide') {
          if (v.length > ir && v.length > inn) {
            if (!first) { first = true; ed.inv = []; }
            const name = (inn < 0 ? this.defaultNuclide : v[inn]).replace(/[-_\n\r]/g, '');
            ed.inv.push([name, v[ir]]); count++;
          }
        } else if (v.length > ir && v.length > inn && v.length > is) {
          if (!first) { first = true; ed.inv = []; }
          ed.inv.push([ie < 0 ? '1' : v[ie], is < 0 ? '1' : v[is], v[ir]]); count++;
        }
      }
      if (first) this.dirty = true;
      return { count };
    }
    /** 線源強度の書き出し（btnExport_Click）。数は .NET の "E" 書式。行が無ければ null */
    exportInventory() {
      const ed = this.editor;
      if (!ed.inv.length) return null;
      let out = (ed.invKind === 'nuclide' ? 'nuclide,' : 'energy,spectrum,') + this.strengthKey + NL;
      for (const r of ed.inv) out += r.map(c => { const p = netTryParse(cellStr(c)); return p.ok ? fmtE(p.value) : cellStr(c); }).join(',') + NL;
      return out;
    }
  }

  // ---- MANUAL の分割（Form_追加_MANUAL）：end_point（0～1 の増える並び）と weight（各区間の重み） ----
  class ManualModel {
    /** values：数の欄の文字 "e1 e2 …[, w1 w2 …]" */
    constructor(values) {
      const parts = String(values ?? '').split(',');
      const ends = parts[0].trim().split(' ').filter(Boolean);
      this.rows = ends.map(e => ({ e, w: null }));
      this._refresh();
      this.weight = parts.length === 2;
      if (this.weight) {
        const ws = parts[1].trim().split(' ').filter(Boolean);
        for (let i = 0; i < ends.length - 1; i++) this.rows[i].w = ws[i] ?? null;
      }
    }
    /** RefreshRowsCells：最後の行を除いて weight が空なら "1.0"、最後の行の weight は空 */
    _refresh() {
      const n = this.rows.length;
      if (n + 1 <= 2) return;
      for (let i = 0; i < n - 1; i++) if (this.rows[i].w === null || this.rows[i].w === '') this.rows[i].w = '1.0';
      if (n) this.rows[n - 1].w = null;
    }
    setWeight(on) { this.weight = on; }
    /** end_point の欄（0～1、前の値より大きく次の値より小さい）。i が行の数なら最後に行を足す（新しい行に入れたとき） */
    setEnd(i, v) {
      // Windows は 3 つの検査を続けて行い、だめなものの数だけメッセージを出す
      const p = netTryParse(v), x = p.ok ? p.value : 0, errs = [];
      if (!p.ok || x < 0 || x > 1) errs.push({ error: 'ZEROTOONEREAL' });
      if (i > 0) {
        const prev = netTryParse(this.rows[i - 1].e);
        if (!prev.ok || x <= prev.value) errs.push(prev.value < 1 ? { error: 'MOREPOSREALINPUT', args: [fmtNet(prev.value)] } : { error: 'LESSPREVIOUS', args: ['1'] });
      }
      if (i < this.rows.length - 1) {
        const next = netTryParse(this.rows[i + 1].e);
        if (!next.ok || x >= next.value) errs.push({ error: 'LESSPOSREALINPUT', args: [fmtNet(next.value)] });
      }
      if (errs.length) return { ...errs[0], all: errs };
      if (i === this.rows.length) { this.rows.push({ e: v, w: null }); this._refresh(); } else this.rows[i].e = v;
      return null;
    }
    setW(i, v) { const p = netTryParse(v); if (!p.ok || p.value <= 0) return { error: 'MOREPOSREALINPUT', args: ['0'] }; this.rows[i].w = v; return null; }
    /** 行の挿入（toolStripLineInsertion）：前後の値の平均 */
    insertRow(i) {
      if (i >= this.rows.length) return;
      let ave = 0, at = i;
      const p = netTryParse(this.rows[i].e);
      if (p.ok) {
        let other;
        if (p.value === 0 || i === 0) { at = i + 1; other = this.rows[at] ? this.rows[at].e : null; } else other = this.rows[i - 1].e;
        const q = netTryParse(other);
        if (q.ok) ave = (p.value + q.value) / 2;
      }
      this.rows.splice(at, 0, { e: null, w: null });
      this._refresh();
      this.rows[at].e = fmtNet(ave);
      this.rows[at].w = at > 0 ? this.rows[at - 1].w : null;
    }
    removeRow(i) { if (this.rows.length + 1 <= 3) return { error: 'NOMOREROWDELETE' }; this.rows.splice(i, 1); this._refresh(); return null; }
    /** 重みの規格化（btnNormalize）：合計で割る */
    normalize() {
      const ws = [];
      for (let i = 0; i < this.rows.length - 1; i++) { const p = netTryParse(this.rows[i].w); if (p.ok) ws.push(p.value); }
      const total = ws.reduce((a, b) => a + b, 0);
      ws.forEach((w, i) => { this.rows[i].w = fmtNet(w / total); });
    }
    /** OK の検査（button_OK_Click）。だめなら { error, args } */
    check() {
      if (this.rows.length + 1 < 3) return { error: 'NUMENDPOINT' };
      if (this.rows.some(r => r.e === null || r.e === undefined)) return { error: 'NOTEMPTYCELL', args: ['end_point'] };
      if (this.weight) {
        for (let i = 0; i < this.rows.length - 1; i++) if (this.rows[i].w === null || this.rows[i].w === undefined) return { error: 'NOTEMPTYCELL', args: ['weight'] };
      } else for (let i = 0; i < this.rows.length - 1; i++) this.rows[i].w = null;
      return null;
    }
    /** 数の欄に入れる文字（popupManualForm）：end_point は重なりを除いて G4、weight も G4 */
    result() {
      const seen = [], ends = [], ws = [];
      for (const r of this.rows) {
        const p = netTryParse(r.e); if (p.ok && !seen.includes(p.value)) seen.push(p.value);
        const q = netTryParse(r.w); if (r.w !== null && r.w !== undefined && q.ok) ws.push(fmtG(q.value, 4));
      }
      if (this.rows.length > 0) for (const v of seen) ends.push(fmtG(v, 4));
      else { ends.push('0.0'); ends.push('1.0'); }
      return ends.join(' ') + (ws.length ? ', ' + ws.join(' ') : '');
    }
  }

  const api = { fmtG, fmtNet, fmtE, S_TYPES, DIV_TYPES, GEO_ROWS, DIV_ROWS, angleFromUnit, sourcesFromDoc, SourceModel, ManualModel, NL, netTryParse, findNode, abstractNode, addNode, deleteNode, nameCandidate,
    TransformModel, transformGrid, T_OPS, BodyModel, BODY_TYPES, ZoneModel, ATMOSPHERE, VOID,
    detectorsFromDoc, DetectorModel, detectorCellOk, buildupsFromDoc, BuildupModel,
    isNeutronDeck, readCorrection, writeCorrection, NeutronCorrectionModel };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PokerDialogs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
