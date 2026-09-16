import sys, traceback
sys.path.insert(0, r'C:\Users\tora\poker_mcp_github\tools')
OUT = r'C:\Users\tora\emev_chk\io_curved.txt'
log = []
try:
    import FreeCAD as App
    import Part
    import scatter

    def make_pipe(radius, pts):
        bs = Part.BSplineCurve()
        bs.interpolate(pts)
        spine = Part.Wire([bs.toShape()])
        d = bs.tangent(bs.FirstParameter)[0]
        prof = Part.Wire(Part.makeCircle(radius, pts[0], d).Edges)
        mk = Part.BRepOffsetAPI.MakePipeShell(spine)
        mk.setFrenetMode(True)
        mk.add(prof, True, True)
        mk.build()
        mk.makeSolid()
        return mk.shape()

    path = [App.Vector(0, 0, 0), App.Vector(0, 0, 300),
            App.Vector(0, 150, 450), App.Vector(0, 450, 500)]
    wall = make_pipe(65, path).cut(make_pipe(50, path))

    log.append('曲がった配管の管壁: faces=%d' % len(wall.Faces))
    for i, f in enumerate(wall.Faces):
        log.append('  Face%d: %.0f cm2  %s' %
                   (i + 1, f.Area / 100, type(f.Surface).__name__))
    log.append('')
    for w in ('inner', 'outer'):
        fs = scatter.pick_faces(wall, w)
        tot = sum(f.Area for f in fs) / 100
        log.append('  %-7s -> %d 面  合計 %.0f cm2' % (w, len(fs), tot))

    # 内面に汚染を散布
    log.append('')
    SCALE = 0.1
    conc = 1.0e4
    inner_faces = scatter.pick_faces(wall, 'inner')
    pts = []
    for f in inner_faces:
        a = f.Area * (SCALE ** 2)
        pts += scatter.scatter_surface(f, 50, conc * a, SCALE)
    tot_a = sum(f.Area for f in inner_faces) * (SCALE ** 2)
    want = conc * tot_a
    got = sum(p[3] for p in pts)
    log.append('  内面汚染 %.3g Bq/cm2 x %.1f cm2 = %.4g Bq' % (conc, tot_a, want))
    log.append('  散布: %d 点  合計 %.4g Bq  誤差 %.2e' %
               (len(pts), got, abs(got - want) / want))
except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
