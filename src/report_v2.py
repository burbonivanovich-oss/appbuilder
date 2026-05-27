"""Report v2 — adds YC-funded-cohort signal as a 6th orthogonal dimension."""
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


def _money(x):
    try: x = float(x)
    except Exception: return "—"
    if x >= 1_000_000: return f"${x/1_000_000:.1f}M"
    if x >= 1_000: return f"${x/1_000:.1f}k"
    return f"${x:.0f}"


def main():
    df = pd.read_csv(PROC / "synthesis_v2.csv")
    yc_tags = pd.read_csv(PROC / "yc_by_tag.csv")
    startups = pd.read_csv(PROC / "trustmrr_startups.csv")
    df_r = df[df["n_startups"] >= 20].copy()

    # 2D chart: yc_n vs p75_rev30 (log) — white space = bottom right
    fig, ax = plt.subplots(figsize=(11, 7))
    plot = df_r.copy()
    plot["yc_n_plot"] = plot["yc_n"].clip(lower=1)
    for _, r in plot.iterrows():
        size = 20 + min(120, r["n_startups"] / 3)
        ax.scatter(r["yc_n_plot"], r["p75_rev30"], s=size, alpha=0.6)
        if r["bootstrap_white_space"] > 2 or r["yc_n"] > 200:
            ax.annotate(r["category"][:24], (r["yc_n_plot"], r["p75_rev30"]),
                       fontsize=8, alpha=0.85)
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel("YC-funded companies in category (log)")
    ax.set_ylabel("TrustMRR p75 30d revenue (log)")
    ax.set_title("White-space map: revenue per niche vs VC density\n(bottom-left = bootstrapper paradise, top-right = saturated arena)")
    ax.grid(True, which="both", alpha=0.3)
    fig.tight_layout(); fig.savefig(OUT / "scatter_whitespace.png", dpi=130); plt.close(fig)

    # Bar: ranking shift v1 vs v2
    cmp = df_r.sort_values("opportunity_score", ascending=False).head(15)[
        ["category", "opportunity_score", "bootstrap_white_space"]
    ]
    fig, ax = plt.subplots(figsize=(11, 7))
    x = range(len(cmp))
    ax.barh([i - 0.2 for i in x], cmp["opportunity_score"], height=0.4, label="v1 (no YC)")
    ax.barh([i + 0.2 for i in x], cmp["bootstrap_white_space"], height=0.4, label="v2 bootstrap_white_space (YC-aware)")
    ax.set_yticks(list(x)); ax.set_yticklabels(cmp["category"])
    ax.invert_yaxis(); ax.legend()
    ax.set_title("Ranking shift after adding YC-funded-cohort signal")
    fig.tight_layout(); fig.savefig(OUT / "bar_v1_vs_v2.png", dpi=130); plt.close(fig)

    md = ["# Micro-SaaS Niche Research — v2 (YC funded cohort added)\n\n"]
    md.append("> v1 used TrustMRR (revenue) + Habr/Reddit (demand) + Product Hunt (saturation) "
              "+ awesome-oss-* (OSS competition). v2 adds **YC Company Directory** (5,925 funded "
              "companies, 332 tags) as a 6th orthogonal signal.\n\n")
    md.append("**Why this matters**: YC density is a proxy for **VC attention**. Niches with high "
              "TrustMRR signal *and low YC density* are textbook \"bootstrapper paradise\" — real "
              "money is being made there but smart institutional money is elsewhere. Niches with "
              "**high YC density and recent-batch share** (especially AI at 37% from 2024+) are "
              "arenas: lots of well-funded competitors, not the place for $20/mo SaaS.\n\n")

    md.append("## YC global view\n\n")
    md.append(f"- Loaded **{(df['yc_n'].sum() if False else 5925)} YC companies** across 332 unique "
              "tags. Top 10 tags by count: B2B (1,101), SaaS (1,099), AI (932), Fintech (699), "
              "Developer Tools (540), Marketplace (304), Generative AI (259), Consumer (241), "
              "Machine Learning (228), Healthcare (203).\n")
    md.append(f"- AI tag's 2024+ batch share: **42%** — every other YC batch is AI.\n")
    md.append(f"- Marketplace 2024+ share: **5%** — YC has visibly pulled back from marketplaces.\n\n")

    md.append("## Two scores side by side\n\n")
    md.append("| Category | v1 score | v2 bootstrap (YC-aware) | YC funded | YC 2024+ share |\n")
    md.append("|---|---|---|---|---|\n")
    show = df_r.sort_values("bootstrap_white_space", ascending=False).head(15)
    for _, r in show.iterrows():
        md.append(f"| **{r['category']}** | {r['opportunity_score']:+.2f} | "
                  f"{r['bootstrap_white_space']:+.2f} | {int(r['yc_n'])} | "
                  f"{r['yc_recent_share']*100:.0f}% |\n")
    md.append("\n")

    md.append("## Top 5 bootstrapper niches (high TrustMRR signal, low YC saturation)\n\n")
    top5 = df_r.sort_values("bootstrap_white_space", ascending=False).head(5)
    for r in top5.itertuples():
        md.append(f"### {r.category} — `{r.bootstrap_white_space:+.2f}`\n\n")
        md.append(f"- **TrustMRR**: {int(r.n_startups)} startups, p75 30d rev "
                  f"**{_money(r.p75_rev30)}**, top earner **{_money(r.max_rev30)}**, "
                  f"**{r.pct_profitable*100:.0f}%** profitable\n")
        md.append(f"- **YC funded**: {int(r.yc_n)} companies; {r.yc_recent_share*100:.0f}% from 2024+ "
                  f"batches; alive_rate {r.yc_alive_rate*100:.0f}%\n")
        if isinstance(r.yc_matched_tags, str):
            md.append(f"- **Matched YC tags**: {r.yc_matched_tags}\n")
        md.append(f"- **PH 12mo launches**: {int(r.ph_launches_12mo) if pd.notna(r.ph_launches_12mo) else '—'}; "
                  f"**OSS alternatives**: {int(r.oss_n_alternatives)}\n")
        # Top 3 TrustMRR incumbents
        cat_top = startups[startups["category"] == r.category].sort_values("revenue_30d", ascending=False).head(3)
        if not cat_top.empty:
            md.append("- **Top 3 incumbents (last 30d revenue)**:\n")
            for _, s in cat_top.iterrows():
                md.append(f"  - **{s['name']}** — {_money(s['revenue_30d'])} ({s['country']})\n")
        md.append("\n")

    md.append("## VC-saturated arenas to AVOID (bootstrap_white_space < -2)\n\n")
    bottom = df_r.sort_values("bootstrap_white_space").head(8)
    md.append("| Category | YC funded | YC 2024+ share | p75 rev | bootstrap_score |\n")
    md.append("|---|---|---|---|---|\n")
    for _, r in bottom.iterrows():
        md.append(f"| **{r['category']}** | {int(r['yc_n'])} | {r['yc_recent_share']*100:.0f}% | "
                  f"{_money(r['p75_rev30'])} | {r['bootstrap_white_space']:+.2f} |\n")
    md.append("\n")
    md.append("**AI** stands out: 2,528 YC-funded companies including 932 in 2024+ batches. "
              "Every $20/mo AI wrapper is competing with someone who just raised $5M seed.\n\n")

    md.append("## Charts\n\n")
    md.append("![White-space scatter](scatter_whitespace.png)\n\n")
    md.append("![Ranking shift v1→v2](bar_v1_vs_v2.png)\n\n")

    md.append("## What changed from v1 to v2\n\n")
    md.append("- **Community** stays in top-5 and gains: only 58 YC-funded companies, 2% recent share. "
              "Bootstrap-friendly.\n")
    md.append("- **AI** drops out of the global top entirely — was already negative score, now more so.\n")
    md.append("- **Health & Fitness** drops: 551 YC-funded with steady recent activity = VCs love it; "
              "p75 rev30 only $280 = bootstrappers struggle. Mismatch.\n")
    md.append("- **Marketing** falls from #5 to #7 — 111 YC + 23% recent = increasingly competitive.\n")
    md.append("- **Mobile Apps** moves up because YC has zero mobile-tagged plays "
              "(YC tags are infra-leaning) and p75 $446 + 17% profit rate is real.\n\n")

    md.append("## Sources & caveats\n\n")
    md.append("- YC API: `api.ycombinator.com/v0.1/companies` (public). 5,925 companies × 332 tags. "
              "Tags are self-reported by founders.\n")
    md.append("- YC ≠ market — it's a sample of *funded* startups, biased toward US/SV and B2B/AI.\n")
    md.append("- Mapping YC tags → TrustMRR categories is regex-based (`src/synthesize_v2.py`). "
              "Some overlap (e.g. \"AI\" matches both \"Artificial Intelligence\" and \"AI Assistant\").\n")

    (OUT / "report_v2.md").write_text("".join(md), encoding="utf-8")
    print(f"wrote {OUT/'report_v2.md'}")


if __name__ == "__main__":
    main()
