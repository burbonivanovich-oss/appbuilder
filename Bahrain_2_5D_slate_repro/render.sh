#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLENDER_BIN="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
# LEVEL: 10 = "day" (дневной вид, по умолчанию), 9 = исходный "slate" (ночной)
LEVEL="${LEVEL:-10}"
OUT="${1:-$ROOT/output/bahrain_map.png}"
mkdir -p "$(dirname "$OUT")"
"$BLENDER_BIN" -b "$ROOT/blender/Bahrain_Map2D.blend" -P "$ROOT/blender/map2d_clean_batch.py" -- bahrain "$OUT" "$LEVEL" "$ROOT/blender/camera_fits.json"
printf 'Rendered (level %s): %s\n' "$LEVEL" "$OUT"
