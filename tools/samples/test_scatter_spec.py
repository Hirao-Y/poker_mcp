import sys, traceback
sys.path.insert(0, r'C:\Users\tora\poker_mcp_github\tools')
OUT = r'C:\Users\tora\emev_chk\spec_test.txt'
log = []
try:
    import FreeCAD as App
    import Part
    import scatter

    SCALE = 0.1
    doc = App.newDocument('spectest')

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

    path = [App.Vector(0,0,0), App.Vector(0,0,300),
            App.Vector(0,150,450), App.Vector(0,450,500)]

    # 管壁: 内面と外面に別々の汚染
    wall = doc.addObject('Part::Feature', 'PipeWall')
    wall.Shape = make_pipe(65, path).cut(make_pipe(50, path))
    prop(wall, 'PokerRole', 'source')
    prop(wall, 'PokerInnerNuclides', 'Cs137:1.0e4, Co60:2.0e3')   # Bq/cm2
    prop(wall, 'PokerOuterNuclides', 'Cs137:5.0e2')               # Bq/cm2
    prop(wall, 'PokerPointSpacing', '60')

    # 流体: 組成比 + 総濃度
    fluid = doc.addObject('Part::Feature', 'Fluid')
    fluid.Shape = make_pipe(50, path)
    prop(fluid, 'PokerRole', 'source')
    prop(fluid, 'PokerSourceType', 'volume')
    prop(fluid, 'PokerComposition', 'Cs137:5, Co60:1')
    prop(fluid, 'PokerConcentration', '1.2e5')                    # Bq/cm3
    prop(fluid, 'PokerPointSpacing', '60')

    doc.recompute()

    dets = [(1500, 400, 400)]
    for o in (wall, fluid):
        warn = []
        srcs = scatter.build_scatter_sources(o, doc, SCALE, dets, warn)
        log.append('=== %s ===' % o.Name)
        for s in srcs:
            log.append('  %-22s %4d 点  総量 %.4g Bq' %
                       (s['name'], s['pitch_points'], s['total_bq']))
            # 核種ごとの合計を検算
            tot = {}
            for (x, y, z, inv) in s['points']:
                for nu, bq in inv:
                    tot[nu] = tot.get(nu, 0.0) + bq
            for nu in sorted(tot):
                log.append('      %-8s %.4g Bq' % (nu, tot[nu]))
        for w in warn:
            log.append('  [警告] %s' % w)
        log.append('')

    # 検算
    log.append('=== 検算 ===')
    inner = scatter.pick_faces(wall.Shape, 'inner')
    outer = scatter.pick_faces(wall.Shape, 'outer')
    ai = sum(f.Area for f in inner) * SCALE**2
    ao = sum(f.Area for f in outer) * SCALE**2
    log.append('  内面 %.1f cm2 x Cs137 1e4 = %.4g Bq' % (ai, ai*1.0e4))
    log.append('  内面 %.1f cm2 x Co60  2e3 = %.4g Bq' % (ai, ai*2.0e3))
    log.append('  外面 %.1f cm2 x Cs137 5e2 = %.4g Bq' % (ao, ao*5.0e2))
    v = fluid.Shape.Volume * SCALE**3
    log.append('  流体 %.1f cm3 x 1.2e5 = %.4g Bq (Cs137 5/6, Co60 1/6)' % (v, v*1.2e5))
    log.append('    Cs137 %.4g, Co60 %.4g' % (v*1.2e5*5/6, v*1.2e5*1/6))

except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
