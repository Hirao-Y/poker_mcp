import sys, traceback
sys.path.insert(0, r'C:\Users\tora\poker_mcp_github\tools')
OUT = r'C:\Users\tora\emev_chk\pick_test.txt'
log = []
try:
    import FreeCAD as App
    import Part
    import scatter

    log.append('=== 面の選択 (pick_faces) ===')

    # 配管（管壁）: 内面と外面がある
    outer = Part.makeCylinder(65, 500)
    inner = Part.makeCylinder(50, 500)
    wall = outer.cut(inner)
    log.append('配管の管壁: faces=%d' % len(wall.Faces))
    for w in ('inner', 'outer', 'top', 'bottom', 'all'):
        fs = scatter.pick_faces(wall, w)
        areas = ['%.0f' % (f.Area / 100) for f in fs]
        log.append('  %-7s -> %d 面  面積 %s cm2' % (w, len(fs), ','.join(areas)))

    log.append('')
    # 部屋（床・壁・天井）
    room = Part.makeBox(4000, 3000, 2500)
    log.append('部屋: faces=%d' % len(room.Faces))
    for w in ('top', 'bottom', '5'):
        fs = scatter.pick_faces(room, w)
        for f in fs:
            c = f.CenterOfMass
            log.append('  %-7s -> 面積 %.0f cm2  中心 z=%.0f' % (w, f.Area / 100, c.z))

    log.append('')
    log.append('=== 範囲制限 (clip_face) ===')
    # 曲がった配管
    bs = Part.BSplineCurve()
    bs.interpolate([App.Vector(0,0,0), App.Vector(0,0,300),
                    App.Vector(0,150,450), App.Vector(0,450,500)])
    spine = Part.Wire([bs.toShape()])
    d = bs.tangent(bs.FirstParameter)[0]
    prof = Part.Wire(Part.makeCircle(50, App.Vector(0,0,0), d).Edges)
    mk = Part.BRepOffsetAPI.MakePipeShell(spine)
    mk.setFrenetMode(True); mk.add(prof, True, True); mk.build(); mk.makeSolid()
    pipe = mk.shape()
    face = [f for f in pipe.Faces if type(f.Surface).__name__ == 'BSplineSurface'][0]
    log.append('配管内面 全体: %.1f cm2' % (face.Area / 100))

    box = Part.makeBox(300, 300, 200, App.Vector(-150, 100, 350))
    clipped = scatter.clip_face(face, box)
    tot = sum(f.Area for f in clipped)
    log.append('  箱で制限: %d 面  %.1f cm2 (全体の %.0f%%)' %
               (len(clipped), tot / 100, 100 * tot / face.Area))

    # 制限した面に点を散布
    SCALE = 0.1
    conc = 1.0e4
    total = conc * tot * (SCALE ** 2)
    pts = []
    for f in clipped:
        pts += scatter.scatter_surface(f, 50, conc * f.Area * (SCALE**2), SCALE)
    s = sum(p[3] for p in pts)
    log.append('  散布: %d 点  合計 %.4g Bq (指定 %.4g Bq, 誤差 %.2e)' %
               (len(pts), s, total, abs(s - total) / total))

    log.append('')
    log.append('=== 体積の範囲制限 (clip_solid) ===')
    sub = scatter.clip_solid(pipe, box)
    if sub:
        log.append('  配管 ∩ 箱: %.1f cm3 (全体 %.1f cm3 の %.0f%%)' %
                   (sub.Volume * SCALE**3, pipe.Volume * SCALE**3,
                    100 * sub.Volume / pipe.Volume))
    else:
        log.append('  共通部分なし')

except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
