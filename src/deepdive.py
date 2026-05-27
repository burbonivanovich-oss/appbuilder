"""Step 7: deep-dive for top-3 categories.

Pulls indie-hacker signals from the Micro-SaaS-Examples and awesome-saas-directory
READMEs and the GitHub trending feed for the last ~90 days.
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

import pandas as pd

from . import http_client
from .fetch_oss import _github_headers, GITHUB_REPO_RE

log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parent.parent
NAMESPACE = "deepdive"

INDIE_SOURCES = [
    "https://raw.githubusercontent.com/Micro-SaaS-Examples/Best-Micro-SaaS-Tools/main/README.md",
    "https://raw.githubusercontent.com/open-saas-directory/awesome-saas-directory/main/README.md",
]


def _scan_indie(category: str) -> list[str]:
    """Heuristic: find lines mentioning category keywords and extract repo links."""
    needles = {w for w in category.replace("-", " ").split() if len(w) > 3}
    hits: list[str] = []
    for url in INDIE_SOURCES:
        try:
            md = http_client.get(url, namespace=NAMESPACE, expect_json=False, cache_ttl_s=86_400)
        except Exception as e:
            log.info("skip %s: %s", url, e)
            continue
        for line in md.splitlines():
            lowl = line.lower()
            if not any(n in lowl for n in needles):
                continue
            for owner, repo in GITHUB_REPO_RE.findall(line):
                hits.append(f"{owner}/{repo.rstrip('.')}")
    # dedupe preserving order
    seen: set[str] = set()
    return [h for h in hits if not (h in seen or seen.add(h))]


def _trending(category: str, days: int = 90, min_stars: int = 50) -> list[dict]:
    """Search GitHub for recent repos matching the category."""
    from datetime import date, timedelta
    since = (date.today() - timedelta(days=days)).isoformat()
    q = f"{category.replace('-', ' ')} in:name,description,readme created:>{since} stars:>={min_stars}"
    try:
        data = http_client.get(
            "https://api.github.com/search/repositories",
            namespace=NAMESPACE,
            params={"q": q, "sort": "stars", "order": "desc", "per_page": 10},
            headers=_github_headers(),
            expect_json=True,
            cache_ttl_s=86_400,
        )
    except Exception as e:
        log.info("trending search failed for %s: %s", category, e)
        return []
    return [
        {"name": it["full_name"], "stars": it["stargazers_count"], "url": it["html_url"],
         "desc": (it.get("description") or "")[:160]}
        for it in data.get("items", [])
    ]


def deepdive(category: str) -> Path:
    out = ROOT / "output" / f"deepdive_{category}.md"
    out.parent.mkdir(parents=True, exist_ok=True)

    indie = _scan_indie(category)
    trending = _trending(category)

    lines = [f"# Deep dive: {category}\n"]
    lines.append("## Indie-hacker mentions\n")
    if indie:
        for r in indie[:20]:
            lines.append(f"- https://github.com/{r}")
    else:
        lines.append("_No matches in Micro-SaaS-Examples or awesome-saas-directory._")
    lines.append("\n## GitHub trending (last 90 days)\n")
    if trending:
        for t in trending:
            lines.append(f"- [{t['name']}]({t['url']}) — {t['stars']:,}★  \n  {t['desc']}")
    else:
        lines.append("_No trending repos returned (rate limit, network policy, or genuinely no hits)._")
    out.write_text("\n".join(lines))
    print(f"wrote {out}")
    return out


def main(top_n: int = 3) -> None:
    scored = pd.read_csv(ROOT / "data" / "processed" / "opportunity_scores.csv")
    for cat in scored["category"].head(top_n):
        deepdive(cat)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    main()
