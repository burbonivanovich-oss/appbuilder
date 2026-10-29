# Иконки продуктов

## Принцип

- Файлы находятся в [каталоге `icons-products`](https://s.kontur.ru/common-v2/icons-products/) на `s.kontur.ru`. Для основного продукта ID иконки совпадает с [ID его логотипа](../colors/semantic-tokens.md#привязка-продуктов). Например, ID `admin` образует путь `https://s.kontur.ru/common-v2/icons-products/admin/admin-16.svg`.
- Выбирай подтверждённый файл нужного типа, размера и формата в папке продукта. Набор файлов у разных продуктов может отличаться; размеры в примере `admin` не считай универсальными.
- Для продуктовых расширений `IconID` берётся из [справочника расширений](../logos/product-extensions.md#справочник), а не наследуется от основного продукта. Путь к символу расширения: `https://s.kontur.ru/common-v2/icons-products/{IconID}/symbol/{IconID}-symbol-24.svg`. Убедись, что этот файл есть на статике.
- Сохраняй размер и тип исходного файла. Не создавай отсутствующий вариант масштабированием другого файла.

## Варианты на примере admin

Папка [admin](https://s.kontur.ru/common-v2/icons-products/admin/) содержит следующие подтверждённые варианты:

| Тип | Расположение | Подтверждённые размеры и форматы |
| --- | --- | --- |
| Основная иконка | `admin/admin-{size}` | 16, 24, 32, 36, 48, 64, 82, 128, 256, 512 px; SVG и PNG |
| Символ | `admin/symbol/admin-symbol-{size}` | 16, 24, 32, 36, 48, 64 px; SVG и PNG |
| Глиф | `admin/glyph/admin-glyph-16` | 16 px; SVG и PNG |
| Favicon | `admin/favicon/` | PNG 16, 32, 180, 192 и 512 px; также SVG без размера в имени и `favicon.ico` |
| Аватар | `admin/avatar/admin-avatar-512.png` | 512 px; PNG |
| Значок приложения для Windows | `admin/app-windows/admin.ico` | ICO |
| Значок приложения для macOS | `admin/app-macos/` | Папки `macos-15/` и `macos-26/`; содержимое проверяй отдельно |
| Значок приложения для Android | `admin/app-android/` | Папки `adaptive/` и `themed/`, PNG 512 px и `admin-full-bleed.png`; содержимое подпапок проверяй отдельно |

Примеры файлов: [основная иконка 24 px](https://s.kontur.ru/common-v2/icons-products/admin/admin-24.svg), [символ 24 px](https://s.kontur.ru/common-v2/icons-products/admin/symbol/admin-symbol-24.svg), [глиф 16 px](https://s.kontur.ru/common-v2/icons-products/admin/glyph/admin-glyph-16.svg).
