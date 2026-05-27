"""Step 1: TrustMRR revenue layer.

API contract assumed (refine when first real response is seen):
    GET /api/v1/categories                          -> [{slug, name, n_startups}]
    GET /api/v1/categories/{slug}/startups          -> [{name, mrr, revenue_30d,
                                                         growth_pct, customers,
                                                         country, founded_year,
                                                         tech_stack}]

This module *only* fetches and normalises. No imputation of missing values.
Categories that fail to fetch produce a row with n_startups=0 and NaN aggregates;
the synthesiser must treat those as "no data", not zero.
"""
from __future__ import annotations

import logging
import os
import statistics
from typing import Any

import pandas as pd

from . import http_client, mapping
from .http_client import HostBlockedError, RateLimit, UpstreamError

log = logging.getLogger(__name__)

NAMESPACE = "trustmrr"
RATE = RateLimit(min_interval_s=3.5)  # 20 req/min budget with headroom


def _config() -> tuple[str, dict[str, str]]:
    base = os.environ.get("TRUSTMRR_BASE_URL", "https://trustmrr.com/api/v1").rstrip("/")
    key = os.environ.get("TRUSTMRR_API_KEY")
    if not key:
        raise RuntimeError(
            "TRUSTMRR_API_KEY is not set. In CI it is provided via Actions secrets; "
            "locally copy .env.example to .env and fill it in."
        )
    return base, {"Authorization": f"Bearer {key}", "Accept": "application/json"}


def fetch_categories() -> list[dict[str, Any]]:
    base, headers = _config()
    data = http_client.get(
        f"{base}/categories",
        namespace=NAMESPACE,
        headers=headers,
        rate_limit=RATE,
        expect_json=True,
    )
    if not isinstance(data, list):
        raise UpstreamError(f"unexpected /categories shape: {type(data).__name__}")
    return data


def fetch_startups(category_slug: str) -> list[dict[str, Any]]:
    base, headers = _config()
    data = http_client.get(
        f"{base}/categories/{category_slug}/startups",
        namespace=NAMESPACE,
        headers=headers,
        rate_limit=RATE,
        expect_json=True,
    )
    if not isinstance(data, list):
        raise UpstreamError(f"unexpected /startups shape for {category_slug}")
    return data


def _aggregate(slug: str, name: str, startups: list[dict[str, Any]]) -> dict[str, Any]:
    mrrs = [s["mrr"] for s in startups if isinstance(s.get("mrr"), (int, float))]
    growths = [s["growth_pct"] for s in startups if isinstance(s.get("growth_pct"), (int, float))]
    return {
        "source_slug": slug,
        "source_name": name,
        "category": mapping.canonicalize(name) or mapping.canonicalize(slug),
        "n_startups": len(startups),
        "median_mrr": statistics.median(mrrs) if mrrs else None,
        "mean_mrr": statistics.mean(mrrs) if mrrs else None,
        "median_growth": statistics.median(growths) if growths else None,
        "pct_growing": (sum(1 for g in growths if g > 0) / len(growths)) if growths else None,
        "examples": [
            {"name": s.get("name"), "mrr": s.get("mrr"), "growth_pct": s.get("growth_pct")}
            for s in sorted(startups, key=lambda s: s.get("mrr") or 0, reverse=True)[:3]
        ],
    }


def build_dataframe() -> pd.DataFrame:
    cats = fetch_categories()
    rows: list[dict[str, Any]] = []
    for cat in cats:
        slug = cat.get("slug") or cat.get("id")
        name = cat.get("name") or slug
        if not slug:
            log.warning("category without slug: %r", cat)
            continue
        try:
            startups = fetch_startups(slug)
        except (HostBlockedError, UpstreamError) as e:
            log.error("failed to fetch %s: %s", slug, e)
            continue
        rows.append(_aggregate(slug, name, startups))
    df = pd.DataFrame(rows)
    # drop rows we couldn't map to a canonical category (they can't join)
    unmapped = df[df["category"].isna()]
    if not unmapped.empty:
        log.warning("unmapped TrustMRR categories (extend mapping.ALIASES): %s",
                    unmapped["source_name"].tolist())
    return df[df["category"].notna()].copy()


def main() -> None:
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / "data" / "processed" / "trustmrr_categories.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    df = build_dataframe()
    df.to_csv(out, index=False)
    print(f"wrote {len(df)} categories -> {out}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    main()
