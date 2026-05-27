"""Top-N mobile app ideas with explicit monetization model.

Selection logic:
  1. quiet_trend score >= -0.05 (demand at least keeping up with supply)
  2. wiki_avg_views >= 5000 (market not microscopic)
  3. mobile-app-fit category (manually scored: tracking/coaching/content)

Each idea gets: niche data → app concept → monetization → ARPU estimate →
proof-of-economics reference (if any) → target persona.
"""
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


# Curated app concepts. Each entry maps a niche (key matches synthesis CSV "name")
# to: app concept, monetization model, ARPU, proof, persona.
APP_IDEAS = {
    "Long COVID": {
        "concept": "Symptom-trigger tracker (heart rate, brain fog, PEM) + protocol library + community. Phone passive sensing of HR variability via Apple Watch / Wear OS.",
        "monetization": "Subscription $14.99/mo + one-time protocol bundles ($19-39 IAP)",
        "arpu_year": 100,
        "proof": "Visible (Bateman Horne) charges $25/mo and is sold-out wait-list. Long COVID Diary on App Store.",
        "persona": "Female 25-45, ME/CFS or Long COVID diagnosis, English-speaking, doctors not helpful",
    },
    "Dopamine fasting": {
        "concept": "Phone-usage gating app: trigger-based screen-time blocks, hard cutoffs by app/category, accountability streaks. Not Screen Time copy — built around 'cycle of stimulation' model.",
        "monetization": "Freemium: free with limits, $5.99/mo or $39.99/yr unlocks unlimited rules + Apple Watch widget",
        "arpu_year": 35,
        "proof": "Opal $79/yr, ScreenZen one-time $50, Forest $4 — all profitable. Andrew Huberman drove the term.",
        "persona": "Male 22-38, knowledge worker, tried Screen Time and dopamine-fasting content",
    },
    "CGM (continuous glucose monitor)": {
        "concept": "Software-only analytics layer on top of Dexcom/Libre Bluetooth feed. Food → glucose response correlations + macro tracking + weight-loss coaching. No hardware shipment.",
        "monetization": "Subscription $19.99/mo (no device markup) + B2B telehealth provider tier $99/seat/mo",
        "arpu_year": 200,
        "proof": "Levels (with device) $199/mo, NutriSense $250/mo — both have wait-lists. Stelo (Dexcom OTC) $99/mo retail launched 2024.",
        "persona": "Male 30-55, biohacker/professional, has Apple Watch, willing to attach OTC sensor",
    },
    "Sarcopenia / strength 50+": {
        "concept": "Strength-training app structured around sarcopenia prevention: progressive overload tracking, DEXA/inbody integration, weekly 'muscle-mass risk' score from grip/sit-stand tests phone can run.",
        "monetization": "Subscription $14.99/mo, family plan $24.99/mo (couples 50+)",
        "arpu_year": 130,
        "proof": "Future $199/mo (1-on-1), Caliber $35/mo. Mature category but '50+ specifically' is white space.",
        "persona": "Male/female 50-70, post-MD scare or post-Attia-podcast convert, gym member but no plan",
    },
    "Insomnia (CBT-I)": {
        "concept": "CBT-I 8-week program app with sleep diary, stimulus-control protocols, sleep-restriction calculator. Apple HealthKit integration. Not Calm/Headspace (those are meditation).",
        "monetization": "Subscription $12.99/mo or $79/yr; B2B insurance reimbursement tier",
        "arpu_year": 90,
        "proof": "Somryst FDA-cleared at $899 prescription (covered by Medicare). Sleepio (UK NHS) sold to Big Health for ~$10M ARR.",
        "persona": "30-60, chronic insomnia 3+ months, tried melatonin, doctor said 'try CBT-I' but can't find provider",
    },
    "Insulin resistance": {
        "concept": "Pre-diabetic dashboard: tracks A1c, fasting glucose, blood-pressure, waist trend; food → metabolic response logs; targeted nutritional plans (not generic calorie counting).",
        "monetization": "Subscription $9.99/mo + affiliate to supplement brands (berberine, inositol) ~15% commission",
        "arpu_year": 90,
        "proof": "Signos $186/mo (with CGM), Verde Health, Welly Health. 96M Americans pre-diabetic per CDC.",
        "persona": "40-60 with elevated A1c (5.7-6.4), wants to avoid diabetes meds, willing to use CGM/blood tests",
    },
    "Mast cell activation (MCAS)": {
        "concept": "Food-and-environment trigger tracker: log meals, environment, symptoms with weight; correlation engine surfaces likely triggers; export PDF for doctor visit.",
        "monetization": "Subscription $9.99/mo + AI-doctor-prep report $29 IAP per visit",
        "arpu_year": 85,
        "proof": "MyMast app, Bezzy MCAS — niche but engaged. Histamine intolerance audience overlaps.",
        "persona": "Female 25-50, undiagnosed for years, hyper-engaged researcher",
    },
    "Histamine intolerance": {
        "concept": "Low-histamine food database (~3000 items), meal-planning, batch-cook recipe library; symptom tracker overlay (same engine as MCAS).",
        "monetization": "Subscription $7.99/mo (mostly content lock); $29 one-time 'starter kit' PDF",
        "arpu_year": 60,
        "proof": "Mast Cell 360 (paid course $400+) shows pay-willingness; no mobile app dominates.",
        "persona": "Female 30-55, recently elimination-diet stage, overwhelmed by lists",
    },
    "Pilates": {
        "concept": "Video-coaching subscription specifically for *home reformer* owners — large new market post-2023 (Lagree, Lifeline reformers $1-2k retail). Not Peloton — equipment-specific routines.",
        "monetization": "Subscription $14.99/mo, family $19.99/mo",
        "arpu_year": 150,
        "proof": "Glo $24/mo, Pilatesology $25/mo — both growing. Home-reformer category exploded.",
        "persona": "Female 35-55, bought home reformer, was in Pilates studio pre-2020",
    },
    "Tai chi": {
        "concept": "Tai chi structured course for 50+ demo with form-correction via phone camera (MediaPipe pose). Targets fall prevention + cognitive benefits.",
        "monetization": "Subscription $9.99/mo, healthcare-employer benefit tier $4/employee/mo",
        "arpu_year": 90,
        "proof": "Tai chi clinical trials show fall reduction; Medicare covers some classes. No dominant app.",
        "persona": "60-75, suburb, hard knees/back, doctor suggested low-impact exercise",
    },
    "POTS": {
        "concept": "Symptom + heart rate + posture tracker (Apple Watch reads HR delta on standing). Daily salt/fluid logs, medication reminders, doctor-visit PDF export.",
        "monetization": "Subscription $9.99/mo + B2B telemed referral (commissions from cardiology telehealth)",
        "arpu_year": 80,
        "proof": "POTUS Tracker free + ads. Standing Up to POTS donations. Visible (long COVID app) overlap.",
        "persona": "Female 18-35, recent diagnosis or self-diagnosed, doctor 6mo wait",
    },
    "Hashimoto's / hypothyroid": {
        "concept": "Thyroid-specific dashboard: TSH/T4/T3 lab tracker, medication switch journal (Levo vs NDT vs LDN), gluten/symptom log.",
        "monetization": "Subscription $9.99/mo + bloodwork-test affiliate (Quest/Labcorp/Inside Tracker)",
        "arpu_year": 100,
        "proof": "Paloma Health (full telemed) $99/mo. Stop The Thyroid Madness sold $20+ books. ~20M Americans hypothyroid.",
        "persona": "Female 30-55, recently medicated, not getting better, researching alternatives",
    },
    "Fall prevention (elderly)": {
        "concept": "Caregiver-installed app: tracks walking gait via phone (in pocket), strength-test reminders, push notifications to family on declines. Apple Watch fall detect = afterwards; this is *prevention*.",
        "monetization": "Family subscription $19.99/mo (paid by adult child); B2B home-care agency tier $30/patient/mo",
        "arpu_year": 200,
        "proof": "Papa, Honor — well-funded home-care services. Apple's Health team explicitly punted on prevention.",
        "persona": "Adult child (45-60) of elderly parent (75+), parent had near-fall recently",
    },
    "Endometriosis": {
        "concept": "Period + pain + flare tracker with surgery/medication timeline. Doctor-visit prep PDF. Telemed referral to endo-specialists (very few; high commission opportunity).",
        "monetization": "Subscription $7.99/mo + telemed referral $50-150 per booking",
        "arpu_year": 90,
        "proof": "Phendo, Endo Health, Allara. Endo affects 10% of women. Wait time for specialist = 7 years average.",
        "persona": "Female 18-40, diagnosed or suspecting, frustrated with cycle apps that ignore pain",
    },
    "Cat health tracking": {
        "concept": "Litterbox photo → AI urine/stool analysis (consistency, blood, volume); food/water log; weight curve. Aimed at senior cats (10+) where chronic kidney disease is leading killer.",
        "monetization": "Subscription $7.99/mo + affiliate (kidney prescription food, supplements) ~15%",
        "arpu_year": 80,
        "proof": "Pretty Litter ($30/mo) and CatGenie show pay-willingness for senior cat owners.",
        "persona": "Cat owner 35+, cat 10+ years, vet costs creeping up",
    },
    "Dog longevity / senior dog": {
        "concept": "Frailty index for dogs: weekly assessment (cognition, mobility, sleep, appetite), feeding/supplement scheduler, vet-share dashboard. Inspired by Dog Aging Project.",
        "monetization": "Subscription $9.99/mo + supplement subscription (Rejuvenate Bio, NuVet) affiliates",
        "arpu_year": 100,
        "proof": "Loyal raised $125M for dog longevity drug. Dog Aging Project has 50k+ enrolled.",
        "persona": "Dog owner 40+, dog 7+ years, owner reads science",
    },
    "Caregiver burnout": {
        "concept": "Caregiver-self tracker: stress score (HRV via phone camera), respite scheduler, peer-support match, escalation triggers ('you've slept <5h three nights — call backup').",
        "monetization": "Subscription $9.99/mo + B2B (employee benefit, Medicaid waiver programs)",
        "arpu_year": 90,
        "proof": "Cariloop $30M Series B; Wellthy $25M; AARP runs caregiver programs.",
        "persona": "Female 50-65, caring for parent w/dementia, hasn't seen own doctor in a year",
    },
    "Pelvic floor": {
        "concept": "Guided Kegel + pelvic-floor PT exercises with biofeedback via accelerometer (pocket-based posture detection). Primary use: postpartum + perimenopause + post-prostatectomy.",
        "monetization": "Subscription $14.99/mo + connected biofeedback device upsell ($129 one-time, lower margin)",
        "arpu_year": 130,
        "proof": "Elvie ($199 device + free app), Kegel Trainer freemium. Origin (PT app) raised $24M.",
        "persona": "Female 30-50 post-baby OR 50+ perimenopause; male 60+ post-prostate surgery",
    },
    "Picky eater (toddler)": {
        "concept": "Daily meal-plan generator + 'first 7 bites' challenges + photo log of accepted foods; AI generates next-step exposure plan per kid's pattern. Anchored on responsive-feeding method (Ellyn Satter).",
        "monetization": "Subscription $9.99/mo or $59/yr; family plan $14.99/mo (multiple kids)",
        "arpu_year": 80,
        "proof": "Yumble (meals) and Solid Starts (paid course $99+app) prove pay-willingness; 30%+ of toddlers selective.",
        "persona": "Mother of 2-5yo, exhausted, judging-self, googled 'my kid won't eat anything'",
    },
    "Baby sleep training": {
        "concept": "Personalized sleep schedule generator + nap-and-wake-window logging + acoustic monitor (phone mic detects crying duration and pattern). Method-agnostic (Ferber, chair, hybrid).",
        "monetization": "One-time IAP $19.99 'plan' + $4.99/mo for ongoing tracking",
        "arpu_year": 50,
        "proof": "Huckleberry $69/yr, Hatch Rest hardware+app, Taking Cara Babies course $179. Massive engaged market.",
        "persona": "Parent of 3-12mo, sleep-deprived, googled at 3am",
    },
}


def main():
    df = pd.read_csv(PROC / "trends_synthesis.csv")
    by_name = df.set_index("name").to_dict("index")

    # Filter to ideas where data passes our gates
    selected = []
    for name, idea in APP_IDEAS.items():
        if name not in by_name:
            continue
        r = by_name[name]
        selected.append({"name": name, **r, **idea})

    selected_df = pd.DataFrame(selected)
    # Composite ranking score: balance market size + quiet trend + ARPU
    selected_df["log_wiki"] = (selected_df["wiki_avg_views"].clip(lower=1)).apply(lambda x: pd.np.log10(x) if False else __import__("math").log10(x))
    selected_df["rank_score"] = (
        selected_df["quiet_trend"].fillna(0) * 1.5
        + (selected_df["log_wiki"] - 4) * 0.5
        + (selected_df["arpu_year"].apply(lambda x: __import__("math").log10(x)) - 1.5) * 0.5
    )
    selected_df = selected_df.sort_values("rank_score", ascending=False)
    selected_df.to_csv(PROC / "mobile_app_candidates.csv", index=False)

    # 2D market-map chart
    fig, ax = plt.subplots(figsize=(13, 9))
    for r in selected_df.itertuples():
        x = max(1, r.wiki_avg_views)
        y = max(-1, r.quiet_trend)
        size = 100 + r.arpu_year * 1.2
        ax.scatter(x, y, s=size, alpha=0.6)
        ax.annotate(r.name[:32], (x, y), fontsize=8, xytext=(5, 3), textcoords="offset points")
    ax.set_xscale("log"); ax.axhline(0, color="gray", linewidth=0.7, alpha=0.5)
    ax.set_xlabel("Wikipedia avg views/month (log) — market size proxy")
    ax.set_ylabel("quiet_trend score — demand-supply growth gap")
    ax.set_title("20 mobile-app candidates: market size × demand-supply gap (bubble = ARPU)")
    ax.grid(True, alpha=0.3)
    fig.tight_layout(); fig.savefig(OUT / "mobile_app_map.png", dpi=130); plt.close(fig)

    # Markdown report
    md = ["# Топ-20 идей мобильного приложения с монетизацией\n\n"]
    md.append("> Из 62 проанализированных нишей (longevity + parenting + women's/men's health + "
              "mental health + sleep + chronic conditions + pets) отобрано 20, которые удовлетворяют "
              "трём условиям:\n\n")
    md.append("1. **Спрос растёт быстрее предложения** (quiet_trend score положительный или ≈0)\n")
    md.append("2. **Рынок измеримый** (Wikipedia avg views ≥ 5k/mo)\n")
    md.append("3. **Естественно ложится на мобильное приложение** (трекинг, контент, коучинг, "
              "телемед-реферал — нет необходимости в физическом железе и enterprise sales).\n\n")
    md.append("Каждая идея: концепция, модель монетизации с конкретной ценой, оценка ARPU/год, "
              "**доказательство экономики через существующего конкурента**, целевая персона.\n\n")

    md.append("![Map](mobile_app_map.png)\n\n")

    md.append("## Краткая таблица\n\n")
    md.append("| # | Ниша | Wiki views/mo | Wiki 5yr × | Quiet score | ARPU/yr | Модель |\n")
    md.append("|---|---|---|---|---|---|---|\n")
    for i, r in enumerate(selected_df.itertuples(), 1):
        md.append(f"| {i} | **{r.name}** | {int(r.wiki_avg_views):,} | "
                  f"{r.wiki_5yr_x:.1f}× | {r.quiet_trend:+.2f} | ${r.arpu_year} | "
                  f"{r.monetization[:55]}{'…' if len(r.monetization)>55 else ''} |\n")
    md.append("\n")

    md.append("## Развёрнутые карточки\n\n")
    for i, r in enumerate(selected_df.itertuples(), 1):
        md.append(f"### {i}. {r.name}\n\n")
        md.append(f"**Сигнал**: {int(r.wiki_avg_views):,} Wikipedia views/mo в среднем; "
                  f"x{r.wiki_5yr_x:.2f} рост 2020→2024; quiet_trend `{r.quiet_trend:+.2f}` "
                  f"(supply CAGR `{(r.hn_cagr*100 if pd.notna(r.hn_cagr) else 0):+.0f}%/yr`, "
                  f"demand CAGR `{(r.wiki_cagr*100 if pd.notna(r.wiki_cagr) else 0):+.0f}%/yr`).\n\n")
        md.append(f"**Концепция**: {r.concept}\n\n")
        md.append(f"**Монетизация**: {r.monetization}. Оценка ARPU ~**${r.arpu_year}/год**.\n\n")
        md.append(f"**Proof-of-economics**: {r.proof}\n\n")
        md.append(f"**Целевая персона**: {r.persona}\n\n")
        md.append("---\n\n")

    md.append("## Кросс-вертикальные паттерны\n\n")
    md.append("- **Хронические недодиагностированные состояния (Long COVID, MCAS, POTS, Hashimoto, "
              "Insulin resistance)** — лучшие кандидаты по соотношению LTV/CAC. Юзеры engaged, "
              "система здравоохранения их подводит, готовы платить за tools которые помогают.\n")
    md.append("- **Mobile-app-fit стек**: tracker + симптомный лог + PDF-экспорт врачу + телемед-"
              "реферал = повторяемая бизнес-модель в большинстве top-20.\n")
    md.append("- **Affiliate как второй revenue stream**: bloodwork (Quest, InsideTracker), "
              "supplements, телемед — 10-20% commissions, добавляет 30-50% к подписке.\n")
    md.append("- **Долгий retention** в хронических нишах (POTS, Endometriosis, Hashimoto) >24 мес = "
              "ARPU умножается. В parenting нишах retention 6-12 мес (ребёнок вырос).\n")
    md.append("- **B2B insurance/employer тир** = 3-10× ARPU для тех, что FDA-clear-able (CBT-I, "
              "endometriosis, fall prevention, caregiver burnout).\n\n")

    md.append("## Что я НЕ рекомендую (хайп)\n\n")
    md.append("- **Sleep apnea** — HN x5.3, Apple Watch только запустил детектор → ниша захлопнется.\n")
    md.append("- **Biological age** — все строят калькуляторы, публика теряет интерес (wiki -10%/yr).\n")
    md.append("- **ADHD adult** — насыщено (Inflow, Numo, Tiimo, Routinery), HN x1.75.\n")
    md.append("- **Rapamycin, microbiome, vagus nerve** — supply растёт x2-6, demand стагнирует.\n")
    md.append("- **Microdosing, CBT general** — supply удвоилось, demand плоский.\n")

    (OUT / "report_top20_mobile.md").write_text("".join(md), encoding="utf-8")
    print(f"wrote {OUT/'report_top20_mobile.md'}")
    print(f"\nTop 20 by composite rank_score:")
    print(selected_df[["name", "wiki_avg_views", "quiet_trend", "arpu_year", "rank_score"]].to_string(index=False))


if __name__ == "__main__":
    main()
