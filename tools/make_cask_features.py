# make_cask_features.py -- 伝熱フィンと吊上げトラニオンを持つキャスクモデル。
#
# フィンは「無視してよいか」ではなく「平均化してよいか」を問う題材。実務では
# フィン領域を鉄と空気の体積比で薄めた等価円筒殻に置き換える（スミアリング）。
# 同じ組成のまま密度だけ下げるので、POKER 側はゾーンの density 上書きで表現でき、
# 新しい材料の登録は不要。CAD 側では PokerDensity プロパティで指定する。
#
# スミアリングは方向依存の近似である。フィンを横切る方向のレイは板と隙間を
# 交互に通るので平均密度でよく合うが、フィンに沿う方向は板の中を延々と通るか
# 隙間を延々と抜けるかの両極端になり、平均では表せない。
import math
import os

import FreeCAD as App
import Part

from make_cask_models import (R_CAV, R_GAM, R_POL, R_OUT, H_BOT, H_CAV, H_LID,
                              Z_BOT, Z_CAV, Z_LID, PARTS, _annulus, _lid)

# フィン諸元 (mm)
FIN_N = 48
FIN_T = 6.0          # 厚さ
FIN_H = 60.0         # 突出長
FIN_Z0 = 600.0       # 下端
FIN_Z1 = 4000.0      # 上端

# トラニオン諸元 (mm)
TRU_N = 4            # 個数（周方向 90 度おき）
TRU_R = 90.0         # 半径
TRU_L = 180.0        # 突出長
TRU_Z = 3900.0       # 取付高さ


def _base_shapes():
    lid, _ = _lid(False)
    return {
        "Bottom_Iron": Part.makeCylinder(R_OUT, H_BOT, App.Vector(0, 0, Z_BOT)),
        "Source_Dry": Part.makeCylinder(R_CAV, H_CAV, App.Vector(0, 0, Z_CAV)),
        "GammaShield_Iron": _annulus(R_CAV, R_GAM, Z_CAV, H_CAV),
        "NeutronShield_Poly": _annulus(R_GAM, R_POL, Z_CAV, H_CAV),
        "OuterShell_Iron": _annulus(R_POL, R_OUT, Z_CAV, H_CAV),
        "Lid_Iron": lid,
    }


def _add(doc, name, shape, mat, density=None):
    o = doc.addObject("Part::Feature", name)
    o.Shape = shape
    o.addProperty("App::PropertyString", "PokerMaterial", "POKER", "material")
    o.PokerMaterial = mat
    if density:
        o.addProperty("App::PropertyFloat", "PokerDensity", "POKER",
                      "density override [g/cm3]")
        o.PokerDensity = density
    return o


def _fins():
    # 半径方向に伸びる薄板を周方向に等間隔で配置し、1 つの形状に統合する
    h = FIN_Z1 - FIN_Z0
    fins = []
    for i in range(FIN_N):
        a = 2.0 * math.pi * i / FIN_N
        blade = Part.makeBox(FIN_H, FIN_T, h,
                             App.Vector(R_OUT, -FIN_T / 2.0, FIN_Z0))
        blade.rotate(App.Vector(0, 0, 0), App.Vector(0, 0, 1), math.degrees(a))
        fins.append(blade)
    shape = fins[0]
    for b in fins[1:]:
        shape = shape.fuse(b)
    return shape.removeSplitter()


def _trunnions():
    out = []
    for i in range(TRU_N):
        a = 2.0 * math.pi * i / TRU_N
        cyl = Part.makeCylinder(TRU_R, TRU_L, App.Vector(R_OUT, 0, TRU_Z),
                                App.Vector(1, 0, 0))
        cyl.rotate(App.Vector(0, 0, 0), App.Vector(0, 0, 1), math.degrees(a))
        out.append(cyl)
    shape = out[0]
    for c in out[1:]:
        shape = shape.fuse(c)
    return shape


def fin_volume_fraction():
    # フィン領域(R_OUT..R_OUT+FIN_H の円筒殻)に占める鉄の体積分率
    ring = math.pi * ((R_OUT + FIN_H) ** 2 - R_OUT ** 2)
    fins = FIN_N * FIN_T * FIN_H
    return fins / ring


def build(path, name, features=(), smear=False):
    if name in App.listDocuments():
        App.closeDocument(name)
    doc = App.newDocument(name)
    for n, m in PARTS:
        _add(doc, n, _base_shapes()[n], m)
    frac = fin_volume_fraction()
    rho_fe = 7.8
    if "fins" in features:
        if smear:
            _add(doc, "Fin_Smeared",
                 _annulus(R_OUT, R_OUT + FIN_H, FIN_Z0, FIN_Z1 - FIN_Z0),
                 "Iron", density=round(rho_fe * frac, 4))
        else:
            _add(doc, "Fins", _fins(), "Iron")
    if "trunnions" in features:
        _add(doc, "Trunnions", _trunnions(), "Iron")
    doc.recompute()
    doc.saveAs(path)
    return {"path": path, "features": list(features), "smeared": smear,
            "fin_volume_fraction": round(frac, 4),
            "smeared_density": round(rho_fe * frac, 4),
            "solids": len(doc.Objects)}


def build_all(outdir):
    r = []
    r.append(build(os.path.join(outdir, "cask_fin_detail.FCStd"),
                   "cask_fin_detail", ("fins",), False))
    r.append(build(os.path.join(outdir, "cask_fin_smear.FCStd"),
                   "cask_fin_smear", ("fins",), True))
    r.append(build(os.path.join(outdir, "cask_tru_detail.FCStd"),
                   "cask_tru_detail", ("trunnions",), False))
    r.append(build(os.path.join(outdir, "cask_tru_none.FCStd"),
                   "cask_tru_none", (), False))
    for x in r:
        print(x)
    return r
