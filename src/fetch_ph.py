"""Step 2: Product Hunt launches via GraphQL v2 API.

Aggregates the last 12 months of launches and computes, per topic:
    n_launches, median_votes, pct_high_traction (votes > 500).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd

from . import http_client, mapping
from .http_client import RateLimit

log = logging.getLogger(__name__)

NAMESPACE = "producthunt"
ENDPOINT = "https://api.producthunt.com/v2/api/graphql"
RATE = RateLimit(min_interval_s=1.0)

QUERY = """
query PostsByDate($after: String, $postedAfter: DateTime!) {
  posts(first: 50, after: $after, postedAfter: $postedAfter, order: NEWEST) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id name votesCount createdAt
        topics { edges { node { name } } }
      }
    }
  }
}
"""


def _headers() -> dict[str, str]:
    token = os.environ.get("PRODUCTHUNT_TOKEN")
    if not token:
        raise RuntimeError(
            "PRODUCTHUNT_TOKEN is not set. Create a developer app at "
            "https://api.producthunt.com/v2/oauth/applications and use a client_credentials token."
        )
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def fetch_posts_since(posted_after: datetime) -> list[dict[str, Any]]:
    headers = _headers()
    posts: list[dict[str, Any]] = []
    cursor: str | None = None
    while True:
        body = {
            "query": QUERY,
            "variables": {"after": cursor, "postedAfter": posted_after.isoformat()},
        }
        data = http_client.post_json(
            ENDPOINT, namespace=NAMESPACE, json_body=body, headers=headers, rate_limit=RATE
        )
        page = data.get("data", {}).get("posts")
        if not page:
            errors = data.get("errors")
            raise RuntimeError(f"Product Hunt returned no posts: {errors}")
        for edge in page["edges"]:
            posts.append(edge["node"])
        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]
    return posts


def build_dataframe() -> pd.DataFrame:
    posted_after = datetime.now(timezone.utc) - timedelta(days=365)
    posts = fetch_posts_since(posted_after)

    # explode posts by topic
    rows: list[dict[str, Any]] = []
    for p in posts:
        topics = [t["node"]["name"] for t in p.get("topics", {}).get("edges", [])]
        for t in topics:
            cat = mapping.canonicalize(t)
            if cat is None:
                continue
            rows.append({"category": cat, "votes": p.get("votesCount", 0)})
    if not rows:
        return pd.DataFrame(columns=["category", "n_launches", "median_votes", "pct_high_traction"])
    long_df = pd.DataFrame(rows)
    agg = (
        long_df.groupby("category")
        .agg(
            n_launches=("votes", "count"),
            median_votes=("votes", "median"),
            pct_high_traction=("votes", lambda v: (v > 500).mean()),
        )
        .reset_index()
    )
    return agg


def main() -> None:
    from pathlib import Path
    out = Path(__file__).resolve().parent.parent / "data" / "processed" / "ph_categories.csv"
    out.parent.mkdir(parents=True, exist_ok=True)
    df = build_dataframe()
    df.to_csv(out, index=False)
    print(f"wrote {len(df)} PH categories -> {out}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    main()
