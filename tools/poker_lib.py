# poker_lib.py -- read POKER's LIB folder: material compositions, photon mass
# attenuation coefficients, and the buildup-factor availability lists.
#
#   lib = PokerLib(r"C:\Poker")
#   lib.mu("Iron", 1.25)          -> linear attenuation coefficient [1/cm]
#   lib.single                    -> set of materials with 1-layer buildup data
#   lib.two                       -> set of ("A","B") ordered pairs
#   lib.three                     -> set of ("A","B","C") triples
import os
import re

import numpy as np


def _parse_materials(path):
    mats = {}
    block = []
    text = open(path, encoding="utf-8", errors="replace").read().splitlines()
    # the file header runs up to and including the "matNum=" line, with no
    # blank line before the first material -- drop it before block splitting
    for i, ln in enumerate(text):
        if ln.strip().lower().startswith("matnum"):
            text = text[i + 1:]
            break
    for raw in text + [""]:
        line = raw.rstrip()
        if line.strip() == "":
            if len(block) >= 2:
                name = block[0].strip()
                body = [b for b in block[1:] if not b.lstrip().startswith("!")]
                if body:
                    head = body[0].split()
                    try:
                        rho, n = float(head[0]), int(head[1])
                    except (ValueError, IndexError):
                        block = []
                        continue
                    comp = {}
                    for ln in body[1:1 + n]:
                        p = ln.split()
                        if len(p) >= 2:
                            comp[int(p[0])] = float(p[1])
                    s = sum(comp.values())
                    if s > 0 and comp:
                        mats[name] = (rho, dict((z, w / s) for z, w in comp.items()))
            block = []
        else:
            block.append(line)
    return mats


def _parse_atten(path):
    data = {}
    lines = open(path, encoding="utf-8", errors="replace").read().splitlines()
    i = 0
    while i < len(lines):
        m = re.match(r"\s*z=\s*(\d+)", lines[i])
        if not m:
            i += 1
            continue
        z = int(m.group(1))
        i += 1
        n = None
        while i < len(lines):
            g = re.match(r"\s*EGrp=\s*(\d+)", lines[i])
            if g:
                n = int(g.group(1))
                i += 2          # skip the column header line
                break
            i += 1
        if n is None:
            break
        e, inc, tot = [], [], []
        for ln in lines[i:i + n]:
            p = ln.split()
            if len(p) >= 3:
                e.append(float(p[0])); inc.append(float(p[1])); tot.append(float(p[2]))
        i += n
        if e:
            data[z] = (np.array(e), np.array(inc), np.array(tot))
    return data


def _parse_setting(path):
    txt = open(path, encoding="utf-8", errors="replace").read()
    out = {}
    for key in ("buildup_material", "twolayer_buildup_material",
                "threelayer_buildup_material", "slant_correction_material"):
        m = re.search(key + r"\s*:\s*\[(.*?)\]", txt, re.S)
        out[key] = [t.strip() for t in m.group(1).split(",") if t.strip()] if m else []
    return out


class PokerLib(object):
    def __init__(self, install_dir, setting="lib_setting.dat"):
        lib = os.path.join(install_dir, "LIB")
        self.dir = lib
        cfg = _parse_setting(os.path.join(lib, setting))
        txt = open(os.path.join(lib, setting), encoding="utf-8",
                   errors="replace").read()
        fm = re.search(r"file_material\s*:\s*(\S+)", txt)
        fa = re.search(r"file_attenuation\s*:\s*(\S+)", txt)
        self.material_file = fm.group(1) if fm else "lib_material.dat"
        self.atten_file = fa.group(1) if fa else "atten2_xcom2.dat"
        self.materials = _parse_materials(os.path.join(lib, self.material_file))
        self.atten = _parse_atten(os.path.join(lib, self.atten_file))
        self.single = set(cfg["buildup_material"])
        # POKER can combine any two standard materials for 2-layer buildup;
        # the list in lib_setting.dat only restricts what the GUI offers.
        # Air (and VOID) are excluded as layer materials.
        self.two_gui = set(tuple(p.split("-")) for p in cfg["twolayer_buildup_material"])
        pool = sorted(self.single - set(["Air"]))
        self.two = set((a, b) for a in pool for b in pool)
        # 3-layer data really is limited to the two listed patterns.
        self.three = set(tuple(p.split("-")) for p in cfg["threelayer_buildup_material"])
        self.slant = set(cfg["slant_correction_material"])

    def mu_rho(self, z, energy, column="total"):
        e, inc, tot = self.atten[z]
        y = tot if column == "total" else inc
        return float(np.exp(np.interp(np.log(energy), np.log(e), np.log(y))))

    def mu(self, material, energy, column="total"):
        if material in ("VOID",):
            return 0.0
        rho, comp = self.materials[material]
        return rho * sum(w * self.mu_rho(z, energy, column) for z, w in comp.items())

    def mu_table(self, energy, column="total"):
        return dict((m, self.mu(m, energy, column)) for m in self.materials)

    def scatter_fraction(self, material, energy):
        # incoherent (Compton) share of the total cross section.  Buildup is
        # driven by how much of the interaction is scattering rather than
        # absorption, so this is a better match criterion than Z alone.
        tot = self.mu(material, energy, "total")
        return self.mu(material, energy, "incoherent") / tot if tot else 0.0

    def z_eff(self, material):
        # electron-fraction weighted Z (A taken as 2Z, adequate for ranking)
        rho, comp = self.materials[material]
        w = dict((z, f * (0.5 if z > 1 else 1.0)) for z, f in comp.items())
        s = sum(w.values())
        return sum(w[z] * z for z in w) / s if s else 0.0

    def suggest_equivalent(self, material, energy):
        # rank standard buildup materials by closeness of scatter fraction
        r = self.scatter_fraction(material, energy)
        out = []
        for m in sorted(self.single - set(["Air"])):
            out.append((abs(self.scatter_fraction(m, energy) - r), m,
                        self.scatter_fraction(m, energy), self.z_eff(m)))
        out.sort()
        return r, self.z_eff(material), out


if __name__ == "__main__":
    import sys
    lib = PokerLib(sys.argv[1] if len(sys.argv) > 1 else r"C:\Poker")
    e = float(sys.argv[2]) if len(sys.argv) > 2 else 1.25
    print("material file : %s" % lib.material_file)
    print("atten file    : %s   (%d elements)" % (lib.atten_file, len(lib.atten)))
    print("materials     : %d" % len(lib.materials))
    print("1-layer buildup: %d   2-layer: %d   3-layer: %d"
          % (len(lib.single), len(lib.two), len(lib.three)))
    print("")
    print("mu at %.3f MeV [1/cm]   (* = no 1-layer buildup data)" % e)
    for m in sorted(lib.materials):
        rho = lib.materials[m][0]
        print("  %-18s rho=%7.4f  mu=%9.5f  mfp=%8.3f cm %s"
              % (m, rho, lib.mu(m, e), 1.0 / lib.mu(m, e) if lib.mu(m, e) else 0,
                 "" if m in lib.single else "*"))
