"""Generate output/report.md and charts from the synthesis."""
from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT = ROOT / "output"
OUT.mkdir(parents=True, exist_ok=True)


def _fmt_money(x):
    try:
        x = float(x)
    except Exception:
        return "—"
    if x >= 1_000_000:
        return f"${x/1_000_000:.1f}M"
    if x >= 1_000:
        return f"${x/1_000:.0f}k"
    return f"${x:.0f}"


def main():
    syn = pd.read_csv(PROC / "synthesis.csv")
    startups = pd.read_csv(PROC / "trustmrr_startups.csv")
    reddit = pd.DataFrame(json.loads((PROC / "reddit_pain_signals.json").read_text())) \
        if (PROC / "reddit_pain_signals.json").exists() else pd.DataFrame()

    # Charts
    # 1) Scatter median_rev30 vs PH launches
    plot_df = syn.copy()
    plot_df["ph_launches_num"] = pd.to_numeric(plot_df["ph_launches_12mo"], errors="coerce")
    fig, ax = plt.subplots(figsize=(11, 7))
    for _, r in plot_df.iterrows():
        if pd.notna(r["ph_launches_num"]) and r["ph_launches_num"] > 0 and r["median_rev30"] > 0:
            ax.scatter(r["ph_launches_num"], r["median_rev30"], s=20 + min(120, r["n_startups"]), alpha=0.6)
            if r["median_rev30"] > plot_df["median_rev30"].quantile(0.7) or r["ph_launches_num"] > 1000:
                ax.annotate(r["category"][:28], (r["ph_launches_num"], r["median_rev30"]), fontsize=7)
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel("PH launches (12 mo)"); ax.set_ylabel("Median revenue last 30d ($)")
    ax.set_title("Revenue vs. Product Hunt launches — categories with both signals")
    ax.grid(True, which="both", alpha=0.3)
    fig.tight_layout(); fig.savefig(OUT / "scatter_rev_vs_ph.png", dpi=130); plt.close(fig)

    # 2) Bar: top 15 opportunity score
    top = syn.head(15).iloc[::-1]
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.barh(top["category"], top["opportunity_score"])
    ax.set_xlabel("opportunity_score (z-sum)")
    ax.set_title("Top 15 categories by opportunity_score")
    fig.tight_layout(); fig.savefig(OUT / "bar_top_opportunity.png", dpi=130); plt.close(fig)

    # 3) Heatmap: top 25 categories x signals
    top25 = syn.head(25)
    sig_cols = ["_z_rev", "_z_growth", "_z_pain", "_z_ph", "_z_oss"]
    sig_labels = ["revenue", "growth", "demand", "PH launches", "OSS-comp"]
    data = top25[sig_cols].values
    fig, ax = plt.subplots(figsize=(8, 9))
    im = ax.imshow(data, aspect="auto", cmap="RdBu_r", vmin=-2.5, vmax=2.5)
    ax.set_yticks(range(len(top25))); ax.set_yticklabels(top25["category"], fontsize=8)
    ax.set_xticks(range(len(sig_cols))); ax.set_xticklabels(sig_labels, rotation=30, ha="right")
    ax.set_title("Top 25 categories × signal z-scores")
    fig.colorbar(im, ax=ax, shrink=0.7)
    fig.tight_layout(); fig.savefig(OUT / "heatmap_signals.png", dpi=130); plt.close(fig)

    # Report markdown
    md = ["# Micro-SaaS Niche Research — synthesis report\n"]
    md.append("> Cross-source synthesis: TrustMRR (revenue) × Product Hunt (launches) × ")
    md.append("awesome-oss-* (OSS competition) × Reddit/pullpush (demand). Sample sizes and ")
    md.append("data-availability gaps documented inline. **No numbers are estimated** — only ")
    md.append("data actually fetched is shown.\n\n")

    md.append("## Data summary\n\n")
    md.append(f"- **TrustMRR startups loaded**: {len(startups):,}\n")
    md.append(f"- **TrustMRR categories**: {startups['category'].nunique()}\n")
    md.append(f"- **OSS alternatives parsed**: {pd.read_csv(PROC / 'oss_entries.csv').shape[0]} across "
              f"{pd.read_csv(PROC / 'oss_entries.csv')['category'].nunique()} OSS-list categories\n")
    if (PROC / "ph_topics.json").exists():
        ph = pd.DataFrame(json.loads((PROC / "ph_topics.json").read_text()))
        ok = ph["recent_launches"].notna().sum()
        md.append(f"- **Product Hunt topics**: {ok}/{len(ph)} with data scraped via hydration regex (no OAuth available)\n")
    md.append(f"- **Reddit pain signals**: {len(reddit)} matched quotes from 6 subreddits via pullpush.io\n\n")

    md.append("> **Revenue note**: TrustMRR includes startups at every stage, so naive medians "
              "are dragged to $0 (about 49% of listed startups have $0 in last-30d revenue). "
              "We use **p75 (75th percentile)** and **pct_profitable (% > $1k/mo)** as the "
              "revenue signal — these capture how viable the niche is for *successful* players, "
              "not the average outcome.\n\n")

    # Top 10 niches (reliable sample sizes only)
    md.append("## Top 10 niches by opportunity_score (n_startups ≥ 20)\n\n")
    top10 = syn[syn["n_startups"] >= 20].head(10)
    for i, r in enumerate(top10.itertuples(), 1):
        md.append(f"### {i}. {r.category}  &nbsp;&nbsp;`score={r.opportunity_score:+.2f}`\n\n")
        md.append(f"- **TrustMRR**: {int(r.n_startups)} startups; "
                  f"p75 30d-revenue **{_fmt_money(r.p75_rev30)}**, "
                  f"p90 **{_fmt_money(r.p90_rev30)}**, "
                  f"top earner **{_fmt_money(r.max_rev30)}**, "
                  f"share with >$1k/mo: **{r.pct_profitable*100:.0f}%**, "
                  f"category-wide last 30d **{_fmt_money(r.sum_rev30)}**\n")
        gr = r.median_growth_30d
        if pd.notna(gr):
            md.append(f"- **Growth**: median 30d growth {float(gr):+.1f}%\n")
        ph_topic = r.ph_topic if isinstance(r.ph_topic, str) else ""
        ph_launches = r.ph_launches_12mo if r.ph_launches_12mo not in ("", None) and pd.notna(r.ph_launches_12mo) else "— no data —"
        md.append(f"- **PH launches (12 mo)**: {ph_launches}"
                  f"{(' (topic: ' + ph_topic + ')') if ph_topic else ''}\n")
        md.append(f"- **Open-source alternatives** (awesome-oss-* lists): "
                  f"{int(r.oss_n_alternatives) if r.oss_n_alternatives else 0}"
                  f"{(' — matched: ' + str(r.oss_matched_categories)) if isinstance(r.oss_matched_categories, str) and r.oss_matched_categories else ''}\n")
        md.append(f"- **Reddit pain matches**: {int(r.reddit_n_pain) if r.reddit_n_pain else 0}\n")
        # examples - 3 top startups in this category
        cat_startups = startups[startups["category"] == r.category].sort_values("revenue_30d", ascending=False).head(3)
        if not cat_startups.empty:
            md.append("- **Top 3 incumbents (TrustMRR last 30d revenue)**:\n")
            for _, st in cat_startups.iterrows():
                md.append(f"  - **{st['name']}** — {_fmt_money(st['revenue_30d'])} ({st['country']}, founded {str(st['founded'])[:10]})\n")
        # reddit quotes
        if isinstance(r.reddit_sample_quotes, str) and r.reddit_sample_quotes.strip():
            quotes = r.reddit_sample_quotes.split(" || ")
            md.append("- **Sample pain quotes from Reddit**:\n")
            for q in quotes[:3]:
                if q.strip():
                    md.append(f"  > {q.strip()[:240]}\n")
        md.append("\n")

    # Anti-recommendations
    md.append("## Anti-recommendations — 5 niches to AVOID\n\n")
    md.append("Sorted ascending by opportunity_score (worst first). Typically: high OSS dominance, "
              "high PH saturation, or thin/declining revenue.\n\n")
    bottom = syn.tail(5).iloc[::-1]
    for r in bottom.itertuples():
        md.append(f"- **{r.category}** (`score={r.opportunity_score:+.2f}`): "
                  f"{int(r.n_startups)} startups, median 30d rev {_fmt_money(r.median_rev30)}, "
                  f"PH launches {r.ph_launches_12mo or '—'}, OSS alts {int(r.oss_n_alternatives or 0)}\n")
    md.append("\n")

    # Charts
    md.append("## Charts\n\n")
    md.append("![Revenue vs PH launches](scatter_rev_vs_ph.png)\n\n")
    md.append("![Top 15 opportunity score](bar_top_opportunity.png)\n\n")
    md.append("![Signal heatmap](heatmap_signals.png)\n\n")

    # Data gaps
    md.append("## Data gaps (honest)\n\n")
    md.append("- **GitHub Search API**: no token — could not enumerate star counts per repo, so OSS "
              "competition is measured by `n_alternatives` in curated awesome-* lists only.\n")
    md.append("- **Product Hunt**: no OAuth — used HTML hydration scrape against ~64 hand-picked topic "
              "slugs; categories without a slug mapping show no launches signal.\n")
    md.append("- **Reddit**: direct API + mirrors blocked from this IP; used pullpush.io for top-by-score "
              "year filter, ≤500 posts per sub. Pattern-matching is regex-based, so demand signal is a "
              "lower bound.\n")
    md.append("- **Category mapping** (TrustMRR ↔ PH topic ↔ awesome-* category) is manual; categories "
              "with no mapping receive z=0 (neutral) for the missing signal.\n")

    (OUT / "report.md").write_text("".join(md), encoding="utf-8")
    print(f"wrote {OUT/'report.md'}")


if __name__ == "__main__":
    main()
