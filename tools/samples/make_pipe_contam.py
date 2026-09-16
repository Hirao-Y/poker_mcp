import traceback
OUT = r'C:\Users\tora\emev_chk\pipe3_log.txt'
FCS = r'C:\Users\tora\emev_chk\pipe_contam.FCStd'
log = []
try:
    import FreeCAD as App
    import Part

    name = 'pipe_contam'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    def prop(o, n, v, t='App::PropertyString'):
        if not hasattr(o, n):
            o.addProperty(t, n, 'POKER', '')
        setattr(o, n, v)

    def make_pipe(radius, pts):
        bs = Part.BSplineCurve()
        bs.interpolate(pts)
        spine = Part.Wire([bs.toShape()])
        d = bs.tangent(bs.FirstParameter)[0]
        prof = Part.Wire(Part.makeCircle(radius, pts[0], d).Edges)
        mk = Part.BRepOffsetAPI.MakePipeShell(spine)
        mk.setFrenetMode(True); mk.add(prof, True, True); mk.build(); mk.makeSolid()
        return mk.shape()

    path = [App.Vector(0, 0, 0), App.Vector(0, 0, 300),
            App.Vector(0, 150, 450), App.Vector(0, 450, 500)]

    # 管壁: 内面・外面に汚染。遮蔽体でもある
    wall = doc.addObject('Part::Feature', 'PipeWall')
    wall.Shape = make_pipe(65, path).cut(make_pipe(50, path))
    prop(wall, 'PokerRole', 'source')
    prop(wall, 'PokerMaterial', 'SUS_A')
    prop(wall, 'PokerInnerNuclides', 'Cs137:1.0e4, Co60:2.0e3')
    prop(wall, 'PokerOuterNuclides', 'Cs137:5.0e2')
    prop(wall, 'PokerPointSpacing', '80')

    # 流体: 体積汚染（組成比 + 総濃度）
    fluid = doc.addObject('Part::Feature', 'Fluid')
    fluid.Shape = make_pipe(50, path)
    prop(fluid, 'PokerRole', 'source')
    prop(fluid, 'PokerSourceType', 'volume')
    prop(fluid, 'PokerMaterial', 'Water')
    prop(fluid, 'PokerComposition', 'Cs137:5, Co60:1')
    prop(fluid, 'PokerConcentration', '1.2e5')
    prop(fluid, 'PokerPointSpacing', '80')

    # 遮蔽壁
    o2 = doc.addObject('Part::Feature', 'ConcreteWall')
    o2.Shape = Part.makeBox(300, 1400, 900, App.Vector(200, -200, 0))
    prop(o2, 'PokerMaterial', 'Concrete')

    # 検出器
    d1 = doc.addObject('Part::Feature', 'D_behind')
    d1.Shape = Part.makeSphere(20, App.Vector(1500, 400, 400))
    prop(d1, 'PokerRole', 'detector')
    d2 = doc.addObject('Part::Feature', 'D_open')
    d2.Shape = Part.makeSphere(20, App.Vector(-1000, 400, 450))
    prop(d2, 'PokerRole', 'detector')

    doc.recompute()
    doc.saveAs(FCS)
    log.append('saved: %s' % FCS)
except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
