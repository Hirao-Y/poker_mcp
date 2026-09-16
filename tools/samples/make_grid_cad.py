import traceback
OUT = r'C:\Users\tora\emev_chk\grid_log.txt'
log = []
try:
    import FreeCAD as App
    import Part

    name = 'grid_cad'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    def prop(o, n, v, t='App::PropertyString'):
        if not hasattr(o, n):
            o.addProperty(t, n, 'POKER', '')
        setattr(o, n, v)

    # 遮蔽体
    o1 = doc.addObject('Part::Feature', 'Shield')
    o1.Shape = Part.makeBox(600, 600, 400, App.Vector(-300, -300, 0))
    prop(o1, 'PokerMaterial', 'Iron')

    # 線源
    src = doc.addObject('Part::Feature', 'Src')
    src.Shape = Part.makeSphere(10, App.Vector(0, 0, 200))
    prop(src, 'PokerRole', 'source')
    prop(src, 'PokerNuclides', 'Co60:3.7e10')

    # 検出器1: 点（球）
    d1 = doc.addObject('Part::Feature', 'D_point')
    d1.Shape = Part.makeSphere(20, App.Vector(1000, 0, 200))
    prop(d1, 'PokerRole', 'detector')

    # 検出器2: 薄い平板 -> 2D グリッドになるはず
    d2 = doc.addObject('Part::Feature', 'D_plane')
    d2.Shape = Part.makeBox(1200, 1200, 10, App.Vector(-600, -600, 500))
    prop(d2, 'PokerRole', 'detector')
    prop(d2, 'PokerDivision', '4 4')

    # 検出器3: 直方体 -> 3D グリッドになるはず
    d3 = doc.addObject('Part::Feature', 'D_volume')
    d3.Shape = Part.makeBox(400, 400, 400, App.Vector(700, -200, 100))
    prop(d3, 'PokerRole', 'detector')
    prop(d3, 'PokerDivision', '3 3 3')

    doc.recompute()
    doc.saveAs(r'C:\Users\tora\emev_chk\grid_cad.FCStd')
    log.append('saved')
except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
