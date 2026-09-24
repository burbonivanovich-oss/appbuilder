# map2d_batch.py — build the 2.5D Race View inside one track blend (background CLI).
# usage: Blender -b <Track_3D.blend> -P map2d_batch.py -- <track> <out_png>
import bpy, sys, os, traceback

SP = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:]
track, out_png = argv[0], argv[1]

try:
    ns = {}
    exec(open(SP + "/map2d_pass.py").read(), ns)
    rep = ns["build_map2d"](track, spread_cars=True, use_osm=True)
    print("BUILD:", rep, flush=True)
    sc = bpy.data.scenes[track.upper() + "_Map2D"]
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    sc.eevee.taa_render_samples = 32
    sc.render.filepath = out_png
    bpy.ops.render.render(write_still=True, scene=sc.name)
    bpy.ops.wm.save_mainfile()
    print("MAP2D_OK", track, flush=True)
except Exception:
    traceback.print_exc()
    print("MAP2D_FAIL", track, flush=True)
    sys.exit(1)
