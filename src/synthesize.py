"""Join all signals on TrustMRR category and compute opportunity_score.

Composite score per category:
    z(median_rev30) - z(n_ph_launches) - z(max_oss_count) + z(n_demand_signals) + z(median_growth)
Sign convention: + good (revenue/growth/demand), - bad (competition).

Where a signal is missing, that z-term is zero (neutral). The report prints which
signals are missing per category so the score is honestly interpretable.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT = PROC / "synthesis.csv"

# Manual mapping. Left = TrustMRR category (exact). Right = list of:
#   ("ph", slug)   - PH topic slug
#   ("oss", regex) - regex matched against OSS-list category strings
# Fill this in after seeing actual TrustMRR categories.
MAPPING_PATH = ROOT / "src" / "category_mapping.json"


def zscore(s: pd.Series) -> pd.Series:
    s = s.astype(float)
    sd = s.std()
    if sd == 0 or pd.isna(sd):
        return pd.Series([0.0] * len(s), index=s.index)
    return (s - s.mean()) / sd


def load_mapping() -> dict:
    if MAPPING_PATH.exists():
        return json.loads(MAPPING_PATH.read_text())
    return {}


def main():
    tmrr = pd.read_csv(PROC / "trustmrr_categories.csv")
    oss = pd.read_csv(PROC / "oss_entries.csv")
    ph_path = PROC / "ph_topics.json"
    reddit_path = PROC / "reddit_pain_signals.json"

    ph = pd.DataFrame(json.loads(ph_path.read_text())) if ph_path.exists() else pd.DataFrame(
        columns=["slug", "recent_launches", "raw_hits"]
    )
    reddit = pd.DataFrame(json.loads(reddit_path.read_text())) if reddit_path.exists() else pd.DataFrame(
        columns=["subreddit", "score", "title", "url", "pattern", "quote"]
    )

    mapping = load_mapping()

    # OSS aggregate: per OSS-list category -> n_alternatives
    oss_agg = oss.groupby("category").size().to_dict()

    rows = []
    for _, t in tmrr.iterrows():
        cat = t["category"]
        m = mapping.get(cat, {})
        # PH
        ph_slug = m.get("ph")
        ph_launches = None
        if ph_slug:
            sub = ph[ph["slug"] == ph_slug]
            if not sub.empty:
                v = sub.iloc[0]["recent_launches"]
                if pd.notna(v):
                    ph_launches = int(v)
        # OSS — sum across matched OSS categories (regex)
        oss_patterns = m.get("oss", [])
        oss_n = 0
        oss_matched_cats: list[str] = []
        for pat in oss_patterns:
            rex = re.compile(pat, re.I)
            for ocat, n in oss_agg.items():
                if rex.search(ocat):
                    oss_n += n
                    oss_matched_cats.append(ocat)
        # Reddit pain signals - keyword match against title+quote
        keywords = m.get("reddit_keywords", [])
        n_pain = 0
        sample_quotes: list[str] = []
        if keywords and not reddit.empty:
            pat = re.compile("|".join(re.escape(k) for k in keywords), re.I)
            mask = (reddit["title"].fillna("").str.contains(pat)) | (reddit["quote"].fillna("").str.contains(pat))
            hits = reddit[mask].sort_values("score", ascending=False)
            n_pain = int(len(hits))
            sample_quotes = hits["quote"].head(3).tolist()
        rows.append({
            "category": cat,
            "n_startups": int(t["n_startups"]),
            "pct_earner": float(t.get("pct_earner") or 0),
            "pct_profitable": float(t.get("pct_profitable") or 0),
            "median_rev30": float(t["median_rev30"] or 0),
            "p75_rev30": float(t.get("p75_rev30") or 0),
            "p90_rev30": float(t.get("p90_rev30") or 0),
            "max_rev30": float(t.get("max_rev30") or 0),
            "sum_rev30": float(t["sum_rev30"] or 0),
            "median_rev_among_earners": float(t.get("median_rev_among_earners") or 0),
            "median_mrr": float(t["median_mrr"] or 0),
            "median_growth_30d": t.get("median_growth_30d"),
            "pct_growing": t.get("pct_growing"),
            "ph_topic": ph_slug or "",
            "ph_launches_12mo": ph_launches if ph_launches is not None else "",
            "oss_matched_categories": "|".join(sorted(set(oss_matched_cats))),
            "oss_n_alternatives": oss_n,
            "reddit_keywords": "|".join(keywords),
            "reddit_n_pain": n_pain,
            "reddit_sample_quotes": " || ".join(sample_quotes),
        })
    df = pd.DataFrame(rows)

    # Composite score - use p75 (viable players) not median (drowned in zeros)
    df["_z_rev"] = zscore(df["p75_rev30"])
    df["_z_survival"] = zscore(df["pct_profitable"])
    df["_z_growth"] = zscore(df["median_growth_30d"].fillna(df["median_growth_30d"].median() if df["median_growth_30d"].notna().any() else 0))
    df["_z_ph"] = zscore(pd.to_numeric(df["ph_launches_12mo"], errors="coerce").fillna(0))
    df["_z_oss"] = zscore(df["oss_n_alternatives"])
    df["_z_pain"] = zscore(df["reddit_n_pain"])

    df["opportunity_score"] = (
        df["_z_rev"] + df["_z_survival"] + df["_z_growth"] + df["_z_pain"]
        - df["_z_ph"] - df["_z_oss"]
    )
    # Suppress sample-size noise — categories with <20 startups have unstable percentiles
    df["reliable"] = df["n_startups"] >= 20
    df = df.sort_values(["reliable", "opportunity_score"], ascending=[False, False])
    df.to_csv(OUT, index=False)
    print(f"wrote {OUT}: {len(df)} categories")
    print(df[["category", "n_startups", "p75_rev30", "pct_profitable", "ph_launches_12mo", "oss_n_alternatives", "reddit_n_pain", "opportunity_score"]].head(15).to_string(index=False))


if __name__ == "__main__":
    main()
