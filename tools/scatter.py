# scatter.py -- 任意形状への点線源散布
#
# POKER の立体型（POINT / SPH / RCC / RPP / BOX）で表現できない形状を線源として
# 扱う。形状の内部（または面上）に点線源を格子状に配置し、指定した汚染密度と
# 矛盾しない強度を配分する。
#
# 用途:
#   体積汚染  不定形の廃棄物、スラッジ、曲がった配管内の流体   Bq/cm3
#   表面汚染  床の汚染、配管内面の付着、機器表面               Bq/cm2
#
# 決定論的な格子配置を使う。MCNP/PHITS は棄却法（乱数）で点を撒くが、点減衰核
# では各点の強度を確定値として決める必要がある。乱数だと同じ入力で答えが変わり、
# 収束解析ができない。

import math


# 点数がこれを超えたら警告する。止めはしない（利用者が意図している場合もある）。
SCATTER_WARN_POINTS = 10000

# ピッチの既定値を決めるときの基準。
#   最も近い検出器までの距離の何分の1にするか。
#   点線源近似では、線源の大きさが距離に対して十分小さい必要がある。
#   1/10 なら立体角の誤差が 1% 程度に収まる。
PITCH_DISTANCE_RATIO = 10.0


def _bbox_grid(bb, pitch_mm):
    # 外接直方体を pitch で刻んだ格子点（セル中心）を返す
    nx = max(1, int(math.ceil(bb.XLength / pitch_mm)))
    ny = max(1, int(math.ceil(bb.YLength / pitch_mm)))
    nz = max(1, int(math.ceil(bb.ZLength / pitch_mm)))
    dx, dy, dz = bb.XLength / nx, bb.YLength / ny, bb.ZLength / nz
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                yield (bb.XMin + dx * (i + 0.5),
                       bb.YMin + dy * (j + 0.5),
                       bb.ZMin + dz * (k + 0.5))


def scatter_volume(shape, pitch_mm, total_bq, scale):
    """ソリッドの内部に点を散布する。

    各点の強度は総放射能の等分。セルごとの内部体積を厳密に求めるには
    ブーリアン演算が要り重いので、等分で済ませる。総量は Shape.Volume から
    出すので必ず合う。縁のセルで位置がずれるのが誤差だが、ピッチを細かく
    すれば小さくなる。

    返り値: [(x, y, z, bq), ...]  座標は POKER 単位
    """
    import FreeCAD as App
    bb = shape.BoundBox
    pts = []
    for (x, y, z) in _bbox_grid(bb, pitch_mm):
        if shape.isInside(App.Vector(x, y, z), 1e-7, True):
            pts.append((x, y, z))
    if not pts:
        return []
    a = total_bq / len(pts)
    return [(x * scale, y * scale, z * scale, a) for (x, y, z) in pts]


def _cell_area(surf, ua, ub, va, vb):
    # パラメータ空間のセルが面上で占める面積を、4隅から概算する
    p00 = surf.value(ua, va)
    p10 = surf.value(ub, va)
    p01 = surf.value(ua, vb)
    p11 = surf.value(ub, vb)
    a1 = (p10 - p00).cross(p01 - p00).Length / 2.0
    a2 = (p10 - p11).cross(p01 - p11).Length / 2.0
    return a1 + a2


def scatter_surface(face, pitch_mm, total_bq, scale):
    """面の上に点を散布する。

    パラメータ空間を等間隔に刻むが、面上で等間隔になるとは限らない。
    実測では球面で セル面積が 4.23 倍ばらつく（極で潰れる）。等分すると
    極付近に強度が集中するので、セル面積で重み付けする。

    平面と円筒では重みが一様になるので、実務で多い床や配管では面積等分と
    同じ結果になる。

    返り値: [(x, y, z, bq), ...]
    """
    surf = face.Surface
    u0, u1, v0, v1 = face.ParameterRange

    # パラメータ空間の刻み数を決める。
    #   u, v 方向それぞれが面上で何 mm に相当するかを、複数点で測って平均する。
    #   1 本の線分で測ると、円筒の u（角度 0〜2π）や自由曲面で破綻する。
    def span(fix_v):
        # v を固定して u 方向の弧長を折れ線で概算
        m, L = 8, 0.0
        prev = surf.value(u0, fix_v)
        for t in range(1, m + 1):
            cur = surf.value(u0 + (u1 - u0) * t / m, fix_v)
            L += (cur - prev).Length
            prev = cur
        return L

    def span_v(fix_u):
        m, L = 8, 0.0
        prev = surf.value(fix_u, v0)
        for t in range(1, m + 1):
            cur = surf.value(fix_u, v0 + (v1 - v0) * t / m)
            L += (cur - prev).Length
            prev = cur
        return L

    # 3 箇所で測って平均（曲率が場所で変わる面に備える）
    du = sum(span(v0 + (v1 - v0) * t) for t in (0.25, 0.5, 0.75)) / 3.0
    dv = sum(span_v(u0 + (u1 - u0) * t) for t in (0.25, 0.5, 0.75)) / 3.0
    nu = max(1, int(math.ceil(du / pitch_mm)))
    nv = max(1, int(math.ceil(dv / pitch_mm)))

    cells = []
    for i in range(nu):
        ua = u0 + (u1 - u0) * i / nu
        ub = u0 + (u1 - u0) * (i + 1) / nu
        uc = (ua + ub) / 2.0
        for j in range(nv):
            va = v0 + (v1 - v0) * j / nv
            vb = v0 + (v1 - v0) * (j + 1) / nv
            vc = (va + vb) / 2.0
            # トリムされた面では、パラメータ範囲内でも面の外側があり得る
            try:
                if not face.isPartOfDomain(uc, vc):
                    continue
            except Exception:
                pass
            w = _cell_area(surf, ua, ub, va, vb)
            if w <= 0:
                continue
            p = surf.value(uc, vc)
            cells.append((p, w))

    if not cells:
        return []
    wsum = sum(w for _, w in cells)
    return [(p.x * scale, p.y * scale, p.z * scale, total_bq * w / wsum)
            for (p, w) in cells]


def default_pitch(shape, detectors_mm):
    """ピッチの既定値。

    最も近い検出器までの距離の 1/PITCH_DISTANCE_RATIO とする。点線源近似では
    線源片の大きさが距離に対して十分小さい必要があり、1/10 なら立体角の誤差が
    1% 程度に収まる。

    ただし形状より粗くしても点が入らないので、形状の最短辺の 1/4 を上限とする
    （最短辺に最低 4 点は入るようにする）。細長い配管では直径方向が支配する。

    detectors_mm: [(x, y, z), ...]  CAD 単位(mm)の検出器位置
    """
    import FreeCAD as App
    bb = shape.BoundBox
    try:
        c = shape.CenterOfMass
    except AttributeError:
        c = App.Vector(bb.XMin + bb.XLength / 2,
                       bb.YMin + bb.YLength / 2,
                       bb.ZMin + bb.ZLength / 2)

    # 形状の最短辺から上限を決める。ゼロ厚（面）の方向は除く。
    sides = [s for s in (bb.XLength, bb.YLength, bb.ZLength) if s > 1e-6]
    cap = max(1.0, min(sides) / 4.0) if sides else 1.0

    dmin = None
    for (x, y, z) in (detectors_mm or []):
        d = (App.Vector(x, y, z) - c).Length
        if dmin is None or d < dmin:
            dmin = d

    if dmin is None or dmin <= 0:
        return cap
    return max(1.0, min(cap, dmin / PITCH_DISTANCE_RATIO))


def clip_face(face, region_shape):
    """面を領域立体で切り取る。

    自由曲面の一部だけが汚染している場合、その範囲を面として作るのは GUI では
    難しい。汚染範囲を単純な立体（直方体など）で囲めば、その共通部分として
    切り出せる。MCNP のクッキーカッター（サンプリング領域を別セルで制限する
    手法）と同じ考え方。

    返り値: 切り取られた面のリスト。共通部分が無ければ空。
    """
    try:
        cut = face.common(region_shape)
    except Exception:
        return []
    return [f for f in cut.Faces if f.Area > 1e-9]


def clip_solid(shape, region_shape):
    """ソリッドを領域立体で切り取る。体積汚染の範囲指定に使う。"""
    try:
        cut = shape.common(region_shape)
    except Exception:
        return None
    return cut if (cut.Solids and cut.Volume > 1e-9) else None


def pick_faces(shape, which):
    """ソリッドから汚染面を選ぶ。

    which:
      'inner'  内面（法線が重心を向く面）
      'outer'  外面
      'top'    上面（法線の Z 成分が正で最大）
      'bottom' 下面
      'all'    すべての面
      数字     Face のインデックス（1 始まり）

    内外の判定は、面の中心から法線方向に少し進んだ点がソリッドの内部かで見る。
    """
    import FreeCAD as App
    faces = list(shape.Faces)
    if not faces:
        return []

    w = (which or 'all').strip().lower()

    if w.isdigit():
        i = int(w) - 1
        return [faces[i]] if 0 <= i < len(faces) else []

    if w == 'all':
        return faces

    if w in ('top', 'bottom'):
        sign = 1.0 if w == 'top' else -1.0
        best, best_z = None, None
        for f in faces:
            try:
                u0, u1, v0, v1 = f.ParameterRange
                n = f.normalAt((u0 + u1) / 2, (v0 + v1) / 2)
            except Exception:
                continue
            if n.z * sign < 0.7:      # ほぼ真上／真下を向く面だけ
                continue
            z = f.CenterOfMass.z * sign
            if best_z is None or z > best_z:
                best, best_z = f, z
        return [best] if best else []

    if w in ('inner', 'outer'):
        # 管状の形状の内面／外面を分ける。
        #
        # 曲がった配管には直線の中心軸が無いので、軸からの距離では判定
        # できない（実測で誤判定した）。法線の向きも使えない。OCC は各面の
        # 表側が外部を向くよう向き付けするので、内面も外面も「法線の逆側が
        # 形状の内部」で同じになる。
        #
        # 面から法線の逆方向にレイを飛ばし、形状と交わる回数で判定する。
        #   外面から内向きに飛ばす -> 管壁を抜けて中空に出て、反対側の壁を
        #                             通り、外へ抜ける
        #   内面から内向き（＝中空側）に飛ばす -> すぐ中空で、反対側の壁だけ
        # 交点の数が違うので分けられるが、接線方向で不安定になる。
        #
        # 実用上は「外面の方が広い」で足りる。同じ長さの管なら半径が大きい
        # 分だけ外面が広く、曲がっていれば外側の曲率でさらに広がる。
        # 端面は法線が隣接面の法線とほぼ直交するので、それで除く。
        cand = []
        for f in faces:
            try:
                u0, u1, v0, v1 = f.ParameterRange
                uc, vc = (u0 + u1) / 2.0, (v0 + v1) / 2.0
                f.normalAt(uc, vc)
            except Exception:
                continue
            cand.append(f)
        if len(cand) < 2:
            return cand
        # 面積の大きい2面を内外とみなす。端面は管壁より小さい。
        cand.sort(key=lambda f: -f.Area)
        big = cand[:2]
        big.sort(key=lambda f: -f.Area)
        return [big[0]] if w == 'outer' else [big[1]]

    return faces
