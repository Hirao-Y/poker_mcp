
# POKER-MCP ray tracer: tessellation + BVH + numpy batch Moller-Trumbore
import numpy as np
import FreeCAD as App

DEV = 0.5
LEAF = 4
TOL = 1e-7


def collect(doc, deviation=DEV, visible_only=True):
    # returns T(n,3,3), O(n,), names[], mats[], bbvol[], dens[]
    tris = []
    oids = []
    names = []
    mats = []
    dens = []
    bbvol = []
    for o in doc.Objects:
        sh = getattr(o, 'Shape', None)
        if sh is None or sh.isNull() or not sh.Solids:
            continue
        # PokerRole=source/detector は線源・検出器の印なので遮蔽体ではない。
        # レイトレースの対象から外す（材質も持たない）。
        role = (getattr(o, 'PokerRole', None) or 'shield').strip().lower()
        if role in ('source', 'detector'):
            continue
        vo = getattr(o, 'ViewObject', None)
        if visible_only and vo is not None:
            try:
                if not vo.Visibility:
                    continue
            except Exception:
                pass
        vts, fcs = sh.tessellate(deviation)
        if not fcs:
            continue
        V = np.array([[p.x, p.y, p.z] for p in vts], dtype=np.float64)
        F = np.asarray(fcs, dtype=np.int64)
        k = len(names)
        tris.append(V[F])
        oids.append(np.full(len(F), k, dtype=np.int32))
        names.append(o.Name)
        mats.append(getattr(o, 'PokerMaterial', None) or o.Label)
        # 密度の上書き（スミアリングした等価領域など）。未設定ならライブラリ値。
        d = getattr(o, 'PokerDensity', None)
        try:
            d = float(d) if d is not None else None
        except Exception:
            d = None
        dens.append(d if (d is not None and d > 0) else None)
        bb = sh.BoundBox
        bbvol.append(bb.XLength * bb.YLength * bb.ZLength)
    if not tris:
        raise RuntimeError('no solids collected')
    return (np.concatenate(tris, 0), np.concatenate(oids, 0),
            names, mats, np.array(bbvol), dens)


def build_bvh(T, leaf=LEAF):
    lo = T.min(1)
    hi = T.max(1)
    cen = 0.5 * (lo + hi)
    n = len(T)
    order = np.empty(n, dtype=np.int64)
    pos = 0
    nlo, nhi, nl, nr, ns, nc = [], [], [], [], [], []

    def new_node():
        nlo.append(np.zeros(3))
        nhi.append(np.zeros(3))
        nl.append(-1)
        nr.append(-1)
        ns.append(-1)
        nc.append(0)
        return len(nlo) - 1

    root = new_node()
    work = [(root, np.arange(n))]
    while work:
        nid, ids = work.pop()
        nlo[nid] = lo[ids].min(0)
        nhi[nid] = hi[ids].max(0)
        if len(ids) <= leaf:
            order[pos:pos + len(ids)] = ids
            ns[nid] = pos
            nc[nid] = len(ids)
            pos += len(ids)
            continue
        ax = int(np.argmax(nhi[nid] - nlo[nid]))
        c = cen[ids][:, ax]
        med = np.median(c)
        m = c <= med
        if m.all() or (~m).all():
            srt = np.argsort(c)
            h = len(ids) // 2
            L, R = ids[srt[:h]], ids[srt[h:]]
        else:
            L, R = ids[m], ids[~m]
        a, b = new_node(), new_node()
        nl[nid], nr[nid] = a, b
        work.append((a, L))
        work.append((b, R))
    return dict(lo=np.array(nlo), hi=np.array(nhi), left=np.array(nl),
                right=np.array(nr), start=np.array(ns), count=np.array(nc),
                order=order)


def _slab(bvh, node, org, dr, tmax):
    inv = np.where(np.abs(dr) < 1e-30, np.inf, 1.0 / np.where(np.abs(dr) < 1e-30, 1.0, dr))
    t1 = (bvh['lo'][node] - org) * inv
    t2 = (bvh['hi'][node] - org) * inv
    tn = np.minimum(t1, t2).max(1)
    tf = np.maximum(t1, t2).min(1)
    return (tf >= np.maximum(tn, 0.0)) & (tn <= tmax)


def _mt(T, ti, ri, org, dr, tmax):
    v0 = T[ti, 0]
    e1 = T[ti, 1] - v0
    e2 = T[ti, 2] - v0
    o = org[ri]
    d = dr[ri]
    pv = np.cross(d, e2)
    det = np.einsum('ij,ij->i', e1, pv)
    ok = np.abs(det) > 1e-12
    inv = np.where(ok, 1.0 / np.where(ok, det, 1.0), 0.0)
    tv = o - v0
    u = np.einsum('ij,ij->i', tv, pv) * inv
    qv = np.cross(tv, e1)
    v = np.einsum('ij,ij->i', d, qv) * inv
    t = np.einsum('ij,ij->i', e2, qv) * inv
    good = (ok & (u >= -1e-9) & (v >= -1e-9) & (u + v <= 1.0 + 1e-9)
            & (t > TOL) & (t <= tmax[ri] + TOL))
    return good, t


def _incidence_deg(T, ti, u):
    # 三角形 ti の法線と経路方向 u のなす角（度）。
    #   POKER のスラント補正は「入射点における接面に対する角度」を使う。
    #   テッセレーションでは三角形の法線がその接面の法線に相当する。
    #   戻り値は 0〜90 度。0 = 面に垂直に入射、90 に近いほど斜め。
    #   法線の向き（表裏）は問わないので絶対値を取る。
    v0, v1, v2 = T[ti][0], T[ti][1], T[ti][2]
    n = np.cross(v1 - v0, v2 - v0)
    ln = np.linalg.norm(n)
    if ln < 1e-12:
        return 0.0
    c = abs(float(np.dot(n / ln, u)))
    return float(np.degrees(np.arccos(min(1.0, c))))


def intersect(T, O, bvh, org, dr, tmax, chunk=8192):
    # returns ray_idx, t, obj_idx, tri_idx  (unsorted)
    # tri_idx は入射角の算出に使う（三角形の法線がその点の接面の法線）
    R, TT, OO, II = [], [], [], []
    for s in range(0, len(org), chunk):
        e = min(s + chunk, len(org))
        ri = np.arange(s, e)
        pr = ri.copy()
        pn = np.zeros(len(ri), dtype=np.int64)
        leaf_r, leaf_n = [], []
        while len(pr):
            keep = _slab(bvh, pn, org[pr], dr[pr], tmax[pr])
            pr, pn = pr[keep], pn[keep]
            if not len(pr):
                break
            isleaf = bvh['count'][pn] > 0
            if isleaf.any():
                leaf_r.append(pr[isleaf])
                leaf_n.append(pn[isleaf])
            pr2, pn2 = pr[~isleaf], pn[~isleaf]
            pr = np.concatenate([pr2, pr2])
            pn = np.concatenate([bvh['left'][pn2], bvh['right'][pn2]])
        if not leaf_r:
            continue
        lr = np.concatenate(leaf_r)
        ln = np.concatenate(leaf_n)
        cnt = bvh['count'][ln]
        rep_r = np.repeat(lr, cnt)
        st = bvh['start'][ln]
        offs = np.arange(cnt.sum()) - np.repeat(np.cumsum(cnt) - cnt, cnt)
        ti = bvh['order'][np.repeat(st, cnt) + offs]
        good, t = _mt(T, ti, rep_r, org, dr, tmax)
        R.append(rep_r[good])
        TT.append(t[good])
        OO.append(O[ti[good]])
        II.append(ti[good])
    if not R:
        return (np.array([], dtype=np.int64), np.array([]),
                np.array([], dtype=np.int32), np.array([], dtype=np.int64))
    return (np.concatenate(R), np.concatenate(TT),
            np.concatenate(OO), np.concatenate(II))


def segments(nray, hit_r, hit_t, hit_o, tmax, nobj, priority, hit_i=None):
    # priority: array, smaller = wins when overlapped
    # hit_i: 三角形索引（省略可）。与えると各区間の入口の三角形を記録する。
    srt = np.lexsort((hit_t, hit_r))
    hr, ht, ho = hit_r[srt], hit_t[srt], hit_o[srt]
    hi_tri = hit_i[srt] if hit_i is not None else None
    bnd = np.searchsorted(hr, np.arange(nray + 1))
    out = []
    tri_out = []          # 各区間の入口の三角形索引（-1 = 不明）
    overlaps = 0
    for r in range(nray):
        a, b = bnd[r], bnd[r + 1]
        ts, os_ = ht[a:b], ho[a:b]
        tri = hi_tri[a:b] if hi_tri is not None else None
        inside = np.zeros(nobj, dtype=bool)
        segs = []
        prev = 0.0
        prev_tri = -1
        i = 0
        m = len(ts)
        while i < m:
            t = ts[i]
            j = i
            while j < m and ts[j] - t < 1e-6:
                j += 1
            if t - prev > 1e-6:
                act = np.nonzero(inside)[0]
                segs.append((prev, t, act, prev_tri))
            for oidx in set(int(x) for x in os_[i:j]):
                inside[oidx] = not inside[oidx]
            prev = t
            # この境界で入った面の三角形。次の区間の入口になる。
            prev_tri = int(tri[i]) if tri is not None else -1
            i = j
        if tmax[r] - prev > 1e-6:
            segs.append((prev, tmax[r], np.nonzero(inside)[0], prev_tri))
        cl, ct = [], []
        for lo, hi, act, tix in segs:
            if len(act) == 0:
                cl.append((lo, hi, -1))
            else:
                if len(act) > 1:
                    overlaps += 1
                cl.append((lo, hi, int(act[np.argmin(priority[act])])))
            ct.append(tix)
        out.append(cl)
        tri_out.append(ct)
    return out, overlaps, tri_out


class Tracer(object):
    def __init__(self, doc, deviation=DEV, visible_only=True):
        if isinstance(doc, str):
            doc = App.getDocument(doc)
        self.T, self.O, self.names, self.mats, bb, self.dens = collect(
            doc, deviation, visible_only)
        self.bvh = build_bvh(self.T)
        self.priority = np.argsort(np.argsort(bb))  # smaller bbox wins
        span = self.T.reshape(-1, 3)
        self.ext = float(np.linalg.norm(span.max(0) - span.min(0))) + 10.0

    def trace(self, P1, P2, chunk=8192):
        P1 = np.atleast_2d(np.asarray(P1, dtype=np.float64))
        P2 = np.atleast_2d(np.asarray(P2, dtype=np.float64))
        if len(P1) == 1 and len(P2) > 1:
            P1 = np.repeat(P1, len(P2), 0)
        if len(P2) == 1 and len(P1) > 1:
            P2 = np.repeat(P2, len(P1), 0)
        d = P2 - P1
        L = np.linalg.norm(d, axis=1)
        u = d / L[:, None]
        ext = self.ext
        O0 = P1 - u * ext
        Lx = L + ext
        hr, ht, ho, hi = intersect(self.T, self.O, self.bvh, O0, u, Lx, chunk)
        segs, ov, tri = segments(len(P1), hr, ht, ho, Lx, len(self.names),
                                 self.priority, hi)
        out, ang = [], []
        for r in range(len(P1)):
            cl, ca = [], []
            for k, (lo, hi_, oi) in enumerate(segs[r]):
                lo, hi_ = lo - ext, hi_ - ext
                if hi_ <= 1e-6:
                    continue
                lo = max(lo, 0.0)
                if hi_ - lo > 1e-6:
                    cl.append((lo, hi_, oi))
                    # 入射角: 区間の入口の三角形の法線と経路のなす角。
                    #   曲面ではその点の接面の法線に相当する。
                    #   0 度 = 面に垂直に入射、90 度に近いほど斜め。
                    ti = tri[r][k] if k < len(tri[r]) else -1
                    ca.append(_incidence_deg(self.T, ti, u[r]) if ti >= 0 else 0.0)
            out.append(cl)
            ang.append(ca)
        return out, L, ov, ang

    def material(self, oi):
        return 'VOID' if oi < 0 else self.mats[oi]

    def report(self, segs, L, i=0):
        rows = ['distance = %.4f mm' % L[i]]
        for lo, hi, oi in segs[i]:
            rows.append('  %9.3f %9.3f  %8.3f  %-14s %s'
                        % (lo, hi, hi - lo, self.material(oi),
                           '-' if oi < 0 else self.names[oi]))
        return '\n'.join(rows)
