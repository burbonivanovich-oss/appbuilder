"""Per-niche deep-dive markdown for top 3 categories."""
from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
RAW = ROOT / "data" / "raw"
OUT = ROOT / "output"


def find_in_awesome_microsaas(category: str, keywords: list[str]) -> list[str]:
    """Find indie-hacker examples in Micro-SaaS-Examples README that mention category keywords."""
    path = RAW / "awesome_microsaas.md"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    hits = []
    for line in text.splitlines():
        if not line.strip():
            continue
        low = line.lower()
        if any(k.lower() in low for k in keywords):
            # markdown list item line typically starts with "- " or "* "
            if line.lstrip().startswith(("-", "*", "|")):
                hits.append(line.strip()[:300])
    # dedupe
    seen = set(); out = []
    for h in hits:
        if h in seen: continue
        seen.add(h); out.append(h)
    return out[:15]


def reddit_quotes_for(category: str, keywords: list[str], reddit: pd.DataFrame, limit=8) -> list[dict]:
    if not keywords or reddit.empty:
        return []
    pat = re.compile("|".join(re.escape(k) for k in keywords), re.I)
    mask = (reddit["title"].fillna("").str.contains(pat)) | (reddit["quote"].fillna("").str.contains(pat))
    return reddit[mask].sort_values("score", ascending=False).head(limit).to_dict("records")


def main():
    syn = pd.read_csv(PROC / "synthesis.csv")
    startups = pd.read_csv(PROC / "trustmrr_startups.csv")
    reddit = pd.DataFrame(json.loads((PROC / "reddit_pain_signals.json").read_text())) \
        if (PROC / "reddit_pain_signals.json").exists() else pd.DataFrame()
    oss = pd.read_csv(PROC / "oss_entries.csv")
    mapping = json.loads((ROOT / "src" / "category_mapping.json").read_text())

    top3 = syn[syn["n_startups"] >= 20].head(3)
    for r in top3.itertuples():
        cat = r.category
        m = mapping.get(cat, {})
        kw = m.get("reddit_keywords", [])
        md = [f"# Deep-dive: {cat}\n\n"]
        md.append(f"_Opportunity score: **{r.opportunity_score:+.2f}**_\n\n")

        md.append("## Market shape (TrustMRR)\n\n")
        md.append(f"- Listed startups: **{int(r.n_startups)}**\n")
        md.append(f"- Earner share (rev30 > 0): **{r.pct_earner*100:.0f}%**\n")
        md.append(f"- Profitable share (rev30 > $1k): **{r.pct_profitable*100:.0f}%**\n")
        md.append(f"- p75 / p90 / max 30d rev: **${r.p75_rev30:,.0f}** / **${r.p90_rev30:,.0f}** / **${r.max_rev30:,.0f}**\n")
        md.append(f"- Sum of last-30d revenue across category: **${r.sum_rev30:,.0f}**\n\n")

        md.append("## Top 10 incumbents by 30d revenue (TrustMRR)\n\n")
        top = startups[startups["category"] == cat].sort_values("revenue_30d", ascending=False).head(10)
        md.append("| name | country | founded | rev_30d | mrr | customers |\n")
        md.append("|---|---|---|---|---|---|\n")
        for _, s in top.iterrows():
            md.append(f"| **{s['name']}** | {s.get('country','')} | {str(s.get('founded',''))[:10]} | "
                      f"${s['revenue_30d']:,.0f} | ${s['mrr']:,.0f} | {int(s.get('customers',0) or 0)} |\n")
        md.append("\n")

        md.append("## OSS landscape (awesome-oss-* lists)\n\n")
        for pat in m.get("oss", []):
            rex = re.compile(pat, re.I)
            for oc in sorted(oss["category"].unique()):
                if rex.search(oc):
                    sub = oss[oss["category"] == oc]
                    md.append(f"### {oc} — {len(sub)} OSS alternatives\n\n")
                    for _, e in sub.iterrows():
                        md.append(f"- [{e['owner']}/{e['repo']}](https://github.com/{e['owner']}/{e['repo']})"
                                  f"{(' — vs ' + str(e['saas_alternative'])) if isinstance(e.get('saas_alternative'), str) and e['saas_alternative'] else ''}\n")
                    md.append("\n")
        if not m.get("oss"):
            md.append("_No OSS-list category mapping configured._\n\n")

        md.append("## Indie-hacker signals — Micro-SaaS-Examples mentions\n\n")
        hits = find_in_awesome_microsaas(cat, kw + [cat])
        if hits:
            for h in hits[:10]:
                md.append(f"- {h}\n")
        else:
            md.append("_No matches in Best-Micro-SaaS-Tools README._\n")
        md.append("\n")

        md.append("## Reddit pain quotes (matched against this category)\n\n")
        quotes = reddit_quotes_for(cat, kw, reddit, limit=10)
        if quotes:
            for q in quotes:
                md.append(f"- **r/{q['subreddit']}** (score {q['score']}) — [link]({q['url']})\n")
                md.append(f"  > {q['quote'][:280]}\n\n")
        else:
            md.append("_No pain quotes matched these keywords._\n\n")

        md.append("## Product hypotheses (data-driven)\n\n")
        md.append("Each hypothesis cites the specific signal it derives from.\n\n")
        # Generic structured hypotheses templated off the data
        if r.oss_n_alternatives > 5:
            md.append(f"- **Hosted-OSS angle**: {int(r.oss_n_alternatives)} OSS alternatives exist in this category — "
                      "a managed/cloud version of the strongest OSS option (focusing on indie/SMB) often becomes a viable micro-SaaS.\n")
        if r.pct_profitable >= 0.18:
            md.append(f"- **Survival rate is high** ({r.pct_profitable*100:.0f}% > $1k/mo) — "
                      "indicates non-zero willingness to pay; pricing >$29/mo is defensible.\n")
        ph_n = r.ph_launches_12mo
        if isinstance(ph_n, (int, float)) and not pd.isna(ph_n) and ph_n < 3000 and r.p75_rev30 > 300:
            md.append(f"- **Low PH saturation** ({int(ph_n)} launches/yr) at this revenue level suggests a thin "
                      "competitive layer for new entrants compared to oversaturated topics like productivity (32k+).\n")
        if r.reddit_n_pain >= 3:
            md.append(f"- **Active demand**: {int(r.reddit_n_pain)} Reddit pain matches across saas-relevant subreddits — "
                      "validate the strongest pattern in 5 user interviews before building.\n")

        path = OUT / f"deepdive_{cat.lower().replace(' ', '_').replace('&','and').replace('/','_')}.md"
        path.write_text("".join(md), encoding="utf-8")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
