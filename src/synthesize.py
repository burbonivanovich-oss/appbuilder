"""Step 5: join the four datasets, compute opportunity score.

opportunity_score = z(median_mrr) - z(n_ph_launches) - z(max_oss_stars)
                  + z(n_complaints) + z(median_growth)

Missing source for a given category -> that term contributes 0 (its z is NaN
which we coerce to 0). The `coverage` column records which sources actually
had data, so consumers can discount under-evidenced rows.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"


def _zscore(series: pd.Series) -> pd.Series:
    s = series.astype(float)
    sigma = s.std(ddof=0)
    if not np.isfinite(sigma) or sigma == 0:
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - s.mean()) / sigma


def _load(name: str) -> pd.DataFrame | None:
    p = PROCESSED / name
    if not p.exists():
        return None
    return pd.read_csv(p)


def synthesize() -> pd.DataFrame:
    trust = _load("trustmrr_categories.csv")
    ph = _load("ph_categories.csv")
    oss = _load("oss_competition.csv")
    demand = _load("demand_signals.csv")

    # canonical category space = union of whatever sources we have
    cats: set[str] = set()
    for d in (trust, ph, oss, demand):
        if d is not None and "category" in d.columns:
            cats.update(d["category"].dropna().tolist())

    df = pd.DataFrame({"category": sorted(cats)})
    coverage: list[list[str]] = [[] for _ in range(len(df))]

    def merge(src: pd.DataFrame | None, cols: list[str], tag: str) -> None:
        if src is None:
            return
        df_merged = df.merge(src[["category"] + cols], on="category", how="left")
        for c in cols:
            df[c] = df_merged[c]
        # source counts as present if any of its columns has a non-null value
        present_mask = df_merged[cols].notna().any(axis=1)
        for i, present in enumerate(present_mask):
            if present:
                coverage[i].append(tag)

    merge(trust, ["median_mrr", "median_growth"], "trustmrr")
    merge(ph,    ["n_launches"],                  "producthunt")
    merge(oss,   ["max_stars", "n_oss_alternatives"], "oss")
    merge(demand,["n_complaints"],                "reddit")

    df["coverage"] = ["+".join(c) if c else "none" for c in coverage]
    df["n_sources"] = [len(c) for c in coverage]

    df["z_mrr"]      = _zscore(df.get("median_mrr",         pd.Series([np.nan]*len(df))))
    df["z_launches"] = _zscore(df.get("n_launches",         pd.Series([np.nan]*len(df))))
    df["z_stars"]    = _zscore(df.get("max_stars",          pd.Series([np.nan]*len(df))))
    df["z_oss_n"]    = _zscore(df.get("n_oss_alternatives", pd.Series([np.nan]*len(df))))
    df["z_demand"]   = _zscore(df.get("n_complaints",       pd.Series([np.nan]*len(df))))
    df["z_growth"]   = _zscore(df.get("median_growth",      pd.Series([np.nan]*len(df))))

    # OSS-competition penalty: half-weight for each of stars and count so that
    # when only one is present, the term still has its natural unit magnitude.
    oss_penalty = 0.5 * df["z_stars"].fillna(0) + 0.5 * df["z_oss_n"].fillna(0)

    df["opportunity_score"] = (
        df["z_mrr"].fillna(0)
        - df["z_launches"].fillna(0)
        - oss_penalty
        + df["z_demand"].fillna(0)
        + df["z_growth"].fillna(0)
    )

    return df.sort_values("opportunity_score", ascending=False).reset_index(drop=True)


def main() -> None:
    out = PROCESSED / "opportunity_scores.csv"
    df = synthesize()
    df.to_csv(out, index=False)
    print(f"wrote {len(df)} categories -> {out}")
    cols = ["category", "n_sources", "coverage", "opportunity_score"]
    print(df[cols].head(20).to_string(index=False))


if __name__ == "__main__":
    main()
