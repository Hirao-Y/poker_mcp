# gen_paths.py -- FreeCAD headless ray tracer -> POKER .paths writer
#
#   freecadcmd gen_paths.py <spec.json>
#
# spec.json:
#   fcstd            : FCStd path
#   out              : output .paths path
#   deviation        : tessellation deviation [mm] (default 0.5)
#   unit_scale       : model unit -> POKER unit (default 0.1 = mm->cm)
#   source_name      : label written into the header
#   source_points    : [[x,y,z], ...] in model units
#   detectors        : [{"name":..,"pos":[x,y,z]}, ...] in model units
#   mu_ref           : {material: mu [1/cm]}  overrides/extends builtin table
#   equivalent       : {material: standard_material} for buildup substitution
#   buildup_exclude  : materials never used as buildup (default VOID, Air)
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import FreeCAD as App
import ray_trace_tri as rt

import poker_lib


def reduce_layers(groups, mu, equiv, lib):
    # groups: [(material, thickness_cm)] source->detector, buildup candidates only
    # Selection is constrained by the buildup data actually present in
    # lib_setting.dat.  Layer materials are emitted with their REAL names;
    # `equivalent` is only used to test library availability, because POKER
    # resolves the substitution itself via the YAML buildup node.
    # returns (n_layers, [(material, thickness)], rolled_in_mfp, mode)
    if not groups:
        return 0, [], 0.0, "none"
    order, tot = [], {}
    for m, t in groups:
        if m not in tot:
            tot[m] = 0.0
            order.append(m)
        tot[m] += t
    mfp = dict((m, mu[m] * tot[m]) for m in order)
    std = lambda k: equiv.get(k[0], k[0])

    def roll(keep):
        acc = dict((m, tot[m]) for m in keep)
        rolled = 0.0
        for i, m in enumerate(order):
            if m in acc:
                continue
            tgt = min(keep, key=lambda k: abs(order.index(k) - i))
            if mu[tgt] > 0:
                acc[tgt] += mfp[m] / mu[tgt]
            rolled += mfp[m]
        return [(m, acc[m]) for m in keep], rolled

    if len(order) == 3 and tuple(std(m) for m in order) in lib.three:
        return 3, [(m, tot[m]) for m in order], 0.0, "3layer"
    best = None
    for i in range(len(order)):
        for j in range(i + 1, len(order)):
            if (std(order[i]), std(order[j])) in lib.two:
                s = mfp[order[i]] + mfp[order[j]]
                if best is None or s > best[0]:
                    best = (s, [order[i], order[j]])
    if best:
        layers, rolled = roll(best[1])
        return 2, layers, rolled, "2layer"
    cand = [m for m in order if std(m) in lib.single]
    if not cand:
        return 0, [], sum(mfp.values()), "unavailable"
    keep = [max(cand, key=lambda m: mfp[m])]
    layers, rolled = roll(keep)
    return 1, layers, rolled, "1layer"


def read_point_source(summary_path, source_name=None):
    # poker_cui -p が出力する input セクションの point_source: を読む。
    #   - { position:  1.3258e+01  1.3258e+01  9.6667e+01, weight: 2.0833e-02}
    # 分割規則(UNIFORM/GAUSS_LAST 等)や weight ノードの指定を再実装せず、
    # POKER が生成した点をそのまま使うため、両者がずれる余地が無い。
    import re
    pos, wt, cur, inblock = [], [], None, False
    pat = re.compile(
        r"position:\s*(\S+)\s+(\S+)\s+(\S+)\s*,\s*weight:\s*(\S+?)\s*\}")
    for raw in open(summary_path, encoding="utf-8", errors="replace"):
        s = raw.strip()
        m = re.match(r"-\s*name:\s*(\S+)", s)
        if m:
            cur = m.group(1)
        if s.startswith("point_source:"):
            inblock = (source_name is None or cur == source_name)
            continue
        if inblock:
            m = pat.search(s)
            if m:
                pos.append([float(m.group(1)), float(m.group(2)), float(m.group(3))])
                wt.append(float(m.group(4)))
            elif s and not s.startswith("-"):
                inblock = False
    if not pos:
        raise SystemExit(
            "point_source が見つかりません: %s\n"
            "poker_cui は -p を付けて実行してください" % summary_path)
    return np.asarray(pos, dtype=np.float64), np.asarray(wt, dtype=np.float64)


def main(spec_path):
    spec = json.load(open(spec_path, encoding="utf-8-sig"))
    dev = float(spec.get("deviation", 0.5))
    scale = float(spec.get("unit_scale", 0.1))
    excl = set(spec.get("buildup_exclude", ["VOID", "Air"]))
    equiv = dict(spec.get("equivalent", {}))
    lib = poker_lib.PokerLib(spec.get("poker_dir", r"C:\Poker"))
    energy = float(spec.get("mu_energy", 1.25))
    mu = {"VOID": 0.0}
    for m in lib.materials:
        mu[m] = lib.mu(m, energy, spec.get("mu_column", "total"))
    mu.update(spec.get("mu_ref", {}))

    # 材質と密度の組を1つの層種別として扱う。CAD 側で PokerDensity が指定
    # されていればライブラリ密度ではなくその値を使う（スミアリング等価領域）。
    # 密度は .paths のヘッダで POKER に渡す。材質名だけでは伝わらないため。
    def obj_key(i):
        m = tr.mats[i]
        d = tr.dens[i] if i < len(tr.dens) else None
        rho = lib.materials[m][0] if m in lib.materials else None
        if d and rho and abs(d - rho) > 1e-9:
            return (m, float(d))
        return (m, None)

    def key_mu(k):
        m, d = k
        base = mu.get(m, 0.0)
        rho = lib.materials[m][0] if m in lib.materials else None
        return base * (d / rho) if (d and rho) else base

    t0 = time.time()
    doc = App.openDocument(spec["fcstd"])
    tr = rt.Tracer(doc, deviation=dev)
    t_load = time.time() - t0

    missing = sorted(set(m for m in tr.mats if m not in mu and m not in excl))
    if missing:
        raise SystemExit("mu_ref missing for: %s  (add to spec.mu_ref)" % missing)
    bad = sorted(set(v for v in equiv.values() if v not in lib.single))
    if bad:
        raise SystemExit("equivalent targets have no 1-layer buildup data: %s\n"
                         "available: %s" % (bad, sorted(lib.single)))
    nostd = sorted(set(m for m in tr.mats
                       if m not in excl and equiv.get(m, m) not in lib.single))
    if nostd:
        raise SystemExit("no buildup data for: %s  (set spec.equivalent)" % nostd)

    WT = None
    if "poker_summary" in spec:
        # 推奨: POKER が生成した分割点をそのまま使う（位置と体積重み）
        P, WT = read_point_source(spec["poker_summary"], spec.get("source_name"))
        SRC = P / scale                      # POKER 単位 -> CAD 単位
    elif "source_points" in spec:
        SRC = np.asarray(spec["source_points"], dtype=np.float64)
        WT = np.asarray(spec["source_weights"], dtype=np.float64) \
            if "source_weights" in spec else None
    else:
        # 検証専用の簡易生成。POKER の分割規則とは一致しないので実運用では
        # 使わないこと。POKER の UNIFORM は各軸を等間隔に分割して体積差を
        # weight で補償する方式で、ここでの等面積分割とは代表点が異なる。
        g = spec["source_rcc"]
        d = g["div"]
        rr = g["r"] * np.sqrt((np.arange(d["r"]) + 0.5) / d["r"])
        ph = (np.arange(d["phi"]) + 0.5) * 2 * np.pi / d["phi"]
        zz = g["z"] + (np.arange(d["z"]) + 0.5) * g["h"] / d["z"]
        R, P_, Z = np.meshgrid(rr, ph, zz, indexing="ij")
        SRC = np.stack([g["x"] + R * np.cos(P_),
                        g["y"] + R * np.sin(P_), Z], -1).reshape(-1, 3)
        print("WARNING: source_rcc は検証専用です。実運用では poker_summary を"
              " 指定して POKER の分割点を使ってください", file=sys.stderr)
    dets = spec["detectors"]
    DET = np.asarray([d["pos"] for d in dets], dtype=np.float64)
    A = np.repeat(SRC, len(DET), 0)
    B = np.tile(DET, (len(SRC), 1))

    t0 = time.time()
    segs, L, ov = tr.trace(A, B, chunk=int(spec.get("chunk", 32768)))
    t_trace = time.time() - t0

    # material id table (VOID always 0)
    # 層種別 = (材質, 密度上書き)。密度違いは別 ID として扱う。
    keys = ["VOID"]
    for i in range(len(tr.mats)):
        k = obj_key(i)
        if k[0] != "VOID" and k not in keys:
            keys.append(k)
    mid = {}
    for i, k in enumerate(keys):
        mid[k] = i
    kmu = dict((k, 0.0 if k == "VOID" else key_mu(k)) for k in keys)

    lines = []
    stat = {"type": {}, "mode": {}, "rolled_max": 0.0, "rolled_sum": 0.0,
            "rolled_over1": 0, "bu": {}}
    nseg_tot = 0
    for k in range(len(A)):
        si, di = divmod(k, len(DET))
        raw = []
        groups = []
        for lo, hi, oi in segs[k]:
            key = "VOID" if oi < 0 else obj_key(oi)
            th = (hi - lo) * scale
            raw.append("%d %.6g" % (mid[key], th))
            nseg_tot += 1
            if key == "VOID" or key[0] in excl:
                continue
            if groups and groups[-1][0] == key:
                groups[-1][1] += th
            else:
                groups.append([key, th])
        bt, bl, rolled, mode = reduce_layers([tuple(g) for g in groups],
                                             kmu, equiv, lib)
        stat["mode"][mode] = stat["mode"].get(mode, 0) + 1
        if rolled > 1.0:
            stat["rolled_over1"] += 1
        stat["type"][bt] = stat["type"].get(bt, 0) + 1
        stat["rolled_sum"] += rolled
        stat["rolled_max"] = max(stat["rolled_max"], rolled)
        label = lambda k: k[0] if k[1] is None else "%s@%.4g" % (k[0], k[1])
        key = "-".join(label(m) for m, _ in bl) or "(none)"
        stat["bu"][key] = stat["bu"].get(key, 0) + 1
        lines.append("%d %d %d | %s | %d %s" % (
            si, di, len(segs[k]), "  ".join(raw), bt,
            "  ".join("%d %.6g" % (mid[m], t) for m, t in bl)))

    hdr = ["# POKER-PATHS 1.2",
           "model: %s" % os.path.basename(spec["fcstd"]),
           "deviation_mm: %g" % dev,
           "unit: cm",
           "source: %s" % spec.get("source_name", "SOURCE"),
           "source_points_from: %s" % (
               os.path.basename(spec["poker_summary"]) if "poker_summary" in spec
               else ("spec" if "source_points" in spec else "generated(verification only)")),
           "n_source_points: %d" % len(SRC),
           "n_detectors: %d" % len(DET),
           "n_materials: %d" % len(keys)]
    # 材質と密度。密度欄が無い場合は POKER の材料ライブラリの登録密度を使う。
    # スミアリング等価領域のように密度を上書きした場合は、同じ材質でも別 ID。
    for i, k in enumerate(keys):
        if k == "VOID":
            hdr.append("material: 0 VOID")
        elif k[1] is None:
            hdr.append("material: %d %s" % (i, k[0]))
        else:
            hdr.append("material: %d %s %.6g" % (i, k[0], k[1]))
    for i, d in enumerate(dets):
        p = np.asarray(d["pos"], dtype=float) * scale
        hdr.append("detector: %d %s %.6g %.6g %.6g" % (i, d["name"], p[0], p[1], p[2]))
    # 線源点は座標と体積重みの両方を書き出す。POKER 側が分割定義から
    # 再生成すると、分割規則の解釈違いで静かにずれる（実際に等面積分割と
    # 等間隔分割で代表点が食い違った）。座標があれば距離照合もできる。
    for i, p in enumerate(SRC * scale):
        w = "" if WT is None else " %.6g" % WT[i]
        hdr.append("source_point: %d %.6g %.6g %.6g%s" % (i, p[0], p[1], p[2], w))
    hdr.append("# src det nseg | (mat thick)... | bu_type (bu_mat bu_thick)...")

    out = spec["out"]
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(hdr) + "\n" + "\n".join(lines) + "\n")

    rep = {
        "rays": len(A), "segments": nseg_tot, "overlaps": ov,
        "load_s": round(t_load, 2), "trace_s": round(t_trace, 2),
        "out_MB": round(os.path.getsize(out) / 1e6, 2),
        "buildup_type_counts": stat["type"],
        "buildup_mode": stat["mode"],
        "buildup_combos": dict(sorted(stat["bu"].items(), key=lambda kv: -kv[1])[:8]),
        "mu_energy_MeV": energy,
        "mu_used": dict(("%s@%.4g" % (k[0], k[1]) if k != "VOID" and k[1]
                         else (k if k == "VOID" else k[0]), round(kmu[k], 5))
                        for k in keys),
        "equivalent": equiv,
        "rays_rolled_over_1mfp": stat["rolled_over1"],
        "rolled_in_mfp_max": round(stat["rolled_max"], 4),
        "rolled_in_mfp_mean": round(stat["rolled_sum"] / max(len(A), 1), 4),
        "tris": int(len(tr.T)),
    }
    json.dump(rep, open(out + ".stat.json", "w"), indent=2)
    print(json.dumps(rep, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "spec.json")
