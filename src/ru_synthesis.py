"""Russia-specific synthesis.

Two angles, since the global pipeline applies poorly to the Russian domestic market:

  A) Russian-speaking founders building *global* SaaS — proxied via TrustMRR
     country in {RU, BY, KZ, UA, EE, LV, LT, GE, AM, AZ, MD, UZ, KG}. The
     relocant cohort is large (171 startups in our snapshot).

  B) Domestic-market pain signals from Habr (no Stripe → no TrustMRR coverage):
     keywords for import substitution, anti-incumbent (Bitrix24/1C/AmoCRM),
     western-tool mentions (Figma/Jira/Notion/Slack).
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT_DIR = ROOT / "output"

CIS_COUNTRIES = ["RU", "BY", "KZ", "UA", "EE", "LV", "LT", "GE", "AM", "AZ", "MD", "UZ", "KG"]


def cis_cohort_stats(df: pd.DataFrame) -> pd.DataFrame:
    cohort = df[df["country"].isin(CIS_COUNTRIES)].copy()
    cohort["profitable"] = cohort["revenue_30d"] > 1000
    by_country = cohort.groupby("country").agg(
        n=("name", "count"),
        sum_rev30=("revenue_30d", "sum"),
        n_profitable=("profitable", "sum"),
        p75_rev30=("revenue_30d", lambda s: s.quantile(0.75)),
        max_rev30=("revenue_30d", "max"),
    ).reset_index().sort_values("sum_rev30", ascending=False)
    return cohort, by_country


def cis_by_category(cohort: pd.DataFrame) -> pd.DataFrame:
    cohort = cohort.copy()
    cohort["profitable"] = cohort["revenue_30d"] > 1000
    out = cohort.groupby("category").agg(
        n=("name", "count"),
        n_profitable=("profitable", "sum"),
        sum_rev30=("revenue_30d", "sum"),
        p75_rev30=("revenue_30d", lambda s: s.quantile(0.75) if len(s) else 0),
        max_rev30=("revenue_30d", "max"),
    ).reset_index().sort_values("sum_rev30", ascending=False)
    return out


def main():
    startups = pd.read_csv(PROC / "trustmrr_startups.csv")
    habr_pain = json.loads((PROC / "habr_pain_signals.json").read_text())
    habr_arts = json.loads((PROC / "habr_articles.json").read_text())

    cohort, by_country = cis_cohort_stats(startups)
    by_cat = cis_by_category(cohort)
    cohort.to_csv(PROC / "ru_cohort_startups.csv", index=False)
    by_country.to_csv(PROC / "ru_cohort_by_country.csv", index=False)
    by_cat.to_csv(PROC / "ru_cohort_by_category.csv", index=False)
    print(f"CIS-adjacent cohort: {len(cohort)} startups across {by_country['country'].nunique()} countries")
    print(by_country.to_string(index=False))
    print()
    print("By category (top 12):")
    print(by_cat.head(12).to_string(index=False))

    # Domestic-pain pattern frequencies
    pat_counts = Counter()
    for s in habr_pain:
        for p in s.get("patterns", []):
            pat_counts[p] += 1
    print()
    print("Habr pain patterns:")
    for p, n in pat_counts.most_common():
        print(f"  {n:3d}  {p}")

    # Cross-reference: which TrustMRR categories overlap with strongest Habr signals
    # Map habr hub -> trustmrr category roughly
    hub_to_cat = {
        "sales": "Sales", "crm": "Sales",
        "ecommerce": "E-commerce",
        "design": "Design Tools",
        "productpm": "Productivity",
        "hr_management": "Recruiting & HR",
        "billing": "Fintech",
        "infosecurity": "Security",
        "saas": "SaaS",
        "marketing": "Marketing",
        "devops": "Developer Tools",
        "dev_management": "Developer Tools",
    }
    # tag each pain signal with mapped category
    tagged: dict[str, list[dict]] = {}
    for s in habr_pain:
        cat = hub_to_cat.get(s.get("hub"))
        if cat:
            tagged.setdefault(cat, []).append(s)
    pain_summary = pd.DataFrame([
        {"category": cat,
         "n_habr_pain": len(items),
         "median_score": pd.Series([i.get("score") or 0 for i in items]).median()}
        for cat, items in tagged.items()
    ]).sort_values("n_habr_pain", ascending=False)

    pain_summary.to_csv(PROC / "ru_habr_by_category.csv", index=False)

    # JOIN: cohort revenue by category × habr-pain-by-category × global synthesis
    syn = pd.read_csv(PROC / "synthesis.csv")
    merged = by_cat.merge(
        pain_summary, on="category", how="left"
    ).merge(
        syn[["category", "oss_n_alternatives", "ph_launches_12mo", "opportunity_score"]],
        on="category", how="left"
    )
    merged["n_habr_pain"] = merged["n_habr_pain"].fillna(0).astype(int)
    merged.to_csv(PROC / "ru_synthesis.csv", index=False)
    print()
    print("RU merged synthesis (top 12):")
    print(merged.head(12).to_string(index=False))

    print("\nDone. CSVs in data/processed/ru_*.csv")


if __name__ == "__main__":
    main()
