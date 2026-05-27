"""Scrape Product Hunt topic pages for recentLaunches.totalCount.

PH /topics/{slug} HTML embeds Apollo-style hydration data via Next.js streaming
(self.__next_f.push). We don't need a real parser — we just regex out
`recentLaunches`:{`__typename`:`ProductsConnection`,`totalCount`:N} which appears
exactly once per topic page when the page renders.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "ph"
PROC = ROOT / "data" / "processed"
RAW.mkdir(parents=True, exist_ok=True)
PROC.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# Topic slugs we want signal for. Chosen to overlap with TrustMRR categories.
TOPIC_SLUGS = [
    "saas", "developer-tools", "productivity", "marketing", "sales",
    "artificial-intelligence", "no-code", "design-tools", "e-commerce",
    "shopping", "payments", "community", "legal",
    "education", "fintech", "finance", "analytics", "social-media",
    "user-experience", "social", "advertising", "writing", "video",
    "music", "photography", "remote-work", "hr", "customer-communication",
    "newsletters", "podcasts", "task-management", "project-management",
    "calendars", "notes", "crm", "email-marketing", "seo", "growth-hacking",
    "open-source", "icon-sets", "icon-fonts", "developer-frameworks",
    "api", "databases", "automation", "browser-extensions", "chatbots",
    "voice-assistants", "ar-vr", "crypto", "nfts", "web3",
    "mental-health", "fitness", "health", "meditation", "sleep",
    "travel", "food-drink", "books", "games", "kids", "parents",
    "freelancing", "ux-design", "engineering", "data-science",
]

TOTAL_RE = re.compile(
    r"recentLaunches\\\"\:\{[^}]*?\\\"totalCount\\\"\:(\d+)|"
    r'recentLaunches"\:\{[^}]*?"totalCount"\:(\d+)'
)


def fetch_topic(slug: str, client: httpx.Client) -> dict | None:
    cache = RAW / f"{slug}.html"
    if not cache.exists():
        try:
            r = client.get(f"https://www.producthunt.com/topics/{slug}", timeout=20.0)
        except Exception as e:
            print(f"[ph] {slug}: fetch error {e}")
            return None
        if r.status_code != 200:
            print(f"[ph] {slug}: HTTP {r.status_code}")
            return None
        cache.write_text(r.text, encoding="utf-8")
        time.sleep(1.5)
    html = cache.read_text(encoding="utf-8")
    counts = []
    for m in TOTAL_RE.finditer(html):
        v = m.group(1) or m.group(2)
        if v:
            counts.append(int(v))
    if not counts:
        return {"slug": slug, "recent_launches": None, "raw_hits": 0}
    # take the max (the topic-level count is typically larger than per-card subcounts)
    return {"slug": slug, "recent_launches": max(counts), "raw_hits": len(counts)}


def main():
    headers = {"User-Agent": UA, "Accept": "text/html"}
    results = []
    with httpx.Client(headers=headers, timeout=20.0, follow_redirects=True) as client:
        for slug in TOPIC_SLUGS:
            res = fetch_topic(slug, client)
            if res:
                results.append(res)
                print(f"[ph] {slug}: launches={res['recent_launches']}")
    out = PROC / "ph_topics.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    ok = sum(1 for r in results if r["recent_launches"] is not None)
    print(f"wrote {out}: {ok}/{len(results)} topics with data")


if __name__ == "__main__":
    main()
