"""
記事用の最小サンプル: 鉄の箱にフィレットを付けた遮蔽体。

CSG（円柱や直方体の組み合わせ）では表現しにくい「角を丸めた形状」を
あえて使い、CAD 連携の利点が分かるようにする。

    freecadcmd make_sample.py

で C:/Users/yoshi/Desktop/sample_shield.FCStd を作る。
"""
import traceback

OUT = r'C:\Users\yoshi\Desktop\sample_shield.FCStd'
LOG = r'C:\Users\yoshi\poker_verify\make_sample_log.txt'

log = []
try:
    import FreeCAD as App
    import Part

    name = 'sample_shield'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    # 鉄の遮蔽箱（外寸 60x60x40 cm）。角を R5cm でフィレット。
    # FreeCAD は mm 単位なので 10 倍で作る。
    box = Part.makeBox(600, 600, 400, App.Vector(-300, -300, 0))
    box = box.makeFillet(50, box.Edges)

    # 内部の空洞（40x40x20 cm）。ここに線源を置く。
    cavity = Part.makeBox(400, 400, 200, App.Vector(-200, -200, 100))

    shield = box.cut(cavity)

    o1 = doc.addObject('Part::Feature', 'Shield')
    o1.Shape = shield
    o1.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', '材質')
    o1.PokerMaterial = 'Iron'

    o2 = doc.addObject('Part::Feature', 'Cavity')
    o2.Shape = cavity
    o2.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', '材質')
    o2.PokerMaterial = 'Air'

    doc.recompute()
    doc.saveAs(OUT)

    log.append('OK: ' + OUT)
    for o in doc.Objects:
        log.append('  %-8s %-6s V=%9.1f cm3  faces=%d' %
                   (o.Name, o.PokerMaterial, o.Shape.Volume / 1e3, len(o.Shape.Faces)))
except BaseException:
    log.append(traceback.format_exc())

open(LOG, 'w', encoding='utf-8').write('\n'.join(log))
