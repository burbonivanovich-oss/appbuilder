"""Paginate the YC company directory (api.ycombinator.com/v0.1/companies)."""
from __future__ import annotations

import json
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = RAW / "yc_companies.json"
RAW.mkdir(parents=True, exist_ok=True)


def main():
    if OUT.exists():
        print(f"cache: {OUT}")
        return
    items: list[dict] = []
    with httpx.Client(timeout=20.0, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"}) as client:
        page = 1
        while True:
            url = f"https://api.ycombinator.com/v0.1/companies?page={page}"
            r = client.get(url)
            if r.status_code != 200:
                print(f"page {page}: HTTP {r.status_code}, stop")
                break
            data = r.json()
            comps = data.get("companies", [])
            items.extend(comps)
            total = data.get("totalPages")
            print(f"page {page}/{total}: +{len(comps)} (total {len(items)})")
            if not data.get("nextPage"):
                break
            page += 1
            time.sleep(0.4)
    OUT.write_text(json.dumps(items, ensure_ascii=False))
    print(f"wrote {OUT}: {len(items)} companies")


if __name__ == "__main__":
    main()
