# Иллюстрации

## Принцип

Тип «Объектные» — продуктовые иллюстрации из `illustration-object`. Выбирай сюжет по каталогу, цвет — по общей продуктовой схеме, а размер и вариант — по наличию файлов. Исследованный пример `business-box` изображает открытую коробку с двумя стрелками вверх.

## Каталог и ID

Источник: [illustrations.json](https://s.kontur.ru/common-v2/visuals/products/illustration-object/illustrations.json). Локальная копия: [illustrations.json](illustrations.json); обновляется через `scripts/update.py` вместе с остальными каталогами.

Проверено 23 октября 2026 года: 132 уникальных ID в семи группах. JSON — массив объектов: `name` — точный ID для пути, `title` — название (может повторяться), `groupTitle` — группа, `tags` — русские и английские поисковые слова. Например, у коробки `name: business-box`, `title: бизнес`, `groupTitle: Бизнес и торговля`. Ищи по `tags`, `title` и `groupTitle`, а адрес формируй по `name`, сохраняя исходное написание.

Каталог содержит ID и поисковые описания; он не перечисляет размеры, цветовые папки, форматы и варианты фона. Наличие всех вариантов `business-box` не доказывает такой же набор для остальных ID: проверяй папку выбранного сюжета.

## Цветовые схемы

ID цветов общие с другими типами ассетов. Используй таблицу «Продуктовые схемы» в [semantic-tokens.md](../colors/semantic-tokens.md); не заводи отдельную палитру объектных иллюстраций. Подтверждённые папки в [корне типа](https://s.kontur.ru/common-v2/visuals/products/illustration-object/): `red`, `orange`, `green`, `green-mint`, `blue`, `blue-dark`, `violet`, `purple`.

`blue` — голубая схема, `blue-dark` — синяя. Суффикс файла `dark` обозначает вариант иллюстрации, а не ID цвета `blue-dark`. Схему выбирай по привязке продукта, а не по названию сюжета.

## Хранение и варианты

Базовый адрес: `https://s.kontur.ru/common-v2/visuals/products/illustration-object/`.

- Папка: `{color-id}/{illustration-id}/`.
- SVG: `{illustration-id}-{size}x{size}-{variant}.svg`.
- PNG: `{illustration-id}-{size}x{size}-{variant}@2x.png` (`@` может быть закодирован как `%40`).
- Проверенные размеры `business-box`: 64, 96, 128, 192, 256. SVG имеет соответствующие `width`, `height` и `viewBox`; PNG @2x вдвое больше: 128, 192, 256, 384, 512 пикселей на сторону. При размещении PNG учитывай логический размер из имени.
- Варианты файлов: `light`, `brand`, `dark`. Это буквальные суффиксы статики: не заменяй их на `primary`, `accent` или `secondary` при составлении URL. Выбор по фону и особенности исходных цветов описаны в [едином контракте цветов](../colors/color-rules.md#объектные-иллюстрации-на-статике).
- SVG и PNG имеют прозрачный фон. Подложку задаёт макет. Сохраняй пропорции и внутренние поля; размеры могут содержать различия в геометрии, поэтому выбирай готовый размер, когда он подходит.

## Варианты на примере business-box

Источник: [папка blue/business-box](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/). Ниже все 30 файлов этой папки. Ссылки ведут на исходники, без перекраски.

| Размер SVG | Размер PNG @2x | Вариант | SVG | PNG |
| --- | --- | --- | --- | --- |
| 64×64 | 128×128 | `light` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-light.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-light%402x.png) |
| 64×64 | 128×128 | `brand` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-brand.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-brand%402x.png) |
| 64×64 | 128×128 | `dark` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-dark.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-64x64-dark%402x.png) |
| 96×96 | 192×192 | `light` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-light.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-light%402x.png) |
| 96×96 | 192×192 | `brand` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-brand.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-brand%402x.png) |
| 96×96 | 192×192 | `dark` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-dark.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-96x96-dark%402x.png) |
| 128×128 | 256×256 | `light` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-light.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-light%402x.png) |
| 128×128 | 256×256 | `brand` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-brand.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-brand%402x.png) |
| 128×128 | 256×256 | `dark` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-dark.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-128x128-dark%402x.png) |
| 192×192 | 384×384 | `light` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-light.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-light%402x.png) |
| 192×192 | 384×384 | `brand` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-brand.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-brand%402x.png) |
| 192×192 | 384×384 | `dark` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-dark.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-192x192-dark%402x.png) |
| 256×256 | 512×512 | `light` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-light.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-light%402x.png) |
| 256×256 | 512×512 | `brand` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-brand.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-brand%402x.png) |
| 256×256 | 512×512 | `dark` | [SVG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-dark.svg) | [PNG](https://s.kontur.ru/common-v2/visuals/products/illustration-object/blue/business-box/business-box-256x256-dark%402x.png) |

Проверены все восемь цветовых папок `business-box`: в каждой тот же набор из 30 файлов, всего 240 (8 схем × 5 размеров × 3 варианта × 2 формата). Для другого цвета замени только сегмент `blue` в ссылках выше на общий ID схемы. Проверка всех SVG и размеров PNG выполнена 23 октября 2026 года.
