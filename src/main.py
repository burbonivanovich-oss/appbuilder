"""Orchestrator. Each step is independent and failure-isolated: if a source
is blocked or its credential is missing, the step records the failure but the
pipeline continues so downstream steps can still produce a partial report."""
from __future__ import annotations

import argparse
import logging
import traceback

from dotenv import load_dotenv

from . import fetch_oss, fetch_ph, fetch_reddit, fetch_trustmrr, report, synthesize, deepdive

log = logging.getLogger("main")

STEPS = {
    "trustmrr": fetch_trustmrr.main,
    "ph":       fetch_ph.main,
    "oss":      fetch_oss.main,
    "reddit":   fetch_reddit.main,
    "synth":    synthesize.main,
    "report":   report.render,
    "deepdive": deepdive.main,
}


def run(only: list[str] | None) -> dict[str, str]:
    results: dict[str, str] = {}
    for name, fn in STEPS.items():
        if only and name not in only:
            continue
        try:
            fn()
            results[name] = "ok"
        except Exception as e:  # noqa: BLE001 - we want to keep going
            log.error("step %s failed: %s", name, e)
            log.debug("%s", traceback.format_exc())
            results[name] = f"FAILED: {type(e).__name__}: {e}"
    return results


def main() -> None:
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", choices=list(STEPS),
                    help="run only these steps (default: all)")
    args = ap.parse_args()
    results = run(args.only)
    print("\n=== run summary ===")
    for k, v in results.items():
        print(f"  {k:10s} {v}")


if __name__ == "__main__":
    main()
