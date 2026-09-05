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
    std = lambda m: equiv.get(m, m)

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


def main(spec_path):
    spec = json.load(open(spec_path, encoding="utf-8"))
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

    if "source_points" in spec:
        SRC = np.asarray(spec["source_points"], dtype=np.float64)
    else:
        # convenience generator for testing only (UNIFORM equal-area).
        # production: poker_mcp supplies source_points per the YAML division
        # (GAUSS_LAST etc.), so POKER and the tracer sample identical points.
        g = spec["source_rcc"]
        d = g["div"]
        rr = g["r"] * np.sqrt((np.arange(d["r"]) + 0.5) / d["r"])
        ph = (np.arange(d["phi"]) + 0.5) * 2 * np.pi / d["phi"]
        zz = g["z"] + (np.arange(d["z"]) + 0.5) * g["h"] / d["z"]
        R, P, Z = np.meshgrid(rr, ph, zz, indexing="ij")
        SRC = np.stack([g["x"] + R * np.cos(P),
                        g["y"] + R * np.sin(P), Z], -1).reshape(-1, 3)
    dets = spec["detectors"]
    DET = np.asarray([d["pos"] for d in dets], dtype=np.float64)
    A = np.repeat(SRC, len(DET), 0)
    B = np.tile(DET, (len(SRC), 1))

    t0 = time.time()
    segs, L, ov = tr.trace(A, B, chunk=int(spec.get("chunk", 32768)))
    t_trace = time.time() - t0

    # material id table (VOID always 0)
    names = ["VOID"] + [m for m in sorted(set(tr.mats)) if m != "VOID"]
    mid = {m: i for i, m in enumerate(names)}

    lines = []
    stat = {"type": {}, "mode": {}, "rolled_max": 0.0, "rolled_sum": 0.0,
            "rolled_over1": 0, "bu": {}}
    nseg_tot = 0
    for k in range(len(A)):
        si, di = divmod(k, len(DET))
        raw = []
        groups = []
        for lo, hi, oi in segs[k]:
            m = tr.material(oi)
            th = (hi - lo) * scale
            raw.append("%d %.6g" % (mid[m], th))
            nseg_tot += 1
            if m in excl:
                continue
            if groups and groups[-1][0] == m:
                groups[-1][1] += th
            else:
                groups.append([m, th])
        bt, bl, rolled, mode = reduce_layers([tuple(g) for g in groups],
                                             mu, equiv, lib)
        stat["mode"][mode] = stat["mode"].get(mode, 0) + 1
        if rolled > 1.0:
            stat["rolled_over1"] += 1
        stat["type"][bt] = stat["type"].get(bt, 0) + 1
        stat["rolled_sum"] += rolled
        stat["rolled_max"] = max(stat["rolled_max"], rolled)
        key = "-".join(m for m, _ in bl) or "(none)"
        stat["bu"][key] = stat["bu"].get(key, 0) + 1
        lines.append("%d %d %d | %s | %d %s" % (
            si, di, len(segs[k]), "  ".join(raw), bt,
            "  ".join("%d %.6g" % (mid[m], t) for m, t in bl)))

    hdr = ["# POKER-PATHS 1.0",
           "model: %s" % os.path.basename(spec["fcstd"]),
           "deviation_mm: %g" % dev,
           "unit: cm",
           "source: %s" % spec.get("source_name", "SOURCE"),
           "n_source_points: %d" % len(SRC),
           "n_detectors: %d" % len(DET),
           "materials: %s" % ", ".join("%d=%s" % (i, m) for m, i in
                                       sorted(mid.items(), key=lambda kv: kv[1]))]
    for i, d in enumerate(dets):
        p = np.asarray(d["pos"], dtype=float) * scale
        hdr.append("detector: %d %s %.6g %.6g %.6g" % (i, d["name"], p[0], p[1], p[2]))
    # 線源点も書き出す。POKER 側が自前の分割から点列を再生成すると、トレーサと
    # 一致している保証が無い。座標があれば「層厚の総和 = 線源点と検出器の距離」
    # で照合でき、単位や座標系の取り違えを検出できる。
    for i, p in enumerate(SRC * scale):
        hdr.append("source_point: %d %.6g %.6g %.6g" % (i, p[0], p[1], p[2]))
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
        "mu_used": dict((m, round(mu[m], 5)) for m in sorted(set(tr.mats))),
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
