# compare_poker_trace.py -- POKER の path_trace とレイトレーサの経路を突き合わせる
#
#   freecadcmd -c "import sys; sys.path.insert(0, r'<tools>'); \
#                  import compare_poker_trace as c; c.main(r'<spec.json>')"
#
# POKER は .summary の result セクションに path_trace_from_pseudo_source_point
# として、線源点→検出器ごとの (ゾーン, 材質, 通過距離, 始点, 終点) を出力する。
# これはレイトレーサの出力そのものなので、線量から逆算せずに区間単位で直接
# 比較できる。CAD モデルと POKER の CSG モデルが同一形状であることが前提。
#
# spec.json:
#   fcstd      : CAD モデル（POKER の CSG と等価なもの）
#   summary    : poker_cui が出力した .summary
#   unit_scale : CAD 単位 -> POKER 単位（既定 0.1 = mm -> cm）
#   deviation  : テッセレーション偏差 [mm]
#   tol_cm     : 区間長の許容差 [cm]（既定 0.01）
import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import FreeCAD as App
import ray_trace_tri as rt

NUM = r"[-+0-9.eE]+"


def parse_path_traces(path):
    # returns [{src:[x,y,z], det:[x,y,z], det_name:str, segs:[(zone,mat,len)]}]
    out = []
    cur = None
    det_name = None
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            s = raw.strip()
            m = re.match(r"-\s*name:\s*(\S+)", s)
            if m:
                det_name = m.group(1)
                continue
            m = re.match(r"-\s*from:\s*(%s)\s+(%s)\s+(%s)" % (NUM, NUM, NUM), s)
            if m:
                cur = {"src": [float(x) for x in m.groups()],
                       "det": None, "det_name": det_name, "segs": []}
                out.append(cur)
                continue
            m = re.match(r"-\s*to\s*:\s*(%s)\s+(%s)\s+(%s)" % (NUM, NUM, NUM), s)
            if m and cur is not None and cur["det"] is None:
                cur["det"] = [float(x) for x in m.groups()]
                continue
            # 区間行: - ZONE  MATERIAL  LEN  from x y z  to x y z
            m = re.match(r"-\s+(\S+)\s+(\S+)\s+(%s)\s+from\s+" % NUM, s)
            if m and cur is not None and "buildup_material" not in s:
                cur["segs"].append((m.group(1), m.group(2), float(m.group(3))))
    return [t for t in out if t["det"] is not None and t["segs"]]


def main(spec_path):
    # PowerShell の Set-Content -Encoding UTF8 は BOM を付けるため utf-8-sig で読む
    spec = json.load(open(spec_path, encoding="utf-8-sig"))
    scale = float(spec.get("unit_scale", 0.1))
    tol = float(spec.get("tol_cm", 0.01))
    traces = parse_path_traces(spec["summary"])

    doc = App.openDocument(spec["fcstd"])
    tr = rt.Tracer(doc, deviation=float(spec.get("deviation", 0.5)))

    A = np.array([t["src"] for t in traces]) / scale     # POKER cm -> CAD mm
    B = np.array([t["det"] for t in traces]) / scale
    segs, L, ov = tr.trace(A, B)

    rows, nbad, worst = [], 0, 0.0
    diffs = []
    for k, t in enumerate(traces):
        # POKER: VOID ゾーンも出るので材質でまとめる（連続同一材質は結合）
        pk = []
        for _, mat, ln in t["segs"]:
            mat = "VOID" if mat.upper() in ("VOID", "-") else mat
            if pk and pk[-1][0] == mat:
                pk[-1][1] += ln
            else:
                pk.append([mat, ln])
        ct = []
        for lo, hi, oi in segs[k]:
            mat = tr.material(oi)
            ln = (hi - lo) * scale
            if ct and ct[-1][0] == mat:
                ct[-1][1] += ln
            else:
                ct.append([mat, ln])
        # VOID/Air は同一視（POKER 側 ATMOSPHERE=VOID, CAD 側は形状なし）
        norm = lambda seq: [(m, l) for m, l in seq if m not in ("VOID", "Air")]
        p, c = norm(pk), norm(ct)
        ok = len(p) == len(c)
        dmax = 0.0
        if ok:
            for (pm, pl), (cm, cl) in zip(p, c):
                # POKER は材質名を10文字で切り詰めて出力する
                n = min(len(pm), len(cm), 10)
                if pm[:n] != cm[:n]:
                    ok = False
                    break
                dmax = max(dmax, abs(pl - cl))
            ok = ok and dmax <= tol
        if not ok:
            nbad += 1
        worst = max(worst, dmax)
        diffs.append(dmax)
        rows.append({
            "detector": t["det_name"],
            "src": t["src"],
            "match": bool(ok),
            "max_diff_cm": round(dmax, 5),
            "poker": " ".join("%s %.4f" % (m, l) for m, l in p),
            "tracer": " ".join("%s %.4f" % (m, l) for m, l in c),
        })

    rep = {
        "traces": len(traces),
        "mismatches": nbad,
        "worst_segment_diff_cm": round(worst, 5),
        "mean_segment_diff_cm": round(float(np.mean(diffs)), 5) if diffs else 0.0,
        "median_segment_diff_cm": round(float(np.median(diffs)), 5) if diffs else 0.0,
        "exact_matches": int(sum(1 for d in diffs if d < 1e-9)),
        "tolerance_cm": tol,
        "overlaps": ov,
    }
    print(json.dumps(rep, indent=2))
    out = spec.get("out")
    if out:
        json.dump({"summary": rep, "rows": rows}, open(out, "w"),
                  indent=2, ensure_ascii=False)
    for r in rows:
        if not r["match"]:
            print("MISMATCH %s src=%s" % (r["detector"], r["src"]))
            print("  poker : %s" % r["poker"])
            print("  tracer: %s" % r["tracer"])
    return rep
