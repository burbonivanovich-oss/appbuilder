"""Russia-focused micro-SaaS niche report.

Combines:
  - CIS-adjacent diaspora cohort from TrustMRR (RU+BY+KZ+UA+EE+LV+LT+GE+AM+AZ+MD+UZ+KG)
  - Habr.com hub article corpus (972 articles), with extracted RU-market pain patterns
  - OSS competition signal from the global pipeline
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
OUT = ROOT / "output"
OUT.mkdir(parents=True, exist_ok=True)


def _money(x):
    try:
        x = float(x)
    except Exception:
        return "—"
    if x >= 1_000_000: return f"${x/1_000_000:.1f}M"
    if x >= 1_000: return f"${x/1_000:.1f}k"
    return f"${x:.0f}"


def main():
    cohort = pd.read_csv(PROC / "ru_cohort_startups.csv")
    by_country = pd.read_csv(PROC / "ru_cohort_by_country.csv")
    by_cat = pd.read_csv(PROC / "ru_cohort_by_category.csv")
    merged = pd.read_csv(PROC / "ru_synthesis.csv")
    pain = json.loads((PROC / "habr_pain_signals.json").read_text())
    arts = json.loads((PROC / "habr_articles.json").read_text())

    md: list[str] = []
    md.append("# Micro-SaaS на российском рынке — синтез\n\n")
    md.append("> **Контекст и оговорки.** Главный источник по выручке (TrustMRR) построен на Stripe, "
              "а Stripe не работает в РФ с 2022. Поэтому домены РФ-резидентов в TrustMRR — это шум: "
              "всего **2 RU-зарегистрированных стартапа** (SQL Academy, 0sec). Отчёт строит выводы из "
              "двух доступных косвенных сигналов:\n\n")
    md.append("- **Диаспоральная когорта**: 171 стартап в TrustMRR с юрисдикциями RU/BY/KZ/UA/EE/LV/LT/"
              "GE/AM/AZ/MD/UZ — это, преимущественно, русскоязычные основатели, строящие глобальный SaaS "
              "(после релокации либо изначально на внешний рынок). Они и есть «российский tech-экспорт».\n")
    md.append("- **Хабр (972 статьи, 56 RU-специфических pain-сигналов)** — единственный публично "
              "доступный отсюда срез по внутреннему рынку. Источники типа реестра ПО `reestr.digital.gov.ru` "
              "блокируют выходной IP контейнера.\n\n")
    md.append("Reddit/PullPush не релевантны (русскоязычных subreddit-ов нет в верхушке saas-тем). "
              "Product Hunt — глобальный, для домена РФ репрезентативен слабо.\n\n")

    md.append("## 1. Диаспоральная когорта (TrustMRR / Stripe)\n\n")
    md.append(f"171 стартап. Суммарная 30-day выручка когорты — **{_money(cohort['revenue_30d'].sum())}**. "
              f"Профитных (>$1k/mo) — **{int((cohort['revenue_30d']>1000).sum())}**.\n\n")
    md.append("### Распределение по странам\n\n")
    md.append("| country | n | $-profitable | sum rev30 | p75 rev30 | top earner |\n")
    md.append("|---|---|---|---|---|---|\n")
    for _, r in by_country.iterrows():
        md.append(f"| **{r['country']}** | {int(r['n'])} | {int(r['n_profitable'])} | "
                  f"{_money(r['sum_rev30'])} | {_money(r['p75_rev30'])} | {_money(r['max_rev30'])} |\n")
    md.append("\n")
    md.append("Литва и Эстония — основные «релокант-хабы» по объёму. Украина даёт много стартапов, но "
              "ниже survival rate. RU/AM/UZ — почти пусто (ожидаемо: Stripe не пускает).\n\n")

    md.append("### Топ-10 категорий когорты по сумме выручки\n\n")
    md.append("| category | n_startups | profitable | sum rev30 | p75 | top earner |\n")
    md.append("|---|---|---|---|---|---|\n")
    for _, r in by_cat.head(10).iterrows():
        md.append(f"| **{r['category']}** | {int(r['n'])} | {int(r['n_profitable'])} | "
                  f"{_money(r['sum_rev30'])} | {_money(r['p75_rev30'])} | {_money(r['max_rev30'])} |\n")
    md.append("\n")

    md.append("### Топ-15 «зарабатывающих» стартапов в когорте\n\n")
    md.append("| name | country | category | rev_30d | mrr | founded |\n")
    md.append("|---|---|---|---|---|---|\n")
    top = cohort.sort_values("revenue_30d", ascending=False).head(15)
    for _, s in top.iterrows():
        md.append(f"| **{s['name']}** | {s['country']} | {s['category']} | "
                  f"{_money(s['revenue_30d'])} | {_money(s['mrr'])} | {str(s['founded'])[:10]} |\n")
    md.append("\n")

    md.append("## 2. Сигналы боли из Habr\n\n")
    md.append(f"Из 972 статей по SaaS-релевантным хабам, **{len(pain)} статей** содержат явные "
              "RU-маркет-паттерны (импортозамещение, отечественный аналог, миграция с западного "
              "сервиса, упоминание Bitrix24/AmoCRM/1C/Tilda).\n\n")

    # Pattern frequencies
    from collections import Counter
    pat_counts: Counter = Counter()
    for s in pain:
        for p in s.get("patterns", []):
            pat_counts[p] += 1
    md.append("### Частота паттернов\n\n")
    md.append("| pattern | n |\n|---|---|\n")
    for p, n in pat_counts.most_common():
        md.append(f"| `{p}` | {n} |\n")
    md.append("\n")

    md.append("### Top-15 pain-постов по score\n\n")
    for s in sorted(pain, key=lambda r: -(r.get("score") or 0))[:15]:
        md.append(f"- **[score {s.get('score',0)}]** [`{s['hub']}`] — "
                  f"[{s['title']}]({s['url']})\n")
        md.append(f"  - паттерны: `{', '.join(s.get('patterns', []))}`\n")
        if s.get("lead"):
            md.append(f"  > {s['lead'][:280]}\n")
        md.append("\n")

    md.append("## 3. Сводная таблица (когорта × RU-боль × OSS-конкуренция)\n\n")
    md.append("| category | cohort_n | cohort sum_rev30 | habr_pain | OSS alts (global) | PH launches (global) | global score |\n")
    md.append("|---|---|---|---|---|---|---|\n")
    for _, r in merged.head(15).iterrows():
        md.append(f"| **{r['category']}** | {int(r['n'])} | {_money(r['sum_rev30'])} | "
                  f"{int(r['n_habr_pain'])} | {int(r['oss_n_alternatives']) if pd.notna(r['oss_n_alternatives']) else '—'} | "
                  f"{int(r['ph_launches_12mo']) if pd.notna(r['ph_launches_12mo']) else '—'} | "
                  f"{r['opportunity_score']:+.2f} |\n")
    md.append("\n")

    md.append("## 4. Рекомендации\n\n")
    md.append("Делю на два сегмента: **(A) диаспора → global** и **(B) внутренний рынок РФ**. "
              "Это два разных бизнеса с разной экономикой и разной конкуренцией.\n\n")

    md.append("### A. Если строишь *global SaaS* (диаспора, EE/LT/LV-юрик, Stripe)\n\n")
    md.append("Эти ниши совпадают у когорты и в общем (несостояшем) скоре высоко:\n\n")
    md.append("1. **Marketing** — лидер когорты ($125k суммарно, 4 профитных, top-earner $99k). "
              "Хорошо ложится на типичную русскоязычную экспертизу в performance/SEO. "
              "Global PH-saturation высокая (12k запусков), но 6 OSS-альтернатив = воздух для hosted-углов.\n")
    md.append("2. **Sales / outbound** — лучший global opportunity_score (+5.16); по когорте только "
              "2 стартапа, но один из них уже доходит до $12k MRR. Маленькая PH-конкуренция (1.8k запусков/год).\n")
    md.append("3. **Travel** — top-earner когорты (Jungle Bee из US не в когорте, но esim4u UA $46k). "
              "Узкая ниша, без OSS-альтернатив, низкая видимость на PH = окно.\n")
    md.append("4. **Dev Tools / DevOps** — много трафика на Habr (19 pain-постов), 16 стартапов в когорте. "
              "Но 59 OSS-альтернатив = высокая конкуренция глобально.\n\n")

    md.append("### B. Если работаешь на *внутренний рынок РФ*\n\n")
    md.append("Главный вывод из Habr-корпуса: пользователи **активно мигрируют с западных сервисов** "
              "(Figma/Notion/Jira/Slack — 26 статей в title-pattern) и **жалуются на доминирующие домашние** "
              "(Bitrix24, AmoCRM, 1C — 21 статья). Сильные кейсы:\n\n")
    md.append("- **«Воззвание к продуктологам Bitrix»** (77 score, ecommerce hub) — целый отдельный жанр.\n")
    md.append("- **«Анти-кейс: внедрили Битрикс24, через полгода клиент вернулся на самописную CRM»**.\n")
    md.append("- **«Правила выживания дизайнера на заводе: от Figma к ГОСТам»** (82 score) — острая боль миграции.\n")
    md.append("- **«Импортозамещение, которое мы заслужили»** (561 score, infosec).\n\n")
    md.append("**Где здесь micro-SaaS opportunity:**\n\n")
    md.append("1. **Вертикальный CRM мимо Bitrix24** — узкая отраслевая (стоматологии, авто-сервисы, "
              "доставка еды, beauty-индустрия). Bitrix24 универсален и перегружен; "
              "ниша «*CRM для маленькой автомойки*» — пример того, что в Habr-кейсах ищут.\n")
    md.append("2. **«Российский Figma»-плагины / адаптация под ГОСТ** — спрос на доменно-специфичные "
              "design-tools (промдизайн, ГОСТовые шаблоны) подтверждается одним постом с 82 score.\n")
    md.append("3. **Self-hosted alt-Notion для команд внутри корп. периметра** — тренд «обретаем "
              "независимость от корпораций» (100 score) + 8 OSS-альтернатив Notion. Hosted-версия "
              "Outline/AppFlowy с RU-локализацией и RU-юрлицом — пустая ниша.\n")
    md.append("4. **Биллинг / подписки для российских касс** — `billing` хаб дал только 11 статей и 0 "
              "pain-signal, но это потому что Stripe-аналогов в РФ всего три (YooKassa, CloudPayments, "
              "Tinkoff). Биллинг-уровень (управление подписками, churn, dunning) сверху над YooKassa — "
              "это явно белое пятно.\n")
    md.append("5. **HR-tools под 1С** — `hr_management` хаб даёт «Восстание терпил» (108 score, "
              "разрушение 1C-рынка), миграция HR-данных, наём — много пэйна без явных аналогов.\n\n")

    md.append("### Антирекомендации (для внутреннего рынка)\n\n")
    md.append("- **Универсальный CRM / горизонтальный накопитель** — Bitrix24/AmoCRM закрывают по "
              "функционалу, по интеграциям, и по бренду; новый игрок горизонтально проиграет.\n")
    md.append("- **Бухгалтерия / учёт** — 1С + Контур + МойСклад. Регулятор закрывает (фискальная "
              "отчётность), бренд закрывает (1С = индустриальный стандарт).\n")
    md.append("- **Универсальный сайт-конструктор** — Tilda занимает.\n")
    md.append("- **Облачное хранилище / диск** — Yandex Disk / Mail Cloud / СберДиск; уже воюют между собой.\n\n")

    md.append("## 5. Честные дыры в анализе\n\n")
    md.append("- **TrustMRR ≠ Российский рынок.** Stripe не работает в РФ, поэтому 99% домена скрыто. "
              "Когортная статистика по EE/LT/LV — proxy для диаспоры, но не репрезентативная выборка.\n")
    md.append("- **Реестр отечественного ПО недоступен** (`reestr.digital.gov.ru` отдал 403). Без него "
              "невозможно посчитать «сколько уже зарегистрированных конкурентов в категории».\n")
    md.append("- **Habr corpus — 972 статьи** — это статьи, попавшие в periodic top хабов; полная "
              "выборка хабр-постов за год — десятки тысяч. Pain-pattern — нижняя оценка.\n")
    md.append("- **vc.ru API** даёт 404; HTML scraping возможен, но требует rendering-я.\n")
    md.append("- **Reddit для русскоязычной аудитории** не релевантен; Хабр + vc.ru — единственные "
              "доступные публичные сигналы боли.\n")

    out_path = OUT / "report_ru.md"
    out_path.write_text("".join(md), encoding="utf-8")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
