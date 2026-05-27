"""Parse awesome-oss-alternatives + open-source-alternatives READMEs into a category→repos table."""
from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT_CSV = ROOT / "data" / "processed" / "oss_entries.csv"
OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

REPO_RE = re.compile(r"github\.com/([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+)")


def parse_runa() -> list[dict]:
    """Runa: single big markdown table with leading 'Category|Tool|Description|stars-badge|SaaS-alt'."""
    src = RAW / "awesome_oss_runa.md"
    if not src.exists():
        return []
    rows: list[dict] = []
    in_table = False
    for line in src.read_text(encoding="utf-8").splitlines():
        if line.startswith("## Startup List"):
            in_table = True
            continue
        if in_table and line.startswith("## "):
            break
        if not in_table:
            continue
        if "|" not in line:
            continue
        if line.lstrip().startswith("Category") or line.lstrip().startswith(":---"):
            continue
        cells = [c.strip() for c in line.split("|")]
        if len(cells) < 4:
            continue
        category = cells[0]
        if not category or category.startswith(":"):
            continue
        body = " ".join(cells[1:])
        m = REPO_RE.search(body)
        if not m:
            continue
        # extract SaaS alternative (last cell)
        saas_alt = cells[-1] if len(cells) >= 5 else ""
        saas_alt_name = ""
        am = re.search(r"\[([^\]]+)\]\(", saas_alt)
        if am:
            saas_alt_name = am.group(1)
        rows.append({
            "source": "runa",
            "category": category,
            "owner": m.group(1),
            "repo": m.group(2),
            "saas_alternative": saas_alt_name,
        })
    return rows


def parse_btwso() -> list[dict]:
    """btw-so: H3 sections, each followed by a small markdown table."""
    src = RAW / "awesome_oss_btwso.md"
    if not src.exists():
        return []
    rows: list[dict] = []
    current_cat: str | None = None
    for line in src.read_text(encoding="utf-8").splitlines():
        h = re.match(r"^###\s+(.+?)\s*$", line)
        if h:
            current_cat = h.group(1).rstrip(":").strip()
            continue
        if not current_cat:
            continue
        if "|" not in line:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells or cells[0].lower().startswith("company") or cells[0].startswith(":"):
            continue
        joined = line
        m = REPO_RE.search(joined)
        if not m:
            continue
        rows.append({
            "source": "btwso",
            "category": current_cat,
            "owner": m.group(1),
            "repo": m.group(2),
            "saas_alternative": "",
        })
    return rows


def main():
    rows = parse_runa() + parse_btwso()
    # dedupe by (owner, repo) keeping first
    seen = set()
    uniq = []
    for r in rows:
        key = (r["owner"].lower(), r["repo"].lower())
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["source", "category", "owner", "repo", "saas_alternative"])
        w.writeheader()
        w.writerows(uniq)
    print(f"wrote {OUT_CSV}: {len(uniq)} unique entries across {len({r['category'] for r in uniq})} categories")


if __name__ == "__main__":
    main()
