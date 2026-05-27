"""Detect 'quiet trends' — niches with rising demand but flat builder activity.

For each (sub-niche, wiki_slug) candidate, fetch three time series:
  1. Wikipedia pageviews 2020→present (monthly) — demand proxy
  2. HN Algolia story count per year — builder/tech-press interest proxy
  3. PubMed publication count per year — academic interest proxy

The QUIET TREND score = z(wiki_5yr_growth) - z(hn_5yr_growth).
Strong positive = public interest rising but builders not yet here.
"""
from __future__ import annotations

import datetime
import json
import time
import urllib.parse
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "trends"
PROC = ROOT / "data" / "processed"
RAW.mkdir(parents=True, exist_ok=True)

# (display_name, wiki_article, hn/pubmed_query)
# Wikipedia titles must match exactly; check via https://en.wikipedia.org/wiki/<slug>
NICHES = [
    # ── longevity (already partly tested in v1) ─────────────────────────
    ("Longevity (umbrella)", "Longevity", "longevity"),
    ("Podiatry / foot health", "Podiatry", "podiatry OR podology"),
    ("Menopause", "Menopause", "menopause"),
    ("Sarcopenia / strength 50+", "Sarcopenia", "sarcopenia"),
    ("CGM (continuous glucose monitor)", "Continuous_glucose_monitor", "continuous glucose monitor"),
    ("HRV / heart-rate variability", "Heart_rate_variability", "heart rate variability"),
    ("Sleep apnea", "Sleep_apnea", "sleep apnea"),
    ("Microbiome", "Human_microbiome", "microbiome"),
    ("NAD+ supplementation", "Nicotinamide_adenine_dinucleotide", "NAD+ supplement"),
    ("Rapamycin", "Sirolimus", "rapamycin"),
    ("Biological age", "Biological_age", "biological age"),
    ("Mitochondrial health", "Mitochondrion", "mitochondrial health"),
    ("Senescence / senolytics", "Cellular_senescence", "senolytics"),
    ("Cold exposure / cold plunge", "Cold_shower", "cold plunge OR cold exposure"),
    ("Red light therapy", "Light_therapy", "red light therapy"),
    ("Sauna / heat therapy", "Sauna", "sauna therapy"),
    ("Vagus nerve stimulation", "Vagus_nerve", "vagus nerve"),
    ("Time-restricted eating", "Intermittent_fasting", "intermittent fasting"),
    ("VO2 max", "VO2_max", "VO2 max"),
    # ── parenting ───────────────────────────────────────────────────────
    ("Postpartum depression", "Postpartum_depression", "postpartum depression"),
    ("Baby sleep training", "Sleep_training", "baby sleep training"),
    ("Breastfeeding / lactation", "Breastfeeding", "breastfeeding tracker"),
    ("Picky eater (toddler)", "Selective_eating", "picky eater toddler"),
    ("Co-parenting (post-divorce)", "Co-parenting", "co-parenting app"),
    ("Pregnancy nutrition", "Maternal_nutrition", "pregnancy nutrition"),
    # ── women's health ──────────────────────────────────────────────────
    ("Endometriosis", "Endometriosis", "endometriosis"),
    ("PCOS", "Polycystic_ovary_syndrome", "PCOS"),
    ("Pelvic floor", "Pelvic_floor", "pelvic floor"),
    ("Fertility tracking", "Fertility_awareness", "fertility tracking"),
    ("Cycle syncing / hormonal cycle", "Menstrual_cycle", "cycle syncing"),
    # ── men's health ────────────────────────────────────────────────────
    ("Testosterone optimization", "Testosterone", "testosterone optimization"),
    ("Hair loss (male)", "Pattern_hair_loss", "hair loss men"),
    ("Erectile dysfunction (telehealth)", "Erectile_dysfunction", "erectile dysfunction"),
    ("Prostate health", "Prostate", "prostate health"),
    # ── mental health / neurodiv ────────────────────────────────────────
    ("ADHD (adult)", "Attention_deficit_hyperactivity_disorder", "adult ADHD"),
    ("Burnout", "Occupational_burnout", "burnout"),
    ("CBT (cognitive behavioral)", "Cognitive_behavioral_therapy", "CBT app"),
    ("Microdosing", "Microdosing", "microdosing"),
    ("Dopamine fasting", "Dopamine_fasting", "dopamine fasting"),
    ("Anxiety (general)", "Anxiety", "anxiety app"),
    # ── sleep ───────────────────────────────────────────────────────────
    ("Insomnia (CBT-I)", "Insomnia", "insomnia CBT"),
    ("Jet lag", "Jet_lag", "jet lag app"),
    # ── chronic / niche conditions ──────────────────────────────────────
    ("Long COVID", "Long_COVID", "long covid"),
    ("Lyme disease", "Lyme_disease", "lyme disease"),
    ("POTS", "Postural_orthostatic_tachycardia_syndrome", "POTS"),
    ("Mast cell activation (MCAS)", "Mast_cell_activation_syndrome", "MCAS mast cell"),
    ("Hashimoto's / hypothyroid", "Hashimoto's_thyroiditis", "Hashimoto thyroid"),
    ("Insulin resistance", "Insulin_resistance", "insulin resistance"),
    ("Fatty liver / NAFLD", "Non-alcoholic_fatty_liver_disease", "fatty liver NAFLD"),
    ("Histamine intolerance", "Histamine_intolerance", "histamine intolerance"),
    # ── aging-in-place / elder care ─────────────────────────────────────
    ("Caregiver burnout", "Caregiver", "caregiver burnout"),
    ("Fall prevention (elderly)", "Falls_in_older_adults", "fall prevention elderly"),
    ("Medication management (elderly)", "Polypharmacy", "medication management app"),
    ("Dementia care", "Caring_for_people_with_dementia", "dementia care app"),
    # ── pets ────────────────────────────────────────────────────────────
    ("Dog longevity / senior dog", "Dog_health", "dog longevity senior"),
    ("Cat health tracking", "Cat_health", "cat health tracker"),
    # ── hobbies w/ health crossover ─────────────────────────────────────
    ("Gardening", "Gardening", "gardening app"),
    ("Tai chi", "Tai_chi", "tai chi"),
    ("Pilates", "Pilates", "pilates app"),
    # ── control / hyped (to compare) ────────────────────────────────────
    ("Padel (hype control)", "Padel", "padel"),
    ("GLP-1 / Ozempic (hype control)", "Glucagon-like_peptide-1_receptor_agonist", "GLP-1 OR ozempic"),
    ("Pickleball (hype control)", "Pickleball", "pickleball"),
]


def wiki_views(slug: str, client: httpx.Client) -> list[dict] | None:
    cache = RAW / f"wiki_{slug}.json"
    if cache.exists():
        return json.loads(cache.read_text())
    url = (
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/"
        f"en.wikipedia/all-access/user/{urllib.parse.quote(slug, safe='')}/monthly/"
        "2020010100/2026050100"
    )
    try:
        r = client.get(url, headers={"User-Agent": "longevity-research/0.1 (research@example.com)"})
    except Exception as e:
        print(f"[wiki] {slug} err {e}")
        return None
    if r.status_code != 200:
        print(f"[wiki] {slug}: HTTP {r.status_code}")
        return None
    items = r.json().get("items", [])
    cache.write_text(json.dumps(items))
    return items


def hn_year(query: str, year: int, client: httpx.Client) -> int | None:
    start = int(datetime.datetime(year, 1, 1).timestamp())
    end = int(datetime.datetime(year, 12, 31, 23, 59).timestamp())
    url = (
        "https://hn.algolia.com/api/v1/search?"
        f"query={urllib.parse.quote(query)}&tags=story"
        f"&numericFilters=created_at_i>{start},created_at_i<{end}&hitsPerPage=1"
    )
    try:
        r = client.get(url)
        return r.json().get("nbHits")
    except Exception:
        return None


def hn_by_year(query: str, client: httpx.Client) -> dict[int, int]:
    cache = RAW / f"hn_{query.replace(' ', '_').replace('/', '_').replace('+', 'plus')[:80]}.json"
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text()).items()}
    out = {}
    for y in range(2020, 2026):
        n = hn_year(query, y, client)
        out[y] = n if n is not None else 0
        time.sleep(0.2)
    cache.write_text(json.dumps(out))
    return out


def pubmed_year(query: str, year: int, client: httpx.Client) -> int | None:
    url = (
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"
        f"db=pubmed&term={urllib.parse.quote(query + ' AND ' + str(year) + '[dp]')}"
        "&retmode=json&retmax=0"
    )
    try:
        r = client.get(url)
        return int(r.json()["esearchresult"]["count"])
    except Exception as e:
        return None


def pubmed_by_year(query: str, client: httpx.Client) -> dict[int, int]:
    cache = RAW / f"pm_{query.replace(' ', '_').replace('/', '_').replace('+', 'plus')[:80]}.json"
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text()).items()}
    out = {}
    for y in range(2020, 2026):
        n = pubmed_year(query, y, client)
        out[y] = n if n is not None else 0
        time.sleep(0.4)  # NCBI requests <=3/sec
    cache.write_text(json.dumps(out))
    return out


def yearly_sum(items: list[dict], year: int) -> int:
    return sum(i.get("views", 0) for i in items if i["timestamp"].startswith(str(year)))


def main():
    out_rows = []
    with httpx.Client(timeout=20.0) as client:
        for name, slug, q in NICHES:
            print(f"[{name}] fetching...")
            wiki = wiki_views(slug, client) or []
            hn = hn_by_year(q, client)
            pm = pubmed_by_year(q, client)
            row = {"name": name, "wiki_slug": slug, "query": q}
            for y in range(2020, 2026):
                row[f"wiki_{y}"] = yearly_sum(wiki, y)
                row[f"hn_{y}"] = hn.get(y, 0)
                row[f"pm_{y}"] = pm.get(y, 0)
            out_rows.append(row)
            time.sleep(0.3)

    (PROC / "trends_raw.json").write_text(json.dumps(out_rows, ensure_ascii=False, indent=2))
    print(f"wrote trends_raw.json with {len(out_rows)} niches")


if __name__ == "__main__":
    main()
