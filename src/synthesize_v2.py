"""V2 synthesis adding YC-funded-cohort density as a 6th signal.

YC adds:
  - funded_count: smart-money attention per niche (proxy for total addressable upside)
  - alive_rate: survival of funded plays
  - recent_share: how active the category is in 2024+ batches

The composite gains a new dimension: "underfunded white space" = high TrustMRR
opportunity + LOW YC funded count. These are niches where bootstrappers do well
but VCs ignore — classic micro-SaaS hunting grounds.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"


# YC tag → TrustMRR category mapping (regex list per category)
YC_MAPPING = {
    "E-commerce": [r"\be[- ]?commerce\b", r"\bretail\b"],
    "Sales": [r"\bsales\b", r"\bCRM\b"],
    "Marketing": [r"\bmarketing\b", r"\bAd[s ]?Tech\b", r"\bGrowth\b", r"\bSEO\b"],
    "Marketplace": [r"\bmarketplace\b"],
    "Analytics": [r"\banalytics\b", r"\bBI\b", r"\bbusiness intelligence\b"],
    "Developer Tools": [r"\bdeveloper tools\b", r"\bDevOps\b", r"\bAPI\b", r"\binfrastructure\b"],
    "Productivity": [r"\bproductivity\b", r"\bcollaboration\b"],
    "Education": [r"\beducation\b", r"\bedtech\b"],
    "Health & Fitness": [r"\bhealth\b", r"\bfitness\b", r"\bwellness\b"],
    "Fintech": [r"\bfintech\b", r"\bbanking\b", r"\binsurance\b", r"\bpayments\b"],
    "Customer Support": [r"\bcustomer support\b", r"\bhelpdesk\b"],
    "Recruiting & HR": [r"\brecruit\b", r"\bhuman resources\b", r"\bHR\b"],
    "Security": [r"\bsecurity\b", r"\bcybersecurity\b"],
    "Artificial Intelligence": [r"\bartificial intelligence\b", r"\bAI\b", r"\bgenerative AI\b", r"\bmachine learning\b"],
    "Content Creation": [r"\bcontent\b", r"\bcreator\b", r"\bmedia\b"],
    "Social Media": [r"\bsocial\b"],
    "Mobile Apps": [r"\bmobile\b", r"\biOS\b", r"\bAndroid\b"],
    "Real Estate": [r"\breal estate\b", r"\bproptech\b"],
    "Travel": [r"\btravel\b", r"\btourism\b"],
    "Legal": [r"\blegal\b", r"\blegaltech\b"],
    "Crypto & Web3": [r"\bcrypto\b", r"\bweb3\b", r"\bblockchain\b", r"\bDeFi\b"],
    "Games": [r"\bgaming\b", r"\bgame\b"],
    "No-Code": [r"\bno[- ]?code\b", r"\blow[- ]?code\b"],
    "Community": [r"\bcommunity\b", r"\bforum\b"],
    "Entertainment": [r"\bentertainment\b", r"\bmedia\b"],
    "SaaS": [r"\bSaaS\b"],
    "Design Tools": [r"\bdesign\b"],
    "Utilities": [r"\butility\b", r"\butilities\b"],
    "IoT & Hardware": [r"\bIoT\b", r"\bhardware\b"],
    "News & Magazines": [r"\bnews\b", r"\bmedia\b"],
    "Green Tech": [r"\bclimate\b", r"\benergy\b", r"\bcleantech\b"],
    "Uncategorized": [],
}


def yc_density_for(tag_df: pd.DataFrame, category: str) -> dict:
    patterns = YC_MAPPING.get(category, [])
    if not patterns:
        return {"yc_n": 0, "yc_alive_rate": 0.0, "yc_recent_share": 0.0, "yc_matched_tags": ""}
    matched_rows = []
    for p in patterns:
        rex = re.compile(p, re.I)
        matched_rows.append(tag_df[tag_df["tag"].str.contains(rex, na=False)])
    if not matched_rows:
        return {"yc_n": 0, "yc_alive_rate": 0.0, "yc_recent_share": 0.0, "yc_matched_tags": ""}
    merged = pd.concat(matched_rows).drop_duplicates(subset=["tag"])
    if merged.empty:
        return {"yc_n": 0, "yc_alive_rate": 0.0, "yc_recent_share": 0.0, "yc_matched_tags": ""}
    total = merged["n"].sum()
    alive = merged["n_active"].sum()
    recent = merged["n_2024_plus"].sum()
    return {
        "yc_n": int(total),
        "yc_alive_rate": float(alive) / total if total else 0.0,
        "yc_recent_share": float(recent) / total if total else 0.0,
        "yc_matched_tags": "|".join(sorted(merged["tag"].tolist()))[:200],
    }


def zscore(s: pd.Series) -> pd.Series:
    s = s.astype(float)
    sd = s.std()
    if sd == 0 or pd.isna(sd):
        return pd.Series([0.0] * len(s), index=s.index)
    return (s - s.mean()) / sd


def main():
    syn = pd.read_csv(PROC / "synthesis.csv")
    yc_tags = pd.read_csv(PROC / "yc_by_tag.csv")

    # Add YC fields
    yc_rows = [yc_density_for(yc_tags, c) for c in syn["category"]]
    yc_df = pd.DataFrame(yc_rows)
    out = pd.concat([syn.reset_index(drop=True), yc_df.reset_index(drop=True)], axis=1)

    # Composite v2: add YC signals
    # "under-funded white space" bonus: high revenue + low YC funded count
    # The existing opportunity_score already encodes most of revenue.
    out["_z_yc_n"] = zscore(out["yc_n"])
    out["_z_yc_alive"] = zscore(out["yc_alive_rate"])
    out["_z_yc_recent"] = zscore(out["yc_recent_share"])

    # Two new derived scores:
    #  opportunity_v2 = old + small alive bonus - YC-recent saturation (avoids AI-saturation)
    #  bootstrap_white_space = old - yc_n_z (penalize VC-saturated categories)
    out["opportunity_score_v2"] = (
        out["opportunity_score"] + 0.5 * out["_z_yc_alive"] - 0.5 * out["_z_yc_recent"]
    )
    out["bootstrap_white_space"] = out["opportunity_score"] - 1.0 * out["_z_yc_n"]

    # Sort
    out = out.sort_values("bootstrap_white_space", ascending=False)
    out.to_csv(PROC / "synthesis_v2.csv", index=False)
    print(f"wrote {PROC / 'synthesis_v2.csv'}: {len(out)} categories")
    cols = ["category", "n_startups", "p75_rev30", "pct_profitable",
            "ph_launches_12mo", "oss_n_alternatives", "yc_n", "yc_recent_share",
            "opportunity_score", "opportunity_score_v2", "bootstrap_white_space"]
    print("\nTop 15 by bootstrap_white_space (high TrustMRR signal + low YC density):")
    print(out[out["n_startups"] >= 20].head(15)[cols].to_string(index=False))

    print("\nTop 15 by opportunity_score_v2:")
    print(out[out["n_startups"] >= 20].sort_values("opportunity_score_v2", ascending=False).head(15)[cols].to_string(index=False))


if __name__ == "__main__":
    main()
