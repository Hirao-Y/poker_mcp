import sys, traceback
sys.path.insert(0, r'C:\Users\tora\poker_mcp_github\tools')
OUT = r'C:\Users\tora\emev_chk\scatter_test.txt'
log = []
try:
    import FreeCAD as App
    import Part
    import scatter

    SCALE = 0.1   # mm -> cm

    log.append('=== 体積汚染: 総量保存の確認 ===')
    # 曲がった配管の内部空間
    bs = Part.BSplineCurve()
    bs.interpolate([App.Vector(0,0,0), App.Vector(0,0,300),
                    App.Vector(0,150,450), App.Vector(0,450,500)])
    spine = Part.Wire([bs.toShape()])
    d = bs.tangent(bs.FirstParameter)[0]
    prof = Part.Wire(Part.makeCircle(50, App.Vector(0,0,0), d).Edges)
    mk = Part.BRepOffsetAPI.MakePipeShell(spine)
    mk.setFrenetMode(True); mk.add(prof, True, True); mk.build(); mk.makeSolid()
    pipe = mk.shape()

    vol_cm3 = pipe.Volume * (SCALE ** 3)
    conc = 1.0e6                       # Bq/cm3
    total = conc * vol_cm3
    log.append('  体積: %.1f cm3' % vol_cm3)
    log.append('  汚染密度: %.3g Bq/cm3 -> 総放射能 %.4g Bq' % (conc, total))
    for pitch in (40, 20, 10):
        pts = scatter.scatter_volume(pipe, pitch, total, SCALE)
        s = sum(p[3] for p in pts)
        log.append('  ピッチ %2d mm: %5d 点  合計 %.4g Bq  誤差 %.2e' %
                   (pitch, len(pts), s, abs(s - total) / total))

    log.append('')
    log.append('=== 表面汚染: 面積重み付けの効果 ===')

    def surf_check(label, face):
        area_cm2 = face.Area * (SCALE ** 2)
        c2 = 1.0e4                     # Bq/cm2
        tot = c2 * area_cm2
        pts = scatter.scatter_surface(face, 100, tot, SCALE)
        s = sum(p[3] for p in pts)
        bq = [p[3] for p in pts]
        log.append('  %s' % label)
        log.append('    面積 %.1f cm2 -> 総量 %.4g Bq' % (area_cm2, tot))
        log.append('    %d 点  合計 %.4g Bq  誤差 %.2e' % (len(pts), s, abs(s-tot)/tot))
        if bq:
            log.append('    1点あたり: 最小 %.3g  最大 %.3g  比 %.2f' %
                       (min(bq), max(bq), max(bq)/min(bq)))

    surf_check('床（平面 2m x 3m）', Part.makePlane(2000, 3000).Faces[0])
    cyl = Part.makeCylinder(100, 500)
    for f in cyl.Faces:
        if type(f.Surface).__name__ == 'Cylinder':
            surf_check('配管内面（円筒）', f); break
    surf_check('球面（極で潰れる）', Part.makeSphere(100).Faces[0])
    for f in mk.shape().Faces:
        if type(f.Surface).__name__ == 'BSplineSurface':
            surf_check('曲がった配管の内面（自由曲面）', f); break

    log.append('')
    log.append('=== ピッチの既定値 ===')
    for label, det in [('検出器 1m', [(1000, 0, 250)]),
                       ('検出器 3m', [(3000, 0, 250)]),
                       ('検出器なし', [])]:
        try:
            p = scatter.default_pitch(pipe, det)
        except Exception as e:
            log.append('  %-12s -> エラー: %s' % (label, e)); continue
        n = len(scatter.scatter_volume(pipe, p, total, SCALE))
        log.append('  %-12s -> ピッチ %.1f mm  %d 点' % (label, p, n))

except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
