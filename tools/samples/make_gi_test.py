import traceback
OUT = r'C:\Users\tora\emev_chk\gi_test.txt'
log = []
try:
    import FreeCAD as App
    import Part

    name = 'gi_test'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    def prop(o, n, v, t='App::PropertyString'):
        if not hasattr(o, n):
            o.addProperty(t, n, 'POKER', '')
        setattr(o, n, v)

    # --- 遮蔽体: 鉄の箱（角を丸める）---
    box = Part.makeBox(600, 600, 400, App.Vector(-300, -300, 0))
    box = box.makeFillet(50, box.Edges)
    cav = Part.makeBox(400, 400, 200, App.Vector(-200, -200, 100))
    o1 = doc.addObject('Part::Feature', 'Shield')
    o1.Shape = box.cut(cav)
    prop(o1, 'PokerMaterial', 'Iron')

    o2 = doc.addObject('Part::Feature', 'Cavity')
    o2.Shape = cav
    prop(o2, 'PokerMaterial', 'Air')

    # --- 線源: 円柱（体積線源）---
    src = doc.addObject('Part::Feature', 'FuelRod')
    src.Shape = Part.makeCylinder(80, 150, App.Vector(0, 0, 120))
    prop(src, 'PokerRole', 'source')
    prop(src, 'PokerNuclides', 'Cs137:1.0e13, Co60:5.0e11')
    prop(src, 'PokerDivision', '3 6 8')

    # --- 検出器: 点 2 つ ---
    d1 = doc.addObject('Part::Feature', 'D_top')
    d1.Shape = Part.makeSphere(20, App.Vector(0, 0, 1400))
    prop(d1, 'PokerRole', 'detector')

    d2 = doc.addObject('Part::Feature', 'D_side')
    d2.Shape = Part.makeSphere(20, App.Vector(1300, 0, 200))
    prop(d2, 'PokerRole', 'detector')
    prop(d2, 'PokerShowPathTrace', True, 'App::PropertyBool')

    doc.recompute()
    doc.saveAs(r'C:\Users\tora\emev_chk\gi_test.FCStd')
    log.append('saved: %d objects' % len(doc.Objects))
    for o in doc.Objects:
        log.append('  %-10s role=%-9s mat=%s' % (
            o.Name, getattr(o, 'PokerRole', 'shield'),
            getattr(o, 'PokerMaterial', '-')))
except BaseException:
    log.append(traceback.format_exc())
open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
