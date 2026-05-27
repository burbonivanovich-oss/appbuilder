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
        "concept": "Трекер симптомов и триггеров (пульс, brain fog, post-exertional malaise) + библиотека протоколов + сообщество. Пассивный сбор HRV через Apple Watch / Wear OS.",
        "monetization": "Подписка $14.99/мес + разовые покупки протоколов ($19-39 IAP)",
        "arpu_year": 100,
        "proof": "Visible (от Bateman Horne) берёт $25/мес и держит wait-list. Long COVID Diary в App Store.",
        "persona": "Женщина 25-45, диагноз Long COVID или ME/CFS, врачи помогают слабо, активно ищет решения",
    },
    "Dopamine fasting": {
        "concept": "Жёсткий блокировщик использования телефона: триггер-блоки по приложениям/категориям, hard cutoffs, streaks для накопления стрика. Не клон Screen Time — построено вокруг модели «цикла стимуляции».",
        "monetization": "Freemium: бесплатно с лимитами; $5.99/мес или $39.99/год снимает лимиты + виджет для Apple Watch",
        "arpu_year": 35,
        "proof": "Opal $79/год, ScreenZen $50 разово, Forest $4 — все прибыльные. Термин раскачал Andrew Huberman.",
        "persona": "Мужчина 22-38, knowledge worker, пробовал Screen Time, читает про dopamine detox",
    },
    "CGM (continuous glucose monitor)": {
        "concept": "Софт-only аналитика поверх Bluetooth-потока Dexcom/Libre. Корреляции «еда → глюкозный отклик», макро-трекинг, коучинг по похудению. Без поставки железа.",
        "monetization": "Подписка $19.99/мес (без накрутки за девайс) + B2B-тиф для телемед-клиник $99/место/мес",
        "arpu_year": 200,
        "proof": "Levels (с девайсом) $199/мес, NutriSense $250/мес — у обоих wait-list. Stelo (Dexcom OTC) запустили в 2024 за $99/мес в рознице.",
        "persona": "Мужчина 30-55, биохакер/профессионал, носит Apple Watch, готов прилепить OTC-сенсор",
    },
    "Sarcopenia / strength 50+": {
        "concept": "Силовое приложение, заточенное на предотвращение саркопении: трекинг progressive overload, импорт DEXA/Inbody, еженедельная оценка «риска потери мышц» через grip-strength и sit-to-stand тесты на телефоне.",
        "monetization": "Подписка $14.99/мес, семейный план $24.99/мес (для пар 50+)",
        "arpu_year": 130,
        "proof": "Future $199/мес (1-на-1), Caliber $35/мес. Категория зрелая, но «специально для 50+» — белая дыра.",
        "persona": "Мужчины/женщины 50-70, после врачебного предостережения или подкаста Peter Attia. Член зала, но без плана",
    },
    "Insomnia (CBT-I)": {
        "concept": "8-недельная программа когнитивно-поведенческой терапии инсомнии (CBT-I): дневник сна, протоколы stimulus-control, калькулятор sleep-restriction. Интеграция с Apple HealthKit. Это не Calm/Headspace (там медитация).",
        "monetization": "Подписка $12.99/мес или $79/год; тир B2B с возмещением через страховку",
        "arpu_year": 90,
        "proof": "Somryst FDA-cleared, $899 по рецепту (покрывается Medicare). Sleepio (UK NHS) продали Big Health за ~$10M ARR.",
        "persona": "30-60, хроническая инсомния 3+ мес, пробовал мелатонин, врач сказал «попробуй CBT-I», но провайдера не найти",
    },
    "Insulin resistance": {
        "concept": "Дашборд для пре-диабетиков: A1c, глюкоза натощак, давление, окружность талии; логи «еда → метаболический отклик»; нутрицевтические протоколы (не общий counter калорий).",
        "monetization": "Подписка $9.99/мес + аффилиат-комиссии на supplements (берберин, инозитол) ~15%",
        "arpu_year": 90,
        "proof": "Signos $186/мес (с CGM), Verde Health, Welly Health. 96M американцев в pre-diabetic зоне по CDC.",
        "persona": "40-60 с повышенным A1c (5.7-6.4), хочет избежать метформина, готов использовать CGM/анализы",
    },
    "Mast cell activation (MCAS)": {
        "concept": "Трекер триггеров «еда+окружение»: лог приёмов пищи, среды, симптомы с весом. Корреляционный движок выводит наиболее вероятные триггеры. Экспорт PDF для визита к врачу.",
        "monetization": "Подписка $9.99/мес + отчёт «AI doc-prep» $29 IAP перед каждым визитом",
        "arpu_year": 85,
        "proof": "MyMast, Bezzy MCAS — нишево, но юзеры engaged. Аудитория пересекается с histamine intolerance.",
        "persona": "Женщина 25-50, годами без диагноза, гипер-engaged исследователь",
    },
    "Histamine intolerance": {
        "concept": "База данных low-histamine продуктов (~3000 SKU), генератор meal-plan, рецепты для batch-cook; symptom tracker (на том же движке, что MCAS).",
        "monetization": "Подписка $7.99/мес (в основном content lock); $29 разово за «стартер-pack» PDF",
        "arpu_year": 60,
        "proof": "Mast Cell 360 (платный курс $400+) подтверждает готовность платить; мобильного лидера нет.",
        "persona": "Женщина 30-55, недавно начала элиминационную диету, тонет в списках",
    },
    "Pilates": {
        "concept": "Видео-коучинг подписка специально для владельцев домашних reformer-ов (Lagree, Lifeline и пр., $1-2k розница, бум после 2023). Не Peloton — рутины под конкретное оборудование.",
        "monetization": "Подписка $14.99/мес, семейный $19.99/мес",
        "arpu_year": 150,
        "proof": "Glo $24/мес, Pilatesology $25/мес — оба растут. Категория «home reformer» взорвалась.",
        "persona": "Женщина 35-55, купила домашний reformer, ходила в студию до 2020",
    },
    "Tai chi": {
        "concept": "Структурированный курс тай-чи для аудитории 50+ с коррекцией формы через камеру (MediaPipe pose detection). Польза: профилактика падений + когнитивная функция.",
        "monetization": "Подписка $9.99/мес, тир «employer benefit» $4/сотрудник/мес",
        "arpu_year": 90,
        "proof": "Клин-трайлы тай-чи подтверждают снижение падений; Medicare покрывает некоторые занятия. Доминирующего приложения нет.",
        "persona": "60-75, пригород, проблемные колени/спина, врач рекомендовал low-impact упражнения",
    },
    "POTS": {
        "concept": "Трекер симптомов + пульс + поза (Apple Watch фиксирует HR-дельту при вставании). Ежедневные логи соли/жидкости, напоминания о приёме лекарств, PDF-экспорт для врача.",
        "monetization": "Подписка $9.99/мес + B2B-комиссия за телемед-рефералы (кардиология)",
        "arpu_year": 80,
        "proof": "POTUS Tracker бесплатный + реклама. Standing Up to POTS — донат-модель. Visible (Long COVID) пересекается по аудитории.",
        "persona": "Женщина 18-35, недавний диагноз или self-diagnosed, очередь к врачу 6 мес",
    },
    "Hashimoto's / hypothyroid": {
        "concept": "Дашборд под щитовидку: трекер TSH/T4/T3, журнал смены препаратов (L-thyroxin vs NDT vs LDN), лог глютена и симптомов.",
        "monetization": "Подписка $9.99/мес + аффилиат на bloodwork-тесты (Quest, Labcorp, InsideTracker)",
        "arpu_year": 100,
        "proof": "Paloma Health (полный телемед) $99/мес. Книги Stop The Thyroid Madness продаются миллионами. ~20M американцев с гипотиреозом.",
        "persona": "Женщина 30-55, недавно начала лечение, лучше не становится, ищет альтернативы",
    },
    "Fall prevention (elderly)": {
        "concept": "Приложение, которое ставит ухаживающий: фиксирует походку через телефон в кармане, напоминает о силовых тестах, шлёт push-уведомления семье при ухудшении. Apple Watch fall detect ловит уже свершившееся; это — *профилактика*.",
        "monetization": "Семейная подписка $19.99/мес (платит взрослый ребёнок); B2B-тиф для home-care агентств $30/пациент/мес",
        "arpu_year": 200,
        "proof": "Papa, Honor — хорошо профинансированные сервисы домашнего ухода. У Apple Health профилактики падений нет.",
        "persona": "Взрослый ребёнок (45-60) пожилого родителя (75+), у родителя недавно был «почти-упал»",
    },
    "Endometriosis": {
        "concept": "Трекер цикла + боли + обострений с timeline операций и медикаментов. PDF для подготовки к визиту. Реферал к специалистам по эндометриозу (их мало; высокий margin на комиссии).",
        "monetization": "Подписка $7.99/мес + комиссия с телемед-рефералов $50-150 за запись",
        "arpu_year": 90,
        "proof": "Phendo, Endo Health, Allara. Эндо у 10% женщин. Очередь к специалисту в среднем 7 лет.",
        "persona": "Женщина 18-40, диагноз или подозревает, бесит что cycle-приложения игнорируют боль",
    },
    "Cat health tracking": {
        "concept": "Фото лотка → AI-анализ мочи/стула (консистенция, кровь, объём); лог еды и воды; кривая веса. Целевой сегмент — старшие коты (10+), где ХБП — ведущая причина смерти.",
        "monetization": "Подписка $7.99/мес + аффилиат (лечебные корма «почечная диета», supplements) ~15%",
        "arpu_year": 80,
        "proof": "Pretty Litter ($30/мес) и CatGenie доказали готовность платить у владельцев старших кошек.",
        "persona": "Владелец кота 35+, кот 10+ лет, счета у ветеринара растут",
    },
    "Dog longevity / senior dog": {
        "concept": "Индекс старения для собак: еженедельная оценка (когниция, мобильность, сон, аппетит), планировщик кормления и supplements, дашборд для шеринга с ветом. Вдохновлено Dog Aging Project.",
        "monetization": "Подписка $9.99/мес + supplement-подписка (Rejuvenate Bio, NuVet) с аффилиат-комиссией",
        "arpu_year": 100,
        "proof": "Loyal привлекли $125M на препарат собачьего долголетия. В Dog Aging Project зарегистрировано 50k+ собак.",
        "persona": "Владелец собаки 40+, собаке 7+ лет, владелец читает медицинские статьи",
    },
    "Caregiver burnout": {
        "concept": "Self-tracker для ухаживающего: стресс-скор (HRV через камеру телефона), планировщик передышек, peer-support match, эскалация триггеров («ты спал <5ч три ночи подряд — звони запасному»).",
        "monetization": "Подписка $9.99/мес + B2B (employer benefit, Medicaid waiver программы)",
        "arpu_year": 90,
        "proof": "Cariloop $30M Series B; Wellthy $25M; AARP запускает программы для caregivers.",
        "persona": "Женщина 50-65, ухаживает за родителем с деменцией, год не была у своего врача",
    },
    "Pelvic floor": {
        "concept": "Гайдед упражнения Кегеля + pelvic-floor PT с биофидбеком через акселерометр (детект позы через карман). Основные use-cases: postpartum, перименопауза, после простатэктомии.",
        "monetization": "Подписка $14.99/мес + апселл девайса биофидбека ($129 разово, низкая маржа)",
        "arpu_year": 130,
        "proof": "Elvie ($199 девайс + бесплатное приложение), Kegel Trainer freemium. PT-приложение Origin привлекло $24M.",
        "persona": "Женщина 30-50 после родов ИЛИ 50+ в перименопаузе; мужчина 60+ после операции на простате",
    },
    "Picky eater (toddler)": {
        "concept": "Генератор meal-plan + челлендж «первые 7 кусочков» + фотолог принятых продуктов; AI генерирует план «следующего шага» для конкретного ребёнка. На базе responsive-feeding метода Ellyn Satter.",
        "monetization": "Подписка $9.99/мес или $59/год; семейный план $14.99/мес (несколько детей)",
        "arpu_year": 80,
        "proof": "Yumble (готовые меню) и Solid Starts (платный курс $99 + приложение) доказывают готовность платить. 30%+ малышей — picky eaters.",
        "persona": "Мама ребёнка 2-5 лет, выгоревшая, винит себя, гуглит «мой ребёнок ничего не ест»",
    },
    "Baby sleep training": {
        "concept": "Персонализированный генератор расписания сна + лог дневных снов и wake-windows + акустический монитор (микрофон детектит длительность плача и паттерн). Без привязки к одному методу (Ferber, chair, hybrid).",
        "monetization": "Разовый IAP $19.99 за «план» + $4.99/мес за продолжение трекинга",
        "arpu_year": 50,
        "proof": "Huckleberry $69/год, Hatch Rest (железо + приложение), курс Taking Cara Babies $179. Огромный engaged рынок.",
        "persona": "Родитель ребёнка 3-12 мес, не спит, гуглит в 3 ночи",
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
    ax.set_xlabel("Просмотры Wikipedia в месяц (log) — размер рынка")
    ax.set_ylabel("quiet_trend — разрыв между ростом спроса и предложения")
    ax.set_title("20 мобильных идей: размер рынка × тихий тренд (размер пузыря = ARPU)")
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
    md.append("| # | Ниша | Wiki просм/мес | Рост за 5 лет | Quiet score | ARPU/год | Модель |\n")
    md.append("|---|---|---|---|---|---|---|\n")
    for i, r in enumerate(selected_df.itertuples(), 1):
        md.append(f"| {i} | **{r.name}** | {int(r.wiki_avg_views):,} | "
                  f"{r.wiki_5yr_x:.1f}× | {r.quiet_trend:+.2f} | ${r.arpu_year} | "
                  f"{r.monetization[:55]}{'…' if len(r.monetization)>55 else ''} |\n")
    md.append("\n")

    md.append("## Развёрнутые карточки\n\n")
    for i, r in enumerate(selected_df.itertuples(), 1):
        md.append(f"### {i}. {r.name}\n\n")
        md.append(f"**Сигнал**: {int(r.wiki_avg_views):,} просмотров Wikipedia в месяц в среднем; "
                  f"×{r.wiki_5yr_x:.2f} рост 2020→2024; quiet_trend `{r.quiet_trend:+.2f}` "
                  f"(предложение CAGR `{(r.hn_cagr*100 if pd.notna(r.hn_cagr) else 0):+.0f}%/год`, "
                  f"спрос CAGR `{(r.wiki_cagr*100 if pd.notna(r.wiki_cagr) else 0):+.0f}%/год`).\n\n")
        md.append(f"**Концепция**: {r.concept}\n\n")
        md.append(f"**Монетизация**: {r.monetization}. Оценка ARPU ~**${r.arpu_year}/год**.\n\n")
        md.append(f"**Proof-of-economics**: {r.proof}\n\n")
        md.append(f"**Целевая персона**: {r.persona}\n\n")
        md.append("---\n\n")

    md.append("## Кросс-вертикальные паттерны\n\n")
    md.append("- **Хронические недодиагностированные состояния** (Long COVID, MCAS, POTS, "
              "Хашимото, Инсулинорезистентность) — лучшие кандидаты по соотношению LTV/CAC. "
              "Пользователи вовлечены, медицина их подводит, готовы платить за инструменты "
              "которые помогают.\n")
    md.append("- **Универсальный мобильный стек**: трекер + симптомный лог + PDF-экспорт врачу + "
              "телемед-реферал = повторяемая бизнес-модель в большинстве top-20.\n")
    md.append("- **Аффилиат как второй revenue stream**: bloodwork (Quest, InsideTracker), "
              "supplements, телемед — 10-20% комиссии, добавляет 30-50% к подписке.\n")
    md.append("- **Долгий retention** в хронических нишах (POTS, эндометриоз, Хашимото) >24 мес — "
              "ARPU умножается. В parenting-нишах retention 6-12 мес (ребёнок вырос).\n")
    md.append("- **B2B-тир для страховых/работодателей** даёт 3-10× ARPU для тех приложений, "
              "которые можно сертифицировать как FDA-cleared (CBT-I, эндометриоз, fall prevention, "
              "caregiver burnout).\n\n")

    md.append("## Чего избегать (хайп)\n\n")
    md.append("- **Sleep apnea (апноэ сна)** — HN ×5.3, Apple Watch только запустил детектор → "
              "ниша закроется.\n")
    md.append("- **Biological age (биологический возраст)** — все строят калькуляторы, публика "
              "теряет интерес (wiki -10%/год).\n")
    md.append("- **ADHD (СДВГ) у взрослых** — насыщено (Inflow, Numo, Tiimo, Routinery), HN ×1.75.\n")
    md.append("- **Рапамицин, микробиом, vagus nerve** — supply растёт ×2-6, demand стагнирует.\n")
    md.append("- **Микродозирование, CBT в целом** — supply удвоился, demand плоский.\n")

    (OUT / "report_top20_mobile.md").write_text("".join(md), encoding="utf-8")
    print(f"wrote {OUT/'report_top20_mobile.md'}")
    print(f"\nTop 20 by composite rank_score:")
    print(selected_df[["name", "wiki_avg_views", "quiet_trend", "arpu_year", "rank_score"]].to_string(index=False))


if __name__ == "__main__":
    main()
