# Интерфейсные иконки

## Принцип

Каталог содержит названия, идентификаторы, тематические группы и поисковые теги.

- Подбирай иконку по смыслу через `title`, `groupTitle` и `tags`.
- После выбора используй точный идентификатор `name`.
- Размер и начертание иконки задаются в исходном документе автора. Сохраняй их при подборе файла и не меняй по своему усмотрению.
- Каталог не подтверждает URL файла, формат, размер или цвет.

Контракт применения цветовых переменных к иконкам: [color-rules.md](../colors/color-rules.md#интерфейсные-иконки).

## Хранение и варианты

- Метаданные интерфейсных иконок хранятся в [актуальном JSON](https://s.kontur.ru/common-v2/icons-ui/icons-ui.json) и локальной копии `references/icons/icons-ui.json`. Каталог содержит `title`, `name`, `groupTitle` и `tags`; это указатель для поиска, а не сами изображения.
- Файлы иконок находятся на `s.kontur.ru` в папках вида `common-v2/icons-ui/{цвет}/{name}/`. По умолчанию выбирай SVG из папки [`black`](https://s.kontur.ru/common-v2/icons-ui/black/); известны также готовые красные и белые PNG. Наличие цвета проверяй для конкретной иконки.
- В [проверенном семействе файлов](https://s.kontur.ru/common-v2/icons-ui/black/gov-gosuslugi/) есть размеры 16, 20, 24, 32 и 64 px. Форматы: SVG, PNG и PNG `@2x`. Варианты начертания: `light`, `regular`, `solid`; состав вариантов зависит от размера и иконки.
- Имя файла состоит из идентификатора, размера и начертания, например `calculator-32-regular.svg`. Точный путь и доступные варианты проверяй на статике перед использованием.

## Матрица примера

Для иконки [«Калькулятор»](https://s.kontur.ru/common-v2/icons-ui/black/calculator/) подтверждены следующие SVG-варианты. Пустая ячейка означает, что такого сочетания в этом семействе нет; матрицу нельзя переносить на другие иконки без проверки.

| Размер | light | regular | solid |
| --- | --- | --- | --- |
| 16 px | ✓ | ✓ | ✓ |
| 20 px | ✓ | ✓ | ✓ |
| 24 px |  | ✓ | ✓ |
| 32 px |  | ✓ |  |
| 64 px |  | ✓ |  |

## Подтверждённые файлы для демо

Для примера применения цветовых схем проверены SVG из папки `black`:

- [Калькулятор, чёрный SVG](https://s.kontur.ru/common-v2/icons-ui/black/calculator/calculator-32-regular.svg)
- [Дом, чёрный SVG](https://s.kontur.ru/common-v2/icons-ui/black/building-home/building-home-32-regular.svg)

Ранее проверенные готовые PNG-варианты:

- [Калькулятор, красный PNG](https://s.kontur.ru/common-v2/icons-ui/red/calculator/calculator-32-regular@2x.png)
- [Дом, красный PNG](https://s.kontur.ru/common-v2/icons-ui/red/building-home/building-home-32-regular@2x.png)
- [Калькулятор, белый PNG](https://s.kontur.ru/common-v2/icons-ui/white/calculator/calculator-32-regular@2x.png)
