import sys, traceback
out = r'C:\Users\yoshi\poker_verify\mk_curved_log.txt'
log = []
try:
    import FreeCAD as App
    import Part

    name = 'curved_test'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    # 球殻（内径 50 cm, 外径 70 cm）の鉄。mm 単位なので 10 倍。
    # 中心に点線源を置き、球面を通る経路を作る。
    outer = Part.makeSphere(700)
    inner = Part.makeSphere(500)
    shell = outer.cut(inner)
    o1 = doc.addObject('Part::Feature', 'Sphere_Iron')
    o1.Shape = shell
    o1.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', 'mat')
    o1.PokerMaterial = 'Iron'

    # 外側に、角を大きく丸めた箱（フィレット R100mm）。複曲面の検証用。
    box = Part.makeBox(1600, 1600, 400, App.Vector(-800, -800, 900))
    box = box.makeFillet(100, box.Edges)
    o2 = doc.addObject('Part::Feature', 'Fillet_Poly')
    o2.Shape = box
    o2.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', 'mat')
    o2.PokerMaterial = 'Polyethylene'

    doc.recompute()
    doc.saveAs(r'C:\Users\yoshi\Desktop\curved_test.FCStd')
    log.append('OK')
    for o in doc.Objects:
        log.append('  %-14s V=%12.1f cm3  faces=%d' %
                   (o.Name, o.Shape.Volume / 1e3, len(o.Shape.Faces)))
except BaseException:
    log.append(traceback.format_exc())
open(out, 'w', encoding='utf-8').write('\n'.join(log))
