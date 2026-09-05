# make_cask_models.py -- build the detailed (B-rep) and simplified (CSG-able)
# cask models used to exercise the mfp audit.
#
#   freecadcmd -c "import sys; sys.path.insert(0, r'<tools>'); \
#                  import make_cask_models as m; m.build_both(r'<outdir>')"
#
# The only difference is a 40 mm fillet on the lid's outer top edge: a local
# B-rep feature that POKER's RCC/RPP primitives cannot express.
import os

import FreeCAD as App
import Part

R_CAV, R_GAM, R_POL, R_OUT = 750.0, 1150.0, 1250.0, 1280.0
H_BOT, H_CAV, H_LID = 300.0, 4000.0, 350.0
Z_BOT, Z_CAV, Z_LID, Z_TOP = 0.0, 300.0, 4300.0, 4650.0
FILLET_R = 40.0

PARTS = [
    ("Bottom_Iron", "Iron"),
    ("Source_Dry", "Source_Dry"),
    ("GammaShield_Iron", "Iron"),
    ("NeutronShield_Poly", "Polyethylene"),
    ("OuterShell_Iron", "Iron"),
    ("Lid_Iron", "Iron"),
]


def _annulus(ri, ro, z, h):
    return Part.makeCylinder(ro, h, App.Vector(0, 0, z)).cut(
        Part.makeCylinder(ri, h + 2.0, App.Vector(0, 0, z - 1.0)))


def _lid(fillet):
    lid = Part.makeCylinder(R_OUT, H_LID, App.Vector(0, 0, Z_LID))
    if not fillet:
        return lid, 0
    tgt = []
    for e in lid.Edges:
        try:
            if (abs(e.Curve.Radius - R_OUT) < 1e-6
                    and abs(e.CenterOfMass.z - Z_TOP) < 1e-6):
                tgt.append(e)
        except Exception:
            pass
    return (lid.makeFillet(FILLET_R, tgt) if tgt else lid), len(tgt)


def build(path, fillet=True, name=None):
    name = name or os.path.splitext(os.path.basename(path))[0]
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)
    lid, nfil = _lid(fillet)
    shapes = {
        "Bottom_Iron": Part.makeCylinder(R_OUT, H_BOT, App.Vector(0, 0, Z_BOT)),
        "Source_Dry": Part.makeCylinder(R_CAV, H_CAV, App.Vector(0, 0, Z_CAV)),
        "GammaShield_Iron": _annulus(R_CAV, R_GAM, Z_CAV, H_CAV),
        "NeutronShield_Poly": _annulus(R_GAM, R_POL, Z_CAV, H_CAV),
        "OuterShell_Iron": _annulus(R_POL, R_OUT, Z_CAV, H_CAV),
        "Lid_Iron": lid,
    }
    vol = 0.0
    for obj_name, mat in PARTS:
        o = doc.addObject("Part::Feature", obj_name)
        o.Shape = shapes[obj_name]
        o.addProperty("App::PropertyString", "PokerMaterial", "POKER",
                      "POKER material name")
        o.PokerMaterial = mat
        vol += o.Shape.Volume
    doc.recompute()
    doc.saveAs(path)
    return {"path": path, "fillet_edges": nfil, "volume_cm3": vol / 1e3}


def build_penetration(path, r_hole=50.0, r_pos=400.0, name="cask_penetration",
                      fill=None):
    # 蓋を貫通する配管孔を持つモデル。fill に材質名を与えると、孔を塞ぐ栓を
    # その材質で追加する（充填材の扱いを比較するため）。fill=None は空洞。
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)
    lid, _ = _lid(False)
    hole = Part.makeCylinder(r_hole, H_LID + 20.0, App.Vector(r_pos, 0, Z_LID - 10.0))
    lid = lid.cut(hole)
    shapes = {
        "Bottom_Iron": Part.makeCylinder(R_OUT, H_BOT, App.Vector(0, 0, Z_BOT)),
        "Source_Dry": Part.makeCylinder(R_CAV, H_CAV, App.Vector(0, 0, Z_CAV)),
        "GammaShield_Iron": _annulus(R_CAV, R_GAM, Z_CAV, H_CAV),
        "NeutronShield_Poly": _annulus(R_GAM, R_POL, Z_CAV, H_CAV),
        "OuterShell_Iron": _annulus(R_POL, R_OUT, Z_CAV, H_CAV),
        "Lid_Iron": lid,
    }
    parts = list(PARTS)
    if fill:
        shapes["Plug_Fill"] = Part.makeCylinder(
            r_hole, H_LID, App.Vector(r_pos, 0, Z_LID))
        parts.append(("Plug_Fill", fill))
    for obj_name, mat in parts:
        o = doc.addObject("Part::Feature", obj_name)
        o.Shape = shapes[obj_name]
        o.addProperty("App::PropertyString", "PokerMaterial", "POKER",
                      "POKER material name")
        o.PokerMaterial = mat
    doc.recompute()
    doc.saveAs(path)
    return {"path": path, "hole_radius_mm": r_hole, "hole_center_r_mm": r_pos,
            "fill": fill or "VOID"}


def build_both(outdir):
    a = build(os.path.join(outdir, "cask_detailed.FCStd"), True, "cask_detailed")
    b = build(os.path.join(outdir, "cask_simple.FCStd"), False, "cask_simple")
    a["note"] = "B-rep, lid rim filleted R%.0f" % FILLET_R
    b["note"] = "CSG-able, sharp lid rim"
    b["volume_diff_cm3"] = b["volume_cm3"] - a["volume_cm3"]
    print(a)
    print(b)
    return a, b
