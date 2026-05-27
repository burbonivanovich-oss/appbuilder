"""Compute the quiet_trend score from raw trends data."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"


def cagr(start: float, end: float, years: int) -> float | None:
    if start <= 0 or end <= 0 or years <= 0:
        return None
    return (end / start) ** (1 / years) - 1


def main():
    rows = json.loads((PROC / "trends_raw.json").read_text())
    df = pd.DataFrame(rows)

    # Growth metrics 2020→2024 (skip 2025 partial year for wiki/hn, but use absolute level)
    df["wiki_5yr_x"] = df.apply(lambda r: (r["wiki_2024"] / r["wiki_2020"]) if r["wiki_2020"] else None, axis=1)
    df["hn_5yr_x"] = df.apply(lambda r: (r["hn_2024"] / r["hn_2020"]) if r["hn_2020"] else None, axis=1)
    df["pm_5yr_x"] = df.apply(lambda r: (r["pm_2024"] / r["pm_2020"]) if r["pm_2020"] else None, axis=1)
    df["wiki_cagr"] = df.apply(lambda r: cagr(r["wiki_2020"], r["wiki_2024"], 4), axis=1)
    df["hn_cagr"] = df.apply(lambda r: cagr(r["hn_2020"], r["hn_2024"], 4), axis=1)
    df["pm_cagr"] = df.apply(lambda r: cagr(r["pm_2020"], r["pm_2024"], 4), axis=1)

    df["wiki_avg_views"] = df[[f"wiki_{y}" for y in range(2020, 2026)]].mean(axis=1)
    df["hn_total"] = df[[f"hn_{y}" for y in range(2020, 2026)]].sum(axis=1)
    df["pm_total"] = df[[f"pm_{y}" for y in range(2020, 2026)]].sum(axis=1)

    # The QUIET TREND score:
    #   demand_growth = wiki_cagr   (public interest growing)
    #   supply_growth = hn_cagr     (builders piling in)
    #   quiet = demand_growth - supply_growth
    df["quiet_trend"] = (df["wiki_cagr"].fillna(0) - df["hn_cagr"].fillna(0))

    # And a strength gate — niches with <1k Wikipedia views/year on average are too small to matter
    df["passes_size_gate"] = df["wiki_avg_views"] >= 5000

    out = df.sort_values("quiet_trend", ascending=False)
    out.to_csv(PROC / "trends_synthesis.csv", index=False)

    cols = ["name", "wiki_avg_views", "wiki_5yr_x", "hn_5yr_x", "pm_5yr_x",
            "wiki_cagr", "hn_cagr", "quiet_trend", "passes_size_gate"]
    print("All niches by quiet_trend score (positive = demand outpaces builders):")
    print(out[cols].to_string(index=False, float_format=lambda x: f"{x:+.2f}" if isinstance(x, float) else str(x)))


if __name__ == "__main__":
    main()
