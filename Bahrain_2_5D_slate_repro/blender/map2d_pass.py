# map2d_pass.py v2 — F1 Manager-style 2.5D "Race View", rebuilt to match the
# reference frame: patchwork fields, service roads + parking lots, clustered
# forests with shadows, corner run-offs, two-tone building volumes with drop
# shadows, glowing track outline, vignette + bloom, rounded label chips.
import bpy, bmesh, json, math, os
import numpy as np
import mathutils

SP = "/private/tmp/claude-501/-Users-artemporubov-Documents-f1-prototype-F1-prototype-F1Manager2027-Unity/9c06b5bc-5ee2-4390-8e84-4e38e46ff00e/scratchpad"
OUT = "/Users/artemporubov/Documents/f1_prototype/F1_prototype/blender"

FILES = {"rbr": ("RedBullRing_3D.blend", "rbr_geo.json")}
for t in ["monza", "bahrain", "hungaroring", "jeddah", "melbourne", "suzuka", "shanghai",
          "miami", "imola", "monaco", "montreal", "catalunya", "silverstone", "spa",
          "zandvoort", "baku", "singapore", "austin", "mexico", "interlagos", "vegas",
          "lusail", "yasmarina"]:
    FILES[t] = (t.capitalize() + "_3D.blend", t + "_geo.json")

WID = {"rbr": (13.0, 15.0), "bahrain": (13.0, 15.0), "monza": (12.0, 15.0),
       "monaco": (10.0, 11.0), "baku": (11.0, 14.5), "singapore": (11.5, 14.5)}

P = {
    "track":    (0.055, 0.075, 0.104, 1),
    "edge":     (1.00, 0.145, 0.19, 1),      # coral glow
    "runoff":   (0.085, 0.115, 0.152, 1),
    "pitlane":  (0.085, 0.125, 0.175, 1),
    "line":     (0.62, 0.74, 0.88, 1),
    "road":     (0.100, 0.135, 0.180, 1),
    "park":     (0.060, 0.088, 0.124, 1),
    "bld_side": (0.075, 0.125, 0.180, 1),
    "bld_top":  (0.130, 0.200, 0.278, 1),
    "pit_top":  (0.165, 0.250, 0.340, 1),
    "shadow":   (0.012, 0.020, 0.034, 1),
    "tree_a":   (0.058, 0.158, 0.172, 1),
    "tree_b":   (0.050, 0.132, 0.148, 1),
    "label_bg": (0.030, 0.050, 0.080, 1),
    "label_tx": (0.92, 0.95, 1.00, 1),
    "white":    (0.85, 0.90, 0.97, 1),
}
# terrain patchwork tints (dark blue-green farmland family)
PATCH = [(0.052, 0.090, 0.118), (0.072, 0.115, 0.148), (0.048, 0.105, 0.108),
         (0.082, 0.125, 0.165), (0.058, 0.082, 0.115), (0.070, 0.130, 0.128)]
TEAMS = [
    (0.62, 0.05, 0.04, 1), (0.95, 0.38, 0.03, 1), (0.05, 0.12, 0.45, 1),
    (0.78, 0.78, 0.80, 1), (0.03, 0.42, 0.36, 1), (0.35, 0.35, 0.40, 1),
    (0.88, 0.80, 0.10, 1), (0.48, 0.04, 0.30, 1), (0.04, 0.52, 0.78, 1),
    (0.18, 0.56, 0.12, 1),
]
CODES = ["VLK", "RSA", "MRN", "DKE", "TAN", "BRG", "KOV", "SIL", "ADR", "FNT",
         "OKS", "LMB", "HRT", "PVL", "GRC", "NYS", "BAL", "ECK", "RIV", "ZWD"]
PLAYER_TEAM = 0   # this team's cars get the highlighted marker + label
FONT_PATH = SP + "/assets/fonts/TitilliumWeb-Bold.ttf"


# ---------------------------------------------------------------- geometry --
def centerline(geo_json, N=2200):
    d = json.load(open(geo_json))
    Pn = np.array(d["track"], float)
    n = len(Pn)
    seg = np.linalg.norm(np.roll(Pn, -1, 0) - Pn, axis=1)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    total = cum[-1]
    t = np.linspace(0, total, N, endpoint=False)
    outp = np.empty((N, 3))
    idx = np.clip(np.searchsorted(cum, t, side='right') - 1, 0, n - 1)
    for k, (tt, i) in enumerate(zip(t, idx)):
        L = cum[i + 1] - cum[i]
        u = 0.0 if L <= 0 else (tt - cum[i]) / L
        p0, p1, p2, p3 = Pn[(i - 1) % n], Pn[i], Pn[(i + 1) % n], Pn[(i + 2) % n]
        u2, u3 = u * u, u ** 3
        outp[k] = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
                         (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
    kk = 15
    w = np.hanning(kk); w /= w.sum()
    z = outp[:, 2]
    outp[:, 2] = np.convolve(np.concatenate([z[-kk:], z, z[:kk]]), w, "same")[kk:-kk]
    return outp, total, N


def corner_zones(C, N, total, n_max=9):
    ds = total / N
    v1 = C[(np.arange(N) + 4) % N, :2] - C[:, :2]
    v0 = C[:, :2] - C[(np.arange(N) - 4) % N, :2]
    cross = v0[:, 0] * v1[:, 1] - v0[:, 1] * v1[:, 0]
    dot = (v0 * v1).sum(1)
    k = np.arctan2(cross, dot) / (8 * ds)
    kk = 21
    w = np.hanning(kk); w /= w.sum()
    ks = np.convolve(np.concatenate([k[-kk:], k, k[:kk]]), w, "same")[kk:-kk]
    zones = []
    i = 0
    while i < N:
        if abs(ks[i]) > 0.004:
            j = i
            while j < N and abs(ks[j]) > 0.004:
                j += 1
            if (j - i) * ds > 15:
                pk = i + int(np.argmax(np.abs(ks[i:j])))
                zones.append((i, j, float(np.sign(ks[pk])), float(np.max(np.abs(ks[i:j])))))
            i = j
        else:
            i += 1
    zones.sort(key=lambda z: -z[3])
    return zones[:n_max]


def flat(name, color, emit=0.0, alpha=None):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 0.0
    if emit > 0:
        b.inputs["Emission Color"].default_value = color
        b.inputs["Emission Strength"].default_value = emit
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        m.surface_render_method = 'BLENDED'
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mesh_obj(name, verts, faces, mat, coll, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    if mat:
        me.materials.append(mat)
    for p_ in me.polygons:
        p_.use_smooth = smooth
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def rounded_rect(w, h, r, seg=3):
    """verts of a rounded rectangle in XY, centred"""
    v = []
    cs = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, math.pi / 2),
          (-w / 2 + r, -h / 2 + r, math.pi), (w / 2 - r, -h / 2 + r, 3 * math.pi / 2)]
    for cx, cy, a0 in cs:
        for s in range(seg + 1):
            a = a0 + (math.pi / 2) * s / seg
            v.append((cx + r * math.cos(a), cy + r * math.sin(a), 0.0))
    return v


def value_noise(x, y):
    """cheap organic mask in [-1..1]"""
    return (np.sin(x * 0.0061 + 1.7) * np.sin(y * 0.0052 + 0.4)
            + 0.6 * np.sin((x + y) * 0.0043 + 2.9)
            + 0.4 * np.sin((x - y) * 0.0087 + 0.8)) / 2.0


# ------------------------------------------------------------------- build --
def build_map2d(track="rbr", spread_cars=True, use_osm=True):
    fn, geo = FILES[track]
    if bpy.data.filepath != os.path.join(OUT, fn):
        bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT, fn))
    # real-environment layers (OpenStreetMap, baked to local coords)
    osm_ns, osm = {}, None
    if use_osm and os.path.exists(SP + "/map2d_osm.py"):
        exec(open(SP + "/map2d_osm.py").read(), osm_ns)
        osm = osm_ns["load_osm"](track, SP)
    NAME = track.upper() + "_Map2D"
    old = bpy.data.scenes.get(NAME)
    if old:
        bpy.data.scenes.remove(old)
    sc = bpy.data.scenes.new(NAME)
    root = sc.collection
    src_sc = next(s for s in bpy.data.scenes if s.name.endswith("_Track"))
    rng = np.random.default_rng(7)

    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.eevee.taa_render_samples = 48
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'

    # world: soft radial gradient (lighter around the circuit, darker at frame edges)
    w = bpy.data.worlds.new(NAME + "_W")
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    wout = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    tco = nt.nodes.new("ShaderNodeTexCoord")
    mapn = nt.nodes.new("ShaderNodeMapping")
    mapn.inputs["Location"].default_value = (-0.5, -0.5, 0)
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = 'SPHERICAL'
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (0.004, 0.008, 0.018, 1)
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[1].color = (0.030, 0.052, 0.082, 1)
    nt.links.new(tco.outputs["Window"], mapn.inputs["Vector"])
    nt.links.new(mapn.outputs["Vector"], grad.inputs["Vector"])
    nt.links.new(grad.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs["Background"], wout.inputs["Surface"])
    sc.world = w

    C, total, N = centerline(SP + "/" + geo)
    ds = total / N
    Tg = np.roll(C, -1, 0) - np.roll(C, 1, 0)
    Tg /= np.linalg.norm(Tg, axis=1, keepdims=True)
    NL = np.stack([-Tg[:, 1], Tg[:, 0], np.zeros(N)], 1)
    NL /= np.linalg.norm(NL, axis=1, keepdims=True)
    tw, sw = WID.get(track, (12.0, 14.5))
    wid = np.full(N, tw)
    dist = np.linspace(0, total, N, endpoint=False)
    wid[(dist > total - 260) | (dist < 380)] = sw
    kw = 41
    ww = np.hanning(kw); ww /= ww.sum()
    wid = np.convolve(np.concatenate([wid[-kw:], wid, wid[:kw]]), ww, "same")[kw:-kw]
    half = wid / 2
    halfd = half * 1.80   # drawn width: exaggerated for readability, F1M-style
    cent2 = C[:, :2].mean(0)
    Z = 0.0

    # ================= 1. TERRAIN: patchwork fields + squashed relief ========
    gcol = bpy.data.collections.new("M2D_Ground"); root.children.link(gcol)
    # patch seeds
    xy = C[:, :2]
    pad = 900
    seeds = np.stack([rng.uniform(xy[:, 0].min() - pad, xy[:, 0].max() + pad, 90),
                      rng.uniform(xy[:, 1].min() - pad, xy[:, 1].max() + pad, 90)], 1)
    seed_tint = rng.integers(0, len(PATCH), len(seeds))
    m_terr = bpy.data.materials.get("M2D_TerrainVC") or bpy.data.materials.new("M2D_TerrainVC")
    m_terr.use_nodes = True
    ntm = m_terr.node_tree
    ntm.nodes.clear()
    outm = ntm.nodes.new("ShaderNodeOutputMaterial")
    bm_ = ntm.nodes.new("ShaderNodeBsdfPrincipled")
    attr = ntm.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "M2DCol"
    ntm.links.new(attr.outputs["Color"], bm_.inputs["Base Color"])
    bm_.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bm_.inputs:
        bm_.inputs["Specular IOR Level"].default_value = 0.0
    ntm.links.new(bm_.outputs["BSDF"], outm.inputs["Surface"])
    zs = []
    for o in src_sc.objects:
        if o.type == 'MESH' and o.name.split('.')[0].startswith("Terrain"):
            me = o.data
            nv = len(me.vertices)
            if nv:
                co = np.empty(nv * 3); me.vertices.foreach_get("co", co)
                zs.append(co.reshape(-1, 3)[:, 2])
    z_all = np.concatenate(zs) if zs else np.array([0.0])
    z_lo, z_hi = float(np.percentile(z_all, 2)), float(np.percentile(z_all, 98))
    # landuse raster + relief z-grid for the OSM layers
    osm_R = None
    if osm:
        rx0, ry0 = xy[:, 0].min() - 850, xy[:, 1].min() - 850
        rx1, ry1 = xy[:, 0].max() + 850, xy[:, 1].max() + 850
        osm_R, osm_lut, rcell, osm_inv = osm_ns["landuse_raster"](osm, rx0, ry0, rx1, ry1)
        zg = osm_ns["ZGrid"]()
    for o in src_sc.objects:
        if o.type != 'MESH' or not o.name.split('.')[0].startswith("Terrain"):
            continue
        cp = o.copy(); cp.data = o.data.copy(); cp.name = "M2D_" + o.name
        me = cp.data
        me.materials.clear()
        me.materials.append(m_terr)
        nv = len(me.vertices)
        co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        rel = np.clip((co[:, 2] - z_lo) / max(z_hi - z_lo, 1e-6), 0, 1)
        co[:, 2] = rel * 22.0 - 24.0
        me.vertices.foreach_set("co", co.ravel()); me.update()
        if osm_R is not None:
            zg.feed(co)
        # per-vertex colour: patch tint * elevation shade (OSM landuse overrides)
        d2 = ((co[:, None, :2] - seeds[None, :, :]) ** 2).sum(-1)
        near = np.argmin(d2, axis=1)
        tint = np.array(PATCH)[seed_tint[near]]
        if osm_R is not None:
            ix = np.clip(((co[:, 0] - rx0) / rcell).astype(int), 0, osm_R.shape[0] - 1)
            iy = np.clip(((co[:, 1] - ry0) / rcell).astype(int), 0, osm_R.shape[1] - 1)
            ids = osm_R[ix, iy]
            tint = np.where(ids[:, None] > 0, osm_lut[ids], tint)
        shade = (0.68 + 0.42 * rel)[:, None]
        colv = np.clip(tint * shade, 0, 1)
        rgba = np.concatenate([colv, np.ones((nv, 1))], 1).astype(np.float32)
        ca = me.color_attributes.get("M2DCol") or me.color_attributes.new("M2DCol", 'FLOAT_COLOR', 'POINT')
        ca.data.foreach_set("color", rgba.ravel())
        for p_ in me.polygons:
            p_.use_smooth = False
        gcol.objects.link(cp)

    # ================= 2. ROADS + PARKING ====================================
    rcol = bpy.data.collections.new("M2D_Roads"); root.children.link(rcol)
    m_road = flat("M2D_Road", P["road"])
    m_park = flat("M2D_Park", P["park"])
    m_shadow_early = flat("M2D_Shadow", P["shadow"], alpha=0.55)
    if osm:
        # the real environment replaces every synthetic road/parking layer
        wid_tmp = np.full(N, WID.get(track, (12.0, 14.5))[0] / 2)
        osm_rep = osm_ns["build_osm_layers"](
            osm, root, zg, C, wid_tmp, N, flat, mesh_obj, m_shadow_early,
            np.random.default_rng(11))

    def open_ribbon(name, pts, width, z, mat, coll):
        pts = np.asarray(pts, float)
        n = len(pts)
        tg = np.gradient(pts, axis=0)
        tg /= np.maximum(np.linalg.norm(tg, axis=1, keepdims=True), 1e-9)
        nl = np.stack([-tg[:, 1], tg[:, 0]], 1)
        v, f = [], []
        for i in range(n):
            a = pts[i] + nl[i] * width / 2; b = pts[i] - nl[i] * width / 2
            v.append((a[0], a[1], z)); v.append((b[0], b[1], z))
        for i in range(n - 1):
            f.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
        return mesh_obj(name, v, f, mat, coll)

    if not osm:
        # perimeter service road (offset ring away from the loop centre)
        ring = []
        for i in range(0, N, 6):
            sd = 1 if np.dot(NL[i][:2], cent2 - C[i, :2]) < 0 else -1
            ring.append(C[i, :2] + NL[i][:2] * sd * (half[i] + 42.0))
        ring.append(ring[0])
        ring = np.array(ring)
        kk2 = 9
        wsm = np.hanning(kk2); wsm /= wsm.sum()
        for c_ in range(2):
            col = ring[:, c_]
            ring[:, c_] = np.convolve(np.concatenate([col[-kk2:], col, col[:kk2]]), wsm, "same")[kk2:-kk2]
        open_ribbon("M2D_RingRoad", ring, 7.0, Z - 0.05, m_road, rcol)
        # access spurs to the map edge
        for aa in (0.4, 2.1, 4.3):
            start = ring[int(len(ring) * (aa / (2 * math.pi))) % len(ring)]
            end = start + (start - cent2) * 2.2
            pts = np.stack([start + (end - start) * t for t in np.linspace(0, 1, 24)])
            pts += rng.normal(0, 6, pts.shape) * np.linspace(0, 1, 24)[:, None]
            open_ribbon(f"M2D_Spur{aa:.0f}", pts, 6.0, Z - 0.06, m_road, rcol)
    # parking lots behind the pit building with tiny cars
    pb = src_sc.objects.get("PitBuilding")
    if pb and not osm:
        bv = np.empty(len(pb.data.vertices) * 3); pb.data.vertices.foreach_get("co", bv)
        bv = bv.reshape(-1, 3)
        bc = bv[:, :2].mean(0)
        away = bc - cent2; away /= np.linalg.norm(away)
        axp = np.array([-away[1], away[0]])
        carm = [flat(f"M2D_PCar{i}", c, 0) for i, c in enumerate(
            [(0.30, 0.34, 0.40, 1), (0.42, 0.16, 0.14, 1), (0.16, 0.24, 0.38, 1), (0.55, 0.55, 0.58, 1)])]
        for lot in (-1, 1):
            lc = bc + away * 95 + axp * lot * 120
            v = []
            W_, H_ = 130, 70
            for du, dv in [(-1, -1), (1, -1), (1, 1), (-1, 1)]:
                p_ = lc + axp * du * W_ / 2 + away * dv * H_ / 2
                v.append((p_[0], p_[1], Z - 0.04))
            mesh_obj(f"M2D_Lot{lot}", v, [(0, 1, 2, 3)], m_park, rcol)
            # rows of car rectangles
            vv, ff, mi = [], [], []
            for row in range(4):
                for kcar in range(16):
                    if rng.random() < 0.35:
                        continue
                    cc = lc + axp * (-W_ / 2 + 8 + kcar * 7.6) + away * (-H_ / 2 + 10 + row * 16)
                    b_ = len(vv)
                    for du, dv in [(-1.1, -2.3), (1.1, -2.3), (1.1, 2.3), (-1.1, 2.3)]:
                        p_ = cc + axp * du + away * dv
                        vv.append((p_[0], p_[1], Z + 0.35))
                    ff.append((b_, b_ + 1, b_ + 2, b_ + 3))
                    mi.append(int(rng.integers(0, 4)))
            if vv:
                me = bpy.data.meshes.new(f"M2D_LotCars{lot}")
                me.from_pydata(vv, [], ff)
                me.validate()
                for mm_ in carm:
                    me.materials.append(mm_)
                for p_, i_ in zip(me.polygons, mi):
                    p_.material_index = i_
                ob = bpy.data.objects.new(f"M2D_LotCars{lot}", me)
                rcol.objects.link(ob)

    # ================= 3. TRACK: runoffs, ribbon, glow, kerb-corners =========
    tcol = bpy.data.collections.new("M2D_Track"); root.children.link(tcol)
    m_track = flat("M2D_Track", P["track"])
    m_edge = flat("M2D_Edge", P["edge"], emit=1.9)
    m_glow = flat("M2D_Glow", P["edge"], emit=0.7, alpha=0.06)
    m_line = flat("M2D_Line", P["line"], emit=0.35)
    m_runoff = flat("M2D_Runoff", P["runoff"])
    m_white = flat("M2D_White", P["white"], emit=0.8)

    def loop_ribbon(name, off_in, off_out, z, mat, skip=None):
        v, f = [], []
        for i in range(N):
            a = C[i] + NL[i] * off_in[i]; b = C[i] + NL[i] * off_out[i]
            v.append((a[0], a[1], z)); v.append((b[0], b[1], z))
        for i in range(N):
            j = (i + 1) % N
            if skip is not None and (skip[i] or skip[j]):
                continue
            f.append((2 * i, 2 * i + 1, 2 * j + 1, 2 * j))
        return mesh_obj(name, v, f, mat, tcol)

    # ---- pit lane: REAL OSM geometry when available, else a synthetic one ----
    # (the track edge must BREAK where the lane splits off and merges back)
    real_pit = None
    if osm and osm.get("pitlane"):
        real_pit = np.asarray(osm["pitlane"], float)
    pb_src = src_sc.objects.get("PitBuilding")
    if pb_src is not None:
        bv = np.empty(len(pb_src.data.vertices) * 3)
        pb_src.data.vertices.foreach_get("co", bv)
        pbc = bv.reshape(-1, 3)[:, :2].mean(0)
        sd_pit = 1 if np.dot(NL[0][:2], pbc - C[0, :2]) > 0 else -1
    else:
        sd_pit = 1 if np.dot(NL[0][:2], cent2 - C[0, :2]) > 0 else -1
    edge_skip = np.zeros(N, bool)
    if real_pit is not None:
        # break the edge wherever the real lane hugs the track (entry + exit forks)
        dens = []
        for a in range(len(real_pit) - 1):
            seg = real_pit[a + 1] - real_pit[a]
            L_ = np.linalg.norm(seg)
            for s_ in range(max(1, int(L_ / 4))):
                dens.append(real_pit[a] + seg * s_ / max(1, int(L_ / 4)))
        dens = np.array(dens)
        dd_ = np.linalg.norm(dens[:, None, :] - C[None, ::2, :2], axis=2)
        j_min = np.argmin(dd_, axis=1) * 2
        d_min = dd_.min(axis=1)
        for j, dv in zip(j_min, d_min):
            if dv < 13.0:
                for w in range(-2, 3):
                    edge_skip[(int(j) + w) % N] = True
    else:
        BL = min(340.0, total * 0.075)
        taper, hold = 150.0, BL * 1.45
        d_in = (total - BL * 0.62 - 280) % total
        seglen = taper + hold + taper
        for dq_ in np.arange(6.0, taper * 0.82, 4.0):
            edge_skip[int(((d_in + dq_) % total) / ds) % N] = True
        for dq_ in np.arange(seglen - taper * 0.82, seglen - 6.0, 4.0):
            edge_skip[int(((d_in + dq_) % total) / ds) % N] = True
    skipL = edge_skip if sd_pit > 0 else None
    skipR = edge_skip if sd_pit < 0 else None

    # corner run-off aprons (outer side of each corner)
    for (i0, i1, sgn, _) in corner_zones(C, N, total):
        pad_i = int(24 / ds)
        ii = [(i % N) for i in range(i0 - pad_i, i1 + pad_i)]
        prof = np.hanning(len(ii))
        v, f = [], []
        for k_, i in enumerate(ii):
            wOut = halfd[i] + 2 + prof[k_] * 28.0
            a = C[i] + NL[i] * (-sgn) * halfd[i]
            b = C[i] + NL[i] * (-sgn) * wOut
            v.append((a[0], a[1], Z - 0.02)); v.append((b[0], b[1], Z - 0.02))
        for k_ in range(len(ii) - 1):
            f.append((2 * k_, 2 * k_ + 1, 2 * k_ + 3, 2 * k_ + 2))
        mesh_obj("M2D_Runoff", v, f, m_runoff, tcol)

    loop_ribbon("M2D_GlowL", halfd + 0.8, halfd + 4.5, Z + 0.05, m_glow, skip=skipL)
    loop_ribbon("M2D_GlowR", -halfd - 4.5, -halfd - 0.8, Z + 0.05, m_glow, skip=skipR)
    loop_ribbon("M2D_Asphalt", -halfd, halfd, Z + 0.08, m_track)
    EW = 1.6
    loop_ribbon("M2D_EdgeL", halfd, halfd + EW, Z + 0.14, m_edge, skip=skipL)
    loop_ribbon("M2D_EdgeR", -halfd - EW, -halfd, Z + 0.14, m_edge, skip=skipR)
    # kerbs: one continuous muted red band through each corner — quiet, not checkered
    m_kerb = flat("M2D_Kerb", (0.52, 0.13, 0.13, 1), emit=0.15)
    KW = 1.9
    for (i0, i1, sgn, _) in corner_zones(C, N, total):
        for side in (1, -1):
            v_, f_ = [], []
            rng_i = list(range(i0 - int(10 / ds), i1 + int(10 / ds), 2))
            for a, iw in enumerate(rng_i):
                ii = iw % N
                pin = C[ii] + NL[ii] * side * halfd[ii]
                pout = C[ii] + NL[ii] * side * (halfd[ii] + KW)
                v_.append((pin[0], pin[1], Z + 0.16)); v_.append((pout[0], pout[1], Z + 0.16))
            for a in range(len(rng_i) - 1):
                f_.append((2 * a, 2 * a + 1, 2 * a + 3, 2 * a + 2))
            me_k = bpy.data.meshes.new("M2D_Kerb")
            me_k.from_pydata(v_, [], f_)
            me_k.validate()
            me_k.materials.append(m_kerb)
            ob_k = bpy.data.objects.new("M2D_Kerb", me_k)
            tcol.objects.link(ob_k)
    # start-finish bar
    i = 0
    a = C[i] + NL[i] * halfd[i]; b = C[i] - NL[i] * halfd[i]
    tgv = Tg[i]
    v = []
    for pnt, s in ((a, -1), (b, -1), (b, 1), (a, 1)):
        q = pnt + tgv * s * 1.4
        v.append((q[0], q[1], Z + 0.16))
    mesh_obj("M2D_SFLine", v, [(0, 1, 3, 2)], m_white, tcol)

    # pit lane — real OSM polyline (resampled + smoothed) or the synthetic fallback
    LANE_W = 7.0
    HOLD_OFF = 13.0
    if real_pit is not None:
        lane_pts = []
        for a in range(len(real_pit) - 1):
            seg = real_pit[a + 1] - real_pit[a]
            L_ = np.linalg.norm(seg)
            n_ = max(1, int(L_ / 7.0))
            for s_ in range(n_):
                lane_pts.append(real_pit[a] + seg * s_ / n_)
        lane_pts.append(real_pit[-1])
        lane_pts = np.array(lane_pts)
        # the drawn track is 1.8x real width, which would swallow the real lane —
        # push the lane out by exactly that exaggeration, tapering to 0 at the forks
        out_pts = []
        for p_ in lane_pts:
            j = int(np.argmin(np.linalg.norm(C[:, :2] - p_, axis=1)))
            lat_ = float(np.dot(p_ - C[j, :2], NL[j][:2]))
            s_lat = 1.0 if lat_ >= 0 else -1.0
            grow = (halfd[j] - half[j] + LANE_W * 0.6) * min(1.0, abs(lat_) / 14.0)
            out_pts.append(C[j, :2] + NL[j][:2] * (lat_ + s_lat * grow))
        lane_pts = np.array(out_pts)
        ks = 7
        wsm2 = np.hanning(ks); wsm2 /= wsm2.sum()
        for c_ in range(2):
            col = lane_pts[:, c_]
            lane_pts[:, c_] = np.convolve(np.r_[np.repeat(col[0], ks), col, np.repeat(col[-1], ks)],
                                          wsm2, "same")[ks:-ks]
        # The real lane's fork points sit ON the racing line (lat 0) — correct for
        # the real 13 m track, but the drawn ribbon is 1.8x wider, so those last
        # ~70 m ran on top of the painted asphalt as a dark tongue crossing the
        # track. Trim both ends back to the drawn edge: the lane now meets the
        # edge and stops, where the coral edge is already broken by edge_skip.
        lat_out = np.empty(len(lane_pts))
        for k_, p_ in enumerate(lane_pts):
            j = int(np.argmin(np.linalg.norm(C[:, :2] - p_, axis=1)))
            lat_out[k_] = abs(float(np.dot(p_ - C[j, :2], NL[j][:2]))) - halfd[j]
        keep = np.where(lat_out >= -0.35)[0]
        if len(keep) > 4:
            lane_pts = lane_pts[keep[0]:keep[-1] + 1]
    else:
        lane_pts = []
        dq = 0.0
        while dq <= seglen:
            i = int(((d_in + dq) % total) / ds) % N
            if dq < taper:
                u = dq / taper
                off = (halfd[i] - 2.5) + u * u * (2.5 + HOLD_OFF)
            elif dq < taper + hold:
                off = halfd[i] + HOLD_OFF
            else:
                u = (dq - taper - hold) / taper
                off = halfd[i] + HOLD_OFF - u * u * (2.5 + HOLD_OFF)
            p = C[i] + NL[i] * sd_pit * off
            lane_pts.append((p[0], p[1]))
            dq += 8.0
        lane_pts = np.array(lane_pts)
    tgl = np.gradient(lane_pts, axis=0)
    tgl /= np.maximum(np.linalg.norm(tgl, axis=1, keepdims=True), 1e-9)
    nll = np.stack([-tgl[:, 1], tgl[:, 0]], 1)
    v_, f_ = [], []
    for i2 in range(len(lane_pts)):
        a = lane_pts[i2] + nll[i2] * LANE_W / 2
        b = lane_pts[i2] - nll[i2] * LANE_W / 2
        v_.append((a[0], a[1], Z + 0.10)); v_.append((b[0], b[1], Z + 0.10))
    for i2 in range(len(lane_pts) - 1):
        f_.append((2 * i2, 2 * i2 + 1, 2 * i2 + 3, 2 * i2 + 2))
    mesh_obj("M2D_PitLane", v_, f_, flat("M2D_PitMat", P["pitlane"]), tcol)
    # thin white separation line on the track side of the lane
    trk_side = np.array([1.0 if np.dot(nll[i2], C[np.argmin(np.linalg.norm(C[:, :2] - lane_pts[i2], axis=1))][:2]
                                       - lane_pts[i2]) > 0 else -1.0
                         for i2 in range(0, len(lane_pts), 12)])
    sgn_sep = 1.0 if trk_side.mean() > 0 else -1.0
    v_, f_ = [], []
    for i2 in range(len(lane_pts)):
        base_v = lane_pts[i2] + nll[i2] * sgn_sep * (LANE_W / 2 + 0.3)
        tip_v = lane_pts[i2] + nll[i2] * sgn_sep * (LANE_W / 2 + 1.1)
        v_.append((base_v[0], base_v[1], Z + 0.115)); v_.append((tip_v[0], tip_v[1], Z + 0.115))
    for i2 in range(len(lane_pts) - 1):
        f_.append((2 * i2, 2 * i2 + 1, 2 * i2 + 3, 2 * i2 + 2))
    mesh_obj("M2D_PitSep", v_, f_, m_line, tcol)

    # ================= 4. BUILDINGS: two-tone + drop shadows ================
    bcol = bpy.data.collections.new("M2D_Blocks"); root.children.link(bcol)
    m_side = flat("M2D_BSide", P["bld_side"])
    m_top = flat("M2D_BTop", P["bld_top"])
    m_ptop = flat("M2D_PitTop", P["pit_top"])
    m_shadow = flat("M2D_Shadow", P["shadow"], alpha=0.55)
    for o in src_sc.objects:
        if o.type != 'MESH':
            continue
        base = o.name.split('.')[0]
        if not base.startswith(("Stand", "PitBuilding", "Paddock")):
            continue
        cp = o.copy(); cp.data = o.data.copy(); cp.name = "M2D_" + o.name
        me = cp.data
        me.materials.clear()
        me.materials.append(m_side)
        me.materials.append(m_ptop if base.startswith("PitBuilding") else m_top)
        nv = len(me.vertices)
        co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        zmin = co[:, 2].min()
        co[:, 2] = (co[:, 2] - zmin) * 0.62 + Z + 0.1
        me.vertices.foreach_set("co", co.ravel()); me.update()
        nf = len(me.polygons)
        nrm = np.empty(nf * 3); me.polygons.foreach_get("normal", nrm)
        mi = (nrm.reshape(-1, 3)[:, 2] > 0.6).astype(np.int32)
        me.polygons.foreach_set("material_index", mi)
        for p_ in me.polygons:
            p_.use_smooth = False
        bcol.objects.link(cp)
        # soft drop shadow: bbox quad offset to the south-east
        bb = co
        x0, x1 = bb[:, 0].min(), bb[:, 0].max()
        y0, y1 = bb[:, 1].min(), bb[:, 1].max()
        offs = 7.0
        sv = [(x0 + offs, y0 - offs, Z + 0.02), (x1 + offs, y0 - offs, Z + 0.02),
              (x1 + offs, y1 - offs, Z + 0.02), (x0 + offs, y1 - offs, Z + 0.02)]
        mesh_obj("M2D_Sh_" + base, sv, [(0, 1, 2, 3)], m_shadow, bcol)

    # ================= 5. FOREST: clustered dots + shadows ==================
    fcol = bpy.data.collections.new("M2D_Foliage"); root.children.link(fcol)
    pts = []
    for o in src_sc.objects:
        if o.type != 'MESH' or not o.name.split('.')[0].startswith(("Forest", "Palm")):
            continue
        me = o.data
        nv = len(me.vertices)
        if nv == 0:
            continue
        co = np.empty(nv * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
        pts.append(co[::5, :2] + np.array(o.matrix_world.translation)[:2])
    dots = np.zeros((0, 2))
    if osm_R is not None:
        # real forests: sample points inside OSM forest/wood polygons
        f_ids = [i for i, k in osm_inv.items() if k in ("forest", "wood", "scrub")]
        cand = np.stack([rng.uniform(rx0, rx1, 30000), rng.uniform(ry0, ry1, 30000)], 1)
        ix = np.clip(((cand[:, 0] - rx0) / rcell).astype(int), 0, osm_R.shape[0] - 1)
        iy = np.clip(((cand[:, 1] - ry0) / rcell).astype(int), 0, osm_R.shape[1] - 1)
        ids_c = osm_R[ix, iy]
        sel = np.isin(ids_c, [i for i, k in osm_inv.items() if k in ("forest", "wood")])
        sel_scrub = np.isin(ids_c, [i for i, k in osm_inv.items() if k == "scrub"])
        sel_scrub &= rng.random(len(cand)) < 0.10   # sparse bushes on scrub
        dots = cand[sel | sel_scrub]
        if len(dots) > 1300:
            dots = dots[rng.choice(len(dots), 1300, replace=False)]
    elif pts:
        allp = np.vstack(pts)
        cell = 15.0
        keys = np.round(allp / cell).astype(np.int64)
        uniq = {}
        for k_, p_ in zip(map(tuple, keys), allp):
            uniq.setdefault(k_, p_)
        dots = np.array(list(uniq.values()))
        # organic clustering: keep where the mask says forest, always keep near track
        mask = value_noise(dots[:, 0], dots[:, 1])
        d_trk = np.min(np.linalg.norm(dots[:, None, :] - C[None, ::22, :2], axis=2), axis=1)
        keep = (mask > 0.08) | (d_trk < 60)
        keep &= rng.random(len(dots)) < 0.92
        dots = dots[keep]
    if len(dots):
        jit = rng.normal(0, 4.5, dots.shape)
        dots = dots + jit
        radii = rng.uniform(2.0, 3.6, len(dots))
        which = rng.random(len(dots)) < 0.6
        for mat_i, (mat_c, sel) in enumerate(
                ((P["tree_a"], which), (P["tree_b"], ~which))):
            sub = dots[sel]; rr = radii[sel]
            if not len(sub):
                continue
            bm = bmesh.new()
            for p_, r_ in zip(sub, rr):
                bmesh.ops.create_circle(
                    bm, cap_ends=True, radius=r_, segments=9,
                    matrix=mathutils.Matrix.Translation((p_[0], p_[1], Z + 0.9)))
            me = bpy.data.meshes.new(f"M2D_Trees{mat_i}")
            bm.to_mesh(me); bm.free()
            me.materials.append(flat(f"M2D_Tree{mat_i}", mat_c))
            fcol.objects.link(bpy.data.objects.new(f"M2D_Trees{mat_i}", me))
        # no per-tree shadows: the forest reads as a zone, dots are just texture

    # ================= 6. CARS + LABEL CHIPS ================================
    ccol = bpy.data.collections.new("M2D_Cars"); root.children.link(ccol)
    cam_tilt = 47.0   # oblique broadcast-map angle
    positions = []
    if spread_cars:
        d = total * 0.62
        gaps = [0, 38, 52, 145, 62, 40, 58, 210, 44, 66, 52, 39, 300, 55, 47, 190, 61, 43, 57, 120]
        for g in gaps:
            d = (d - g) % total
            positions.append(d)
    else:
        positions = [(total - 9.0 - 8.0 * k) % total for k in range(20)]
    for k, dq in enumerate(positions):
        i = int(dq / ds) % N
        lat = (-1 if k % 2 else 1) * (halfd[i] * 0.35)
        p_ = C[i] + NL[i] * lat
        team = k % 10
        is_player = (team == PLAYER_TEAM)
        scale_p = 1.30 if is_player else 1.0
        # direction dart: white outline + team fill, stretched to defeat foreshortening
        ang = math.atan2(Tg[i][1], Tg[i][0]) - math.pi / 2
        ca_, sa_ = math.cos(ang), math.sin(ang)
        YSTR = 1.42   # compensates cos(cam_tilt) squash so the dart reads true from camera

        def dart(L, W, z):
            pts = [(0, L * 0.62), (W / 2, -L * 0.38), (-W / 2, -L * 0.38)]  # plain triangle
            out = []
            for x_, y_ in pts:
                rx = x_ * ca_ - y_ * sa_
                ry = x_ * sa_ + y_ * ca_
                out.append((rx, ry * YSTR, z))
            return out
        meH = bpy.data.meshes.new(f"M2D_Halo_{k+1}")
        meH.from_pydata(dart(26.2 * scale_p, 17.6 * scale_p, 0), [], [(0, 1, 2)])
        meH.validate()
        meH.materials.append(flat("M2D_HaloP" if is_player else "M2D_HaloW",
                                  (1, 1, 1, 1), emit=1.5 if is_player else 1.1))
        obH = bpy.data.objects.new(f"M2D_Halo_{k+1}", meH)
        obH.location = (p_[0], p_[1], Z + 1.42)
        ccol.objects.link(obH)
        meD = bpy.data.meshes.new(f"M2D_Car_{k+1}")
        meD.from_pydata(dart(23.5 * scale_p, 15.5 * scale_p, 0), [], [(0, 1, 2)])
        meD.validate()
        meD.materials.append(flat(f"M2D_Team{team}", TEAMS[team], emit=1.4))
        obD = bpy.data.objects.new(f"M2D_Car_{k+1}", meD)
        obD.location = (p_[0], p_[1], Z + 1.58)
        ccol.objects.link(obD)
        # every car gets a label chip; alternate above/below so they don't collide
        side_l = 1 if k % 2 == 0 else -1
        oy = 34.0 * side_l
        oz = 22.0 if side_l > 0 else 8.0
        plate_v = rounded_rect(66, 21, 7.5, 3)
        nseg = len(plate_v)
        me = bpy.data.meshes.new(f"M2D_Plate_{k+1}")
        me.from_pydata(plate_v, [], [tuple(range(nseg))])
        me.validate()
        if is_player:
            pc = TEAMS[team]
            me.materials.append(flat("M2D_LabelBgP", (pc[0] * 0.45, pc[1] * 0.45, pc[2] * 0.45, 1),
                                     emit=0.5, alpha=1.0))
        else:
            me.materials.append(flat("M2D_LabelBg", P["label_bg"], emit=0.3, alpha=1.0))
        pl = bpy.data.objects.new(f"M2D_Plate_{k+1}", me)
        pl.location = (p_[0], p_[1] + oy, Z + oz)
        pl.rotation_euler = (math.radians(cam_tilt), 0, 0)
        ccol.objects.link(pl)
        # leader stem from the dot to the chip
        stem = mesh_obj(f"M2D_Stem_{k+1}",
                        [(-0.8, 0, 0), (0.8, 0, 0), (0.8, oy * 0.72, oz * 0.7), (-0.8, oy * 0.72, oz * 0.7)],
                        [(0, 1, 2, 3)], flat("M2D_StemW", (0.85, 0.9, 1, 1), emit=0.8, alpha=0.5), ccol)
        stem.location = (p_[0], p_[1], Z + 1.5)
        chip = mesh_obj(f"M2D_Chip_{k+1}",
                        [(-2.6, -7.4, 0), (2.6, -7.4, 0), (2.6, 7.4, 0), (-2.6, 7.4, 0)],
                        [(0, 1, 2, 3)], flat(f"M2D_Team{team}", TEAMS[team], emit=2.6), ccol)
        chip.location = (p_[0] - 27.0, p_[1] + oy + 0.3, Z + oz + 0.2)
        chip.rotation_euler = (math.radians(cam_tilt), 0, 0)
        cu = bpy.data.curves.new(f"M2D_Lbl_{k+1}", 'FONT')
        cu.body = f"{k+1} {CODES[k]}"
        cu.size = 12.6 if is_player else 12.0
        cu.space_character = 1.10
        cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        if os.path.exists(FONT_PATH):
            cu.font = bpy.data.fonts.load(FONT_PATH, check_existing=True)
        t_ob = bpy.data.objects.new(f"M2D_Lbl_{k+1}", cu)
        t_ob.data.materials.append(flat("M2D_LabelTx", (1, 1, 1, 1), emit=0.85))
        t_ob.location = (p_[0] + 3.5, p_[1] + oy + 0.1, Z + oz + 0.4)
        t_ob.rotation_euler = (math.radians(cam_tilt), 0, 0)
        ccol.objects.link(t_ob)

    # ================= 7. LIGHT + VIGNETTE + CAMERA + BLOOM =================
    lcol = bpy.data.collections.new("M2D_Light"); root.children.link(lcol)
    sun = bpy.data.objects.new("M2D_Sun", bpy.data.lights.new("M2D_Sun", 'SUN'))
    sun.data.energy = 3.6
    sun.data.color = (0.72, 0.83, 1.0)
    sun.data.angle = math.radians(40)
    sun.rotation_euler = (math.radians(30), 0, math.radians(200))
    lcol.objects.link(sun)

    xy = C[:, :2]
    cx = (xy[:, 0].min() + xy[:, 0].max()) / 2
    cy = (xy[:, 1].min() + xy[:, 1].max()) / 2
    span = max(xy[:, 0].max() - xy[:, 0].min(), xy[:, 1].max() - xy[:, 1].min())
    # vignette: huge blended plane above the scene, transparent centre
    m_vig = bpy.data.materials.new("M2D_Vig")
    m_vig.use_nodes = True
    m_vig.surface_render_method = 'BLENDED'
    ntv = m_vig.node_tree
    ntv.nodes.clear()
    vout = ntv.nodes.new("ShaderNodeOutputMaterial")
    vb = ntv.nodes.new("ShaderNodeBsdfPrincipled")
    vb.inputs["Base Color"].default_value = (0.004, 0.008, 0.016, 1)
    vb.inputs["Roughness"].default_value = 1.0
    tcv = ntv.nodes.new("ShaderNodeTexCoord")
    grv = ntv.nodes.new("ShaderNodeTexGradient")
    grv.gradient_type = 'SPHERICAL'
    mpv = ntv.nodes.new("ShaderNodeMapping")
    mpv.inputs["Location"].default_value = (-0.5, -0.5, 0)
    rmv = ntv.nodes.new("ShaderNodeMapRange")
    # Виньетка давала альфу 0.82 по краям — это и есть "странная темноватая рамочка":
    # видимая тёмная кайма вокруг кадра. Ослаблено до 0.22 и отодвинуто к самым углам.
    rmv.inputs["From Min"].default_value = 0.06
    rmv.inputs["From Max"].default_value = 0.42
    rmv.inputs["To Min"].default_value = 0.22
    rmv.inputs["To Max"].default_value = 0.0
    ntv.links.new(tcv.outputs["Window"], mpv.inputs["Vector"])
    ntv.links.new(mpv.outputs["Vector"], grv.inputs["Vector"])
    ntv.links.new(grv.outputs["Fac"], rmv.inputs["Value"])
    ntv.links.new(rmv.outputs["Result"], vb.inputs["Alpha"])
    ntv.links.new(vb.outputs["BSDF"], vout.inputs["Surface"])
    # oblique perspective camera — the F1M broadcast-map feel
    cd = bpy.data.cameras.new("Cam_Map2D")
    cd.lens = 44
    cd.clip_start = 5.0
    cd.clip_end = 60000
    cam = bpy.data.objects.new("Cam_Map2D", cd)
    tilt = math.radians(cam_tilt)

    # Fit the camera to THIS track, don't guess a constant. `span * 1.55` was tuned on
    # RBR (a compact ring); long circuits (Spa 7 km, Monza) fell out of the bottom of
    # frame — measured 9 of 16 clipped. Project the real track points through the
    # camera and grow the distance until every one lands inside a safe margin.
    aspect = sc.render.resolution_x / max(sc.render.resolution_y, 1)
    sy = math.tan(math.atan2(cd.sensor_width / 2, cd.lens))   # half-FOV tangents
    sx = sy
    if aspect >= 1.0:
        sy = sx / aspect
    else:
        sx = sy * aspect
    fit_pts = np.column_stack([C[:, 0], C[:, 1], C[:, 2]])   # NB: `P` is the palette dict

    # UI SAFE BOX. Measured across all 16 renders: the track occupies only ~14% of frame
    # and peak cell occupancy is 29%, so there IS room — but the rails were only "88%
    # free", i.e. some tracks poked into them. Since the scene is ours, don't fit UI
    # around the track: fit the TRACK into the box the UI leaves. Then the rails are
    # clean by construction on every circuit, not by luck.
    #   left rail 15.5% | right rail 17.5% | top bar 8.5% | race-control strip 5%
    UI_L, UI_R, UI_T, UI_B = 0.155, 0.175, 0.085, 0.050
    bu0, bu1 = -1.0 + 2 * UI_L, 1.0 - 2 * UI_R      # box in NDC (-1..1)
    bw0, bw1 = -1.0 + 2 * UI_B, 1.0 - 2 * UI_T
    BU, BW = (bu1 - bu0) / 2, (bw1 - bw0) / 2       # half-extents
    CU, CW = (bu0 + bu1) / 2, (bw0 + bw1) / 2       # box centre

    fwd = np.array([0.0, math.sin(tilt), -math.cos(tilt)])
    up = np.array([0.0, math.cos(tilt), math.sin(tilt)])
    right = np.array([1.0, 0.0, 0.0])

    def ndc(d, off):
        eye = np.array([cx, cy - d * math.sin(tilt), d * math.cos(tilt)]) + off
        v = fit_pts - eye
        z = v @ fwd
        if (z <= 0.1).any():
            return None
        return (v @ right) / z / sx, (v @ up) / z / sy

    # Фит идёт по ОСЕВОЙ линии (C), а на экране лента шире её + свечение по краям.
    # На 0.94 Spa вылезал на 1% за нижнюю кромку. 0.90 покрывает полуширину ленты.
    MARGIN = 0.90
    dist_c = span * 1.2
    off = np.zeros(3)
    for _ in range(80):
        r = ndc(dist_c, off)
        if r is not None:
            u, w = r
            # сдвинуть камеру так, чтобы трасса села в ЦЕНТР БОКСА
            du = CU - (u.min() + u.max()) / 2
            dw = CW - (w.min() + w.max()) / 2
            off = off - right * (du * sx * dist_c) - up * (dw * sy * dist_c)
            r2 = ndc(dist_c, off)
            if r2 is not None:
                u, w = r2
                if ((u.max() - u.min()) / 2 < BU * MARGIN and
                        (w.max() - w.min()) / 2 < BW * MARGIN):
                    break
        dist_c *= 1.05
    cam.location = (cx + off[0], cy - dist_c * math.sin(tilt) + off[1],
                    dist_c * math.cos(tilt) + off[2])
    cam.rotation_euler = (tilt, 0, 0)
    root.objects.link(cam)
    sc.camera = cam
    # vignette: camera-parented quad covering the whole frustum (Window-space gradient)
    dv = dist_c * 0.5
    Sh = dv * math.tan(math.atan(18.0 / cd.lens)) * 2.6
    Sw = Sh * 2.0
    vig = mesh_obj("M2D_Vignette", [(-Sw, -Sh, 0), (Sw, -Sh, 0), (Sw, Sh, 0), (-Sw, Sh, 0)],
                   [(0, 1, 2, 3)], m_vig, lcol)
    vig.parent = cam
    vig.location = (0, 0, -dv)
    # bloom (Blender 5.1: Glare type is a menu socket)
    try:
        ng = bpy.data.node_groups.new(NAME + "_Comp", 'CompositorNodeTree')
        try:
            ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
        except Exception:
            pass
        rl = ng.nodes.new('CompositorNodeRLayers')
        rl.scene = sc
        gout = ng.nodes.new('NodeGroupOutput')
        g = ng.nodes.new("CompositorNodeGlare")
        g.inputs["Type"].default_value = 'Bloom'
        g.inputs["Threshold"].default_value = 1.6
        g.inputs["Strength"].default_value = 0.14
        ng.links.new(rl.outputs["Image"], g.inputs["Image"])
        ng.links.new(g.outputs[0], gout.inputs[0])
        sc.compositing_node_group = ng
        sc.render.use_compositing = True
    except Exception:
        pass
    # ── МОСТ В UNITY ────────────────────────────────────────────────────────────
    # Экран гонки рисует карту тонкой проволочной линией, потому что у Unity нет
    # способа положить точки машин на КАРТИНКУ из Blender: он не знает камеру.
    # Поэтому проецируем осевую линию ТОЙ ЖЕ камерой, что рендерит PNG, и отдаём
    # экранные координаты 0..1. Тогда Unity просто интерполирует вдоль готовой
    # 2D-ломаной — совпадение пиксель-в-пиксель, без подгонки и без переноса сцены.
    import json as _json
    eye = np.array(cam.location, float)
    _fwd = np.array([0.0, math.sin(tilt), -math.cos(tilt)])
    _up = np.array([0.0, math.cos(tilt), math.sin(tilt)])
    _rt = np.array([1.0, 0.0, 0.0])
    V = np.column_stack([C[:, 0], C[:, 1], C[:, 2]]) - eye
    zc = V @ _fwd
    su = (V @ _rt) / np.maximum(zc, 1e-6) / sx      # -1..1 поперёк кадра
    sv = (V @ _up) / np.maximum(zc, 1e-6) / sy
    px = (su * 0.5 + 0.5)                            # 0..1, слева направо
    py = (0.5 - sv * 0.5)                            # 0..1, СВЕРХУ вниз (как в UI)
    bridge = {
        "track": track,
        "render": {"w": sc.render.resolution_x, "h": sc.render.resolution_y},
        # safe-box, в который вписана трасса — UI может рисовать рейлы поверх
        "ui_safe": {"l": UI_L, "r": UI_R, "t": UI_T, "b": UI_B},
        # осевая линия в экранных 0..1, замкнутая, порядок = направление движения
        "centerline_px": [[round(float(a), 5), round(float(b), 5)] for a, b in zip(px, py)],
        # длина круга в метрах по сегментам — Unity переводит долю круга в индекс
        "lap_m": float(np.sum(np.linalg.norm(np.diff(np.vstack([C[:, :2], C[:1, :2]]), axis=0), axis=1))),
    }
    _bp = os.path.join(SP, f"map2d_{track}_bridge.json")
    with open(_bp, "w") as _f:
        _json.dump(bridge, _f)
    print(f"BRIDGE {track}: {len(bridge['centerline_px'])} точек, круг {bridge['lap_m']:.0f} м -> {_bp}", flush=True)
    return {"scene": NAME, "cars": len(positions), "trees": int(len(dots)),
            "bridge": _bp}
