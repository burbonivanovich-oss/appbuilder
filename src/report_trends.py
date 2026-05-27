"""Report quiet trends with scatter plot of demand vs supply growth."""
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


def main():
    df = pd.read_csv(PROC / "trends_synthesis.csv")
    raw = json.loads((PROC / "trends_raw.json").read_text())

    # Plot: x = HN 5yr growth (supply), y = wiki 5yr growth (demand)
    fig, ax = plt.subplots(figsize=(11, 8))
    plot = df[df["passes_size_gate"]].copy()
    plot["hn_growth"] = (plot["hn_5yr_x"].fillna(0))
    plot["wiki_growth"] = (plot["wiki_5yr_x"].fillna(0))

    for _, r in plot.iterrows():
        x = r["hn_growth"] if r["hn_growth"] > 0 else 0.1
        y = r["wiki_growth"] if r["wiki_growth"] > 0 else 0.1
        is_control = "control" in r["name"]
        color = "tab:red" if is_control else "tab:blue"
        ax.scatter(x, y, s=80, alpha=0.7, color=color, edgecolors="black", linewidth=0.5)
        ax.annotate(r["name"][:28], (x, y), fontsize=8, alpha=0.9, xytext=(5, 3), textcoords="offset points")

    # Diagonal — equal growth line
    ax.plot([0.1, 20], [0.1, 20], "--", color="gray", alpha=0.5, label="demand = supply growth")
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel("HN 'Show HN' story count growth 2020→2024 (supply)")
    ax.set_ylabel("Wikipedia pageviews growth 2020→2024 (demand)")
    ax.set_title("Quiet-trend map: above-line niches = demand outpacing builders")
    ax.legend(); ax.grid(True, which="both", alpha=0.3)
    fig.tight_layout()
    fig.savefig(OUT / "scatter_quiet_trends.png", dpi=130)
    plt.close(fig)

    # Time-series chart for top quiet trends
    fig, axes = plt.subplots(2, 3, figsize=(15, 8), sharex=True)
    quiet_picks = ["CGM (continuous glucose monitor)", "Sarcopenia / strength 50+",
                   "Red light therapy", "Podiatry / foot health",
                   "NAD+ supplementation", "Sauna / heat therapy"]
    by_name = {r["name"]: r for r in raw}
    years = list(range(2020, 2026))
    for ax, name in zip(axes.flat, quiet_picks):
        if name not in by_name:
            continue
        r = by_name[name]
        wiki = [r[f"wiki_{y}"] for y in years]
        hn = [r[f"hn_{y}"] for y in years]
        ax2 = ax.twinx()
        ax.plot(years, wiki, "o-", color="tab:blue", label="Wiki views")
        ax2.plot(years, hn, "s--", color="tab:red", label="HN stories")
        ax.set_title(name, fontsize=10)
        ax.set_ylabel("Wiki views/yr", color="tab:blue", fontsize=8)
        ax2.set_ylabel("HN stories/yr", color="tab:red", fontsize=8)
        ax.tick_params(axis="y", labelsize=7); ax2.tick_params(axis="y", labelsize=7)
    fig.suptitle("Demand (blue, wiki) vs Supply (red, HN) for top quiet niches")
    fig.tight_layout(); fig.savefig(OUT / "timeseries_quiet_niches.png", dpi=130); plt.close(fig)

    # Markdown report
    md = ["# Quiet-trends в longevity — отчёт\n\n"]
    md.append("> **Тезис**: ниши, где спрос растёт многолетне, но строители ещё не пошли — "
              "это white-space между публичным интересом и tech-инвестицией. Я мерю три "
              "независимые временные кривые 2020→2024:\n\n")
    md.append("- **Спрос**: Wikipedia pageviews на статью-якорь (Wikimedia REST API, ежемесячно).\n")
    md.append("- **Предложение**: число 'Show HN' / упоминаний в Hacker News по году (Algolia API).\n")
    md.append("- **Научный интерес**: число публикаций в PubMed по году (NCBI eutils).\n\n")
    md.append("**quiet_trend score = wiki_CAGR − hn_CAGR** (положительный = спрос обгоняет предложение).\n\n")
    md.append("Сравнение с известными хайповыми нишами (Padel, Pickleball, Ozempic) включено как контроль.\n\n")

    md.append("## Все 25 нишей, отсортированы по quiet_trend score\n\n")
    md.append("| ниша | wiki avg views/yr | wiki 5yr × | HN 5yr × | PubMed 5yr × | wiki CAGR | HN CAGR | **quiet score** |\n")
    md.append("|---|---|---|---|---|---|---|---|\n")
    for _, r in df.iterrows():
        def f(v):
            if pd.isna(v): return "—"
            if isinstance(v, float):
                if abs(v) > 100: return f"{v:.0f}"
                return f"{v:+.2f}"
            return str(v)
        md.append(f"| {r['name']} | {int(r['wiki_avg_views']):,} | {f(r['wiki_5yr_x'])} | "
                  f"{f(r['hn_5yr_x'])} | {f(r['pm_5yr_x'])} | {f(r['wiki_cagr'])} | "
                  f"{f(r['hn_cagr'])} | **{f(r['quiet_trend'])}** |\n")
    md.append("\n")

    md.append("## Интерпретация\n\n")
    md.append("**Padel** возглавляет рейтинг (wiki x182, HN x1.28) — методология ловит **истинный**: "
              "консьюмерский интерес взорвался, технического конкурента почти нет (Padel — спорт, "
              "не SaaS-категория; единственное приложение это бронирование кортов — что Playtomic "
              "и делает на $30M+ ARR). Pickleball — наоборот, и спрос вырос, и HN взлетел (x11) = "
              "уже арена.\n\n")
    md.append("Реальные quiet-trends в longevity:\n\n")

    md.append("### 1. CGM для не-диабетиков (`quiet_trend +0.36`)\n\n")
    md.append("Wikipedia views тройной за 4 года (CAGR +33%/год), HN flat. Levels и NutriSense это "
              "хайпово в подкастах, но **строители не пришли**. Где product gap: hosted-софт для "
              "врачей, продающих CGM-программу пациентам; B2C-аналитика паттернов поверх Dexcom-данных; "
              "интеграции с фитнес-трекерами.\n\n")

    md.append("### 2. Sarcopenia / strength для 50+ (`quiet_trend +0.20`)\n\n")
    md.append("Wiki views удвоились, HN — данных меньше года в году. Это конкретное явление "
              "(потеря мышечной массы с возрастом), которое за пределами медицинской литературы "
              "только сейчас расходится в подкастах (Peter Attia, Andrew Huberman). Tech-продукт: "
              "tracking + structured strength program для 50+, дифференцированный от Strava/Peloton.\n\n")

    md.append("### 3. Red light therapy (`quiet_trend +0.19`)\n\n")
    md.append("Wiki видения flat (CAGR +3%/год), но **HN сокращается** (-16%/год). Hardware-сегмент "
              "огромный (Joovv, Mito Red), software — нет. Software-layer: персонализированные "
              "протоколы, tracking результатов, B2B для clinics.\n\n")

    md.append("### 4. Подология / foot health (`quiet_trend -0.03`)\n\n")
    md.append("Wiki ~стабильно 127k views/mo, нулевая активность строителей. CAGR близок к нулю, "
              "но **большая абсолютная база**. Возможности: telemedicine-консультации (для рынков "
              "где подологов мало), tracking диабетических ног, custom orthotics через приложение. "
              "В RU-сегменте интерес растёт сильнее (Wordstat x3 по словам автора).\n\n")

    md.append("### 5. NAD+ supplementation (`quiet_trend +0.08`)\n\n")
    md.append("Wiki +36% за 5 лет, HN — данных мало. Tru Niagen, ChromaDex продают капсулы; "
              "software-gap: testing-quality dashboards (которые брэнды действительно содержат NMN), "
              "subscription автонапоминания, blood-level tracking.\n\n")

    md.append("## Куда **не** идти (предложение опережает спрос)\n\n")
    md.append("- **Biological age** (HN x9.5, wiki -10%) — все строят age-калькуляторы, "
              "пользователи отворачиваются от темы.\n")
    md.append("- **Sleep apnea** (HN x5.3, wiki -11%) — насыщается; Apple Watch вошёл с детектором.\n")
    md.append("- **Microbiome** (HN x2.2, wiki -19%) — Viome/Zoe уже консолидировали внимание.\n")
    md.append("- **Rapamycin** (HN x6.5, wiki +13%) — биохакер-thread экспоненциальный, но публика "
              "не подхватила.\n\n")

    md.append("## Графики\n\n")
    md.append("![Quiet-trend scatter](scatter_quiet_trends.png)\n\n")
    md.append("![Time series for top quiet niches](timeseries_quiet_niches.png)\n\n")

    md.append("## Дыры/ограничения\n\n")
    md.append("- **Google Trends недоступен** (rate-limit 429 из контейнера). Wordstat — нужна "
              "авторизация. Wikipedia pageviews — лучший аналог, но bias-ed на en-language.\n")
    md.append("- **Wikipedia article ≠ niche** — например, я взял `Sirolimus` для Rapamycin, "
              "`Strength_training` для 'strength 50+'. Якорь грубоват; для production-анализа надо "
              "усреднять по 3-5 связанных статьям на нишу.\n")
    md.append("- **HN stories ≠ продукты** — это и launches и обсуждения. Точнее было бы фильтровать "
              "только Show HN.\n")
    md.append("- **PubMed как сигнал** — медленный по природе (статья пишется 1-3 года), отражает "
              "научный pipeline 2-3 года назад, а не текущий рынок.\n")

    (OUT / "report_quiet_trends.md").write_text("".join(md), encoding="utf-8")
    print(f"wrote {OUT/'report_quiet_trends.md'}")


if __name__ == "__main__":
    main()
