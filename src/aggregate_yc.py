"""Aggregate YC companies by tag and industry; compute recent-batch share."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "yc_companies.json"
PROC = ROOT / "data" / "processed"
PROC.mkdir(parents=True, exist_ok=True)


def batch_year(batch: str | None) -> int | None:
    if not batch:
        return None
    m = re.match(r"[WSXIF](\d{2})", batch)
    if not m:
        return None
    yy = int(m.group(1))
    return 2000 + yy if yy < 50 else 1900 + yy


def main():
    items = json.loads(SRC.read_text())
    rows = []
    for c in items:
        rows.append({
            "id": c.get("id"),
            "name": c.get("name"),
            "slug": c.get("slug"),
            "website": c.get("website"),
            "team_size": c.get("teamSize"),
            "batch": c.get("batch"),
            "batch_year": batch_year(c.get("batch")),
            "status": c.get("status"),
            "tags": "|".join(c.get("tags") or []),
            "industries": "|".join(c.get("industries") or []),
            "regions": "|".join(c.get("regions") or []),
            "one_liner": c.get("oneLiner"),
        })
    df = pd.DataFrame(rows)
    df.to_csv(PROC / "yc_companies.csv", index=False)
    print(f"loaded {len(df)} companies; batches {df['batch'].nunique()}; tags >5: aggregating")

    # Per-tag aggregation
    tag_rows = []
    for c in items:
        tags = c.get("tags") or []
        for t in tags:
            tag_rows.append({
                "tag": t,
                "name": c.get("name"),
                "batch": c.get("batch"),
                "year": batch_year(c.get("batch")),
                "status": c.get("status"),
            })
    tdf = pd.DataFrame(tag_rows)
    by_tag = tdf.groupby("tag").agg(
        n=("name", "count"),
        n_active=("status", lambda s: (s == "Active").sum()),
        n_acquired=("status", lambda s: (s == "Acquired").sum()),
        n_dead=("status", lambda s: (s == "Inactive").sum()),
        n_2024_plus=("year", lambda s: (s >= 2024).sum()),
        n_2022_plus=("year", lambda s: (s >= 2022).sum()),
        n_2020_plus=("year", lambda s: (s >= 2020).sum()),
    ).reset_index().sort_values("n", ascending=False)
    by_tag["alive_rate"] = by_tag["n_active"] / by_tag["n"]
    by_tag["recent_share"] = by_tag["n_2024_plus"] / by_tag["n"]
    by_tag.to_csv(PROC / "yc_by_tag.csv", index=False)
    print(f"unique tags: {len(by_tag)}")
    print("Top 25 YC tags by count:")
    print(by_tag.head(25).to_string(index=False))

    # By industry too
    ind_rows = []
    for c in items:
        for i in (c.get("industries") or []):
            ind_rows.append({"industry": i, "name": c.get("name"), "year": batch_year(c.get("batch"))})
    idf = pd.DataFrame(ind_rows)
    by_ind = idf.groupby("industry").agg(
        n=("name", "count"),
        n_2024_plus=("year", lambda s: (s >= 2024).sum()),
    ).reset_index().sort_values("n", ascending=False)
    by_ind["recent_share"] = by_ind["n_2024_plus"] / by_ind["n"]
    by_ind.to_csv(PROC / "yc_by_industry.csv", index=False)
    print("\nBy industry:")
    print(by_ind.to_string(index=False))


if __name__ == "__main__":
    main()
