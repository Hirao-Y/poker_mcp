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
#     PokerGrid          "120 0 0 / 0 120 0 / 5 5"（省略時は点検出器）
#     PokerShowPathTrace True/False（省略時 False）

import json
import os
import re

import FreeCAD as App

import poker_lib

# CAD(mm) -> POKER(cm)
SCALE = 0.1

# 線源の既定分割数。利用者が PokerDivision で上書きする前提の出発点。
# 粗すぎると精度が出ず、細かすぎると経路数が爆発するので中庸を取る。
DEFAULT_DIVISION = {
    'RCC': [4, 8, 10],      # r, phi, z
    'BOX': [5, 5, 5],       # edge_1, edge_2, edge_3
    'SPH': [4, 8, 8],       # r, phi, theta
}


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


def shape_kind(sh):
    # ソリッドの形から POKER の立体型を推定する。
    # 厳密な判定は難しいので、面の構成で大まかに分ける。
    n = len(sh.Faces)
    if n == 1:
        return 'SPH'
    if n == 3:
        return 'RCC'      # 側面 + 上下の平面
    if n == 6:
        return 'BOX'
    return None


def read_source(obj, nuclide_override=None):
    # 形状から線源の型と幾何を決める。核種と分割は プロパティから。
    sh = obj.Shape
    kind = shape_kind(sh)
    bb = sh.BoundBox

    nuc = parse_nuclides(getattr(obj, 'PokerNuclides', None) or '')
    # 子孫核種を補完した結果が spec で渡されていればそちらを使う。
    #   Cs137 は β 崩壊のみで光子をほぼ出さず、0.662 MeV は娘核種 Ba137m から
    #   出る。CAD に Cs137 とだけ書いて Ba137m を忘れると線量が桁違いに小さく
    #   なるため、poker_mcp 側で DaughterReconciler を通した結果を受け取る。
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

    # 体積が無視できるほど小さければ点線源として扱う。
    # 印として小さな球を置く使い方を想定している。
    if sh.Volume * (SCALE ** 3) < 1.0:      # 1 cm3 未満
        c = sh.CenterOfMass
        src['type'] = 'POINT'
        src['position'] = _xyz(c)
        return src

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
        d = div or DEFAULT_DIVISION['RCC']
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
        d = div or DEFAULT_DIVISION['BOX']
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
        d = div or DEFAULT_DIVISION['BOX']
        src['division'] = {
            'edge_1': {'number': d[0], 'type': 'UNIFORM'},
            'edge_2': {'number': d[1], 'type': 'UNIFORM'},
            'edge_3': {'number': d[2], 'type': 'UNIFORM'},
        }
    return src


def read_detector(obj):
    c = obj.Shape.CenterOfMass
    det = {
        'name': obj.Name,
        'origin': _xyz(c),
        'show_path_trace': bool(getattr(obj, 'PokerShowPathTrace', False)),
    }
    grid = (getattr(obj, 'PokerGrid', None) or '').strip()
    if grid:
        # "120 0 0 / 0 120 0 / 5 5" -> edge ベクトル2本と分割数
        parts = [p.strip() for p in grid.split('/')]
        if len(parts) != 3:
            raise SystemExit(
                '検出器 %s の PokerGrid の書式が不正です: %r\n'
                '  例: "120 0 0 / 0 120 0 / 5 5"' % (obj.Name, grid))
        ns = parts[2].split()
        det['grid'] = [
            {'edge': parts[0], 'number': int(ns[0])},
            {'edge': parts[1], 'number': int(ns[1])},
        ]
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


def main(spec_path):
    spec = json.load(open(spec_path, encoding='utf-8-sig'))
    fcstd = spec['fcstd']
    out = spec.get('out') or os.path.splitext(fcstd)[0] + '.yaml'

    name = os.path.splitext(os.path.basename(fcstd))[0]
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.openDocument(fcstd)

    materials, sources, detectors = {}, [], []
    for o in doc.Objects:
        sh = getattr(o, 'Shape', None)
        if sh is None or sh.isNull() or not sh.Solids:
            continue
        r = role_of(o)
        if r == 'source':
            sources.append(read_source(o, spec.get('nuclides')))
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

    # mfp 順は .paths 生成後にしか分からないので、spec で渡された場合のみ使う
    # カタログ密度を読む。CAD 側の PokerDensity が無い材質に使う。
    lib = poker_lib.PokerLib(spec.get('poker_dir', r'C:\Poker'))
    lib_density = dict((m, v[0]) for m, v in lib.materials.items())

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
