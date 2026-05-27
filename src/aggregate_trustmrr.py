"""Aggregate TrustMRR raw startups into per-category statistics."""
from __future__ import annotations

import json
from pathlib import Path
from statistics import median, mean

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "trustmrr_startups.json"
OUT = ROOT / "data" / "processed" / "trustmrr_categories.csv"
OUT.parent.mkdir(parents=True, exist_ok=True)


def main():
    items = json.loads(SRC.read_text())
    rows = []
    for s in items:
        rev = s.get("revenue") or {}
        rows.append({
            "name": s.get("name"),
            "slug": s.get("slug"),
            "category": s.get("category") or "Uncategorized",
            "country": s.get("country"),
            "founded": s.get("foundedDate"),
            "target_audience": s.get("targetAudience"),
            "mrr": rev.get("mrr") or 0,
            "revenue_30d": rev.get("last30Days") or 0,
            "revenue_total": rev.get("total") or 0,
            "customers": s.get("customers") or 0,
            "active_subs": s.get("activeSubscriptions") or 0,
            "growth_30d": s.get("growth30d"),
            "growth_mrr_30d": s.get("growthMRR30d"),
            "rank": s.get("rank"),
        })
    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "data" / "processed" / "trustmrr_startups.csv", index=False)
    print(f"startups: {len(df)} | categories: {df['category'].nunique()}")

    # Aggregate by category. Many startups have $0 revenue — using plain median
    # buries real signal under failures. Track multiple percentiles + survival rate.
    df["profitable"] = df["revenue_30d"] > 1000  # making >$1k/mo
    df["earner"] = df["revenue_30d"] > 0
    agg = df.groupby("category").agg(
        n_startups=("name", "count"),
        pct_earner=("earner", "mean"),
        pct_profitable=("profitable", "mean"),
        median_rev30=("revenue_30d", "median"),
        p75_rev30=("revenue_30d", lambda s: s.quantile(0.75)),
        p90_rev30=("revenue_30d", lambda s: s.quantile(0.90)),
        max_rev30=("revenue_30d", "max"),
        sum_rev30=("revenue_30d", "sum"),
        median_rev_among_earners=("revenue_30d", lambda s: s[s > 0].median() if (s > 0).any() else 0),
        median_mrr=("mrr", "median"),
        median_growth_30d=("growth_30d", lambda s: s.dropna().median() if s.dropna().size else None),
        pct_growing=("growth_30d", lambda s: (s.dropna() > 0).mean() if s.dropna().size else None),
        median_customers=("customers", "median"),
    ).reset_index()
    agg = agg.sort_values("p75_rev30", ascending=False)
    agg.to_csv(OUT, index=False)
    print(f"wrote {OUT}")
    print(agg.head(20).to_string(index=False))


if __name__ == "__main__":
    main()
