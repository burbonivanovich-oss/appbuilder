"""Smoke tests that don't hit the network."""
from __future__ import annotations

import pandas as pd

from src import mapping
from src.fetch_oss import parse_categories
from src.fetch_reddit import extract_pain_quotes
from src.synthesize import synthesize


def test_canonicalize_aliases() -> None:
    assert mapping.canonicalize("Help Desk") == "customer-support"
    assert mapping.canonicalize("CRM tools") == "crm"
    assert mapping.canonicalize("totally unknown thing") is None


def test_parse_categories_extracts_repos() -> None:
    md = (
        "## Analytics\n"
        "- [PostHog](https://github.com/posthog/posthog) -- analytics\n"
        "- [Plausible](https://github.com/plausible/analytics) -- privacy analytics\n"
        "## CRM\n"
        "- [Twenty](https://github.com/twentyhq/twenty) -- crm\n"
    )
    out = parse_categories(md)
    assert ("posthog", "posthog") in out["Analytics"]
    assert ("plausible", "analytics") in out["Analytics"]
    assert ("twentyhq", "twenty") in out["CRM"]


def test_pain_extraction() -> None:
    text = "I wish there was a tool for tracking subscription billing across multiple gateways."
    quotes = extract_pain_quotes(text)
    assert quotes and "tracking subscription billing" in quotes[0].lower()


def test_synth_handles_partial_sources(tmp_path, monkeypatch) -> None:
    # write only the OSS dataset, simulating blocked TrustMRR/PH/Reddit
    processed = tmp_path / "data" / "processed"
    processed.mkdir(parents=True)
    pd.DataFrame([
        {"category": "analytics", "n_oss_alternatives": 10, "median_stars": 5000,
         "max_stars": 18000, "has_dominant_player": False, "top_repos": "[]"},
        {"category": "crm",       "n_oss_alternatives": 3,  "median_stars": 1200,
         "max_stars": 22000, "has_dominant_player": True,  "top_repos": "[]"},
    ]).to_csv(processed / "oss_competition.csv", index=False)

    monkeypatch.setattr("src.synthesize.PROCESSED", processed)
    df = synthesize()
    assert set(df["category"]) == {"analytics", "crm"}
    assert (df["n_sources"] == 1).all()
    assert (df["coverage"] == "oss").all()
    # opportunity_score must be finite even with only one source
    assert df["opportunity_score"].notna().all()
