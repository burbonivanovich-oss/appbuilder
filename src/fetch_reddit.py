"""Step 4: demand signals from Reddit.

Public .json endpoints (no OAuth) are sufficient for top posts. We pull top
posts of the year from a small set of subreddits and apply regex pain-point
extraction. Per task constraints: no LLM classification here.
"""
from __future__ import annotations

import logging
import re
from collections import defaultdict
from typing import Any

import pandas as pd

from . import http_client, mapping
from .http_client import RateLimit

log = logging.getLogger(__name__)

NAMESPACE = "reddit"
RATE = RateLimit(min_interval_s=2.0)

SUBREDDITS = ["SaaS", "Entrepreneur", "smallbusiness", "indiehackers"]

PAIN_PATTERNS = [
    re.compile(r"\bi wish there was\b[^.?!\n]{5,120}", re.I),
    re.compile(r"\bis there (a|any) (tool|app|service|platform) (for|that)\b[^.?!\n]{5,120}", re.I),
    re.compile(r"\bi(?:'m| am) paying \$?\d+[^.?!\n]{5,120}", re.I),
    re.compile(r"\bany (good )?alternatives? to\b[^.?!\n]{3,80}", re.I),
    re.compile(r"\bhow do (you|people|i) (handle|deal with|manage)\b[^.?!\n]{5,120}", re.I),
    re.compile(r"\blooking for (a|an|the best) [^.?!\n]{5,80}", re.I),
]


def fetch_subreddit_top(sub: str, t: str = "year") -> list[dict[str, Any]]:
    url = f"https://www.reddit.com/r/{sub}/top.json"
    posts: list[dict[str, Any]] = []
    after: str | None = None
    headers = {"User-Agent": "appbuilder-research/0.1 (contact: anonymous)"}
    # max 10 pages * 100 = 1000 posts
    for _ in range(10):
        params: dict[str, Any] = {"t": t, "limit": 100}
        if after:
            params["after"] = after
        data = http_client.get(
            url, namespace=NAMESPACE, headers=headers, params=params,
            rate_limit=RATE, expect_json=True,
        )
        children = data.get("data", {}).get("children", [])
        if not children:
            break
        for c in children:
            posts.append(c.get("data", {}))
        after = data.get("data", {}).get("after")
        if not after:
            break
    return posts


def extract_pain_quotes(text: str) -> list[str]:
    out: list[str] = []
    for pat in PAIN_PATTERNS:
        for m in pat.finditer(text):
            out.append(m.group(0).strip().rstrip(".,?!"))
    return out


def build_dataframe() -> pd.DataFrame:
    # category -> list[quote]
    bucket: dict[str, list[str]] = defaultdict(list)
    for sub in SUBREDDITS:
        log.info("fetching r/%s", sub)
        for post in fetch_subreddit_top(sub):
            text = " ".join([post.get("title") or "", post.get("selftext") or ""])
            quotes = extract_pain_quotes(text)
            if not quotes:
                continue
            for q in quotes:
                # try to map by looking for canonical category keywords in the quote
                lowq = q.lower()
                matched: str | None = None
                for canon in mapping.CANONICAL:
                    if canon.replace("-", " ") in lowq:
                        matched = canon
                        break
                if matched is None:
                    continue
                bucket[matched].append(q)

    rows = [
        {
            "category": cat,
            "n_complaints": len(qs),
            "sample_quotes": qs[:3],
        }
        for cat, qs in bucket.items()
    ]
    return pd.DataFrame(rows).sort_values("n_complaints", ascending=False).reset_index(drop=True)


def main() -> None:
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / "data" / "processed" / "demand_signals.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    df = build_dataframe()
    import json as _json
    df_out = df.copy()
    if "sample_quotes" in df_out:
        df_out["sample_quotes"] = df_out["sample_quotes"].apply(_json.dumps)
    df_out.to_csv(out, index=False)
    print(f"wrote {len(df)} demand-signal categories -> {out}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    main()
