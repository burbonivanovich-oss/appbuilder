# map2d_clean_batch.py — re-render a track's saved 2.5D Race View map WITHOUT the
# baked 20-car debug overlay, optionally decluttering the surroundings.
#
#   Blender -b blender/<Track>_3D.blend -P blender/map2d_clean_batch.py \
#           -- <track> <out.png> [declutter-level]
#
#   declutter-level: 0 = off (default) | 1 = soft | 2 = medium | 3 = hard
#
# WHY NOT map2d_batch.py: that path calls map2d_pass.build_map2d(), which rebuilds the
# scene from geo/OSM/font inputs under map2d_pass.SP — a 2026-07-17 session scratchpad
# that no longer exists (and blender/osm/ only ever kept rbr). It also cannot skip the
# cars: `spread_cars` picks their SPACING, not their presence, and section 6
# "CARS + LABEL CHIPS" (map2d_pass.py:685) runs unconditionally.
#
# Instead we re-render the <TRACK>_Map2D scene that the 2026-07-16 batch already saved
# into each .blend (map2d_batch.py ends with save_mainfile). Nothing is rebuilt, so the
# CAMERA is untouched → the shipped *_bridge.json stays valid. Do NOT regenerate bridges
# here: `overtake_zones` is written into them afterwards by
# scripts/trackdata/export_zones.py and would be silently dropped.
#
# The blend is never saved — hiding, fading and face culling are in-memory only.
#
# NOTE on material names: in the SAVED scenes the OSM materials carry a doubled prefix
# ("M2D_M2D_Rd_service", not "M2D_Rd_service"). map2d_look_golden.py looks for the
# single-prefix names, which is why its road fade never bit on these scenes.
import bpy
import mathutils, sys, math, os, json, traceback
import numpy as np

# The 20-car debug overlay, by object-name prefix. Everything else — track ribbon,
# kerbs, buildings, terrain, trees, glow, vignette, sun — is the map and stays.
OVERLAY_PREFIXES = (
    "M2D_Car_",     # team-coloured direction darts
    "M2D_Halo_",    # white outline behind each dart
    "M2D_Plate_",   # rounded label chip background
    "M2D_Chip_",    # team-colour tab on the chip
    "M2D_Stem_",    # leader line from dart to chip
    "M2D_Lbl_",     # "<pos> <CODE>" text
)

SAMPLES = 32        # matches map2d_batch.py
RES = (1600, 900)   # matches the shipped PNGs; keep in sync or bridges mis-project

PARK = (0.060, 0.088, 0.124)   # map2d_pass P["park"] — the tone clutter fades toward

# ─────────────────────────────────────────────────────────────────────────────
# LANDUSE RE-PALETTE
#
# The shipped palette (map2d_osm.py LU + map2d_pass.py PATCH) puts ALL 16 landuse
# classes inside 20 luma of 255 — forest and a shopping centre differ by 8% — and
# collapses to 13 distinct colours. That single fact, not the lack of texture, is
# what makes the environment read as one undifferentiated smear.
#
# The palette is baked into the M2DCol vertex layer at BUILD time, and this tool
# deliberately never saves the blend, so we cannot fix it at the source without
# re-running the whole geo/OSM pass over 24 files. Instead we invert the bake:
# every stored colour is `tint * shade` for one of 19 known tints (16 LU + 6 PATCH,
# 19 after dedup) and a scalar shade in [0.68, 1.10] (map2d_pass.py: 0.68+0.42*rel).
# For each vertex we find the tint that best explains the colour, then re-emit with
# the replacement tint and the SAME shade — so relief shading survives untouched.
SHADE_LO, SHADE_HI = 0.68, 1.10

_LU_OLD = {   # map2d_osm.py:14 — linear RGB, authoritative
    "grass": (0.078, 0.144, 0.163), "meadow": (0.083, 0.151, 0.168),
    "grassland": (0.078, 0.144, 0.163), "farmland": (0.092, 0.139, 0.186),
    "orchard": (0.073, 0.136, 0.151), "cemetery": (0.071, 0.130, 0.148),
    "park": (0.080, 0.148, 0.165), "scrub": (0.066, 0.123, 0.139),
    "forest": (0.052, 0.109, 0.123), "wood": (0.052, 0.109, 0.123),
    "residential": (0.109, 0.151, 0.195), "farmyard": (0.104, 0.144, 0.186),
    "commercial": (0.112, 0.156, 0.201), "military": (0.072, 0.126, 0.143),
    "pitch": (0.083, 0.142, 0.159), "stadium": (0.109, 0.151, 0.195),
}
_PATCH_OLD = [  # map2d_pass.py:41 — the synthetic tint used where OSM has no landuse
    (0.052, 0.090, 0.118), (0.072, 0.115, 0.148), (0.048, 0.105, 0.108),
    (0.082, 0.125, 0.165), (0.058, 0.082, 0.115), (0.070, 0.130, 0.128),
]


def _srgb(*rgb255):
    """sRGB 0-255 → linear. Palettes below are written in sRGB because that is the
    space the eye (and the reference screenshots) work in."""
    out = []
    for c in rgb255:
        c /= 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


# Three hue families, so the map answers "what is this ground" at a glance:
#   green  = vegetation      ochre = agriculture      blue-grey = built
# Luma spread 70..136 (was 87..108).
_LU_TEMPERATE = {
    "forest": _srgb(48, 76, 68), "wood": _srgb(48, 76, 68),
    "scrub": _srgb(66, 88, 74), "park": _srgb(60, 96, 82),
    "grass": _srgb(78, 112, 88), "grassland": _srgb(78, 112, 88),
    "meadow": _srgb(82, 116, 90), "orchard": _srgb(84, 108, 78),
    "pitch": _srgb(72, 118, 90), "cemetery": _srgb(86, 96, 88),
    "military": _srgb(94, 96, 80),
    "farmland": _srgb(126, 118, 84), "farmyard": _srgb(112, 100, 76),
    "residential": _srgb(118, 124, 136), "stadium": _srgb(122, 126, 138),
    "commercial": _srgb(132, 136, 146),
}

# Bahrain, Jeddah, Lusail, Yas Marina and Vegas currently render their desert in
# temperate green. Same three families, shifted to sand / dust / bleached concrete.
_LU_ARID = {
    "forest": _srgb(84, 84, 64), "wood": _srgb(84, 84, 64),
    "scrub": _srgb(104, 98, 74), "park": _srgb(88, 106, 76),
    "grass": _srgb(120, 112, 82), "grassland": _srgb(120, 112, 82),
    "meadow": _srgb(124, 116, 86), "orchard": _srgb(100, 106, 72),
    "pitch": _srgb(78, 114, 84), "cemetery": _srgb(112, 106, 90),
    "military": _srgb(116, 110, 88),
    "farmland": _srgb(146, 132, 98), "farmyard": _srgb(132, 118, 90),
    "residential": _srgb(134, 130, 124), "stadium": _srgb(138, 134, 128),
    "commercial": _srgb(146, 142, 134),
}

# Street circuits: the ground is concrete, tarmac and harbour, not countryside.
_LU_URBAN = {
    "forest": _srgb(62, 78, 70), "wood": _srgb(62, 78, 70),
    "scrub": _srgb(84, 92, 82), "park": _srgb(74, 100, 82),
    "grass": _srgb(88, 112, 90), "grassland": _srgb(88, 112, 90),
    "meadow": _srgb(92, 116, 94), "orchard": _srgb(94, 110, 84),
    "pitch": _srgb(80, 116, 90), "cemetery": _srgb(104, 108, 104),
    "military": _srgb(108, 108, 100),
    "farmland": _srgb(126, 120, 100), "farmyard": _srgb(114, 108, 94),
    "residential": _srgb(124, 128, 136), "stadium": _srgb(128, 132, 140),
    "commercial": _srgb(138, 141, 148),
}

# ── the PATCH problem ────────────────────────────────────────────────────────
# Measured across all 24 circuits: OSM landuse covers 58% of Spa, 57% of Imola and
# 56% of the Red Bull Ring — and 0% of Monaco, Baku, Singapore, Vegas, Yas Marina,
# Melbourne, Silverstone and Bahrain. On those eight the entire "landuse patchwork"
# is the builder's synthetic Voronoi fallback (map2d_pass.py PATCH + `seeds`),
# i.e. pure noise. Giving those cells six visibly different tones invents geography
# that does not exist, so the patch tints COLLAPSE to one base per palette with a
# ±4% whisper — enough to avoid a dead flat fill, not enough to read as fields.
# Where the data IS real, the LU tables above keep their full hue split.
_PATCH_JITTER = (0.96, 0.98, 1.00, 1.02, 1.04, 0.99)
_PATCH_BASE = {
    "temperate": _srgb(74, 104, 82),    # unremarkable countryside
    "arid":      _srgb(138, 116, 92),   # sand: R > G > B with a real warm
                                        # falloff. At G/R = 0.93 the old tint
                                        # read as olive drab, not desert.
    "urban":     _srgb(78, 84, 92),     # concrete, NOT the pale slab a lighter grey
                                        # gives: the track ribbon is ~(55,65,80) and
                                        # has to stay the darkest thing in frame.
}

# The tables above are written at full strength so the hue relationships are easy to
# read. GAIN then seats each palette in the broadcast-dark frame — without it the map
# is a lit daytime satellite tile floating on a near-black UI.
_GAIN = {"temperate": 0.80, "arid": 0.74, "urban": 0.92}


def _dim(rgb, g):
    return tuple(c * g for c in rgb)


def _patch_set(kind):
    b = _dim(_PATCH_BASE[kind], _GAIN[kind])
    return [tuple(c * j for c in b) for j in _PATCH_JITTER]


def _lu_set(table, kind):
    return {k: _dim(v, _GAIN[kind]) for k, v in table.items()}


PALETTES = {
    "temperate": (_lu_set(_LU_TEMPERATE, "temperate"), _patch_set("temperate"),
                  _dim(_PATCH_BASE["temperate"], _GAIN["temperate"])),
    "arid":      (_lu_set(_LU_ARID, "arid"), _patch_set("arid"),
                  _dim(_PATCH_BASE["arid"], _GAIN["arid"])),
    "urban":     (_lu_set(_LU_URBAN, "urban"), _patch_set("urban"),
                  _dim(_PATCH_BASE["urban"], _GAIN["urban"])),
}

# Jeddah is a corniche circuit with desert behind it, so sand wins there. Vegas is
# NOT: the Strip runs between hotels and parking structures, and rendering it as
# open desert reads as the wrong city entirely.
TRACK_PALETTE = {
    "bahrain": "arid", "lusail": "arid", "yasmarina": "arid", "jeddah": "arid",
    "monaco": "urban", "baku": "urban", "singapore": "urban", "miami": "urban",
    "vegas": "urban",
}   # everything else → temperate

# ─────────────────────────────────────────────────────────────────────────────
# BROADCAST LOOK (level 6) — targets the F1 Manager 2024 race-view reference
#
# Two things separate the reference from everything above, and neither is texture:
#
#  1. KEY IS INVERTED. Their map is LIGHT — pale concrete, cream sand, sage
#     landscaping — and only the UI chrome is dark. Contrast comes from a dark
#     ribbon on light ground, not from a glowing line on a dark field.
#  2. THE CIRCUIT HAS ITS OWN FURNITURE. Run-off, kerbs and pit apron are separate,
#     clearly separated tones. Measured here, M2D_Runoff sRGB(82,95,109) sits 16 luma
#     from M2D_Track sRGB(66,77,91) — invisible. In the reference the run-off is a
#     broad pale band, and it is the single strongest "this is a circuit" cue.
#
# Level 6 keeps level 2's declutter (same roads / buildings / distance culling) and
# changes only tone. Level 2 is untouched and remains what ships until this is chosen.
def _premium(rgb255, green_sat=0.70, other_sat=0.80,
             hue_target=60.0, hue_pull=1.0, green_light=0.94):
    """Mute a bright-palette entry.

    Measured on the shipped renders: the green ground came out at 12.4% saturation,
    hue 144 deg, lightness 62% — hue 144 is a pure spring green and reads as plastic.
    The desert, which nobody objected to, measures 5.5% / hue 52. That is the target.

    The authored hue is 60 deg (yellow-olive), NOT the ~105 the eye wants, because the
    scene applies a strong cold cast: fitting the render transfer per channel over two
    known input/output pairs gives out = k*in + c with k = (0.95, 0.97, 1.31) and
    c = (-14, -7, -43). Blue is amplified 1.31x. Authoring a sage green lands the render
    on hue 180 (teal); pre-rotating to yellow-olive lands it near 100-110.

    Do not chase the output hue further: at ~5% chroma it is numerically unstable
    (two inputs a unit apart read 108 and 135 deg). Saturation and value are the
    meaningful controls, and they go 12.4% -> ~6% and 62% -> ~57%.

    Non-greens (ochre farmland, concrete, water) only lose a fifth of their chroma —
    they were already restrained and going further turns the map into pencil rubbings.
    """
    import colorsys
    r, g, b = [c / 255.0 for c in rgb255]
    h, l, sat = colorsys.rgb_to_hls(r, g, b)
    hd = h * 360.0
    if 85.0 <= hd <= 175.0:
        hd += (hue_target - hd) * hue_pull
        sat *= green_sat
        l *= green_light
    else:
        sat *= other_sat
    r, g, b = colorsys.hls_to_rgb((hd % 360.0) / 360.0, l, sat)
    return (r * 255.0, g * 255.0, b * 255.0)


def _psrgb(*rgb255):
    return _srgb(*_premium(rgb255))


_LU_BRIGHT = {
    # Value, not hue, is what carries the information once chroma is this low, so the
    # classes are spread wider apart in lightness than the original table had them.
    "forest": _psrgb(96, 114, 90), "wood": _psrgb(96, 114, 90),
    "scrub": _psrgb(146, 156, 128), "park": _psrgb(140, 168, 132),
    "grass": _psrgb(174, 190, 154), "grassland": _psrgb(174, 190, 154),
    "meadow": _psrgb(186, 200, 166), "orchard": _psrgb(156, 168, 132),
    "pitch": _psrgb(150, 182, 146), "cemetery": _psrgb(176, 180, 170),
    "military": _psrgb(172, 172, 156),
    "farmland": _psrgb(198, 186, 150), "farmyard": _psrgb(186, 174, 146),
    "residential": _psrgb(196, 196, 194), "stadium": _psrgb(198, 198, 196),
    "commercial": _psrgb(204, 204, 202),
}
_PATCH_BASE_BRIGHT = {
    "temperate": _psrgb(168, 182, 152),   # sage landscaping
    "arid":      _psrgb(198, 183, 158),   # cream sand
    "urban":     _psrgb(162, 164, 163),   # concrete. At 192 a street circuit
                                         # blows out to near-white paper.
}
for _k, _b in _PATCH_BASE_BRIGHT.items():
    PALETTES[_k + "_bright"] = (
        _LU_BRIGHT, [tuple(c * j for c in _b) for j in _PATCH_JITTER], _b)

# Fixed-tone materials, in sRGB. Every one of these is currently a shade of the same
# dark blue-grey, which is why the circuit reads as a single silhouette.
_LOOK_BRIGHT = {
    "M2D_Track":   ((74, 76, 80), None),      # dark neutral asphalt
    "M2D_Runoff":  ((176, 158, 132), None),   # the pale band the reference lives on
    "M2D_Kerb":    ((224, 78, 74), 0.22),   # brighter: at this zoom a kerb is
                                            # 1-2 px and loses to the ribbon
    "M2D_M2D_Water":  ((122, 148, 168), None),  # water is the one environment
    "M2D_M2D_Stream": ((112, 138, 160), None),  # feature the reference keeps SATURATED
    "M2D_Edge":    ((228, 46, 58), 0.90),     # racing line: red, and dimmer — a 1.9
    "M2D_Glow":    ((228, 46, 58), 0.30),     # emitter blooms badly over light ground
    "M2D_Line":    ((250, 250, 252), 0.25),
    "M2D_BTop":    ((208, 206, 200), None),
    "M2D_BSide":   ((172, 170, 164), None),
    "M2D_BTopOSM": ((202, 200, 195), None),
    "M2D_BSideOSM": ((168, 166, 160), None),
    "M2D_PitTop":  ((200, 198, 192), None),
    "M2D_PitMat":  ((120, 120, 124), None),
    "M2D_Road":    ((168, 166, 160), None),
    "M2D_M2D_Park": ((150, 150, 148), None),  # parking = tarmac apron   # service roads must sit BELOW the
                                             # ground, not above it: at 198 they
                                             # were the brightest thing in frame.
    "M2D_Tree0":   ((118, 142, 112), None),
    "M2D_Tree1":   ((104, 128, 100), None),
}

# ─────────────────────────────────────────────────────────────────────────────
# NIGHT BROADCAST LOOK (level 8) — the OTHER F1 Manager 2024 reference: the race-view
# map as it actually ships in the game UI. Cold near-black ground (sRGB L≈40-60),
# environment as dark blue-grey silhouettes, and the ribbon the brightest object on
# screen: light apron, dark asphalt, red neon rim. Measured on the level-6/7 renders
# that shipped: ground L 123-152 vs asphalt L 34-48 — the ground was 3-4× BRIGHTER
# than the road, the exact inverse of the reference. Unity grades that down at
# runtime (TrackOutlineView, 0.74 of Night950), but a grade cannot put back the
# blue in the shadows or the value separation between forest and town: it just
# crushes everything. This level authors the dark key at the source.
#
# Composition (roads / buildings / distance cull) is level 6's. Only tone and light
# change. The world background matches the ground so the finite plate's saw-tooth
# edge vanishes, and the camera-parented vignette quad is kept (it is right for a
# dark key). Landuse tones are spread in VALUE, not hue: at this chroma value is
# the only channel that carries information.
_LU_NIGHT = {
    "forest": _srgb(30, 44, 52), "wood": _srgb(30, 44, 52),
    "scrub": _srgb(40, 52, 60), "park": _srgb(38, 54, 60),
    "grass": _srgb(46, 60, 66), "grassland": _srgb(46, 60, 66),
    "meadow": _srgb(50, 64, 70), "orchard": _srgb(42, 56, 60),
    "pitch": _srgb(44, 60, 64), "cemetery": _srgb(50, 58, 66),
    "military": _srgb(52, 58, 64),
    "farmland": _srgb(54, 62, 68), "farmyard": _srgb(52, 58, 66),
    "residential": _srgb(56, 62, 74), "stadium": _srgb(58, 64, 76),
    "commercial": _srgb(60, 66, 78),
}
_PATCH_BASE_NIGHT = {
    "temperate": _srgb(46, 58, 66),   # cold countryside
    "arid":      _srgb(80, 76, 74),   # desert: a hair warmer than the temperate base,
                                      # never sand — sand at night is grey
    "urban":     _srgb(50, 56, 66),   # concrete under floodlight
}
for _k, _b in _PATCH_BASE_NIGHT.items():
    PALETTES[_k + "_night"] = (
        _LU_NIGHT, [tuple(c * j for c in _b) for j in _PATCH_JITTER], _b)

_LOOK_NIGHT = {
    "M2D_Track":   ((26, 29, 36), None),      # asphalt: darkest thing in frame
    "M2D_Runoff":  ((44, 48, 56), None),      # run-off: a whisper above the ground. At (62,66,74)
                                              # the light semicircles turned PINK under the
                                              # runtime red bloom (measured on Spa T5/T7)
    "M2D_Kerb":    ((196, 62, 58), 0.25),
    "M2D_M2D_Water":  ((24, 46, 68), None),   # water stays the one saturated feature
    "M2D_M2D_Stream": ((28, 50, 72), None),
    "M2D_Edge":    ((236, 240, 246), 0.85),   # light rim — Unity draws the red halo
    "M2D_Glow":    ((228, 46, 58), 0.35),     # baked red bloom, modest: Unity adds its own
    "M2D_Line":    ((250, 250, 252), 0.30),
    "M2D_BTop":    ((108, 116, 130), None),   # stand / pit tops: the lightest furniture
    "M2D_BSide":   ((58, 64, 76), None),
    "M2D_BTopOSM": ((66, 72, 84), None),
    "M2D_BSideOSM": ((46, 52, 62), None),
    "M2D_PitTop":  ((98, 106, 120), None),
    "M2D_PitMat":  ((50, 54, 62), None),
    "M2D_Road":    ((56, 62, 72), None),
    "M2D_M2D_Park": ((48, 52, 60), None),
    "M2D_Tree0":   ((30, 60, 62), None),      # dark teal clusters, as in the reference
    "M2D_Tree1":   ((26, 52, 56), None),
}
NIGHT_SUN = dict(energy=2.6, color=(0.66, 0.78, 1.0))


_PLATE_R = None   # (r_fade_start_m, r_fade_end_m, r_max_m) — set by _plate_fade, read by the env passes
_ALPHA_KD = None  # (kdtree over terrain XY, alpha array) — set by _plate_fade, for cutting things past the fade


def _line_dist(P, line, chunk=20000):
    """Min distance from each row of P (n,2) to the racing line (m,2), chunked."""
    out = np.empty(len(P))
    for i in range(0, len(P), chunk):
        Q = P[i:i + chunk]
        d2 = ((Q[:, None, 0] - line[None, :, 0]) ** 2 + (Q[:, None, 1] - line[None, :, 1]) ** 2)
        out[i:i + chunk] = np.sqrt(d2.min(1))
    return out


def _plate_fade(sc, ground, log, start=0.48, end=0.92, world_factor=0.35):
    """Dissolve the finite terrain plate into the world tone with distance from the
    circuit, so its saw-tooth edge never renders: the map becomes a diorama that fades
    to black around the track instead of a tile lying on a table.

    Per terrain vertex: d = distance to the racing line; f = smoothstep between
    start·dmax and end·dmax; colour = lerp(colour, world, f). The world is set to the
    same tone (0.35 of the ground), so at the edge plate == background. Everything
    the later passes place (buildings, roads, canopy, crowns) reads _PLATE_R and stops
    at ~0.8·dmax, so nothing pokes out of the faded ring."""
    line = _racing_line(sc)
    if line is None or not ground:
        return "plate: no racing line — fade skipped"
    world = np.array(ground[:3], float) * world_factor
    step = max(1, len(line) // 600)
    L = line[::step]
    per = []
    dmax = 0.0
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        ca = o.data.color_attributes.get("M2DCol")
        if ca is None:
            continue
        n = len(o.data.vertices)
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        mw = np.array(o.matrix_world)
        W = (np.c_[co.reshape(-1, 3), np.ones(n)] @ mw.T)[:, :2]
        d = _line_dist(W, L)
        per.append((o, ca, d)); dmax = max(dmax, float(d.max()))
    if not per:
        return "plate: no terrain"
    r0, r1 = start * dmax, end * dmax
    global _PLATE_R
    _PLATE_R = (r0, r1, dmax)
    _alpha_rows = []
    # Distance to the plate's own boundary: a narrow plate (Jeddah's corniche strip)
    # ends long before r0 on its short axis and showed a hard edge. Fade within
    # edge_m of the boundary as well, whichever is stronger.
    edge_m = 260.0
    import bmesh as _bm
    for o, ca, d in per:
        buf = np.empty(len(ca.data) * 4, np.float32); ca.data.foreach_get("color", buf)
        rgba = buf.reshape(-1, 4)
        f = np.clip((d - r0) / max(r1 - r0, 1e-6), 0.0, 1.0)
        f = f * f * (3.0 - 2.0 * f)
        bm_ = _bm.new(); bm_.from_mesh(o.data)
        bverts = np.array([list(o.matrix_world @ v.co)[:2] for v in bm_.verts if any(len(e.link_faces) == 1 for e in v.link_edges)])
        bm_.free()
        if len(bverts):
            nv_ = len(o.data.vertices); co_ = np.empty(nv_ * 3); o.data.vertices.foreach_get("co", co_)
            Wv = (np.c_[co_.reshape(-1, 3), np.ones(nv_)] @ np.array(o.matrix_world).T)[:, :2]
            de = _line_dist(Wv, bverts[::max(1, len(bverts) // 800)])
            fe = 1.0 - np.clip(de / edge_m, 0.0, 1.0); fe = fe * fe * (3.0 - 2.0 * fe)
            f = np.maximum(f, fe)
        rgba[:, :3] = rgba[:, :3] * (1.0 - f[:, None]) + world[None, :] * f[:, None]
        # Colour alone is not enough: the plate is LIT (sun, AO, texture) and the world
        # is not, and the plate's own side faces catch the light as a staircase. So the
        # vertex ALPHA carries the fade too and the material dissolves the geometry.
        rgba[:, 3] = 1.0 - f
        ca.data.foreach_set("color", rgba.ravel())
        _alpha_rows.append((o, 1.0 - f))
    _plate_alpha_material()
    # alpha field for later passes (roads / runways / streams drawn past the fade)
    import mathutils as _mu
    tot = sum(len(a) for _, a in _alpha_rows)
    kd_a = _mu.kdtree.KDTree(tot); alphas = np.empty(tot); k = 0
    for o, a in _alpha_rows:
        nv_ = len(o.data.vertices); co_ = np.empty(nv_ * 3); o.data.vertices.foreach_get("co", co_)
        Wv = (np.c_[co_.reshape(-1, 3), np.ones(nv_)] @ np.array(o.matrix_world).T)[:, :2]
        for i in range(nv_):
            kd_a.insert((Wv[i, 0], Wv[i, 1], 0.0), k + i)
        alphas[k:k + nv_] = a; k += nv_
    kd_a.balance()
    global _ALPHA_KD
    _ALPHA_KD = (kd_a, alphas)
    return f"plate: fades {r0:.0f}→{r1:.0f} m from the line (plate reaches {dmax:.0f} m), alpha-dissolved"


def _plate_alpha_material():
    """Route M2DCol's alpha into the terrain BSDF so the faded ring is transparent."""
    m = bpy.data.materials.get("M2D_TerrainVC")
    b = _bsdf(m)
    if not b:
        return
    nt = m.node_tree
    vc = next((n for n in nt.nodes if n.type == 'VERTEX_COLOR' and n.layer_name == "M2DCol"), None)
    if vc is None:
        vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "M2DCol"
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Alpha":
            nt.links.remove(l)
    nt.links.new(vc.outputs["Alpha"], b.inputs["Alpha"])
    for attr, val in (("surface_render_method", 'DITHERED'), ("blend_method", 'HASHED')):
        try:
            setattr(m, attr, val)
        except Exception:
            pass
    try:
        m.use_transparent_shadow = True
    except Exception:
        pass


def _beyond(d):
    """True where a distance from the line is past the usable plate (0.8·dmax)."""
    return _PLATE_R is not None and d > 0.80 * _PLATE_R[2]


def _hash01(x, y, salt=0.0):
    """Deterministic 0..1 jitter from a position — same render every time."""
    v = np.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453
    return v - np.floor(v)


def _tree_blob_material(color=None):
    mat = bpy.data.materials.get("M2D_TreeBlob")
    if mat is None:
        mat = bpy.data.materials.new("M2D_TreeBlob"); mat.use_nodes = True
        b = _bsdf(mat)
        lin = color if color is not None else _srgb(30, 60, 62)
        b.inputs["Base Color"].default_value = (*lin, 1.0)
        b.inputs["Roughness"].default_value = 1.0
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.0
    return mat


def _sphere(name, cx, cy, cz, rx, ry, rz, mat, coll):
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(me.name, me)
    ob.location = (cx, cy, cz); ob.scale = (rx, ry, rz)
    coll.objects.link(ob)
    return ob


def _forest_canopy(sc, log, clear_m=30.0, height_m=11.0, edge_every=0, max_edge=1600, scatter=True, color=None,
                   min_m2=2500.0, keep_near_m=120.0):
    """Woodland as a CANOPY MASS, not a lattice of balls.

    The first blob pass clustered points into a 70 m grid and got a sheet of equal
    spheres — bubble wrap, and worst exactly where the forest is densest (Spa). The
    reference draws forest as a continuous dark mass with a soft, irregular edge and
    only a few individual crowns on the fringe. So:

      * the terrain faces whose three vertices are landuse forest/wood are copied,
        anything within `clear_m` of the racing line is cut away, and the region is
        extruded up by `height_m` with a low-frequency hash wobble on the top — that
        IS the canopy, and it inherits the DEM under it for free;
      * along the region's boundary every `edge_every`-th vertex gets one crown
        sphere of jittered radius 5–9 m, so the edge stops being a cliff;
      * the per-tree OSM scatter (natural=tree) becomes SMALL crowns (r 4–7 m) in
        30 m cells — an orchard or a roadside row, not a forest.
    """
    import bmesh
    mat = _tree_blob_material(color)
    line = _racing_line(sc)
    coll = next((o.users_collection[0] for o in sc.objects if o.name.startswith("M2D_Trees")), sc.collection)

    canopy_faces = edge_crowns = 0
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        fm = _FOREST_MASK.get(o.name)
        if fm is None or not fm.any():
            continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        mw = o.matrix_world
        drop = []
        for f in bm.faces:
            if not all(fm[v.index] for v in f.verts):
                drop.append(f); continue
            if line is not None:
                c = mw @ f.calc_center_median()
                d = np.hypot(line[:, 0] - c.x, line[:, 1] - c.y).min()
                if d < clear_m or _beyond(d):
                    drop.append(f)
        bmesh.ops.delete(bm, geom=drop, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        if not bm.faces:
            bm.free(); continue
        # Art pass: drop canopy FRAGMENTS — islands under min_m2 that are not near the
        # circuit read as stray green blobs (Suzuka, Montreal, Austin). Flood-fill by
        # shared edges, sum face areas, keep only big islands or ones within keep_near_m.
        bm.faces.ensure_lookup_table()
        seen = set(); frag = []; nfrag = 0
        for f0 in bm.faces:
            if f0.index in seen:
                continue
            stack = [f0]; comp = []
            seen.add(f0.index)
            while stack:
                f = stack.pop(); comp.append(f)
                for e in f.edges:
                    for g in e.link_faces:
                        if g.index not in seen:
                            seen.add(g.index); stack.append(g)
            area = sum(f.calc_area() for f in comp)
            if area < min_m2:
                near = False
                if line is not None:
                    for f in comp[::max(1, len(comp) // 12)]:
                        c = mw @ f.calc_center_median()
                        if np.hypot(line[:, 0] - c.x, line[:, 1] - c.y).min() < keep_near_m:
                            near = True; break
                if not near:
                    frag += comp; nfrag += 1
        if frag:
            bmesh.ops.delete(bm, geom=frag, context='FACES')
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
            log.append(f"canopy: dropped {nfrag} fragments < {min_m2:.0f} m² on {o.name}")
        if not bm.faces:
            bm.free(); continue
        # Round the jagged triangle-step outline BEFORE extrusion: Laplacian-smooth the
        # boundary vertices in XY (three passes) so the rim is a curve, not a staircase.
        bverts = [v for v in bm.verts if any(len(e.link_faces) == 1 for e in v.link_edges)]
        for _ in range(5):
            bmesh.ops.smooth_vert(bm, verts=bverts, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=False)
        boundary = [v.co.copy() for v in bverts]
        base_z = {v.index: v.co.z for v in bm.verts}
        top = bmesh.ops.extrude_face_region(bm, geom=list(bm.faces))
        tfaces = [g for g in top["geom"] if isinstance(g, bmesh.types.BMFace)]
        tset = set(f.index for f in tfaces)
        tverts = [g for g in top["geom"] if isinstance(g, bmesh.types.BMVert)]
        # Rim = top vertices touching a side face. They rise to 40% of the canopy so the
        # side is a slope, not a cliff; the interior gets the full height plus wobble.
        for v in tverts:
            w = mw @ v.co
            rim = any(f.index not in tset for f in v.link_faces)
            # Lumpy top: two octaves, ±4 m, so the mass reads as crowns without any
            # spheres — the boundary "beads" of the first pass are gone.
            wob = (_hash01(w.x * 0.006, w.y * 0.006) - 0.5) * 7.0 + (_hash01(w.x * 0.025, w.y * 0.025, 1.0) - 0.5) * 3.5
            v.co.z += (height_m * 0.45 + wob * 0.35) if rim else (height_m + wob)
        me = bpy.data.meshes.new(f"M2D_Canopy_{o.name}")
        bm.to_mesh(me); bm.free()
        for poly in me.polygons:
            poly.use_smooth = True
        me.materials.append(mat)
        ob = bpy.data.objects.new(me.name, me)
        ob.matrix_world = o.matrix_world.copy()
        coll.objects.link(ob)
        canopy_faces += len(me.polygons)
        # Photoreal step: real crowns are lumps 6–12 m across, not a wobbled sheet. A
        # Displace modifier with a 9 m Clouds texture pushes the top ±1.75 m per vertex,
        # so the 30° sun models each crown and the mass reads as trees from 1.6 m/px.
        try:
            tex = bpy.data.textures.get("M2D_CrownLumps") or bpy.data.textures.new("M2D_CrownLumps", 'CLOUDS')
            tex.noise_scale = 9.0; tex.noise_depth = 2
            md = ob.modifiers.new("CrownLumps", 'DISPLACE'); md.texture = tex
            md.texture_coords = 'GLOBAL'; md.direction = 'Z'; md.strength = 3.5; md.mid_level = 0.5
        except Exception as e_:
            log.append(f"canopy: displace skipped ({e_})")

        # Boundary crowns are OFF (edge_every=0): a sphere on every rim vertex read as a
        # string of beads. The smoothed outline + sloped rim + lumpy top carry the edge.
        for i, co in enumerate(boundary):
            if not edge_every or edge_crowns >= max_edge:
                break
            w = mw @ co
            r = 4.0 + 4.5 * _hash01(w.x, w.y, 2.0)
            dl = np.hypot(line[:, 0] - w.x, line[:, 1] - w.y).min() if line is not None else 1e9
            if dl < clear_m + r or _beyond(dl):
                continue
            _sphere(f"M2D_Crown_{edge_crowns}", w.x + (_hash01(w.y, w.x, 6.0) - 0.5) * 3, w.y + (_hash01(w.x, w.y, 7.0) - 0.5) * 3,
                    w.z + r * 0.35, r, r, r * 0.75, mat, coll)
            edge_crowns += 1

    # per-tree scatter → small crowns
    pts = []
    tv = None
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Trees"):
            mw = np.array(o.matrix_world)
            for poly in o.data.polygons:
                c = np.array([*poly.center, 1.0]) @ mw.T
                pts.append(c[:2])
    small = 0
    # Canopy footprint (world XY of canopy faces) — lone crowns must keep clear of it,
    # otherwise they stick to the mass's edge and read as bubbles.
    canopy_xy = []
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Canopy_"):
            mw = o.matrix_world
            polys = o.data.polygons
            canopy_xy.extend([(mw @ polys[i].center)[:2] for i in range(0, len(polys), 3)])
    canopy_xy = np.array(canopy_xy) if canopy_xy else None
    if pts and scatter:   # a dozen palms on a desert plate read as litter — skip on arid
        terr = [o for o in sc.objects if o.type == 'MESH' and o.name.startswith("M2D_Terrain")]
        tv = np.concatenate([np.array([(o.matrix_world @ v.co)[:] for v in o.data.vertices]) for o in terr]) if terr else None
        cells = {}
        for q in pts:
            cells.setdefault((int(np.floor(q[0] / 30.0)), int(np.floor(q[1] / 30.0))), []).append(q)
        for key, group in cells.items():
            if len(group) < 3:                      # a real clump, not a lone ball
                continue
            G = np.array(group); cx, cy = G.mean(0)
            r = 5.0 + 3.0 * _hash01(cx, cy, 3.0) + 0.5 * min(len(G), 6)
            dl = np.hypot(line[:, 0] - cx, line[:, 1] - cy).min() if line is not None else 1e9
            if dl < clear_m + r or _beyond(dl):
                continue
            if canopy_xy is not None and np.hypot(canopy_xy[:, 0] - cx, canopy_xy[:, 1] - cy).min() < 35.0:
                continue                            # would glue to the canopy edge
            z0 = float(tv[np.argmin((tv[:, 0] - cx) ** 2 + (tv[:, 1] - cy) ** 2), 2]) if tv is not None else 0.0
            # flat ellipsoid (rz = 0.3 r): a clump of bushes, not a bubble
            _sphere(f"M2D_Crown_s{small}", cx + (_hash01(cx, cy, 4.0) - 0.5) * 6, cy + (_hash01(cy, cx, 5.0) - 0.5) * 6,
                    z0 + r * 0.15, r * 1.3, r, r * 0.3, mat, coll)
            small += 1
    return f"forest: canopy {canopy_faces} faces, {edge_crowns} edge crowns, {small} scatter crowns (clear {clear_m:.0f} m)"


def _bake_ribbon(sc, log, track=""):
    """Bake the broadcast ribbon INTO the render, at the widths and colours the runtime
    draws (TrackOutlineView: bloom 46 / rim 33 / edge 28 / apron 22 / asphalt 15 px at
    1920 over an ~11 px source strip). Why: UI Toolkit's Painter2D tessellation leaves
    hairline pinholes across the runtime ribbon (measured 314 → 250 → 179 isolated black
    pixels per 1080p frame through stroke-round / stroke-bevel / polygon-fill); what shows
    through is this PNG. If the PNG already carries the same ribbon in the same colours,
    a pinhole shows the same colour and disappears. Four bands, each a widened copy of the
    M2D_Asphalt strip (vertex pairs 2i / 2i+1 are the left / right edge of sample i),
    stacked with 3 cm z steps so nothing z-fights; the originals are hidden."""
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return "ribbon: no M2D_Asphalt — not baked"
    me = asp.data
    n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    if n % 2:
        return "ribbon: odd vertex count — strip layout unexpected, not baked"
    Lv, Rv = V[0::2], V[1::2]
    C = (Lv + Rv) * 0.5
    strip_m = np.linalg.norm(Rv - Lv, axis=1)            # per-sample strip width, metres
    width = float(strip_m.mean())
    faces = [tuple(p.vertices) for p in me.polygons]
    coll = asp.users_collection[0]
    m = len(C)
    # Runtime widths are CONSTANT in screen px (TrackOutlineView, calibrated at 1920 →
    # here at the 1600 px render). Perspective makes px/m vary 1.3–1.65× near-vs-far
    # along the lap, so each sample gets its own factor from the bridge: local px per
    # metre = px spacing of centerline_px / world spacing (lap_m / N).
    # Exact on-screen width of the source strip per sample, from the SAME camera the
    # render uses (blender/camera_fits.json via fit_cameras.to_px). Along-track px/m from
    # the bridge is wrong for widths: under a 47° tilt the across-track scale differs by
    # up to sin(47°) = 0.73×, and the first bake came out with a 20 px halo.
    strip_px = None
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import fit_cameras as fc
        fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "camera_fits.json")))
        ft = fits[track.lower()]
        eye = np.array(ft["eye"], float)
        tilt, yaw = math.radians(ft["tilt_deg"]), math.radians(ft["yaw_deg"])
        pL = fc.to_px(Lv, eye, tilt, yaw) * [1600.0, 900.0]
        pR = fc.to_px(Rv, eye, tilt, yaw) * [1600.0, 900.0]
        strip_px = np.linalg.norm(pR - pL, axis=1)
    except Exception as e:                                 # no fit → log, fall back
        log.append(f"ribbon: camera fit unavailable ({e}); widths from strip metres")
    if strip_px is None:
        strip_px = strip_m * 0.6
    scale = 1600.0 / 1920.0
    # (name, runtime width @1920 px, z, sRGB colour, emission)
    bands = [
        ("Rim",     33.0, 0.03, (242, 69, 76), 0.55),    # Red400 — same as the runtime rim
        ("Edge",    28.0, 0.06, (230, 241, 245), 0.18),  # Ink100
        ("Apron",   22.0, 0.09, (107, 129, 140), 0.0),   # Ink400
        ("Asphalt", 15.0, 0.12, (0, 14, 26), 0.0),        # Night900
    ]
    for name, wpx, z, rgb, emit in bands:
        mat = _runtime_flat(f"M2D_Bake{name}", (*_srgb(*rgb), 1.0), emit=emit)
        b = _bsdf(mat)
        if b:
            b.inputs["Roughness"].default_value = 1.0
            if "Specular IOR Level" in b.inputs:
                b.inputs["Specular IOR Level"].default_value = 0.0
        kk = ((wpx * scale) / np.maximum(strip_px, 0.5))[:, None]   # target px / actual px
        verts = np.empty((n, 3))
        verts[0::2] = C + (Lv - C) * kk
        verts[1::2] = C + (Rv - C) * kk
        verts[:, 2] = z
        ob = _runtime_mesh(f"M2D_Bake{name}", [tuple(v) for v in verts], faces, mat, coll)
        # The bands float at z 0.03–0.12 over a plate that sits metres BELOW zero (DEM);
        # under a 30° sun they threw a 5–8 px black shadow beside the ribbon — the halo
        # seen on Bahrain. A broadcast graphic casts no shadow.
        for attr in ("visible_shadow",):
            try:
                setattr(ob, attr, False)
            except Exception:
                pass
    hidden = 0
    for o in sc.objects:
        if o.type == 'MESH' and o.name.split('.')[0] in ("M2D_Asphalt", "M2D_EdgeL", "M2D_EdgeR"):
            o.hide_render = True; hidden += 1
        elif o.type == 'MESH' and o.name.split('.')[0] in ("M2D_Kerb", "M2D_SFLine", "M2D_Line"):
            # keep the markings above the new asphalt
            o.location.z += 0.10
    return (f"ribbon: baked 4 bands over a {width:.1f} m strip at runtime px widths "
            f"(strip on screen {strip_px.min():.1f}–{strip_px.max():.1f} px, rim ×{np.mean(33*scale/strip_px):.2f} mean), "
            f"{hidden} source strips hidden")


def _crisp_landuse(sc, log):
    """Hard edges between landuse classes.

    The plate's colours are per-VERTEX on an ~8 m grid, so a dark class next to a light
    one smears across a whole triangle (5–8 px): the "blurred smudge" beside RBR T7.
    Copy the colours to a face-CORNER layer and, on every face whose vertices disagree
    in class, give all three corners the majority vertex's colour — crisp class edges,
    smooth shading inside a class. The material is re-pointed at the corner layer, so
    the plate-fade alpha (copied too) keeps working."""
    n_faces = 0
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        cls = _CLASS_ID.get(o.name)
        src = o.data.color_attributes.get("M2DCol")
        if cls is None or src is None:
            continue
        me = o.data
        nv = len(me.vertices)
        vbuf = np.empty(nv * 4, np.float32); src.data.foreach_get("color", vbuf); vc = vbuf.reshape(-1, 4)
        nl = len(me.loops)
        lv = np.empty(nl, np.int32); me.loops.foreach_get("vertex_index", lv)
        cc = vc[lv].copy()
        ls = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("loop_start", ls)
        lt = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get("loop_total", lt)
        for i in range(len(me.polygons)):
            a, n = ls[i], lt[i]
            vids = lv[a:a + n]
            c = cls[vids]
            if (c == c[0]).all():
                continue
            vals, counts = np.unique(c, return_counts=True)
            win = vals[np.argmax(counts)]
            pick = vids[np.where(c == win)[0][0]]
            cc[a:a + n] = vc[pick]
            n_faces += 1
        dst = me.color_attributes.get("M2DColC") or me.color_attributes.new("M2DColC", 'FLOAT_COLOR', 'CORNER')
        dst.data.foreach_set("color", cc.ravel())
    m = bpy.data.materials.get("M2D_TerrainVC")
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'VERTEX_COLOR' and n.layer_name == "M2DCol":
                n.layer_name = "M2DColC"
    return f"landuse: {n_faces} boundary faces given hard class edges"


# Per-class hue tint (linear multipliers) for the slate key: the plate was one blue-grey
# for every class, which is what reads as "plastic". Luminance is roughly preserved.
_CLASS_TINT = {
    "forest": (0.80, 1.10, 0.86), "wood": (0.80, 1.10, 0.86), "park": (0.86, 1.10, 0.88),
    "scrub": (0.95, 1.06, 0.86), "orchard": (0.92, 1.06, 0.86),
    "grass": (1.02, 1.08, 0.84), "grassland": (1.02, 1.08, 0.84), "meadow": (1.04, 1.08, 0.82),
    "pitch": (0.96, 1.10, 0.86), "cemetery": (1.00, 1.02, 0.94),
    "farmland": (1.06, 1.05, 0.90), "farmyard": (1.06, 1.04, 0.90), "military": (1.04, 1.02, 0.90),   # art pass: the old 1.14/0.80 read as orange lakes (Silverstone)
    "residential": (1.10, 1.03, 0.94), "stadium": (1.08, 1.03, 0.95), "commercial": (1.10, 1.04, 0.96),
}
_PATCH_TINT = {"temperate": (1.04, 1.07, 0.86), "arid": (1.22, 1.10, 0.88), "urban": (1.06, 1.03, 0.98)}


def _calm_landuse(sc, log, k=0.6, dark_floor=0.94, kind="temperate"):
    """Compress the landuse contrast toward the plate's mean tone.

    Hard class edges on the ~8 m vertex grid turned into a staircase, and the smooth
    original smeared dark classes into "smudges" (RBR T7). The reference ground is
    calm: gentle variation, no dark islands. Per vertex: rgb = mean + (rgb - mean)·k.
    Alpha (plate fade) untouched."""
    n = 0; capped = 0
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        ca = o.data.color_attributes.get("M2DCol")
        if ca is None:
            continue
        buf = np.empty(len(ca.data) * 4, np.float32); ca.data.foreach_get("color", buf); rgba = buf.reshape(-1, 4)
        mean = rgba[:, :3].mean(0)
        rgba[:, :3] = mean[None, :] + (rgba[:, :3] - mean[None, :]) * k
        # hue separation by class (dry-run classify stored the ids)
        cls = _CLASS_ID.get(o.name)
        if cls is not None and len(cls) == len(rgba):
            names = list(_LU_OLD.keys()) + [f"patch{i}" for i in range(len(_PATCH_OLD))]
            tint = np.ones((len(names), 3))
            for i, nm in enumerate(names):
                tint[i] = _CLASS_TINT.get(nm, _PATCH_TINT.get(kind, (1, 1, 1)) if nm.startswith("patch") else (1, 1, 1))
            rgba[:, :3] *= tint[cls]
            # Arid plates: the synthetic patches are blue-grey noise; a tint cannot make
            # sand of them. Replace with a muted sand carrying the vertex's own shade.
            if kind == "arid":
                is_patch = np.array([names[c].startswith("patch") for c in cls])
                if is_patch.any():
                    lum = rgba[is_patch, :3] @ np.array([0.2126, 0.7152, 0.0722])
                    sand = np.array(_srgb(138, 124, 104))
                    sand_l = float(sand @ np.array([0.2126, 0.7152, 0.0722]))
                    shade = (lum / max(lum.mean(), 1e-6))[:, None]
                    rgba[is_patch, :3] = 0.35 * rgba[is_patch, :3] + 0.65 * sand[None, :] * shade * (lum.mean() / sand_l) * 1.5
        # Art pass: WARM outliers. The baked palette carries orange-brown farmland
        # (Silverstone's south fields rendered as rust lakes on a green plate). On
        # non-arid plates pull anything redder than its own green 65 % towards the
        # plate mean at equal luminance — a field stays a shade lighter, not a colour.
        if kind != "arid":
            # "warm" = yellow/brown relative to the plate: red-minus-blue per unit of
            # luminance exceeds the plate mean's by 0.10 (olive farmland is r ≈ g, b low —
            # a plain r > g test missed it entirely).
            LW = np.array([0.2126, 0.7152, 0.0722])
            lum_v = np.maximum(rgba[:, :3] @ LW, 1e-6)
            lm = float(max(mean @ LW, 1e-6))
            warm = (rgba[:, 0] - rgba[:, 2]) / lum_v > (mean[0] - mean[2]) / lm + 0.10
            if warm.any():
                target = mean[None, :] * (lum_v[warm] / lm)[:, None]
                rgba[warm, :3] = 0.35 * rgba[warm, :3] + 0.65 * target
                log.append(f"landuse: {int(warm.sum())} warm vertices pulled to the plate hue on {o.name}")
        # The smudges are DARK outliers (baked valley shade + dark classes). Cap
        # luminance from below at mean − dark_cap_sigma·σ by scaling the colour up;
        # the light side of the mosaic is left alone.
        lum = rgba[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
        # Measured on RBR T7: the smudge sat 17 % under its neighbours yet above
        # mean − 0.35σ, because σ is set by the light mosaic. Floor relative to the
        # mean instead: nothing on the plate may be more than 6 % darker than average.
        floor = lum.mean() * dark_floor
        dark = lum < floor
        if dark.any():
            gain = (floor / np.maximum(lum[dark], 1e-6))[:, None]
            rgba[dark, :3] = rgba[dark, :3] * gain
        # ...and a ceiling: beach/sand/bare classes baked very light (Zandvoort's dunes
        # rendered as a white sheet). Nothing more than 22 % lighter than the mean.
        ceil = lum.mean() * 1.22
        light = lum > ceil
        if light.any():
            rgba[light, :3] = rgba[light, :3] * (ceil / lum[light])[:, None]
        ca.data.foreach_set("color", rgba.ravel()); n += len(rgba); capped = int(dark.sum())
    return f"landuse: contrast ×{k}, {capped} dark vertices lifted to {dark_floor:.2f}·mean"


_TRACK_Z = None   # (C_xy (m,2), z_track (m,)) after _seat_terrain — for later passes


def _track_z_at(xy):
    """z of the track profile at the nearest centreline sample (0.08 when flat)."""
    if _TRACK_Z is None:
        return 0.08
    Cxy, Z = _TRACK_Z
    i = int(np.argmin((Cxy[:, 0] - xy[0]) ** 2 + (Cxy[:, 1] - xy[1]) ** 2))
    return float(Z[i])


# Real elevation change along the lap, metres (public circuit data, rounded). The baked
# DEM is soft and its noise is uniform, so one fixed gain (2.5) made Vegas and Monza
# roll like Spa. Gain is now solved per track so the lap's z span matches this table.
TRACK_ELEV_M = {
    "spa": 102.0, "rbr": 65.0, "interlagos": 43.0, "monaco": 42.0, "austin": 41.0,
    "suzuka": 40.0, "imola": 40.0, "hungaroring": 36.0, "catalunya": 30.0, "baku": 25.0,
    "silverstone": 20.0, "bahrain": 17.0, "zandvoort": 15.0, "shanghai": 10.0, "yasmarina": 10.0,
    "monza": 8.0, "jeddah": 5.0, "vegas": 5.0, "melbourne": 5.0, "singapore": 5.0, "mexico": 5.0,
    "miami": 5.0, "montreal": 4.0, "lusail": 3.0,
}


def _seat_terrain(sc, log, ribbon_z=0.08, corridor_z=-0.30, d0=25.0, d1=180.0, smooth_m=45.0,
                  relief=True, track="", along_smooth=25, relief_gain=2.5):
    """Seat the DEM plate UNDER the ribbon instead of metres below it.

    Measured: the asphalt (z 0.08), roads (−1.4), trees (0.9) and all circuit furniture
    (0.1) live at ~zero, but the terrain plate sits 14 m (Bahrain) to 21 m (RBR) LOWER —
    the DEM was applied with an offset — and only water, streams, parks and OSM
    buildings follow it. From the 47° camera the ribbon therefore floated on an
    invisible plinth, and the plinth's edge against the DEM triangles was the jagged
    dark line beside every straight.

    Fix, in memory: (1) raise the plate by one constant per track so its mean under
    the ribbon lands just below the asphalt; (2) flatten a corridor to `corridor_z`
    within d0 of the racing line, blending back to the DEM by d1 (smoothstep), so the
    ribbon sits ON the ground; (3) move everything glued to the plate (water, streams,
    parks, OSM buildings + their shadow quads) by the plate's LOCAL change; (4) drape
    roads onto the new plate. Furniture and the ribbon do not move, so the camera fit
    and the bridges stay exactly valid."""
    import mathutils
    line = _racing_line(sc)
    if line is None:
        return "seat: no racing line — skipped"
    step = max(1, len(line) // 600); Lc = line[::step]
    terr = [o for o in sc.objects if o.type == 'MESH' and o.name.startswith("M2D_Terrain")]
    if not terr:
        return "seat: no terrain"
    allW, allD, per = [], [], []
    for o in terr:
        n = len(o.data.vertices)
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        mw = np.array(o.matrix_world)
        W = (np.c_[co.reshape(-1, 3), np.ones(n)] @ mw.T)[:, :3]
        d = _line_dist(W[:, :2], Lc)
        per.append((o, co.reshape(-1, 3), mw, W, d)); allW.append(W); allD.append(d)
    W_all = np.concatenate(allW); D_all = np.concatenate(allD)
    near = D_all < 20.0
    z_ref = float(np.mean(W_all[near, 2])) if near.any() else float(np.mean(W_all[:, 2]))
    shift = (ribbon_z - 0.35) - z_ref
    kd = mathutils.kdtree.KDTree(len(W_all))
    delta_all = np.empty(len(W_all)); newz_all = np.empty(len(W_all))
    k0 = 0
    # Smooth the DEM before seating: SRTM-scale noise (30 m cells) lit by a 5° sun
    # renders as soft dark blotches beside the track ("muddy" patches). A 45 m box
    # average keeps the hills and drops the blotches. One KD-tree over all plates.
    kd_s = mathutils.kdtree.KDTree(len(W_all))
    for i in range(len(W_all)):
        kd_s.insert((W_all[i, 0], W_all[i, 1], 0.0), i)
    kd_s.balance()
    z_smooth = W_all[:, 2].copy()
    for i in range(len(W_all)):
        nb = kd_s.find_range((W_all[i, 0], W_all[i, 1], 0.0), smooth_m)
        if len(nb) > 1:
            z_smooth[i] = float(np.mean([W_all[j, 2] for _, j, _ in nb]))
    # Diorama exaggeration: the baked DEM is soft (RBR spans 5 m along the lap where the
    # real circuit climbs 65 m). Scale the smoothed relief about the level under the
    # ribbon before anything reads it — plate, corridor and track profile alike.
    # Per-track gain: measure the raw (smoothed) span along the lap first, then scale so
    # it matches TRACK_ELEV_M; clamp 0.3–8 so DEM noise on a flat circuit is damped
    # and a real hill is never blown past 8×.
    target = TRACK_ELEV_M.get(track.lower())
    asp0 = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if target is not None and asp0 is not None:
        n_a0 = len(asp0.data.vertices); c0 = np.empty(n_a0 * 3); asp0.data.vertices.foreach_get("co", c0)
        VA0 = (np.c_[c0.reshape(-1, 3), np.ones(n_a0)] @ np.array(asp0.matrix_world).T)[:, :3]
        C0 = ((VA0[0::2] + VA0[1::2]) * 0.5)[:, :2]
        zr = np.array([z_smooth[kd_s.find((C0[i, 0], C0[i, 1], 0.0))[1]] for i in range(len(C0))])
        k0_ = along_smooth
        zr = np.convolve(np.r_[zr[-k0_:], zr, zr[:k0_]], np.ones(2 * k0_ + 1) / (2 * k0_ + 1), "valid")
        raw_span = float(zr.max() - zr.min())
        relief_gain = float(np.clip(target / max(raw_span, 0.5), 0.3, 5.0))
        # High gain amplifies DEM noise with the hills (gain 8 on RBR: 3 m bumps in a row
        # beside the ribbon). Widen the smoothing with the gain so only large forms scale.
        if relief_gain > 2.5:
            smooth2 = float(np.clip(smooth_m * math.sqrt(relief_gain / 2.5), smooth_m, 110.0))
            for i in range(len(W_all)):
                nb = kd_s.find_range((W_all[i, 0], W_all[i, 1], 0.0), smooth2)
                if len(nb) > 1:
                    z_smooth[i] = float(np.mean([W_all[j, 2] for _, j, _ in nb]))
            zr = np.array([z_smooth[kd_s.find((C0[i, 0], C0[i, 1], 0.0))[1]] for i in range(len(C0))])
            zr = np.convolve(np.r_[zr[-k0_:], zr, zr[:k0_]], np.ones(2 * k0_ + 1) / (2 * k0_ + 1), "valid")
            raw_span = float(zr.max() - zr.min())
            relief_gain = float(np.clip(target / max(raw_span, 0.5), 0.3, 5.0))
            smooth_m = smooth2
        log.append(f"relief: raw DEM span {raw_span:.1f} m along the lap (smoothed {smooth_m:.0f} m), target {target:.0f} m → gain {relief_gain:.2f}")
    z_smooth = z_ref + (z_smooth - z_ref) * relief_gain
    # ── track profile from the DEM: z along the centreline = smoothed DEM + shift, then a
    # moving average along the lap so the ribbon rolls over hills instead of bumping.
    global _TRACK_Z
    _TRACK_Z = None
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    Cxy = None
    if relief and asp is not None:
        n_a = len(asp.data.vertices); ca_ = np.empty(n_a * 3); asp.data.vertices.foreach_get("co", ca_)
        VA = (np.c_[ca_.reshape(-1, 3), np.ones(n_a)] @ np.array(asp.matrix_world).T)[:, :3]
        Cxy = ((VA[0::2] + VA[1::2]) * 0.5)[:, :2]
        zt = np.empty(len(Cxy))
        for i in range(len(Cxy)):
            zt[i] = z_smooth[kd_s.find((Cxy[i, 0], Cxy[i, 1], 0.0))[1]] + shift
        k = along_smooth
        zt = np.convolve(np.r_[zt[-k:], zt, zt[:k]], np.ones(2 * k + 1) / (2 * k + 1), "valid")
        zt = zt - zt.mean() + ribbon_z          # keep the lap's mean at the old ribbon height
        _TRACK_Z = (Cxy, zt)
        kd_t = mathutils.kdtree.KDTree(len(Cxy))
        for i in range(len(Cxy)): kd_t.insert((Cxy[i, 0], Cxy[i, 1], 0.0), i)
        kd_t.balance()
    k_s = 0
    for o, local, mw, W, d in per:
        zs = z_smooth[k_s:k_s + len(W)]; k_s += len(W)
        f = np.clip((d - d0) / max(d1 - d0, 1e-6), 0.0, 1.0); f = f * f * (3.0 - 2.0 * f)
        if _TRACK_Z is not None:
            # corridor follows the TRACK profile (0.38 m under the asphalt), not a constant
            zc = np.array([_TRACK_Z[1][kd_t.find((W[i, 0], W[i, 1], 0.0))[1]] for i in range(len(W))]) - 0.38
            z_new = zc * (1.0 - f) + (zs + shift) * f
        else:
            z_new = corridor_z * (1.0 - f) + (zs + shift) * f
        delta = z_new - W[:, 2]
        Wn = W.copy(); Wn[:, 2] = z_new
        inv = np.linalg.inv(mw)
        Ln = (np.c_[Wn, np.ones(len(Wn))] @ inv.T)[:, :3]
        o.data.vertices.foreach_set("co", Ln.ravel())
        o.data.update()
        for i in range(len(W)):
            kd.insert((W[i, 0], W[i, 1], 0.0), k0 + i)
        delta_all[k0:k0 + len(W)] = delta; newz_all[k0:k0 + len(W)] = z_new
        k0 += len(W)
    kd.balance()

    def nearest(xy):
        return kd.find((xy[0], xy[1], 0.0))[1]

    moved = draped = 0
    for o in sc.objects:
        if o.type != 'MESH' or o.hide_render:
            continue
        base = o.name.split('.')[0]
        glued = base.startswith(("M2D_Water", "M2D_Stream", "M2D_Park", "M2D_Buildings", "M2D_BuildSh", "M2D_M2D_Water", "M2D_M2D_Stream", "M2D_M2D_Park"))
        drape = base.startswith(("M2D_Rd_", "M2D_RingRoad", "M2D_Road", "M2D_Aero"))
        if not (glued or drape):
            continue
        n = len(o.data.vertices)
        if n == 0:
            continue
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        mw = np.array(o.matrix_world); inv = np.linalg.inv(mw)
        W = (np.c_[co.reshape(-1, 3), np.ones(n)] @ mw.T)[:, :3]
        for i in range(n):
            j = nearest(W[i])
            W[i, 2] = (W[i, 2] + delta_all[j]) if glued else (newz_all[j] + 0.3)
        if base.startswith(("M2D_Water", "M2D_M2D_Water")):
            # Water is LEVEL. Glued per vertex it folded over the relief and its gloss lit
            # the folds white (Zandvoort). One plane per body: 20th-percentile shore
            # height minus 0.4 m — the plate rises out of it where the land climbs.
            W[:, 2] = float(np.percentile(W[:, 2], 20)) - 0.4
        Ln = (np.c_[W, np.ones(n)] @ inv.T)[:, :3]
        o.data.vertices.foreach_set("co", Ln.ravel()); o.data.update()
        if glued: moved += 1
        else: draped += 1
    # ── everything that lives on the track plane rides the profile: per vertex, z += (z_track − 0.08)
    lifted = 0
    if _TRACK_Z is not None:
        prefixes = ("M2D_Asphalt", "M2D_EdgeL", "M2D_EdgeR", "M2D_Kerb", "M2D_Runoff", "M2D_PitLane",
                    "M2D_PitSep", "M2D_SFLine", "M2D_Line", "M2D_Stand", "M2D_PitBuilding", "M2D_Paddock",
                    "M2D_Lot", "M2D_LotCars", "M2D_Spur", "M2D_Aero", "M2D_StandFlags", "M2D_Sh_")
        for o in sc.objects:
            if o.type != 'MESH' or o.hide_render or not o.name.split('.')[0].startswith(prefixes):
                continue
            n = len(o.data.vertices)
            if n == 0: continue
            co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
            mw = np.array(o.matrix_world); inv = np.linalg.inv(mw)
            W = (np.c_[co.reshape(-1, 3), np.ones(n)] @ mw.T)[:, :3]
            for i in range(n):
                W[i, 2] += _TRACK_Z[1][kd_t.find((W[i, 0], W[i, 1], 0.0))[1]] - ribbon_z
            Ln = (np.c_[W, np.ones(n)] @ inv.T)[:, :3]
            o.data.vertices.foreach_set("co", Ln.ravel()); o.data.update(); lifted += 1
        # ── bridge: re-project the 3-D centreline with the render camera (merge, keep zones etc.)
        try:
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            import fit_cameras as fc
            fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "camera_fits.json")))
            ft = fits[track.lower()]
            eye = np.array(ft["eye"], float); tilt, yaw = math.radians(ft["tilt_deg"]), math.radians(ft["yaw_deg"])
            C3 = np.c_[Cxy, _TRACK_Z[1]]
            px = fc.to_px(C3, eye, tilt, yaw)
            bp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "F1Manager2027-Unity",
                              "Assets", "Resources", "TrackMaps", f"{track.lower()}_bridge.json")
            if os.path.exists(bp):
                bj = json.load(open(bp))
                old = np.array(bj["centerline_px"], float)
                if len(old) == len(px):
                    bj["centerline_px"] = [[round(float(x), 5), round(float(y), 5)] for x, y in px]
                    bj["relief"] = {"z_min": round(float(_TRACK_Z[1].min()), 2), "z_max": round(float(_TRACK_Z[1].max()), 2)}
                    json.dump(bj, open(bp, "w"), separators=(",", ":"))
                    dpx = np.linalg.norm((px - old) * [1600, 900], axis=1)
                    log.append(f"bridge: centreline re-projected with relief, shift p50 {np.percentile(dpx, 50):.1f} px, max {dpx.max():.1f} px")
                else:
                    log.append(f"bridge: NOT rewritten — {len(old)} vs {len(px)} samples")
        except Exception as e:
            log.append(f"bridge: re-projection failed ({e})")
    return (f"seat: plate +{shift:.1f} m (was {z_ref:.1f} m under the ribbon), track relief "
            f"{(_TRACK_Z[1].max() - _TRACK_Z[1].min()) if _TRACK_Z is not None else 0:.1f} m span, {lifted} track objects lifted, "
            f"DEM (smoothed {smooth_m:.0f} m) back by {d1:.0f} m; {moved} glued objects moved, {draped} roads draped")


def _noise_mix(mat, scale_m, col_a, col_b, base_socket="Base Color", detail=3.0):
    """Base Color := mix(col_a, col_b, noise(world xyz / scale_m))."""
    nt = mat.node_tree; b = _bsdf(mat)
    if not b:
        return
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
    k = 1.0 / scale_m; mp.inputs["Scale"].default_value = (k, k, k)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = detail
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = (*col_a, 1.0); mix.inputs[7].default_value = (*col_b, 1.0)
    nt.links.new(nz.outputs["Fac"], mix.inputs["Factor"])
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == base_socket:
            nt.links.remove(l)
    nt.links.new(mix.outputs[2], b.inputs[base_socket])
    return mix


def _slate_materials(sc, log):
    """Take the plastic out of the materials: fine grain on the asphalt, a two-tone
    noisy canopy with a darker underside, lightness variation across roofs and
    facades. All procedural on world position — nothing per track."""
    n = 0
    m = bpy.data.materials.get("M2D_TreeBlob")
    if m:
        mix = _noise_mix(m, 25.0, (0.030, 0.105, 0.050), (0.060, 0.150, 0.070))
        nt = m.node_tree; b = _bsdf(m)
        geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Normal"], sep.inputs["Vector"])
        rng = nt.nodes.new("ShaderNodeMapRange"); rng.inputs["From Min"].default_value = 0.0; rng.inputs["From Max"].default_value = 1.0
        rng.inputs["To Min"].default_value = 0.45; rng.inputs["To Max"].default_value = 1.0
        nt.links.new(sep.outputs["Z"], rng.inputs["Value"])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs["Factor"].default_value = 1.0
        nt.links.new(mix.outputs[2], mul.inputs[6])
        nt.links.new(rng.outputs["Result"], mul.inputs[7])
        for l in list(nt.links):
            if l.to_node == b and l.to_socket.name == "Base Color":
                nt.links.remove(l)
        nt.links.new(mul.outputs[2], b.inputs["Base Color"])
        n += 1
    m = bpy.data.materials.get("M2D_Track"); b = _bsdf(m)
    if b:
        c = b.inputs["Base Color"].default_value[:3]
        _noise_mix(m, 2.0, tuple(x * 0.93 for x in c), tuple(x * 1.07 for x in c), detail=1.0); n += 1
    for mn, warm in (("M2D_BTopOSM", (1.10, 1.04, 0.95)), ("M2D_BSideOSM", (1.06, 1.02, 0.96)),
                     ("M2D_BTop", (1.06, 1.03, 0.97)), ("M2D_BSide", (1.04, 1.02, 0.97))):
        m = bpy.data.materials.get(mn); b = _bsdf(m)
        if b:
            c = [x * w for x, w in zip(b.inputs["Base Color"].default_value[:3], warm)]
            _noise_mix(m, 60.0, tuple(x * 0.86 for x in c), tuple(x * 1.14 for x in c), detail=1.0); n += 1
    for mn in ("M2D_M2D_Water", "M2D_M2D_Stream"):
        b = _bsdf(bpy.data.materials.get(mn))
        if b:
            b.inputs["Roughness"].default_value = 0.55
            if "Specular IOR Level" in b.inputs:
                b.inputs["Specular IOR Level"].default_value = 0.3
            b.inputs["Base Color"].default_value = (*_srgb(30, 62, 96), 1.0)
    return f"materials: {n} textured (canopy two-tone + underside, asphalt grain, roof/facade variation), water glossy"


def _box(name, cx, cy, u, v, lu, wv, z0, z1, mat, coll):
    hx, hy = u * lu * 0.5, v * wv * 0.5
    pts = [(cx - hx[0] - hy[0], cy - hx[1] - hy[1]), (cx + hx[0] - hy[0], cy + hx[1] - hy[1]),
           (cx + hx[0] + hy[0], cy + hx[1] + hy[1]), (cx - hx[0] + hy[0], cy - hx[1] + hy[1])]
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    return _runtime_mesh(name, verts, faces, mat, coll)


def _life_pass(sc, track, log, max_cars=700, markings=True):
    """The details that say 'a race weekend is happening': cars on the parking lots,
    advertising hoardings along the pit straight, tyre walls outside the kerbed
    corners, a start gantry over the line and a TV mast by the pit complex.
    Everything derives from meshes already in the scene."""
    import mathutils
    from mathutils.geometry import intersect_point_tri_2d
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return "life: no asphalt strip — skipped"
    me = asp.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    Lv, Rv = V[0::2], V[1::2]; C = (Lv + Rv) * 0.5; m = len(C)
    coll = asp.users_collection[0]
    line = C[:, :2]

    # ── parking lots: plate-toned surface + car grid ─────────────────────────
    # plate tone from the (calmed) terrain vertex colours
    tv = []
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Terrain"):
            ca = o.data.color_attributes.get("M2DCol")
            if ca:
                buf = np.empty(len(ca.data) * 4, np.float32); ca.data.foreach_get("color", buf); r = buf.reshape(-1, 4)
                tv.append(r[r[:, 3] > 0.99, :3])
    plate = np.concatenate(tv).mean(0) if tv else np.array([0.06, 0.08, 0.09])
    _set_flat(("M2D_M2D_Park", "M2D_Park"), tuple(float(c) * 0.72 for c in plate))
    # Parking polygons are coarse (2–70 faces over hundreds of metres). Glued to the
    # relief per vertex they cut through the hills as folded light slabs (Zandvoort,
    # Jeddah). Keep only lots that are small enough to lie flat and near the circuit.
    hid_p = 0
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render or not o.name.split('.')[0].startswith("M2D_Park"):
            continue
        Pv = np.array([list(o.matrix_world @ v.co) for v in o.data.vertices])
        if len(Pv) < 3: continue
        ext = Pv.max(0) - Pv.min(0)
        d = np.hypot(line[:, 0] - Pv[:, 0].mean(), line[:, 1] - Pv[:, 1].mean()).min()
        if ext[0] * ext[1] > 40000.0 or d > 320.0 or (Pv[:, 2].max() - Pv[:, 2].min()) > 4.0:
            o.hide_render = True; hid_p += 1
    log.append(f"parking: hid {hid_p} coarse / far lots")
    # ring road / service roads: from the calmed plate, not the baked blue-grey (it drew a
    # blue thread round the sand at Bahrain)
    _set_flat(("M2D_Road",), tuple(float(c) * 0.82 for c in plate))
    # runways / airport aprons: tone to the plate, and hide the big ones (an airport
    # apron is a 200 m light fan — Jeddah's fresh OSM brought two)
    for m_ in bpy.data.materials:
        if "Aero" in m_.name and m_.name.startswith("M2D_"):
            _set_flat((m_.name,), tuple(float(c) * 0.90 for c in plate))
    for o in list(sc.objects):
        if o.type == 'MESH' and not o.hide_render and o.name.split('.')[0].startswith("M2D_Aero"):
            Pv = np.array([list(o.matrix_world @ v.co) for v in o.data.vertices])
            if len(Pv) >= 3:
                ext = Pv.max(0) - Pv.min(0)
                if ext[0] * ext[1] > 20000.0:
                    o.hide_render = True
    for m_ in bpy.data.materials:
        if m_.name.startswith("M2D_M2D_Rd_"):
            b_ = _bsdf(m_)
            if b_:
                b_.inputs["Base Color"].default_value = (*(float(c) * 0.78 for c in plate), 1.0)
    if markings:
        _park_markings(pitch_m=13.0, strength=0.14)
    car_tones = [(*_srgb(214, 216, 220), 1), (*_srgb(40, 42, 46), 1), (*_srgb(120, 124, 130), 1),
                 (*_srgb(150, 36, 40), 1), (*_srgb(40, 70, 130), 1), (*_srgb(170, 172, 176), 1)]
    car_mats = [_runtime_flat(f"M2D_CarLot{i}", t) for i, t in enumerate(car_tones)]
    cars = 0
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render or not o.name.split('.')[0].startswith("M2D_Park"):
            continue
        pm = o.data; pm.calc_loop_triangles()
        mw = o.matrix_world
        P = np.array([list(mw @ v.co) for v in pm.vertices])
        if len(P) < 3:
            continue
        tris = [tuple((mathutils.Vector(P[i][:2]) for i in t.vertices)) for t in pm.loop_triangles]
        u = _principal_xy(P); v = np.array([-u[1], u[0]]); c = P[:, :2].mean(0)
        pu = (P[:, :2] - c) @ u; pv = (P[:, :2] - c) @ v
        z0 = float(P[:, 2].mean()) + 0.05
        for a in np.arange(pu.min() + 3.0, pu.max() - 3.0, 5.0):
            for b_ in np.arange(pv.min() + 3.0, pv.max() - 3.0, 6.0):
                if cars >= max_cars:
                    break
                if _hash01(a + c[0], b_ + c[1], 11.0) > 0.55:
                    continue
                q = c + u * a + v * b_
                qv = mathutils.Vector((q[0], q[1]))
                if not any(intersect_point_tri_2d(qv, *t) for t in tris):
                    continue
                if np.hypot(line[:, 0] - q[0], line[:, 1] - q[1]).min() < 30.0:
                    continue
                _box(f"M2D_CarLot_{cars}", q[0], q[1], v, u, 4.4, 1.9, z0, z0 + 1.3,
                     car_mats[int(_hash01(q[0], q[1], 12.0) * len(car_mats)) % len(car_mats)], coll)
                cars += 1

    # ── hoardings along the pit straight (both sides, ±330 m of the line) ────
    m_h = _runtime_flat("M2D_Hoarding", (*_srgb(230, 232, 236), 1.0))
    mix = _noise_mix(m_h, 14.0, _srgb(40, 90, 200), _srgb(225, 40, 50), detail=0.5)
    nt = m_h.node_tree; b = _bsdf(m_h)
    wmix = nt.nodes.new("ShaderNodeMix"); wmix.data_type = 'RGBA'; wmix.inputs["Factor"].default_value = 0.72
    nt.links.new(mix.outputs[2], wmix.inputs[6]); wmix.inputs[7].default_value = (*_srgb(240, 240, 244), 1.0)
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Base Color":
            nt.links.remove(l)
    nt.links.new(wmix.outputs[2], b.inputs["Base Color"])
    span = int(330.0 / max(np.linalg.norm(C[1] - C[0]), 0.5))
    idx = [(i % m) for i in range(-span, span)]
    hoard = 0
    for side_pts in (Lv, Rv):
        verts, faces = [], []
        for k, i in enumerate(idx):
            out = side_pts[i, :2] - C[i, :2]; out = out / max(np.linalg.norm(out), 1e-6)
            base = side_pts[i, :2] + out * 5.0; zb = float(side_pts[i, 2])
            verts.append((base[0], base[1], zb + 0.02)); verts.append((base[0], base[1], zb + 2.1))
            if k:
                a = 2 * (k - 1); faces.append((a, a + 1, a + 3, a + 2))
        ob = _runtime_mesh(f"M2D_Hoard_{hoard}", verts, faces, m_h, coll); hoard += 1
        try:
            ob.visible_shadow = False
        except Exception:
            pass

    # ── tyre walls outside the kerbed corners ────────────────────────────────
    m_t = _runtime_flat("M2D_TyreWall", (*_srgb(58, 60, 64), 1.0))
    walls = 0
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render or o.name.split('.')[0] != "M2D_Kerb":
            continue
        km = o.data; kn = len(km.vertices)
        if kn < 4 or kn % 2:
            continue
        kc = np.empty(kn * 3); km.vertices.foreach_get("co", kc)
        K = (np.c_[kc.reshape(-1, 3), np.ones(kn)] @ np.array(o.matrix_world).T)[:, :3]
        KL, KR = K[0::2], K[1::2]
        dL = np.hypot(line[:, 0] - KL[:, 0].mean(), line[:, 1] - KL[:, 1].mean()).min()
        dR = np.hypot(line[:, 0] - KR[:, 0].mean(), line[:, 1] - KR[:, 1].mean()).min()
        outer, inner = (KL, KR) if dL > dR else (KR, KL)
        verts, faces = [], []
        for k in range(len(outer)):
            d = outer[k, :2] - inner[k, :2]; d = d / max(np.linalg.norm(d), 1e-6)
            p0 = outer[k, :2] + d * 7.0; p1 = outer[k, :2] + d * 8.8; zk = float(outer[k, 2]) - 0.05
            verts += [(p0[0], p0[1], zk), (p1[0], p1[1], zk), (p0[0], p0[1], zk + 1.2), (p1[0], p1[1], zk + 1.2)]
            if k:
                a = 4 * (k - 1)
                faces += [(a + 2, a + 3, a + 7, a + 6), (a, a + 1, a + 5, a + 4), (a, a + 4, a + 6, a + 2), (a + 1, a + 3, a + 7, a + 5)]
        if faces:
            _runtime_mesh(f"M2D_TyreWall_{walls}", verts, faces, m_t, coll); walls += 1

    # ── start gantry + TV mast ───────────────────────────────────────────────
    m_g = _runtime_flat("M2D_Gantry", (*_srgb(226, 228, 232), 1.0))
    t = C[1, :2] - C[0, :2]; t = t / max(np.linalg.norm(t), 1e-6); nrm = np.array([-t[1], t[0]])
    c0 = C[0, :2]; w = float(np.linalg.norm(Rv[0] - Lv[0])) + 8.0; zg = float(C[0, 2])
    for sgn in (-1, 1):
        q = c0 + nrm * sgn * (w * 0.5)
        _box("M2D_GantryPost", q[0], q[1], t, nrm, 1.0, 1.0, zg, zg + 7.0, m_g, coll)
    _box("M2D_GantryBeam", c0[0], c0[1], t, nrm, 1.6, w, zg + 6.0, zg + 7.6, m_g, coll)
    pit = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_PitBuilding" and not o.hide_render), None)
    if pit is not None:
        P = np.array([list(pit.matrix_world @ v.co) for v in pit.data.vertices])
        pu_ = _principal_xy(P); pv_ = np.array([-pu_[1], pu_[0]]); pc = P[:, :2].mean(0)
        ext = (P[:, :2] - pc) @ pu_
        q = pc + pu_ * (ext.min() - 10.0); zp = float(P[:, 2].min())
        _box("M2D_TVMast", q[0], q[1], pu_, pv_, 1.4, 1.4, zp, zp + 32.0, m_g, coll)
        _box("M2D_TVMastTop", q[0], q[1], pu_, pv_, 4.0, 4.0, zp + 30.0, zp + 32.5, m_g, coll)
        # helipad behind the pit building: 18 m disc, white ring, 'H' bar
        m_pad = _runtime_flat("M2D_Helipad", (*_srgb(96, 100, 108), 1.0))
        m_ring = _runtime_flat("M2D_HelipadRing", (*_srgb(230, 230, 234), 1.0), emit=0.05)
        hq = pc + pu_ * (ext.max() + 26.0) + pv_ * 0.0
        for rr, mm, zz in ((9.0, m_pad, 0.06), (9.0, m_ring, 0.10), (7.6, m_pad, 0.14)):
            verts = [(hq[0] + rr * math.cos(a), hq[1] + rr * math.sin(a), zp + zz) for a in np.linspace(0, 2 * math.pi, 28, endpoint=False)]
            _runtime_mesh("M2D_Helipad", verts, [tuple(range(28))], mm, coll)
        _box("M2D_HelipadH", hq[0], hq[1], pu_, pv_, 6.0, 1.0, zp + 0.18, zp + 0.22, m_ring, coll)
    # big screens: two on the outside of the pit straight, facing the stand, one at the last corner
    m_scr = _runtime_flat("M2D_BigScreen", (*_srgb(40, 44, 52), 1.0))
    m_scrf = _runtime_flat("M2D_BigScreenFace", (*_srgb(120, 150, 200), 1.0), emit=0.6)
    for frac in (0.08, 0.92, 0.985):
        i = int(frac * m) % m
        t_ = C[(i + 2) % m, :2] - C[(i - 2) % m, :2]; t_ = t_ / max(np.linalg.norm(t_), 1e-6)
        n_ = np.array([-t_[1], t_[0]])
        # outside = the side away from the loop centroid
        cen = C[:, :2].mean(0)
        if np.dot(n_, C[i, :2] - cen) < 0: n_ = -n_
        q = C[i, :2] + n_ * 22.0; zq = float(C[i, 2])
        _box(f"M2D_Screen_{i}", q[0], q[1], t_, n_, 12.0, 1.2, zq + 5.0, zq + 12.0, m_scrf, coll)
        _box(f"M2D_ScreenLeg_{i}", q[0], q[1], t_, n_, 1.4, 1.4, zq, zq + 5.2, m_scr, coll)
    return f"life: {cars} cars on the lots, {hoard} hoarding runs (±330 m), {walls} tyre walls, gantry + TV mast"


def _ribbon_realism(sc, edge_scale=0.55, kerb_scale=1.5):
    """Make the ribbon read as tarmac, not a slot-car piece.

    In the textured, lit environment the old ribbon stood out: near-black asphalt, a
    1.6 m emissive coral edge line, saturated kerbs. Real tarmac from above is mid
    grey with faint white edge lines; kerbs are small; gravel traps are sand.
      * asphalt: mid grey (sRGB 84,86,90) — the 2 m grain from _slate_materials stays;
      * edge lines: white-grey, emission 0.12, narrowed to 0.9 m;
      * kerbs: red (178,64,58) / white (222,222,224), emission off, width ×1.5 not ×2.2;
      * run-off fans: sand (156,146,124).
    """
    b = _bsdf(bpy.data.materials.get("M2D_Track"))
    if b:
        b.inputs["Base Color"].default_value = (*_srgb(84, 86, 90), 1.0)
        nt = bpy.data.materials["M2D_Track"].node_tree
        for n in nt.nodes:
            if n.type == 'MIX' and n.data_type == 'RGBA' and not n.inputs["Factor"].is_linked:
                pass
    for mn, rgb, emit in (("M2D_Edge", (198, 200, 204), 0.12), ("M2D_Line", (214, 214, 218), 0.10),
                          ("M2D_White", (228, 228, 232), 0.10), ("M2D_Runoff", (156, 146, 124), 0.0)):
        _set_flat((mn,), _srgb(*rgb), emit=emit)
    # narrow the edge strips about their pair midpoint
    for o in sc.objects:
        if o.type == 'MESH' and o.name.split('.')[0] in ("M2D_EdgeL", "M2D_EdgeR"):
            me = o.data; n = len(me.vertices)
            if n % 2:
                continue
            co = np.empty(n * 3); me.vertices.foreach_get("co", co); V = co.reshape(-1, 3)
            L, R = V[0::2], V[1::2]; Cc = (L + R) * 0.5
            V[0::2] = Cc + (L - Cc) * edge_scale; V[1::2] = Cc + (R - Cc) * edge_scale
            me.vertices.foreach_set("co", V.ravel()); me.update()
    m = bpy.data.materials.get("M2D_KerbStripe")
    b = _bsdf(m)
    if b and "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value = 0.0
    return f"ribbon: mid-grey tarmac, white edge lines ×{edge_scale}, kerbs matte, sand run-off"


def _circuit_character(sc, track, log):
    """Street circuit vs permanent circuit — the builder treats them alike, and the
    reviewer rightly asked where the gravel in Monaco came from.

    Street (urban palette): NO gravel fans, NO tyre walls; continuous barriers 1.2 m
    off both edges (light concrete, 1.0 m tall). Permanent: a 3 m grass verge along
    the white line (a lighter green strip), tyre walls stay.
    Both: a rubbered-in band down the middle of the tarmac (×0.86, 40 % of width),
    marshal posts (orange 2×2×2.5 m) at the entry of every kerbed corner, and, where
    the plate has open water > 2 ha, yachts (Monaco's harbour is its signature)."""
    urban = TRACK_PALETTE.get(track.lower(), "temperate") == "urban"
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return "character: no asphalt"
    me = asp.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    Lv, Rv = V[0::2], V[1::2]; C = (Lv + Rv) * 0.5; m = len(C)
    coll = asp.users_collection[0]
    faces = [tuple(p.vertices) for p in me.polygons]
    notes = []

    # rubbered band
    m_rub = _runtime_flat("M2D_Rubber", (*_srgb(70, 72, 76), 1.0))
    band = np.empty((n, 3)); band[0::2] = C + (Lv - C) * 0.40; band[1::2] = C + (Rv - C) * 0.40; band[:, 2] = V[:, 2] + 0.02
    ob = _runtime_mesh("M2D_RubberBand", [tuple(v) for v in band], faces, m_rub, coll)
    try: ob.visible_shadow = False
    except Exception: pass

    if urban:
        hidden = 0
        for o in sc.objects:
            if o.type == 'MESH' and o.name.split('.')[0] in ("M2D_Runoff",) or o.name.startswith("M2D_TyreWall"):
                o.hide_render = True; hidden += 1
        m_bar = _runtime_flat("M2D_Barrier", (*_srgb(196, 198, 202), 1.0))
        for side in (Lv, Rv):
            verts, fcs = [], []
            for i in range(m):
                out = side[i, :2] - C[i, :2]; out = out / max(np.linalg.norm(out), 1e-6)
                b0 = side[i, :2] + out * 1.2; b1 = side[i, :2] + out * 1.9; zs_ = float(side[i, 2])
                verts += [(b0[0], b0[1], zs_), (b1[0], b1[1], zs_), (b0[0], b0[1], zs_ + 1.0), (b1[0], b1[1], zs_ + 1.0)]
                if i:
                    a = 4 * (i - 1)
                    fcs += [(a + 2, a + 3, a + 7, a + 6), (a, a + 4, a + 6, a + 2), (a + 1, a + 3, a + 7, a + 5)]
            _runtime_mesh("M2D_Barrier", verts, fcs, m_bar, coll)
        notes.append(f"street: {hidden} gravel fans / tyre walls hidden, barriers both sides")
    else:
        m_verge = _runtime_flat("M2D_Verge", (*_srgb(92, 118, 70), 1.0))
        for side in (Lv, Rv):
            verts = []
            for i in range(m):
                out = side[i, :2] - C[i, :2]; out = out / max(np.linalg.norm(out), 1e-6)
                v0 = side[i, :2] + out * 0.9; v1 = side[i, :2] + out * 3.8; zv = float(side[i, 2]) - 0.04
                verts += [(v0[0], v0[1], zv), (v1[0], v1[1], zv)]
            ob = _runtime_mesh("M2D_Verge", verts, faces, m_verge, coll)
            try: ob.visible_shadow = False
            except Exception: pass
        notes.append("permanent: grass verge 3 m")

    # pit lane: lighter apron so it reads as a lane, not a second track; grid boxes on the
    # start straight — 20 white bars, staggered, 8 m pitch, behind the line
    _set_flat(("M2D_PitMat",), _srgb(112, 114, 118))
    m_w = _runtime_flat("M2D_GridBox", (*_srgb(232, 232, 236), 1.0), emit=0.1)
    step_m = float(np.linalg.norm(C[1] - C[0]))
    per_slot = max(1, int(round(8.0 / step_m)))
    for k in range(20):
        i = (-1 - k * per_slot) % m
        side = Lv if k % 2 == 0 else Rv
        c_ = C[i]; sd = side[i]
        pos = c_ + (sd - c_) * 0.55
        t = C[(i + 1) % m, :2] - C[(i - 1) % m, :2]; t = t / max(np.linalg.norm(t), 1e-6)
        nrm = np.array([-t[1], t[0]])
        _box(f"M2D_Grid_{k}", pos[0], pos[1], t, nrm, 4.2, 0.35, float(pos[2]) + 0.03, float(pos[2]) + 0.08, m_w, coll)
    # marshal posts at kerb entries (outside)
    m_post = _runtime_flat("M2D_Marshal", (*_srgb(226, 120, 40), 1.0))
    posts = 0
    line = C[:, :2]
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render or o.name.split('.')[0] != "M2D_Kerb":
            continue
        km = o.data; kn = len(km.vertices)
        if kn < 4 or kn % 2: continue
        kc = np.empty(kn * 3); km.vertices.foreach_get("co", kc)
        K = (np.c_[kc.reshape(-1, 3), np.ones(kn)] @ np.array(o.matrix_world).T)[:, :3]
        KL, KR = K[0::2], K[1::2]
        dL = np.hypot(line[:, 0] - KL[:, 0].mean(), line[:, 1] - KL[:, 1].mean()).min()
        dR = np.hypot(line[:, 0] - KR[:, 0].mean(), line[:, 1] - KR[:, 1].mean()).min()
        outer, inner = (KL, KR) if dL > dR else (KR, KL)
        d = outer[0, :2] - inner[0, :2]; d = d / max(np.linalg.norm(d), 1e-6)
        q = outer[0, :2] + d * (4.0 if urban else 11.0)
        t = outer[min(3, len(outer) - 1), :2] - outer[0, :2]; t = t / max(np.linalg.norm(t), 1e-6)
        zm = float(outer[0, 2])
        _box(f"M2D_Marshal_{posts}", q[0], q[1], t, np.array([-t[1], t[0]]), 2.0, 2.0, zm, zm + 2.5, m_post, coll); posts += 1

    # yachts on open water — Monaco's harbour is not a water MESH: the coastline
    # inject classifies TERRAIN vertices as water (blue vertex colour). Sample those —
    # but ONLY where a coastline was injected: on the slate plate a colour test alone
    # flagged bluish land as water and put yachts in fields (Silverstone, Miami, Baku).
    yachts = 0
    m_y = _runtime_flat("M2D_Yacht", (*_srgb(238, 240, 244), 1.0))
    import mathutils
    coast = any("osm coastline" in ln for ln in log)
    for o in sc.objects:
        if not coast or o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        ca = o.data.color_attributes.get("M2DCol")
        if ca is None: continue
        buf = np.empty(len(ca.data) * 4, np.float32); ca.data.foreach_get("color", buf); col = buf.reshape(-1, 4)
        water = (col[:, 2] > col[:, 0] * 1.6) & (col[:, 2] > col[:, 1] * 1.15) & (col[:, 3] > 0.99)
        if water.sum() < 400: continue
        nv = len(o.data.vertices); co = np.empty(nv * 3); o.data.vertices.foreach_get("co", co)
        W = (np.c_[co.reshape(-1, 3), np.ones(nv)] @ np.array(o.matrix_world).T)[:, :3]
        kd = mathutils.kdtree.KDTree(nv)
        for i in range(nv): kd.insert((W[i, 0], W[i, 1], 0.0), i)
        kd.balance()
        # shore rim: water vertices that touch land get a light shallow tone
        shore = 0
        for i in np.where(water)[0]:
            nb = kd.find_n((W[i, 0], W[i, 1], 0.0), 9)
            land = sum(1 for _, j, _ in nb if not water[j])
            if land >= 2:
                k_ = min(1.0, land / 5.0)
                col[i, :3] = col[i, :3] * (1 - 0.5 * k_) + np.array([0.20, 0.34, 0.42]) * 0.5 * k_; shore += 1
        if shore:
            ca.data.foreach_set("color", col.ravel())
        idx = np.where(water)[0]
        # The coastline inject also flags open sea (and, on the far side, some land) as
        # water. The harbour is what matters: keep candidates 70–500 m from the track,
        # nearest first, so the cap is spent by the circuit and not at the frame edge.
        dline = np.array([np.hypot(line[:, 0] - W[i, 0], line[:, 1] - W[i, 1]).min() for i in idx])
        keep = (dline > 70) & (dline < 500)
        idx = idx[keep][np.argsort(dline[keep])]
        cells = set()
        for i in idx:
            key = (int(W[i, 0] // 40), int(W[i, 1] // 40))
            if key in cells or yachts >= 40: continue
            if _hash01(W[i, 0], W[i, 1], 21.0) > 0.45: continue
            # deep water only: the 12 nearest vertices must all be water (keeps off the shore)
            nb = kd.find_n((W[i, 0], W[i, 1], 0.0), 12)
            if not all(water[j] for _, j, _ in nb): continue
            cells.add(key)
            ang = _hash01(W[i, 1], W[i, 0], 23.0) * math.pi
            u = np.array([math.cos(ang), math.sin(ang)]); v = np.array([-u[1], u[0]])
            Lb = 6.0 + 10.0 * _hash01(W[i, 0] + 1, W[i, 1], 24.0)       # 6–16 m: yachts, not barges
            q = W[i, :2] + (np.array([_hash01(W[i, 0], W[i, 1], 25.0), _hash01(W[i, 1], W[i, 0], 26.0)]) - 0.5) * 24
            _box(f"M2D_Yacht_{yachts}", q[0], q[1], u, v, Lb, Lb * 0.32, W[i, 2] + 0.2, W[i, 2] + 1.6, m_y, coll); yachts += 1
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render or not o.name.split('.')[0].startswith("M2D_Water"):
            continue
        import mathutils
        from mathutils.geometry import intersect_point_tri_2d
        wm = o.data; wm.calc_loop_triangles()
        P = np.array([list(o.matrix_world @ v.co) for v in wm.vertices])
        if len(P) < 3: continue
        area = (P[:, 0].max() - P[:, 0].min()) * (P[:, 1].max() - P[:, 1].min())
        if area < 80000: continue      # 2 ha → 8 ha: Zandvoort's dune ponds (2.7 ha) got a marina
        tris = [tuple((mathutils.Vector(P[i][:2]) for i in t.vertices)) for t in wm.loop_triangles]
        z0 = float(P[:, 2].mean()) + 0.2
        for a in np.arange(P[:, 0].min(), P[:, 0].max(), 34.0):
            for b_ in np.arange(P[:, 1].min(), P[:, 1].max(), 34.0):
                if yachts >= 90: break
                h = _hash01(a, b_, 21.0)
                if h > 0.35: continue
                q = np.array([a + (h - 0.5) * 20, b_ + (_hash01(b_, a, 22.0) - 0.5) * 20])
                if not any(intersect_point_tri_2d(mathutils.Vector((q[0], q[1])), *t) for t in tris): continue
                if np.hypot(line[:, 0] - q[0], line[:, 1] - q[1]).min() < 60: continue
                ang = _hash01(q[0], q[1], 23.0) * math.pi
                u = np.array([math.cos(ang), math.sin(ang)]); v = np.array([-u[1], u[0]])
                Lb = 6.0 + 10.0 * _hash01(q[1], q[0], 24.0)
                _box(f"M2D_Yacht_{yachts}", q[0], q[1], u, v, Lb, Lb * 0.32, z0, z0 + 1.6, m_y, coll); yachts += 1
    notes.append(f"{posts} marshal posts, {yachts} yachts")
    return "character: " + "; ".join(notes)


NIGHT_RACES = {"bahrain", "jeddah", "singapore", "vegas", "lusail", "yasmarina"}


def _night_race(sc, track, log, step_m=110.0, mast_h=24.0, offset_m=20.0, spot_w=9000.0):
    """Floodlit night race, the way the six night GPs look in the reference.

    Moonlight instead of sun (cool, weak, long soft shadows), a near-black sky, and a
    row of warm spotlights on masts along the track, alternating sides, every
    step_m. Emissive edge lines, kerbs, hoardings and big screens; lit windows on the
    city facades; the pit glazing glows. Everything else (relief, kit, life) is
    unchanged, so the day/night switch is one flag per track."""
    if track.lower() not in NIGHT_RACES:
        return None
    # world: black sky, faint cool fill
    w = sc.world
    if w and w.use_nodes:
        for n in w.node_tree.nodes:
            if n.type == 'BACKGROUND':
                if n.inputs["Strength"].default_value <= 0.6:      # the sky-fill node
                    n.inputs["Color"].default_value = (0.34, 0.46, 0.72, 1.0)
                    n.inputs["Strength"].default_value = 0.70
                else:                                              # the camera-visible node
                    n.inputs["Color"].default_value = (0.012, 0.020, 0.040, 1.0)
    for o in sc.objects:
        if o.type == 'LIGHT' and o.data.type == 'SUN':
            if o.name.startswith("M2D_Rim"):
                o.data.energy = 0.6
            else:
                # a cool, low "moon-sun" that still shades every volume: the reference night
                # map keeps shadows under stands and buildings
                o.data.energy = 2.0; o.data.color = (0.62, 0.74, 1.0); o.data.angle = math.radians(3.0)
    # plate → navy: tint the terrain vertex colours cool and darker (alpha untouched)
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Terrain"):
            ca_ = o.data.color_attributes.get("M2DCol")
            if ca_:
                buf_ = np.empty(len(ca_.data) * 4, np.float32); ca_.data.foreach_get("color", buf_); r_ = buf_.reshape(-1, 4)
                r_[:, :3] = r_[:, :3] * np.array([0.42, 0.55, 0.85], np.float32)
                ca_.data.foreach_set("color", r_.ravel())
    # water at night: glossy and dark so the lit city and the ribbon glow reflect in it
    for mn in ("M2D_M2D_Water", "M2D_M2D_Stream", "M2D_Water", "M2D_Stream"):
        b = _bsdf(bpy.data.materials.get(mn))
        if b:
            b.inputs["Base Color"].default_value = (*_srgb(10, 22, 44), 1.0)
            b.inputs["Roughness"].default_value = 0.12
            if "Specular IOR Level" in b.inputs:
                b.inputs["Specular IOR Level"].default_value = 0.9
    tm = bpy.data.materials.get("M2D_TerrainVC")
    if tm and tm.use_nodes:
        # the coastline water lives in the terrain material's water branch: make it glossy too
        b = _bsdf(tm)
        if b:
            b.inputs["Roughness"].default_value = 0.55
    # canopy darker teal, water deep navy, verge cool
    for mn, col in (("M2D_TreeBlob", (0.018, 0.06, 0.05)), ("M2D_Verge", (0.05, 0.10, 0.09)), ("M2D_Runoff", (0.22, 0.20, 0.17))):
        b = _bsdf(bpy.data.materials.get(mn))
        if b and not b.inputs["Base Color"].is_linked:
            b.inputs["Base Color"].default_value = (*col, 1.0)
    # floodlight masts along the track
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return "night: no asphalt"
    me = asp.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    Lv, Rv = V[0::2], V[1::2]; C = (Lv + Rv) * 0.5; m = len(C)
    coll = asp.users_collection[0]
    step = max(1, int(round(step_m / max(np.linalg.norm(C[1] - C[0]), 0.5))))
    m_mast = _runtime_flat("M2D_Mast", (*_srgb(70, 74, 82), 1.0))
    m_head = _runtime_flat("M2D_MastHead", (*_srgb(255, 240, 210), 1.0), emit=6.0)
    nl = 0
    for k, i in enumerate(range(0, m, step)):
        side = Lv if k % 2 == 0 else Rv
        out = side[i, :2] - C[i, :2]; out = out / max(np.linalg.norm(out), 1e-6)
        q = side[i, :2] + out * offset_m; z0 = float(C[i, 2])
        lamp = bpy.data.lights.new(f"M2D_Flood_{k}", 'SPOT')
        lamp.energy = spot_w; lamp.color = (1.0, 0.93, 0.80)
        lamp.spot_size = math.radians(150.0); lamp.spot_blend = 0.85
        lamp.shadow_soft_size = 3.0
        try: lamp.use_shadow = False
        except Exception: pass
        ob = bpy.data.objects.new(lamp.name, lamp)
        ob.location = (q[0], q[1], z0 + mast_h)
        # aim at the track centre point
        d = np.array([C[i, 0] - q[0], C[i, 1] - q[1], -mast_h])
        d = d / np.linalg.norm(d)
        rot = mathutils_dir_to_euler(d)
        ob.rotation_euler = rot
        coll.objects.link(ob)
        t_ = C[(i + 1) % m, :2] - C[(i - 1) % m, :2]; t_ = t_ / max(np.linalg.norm(t_), 1e-6)
        _box(f"M2D_MastPole_{k}", q[0], q[1], t_, np.array([-t_[1], t_[0]]), 0.9, 0.9, z0, z0 + mast_h, m_mast, coll)
        _box(f"M2D_MastHead_{k}", q[0], q[1], t_, np.array([-t_[1], t_[0]]), 3.2, 1.4, z0 + mast_h - 1.2, z0 + mast_h, m_head, coll)
        nl += 1
    # ── continuous floodlit corridor: a soft warm emissive band on the ground, ±(edge+26 m),
    # fading to nothing at the outside. This is what makes the reference read as "the whole
    # track is lit", independent of how many lamps EEVEE will take.
    m_pool = bpy.data.materials.new("M2D_FloodPool"); m_pool.use_nodes = True
    nt = m_pool.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Pool"
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mixs = nt.nodes.new("ShaderNodeMixShader")
    em.inputs["Color"].default_value = (0.95, 0.97, 1.0, 1.0); em.inputs["Strength"].default_value = 0.22
    nt.links.new(vc.outputs["Alpha"], mixs.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mixs.inputs[1]); nt.links.new(em.outputs["Emission"], mixs.inputs[2])
    nt.links.new(mixs.outputs["Shader"], out.inputs["Surface"])
    try: m_pool.surface_render_method = 'BLENDED'
    except Exception: pass
    try: m_pool.blend_method = 'BLEND'
    except Exception: pass
    verts, faces, alphas = [], [], []
    # street circuits run between buildings: a ±36 m pool swallowed whole blocks
    # (Singapore). ±22 m there, ±36 m on open circuits.
    urban_ = TRACK_PALETTE.get(track.lower(), "temperate") == "urban"
    r_mid, r_out = (9.0, 22.0) if urban_ else (14.0, 36.0)
    for i in range(m):
        for side, sgn in ((Lv, 1), (Rv, -1)):
            out_ = side[i, :2] - C[i, :2]; out_ = out_ / max(np.linalg.norm(out_), 1e-6)
            # three rings: edge (0.7) → mid (0.28) → out (0): a soft quadratic-looking falloff
            a = side[i, :2] + out_ * 1.0; mid = side[i, :2] + out_ * r_mid; b_ = side[i, :2] + out_ * r_out
            zs_ = float(side[i, 2]) + 0.05
            verts += [(a[0], a[1], zs_), (mid[0], mid[1], zs_), (b_[0], b_[1], zs_)]
            alphas += [0.7, 0.28, 0.0]
    for i in range(m):
        j = (i + 1) % m
        for k in (0, 3):     # left triple at 6i+0..2, right triple at 6i+3..5
            for q in (0, 1):
                a0, a1 = 6 * i + k + q, 6 * i + k + q + 1; b0, b1 = 6 * j + k + q, 6 * j + k + q + 1
                faces.append((a0, a1, b1, b0))
    me_p = bpy.data.meshes.new("M2D_FloodPool"); me_p.from_pydata(verts, [], faces); me_p.validate()
    me_p.materials.append(m_pool)
    ca = me_p.color_attributes.new("Pool", 'FLOAT_COLOR', 'POINT')
    ca.data.foreach_set("color", np.array([[1, 1, 1, a] for a in alphas], np.float32).ravel())
    ob_p = bpy.data.objects.new("M2D_FloodPool", me_p); coll.objects.link(ob_p)
    try: ob_p.visible_shadow = False
    except Exception: pass
    # floodlit asphalt is light grey, not dark; the rubber band stays darker
    m_t = bpy.data.materials.get("M2D_Track"); b = _bsdf(m_t)
    if b:
        for l in list(m_t.node_tree.links):
            if l.to_node == b and l.to_socket.name == "Base Color":
                m_t.node_tree.links.remove(l)
        b.inputs["Base Color"].default_value = (*_srgb(214, 218, 226), 1.0)
        if "Emission Strength" in b.inputs:
            b.inputs["Emission Color"].default_value = (0.92, 0.95, 1.0, 1.0)
            b.inputs["Emission Strength"].default_value = 0.35
    b = _bsdf(bpy.data.materials.get("M2D_Rubber"))
    if b:
        b.inputs["Base Color"].default_value = (*_srgb(150, 154, 162), 1.0)
    # stands: lit crowd (seat material copies carry the crowd mix) and light roofs
    for m_ in bpy.data.materials:
        if m_.name.startswith("M2D_Seats"):
            b = _bsdf(m_)
            if b and "Emission Strength" in b.inputs:
                src = next((l.from_socket for l in m_.node_tree.links if l.to_node == b and l.to_socket.name == "Base Color"), None)
                if src is not None:
                    m_.node_tree.links.new(src, b.inputs["Emission Color"])
                b.inputs["Emission Strength"].default_value = 0.55
    for mn in ("M2D_RoofDeckLight", "M2D_BTop", "M2D_BTopOSM"):
        b = _bsdf(bpy.data.materials.get(mn))
        if b and "Emission Strength" in b.inputs and not b.inputs["Base Color"].is_linked:
            c = b.inputs["Base Color"].default_value
            b.inputs["Emission Color"].default_value = (c[0], c[1], c[2], 1.0)
            b.inputs["Emission Strength"].default_value = 0.12
    # motorhomes / tents / trucks / cars glow a little under the floods
    for m_ in bpy.data.materials:
        if m_.name.startswith(("M2D_Motorhome", "M2D_Tent", "M2D_CarLot")):
            b = _bsdf(m_)
            if b and "Emission Strength" in b.inputs:
                c = b.inputs["Base Color"].default_value
                b.inputs["Emission Color"].default_value = (c[0], c[1], c[2], 1.0)
                b.inputs["Emission Strength"].default_value = 0.35
    # glare: lower threshold, more mix for halos around the mast heads and screens
    ng = getattr(sc, "compositing_node_group", None)
    if ng:
        for n_ in ng.nodes:
            if n_.type == 'GLARE':
                for nm, val in (("Threshold", 0.95), ("Strength", 0.40), ("Size", 0.7), ("Smoothness", 0.3)):
                    try:
                        n_.inputs[nm].default_value = val
                    except Exception:
                        pass
    # emissive furniture
    for mn, emit in (("M2D_Edge", 1.6), ("M2D_Line", 0.9), ("M2D_White", 1.0), ("M2D_KerbStripe", 0.6),
                     ("M2D_Hoarding", 0.9), ("M2D_BigScreenFace", 2.5), ("M2D_PitGlass", 0.5),
                     ("M2D_GridBox", 0.6), ("M2D_HelipadRing", 0.8)):
        b = _bsdf(bpy.data.materials.get(mn))
        if b and "Emission Strength" in b.inputs:
            if "Emission Color" in b.inputs and not b.inputs["Emission Color"].is_linked:
                c = b.inputs["Base Color"].default_value
                if not b.inputs["Base Color"].is_linked:
                    b.inputs["Emission Color"].default_value = (c[0], c[1], c[2], 1.0)
            b.inputs["Emission Strength"].default_value = emit
    # the pit complex under 58 kW floods blew out to a white slab: darken its surfaces
    for mn, k in (("M2D_PitMat", 0.55), ("M2D_PitTop", 0.6), ("M2D_PaddockTop", 0.6), ("M2D_Tent", 0.7)):
        b = _bsdf(bpy.data.materials.get(mn))
        if b and not b.inputs["Base Color"].is_linked:
            c = b.inputs["Base Color"].default_value
            b.inputs["Base Color"].default_value = (c[0] * k, c[1] * k, c[2] * k, c[3])
    # Facades: NO window dots — at 1.6 m/px a thresholded noise reads as white blotches,
    # not windows (reviewed and rejected). A uniform faint warm glow instead, as the
    # reference does: buildings pale, softly lit, no texture.
    for mn in ("M2D_BSideOSM", "M2D_BSide"):
        m_ = bpy.data.materials.get(mn); b = _bsdf(m_)
        if not b: continue
        nt = m_.node_tree
        for n_ in nt.nodes:
            if n_.type == 'MIX' and n_.data_type == 'RGBA':
                for idx in (6, 7):
                    c = n_.inputs[idx].default_value
                    n_.inputs[idx].default_value = (c[0] * 0.9, c[1] * 0.95, min(1, c[2] * 1.15), 1.0)
        if "Emission Strength" in b.inputs:
            for l in list(nt.links):
                if l.to_node == b and l.to_socket.name in ("Emission Strength", "Emission Color"):
                    nt.links.remove(l)
            b.inputs["Emission Color"].default_value = (1.0, 0.88, 0.70, 1.0)
            b.inputs["Emission Strength"].default_value = 0.10
    # roof tops catch the flood spill; keep the plate calm: nothing else changes
    return f"night race: moon 0.45, {nl} floodlight masts every {step_m:.0f} m, emissive edges/kerbs/hoardings/screens, lit windows"


def mathutils_dir_to_euler(d):
    """Euler for a spot whose -Z axis points along d (world)."""
    import mathutils
    v = mathutils.Vector((float(d[0]), float(d[1]), float(d[2])))
    return v.to_track_quat('-Z', 'Y').to_euler()


def _slate_light(sc, sky=(0.50, 0.62, 0.85), sky_strength=0.36, sun_energy=4.4,
                 sun_color=(1.0, 0.93, 0.82), rim_energy=1.0, rim_color=(0.55, 0.70, 1.0), sun_tilt_deg=60.0,
                 sun_yaw_rel=-135.0):
    """Three-point light for the diorama, keeping the level-2 colour key.

    Before: one cool sun, world = flat dark colour that also LIT the scene, i.e. no
    fill at all — every face the sun missed was black, so buildings, stands and the
    canopy read as flat cut-outs. Now the world is split with Light Path: the camera
    still sees the dark plate-fade tone, but diffuse lighting sees a cool sky (fill);
    the sun is a touch less blue; a second, shadowless sun from the opposite side and
    low elevation rims the volumes so their far edges separate from the ground."""
    w = sc.world
    if w and w.use_nodes:
        nt = w.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_WORLD'), None)
        bg = next((n for n in nt.nodes if n.type == 'BACKGROUND'), None)
        if out and bg and not any(n.type == 'LIGHT_PATH' for n in nt.nodes):
            skyn = nt.nodes.new("ShaderNodeBackground")
            skyn.inputs["Color"].default_value = (*sky, 1.0)
            skyn.inputs["Strength"].default_value = sky_strength
            lp = nt.nodes.new("ShaderNodeLightPath")
            mix = nt.nodes.new("ShaderNodeMixShader")
            for l in list(nt.links):
                if l.to_node == out and l.to_socket.name == "Surface":
                    nt.links.remove(l)
            nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs["Fac"])
            nt.links.new(skyn.outputs["Background"], mix.inputs[1])   # fac 0: lighting
            nt.links.new(bg.outputs["Background"], mix.inputs[2])     # fac 1: camera
            nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    main = None
    for o in sc.objects:
        if o.type == 'LIGHT' and o.data.type == 'SUN' and not o.name.startswith("M2D_Rim"):
            main = o
            o.data.energy = sun_energy
            o.data.color = sun_color
            o.data.angle = math.radians(2.5)   # 4° → 2.5°: crisper shadow edges under the crowns and stands
            # lower sun (tilt from vertical 30° → sun_tilt_deg): longer shadows, more relief
            yaw_z = o.rotation_euler[2]
            # Art pass: one key direction for all 24. Each .blend carried its own sun yaw
            # (RBR −25°, Spa +115°, Suzuka +97°) so shadows fell every which way on
            # screen. Now the sun sits upper-left of the CAMERA and the shadows of crowns,
            # stands and buildings fall down-right, towards the viewer — the reference's
            # diorama key. yaw_s = yaw_cam − 135° (see the derivation in PROJECT_LOG).
            if sun_yaw_rel is not None and sc.camera is not None:
                yaw_z = sc.camera.rotation_euler[2] + math.radians(sun_yaw_rel)
            o.rotation_euler = (math.radians(sun_tilt_deg), 0.0, yaw_z)
            # Crown shadows: at 42° elevation an 11 m canopy threw 12 m (7 px at 1.6 m/px)
            # and a 5 m motorhome 3 px — measured on the processed RBR scene, shadows DO
            # render (test cube), they were just too short to read. 30° elevation makes
            # them 1.7× longer; energy 3.6 → 4.4 keeps the ground at the same L
            # (cos 60° / cos 48° = 0.75). Cascade range widened for the 2 km camera.
            try:
                o.data.shadow_cascade_max_distance = 6000.0
                o.data.shadow_cascade_count = 4
            except Exception:
                pass
    if main is not None and not any(o.name.startswith("M2D_Rim") for o in sc.objects):
        rim = bpy.data.objects.new("M2D_Rim", bpy.data.lights.new("M2D_Rim", 'SUN'))
        rim.data.energy = rim_energy
        rim.data.color = rim_color
        rim.data.angle = math.radians(12.0)
        try:
            rim.data.use_shadow = False
        except Exception:
            pass
        rim.rotation_euler = (math.radians(66.0), 0.0, main.rotation_euler[2] + math.pi)
        main.users_collection[0].objects.link(rim)
    return f"light: warm sun {sun_energy} at {90 - sun_tilt_deg:.0f}° elevation, yaw cam{sun_yaw_rel:+.0f}°, cool sky fill {sky_strength} (lighting only), rim {rim_energy}"


def _tilt_shift(sc, track, blur_px=15.0, mask_grow=(1.22, 1.38), feather_px=170):
    """Diorama depth of field in the compositor: sharp on the circuit, soft towards the
    frame edges. A screen-space ellipse mask around the circuit's bounding box (from the
    bridge) is feathered and mixes a gaussian-blurred copy over the frame. This is what
    makes the reference read as a MODEL rather than a map — tilt-shift is the single
    cheapest lever on the 'diorama' feel. Inserted between the existing Glare and the
    Group Output; no other node is touched."""
    ng = getattr(sc, "compositing_node_group", None) or getattr(sc, "node_tree", None)
    if ng is None:
        return "tiltshift: no compositor tree — skipped"
    if any(n.name == "M2D_TiltMix" for n in ng.nodes):
        return "tiltshift: already present"
    out = next((n for n in ng.nodes if n.type in ('GROUP_OUTPUT', 'COMPOSITE')), None)
    if out is None:
        return "tiltshift: no output node — skipped"
    src_link = next((l for l in ng.links if l.to_node == out and l.to_socket.name == "Image"), None)
    if src_link is None:
        return "tiltshift: output not linked — skipped"
    src = src_link.from_socket
    # ellipse from the bridge (screen 0..1; mask y is measured from the bottom)
    cx, cy, ww, hh = 0.5, 0.5, 0.7, 0.7
    bp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "F1Manager2027-Unity",
                      "Assets", "Resources", "TrackMaps", f"{track}_bridge.json")
    if os.path.exists(bp):
        bj = json.load(open(bp))
        P = np.array(bj["centerline_px"], float)
        if P.max() > 1.5:
            P = P / [bj["render"]["w"], bj["render"]["h"]]
        lo, hi = P.min(0), P.max(0)
        cx, cy = (lo[0] + hi[0]) / 2, 1.0 - (lo[1] + hi[1]) / 2
        ww, hh = min(1.6, (hi[0] - lo[0]) * mask_grow[0] + 0.12), min(1.8, (hi[1] - lo[1]) * mask_grow[1] + 0.16)
    # Blender 5 compositor: node parameters are SOCKETS (Position/Size on the mask,
    # Size on the blur) and the mix is the generic ShaderNodeMix in RGBA mode.
    ell = ng.nodes.new("CompositorNodeEllipseMask"); ell.name = "M2D_TiltMask"
    def _vec(sock, x, y):
        try:
            sock.default_value = (x, y)
        except Exception:
            sock.default_value = (x, y, 0.0)
    _vec(ell.inputs["Position"], cx, cy)
    _vec(ell.inputs["Size"], ww, hh)
    fe = ng.nodes.new("CompositorNodeBlur"); fe.name = "M2D_TiltFeather"
    _vec(fe.inputs["Size"], float(feather_px), float(feather_px))
    bl = ng.nodes.new("CompositorNodeBlur"); bl.name = "M2D_TiltBlur"
    _vec(bl.inputs["Size"], float(blur_px), float(blur_px))
    mix = ng.nodes.new("ShaderNodeMix"); mix.name = "M2D_TiltMix"
    mix.data_type = 'RGBA'; mix.blend_type = 'MIX'; mix.factor_mode = 'UNIFORM'
    ng.links.remove(src_link)
    ng.links.new(ell.outputs["Mask"], fe.inputs["Image"])
    ng.links.new(src, bl.inputs["Image"])
    fac = next(i for i in mix.inputs if i.name == "Factor" and i.type == 'VALUE')
    a = next(i for i in mix.inputs if i.name == "A" and i.type == 'RGBA')
    b = next(i for i in mix.inputs if i.name == "B" and i.type == 'RGBA')
    # factor 0 → A (blurred, outside the ellipse); factor 1 → B (sharp, inside)
    ng.links.new(fe.outputs["Image"], fac)
    ng.links.new(bl.outputs["Image"], a)
    ng.links.new(src, b)
    res = next(o for o in mix.outputs if o.type == 'RGBA')
    ng.links.new(res, out.inputs["Image"])
    return f"tiltshift: ellipse ({cx:.2f},{cy:.2f}) {ww:.2f}×{hh:.2f}, feather {feather_px} px, blur {blur_px:.0f} px"


def _vc_material(name, base_rgb, emit=0.0, layer="KerbCol"):
    """Flat material whose Base Color comes from a face-corner colour attribute."""
    m = _runtime_flat(name, (*base_rgb, 1.0), emit=emit)
    nt = m.node_tree
    b = _bsdf(m)
    vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = layer
    nt.links.new(vc.outputs["Color"], b.inputs["Base Color"])
    if emit:
        nt.links.new(vc.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = 0.0
    return m


def _principal_xy(V):
    d = V[:, :2] - V[:, :2].mean(0)
    w, vec = np.linalg.eigh(d.T @ d)
    return vec[:, int(np.argmax(w))]


def _furniture_kit(sc, log, kerb_widen=1.5, seat_pitch_m=1.8, mh_size=(14.0, 8.0, 4.5)):
    """Procedural detail for the circuit's own furniture — the things a viewer reads as
    'a race track' rather than 'a road': red/white kerbs at the corners, tiered stands,
    a glazed pit building, and a row of motorhomes in the paddock. No assets, no
    per-track authoring: everything derives from the meshes the builder already placed.

      * KERBS. M2D_Kerb strips (vertex pairs 2i/2i+1, ~3.5 m per quad) alternate red /
        white per quad via a face-corner colour attribute. Half the strips had their
        normals DOWN and rendered black — flipped. Widened ×kerb_widen about the pair
        midpoint so a 1.5 m kerb survives 1.6 m/px.
      * STANDS. Top faces get a seat material with stripes across the stand's SHORT
        axis (pitch seat_pitch_m); roof decks a light tone.
      * PIT BUILDING. Side faces above 45 % of height get a glazing tone.
      * PADDOCK. Two rows of motorhome boxes along the paddock's long axis, three
        alternating tones, only where they fit inside the footprint.
    """
    import bmesh
    n_kerb = n_flip = 0
    m_kerb = _vc_material("M2D_KerbStripe", (0.8, 0.12, 0.12), emit=0.12)
    red, white = (*_srgb(178, 64, 58), 1.0), (*_srgb(222, 222, 224), 1.0)
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.split('.')[0] == "M2D_Kerb" or o.hide_render:
            continue
        me = o.data
        n = len(me.vertices)
        if n < 4 or n % 2:
            continue
        co = np.empty(n * 3); me.vertices.foreach_get("co", co); V = co.reshape(-1, 3)
        L, R = V[0::2], V[1::2]; C = (L + R) * 0.5
        V2 = V.copy(); V2[0::2] = C + (L - C) * kerb_widen; V2[1::2] = C + (R - C) * kerb_widen
        me.vertices.foreach_set("co", V2.ravel())
        # normals up
        bm = bmesh.new(); bm.from_mesh(me)
        bm.normal_update()
        down = [f for f in bm.faces if f.normal.z < 0]
        if down:
            bmesh.ops.reverse_faces(bm, faces=down); n_flip += len(down)
        bm.to_mesh(me); bm.free()
        ca = me.color_attributes.get("KerbCol") or me.color_attributes.new("KerbCol", 'FLOAT_COLOR', 'CORNER')
        cols = np.empty((len(me.loops), 4), np.float32)
        for pi, poly in enumerate(me.polygons):
            c = red if (pi // 1) % 2 == 0 else white
            for li in poly.loop_indices:
                cols[li] = c
        ca.data.foreach_set("color", cols.ravel())
        me.materials.clear(); me.materials.append(m_kerb)
        n_kerb += 1

    # stands: seats on top faces, light roof decks
    m_seat = _runtime_flat("M2D_Seats", (*_srgb(118, 126, 138), 1.0))
    nt = m_seat.node_tree; b = _bsdf(m_seat)
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
    k = 1.0 / seat_pitch_m
    mp.inputs["Scale"].default_value = (k, k, k)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'; wave.wave_profile = 'SAW'
    wave.inputs["Scale"].default_value = 1.0; wave.inputs["Distortion"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*_srgb(92, 100, 112), 1.0)
    ramp.color_ramp.elements[1].color = (*_srgb(150, 158, 170), 1.0)
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    # Crowd: the July crowd atlas as coloured speckle over the seat stripes (55 %), so
    # a stand reads as occupied, not as an empty tiered slab.
    crowd_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "tex", "crowd.png")
    seat_out = ramp.outputs["Color"]
    if os.path.exists(crowd_path):
        img = bpy.data.images.get("crowd.png") or bpy.data.images.load(crowd_path)
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img; tex.extension = 'REPEAT'
        mp2 = nt.nodes.new("ShaderNodeMapping"); kk = 1.0 / 9.0
        mp2.inputs["Scale"].default_value = (kk, kk * 2.0, kk)
        nt.links.new(geo.outputs["Position"], mp2.inputs["Vector"])
        nt.links.new(mp2.outputs["Vector"], tex.inputs["Vector"])
        cmix = nt.nodes.new("ShaderNodeMix"); cmix.data_type = 'RGBA'; cmix.inputs["Factor"].default_value = 0.55
        nt.links.new(ramp.outputs["Color"], cmix.inputs[6]); nt.links.new(tex.outputs["Color"], cmix.inputs[7])
        seat_out = cmix.outputs[2]
    nt.links.new(seat_out, b.inputs["Base Color"])
    n_stand = 0
    for o in sc.objects:
        base = o.name.split('.')[0]
        if o.type != 'MESH' or o.hide_render or not base.startswith("M2D_Stand_") or base.endswith("_RoofTruss"):
            continue
        me = o.data
        if base.endswith("_RoofDeck"):
            m_roof = _runtime_flat("M2D_RoofDeckLight", (*_srgb(176, 182, 190), 1.0))
            for i in range(len(me.materials)):
                me.materials[i] = m_roof
            continue
        # orient the stripes ACROSS the stand: mapping rotation = long-axis angle
        n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get("co", co)
        V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(o.matrix_world).T)[:, :3]
        u = _principal_xy(V); ang = math.atan2(u[1], u[0])
        m_local = m_seat.copy(); m_local.name = f"M2D_Seats_{o.name}"
        mpn = next(x for x in m_local.node_tree.nodes if x.type == 'MAPPING')
        mpn.inputs["Rotation"].default_value = (0.0, 0.0, ang)
        me.materials.append(m_local); slot = len(me.materials) - 1
        for poly in me.polygons:
            if poly.normal.z > 0.9:
                poly.material_index = slot
        n_stand += 1

    # pit building: glazing band on the upper part of the sides
    pit = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_PitBuilding" and not o.hide_render), None)
    if pit is not None:
        me = pit.data
        zs = np.array([(pit.matrix_world @ v.co).z for v in me.vertices]); z0, z1 = zs.min(), zs.max()
        m_glass = _runtime_flat("M2D_PitGlass", (*_srgb(150, 172, 196), 1.0))
        nt = m_glass.node_tree; b = _bsdf(m_glass)
        geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Position"], sep.inputs["Vector"])
        rng = nt.nodes.new("ShaderNodeMapRange")
        rng.inputs["From Min"].default_value = z0 + 0.45 * (z1 - z0); rng.inputs["From Max"].default_value = z0 + 0.5 * (z1 - z0)
        nt.links.new(sep.outputs["Z"], rng.inputs["Value"])
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'
        mix.inputs[6].default_value = (*_srgb(78, 84, 94), 1.0)      # wall
        mix.inputs[7].default_value = (*_srgb(150, 172, 196), 1.0)   # glazing
        nt.links.new(rng.outputs["Result"], mix.inputs["Factor"])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        me.materials.append(m_glass); slot = len(me.materials) - 1
        for poly in me.polygons:
            if poly.normal.z < 0.3:
                poly.material_index = slot

    # paddock motorhomes
    pad = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Paddock" and not o.hide_render), None)
    n_mh = 0
    if pad is not None:
        me = pad.data; n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get("co", co)
        V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(pad.matrix_world).T)[:, :3]
        u = _principal_xy(V); v = np.array([-u[1], u[0]])
        c = V[:, :2].mean(0); ztop = V[:, 2].max()
        pu = (V[:, :2] - c) @ u; pv = (V[:, :2] - c) @ v
        half_u, half_v = (pu.max() - pu.min()) * 0.5, (pv.max() - pv.min()) * 0.5
        lw, ww, hh = mh_size
        # Team liveries, two motorhomes per team, in grid order of StaticGameData
        # (Apex/RBR blue … Thunderbolt white), muted ×0.8 so they sit in the key.
        TEAM_HEX = ["3B67A8", "E8002D", "00D2BE", "FF8000", "358C75", "0090FF",
                    "005AFF", "B6BABD", "1434CB", "C6A84B", "FFFFFF"]
        tones = []
        for hx in TEAM_HEX:
            r, g, b = (int(hx[i:i + 2], 16) * 0.8 for i in (0, 2, 4))
            tones.append((*_srgb(r, g, b), 1.0))
        mats = [_runtime_flat(f"M2D_Motorhome{i}", t) for i, t in enumerate(tones)]
        coll = pad.users_collection[0]
        pitch = lw + 8.0
        count = int((2 * half_u - 12.0) // pitch)
        for row, off in enumerate((-0.5, 0.5)):
            if half_v < ww + 6.0:
                continue
            for i in range(count):
                s_u = -half_u + 6.0 + lw * 0.5 + i * pitch
                s_v = off * (half_v - ww * 0.5 - 4.0) * 2 * 0.5
                cx, cy = c + u * s_u + v * s_v
                hx, hy = u * lw * 0.5, v * ww * 0.5
                pts = [(cx - hx[0] - hy[0], cy - hx[1] - hy[1]), (cx + hx[0] - hy[0], cy + hx[1] - hy[1]),
                       (cx + hx[0] + hy[0], cy + hx[1] + hy[1]), (cx - hx[0] + hy[0], cy - hx[1] + hy[1])]
                z0, z1 = ztop, ztop + hh
                verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
                faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
                _runtime_mesh(f"M2D_Motorhome_{row}_{i}", verts, faces, mats[(i * 2 + row) // 2 % len(mats)], coll)
                n_mh += 1
        # TV compound + hospitality tents past the paddock's far end: white tents in a
        # 2×3 block and two grey OB trucks. Only if the plate has room.
        if count > 0 and half_v >= ww + 6.0:
            m_tent = _runtime_flat("M2D_Tent", (*_srgb(222, 224, 228), 1.0))
            m_truck = _runtime_flat("M2D_Truck", (*_srgb(96, 104, 116), 1.0))
            base_u = half_u + 16.0
            for i in range(6):
                s_u = base_u + (i % 3) * 14.0; s_v = (-1 if i < 3 else 1) * 9.0
                cx, cy = c + u * s_u + v * s_v
                hx, hy = u * 5.0, v * 5.0
                pts = [(cx - hx[0] - hy[0], cy - hx[1] - hy[1]), (cx + hx[0] - hy[0], cy + hx[1] - hy[1]),
                       (cx + hx[0] + hy[0], cy + hx[1] + hy[1]), (cx - hx[0] + hy[0], cy - hx[1] + hy[1])]
                verts = [(x, y, ztop) for x, y in pts] + [(x, y, ztop + 4.0) for x, y in pts]
                _runtime_mesh(f"M2D_Tent_{i}", verts, faces, m_tent, coll)
            for i in range(2):
                s_u = base_u + 46.0; s_v = (-1 if i == 0 else 1) * 8.0
                cx, cy = c + u * s_u + v * s_v
                hx, hy = u * 8.0, v * 2.6
                pts = [(cx - hx[0] - hy[0], cy - hx[1] - hy[1]), (cx + hx[0] - hy[0], cy + hx[1] - hy[1]),
                       (cx + hx[0] + hy[0], cy + hx[1] + hy[1]), (cx - hx[0] + hy[0], cy - hx[1] + hy[1])]
                verts = [(x, y, ztop) for x, y in pts] + [(x, y, ztop + 4.2) for x, y in pts]
                _runtime_mesh(f"M2D_Truck_{i}", verts, faces, m_truck, coll)
    return f"kit: {n_kerb} kerbs striped (×{kerb_widen}, {n_flip} faces flipped), {n_stand} stands tiered, pit glazed, {n_mh} motorhomes"


def _night_environment(sc, track, ground, log, near_m=120.0, min_area_m2=400.0, tiny_m2=60.0, max_stands=4, night=True):
    """Clean corridor + circuit furniture hierarchy for the night look.

    What actually stood next to the ribbon on Bahrain was the BUILDER'S own furniture,
    not OSM: two 107×145 m parking lots with 90 car dots, a 1055 m row of flags, three
    access spurs and a ring road, plus two grandstands 12 m off the kerb. Hide the
    parking, flags and spurs outright; keep the pit building, paddock and up to
    `max_stands` grandstands (Main + T1 first, then the longest), the rest hidden with
    their roof decks / trusses / shadow quads. OSM buildings: islands with a footprint
    under `min_area_m2` are dropped within `near_m` of the racing line, and islands
    under `tiny_m2` everywhere (they render as grit).
    """
    import bmesh
    hidden = 0
    for o in sc.objects:
        base = o.name.split('.')[0]
        if base.startswith(("M2D_Lot", "M2D_LotCars", "M2D_StandFlags", "M2D_Sh_StandFlags", "M2D_Spur")):
            o.hide_render = True; hidden += 1
    log.append(f"corridor: hid {hidden} parking / flag-row / spur objects")

    # Ring road: keep, but as a hairline a shade above the ground (night only — the
    # slate look keeps its own road tones).
    if ground:
        # Night: a hairline above the ground. Slate: the ring road kept its dark baked
        # tone and read as a jagged black line 15 px off the track on every straight.
        _set_flat(("M2D_Road",), tuple(c * (1.25 if night else 1.12) for c in ground))
    if not night:
        # OSM roads floated as chalk lines over the textured plate: −40 %.
        for m in bpy.data.materials:
            if m.name.startswith("M2D_M2D_Rd_"):
                b = _bsdf(m)
                if b:
                    c = b.inputs["Base Color"].default_value
                    b.inputs["Base Color"].default_value = (c[0] * 0.35, c[1] * 0.35, c[2] * 0.35, c[3])

    # Paddock a step darker than the pit building — hierarchy, not one slab.
    pad = next((o for o in sc.objects if o.name.split('.')[0] == "M2D_Paddock"), None)
    if pad is not None:
        for i, ms in enumerate(pad.material_slots):
            if ms.material and ms.material.name == "M2D_BTop":
                m2 = bpy.data.materials.get("M2D_PaddockTop") or ms.material.copy()
                m2.name = "M2D_PaddockTop"
                b = _bsdf(m2)
                if b:
                    c0 = b.inputs["Base Color"].default_value
                    b.inputs["Base Color"].default_value = ((*_srgb(64, 70, 82), 1.0) if night
                                                            else (c0[0] * 0.78, c0[1] * 0.78, c0[2] * 0.78, 1.0))
                pad.material_slots[i].material = m2

    # Grandstands: cap the count.
    stands = {}
    for o in sc.objects:
        base = o.name.split('.')[0]
        if base.startswith("M2D_Stand_") and not base.endswith(("_RoofDeck", "_RoofTruss")):
            stands[base[len("M2D_Stand_"):]] = o
    if stands:
        def length(o):
            return max(o.dimensions.x, o.dimensions.y)
        order = sorted(stands, key=lambda k: (k not in ("Main", "T1"), -length(stands[k])))
        keep = set(order[:max_stands])
        cut = 0
        for k, o in stands.items():
            if k in keep:
                continue
            for q in sc.objects:
                qb = q.name.split('.')[0]
                if qb in (f"M2D_Stand_{k}", f"M2D_Stand_{k}_RoofDeck", f"M2D_Stand_{k}_RoofTruss", f"M2D_Sh_Stand_{k}"):
                    q.hide_render = True; cut += 1
        log.append(f"stands: kept {sorted(keep)}, hid {cut} objects of {len(stands) - len(keep)} others")

    # OSM buildings: island filter by footprint.
    line = _racing_line(sc)
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith(("M2D_Buildings", "M2D_BuildSh")):
            continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        bm.faces.ensure_lookup_table()
        mw = o.matrix_world
        seen = set(); drop = []; islands = kept = 0
        for f in bm.faces:
            if f.index in seen:
                continue
            islands += 1
            stack = [f]; members = []
            while stack:
                g = stack.pop()
                if g.index in seen:
                    continue
                seen.add(g.index); members.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h.index not in seen:
                            stack.append(h)
            P = np.array([(mw @ v.co)[:2] for g in members for v in g.verts])
            area = float((P[:, 0].max() - P[:, 0].min()) * (P[:, 1].max() - P[:, 1].min()))
            cx, cy = P.mean(0)
            d = float(np.hypot(line[:, 0] - cx, line[:, 1] - cy).min()) if line is not None else 1e9
            # > 2.5 ha footprint = airport terminal / mall / stadium roof: a light 200 m
            # slab that steals the frame (Jeddah's fans). Not the subject — drop.
            if area < tiny_m2 or (d < near_m and area < min_area_m2) or _beyond(d) or area > 25000.0:
                drop.extend(members)
            else:
                kept += 1
                # Height variation: every prism was extruded 3.6–6.8 m, so a city read as
                # one flat slab. Scale each island's top about its base by a hash — urban
                # plates 0.8–3.2× (6–20 m), the rest 0.8–1.6× — larger footprints taller.
                if o.name.startswith("M2D_Buildings"):
                    vs = {v for g in members for v in g.verts}
                    zs = [v.co.z for v in vs]
                    zb, zt = min(zs), max(zs)
                    if zt - zb > 0.5:
                        urban_ = TRACK_PALETTE.get(track.lower(), "temperate") == "urban"
                        hi = 3.2 if urban_ else 1.6
                        kf = 0.8 + (hi - 0.8) * (0.55 * _hash01(cx, cy, 31.0) + 0.45 * min(1.0, area / 2500.0))
                        for v in vs:
                            if v.co.z > zb + 0.5 * (zt - zb):
                                v.co.z = zb + (v.co.z - zb) * kf
        if drop:
            bmesh.ops.delete(bm, geom=drop, context='FACES')
            bm.to_mesh(o.data)
        bm.free()
        log.append(f"{o.name}: {islands} islands → kept {kept} (min {min_area_m2:.0f} m² within {near_m:.0f} m, {tiny_m2:.0f} m² anywhere)")

    # Roads, water, parkland, runways: cut faces beyond the faded ring AND wherever the
    # plate itself has faded out (alpha < 0.08) — narrow plates like Jeddah left roads
    # and runways drawn on the black void.
    if _PLATE_R is not None and line is not None:
        rcut = 0.80 * _PLATE_R[2]
        kd_a, alphas = _ALPHA_KD if _ALPHA_KD is not None else (None, None)
        for o in sc.objects:
            if o.type != 'MESH' or not o.name.split('.')[0].startswith(("M2D_Rd_", "M2D_Stream", "M2D_Water", "M2D_Park", "M2D_RingRoad", "M2D_Aero", "M2D_Road")):
                continue
            bm = bmesh.new(); bm.from_mesh(o.data)
            mw = o.matrix_world
            far = []
            for f in bm.faces:
                c = mw @ f.calc_center_median()
                if np.hypot(line[:, 0] - c.x, line[:, 1] - c.y).min() > rcut:
                    far.append(f)
                elif kd_a is not None and alphas[kd_a.find((c.x, c.y, 0.0))[1]] < 0.08:
                    far.append(f)
            if far:
                bmesh.ops.delete(bm, geom=far, context='FACES'); bm.to_mesh(o.data)
            bm.free()
        log.append(f"ring: environment cut beyond {rcut:.0f} m")

    # Hand overrides: blender/env_overrides.json → {"<track>": {"hide": ["M2D_Stand_T9", ...]}}
    ov_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "env_overrides.json")
    if os.path.exists(ov_path):
        ov = json.load(open(ov_path)).get(track.lower(), {})
        n = 0
        hides = ov.get("hide", [])
        for o in sc.objects:
            base = o.name.split('.')[0]
            if base in hides or any(h.endswith("*") and base.startswith(h[:-1]) for h in hides):
                o.hide_render = True; n += 1
        if n:
            log.append(f"overrides: hid {n} objects listed for {track}")


# Declutter presets. Per road class: 0.0 = untouched, 1.0 = fully faded into parkland,
# None = hidden outright. `buildings_m` culls building faces farther than that from the
# racing line (None = keep all); `trees` fades the scattered forest dots the same way.
#
# `buildings_fade` is the lever that matters on CITY circuits. Distance culling does
# nothing for Interlagos or Miami — their buildings really are right next to the track,
# and they are the brightest mass in frame, which is what makes the map read as a
# street atlas rather than a circuit. Fading their tone is the only thing that pushes
# them behind the racing line.
LEVELS = {
    0: None,
    1: dict(name="soft", roads={"track": None, "service": 0.80, "residential": 0.55,
                                "unclassified": 0.55, "tertiary": 0.35,
                                "secondary": 0.20, "motorway": 0.10,
                                "motorway_link": 0.20},
            trees=0.45, streams=0.35, park=0.30,
            buildings_m=450.0, buildings_fade=0.25),
    2: dict(name="medium", roads={"track": None, "service": None, "residential": 0.75,
                                  "unclassified": 0.75, "tertiary": 0.55,
                                  "secondary": 0.35, "motorway": 0.20,
                                  "motorway_link": 0.35},
            trees=0.65, streams=0.55, park=0.88,
            buildings_m=260.0, buildings_fade=0.45,
            # "auto" = arid for the desert circuits, temperate everywhere else.
            palette="auto"),
    6: dict(name="broadcast", roads={"track": None, "service": None,
                                     "residential": 0.75, "unclassified": 0.75,
                                     "tertiary": 0.55, "secondary": 0.35,
                                     "motorway": 0.20, "motorway_link": 0.35},
            # trees hidden outright: the scatter renders as pepper at 1.6 m/px
            # and adds no information. Woodland still reads via the landuse tone.
            trees=None, streams=0.45, park=0.0,
            buildings_m=260.0, buildings_fade=0.20,
            palette="auto", bright=True),
    # 7 = material-quality pass. It keeps the accepted broadcast composition, but
    # replaces the single colour-noise wash with a scale-aware terrain material.
    # This is intentionally a separate preview level until the complete 24-track
    # contact sheet has passed visual review.
    7: dict(name="material", roads={"track": None, "service": None,
                                     "residential": 0.75, "unclassified": 0.75,
                                     "tertiary": 0.55, "secondary": 0.35,
                                     "motorway": 0.20, "motorway_link": 0.35},
            trees=None, streams=0.45, park=0.0,
            buildings_m=260.0, buildings_fade=0.20,
            palette="auto", bright=True, surface_material=True),
    # 9 = "slate": the level-2 look the client prefers (blue-grey plate, landuse mosaic,
    # thin coral outline, cool sun) + the structural passes built on level 8: plate
    # fade, clean corridor, capped stands, building filter, forest canopy, AO. No baked
    # broadcast ribbon and no dark grade — the PNG's own ribbon IS the look.
    9: dict(name="slate", roads={"track": None, "service": None, "residential": 0.75,
                                 "unclassified": 0.75, "tertiary": 0.55,
                                 "secondary": 0.35, "motorway": 0.20,
                                 "motorway_link": 0.35},
            trees=None, streams=0.55, park=0.88,
            buildings_m=260.0, buildings_fade=0.45,
            palette="auto", env=True),
    # 10 = "day": the level-9 structure (plate fade, corridor, stands, canopy, AO) lit as
    # a daytime broadcast aerial — warm sun, sand plate, dark tarmac with white lines and
    # red/white kerbs, pale gravel run-off, pale roofs. Night floodlights never built.
    # It is also the QUIET level: residential / unclassified roads, parked cars, lot
    # striping, marshal posts and building grit are dropped — see _day_pass.
    10: dict(name="day", roads={"track": None, "service": None, "residential": None,
                                "unclassified": None, "tertiary": 0.55,
                                "secondary": 0.35, "motorway": 0.20,
                                "motorway_link": 0.35},
             trees=None, streams=0.55, park=0.88,
             buildings_m=260.0, buildings_fade=0.45,
             palette="auto", env=True, day=True),
    8: dict(name="night", roads={"track": None, "service": None,
                                 "residential": 0.75, "unclassified": 0.75,
                                 "tertiary": 0.55, "secondary": 0.35,
                                 "motorway": 0.20, "motorway_link": 0.35},
            trees=None, streams=0.45, park=0.0,
            buildings_m=260.0, buildings_fade=0.20,
            palette="auto", bright=True, night=True),
    3: dict(name="hard", roads={"track": None, "service": None, "residential": None,
                                "unclassified": None, "tertiary": 0.80,
                                "secondary": 0.55, "motorway": 0.35,
                                "motorway_link": 0.55},
            trees=None, streams=0.75, park=0.65, buildings_m=170.0),
    # 4 = "atlas": the light, flat, architectural look — uniform pale ground with no
    # landuse patchwork and no greenery, a WHITE track outline instead of the 1 px coral
    # thread, pale extruded buildings, and only a handful of very faint service lines.
    # Everything below is an explicit TONE, not a fade toward the old palette, because
    # the fades are what turned the map into a low-contrast soup (measured: the whole
    # environment sat inside 10-17% of the value range).
    4: dict(name="atlas",
            roads={"track": None, "service": None, "residential": None,
                   "unclassified": None, "tertiary": None,
                   "secondary": 0.55, "motorway": 0.40, "motorway_link": 0.55},
            trees=None, streams=0.0, park=1.0,
            # City circuits still need the distance cull. Without it Interlagos, Miami,
            # Mexico and Montreal render their whole urban fabric in the pale building
            # tone and the town, not the circuit, becomes the subject.
            buildings_m=320.0, buildings_fade=0.0,
            atlas=True),
}


def _bsdf(mat):
    if not mat or not mat.use_nodes:
        return None
    return next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)


def _fade_material(name, t, target=None):
    """Blend a material's base colour t of the way toward `target` (default: parkland).

    The default target is near-black. On any look that is not very dark that is wrong —
    fading a road toward it draws a charcoal gash — so callers can pass the ground tone
    instead. Collapsing every class onto ONE target is also what flattened the map.
    """
    m = bpy.data.materials.get(name)
    b = _bsdf(m)
    if not b:
        return False
    tgt = target or PARK
    c = b.inputs["Base Color"].default_value
    b.inputs["Base Color"].default_value = tuple(
        c[i] * (1 - t) + tgt[i] * t for i in range(3)) + (c[3],)
    if "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value *= (1 - t)
    return True


def _set_flat(names, rgb, emit=0.0):
    """Force a material to one flat colour, severing any vertex-colour or texture link
    into Base Color. Fading (see _fade_material) only nudges the existing value, which
    is useless when the goal is to REPLACE a patchwork with a single tone."""
    for name in names:
        m = bpy.data.materials.get(name)
        b = _bsdf(m)
        if not b:
            continue
        for l in list(m.node_tree.links):
            if l.to_node == b and l.to_socket.name == "Base Color":
                m.node_tree.links.remove(l)
        b.inputs["Base Color"].default_value = (*rgb, 1.0)
        if "Emission Color" in b.inputs:
            b.inputs["Emission Color"].default_value = (*rgb, 1.0)
        if "Emission Strength" in b.inputs:
            b.inputs["Emission Strength"].default_value = emit
        b.inputs["Roughness"].default_value = 1.0
        if "Specular IOR Level" in b.inputs:
            b.inputs["Specular IOR Level"].default_value = 0.0


_FOREST_MASK = {}   # terrain object name → per-vertex forest mask (filled by _repalette)
_CLASS_ID = {}      # terrain object name → per-vertex landuse class id (filled by _repalette)
_NIGHT = False      # set by declutter for the night look; read by _surface_ground
_LOOK = ""         # 'slate' on level 9; read by _surface_ground


def _repalette(sc, which, log, flatten=0.0, focus=0.0, dry_run=False):
    """Re-tone the terrain's baked landuse colours into the `which` palette.

    Inverts the build-time bake (colour = tint * shade) per vertex: the tint that
    best explains the stored colour wins, and the recovered shade is re-applied to
    the replacement tint so DEM relief shading is preserved exactly. Purely an
    in-memory vertex-colour rewrite — no material, no texture, no saved blend.
    """
    lu_new, patch_new, ground = PALETTES[which]
    old, new, names = [], [], []
    for k, t in _LU_OLD.items():
        old.append(t); new.append(lu_new[k]); names.append(k)
    for i, t in enumerate(_PATCH_OLD):
        old.append(t); new.append(patch_new[i]); names.append(f"patch{i}")
    OLD = np.array(old); NEW = np.array(new)
    tt = (OLD ** 2).sum(1)

    total, counts, worst = 0, np.zeros(len(OLD), int), 0.0
    mean_acc = []
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        ca = o.data.color_attributes.get("M2DCol")
        if ca is None:
            continue
        # TrackDist is a second vertex layer the builder already writes (0 at the
        # tarmac, 1 at the far edge of the plate) and nothing has ever read. It gives a
        # free large-scale value gradient centred on the circuit — the one lever left on
        # the eight circuits that carry no landuse and no relief, where AO and DEM
        # shading have nothing to bite on.
        td = o.data.color_attributes.get("TrackDist") if focus else None
        n = len(ca.data)
        buf = np.empty(n * 4, np.float32); ca.data.foreach_get("color", buf)
        rgba = buf.reshape(-1, 4)
        c = rgba[:, :3].astype(np.float64)

        dot = c @ OLD.T
        s = np.clip(dot / tt, SHADE_LO, SHADE_HI)
        # |c - s*t|^2, expanded so it stays one (n,k) allocation
        resid = (c ** 2).sum(1)[:, None] - 2 * s * dot + s ** 2 * tt
        best = np.argmin(resid, axis=1)
        idx = np.arange(n)
        sh = s[idx, best]
        if td is not None:
            tb = np.empty(n * 4, np.float32); td.data.foreach_get("color", tb)
            f = np.clip(tb.reshape(-1, 4)[:, 0].astype(np.float64), 0.0, 1.0)
            f = f * f * (3.0 - 2.0 * f)          # smoothstep, no hard ring
            sh = sh * (1.0 - focus * f)
        if flatten:
            # shade = 0.68 + 0.42*rel (map2d_pass). Over a noisy desert DEM that spread
            # renders as cloud blotches; the reference ground is clean. Compress toward
            # 1.0 without removing relief entirely.
            sh = 1.0 - (1.0 - sh) * (1.0 - flatten)
        if dry_run:
            mean_acc.append(c.mean(0))          # keep the baked colours, just classify
        else:
            rgba[:, :3] = (sh[:, None] * NEW[best]).astype(np.float32)
            ca.data.foreach_set("color", rgba.ravel())
        # Woodland landuse, in world XY, for the night look's tree blobs: where OSM says
        # forest the scatter is often sparse (Spa), so the landuse is the better source.
        fm = np.isin(best, [i for i, nm in enumerate(names) if nm in ("forest", "wood")])
        if fm.any():
            _FOREST_MASK[o.name] = fm
        _CLASS_ID[o.name] = best.copy()

        total += n
        counts += np.bincount(best, minlength=len(OLD))
        worst = max(worst, float(np.sqrt(np.maximum(resid[idx, best], 0.0)).max()))

    if not total:
        log.append("repalette: NO TERRAIN FOUND — palette not applied")
        return
    top = np.argsort(-counts)[:4]
    share = ", ".join(f"{names[i]} {100*counts[i]/total:.0f}%" for i in top if counts[i])
    # A bad inversion shows up as a large residual: every stored colour should be
    # explained by some tint to within a hair. Anything above ~0.01 means the scene
    # was built with a palette this table no longer matches.
    if dry_run:
        g = tuple(float(x) for x in np.mean(mean_acc, axis=0)) if mean_acc else ground
        log.append(f"classify[{which}] (baked colours kept): {total} verts — {share}; ground {tuple(round(x, 3) for x in g)}")
        return g
    log.append(f"repalette[{which}]: {total} verts, worst residual {worst:.4f} — {share}")
    return ground


def _park_markings(pitch_m=13.0, strength=0.16):
    """Aisle striping on the parking lots.

    M2D_Park is the OSM parking layer ONLY (map2d_osm.py:232 fills it from
    osm["parking"]); park/greenery is a landuse class in the terrain vertex colour, so
    striping this material cannot touch a lawn.

    Pitch is 13 m, not the 2.5 m of a real bay: at ~1.6 m per pixel a bay is under two
    pixels and aliases into grey mush. 13 m is roughly a bay-aisle-bay module and is
    what actually reads as "parking" at map scale.
    """
    m = (bpy.data.materials.get("M2D_M2D_Park")
         or bpy.data.materials.get("M2D_Park"))
    b = _bsdf(m)
    if not b:
        return False
    nt = m.node_tree
    src = next((l.from_socket for l in nt.links
                if l.to_node == b and l.to_socket.name == "Base Color"), None)

    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mp = nt.nodes.new("ShaderNodeMapping")
    k = 1.0 / max(pitch_m, 0.1)
    mp.inputs["Scale"].default_value = (k, k, k)
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(28.0))
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])

    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.wave_profile = 'SIN'
    wave.inputs["Scale"].default_value = 1.0
    wave.inputs["Distortion"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])

    rng = nt.nodes.new("ShaderNodeMapRange")
    rng.inputs["From Min"].default_value = 0.0
    rng.inputs["From Max"].default_value = 1.0
    rng.inputs["To Min"].default_value = 1.0 - strength
    rng.inputs["To Max"].default_value = 1.0 + strength
    nt.links.new(wave.outputs["Fac"], rng.inputs["Value"])

    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
    mix.inputs["Factor"].default_value = 1.0
    if src is not None:
        nt.links.new(src, mix.inputs["A"])
    else:
        c = b.inputs["Base Color"].default_value
        mix.inputs["A"].default_value = (c[0], c[1], c[2], 1.0)
    nt.links.new(rng.outputs["Result"], mix.inputs["B"])
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Base Color":
            nt.links.remove(l)
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return True


def _ribbon_mask(sc, cell=1.5):
    """Rasterise the track surface into an occupancy grid (world metres).

    Needed because distance-to-ribbon-VERTICES is the wrong test: the ribbon's vertices
    lie on its two EDGES, so a grandstand parked neatly beside the track measures ~0 m
    and looks identical to one standing on the racing line. Only a fill test separates
    "adjacent" from "on top of".
    """
    rib = next((o for o in sc.objects
                if o.type == 'MESH' and any(ms.material and ms.material.name == "M2D_Track"
                                            for ms in o.material_slots)), None)
    if rib is None:
        return None
    n = len(rib.data.vertices)
    co = np.empty(n * 3); rib.data.vertices.foreach_get("co", co)
    m = np.array(rib.matrix_world)
    V = (co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3])[:, :2]

    tris = []
    for p in rib.data.polygons:
        vi = list(p.vertices)
        for a in range(1, len(vi) - 1):
            tris.append((vi[0], vi[a], vi[a + 1]))
    if not tris:
        return None
    x0, y0 = V[:, 0].min() - cell, V[:, 1].min() - cell
    nx = int((V[:, 0].max() - x0) / cell) + 3
    ny = int((V[:, 1].max() - y0) / cell) + 3
    g = np.zeros((nx, ny), bool)
    for a, b, c in tris:
        T = V[[a, b, c]]
        gx = (T[:, 0] - x0) / cell
        gy = (T[:, 1] - y0) / cell
        i0, i1 = int(np.floor(gx.min())), int(np.ceil(gx.max()))
        j0, j1 = int(np.floor(gy.min())), int(np.ceil(gy.max()))
        if i1 <= i0 or j1 <= j0:
            g[np.clip(i0, 0, nx - 1), np.clip(j0, 0, ny - 1)] = True
            continue
        ii, jj = np.meshgrid(np.arange(i0, i1 + 1), np.arange(j0, j1 + 1), indexing='ij')
        px, py = ii + 0.5, jj + 0.5
        d = ((gy[1] - gy[2]) * (gx[0] - gx[2]) + (gx[2] - gx[1]) * (gy[0] - gy[2]))
        if abs(d) < 1e-9:
            continue
        w0 = ((gy[1] - gy[2]) * (px - gx[2]) + (gx[2] - gx[1]) * (py - gy[2])) / d
        w1 = ((gy[2] - gy[0]) * (px - gx[2]) + (gx[0] - gx[2]) * (py - gy[2])) / d
        hit = (w0 >= 0) & (w1 >= 0) & (w0 + w1 <= 1)
        if hit.any():
            g[np.clip(ii[hit], 0, nx - 1), np.clip(jj[hit], 0, ny - 1)] = True
    # open_ribbon (map2d_pass.py:312) emits vertices as ordered (left, right) PAIRS,
    # so the exact centreline — and with it a true local tangent — falls straight out.
    mid = (V[0::2] + V[1::2]) / 2 if len(V) >= 4 and len(V) % 2 == 0 else None
    return g, x0, y0, cell, V, mid


def _place_stands(sc, log, too_close_m=6.0, target_m=12.0,
                  orphan_m=40.0, huge_m=150.0):
    """Deal with grandstands the source scene placed badly.

    Measured first, then fixed. The stands are NOT crooked: their long axis is already
    parallel to the track tangent at their nearest centreline point (Zandvoort:
    +0.0 / +0.3 / -0.2 degrees, eigenvalue ratio ~360:1). Re-rotating them is a no-op at
    best. The two genuine faults are positional:

      * ORPHANS — a stand sitting tens of metres out in a field, related to nothing.
        Zandvoort's Stand_T1 is 240 m long and stood 55 m clear of the circuit.
      * INTRUDERS — a stand whose footprint reaches onto the racing surface.

    Both are resolved by sliding along the track NORMAL to a target gap — the stands are
    already tangent-aligned, so adjacency is all that is missing. Nothing is rotated.

    The exception is a stand that is both far out AND huge (>150 m long): Zandvoort's
    240 m Stand_T1 cannot be auto-fitted to a hairpin at any offset, and forcing it in
    produces a worse artefact than the one being fixed. Those are hidden instead.
    The pit complex (PitBuilding / Paddock / StandFlags) is left alone — it is
    positioned as a group against the pit straight and reads correctly.
    """
    mask = _ribbon_mask(sc)
    if mask is None:
        log.append("stands: no track ribbon — placement not checked")
        return
    _g, _x0, _y0, _cell, V, mid = mask
    step = max(1, len(V) // 6000)
    R = V[::step]

    def principal(a):
        d = a - a.mean(0)
        w, vec = np.linalg.eigh(d.T @ d)
        return vec[:, int(np.argmax(w))]

    hidden, moved, kept = [], [], 0
    for o in list(sc.objects):
        if o.type != 'MESH' or o.hide_render:
            continue
        if not o.name.split('.')[0].startswith("M2D_Stand_"):
            continue
        n = len(o.data.vertices)
        if n < 4:
            continue
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        L = co.reshape(-1, 3)
        M = np.array(o.matrix_world)
        W = L @ M[:3, :3].T + M[:3, 3]
        xy = W[:, :2]
        gap = float(np.sqrt(((xy[:, None, :] - R[None, :, :]) ** 2).sum(-1)).min())

        u = principal(xy)
        proj = xy @ u
        length = float(proj.max() - proj.min())

        if gap > orphan_m and length > huge_m:
            o.hide_render = True
            hidden.append((o.name, gap, length))
            continue
        if too_close_m <= gap <= orphan_m:
            kept += 1
            continue

        c = xy.mean(0)
        i = int(np.argmin(((mid - c) ** 2).sum(1))) if mid is not None else None
        if i is None:
            kept += 1
            continue
        k = 8
        t = mid[(i + k) % len(mid)] - mid[(i - k) % len(mid)]
        tn = np.hypot(*t)
        if tn < 1e-6:
            kept += 1
            continue
        t /= tn
        nvec = c - mid[i]
        nvec = nvec - np.dot(nvec, t) * t          # pure track normal
        nn_ = np.hypot(*nvec)
        if nn_ < 1e-6:
            kept += 1
            continue
        nvec /= nn_
        W[:, :2] = xy + nvec * (target_m - gap)
        Minv = np.linalg.inv(M)
        o.data.vertices.foreach_set("co", (W @ Minv[:3, :3].T + Minv[:3, 3]).ravel())
        o.data.update()
        moved.append((o.name, gap, length))

    bits = [f"{kept} already clear"]
    if hidden:
        bits.append("hid huge orphans " + ", ".join(
            f"{n.replace('M2D_Stand_','')} ({g:.0f} m out, {L:.0f} m long)"
            for n, g, L in hidden))
    if moved:
        bits.append("re-seated " + ", ".join(
            f"{n.replace('M2D_Stand_','')} {g:.1f}->{target_m:.0f} m" for n, g, L in moved))
    log.append("stands: " + "; ".join(bits))


def _ground_grain(strength=0.09, scale_m=170.0):
    """Multiply a large-scale procedural variation into the terrain's base colour.

    Eight circuits carry NO OSM landuse (see the PATCH note above), so after the patch
    tints collapse their ground is a dead flat fill. This puts the variation back
    without inventing geography: it is noise, and it reads as noise.

    Procedural rather than a bitmap on purpose. The frame covers ~2.5 km across 1600 px
    — about 1.6 m per pixel — so a tiled 2K photo texture lands one tile in a handful of
    pixels and renders as grit. Feature size here is set in METRES (default 90 m) and
    stays legible at map scale.
    """
    m = bpy.data.materials.get("M2D_TerrainVC")
    b = _bsdf(m)
    if not b:
        return False
    nt = m.node_tree
    src = next((l.from_socket for l in nt.links
                if l.to_node == b and l.to_socket.name == "Base Color"), None)
    if src is None:
        return False

    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mp = nt.nodes.new("ShaderNodeMapping")
    k = 1.0 / max(scale_m, 1.0)
    mp.inputs["Scale"].default_value = (k, k, k)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 1.0
    noise.inputs["Detail"].default_value = 3.0
    noise.inputs["Roughness"].default_value = 0.5
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])

    rng = nt.nodes.new("ShaderNodeMapRange")     # 0..1 -> (1-s) .. (1+s)
    rng.inputs["From Min"].default_value = 0.0
    rng.inputs["From Max"].default_value = 1.0
    rng.inputs["To Min"].default_value = 1.0 - strength
    rng.inputs["To Max"].default_value = 1.0 + strength
    nt.links.new(noise.outputs["Fac"], rng.inputs["Value"])

    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs["Factor"].default_value = 1.0
    nt.links.new(src, mix.inputs["A"])
    nt.links.new(rng.outputs["Result"], mix.inputs["B"])
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Base Color":
            nt.links.remove(l)
    nt.links.new(mix.outputs["Result"], b.inputs["Base Color"])
    return True


def _surface_ground(sc, kind, ground, log):
    """Give the terrain a material response instead of a fullscreen colour noise.

    The previous 170 m grain was visible as cloud-shaped stains because it changed
    only base colour. Here the large variation is deliberately weak; most of the
    surface information comes from metre-scaled roughness and a restrained normal.
    Terrain triangles are smooth-shaded so DEM tessellation stops masquerading as a
    low-resolution texture.
    """
    m = bpy.data.materials.get("M2D_TerrainVC")
    b = _bsdf(m)
    if not b:
        log.append("surface: NO M2D_TerrainVC — skipped")
        return False
    nt = m.node_tree
    src = next((l.from_socket for l in nt.links
                if l.to_node == b and l.to_socket.name == "Base Color"), None)
    if src is None:
        log.append("surface: terrain base colour is not vertex-driven — skipped")
        return False

    geo = nt.nodes.new("ShaderNodeNewGeometry")

    def noise_at(scale_m, detail, roughness):
        mp = nt.nodes.new("ShaderNodeMapping")
        k = 1.0 / max(scale_m, 1.0)
        mp.inputs["Scale"].default_value = (k, k, k)
        nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 1.0
        n.inputs["Detail"].default_value = detail
        n.inputs["Roughness"].default_value = roughness
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n

    macro = noise_at(260.0, 2.0, 0.35)
    meso = noise_at(42.0 if kind != "urban" else 30.0, 4.0, 0.55)

    # Authored surface albedo supplies real material grain; OSM/vertex colour still
    # owns the semantic colour. At ~1.6 m per output pixel a 110-140 m repeat keeps
    # medium structure visible while the source's sub-pixel aggregate mip-filters out.
    tex_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "tex",
                            f"terrain_{kind}_v1.png")
    tex_colour = src
    tex_bw = None
    if os.path.exists(tex_path):
        img = bpy.data.images.load(tex_path, check_existing=True)
        img.colorspace_settings.name = 'sRGB'
        tile_m = 420.0 if kind == "arid" else 360.0
        uv = nt.nodes.new("ShaderNodeMapping")
        k = 1.0 / tile_m; uv.inputs["Scale"].default_value = (k, k, k)
        nt.links.new(geo.outputs["Position"], uv.inputs["Vector"])
        it = nt.nodes.new("ShaderNodeTexImage"); it.image = img
        it.extension = 'REPEAT'; it.interpolation = 'Linear'
        nt.links.new(uv.outputs["Vector"], it.inputs["Vector"])
        surface = nt.nodes.new("ShaderNodeMixRGB")
        surface.blend_type = 'SOFT_LIGHT'
        surface.inputs[0].default_value = 0.52 if kind == "urban" else (0.68 if kind == "arid" else 0.62)
        if _NIGHT:
            # Half strength on the dark key: at 0.68 the arid texture (mean 178/255)
            # soft-lit the navy ground into flat grey and the plate lost its hue.
            surface.inputs[0].default_value *= 0.45
        elif _LOOK == "slate":
            surface.inputs[0].default_value *= 0.7
        nt.links.new(src, surface.inputs[1])
        nt.links.new(it.outputs["Color"], surface.inputs[2])
        tex_colour = surface.outputs[0]
        bw = nt.nodes.new("ShaderNodeRGBToBW")
        nt.links.new(it.outputs["Color"], bw.inputs["Color"])
        tex_bw = bw.outputs["Val"]

    macro_range = nt.nodes.new("ShaderNodeMapRange")
    macro_range.inputs["To Min"].default_value = 0.975
    macro_range.inputs["To Max"].default_value = 1.025
    nt.links.new(macro.outputs["Fac"], macro_range.inputs["Value"])
    meso_range = nt.nodes.new("ShaderNodeMapRange")
    meso_range.inputs["To Min"].default_value = 0.965
    meso_range.inputs["To Max"].default_value = 1.035
    nt.links.new(meso.outputs["Fac"], meso_range.inputs["Value"])
    factors = nt.nodes.new("ShaderNodeMath")
    factors.operation = 'MULTIPLY'
    nt.links.new(macro_range.outputs["Result"], factors.inputs[0])
    nt.links.new(meso_range.outputs["Result"], factors.inputs[1])

    colour = nt.nodes.new("ShaderNodeMixRGB")
    colour.blend_type = 'MULTIPLY'; colour.inputs[0].default_value = 1.0
    nt.links.new(tex_colour, colour.inputs[1])
    nt.links.new(factors.outputs[0], colour.inputs[2])
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Base Color":
            nt.links.remove(l)
    final_colour = colour.outputs[0]

    # Optional per-vertex coastline mask added by _inject_osm. It gives water its
    # own response instead of running the concrete/grass texture through a blue tint.
    has_water = any(o.type == 'MESH' and o.name.startswith("M2D_Terrain")
                    and o.data.color_attributes.get("M2DWater") is not None
                    for o in sc.objects)
    water_fac = None
    if has_water:
        wattr = nt.nodes.new("ShaderNodeVertexColor"); wattr.layer_name = "M2DWater"
        water_fac = wattr.outputs["Color"]
        water_noise = noise_at(95.0, 2.0, 0.32)
        wr = nt.nodes.new("ShaderNodeValToRGB")
        if _NIGHT:
            wr.color_ramp.elements[0].color = (*_srgb(14, 36, 58), 1.0)
            wr.color_ramp.elements[1].color = (*_srgb(30, 58, 84), 1.0)
        elif _LOOK == "slate":
            wr.color_ramp.elements[0].color = (*_srgb(26, 58, 92), 1.0)
            wr.color_ramp.elements[1].color = (*_srgb(52, 92, 128), 1.0)
        else:
            wr.color_ramp.elements[0].color = (*_srgb(72, 116, 148), 1.0)
            wr.color_ramp.elements[1].color = (*_srgb(126, 164, 187), 1.0)
        nt.links.new(water_noise.outputs["Fac"], wr.inputs["Fac"])
        water_mix = nt.nodes.new("ShaderNodeMixRGB")
        nt.links.new(water_fac, water_mix.inputs[0])
        nt.links.new(final_colour, water_mix.inputs[1])
        nt.links.new(wr.outputs["Color"], water_mix.inputs[2])
        final_colour = water_mix.outputs[0]
    nt.links.new(final_colour, b.inputs["Base Color"])

    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.72 if kind == "urban" else 0.82
    rough.inputs["To Max"].default_value = 0.92 if kind == "urban" else 0.98
    nt.links.new(meso.outputs["Fac"], rough.inputs["Value"])
    if water_fac is None:
        nt.links.new(rough.outputs["Result"], b.inputs["Roughness"])
    else:
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = 'SUBTRACT'
        inv.inputs[0].default_value = 1.0; nt.links.new(water_fac, inv.inputs[1])
        land_r = nt.nodes.new("ShaderNodeMath"); land_r.operation = 'MULTIPLY'
        nt.links.new(rough.outputs["Result"], land_r.inputs[0]); nt.links.new(inv.outputs[0], land_r.inputs[1])
        wet_r = nt.nodes.new("ShaderNodeMath"); wet_r.operation = 'MULTIPLY'
        wet_r.inputs[1].default_value = 0.38; nt.links.new(water_fac, wet_r.inputs[0])
        total_r = nt.nodes.new("ShaderNodeMath"); total_r.operation = 'ADD'
        nt.links.new(land_r.outputs[0], total_r.inputs[0]); nt.links.new(wet_r.outputs[0], total_r.inputs[1])
        nt.links.new(total_r.outputs[0], b.inputs["Roughness"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.10 if kind == "urban" else 0.18
    bump.inputs["Distance"].default_value = 0.10 if kind == "urban" else (0.28 if kind == "arid" else 0.20)
    if tex_bw is not None:
        height = nt.nodes.new("ShaderNodeMath"); height.operation = 'MULTIPLY'
        nt.links.new(meso.outputs["Fac"], height.inputs[0])
        nt.links.new(tex_bw, height.inputs[1])
        nt.links.new(height.outputs[0], bump.inputs["Height"])
    else:
        nt.links.new(meso.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])

    faces = 0
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Terrain"):
            for p in o.data.polygons:
                p.use_smooth = True; faces += 1

    # Hide the finite terrain plate against a world tone from the same material
    # family. This removes the dark saw-tooth cutout without inventing geometry.
    if ground and sc.world and sc.world.use_nodes:
        for bg in (n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND'):
            for l in list(sc.world.node_tree.links):
                if l.to_node == bg and l.to_socket.name == "Color":
                    sc.world.node_tree.links.remove(l)
            bg.inputs["Color"].default_value = (*tuple(c * 0.92 for c in ground), 1.0)
            bg.inputs["Strength"].default_value = 1.0
    log.append(f"surface[{kind}]: smooth {faces} faces, authored {os.path.basename(tex_path)}, roughness + normal")
    return True


def _runtime_flat(name, color, emit=0.0, alpha=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.88
    if "Emission Color" in b.inputs and emit:
        b.inputs["Emission Color"].default_value = color
        b.inputs["Emission Strength"].default_value = emit
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        m.surface_render_method = 'DITHERED'
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def _runtime_mesh(name, verts, faces, mat, coll, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.validate()
    if mat: me.materials.append(mat)
    for p in me.polygons: p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    return ob


def _inject_osm(sc, track, palette_name, log):
    """Add missing real environment to old saved Map2D scenes.

    Fifteen blends already contain the 2026 OSM pass. Street circuits and several
    permanent tracks do not; rebuilding those whole scenes would invalidate their
    camera bridges, so the environment is added in-memory at render time instead.
    """
    if any(o.name.startswith("M2D_Buildings") for o in sc.objects):
        return
    base = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base, "osm", f"{track}_osm_local.json")
    helper = os.path.join(base, "map2d_osm.py")
    if not os.path.exists(path):
        log.append(f"osm: no {os.path.basename(path)} — source environment still missing")
        return
    ns = {}; exec(open(helper).read(), ns)
    osm = json.load(open(path))
    zg = ns["ZGrid"]()
    for o in sc.objects:
        if o.type != 'MESH' or not o.name.startswith("M2D_Terrain"):
            continue
        n = len(o.data.vertices)
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        m = np.array(o.matrix_world)
        w = co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]
        zg.feed(w)
    line = _racing_line(sc)
    if line is None:
        log.append("osm: no racing line — injection skipped")
        return
    c = np.c_[line, np.zeros(len(line))]
    shadow = _runtime_flat("M2D_Shadow", (0.05, 0.05, 0.05, 1), alpha=0.22)
    rep = ns["build_osm_layers"](osm, sc.collection, zg, c,
                                  np.full(len(c), 6.0), len(c),
                                  _runtime_flat, _runtime_mesh, shadow,
                                  np.random.default_rng(1107))
    log.append("osm: injected " + ", ".join(f"{k} {v}" for k, v in rep.items()))

    # The old street-circuit scenes carry only synthetic patch colours. Apply the
    # fetched land-use polygons to the existing terrain vertices in-memory; no camera,
    # bridge or source blend is touched.
    terrain = [o for o in sc.objects
               if o.type == 'MESH' and o.name.startswith("M2D_Terrain")]
    world = []
    for o in terrain:
        n = len(o.data.vertices)
        co = np.empty(n * 3); o.data.vertices.foreach_get("co", co)
        mat = np.array(o.matrix_world)
        world.append(co.reshape(-1, 3) @ mat[:3, :3].T + mat[:3, 3])
    if terrain and osm.get("landuse") and palette_name in PALETTES:
        allp = np.vstack(world)
        x0, y0 = allp[:, 0].min(), allp[:, 1].min()
        x1, y1 = allp[:, 0].max(), allp[:, 1].max()
        ras, _old_lut, cell, inv = ns["landuse_raster"](osm, x0, y0, x1, y1, cell=5.0)
        lu, _patch, base = PALETTES[palette_name]
        hit = total = 0
        for o, wp in zip(terrain, world):
            ca = o.data.color_attributes.get("M2DCol")
            if ca is None: continue
            n = len(ca.data); total += n
            ix = np.clip(((wp[:, 0] - x0) / cell).astype(int), 0, ras.shape[0] - 1)
            iy = np.clip(((wp[:, 1] - y0) / cell).astype(int), 0, ras.shape[1] - 1)
            ids = ras[ix, iy]; mask = ids > 0; hit += int(mask.sum())
            buf = np.empty(n * 4, np.float32); ca.data.foreach_get("color", buf)
            rgba = buf.reshape(-1, 4)
            for idv in np.unique(ids[mask]):
                key = inv[int(idv)]
                if key not in lu: continue
                m = ids == idv
                rgba[m, :3] = np.asarray(lu[key], np.float32)
            ca.data.foreach_set("color", rgba.ravel())
        log.append(f"osm landuse: {hit}/{total} terrain vertices ({100*hit/max(total,1):.1f}%)")

    # OSM coastline ways are directed with land on the left and water on the right.
    # Classify each terrain vertex against its nearest coast segment, then tint the
    # water side. This restores harbours/sea on street circuits without a hand mask.
    coast = osm.get("coastline") or []
    if terrain and coast:
        segs = []
        for line_ in coast:
            q = np.asarray(line_, float)
            if len(q) > 1:
                segs.extend(zip(q[:-1], q[1:]))
        if segs:
            a = np.asarray([s[0] for s in segs]); d = np.asarray([s[1] for s in segs]) - a
            dd = np.maximum((d * d).sum(1), 1e-9)
            water_n = 0
            for o, wp in zip(terrain, world):
                ca = o.data.color_attributes.get("M2DCol")
                if ca is None: continue
                mask = np.zeros(len(wp), bool)
                for j in range(0, len(wp), 1500):
                    p = wp[j:j + 1500, :2]
                    ap = p[:, None, :] - a[None, :, :]
                    t = np.clip((ap * d[None]).sum(2) / dd[None], 0.0, 1.0)
                    delta = ap - t[:, :, None] * d[None]
                    nearest = np.argmin((delta * delta).sum(2), axis=1)
                    cross = (d[nearest, 0] * ap[np.arange(len(p)), nearest, 1]
                             - d[nearest, 1] * ap[np.arange(len(p)), nearest, 0])
                    mask[j:j + len(p)] = cross < 0.0
                wa = (o.data.color_attributes.get("M2DWater")
                      or o.data.color_attributes.new("M2DWater", 'FLOAT_COLOR', 'POINT'))
                values = np.zeros((len(wa.data), 4), np.float32)
                values[:, 3] = 1.0; values[mask, :3] = 1.0
                wa.data.foreach_set("color", values.ravel()); water_n += int(mask.sum())
            log.append(f"osm coastline: {water_n} terrain vertices classified as water")


def _surface_buildings(log):
    """Break the OSM city mass into believable roof/side material variation."""
    changed = 0
    for name, scale_m, lo, hi, rough_lo, rough_hi, bump_d in (
            ("M2D_BTopOSM", 38.0, 0.78, 1.02, 0.68, 0.91, 0.08),
            ("M2D_BSideOSM", 52.0, 0.72, 0.94, 0.76, 0.96, 0.03)):
        m = bpy.data.materials.get(name); b = _bsdf(m)
        if not b: continue
        nt = m.node_tree
        base = tuple(b.inputs["Base Color"].default_value)
        geo = nt.nodes.new("ShaderNodeNewGeometry")
        mp = nt.nodes.new("ShaderNodeMapping")
        k = 1.0 / scale_m; mp.inputs["Scale"].default_value = (k, k, k)
        nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 1.0
        noise.inputs["Detail"].default_value = 2.0
        noise.inputs["Roughness"].default_value = 0.45
        nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
        value = nt.nodes.new("ShaderNodeMapRange")
        value.inputs["To Min"].default_value = lo
        value.inputs["To Max"].default_value = hi
        nt.links.new(noise.outputs["Fac"], value.inputs["Value"])
        colour = nt.nodes.new("ShaderNodeMixRGB")
        colour.blend_type = 'MULTIPLY'; colour.inputs[0].default_value = 1.0
        colour.inputs[1].default_value = base
        nt.links.new(value.outputs["Result"], colour.inputs[2])
        final_colour = colour.outputs[0]
        tex_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "tex",
                                "terrain_urban_v1.png")
        if os.path.exists(tex_path):
            img = bpy.data.images.load(tex_path, check_existing=True)
            uv = nt.nodes.new("ShaderNodeMapping")
            kk = 1.0 / 65.0; uv.inputs["Scale"].default_value = (kk, kk, kk)
            nt.links.new(geo.outputs["Position"], uv.inputs["Vector"])
            it = nt.nodes.new("ShaderNodeTexImage"); it.image = img; it.extension = 'REPEAT'
            nt.links.new(uv.outputs["Vector"], it.inputs["Vector"])
            tex_mix = nt.nodes.new("ShaderNodeMixRGB"); tex_mix.blend_type = 'SOFT_LIGHT'
            tex_mix.inputs[0].default_value = 0.42 if name == "M2D_BTopOSM" else 0.20
            nt.links.new(final_colour, tex_mix.inputs[1]); nt.links.new(it.outputs["Color"], tex_mix.inputs[2])
            final_colour = tex_mix.outputs[0]
        nt.links.new(final_colour, b.inputs["Base Color"])
        rough = nt.nodes.new("ShaderNodeMapRange")
        rough.inputs["To Min"].default_value = rough_lo
        rough.inputs["To Max"].default_value = rough_hi
        nt.links.new(noise.outputs["Fac"], rough.inputs["Value"])
        nt.links.new(rough.outputs["Result"], b.inputs["Roughness"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.12
        bump.inputs["Distance"].default_value = bump_d
        nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
        changed += 1
    log.append(f"building surfaces: {changed}/2 procedural roof/side materials")


def _racing_line(sc):
    """World-space XY of the track ribbon, as a point cloud to measure distance from.

    The ribbon is NOT reliably called "M2D_Asphalt": several blends were built more
    than once, so Blender's duplicate suffix makes it "M2D_Asphalt.001"/".002"
    (rbr, spa, austin). Match by the M2D_Track material first — that is what actually
    defines the ribbon — and fall back to the name prefix.
    """
    ribs = [o for o in sc.objects
            if o.type == 'MESH'
            and any(m and m.name == "M2D_Track" for m in o.data.materials)]
    if not ribs:
        ribs = [o for o in sc.objects
                if o.type == 'MESH' and o.name.startswith("M2D_Asphalt")]
    if not ribs:
        return None
    pts = np.vstack([
        np.array([(o.matrix_world @ v.co)[:2] for v in o.data.vertices], float)
        for o in ribs])
    # 2200-segment ribbon; every 4th vertex is plenty for a metre-scale distance test
    return pts[::4] if len(pts) > 4000 else pts


_OV = {}


def _load_overrides(track):
    """blender/env_overrides.json → per-track hand overrides (art pass):
         hide: [base names]            objects to hide (existing)
         canopy_clear_m: float         canopy clearance from the racing line (default 18)
         canopy_min_m2: float          smallest canopy island kept (default 2500)
         sun_yaw_rel: float | null     sun yaw relative to the camera (default −135)"""
    global _OV
    ov_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "env_overrides.json")
    _OV = {}
    if os.path.exists(ov_path):
        _OV = json.load(open(ov_path)).get(track.lower(), {}) or {}
    return _OV


def _dump_objects(sc, track, path):
    """Art-pass helper: every renderable mesh with its screen position (px, 1600×900)
    and footprint, so a stray slab in a render can be named and listed in hide[]."""
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import fit_cameras as fc
        fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "camera_fits.json")))
        ft = fits[track.lower()]
        eye = np.array(ft["eye"], float); tilt, yaw = math.radians(ft["tilt_deg"]), math.radians(ft["yaw_deg"])
    except Exception as e:
        return f"dump: no fit ({e})"
    rows = []
    for o in sc.objects:
        if o.type == 'LIGHT':
            d = o.matrix_world.to_3x3() @ mathutils.Vector((0, 0, -1))
            rows.append(dict(name=o.name, light=o.data.type, energy=float(o.data.energy),
                             shadow=bool(getattr(o.data, "use_shadow", True)), hide_render=o.hide_render,
                             world_dir=[round(float(v), 3) for v in d]))
            continue
        if o.type != 'MESH' or o.hide_render or not o.data.vertices:
            continue
        bb = np.array([o.matrix_world @ mathutils.Vector(c) for c in o.bound_box])
        c = bb.mean(0); ext = bb.max(0) - bb.min(0)
        px = fc.to_px(c[None, :], eye, tilt, yaw)[0] * [1600.0, 900.0]
        rows.append(dict(name=o.name, px=[round(float(px[0])), round(float(px[1]))],
                         size_m=[round(float(ext[0])), round(float(ext[1])), round(float(ext[2]))],
                         faces=len(o.data.polygons)))
    json.dump(rows, open(path, "w"), ensure_ascii=False, indent=0)
    return f"dump: {len(rows)} objects → {path}"


def declutter(sc, cfg, log, track=""):
    _load_overrides(track)
    # ── landuse palette (before anything else reads a terrain colour) ─────────
    ground = None
    global _NIGHT, _LOOK
    _NIGHT = bool(cfg.get("night"))
    _LOOK = "slate" if (cfg.get("env") and not cfg.get("night") and not cfg.get("bright")) else ""
    _FOREST_MASK.clear()
    pal = cfg.get("palette")
    if pal == "auto":
        pal = TRACK_PALETTE.get(track.lower(), "temperate")
        if cfg.get("night"):
            pal += "_night"
        elif cfg.get("bright"):
            pal += "_bright"
    if pal:
        # 0.55 killed the DEM entirely and is why the ground went dead flat.
        # 0.25 keeps the cloudiness off a noisy desert while leaving real relief.
        ground = _repalette(sc, pal, log,
                            0.25 if cfg.get("bright") else 0.0,
                            focus=0.17 if cfg.get("bright") else 0.0,
                            dry_run=bool(cfg.get("env") and not cfg.get("night") and not cfg.get("bright")))
    if cfg.get("night") and ground:
        log.append(_plate_fade(sc, ground, log))
    if cfg.get("surface_material"):
        _inject_osm(sc, track, pal, log)

    # ── fixed-tone materials (broadcast look only) ───────────────────────────
    if cfg.get("bright"):
        n = 0
        look = _LOOK_NIGHT if cfg.get("night") else _LOOK_BRIGHT
        for name, (rgb, emit) in look.items():
            b = _bsdf(bpy.data.materials.get(name))
            if not b:
                continue
            lin = _srgb(*rgb)
            b.inputs["Base Color"].default_value = (*lin, 1.0)
            if "Emission Color" in b.inputs:
                b.inputs["Emission Color"].default_value = (*lin, 1.0)
            if emit is not None and "Emission Strength" in b.inputs:
                b.inputs["Emission Strength"].default_value = emit
            n += 1
        log.append(f"broadcast look: {n}/{len(look)} materials re-toned")
        if cfg.get("surface_material"):
            _surface_buildings(log)

    # ── ground grain ─────────────────────────────────────────────────────────
    if cfg.get("bright"):
        if cfg.get("surface_material"):
            base_kind = TRACK_PALETTE.get(track.lower(), "temperate")
            _surface_ground(sc, base_kind, ground, log)
        else:
            log.append("grain: terrain grain added (170 m, +-9%)" if _ground_grain()
                       else "grain: TERRAIN MATERIAL NOT VERTEX-DRIVEN — skipped")
        log.append("parking: aisle striping added (13 m)" if _park_markings()
                   else "parking: NO M2D_Park MATERIAL — skipped")
        # Night: nothing closer than 22 m gets re-seated at 28 m (reference gap 25–40 m).
        if cfg.get("night"):
            _place_stands(sc, log, too_close_m=22.0, target_m=28.0)
        else:
            _place_stands(sc, log)

    # ── sun: shrink the disc so grandstands actually cast ────────────────────
    # use_shadows was already ON; the sun's angular DIAMETER is 40 deg — a source the
    # size of the sky, whose penumbra washes every shadow away. The reference has
    # crisp soft shadows under the grandstands. Only the disc (and sampling) changes:
    # the Z rotation carries the per-track camera yaw applied earlier, and elevation
    # stays at 30 deg so shadow length matches the reference rather than raking.
    if cfg.get("bright"):
        for o in sc.objects:
            if o.type == 'LIGHT':
                o.data.angle = math.radians(5.0)
        sc.eevee.shadow_ray_count = 2
        sc.eevee.shadow_step_count = 8
        # Ambient occlusion. Muting the palette without this produced a flat, drab
        # wash: low chroma AND no value structure is not "restrained", it is dead.
        # AO puts depth back where it is earned — terrain folds, building feet, the
        # cut of the track into the landscape — instead of via colour.
        e = sc.eevee
        e.use_raytracing = True
        if hasattr(e, "use_fast_gi"):
            e.use_fast_gi = True
            e.fast_gi_method = 'AMBIENT_OCCLUSION_ONLY'
            e.fast_gi_distance = 45.0      # metres; the scale of a grandstand / a fold
            e.fast_gi_ray_count = 4
            e.fast_gi_step_count = 12
            e.fast_gi_resolution = '1'
        log.append("sun: disc 5 deg, shadows 2x8, AO on (45 m)")
    if cfg.get("night"):
        # Same sun geometry (shadow length matches the reference), less of it and
        # colder: dark albedos under 3.6 units still blow the apron out.
        for o in sc.objects:
            if o.type == 'LIGHT':
                o.data.energy = NIGHT_SUN["energy"]
                o.data.color = NIGHT_SUN["color"]
        # World = ground tone at 0.55: the lit plate is already darker than the raw
        # ground colour (AO + sun), so anything lighter shows the saw-tooth edge.
        if ground and sc.world and sc.world.use_nodes:
            wnt = sc.world.node_tree
            for n in wnt.nodes:
                if n.type == 'BACKGROUND':
                    for l in list(wnt.links):
                        if l.to_node == n and l.to_socket.name == "Color":
                            wnt.links.remove(l)
                    n.inputs["Color"].default_value = (*(c * 0.55 for c in ground), 1.0)
                    n.inputs["Strength"].default_value = 1.0
        # Ground: the authored terrain textures (roughness + normal), then two grains —
        # 170 m detail and a 480 m macro wash — so the plate stops being one flat fill.
        base_kind = TRACK_PALETTE.get(track.lower(), "temperate")
        _surface_ground(sc, base_kind, ground, log)
        _ground_grain(0.10, 170.0)
        # Desert gets a stronger, longer macro wash (dune fields), the rest a soft one.
        if base_kind == "arid":
            _ground_grain(0.26, 620.0)
        else:
            _ground_grain(0.14, 480.0)
        # World AFTER _surface_ground (which sets its own 0.92 ground tone).
        if ground and sc.world and sc.world.use_nodes:
            for n in sc.world.node_tree.nodes:
                if n.type == 'BACKGROUND':
                    n.inputs["Color"].default_value = (*(c * 0.35 for c in ground), 1.0)
        # Roads: the shared fade leaves motorways light; on a dark key they read as
        # chalk lines. Flat, a shade above the ground, as hairlines.
        if ground:
            _set_flat(tuple(f"M2D_M2D_Rd_{c}" for c in cfg["roads"] if cfg["roads"][c] is not None),
                      tuple(c * 1.35 for c in ground))
        # The baked red glow + compositor bloom double up with the runtime rim Unity
        # draws from the same bridge; hide the baked one so the halo has ONE source.
        ng = 0
        for o in sc.objects:
            if o.type == 'MESH' and o.name.split('.')[0].startswith("M2D_Glow"):
                o.hide_render = True; ng += 1
        log.append(f"night: sun {NIGHT_SUN['energy']} cold, world = 0.35 ground, textured ground + 2 grains, roads flat, {ng} baked glow objects hidden")
        log.append(_bake_ribbon(sc, log, track))
        _night_environment(sc, track, ground, log)
        log.append(_forest_canopy(sc, log, scatter=TRACK_PALETTE.get(track.lower(), "temperate") != "arid"))

    # ── cast-shadow planes ────────────────────────────────────────────────────
    # M2D_Shadow is a set of hand-placed translucent quads faking a drop shadow under
    # each grandstand. Over the old near-black ground they were invisible.
    #  - broadcast look: the sun now casts REAL shadows, so the quads are redundant and
    #    read as grey slabs lying across the site. Hide them outright.
    #  - dark looks: no real shadows, so keep them, re-tinted to a darkened ground
    #    (near-black over sand or concrete is a blotch, not a shadow).
    if cfg.get("bright") or cfg.get("env"):
        # Also on the slate path: a hidden orphan stand (T4 on RBR) left its baked
        # shadow quad behind as a soft dark smudge beside the track.
        n = 0
        for o in sc.objects:
            if o.type == 'MESH' and any(ms.material and ms.material.name == "M2D_Shadow"
                                        for ms in o.material_slots):
                o.hide_render = True; n += 1
        log.append(f"shadow: hid {n} baked shadow quad(s) — real sun shadows replace them")
    elif ground:
        b = _bsdf(bpy.data.materials.get("M2D_Shadow"))
        if b:
            b.inputs["Base Color"].default_value = (*(c * 0.30 for c in ground), 1.0)
            if "Alpha" in b.inputs:
                b.inputs["Alpha"].default_value = 0.24
            log.append("shadow: re-tinted to darkened ground")

    # ── roads: hide the noise classes, fade the rest toward parkland ──────────
    hidden = faded = 0
    for cls, t in cfg["roads"].items():
        objs = [o for o in sc.objects if o.name.startswith(f"M2D_Rd_{cls}")
                and (o.name == f"M2D_Rd_{cls}" or o.name[len(f"M2D_Rd_{cls}")] == ".")]
        if t is None:
            for o in objs:
                o.hide_render = True
            hidden += len(objs)
            log.append(f"roads {cls}: hid {len(objs)}")
        elif t > 0 and objs:
            if _fade_material(f"M2D_M2D_Rd_{cls}", t, ground):
                faded += len(objs)
                log.append(f"roads {cls}: faded {t:.2f} ({len(objs)} objs)")
    log.append(f"roads total: {hidden} hidden, {faded} faded")

    # ── trees / streams / parkland patches ────────────────────────────────────
    if cfg["trees"] is None:
        n = 0
        for o in sc.objects:
            if o.name.startswith("M2D_Trees"):
                o.hide_render = True; n += 1
        log.append(f"trees: hid {n}")
    else:
        for mn in ("M2D_Tree0", "M2D_Tree1"):
            _fade_material(mn, cfg["trees"],
                           tuple(c * 0.55 for c in ground) if ground else None)
        log.append(f"trees: faded {cfg['trees']:.2f}")
    # Streams and parkland fade toward the GROUND, not the old near-black PARK tone:
    # on the arid palette a blue-black watercourse across sand is the loudest thing
    # in frame, and Bahrain's wadis are not the subject of the map.
    if cfg.get("bright"):
        pass          # _LOOK_BRIGHT owns the water tone; fading it would erase it
    else:
        wet = tuple(c * 0.80 for c in ground) if ground else None
        _fade_material("M2D_M2D_Stream", cfg["streams"], wet)
        _fade_material("M2D_M2D_Water", cfg["streams"], wet)
    _fade_material("M2D_M2D_Park", cfg["park"], ground)

    # ── atlas look: explicit tones, not fades ─────────────────────────────────
    if cfg.get("atlas"):
        # One flat pale ground. The terrain is vertex-coloured landuse; overriding the
        # BSDF base colour and cutting the vertex-colour link is what removes the
        # patchwork — fading it only greys the patches, it does not remove them.
        _set_flat(("M2D_TerrainVC", "M2D_M2D_Park"), (0.400, 0.412, 0.432))
        # The terrain plate is finite; beyond it the world background shows through as a
        # dark void in the corners. Match it to the ground so the frame reads as one
        # continuous surface, the way the reference does.
        if sc.world and sc.world.use_nodes:
            wnt = sc.world.node_tree
            for n in wnt.nodes:
                if n.type == 'BACKGROUND':
                    # The pipeline feeds this from a gradient ramp, so writing the input
                    # value alone does nothing — the link wins. Cut it first.
                    for l in list(wnt.links):
                        if l.to_node == n and l.to_socket.name == "Color":
                            wnt.links.remove(l)
                    n.inputs["Color"].default_value = (0.400, 0.412, 0.432, 1.0)
                    n.inputs["Strength"].default_value = 1.0
        # The camera-parented vignette quad is near-black (measured luminance 0.008) and
        # darkens the frame edges — the opposite of the flat, evenly-lit atlas look.
        nv = 0
        for o in sc.objects:
            if o.name.startswith("M2D_Vig"):
                o.hide_render = True; nv += 1
        if nv:
            log.append(f"atlas: hid {nv} vignette quad(s)")
        # Buildings read as pale extrusions, lighter than the ground.
        _set_flat(("M2D_BTop", "M2D_BTopOSM"), (0.600, 0.615, 0.638))
        _set_flat(("M2D_BSide", "M2D_BSideOSM"), (0.520, 0.535, 0.560))
        _set_flat(("M2D_Shadow",), (0.320, 0.330, 0.348))
        # Water read as near-black navy blotches against the pale ground — the darkest
        # thing in frame and nothing to do with racing. Pale blue-grey instead.
        _set_flat(("M2D_M2D_Water", "M2D_M2D_Stream"), (0.372, 0.400, 0.440))
        # Circuit furniture keeps its own materials (pit building, paddock, grandstands,
        # flags) and would otherwise stay in the old palette — the RBR pit block rendered
        # bright blue against the pale ground. Sweep every one of them to the building tone.
        furn = tuple(m.name for m in bpy.data.materials
                     if m.name.startswith(("M2D_Pit", "M2D_Stand", "M2D_Paddock",
                                           "M2D_Roof", "M2D_Flag", "M2D_Crowd")))
        if furn:
            _set_flat(furn, (0.585, 0.600, 0.622))
            log.append(f"atlas: {len(furn)} furniture materials swept to the building tone")
        # Track: dark graphite ribbon, WHITE outline. The coral thread was 1 px at this
        # camera distance and broke up under anti-aliasing; white at width reads solid.
        _set_flat(("M2D_Track",), (0.140, 0.148, 0.166))
        _set_flat(("M2D_Runoff",), (0.400, 0.410, 0.430))
        for mn in ("M2D_Edge", "M2D_EdgeL", "M2D_EdgeR"):
            _set_flat((mn,), (0.960, 0.970, 0.985), emit=1.0)
        for mn in ("M2D_Glow", "M2D_GlowL", "M2D_GlowR"):
            m = bpy.data.materials.get(mn)
            if m:
                for o in sc.objects:
                    if o.type == 'MESH' and any(x is m for x in o.data.materials):
                        o.hide_render = True
        # Roads: the shared fade path blends toward PARK, which is near-black — correct
        # for the dark look, dead wrong here (it drew heavy charcoal lines across a pale
        # map). Set the survivors flat, a touch darker than the ground so they read as
        # hairlines rather than gashes.
        _set_flat(tuple(f"M2D_M2D_Rd_{c}" for c in cfg["roads"]
                        if cfg["roads"][c] is not None), (0.352, 0.364, 0.384))
        log.append("atlas: flat ground, pale buildings, white track outline, hairline roads")

    # ── buildings: push the OSM mass back in tone ─────────────────────────────
    # Only the OSM city fabric (M2D_B*OSM) + its drop shadows. The circuit's own
    # furniture — pit building, paddock, grandstands — keeps its own materials and
    # stays bright on purpose: it is what marks where the racing happens.
    bf = cfg.get("buildings_fade") or 0.0
    if bf > 0:
        for mn in ("M2D_BSideOSM", "M2D_BTopOSM", "M2D_Shadow"):
            _fade_material(mn, bf)
        log.append(f"buildings: faded {bf:.2f} (OSM fabric only)")

    # ── buildings: drop everything farther than N metres from the racing line ─
    if cfg["buildings_m"]:
        bld = [x for x in sc.objects if x.type == 'MESH'
               and x.name.startswith(("M2D_Buildings", "M2D_BuildSh"))]
        line = _racing_line(sc)
        if not bld:
            # legitimate: the desert/street circuits whose OSM binding never landed
            # carry no building fabric at all.
            log.append("buildings: none in scene — nothing to cull")
        elif line is None:
            # NOT legitimate: buildings to cull but no ribbon to measure from. This
            # used to log-and-continue, which silently shipped 3 tracks unculled.
            raise RuntimeError(
                f"{sc.name}: {len(bld)} building object(s) but no track ribbon found "
                f"(no mesh with the M2D_Track material, no M2D_Asphalt*) — "
                f"cannot measure distance, refusing to ship a half-decluttered render")
        else:
            import bmesh
            keep_m = cfg["buildings_m"]
            for o in bld:
                bm = bmesh.new(); bm.from_mesh(o.data)
                mw = o.matrix_world
                far = []
                for fc in bm.faces:
                    c = mw @ fc.calc_center_median()
                    d = np.hypot(line[:, 0] - c.x, line[:, 1] - c.y).min()
                    if d > keep_m:
                        far.append(fc)
                if far:
                    bmesh.ops.delete(bm, geom=far, context='FACES')
                    bm.to_mesh(o.data)
                bm.free()
                log.append(f"{o.name}: culled {len(far)} faces beyond {keep_m:.0f} m")

    if cfg.get("env") and not cfg.get("night"):
        day = bool(cfg.get("day"))
        night_look = track.lower() in NIGHT_RACES and not day
        # Sun disc + AO give the flat level-2 plate its volume back (same as the
        # broadcast block, without re-toning anything).
        for o in sc.objects:
            if o.type == 'LIGHT':
                o.data.angle = math.radians(5.0)
        e = sc.eevee
        e.use_raytracing = True
        if hasattr(e, "use_fast_gi"):
            e.use_fast_gi = True; e.fast_gi_method = 'AMBIENT_OCCLUSION_ONLY'
            e.fast_gi_distance = 30.0; e.fast_gi_ray_count = 6; e.fast_gi_step_count = 12
        log.append("slate: sun disc 4 deg, AO on (30 m)")
        # Street circuits whose blends carry no OSM get it from blender/osm/<track>_osm_local.json
        # (Monaco: 7138 buildings, roads, coastline, water). Built BEFORE the terrain is
        # seated so the buildings ride up with the plate like the baked ones.
        REINJECT = {"jeddah", "lusail"}   # baked OSM without the coastline (Jeddah) or with 139 stale islands (Lusail); the fresh fetch has both
        if track.lower() in REINJECT and os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "osm", f"{track.lower()}_osm_local.json")):
            nrm_ = 0
            for o in list(sc.objects):
                if o.type == 'MESH' and o.name.split('.')[0].startswith(("M2D_Buildings", "M2D_BuildSh", "M2D_Rd_", "M2D_Park", "M2D_Water", "M2D_Stream", "M2D_Aero")):
                    bpy.data.objects.remove(o, do_unlink=True); nrm_ += 1
            log.append(f"osm: {nrm_} baked OSM objects dropped for re-injection")
        if not any(o.name.startswith("M2D_Buildings") for o in sc.objects):
            # The injector authors in the bright (level-7) tones. Register a halved
            # copy of the landuse palette for the slate key, and halve every material
            # it creates, so Monaco sits in the same key as the baked circuits.
            if pal in PALETTES and pal + "_slate" not in PALETTES:
                lu, patch, base = PALETTES[pal]
                PALETTES[pal + "_slate"] = ({k: tuple(c * 0.5 for c in v) for k, v in lu.items()},
                                            [tuple(c * 0.5 for c in q) for q in patch],
                                            tuple(c * 0.5 for c in base))
            before = {m.name for m in bpy.data.materials}
            _inject_osm(sc, track, (pal + "_slate") if pal in PALETTES else pal, log)
            nd = 0
            for m in bpy.data.materials:
                if m.name in before:
                    continue
                b = _bsdf(m)
                if b:
                    c = b.inputs["Base Color"].default_value
                    b.inputs["Base Color"].default_value = (c[0] * 0.5, c[1] * 0.5, c[2] * 0.5, c[3]); nd += 1
            log.append(f"osm: {nd} injected materials halved for the slate key")
        log.append(_seat_terrain(sc, log, track=track))
        if ground:
            # 0.30, not 0.55: the lit plate renders darker than its raw vertex colour, so
            # a 0.55 world read LIGHTER than the plate and the edges went misty. The
            # 12-08 look faded to a near-navy ramp; 0.30 of the ground lands there.
            # Calm BEFORE the fade: the fade turns the outer half of the plate into the
            # dark world tone, which dragged the plate mean down and put the dark-floor
            # below the smudge it was meant to lift.
            log.append(_calm_landuse(sc, log, kind=TRACK_PALETTE.get(track.lower(), "temperate")))
            # Authored terrain textures + normal map (they shipped on level 7, were off here).
            _surface_ground(sc, TRACK_PALETTE.get(track.lower(), "temperate"), ground, log)
            log.append(_plate_fade(sc, ground, log, world_factor=0.30))
            if sc.world and sc.world.use_nodes:
                wnt = sc.world.node_tree
                for n in wnt.nodes:
                    if n.type == 'BACKGROUND':
                        for l in list(wnt.links):
                            if l.to_node == n and l.to_socket.name == "Color":
                                wnt.links.remove(l)
                        n.inputs["Color"].default_value = (*(c * 0.30 for c in ground), 1.0)
                        n.inputs["Strength"].default_value = 1.0
        _syr = _OV.get("sun_yaw_rel", -135.0)
        log.append(_slate_light(sc, sun_color=(1.0, 0.90, 0.74), sun_energy=4.7, sun_yaw_rel=_syr)
                   if TRACK_PALETTE.get(track.lower(), "temperate") == "arid" else _slate_light(sc, sun_yaw_rel=_syr))
        # The sky fill lifts the asphalt as much as the plate (measured: ribbon L 82 vs
        # plate 88-90 — a 1.07× contrast, the 12-08 look had ~1.5×). Take the road
        # tones down so the ribbon reads dark again under the new light.
        for mn, k in (("M2D_Track", 0.42), ("M2D_Runoff", 0.80), ("M2D_PitMat", 0.55)):
            m = bpy.data.materials.get(mn); b = _bsdf(m)
            if b:
                c = b.inputs["Base Color"].default_value
                b.inputs["Base Color"].default_value = (c[0] * k, c[1] * k, c[2] * k, c[3])
        log.append("slate: asphalt ×0.42, apron ×0.80, pit lane ×0.55 under the fill light")
        log.append(_ribbon_realism(sc))
        log.append(_tilt_shift(sc, track))
        _place_stands(sc, log, too_close_m=22.0, target_m=28.0)
        dense_ = TRACK_PALETTE.get(track.lower(), "temperate") == "urban"
        try:
            nb_ = sum(len(o.data.polygons) for o in sc.objects if o.type == 'MESH' and o.name.startswith("M2D_Buildings"))
            dense_ = dense_ or nb_ > 70000       # Melbourne: 18 656 OSM prisms, ~110 k faces; порог 70 k по просьбе заказчика (был 40 k)
            log.append(f"density: building faces {nb_}, dense={dense_}")
        except Exception:
            pass
        _night_environment(sc, track, ground, log, night=False,
                           near_m=150.0 if dense_ else 120.0,
                           min_area_m2=520.0 if dense_ else 400.0,
                           tiny_m2=250.0 if day else 60.0)
        log.append(_furniture_kit(sc, log))
        _tree_blob_material((0.046, 0.124, 0.136))   # ensure the canopy material exists
        log.append(_slate_materials(sc, log))
        log.append(_material_detail(sc, TRACK_PALETTE.get(track.lower(), "temperate"), log,
                                    night=night_look))
        log.append(_life_pass(sc, track, log, max_cars=0 if day else 700, markings=not day))
        log.append(_circuit_character(sc, track, log))
        nr = None if day else _night_race(sc, track, log)
        if nr: log.append(nr)
        # The ribbon floats at z 0.08–0.16 over a DEM plate that sits below zero; under the
        # 5° sun it threw a jagged dark line beside itself (Bahrain straights). Ground
        # markings cast no shadow.
        ns = 0
        for o in sc.objects:
            if o.type == 'MESH' and o.name.split('.')[0] in ("M2D_Asphalt", "M2D_EdgeL", "M2D_EdgeR", "M2D_Kerb",
                                                             "M2D_SFLine", "M2D_Line", "M2D_PitLane", "M2D_PitSep", "M2D_Runoff"):
                try:
                    o.visible_shadow = False; ns += 1
                except Exception:
                    pass
        # The camera-parented vignette quad hangs between camera and scene with a
        # near-black material; under the sun it threw a soft shadow blob onto the plate.
        for o in sc.objects:
            if o.name.startswith("M2D_Vig"):
                try:
                    o.visible_shadow = False; ns += 1
                except Exception:
                    pass
        log.append(f"shadows: {ns} ground-marking / vignette objects no longer cast")
        # Art pass: canopy 18 m from the line (was 30) so crown shadows reach the verge.
        log.append(_forest_canopy(sc, log, color=(0.046, 0.124, 0.136),
                                  clear_m=float(_OV.get("canopy_clear_m", 18.0)),
                                  min_m2=float(_OV.get("canopy_min_m2", 2500.0)),
                                  scatter=TRACK_PALETTE.get(track.lower(), "temperate") != "arid"))
        if day:
            log.append(_day_pass(sc, track, ground, log))
        log.append(_aerial_pass(sc, night=night_look, haze=_DAY_HAZE if day else None))
        log.append(_grade_pass(sc, night=night_look, day=day))
        if os.environ.get("M2D_DUMP"):
            log.append(_dump_objects(sc, track, os.environ["M2D_DUMP"]))
        if os.environ.get("M2D_SAVE"):
            # art-pass helper: keep the fully processed scene for quick light/shadow experiments
            bpy.ops.wm.save_as_mainfile(filepath=os.environ["M2D_SAVE"], copy=True)
            log.append(f"save: processed scene → {os.environ['M2D_SAVE']}")

    _cull_offplate(sc, log)


def _noise_mul(mat, scale_m, lo, hi, detail=2.0, socket="Base Color"):
    """Multiply whatever currently feeds `socket` (link or constant) by a noise mapped to
    [lo, hi]. Chainable, unlike _noise_mix which replaces the input outright."""
    b = _bsdf(mat)
    if not b:
        return None
    nt = mat.node_tree
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
    k = 1.0 / max(scale_m, 0.1); mp.inputs["Scale"].default_value = (k, k, k)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = detail
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    rng = nt.nodes.new("ShaderNodeMapRange"); rng.inputs["To Min"].default_value = lo; rng.inputs["To Max"].default_value = hi
    nt.links.new(nz.outputs["Fac"], rng.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs["Factor"].default_value = 1.0
    src = next((l for l in nt.links if l.to_node == b and l.to_socket.name == socket), None)
    if src is not None:
        nt.links.new(src.from_socket, mul.inputs[6]); nt.links.remove(src)
    else:
        mul.inputs[6].default_value = tuple(b.inputs[socket].default_value)
    nt.links.new(rng.outputs["Result"], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs[socket])
    return mul


def _material_detail(sc, kind, log, night=False):
    """AAA pass, materials: what a close look at real tarmac and turf shows.
      * asphalt: 40 m 'repair patch' variation ±5 % on top of the 2 m grain;
      * rubbered band: 6 m variation 0.90–1.08 so the racing line is not one flat strip;
      * mown stripes: on temperate circuits the grass within ~90 m of the tarmac is cut
        in 7 m bands, ±3.5 %, fading out with TrackDist; arid/urban unchanged;
      * canopy: 1.6 m noise bump 0.35 so crowns catch the sun as lumps, not spheres."""
    n = 0
    m = bpy.data.materials.get("M2D_Track")
    if m and _noise_mul(m, 40.0, 0.95, 1.05, detail=1.0): n += 1
    m = bpy.data.materials.get("M2D_Rubber")
    if m and _noise_mul(m, 6.0, 0.90, 1.08, detail=2.0): n += 1
    m = bpy.data.materials.get("M2D_TreeBlob"); b = _bsdf(m)
    if b and not b.inputs["Normal"].is_linked:
        nt = m.node_tree
        geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1 / 1.6, 1 / 1.6, 1 / 1.6)
        nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.0; nz.inputs["Detail"].default_value = 3.0
        nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.6
        nt.links.new(nz.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"]); n += 1
    stripes = False
    m = bpy.data.materials.get("M2D_TerrainVC"); b = _bsdf(m)
    if b and kind == "temperate" and not night:
        nt = m.node_tree
        src = next((l for l in nt.links if l.to_node == b and l.to_socket.name == "Base Color"), None)
        has_td = any(o.type == 'MESH' and o.name.startswith("M2D_Terrain") and o.data.color_attributes.get("TrackDist") is not None for o in sc.objects)
        if src is not None and has_td:
            geo = nt.nodes.new("ShaderNodeNewGeometry"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
            nt.links.new(geo.outputs["Position"], sep.inputs["Vector"])
            # stripes along a fixed 25° heading: u = x·cos + y·sin
            ax = nt.nodes.new("ShaderNodeMath"); ax.operation = 'MULTIPLY'; ax.inputs[1].default_value = math.cos(math.radians(25))
            ay = nt.nodes.new("ShaderNodeMath"); ay.operation = 'MULTIPLY'; ay.inputs[1].default_value = math.sin(math.radians(25))
            nt.links.new(sep.outputs["X"], ax.inputs[0]); nt.links.new(sep.outputs["Y"], ay.inputs[0])
            u = nt.nodes.new("ShaderNodeMath"); u.operation = 'ADD'; nt.links.new(ax.outputs[0], u.inputs[0]); nt.links.new(ay.outputs[0], u.inputs[1])
            k = nt.nodes.new("ShaderNodeMath"); k.operation = 'MULTIPLY'; k.inputs[1].default_value = 2 * math.pi / 7.0
            nt.links.new(u.outputs[0], k.inputs[0])
            sn = nt.nodes.new("ShaderNodeMath"); sn.operation = 'SINE'; nt.links.new(k.outputs[0], sn.inputs[0])
            td = nt.nodes.new("ShaderNodeVertexColor"); td.layer_name = "TrackDist"
            sc_ = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(td.outputs["Color"], sc_.inputs["Color"])
            mask = nt.nodes.new("ShaderNodeMapRange"); mask.interpolation_type = 'SMOOTHSTEP'
            mask.inputs["From Min"].default_value = 0.03; mask.inputs["From Max"].default_value = 0.09
            mask.inputs["To Min"].default_value = 1.0; mask.inputs["To Max"].default_value = 0.0
            nt.links.new(sc_.outputs["Red"], mask.inputs["Value"])
            amp = nt.nodes.new("ShaderNodeMath"); amp.operation = 'MULTIPLY'; amp.inputs[1].default_value = 0.06
            nt.links.new(sn.outputs[0], amp.inputs[0])
            am = nt.nodes.new("ShaderNodeMath"); am.operation = 'MULTIPLY'
            nt.links.new(amp.outputs[0], am.inputs[0]); nt.links.new(mask.outputs["Result"], am.inputs[1])
            one = nt.nodes.new("ShaderNodeMath"); one.operation = 'ADD'; one.inputs[1].default_value = 1.0
            nt.links.new(am.outputs[0], one.inputs[0])
            mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs["Factor"].default_value = 1.0
            nt.links.new(src.from_socket, mul.inputs[6]); nt.links.remove(src)
            nt.links.new(one.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], b.inputs["Base Color"])
            stripes = True; n += 1
    return f"detail: {n} materials (asphalt patches 40 m, rubber 6 m, canopy bump{', mown stripes 7 m' if stripes else ''})"


def _aerial_pass(sc, night=False, amount=0.08, haze=None):
    """Photoreal step: aerial perspective. Every real aerial frame loses contrast with
    distance. Mist pass (start 1400 m, depth 2600 m from the eye — the plate lies at
    1500–3500 m) mixes the render towards a haze colour by mist × amount, inserted
    between the render layer and the glare so the whole chain sees the hazed image."""
    ng = getattr(sc, "compositing_node_group", None) or getattr(sc, "node_tree", None)
    if ng is None or any(n.name == "M2D_Haze" for n in ng.nodes):
        return "aerial: skipped"
    rl = next((n for n in ng.nodes if n.type == 'R_LAYERS'), None)
    if rl is None:
        return "aerial: no render layer node"
    # EEVEE's mist pass measured 0.35–0.82 across the plate with start/depth set to the
    # eye distances (1470–3245 m), i.e. it is not the linear ramp the settings promise,
    # and at ×0.14 it washed the frame (+15 L). The camera tilt is fixed, so screen y IS
    # distance: a vertical Blend texture (0 at the bottom, 1 at the top) mapped to
    # 0 below 35 % of the height → amount at the top gives the same cue, predictably.
    img_links = [l for l in ng.links if l.from_node == rl and l.from_socket.name == "Image"]
    if not img_links:
        return "aerial: render layer image unlinked — skipped"
    # Blender 5 has no compositor Texture node: a box mask over the top of the frame,
    # blurred vertically by 320 px, is the same soft vertical ramp (≈0 at 40 % of the
    # height, 1 at the top).
    bx = ng.nodes.new("CompositorNodeBoxMask"); bx.name = "M2D_HazeBox"
    def _vec(sock, x, y):
        try: sock.default_value = (x, y)
        except Exception: sock.default_value = (x, y, 0.0)
    _vec(bx.inputs["Position"], 0.5, 1.05); _vec(bx.inputs["Size"], 2.0, 0.85)
    bl = ng.nodes.new("CompositorNodeBlur"); bl.name = "M2D_HazeBlur"
    _vec(bl.inputs["Size"], 0.0, 320.0)
    try: bl.inputs["Extend Bounds"].default_value = True
    except Exception: pass
    ng.links.new(bx.outputs["Mask"], bl.inputs["Image"])
    rng = ng.nodes.new("ShaderNodeMath"); rng.name = "M2D_HazeRange"; rng.operation = 'MULTIPLY'
    rng.inputs[1].default_value = amount
    ng.links.new(bl.outputs["Image"], rng.inputs[0])
    # Haze colour is mixed in scene-linear: a display-bright sky (0.62,0.70,0.80) at 10 %
    # lifted the far plate from L 60 to 86. Linear values near the plate's own level
    # (0.20,0.24,0.30 ≈ sRGB 125) give the +8–10 L a real aerial frame shows.
    if haze is None:
        haze = (0.03, 0.045, 0.08) if night else (0.20, 0.24, 0.30)
    else:
        haze, amount = haze
    amt = rng
    mx = ng.nodes.new("ShaderNodeMix"); mx.name = "M2D_Haze"; mx.data_type = 'RGBA'; mx.blend_type = 'MIX'
    fac = next(i for i in mx.inputs if i.name == "Factor" and i.type == 'VALUE')
    a = next(i for i in mx.inputs if i.name == "A" and i.type == 'RGBA')
    b = next(i for i in mx.inputs if i.name == "B" and i.type == 'RGBA')
    b.default_value = (*haze, 1.0)
    ng.links.new(amt.outputs[0], fac)
    ng.links.new(rl.outputs["Image"], a)
    res = next(o for o in mx.outputs if o.type == 'RGBA')
    for l in img_links:
        to_node, to_sock = l.to_node, l.to_socket
        ng.links.remove(l)
        ng.links.new(res, to_sock)
    return f"aerial: box mask top 40 %→100 %, blur 320 px × {amount}, haze {haze}"


def _grade_pass(sc, night=False, sharpen=0.30, dispersion=0.0, day=False):
    """AAA pass, compositor. Inserted between the tilt-shift mix and the output:
      1. unsharp mask inside the tilt ellipse only (the feathered mask already exists):
         sharp = src + k·(src − blur₂(src)) — micro-contrast on the ribbon and the pit;
      2. RGB curves, gentle S: toe (0.22→0.19), shoulder (0.78→0.83);
      3. colour balance, lift/gamma/gain: shadows a touch cool, highlights a touch warm
         (the split-toning every broadcast grade has);
      4. saturation ×1.08 by day, ×1.00 at night;
      5. lens dispersion 0.010 — a hair of chromatic aberration at the frame edge.
    Night keeps the S-curve half strength: the blue-hour key is already contrasty."""
    ng = getattr(sc, "compositing_node_group", None) or getattr(sc, "node_tree", None)
    if ng is None or any(n.name == "M2D_Grade" for n in ng.nodes):
        return "grade: skipped"
    out = next((n for n in ng.nodes if n.type in ('GROUP_OUTPUT', 'COMPOSITE')), None)
    link = next((l for l in ng.links if l.to_node == out and l.to_socket.name == "Image"), None) if out else None
    if link is None:
        return "grade: no output link — skipped"
    src = link.from_socket; ng.links.remove(link)
    cur = src
    def _rgba(node, name):
        return next(i for i in node.inputs if i.name == name and i.type == 'RGBA')
    def _val(node, name):
        return next(i for i in node.inputs if i.name == name and i.type == 'VALUE')
    # 1. masked unsharp
    feather = next((n for n in ng.nodes if n.name == "M2D_TiltFeather"), None)
    if feather is not None and sharpen > 0:
        bl = ng.nodes.new("CompositorNodeBlur"); bl.name = "M2D_SharpBlur"
        try: bl.inputs["Size"].default_value = (2.0, 2.0)
        except Exception: bl.inputs["Size"].default_value = (2.0, 2.0, 0.0)
        ng.links.new(cur, bl.inputs["Image"])
        sub = ng.nodes.new("ShaderNodeMix"); sub.name = "M2D_SharpSub"; sub.data_type = 'RGBA'; sub.blend_type = 'SUBTRACT'
        _val(sub, "Factor").default_value = 1.0
        ng.links.new(cur, _rgba(sub, "A")); ng.links.new(bl.outputs["Image"], _rgba(sub, "B"))
        add = ng.nodes.new("ShaderNodeMix"); add.name = "M2D_SharpAdd"; add.data_type = 'RGBA'; add.blend_type = 'ADD'
        _val(add, "Factor").default_value = sharpen
        ng.links.new(cur, _rgba(add, "A")); ng.links.new(next(o for o in sub.outputs if o.type == 'RGBA'), _rgba(add, "B"))
        mx = ng.nodes.new("ShaderNodeMix"); mx.name = "M2D_SharpMix"; mx.data_type = 'RGBA'; mx.blend_type = 'MIX'
        ng.links.new(feather.outputs["Image"], _val(mx, "Factor"))
        ng.links.new(cur, _rgba(mx, "A")); ng.links.new(next(o for o in add.outputs if o.type == 'RGBA'), _rgba(mx, "B"))
        cur = next(o for o in mx.outputs if o.type == 'RGBA')
    # The compositor works in scene-linear; an S-curve and a lift/gain designed for a
    # display image must run in display space, else the toe crushes every mid-tone
    # (first pass: L 77.7 → 61.9, 6 % of the frame under L 25). Convert to sRGB,
    # grade, convert back.
    to_d = ng.nodes.new("CompositorNodeConvertColorSpace"); to_d.name = "M2D_GradeToDisplay"
    to_l = ng.nodes.new("CompositorNodeConvertColorSpace"); to_l.name = "M2D_GradeToLinear"
    try:
        to_d.from_color_space = 'Linear Rec.709'; to_d.to_color_space = 'sRGB'
        to_l.from_color_space = 'sRGB'; to_l.to_color_space = 'Linear Rec.709'
    except Exception:
        return "grade: colour-space names unknown — skipped"
    ng.links.new(cur, to_d.inputs["Image"]); cur = to_d.outputs["Image"]
    # 2. S-curve
    cv = ng.nodes.new("CompositorNodeCurveRGB"); cv.name = "M2D_Grade"
    c = cv.mapping.curves[3]
    # pivot at 0.40 so the plate's mean (sRGB ≈ 0.30–0.35) barely moves; the second
    # pass with a 0.22 toe still took 6.5 L off the frame.
    toe, sh = (0.130, 0.845) if not night else (0.140, 0.825)
    if day:
        toe, sh = 0.115, 0.860
    c.points.new(0.15, toe); c.points.new(0.40, 0.40); c.points.new(0.80, sh)
    cv.mapping.update()
    ng.links.new(cur, cv.inputs["Image"]); cur = cv.outputs["Image"]
    # 3. split toning
    cb = ng.nodes.new("CompositorNodeColorBalance"); cb.name = "M2D_GradeBalance"
    # Blender 5: the method is a MENU socket and Lift/Gamma/Gain exist twice (VALUE and
    # RGBA); Blender 4: a property plus RGBA sockets. Set by socket type where possible.
    try:
        cb.inputs["Type"].default_value = 'Lift/Gamma/Gain'
    except Exception:
        try: cb.correction_method = 'LIFT_GAMMA_GAIN'
        except Exception: pass
    lift, gain = (0.995, 0.997, 1.008), (1.015, 1.003, 0.990)
    if night:
        lift, gain = (0.997, 0.998, 1.005), (1.006, 1.0, 0.995)
    for nm, val in (("Lift", lift), ("Gamma", (1.0, 1.0, 1.0)), ("Gain", gain)):
        sock = next((i for i in cb.inputs if i.name == nm and i.type == 'RGBA'), None)
        if sock is not None:
            sock.default_value = (*val, 1.0)
        else:
            try: setattr(cb, nm.lower(), val)
            except Exception: pass
    ng.links.new(cur, cb.inputs["Image"]); cur = cb.outputs["Image"]
    # 4. saturation
    hs = ng.nodes.new("CompositorNodeHueSat"); hs.name = "M2D_GradeSat"
    sat = 1.0 if night else (1.14 if day else 1.08)
    try: hs.inputs["Saturation"].default_value = sat
    except Exception: hs.color_saturation = sat
    ng.links.new(cur, hs.inputs["Image"]); cur = hs.outputs["Image"]
    ng.links.new(cur, to_l.inputs["Image"]); cur = to_l.outputs["Image"]
    # 5. chromatic aberration
    if dispersion > 0:
        ld = ng.nodes.new("CompositorNodeLensdist"); ld.name = "M2D_GradeCA"
        try:
            ld.inputs["Dispersion"].default_value = dispersion
            ld.inputs["Distortion"].default_value = 0.0
        except Exception:
            pass
        try: ld.inputs["Fit"].default_value = True
        except Exception:
            try: ld.use_fit = True
            except Exception: pass
        ng.links.new(cur, ld.inputs["Image"]); cur = ld.outputs["Image"]
    ng.links.new(cur, out.inputs["Image"])
    return f"grade: unsharp {sharpen} in focus, S-curve {toe}/{sh}, split-tone, sat {sat}, CA {dispersion}"


_DAY_HAZE = ((0.46, 0.44, 0.40), 0.05)   # (linear haze colour, amount) for _aerial_pass

# Daytime broadcast palette, sRGB. Asphalt is the darkest large surface in frame and the
# plate the lightest, so the ribbon reads by value first; kerbs and verge add the only
# saturated colour near the line. Everything else stays in the sand / concrete family.
_DAY = {
    "sand_lo": (158, 146, 126), "sand_hi": (192, 181, 160), "rock": (138, 126, 108),
    "near": (196, 186, 166), "shrub": (98, 94, 72),                                   # compacted apron by the line
    "asphalt": (104, 106, 110), "rubber": (84, 86, 90), "pit": (96, 98, 102),
    "line": (240, 240, 240), "runoff_tar": (46, 48, 52), "apron": (224, 200, 152),
    "wall": (206, 206, 204), "paint_a": (188, 48, 42), "paint_b": (232, 232, 230), "runoff": (214, 192, 150), "verge": (96, 138, 64),
    "road": (116, 112, 106), "ring": (150, 146, 138), "lot": (118, 116, 112),
    "roof_osm": (190, 186, 178), "side_osm": (150, 144, 134),
    "roof": (206, 206, 204), "side": (168, 168, 166), "pit_roof": (216, 216, 216),
    "paddock_roof": (184, 184, 182), "water": (46, 112, 138),
}

# Small objects that render as grit at ~1.6 m/px. The screenshot the look targets is
# busy only where the racing is; these are dropped outright on the day level.
_DAY_HIDE = ("M2D_Marshal_", "M2D_Glow", "M2D_Runoff", "M2D_Verge", "M2D_TyreWall_", "M2D_Rd_service", "M2D_Rd_residential",
             "M2D_Rd_unclassified", "M2D_Rd_track", "M2D_Vignette", "M2D_Stream")


def _day_flat(name, rgb, noise_m=None, lo=0.92, hi=1.08, rough=None):
    """Constant sRGB base colour (link cut), emission off, optional world-space grain."""
    m = bpy.data.materials.get(name); b = _bsdf(m)
    if not b:
        return False
    nt = m.node_tree
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name in ("Base Color", "Emission Color", "Emission Strength"):
            nt.links.remove(l)
    c = _srgb(*rgb)
    b.inputs["Base Color"].default_value = (*c, 1.0)
    if "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value = 0.0
    if rough is not None:
        for l in list(nt.links):
            if l.to_node == b and l.to_socket.name == "Roughness":
                nt.links.remove(l)
        b.inputs["Roughness"].default_value = rough
    if noise_m:
        _noise_mix(m, noise_m, tuple(x * lo for x in c), tuple(x * hi for x in c), detail=2.0)
    return True


def _day_terrain(sc, log):
    """Rebuild the plate's base colour as desert: two-scale sand ramp, darker rock
    patches, the authored arid texture as soft light, and a lighter compacted band
    by the circuit (TrackDist). M2DCol's ALPHA still carries the plate fade."""
    m = bpy.data.materials.get("M2D_TerrainVC"); b = _bsdf(m)
    if not b:
        return "day terrain: no M2D_TerrainVC"
    nt = m.node_tree
    geo = nt.nodes.new("ShaderNodeNewGeometry")

    def noise(scale_m, detail=3.0, rough=0.5):
        mp = nt.nodes.new("ShaderNodeMapping"); k = 1.0 / scale_m
        mp.inputs["Scale"].default_value = (k, k, k)
        nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 1.0
        n.inputs["Detail"].default_value = detail; n.inputs["Roughness"].default_value = rough
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n

    def ramp(fac, a, b_, p0=0.3, p1=0.7):
        r = nt.nodes.new("ShaderNodeValToRGB")
        r.color_ramp.elements[0].position = p0; r.color_ramp.elements[0].color = (*_srgb(*a), 1.0)
        r.color_ramp.elements[1].position = p1; r.color_ramp.elements[1].color = (*_srgb(*b_), 1.0)
        nt.links.new(fac, r.inputs["Fac"])
        return r.outputs["Color"]

    def mix(fac, a, b_, blend='MIX', f=None):
        x = nt.nodes.new("ShaderNodeMixRGB"); x.blend_type = blend
        if f is not None:
            x.inputs[0].default_value = f
        else:
            nt.links.new(fac, x.inputs[0])
        nt.links.new(a, x.inputs[1]); nt.links.new(b_, x.inputs[2])
        return x.outputs[0]

    col = ramp(noise(420.0, 2.0, 0.45).outputs["Fac"], _DAY["sand_lo"], _DAY["sand_hi"], 0.32, 0.68)
    rock = nt.nodes.new("ShaderNodeRGB"); rock.outputs[0].default_value = (*_srgb(*_DAY["rock"]), 1.0)
    rmask = nt.nodes.new("ShaderNodeMapRange"); rmask.interpolation_type = 'SMOOTHSTEP'
    rmask.inputs["From Min"].default_value = 0.56; rmask.inputs["From Max"].default_value = 0.72
    rmask.inputs["To Min"].default_value = 0.0; rmask.inputs["To Max"].default_value = 0.30
    nt.links.new(noise(160.0, 3.0, 0.50).outputs["Fac"], rmask.inputs["Value"])
    col = mix(rmask.outputs["Result"], col, rock.outputs[0])
    # compacted, lighter apron within ~60 m of the line
    td = nt.nodes.new("ShaderNodeAttribute"); td.attribute_name = "TrackDist"
    tsep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(td.outputs["Color"], tsep.inputs["Color"])
    tm = nt.nodes.new("ShaderNodeMapRange"); tm.interpolation_type = 'SMOOTHSTEP'
    tm.inputs["From Min"].default_value = 0.015; tm.inputs["From Max"].default_value = 0.06
    tm.inputs["To Min"].default_value = 0.55; tm.inputs["To Max"].default_value = 0.0
    nt.links.new(tsep.outputs["Red"], tm.inputs["Value"])
    near = nt.nodes.new("ShaderNodeRGB"); near.outputs[0].default_value = (*_srgb(*_DAY["near"]), 1.0)
    col = mix(tm.outputs["Result"], col, near.outputs[0])
    tex = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "tex", "terrain_arid_v1.png")
    if os.path.exists(tex):
        img = bpy.data.images.load(tex, check_existing=True); img.colorspace_settings.name = 'sRGB'
        uv = nt.nodes.new("ShaderNodeMapping"); k = 1.0 / 300.0; uv.inputs["Scale"].default_value = (k, k, k)
        nt.links.new(geo.outputs["Position"], uv.inputs["Vector"])
        it = nt.nodes.new("ShaderNodeTexImage"); it.image = img; it.extension = 'REPEAT'
        nt.links.new(uv.outputs["Vector"], it.inputs["Vector"])
        col = mix(None, col, it.outputs["Color"], 'SOFT_LIGHT', 0.30)
    # Desert shrubs, as the aerial shows them: sparse dark dots ~3-5 m across on a 14 m
    # cell, a third of the cells occupied, thinned further by a 200 m density noise.
    # Shader-only, so they cost nothing and never collide with furniture.
    vmap = nt.nodes.new("ShaderNodeMapping"); k = 1.0 / 14.0
    vmap.inputs["Scale"].default_value = (k, k, k)
    nt.links.new(geo.outputs["Position"], vmap.inputs["Vector"])
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 1.0
    vor.inputs["Randomness"].default_value = 0.9
    nt.links.new(vmap.outputs["Vector"], vor.inputs["Vector"])
    dot = nt.nodes.new("ShaderNodeMapRange"); dot.interpolation_type = 'SMOOTHSTEP'
    dot.inputs["From Min"].default_value = 0.12; dot.inputs["From Max"].default_value = 0.19
    dot.inputs["To Min"].default_value = 1.0; dot.inputs["To Max"].default_value = 0.0
    nt.links.new(vor.outputs["Distance"], dot.inputs["Value"])
    csep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(vor.outputs["Color"], csep.inputs["Color"])
    dens = nt.nodes.new("ShaderNodeMapRange")
    dens.inputs["From Min"].default_value = 0.35; dens.inputs["From Max"].default_value = 0.65
    dens.inputs["To Min"].default_value = 0.45; dens.inputs["To Max"].default_value = 0.85
    nt.links.new(noise(200.0, 2.0, 0.5).outputs["Fac"], dens.inputs["Value"])
    occ = nt.nodes.new("ShaderNodeMath"); occ.operation = 'GREATER_THAN'
    nt.links.new(csep.outputs["Red"], occ.inputs[0]); nt.links.new(dens.outputs["Result"], occ.inputs[1])
    shf = nt.nodes.new("ShaderNodeMath"); shf.operation = 'MULTIPLY'
    nt.links.new(dot.outputs["Result"], shf.inputs[0]); nt.links.new(occ.outputs[0], shf.inputs[1])
    shf2 = nt.nodes.new("ShaderNodeMath"); shf2.operation = 'MULTIPLY'; shf2.inputs[1].default_value = 0.6
    nt.links.new(shf.outputs[0], shf2.inputs[0])
    shrub = nt.nodes.new("ShaderNodeRGB"); shrub.outputs[0].default_value = (*_srgb(*_DAY["shrub"]), 1.0)
    col = mix(shf2.outputs[0], col, shrub.outputs[0])
    # fine 8 m grain so the sand does not read as a flat fill up close
    g = nt.nodes.new("ShaderNodeMapRange"); g.inputs["To Min"].default_value = 0.94; g.inputs["To Max"].default_value = 1.05
    nt.links.new(noise(8.0, 2.0, 0.5).outputs["Fac"], g.inputs["Value"])
    gm = nt.nodes.new("ShaderNodeMixRGB"); gm.blend_type = 'MULTIPLY'; gm.inputs[0].default_value = 1.0
    nt.links.new(col, gm.inputs[1]); nt.links.new(g.outputs["Result"], gm.inputs[2])
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name == "Base Color":
            nt.links.remove(l)
    nt.links.new(gm.outputs[0], b.inputs["Base Color"])
    return "day terrain: sand 420 m ramp, rock 160 m, shrub dots 14 m, compacted apron by the line, arid texture, 8 m grain"


def _day_light(sc, sun_energy=4.6, sun_elev=40.0, sky=(0.60, 0.74, 1.0), sky_strength=0.75,
               bg=(0.44, 0.39, 0.31)):
    """Midday-ish key: higher, whiter sun, a strong blue sky fill so shadows go cool
    instead of black, a weak rim, and a warm sand haze as the camera background so the
    dissolved plate edge fades into the same family."""
    for o in sc.objects:
        if o.type != 'LIGHT':
            continue
        if o.name.startswith("M2D_Rim"):
            o.data.energy = 0.35
        elif o.data.type == 'SUN':
            o.data.energy = sun_energy
            o.data.color = (1.0, 0.95, 0.86)
            o.data.angle = math.radians(1.5)
            e = o.rotation_euler
            o.rotation_euler = (math.radians(90.0 - sun_elev), e[1], e[2])
    w = sc.world
    if w and w.use_nodes:
        nt = w.node_tree
        mixn = next((n for n in nt.nodes if n.type == 'MIX_SHADER'), None)
        for n in nt.nodes:
            if n.type != 'BACKGROUND':
                continue
            to_camera = mixn is not None and any(l.from_node == n and l.to_node == mixn and l.to_socket == mixn.inputs[2] for l in nt.links)
            for l in list(nt.links):
                if l.to_node == n and l.to_socket.name == "Color":
                    nt.links.remove(l)
            if to_camera or mixn is None:
                n.inputs["Color"].default_value = (*bg, 1.0); n.inputs["Strength"].default_value = 1.0
            else:
                n.inputs["Color"].default_value = (*sky, 1.0); n.inputs["Strength"].default_value = sky_strength
    # Standard view clips a daylight key (roofs and sand went flat white); AgX rolls the
    # highlights off and keeps the sand's hue.
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Punchy'
        sc.view_settings.exposure = 0.15
    except Exception:
        pass
    return f"day light: sun {sun_energy} at {sun_elev:.0f}°, sky fill {sky_strength}, sand haze background"


def _loop_filter(a, r, closed, op):
    """Moving max / mean over ±r samples, wrapping on a closed lap."""
    n = len(a)
    idx = np.arange(-r, r + 1)
    rows = (np.arange(n)[:, None] + idx[None, :])
    rows = rows % n if closed else np.clip(rows, 0, n - 1)
    return a[rows].max(1) if op == "max" else a[rows].mean(1)


def _terrain_bvh(sc):
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    trees = []
    for o in sc.objects:
        if o.type == 'MESH' and o.name.startswith("M2D_Terrain"):
            me = o.evaluated_get(dg).to_mesh()
            mw = o.matrix_world
            verts = [mw @ v.co for v in me.vertices]
            polys = [tuple(p.vertices) for p in me.polygons]
            trees.append(BVHTree.FromPolygons(verts, polys))
            o.evaluated_get(dg).to_mesh_clear()
    return trees


def _terrain_z(trees, x, y):
    from mathutils import Vector
    best = None
    for t in trees:
        hit = t.ray_cast(Vector((x, y, 5000.0)), Vector((0.0, 0.0, -1.0)))
        if hit[0] is not None and (best is None or hit[0].z > best):
            best = hit[0].z
    return best


def _day_runoff(sc, log):
    """Sakhir's signature, from the aerial reference: wide DARK tarmac run-off on the
    outside of every corner (almost no gravel), bounded by a beige painted band and a
    concrete wall; the widest zones carry red/white painted stripes. Width is solved
    per sample from the ribbon's own curvature: 5 m on straights, up to ~40 m outside
    a slow corner, spread ±60 m along the lap so it covers braking and exit. A sample
    that would reach into another part of the circuit is shrunk until it doesn't."""
    import mathutils
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return "runoff: no asphalt"
    me = asp.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    Lv, Rv = V[0::2], V[1::2]; C = (Lv + Rv) * 0.5; m = len(C)
    seg = np.linalg.norm(np.diff(C[:, :2], axis=0), axis=1); step = float(np.median(seg))
    closed = float(np.linalg.norm(C[0, :2] - C[-1, :2])) < 3.0 * step
    ii = np.arange(m)
    nxt = (ii + 1) % m if closed else np.minimum(ii + 1, m - 1)
    prv = (ii - 1) % m if closed else np.maximum(ii - 1, 0)
    T = C[nxt, :2] - C[prv, :2]; T /= np.maximum(np.linalg.norm(T, axis=1), 1e-6)[:, None]
    NL = np.c_[-T[:, 1], T[:, 0]]                         # left normal
    th = np.arctan2(T[:, 1], T[:, 0])
    k = max(2, int(round(10.0 / step)))                   # ±10 m window
    a = (ii + k) % m if closed else np.minimum(ii + k, m - 1)
    b = (ii - k) % m if closed else np.maximum(ii - k, 0)
    dth = (th[a] - th[b] + np.pi) % (2 * np.pi) - np.pi
    kappa = dth / (2 * k * step)                          # signed, + = turning left
    spread = max(1, int(round(80.0 / step)))
    smooth = max(1, int(round(25.0 / step)))
    kd = mathutils.kdtree.KDTree(m)
    for i in range(m):
        kd.insert((C[i, 0], C[i, 1], 0.0), i)
    kd.balance()
    trees = _terrain_bvh(sc)
    coll = asp.users_collection[0]
    # The pit lane runs 11–18 m off the start straight: run-off must stop short of it,
    # otherwise the tarmac and apron are drawn over the lane and it disappears.
    kd_pit = None
    pl = sc.objects.get("M2D_PitLane")
    if pl is not None and not pl.hide_render:
        Wp = _world_xy(pl); Ap, Bp = Wp[0::2], Wp[1::2]
        pts = [Ap[:-1] + (Ap[1:] - Ap[:-1]) * t + ((Bp[:-1] + (Bp[1:] - Bp[:-1]) * t) - (Ap[:-1] + (Ap[1:] - Ap[:-1]) * t)) * u
               for t in np.linspace(0, 1, 6) for u in np.linspace(0, 1, 4)]
        Pp = np.vstack(pts)
        kd_pit = mathutils.kdtree.KDTree(len(Pp))
        for q, p in enumerate(Pp):
            kd_pit.insert((p[0], p[1], 0.0), q)
        kd_pit.balance()

    m_tar = _runtime_flat("M2D_DayRunoff", (*_srgb(*_DAY["runoff_tar"]), 1.0))
    m_beige = _runtime_flat("M2D_DayApron", (*_srgb(*_DAY["apron"]), 1.0))
    m_wall = _runtime_flat("M2D_DayWall", (*_srgb(*_DAY["wall"]), 1.0))
    _noise_mix(m_beige, 3.0, tuple(c * 0.94 for c in _srgb(*_DAY["apron"])),
               tuple(c * 1.04 for c in _srgb(*_DAY["apron"])), detail=2.0)
    # tarmac: fine grain + painted stripes where the per-vertex "Paint" weight is set
    nt = m_tar.node_tree; bs = _bsdf(m_tar)
    base = _noise_mix(m_tar, 4.0, tuple(c * 0.92 for c in _srgb(*_DAY["runoff_tar"])),
                      tuple(c * 1.08 for c in _srgb(*_DAY["runoff_tar"])), detail=2.0)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, math.radians(45))
    mp.inputs["Scale"].default_value = (1 / 12.0, 1 / 12.0, 1 / 12.0)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.wave_type = 'BANDS'; wave.bands_direction = 'X'
    wave.wave_profile = 'SAW'; wave.inputs["Scale"].default_value = 1.0; wave.inputs["Distortion"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
    st = nt.nodes.new("ShaderNodeMath"); st.operation = 'GREATER_THAN'; st.inputs[1].default_value = 0.5
    nt.links.new(wave.outputs["Fac"], st.inputs[0])
    sc_ = nt.nodes.new("ShaderNodeMix"); sc_.data_type = 'RGBA'
    sc_.inputs[6].default_value = (*_srgb(*_DAY["paint_a"]), 1.0); sc_.inputs[7].default_value = (*_srgb(*_DAY["paint_b"]), 1.0)
    nt.links.new(st.outputs[0], sc_.inputs["Factor"])
    pa = nt.nodes.new("ShaderNodeAttribute"); pa.attribute_name = "Paint"
    pm = nt.nodes.new("ShaderNodeMath"); pm.operation = 'GREATER_THAN'; pm.inputs[1].default_value = 0.5
    nt.links.new(pa.outputs["Fac"], pm.inputs[0])
    fin = nt.nodes.new("ShaderNodeMix"); fin.data_type = 'RGBA'
    nt.links.new(pm.outputs[0], fin.inputs["Factor"])
    nt.links.new(base.outputs[2], fin.inputs[6]); nt.links.new(sc_.outputs[2], fin.inputs[7])
    nt.links.new(fin.outputs[2], bs.inputs["Base Color"])

    tot_area = 0.0; painted = 0; walls = 0
    for side in (Lv, Rv):
        U = side[:, :2] - C[:, :2]; half = np.linalg.norm(U, axis=1)
        U /= np.maximum(half, 1e-6)[:, None]
        out_k = np.maximum(0.0, -np.sum(U * NL, axis=1) * kappa)          # >0 outside a corner
        w = 7.0 + np.clip(out_k, 0.0, 0.035) * 1500.0
        w = _loop_filter(_loop_filter(w, spread, closed, "max"), smooth, closed, "mean")
        bw = 6.0 + 0.20 * w
        # shrink where the outer edge would reach another part of the circuit
        for _ in range(16):
            reach = half + w + bw
            P = side[:, :2] + U * (w + bw)[:, None]
            bad = np.zeros(m, bool)
            for i in range(m):
                d = kd.find((P[i, 0], P[i, 1], 0.0))[2]
                if d < reach[i] - 3.0:
                    bad[i] = True
                elif kd_pit is not None:
                    # outer edge, and the mid-point of the band, must stay off the lane
                    for f_ in (1.0, 0.5):
                        Q_ = side[i, :2] + U[i] * (w[i] + bw[i]) * f_
                        if kd_pit.find((Q_[0], Q_[1], 0.0))[2] < 3.5:
                            bad[i] = True
            if not bad.any():
                break
            w[bad] *= 0.78; bw[bad] *= 0.85
        w = _loop_filter(w, max(1, smooth // 2), closed, "mean")
        paint = (w > 34.0).astype(float)
        painted += int(paint.sum())

        def ring(off):
            P = side[:, :2] + U * off[:, None]
            z = np.empty(m)
            for i in range(m):
                tz = _terrain_z(trees, P[i, 0], P[i, 1]) if trees else None
                z[i] = max(side[i, 2] - 0.03, (tz + 0.06) if tz is not None else -1e9)
            return np.c_[P, z]
        r0 = ring(np.zeros(m)); r1 = ring(w); r2 = ring(w + bw)
        r0[:, 2] = side[:, 2] - 0.03
        idx = list(range(m)) + ([0] if closed else [])
        def strip(A, B, name, mat, attr=None):
            verts = []; faces = []; vals = []
            for j, i in enumerate(idx):
                verts += [tuple(A[i]), tuple(B[i])]
                if attr is not None:
                    vals += [0.0, attr[i]]
                if j:
                    q = 2 * (j - 1); faces.append((q, q + 2, q + 3, q + 1))
            ob = _runtime_mesh(name, verts, faces, mat, coll)
            if attr is not None:
                at = ob.data.attributes.new("Paint", 'FLOAT', 'POINT')
                at.data.foreach_set("value", np.array(vals, np.float32))
            try: ob.visible_shadow = False
            except Exception: pass
            return ob
        # stripes only over the outer 45 % of the painted zones
        mid = ring(w * 0.55)
        strip(r0, mid, "M2D_DayRunoff", m_tar)
        strip(mid, r1, "M2D_DayRunoff", m_tar, attr=paint)
        strip(r1, r2, "M2D_DayApron", m_beige)
        # 1.1 m concrete wall on the outer edge
        verts = []; faces = []
        for j, i in enumerate(idx):
            x, y, z = r2[i]
            verts += [(x, y, z), (x, y, z + 1.1)]
            if j:
                q = 2 * (j - 1); faces.append((q, q + 2, q + 3, q + 1))
        _runtime_mesh("M2D_DayWall", verts, faces, m_wall, coll); walls += 1
        tot_area += float(np.sum((w + bw) * step))
    return (f"runoff: tarmac zones {tot_area / 1e4:.1f} ha (7 m straights → ≤60 m outside corners), "
            f"beige apron + wall, {painted} painted samples")


def _day_tower(sc, log):
    """The Sakhir tower: a white drum with a glazed band behind the pit building,
    replacing the thin TV-mast box. Placed off the pit building's short end, on the
    side away from the track."""
    import bmesh, mathutils
    pit = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_PitBuilding" and not o.hide_render), None)
    line = _racing_line(sc)
    if pit is None or line is None:
        return "tower: no pit building"
    P = np.array([list(pit.matrix_world @ v.co) for v in pit.data.vertices])
    pu = _principal_xy(P); pv = np.array([-pu[1], pu[0]]); pc = P[:, :2].mean(0)
    ext = (P[:, :2] - pc) @ pu; zp = float(P[:, 2].min())
    best = None
    for along in (ext.min() - 30.0, ext.max() + 30.0, ext.min() * 0.5, ext.max() * 0.5):
        for across in (-45.0, -60.0, 45.0, 60.0):
            q = pc + pu * along + pv * across
            d = float(np.hypot(line[:, 0] - q[0], line[:, 1] - q[1]).min())
            if d > 45.0 and (best is None or d < best[0]):
                best = (d, q)
    if best is None:
        return "tower: no free spot"
    q = best[1]
    for o in sc.objects:
        if o.name.split('.')[0] in ("M2D_TVMast", "M2D_TVMastTop"):
            o.hide_render = True
    coll = pit.users_collection[0]
    m_w = _runtime_flat("M2D_DayTowerWhite", (*_srgb(232, 232, 230), 1.0))
    m_g = _runtime_flat("M2D_DayTowerGlass", (*_srgb(52, 66, 80), 1.0))
    _bsdf(m_g).inputs["Roughness"].default_value = 0.25
    for z0, z1, r, mat in ((0.0, 22.0, 9.0, m_w), (22.0, 30.0, 11.5, m_g), (30.0, 32.0, 12.5, m_w),
                           (32.0, 37.0, 9.5, m_g), (37.0, 38.5, 10.5, m_w)):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=40, radius1=r, radius2=r, depth=z1 - z0,
                              matrix=mathutils.Matrix.Translation((q[0], q[1], zp + (z0 + z1) * 0.5)))
        me = bpy.data.meshes.new("M2D_DayTower"); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = abs(p.normal.z) < 0.5
        me.materials.append(mat)
        coll.objects.link(bpy.data.objects.new("M2D_DayTower", me))
    return f"tower: Sakhir drum 38 m at {best[0]:.0f} m from the line"


def _ribbon_frame(sc):
    """Asphalt centreline C, half widths, tangents, left normals and signed curvature."""
    asp = next((o for o in sc.objects if o.type == 'MESH' and o.name.split('.')[0] == "M2D_Asphalt"), None)
    if asp is None:
        return None
    me = asp.data; n = len(me.vertices)
    co = np.empty(n * 3); me.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(asp.matrix_world).T)[:, :3]
    Lv, Rv = V[0::2], V[1::2]; C = (Lv + Rv) * 0.5; m = len(C)
    ii = np.arange(m)
    T = C[(ii + 1) % m, :2] - C[(ii - 1) % m, :2]; T /= np.maximum(np.linalg.norm(T, axis=1), 1e-6)[:, None]
    step = float(np.median(np.linalg.norm(np.diff(C[:, :2], axis=0), axis=1)))
    k = max(2, int(round(10.0 / step)))
    th = np.arctan2(T[:, 1], T[:, 0])
    dth = (th[(ii + k) % m] - th[(ii - k) % m] + np.pi) % (2 * np.pi) - np.pi
    return dict(obj=asp, C=C, Lv=Lv, Rv=Rv, T=T, NL=np.c_[-T[:, 1], T[:, 0]],
                kappa=dth / (2 * k * step), step=step, half=np.linalg.norm(Lv[:, :2] - C[:, :2], axis=1))


def _inside_loop(C, P):
    """Point-in-polygon (even-odd) of XY points P against the closed centreline."""
    x, y = P[:, 0][:, None], P[:, 1][:, None]
    x0, y0 = C[:, 0][None, :], C[:, 1][None, :]
    x1, y1 = np.roll(C[:, 0], -1)[None, :], np.roll(C[:, 1], -1)[None, :]
    cross = ((y0 > y) != (y1 > y)) & (x < (x1 - x0) * (y - y0) / np.where(y1 - y0 == 0, 1e-9, y1 - y0) + x0)
    return cross.sum(1) % 2 == 1


def _day_mosaic(sc, log, F, trees, depth_m=70.0):
    """The painted mosaic of the reference: a field of blue / teal / green triangles
    laid inside the loop along the longest straight that is not the pit straight,
    kept clear of the run-off and of every other part of the circuit."""
    import mathutils
    C, T, kappa, step, half = F["C"], F["T"], F["kappa"], F["step"], F["half"]
    m = len(C)
    flat = np.abs(kappa) < 0.0025
    runs = []; i = 0
    while i < m:
        if flat[i]:
            j = i
            while j + 1 < m and flat[j + 1]:
                j += 1
            runs.append((i, j)); i = j + 1
        else:
            i += 1
    runs = [r for r in runs if not (r[0] <= 2 or r[1] >= m - 3)]      # skip the start/finish straight
    if not runs:
        return "mosaic: no straight"
    a, b = max(runs, key=lambda r: r[1] - r[0])
    cut = int((b - a) * 0.15); a, b = a + cut, b - cut
    sel = np.arange(a, b + 1)
    NL = F["NL"][sel]
    test = C[sel, :2] + NL * 40.0
    sgn = 1.0 if _inside_loop(C[:, :2], test).mean() > 0.5 else -1.0
    Nn = NL * sgn
    kd = mathutils.kdtree.KDTree(m)
    for q, p in enumerate(C):
        kd.insert((p[0], p[1], 0.0), q)
    kd.balance()
    r0 = half[sel] + 18.0
    r1 = r0 + depth_m
    for _ in range(12):
        P = C[sel, :2] + Nn * r1[:, None]
        bad = np.array([kd.find((p[0], p[1], 0.0))[2] < r1[q] - 25.0 for q, p in enumerate(P)])
        if not bad.any():
            break
        r1[bad] = r0[bad] + (r1[bad] - r0[bad]) * 0.8
    r1 = _loop_filter(r1, 6, False, "mean")
    P0 = C[sel, :2] + Nn * r0[:, None]; P1 = C[sel, :2] + Nn * r1[:, None]
    # a grid, not one quad across: the relief otherwise pokes through between rows
    rows = 14
    verts, faces = [], []
    for q in range(len(sel)):
        for r in range(rows + 1):
            P = P0[q] + (P1[q] - P0[q]) * (r / rows)
            tz = _terrain_z(trees, P[0], P[1]) if trees else None
            verts.append((P[0], P[1], (tz if tz is not None else C[sel[q], 2]) + 0.25))
            if q and r:
                s_ = (q - 1) * (rows + 1) + r - 1; t_ = q * (rows + 1) + r - 1
                faces.append((s_, t_, t_ + 1, s_ + 1))
    mat = _runtime_flat("M2D_DayMosaic", (0.1, 0.3, 0.5, 1.0))
    nt = mat.node_tree; bs = _bsdf(mat)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 18.0, 1 / 18.0, 1 / 18.0)
    ang = math.atan2(T[sel[0], 1], T[sel[0], 0]); mp.inputs["Rotation"].default_value = (0, 0, -ang)
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    # triangle id: floor(u), floor(v) and which half of the cell (frac u > frac v)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(mp.outputs["Vector"], sep.inputs["Vector"])
    fl = nt.nodes.new("ShaderNodeVectorMath"); fl.operation = 'FLOOR'; nt.links.new(mp.outputs["Vector"], fl.inputs[0])
    fr = nt.nodes.new("ShaderNodeVectorMath"); fr.operation = 'FRACTION'; nt.links.new(mp.outputs["Vector"], fr.inputs[0])
    fs = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(fr.outputs[0], fs.inputs["Vector"])
    half_ = nt.nodes.new("ShaderNodeMath"); half_.operation = 'GREATER_THAN'
    nt.links.new(fs.outputs["X"], half_.inputs[0]); nt.links.new(fs.outputs["Y"], half_.inputs[1])
    cs = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(fl.outputs[0], cs.inputs["Vector"])
    cid = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(cs.outputs["X"], cid.inputs["X"]); nt.links.new(cs.outputs["Y"], cid.inputs["Y"])
    nt.links.new(half_.outputs[0], cid.inputs["Z"])
    wn = nt.nodes.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = '3D'
    nt.links.new(cid.outputs[0], wn.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = 'CONSTANT'
    cols = [(24, 70, 150), (30, 120, 186), (40, 170, 190), (70, 190, 160), (120, 200, 120)]
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (*_srgb(*cols[0]), 1.0)
    els[1].position = 0.2; els[1].color = (*_srgb(*cols[1]), 1.0)
    for q, c in enumerate(cols[2:], start=2):
        e = els.new(q * 0.2); e.color = (*_srgb(*c), 1.0)
    nt.links.new(wn.outputs["Value"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bs.inputs["Base Color"])
    ob = _runtime_mesh("M2D_DayMosaic", verts, faces, mat, F["obj"].users_collection[0])
    try: ob.visible_shadow = False
    except Exception: pass
    area = float(np.sum((r1 - r0) * step))
    return f"mosaic: {area / 1e4:.2f} ha of painted triangles inside the loop, samples {a}-{b}"


def _day_pond(sc, log, F, trees, rx=26.0, ry=16.0):
    """The small infield pond: a dark-green water ellipse with a sandy rim at the
    infield point farthest from the circuit."""
    C = F["C"]
    lo, hi = C[:, :2].min(0), C[:, :2].max(0)
    gx, gy = np.meshgrid(np.linspace(lo[0], hi[0], 90), np.linspace(lo[1], hi[1], 90))
    G = np.c_[gx.ravel(), gy.ravel()]
    G = G[_inside_loop(C[:, :2], G)]
    if not len(G):
        return "pond: no infield"
    L = C[::4, :2]
    d = np.array([np.hypot(L[:, 0] - g[0], L[:, 1] - g[1]).min() for g in G])
    # skip whatever the mosaic took
    mo = next((o for o in sc.objects if o.name.startswith("M2D_DayMosaic")), None)
    if mo is not None:
        Mw = _world_xy(mo)
        d = np.where(np.array([np.hypot(Mw[:, 0] - g[0], Mw[:, 1] - g[1]).min() for g in G]) < 60.0, 0.0, d)
    q = G[int(np.argmax(d))]
    tz = _terrain_z(trees, q[0], q[1]) if trees else 0.0
    coll = F["obj"].users_collection[0]
    m_w = _runtime_flat("M2D_DayPond", (*_srgb(52, 86, 72), 1.0))
    _bsdf(m_w).inputs["Roughness"].default_value = 0.2
    m_r = _runtime_flat("M2D_DayPondRim", (*_srgb(170, 160, 128), 1.0))
    for s_, mat, dz in ((1.25, m_r, 0.06), (1.0, m_w, 0.10)):
        vs = []
        for t in np.linspace(0, 2 * math.pi, 48, endpoint=False):
            wob = 1.0 + 0.10 * math.sin(3 * t + 1.3) + 0.06 * math.sin(5 * t)
            vs.append((q[0] + rx * s_ * wob * math.cos(t), q[1] + ry * s_ * wob * math.sin(t), (tz or 0.0) + dz))
        _runtime_mesh("M2D_DayPond", vs, [tuple(range(48))], mat, coll)
    return f"pond: at {float(d.max()):.0f} m from the line"


def _day_canopies(sc, log, F):
    """White cantilever roofs over the grandstands (the reference's main stand reads by
    its long white canopy), ribbed every 12 m, on slim back columns. The pit building
    roof gets the same ribbing."""
    import bmesh, mathutils
    line = F["C"][:, :2]
    m_roof = _runtime_flat("M2D_DayCanopy", (*_srgb(238, 238, 236), 1.0))
    nt = m_roof.node_tree; bs = _bsdf(m_roof)
    m_col = _runtime_flat("M2D_DayColumn", (*_srgb(200, 200, 198), 1.0))
    n = 0
    for o in list(sc.objects):
        base = o.name.split('.')[0]
        if (o.type != 'MESH' or o.hide_render or not base.startswith("M2D_Stand_")
                or base.endswith(("_RoofDeck", "_RoofTruss"))):
            continue
        W = np.array([list(o.matrix_world @ v.co) for v in o.data.vertices])
        pu = _principal_xy(W); pv = np.array([-pu[1], pu[0]]); pc = W[:, :2].mean(0)
        eu = (W[:, :2] - pc) @ pu; ev = (W[:, :2] - pc) @ pv
        # back = the pv side farther from the track
        fwd = pc + pv * ev.max(); bwd = pc + pv * ev.min()
        dF = np.hypot(line[:, 0] - fwd[0], line[:, 1] - fwd[1]).min()
        dB = np.hypot(line[:, 0] - bwd[0], line[:, 1] - bwd[1]).min()
        back, front = (ev.max(), ev.min()) if dF > dB else (ev.min(), ev.max())
        depth = back - front
        v0, v1 = back + np.sign(depth) * 1.5, back - depth * 0.80
        u0, u1 = eu.min() - 2.0, eu.max() + 2.0
        zt = float(W[:, 2].max()) + 5.0
        corners = [pc + pu * u + pv * v for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
        verts = [(c[0], c[1], zt + (1.2 if k in (0, 1) else 0.0)) for k, c in enumerate(corners)]
        verts += [(c[0], c[1], zt - 0.6 + (1.2 if k in (0, 1) else 0.0)) for k, c in enumerate(corners)]
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        ob = _runtime_mesh(f"M2D_DayCanopy_{base}", verts, faces, m_roof, o.users_collection[0])
        ang = math.atan2(pu[1], pu[0])
        for u in np.arange(u0 + 4.0, u1, 24.0):
            q = pc + pu * u + pv * v0
            _box(f"M2D_DayColumn_{n}", q[0], q[1], pu, pv, 0.8, 0.8, float(W[:, 2].min()), zt + 1.2, m_col, o.users_collection[0])
        n += 1
    # ribs: bands across the long axis, 12 m pitch (world X is fine: canopy colour only)
    for mat, pitch in ((m_roof, 12.0), (bpy.data.materials.get("M2D_PitTop"), 9.0)):
        b_ = _bsdf(mat)
        if not b_:
            continue
        c = b_.inputs["Base Color"].default_value[:3]
        mix = _noise_mix(mat, pitch, tuple(x * 0.84 for x in c), tuple(c), detail=0.0)
        nz = next(x for x in mat.node_tree.nodes if x.type == 'TEX_NOISE' and x.outputs["Fac"].is_linked)
        wave = mat.node_tree.nodes.new("ShaderNodeTexWave"); wave.wave_type = 'BANDS'; wave.wave_profile = 'SAW'
        wave.inputs["Scale"].default_value = 1.0; wave.inputs["Distortion"].default_value = 0.0
        for l in list(mat.node_tree.links):
            if l.from_node == nz:
                mat.node_tree.links.new(wave.outputs["Fac"], l.to_socket); mat.node_tree.links.remove(l)
        mat.node_tree.links.new(nz.inputs["Vector"].links[0].from_socket, wave.inputs["Vector"])
    return f"canopies: {n} stand roof(s), ribbed; pit roof ribbed"


def _strip_mesh(name, A, B, mat, coll, shadow=False):
    """Quad strip between two matching polylines A, B (N×3)."""
    verts, faces = [], []
    for j in range(len(A)):
        verts += [tuple(A[j]), tuple(B[j])]
        if j:
            q = 2 * (j - 1); faces.append((q, q + 2, q + 3, q + 1))
    ob = _runtime_mesh(name, verts, faces, mat, coll)
    if not shadow:
        try: ob.visible_shadow = False
        except Exception: pass
    return ob


def _offset_line(P, off):
    """Offset an XY(Z) polyline sideways by `off` metres (left positive)."""
    T = np.gradient(P[:, :2], axis=0); T /= np.maximum(np.linalg.norm(T, axis=1), 1e-6)[:, None]
    N = np.c_[-T[:, 1], T[:, 0]]
    Q = P.copy(); Q[:, :2] = P[:, :2] + N * np.atleast_1d(off)[:, None] if np.ndim(off) else P[:, :2] + N * off
    return Q


def _day_pitlane(sc, log, F):
    """Make the pit lane read as a pit lane: dedicated entry and exit ramps curving off
    and back onto the racing surface, a white blend line with a hatched gore at each,
    white edge lines, a solid pit wall on the track side, a dashed fast-lane line and
    box markings on the garage side, and a lighter concrete-grey surface."""
    import mathutils
    pl = sc.objects.get("M2D_PitLane")
    if pl is None or pl.hide_render:
        return "pit lane: none"
    n = len(pl.data.vertices)
    co = np.empty(n * 3); pl.data.vertices.foreach_get("co", co)
    V = (np.c_[co.reshape(-1, 3), np.ones(n)] @ np.array(pl.matrix_world).T)[:, :3]
    A, B = V[0::2], V[1::2]; P = (A + B) * 0.5
    w = float(np.median(np.linalg.norm(A[:, :2] - B[:, :2], axis=1)))
    C, T, step = F["C"], F["T"], F["step"]; m = len(C)
    coll = pl.users_collection[0]
    # which pit-lane side faces the track
    dA = np.hypot(*(C[:, :2][None, :, :] - A[::10, None, :2]).transpose(2, 0, 1)).min(1).mean()
    dB = np.hypot(*(C[:, :2][None, :, :] - B[::10, None, :2]).transpose(2, 0, 1)).min(1).mean()
    trk, gar = (A, B) if dA < dB else (B, A)

    m_pit = bpy.data.materials.get("M2D_PitMat")
    _day_flat("M2D_PitMat", (92, 96, 104), noise_m=4.0, lo=0.95, hi=1.05)
    m_w = _runtime_flat("M2D_DayPitLine", (*_srgb(245, 245, 245), 1.0))
    m_wall = _runtime_flat("M2D_DayPitWall", (*_srgb(222, 222, 220), 1.0))
    m_top = _runtime_flat("M2D_DayPitWallTop", (*_srgb(200, 40, 40), 1.0))
    m_gore = _runtime_flat("M2D_DayGore", (*_srgb(132, 132, 134), 1.0))
    # gore: white diagonal hatching on pit-lane grey
    nt = m_gore.node_tree; bs = _bsdf(m_gore)
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(45)); mp.inputs["Scale"].default_value = (1 / 5.0,) * 3
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = 'BANDS'; wv.wave_profile = 'SAW'
    wv.inputs["Scale"].default_value = 1.0; wv.inputs["Distortion"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], wv.inputs["Vector"])
    gt = nt.nodes.new("ShaderNodeMath"); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5
    nt.links.new(wv.outputs["Fac"], gt.inputs[0])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'
    mx.inputs[6].default_value = (*_srgb(52, 54, 58), 1.0); mx.inputs[7].default_value = (*_srgb(250, 250, 250), 1.0)
    nt.links.new(gt.outputs[0], mx.inputs["Factor"]); nt.links.new(mx.outputs[2], bs.inputs["Base Color"])

    def zlift(Q, dz):
        Q = Q.copy(); Q[:, 2] += dz; return Q

    # ── edge lines, fast-lane dashes, box markings ───────────────────────────
    for side, nm in ((trk, "trk"), (gar, "gar")):
        inn = side[:, :2] + (P[:, :2] - side[:, :2]) / np.maximum(np.linalg.norm(P[:, :2] - side[:, :2], axis=1), 1e-6)[:, None] * 0.35
        L1 = np.c_[side[:, :2], side[:, 2] + 0.03]; L2 = np.c_[inn, side[:, 2] + 0.03]
        _strip_mesh(f"M2D_DayPitEdge_{nm}", L1, L2, m_w, coll)
    fast = P[:, :2] + (trk[:, :2] - P[:, :2]) * 0.15          # fast / working lane divide
    seglen = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P[:, :2], axis=0), axis=1))]
    on = (seglen % 12.0) < 6.0
    for k in range(1, len(P)):
        if on[k] and on[k - 1]:
            d = P[k, :2] - P[k - 1, :2]; d /= max(np.linalg.norm(d), 1e-6); nrm = np.array([-d[1], d[0]])
            q = (fast[k] + fast[k - 1]) * 0.5
            _box("M2D_DayPitDash", q[0], q[1], d, nrm, float(np.linalg.norm(fast[k] - fast[k - 1])), 0.3,
                 float(P[k, 2]) + 0.03, float(P[k, 2]) + 0.05, m_w, coll)
    boxes = 0
    for k in range(len(P)):
        if int(seglen[k] // 10.0) != int(seglen[k - 1] // 10.0) if k else False:
            d = P[min(k + 1, len(P) - 1), :2] - P[k - 1, :2]; d /= max(np.linalg.norm(d), 1e-6)
            g = gar[k, :2]; v = (P[k, :2] - g); v /= max(np.linalg.norm(v), 1e-6)
            q = g + v * (w * 0.22)
            _box("M2D_DayPitBox", q[0], q[1], d, v, 0.3, w * 0.4, float(P[k, 2]) + 0.03, float(P[k, 2]) + 0.05, m_w, coll)
            boxes += 1
    # ── pit wall on the track side ────────────────────────────────────────────
    d_out = (trk[:, :2] - P[:, :2]); d_out /= np.maximum(np.linalg.norm(d_out, axis=1), 1e-6)[:, None]
    W0 = trk[:, :2] + d_out * 0.4; W1 = trk[:, :2] + d_out * 1.3
    verts, faces = [], []
    for k in range(len(P)):
        z = float(trk[k, 2])
        verts += [(W0[k, 0], W0[k, 1], z), (W1[k, 0], W1[k, 1], z), (W0[k, 0], W0[k, 1], z + 1.3), (W1[k, 0], W1[k, 1], z + 1.3)]
        if k:
            a = 4 * (k - 1)
            faces += [(a + 2, a + 3, a + 7, a + 6), (a, a + 4, a + 6, a + 2), (a + 1, a + 3, a + 7, a + 5)]
    wo = _runtime_mesh("M2D_DayPitWall", verts, faces, m_wall, coll)
    top = np.c_[(W0 + W1) * 0.5, trk[:, 2] + 1.32]
    _strip_mesh("M2D_DayPitWallTop", _offset_line(top, 0.5), _offset_line(top, -0.5), m_top, coll)
    for o in sc.objects:
        if o.name.split('.')[0] == "M2D_PitSep":
            o.hide_render = True

    # ── entry / exit: where the lane converges on the track, hatch the gap ─────
    kd = mathutils.kdtree.KDTree(m)
    for i_, p in enumerate(C):
        kd.insert((p[0], p[1], 0.0), i_)
    kd.balance()
    dist = np.array([kd.find((p[0], p[1], 0.0))[2] for p in P])
    par = dist >= dist.max() - 2.5                        # the parallel section
    ks = np.where(par)[0]; k_in, k_out = int(ks.min()), int(ks.max())
    gore = 0
    for rng in (range(0, k_in + 1), range(k_out, len(P))):
        rng = list(rng)
        if len(rng) < 2:
            continue
        G = trk[rng].copy()
        E = []
        for k in rng:
            ii_ = kd.find((trk[k, 0], trk[k, 1], 0.0))[1]
            e = F["Lv"][ii_] if np.linalg.norm(F["Lv"][ii_, :2] - trk[k, :2]) < np.linalg.norm(F["Rv"][ii_, :2] - trk[k, :2]) else F["Rv"][ii_]
            E.append(e)
        E = np.array(E); E[:, 2] = np.minimum(E[:, 2], G[:, 2]) - 0.005
        _strip_mesh("M2D_DayGore", zlift(G, 0.02), zlift(E, 0.02), m_gore, coll); gore += len(rng)
    # wall only along the parallel section
    for o in list(sc.objects):
        if o.name.split('.')[0] in ("M2D_DayPitWall", "M2D_DayPitWallTop"):
            bpy.data.objects.remove(o, do_unlink=True)
    sl = slice(k_in, k_out + 1)
    verts, faces = [], []
    for q, k in enumerate(range(k_in, k_out + 1)):
        z = float(trk[k, 2])
        verts += [(W0[k, 0], W0[k, 1], z), (W1[k, 0], W1[k, 1], z), (W0[k, 0], W0[k, 1], z + 1.3), (W1[k, 0], W1[k, 1], z + 1.3)]
        if q:
            a = 4 * (q - 1)
            faces += [(a + 2, a + 3, a + 7, a + 6), (a, a + 4, a + 6, a + 2), (a + 1, a + 3, a + 7, a + 5)]
    _runtime_mesh("M2D_DayPitWall", verts, faces, m_wall, coll)
    _strip_mesh("M2D_DayPitWallTop", _offset_line(top[sl], 0.5), _offset_line(top[sl], -0.5), m_top, coll)
    # speed-limit lines across the lane at both ends of the parallel section
    m_y = _runtime_flat("M2D_DayPitLimit", (*_srgb(240, 200, 40), 1.0))
    for k in (k_in, k_out):
        d = P[min(k + 1, len(P) - 1), :2] - P[max(k - 1, 0), :2]; d /= max(np.linalg.norm(d), 1e-6)
        v = gar[k, :2] - trk[k, :2]; wl = float(np.linalg.norm(v)); v /= max(wl, 1e-6)
        q = (trk[k, :2] + gar[k, :2]) * 0.5 + v * 1.5
        _box("M2D_DayPitLimit", q[0], q[1], d, v, 1.2, wl + 3.0, float(P[k, 2]) + 0.04, float(P[k, 2]) + 0.06, m_y, coll)
    # working lane: widen the lane 3 m towards the garages
    Gw = gar.copy(); gv = gar[:, :2] - trk[:, :2]; gv /= np.maximum(np.linalg.norm(gv, axis=1), 1e-6)[:, None]
    Gw[:, :2] = gar[:, :2] + gv * 3.0
    _strip_mesh("M2D_DayPitWork", zlift(gar, -0.005), zlift(Gw, -0.005), bpy.data.materials.get("M2D_PitMat"), coll)
    notes = [f"gore hatch {gore} samples", f"parallel {k_in}-{k_out}"]
    return f"pit lane: entry/exit ({', '.join(notes)}), wall 1.3 m, edge lines, fast-lane dashes, {boxes} box marks"


def _axis_u(nt, ang, scale_m):
    """World position rotated so X runs along a building's long axis, divided by scale."""
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, -ang); mp.inputs["Scale"].default_value = (1 / scale_m,) * 3
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    sp = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(mp.outputs["Vector"], sp.inputs["Vector"])
    return sp, geo


def _day_buildings(sc, log):
    """Facades that read as architecture at 1.6 m/px, all in the shader:
      * pit building: team garages facing the lane — 12 m bays, dark door 0–4.5 m, a
        team-colour fascia band above, a glazed hospitality band at the top;
      * grandstands: vertical fins every 4 m on the sides;
      * OSM buildings: dark window bands every 3.6 m on the sides, gravel roofs with a
        faint panel grid."""
    notes = []
    def bld_axis(o):
        W = np.array([list(o.matrix_world @ v.co) for v in o.data.vertices])
        u = _principal_xy(W); return math.atan2(u[1], u[0]), float(W[:, 2].min())

    pit = sc.objects.get("M2D_PitBuilding")
    if pit is not None and not pit.hide_render:
        ang, z0 = bld_axis(pit)
        m = _runtime_flat("M2D_DayPitFacade", (*_srgb(236, 236, 234), 1.0))
        nt = m.node_tree; bs = _bsdf(m)
        sp, geo = _axis_u(nt, ang, 12.0)
        bay = nt.nodes.new("ShaderNodeMath"); bay.operation = 'FRACT'; nt.links.new(sp.outputs["X"], bay.inputs[0])
        door = nt.nodes.new("ShaderNodeMath"); door.operation = 'LESS_THAN'; door.inputs[1].default_value = 0.78
        nt.links.new(bay.outputs[0], door.inputs[0])
        gz = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], gz.inputs["Vector"])
        zr = nt.nodes.new("ShaderNodeMath"); zr.operation = 'SUBTRACT'; zr.inputs[1].default_value = z0
        nt.links.new(gz.outputs["Z"], zr.inputs[0])
        def band(lo, hi):
            a = nt.nodes.new("ShaderNodeMath"); a.operation = 'GREATER_THAN'; a.inputs[1].default_value = lo
            b = nt.nodes.new("ShaderNodeMath"); b.operation = 'LESS_THAN'; b.inputs[1].default_value = hi
            nt.links.new(zr.outputs[0], a.inputs[0]); nt.links.new(zr.outputs[0], b.inputs[0])
            mm = nt.nodes.new("ShaderNodeMath"); mm.operation = 'MULTIPLY'
            nt.links.new(a.outputs[0], mm.inputs[0]); nt.links.new(b.outputs[0], mm.inputs[1]); return mm.outputs[0]
        low = band(-1.0, 4.5); fas = band(4.5, 5.6); glz = band(5.9, 7.2)
        dm = nt.nodes.new("ShaderNodeMath"); dm.operation = 'MULTIPLY'
        nt.links.new(low, dm.inputs[0]); nt.links.new(door.outputs[0], dm.inputs[1])
        # team colour per bay (pair of bays share a team)
        fl = nt.nodes.new("ShaderNodeMath"); fl.operation = 'FLOOR'; nt.links.new(sp.outputs["X"], fl.inputs[0])
        hf = nt.nodes.new("ShaderNodeMath"); hf.operation = 'DIVIDE'; hf.inputs[1].default_value = 2.0
        nt.links.new(fl.outputs[0], hf.inputs[0])
        fl2 = nt.nodes.new("ShaderNodeMath"); fl2.operation = 'FLOOR'; nt.links.new(hf.outputs[0], fl2.inputs[0])
        wn = nt.nodes.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = '1D'
        nt.links.new(fl2.outputs[0], wn.inputs["W"])
        rp = nt.nodes.new("ShaderNodeValToRGB"); rp.color_ramp.interpolation = 'CONSTANT'
        team = [(200, 30, 40), (20, 40, 120), (0, 150, 140), (240, 130, 20), (30, 100, 220), (0, 110, 70),
                (230, 230, 230), (30, 30, 35), (120, 170, 230), (180, 20, 60)]
        els = rp.color_ramp.elements
        els[0].position = 0.0; els[0].color = (*_srgb(*team[0]), 1.0)
        els[1].position = 0.1; els[1].color = (*_srgb(*team[1]), 1.0)
        for q, c in enumerate(team[2:], start=2):
            e = els.new(q / len(team)); e.color = (*_srgb(*c), 1.0)
        nt.links.new(wn.outputs["Value"], rp.inputs["Fac"])
        col = nt.nodes.new("ShaderNodeMix"); col.data_type = 'RGBA'
        col.inputs[6].default_value = (*_srgb(236, 236, 234), 1.0); col.inputs[7].default_value = (*_srgb(44, 46, 50), 1.0)
        nt.links.new(dm.outputs[0], col.inputs["Factor"])
        c2 = nt.nodes.new("ShaderNodeMix"); c2.data_type = 'RGBA'
        nt.links.new(fas, c2.inputs["Factor"]); nt.links.new(col.outputs[2], c2.inputs[6]); nt.links.new(rp.outputs["Color"], c2.inputs[7])
        c3 = nt.nodes.new("ShaderNodeMix"); c3.data_type = 'RGBA'
        nt.links.new(glz, c3.inputs["Factor"]); nt.links.new(c2.outputs[2], c3.inputs[6])
        c3.inputs[7].default_value = (*_srgb(58, 78, 96), 1.0)
        nt.links.new(c3.outputs[2], bs.inputs["Base Color"])
        me = pit.data
        for i, ms in enumerate(pit.material_slots):
            if ms.material and ms.material.name in ("M2D_BSide", "M2D_PitGlass"):
                me.materials[i] = m
        notes.append("pit: garages + team fascia + glazing")

    # grandstand sides: fins
    m_st = _runtime_flat("M2D_DayStandSide", (*_srgb(214, 214, 212), 1.0))
    n_st = 0
    for o in sc.objects:
        base = o.name.split('.')[0]
        if o.type != 'MESH' or o.hide_render or not base.startswith("M2D_Stand_") or base.endswith(("_RoofDeck", "_RoofTruss")):
            continue
        for i, ms in enumerate(o.material_slots):
            if ms.material and ms.material.name == "M2D_BSide":
                o.data.materials[i] = m_st
        n_st += 1
    nt = m_st.node_tree; bs = _bsdf(m_st)
    geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 4.0,) * 3
    nt.links.new(geo.outputs["Position"], mp.inputs["Vector"])
    for ax in ("X", "Y"):
        pass
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.wave_type = 'BANDS'; wv.bands_direction = 'DIAGONAL'
    wv.wave_profile = 'SAW'; wv.inputs["Scale"].default_value = 1.0; wv.inputs["Distortion"].default_value = 0.0
    nt.links.new(mp.outputs["Vector"], wv.inputs["Vector"])
    g = nt.nodes.new("ShaderNodeMath"); g.operation = 'GREATER_THAN'; g.inputs[1].default_value = 0.7
    nt.links.new(wv.outputs["Fac"], g.inputs[0])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'
    mx.inputs[6].default_value = (*_srgb(214, 214, 212), 1.0); mx.inputs[7].default_value = (*_srgb(120, 124, 130), 1.0)
    nt.links.new(g.outputs[0], mx.inputs["Factor"]); nt.links.new(mx.outputs[2], bs.inputs["Base Color"])
    notes.append(f"stands: finned sides on {n_st}")

    # OSM fabric: window bands + roof grid
    m = bpy.data.materials.get("M2D_BSideOSM"); bs = _bsdf(m)
    if bs:
        nt = m.node_tree
        c = bs.inputs["Base Color"].default_value[:3]
        geo = nt.nodes.new("ShaderNodeNewGeometry"); sp = nt.nodes.new("ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Position"], sp.inputs["Vector"])
        dv = nt.nodes.new("ShaderNodeMath"); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 3.6
        nt.links.new(sp.outputs["Z"], dv.inputs[0])
        fr = nt.nodes.new("ShaderNodeMath"); fr.operation = 'FRACT'; nt.links.new(dv.outputs[0], fr.inputs[0])
        a = nt.nodes.new("ShaderNodeMath"); a.operation = 'GREATER_THAN'; a.inputs[1].default_value = 0.35
        b = nt.nodes.new("ShaderNodeMath"); b.operation = 'LESS_THAN'; b.inputs[1].default_value = 0.75
        nt.links.new(fr.outputs[0], a.inputs[0]); nt.links.new(fr.outputs[0], b.inputs[0])
        mm = nt.nodes.new("ShaderNodeMath"); mm.operation = 'MULTIPLY'
        nt.links.new(a.outputs[0], mm.inputs[0]); nt.links.new(b.outputs[0], mm.inputs[1])
        mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = 'RGBA'
        mx.inputs[6].default_value = (*c, 1.0); mx.inputs[7].default_value = (*_srgb(62, 76, 90), 1.0)
        nt.links.new(mm.outputs[0], mx.inputs["Factor"]); nt.links.new(mx.outputs[2], bs.inputs["Base Color"])
        notes.append("OSM: window bands 3.6 m")
    m = bpy.data.materials.get("M2D_BTopOSM"); bs = _bsdf(m)
    if bs:
        nt = m.node_tree
        src = next((l.from_socket for l in nt.links if l.to_node == bs and l.to_socket.name == "Base Color"), None)
        br = nt.nodes.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 1.0
        geo = nt.nodes.new("ShaderNodeNewGeometry"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 8.0,) * 3
        nt.links.new(geo.outputs["Position"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], br.inputs["Vector"])
        br.inputs["Color1"].default_value = (1, 1, 1, 1); br.inputs["Color2"].default_value = (1, 1, 1, 1)
        br.inputs["Mortar"].default_value = (0.86, 0.86, 0.86, 1); br.inputs["Mortar Size"].default_value = 0.02
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs["Factor"].default_value = 1.0
        if src is not None:
            nt.links.new(src, mul.inputs[6])
        else:
            mul.inputs[6].default_value = tuple(bs.inputs["Base Color"].default_value)
        nt.links.new(br.outputs["Color"], mul.inputs[7]); nt.links.new(mul.outputs[2], bs.inputs["Base Color"])
        notes.append("roof panel grid 8 m")
    return "buildings: " + "; ".join(notes)


def _day_widen_pit(sc, log, extra_m=5.0, keep_gap_m=3.0):
    """Map legibility: at 1.6 m/px the 7 m lane is 4 px and vanishes beside the white
    pit building. Push its track-side edge up to `extra_m` towards the circuit, never
    closer than `keep_gap_m` to the track edge (so the ends still merge cleanly)."""
    pl = sc.objects.get("M2D_PitLane"); F = _ribbon_frame(sc)
    if pl is None or F is None:
        return "pit widen: skipped"
    import mathutils
    me = pl.data; n = len(me.vertices)
    mw = pl.matrix_world; mi = mw.inverted()
    W = np.array([list(mw @ v.co) for v in me.vertices])
    A, B = W[0::2], W[1::2]
    C = F["C"]; half = F["half"]
    kd = mathutils.kdtree.KDTree(len(C))
    for i, p in enumerate(C):
        kd.insert((p[0], p[1], 0.0), i)
    kd.balance()
    dA = np.mean([kd.find((p[0], p[1], 0.0))[2] for p in A]); dB = np.mean([kd.find((p[0], p[1], 0.0))[2] for p in B])
    tr_off = 0 if dA < dB else 1
    moved = []
    for k in range(len(A)):
        t = W[2 * k + tr_off]; g = W[2 * k + 1 - tr_off]
        _, i, d = kd.find((t[0], t[1], 0.0))
        gap = d - half[i]
        mv = float(np.clip(gap - keep_gap_m, 0.0, extra_m))
        u = (t[:2] - g[:2]); u /= max(np.linalg.norm(u), 1e-6)
        t2 = t.copy(); t2[:2] += u * mv
        me.vertices[2 * k + tr_off].co = mi @ mathutils.Vector(t2)
        moved.append(mv)
    me.update()
    for o in sc.objects:                                   # the old separator line sits in the new lane
        if o.name.split('.')[0] == "M2D_PitSep":
            o.hide_render = True
    return f"pit widen: track-side edge moved up to {max(moved):.1f} m (mean {np.mean(moved):.1f} m)"


def _day_pass(sc, track, ground, log):
    """Level 10: turn the processed slate scene into a daylight broadcast aerial and
    take out the small-object noise."""
    hid = 0
    for o in sc.objects:
        if o.name.split('.')[0].startswith(_DAY_HIDE) and not o.hide_render:
            o.hide_render = True; hid += 1
    log.append(_day_light(sc))
    log.append(_day_terrain(sc, log))
    D = _DAY; n = 0
    for name, rgb, kw in (
            ("M2D_Track", D["asphalt"], dict(noise_m=3.0, lo=0.90, hi=1.10, rough=0.85)),
            ("M2D_Rubber", D["rubber"], dict(noise_m=6.0, lo=0.92, hi=1.08)),
            ("M2D_PitMat", D["pit"], dict(noise_m=4.0)),
            ("M2D_Edge", D["line"], {}), ("M2D_Line", D["line"], {}), ("M2D_White", D["line"], {}),
            ("M2D_GridBox", D["line"], {}),
            ("M2D_Road", D["ring"], {}),
            ("M2D_M2D_Park", D["lot"], dict(noise_m=30.0, lo=0.95, hi=1.04)),
            ("M2D_M2D_Aero", D["lot"], {}),
            ("M2D_M2D_Water", D["water"], {}),
            ("M2D_BTopOSM", D["roof_osm"], dict(noise_m=60.0, lo=0.90, hi=1.06)),
            ("M2D_BSideOSM", D["side_osm"], {}),
            ("M2D_BTop", D["roof"], {}), ("M2D_BSide", D["side"], {}),
            ("M2D_PitTop", D["pit_roof"], {}), ("M2D_PaddockTop", D["paddock_roof"], {})):
        n += _day_flat(name, rgb, **kw)
    for m in bpy.data.materials:
        if m.name.startswith("M2D_M2D_Rd_"):
            n += _day_flat(m.name, D["road"])
    b = _bsdf(bpy.data.materials.get("M2D_KerbStripe"))
    if b and "Emission Strength" in b.inputs:
        b.inputs["Emission Strength"].default_value = 0.0
    # Stands: the crowd atlas at 55 % over blue-grey seat stripes reads as an empty
    # grey slab in daylight. Crowd to 85 % and warmer seats, so stands read occupied.
    ns = 0
    for m in bpy.data.materials:
        if not m.name.startswith("M2D_Seats"):
            continue
        for nd in m.node_tree.nodes:
            if nd.type == 'MIX' and nd.data_type == 'RGBA' and not nd.inputs["Factor"].is_linked:
                nd.inputs["Factor"].default_value = 0.85
            if nd.type == 'VALTORGB':
                nd.color_ramp.elements[0].color = (*_srgb(70, 78, 104), 1.0)
                nd.color_ramp.elements[1].color = (*_srgb(176, 64, 58), 1.0)
        ns += 1
    log.append(f"day stands: crowd 85 % on {ns} seat material(s)")
    log.append(_day_widen_pit(sc, log))
    log.append(_day_runoff(sc, log))
    log.append(_day_tower(sc, log))
    F = _ribbon_frame(sc)
    if F is not None:
        trees = _terrain_bvh(sc)
        log.append(_day_canopies(sc, log, F))
        log.append(_day_mosaic(sc, log, F, trees))
        log.append(_day_pond(sc, log, F, trees))
        log.append(_day_pitlane(sc, log, F))
        log.append(_day_buildings(sc, log))
    return f"day: {n} materials re-toned, {hid} noise objects hidden (marshal posts, glow, minor roads, vignette)"


OFFPLATE_PREFIXES = ("M2D_Rd_", "M2D_Buildings", "M2D_BuildSh", "M2D_Park",
                     "M2D_Stream", "M2D_Water", "M2D_Trees")


def _world_xy(o):
    n = len(o.data.vertices)
    co = np.empty(n * 3, np.float64)
    o.data.vertices.foreach_get("co", co)
    m = np.array(o.matrix_world)
    return (co.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3])[:, :2]


def _cull_offplate(sc, log, cell=25.0):
    """Hide OSM environment geometry that falls outside the terrain plate.

    The OSM layers are built over a larger extent than the terrain mesh, so roads and
    city blocks spill past the plate edge onto the background. On the dark look this
    was invisible; on a light map it is a street grid floating in empty space.
    Circuit furniture (ribbon, kerbs, run-off, pit, grandstands) is never touched —
    it sits well inside the plate by construction.
    """
    pts = [_world_xy(o) for o in sc.objects
           if o.type == 'MESH' and o.name.startswith("M2D_Terrain")]
    if not pts:
        log.append("offplate: NO TERRAIN — cull skipped")
        return
    P = np.vstack(pts)
    x0, y0 = P[:, 0].min(), P[:, 1].min()
    nx = int((P[:, 0].max() - x0) / cell) + 2
    ny = int((P[:, 1].max() - y0) / cell) + 2
    g = np.zeros((nx, ny), bool)
    g[((P[:, 0] - x0) / cell).astype(int), ((P[:, 1] - y0) / cell).astype(int)] = True
    # Terrain vertices sit ~8 m apart, so a 25 m cell is dense — but close pinholes
    # anyway, otherwise the cull nibbles holes in roads that are legitimately inside.
    g |= (np.roll(g, 1, 0) & np.roll(g, -1, 0)) | (np.roll(g, 1, 1) & np.roll(g, -1, 1))

    def inside(xy):
        ix = np.clip(((xy[:, 0] - x0) / cell).astype(int), 0, nx - 1)
        iy = np.clip(((xy[:, 1] - y0) / cell).astype(int), 0, ny - 1)
        ok = g[ix, iy]
        ok &= (xy[:, 0] >= x0) & (xy[:, 1] >= y0)
        return ok

    import bmesh
    hidden = trimmed = 0
    for o in list(sc.objects):
        if (o.type != 'MESH' or o.hide_render
                or not o.name.startswith(OFFPLATE_PREFIXES)):
            continue
        ok = inside(_world_xy(o))
        if ok.all():
            continue                       # wholly on the plate — the common case
        if not ok.any():
            o.hide_render = True; hidden += 1
            continue
        bm = bmesh.new(); bm.from_mesh(o.data)   # straddles the edge: trim per face
        mw = o.matrix_world
        far = [f for f in bm.faces
               if not inside(np.array([(mw @ f.calc_center_median())[:2]]))[0]]
        if far:
            bmesh.ops.delete(bm, geom=far, context='FACES')
            bm.to_mesh(o.data); trimmed += len(far)
        bm.free()
    log.append(f"offplate: hid {hidden} object(s), trimmed {trimmed} face(s)")


def apply_camera_fit(sc, track, fits_path, log):
    """Move the camera to the per-track fit computed by blender/fit_cameras.py.

    The pipeline hard-wires yaw to 0 for every circuit, which wastes the 16:9 frame on
    north-south tracks. fit_cameras.py solves a yaw + distance per track against the
    same UI safe box and emits the matching bridge; here we only apply the transform.

    The sun is yawed by the SAME angle. It sits at a fixed world rotation, so without
    this the light would arrive from a different screen direction on every circuit and
    the 24 maps would stop looking like one set.
    """
    import json
    with open(fits_path) as fh:
        fits = json.load(fh)
    f = fits.get(track)
    if f is None:
        raise RuntimeError(f"{fits_path} has no fit for '{track}' "
                           f"(have {len(fits)}: {sorted(fits)[:5]}…)")
    cam = sc.camera
    if cam is None:
        raise RuntimeError(f"{sc.name}: no active camera to re-fit")
    yaw = math.radians(f["yaw_deg"])
    cam.location = tuple(f["eye"])
    cam.rotation_mode = 'XYZ'   # fit_cameras.basis() assumes R = Rz(yaw) @ Rx(tilt)
    cam.rotation_euler = (math.radians(f["tilt_deg"]), 0.0, yaw)
    cam.data.lens = f["lens"]
    for o in sc.objects:
        if o.type == 'LIGHT':
            e = o.rotation_euler
            o.rotation_euler = (e[0], e[1], e[2] + yaw)
    log.append(f"camera: yaw {f['yaw_deg']:+.0f}° tilt {f['tilt_deg']:.0f}° "
               f"eye ({f['eye'][0]:.0f}, {f['eye'][1]:.0f}, {f['eye'][2]:.0f}); "
               f"sun yawed to match")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    track, out_png = argv[0], argv[1]
    level = int(argv[2]) if len(argv) > 2 else 0
    fits_path = argv[3] if len(argv) > 3 else None
    if level not in LEVELS:
        raise RuntimeError(f"declutter level must be one of {sorted(LEVELS)}, got {level}")

    want = track.upper() + "_Map2D"
    sc = bpy.data.scenes.get(want)
    if sc is None:
        sc = next((s for s in bpy.data.scenes if s.name.lower() == want.lower()), None)
    if sc is None:
        raise RuntimeError(
            f"no saved Map2D scene '{want}' in this blend "
            f"(have: {[s.name for s in bpy.data.scenes]}) — "
            f"it must be built once by map2d_batch.py first")

    log = []
    hidden = 0
    for o in sc.objects:
        if o.name.startswith(OVERLAY_PREFIXES):
            o.hide_render = True
            hidden += 1
    if hidden == 0:
        raise RuntimeError(f"{sc.name}: found no overlay objects to hide — "
                           f"prefixes changed? refusing to ship an unverified render")
    print(f"CLEAN: hid {hidden} overlay objects in {sc.name}", flush=True)

    # Camera first: the building cull measures distance in WORLD metres, so it is
    # independent of framing, but doing the move up front keeps the log readable.
    if fits_path:
        apply_camera_fit(sc, track, fits_path, log)

    cfg = LEVELS[level]
    if cfg:
        declutter(sc, cfg, log, track)
    # Candidate-only art pass. Keep the shipped batch look unchanged unless requested.
    if os.environ.get("M2D_NIGHT_RIBBON") == "1":
        if track.lower() not in NIGHT_RACES or level != 9:
            raise RuntimeError("M2D_NIGHT_RIBBON requires a level-9 night circuit")
        asphalt = _bsdf(bpy.data.materials.get("M2D_Track"))
        if asphalt is None:
            raise RuntimeError("night ribbon candidate has no M2D_Track material")
        asphalt.inputs["Base Color"].default_value = (*_srgb(118, 124, 134), 1.0)
        asphalt.inputs["Roughness"].default_value = 0.82
        asphalt.inputs["Emission Strength"].default_value = 0.03
        for material_name, strength in (("M2D_Edge", 0.38), ("M2D_Line", 0.28),
                                        ("M2D_White", 0.3), ("M2D_KerbStripe", 0.12)):
            shader = _bsdf(bpy.data.materials.get(material_name))
            if shader:
                shader.inputs["Emission Strength"].default_value = strength
        log.append("candidate night ribbon: graphite asphalt, matte surface, low edge emission; floodlights retained")
    for line in log:
        print("  DECL:", line, flush=True)
    if cfg:
        print(f"CLEAN: declutter level {level} ({cfg['name']})", flush=True)

    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.resolution_percentage = int(os.environ.get("M2D_PCT", "100"))  # preview only; ship at 100
    sc.render.image_settings.file_format = 'PNG'
    try:
        sc.eevee.taa_render_samples = SAMPLES
    except AttributeError:
        pass  # non-EEVEE engine; leave sampling alone
    if os.environ.get("M2D_ZOOM"):
        # preview only: "x,y,lens_factor" — aim the same camera at a world point, zoomed
        zx, zy, zf = (float(v) for v in os.environ["M2D_ZOOM"].split(","))
        cam = sc.camera
        d = mathutils.Vector((zx, zy, 0.0)) - cam.location
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens *= zf
        for n_ in ("M2D_TiltBlur", "M2D_TiltFeather"):
            ng_ = getattr(sc, "compositing_node_group", None) or getattr(sc, "node_tree", None)
            if ng_ and n_ in ng_.nodes:
                ng_.nodes[n_].mute = True
    sc.render.filepath = out_png
    bpy.ops.render.render(write_still=True, scene=sc.name)
    print("CLEAN_OK", track, out_png, flush=True)


try:
    main()
except Exception:
    traceback.print_exc()
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["?"]
    print("CLEAN_FAIL", argv[0], flush=True)
    sys.exit(1)
