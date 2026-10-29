# Логотипы

## Принцип

- Список идентификаторов логотипов находится в [каталоге `logos/v2`](https://s.kontur.ru/common-v2/logos/v2/). Идентификатор — имя папки, например `aegis`.
- Путь к обычному SVG строится как `https://s.kontur.ru/common-v2/logos/v2/{id}/{id}-{size}.svg`, например [aegis-32.svg](https://s.kontur.ru/common-v2/logos/v2/aegis/aegis-32.svg). Для тёмной темы или тёмного фона выбирай вариант `{id}-{size}-dark.svg`. Размеры и наличие вариантов проверяй в папке конкретного логотипа.
- PNG-логотипы доступны только в размере `32` и плотности `@2x`: `https://s.kontur.ru/common-v2/logos/v2/{id}/{id}-32@2x.png`. Другие размеры и плотности PNG не предполагай. Для SVG проверяй доступные размеры и варианты в папке конкретного логотипа.
- Не подменяй размер CSS, если он задан в исходном документе автора.
- На акцентном или дополнительном цветном фоне перекрашивай логотип целиком в белый `gray-100`; исходный цветной SVG там не используй. Правило применения описано в [color-rules.md](../colors/color-rules.md#логотипы).
- Для демонстрации проверены варианты 32 px: [Контур](https://s.kontur.ru/common-v2/logos/v2/kontur/), [УЦ](https://s.kontur.ru/common-v2/logos/v2/ca/), [Экстерн](https://s.kontur.ru/common-v2/logos/v2/extern/), [Фокус](https://s.kontur.ru/common-v2/logos/v2/focus/), [Диадок](https://s.kontur.ru/common-v2/logos/v2/diadoc/), [Толк](https://s.kontur.ru/common-v2/logos/v2/talk/), [Закупки](https://s.kontur.ru/common-v2/logos/v2/zakupki/), [Эгида](https://s.kontur.ru/common-v2/logos/v2/aegis/) и [Недвижимость](https://s.kontur.ru/common-v2/logos/v2/real-estate/). Для каждого доступны обычный SVG и SVG `-dark`; соответствующие PNG-варианты `32@2x` также проверены.

Таблица соответствия продукта, цветовой схемы и ID логотипа хранится в [semantic-tokens.md](../colors/semantic-tokens.md#привязка-продуктов); для бренда «Контур» — в [привязке экосистемы](../colors/semantic-tokens.md#привязка-экосистемы). ID используются для построения пути к файлу по правилу выше.
