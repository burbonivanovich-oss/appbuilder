#!/usr/bin/env python3
"""fit_cameras.py — per-track camera fit for the 2.5D Race View maps.

The shipped pipeline (map2d_pass.py) fits every circuit with the SAME compass
direction — `cam.rotation_euler = (tilt, 0, 0)`, yaw hard-wired to zero. That wastes
the 16:9 frame on circuits whose long axis runs north-south: Jeddah spans the full
height of the UI-safe box but only 13.6% of its width.

This picks a yaw per track so the circuit's long axis lies along the frame's wide
axis, then re-solves distance and offset so the track fills the safe box.

Runs OUTSIDE Blender (plain numpy). Writes camera_fits.json for map2d_clean_batch.py
to apply, and regenerates each *_bridge.json — merging the new `centerline_px` with
the shipped `overtake_zones`, which are lap fractions and therefore camera-independent
but MUST be carried over (scripts/trackdata/export_zones.py writes them after the
render, and a naive rewrite would silently drop them).

The projection model here is the pipeline's, verified against the shipped bridges to
0.009 px before this script was written.

    python3 blender/fit_cameras.py            # dry run: report only
    python3 blender/fit_cameras.py --write    # write camera_fits.json + bridges
"""
import json, math, os, sys, argparse
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.path.join(ROOT, "scripts/trackdata/geo")
TRACKMAPS = os.path.join(ROOT, "F1Manager2027-Unity/Assets/Resources/TrackMaps")
FITS = os.path.join(ROOT, "blender/camera_fits.json")

# Frame + UI safe box — must match map2d_pass.py and map2d_clean_batch.py.
W, H = 1600, 900
# MEASURED off the live race screen (Resources/APEX/uxml/race.uxml + uss/race.uss),
# not guessed: at 1920x1080 the timing tower ends at 15.2% of width, the right column
# starts at 17.2% from the right, the top chips end at 4.4% of height and the driver
# cards start 19.8% up from the bottom. Each side carries ~2% of padding on top.
# The old bottom figure was 5% — reserved for a "race-control strip" that no longer
# exists — while the cards actually eat a fifth of the screen, which is exactly where
# the UI was landing on the racing line.
# CHANGING A CARD'S SIZE MEANS CHANGING THESE AND RE-RUNNING:
#   python3 blender/fit_cameras.py --write && blender/render_clean_maps.sh 2
UI_L, UI_R, UI_T, UI_B = 0.175, 0.195, 0.065, 0.220
LENS, SENSOR = 44.0, 36.0
TILT_DEG = 47.0
# Fit the CENTRELINE to this fraction of the safe box; the drawn ribbon is wider than
# its centreline and carries an edge glow, so the slack is what keeps the ribbon itself
# out of the rails. 0.90 is the pipeline's value, kept so the rails stay as clean.
MARGIN = 0.90
# The 2.5D map draws the circuit FLATTENED onto a plane (M2D_Asphalt sits at a constant
# z ≈ 0.08–0.10 m in every blend), but the geo centreline carries real elevation — up to
# 41 m at Monaco, 100 m+ at Spa. Projecting the elevated curve puts the bridge above the
# ribbon it is supposed to trace: measured on Monaco, only 69.9% of the SHIPPED bridge's
# points landed on the drawn track. Flattening to the ribbon plane puts it at 100%.
# This defect predates the camera work — map2d_pass.py has always projected the elevated
# curve — and is why the live car dots ran beside the track on hilly circuits.
RIBBON_Z = 0.08


def centerline(geo_json, N=2200):
    """Arc-length resample of the geo centreline — mirrors map2d_pass.centerline."""
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
    return outp, total


def basis(tilt, yaw):
    """Camera axes for Blender euler XYZ = (tilt, 0, yaw), i.e. R = Rz(yaw) @ Rx(tilt)."""
    st, ct = math.sin(tilt), math.cos(tilt)
    sy_, cy_ = math.sin(yaw), math.cos(yaw)
    fwd = np.array([-sy_ * st,  cy_ * st, -ct])
    up = np.array([-sy_ * ct,  cy_ * ct,  st])
    right = np.array([cy_, sy_, 0.0])
    return fwd, up, right


def half_fov():
    aspect = W / H
    sy = math.tan(math.atan2(SENSOR / 2, LENS))
    sx = sy
    if aspect >= 1.0:
        sy = sx / aspect
    else:
        sx = sy * aspect
    return sx, sy


def project(C, eye, fwd, up, right):
    sx, sy = half_fov()
    V = C - eye
    z = V @ fwd
    su = (V @ right) / np.maximum(z, 1e-6) / sx
    sv = (V @ up) / np.maximum(z, 1e-6) / sy
    return su, sv, z


def best_yaw(C, tilt):
    """Yaw that lets the circuit fill the safe box best.

    The bbox metric is symmetric under a 180 deg turn, but a map that reads upside-down
    against the shape players know is worse than one that does not — so of the two
    equivalent solutions take the smaller turn away from the canonical orientation.
    """
    xy = C[:, :2] - C[:, :2].mean(0)
    ct = math.cos(tilt)
    bw = (1 - UI_L - UI_R) * W
    bh = (1 - UI_T - UI_B) * H

    def scale_at(deg):
        a = math.radians(deg); c, s = math.cos(a), math.sin(a)
        u = xy[:, 0] * c + xy[:, 1] * s
        v = (-xy[:, 0] * s + xy[:, 1] * c) * ct
        return min(bw / max(u.max() - u.min(), 1e-6),
                   bh / max(v.max() - v.min(), 1e-6))

    best = max(range(180), key=scale_at)
    return min([best, best - 180], key=abs)


def solve_camera(C, yaw_deg):
    """Distance + offset so the projected centreline centres and fills the safe box."""
    tilt = math.radians(TILT_DEG)
    yaw = math.radians(yaw_deg)
    fwd, up, right = basis(tilt, yaw)
    sx, sy = half_fov()

    # safe box in NDC (-1..1), y up
    bu0, bu1 = -1.0 + 2 * UI_L, 1.0 - 2 * UI_R
    bw0, bw1 = -1.0 + 2 * UI_B, 1.0 - 2 * UI_T
    BU, BW = (bu1 - bu0) / 2, (bw1 - bw0) / 2
    CU, CW = (bu0 + bu1) / 2, (bw0 + bw1) / 2

    G = C.mean(0)                      # ground target: centroid of the racing line
    span = float(np.ptp(C[:, :2], axis=0).max())
    dist = span * 1.6
    off = np.zeros(3)

    for _ in range(60):
        eye = G - fwd * dist + off
        su, sv, z = project(C, eye, fwd, up, right)
        if (z <= 0.1).any():
            dist *= 1.2
            continue
        # 1. recentre on the box centre
        du = CU - (su.min() + su.max()) / 2
        dw = CW - (sv.min() + sv.max()) / 2
        off = off - right * (du * sx * dist) - up * (dw * sy * dist)
        eye = G - fwd * dist + off
        su, sv, z = project(C, eye, fwd, up, right)
        # 2. rescale distance so the limiting half-extent hits MARGIN of the box.
        #    Unlike the pipeline's loop this can move the camera IN as well as out.
        k = max((su.max() - su.min()) / 2 / BU, (sv.max() - sv.min()) / 2 / BW)
        if abs(k - MARGIN) < 1e-4:
            break
        dist *= k / MARGIN

    eye = G - fwd * dist + off
    return eye, dist, (tilt, yaw)


def to_px(C, eye, tilt, yaw):
    fwd, up, right = basis(tilt, yaw)
    su, sv, _ = project(C, eye, fwd, up, right)
    return np.column_stack([su * 0.5 + 0.5, 0.5 - sv * 0.5])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true",
                    help="write camera_fits.json and rewrite the bridges")
    args = ap.parse_args()

    bx0, bx1 = UI_L, 1 - UI_R
    by0, by1 = UI_T, 1 - UI_B
    boxW, boxH = bx1 - bx0, by1 - by0

    tracks = sorted(f[:-9] for f in os.listdir(GEO) if f.endswith("_geo.json"))
    fits, rows, bad = {}, [], []
    for t in tracks:
        C, lap_m = centerline(os.path.join(GEO, f"{t}_geo.json"))
        C[:, 2] = RIBBON_Z          # trace the drawn ribbon, not the real hillside
        yaw_deg = best_yaw(C, math.radians(TILT_DEG))
        eye, dist, (tilt, yaw) = solve_camera(C, yaw_deg)
        px = to_px(C, eye, tilt, yaw)

        x0, x1 = px[:, 0].min(), px[:, 0].max()
        y0, y1 = px[:, 1].min(), px[:, 1].max()
        fill = max((x1 - x0) / boxW, (y1 - y0) / boxH) * 100
        viol = []
        if x0 < bx0: viol.append(f"L{(bx0-x0)*100:.1f}")
        if x1 > bx1: viol.append(f"R{(x1-bx1)*100:.1f}")
        if y0 < by0: viol.append(f"T{(by0-y0)*100:.1f}")
        if y1 > by1: viol.append(f"B{(y1-by1)*100:.1f}")
        if viol:
            bad.append((t, viol))

        # How BIG the circuit is drawn. `fill` above is capped by MARGIN on whichever
        # side is limiting, so it is the same 90% before and after and says nothing
        # about the gain. On-screen path length is rotation-invariant and is what the
        # player actually perceives as "the track is bigger".
        oldp = np.array(json.load(open(os.path.join(
            TRACKMAPS, f"{t}_bridge.json")))["centerline_px"], float)
        def path_px(p):
            q = p * [W, H]
            return float(np.sum(np.linalg.norm(np.diff(
                np.vstack([q, q[:1]]), axis=0), axis=1)))
        oldfill = path_px(oldp)
        fill_px = path_px(px)

        fits[t] = {
            "yaw_deg": float(yaw_deg),
            "tilt_deg": TILT_DEG,
            "eye": [float(v) for v in eye],
            "lens": LENS,
            "res": [W, H],
        }
        rows.append((t, oldfill, fill_px, fill, yaw_deg, " ".join(viol) or "-"))

    print(f"{'track':<13} {'drawn px':>9} {'->':>2} {'drawn px':>9} {'bigger':>7} "
          f"{'box fill':>8} {'yaw':>6}  safe-box")
    for t, o, n, fl, y, v in sorted(rows, key=lambda r: -(r[2] / r[1])):
        print(f"{t:<13} {o:9.0f} -> {n:9.0f} {n/o:6.2f}x {fl:7.1f}% {y:5.0f}°  {v}")
    print(f"\nmean on-screen size {np.mean([n/o for _, o, n, _, _, _ in rows]):.2f}x  |  "
          f"box fill {np.mean([r[3] for r in rows]):.1f}%")
    if bad:
        print(f"SAFE-BOX VIOLATIONS on {len(bad)}: {bad}")
        return 1
    print(f"safe box respected on all {len(rows)} tracks")

    if not args.write:
        print("\n(dry run — pass --write to emit camera_fits.json + bridges)")
        return 0

    json.dump(fits, open(FITS, "w"), indent=1)
    print(f"wrote {FITS}")

    kept = 0
    for t in tracks:
        C, lap_m = centerline(os.path.join(GEO, f"{t}_geo.json"))
        C[:, 2] = RIBBON_Z
        f_ = fits[t]
        px = to_px(C, np.array(f_["eye"]),
                   math.radians(f_["tilt_deg"]), math.radians(f_["yaw_deg"]))
        bp = os.path.join(TRACKMAPS, f"{t}_bridge.json")
        old = json.load(open(bp))
        new = dict(old)          # carry EVERY existing key, notably overtake_zones
        new["render"] = {"w": W, "h": H}
        new["ui_safe"] = {"l": UI_L, "r": UI_R, "t": UI_T, "b": UI_B}
        new["centerline_px"] = [[round(float(a), 5), round(float(b), 5)] for a, b in px]
        new["lap_m"] = float(np.sum(np.linalg.norm(
            np.diff(np.vstack([C[:, :2], C[:1, :2]]), axis=0), axis=1)))
        if "overtake_zones" in old:
            assert new["overtake_zones"] == old["overtake_zones"]
            kept += 1
        json.dump(new, open(bp, "w"))
    print(f"rewrote {len(tracks)} bridges; overtake_zones preserved on {kept}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
