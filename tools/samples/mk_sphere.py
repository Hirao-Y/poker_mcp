import traceback
out = r'C:\Users\yoshi\poker_verify\mk_sphere_log.txt'
log = []
try:
    import FreeCAD as App
    import Part
    name = 'sphere_only'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)
    shell = Part.makeSphere(700).cut(Part.makeSphere(500))
    o = doc.addObject('Part::Feature', 'SHELL')
    o.Shape = shell
    o.addProperty('App::PropertyString', 'PokerMaterial', 'POKER', 'mat')
    o.PokerMaterial = 'Iron'
    doc.recompute()
    doc.saveAs(r'C:\Users\yoshi\Desktop\sphere_only.FCStd')
    log.append('OK  V=%.1f cm3  faces=%d' % (o.Shape.Volume / 1e3, len(o.Shape.Faces)))
    # 解析解との比較用: 球殻の体積 4/3 pi (70^3 - 50^3)
    import math
    exact = 4.0 / 3.0 * math.pi * (70 ** 3 - 50 ** 3)
    log.append('exact V=%.1f cm3  diff=%.4f%%' %
               (exact, 100 * (o.Shape.Volume / 1e3 - exact) / exact))
except BaseException:
    log.append(traceback.format_exc())
open(out, 'w', encoding='utf-8').write('\n'.join(log))
