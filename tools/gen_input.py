# gen_input.py -- CAD モデルから POKER の YAML 入力を組み立てる
#
# CAD が正本という前提。線源・検出器・材質・分割数を CAD のカスタムプロパティに
# 持たせ、そこから YAML を生成する。人が YAML を書く必要をなくすのが目的。
#
# 使い方:
#   freecadcmd -c "import gen_input; gen_input.main('spec.json')"
#
# spec.json:
#   { "fcstd": "...", "out": "poker.yaml", "poker_dir": "C:/Poker" }
#
# CAD 側のカスタムプロパティ:
#
#   全オブジェクト共通
#     PokerRole      shield(既定) / source / detector
#
#   遮蔽体 (PokerRole=shield)
#     PokerMaterial  材質名（Iron, Concrete, ...）
#     PokerDensity   密度の上書き [g/cm3]（省略可）
#
#   線源 (PokerRole=source)
#     PokerNuclides  "Co60:3.7e10, Cs137:1.0e11"
#     PokerDivision  "8 16 30"（軸の順は形状で決まる。省略時は既定値）
#     PokerCutoff    打ち切り率（省略時 1e-4）
#
#   検出器 (PokerRole=detector)
#     PokerDivision      "5 5"（2D）/ "5 5 5"（3D）。省略時は各方向 5
#                        グリッドの次元は形状から決まる:
#                          球・小さい立体 -> 点検出器
#                          薄い直方体     -> 2D（面線量マップ）
#                          直方体         -> 3D（体積線量マップ）
#     PokerShowPathTrace True/False（省略時 False）

import json
import os
import re

import FreeCAD as App

import poker_lib

# CAD(mm) -> POKER(cm)
#   FreeCAD の内部表現は常に mm で、表示の単位系設定(UserSchema)は Shape の
#   座標に影響しない。UnitsSchemaInternal の定義に「FreeCAD uses a mm/kg/deg
#   scala」と明記されており、UserSchema(SI1/SI2/Imperial/Centimeters 等)は
#   表示の切り替えにすぎない。実測でも Quantity("1 m").Value == 1000.0。
#   よってこの係数は固定でよい。
SCALE = 0.1

# 線源の分割数を寸法から決めるときの基準。
#
#   1 区画の厚さが DIV_MFP mfp 以下になるよう分割する。
#
# これは出発点であって最適値ではない。本来は分割数を変えて線量の収束を
# 確認し、それで決めるもの。ここでの既定値は「収束解析を始める前の、
# ひとまず妥当な値」という位置づけ。利用者は PokerDivision で上書きできる。
#
# 2 mfp としたのは、実運用の分割（キャスクで r 方向 1.9 mfp、z 方向 2.7 mfp）
# に近いため。1 mfp だと点数が現実的でなくなる（キャスクで半径 16 分割、
# 高さ 81 分割）。
DIV_MFP = 2.0

# 軸ごとの上限は設けない。2 mfp という基準を軸によって変える理由がなく、
# 細長い線源では z 方向に、扁平な線源では r 方向に、自然に多く配分される。
#
# 周方向(phi)だけは寸法で決まらないので固定値を使う。円周を何分割するかは
# 半径の mfp とは別の話で、方位角方向の線量分布をどれだけ解像したいかで決まる。
DIV_PHI = 16
DIV_MIN = 2

# 点数が過大になったときに気づけるよう、この数を超えたら警告する。
# 止めはしない（利用者が意図して細かくしている場合もある）。
DIV_WARN_POINTS = 20000


def _div_from_size(size_cm, mu):
    # size_cm を DIV_MFP mfp 以下に刻むのに必要な分割数
    if mu is None or mu <= 0:
        return DIV_MIN
    n = int(size_cm * mu / DIV_MFP + 0.999)
    return max(DIV_MIN, n)


def _num(v, default=None):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _xyz(v, scale=SCALE):
    # 重心計算などで 1e-17 のような値が出るので、実質ゼロは 0 に丸める。
    # POKER の入力に指数表記の微小値が並ぶと読みにくい。
    def f(x):
        x = x * scale
        return 0.0 if abs(x) < 1e-9 else x
    return '%g %g %g' % (f(v.x), f(v.y), f(v.z))


def role_of(obj):
    r = (getattr(obj, 'PokerRole', None) or 'shield').strip().lower()
    return r if r in ('shield', 'source', 'detector') else 'shield'


def parse_nuclides(text):
    # "Co60:3.7e10, Cs137:1.0e11" -> [("Co60", 3.7e10), ("Cs137", 1.0e11)]
    out = []
    for part in re.split(r'[,;]', text or ''):
        part = part.strip()
        if not part:
            continue
        m = re.match(r'^([A-Za-z]+[-_]?\d+m?)\s*[:=]\s*([\d.eE+-]+)$', part)
        if not m:
            raise SystemExit(
                'PokerNuclides の書式が不正です: %r\n'
                '  例: "Co60:3.7e10, Cs137:1.0e11"' % part)
        out.append((m.group(1).replace('-', '').replace('_', ''), float(m.group(2))))
    return out


def surface_types(sh):
    # 面の種類を数える。OCC は Surface の型で曲面種別が分かる。
    #   Cylinder / Sphere / Cone / Toroid / Plane / BSplineSurface ...
    from collections import Counter
    return Counter(type(f.Surface).__name__ for f in sh.Faces)


def classify(sh):
    # ソリッドの形から POKER の立体型を判定する。
    #
    # 面の数だけで判定すると誤る。三角柱も五面体も「平面だけ」だが、
    # 面数は形によって変わる。曲面の種別で分ける方が確実。
    #
    # 返り値: ('RCC'|'SPH'|'BOX'|None, 補足情報)
    t = surface_types(sh)
    n_plane = t.get('Plane', 0)
    n_face = len(sh.Faces)

    # 球: 球面1枚だけ
    if t.get('Sphere', 0) == 1 and n_face == 1:
        s = sh.Faces[0].Surface
        return 'SPH', {'center': s.Center, 'radius': s.Radius}

    # 円柱: 円柱面1枚 + 平面2枚（上下の蓋）
    if t.get('Cylinder', 0) == 1 and n_plane == 2 and n_face == 3:
        cyl = [f for f in sh.Faces if type(f.Surface).__name__ == 'Cylinder'][0]
        s = cyl.Surface
        ax = s.Axis
        # 底面と上面を軸方向の位置で見分ける
        planes = [f for f in sh.Faces if type(f.Surface).__name__ == 'Plane']
        ts = sorted(((f.CenterOfMass - s.Center).dot(ax), f.CenterOfMass)
                    for f in planes)
        h = ts[-1][0] - ts[0][0]
        return 'RCC', {'bottom': ts[0][1], 'axis': ax, 'height': h,
                       'radius': s.Radius}

    # 直方体: 平面6枚で、法線が3方向（各2枚ずつ）
    if n_plane == 6 and n_face == 6:
        axes = []
        for f in sh.Faces:
            a = f.Surface.Axis
            if not any(abs(abs(a.dot(b)) - 1.0) < 1e-6 for b in axes):
                axes.append(a)
        if len(axes) == 3:
            # 直交しているか（斜方体でないか）確認
            ok = (abs(axes[0].dot(axes[1])) < 1e-6 and
                  abs(axes[1].dot(axes[2])) < 1e-6 and
                  abs(axes[0].dot(axes[2])) < 1e-6)
            if ok:
                return 'BOX', {'axes': axes}

    return None, {'faces': n_face, 'types': dict(t)}


def read_source(obj, nuclide_override=None, mu_src=None):
    # mu_src: 線源材質の線減弱係数 [1/cm]。分割数を寸法から決めるのに使う。
    #   線源自身の自己遮蔽が効くので、1区画が厚すぎると精度が落ちる。
    # 形状から線源の型と幾何を決める。核種と分割は プロパティから。
    sh = obj.Shape
    kind, geo = classify(sh)
    bb = sh.BoundBox

    nuc = parse_nuclides(getattr(obj, 'PokerNuclides', None) or '')
    # 子孫核種を補完した結果が spec で渡されていればそちらを使う。
    #   Cs137 は β 崩壊のみで光子をほぼ出さず、0.662 MeV は娘核種 Ba137m から
    #   出る。忘れると線量が 1/3 になるため、poker_mcp 側で補完した結果を渡す。
    if nuclide_override and obj.Name in nuclide_override:
        nuc = [(d['nuclide'], float(d['radioactivity']))
               for d in nuclide_override[obj.Name]]
    if not nuc:
        raise SystemExit(
            '線源 %s に PokerNuclides が設定されていません\n'
            '  例: "Co60:3.7e10"' % obj.Name)

    src = {
        'name': obj.Name,
        'inventory': [{'nuclide': n, 'radioactivity': a} for n, a in nuc],
        'cutoff_rate': _num(getattr(obj, 'PokerCutoff', None), 1e-4),
    }

    div_text = (getattr(obj, 'PokerDivision', None) or '').strip()
    div = [int(x) for x in div_text.split()] if div_text else None

    # 体積が無視できるほど小さければ点線源として扱う（印として置いた球など）
    if sh.Volume * (SCALE ** 3) < 1.0:      # 1 cm3 未満
        src['type'] = 'POINT'
        src['position'] = _xyz(sh.CenterOfMass)
        return src

    if kind == 'RCC':
        # 軸は円柱面から取る。バウンディングボックスから作ると傾いた円柱に
        # 対応できず、横倒しの燃料棒や斜めの配管がまったく違う形になる。
        b, ax, h = geo['bottom'], geo['axis'], geo['height']
        src['type'] = 'RCC'
        src['geometry'] = {
            'bottom_center': _xyz(b),
            'height_vector': '%g %g %g' % (ax.x * h * SCALE,
                                           ax.y * h * SCALE,
                                           ax.z * h * SCALE),
            'radius': geo['radius'] * SCALE,
        }
        d = div or [
            _div_from_size(geo['radius'] * SCALE, mu_src),
            DIV_PHI,
            _div_from_size(abs(h) * SCALE, mu_src),
        ]
        src['division'] = {
            'r': {'number': d[0], 'type': 'UNIFORM'},
            'phi': {'number': d[1], 'type': 'UNIFORM'},
            'z': {'number': d[2], 'type': 'UNIFORM'},
        }
        return src

    if kind == 'SPH':
        # POKER の SPH 線源。分割は r/phi/theta。
        src['type'] = 'SPH'
        src['geometry'] = {
            'center': _xyz(geo['center']),
            'radius': geo['radius'] * SCALE,
        }
        d = div or [
            _div_from_size(geo['radius'] * SCALE, mu_src),
            DIV_PHI,
            DIV_PHI,
        ]
        src['division'] = {
            'r': {'number': d[0], 'type': 'UNIFORM'},
            'phi': {'number': d[1], 'type': 'UNIFORM'},
            'theta': {'number': d[2], 'type': 'UNIFORM'},
        }
        return src

    if kind == 'BOX':
        src['type'] = 'BOX'
        src['geometry'] = {
            'vertex': '%g %g %g' % (bb.XMin * SCALE, bb.YMin * SCALE, bb.ZMin * SCALE),
            'edge_1': '%g 0 0' % (bb.XLength * SCALE),
            'edge_2': '0 %g 0' % (bb.YLength * SCALE),
            'edge_3': '0 0 %g' % (bb.ZLength * SCALE),
        }
        d = div or [
            _div_from_size(bb.XLength * SCALE, mu_src),
            _div_from_size(bb.YLength * SCALE, mu_src),
            _div_from_size(bb.ZLength * SCALE, mu_src),
        ]
        src['division'] = {
            'edge_1': {'number': d[0], 'type': 'UNIFORM'},
            'edge_2': {'number': d[1], 'type': 'UNIFORM'},
            'edge_3': {'number': d[2], 'type': 'UNIFORM'},
        }
        return src

    # 判定できない形（円錐、トーラス、自由曲面、フィレット付きなど）。
    # 黙って外接直方体で近似すると、利用者が気づかないまま違う線源分布で
    # 計算することになる。明示的に拒否し、対処法を示す。
    raise SystemExit(
        '線源 %s の形状を判定できません（面: %s）\n'
        '  POKER の線源は POINT / RCC(円柱) / SPH(球) / BOX(直方体) です。\n'
        '  この形状を線源に使うには、外接する円柱か直方体に置き換えるか、\n'
        '  YAML を手で書いてください。' % (obj.Name, geo))

    if kind == 'RCC':
        # 円柱。軸は最も長い辺の方向とみなす
        src['type'] = 'RCC'
        src['geometry'] = {
            'bottom_center': '%g %g %g' % (
                (bb.XMin + bb.XMax) / 2 * SCALE,
                (bb.YMin + bb.YMax) / 2 * SCALE,
                bb.ZMin * SCALE),
            'height_vector': '0 0 %g' % (bb.ZLength * SCALE),
            'radius': max(bb.XLength, bb.YLength) / 2 * SCALE,
        }
        d = div or [
            _div_from_size(geo['radius'] * SCALE, mu_src),
            DIV_PHI,
            _div_from_size(abs(h) * SCALE, mu_src),
        ]
        src['division'] = {
            'r': {'number': d[0], 'type': 'UNIFORM'},
            'phi': {'number': d[1], 'type': 'UNIFORM'},
            'z': {'number': d[2], 'type': 'UNIFORM'},
        }
    elif kind == 'BOX':
        src['type'] = 'BOX'
        src['geometry'] = {
            'vertex': '%g %g %g' % (bb.XMin * SCALE, bb.YMin * SCALE, bb.ZMin * SCALE),
            'edge_1': '%g 0 0' % (bb.XLength * SCALE),
            'edge_2': '0 %g 0' % (bb.YLength * SCALE),
            'edge_3': '0 0 %g' % (bb.ZLength * SCALE),
        }
        d = div or [
            _div_from_size(bb.XLength * SCALE, mu_src),
            _div_from_size(bb.YLength * SCALE, mu_src),
            _div_from_size(bb.ZLength * SCALE, mu_src),
        ]
        src['division'] = {
            'edge_1': {'number': d[0], 'type': 'UNIFORM'},
            'edge_2': {'number': d[1], 'type': 'UNIFORM'},
            'edge_3': {'number': d[2], 'type': 'UNIFORM'},
        }
    else:
        # 判定できない形は外接直方体で近似する。
        # 線源の分割点は幾何の中に収まればよく、遮蔽体ほど形状に厳密さを要さない。
        src['type'] = 'BOX'
        src['geometry'] = {
            'vertex': '%g %g %g' % (bb.XMin * SCALE, bb.YMin * SCALE, bb.ZMin * SCALE),
            'edge_1': '%g 0 0' % (bb.XLength * SCALE),
            'edge_2': '0 %g 0' % (bb.YLength * SCALE),
            'edge_3': '0 0 %g' % (bb.ZLength * SCALE),
        }
        d = div or [
            _div_from_size(bb.XLength * SCALE, mu_src),
            _div_from_size(bb.YLength * SCALE, mu_src),
            _div_from_size(bb.ZLength * SCALE, mu_src),
        ]
        src['division'] = {
            'edge_1': {'number': d[0], 'type': 'UNIFORM'},
            'edge_2': {'number': d[1], 'type': 'UNIFORM'},
            'edge_3': {'number': d[2], 'type': 'UNIFORM'},
        }
    return src


def read_detector(obj):
    # 検出器の形状からグリッドを決める。
    #   球や小さな立体 -> 点検出器
    #   薄い直方体     -> 2D グリッド（面線量マップ）
    #   直方体         -> 3D グリッド（体積線量マップ）
    #
    # 従来は PokerGrid に "120 0 0 / 0 120 0 / 5 5" と書かせていたが、
    # 書式を間違えやすく、CAD で形を見ながら決められない。形状から読めば
    # 「この面の線量マップが欲しい」という意図がそのまま伝わる。
    sh = obj.Shape
    kind, geo = classify(sh)
    bb = sh.BoundBox

    det = {
        'name': obj.Name,
        'origin': _xyz(sh.CenterOfMass),
        'show_path_trace': bool(getattr(obj, 'PokerShowPathTrace', False)),
    }

    # 分割数。"5 5" なら 2 方向、"5 5 5" なら 3 方向。
    div_text = (getattr(obj, 'PokerDivision', None) or '').strip()
    div = [int(x) for x in div_text.split()] if div_text else None

    # 点検出器とみなす条件: 球、または十分小さい立体
    if kind == 'SPH' or sh.Volume * (SCALE ** 3) < 1.0:
        return det

    if kind != 'BOX':
        # グリッドは直方体でしか作れない。判定できない形は点として扱い、
        # 重心を評価点にする（黙って外接箱にすると意図と違う点を評価する）。
        return det

    # 辺の長さで次元を決める。最も短い辺が他の 1/20 未満なら平板とみなす。
    L = sorted([(bb.XLength, 0), (bb.YLength, 1), (bb.ZLength, 2)])
    edges = [
        ('%g 0 0' % (bb.XLength * SCALE), bb.XLength),
        ('0 %g 0' % (bb.YLength * SCALE), bb.YLength),
        ('0 0 %g' % (bb.ZLength * SCALE), bb.ZLength),
    ]
    thin = L[0][0] < L[2][0] / 20.0

    if thin:
        # 2D: 薄い方向を除く 2 辺
        use = [k for _, k in L[1:]]
        n = div or [5, 5]
    else:
        use = [0, 1, 2]
        n = div or [5, 5, 5]

    if len(n) < len(use):
        raise SystemExit(
            '検出器 %s の PokerDivision は %d 個の数が必要です（指定: %r）'
            % (obj.Name, len(use), div_text))

    # 原点はグリッドの隅（POKER の grid は origin から edge 方向に伸びる）
    det['origin'] = '%g %g %g' % (bb.XMin * SCALE, bb.YMin * SCALE, bb.ZMin * SCALE)
    det['grid'] = [{'edge': edges[k][0], 'number': n[i]} for i, k in enumerate(use)]
    return det


def build_yaml(doc, materials, sources, detectors, mfp_order=None, lib_density=None):
    # materials: {材質名: 密度 or None}（CAD の PokerDensity）
    # lib_density: {材質名: カタログ密度}（poker_lib から）
    # mfp_order: [材質名, ...] mfp の大きい順。None なら材質名順。
    lib_density = lib_density or {}

    # 分割点の総数（最大の線源）と、検出器の評価点の総数を数える
    n_src_points = 1
    for s_ in sources:
        n = 1
        for d_ in (s_.get('division') or {}).values():
            n *= d_['number']
        n_src_points = max(n_src_points, n)
    n_det_points = 1
    for d_ in detectors:
        n = 1
        for g in d_.get('grid', []):
            n *= g['number']
        n_det_points = max(n_det_points, n)

    L = []
    L.append('# このファイルは gen_input.py が CAD モデルから生成したものです。')
    L.append('# 正本は CAD モデルです。形状を変えたら再生成してください。')
    L.append('')
    # サマリーの出力量。既定では分割点も評価点も間引かれるため、.paths の生成に
    # 必要な全点が得られない。入力の実数に合わせて設定する。
    L.append('thinnedindices:')
    L.append('  sourcepoint: %d' % max(10, n_src_points))
    L.append('  pseudosourcepoint: 10')
    L.append('  detectorgrid: %d' % max(10, n_det_points))
    L.append('  detectorevaluation: %d' % max(10, n_det_points))
    L.append('  pathtrace: 5')
    L.append('  buildupenergy: 3')
    L.append('  buildupmfp: 3')
    L.append('')
    L.append('unit:')
    L.append('  length: cm')
    L.append('  angle: degree')
    L.append('  density: g/cm3')
    L.append('  radioactivity: Bq')
    L.append('')

    # --- body / zone ---
    # --path-input で計算する場合、幾何は .paths から来るのでここの立体は
    # 使われない。ただし POKER の入力規約上、ゾーンには実在する立体が要り、
    # 密度もここから引かれるため、材質ごとにダミーを1つ置く。
    L.append('# [ダミー] 以下の body / zone は --path-input では幾何として使われません。')
    L.append('# 幾何は .paths から読み込まれます。ここに置くのは、POKER の入力規約上')
    L.append('# ゾーンに実在する立体が必要なことと、材質の密度をここから引くためです。')
    L.append('# 立体どうしが重ならないよう x 方向に並べてあります。')
    L.append('body:')
    names = mfp_order or sorted(materials)
    for i, m in enumerate(names):
        x = i * 10
        L.append('  - name: REF_%s' % m)
        L.append('    type: RPP')
        L.append('    min: %d -1 -1' % x)
        L.append('    max: %d 1 1' % (x + 1))
    L.append('')
    L.append('zone:')
    L.append('  - body_name: ATMOSPHERE')
    L.append('    material: VOID')
    for m in names:
        L.append('  - body_name: REF_%s' % m)
        L.append('    material: %s' % m)
        # 密度は省略できない。CAD で PokerDensity が指定されていればその値、
        # 無ければ材料ライブラリのカタログ密度を書く。
        d = materials.get(m)
        if not d:
            d = lib_density.get(m)
        if d:
            L.append('    density: %g' % d)
    L.append('')
    L.append('transform: []')
    L.append('')

    # --- buildup_factor ---
    # POKER は並び順でビルドアップ材料を選ぶため、透過線上で最も効く材質
    # (mfp 合計が大きい材質) を先頭に置く。
    L.append('# 並び順で選択されるビルドアップ材料が変わります。')
    if mfp_order:
        L.append('# 全経路の mfp 合計が大きい順に並べてあります。')
    L.append('buildup_factor:')
    for m in names:
        if m in ('VOID', 'Air'):
            continue
        L.append('  - material: %s' % m)
        L.append('    use_slant_correction: false')
        L.append('    use_finite_medium_correction: false')
    L.append('')

    # --- source ---
    L.append('source:')
    for s in sources:
        L.append('  - name: %s' % s['name'])
        L.append('    type: %s' % s['type'])
        L.append('    inventory:')
        for inv in s['inventory']:
            L.append('      - nuclide: %s' % inv['nuclide'])
            L.append('        radioactivity: %g' % inv['radioactivity'])
        L.append('    cutoff_rate: %g' % s['cutoff_rate'])
        if s['type'] == 'POINT':
            L.append('    position: %s' % s['position'])
        else:
            L.append('    geometry:')
            for k, v in s['geometry'].items():
                L.append('      %s: %s' % (k, v))
            L.append('    division:')
            for ax, d in s['division'].items():
                L.append('      %s:' % ax)
                L.append('        number: %d' % d['number'])
                L.append('        type: %s' % d['type'])
    L.append('')

    # --- detector ---
    L.append('detector:')
    for d in detectors:
        L.append('  - name: %s' % d['name'])
        L.append('    origin: %s' % d['origin'])
        if 'grid' in d:
            L.append('    grid:')
            for g in d['grid']:
                L.append('      - edge: %s' % g['edge'])
                L.append('        number: %d' % g['number'])
        L.append('    show_path_trace: %s' % ('true' if d['show_path_trace'] else 'false'))
    L.append('')
    return '\n'.join(L)


def _source_mu(obj, lib, spec):
    # 線源材質の線減弱係数。PokerMaterial が設定されていればその材質、
    # 無ければ既定として Water を使う（多くの線源は水と同程度の減衰）。
    #
    # 参照エネルギーは spec.mu_energy、無ければ 0.662 MeV（Cs-137）。
    # ここでは分割数を決めるだけなので、厳密なエネルギーは要らない。
    mat = getattr(obj, 'PokerMaterial', None) or 'Water'
    energy = float(spec.get('mu_energy', 0.6617))
    try:
        return lib.mu(mat, energy)
    except Exception:
        try:
            return lib.mu('Water', energy)
        except Exception:
            return None


def main(spec_path):
    spec = json.load(open(spec_path, encoding='utf-8-sig'))
    fcstd = spec['fcstd']
    out = spec.get('out') or os.path.splitext(fcstd)[0] + '.yaml'

    name = os.path.splitext(os.path.basename(fcstd))[0]
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.openDocument(fcstd)

    # mfp 順は .paths 生成後にしか分からないので、spec で渡された場合のみ使う
    # カタログ密度を読む。CAD 側の PokerDensity が無い材質に使う。
    lib = poker_lib.PokerLib(spec.get('poker_dir', r'C:\Poker'))
    lib_density = dict((m, v[0]) for m, v in lib.materials.items())

    materials, sources, detectors = {}, [], []
    for o in doc.Objects:
        sh = getattr(o, 'Shape', None)
        if sh is None or sh.isNull() or not sh.Solids:
            continue
        r = role_of(o)
        if r == 'source':
            sources.append(read_source(o, spec.get('nuclides'), _source_mu(o, lib, spec)))
        elif r == 'detector':
            detectors.append(read_detector(o))
        else:
            m = getattr(o, 'PokerMaterial', None)
            if not m:
                raise SystemExit(
                    '遮蔽体 %s に PokerMaterial が設定されていません\n'
                    '  材質を設定するか、PokerRole を source/detector にしてください'
                    % o.Name)
            d = _num(getattr(o, 'PokerDensity', None))
            if m not in materials or (d and not materials[m]):
                materials[m] = d

    if not sources:
        raise SystemExit('PokerRole=source のオブジェクトがありません')
    if not detectors:
        raise SystemExit('PokerRole=detector のオブジェクトがありません')


    text = build_yaml(doc, materials, sources, detectors,
                      spec.get('mfp_order'), lib_density)
    open(out, 'w', encoding='utf-8').write(text)

    rep = {
        'out': out,
        'materials': sorted(materials),
        'sources': [s['name'] for s in sources],
        'detectors': [d['name'] for d in detectors],
    }
    print(json.dumps(rep, ensure_ascii=False, indent=2))
    return rep
