"""Paginate the full TrustMRR /api/v1/startups dataset, cache to data/raw/."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()
KEY = os.environ["TRUSTMRR_API_KEY"]
BASE = "https://trustmrr.com/api/v1/startups"
RATE_SLEEP = 3.2  # 20 req/min limit, leave headroom
PAGE_LIMIT = 50

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)
OUT = RAW / "trustmrr_startups.json"


def fetch_all() -> list[dict]:
    if OUT.exists():
        cached = json.loads(OUT.read_text())
        print(f"[trustmrr] cache hit: {len(cached)} startups", file=sys.stderr)
        return cached

    headers = {"Authorization": f"Bearer {KEY}", "Accept": "application/json"}
    all_items: list[dict] = []
    page = 1
    with httpx.Client(timeout=20.0, headers=headers) as client:
        while True:
            r = client.get(BASE, params={"page": page, "limit": PAGE_LIMIT})
            r.raise_for_status()
            payload = r.json()
            data = payload["data"]
            meta = payload["meta"]
            all_items.extend(data)
            print(
                f"[trustmrr] page {page}/{(meta['total'] + PAGE_LIMIT - 1) // PAGE_LIMIT} "
                f"items={len(data)} total_fetched={len(all_items)}/{meta['total']}",
                file=sys.stderr,
            )
            if not meta.get("hasMore"):
                break
            page += 1
            time.sleep(RATE_SLEEP)

    OUT.write_text(json.dumps(all_items, ensure_ascii=False))
    print(f"[trustmrr] wrote {OUT} ({len(all_items)} startups)", file=sys.stderr)
    return all_items


if __name__ == "__main__":
    fetch_all()
