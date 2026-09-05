# audit_mfp.py -- ある形状を含むモデルと含まないモデルを、同一のレイ集合で
# 比較し、その形状を省略（または平均化）してよいかを定量化する。
#
#   freecadcmd -c "import sys; sys.path.insert(0, r'<tools>'); \
#                  import audit_mfp; audit_mfp.main(r'<spec.json>')"
#
# POKER は呼ばない。両モデルで同じ線源点・検出器・レイ集合を使うため、線源
# 強度も換算係数も比を取ると相殺し、Σμt だけで比較できる。CAD モデルを POKER
# で直接計算する手段が無くても使えることを狙った設計。
#
# 比較量:
#   delta = mfp(B) - mfp(A)     A = fcstd(対象形状を含む), B = fcstd_simple
#   delta > 0  B の方が遮蔽が厚い -> 線量を過小評価 -> NON-CONSERVATIVE
#   delta < 0  B の方が薄い       -> 線量を過大評価 -> conservative
#
#   flux_ratio_estimate = Σ[exp(-mfp_B)/d²] / Σ[exp(-mfp_A)/d²]
#
# これは**非衝突線束比の推定値**であり、線量比そのものではない。ビルドアップ
# 係数を含んでいない。両モデルの層構成が近ければ B(μr) は比で相殺するという
# 前提だが、片方だけが厚い層を通る経路ではその前提が崩れる。桁の目安として
# 読むこと。.paths が通れば POKER の実計算で確認できる。
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import FreeCAD as App
import ray_trace_tri as rt
import poker_lib


def _rays(spec):
    if "source_points" in spec:
        SRC = np.asarray(spec["source_points"], dtype=np.float64)
    else:
        g = spec["source_rcc"]
        d = g["div"]
        rr = g["r"] * np.sqrt((np.arange(d["r"]) + 0.5) / d["r"])
        ph = (np.arange(d["phi"]) + 0.5) * 2 * np.pi / d["phi"]
        zz = g["z"] + (np.arange(d["z"]) + 0.5) * g["h"] / d["z"]
        R, P, Z = np.meshgrid(rr, ph, zz, indexing="ij")
        SRC = np.stack([g["x"] + R * np.cos(P),
                        g["y"] + R * np.sin(P), Z], -1).reshape(-1, 3)
    DET = np.asarray([d["pos"] for d in spec["detectors"]], dtype=np.float64)
    return SRC, DET


def _mu_per_object(tracer, lib, energy):
    # オブジェクトごとの線減弱係数。PokerDensity が指定されていれば
    # ライブラリ密度からスケールする（スミアリングした等価領域など）。
    out = []
    for i, m in enumerate(tracer.mats):
        if m == "VOID":
            out.append(0.0)
            continue
        mu = lib.mu(m, energy)
        d = tracer.dens[i] if i < len(tracer.dens) else None
        if d:
            rho = lib.materials[m][0]
            if rho:
                mu *= d / rho
        out.append(mu)
    return np.asarray(out)


def _mfp(tracer, segs, mu_obj, scale):
    out = np.zeros(len(segs))
    for k, s in enumerate(segs):
        t = 0.0
        for lo, hi, oi in s:
            if oi >= 0:
                t += mu_obj[oi] * (hi - lo) * scale
        out[k] = t
    return out


def main(spec_path):
    spec = json.load(open(spec_path, encoding="utf-8-sig"))
    scale = float(spec.get("unit_scale", 0.1))
    dev = float(spec.get("deviation", 0.5))
    lib = poker_lib.PokerLib(spec.get("poker_dir", r"C:\Poker"))
    energy = float(spec.get("mu_energy", 1.25))
    mu = dict((m, lib.mu(m, energy)) for m in lib.materials)
    mu["VOID"] = 0.0

    SRC, DET = _rays(spec)
    A = np.repeat(SRC, len(DET), 0)
    B = np.tile(DET, (len(SRC), 1))

    res = {}
    t0 = time.time()
    for tag, key in (("detailed", "fcstd"), ("simple", "fcstd_simple")):
        doc = App.openDocument(spec[key])
        tr = rt.Tracer(doc, deviation=dev)
        segs, L, ov = tr.trace(A, B, chunk=int(spec.get("chunk", 32768)))
        res[tag] = _mfp(tr, segs, _mu_per_object(tr, lib, energy), scale)
        App.closeDocument(doc.Name)
    dt = time.time() - t0

    delta = res["simple"] - res["detailed"]
    ratio = np.exp(-delta)
    tol = float(spec.get("audit_tol_mfp", 0.05))
    # 80 mfp を超える経路は、POKER 側でクランプされる飽和領域にあり、
    # そこでの Δmfp を評価しても意味がない（線量寄与が実質ゼロ）。
    clamp = float(spec.get("saturation_mfp", 80.0))
    live = np.minimum(res["detailed"], res["simple"]) < clamp
    flagged = (np.abs(delta) > tol) & live
    nonc = (delta > tol) & live

    per_det = []
    nd = len(DET)
    dist = np.linalg.norm(B - A, axis=1) * scale
    # uncollided contribution weight: exp(-mfp) / d^2.  Buildup is omitted
    # because it very nearly cancels in the simple/detailed ratio.
    w_s = np.exp(-res["simple"]) / dist ** 2
    w_d = np.exp(-res["detailed"]) / dist ** 2
    for j, d in enumerate(spec["detectors"]):
        dj = delta[j::nd]
        lv = live[j::nd]
        dl = dj[lv] if lv.any() else np.zeros(1)
        ws, wd = w_s[j::nd].sum(), w_d[j::nd].sum()
        md = res["detailed"][j::nd]
        per_det.append({
            "detector": d["name"],
            "rays": int(len(dj)),
            "rays_below_saturation": int(lv.sum()),
            "affected": int(np.sum((np.abs(dj) > tol) & lv)),
            "delta_max_nonconservative": round(float(dl.max()), 4),
            "delta_max_conservative": round(float(dl.min()), 4),
            "mean_abs_delta": round(float(np.abs(dl).mean()), 4),
            "mfp_min_detailed": round(float(md.min()), 2),
            "flux_ratio_estimate": round(float(ws / wd) if wd > 0 else 1.0, 6),
            "delta_at_dominant_path": round(
                float(dj[int(np.argmax(w_d[j::nd]))]), 6),
        })

    worst = int(np.argmax(delta))
    wimp = int(np.argmax(w_d * delta))
    rep = {
        "model_with_feature": os.path.basename(spec["fcstd"]),
        "model_without_feature": os.path.basename(spec["fcstd_simple"]),
        "note": "flux_ratio_estimate は非衝突線束比の推定値。ビルドアップ係数を含まない",
        "mu_energy_MeV": energy,
        "tolerance_mfp": tol,
        "rays": int(len(A)),
        "trace_s": round(dt, 2),
        "rays_affected": int(flagged.sum()),
        "worst_contributing_ray": {
            "detector": spec["detectors"][wimp % nd]["name"],
            "delta_mfp": round(float(delta[wimp]), 4),
            "mfp_detailed": round(float(res["detailed"][wimp]), 2),
            "share_of_detector_signal": round(
                float(w_d[wimp] / w_d[wimp % nd::nd].sum()), 4),
        },
        "rays_nonconservative": int(nonc.sum()),
        "delta_mfp_max_nonconservative": round(float(delta.max()), 4),
        "delta_mfp_max_conservative": round(float(delta.min()), 4),
        "dose_ratio_worst_case": round(float(ratio.min()), 4),
        "worst_ray": {
            "source": [round(float(x), 1) for x in A[worst]],
            "detector": spec["detectors"][worst % nd]["name"],
            "mfp_detailed": round(float(res["detailed"][worst]), 4),
            "mfp_simple": round(float(res["simple"][worst]), 4),
        },
        "per_detector": per_det,
    }
    out = spec.get("audit_out")
    if out:
        json.dump(rep, open(out, "w"), indent=2)
    print(json.dumps(rep, indent=2, ensure_ascii=False))
    return rep
