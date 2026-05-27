"""Step 6: render output/report.md and charts.

Only renders sections for which the underlying source produced data. Missing
sources show an explicit "no data — source unavailable" note instead of an
empty table or fabricated values.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from . import synthesize

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
OUT = ROOT / "output"


def _read_or_none(name: str) -> pd.DataFrame | None:
    p = PROCESSED / name
    return pd.read_csv(p) if p.exists() else None


def _scatter(df: pd.DataFrame) -> Path | None:
    if "median_mrr" not in df.columns or "n_launches" not in df.columns:
        return None
    sub = df[df["median_mrr"].notna() & df["n_launches"].notna()].copy()
    if sub.empty:
        return None
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.scatter(sub["n_launches"], sub["median_mrr"])
    for _, row in sub.iterrows():
        ax.annotate(row["category"], (row["n_launches"], row["median_mrr"]), fontsize=8)
    ax.set_xlabel("Product Hunt launches (12mo)")
    ax.set_ylabel("Median MRR ($)")
    ax.set_title("Revenue vs. launch competition")
    p = OUT / "scatter_mrr_vs_launches.png"
    fig.tight_layout(); fig.savefig(p, dpi=120); plt.close(fig)
    return p


def _bar(df: pd.DataFrame) -> Path | None:
    top = df.head(15)
    if top.empty:
        return None
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.barh(top["category"][::-1], top["opportunity_score"][::-1])
    ax.set_xlabel("opportunity_score")
    ax.set_title("Top 15 categories by opportunity score")
    p = OUT / "bar_opportunity_top15.png"
    fig.tight_layout(); fig.savefig(p, dpi=120); plt.close(fig)
    return p


def _heatmap(df: pd.DataFrame) -> Path | None:
    sig_cols = [c for c in ("z_mrr", "z_launches", "z_stars", "z_demand", "z_growth")
                if c in df.columns]
    if not sig_cols:
        return None
    top = df.head(20).set_index("category")[sig_cols].fillna(0)
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(8, 9))
    im = ax.imshow(top.values, aspect="auto", cmap="RdBu_r")
    ax.set_xticks(range(len(sig_cols))); ax.set_xticklabels(sig_cols, rotation=45, ha="right")
    ax.set_yticks(range(len(top.index))); ax.set_yticklabels(top.index)
    fig.colorbar(im, ax=ax, label="z-score")
    ax.set_title("Signals × top categories")
    p = OUT / "heatmap_signals.png"
    fig.tight_layout(); fig.savefig(p, dpi=120); plt.close(fig)
    return p


def render() -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    df = synthesize.synthesize()
    df.to_csv(PROCESSED / "opportunity_scores.csv", index=False)

    sources_present = {
        "trustmrr":    (PROCESSED / "trustmrr_categories.csv").exists(),
        "producthunt": (PROCESSED / "ph_categories.csv").exists(),
        "oss":         (PROCESSED / "oss_competition.csv").exists(),
        "reddit":      (PROCESSED / "demand_signals.csv").exists(),
    }
    missing = [k for k, v in sources_present.items() if not v]

    oss_df = _read_or_none("oss_competition.csv")
    trust_df = _read_or_none("trustmrr_categories.csv")
    demand_df = _read_or_none("demand_signals.csv")

    lines: list[str] = []
    lines.append("# Micro-SaaS niche research\n")

    if missing:
        lines.append("> **Partial run.** The following sources produced no data and "
                     "their signals are excluded from the score: "
                     f"`{', '.join(missing)}`.\n>\n"
                     "> The `opportunity_score` for any row reflects only the sources "
                     "listed in its `coverage` column. Treat rows with `n_sources < 3` "
                     "as exploratory.\n")

    lines.append("## Executive summary\n")
    if df.empty:
        lines.append("- No categories survived the join. Check that at least one source "
                     "wrote a CSV under `data/processed/`.\n")
    else:
        top3 = df.head(3)
        lines.append(f"- Categories scored: **{len(df)}**\n")
        lines.append(f"- Sources contributing: **{', '.join(k for k,v in sources_present.items() if v) or 'none'}**\n")
        for _, r in top3.iterrows():
            lines.append(f"- Top pick `{r['category']}` — score "
                         f"`{r['opportunity_score']:.2f}` (coverage: {r['coverage']})\n")

    lines.append("\n## Top-10 niches\n")
    if df.empty:
        lines.append("_No data._\n")
    else:
        for _, r in df.head(10).iterrows():
            cat = r["category"]
            lines.append(f"\n### {cat}\n")
            lines.append(f"- **Opportunity score:** {r['opportunity_score']:.2f}  ")
            lines.append(f"- **Coverage:** {r['coverage']}  ")
            if pd.notna(r.get("median_mrr")):
                lines.append(f"- **Median MRR:** ${r['median_mrr']:,.0f}  ")
            else:
                lines.append("- **Median MRR:** _no data — source unavailable_  ")
            if pd.notna(r.get("n_launches")):
                lines.append(f"- **PH launches (12mo):** {int(r['n_launches'])}  ")
            else:
                lines.append("- **PH launches (12mo):** _no data — source unavailable_  ")
            if pd.notna(r.get("max_stars")):
                lines.append(f"- **Largest OSS competitor:** {int(r['max_stars']):,} stars "
                             f"(out of {int(r.get('n_oss_alternatives', 0))} alternatives listed)  ")
            elif pd.notna(r.get("n_oss_alternatives")):
                lines.append(f"- **OSS alternatives listed:** {int(r['n_oss_alternatives'])} "
                             "(star counts skipped — set GITHUB_TOKEN to enrich)  ")
            else:
                lines.append("- **OSS competition:** _no data_  ")
            if pd.notna(r.get("n_complaints")):
                lines.append(f"- **Reddit pain mentions:** {int(r['n_complaints'])}  ")

            # examples from TrustMRR
            if trust_df is not None:
                row = trust_df[trust_df["category"] == cat]
                if not row.empty and "examples" in row.columns:
                    raw = row.iloc[0]["examples"]
                    if isinstance(raw, str) and raw.startswith("["):
                        try:
                            examples = json.loads(raw.replace("'", '"'))
                            if examples:
                                lines.append("- **Examples (TrustMRR):** "
                                             + ", ".join(f"{e['name']} (${e.get('mrr', 0):,.0f} MRR)"
                                                         for e in examples[:3]) + "  ")
                        except (ValueError, KeyError):
                            pass

            # OSS top repos
            if oss_df is not None:
                row = oss_df[oss_df["category"] == cat]
                if not row.empty and "top_repos" in row.columns:
                    try:
                        top = json.loads(row.iloc[0]["top_repos"])
                        if top:
                            lines.append("- **OSS leaders:** "
                                         + ", ".join(f"`{x['repo']}` ({x['stars']:,}★)" for x in top[:3]) + "  ")
                    except (ValueError, TypeError):
                        pass

            # Reddit quotes
            if demand_df is not None:
                row = demand_df[demand_df["category"] == cat]
                if not row.empty and "sample_quotes" in row.columns:
                    try:
                        quotes = json.loads(row.iloc[0]["sample_quotes"])
                        for q in quotes[:2]:
                            lines.append(f"  > {q}")
                    except (ValueError, TypeError):
                        pass

    lines.append("\n## Anti-recommendations (saturated / dead markets)\n")
    if df.empty or len(df) < 5:
        lines.append("_Not enough data to identify anti-picks._\n")
    else:
        anti = df.tail(5)[::-1]
        for _, r in anti.iterrows():
            lines.append(f"- `{r['category']}` — score `{r['opportunity_score']:.2f}` "
                         f"(coverage: {r['coverage']})")

    lines.append("\n## Charts\n")
    p = _scatter(df)
    if p:
        lines.append(f"![scatter]({p.name})")
    else:
        lines.append("_Scatter chart needs both TrustMRR and Product Hunt data — skipped._")
    p = _bar(df)
    if p:
        lines.append(f"\n![bar]({p.name})")
    p = _heatmap(df)
    if p:
        lines.append(f"\n![heatmap]({p.name})")

    target = OUT / "report.md"
    target.write_text("\n".join(lines))
    print(f"wrote {target}")
    return target


if __name__ == "__main__":
    render()
