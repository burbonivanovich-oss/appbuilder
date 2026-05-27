"""Pull articles from Russia-relevant Habr hubs and extract pain/import-substitution signals.

Habr API endpoint: /kek/v2/articles/?perPage=20&page=N&period=monthly&hub=<alias>
Response shape: { pagesCount, publicationIds, publicationRefs: {id: article} }
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "habr"
PROC = ROOT / "data" / "processed"
RAW.mkdir(parents=True, exist_ok=True)
PROC.mkdir(parents=True, exist_ok=True)

HUBS = [
    "saas", "crm", "ecommerce", "marketing", "analytics",
    "infosecurity", "billing", "design", "productpm",
    "hr_management", "sales", "ai_and_ml", "develop", "devops",
    "zero-code_development", "support", "management",
    "mobile_development", "dev_management",
]
PERIODS = ["monthly", "yearly"]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0"

# Strong Russia-specific demand signals
PAIN_PATTERNS = [
    ("seeking_alt", re.compile(r"\bищ[уе]м?\s+(аналог|альтернатив|сервис|инструмент|систем|тул|платформ)", re.I)),
    ("western_alt", re.compile(r"\b(западн|зарубежн|иностранн)\w*\s+аналог", re.I)),
    ("import_subst", re.compile(r"импортозамещ", re.I)),
    ("sanctions", re.compile(r"санкц", re.I)),
    ("no_good_tool", re.compile(r"\bнет\s+(нормальн|хорош)\w*\s+(сервис|инструмент|альтернатив)", re.I)),
    ("russian_alt", re.compile(r"\bроссийск\w+\s+(аналог|сервис|альтернатив|crm|erp)", re.I)),
    ("domestic_sw", re.compile(r"\bотечественн\w+\s+(аналог|сервис|по|софт|реестр)", re.I)),
    ("migrating_from", re.compile(r"\b(перех\w+|миграц|съезжае?м?)\s+с\s+[A-Za-z]", re.I)),
    ("anti_case", re.compile(r"\bанти[- ]кейс|\bпровальн|\bпочему\s+(мы|.*?)\s+(отказал|ушл)", re.I)),
    ("western_tools_in_title", re.compile(r"\b(jira|notion|slack|salesforce|hubspot|airtable|figma|trello|atlassian|miro|github|stripe|intercom|zendesk|asana|monday)\b", re.I)),
    ("ru_incumbents", re.compile(r"\b(битрикс|bitrix|amo\s?crm|1[Сc]\b|мойсклад|moysklad|тильда|tilda|контур|kontur|роистат|yandex\s+cloud|sber\s?cloud|т-банк|тинькоф)\b", re.I)),
]


def fetch_hub(hub: str, period: str, client: httpx.Client, pages: int = 3) -> list[dict] | None:
    """Returns merged publicationRefs (as a list of dicts with id field) across pages."""
    cache = RAW / f"{hub}_{period}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    out: list[dict] = []
    pages_total = None
    for page in range(1, pages + 1):
        url = f"https://habr.com/kek/v2/articles/?perPage=20&page={page}&period={period}&hub={hub}"
        try:
            r = client.get(url, timeout=15.0)
        except Exception as e:
            print(f"[habr] {hub}/{period}/p{page}: err {e}")
            break
        if r.status_code != 200:
            if page == 1:
                print(f"[habr] {hub}/{period}: HTTP {r.status_code}")
                return None
            break
        data = r.json()
        refs = data.get("publicationRefs") or {}
        for pid, art in refs.items():
            art["_id"] = pid
            out.append(art)
        if pages_total is None:
            pages_total = data.get("pagesCount") or 1
        if page >= pages_total:
            break
        time.sleep(1.5)
    cache.write_text(json.dumps(out, ensure_ascii=False))
    return out


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "")


def extract_pain(articles: list[dict], hub: str, period: str) -> list[dict]:
    out = []
    for a in articles:
        pid = a.get("_id")
        title = strip_html(a.get("titleHtml") or "")
        lead = strip_html(a.get("leadData", {}).get("textHtml") or "") if isinstance(a.get("leadData"), dict) else ""
        text = f"{title}\n{lead}"
        matched: list[str] = []
        for name, pat in PAIN_PATTERNS:
            if pat.search(text):
                matched.append(name)
        if not matched:
            continue
        out.append({
            "hub": hub,
            "period": period,
            "id": pid,
            "title": title[:240],
            "lead": lead[:400],
            "url": f"https://habr.com/ru/articles/{pid}/",
            "published": a.get("timePublished"),
            "score": a.get("statistics", {}).get("score") if isinstance(a.get("statistics"), dict) else None,
            "reads": a.get("statistics", {}).get("readingCount") if isinstance(a.get("statistics"), dict) else None,
            "patterns": matched,
            "hubs": [h.get("alias") for h in (a.get("hubs") or [])],
        })
    return out


def main():
    headers = {"User-Agent": UA, "Accept": "application/json"}
    all_articles = []
    all_pain = []
    with httpx.Client(headers=headers) as client:
        for hub in HUBS:
            for period in PERIODS:
                data = fetch_hub(hub, period, client)
                if not data:
                    continue
                if not data:
                    print(f"[habr] {hub}/{period}: 0 articles")
                    continue
                for a in data:
                    all_articles.append({
                        "id": a.get("_id"), "hub_query": hub, "period": period,
                        "title": strip_html(a.get("titleHtml") or ""),
                        "published": a.get("timePublished"),
                        "hubs": [h.get("alias") for h in (a.get("hubs") or [])],
                        "score": a.get("statistics", {}).get("score") if isinstance(a.get("statistics"), dict) else None,
                    })
                pain = extract_pain(data, hub, period)
                print(f"[habr] {hub}/{period}: {len(data)} articles, {len(pain)} pain signals")
                all_pain.extend(pain)

    (PROC / "habr_articles.json").write_text(json.dumps(all_articles, ensure_ascii=False, indent=2))
    # Dedupe pain by article id
    seen = set(); uniq = []
    for p in all_pain:
        if p["id"] in seen: continue
        seen.add(p["id"]); uniq.append(p)
    (PROC / "habr_pain_signals.json").write_text(json.dumps(uniq, ensure_ascii=False, indent=2))
    print(f"wrote {len(all_articles)} articles, {len(uniq)} unique pain quotes")


if __name__ == "__main__":
    main()
