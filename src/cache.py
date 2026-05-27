"""JSON file cache. One key = one file under data/raw/<namespace>/<key>.json."""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"


def _path(namespace: str, key: str) -> Path:
    safe = hashlib.sha1(key.encode("utf-8")).hexdigest()[:16]
    return RAW / namespace / f"{safe}.json"


def load(namespace: str, key: str, max_age_s: int | None = None) -> Any | None:
    p = _path(namespace, key)
    if not p.exists():
        return None
    if max_age_s is not None and (time.time() - p.stat().st_mtime) > max_age_s:
        return None
    try:
        with p.open() as f:
            return json.load(f)
    except json.JSONDecodeError:
        return None


def save(namespace: str, key: str, value: Any) -> None:
    p = _path(namespace, key)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w") as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
