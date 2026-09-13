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

# .paths の構造の版。ファイル種別ごとに独立して進める。
PATHS_FORMAT_VERSION = "1.3"
GENERATOR_VERSION = "1.6.3"


def _now():
    import datetime
    return datetime.datetime.now().astimezone().isoformat(timespec="seconds")


def _mtime(path):
    import datetime
    try:
        t = os.path.getmtime(path)
    except OSError:
        return None
    return datetime.datetime.fromtimestamp(t).astimezone().isoformat(timespec="seconds")


def reduce_layers(groups, mu, equiv, lib):
    # groups: [(material, thickness_cm)] source->detector, buildup candidates only
    # returns (n_layers, [(material, thickness)], rolled_in_mfp, mode)
    #
    # この結果は .paths の第3区画に書かれるが、**POKER は読まない参考情報**。
    # POKER は第2区画（材質と厚さの並び）から get_buildup_material で独自に
    # 層を決める。ビルドアップ材料の選定は物理的な判断であり、生成側が決めて
    # POKER の判断を上書きすべきではないため。
    #
    # 残している理由:
    #   - 将来、多層ビルドアップの選定基準を実装できれば、生成側で決めた層構成を
    #     POKER が採用する運用もあり得る。その検討材料になる
    #   - 生成側と POKER 側の判断が食い違えば、縮約規則を見直す材料になる
    #
    # 単層の選定基準には一般に確立したものがなく、実務では「mfp 最大の材質」と
    # 「最も線量が高くなる材質」がよく使われる。ここでは前者を採る。後者は材質
    # ごとにビルドアップ係数を引いて線量を比較する必要があり、生成側では扱えない。
    #
    # 層の組み合わせは lib_setting.dat のビルドアップデータの有無で制約される。
    # 層材料は実材質名で出力する。equivalent はライブラリの可用性判定にのみ使い、
    # 実際の読み替えは POKER が YAML のビルドアップノードから行う。
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
    #
    # 戻り値: (pos, wt, groups)
    #   groups = [(線源名, 点数), ...]  線源ごとの区切り。
    #   source_name を指定した場合はその線源だけを読む（groups は 1 要素）。
    #
    # 区切りが要るのは POKER が線源ごとに Result を作るため。.paths が
    # 区切りを持たないと、全点が 1 番目の線源として扱われ静かに間違う。
    import re
    pos, wt, groups = [], [], []
    cur, inblock, n_cur = None, False, 0
    pat = re.compile(
        r"position:\s*(\S+)\s+(\S+)\s+(\S+)\s*,\s*weight:\s*(\S+?)\s*\}")

    def flush():
        if n_cur:
            groups.append((cur or "SOURCE", n_cur))

    for raw in open(summary_path, encoding="utf-8", errors="replace"):
        s = raw.strip()
        m = re.match(r"-\s*name:\s*(\S+)", s)
        if m:
            if inblock:
                flush()
                n_cur = 0
            inblock = False
            cur = m.group(1)
        if s.startswith("point_source:"):
            inblock = (source_name is None or cur == source_name)
            n_cur = 0
            continue
        if inblock:
            m = pat.search(s)
            if m:
                pos.append([float(m.group(1)), float(m.group(2)), float(m.group(3))])
                wt.append(float(m.group(4)))
                n_cur += 1
            elif s and not s.startswith("-"):
                flush()
                n_cur = 0
                inblock = False
    if inblock:
        flush()

    if not pos:
        raise SystemExit(
            "point_source が見つかりません: %s\n"
            "poker_cui は -p を付けて実行してください" % summary_path)
    return (np.asarray(pos, dtype=np.float64),
            np.asarray(wt, dtype=np.float64), groups)


def read_evaluation_points(summary_path):
    # poker_cui -p が出力する input セクションの detector: を読む。
    #   - name: D_lid_map
    #     show_path_trace: false
    #     evaluation_point:
    #       -  1.3000e+02  0.0000e+00  2.3000e+02  # No. 1
    #
    # 戻り値: [(検出器名, [[x,y,z], ...]), ...]
    #
    # グリッド検出器（面・体積）は評価点が複数ある。.paths は検出器ではなく
    # 評価点の列挙なので、ここで展開したものを detectors として書き出す。
    # 座標を自前で計算せず POKER の出力を使うのは、線源点と同じ理由
    # （分割規則の解釈違いで静かにずれるのを避ける）。
    #
    # thinnedindices の detectorgrid が既定値(10)のままだと評価点が間引かれる。
    # 全点を得るには十分大きな値を入力に書くこと。
    import re
    out, cur, pts, inblock = [], None, [], False
    pat = re.compile(r"^-\s+(\S+)\s+(\S+)\s+(\S+)\s*(?:#.*)?$")
    for raw in open(summary_path, encoding="utf-8", errors="replace"):
        s = raw.strip()
        m = re.match(r"-\s*name:\s*(\S+)", s)
        if m:
            if cur is not None and pts:
                out.append((cur, pts))
            cur, pts, inblock = m.group(1), [], False
            continue
        if s.startswith("evaluation_point:"):
            inblock = True
            if "一部" in s or "omit" in s.lower():
                raise SystemExit(
                    "評価点が間引かれています: %s\n"
                    "入力の thinnedindices.detectorgrid を評価点数以上にして "
                    "poker_cui を -p 付きで再実行してください" % summary_path)
            continue
        if inblock:
            m = pat.match(s)
            if m:
                pts.append([float(m.group(1)), float(m.group(2)), float(m.group(3))])
            elif s:
                inblock = False
    if cur is not None and pts:
        out.append((cur, pts))
    if not out:
        raise SystemExit(
            "detector の evaluation_point が見つかりません: %s\n"
            "poker_cui は -p を付けて実行してください" % summary_path)
    return out


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
    SRC_GROUPS = None                        # [(線源名, 点数), ...]
    if "poker_summary" in spec:
        # 推奨: POKER が生成した分割点をそのまま使う（位置と体積重み）
        P, WT, SRC_GROUPS = read_point_source(
            spec["poker_summary"], spec.get("source_name"))
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
    # 検出器（評価点）の取得。
    #   detectors_from_summary: true なら poker_cui -p の出力から読む。
    #   グリッド検出器（面・体積）は評価点が複数あるので、.paths では
    #   「検出器名#評価点番号」の形で 1 点ずつ列挙する。POKER 側は
    #   input.detectors を平坦化した通し番号として解釈する。
    if spec.get("detectors_from_summary") and "poker_summary" in spec:
        eps = read_evaluation_points(spec["poker_summary"])
        dets = []
        for name, pts in eps:
            multi = len(pts) > 1
            for i, p in enumerate(pts):
                dets.append({
                    "name": ("%s#%d" % (name, i + 1)) if multi else name,
                    "pos": [c / scale for c in p],   # POKER 単位 -> CAD 単位
                })
    else:
        dets = spec["detectors"]
    DET = np.asarray([d["pos"] for d in dets], dtype=np.float64)
    A = np.repeat(SRC, len(DET), 0)
    B = np.tile(DET, (len(SRC), 1))

    t0 = time.time()
    segs, L, ov, ANG = tr.trace(A, B, chunk=int(spec.get("chunk", 32768)))
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
        ang = []          # 区間ごとの入射角（度）。スラント補正に使う。
        groups = []
        for idx, (lo, hi, oi) in enumerate(segs[k]):
            key = "VOID" if oi < 0 else obj_key(oi)
            th = (hi - lo) * scale
            raw.append("%d %.6g" % (mid[key], th))
            # 入射角は「入射点における接面に対する角度」。テッセレーションでは
            # 三角形の法線がその接面の法線に相当する。0 度 = 垂直入射。
            ang.append("%.4g" % (ANG[k][idx] if idx < len(ANG[k]) else 0.0))
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
        lines.append("%d %d %d | %s | %d %s | %s" % (
            si, di, len(segs[k]), "  ".join(raw), bt,
            "  ".join("%d %.6g" % (mid[m], t) for m, t in bl),
            " ".join(ang)))

    # ヘッダは POKER の .summary / .dose と同じ形に揃える。
    # 1 行目のマジックコメントで、パースする前に種別が判別できる。
    # format と format_version でファイル種別とその構造の版を明示する。
    src_yaml = spec.get("source_yaml") or spec.get("poker_summary", "")
    if src_yaml.endswith(".summary"):
        src_yaml = src_yaml[:-len(".summary")]
    hdr = ["# POKER-PATHS",
           "information:",
           "  format: paths",
           # 版は 1.1 / 1.2 / 1.3 の形でしか進めないので、YAML が float として
           # 読んでも実害はない。引用符は付けない。
           "  format_version: %s" % PATHS_FORMAT_VERSION,
           "  generator: poker_mcp gen_paths.py %s" % GENERATOR_VERSION,
           "  generated_at: %s" % _now(),
           "  notation: scientific",
           "  sig_digits: 6"]
    if src_yaml:
        # 対応関係の記録。読み込み時の照合には使わない（移動や再保存で
        # 一致しなくなるため）。実質的な整合性は n_source_points と
        # n_detectors を YAML の定義と突き合わせて確認する。
        hdr.append("  source_yaml: %s" % os.path.basename(src_yaml))
        mt = _mtime(src_yaml)
        if mt:
            hdr.append("  source_yaml_mtime: %s" % mt)
    hdr += ["  model: %s" % os.path.basename(spec["fcstd"]),
            "  deviation_mm: %g" % dev,
            "  unit: cm",
            "  source: %s" % spec.get("source_name", "SOURCE"),
            "  source_points_from: %s" % (
                os.path.basename(spec["poker_summary"]) if "poker_summary" in spec
                else ("spec" if "source_points" in spec else "generated(verification only)")),
            "  n_source_points: %d" % len(SRC),
            "  n_detectors: %d" % len(DET),
            "  n_materials: %d" % len(keys),
            "  n_sources: %d" % (len(SRC_GROUPS) if SRC_GROUPS else 1)]
    # 線源ごとの区切り。POKER は線源ごとに Result を作り、線源ごとの核種・
    # 放射能を適用してから合算するので、どの点がどの線源の分割点かが要る。
    # source_point の id は通し番号のまま、n_points で区切りを表す。
    hdr.append("sources:")
    if SRC_GROUPS:
        for i, (nm, n) in enumerate(SRC_GROUPS):
            hdr.append("  - { id: %d, name: %s, n_points: %d }" % (i, nm, n))
    else:
        hdr.append("  - { id: 0, name: %s, n_points: %d }"
                   % (spec.get("source_name", "SOURCE"), len(SRC)))
    # 材質・検出器・線源点は件数が可変なのでシーケンスにする。
    # information: の中に同じキーを並べると YAML として重複キーになるため、
    # トップレベルの別ノードに分ける（POKER の summary で実際に問題になった）。
    hdr.append("materials:")
    for i, k in enumerate(keys):
        if k == "VOID":
            hdr.append("  - { id: 0, name: VOID }")
        elif k[1] is None:
            hdr.append("  - { id: %d, name: %s }" % (i, k[0]))
        else:
            # 密度欄がある場合はライブラリの登録密度ではなくこの値を使う。
            # スミアリング等価領域のように同じ材質でも密度が違えば別 ID。
            hdr.append("  - { id: %d, name: %s, density: %.6g }" % (i, k[0], k[1]))
    hdr.append("detectors:")
    for i, d in enumerate(dets):
        p = np.asarray(d["pos"], dtype=float) * scale
        hdr.append("  - { id: %d, name: %s, pos: [%.6g, %.6g, %.6g] }"
                   % (i, d["name"], p[0], p[1], p[2]))
    # 線源点は座標と体積重みの両方を書き出す。POKER 側が分割定義から
    # 再生成すると、分割規則の解釈違いで静かにずれる（実際に等面積分割と
    # 等間隔分割で代表点が食い違った）。座標があれば距離照合もできる。
    hdr.append("source_points:")
    for i, p in enumerate(SRC * scale):
        w = "" if WT is None else ", weight: %.6g" % WT[i]
        hdr.append("  - { id: %d, pos: [%.6g, %.6g, %.6g]%s }"
                   % (i, p[0], p[1], p[2], w))
    hdr.append("# paths: src det nseg | (mat thick)... | [ref] bu_type (bu_mat bu_thick)... | (incidence_deg)...")
    hdr.append("paths: |")

    out = spec["out"]
    with open(out, "w", encoding="utf-8") as f:
        # 経路本体は YAML のリテラルブロックに入れる。1 行 1 経路の数値列は
        # YAML のシーケンスにすると膨れるうえ読み書きが遅くなるため、
        # ブロックスカラーとして持たせ、中身は独自形式のまま扱う。
        f.write("\n".join(hdr) + "\n")
        f.write("\n".join("  " + ln for ln in lines) + "\n")

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
