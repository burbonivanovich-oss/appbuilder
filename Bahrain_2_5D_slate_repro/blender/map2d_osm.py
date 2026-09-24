# map2d_osm.py — OSM environment layers for the 2.5D Race View.
# Reads <track>_osm_local.json (baked from Overpass, local coords) and builds:
#   - landuse raster -> terrain vertex tints (real fields/forest/village zones)
#   - real road network ribbons draped on the relief, width/colour by class
#   - streams + water polygons, parking lots, kart track (raceway)
#   - the village: extruded building prisms with drop shadows
# Used by map2d_pass.build_map2d(track, osm=True).
import bpy, bmesh, json, math, os
import numpy as np
import mathutils
from mathutils.geometry import tessellate_polygon

# landuse id -> tint (flat blue-teal family, F1M palette)
LU = {
    "grass":      (1, (0.078, 0.144, 0.163)),
    "meadow":     (1, (0.083, 0.151, 0.168)),
    "grassland":  (1, (0.078, 0.144, 0.163)),
    "farmland":   (2, (0.092, 0.139, 0.186)),
    "orchard":    (2, (0.073, 0.136, 0.151)),
    "cemetery":   (2, (0.071, 0.130, 0.148)),
    "park":       (1, (0.080, 0.148, 0.165)),
    "scrub":      (3, (0.066, 0.123, 0.139)),
    "forest":     (4, (0.052, 0.109, 0.123)),
    "wood":       (4, (0.052, 0.109, 0.123)),
    "residential":(5, (0.109, 0.151, 0.195)),
    "farmyard":   (5, (0.104, 0.144, 0.186)),
    "commercial": (5, (0.112, 0.156, 0.201)),
    "military":   (3, (0.072, 0.126, 0.143)),
    "pitch":      (2, (0.083, 0.142, 0.159)),
    "stadium":    (5, (0.109, 0.151, 0.195)),
}
ROAD = {  # class -> (width, colour, z-lift)
    "motorway":      (12.0, (0.170, 0.219, 0.281, 1), 0.60),
    "motorway_link": (8.0,  (0.156, 0.203, 0.263, 1), 0.58),
    "secondary":     (8.5,  (0.148, 0.190, 0.248, 1), 0.55),
    "tertiary":      (6.5,  (0.130, 0.173, 0.228, 1), 0.52),
    "unclassified":  (5.5,  (0.123, 0.165, 0.219, 1), 0.50),
    "residential":   (5.5,  (0.123, 0.165, 0.219, 1), 0.50),
    "service":       (4.5,  (0.108, 0.148, 0.198, 1), 0.46),
    "track":         (3.0,  (0.088, 0.123, 0.165, 1), 0.42),
}
AERO = {"runway": (30.0, (0.120, 0.155, 0.200, 1), 0.48),
        "taxiway": (12.0, (0.105, 0.140, 0.185, 1), 0.46)}
C_STREAM = (0.055, 0.115, 0.160, 1)
C_WATER = (0.042, 0.092, 0.135, 1)
C_PARK = (0.080, 0.110, 0.148, 1)
C_KART = (0.085, 0.110, 0.145, 1)


def load_osm(track, SP):
    p = os.path.join(SP, f"{track}_osm_local.json")
    if not os.path.exists(p):
        return None
    return json.load(open(p))


def landuse_raster(osm, x0, y0, x1, y1, cell=3.4):
    nx = int((x1 - x0) / cell) + 2
    ny = int((y1 - y0) / cell) + 2
    R = np.zeros((nx, ny), np.int16)
    items = sorted(osm["landuse"], key=lambda it: LU.get(it["k"], (0, None))[0])
    lut = {}
    for it in items:
        k = it["k"]
        if k not in LU:
            continue
        pri, tint = LU[k]
        if k not in lut:
            lut[k] = len(lut) + 1
        idv = lut[k]
        P = np.asarray(it["p"], float)
        gx = (P[:, 0] - x0) / cell
        gy = (P[:, 1] - y0) / cell
        jy0, jy1 = max(0, int(gy.min())), min(ny - 1, int(gy.max()) + 1)
        n = len(P)
        for jy in range(jy0, jy1 + 1):
            yc = jy + 0.5
            xs = []
            for a in range(n - 1):
                ya, yb = gy[a], gy[a + 1]
                if (ya <= yc) != (yb <= yc):
                    tq = (yc - ya) / (yb - ya)
                    xs.append(gx[a] + tq * (gx[a + 1] - gx[a]))
            xs.sort()
            for a in range(0, len(xs) - 1, 2):
                i0 = max(0, int(xs[a]))
                i1 = min(nx - 1, int(xs[a + 1]))
                if i1 >= i0:
                    R[i0:i1 + 1, jy] = idv
    tint_lut = np.zeros((len(lut) + 1, 3))
    for k, idv in lut.items():
        tint_lut[idv] = LU[k][1]
    inv = {v: k for k, v in lut.items()}
    return R, tint_lut, cell, inv


class ZGrid:
    def __init__(self, cell=18.0):
        self.cell = cell
        self.d = {}

    def feed(self, co):
        ks = np.floor(co[:, :2] / self.cell).astype(np.int64)
        for (kx, ky), z in zip(map(tuple, ks), co[:, 2]):
            cur = self.d.get((kx, ky), -1e9)
            if z > cur:
                self.d[(kx, ky)] = z

    def z(self, x, y):
        k = (int(math.floor(x / self.cell)), int(math.floor(y / self.cell)))
        v = self.d.get(k)
        if v is None:
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    v2 = self.d.get((k[0] + dx, k[1] + dy))
                    if v2 is not None:
                        v = v2 if v is None else max(v, v2)
        return v if v is not None else -2.0


def _resample_line(P, step=9.0):
    P = np.asarray(P, float)
    out = [P[0]]
    for a in range(len(P) - 1):
        seg = P[a + 1] - P[a]
        L = np.linalg.norm(seg)
        n = max(1, int(L / step))
        for s in range(1, n + 1):
            out.append(P[a] + seg * s / n)
    return np.array(out)


def _ribbon(name, pts2, width, color, zg, zlift, coll, emit=0.0, alpha=None, flatfn=None):
    pts = _resample_line(pts2)
    n = len(pts)
    if n < 2:
        return None
    tg = np.gradient(pts, axis=0)
    tg /= np.maximum(np.linalg.norm(tg, axis=1, keepdims=True), 1e-9)
    nl = np.stack([-tg[:, 1], tg[:, 0]], 1)
    v, f = [], []
    for i in range(n):
        z = zg.z(pts[i, 0], pts[i, 1]) + zlift
        a = pts[i] + nl[i] * width / 2
        b = pts[i] - nl[i] * width / 2
        v.append((a[0], a[1], z)); v.append((b[0], b[1], z))
    for i in range(n - 1):
        f.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.validate()
    me.materials.append(flatfn(f"M2D_{name.split('.')[0]}", color, emit=emit, alpha=alpha))
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def _fill_poly(name, poly, color, zg, zlift, coll, flatfn, alpha=None):
    P = np.asarray(poly, float)
    if len(P) < 3:
        return None
    if np.linalg.norm(P[0] - P[-1]) < 1e-6:
        P = P[:-1]
    if len(P) < 3:
        return None
    vecs = [mathutils.Vector((p[0], p[1], 0)) for p in P]
    tris = tessellate_polygon([vecs])
    v = [(p[0], p[1], zg.z(p[0], p[1]) + zlift) for p in P]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], [tuple(t) for t in tris])
    me.validate()
    me.materials.append(flatfn(f"M2D_{name.split('.')[0]}", color, alpha=alpha))
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def build_osm_layers(osm, sc_root, zg, C, half, N, flatfn, mesh_obj_fn, m_shadow, rng):
    """all OSM geometry except the landuse raster (handled by the terrain tint)"""
    ocol = bpy.data.collections.new("M2D_OSM")
    sc_root.children.link(ocol)
    rep = {}
    # point-in-circuit test (even-odd ray cast against the centerline polygon)
    poly = C[::8, :2]
    px_, py_ = poly[:, 0], poly[:, 1]
    px2, py2 = np.roll(px_, -1), np.roll(py_, -1)

    def inside_loop(pts):
        res = np.zeros(len(pts), bool)
        for j, (x, y) in enumerate(pts):
            cond = (py_ > y) != (py2 > y)
            with np.errstate(divide='ignore', invalid='ignore'):
                xin = px_ + (y - py_) * (px2 - px_) / (py2 - py_)
            res[j] = (np.count_nonzero(cond & (x < xin)) % 2) == 1
        return res
    # roads: skip our own ribbon; minor roads INSIDE the circuit are noise — drop them
    kd_step = 22
    Ct = C[::kd_step, :2]
    n_road = 0
    for it in osm["roads"]:
        k = it["k"]
        if k not in ROAD:
            continue
        w, col, zl = ROAD[k]
        P = np.asarray(it["p"], float)
        d = np.min(np.linalg.norm(P[:, None, :] - Ct[None], axis=2), axis=1)
        if (d < 14).mean() > 0.7:
            continue
        if k in ("service", "track", "unclassified"):
            ins = inside_loop(P[::max(1, len(P) // 8)])
            if ins.mean() > 0.5:
                continue
        _ribbon(f"M2D_Rd_{k}.{n_road}", P, w, col, zg, zl, ocol, flatfn=flatfn)
        n_road += 1
    rep["roads"] = n_road
    # kart track dropped: it fought the main circuit for attention
    # airbase runway / taxiways (Zeltweg!)
    for i, it in enumerate(osm.get("aeroway", [])):
        if it["k"] not in AERO:
            continue
        w, col, zl = AERO[it["k"]]
        _ribbon(f"M2D_Aero.{i}", it["p"], w, col, zg, zl, ocol, flatfn=flatfn)
    # streams
    for i, it in enumerate(osm["streams"]):
        w = 5.0 if it["k"] == "river" else 2.3
        _ribbon(f"M2D_Stream.{i}", it["p"], w, C_STREAM, zg, 0.30, ocol, flatfn=flatfn)
    # water polygons
    for i, pl in enumerate(osm["water"]):
        _fill_poly(f"M2D_Water.{i}", pl, C_WATER, zg, 0.34, ocol, flatfn)
    # parking lots
    for i, pl in enumerate(osm["parking"]):
        _fill_poly(f"M2D_Park.{i}", pl, C_PARK, zg, 0.36, ocol, flatfn)
    rep["parking"] = len(osm["parking"])
    # buildings: one merged mesh (walls + roofs) + merged shadows
    v_all, f_all, mi_all = [], [], []
    sv_all, sf_all = [], []
    for pl in osm["buildings"]:
        P = np.asarray(pl, float)
        if np.linalg.norm(P[0] - P[-1]) < 1e-6:
            P = P[:-1]
        if len(P) < 3:
            continue
        cxy = P.mean(0)
        z0 = zg.z(cxy[0], cxy[1]) + 0.15
        h = float(rng.uniform(3.6, 6.8))
        b0 = len(v_all)
        n = len(P)
        for p in P:
            v_all.append((p[0], p[1], z0))
        for p in P:
            v_all.append((p[0], p[1], z0 + h))
        for a in range(n):
            b = (a + 1) % n
            f_all.append((b0 + a, b0 + b, b0 + n + b, b0 + n + a)); mi_all.append(0)
        vecs = [mathutils.Vector((p[0], p[1], 0)) for p in P]
        for t in tessellate_polygon([vecs]):
            f_all.append(tuple(b0 + n + i for i in t)); mi_all.append(1)
        s0 = len(sv_all)
        for p in P:
            sv_all.append((p[0] + 4.5, p[1] - 4.5, z0 + 0.05))
        for t in tessellate_polygon([vecs]):
            sf_all.append(tuple(s0 + i for i in t))
    if v_all:
        me = bpy.data.meshes.new("M2D_Buildings")
        me.from_pydata(v_all, [], f_all)
        me.validate()
        me.materials.append(flatfn("M2D_BSideOSM", (0.082, 0.132, 0.185, 1)))
        me.materials.append(flatfn("M2D_BTopOSM", (0.145, 0.215, 0.290, 1)))
        for p_, mi in zip(me.polygons, mi_all):
            p_.material_index = mi
            p_.use_smooth = False
        ob = bpy.data.objects.new("M2D_Buildings", me)
        ocol.objects.link(ob)
        me2 = bpy.data.meshes.new("M2D_BuildSh")
        me2.from_pydata(sv_all, [], sf_all)
        me2.validate()
        me2.materials.append(m_shadow)
        ocol.objects.link(bpy.data.objects.new("M2D_BuildSh", me2))
    rep["buildings"] = len(osm["buildings"])
    return rep
