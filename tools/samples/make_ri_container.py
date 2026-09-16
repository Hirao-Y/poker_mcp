"""
記事用サンプル: RI 貯蔵容器

前回の記事（角を丸めた鉄の箱）は「形状の簡略化が線量を変える」話だった。
今回は「CAD だけで完結する」ことを示したいので、
  - 線源も検出器も CAD 上に置く
  - 材質・核種・分割数をプロパティで指定する
  - YAML は一切書かない
という構成にする。

Cs-137 を入れた鉛遮蔽の貯蔵容器。子孫核種（Ba137m）を忘れると線量が 1/3 に
なることも示せる。
"""
import traceback

OUT = r'C:\Users\tora\emev_chk\article_log.txt'
FCS = r'C:\Users\tora\emev_chk\ri_container.FCStd'
log = []

try:
    import FreeCAD as App
    import Part

    name = 'ri_container'
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)

    def prop(o, n, v, t='App::PropertyString'):
        if not hasattr(o, n):
            o.addProperty(t, n, 'POKER', '')
        setattr(o, n, v)

    # --- 遮蔽容器: 鉛の円筒（角を丸める）---
    #   外径 40cm, 高さ 50cm, 鉛厚 5cm
    outer = Part.makeCylinder(200, 500)
    outer = outer.makeFillet(20, [e for e in outer.Edges])
    cavity = Part.makeCylinder(150, 400, App.Vector(0, 0, 50))
    shield = outer.cut(cavity)

    o1 = doc.addObject('Part::Feature', 'LeadShield')
    o1.Shape = shield
    prop(o1, 'PokerMaterial', 'Lead')

    o2 = doc.addObject('Part::Feature', 'Cavity')
    o2.Shape = cavity
    prop(o2, 'PokerMaterial', 'Air')

    # --- 線源: 中央の円柱（Cs-137）---
    src = doc.addObject('Part::Feature', 'Cs137Source')
    src.Shape = Part.makeCylinder(100, 300, App.Vector(0, 0, 100))
    prop(src, 'PokerRole', 'source')
    prop(src, 'PokerMaterial', 'Water')          # 線源母材（自己遮蔽）
    prop(src, 'PokerNuclides', 'Cs137:3.7e11')   # 10 Ci

    # --- 検出器 ---
    d1 = doc.addObject('Part::Feature', 'D_side_1m')
    d1.Shape = Part.makeSphere(20, App.Vector(1200, 0, 250))
    prop(d1, 'PokerRole', 'detector')

    d2 = doc.addObject('Part::Feature', 'D_top_1m')
    d2.Shape = Part.makeSphere(20, App.Vector(0, 0, 1500))
    prop(d2, 'PokerRole', 'detector')

    # 面線量マップ（薄い平板 -> 2D グリッド）
    d3 = doc.addObject('Part::Feature', 'D_surface_map')
    d3.Shape = Part.makeBox(600, 600, 10, App.Vector(-300, -300, 520))
    prop(d3, 'PokerRole', 'detector')
    prop(d3, 'PokerDivision', '5 5')

    doc.recompute()
    doc.saveAs(FCS)

    log.append('saved: %s' % FCS)
    for o in doc.Objects:
        r = getattr(o, 'PokerRole', 'shield')
        m = getattr(o, 'PokerMaterial', '-')
        log.append('  %-16s role=%-9s mat=%-8s V=%9.1f cm3 faces=%d' % (
            o.Name, r, m, o.Shape.Volume / 1e3, len(o.Shape.Faces)))
except BaseException:
    log.append(traceback.format_exc())

open(OUT, 'w', encoding='utf-8').write('\n'.join(log))
