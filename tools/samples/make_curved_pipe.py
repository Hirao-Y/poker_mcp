"""
記事用サンプル: 曲がった配管の遮蔽評価（改訂版）

論点を整理:
  - 遮蔽体（配管の管壁）は自由曲面。CSG では書けない。
  - 線源（流体）は POKER の立体型に合わせる必要がある。
    -> 配管の経路に沿って小さな円柱を並べ、複数線源として扱う。
       これは実務でも普通のやり方（配管を区間に分けて評価する）。

CAD の利点:
  - 管壁の形状をそのまま使える（継ぎ目の近似が不要）
  - 線源の位置も CAD 上で決められる
"""
import traceback

OUT = r'C:\Users\tora\emev_chk\pipe2_log.txt'
FCS = r'C:\Users\tora\emev_chk\curved_pipe.FCStd'
log = []

try:
    import FreeCAD as App
    import Part

    name = 'curved_pipe'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    def prop(o, n, v, t='App::PropertyString'):
        if not hasattr(o, n):
            o.addProperty(t, n, 'POKER', '')
        setattr(o, n, v)

    # 配管の経路（曲げ加工品。曲率が連続的に変わる）
    path = [
        App.Vector(0, 0, 0),
        App.Vector(0, 0, 300),
        App.Vector(0, 150, 450),
        App.Vector(0, 450, 500),
        App.Vector(0, 750, 400),
        App.Vector(0, 900, 400),
    ]
    bs = Part.BSplineCurve()
    bs.interpolate(path)
    spine = Part.Wire([bs.toShape()])

    def make_pipe(radius):
        d = bs.tangent(bs.FirstParameter)[0]
        prof = Part.Wire(Part.makeCircle(radius, path[0], d).Edges)
        mk = Part.BRepOffsetAPI.MakePipeShell(spine)
        mk.setFrenetMode(True)
        mk.add(prof, True, True)
        mk.build()
        mk.makeSolid()
        return mk.shape()

    # --- 管壁: 自由曲面。これが CAD 連携の要点 ---
    wall = make_pipe(65).cut(make_pipe(50))
    o1 = doc.addObject('Part::Feature', 'PipeWall')
    o1.Shape = wall
    prop(o1, 'PokerMaterial', 'SUS_A')

    # --- 線源: 経路に沿って円柱を並べる（実務でも区間に分けて評価する）---
    n_seg = 5
    p0, p1 = bs.FirstParameter, bs.LastParameter
    for i in range(n_seg):
        t0 = p0 + (p1 - p0) * i / n_seg
        t1 = p0 + (p1 - p0) * (i + 1) / n_seg
        a, b = bs.value(t0), bs.value(t1)
        h = (b - a).Length
        cyl = Part.makeCylinder(50, h, a, (b - a).normalize())
        s = doc.addObject('Part::Feature', 'Fluid%d' % (i + 1))
        s.Shape = cyl
        prop(s, 'PokerRole', 'source')
        prop(s, 'PokerMaterial', 'Water')
        prop(s, 'PokerNuclides', 'Co60:2.0e9')   # 区間あたり

    # --- 遮蔽壁 ---
    o2 = doc.addObject('Part::Feature', 'ConcreteWall')
    o2.Shape = Part.makeBox(300, 1400, 900, App.Vector(200, -200, 0))
    prop(o2, 'PokerMaterial', 'Concrete')

    # --- 検出器 ---
    d1 = doc.addObject('Part::Feature', 'D_behind_wall')
    d1.Shape = Part.makeSphere(20, App.Vector(1500, 400, 400))
    prop(d1, 'PokerRole', 'detector')

    d2 = doc.addObject('Part::Feature', 'D_open_side')
    d2.Shape = Part.makeSphere(20, App.Vector(-1000, 400, 450))
    prop(d2, 'PokerRole', 'detector')

    doc.recompute()
    doc.saveAs(FCS)

    log.append('saved: %s' % FCS)
    for o in doc.Objects:
        sh = o.Shape
        types = {}
        for f in sh.Faces:
            t = type(f.Surface).__name__
            types[t] = types.get(t, 0) + 1
        log.append('  %-14s role=%-9s mat=%-10s V=%8.1f  %s' % (
            o.Name, getattr(o, 'PokerRole', 'shield'),
            getattr(o, 'PokerMaterial', '-'), sh.Volume / 1e3,
            ', '.join('%s x%d' % (k, v) for k, v in types.items())))
except BaseException:
    log.append(traceback.format_exc())

open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
