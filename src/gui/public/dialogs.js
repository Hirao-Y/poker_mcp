// POKER Web GUI の入力ダイアログの画面（Windows の GUI の Form_追加_* に当たる）
//
// 中身（状態と YAML）は dialogs_model.js（Windows の C# の書き写し）。ここは表示と操作だけ。
// 表示名・説明・エラーの文は Windows の GUI の resx（英語・日本語）と同じ。
// 「入力に追加」で、Windows と同じく入力の節の終わり（節が無ければ入力の末尾に節ごと）に足す（dialogs_model の addNode）。
// app.js の関数（getText・inputWin・api・showList・LANG）を使う。
'use strict';
(function () {
  const D = window.PokerDialogs;
  const DOC_URL = 'https://pointkernel.com/docs/';

  const RES = {
    en: {
      ok: 'Add node to Update input', okBody: 'Add to input', cancel: 'Cancel', help: 'Help', block: 'Block style', name: 'Name :',
      accessWeb: 'Access to the external website?', realInput: 'Enter a real number: ‘{0}’', notItemList: 'No item in the list.',
      rotateLengthZero: 'The length of the axis of rotation is zero.', nonNegativeReal: 'Enter a non-negative real number.', noEmpty: 'No blanks allowed.', invalidName: "The name '{0}' cannot be used. Use only letters, digits, '_' and '-'.",
      parseError: 'zone: deseriarization error',
      // transform
      trTitle: 'Add transform node', trX: 'rotate around X-axis', trY: 'rotate around Y-axis', trZ: 'rotate around Z-axis', trAxis: 'rotation axis/angle',
      trMatrix: 'rotation matrix', trTranslate: 'translation only', trRpy: 'Z-Y-X Eiler angles (=roll, pitch, and yaw angles)', trZxz: 'Z-X-Z Euler angles',
      trXyz: 'X-Y-Z Euler angles', trAddOp: 'Add operation to node', trColOp: 'Operation', trColValue: 'Values',
      trDeleteHint: 'To delete an operation, select the row of the operation you want to delete and press the Delete key.',
      trUnitNote: 'Angle and length units follow the units specified in the unit node.\nRotation is clockwise, meaning that when you point your right thumb in the direction of the axis, the remaining four fingers bend in the positive direction.',
      ROTATIONANGLE: 'angle', ANGLE: 'angle', ROTATIONAXIS: 'axis', XANGLE: 'x / angle', FIRSTROW: 'row_1', SECROW: 'row_2', THIRDROW: 'row_3',
      FIRSTCOLUMN: 'col_1', SECCOLUMN: 'col_2', THIRDCOLUMN: 'col_3', MOVEAMOUNT: 'distance', XRADIUS: 'x / radius', SETOPERATION: 'set operation expression',
      // body
      bdTitle: 'Add body node', bdName: 'Name :', bdTransform: 'transform node (optional)', bdTransformHint: 'Enter the name defined in the transform node.',
      bdUnitNote: 'The units of dimensioning follow the units specified in the unit node.',
      gCuboid: 'cuboid', gWedge: 'wedge', gCylinder: 'cylinder', gCone: 'cone', gSphere: 'sphere', gTorus: 'torus', gComb: 'combinatorial',
      rBOX: 'BOX (any direction)', rRPP: 'RPP (parallel to axes)', rWED: 'WED (right-angled triangular prism)', rRCC: 'RCC', rREC: 'REC (elliptical prism)',
      rTRC: 'TRC (circular truncated cone)', rSPH: 'SPH', rELL: 'ELL (ellipsoid)', rTOR: 'TOR', rCMB: 'CMB',
      BOXDESC: 'BOX (rectangular body)\n vertex : one vertex of the body\n edge_1 : the first of three mutually orthogonal edges passing through the vertex \n edge_2 : also the second \n edge_3 : also the third',
      RPPDESC: "RPP (rectangle parallel to x,y,z axes) \n min: vertex with the smallest coordinates \n max: vertex with the largest coordinates on the diagonal of 'min'",
      WEDGEDESC: "WED (wedge, right-angled triangular column)\n vertex : vertex with 3 orthogonal edges \n width_vector : one of the 3 edges through the 'vertex' \n height_vector : also another edge\n depth_vector : also the remaining edge (column direction)",
      RCCDESC: 'RCC (regular cylinder)\n bottom_center : center point of cylinder bottom surface\n height_vector : vector from bottom surface center to top surface center\n radius : radius length of bottom surface',
      RECDESC: 'REC (elliptic column)\n bottom_center : center point of cylinder bottom surface\n height_vector : vector from bottom surface center to top surface center\n radius_vector_1 : one vector of elliptic principal axes of bottom surface\n radius_vector_2 : other vector of elliptic principal axes of bottom surface',
      TRCDESC: 'TRC (conical base, a regular cylinder with different radii on the bottom and top surfaces)\n  bottom_center: center point of the bottom surface\n  height_vector: vector from bottom surface center to top surface center\n  bottom_vector: radius length of circle on bottom surface\n  top_radius: radius of circle on top surface',
      SPHDESC: 'SPH (regular sphere) \n  center: coordinates of the center point of the sphere \n  radius: radius length of the sphere',
      ELLDESC: 'ELL (ellipsoid, a sphere squashed from three directions)\n  center : the center point of the ellipsoid\n  radius_vector_1: one vector of the main axes of the ellipsoid\n  radius_vector_2: another vector of the main axes of the ellipsoid\n  radius_vector_3: the remaining vector of the main axes of the ellipsoid',
      TORDESC: 'TOR (elliptical torus, donut shape)\n  center : coordinates of the center point of the torus \n  normal : vector perpendicular to the major circle of the torus \n  major_radius : radius length of the major circle\n  minor_radius_horizontal : radius length of the minor circle in the horizontal direction of the torus\n  minor_radius_ vertical: radius length of the vertical minor circle of the torus',
      CMBDESC: 'CMB (combinatorial geometry) The following symbols can be used in the set operation expression: \n  body names: defined in the body node \n  ‘+’, ‘-’, ‘&’,. \'( )\': union, difference, intersection, parentheses respectively. However, ‘&’ takes precedence over ‘+’ and ‘-’ in the order of operations.\n  Example (a, b, c, d are body names): a + (b & c - d)',
      // zone
      znTitle: 'Add zone node', znBody: 'body Name      :', znMaterial: 'Material name :', znDensity: 'Density            :', znAtmosphere: 'atmosphere',
      znVoid: 'void', znMatList: 'List of materials',
      znNote: "Body name: Specify the name of the body that occupies the zone. The body name is defined in the body node.\nMaterial name: Specify the material name of the zone.\nThe material name and density can also be selected from the list of materials.\nThe density unit follows the unit specified in the unit node.\n'atmosphere' is used to specify materials for the entire undefined area at once.\n'void' is used to specify a vacuum for the zone.",
      neutron: ' (neutron)',
    },
    ja: {
      ok: '入力に追加', okBody: '入力に追加', cancel: 'キャンセル', help: 'ヘルプ', block: 'ブロック形式', name: '名前：',
      accessWeb: '外部サイトにオンライン接続して良いですか？', realInput: "実数を指定してください：'{0}'", notItemList: 'リストに項目が有りません',
      rotateLengthZero: '回転軸の長さがゼロです', nonNegativeReal: '非負の実数を入力してください', noEmpty: '空白は許されません', invalidName: "名前 '{0}' は使えません。半角の英数字、_、- で書いてください",
      trTitle: '回転と平行移動の追加', trX: 'x軸周りの回転', trY: 'y軸周りの回転', trZ: 'z軸周りの回転', trAxis: '回転軸と角度', trMatrix: '回転行列',
      trTranslate: '平行移動のみ', trRpy: 'Z-Y-Xオイラー角(=ロール・ピッチ・ヨー角)', trZxz: 'Z-X-Zオイラー角', trXyz: 'X-Y-Zオイラー角',
      trAddOp: '操作を追加', trColOp: '操作', trColValue: '値',
      trDeleteHint: '操作を削除するには、削除したい操作の行を選択してDeleteキーを押してください。',
      trUnitNote: '角度や長さの単位は、unitノードで指定した単位に従います。\n回転は右ねじ方向、すなわち、軸の方向に右手の親指を向けたときに、残り4本の指が曲がる方向がプラスです。',
      ROTATIONANGLE: '回転角', ANGLE: '角度', ROTATIONAXIS: '回転軸', XANGLE: 'x / 角度', FIRSTROW: '第1行', SECROW: '第2行', THIRDROW: '第3行',
      FIRSTCOLUMN: '第1列', SECCOLUMN: '第2列', THIRDCOLUMN: '第3列', MOVEAMOUNT: '移動量', XRADIUS: 'x / 半径', SETOPERATION: '集合演算式',
      bdTitle: '立体の追加', bdName: '名前：', bdTransform: '回転と平行移動 (オプション) :', bdTransformHint: 'transformノードで定義した名前で指定します。',
      bdUnitNote: '寸法の単位は、unitノードで指定した単位に従います。',
      gCuboid: '直方体', gWedge: 'くさび型', gCylinder: '円柱', gCone: '円錐台', gSphere: '球', gTorus: 'トーラス', gComb: '組合せ',
      rBOX: 'BOX (任意方向)', rRPP: 'RPP (xyz軸に平行)', rWED: 'WED (直角三角柱)', rRCC: 'RCC', rREC: 'REC (楕円柱)', rTRC: 'TRC (円錐台)',
      rSPH: 'SPH', rELL: 'ELL (楕円体)', rTOR: 'TOR', rCMB: 'CMB',
      BOXDESC: 'BOX（直方体）\n   vertex    ：直方体の1つの頂点\n   edge_1  ：vertexを通る3つの互いに直交する辺の1つ目\n   edge_2  ：同じく2つ目\n   edge_3  ：同じく3つ目',
      RPPDESC: 'RPP（x、y、z軸に平行な直方体）\n   min：座標が最も小さい頂点\n   max：minの対角に有る座標が最も大きい頂点',
      WEDGEDESC: "WED（くさび型、直角三角柱）\n   vertex　　    ：3辺が直交する頂点\n   width_vector ：'vertex'を通る3辺のうちの1辺\n   height_vector：同じくもう1辺\n   depth_vector ：同じく残りの1辺（柱方向）",
      RCCDESC: 'RCC（正円柱）\n    bottom_center：円柱底面の中心点\n    height_vector ：底面中心から上面中心へのベクトル\n    radius           ：底面の半径長',
      RECDESC: 'REC（楕円柱）\n   bottom_center ：円柱底面の中心点\n   height_vector   ：底面中心から上面中心へのベクトル\n   radius_vector_1：底面の楕円主軸の一方のベクトル\n   radius_vector_2：底面の楕円主軸の他方のベクトル',
      TRCDESC: 'TRC（円錐台、底面と上面の半径が異なる正円柱）\n    bottom_center：底面の中心点\n    height_vector  ：底面中心から上面中心へのベクトル\n    bottom_vector：底面の円の半径長    \n    top_radius      ：上面の円の半径長',
      SPHDESC: 'SPH（正球）\n  center：球の中心点座標\n  radius：球の半径長',
      ELLDESC: 'ELL（楕円体、球を3方向からつぶした形）\n   center         ：楕円体の中心点\n   radius_vector_1：楕円体の主軸の1つのベクトル\n   radius_vector_2：楕円体の主軸のもう1つのベクトル\n   radius_vector_3：楕円体の主軸の残りのベクトル',
      TORDESC: 'TOR（楕円トーラス、ドーナツ形）\n   center        ：トーラスの中心点座標\n   normal       ：トーラスの輪の中心線が作る大円に垂直なベクトル\n   major_radius：トーラスの大円の半径長\n   minor_radius_horizontal：輪の断面の半径長（横方向）\n   minor_radius_vertical    ：輪の断面の半径長（縦方向）',
      CMBDESC: "CMB（組み合わせ立体）　集合演算式に以下の記号が使えます。\n  bodyノードで定義された名前 \n  ’+’, ’-’, ’&’, ’( )’：和集合、差集合、共通部分、括弧。ただし、演算順序は'+','-'よりも'&'が優先します。\n  例（a,b,c,dはbody名）：a + (b & c - d)",
      znTitle: '遮蔽体の追加', znBody: '立体の名前 ：', znMaterial: '材料名  　  ：', znDensity: '密度　　　：', znAtmosphere: 'atmosphere', znVoid: 'void',
      znMatList: '材料名リスト',
      znNote: '名前は、ゾーンを占めるbody名を指定してください。body名はbodyノードで定義したnameです。\n材料名は、ゾーンの材料名を指定してください。材料名は定義済みのものに限ります。材料名リストから選択することもできます。\n密度の単位は、unitノードで指定した単位に従います。\natmosphereは、未定義領域に一括で材料を指定する際に使用します。\nvoidは、ゾーンに真空を指定する際に使用します。',
    },
  };
  const R = (k) => (RES[LANG] && RES[LANG][k] !== undefined ? RES[LANG][k] : RES.en[k] !== undefined ? RES.en[k] : k);

  // ---- 小さな部品 ----
  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children) if (c !== null && c !== undefined) e.append(c);
    return e;
  }
  const note = (text) => el('div', { class: 'pdNote', text });
  /** 実数の欄：変えたときに .NET の double.TryParse と同じ検査をし、だめなら元に戻す（Windows の CellValidating） */
  function numberInput(value, onCommit, { numeric = true, check } = {}) {
    const inp = el('input', { value: value ?? '', size: 8 });
    let prev = value ?? '';
    inp.addEventListener('change', () => {
      const v = inp.value;
      if (numeric && !D.netTryParse(v).ok) { alert(R('realInput').replace('{0}', v)); inp.value = prev; inp.focus(); return; }
      if (check && !check(v)) { inp.value = prev; inp.focus(); return; }
      prev = v; onCommit(v);
    });
    return inp;
  }
  function openHelp(anchor) { if (confirm(R('accessWeb'))) window.open(DOC_URL + anchor, '_blank', 'noopener'); }

  /** ダイアログの枠：見出し・中身・YAML の見本（読むだけ）・ボタン。ok() が true を返したら閉じる */
  function frame(title, body, { okLabel = R('ok'), ok, helpAnchor, preview = true }) {
    const yamlBox = el('textarea', { class: 'pdYaml', readonly: true, rows: 6, spellcheck: 'false' });
    const dlg = el('dialog', { class: 'pdlg' },
      el('h3', { text: title }), body, preview ? yamlBox : null,
      el('menu', {},
        helpAnchor ? el('button', { type: 'button', class: 'left', text: R('help'), onclick: () => openHelp(helpAnchor) }) : el('span', { class: 'left' }),
        el('button', { type: 'button', text: okLabel, onclick: async () => { if (await ok()) dlg.close(); } }),
        el('button', { type: 'button', text: R('cancel'), onclick: () => dlg.close() })));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    return { dlg, setYaml: (y) => { yamlBox.value = y.replace(/\r\n/g, '\n'); } };
  }

  /** 入力の節 node に YAML を足す（Form_MainWindow.AddNode） */
  function addToInput(node, yamlText) {
    const w = inputWin();
    const { row, text } = D.addNode(node, yamlText, w.editor.getValue());
    w.insertText(row, text.replace(/\r\n/g, '\n'));
    w.editor.focus();
  }

  // ===================================================================================
  // transform
  // ===================================================================================
  const T_KINDS = [['x', 'trX'], ['y', 'trY'], ['z', 'trZ'], ['axis', 'trAxis'], ['matrix', 'trMatrix'], ['translate', 'trTranslate'], ['rpy', 'trRpy'], ['zxz', 'trZxz'], ['xyz', 'trXyz']];
  const T_HEAD = {
    x: [['ROTATIONANGLE'], ['ANGLE', '', '']], y: [['ROTATIONANGLE'], ['ANGLE', '', '']], z: [['ROTATIONANGLE'], ['ANGLE', '', '']],
    axis: [['ROTATIONAXIS', 'ROTATIONANGLE'], ['XANGLE', 'y', 'z']],
    matrix: [['FIRSTROW', 'SECROW', 'THIRDROW'], ['FIRSTCOLUMN', 'SECCOLUMN', 'THIRDCOLUMN']],
    translate: [['MOVEAMOUNT'], ['x', 'y', 'z']], rpy: [['ROTATIONANGLE'], ['roll', 'pitch', 'yaw']],
    zxz: [['ROTATIONANGLE'], ['z', 'x', 'z']], xyz: [['ROTATIONANGLE'], ['z', 'y', 'x']],
  };
  const hd = (k) => (/^[A-Z]+$/.test(k) ? R(k) : k);
  function openTransform() {
    const m = new D.TransformModel(D.nameCandidate('tr', getText()));
    const grid = el('table', { class: 'pdGrid' });
    const ops = el('table', { class: 'pdList', tabindex: 0 });
    let selected = -1;
    const nameInp = el('input', { value: m.name, size: 20, oninput: () => { m.name = nameInp.value; refresh(); } });
    const renderGrid = () => {
      grid.innerHTML = '';
      const [rows, cols] = T_HEAD[m.kind];
      grid.append(el('tr', {}, el('th'), ...cols.map(c => el('th', { text: hd(c) }))));
      m.grid.forEach((row, r) => grid.append(el('tr', {}, el('th', { text: hd(rows[r]) }),
        ...row.map((v, c) => el('td', {}, v === null ? el('input', { disabled: true, size: 8, class: 'off' }) : numberInput(v, (x) => { m.grid[r][c] = x; }))))));
    };
    const renderOps = () => {
      ops.innerHTML = '';
      ops.append(el('tr', {}, el('th', { text: R('trColOp') }), el('th', { text: R('trColValue') })));
      m.ops.forEach((o, i) => ops.append(el('tr', { class: i === selected ? 'sel' : '', onclick: () => { selected = i; renderOps(); ops.focus(); } },
        el('td', { text: o.name }), el('td', { text: o.value }))));
    };
    ops.addEventListener('keydown', (e) => { if (e.key === 'Delete' && selected >= 0) { m.removeOperation(selected); selected = Math.min(selected, m.ops.length - 1); renderOps(); refresh(); } });
    const radios = el('div', { class: 'pdRadios' }, ...T_KINDS.map(([k, label]) => el('label', {},
      el('input', { type: 'radio', name: 'trKind', checked: k === m.kind, onchange: () => { m.setKind(k); renderGrid(); } }), ' ' + R(label))));
    // ブロック形式：Windows の 3 状態のチェックボックス（Unchecked → Checked → Indeterminate → Unchecked）
    const blk = el('input', { type: 'checkbox' });
    blk.addEventListener('click', () => {
      m.block = m.block === 'Unchecked' ? 'Checked' : m.block === 'Checked' ? 'Indeterminate' : 'Unchecked';
      blk.checked = m.block !== 'Unchecked'; blk.indeterminate = m.block === 'Indeterminate'; refresh();
    });
    const body = el('div', { class: 'pdBody' },
      el('label', {}, R('name') + ' ', nameInp),
      el('div', { class: 'pdRow' }, radios, el('div', {}, grid,
        el('button', { type: 'button', text: R('trAddOp'), onclick: () => {
          const r = m.addOperation();
          if (r.error) { alert(R('rotateLengthZero')); return; }
          selected = -1; renderOps(); refresh();
        } }))),
      ops, note(R('trDeleteHint')), note(R('trUnitNote')),
      el('label', {}, blk, ' ' + R('block')));
    const f = frame(R('trTitle'), body, {
      helpAnchor: 'guiinput/#0-toc-title',
      ok: () => { const ce = m.closeError(); if (ce) { alert(ce === 'INVALIDNAME' ? R('invalidName').replace('{0}', m.name) : R('notItemList')); return false; } addToInput('transform', m.yaml); return true; },
    });
    const refresh = () => f.setYaml(m.yaml);
    renderGrid(); renderOps(); refresh();
    f.dlg.showModal(); nameInp.focus();
  }

  // ===================================================================================
  // body
  // ===================================================================================
  const B_GROUPS = [['gCuboid', ['BOX', 'RPP']], ['gWedge', ['WED']], ['gCylinder', ['RCC', 'REC']], ['gCone', ['TRC']], ['gSphere', ['SPH', 'ELL']], ['gTorus', ['TOR']], ['gComb', ['CMB']]];
  function openBody() {
    const m = new D.BodyModel(D.nameCandidate('b', getText()));
    const grid = el('table', { class: 'pdGrid' });
    const help = el('textarea', { class: 'pdHelp', readonly: true, rows: 6 });
    const renderGrid = () => {
      const t = D.BODY_TYPES[m.type];
      grid.innerHTML = '';
      const cols = t.cmb ? ['SETOPERATION'] : t.radius ? ['XRADIUS', 'y', 'z'] : ['x', 'y', 'z'];
      grid.append(el('tr', {}, el('th'), ...cols.map(c => el('th', { text: hd(c) }))));
      m.grid.forEach((row, r) => grid.append(el('tr', {}, el('th', { text: row.header }),
        ...(t.cmb ? [row.values[0]] : row.values).map((v, c) => el('td', {}, v === null ? el('input', { disabled: true, size: 8, class: 'off' })
          : (() => { const inp = numberInput(v, (x) => { m.grid[r].values[c] = x; refresh(); }, { numeric: !t.cmb }); if (t.cmb) inp.size = 40; return inp; })())))));
      help.value = R(t.help);
    };
    const nameInp = el('input', { value: m.name, size: 20, oninput: () => { m.name = nameInp.value; refresh(); } });
    const trInp = el('input', { size: 20, oninput: () => { m.transform = trInp.value; refresh(); } });
    const radios = el('div', { class: 'pdRadios' }, ...B_GROUPS.map(([g, types]) => el('div', {}, el('span', { class: 'pdGroup', text: R(g) }),
      ...types.map(ty => el('label', {}, el('input', { type: 'radio', name: 'bdType', checked: ty === m.type, onchange: () => { m.setType(ty); renderGrid(); refresh(); } }), ' ' + R('r' + ty))))));
    const body = el('div', { class: 'pdBody' },
      el('label', {}, R('bdName') + ' ', nameInp),
      el('div', { class: 'pdRow' }, radios, el('div', {}, grid, note(R('bdUnitNote')), help)),
      el('label', {}, R('bdTransform') + ' ', trInp), note(R('bdTransformHint')),
      el('label', {}, el('input', { type: 'checkbox', onchange: (e) => { m.block = e.target.checked; refresh(); } }), ' ' + R('block')));
    const f = frame(R('bdTitle'), body, { okLabel: R('okBody'), helpAnchor: 'guiinput/#1-toc-title', ok: () => { if (m.closeError()) { alert(R('invalidName').replace('{0}', m.name)); return false; } addToInput('body', m.yaml); return true; } });
    const refresh = () => f.setYaml(m.yaml);
    renderGrid(); refresh();
    f.dlg.showModal(); nameInp.focus();
  }

  // ===================================================================================
  // zone
  // ===================================================================================
  async function openZone() {
    const text = getText();
    const neutron = D.isNeutronDeck(text);
    // body の名前（Windows は body 節を YamlDotNet で読む）。body 節が無い・読めないときも ATMOSPHERE は選べるようにする
    let names = [];
    const bodyNode = D.abstractNode('body', text);
    if (bodyNode) {
      try {
        const r = await api('POST', '/api/parse', { text: bodyNode });
        if (r.error) alert(`${R('parseError')}\n${r.error}`);
        else if (r.doc && Array.isArray(r.doc.body)) names = r.doc.body.map(b => (b && b.name !== undefined && b.name !== null ? String(b.name) : ''));
      } catch (e) { alert(e.message); }
    }
    const m = new D.ZoneModel(names);
    const sel = el('select', { onchange: () => { m.bodyName = sel.value; refresh(); } }, ...m.items.map(n => el('option', { value: n, text: n })));
    sel.value = m.bodyName;
    const matInp = el('input', { value: m.material, size: 24, oninput: () => { m.material = matInp.value; refresh(); } });
    const denInp = numberInput(m.density, (v) => { m.density = v; refresh(); }, { numeric: false, check: (v) => { if (!D.ZoneModel.densityOk(v)) { alert(R('nonNegativeReal')); return false; } return true; } });
    denInp.addEventListener('input', () => { m.density = denInp.value; refresh(); });
    const listBtn = el('button', { type: 'button', text: R('znMatList'), onclick: () => showList('mat', (row) => {
      m.material = row[0]; matInp.value = row[0];
      if (D.ZoneModel.densityOk(row[1])) { m.density = row[1]; denInp.value = row[1]; } else alert(R('nonNegativeReal'));
      refresh();
    }) });
    const atm = el('input', { type: 'checkbox', onchange: () => { m.setAtmosphere(atm.checked); sel.disabled = atm.checked; sel.value = m.bodyName; refresh(); } });
    const voidCb = el('input', { type: 'checkbox', onchange: () => {
      m.setVoid(voidCb.checked); matInp.value = m.material; denInp.value = m.density;
      matInp.disabled = denInp.disabled = listBtn.disabled = voidCb.checked; refresh();
    } });
    const body = el('div', { class: 'pdBody' },
      el('div', { class: 'pdForm' },
        el('span', { text: R('znBody') }), el('span', {}, sel, ' ', el('label', {}, atm, ' ' + R('znAtmosphere'))),
        el('span', { text: R('znMaterial') }), el('span', {}, matInp, ' ', listBtn, ' ', el('label', {}, voidCb, ' ' + R('znVoid'))),
        el('span', { text: R('znDensity') }), el('span', {}, denInp)),
      note(R('znNote')),
      el('label', {}, el('input', { type: 'checkbox', onchange: (e) => { m.block = e.target.checked; refresh(); } }), ' ' + R('block')));
    const f = frame(R('znTitle') + (neutron ? R('neutron') : ''), body, {
      helpAnchor: 'guiinput/#2-toc-title',
      ok: () => {
        const err = m.closeError();
        if (err) { alert(`${err}: ${R('noEmpty')}`); return false; }
        addToInput('zone', m.yaml); return true;
      },
    });
    const refresh = () => f.setYaml(m.yaml);
    refresh();
    f.dlg.showModal(); sel.focus();
  }

  // ===================================================================================
  // 段階 3b：detector・buildup_factor・neutron_correction
  //   Windows と同じく、一覧の全部をダイアログで編集し、「入力を更新」で入力の節を消してから
  //   ダイアログの YAML を節として足し直す（Form_MainWindow：DeleteNode → SetText → AddNode）。
  // ===================================================================================
  Object.assign(RES.en, {
    yes: 'Yes', no: 'No', updateInput: 'Update Input', btnAdd: 'Add', btnUpdate: 'Update', btnDelete: 'Delete',
    updateValue: 'Value has been changed.\nUpdate it?', updateRow: 'The value of the current row has been changed.  Update it?',
    notExistInList: "Target data does not exist in the list  : '{0}'", existSameNode: 'A node with the same material name has already been defined.',
    noDuplicate: 'The same name is already defined.', gridNumber: 'Enter an integer from 2 to 1000 (the number of points including both ends).',
    dupTitle: 'Material name duplication error',
    dtTitle: 'Define detector node', dtPoint: 'point', dt1: '1-dim line', dt2: '2-dim plane', dt3: '3-dim space', dtShow: 'show_path_trace',
    dtTransform: 'transform node (optional) :', dtList: 'List of predefined detectors', dtColName: 'name', dtColOrigin: 'origin', dtColGrid: 'grid',
    dtColTransform: 'transform', dtColShow: 'show_path_trace', dtDiv: '# points',
    dtNote: "The detector, i.e., the location where the dose is calculated, can be specified as a point, a one-dimensional line, a two-dimensional plane, or a three-dimensional spatial grid.\nIf 'show_path_trace' is unchecked, the verification results showing that there are no undefined areas or overlapping areas on the penetrating line connecting the virtual source point defined in the source node and the grid point defined in the detector node will not be output.",
    buTitle: 'Define buildup factor node', buLayers: '# of layers', buOne: 'one', buTwo: 'two', buThree: 'three', buMaterial: 'Material name of layer(s)',
    buEquiv: 'Equivalent (option) :', buCorr: 'Correction : ', buFinite: 'finite_medium', buSlant: 'slant_penetration', buList: 'List of predefined buildup factors',
    buColLayers: '# of layers', buColMaterial: 'material(s)', buColEquiv: 'equivalent', buColFinite: 'finite_medium', buColSlant: 'slant_penetration', buMoveUp: '⇡ moveup',
    buNote: 'Buildup factors can be specified for a single layer as well as for certain two- or three-layer materials (note that only single layer is available at this time). \nMultiple candidates for buildup materials can be registered in the list of predefined buildup factors, however, only the material placed at the top of the list among those present on each penetration line will be selected.  Therefore, a multilayer factor should be listed before the single-layer. \nFor certain materials, the finite_medium and slant_penetration options allow dose correction for finite media and slant penetration, respectively.',
    ncButton: 'Neutron corr.', ncTitle: 'Neutron correction (neutron_correction)',
    ncHelp: 'Finite-medium correction of the neutron dose. The buildup tables are made for an infinite medium, so without the correction the dose is overestimated. Paths that enter one shield (concrete, iron, lead or soil) once are corrected. The secondary gamma is not corrected.',
    ncG: 'Geometry correction G (use_geometry_correction): the source is outside the shield',
    ncF: 'Finite-medium correction F (use_finite_medium_correction): detectors outside the shield.\nAssumes nothing outside the system (open air). Only together with G',
    ncRoom: 'For a system inside a room (floor, walls or ceiling in the input), uncheck F (the neutrons returned from them would be underestimated).',
    ncWritten: 'Showing neutron_correction in the input.', ncNone: 'The input has no neutron_correction (default: G and F on). Updating writes both keys explicitly.',
  });
  Object.assign(RES.ja, {
    yes: 'はい', no: 'いいえ', updateInput: '入力を更新', btnAdd: '追加', btnUpdate: '更新', btnDelete: '削除',
    updateValue: '値が変更されています。\n更新しますか？', updateRow: '現在の行の値が変更されています。\n更新しますか？',
    notExistInList: '対象となるデータがリストに存在しません : {0}', existSameNode: '同じ材料名のノードが既に定義されています',
    noDuplicate: '同じ名前が既に定義されています', gridNumber: '2 以上 1000 以下の整数を指定してください（両端を含む点の数）',
    dtTitle: '検出器の追加', dtPoint: '点', dt1: '1次元 (線)', dt2: '2次元 (面)', dt3: '3次元', dtTransform: '回転と平行移動 (オプション)：',
    dtList: '定義済み検出器リスト', dtColName: '名前', dtColOrigin: '原点', dtColGrid: 'グリッド', dtColTransform: '回転と移動', dtDiv: '点の数',
    dtNote: '検出器（線量を計算する位置）は、点の他、1次元、2次元、3次元のグリッドを指定することができます。\nshow_path_traceのチェックを外すと、sourceノードで定義した仮想線源点と評価点を結ぶ透過線上に未定義領域・重複領域が無いことの検証結果は出力されません。',
    buTitle: 'ビルドアップ材料の追加', buLayers: '層数', buOne: '単層', buTwo: '2重層', buThree: '3重層', buMaterial: '各層の材料名', buEquiv: '等価材料名 (オプション) :',
    buCorr: '補正 : ', buList: '定義済みビルドアップ係数リスト', buColLayers: '層数', buColMaterial: '各層の材料名', buColEquiv: '等価材料名', buMoveUp: '↑ 上に移動',
    buNote: 'ビルドアップ係数は単層の他、特定の2重層または3重層の多重層材料を指定できます（現状は単層しか使えませんので注意）。\n定義済みビルドアップ係数リストには複数のビルドアップ材料を指定できますが、使用されるのは各透過線に対してその透過線上に在る材料のうち、リストの一番上に記載された材料だけです。よって多重層材料を指定する場合は単層材料よりも前に記載する必要があります。\nまた特定の材料に対して、finite_mediumで有限媒質の、slant_penetrationでスラブ斜め透過の線量補正を行えます。',
    ncButton: '中性子の補正', ncTitle: '中性子の補正（neutron_correction）',
    ncHelp: '中性子の線量の有限媒質補正です。ビルドアップ係数の表は無限媒質で作られているため、表のままでは線量を大きめに見積もります。1 種類の遮蔽体（コンクリート・鉄・鉛・土壌）に 1 回だけ入る経路の線量を割り戻します。2 次γ線は補正しません。',
    ncG: '体系補正 G（use_geometry_correction）：線源が遮蔽体の外にあるとき',
    ncF: '有限媒質補正 F（use_finite_medium_correction）：遮蔽体の外の検出点。\n体系の外に何もない（野外）前提。G と一緒のときだけ使えます',
    ncRoom: '床・壁・天井を書いた部屋の中では F を外してください（戻りの分を過小評価するため）。',
    ncWritten: '入力の neutron_correction を表示しています。', ncNone: '入力に neutron_correction はありません（既定: G・F とも有効）。更新すると両方を明示して書きます。',
  });

  /** はい・いいえ・キャンセルの問い（MessageBoxButtons.YesNoCancel）。'yes' | 'no' | 'cancel' */
  function ask3(message) {
    return new Promise((resolve) => {
      let answer = 'cancel';
      const b = (label, v) => el('button', { type: 'button', text: label, onclick: () => { answer = v; dlg.close(); } });
      const dlg = el('dialog', { class: 'pdlg pdAsk' }, el('div', { class: 'pdNote', text: message }),
        el('menu', {}, b(R('yes'), 'yes'), b(R('no'), 'no'), b(R('cancel'), 'cancel')));
      dlg.addEventListener('close', () => { dlg.remove(); resolve(answer); });
      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }
  /** 入力の節を読む（Windows：AbstractNode で節を切り出して YamlDotNet で読む。値は文字のまま）。読めなければ null */
  async function readNode(node) {
    const part = D.abstractNode(node, getText());
    if (!part) return null;
    const r = await api('POST', '/api/parse', { text: part, scalars: 'text' });
    if (r.error) { alert(`${node}: deseriarization error\n${r.error}`); return null; }
    return r.doc;
  }
  /** 入力の節を、ダイアログで作った YAML に入れ替える（DeleteNode → SetText → AddNode） */
  function replaceNode(node, yamlText) {
    const w = inputWin();
    w.setText(D.deleteNode(node, w.editor.getValue()));
    addToInput(node, yamlText);
  }
  /** 一覧の表（行を押すと選ぶ） */
  function listTable(cols, onPick) {
    const tbl = el('table', { class: 'pdList' });
    return {
      tbl,
      render(rows, cur) {
        tbl.innerHTML = '';
        tbl.append(el('tr', {}, ...cols.map(c => el('th', { text: c }))));
        rows.forEach((r, i) => tbl.append(el('tr', { class: i === cur ? 'sel' : '', onclick: () => onPick(i) }, ...r.map(c => el('td', { text: c })))));
      },
    };
  }

  // ---- detector（Form_追加_検出器） ----
  async function openDetector() {
    const r = D.detectorsFromDoc(await readNode('detector'));
    if (r.error) alert(`detector: deseriarization error\n${r.error}`);
    const m = new D.DetectorModel(r.list);
    const KINDS = ['dtPoint', 'dt1', 'dt2', 'dt3'];
    const grid = el('table', { class: 'pdGrid' });
    const nameInp = el('input', { size: 20 });
    const trInp = el('input', { size: 20, oninput: () => { m.setTransform(trInp.value); refresh(); } });
    const showCb = el('input', { type: 'checkbox', onchange: () => { m.setShow(showCb.checked); refresh(); } });
    const radios = KINDS.map((k, i) => el('input', { type: 'radio', name: 'dtKind', onchange: () => { m.setKind(i); render(); } }));
    nameInp.addEventListener('change', () => {
      const err = m.setName(nameInp.value);
      if (err) { alert(err === 'INVALIDNAME' ? R('invalidName').replace('{0}', nameInp.value) : R(err === 'NOEMPTYVALUE' ? 'noEmpty' : 'noDuplicate')); nameInp.value = m.editor.name; nameInp.focus(); }
      refresh();
    });
    const list = listTable([R('dtColName'), R('dtColOrigin'), R('dtColGrid'), R('dtColTransform'), R('dtColShow')], (i) => { m.select(i); render(); });
    const btnUpdate = el('button', { type: 'button', text: R('btnUpdate'), onclick: () => {
      const e = m.register();
      if (e === 'NOTEXISTINLIST') alert(R('notExistInList').replace('{0}', m.editor.name));
      render();
    } });
    const btnRemove = el('button', { type: 'button', text: R('btnDelete'), onclick: () => { m.remove(); render(); } });
    const btnNew = el('button', { type: 'button', text: R('btnAdd'), onclick: async () => {
      if (m.dirty) { const a = await ask3(R('updateValue')); if (a === 'cancel') return; if (a === 'yes') m.register(); }
      m.add(); render();
    } });
    function renderGrid() {
      grid.innerHTML = '';
      grid.append(el('tr', {}, el('th'), ...['x', 'y', 'z', R('dtDiv')].map(c => el('th', { text: c }))));
      m.editor.grid.forEach((row, rI) => grid.append(el('tr', {}, el('th', { text: rI === 0 ? 'origin' : 'grid' + rI }),
        ...row.map((v, c) => el('td', {}, v === null ? el('input', { disabled: true, size: 8, class: 'off' })
          : numberInput(v, (x) => { m.setCell(rI, c, x); refresh(); }, { numeric: false, check: (x) => {
            const err = D.detectorCellOk(rI, c, x);
            if (err) alert(err === 'REALINPUT' ? R('realInput').replace('{0}', x) : R('gridNumber'));
            return !err;
          } }))))));
    }
    function render() {
      const has = m.list.length > 0;
      list.render(m.list.map(d => m.row(d)), m.cur);
      radios.forEach((rb, i) => { rb.checked = i === m.editor.kind; rb.disabled = !has; });
      nameInp.value = m.editor.name; trInp.value = m.editor.transform; showCb.checked = m.editor.show;
      trInp.disabled = !has || m.editor.kind === 0; showCb.disabled = !has; btnRemove.disabled = !has;
      renderGrid(); grid.querySelectorAll('input').forEach(i => { if (!has) i.disabled = true; });
      refresh();
    }
    const body = el('div', { class: 'pdBody' },
      el('label', {}, R('name') + ' ', nameInp),
      el('div', { class: 'pdRow' },
        el('div', { class: 'pdRadios' }, ...KINDS.map((k, i) => el('label', {}, radios[i], ' ' + R(k)))),
        el('div', {}, grid, el('label', {}, R('dtTransform') + ' ', trInp), el('div', {}, el('label', {}, showCb, ' ' + R('dtShow'))))),
      el('div', {}, btnNew, ' ', btnUpdate, ' ', btnRemove),
      el('fieldset', {}, el('legend', { text: R('dtList') }), list.tbl),
      note(R('dtNote')),
      el('label', {}, el('input', { type: 'checkbox', checked: m.block, onchange: (e) => { m.block = e.target.checked; refresh(); } }), ' ' + R('block')));
    const f = frame(R('dtTitle'), body, {
      okLabel: R('updateInput'), helpAnchor: 'guiinput/#6-toc-title',
      ok: async () => {
        if (m.dirty) { const a = await ask3(R('updateValue')); if (a === 'cancel') return false; if (a === 'yes') m.register(); }
        replaceNode('detector', m.yaml); return true;
      },
    });
    const refresh = () => { f.setYaml(m.yaml); btnUpdate.disabled = !(m.dirty && m.cur >= 0); };
    render();
    f.dlg.showModal();
  }

  // ---- buildup_factor（Form_Add_Buildupfactor）。中性子のデッキでは neutron_correction ----
  async function openBuildup() {
    if (D.isNeutronDeck(getText())) return openNeutronCorrection();
    const names = await getNames();
    const lists = names.buildup || { materials: [], one: [''], two: [], three: [] };
    const r = D.buildupsFromDoc(await readNode('buildup_factor'));
    if (r.error) alert(`buildup_factor: deseriarization error\n${r.error}`);
    const m = new D.BuildupModel(r.list, lists);
    const combo = (which) => {
      const s = el('select', { onchange: () => { m.choose(which, s.value); refresh(); } }, ...m.items(which).map(x => el('option', { value: x, text: x })));
      return s;
    };
    const combos = { first: combo('first'), second: combo('second'), third: combo('third'), equiv: combo('equiv') };
    const LAY = ['buOne', 'buTwo', 'buThree'];
    const radios = LAY.map((k, i) => el('input', { type: 'radio', name: 'buLayers', onchange: () => { m.setLayers(i + 1); render(); } }));
    const finite = el('input', { type: 'checkbox', onchange: () => { m.setFinite(finite.checked); refresh(); } });
    const slant = el('input', { type: 'checkbox', onchange: () => { m.setSlant(slant.checked); refresh(); } });
    const list = listTable([R('buColLayers'), R('buColMaterial'), R('buColEquiv'), R('buColFinite'), R('buColSlant')], (i) => { m.select(i); render(); });
    const btnUpdate = el('button', { type: 'button', text: R('btnUpdate'), onclick: () => { registerWithMessage(); render(); } });
    const btnRemove = el('button', { type: 'button', text: R('btnDelete'), onclick: () => { m.remove(); render(); } });
    const btnUp = el('button', { type: 'button', text: R('buMoveUp'), onclick: () => { m.moveUp(); render(); } });
    const btnNew = el('button', { type: 'button', text: R('btnAdd'), onclick: async () => {
      if (m.dirty) { const a = await ask3(R('updateRow')); if (a === 'cancel') return; if (a === 'yes') registerWithMessage(); }
      m.add(); render();
    } });
    function registerWithMessage() {
      const e = m.register();
      if (e === 'EXISTSAMENODE') alert(R('existSameNode'));
      else if (e === 'NOTEXISTINLIST') alert(R('notExistInList').replace('{0}', ''));
    }
    function render() {
      const has = m.list.length > 0, L = m.editor.layers;
      list.render(m.list.map(b => m.row(b)), m.cur);
      radios.forEach((rb, i) => { rb.checked = i + 1 === L; rb.disabled = !has; });
      for (const [w, s] of Object.entries(combos)) {
        s.value = m.editor[w];
        if (s.value !== m.editor[w]) s.selectedIndex = -1;   // 一覧に無い名前（入力に書いてあったもの）は空欄で見せる
        s.disabled = !has || (w === 'first' || w === 'equiv' ? L !== 1 : w === 'second' ? L !== 2 : L !== 3);
      }
      finite.checked = m.editor.finite; slant.checked = m.editor.slant;
      finite.disabled = slant.disabled = btnRemove.disabled = !has;
      refresh();
    }
    const body = el('div', { class: 'pdBody' },
      el('div', { class: 'pdForm' },
        el('span', { text: R('buLayers') }), el('span', {}, ...LAY.map((k, i) => el('label', {}, radios[i], ' ' + R(k) + '　'))),
        el('span', { text: R('buMaterial') }), el('span', {}, combos.first, ' ', combos.second, ' ', combos.third),
        el('span', { text: R('buEquiv') }), el('span', {}, combos.equiv),
        el('span', { text: R('buCorr') }), el('span', {}, el('label', {}, finite, ' ' + R('buFinite')), '　', el('label', {}, slant, ' ' + R('buSlant')))),
      el('div', {}, btnNew, ' ', btnUpdate, ' ', btnRemove, ' ', btnUp),
      el('fieldset', {}, el('legend', { text: R('buList') }), list.tbl),
      note(R('buNote')),
      el('label', {}, el('input', { type: 'checkbox', checked: m.block, onchange: (e) => { m.block = e.target.checked; refresh(); } }), ' ' + R('block')));
    const f = frame(R('buTitle'), body, {
      okLabel: R('updateInput'), helpAnchor: 'guiinput/#7-toc-title',
      ok: async () => {
        const ce = m.closeError();   // Windows の FormClosing：一覧に無い材料・重複を先に調べる
        if (ce) { alert(ce.error === 'DUPLICATE' ? `${R('dupTitle')}\n${ce.detail}` : R('notExistInList').replace('{0}', ce.detail)); return false; }
        if (m.dirty) { const a = await ask3(R('updateRow')); if (a === 'cancel') return false; if (a === 'yes') registerWithMessage(); }
        replaceNode('buildup_factor', m.yaml); return true;
      },
    });
    const refresh = () => { f.setYaml(m.yaml); btnUpdate.disabled = !(m.dirty && m.cur >= 0); };
    render();
    f.dlg.showModal();
  }

  // ---- neutron_correction（Form_NeutronCorrection。NeutronCatalog.ReadCorrection・WriteCorrection） ----
  function openNeutronCorrection() {
    const text = getText();
    const rc = D.readCorrection(text);
    const m = new D.NeutronCorrectionModel(rc);
    const g = el('input', { type: 'checkbox' });
    const fcb = el('input', { type: 'checkbox' });
    const sync = () => { g.checked = m.g; fcb.checked = m.f; fcb.disabled = !m.fEnabled; };
    g.addEventListener('change', () => { m.setG(g.checked); sync(); });
    fcb.addEventListener('change', () => { m.setF(fcb.checked); sync(); });
    const body = el('div', { class: 'pdBody pdNc' },
      el('div', { text: R('ncHelp') }),
      el('label', {}, g, ' ' + R('ncG')),
      el('label', { class: 'pdIndent' }, fcb, ' ', el('span', { class: 'pdPre', text: R('ncF') })),
      el('div', { class: 'pdWarn', text: R('ncRoom') }),
      el('div', { class: 'pdGray', text: R(rc.written ? 'ncWritten' : 'ncNone') }));
    const f = frame(R('ncTitle'), body, {
      okLabel: R('updateInput'), preview: false,
      ok: () => { inputWin().setText(D.writeCorrection(getText(), m.geometryCorrection, m.finiteMediumCorrection)); inputWin().editor.focus(); return true; },
    });
    sync();
    f.dlg.showModal();
  }

  // ===================================================================================
  // 段階 3c：source（Form_追加_線源・Form_追加_MANUAL）
  //   Windows と同じく一覧の全部をダイアログで編集し、「入力を更新」で入力の source 節を入れ替える。
  //   4 つのタブ（線源形状・線源情報・体積線源の領域分割・エラーチェック用の透過線基準）。表の欄を変えたときの検査と
  //   メッセージは Windows と同じ（dialogs_model の SourceModel が返す）。
  // ===================================================================================
  Object.assign(RES.en, {
    srTitle: 'Define source node', srName: 'Name :', srTab0: 'geometry', srTab1: 'inventory', srTab2: 'volume source partitioning', srTab3: 'path trace for error checking',
    srPoint: 'point', srCuboid: 'cuboid', srSphere: 'sphere', srCylinder: 'cylinder', srPOINT: 'POINT', srBOX: 'BOX (any direction)', srRPP: 'RPP (parallel to each axis)', srSPH: 'SPH', srRCC: 'RCC',
    srTransform: 'Transform node (optional) :', srNuclide: 'RI-based', srEnergy: 'Energy-based', srListRI: 'List of radioisotpes', srImport: 'Import', srExport: 'Export',
    srCutoff: 'cutoff rate :', srRiName: 'RI name', srEnergyCol: 'energy [MeV]', srSpectrum: 'spectrum', srRadioactivity: 'radioactivity [Bq]', srEmission: 'Emission [n/s]',
    srAddRow: 'Add row', srInsRow: 'Insert row', srDelRow: 'Delete row', srPasteHint: 'Tab-separated text (e.g. copied from a spreadsheet) can be pasted into a cell with Ctrl+V.',
    srDivType: 'type', srDivN: 'number | end_point,weight', srMin: 'min', srMax: 'max', srEdit: 'Edit…', srBounding: 'bounding_box', srList: 'List of predefined sources',
    srColType: 'type', srColName: 'name', srColPos: 'position/geometry', srColDiv: 'division', srColInv: 'inventory', srColCutoff: 'cutoff_rate', srColPt: 'path_trace',
    SOURCETAB0: 'Specify the geometry of the source.\nPoint: POINT (coordinates representing the point location) \nRectangle in any orientation: BOX (one vertex, three edge vectors linked to it) \nRectangle parallel to X, Y, Z axes: RPP (vertex with the smallest coordinates, vertex with the largest coordinates diagonal to it) \nBall: SPH (center coordinates, radius length) \nCylinder: RCC (base center coordinates, radius length, axis length vector) \nTransform operation can also be specified for a given geometry.',
    SOURCETAB1: "Specify the inventory by nuclide or by energy.\nFor nuclide: nuclide name, radioactivity [Bq] .\nFor energy: energy value [MeV], spectrum, radioactivity [Bq].  \nThe value obtained by multiplying spectrum and radioactivity represents the photon emission rate by the energy.\n’cutoff rate’ means that a photon emission rate smaller than this value will be ignored in the calculation, i.e., considered zero.",
    SOURCETAB1N: "Specify the neutron source strength by nuclide or by energy (a 'particle: neutron' deck).\nFor nuclide: nuclide name (choose from the nuclide list), emission rate [n/s].\nFor energy: energy [MeV], fraction, emission rate [n/s] (fraction x emission rate = neutrons per second).\nEnter the neutron emission rate [n/s], not the activity [Bq] (e.g. Cf-252 emits about 0.116 n/s per Bq).\nLines with a fraction below 'cutoff_rate' are ignored (treated as zero).",
    SOURCETAB2: "Six types of volume source partitioning methods:\nUNIFORM : Equal partitioning.\nGAUSS_FIRST : Gaussian partitioning with start point subdivision.\nGAUSS_LAST : Same as above with end point subdivision.\nGAUSS_BOTH : Same with both ends subdivision.\nGAUSS_CENTER : Same with center subdivision.\nMANUAL : arbitrary partitioning, where the source point is placed at the center of the area. divided by 'end_point'. 'weight' is the ratio of radioactivity to be distributed to each source point.\n’min’, ’max’ specify the angle in the case of theta, phi, and in other cases, values between 0 and 1.",
    SOURCETAB3: 'This function is for debugging: when a volume source is selected in geometry, a virtual point source is set up to check if the path of the penetrating line to the detector is as intended.',
    mnTitle: 'Set the energy split point in MANUAL mode', mnWeight: 'arbitrary Weighting', mnNormalize: 'Normalize weights', mnNote: '(# of weight elements = # of end points - 1)',
    mnEnd: 'end_point', mnW: 'weight', mnInsert: 'Row insert', mnRemove: 'Row delete', mnAdd: 'Add end_point', mnOk: 'OK',
    REALINPUT: 'Enter a real number: ‘{0}’', TWOTOHUNDRED: 'Enter an integer between 2 and 100.', UNIFORMNUMBER: 'Enter an integer of 1 or more for UNIFORM.',
    UNIFORMPHI: 'For phi, enter an integer of 2 or more (with 1, all source points are placed on one side, at phi = 180 degrees).', POSREALINPUT: 'Enter a positive real number: ‘{0}’',
    LESSPOSREALINPUT: 'Enter a positive real number less than ‘{0}’.', MOREPOSREALINPUT: 'Enter a positive real number greater than ‘{0}’.',
    RINAMEINPUT: 'Enter RI name.', FIRSTALPHABET: 'The first letter must begin with a letter of the alphabet.', NOMOREROWDELETE: 'No more lines can be deleted.',
    NOEMPTYVALUE: 'No blanks allowed.', INVALIDNAME: "The name '{0}' cannot be used. Use only letters, digits, '_' and '-'.", NODUPLICATE: 'The same name is already defined.', ZEROTOONEREAL: 'Enter a real number between 0 and 1.',
    LESSPREVIOUS: 'Change the previous value to a value less than {0}.', NUMENDPOINT: 'Specify two or more segments for end_point.', NOTEMPTYCELL: 'Fill in the blank cell : {0}',
    NUMWEIGHT: 'The number of elements in weight must be equal to the number of segments in end_point minus 1.',
    INVALIDHEADERRA: 'Radioactivity column not readable from file header.\nCheck data format of the file.',
    IMPORTHEADERNEUTRON: 'Emission column not readable from file header.\nFor a neutron source file, the header line (the first line that is not a # comment) must be nuclide,emission or energy,spectrum,emission.',
    NOTREADNODE: 'Unable to read source node from YAML input.', NOTEXISTNODE: 'Target node does not exist.',
  });
  Object.assign(RES.ja, {
    srTitle: '線源の追加', srName: '名前：', srTab0: '線源形状', srTab1: '線源情報', srTab2: '体積線源の領域分割', srTab3: 'エラーチェック用の透過線基準',
    srPoint: '点', srCuboid: '直方体', srSphere: '球', srCylinder: '円柱', srBOX: 'BOX (任意方向)', srRPP: 'RPP (xyz軸に平行)',
    srTransform: '回転と平行移動 (オプション)：', srNuclide: '核種指定', srEnergy: 'エネルギ指定', srListRI: '核種名リスト', srImport: 'インポート', srExport: 'エクスポート',
    srCutoff: '放出率カットオフ：', srRiName: '核種名', srEnergyCol: 'エネルギ [MeV]', srSpectrum: '分布 [-]', srRadioactivity: '放射能 [Bq]',
    srAddRow: '行を追加', srInsRow: '行を挿入', srDelRow: '行を削除', srPasteHint: 'タブ区切りの文字（表計算ソフトからのコピーなど）は、欄で Ctrl+V で貼り付けられます。',
    srEdit: '編集…', srList: '定義済み線源リスト', srColType: '形状', srColName: '名前', srColPos: '位置/形状の属性', srColDiv: '体積線源分割', srColInv: 'インベントリ', srColCutoff: '放出率カットオフ',
    SOURCETAB0: '線源の幾何形状を指定します。\n・点：POINT（点位置を表す座標）\n・任意の姿勢の直方体：BOX（一つの頂点、それにリンクする３つの辺ベクトル）\n・X,Y,Z軸に平行な直方体：RPP（最小の座標を持つ頂点、それと対角位置にある最大の座標をもつ頂点）\n・球: SPH（中心座標、半径長）\n・円柱: RCC（底辺中心座標、半径長、軸長ベクトル）\n指定した形状にtransform操作を指定可',
    SOURCETAB1: "線源強度を核種またはエネルギで指定します。\n・核種の場合：核種名、放射能 [Bq]\n・エネルギの場合： エネルギ値 [MeV], 分布, 放射能 [Bq]（分布と放射能を乗じた値が光子発生数を表す）\n'cutoff_rate'とは、この値よりも小さい光子発生数は計算で無視、つまりゼロとみなされます。",
    SOURCETAB1N: "中性子線源の強度を核種またはエネルギで指定します（particle: neutron のデッキ）。\n・核種の場合：核種名（核種名リストから選択）、放出率 [n/s]\n・エネルギの場合：エネルギ値 [MeV]、割合、放出率 [n/s]（割合と放出率を乗じた値が中性子の放出数 [n/s]）\n放射能 [Bq] ではなく中性子の放出率 [n/s] を入力します（例：Cf-252 では 1 Bq ≒ 0.116 n/s）。\n'cutoff_rate'とは、この値よりも小さい割合の行は計算で無視、つまりゼロとみなされます。",
    SOURCETAB2: '体積線源の領域分割手法：typeは6種類\n・UNIFORM : 等分割\n・GAUSS_FIRST : 始点細分ガウス分割\n・GAUSS_LAST : 終点細分ガウス分割\n・GAUSS_BOTH : 両端細分ガウス分割\n・GAUSS_CENTER : 中央細分ガウス分割\n・MANUAL :  任意分割、end_pointで分割した領域の中心に線源点を置きます。weightは各線源点に分配する放射能の比率を表します。\nmin, maxは、theta, phiの場合は角度を、それ以外の場合は、0～1で指定します。',
    SOURCETAB3: 'デバッグ用の機能です。\ngeometryで体積線源を選んだとき、仮想点線源を設定して、検出器までの透過線が意図どおりに作成されるかチェックします。',
    mnTitle: 'MANUALの分割点：end_point', mnWeight: '任意重み付け', mnNormalize: '重み規格化', mnNote: '※weight(重み)の要素数 = end_pointの区分点数 ー 1',
    mnW: '重み', mnInsert: '行の挿入', mnRemove: '行の削除', mnAdd: 'end_point を追加',
    REALINPUT: "実数を指定してください：'{0}'", TWOTOHUNDRED: '2から100までの整数を指定してください', UNIFORMNUMBER: 'UNIFORM は 1 以上の整数を指定してください',
    UNIFORMPHI: 'phi は 2 以上の整数を指定してください（1 では線源点が φ=180° の片側にだけ置かれます）', POSREALINPUT: "正の実数を指定してください：'{0}'",
    LESSPOSREALINPUT: "'{0}' より小さい正の実数を指定してください", MOREPOSREALINPUT: "'{0}' より大きい正の実数を指定してください",
    RINAMEINPUT: '核種名を指定してください', FIRSTALPHABET: '最初の文字はアルファベットで始めてください', NOMOREROWDELETE: 'これ以上行を削除できません',
    NOEMPTYVALUE: '空白は許されません', INVALIDNAME: "名前 '{0}' は使えません。半角の英数字、_、- で書いてください", NODUPLICATE: '同じ名前が既に定義されています', ZEROTOONEREAL: '0～1の間の実数を指定してください',
    LESSPREVIOUS: '1つ前の値を{0}より小さい値にしてください', NUMENDPOINT: 'end_pointの区分点数は2点以上指定してください', NOTEMPTYCELL: '空欄を埋めてください：{0}',
    NUMWEIGHT: 'weightの要素数は[end_pointの区分点数-1]にしてください',
    INVALIDHEADERRA: 'ファイルヘッダから放射能カラムを読み取れません。\nファイルのデータフォーマットを確認してください',
    IMPORTHEADERNEUTRON: 'ファイルヘッダから放出率（emission）のカラムを読み取れません。\n中性子の線源情報ファイルは、ヘッダ行（# のコメント行を除いた最初の行）を nuclide,emission 又は energy,spectrum,emission としてください。',
    NOTREADNODE: 'sourceノードをYAML入力から読み込めません', NOTEXISTNODE: '対象となるノードがありません',
  });
  /** モデルが返す { error, args, all } を Windows と同じ文で（だめなものの数だけ）知らせる */
  function tellError(e) {
    if (!e || !e.error) return false;
    for (const x of e.all || [e]) alert(R(x.error).replace(/\{(\d)\}/g, (_, i) => (x.args || [])[Number(i)] ?? ''));
    return true;
  }
  /** 表の欄：変えたら apply(値) を呼び、エラーなら知らせて元に戻す（Windows の CellValidating → CancelEdit） */
  function cell(value, apply, { size = 8, disabled = false, onPaste } = {}) {
    const inp = el('input', { value: value ?? '', size, disabled: disabled || undefined, class: disabled ? 'off' : undefined });
    let prev = value ?? '';
    inp.addEventListener('change', () => {
      const e = apply(inp.value);
      if (tellError(e)) { inp.value = prev; inp.focus(); return; }
      prev = inp.value;
    });
    if (onPaste) inp.addEventListener('paste', (ev) => { const t = ev.clipboardData && ev.clipboardData.getData('text'); if (t && /[\t\n]/.test(t)) { ev.preventDefault(); onPaste(t); } });
    return inp;
  }

  // ---- MANUAL の分割点（Form_追加_MANUAL）。OK なら onOk(数の欄の文字) ----
  function openManual(values, onOk) {
    const mm = new D.ManualModel(values);
    const tbl = el('table', { class: 'pdGrid' });
    const wcb = el('input', { type: 'checkbox', checked: mm.weight || undefined, onchange: () => { mm.setWeight(wcb.checked); render(); } });
    let addInp;
    function render() {
      tbl.innerHTML = '';
      tbl.append(el('tr', {}, el('th'), el('th', { text: R('mnEnd') }), mm.weight ? el('th', { text: R('mnW') }) : null, el('th'), el('th')));
      mm.rows.forEach((r, i) => tbl.append(el('tr', {}, el('th', { text: String(i + 1) }),
        el('td', {}, cell(r.e, (v) => { const e = mm.setEnd(i, v); if (!e) render(); return e; })),
        mm.weight ? el('td', {}, i < mm.rows.length - 1 ? cell(r.w, (v) => mm.setW(i, v)) : el('input', { disabled: true, size: 8, class: 'off' })) : null,
        el('td', {}, el('button', { type: 'button', text: R('mnInsert'), onclick: () => { mm.insertRow(i); render(); } })),
        el('td', {}, el('button', { type: 'button', text: R('mnRemove'), onclick: () => { if (!tellError(mm.removeRow(i))) render(); } })))));
      addInp = el('input', { size: 8, placeholder: R('mnAdd') });
      addInp.addEventListener('change', () => { if (!addInp.value) return; const e = mm.setEnd(mm.rows.length, addInp.value); if (tellError(e)) { addInp.value = ''; return; } render(); });
      tbl.append(el('tr', {}, el('th', { text: '*' }), el('td', {}, addInp)));
    }
    const dlg = el('dialog', { class: 'pdlg pdManual' },
      el('h3', { text: R('mnTitle') }),
      el('div', { class: 'pdBody' }, tbl,
        el('div', {}, el('label', {}, wcb, ' ' + R('mnWeight')), ' ', el('button', { type: 'button', text: R('mnNormalize'), onclick: () => { mm.normalize(); render(); } })),
        note(R('mnNote'))),
      el('menu', {},
        el('button', { type: 'button', class: 'left', text: R('help'), onclick: () => openHelp('volsrcdivide/#2-toc-title') }),
        el('button', { type: 'button', text: R('mnOk'), onclick: () => { if (tellError(mm.check())) return; onOk(mm.result()); dlg.close(); } }),
        el('button', { type: 'button', text: R('cancel'), onclick: () => dlg.close() })));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    render();
    dlg.showModal();
  }

  // ---- source（Form_追加_線源） ----
  async function openSource() {
    const text = getText();
    const neutron = D.isNeutronDeck(text);
    let defaultNuclide;
    if (neutron) { try { const n = await getNames(); defaultNuclide = (n.neutronNuclides || [])[0]; } catch { /* 目録が読めない */ } }
    const r = D.sourcesFromDoc(await readNode('source'), D.abstractNode('unit', text));
    if (r.error) alert(R('NOTREADNODE'));
    const m = new D.SourceModel(r.list, { name: D.nameCandidate('s', text), neutron, angle: r.angle, defaultNuclide: defaultNuclide || (neutron ? 'Cf252' : 'Co60') });
    const ed = m.editor;
    let tab = 0, invRow = 0;
    const help = el('textarea', { class: 'pdHelp', readonly: true, rows: 5 });
    const nameInp = el('input', { size: 20 });
    nameInp.addEventListener('change', () => { if (tellError(m.setName(nameInp.value))) { nameInp.value = ed.name; nameInp.focus(); } refresh(); });
    const tabs = el('div', { class: 'pdTabs' });
    const page = el('div', { class: 'pdPage' });
    const list = listTable([R('srColType'), R('srColName'), R('srColPos'), R('srColDiv'), R('srColInv'), R('srColCutoff'), R('srColPt')], (i) => { m.select(i); invRow = 0; render(); });
    const btnUpdate = el('button', { type: 'button', text: R('btnUpdate'), onclick: () => { if (m.register() === 'NOTEXISTNODE') alert(R('NOTEXISTNODE')); render(); } });
    const btnRemove = el('button', { type: 'button', text: R('btnDelete'), onclick: () => { m.remove(); invRow = 0; render(); } });
    const btnNew = el('button', { type: 'button', text: R('btnAdd'), onclick: async () => {
      if (m.dirty) { const a = await ask3(R('updateValue')); if (a === 'cancel') return; if (a === 'yes') m.register(); }
      m.add(); invRow = 0; render();
    } });
    const fileInp = el('input', { type: 'file', accept: '.txt,.csv,text/plain', style: 'display:none' });
    fileInp.addEventListener('change', async () => {
      const f = fileInp.files[0]; fileInp.value = '';
      if (!f) return;
      const res = m.importInventory(await f.text());
      if (res.error) alert(R(res.error));
      render();
    });
    const changed = (e) => { if (!e) render(); return e; };   // 値が入ったら表示を作り直す

    function geometryPage() {
      const has = m.list.length > 0;
      const groups = [['srPoint', ['POINT']], ['srCuboid', ['BOX', 'RPP']], ['srSphere', ['SPH']], ['srCylinder', ['RCC']]];
      const radios = el('div', { class: 'pdRadios' }, ...groups.map(([g, types]) => el('div', {}, el('span', { class: 'pdGroup', text: R(g) }),
        ...types.map(t => el('label', {}, el('input', { type: 'radio', name: 'srType', checked: t === ed.type || undefined, disabled: !has || undefined,
          onchange: () => { m.setType(t); render(); } }), ' ' + R('sr' + t))))));
      const grid = el('table', { class: 'pdGrid' }, el('tr', {}, el('th'), ...['x', 'y', 'z'].map(c => el('th', { text: c }))));
      m.geoLabels().forEach((label, rI) => grid.append(el('tr', {}, el('th', { text: label }),
        ...ed.geo[rI].map((v, c) => el('td', {}, v === null && rI > 0 && c > 0 ? el('input', { disabled: true, size: 8, class: 'off' })
          : cell(v, (x) => m.setGeo(rI, c, x), { disabled: !has }))))));
      const tr = el('input', { size: 20, value: ed.transform, disabled: (!has || !ed.transformEnabled) || undefined, oninput: (e) => { m.setTransform(e.target.value); refresh(); } });
      return el('div', { class: 'pdRow' }, radios, el('div', {}, grid, el('label', {}, R('srTransform') + ' ', tr)));
    }
    function inventoryPage() {
      const has = m.list.length > 0, nuc = ed.invKind === 'nuclide';
      const strength = neutron ? R('srEmission') : R('srRadioactivity');
      const cols = nuc ? [R('srRiName'), strength] : [R('srEnergyCol'), R('srSpectrum'), strength];
      const tbl = el('table', { class: 'pdGrid pdInv' }, el('tr', {}, el('th'), ...cols.map(c => el('th', { text: c }))));
      ed.inv.forEach((row, rI) => tbl.append(el('tr', { class: rI === invRow ? 'sel' : '', onclick: () => { invRow = rI; tbl.querySelectorAll('tr').forEach((t, k) => t.classList.toggle('sel', k === rI + 1)); } },
        el('th', { text: String(rI + 1) }),
        ...row.map((v, c) => el('td', {}, cell(v, (x) => changed(m.setInv(rI, c, x)), { size: c === 0 && nuc ? 12 : 10, disabled: !has,
          onPaste: (t) => { m.pasteInv(rI, c, t); render(); } }))))));
      const radio = (k, label) => el('label', {}, el('input', { type: 'radio', name: 'srInv', checked: ed.invKind === k || undefined, disabled: !has || undefined,
        onchange: () => { m.setInvKind(k); invRow = 0; render(); } }), ' ' + R(label));
      const cut = cell(ed.cutoff, (v) => m.setCutoff(v), { size: 10, disabled: !has });
      return el('div', {},
        el('div', {}, radio('nuclide', 'srNuclide'), ' ', radio('energy', 'srEnergy'), '　',
          el('button', { type: 'button', text: R('srListRI'), disabled: (!has || !nuc) || undefined, onclick: () => showList('ri', (row) => { m.pickNuclide(Math.min(invRow, ed.inv.length - 1), row[0]); render(); }) }), ' ',
          el('button', { type: 'button', text: R('srImport'), disabled: !has || undefined, onclick: () => fileInp.click() }), ' ',
          el('button', { type: 'button', text: R('srExport'), disabled: (!has || !ed.inv.length) || undefined, onclick: () => {
            const t = m.exportInventory(); if (t === null) return;
            const a = el('a', { href: URL.createObjectURL(new Blob([t], { type: 'text/plain' })), download: 'source_inventory.txt' });
            document.body.appendChild(a); a.click(); a.remove();
          } })),
        tbl,
        el('div', {},
          el('button', { type: 'button', text: R('srAddRow'), disabled: !has || undefined, onclick: () => { invRow = m.addInvRow(); render(); } }), ' ',
          el('button', { type: 'button', text: R('srInsRow'), disabled: (!has || !ed.inv.length) || undefined, onclick: () => { m.insertInvRow(Math.min(invRow, ed.inv.length - 1)); render(); } }), ' ',
          el('button', { type: 'button', text: R('srDelRow'), disabled: (!has || !ed.inv.length) || undefined, onclick: () => { if (!tellError(m.removeInvRow(Math.min(invRow, ed.inv.length - 1)))) { invRow = Math.max(0, Math.min(invRow, ed.inv.length - 1)); render(); } } }),
          '　', el('label', {}, R('srCutoff') + ' ', cut)),
        note(R('srPasteHint')));
    }
    function divisionPage() {
      const has = m.list.length > 0 && ed.type !== 'POINT';
      const tbl = el('table', { class: 'pdGrid' }, el('tr', {}, el('th'), ...[R('srDivType'), R('srDivN'), R('srMin'), R('srMax')].map(c => el('th', { text: c }))));
      m.divLabels().forEach((label, rI) => {
        const row = ed.div[rI];
        const sel = el('select', { disabled: !has || undefined, onchange: () => { m.setDivType(rI, sel.value); render(); } }, ...D.DIV_TYPES.map(t => el('option', { value: t, text: t })));
        sel.value = row.type;
        const n = row.type === 'MANUAL'
          ? el('span', {}, el('input', { value: row.n ?? '', size: 18, readonly: true }), ' ',
            el('button', { type: 'button', text: R('srEdit'), disabled: !has || undefined, onclick: () => openManual(row.n ?? '', (v) => { m.setDivManual(rI, v); render(); }) }))
          : cell(row.n, (x) => m.setDivCell(rI, 1, x), { size: 6, disabled: !has });
        tbl.append(el('tr', {}, el('th', { text: label }), el('td', {}, sel), el('td', {}, n),
          el('td', {}, cell(row.min, (x) => m.setDivCell(rI, 2, x), { size: 6, disabled: !has || row.ro })),
          el('td', {}, cell(row.max, (x) => m.setDivCell(rI, 3, x), { size: 6, disabled: !has || row.ro }))));
      });
      return el('div', {}, tbl);
    }
    function pathPage() {
      const has = m.list.length > 0;
      const pos = el('table', { class: 'pdGrid' }, el('tr', {}, el('th'), ...['x', 'y', 'z'].map(c => el('th', { text: c })), el('th')));
      ed.positions.forEach((row, rI) => pos.append(el('tr', {}, el('th', { text: String(rI + 1) }),
        ...row.map((v, c) => el('td', {}, cell(v, (x) => m.setPosition(rI, c, x), { disabled: !has }))),
        el('td', {}, el('button', { type: 'button', text: R('srDelRow'), disabled: !has || undefined, onclick: () => { m.removePosition(rI); render(); } })))));
      const box = el('table', { class: 'pdGrid' }, el('tr', {}, el('th'), el('th', { text: R('srBounding') }), el('th')));
      ed.bounding.forEach((v, rI) => box.append(el('tr', {}, el('th', { text: String(rI + 1) }),
        el('td', {}, cell(v, (x) => { m.setBounding(rI, x); return null; }, { size: 14, disabled: !has })),
        el('td', {}, el('button', { type: 'button', text: R('srDelRow'), disabled: !has || undefined, onclick: () => { m.removeBounding(rI); render(); } })))));
      return el('div', { class: 'pdRow' },
        el('div', {}, el('div', { text: 'position' }), pos, el('button', { type: 'button', text: R('srAddRow'), disabled: !has || undefined, onclick: () => { m.addPosition(); render(); } })),
        el('div', {}, box, el('button', { type: 'button', text: R('srAddRow'), disabled: !has || undefined, onclick: () => { m.addBounding(''); render(); } })));
    }
    const TABS = [['srTab0', geometryPage, 'SOURCETAB0'], ['srTab1', inventoryPage, neutron ? 'SOURCETAB1N' : 'SOURCETAB1'], ['srTab2', divisionPage, 'SOURCETAB2'], ['srTab3', pathPage, 'SOURCETAB3']];
    function render() {
      const has = m.list.length > 0;
      nameInp.value = ed.name;
      tabs.innerHTML = '';
      TABS.forEach(([label], i) => tabs.append(el('button', { type: 'button', class: i === tab ? 'on' : '', text: R(label), onclick: () => { tab = i; render(); } })));
      page.innerHTML = ''; page.append(TABS[tab][1]());
      help.value = R(TABS[tab][2]);
      list.render(m.list.map(s => m.row(s)), m.cur);
      btnRemove.disabled = !has;
      refresh();
    }
    const body = el('div', { class: 'pdBody pdSource' },
      el('label', {}, R('srName') + ' ', nameInp),
      tabs, page, help,
      el('div', {}, btnNew, ' ', btnUpdate, ' ', btnRemove),
      el('fieldset', {}, el('legend', { text: R('srList') }), list.tbl),
      el('label', {}, el('input', { type: 'checkbox', checked: m.block, onchange: (e) => { m.block = e.target.checked; refresh(); } }), ' ' + R('block')),
      fileInp);
    const f = frame(R('srTitle') + (neutron ? R('neutron') : ''), body, {
      okLabel: R('updateInput'), helpAnchor: 'guiinput/#3-toc-title',
      ok: async () => {
        if (m.dirty) { const a = await ask3(R('updateValue')); if (a === 'cancel') return false; if (a === 'yes') m.register(); }
        replaceNode('source', m.yaml); return true;
      },
    });
    const refresh = () => { f.setYaml(m.yaml); btnUpdate.disabled = !(m.dirty && m.cur >= 0); };
    render();
    f.dlg.showModal();
  }

  window.PokerDialogUI = { openTransform, openBody, openZone, openSource, openDetector, openBuildup, openNeutronCorrection, R };
})();
