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
      rotateLengthZero: 'The length of the axis of rotation is zero.', nonNegativeReal: 'Enter a non-negative real number.', noEmpty: 'No blanks allowed.',
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
      rotateLengthZero: '回転軸の長さがゼロです', nonNegativeReal: '非負の実数を入力してください', noEmpty: '空白は許されません',
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
      ok: () => { if (m.closeError()) { alert(R('notItemList')); return false; } addToInput('transform', m.yaml); return true; },
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
    const f = frame(R('bdTitle'), body, { okLabel: R('okBody'), helpAnchor: 'guiinput/#1-toc-title', ok: () => { addToInput('body', m.yaml); return true; } });
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
      if (err) { alert(R(err === 'NOEMPTYVALUE' ? 'noEmpty' : 'noDuplicate')); nameInp.value = m.editor.name; nameInp.focus(); }
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

  window.PokerDialogUI = { openTransform, openBody, openZone, openDetector, openBuildup, openNeutronCorrection, R };
})();
