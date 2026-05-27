"""Step 3: open-source competition layer.

Reads two community-maintained tables of OSS alternatives to commercial SaaS
(awesome-oss-alternatives, open-source-alternatives), parses categories from
the markdown, then enriches each repo with its star count via the GitHub API.
"""
from __future__ import annotations

import logging
import os
import re
from collections import defaultdict
from typing import Any

import pandas as pd

from . import http_client, mapping
from .http_client import RateLimit, UpstreamError

log = logging.getLogger(__name__)

NAMESPACE = "oss"
GITHUB_RATE = RateLimit(min_interval_s=1.0)

SOURCES = [
    "https://raw.githubusercontent.com/RunaCapital/awesome-oss-alternatives/main/README.md",
    "https://raw.githubusercontent.com/btw-so/open-source-alternatives/main/README.md",
]

GITHUB_REPO_RE = re.compile(r"github\.com/([\w.\-]+)/([\w.\-]+?)(?:[\)\s/#.]|$)")


def _github_headers() -> dict[str, str]:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def parse_categories(markdown: str) -> dict[str, list[tuple[str, str]]]:
    """Return {category_label: [(owner, repo), ...]} from a README.

    Handles two formats:
      A) heading-based: H2/H3 introduces a section; repos found in following lines
      B) pipe-table: |Category|Company|...|GitHub Stars|...| where category is col 0
    """
    sections: dict[str, list[tuple[str, str]]] = defaultdict(list)
    current = "uncategorized"
    in_table = False
    for line in markdown.splitlines():
        # detect heading
        h = re.match(r"^#{2,3}\s+(.+?)\s*$", line)
        if h:
            current = h.group(1).strip()
            in_table = False
            continue

        # detect pipe-table data row (must start with `|` and contain category col)
        if line.startswith("|") and line.count("|") >= 4 and not re.match(r"^\|[\s:|-]+$", line):
            in_table = True
        # also accept rows that don't start with `|` but have the format from Runa
        # (their rows omit leading pipe)
        table_like = "|" in line and line.count("|") >= 4 and not line.lstrip().startswith("#")

        if (in_table or table_like) and "github.com/" in line:
            parts = [p.strip() for p in line.split("|")]
            if parts and parts[0] == "":
                parts = parts[1:]
            # Two table dialects:
            #   - Runa: "Category|Company|..."   -> col 0 is plain category text
            #   - btw-so: "Company|Website|..."  -> col 0 is a markdown link to a repo
            # If col 0 looks like a markdown link, the category is the surrounding heading.
            first = parts[0] if parts else ""
            if first and not first.startswith("[") and not first.lower() in {"category", "categories", "company"}:
                row_cat = first
            else:
                row_cat = current
            for owner, repo in GITHUB_REPO_RE.findall(line):
                if repo.lower() in {"readme", "issues", "pulls"} or owner.startswith("."):
                    continue
                sections[row_cat].append((owner, repo.rstrip(".")))
            continue

        # heading-section format: collect repos under last heading
        for owner, repo in GITHUB_REPO_RE.findall(line):
            if repo.lower() in {"readme", "issues", "pulls"} or owner.startswith("."):
                continue
            sections[current].append((owner, repo.rstrip(".")))
    return sections


def fetch_repo_stars(owner: str, repo: str) -> int | None:
    try:
        data = http_client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            namespace=NAMESPACE,
            headers=_github_headers(),
            rate_limit=GITHUB_RATE,
            expect_json=True,
            cache_ttl_s=7 * 86_400,
        )
    except UpstreamError as e:
        log.info("skip %s/%s: %s", owner, repo, e)
        return None
    return data.get("stargazers_count")


def build_dataframe(enrich_stars: bool = True, max_repos_per_category: int = 30) -> pd.DataFrame:
    by_canonical: dict[str, list[tuple[str, str, str]]] = defaultdict(list)  # cat -> (owner,repo,label)
    for url in SOURCES:
        md = http_client.get(url, namespace=NAMESPACE, expect_json=False, cache_ttl_s=86_400)
        for label, repos in parse_categories(md).items():
            cat = mapping.canonicalize(label)
            if cat is None:
                continue
            for owner, repo in repos:
                by_canonical[cat].append((owner, repo, label))

    rows: list[dict[str, Any]] = []
    for cat, entries in by_canonical.items():
        # dedupe (owner,repo)
        seen: set[tuple[str, str]] = set()
        unique: list[tuple[str, str]] = []
        for o, r, _ in entries:
            if (o, r) in seen:
                continue
            seen.add((o, r))
            unique.append((o, r))

        stars_list: list[int] = []
        top: list[dict[str, Any]] = []
        if enrich_stars:
            for o, r in unique[:max_repos_per_category]:
                s = fetch_repo_stars(o, r)
                if s is not None:
                    stars_list.append(s)
                    top.append({"repo": f"{o}/{r}", "stars": s})
            top.sort(key=lambda x: x["stars"], reverse=True)

        rows.append({
            "category": cat,
            "n_oss_alternatives": len(unique),
            "median_stars": pd.Series(stars_list).median() if stars_list else None,
            "max_stars": max(stars_list) if stars_list else None,
            "has_dominant_player": bool(stars_list and max(stars_list) > 20_000),
            "top_repos": top[:5],
        })
    if not rows:
        return pd.DataFrame(columns=["category", "n_oss_alternatives", "median_stars",
                                     "max_stars", "has_dominant_player", "top_repos"])
    return pd.DataFrame(rows).sort_values("category").reset_index(drop=True)


def main() -> None:
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / "data" / "processed" / "oss_competition.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    # If GITHUB_TOKEN is absent, anonymous API limit (60/h) makes star enrichment
    # impossible at scale. Skip it and let max_stars be NaN — synthesize() handles
    # missing columns by contributing 0 to that term of the score.
    enrich = bool(os.environ.get("GITHUB_TOKEN"))
    if not enrich:
        log.warning("GITHUB_TOKEN not set; skipping star enrichment "
                    "(max_stars/median_stars will be NaN)")
    df = build_dataframe(enrich_stars=enrich)
    # serialise top_repos as JSON string for CSV
    import json as _json
    df_out = df.copy()
    df_out["top_repos"] = df_out["top_repos"].apply(_json.dumps)
    df_out.to_csv(out, index=False)
    print(f"wrote {len(df)} OSS categories -> {out}")
    print(df[["category", "n_oss_alternatives", "median_stars", "max_stars"]].to_string(index=False))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    main()
