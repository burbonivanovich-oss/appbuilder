#!/usr/bin/env python3
"""Refresh linked source JSON and rebuild the overview from Markdown references."""

import argparse
import html
import json
import re
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
REFERENCES = ROOT / "references"
CATEGORIES = [
    ("logos", "Логотипы", "logos/logos.md", "Принцип"),
    ("product_icons", "Иконки продуктов", "icons/products.md", "Принцип"),
    ("ui_icons", "Интерфейсные иконки", "icons/ui.md", "Принцип"),
    ("illustrations", "Иллюстрации", "illustrations/illustrations.md", "Принцип"),
    ("visuals", "Визуалы", "visuals/visuals.md", "Принцип"),
    ("colors", "Базовые токены", "colors/base-tokens.md", "Принцип"),
    ("color_schemes", "Семантические токены (переменные)", "colors/semantic-tokens.md", "Принцип"),
    ("recoloring", "Правила перекраски ассетов", "colors/color-rules.md", "Принцип"),
    ("fonts", "Шрифты", "fonts/fonts.md", "Принцип"),
]


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def local_path(value):
    path = (ROOT / value).resolve()
    if ROOT not in path.parents:
        raise ValueError(f"Путь вне скилла: {value}")
    return path


def section(filename, heading):
    lines = (REFERENCES / filename).read_text(encoding="utf-8").splitlines()
    marker = f"## {heading}"
    try:
        start = lines.index(marker) + 1
    except ValueError as exc:
        raise ValueError(f"В {filename} нет раздела {marker}") from exc
    end = next((i for i in range(start, len(lines)) if lines[i].startswith("## ")), len(lines))
    return lines[start:end]


def markdown_inline(value):
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", html.escape(value))


def summary_html(lines):
    output = []
    in_list = False
    for raw in lines:
        value = raw.strip()
        if not value:
            continue
        if value.startswith("- "):
            if not in_list:
                output.append("<ul>")
                in_list = True
            output.append(f"<li>{markdown_inline(value[2:])}</li>")
        else:
            if in_list:
                output.append("</ul>")
                in_list = False
            output.append(f"<p>{markdown_inline(value)}</p>")
    if in_list:
        output.append("</ul>")
    return "".join(output)


def rules_inline(value):
    parts = re.split(r"(`[^`]+`|\[[^\]]+\]\([^)]+\))", value)
    output = []
    for part in parts:
        if part.startswith("`") and part.endswith("`"):
            output.append(f"<code>{html.escape(part[1:-1])}</code>")
        elif part.startswith("["):
            match = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", part)
            if match:
                url = match.group(2)
                if not url.startswith(("https://", "http://", "#")):
                    url = "../references/colors/" + url
                output.append(f'<a href="{html.escape(url, quote=True)}">{html.escape(match.group(1))}</a>')
            else:
                output.append(html.escape(part))
        else:
            output.append(html.escape(part))
    return "".join(output)


def rules_html(lines):
    output = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([cell.strip() for cell in lines[i].strip().strip("|").split("|")])
                i += 1
            if len(rows) < 2 or not all(set(cell) <= {"-", ":", " "} for cell in rows[1]):
                raise ValueError("Некорректная таблица в правилах перекраски")
            head = "".join(f"<th scope=\"col\">{rules_inline(cell)}</th>" for cell in rows[0])
            body = "".join("<tr>" + "".join(f"<td>{rules_inline(cell)}</td>" for cell in row) + "</tr>" for row in rows[2:])
            output.append(f'<div class="rules-table"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
            continue
        numbered = re.match(r"^\d+\. (.+)$", line)
        if line.startswith("- ") or numbered:
            ordered = bool(numbered)
            tag = "ol" if ordered else "ul"
            items = []
            while i < len(lines):
                current = lines[i].strip()
                match = re.match(r"^\d+\. (.+)$", current) if ordered else None
                if not (match or (not ordered and current.startswith("- "))):
                    break
                items.append(f"<li>{rules_inline(match.group(1) if ordered else current[2:])}</li>")
                i += 1
            output.append(f"<{tag}>{''.join(items)}</{tag}>")
            continue
        paragraph = []
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith("|"):
            current = lines[i].strip()
            if current.startswith("- ") or re.match(r"^\d+\. ", current):
                break
            paragraph.append(current)
            i += 1
        output.append(f"<p>{rules_inline(' '.join(paragraph))}</p>")
    return "".join(output)


def parse_table(lines, label):
    rows = []
    for line in lines:
        if line.startswith("|"):
            rows.append([cell.strip().strip("`") for cell in line.strip().strip("|").split("|")])
    if len(rows) < 2 or not all(set(cell) <= {"-", ":", " "} for cell in rows[1]):
        raise ValueError(f"Нет таблицы раздела {label}")
    if any(len(row) != len(rows[0]) for row in rows[2:]):
        raise ValueError(f"Разная ширина строк таблицы {label}")
    return [dict(zip(rows[0], row)) for row in rows[2:]]


def table(filename, heading):
    return parse_table(section(filename, heading), f"{filename}: {heading}")


def subsection_lines(filename, heading, subheading):
    lines = section(filename, heading)
    marker = f"### {subheading}"
    try:
        start = lines.index(marker) + 1
    except ValueError as exc:
        raise ValueError(f"В {filename} нет подраздела {marker}") from exc
    end = next((i for i in range(start, len(lines)) if lines[i].startswith("### ")), len(lines))
    return lines[start:end]


def subsection_table(filename, heading, subheading):
    return parse_table(subsection_lines(filename, heading, subheading), f"{filename}: {heading} / {subheading}")


def indexed(rows, key):
    result = {row[key]: row for row in rows}
    if len(result) != len(rows):
        raise ValueError(f"Повторяющиеся значения в колонке {key}")
    return result


def source_catalogs():
    return {
        row["Тип"]: {"url": row["URL"], "local": row["Локальная копия"]}
        for row in table("sources.md", "Каталоги")
    }


def validate_ui_icons(data):
    if not isinstance(data, list) or not data:
        raise ValueError("Каталог интерфейсных иконок должен быть непустым массивом")
    for item in data:
        if not isinstance(item, dict) or not all(
            key in item for key in ("title", "name", "groupTitle", "tags")
        ):
            raise ValueError("Некорректная запись интерфейсной иконки")


def validate_object_illustrations(data):
    if not isinstance(data, list) or not data:
        raise ValueError("Каталог объектных иллюстраций должен быть непустым массивом")
    names = set()
    for item in data:
        if (not isinstance(item, dict)
                or not all(isinstance(item.get(key), str) and item[key]
                           for key in ("title", "name", "groupTitle"))
                or not isinstance(item.get("tags"), list)
                or not all(isinstance(tag, str) for tag in item["tags"])
                or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["name"])
                or item["name"] in names):
            raise ValueError("Некорректная запись или повтор ID объектной иллюстрации")
        names.add(item["name"])


def render(sources):
    base = indexed(table("colors/base-tokens.md", "Токены"), "Токен")
    def resolved(name):
        try:
            return base[name]["Значение"]
        except KeyError as exc:
            raise ValueError(f"Неизвестный базовый токен: {name}") from exc

    light = "colors/semantic-tokens.md"
    common = indexed(subsection_table(light, "Значения по темам", "Общие переменные"), "Переменная")
    tokens = {name: {"Назначение": row["Назначение"], "Базовый токен": row["Светлая"],
                     "Темная": row["Темная"], "Значение": resolved(row["Светлая"]) if row["Светлая"] else ""}
              for name, row in common.items()}
    for row in tokens.values():
        if row["Темная"]:
            resolved(row["Темная"])
    product_raw = indexed(subsection_table(light, "Значения по темам", "Продуктовые схемы"), "Схема")
    scheme_ids = [row["ID схемы"] for row in product_raw.values()]
    if len(set(scheme_ids)) != len(scheme_ids) or any(not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", value) for value in scheme_ids):
        raise ValueError("ID продуктовых схем должны быть уникальными и состоять из латинских слов")
    product = {name: {**row, "Акцентный": resolved(row["Акцентный"]),
                      "Дополнительный": resolved(row["Дополнительный"])} for name, row in product_raw.items()}
    ecosystem_raw = indexed(subsection_table(light, "Значения по темам", "Экосистемные схемы"), "Схема")
    ecosystem = {name: {**row, "Акцент для HTML-токена": resolved(row["Акцент для HTML-токена"]),
                        "Дополнительный": resolved(row["Дополнительный"])} for name, row in ecosystem_raw.items()}
    ecosystem_accents = [{"Цвет": row["Цвет"], "Базовый токен": row["Базовый токен"],
                          "Значение": resolved(row["Базовый токен"])}
                         for row in subsection_table(light, "Значения по темам", "Акценты экосистемы")]
    override_lines = subsection_lines(light, "Значения по темам", "Переопределения общих цветов")
    overrides = parse_table(override_lines, "Переопределения общих цветов") if any(line.startswith("|") for line in override_lines) else []
    product_links = table(light, "Привязка продуктов")
    ecosystem_links = table(light, "Привязка экосистемы")
    product_links_by_name = indexed(product_links, "Продукт")
    ecosystem_links_by_brand = indexed(ecosystem_links, "Бренд")
    logo_links = [
        (row["Бренд"], row["Экосистемная схема"], row["ID логотипа"])
        for row in ecosystem_links
    ] + [
        (row["Продукт"], row["Продуктовая схема"], row["ID логотипа"])
        for row in product_links
    ]
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", logo_id)
           for _, _, logo_id in logo_links):
        raise ValueError("Некорректный ID логотипа в привязке продукта или бренда")
    recolor = table("colors/color-rules.md", "Матрица перекраски иллюстраций")
    old_background_names = {"Primary": "Светлый", "Brand": "Акцентный", "Dark": "Дополнительный брендовый"}
    if "Контур" in product or "Контур" not in ecosystem:
        raise ValueError("Схема Контур должна быть только экосистемной")
    if any(row["Продуктовая схема"] not in product for row in product_links):
        raise ValueError("Продукт привязан к отсутствующей схеме")
    if any(row["Экосистемная схема"] not in ecosystem for row in ecosystem_links):
        raise ValueError("Бренд привязан к отсутствующей схеме")
    if ecosystem_links_by_brand["Контур"]["Экосистемная схема"] != "Контур":
        raise ValueError("Логотип Контура должен быть привязан к экосистемной схеме Контур")
    if {row["Фон"]: row["Прежнее название"] for row in recolor} != old_background_names:
        raise ValueError("Матрица должна сохранять прежние названия режимов фона")
    if len({row["Цвет"] for row in ecosystem_accents}) != len(ecosystem_accents):
        raise ValueError("Повторяющиеся названия акцентов экосистемы")

    if any(row["Переменная"] not in tokens or row["Схема"] != "Контур" for row in overrides):
        raise ValueError("Переопределения общих переменных допустимы только для схемы Контур")
    if len({row["Переменная"] for row in overrides}) != len(overrides):
        raise ValueError("Повторяющиеся переопределения общих переменных")
    for row in overrides:
        if not row["Светлая"] or not row["Темная"]:
            raise ValueError("У переопределения Контура нужны значения обеих тем")
        resolved(row["Светлая"])
        resolved(row["Темная"])

    example = ecosystem["Контур"]
    accent = example["Акцент для HTML-токена"]
    secondary = example["Дополнительный"]
    color_values = {"var(--k-color-accent)": accent, "var(--k-color-brand-secondary)": secondary, "white": "#ffffff"}
    backgrounds = {"Primary": tokens["--k-color-page-bg"]["Значение"], "Brand": accent, "Dark": secondary}

    logo_rows = ''.join(
        f'<tr><td class="column-fixed">{html.escape(name)}</td>'
        f'<td class="column-fixed"><span><span style="background:{html.escape((ecosystem[scheme]["Акцент для HTML-токена"] if scheme in ecosystem else product[scheme]["Акцентный"]), quote=True)}" aria-hidden="true"></span>{html.escape(scheme)}</span></td>'
        f'<td class="column-fixed"><code>{html.escape(logo_id)}</code></td></tr>'
        for name, scheme, logo_id in logo_links
    )
    logos_section = (
        '<section id="logos"><h2>Логотипы</h2>'
        + rules_html(section("logos/logos.md", "Принцип"))
        + '</section>'
    )
    brand_mapping_section = (
        '<section id="brand-mapping"><h2>Продукты</h2>'
        '<p>«Контур» использует экосистемную схему; остальные строки — продуктовые схемы.</p>'
        + '<div><table><thead><tr><th scope="col" class="column-fixed">Продукт / бренд</th>'
        '<th scope="col" class="column-fixed">Цветовая схема</th><th scope="col" class="column-fixed">ID логотипа</th>'
        '</tr></thead><tbody>' + logo_rows + '</tbody></table></div></section>'
    )
    product_extensions = table("logos/product-extensions.md", "Справочник")
    product_extension_rows = []
    shown_extension_products = set()
    for row in product_extensions:
        product_name = row["Продукт"]
        product_id = row["ID продукта"]
        extension_id = row["NameID"]
        icon_id = row["IconID"]
        extension_name = row["Название"]
        if product_name not in product_links_by_name or product_links_by_name[product_name]["ID логотипа"] != product_id:
            raise ValueError(f"Расширение связано с неизвестным продуктом: {product_name}")
        if not re.fullmatch(r"[a-z0-9_]+(?:-[a-z0-9_]+)*-icon-24", extension_id):
            raise ValueError(f"Некорректный NameID: {extension_id}")
        if not re.fullmatch(r"[a-z0-9_]+(?:-[a-z0-9_]+)*", icon_id):
            raise ValueError(f"Некорректный IconID: {icon_id}")
        if not extension_name:
            raise ValueError(f"Не задано название расширения: {extension_id}")
        icon_url = f'https://s.kontur.ru/common-v2/logos/v2/{product_id}/extensions/{extension_id}.svg'
        symbol_url = f'https://s.kontur.ru/common-v2/icons-products/{icon_id}/symbol/{icon_id}-symbol-24.svg'
        product_label = html.escape(product_name) if product_name not in shown_extension_products else ''
        shown_extension_products.add(product_name)
        product_extension_rows.append(
            f'<tr><td>{product_label}</td>'
            f'<td><img src="{html.escape(symbol_url, quote=True)}" alt="Иконка «{html.escape(extension_name, quote=True)}»" loading="lazy"></td>'
            f'<td>{html.escape(extension_name)}</td>'
            f'<td><a href="{html.escape(icon_url, quote=True)}"><code>{html.escape(extension_id)}</code></a></td>'
            f'<td><a href="{html.escape(symbol_url, quote=True)}"><code>{html.escape(icon_id)}</code></a></td></tr>'
        )
    if len({(row["ID продукта"], row["NameID"]) for row in product_extensions}) != len(product_extensions):
        raise ValueError("Повторяющиеся NameID продуктовых расширений")
    product_extensions_section = (
        '<section id="product-extensions"><h2>Продуктовые расширения</h2>'
        + rules_html(section("logos/product-extensions.md", "Принцип"))
        + '<div><table class="table-full-width"><thead><tr><th scope="col">Продукт</th>'
        '<th scope="col">Иконка</th><th scope="col">Название</th>'
        '<th scope="col">NameID</th><th scope="col">IconID</th>'
        '</tr></thead><tbody>' + ''.join(product_extension_rows) + '</tbody></table></div></section>'
    )
    icon_family = 'calculator'
    icon_base = f'https://s.kontur.ru/common-v2/icons-ui/black/{icon_family}/'
    icon_variants = {
        16: ('light', 'regular', 'solid'),
        20: ('light', 'regular', 'solid'),
        24: ('regular', 'solid'),
        32: ('regular',),
        64: ('regular',),
    }
    icon_rows = []
    for size, available in icon_variants.items():
        cells = [f'<td>{size} px</td>']
        for weight in ('light', 'regular', 'solid'):
            if weight in available:
                url = html.escape(f'{icon_base}{icon_family}-{size}-{weight}.svg', quote=True)
                cells.append(
                    f'<td><a href="{url}" aria-label="Калькулятор, {size} px, {weight}">'
                    f'<img src="{url}" width="{size}" height="{size}" alt=""></a></td>'
                )
            else:
                cells.append('<td aria-label="Вариант отсутствует">—</td>')
        icon_rows.append('<tr>' + ''.join(cells) + '</tr>')
    icon_matrix = (
        '<div class="icon-matrix"><table><thead><tr><th scope="col">Размер</th>'
        '<th scope="col">light</th><th scope="col">regular</th><th scope="col">solid</th>'
        '</tr></thead><tbody>' + ''.join(icon_rows) + '</tbody></table></div>'
    )
    icons_section = (
        '<section id="icons"><h2>Интерфейсные иконки</h2>'
        + rules_html(section("icons/ui.md", "Принцип"))
        + '<h3>Хранение, размеры и форматы</h3>'
        + rules_html(section("icons/ui.md", "Хранение и варианты"))
        + '<h3>Пример иконки</h3><p>Калькулятор · SVG. Размеры и начертания показаны только для этого семейства.</p>'
        + icon_matrix
        + '</section>'
    )
    product_icons_section = (
        '<section id="product-icons"><h2>Иконки продуктов</h2>'
        + rules_html(section("icons/products.md", "Принцип"))
        + '<h3>Варианты на примере admin</h3>'
        + rules_html(section("icons/products.md", "Варианты на примере admin"))
        + '<div class="product-icon-examples">'
        '<figure><a href="https://s.kontur.ru/common-v2/icons-products/admin/admin-24.svg"><img src="https://s.kontur.ru/common-v2/icons-products/admin/admin-24.svg" width="24" height="24" alt="Основная иконка admin"></a><figcaption>Основная · 24 px</figcaption></figure>'
        '<figure><a href="https://s.kontur.ru/common-v2/icons-products/admin/symbol/admin-symbol-24.svg"><img src="https://s.kontur.ru/common-v2/icons-products/admin/symbol/admin-symbol-24.svg" width="24" height="24" alt="Символ admin"></a><figcaption>Символ · 24 px</figcaption></figure>'
        '<figure><a href="https://s.kontur.ru/common-v2/icons-products/admin/glyph/admin-glyph-16.svg"><img src="https://s.kontur.ru/common-v2/icons-products/admin/glyph/admin-glyph-16.svg" width="16" height="16" alt="Глиф admin"></a><figcaption>Глиф · 16 px</figcaption></figure>'
        '</div></section>'
    )
    illustration_file = "illustrations/illustrations.md"
    illustration_content = "".join(
        f'<h3>{html.escape(heading)}</h3>'
        + rules_html(section(illustration_file, heading)).replace(
            '../references/colors/', '../references/illustrations/')
        for heading in ("Принцип", "Каталог и ID", "Цветовые схемы",
                        "Хранение и варианты", "Варианты на примере business-box")
    )
    object_base = 'https://s.kontur.ru/common-v2/visuals/products/illustration-object/'
    object_rows = []
    for scheme in scheme_ids:
        cells = [f'<th scope="row">{html.escape(scheme)}</th>']
        scheme_accent = next(row['Акцентный'] for row in product.values()
                             if row['ID схемы'] == scheme)
        for variant in ('light', 'brand', 'dark'):
            url = f'{object_base}{scheme}/business-box/business-box-128x128-{variant}.svg'
            background = {'light': resolved('gray-100'), 'brand': scheme_accent,
                          'dark': resolved('eco-gray-24')}[variant]
            cells.append(
                f'<td><a href="{url}"><img src="{url}" width="128" height="128" '
                f'style="background:{background};border-radius:8px" loading="lazy" '
                f'alt="business-box, {scheme}, {variant}"></a></td>'
            )
        object_rows.append('<tr>' + ''.join(cells) + '</tr>')
    illustrations_section = (
        '<section id="illustrations"><h2>Иллюстрации · Объектные</h2>'
        + illustration_content
        + '<h3>Все цветовые варианты · business-box · 128 px</h3>'
        '<p>Исходные SVG без перекраски. Подложки добавлены только для просмотра. '
        'Красная линия brand и тёмная линия red/dark сохранены как в исходниках.</p>'
        '<div style="overflow-x:auto"><table><thead><tr><th>Схема</th>'
        '<th>light</th><th>brand</th><th>dark</th></tr></thead><tbody>'
        + ''.join(object_rows) + '</tbody></table></div></section>'
    )
    asset_sections = logos_section + product_icons_section + icons_section + illustrations_section

    recolor_file = (REFERENCES / "colors/color-rules.md").read_text(encoding="utf-8").splitlines()
    first_heading = next(i for i, line in enumerate(recolor_file) if line.startswith("## "))
    recolor_intro = rules_html(recolor_file[1:first_heading])
    rule_groups = [
        ("Цветовые схемы", [("Общие правила", "Принцип"), ("Сборка схемы", "Применение цветовых схем")]),
        ("Карточки", [("Продуктовая схема", "Цветные карточки продуктовой схемы")]),
        ("Логотипы", [("Варианты и перекраска", "Логотипы")]),
        ("Интерфейсные иконки", [("Правила и матрица", "Интерфейсные иконки")]),
        ("Иллюстрации", [("Продуктовая схема", "Продуктовые иллюстрации"),
                         ("Экосистемная схема", "Матрица перекраски иллюстраций"),
                         ("Объектные исходники", "Объектные иллюстрации на статике")]),
    ]
    expected_headings = {heading for _, items in rule_groups for _, heading in items}
    actual_headings = {line[3:] for line in recolor_file if line.startswith("## ")}
    if actual_headings != expected_headings:
        raise ValueError("Все разделы правил перекраски должны попасть в демо")
    group_markup = []
    for group_name, items in rule_groups:
        subsections = "".join(
            f'<h4>{html.escape(label)}</h4>{rules_html(section("colors/color-rules.md", heading))}'
            for label, heading in items
        )
        if group_name == "Иллюстрации":
            samples = []
            for row in recolor:
                bg = row["Фон"]
                if bg == "Dark":
                    continue
                dots = "".join(
                    f'<i style="background:{html.escape(color_values[row[field]], quote=True)}"></i>'
                    for field in ("Исходный акцентный", "Исходный дополнительный", "Исходный белый")
                )
                sample_label = f'{bg} · {row["Прежнее название"]}'
                samples.append(f'<div class="recolor" style="background:{html.escape(backgrounds[bg], quote=True)}"><span>{html.escape(sample_label)}</span>{dots}</div>')
            subsections += "".join(samples)
        anchor = ' id="recoloring-ui-icons"' if group_name == "Интерфейсные иконки" else ''
        group_markup.append(f'<div class="rule-group"{anchor}><h3>{html.escape(group_name)}</h3>{subsections}</div>')
    recolor_section = '<section id="recoloring"><h2>Правила перекраски</h2>' + recolor_intro + "".join(group_markup) + '</section>'

    def color_cell(value):
        if not re.fullmatch(r"#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?|grey", value):
            raise ValueError(f"Некорректное значение цвета: {value}")
        return (
            '<span>'
            f'<span style="background:{html.escape(value, quote=True)}" aria-label="{html.escape(value, quote=True)}"></span>'
            f'<code>{html.escape(value)}</code></span>'
        )

    def token_cell(name):
        if not name:
            return ""
        value = resolved(name)
        return (
            '<span>'
            f'<span style="background:{html.escape(value, quote=True)}" aria-hidden="true"></span>'
            f'<code>{html.escape(name)}</code></span>'
        )

    registry_groups = [
        ("Продуктовые", subsection_table(light, "Значения по темам", "Переменные продуктовой схемы")),
        ("Экосистемные", subsection_table(light, "Список семантических переменных", "Экосистемные")),
    ]
    registry_names = [row["Переменная"] for _, rows in registry_groups for row in rows]
    if len(registry_names) != len(set(registry_names)) or set(registry_names) & set(tokens):
        raise ValueError("Повторяющиеся имена семантических переменных")
    for _, rows in registry_groups:
        for row in rows:
            if not row["Переменная"].startswith("--k-color-"):
                raise ValueError(f"Некорректное имя переменной: {row['Переменная']}")
            if row["Значение"]:
                resolved(row["Значение"])
    registry_sections = []
    for group, rows in registry_groups:
        body = "".join(
            f'<tr id="registry-{html.escape(row["Переменная"], quote=True)}"><td class="column-fixed"><code>{html.escape(row["Переменная"])}</code></td>'
            f'<td class="column-fixed">{token_cell(row["Значение"]) if row["Значение"] else ""}</td>'
            f'<td>{html.escape(row["Комментарий"])}</td></tr>'
            for row in rows
        )
        group_title = "Акценты Контура" if group == "Экосистемные" else "Переменные продуктовой схемы"
        registry_sections.append(
            f'<h3>{html.escape(group_title)}</h3><div><table>'
            '<thead><tr><th scope="col" class="column-fixed">Переменная</th><th scope="col" class="column-fixed">Значение</th>'
            '<th scope="col">Комментарий</th></tr></thead><tbody>'
            + body + '</tbody></table></div>'
        )
    base_rows = "".join(
        f'<tr id="base-{html.escape(name, quote=True)}"><td class="column-fixed"><code>{html.escape(name)}</code></td><td class="column-fixed">{color_cell(row["Значение"])}</td></tr>'
        for name, row in base.items()
    )
    base_table = (
        '<section id="base-tokens" class="palette-section"><h2>Базовые токены цветов</h2>'
        '<div><table><thead><tr>'
        '<th scope="col" class="column-fixed">Токен</th><th scope="col" class="column-fixed">Значение</th>'
        '</tr></thead><tbody>' + base_rows + '</tbody></table></div></section>'
    )
    common_rows = "".join(
        f'<tr id="common-{html.escape(name, quote=True)}"><td class="column-fixed"><code>{html.escape(name)}</code></td>'
        f'<td class="column-fixed">{token_cell(row["Базовый токен"])}</td>'
        f'<td class="column-fixed">{token_cell(row["Темная"])}</td>'
        f'<td>{html.escape(row["Назначение"])}</td></tr>'
        for name, row in tokens.items()
    )
    common_table = (
        '<section id="common-variable-list" class="palette-section"><h2>Общие переменные</h2>'
        '<p>Переменные применяются независимо от выбранной схемы. Пустая ячейка означает, что значение для этой темы пока не задано.</p>'
        '<div><table><thead><tr>'
        '<th scope="col" class="column-fixed">Переменная</th><th scope="col" class="column-fixed">Светлая</th><th scope="col" class="column-fixed">Темная</th><th scope="col">Назначение</th>'
        '</tr></thead><tbody>' + common_rows + '</tbody></table></div></section>'
    )
    product_accent_rows = "".join(
        f'<tr><td>{html.escape(name)}</td>'
        f'<td><code>{html.escape(product_raw[name]["ID схемы"])}</code></td>'
        f'<td>{token_cell(product_raw[name]["Акцентный"])}</td>'
        f'<td>{token_cell(product_raw[name]["Дополнительный"])}</td></tr>'
        for name, row in product.items()
    )
    accent_tables = (
        '<div><table class="table-full-width"><thead><tr>'
        '<th scope="col">Схема</th><th scope="col">ID схемы</th><th scope="col">Акцентный</th><th scope="col">Дополнительный</th>'
        '</tr></thead><tbody>' + product_accent_rows + '</tbody></table></div>'
    )
    override_table = ''
    if overrides:
        override_table = (
            '<h3 id="overrides">Переопределения общих переменных</h3>'
            '<p>Действуют только в схеме Контура. Для каждой темы значения ниже заменяют соответствующие общие переменные.</p>'
        )
        override_rows = "".join(
            f'<tr id="kontur-override-{html.escape(row["Переменная"], quote=True)}">'
            f'<td class="column-fixed"><code>{html.escape(row["Переменная"])}</code></td>'
            f'<td class="column-fixed">{token_cell(row["Светлая"])}</td>'
            f'<td class="column-fixed">{token_cell(row["Темная"])}</td></tr>' for row in overrides
        )
        override_table += (
            '<div><table><thead><tr>'
            '<th scope="col" class="column-fixed">Переменная</th><th scope="col" class="column-fixed">Светлая</th><th scope="col" class="column-fixed">Темная</th>'
            '</tr></thead><tbody>' + override_rows + '</tbody></table></div>'
        )

    product_columns = [
        (row["Продукт"], row["Продуктовая схема"], product[row["Продуктовая схема"]])
        for row in product_links
    ]
    matrix_header = '<th scope="col">Токен</th><th scope="col">Назначение</th><th scope="col">Экосистема</th>' + "".join(
        f'<th scope="col" title="Схема: {html.escape(scheme, quote=True)}">{html.escape(name)}</th>'
        for name, scheme, _ in product_columns
    )
    matrix_rows = []
    for name, row in tokens.items():
        cells = "".join(f'<td>{token_cell(row["Базовый токен"])}</td>' for _ in range(1 + len(product_columns)))
        matrix_rows.append(
            f'<tr id="all-{html.escape(name, quote=True)}"><td><code>{html.escape(name)}</code></td>'
            f'<td>{html.escape(row["Назначение"])}</td>{cells}</tr>'
        )
    ecosystem_accent_cell = '<div>' + "".join(
        f'<span>{html.escape(row["Цвет"])}: {token_cell(row["Базовый токен"])}</span>'
        for row in ecosystem_accents
    ) + '</div>'
    matrix_rows.append(
        '<tr id="all---k-color-accent"><td><code>--k-color-accent</code></td><td>Акцентный цвет</td>'
        f'<td>{ecosystem_accent_cell}</td>'
        + "".join(f'<td>{token_cell(product_raw[scheme]["Акцентный"])}</td>' for _, scheme, _ in product_columns) + '</tr>'
    )
    matrix_rows.append(
        '<tr id="all---k-color-brand-secondary"><td><code>--k-color-brand-secondary</code></td><td>Дополнительный брендовый цвет</td>'
        f'<td>{token_cell(ecosystem_raw["Контур"]["Дополнительный"])}</td>'
        + "".join(f'<td>{token_cell(product_raw[scheme]["Дополнительный"])}</td>' for _, scheme, _ in product_columns) + '</tr>'
    )
    color_table = (
        '<section id="all-colors" class="palette-section"><h2>Все цвета</h2>'
        '<p>Токены и назначение расположены по строкам, экосистема и продукты — по столбцам. Таблицу можно прокручивать по горизонтали.</p>'
        '<div><table><thead><tr>' + matrix_header + '</tr></thead><tbody>'
        + "".join(matrix_rows) + '</tbody></table></div></section>'
    )

    common_scheme_body = common_table
    product_scheme_body = (
        '<section id="schemes" class="palette-section"><h2>Продуктовые схемы</h2>'
        '<p>При выборе продукта <code>--k-color-product-accent</code> берёт акцентный токен его схемы, а <code>--k-color-product-secondary</code> — дополнительный. Оба цвета одинаковы в светлой и тёмной темах.</p>'
        + accent_tables + '</section>'
    )
    kontur_scheme_rows = (
        ('--k-color-accent', ecosystem_raw['Контур']['Акцент для HTML-токена'], 'Текущий акцент для HTML'),
        ('--k-color-brand-secondary', ecosystem_raw['Контур']['Дополнительный'], 'Дополнительный цвет'),
    )
    kontur_scheme_table = (
        '<div><table><thead><tr><th scope="col" class="column-fixed">Переменная</th>'
        '<th scope="col" class="column-fixed">Базовый токен</th><th scope="col">Назначение</th></tr></thead><tbody>'
        + ''.join(
            f'<tr id="scheme-{html.escape(name, quote=True)}"><td class="column-fixed"><code>{html.escape(name)}</code></td>'
            f'<td class="column-fixed">{token_cell(base_name)}</td><td>{html.escape(purpose)}</td></tr>'
            for name, base_name, purpose in kontur_scheme_rows
        ) + '</tbody></table></div>'
    )
    kontur_scheme_body = (
        '<section id="kontur-scheme"><h2>Цветовая схема Контур</h2>'
        '<p>К общим переменным добавляются переменные схемы Контура, затем применяются переопределения для выбранной темы. Акцент и дополнительный цвет схемы действуют в обеих темах. Четыре цветных акцента ниже доступны отдельно.</p>'
        + kontur_scheme_table + registry_sections[1] + override_table + '</section>'
    )
    demo_logo_products = {
        'Красный': 'УЦ',
        'Оранжевый': 'Экстерн',
        'Зелёный': 'Фокус',
        'Мятный': 'Диадок',
        'Голубой': 'Толк',
        'Синий': 'Закупки',
        'Фиолетовый': 'Эгида',
        'Пурпурный': 'Недвижимость',
    }
    if set(demo_logo_products) != set(product):
        raise ValueError('Для каждой продуктовой схемы нужен подтверждённый логотип')
    if any(product_links_by_name[name]['Продуктовая схема'] != scheme
           for scheme, name in demo_logo_products.items()):
        raise ValueError('Логотип демо не соответствует продуктовой схеме')
    demo_logos = {
        scheme: (product_links_by_name[name]['ID логотипа'], name)
        for scheme, name in demo_logo_products.items()
    }
    kontur_logo_id = ecosystem_links_by_brand['Контур']['ID логотипа']
    initial_product_logo_id = demo_logos[next(iter(product))][0]
    demo_options = ''.join(
        f'<option value="{html.escape(product_raw[name]["ID схемы"], quote=True)}" data-accent="{html.escape(product[name]["Акцентный"], quote=True)}" '
        f'data-secondary="{html.escape(product[name]["Дополнительный"], quote=True)}" '
        f'data-logo="{html.escape(demo_logos[name][0], quote=True)}" '
        f'data-logo-name="{html.escape(demo_logos[name][1], quote=True)}">{html.escape(name)}</option>'
        for name in product
    )
    contour_overrides = {row['Переменная']: row for row in overrides}
    demo_dark = {
        name: resolved(contour_overrides[name]['Темная'])
        for name in ('--k-color-page-bg', '--k-color-card-bg', '--k-color-border-bold')
    }
    common_dark = {name: resolved(row['Темная']) for name, row in tokens.items()}
    demo_light_card = resolved(contour_overrides['--k-color-card-bg']['Светлая'])
    eco_demo_accents = json.dumps([row['Значение'] for row in ecosystem_accents])
    illustration_row = (
        '<div class="demo-grid demo-illustration-row">'
        + ''.join(
            f'<div class="demo-card demo-illustration-card{card_class}">'
            f'<img data-object-background="{background}" width="96" height="96" '
            f'src="{object_base}{scheme_ids[0]}/business-box/business-box-96x96-{variant}.svg" '
            'alt="Открытая коробка со стрелками вверх"></div>'
            for card_class, background, variant in (
                ('', 'neutral', 'light'),
                (' demo-accent', 'accent', 'brand'),
                (' demo-secondary', 'secondary', 'dark'))
        )
        + '</div>'
    )
    demo_preview = (
        '<div class="scheme-preview" id="{id}">'
        '<div class="demo-preview-header">'
        '<img class="demo-logo" id="{logo_id}" src="{logo_src}" height="32" alt="{logo_alt}"></div>'
        '<div class="demo-copy"><p>{main_copy}</p><p>{secondary_copy}</p></div>'
        '<div class="demo-grid">'
        '<article class="demo-card"><span class="demo-icon-wrap"><span class="demo-icon demo-icon-calculator" aria-hidden="true"></span></span><p>Серая карточка с основным текстом и акцентной иконкой</p></article>'
        '<article class="demo-card demo-accent"{accent_attr}><span class="demo-icon-wrap"><span class="demo-icon demo-icon-{accent_icon}" aria-hidden="true"></span></span><p>Карточка акцентного цвета с контрастной иконкой</p></article>'
        '<article class="demo-card demo-secondary"><span class="demo-icon-wrap"><span class="demo-icon demo-icon-{second_icon}" aria-hidden="true"></span></span><p>Карточка дополнительного акцентного цвета</p></article>'
        '</div>{extra_row}<table class="demo-table table-full-width">'
        '<thead><tr><th scope="col">Показатель</th><th scope="col">Значение</th><th scope="col">Изменение</th></tr></thead>'
        '<tbody><tr><td>Первый показатель</td><td>120</td><td>+12%</td></tr>'
        '<tr><td>Второй показатель</td><td>85</td><td>+5%</td></tr>'
        '<tr><td>Третий показатель</td><td>64</td><td>−3%</td></tr></tbody></table></div>'
    )
    demo = (
        '<section id="eco-demo" class="demo-example"><div class="demo-heading"><h2>Экосистемная схема</h2>'
        '<div class="demo-controls"><fieldset aria-label="Тема экосистемной схемы">'
        '<label><input type="radio" name="eco-demo-theme" value="light" checked> Светлая</label>'
        '<label><input type="radio" name="eco-demo-theme" value="dark"> Тёмная</label>'
        '</fieldset></div></div><hr class="demo-divider">'
        + demo_preview.format(id='eco-scheme-preview', logo_id='eco-demo-logo',
                              logo_src=f'https://s.kontur.ru/common-v2/logos/v2/{kontur_logo_id}/{kontur_logo_id}-32.svg', logo_alt='Контур',
                              second_icon='calculator', accent_icon='home',
                              accent_attr=' id="eco-accent-card" tabindex="0" aria-label="Случайный акцент экосистемы"',
                              extra_row='',
                              main_copy='Здесь показано, как цвета экосистемы работают вместе на странице, в карточках и таблице.',
                              secondary_copy='Акценты дополняют схему.') + '</section>'
        '<section id="product-demo" class="demo-example"><div class="demo-heading"><h2>Продуктовая схема</h2>'
        '<div class="demo-controls"><select id="product-demo-color" aria-label="Цвет продуктовой схемы">' + demo_options + '</select>'
        '<fieldset aria-label="Тема продуктовой схемы">'
        '<label><input type="radio" name="product-demo-theme" value="light" checked> Светлая</label>'
        '<label><input type="radio" name="product-demo-theme" value="dark"> Тёмная</label>'
        '</fieldset></div></div><hr class="demo-divider">'
        + demo_preview.format(id='product-scheme-preview', logo_id='product-demo-logo',
                              logo_src=f'https://s.kontur.ru/common-v2/logos/v2/{initial_product_logo_id}/{initial_product_logo_id}-32.svg', logo_alt='Контур УЦ',
                              second_icon='home', accent_icon='calculator',
                              accent_attr='', extra_row=illustration_row,
                              main_copy='Здесь показано, как выбранный цвет продукта сочетается с общими переменными, карточками и иллюстрациями.',
                              secondary_copy='Цвет сохраняется в обеих темах.') + '</section>'
    )
    color_sections = common_scheme_body + product_scheme_body + kontur_scheme_body + recolor_section + base_table
    page_colors = {name: row["Значение"] for name, row in tokens.items() if row["Значение"]}
    page_colors.update({"--k-color-accent": accent, "--k-color-brand-secondary": secondary})
    if any(not re.fullmatch(r"#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?|grey", value)
           for value in page_colors.values()):
        raise ValueError("Некорректный цвет для оформления демо")
    css_colors = "".join(f"{name}:{value};" for name, value in page_colors.items())

    document = """<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kontur Design System — принципы</title>
<style>
@import url("https://s.kontur.ru/common-v2/fonts/kontur-sans/kontur-sans.css");
@import url("https://s.kontur.ru/common-v2/fonts/labgrotesque/labgrotesque.css");
:root{""" + css_colors + """font-family:"Kontur Sans","Lab Grotesque",Arial,Helvetica,sans-serif;color:var(--k-color-text);background:var(--k-color-page-islands-bg)}*{box-sizing:border-box}
html{scroll-behavior:smooth;font-size:14px}body{margin:0}a{color:var(--k-color-accent);text-decoration:none}.wrap{width:100%;max-width:none;padding:32px clamp(16px,3vw,48px) 60px}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px;align-items:start}.content{min-width:0}.sidebar{position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto;padding:18px}.sidebar nav > div + div{margin-top:18px}.sidebar h2{font-size:14px;font-weight:500;color:var(--k-color-text);margin:0 0 4px;padding:4px 10px}.sidebar ul{list-style:none;margin:0;padding:0 0 0 12px}.sidebar li+li{margin-top:0}.sidebar a{display:block;padding:7px 10px;border-radius:8px;color:var(--k-color-text);font-size:14px}.sidebar a:hover,.sidebar a:focus-visible{color:var(--k-color-accent)}section[id]{scroll-margin-top:20px}
main{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}main > #logos,main > #brand-mapping,main > #common-variable-list{margin-top:24px}
section{background:var(--k-color-page-bg);border:1px solid var(--k-color-border);border-radius:18px;padding:64px;min-height:180px}#recoloring-ui-icons{scroll-margin-top:20px}.icon-matrix td{min-width:100px;height:96px;vertical-align:middle}.icon-matrix th:not(:first-child),.icon-matrix td:not(:first-child){text-align:center}.icon-matrix img{display:block}.icon-matrix td a{display:inline-block}
.product-icon-examples{display:flex;flex-wrap:wrap;gap:24px;margin-top:24px}.product-icon-examples figure{display:grid;justify-items:start;align-content:start;gap:8px;margin:0;min-width:120px}.product-icon-examples img{display:block}.product-icon-examples figcaption{font-size:14px;color:var(--k-color-text-secondary)}
h1,h2,h3,h4,h5,h6{font-weight:500}h1,h2,h3,h4,h5,h6,p,ul,ol{max-width:800px}h2{font-size:32px;margin:0 0 40px}p{font-size:14px}p,li{line-height:1.5;color:var(--k-color-text)}ul,ol{padding-left:19px;margin:16px 0}
h3{font-size:22px;margin:22px 0 12px}h2+h3{margin-top:0}
li+li{margin-top:8px}code{font-size:.92em;background:var(--k-color-card-bg);padding:1px 3px;border-radius:3px}.source{display:inline-block;margin-top:8px;color:var(--k-color-accent);text-decoration:none;font-weight:bold}
.palette-section{width:100%}
section > div:has(> table){max-width:100%;overflow-x:auto}
table{border-collapse:collapse;background:transparent}
.table-full-width{width:100%}
th,td{text-align:left;vertical-align:top;padding:12px 4px;background:transparent}
th{font-weight:400}
th.column-fixed,td.column-fixed{width:250px;min-width:250px;max-width:250px}
td.column-fixed code{white-space:normal;overflow-wrap:anywhere}
td.column-fixed > span{white-space:normal}
thead th{border-bottom:1px solid var(--k-color-border-bold)}
tbody tr:not(:last-child){border-bottom:1px solid var(--k-color-border)}
tr[id]{scroll-margin-top:24px}
tr:target > td{background:color-mix(in srgb,var(--k-color-accent) 13%,transparent)}
a[href*="#base-"],a[href*="#common-"],a[href*="#registry-"],a[href*="#scheme-"]{color:inherit}
a[href*="#base-"]:hover,a[href*="#common-"]:hover,a[href*="#registry-"]:hover,a[href*="#scheme-"]:hover{color:var(--k-color-accent)}
table code{background:transparent;padding:0}
.demo-controls{display:flex;flex-wrap:wrap;gap:16px 24px;align-items:end;margin-bottom:14px}.demo-controls label{display:grid;gap:6px;font-weight:600}.demo-controls select{min-width:220px;padding:9px 12px;border:1px solid var(--k-color-border);border-radius:8px;background:var(--demo-card);color:var(--demo-text);font:inherit}.demo-controls fieldset{display:flex;gap:16px;align-items:center;margin:0;padding:0;border:0}.demo-controls legend{font-weight:600;margin-bottom:6px}.demo-controls fieldset label{display:flex;align-items:center;gap:5px;font-weight:400}.demo-heading{width:100%;max-width:800px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 24px;margin-bottom:0}.demo-divider{display:block;width:100%;max-width:800px;height:1px;margin:16px 0 0;border:0;background:var(--k-color-border)}.demo-heading h2{margin:0}.demo-heading .demo-controls{margin:0}.demo-example{background:var(--demo-page);color:var(--demo-text)}.demo-example input[type=radio]{accent-color:var(--demo-accent)}.scheme-preview{width:100%;max-width:800px;border:0;background:transparent;color:inherit}.demo-preview-header{display:flex;align-items:start}.demo-logo{display:block;width:auto;height:32px;max-width:100%;margin:32px 0 32px 0;object-fit:contain;object-position:left top}.demo-copy{display:grid;grid-template-columns:minmax(0px,60%) minmax(0px,20%);gap:16px;margin:0px 0px 32px}.demo-copy p{margin:0;font-size:14px;line-height:1.5;color:var(--demo-text)}.demo-copy p:last-child{color:var(--demo-text-secondary)}.demo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:stretch}.demo-illustration-row{margin-top:10px}.demo-card.demo-illustration-card{align-items:center;justify-content:center}.demo-illustration-card img{display:block;flex:none;max-width:100%;height:auto}.demo-card{min-height:220px;padding:17px;border-radius:13px;background:var(--demo-card);color:var(--demo-text);display:flex;flex-direction:column;align-items:start}.demo-card p{font-size:clamp(12px,1vw,14px);line-height:1.25;margin:auto 0 0;color:inherit;max-width:26ch}.demo-icon-wrap{display:flex;flex:none;align-items:center;justify-content:center;width:40px;height:40px;margin-bottom:17px}.demo-icon{display:block;width:32px;height:32px;background:var(--demo-icon-color);mask-repeat:no-repeat;mask-position:center;mask-size:contain}.demo-icon-calculator{mask-image:url("https://s.kontur.ru/common-v2/icons-ui/black/calculator/calculator-32-regular.svg")}.demo-icon-home{mask-image:url("https://s.kontur.ru/common-v2/icons-ui/black/building-home/building-home-32-regular.svg")}.demo-accent .demo-icon{background:var(--demo-icon-on-accent)}.demo-secondary .demo-icon{background:var(--demo-icon-on-secondary)}.demo-accent{background:var(--demo-accent);color:var(--demo-on-accent)}.demo-secondary{background:var(--demo-secondary);color:var(--demo-on-secondary)}.demo-table{width:100%;margin-top:24px;color:inherit;font-size:12px}.demo-table caption{text-align:left;font-weight:600;margin-bottom:8px}.demo-table thead th{border-bottom:1px solid var(--k-color-border-bold)}.demo-table tbody tr:not(:last-child){border-bottom:1px solid var(--k-color-border)}@media(max-width:620px){.demo-grid,.demo-copy{grid-template-columns:1fr}.demo-copy{gap:8px}}
td > span{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
td > span > span{display:inline-block;flex:none;width:18px;height:18px;border-radius:22px;box-shadow:inset 0px 0px 0px 1px rgba(0,0,0,0.1)}
td > div{display:grid;gap:8px}
.swatches{display:flex;gap:8px;margin-top:18px}.swatches span{width:48px;height:48px;border:1px solid var(--k-color-border);border-radius:12px}
.rule-group{margin-top:28px}.rule-group h3{margin:0 0 12px}.rule-group h4{font-size:15px;margin:20px 0 8px}.rule-group h3+h4{margin-top:0}.rules-table{max-width:100%;overflow-x:auto}.rules-table table{min-width:max-content}.sample-label{font-size:13px;color:var(--k-color-text-secondary);margin-top:18px}.recolor{display:flex;align-items:center;gap:9px;padding:12px;margin-top:8px;border-radius:12px}
.recolor span{font-size:12px;color:var(--k-color-text);background:var(--k-color-page-bg);border-radius:6px;padding:4px;margin-right:auto}.recolor i{display:block;width:20px;height:20px;border:1px solid var(--k-color-border);border-radius:50%}
footer{margin-top:22px;color:var(--k-color-text-secondary);font-size:13px}
@media(max-width:760px){.layout{grid-template-columns:1fr}.sidebar{position:sticky;top:0;z-index:5;max-height:none;overflow:auto;padding:8px;border-radius:0;margin:0 calc(-1 * clamp(16px,3vw,48px));white-space:nowrap}.sidebar nav{display:flex;gap:14px}.sidebar nav > div + div{margin-top:0}.sidebar ul{display:flex;gap:2px;padding:0}.sidebar a{flex:none}section[id],tr[id]{scroll-margin-top:76px}}.typography-sample{font-size:clamp(32px,5vw,64px);font-weight:700;line-height:1.15}
</style></head><body><div class="wrap"><main>""" + demo + asset_sections + brand_mapping_section + product_extensions_section + color_sections + """</main><footer>HTML обновляется скриптом scripts/update.py при изменении Markdown или каталогов.</footer></div><script>
const ecoPreview=document.getElementById('eco-scheme-preview');
const ecoSheet=document.getElementById('eco-demo');
const ecoAccentCard=document.getElementById('eco-accent-card');
const ecoAccentValues=ECO_ACCENT_VALUES;
let currentEcoAccent=null;
function changeEcoAccent(){
  const choices=ecoAccentValues.filter(color=>color!==currentEcoAccent);
  currentEcoAccent=choices[Math.floor(Math.random()*choices.length)];
  ecoAccentCard.style.setProperty('--demo-accent',currentEcoAccent);
}
ecoAccentCard.addEventListener('mouseenter',changeEcoAccent);
ecoAccentCard.addEventListener('focus',changeEcoAccent);
const productPreview=document.getElementById('product-scheme-preview');
const productSheet=document.getElementById('product-demo');
const productColor=document.getElementById('product-demo-color');
const ecoLogo=document.getElementById('eco-demo-logo');
const productLogo=document.getElementById('product-demo-logo');
function logoUrl(id,dark){return `https://s.kontur.ru/common-v2/logos/v2/${id}/${id}-32${dark?'-dark':''}.svg`; }
function setPreview(preview,colors){
  for(const [name,value] of Object.entries(colors))preview.style.setProperty('--demo-'+name,value);
}
function setPreviewBorders(preview,border,bold){
  preview.style.setProperty('--k-color-border',border);
  preview.style.setProperty('--k-color-border-bold',bold);
}
function updateEcoDemo(){
  const dark=document.querySelector('input[name="eco-demo-theme"]:checked').value==='dark';
  ecoSheet.dataset.kind='eco';
  ecoSheet.dataset.theme=dark?'dark':'light';
  ecoPreview.dataset.theme=ecoSheet.dataset.theme;
  ecoLogo.src=logoUrl('kontur',dark);
  setPreview(ecoSheet,{
    page:dark?'DARK_PAGE':'LIGHT_PAGE',card:dark?'DARK_CARD':'LIGHT_CONTOUR_CARD',
    text:dark?'DARK_COMMON_TEXT':'LIGHT_TEXT',
    'text-secondary':dark?'ECO_DARK_TEXT_SECONDARY':'ECO_LIGHT_TEXT_SECONDARY',
    accent:'ECO_ACCENT',secondary:'ECO_SECONDARY',
    'icon-color':dark?'GRAY_100':'ECO_ACCENT',
    'icon-on-accent':'GRAY_100',
    'icon-on-secondary':'GRAY_100',
    'on-accent':'#ffffff','on-secondary':dark?'DARK_COMMON_TEXT':'#ffffff'
  });
  setPreviewBorders(ecoSheet, dark?'ECO_DARK_BORDER':'ECO_LIGHT_BORDER', dark?'ECO_DARK_BORDER_BOLD':'ECO_LIGHT_BORDER_BOLD');
}
function updateProductDemo(){
  const dark=document.querySelector('input[name="product-demo-theme"]:checked').value==='dark';
  const option=productColor.selectedOptions[0];
  productSheet.style.setProperty('--k-color-product-accent',option.dataset.accent);
  productSheet.style.setProperty('--k-color-product-secondary',option.dataset.secondary);
  productSheet.dataset.kind='product';
  productSheet.dataset.theme=dark?'dark':'light';
  productPreview.dataset.theme=productSheet.dataset.theme;
  productLogo.src=logoUrl(option.dataset.logo,dark);
  productLogo.alt='Логотип '+option.dataset.logoName;
  productPreview.querySelectorAll('[data-object-background]').forEach(img=>{
    const background=img.dataset.objectBackground;
    const variant=background==='accent'?'brand':background==='secondary'||dark?'dark':'light';
    img.src=`https://s.kontur.ru/common-v2/visuals/products/illustration-object/${option.value}/business-box/business-box-96x96-${variant}.svg`;
  });
  setPreview(productSheet,{
    page:dark?'DARK_COMMON_PAGE':'LIGHT_PAGE',
    card:dark?'DARK_COMMON_CARD':'LIGHT_CARD',
    text:dark?'DARK_COMMON_TEXT':'LIGHT_TEXT',
    'text-secondary':dark?'PRODUCT_DARK_TEXT_SECONDARY':'PRODUCT_LIGHT_TEXT_SECONDARY',
    accent:option.dataset.accent,
    secondary:option.dataset.secondary,
    'icon-color':option.dataset.accent,
    'icon-on-accent':option.dataset.secondary,
    'icon-on-secondary':option.dataset.accent,
    'on-accent':'GRAY_100',
    'on-secondary':'GRAY_100'
  });
  setPreviewBorders(productSheet, dark?'PRODUCT_DARK_BORDER':'PRODUCT_LIGHT_BORDER', dark?'PRODUCT_DARK_BORDER_BOLD':'PRODUCT_LIGHT_BORDER_BOLD');
}
document.querySelectorAll('input[name="eco-demo-theme"]').forEach(input=>input.addEventListener('change',updateEcoDemo));
document.querySelectorAll('input[name="product-demo-theme"]').forEach(input=>input.addEventListener('change',updateProductDemo));
productColor.addEventListener('change',updateProductDemo);
updateEcoDemo();
updateProductDemo();
changeEcoAccent();
</script></body></html>
"""
    border_overrides = {row['Переменная']: row for row in overrides}
    document = (document.replace('DARK_PAGE', demo_dark['--k-color-page-bg'])
                .replace('ECO_DARK_TEXT_SECONDARY', resolved(contour_overrides['--k-color-text-secondary']['Темная']))
                .replace('ECO_LIGHT_TEXT_SECONDARY', resolved(contour_overrides['--k-color-text-secondary']['Светлая']))
                .replace('PRODUCT_DARK_TEXT_SECONDARY', common_dark['--k-color-text-secondary'])
                .replace('PRODUCT_LIGHT_TEXT_SECONDARY', tokens['--k-color-text-secondary']['Значение'])
                .replace('ECO_DARK_BORDER_BOLD', resolved(border_overrides['--k-color-border-bold']['Темная']))
                .replace('ECO_LIGHT_BORDER_BOLD', resolved(border_overrides['--k-color-border-bold']['Светлая']))
                .replace('ECO_DARK_BORDER', resolved(border_overrides['--k-color-border']['Темная']))
                .replace('ECO_LIGHT_BORDER', resolved(border_overrides['--k-color-border']['Светлая']))
                .replace('PRODUCT_DARK_BORDER_BOLD', common_dark['--k-color-border-bold'])
                .replace('PRODUCT_LIGHT_BORDER_BOLD', tokens['--k-color-border-bold']['Значение'])
                .replace('PRODUCT_DARK_BORDER', common_dark['--k-color-border'])
                .replace('PRODUCT_LIGHT_BORDER', tokens['--k-color-border']['Значение'])
                .replace('DARK_CARD', demo_dark['--k-color-card-bg'])
                .replace('DARK_COMMON_PAGE', common_dark['--k-color-page-bg'])
                .replace('DARK_COMMON_CARD', common_dark['--k-color-card-bg'])
                .replace('DARK_COMMON_TEXT', common_dark['--k-color-text'])
                .replace('LIGHT_PAGE', tokens['--k-color-page-bg']['Значение'])
                .replace('LIGHT_CARD', tokens['--k-color-card-bg']['Значение'])
                .replace('LIGHT_CONTOUR_CARD', demo_light_card)
                .replace('LIGHT_TEXT', tokens['--k-color-text']['Значение'])
                .replace('ECO_ACCENT_VALUES', eco_demo_accents)
                .replace('ECO_ACCENT', accent)
                .replace('ECO_SECONDARY', secondary)
                .replace('GRAY_100', resolved('gray-100')))
    menu_groups = [
        ("Демо", [("eco-demo", "Экосистемная схема"),
                  ("product-demo", "Продуктовая схема")]),
        ("Ассеты", [("logos", "Логотипы"), ("product-icons", "Иконки продуктов"),
                    ("icons", "Интерфейсные иконки"),
                    ("illustrations", "Иллюстрации")]),
        ("Бренды", [("brand-mapping", "Продукты"),
                    ("product-extensions", "Продуктовые расширения")]),
        ("Цвет", [("common-variable-list", "Общие переменные"),
                   ("schemes", "Продуктовые цвета"),
                   ("kontur-scheme", "Экосистемные цвета"),
                   ("recoloring", "Правила перекраски"),
                   ("base-tokens", "Токены")]),
    ]
    visible_anchors = {
        "logos", "product-icons", "icons", "illustrations", "brand-mapping", "product-extensions", "eco-demo", "product-demo", "recoloring",
        "common-variable-list", "schemes", "kontur-scheme", "base-tokens",
    }
    menu_groups = [
        (group, [(anchor, label) for anchor, label in links if anchor in visible_anchors])
        for group, links in menu_groups
    ]
    menu_groups = [(group, links) for group, links in menu_groups if links]
    sidebar = '<aside class="sidebar"><nav aria-label="Разделы дизайн-системы">' + "".join(
        f'<div><h2>{html.escape(group)}</h2><ul>' + "".join(
            f'<li><a href="#{anchor}">{html.escape(label)}</a></li>' for anchor, label in links
        ) + '</ul></div>' for group, links in menu_groups
    ) + '</nav></aside>'
    document = document.replace(
        '<div class="wrap"><main>',
        '<div class="wrap"><div class="layout">' + sidebar + '<div class="content"><main>',
        1,
    )
    document = document.replace('</footer></div><script>',
                                '</footer></div></div></div><script>', 1)
    token_targets = {name: f"#base-{name}" for name in base}
    for _, rows in registry_groups:
        token_targets.update({row["Переменная"]: f"#registry-{row['Переменная']}" for row in rows})
    token_targets.update({name: f"#common-{name}" for name in tokens})
    token_targets.update({name: f"#scheme-{name}" for name, _, _ in kontur_scheme_rows})
    token_pattern = re.compile(
        r"(?<![A-Za-z0-9_-])(" + "|".join(re.escape(name) for name in sorted(token_targets, key=len, reverse=True))
        + r")(?![A-Za-z0-9_-])"
    )

    def link_code(match, targets):
        linked = token_pattern.sub(
            lambda token: f'<a href="{targets[token.group()]}">{token.group()}</a>',
            match.group(1),
        )
        return f"<code>{linked}</code>"

    document = re.sub(r"<code>([^<]*)</code>", lambda match: link_code(match, token_targets), document)
    target = ROOT / "assets" / "overview.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(document, encoding="utf-8")
    print(f"Обновлён {target}")
    for filename in ("common-color-variables.html", "product-color-schemes.html",
                     "kontur-color-scheme.html", "base-color-tokens.html"):
        (ROOT / "assets" / filename).unlink(missing_ok=True)

    for key, _, _, _ in CATEGORIES:
        old_page = ROOT / "assets" / f"{key.replace('_', '-')}.html"
        old_page.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--local-only", action="store_true", help="Пересобрать HTML без обращения к сети")
    args = parser.parse_args()
    sources = source_catalogs()
    if not args.local_only:
        for category, source in sources.items():
            if not source.get("url"):
                continue
            with urlopen(source["url"], timeout=30) as response:
                data = json.loads(response.read())
            if category == "ui_icons":
                validate_ui_icons(data)
            if category == "object_illustrations":
                validate_object_illustrations(data)
            target = local_path(source["local"])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"Обновлён {target}")
    for category, source in sources.items():
        if category == "ui_icons" and source.get("local"):
            validate_ui_icons(read_json(local_path(source["local"])))
        if category == "object_illustrations" and source.get("local"):
            validate_object_illustrations(read_json(local_path(source["local"])))
    render(sources)


if __name__ == "__main__":
    main()
