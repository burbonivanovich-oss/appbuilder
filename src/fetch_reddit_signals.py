"""Pull recent top posts from saas-relevant subreddits via pullpush.io, extract pain quotes."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
RAW.mkdir(parents=True, exist_ok=True)
PROC.mkdir(parents=True, exist_ok=True)

SUBREDDITS = ["SaaS", "Entrepreneur", "smallbusiness", "indiehackers", "startups", "EntrepreneurRideAlong"]
PAGE_SIZE = 100  # pullpush max
TARGET_PER_SUB = 500  # 5 pages each
ENDPOINT = "https://api.pullpush.io/reddit/search/submission/"

PAIN_PATTERNS = [
    re.compile(r"\bi wish (there was|there were|i had|i could)\b", re.I),
    re.compile(r"\bis there (a tool|an app|software|a service)\b", re.I),
    re.compile(r"\blooking for (a tool|an app|software|alternative)\b", re.I),
    re.compile(r"\balternative to ([A-Z][A-Za-z0-9]+)", re.I),
    re.compile(r"\bi'?m paying ([\$\d,]+|\$?\d+)\b", re.I),
    re.compile(r"\btired of (using|paying)\b", re.I),
    re.compile(r"\bwhy is there no\b", re.I),
    re.compile(r"\b(any|are there) (good )?(tools?|apps?|services?) (for|that)\b", re.I),
    re.compile(r"\bhow do (you|i) (manage|handle|track)\b", re.I),
    re.compile(r"\b(too expensive|overpriced|ripoff)\b", re.I),
]


def fetch_sub(sub: str) -> list[dict]:
    cache = RAW / f"reddit_{sub}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    items: list[dict] = []
    before: int | None = None
    pages = 0
    with httpx.Client(timeout=30.0) as client:
        while pages < (TARGET_PER_SUB // PAGE_SIZE):
            params = {
                "subreddit": sub,
                "size": PAGE_SIZE,
                "sort": "desc",
                "sort_type": "score",
            }
            if before:
                params["before"] = before
            try:
                r = client.get(ENDPOINT, params=params)
                r.raise_for_status()
                data = r.json().get("data", [])
            except Exception as e:
                print(f"[reddit] {sub} page {pages+1} failed: {e}")
                break
            if not data:
                break
            items.extend(data)
            before = data[-1].get("created_utc")
            pages += 1
            print(f"[reddit] {sub} page {pages} got {len(data)} (total {len(items)})")
            time.sleep(1.0)
    cache.write_text(json.dumps(items, ensure_ascii=False))
    return items


def extract_pain(items: list[dict], sub: str) -> list[dict]:
    out = []
    seen_ids = set()
    for it in items:
        pid = it.get("id")
        if pid in seen_ids:
            continue
        seen_ids.add(pid)
        title = it.get("title") or ""
        body = it.get("selftext") or ""
        text = f"{title}\n{body}"
        if len(text) < 20:
            continue
        for pat in PAIN_PATTERNS:
            m = pat.search(text)
            if m:
                s = max(0, m.start() - 40)
                e = min(len(text), m.end() + 140)
                quote = re.sub(r"\s+", " ", text[s:e]).strip()
                out.append({
                    "subreddit": sub,
                    "post_id": pid,
                    "score": it.get("score", 0),
                    "title": title[:180],
                    "url": f"https://reddit.com{it.get('permalink','')}",
                    "pattern": pat.pattern,
                    "quote": quote[:300],
                })
                break
    return out


def main():
    all_signals: list[dict] = []
    for sub in SUBREDDITS:
        items = fetch_sub(sub)
        pains = extract_pain(items, sub)
        print(f"[reddit] {sub}: {len(items)} posts -> {len(pains)} pain signals")
        all_signals.extend(pains)
    out = PROC / "reddit_pain_signals.json"
    out.write_text(json.dumps(all_signals, ensure_ascii=False, indent=2))
    print(f"wrote {out}: {len(all_signals)} pain quotes")


if __name__ == "__main__":
    main()
