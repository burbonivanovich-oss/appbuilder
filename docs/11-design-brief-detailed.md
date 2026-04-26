# ТЗ для дизайнера — Детальная версия

> Этот документ — для дизайнера, который делает Figma-файл или готовый UI-kit.
> Все токены берутся из `mobile/src/theme/tokens.ts`. Отклонения согласуются.

---

## Стек и контекст

- React Native + Expo (iOS / Android)
- Дизайн в Figma, передача через токены
- Светлая и тёмная тема — обе обязательны
- Минимальный экран: iPhone SE (375×667pt)
- Основной экран: iPhone 14 Pro (393×852pt)

---

## Цветовые токены

### Светлая тема

| Токен | Hex | Применение |
|-------|-----|------------|
| `bg` | `#FEFAF5` | Фон всех экранов |
| `surface` | `#FFFFFF` | Карточки первого уровня |
| `surfaceAlt` | `#F6EFE6` | Карточки второго уровня, chips |
| `border` | `#EDE4DA` | Все рамки |
| `textPrimary` | `#2C2420` | Заголовки, основной текст |
| `textSecondary` | `#6F6661` | Вспомогательный текст, labels |
| `textMuted` | `#9A8F87` | Timestamps, совсем мелкие подписи |
| `primary` | `#E8876B` | CTA-кнопки, активный скачок, акцент |
| `primarySoft` | `#FADFD1` | Фон hero-карточки активного скачка |
| `secondary` | `#8FAF99` | Спокойные состояния, «всё ок» |
| `secondarySoft` | `#D7E5D9` | Фон info-блоков |
| `accent` | `#E8B86B` | Редко: предупреждения (не ошибки) |
| `success` | `#7BA68E` | Чекмарки, спокойная неделя |
| `warning` | `#E8B86B` | = accent, для варнинг-тонов |
| `error` | `#D97878` | Деструктивные действия (удалить, выйти) |

### Тёмная тема

| Токен | Hex | Примечание |
|-------|-----|------------|
| `bg` | `#1A1614` | Коричневый подтон, не серый — это принципиально |
| `surface` | `#25201C` | |
| `surfaceAlt` | `#2F2925` | |
| `border` | `#3A322D` | |
| `textPrimary` | `#F4EDE4` | Кремовый, не чисто белый |
| `textSecondary` | `#C4B9B0` | |
| `textMuted` | `#958B83` | Поднято для WCAG AA (≥4.5:1 на `bg`) |
| `primary` | `#F4A588` | |
| `primarySoft` | `#3F2E26` | |
| `secondary` | `#A5C4AD` | |
| `secondarySoft` | `#2A342D` | |
| `accent` | `#F0C482` | |
| `success` | `#8FB89E` | |
| `warning` | `#F0C482` | |
| `error` | `#E09090` | |

---

## Типографика

### Шрифт

```
iOS:     SF Pro Rounded (font family: ui-rounded)
Android: Roboto (system default)
Web:     system-ui
```

SF Pro Rounded применяется **ко всем текстовым элементам** — заголовки и body.
Округлые формы создают тёплый, не клинический тон.

### Шкала

| Токен | Size | Weight | LineHeight | Tracking | Применение |
|-------|------|--------|-----------|---------|------------|
| `hero` | 28 | 700 | 34 | — | Главный заголовок экрана (одно место) |
| `title` | 22 | 700 | 28 | — | Заголовок карточки |
| `subtitle` | 17 | 600 | 22 | — | Подзаголовок секции |
| `body` | 15 | 400 | 22 | — | Основной текст |
| `bodyStrong` | 15 | 600 | 22 | — | Акцентированный текст, labels кнопок |
| `caption` | 13 | 400 | 18 | — | Вспомогательный текст |
| `captionStrong` | 13 | 600 | 18 | +0.5 | Теги, лейблы, фильтры |
| `micro` | 11 | 500 | 14 | — | Бейджи, счётчики, "скоро" |

**Правило:** минимальный размер текста в UI — 13pt (caption). Ниже только если элемент
чисто декоративный.

---

## Отступы (Spacing)

| Токен | px | Применение |
|-------|-----|------------|
| `xs` | 4 | Иконка↔текст, минимальный gap |
| `sm` | 8 | Gap между элементами одного уровня |
| `md` | 12 | Padding мелких компонентов |
| `lg` | 16 | Padding стандартных компонентов |
| `xl` | 20 | Горизонтальный padding экрана |
| `xxl` | 24 | Padding крупных карточек, gap между секциями |
| `xxxl` | 32 | Крупные разрывы |
| `huge` | 48 | Нижний отступ скроллируемого контента |

**Горизонтальный padding всех экранов:** `xl` (20pt) с каждой стороны.

---

## Радиусы

| Токен | px | Применение |
|-------|-----|------------|
| `sm` | 8 | Chips, inputs, мелкие элементы |
| `md` | 12 | Средние карточки, кнопки |
| `lg` | 16 | Основные карточки |
| `xl` | 24 | Hero-карточки |
| `pill` | 999 | Теги, фильтры-пилюли, FAB |

Никаких `radius: 0` в UI-элементах. Только для разделительных линий.

---

## Тени

Применяются **только** к элементам, плавающим над контентом.
Карточки на одном уровне с фоном используют `border`, не тень.

| Уровень | shadowOpacity | radius | offset | elevation | Применение |
|---------|-------------|--------|--------|-----------|------------|
| `sm` | 0.06 | 4 | (0, 2) | 2 | Едва заметный подъём |
| `md` | 0.12 | 8 | (0, 4) | 4 | FAB, action sheets |
| `lg` | 0.20 | 16 | (0, 8) | 8 | Modal sheets (будущее) |

---

## Анимации

| Токен | ms | Easing | Применение |
|-------|-----|--------|-----------|
| `fast` | 150 | ease-out | Press-feedback, opacity |
| `normal` | 220 | ease-out | Переходы элементов, появление |
| `slow` | 350 | ease-out | Screen transitions, reveal |

**Правило:** ничто не анимируется быстрее 150ms. Easing всегда ease-out —
элементы "приземляются", не "вылетают". Быстрые резкие движения воспринимаются
как тревожный сигнал для аудитории в стрессе.

---

## Иконки

- Библиотека: **Ionicons**
- Стиль: исключительно **outline** (не filled, не sharp)
- Размеры:

| Контекст | Size |
|----------|------|
| Inline в тексте | 16 |
| Tags, chips | 12–14 |
| List items | 22 |
| Navigation bar | 24 |
| Featured / hero | 28 |

---

## Компоненты — спецификация

### Button

| Вариант | Bg | Border | Text |
|---------|-----|--------|------|
| `primary` | `primary` | `primary` | `#FFFFFF` |
| `secondary` | `surfaceAlt` | `border` | `textPrimary` |
| `ghost` | transparent | transparent | `primary` |

Размеры:
- `md`: paddingH `xl`, paddingV `md`, font `bodyStrong`
- `lg`: paddingH `xl`, paddingV `lg`, font 17/600

Радиус: `md` (12). Press: opacity → 0.85 за `fast` (150ms).

**Правило:** максимум одна `primary` кнопка в видимой области экрана.

---

### Card

| Тон | Bg | Border |
|-----|-----|--------|
| `default` | `surface` | `border` |
| `soft` | `surfaceAlt` | `border` |
| `accent` | `primarySoft` | `primary` (opacity 0.3) |

Радиус: `lg` (16). Border: 1pt. Padding по умолчанию: `xl` (20).

**Правило карточных тонов:** на одном экране не более одной карточки с тоном `accent`.
Карточки `soft` могут быть несколько, но не подряд — перемежать с `default`.

---

### Tag (статичный)

Pill-форма, не интерактивный.

| Вариант | Bg | Border | Text/Icon |
|---------|-----|--------|-----------|
| `default` | `surfaceAlt` | `border` | `textSecondary` |
| `primary` | `primarySoft` | `primary` | `primary` |
| `success` | `secondarySoft` | `secondary` | `secondary` |

Размеры:
- `sm`: paddingH `sm`, paddingV 2, font `micro`
- `md`: paddingH `md`, paddingV `xs`, font `caption`

---

### Chip (интерактивный)

Для фильтров и множественного выбора.

| Состояние | Bg | Border | Text |
|-----------|----|--------|------|
| Unselected | `surface` | `border` | `textPrimary` |
| Selected (soft) | `primarySoft` | `primary` | `primary` |
| Selected (fill) | `primary` | `primary` | `#FFFFFF` |

`fill=true` — для фильтров (journal screen).
`fill=false` — для выбора тэгов (new entry screen).

---

### ProgressBar

Высота: 8pt. Радиус: `pill`. Border: 1pt `border`.
Track: `surface` (на акцентных карточках) или `surfaceAlt`.
Fill: `primary`.

---

### ListItem (строка настроек)

Icon (22, `textSecondary`) + Label (`body`, `textPrimary`) + optional Hint (`caption`, `textMuted`) + optional Trailing.
PaddingV: `md`. Разделитель между строками: `hairlineWidth`, цвет `border`.
Деструктивный вариант: icon и label в цвете `error`.

---

### EmptyState

Внутри Card. Центрировано. Иконка (28, `textMuted`) → Title (`subtitle`) → Message (`body`, `textSecondary`) → optional Button (`secondary`).
Тон: "можно начать", не "у вас ничего нет".

---

### InfoBox

Цветная плашка с иконкой и текстом. Не алерт, не модалка.

| Вариант | Bg | Border | Icon |
|---------|-----|--------|------|
| `info` | `secondarySoft` | `secondary` | `secondary` |
| `primary` | `primarySoft` | `primary` | `primary` |
| `warning` | `surfaceAlt` | `accent` | `accent` |

Padding: `md`. Радиус: `md`. Gap icon↔text: `sm`.

---

## Экраны — детальная спецификация

### Онбординг: Welcome

```
bg: bg
Центрировано вертикально.
  [иконка продукта, 64pt]
  [hero] "Понять малыша — проще чем кажется"
  [body, textSecondary] 2 строки описания
  [Button primary, lg] "Начать"
  [caption, textMuted] "Уже есть аккаунт? Войти" (link)
```

### Онбординг: Как это работает

```
bg: bg
  [caption, textSecondary] "КАК ЭТО РАБОТАЕТ" + letterSpacing 0.5
  [title] заголовок
  3 строки: [Ionicon outline, 28, primary] + [subtitle] + [body, textSecondary]
  gap между строками: xxl
  [Button primary, lg] "Далее"
```

### Онбординг: Создание профиля

```
bg: bg
  [caption] "Шаг 2 из 3"
  [title] "Расскажите о малыше"
  [Card default]
    TextInput: Имя ребёнка
    DatePicker: Дата рождения
    Toggle: "Малыш родился раньше срока"
    [если toggle on] DatePicker: Дата по расчёту (ПДР)
  [caption, textMuted] дисклеймер про использование данных
  [Button primary, lg] "Продолжить"
```

### Главный экран: Сегодня

```
bg: bg, SafeArea top
ScrollView, gap xl:
  [caption, textSecondary] "Сегодня"
  [title, textPrimary] "{Имя}, {возраст}"

  Hero Card (xl radius, border 1):
    если активный скачок  → tone accent (primarySoft bg, primary border)
    если спокойный период → tone default (surface bg)
    если all-done         → tone soft (surfaceAlt bg)
    Внутри: label (caption, uppercase, letterSpacing) + title + subtitle + ProgressBar + CTA-текст

  [PermissionBanner — если нужно, Card с Icon + текст + Button ghost]

  [ShareButton — ghost, icon + текст]

  InsightsCard (Card default, скрыта если нет данных):
    header: Icon stats + "ЗА 7 ДНЕЙ" (captionStrong, uppercase)
    bodyStrong: главный вывод
    body: детали
    Tag primary: топ проявление (если есть)

  Card soft "Как сегодня?":
    [subtitle] "Как сегодня?"
    [caption, textSecondary] подсказка
    MoodPicker: 5 эмодзи в ряд (48pt touch target каждый)

  Секция "Недавние записи":
    SectionHeader: "Недавние записи" + "Все →" (captionStrong, primary)
    horizontal ScrollView: JournalEntryCard compact (220pt ширина)
    или EmptyState

  bottom padding: huge
```

### Календарь скачков

```
bg: bg, SafeArea top
ScrollView, gap xl:
  [caption] "Календарь"
  [title] "10 скачков роста"
  [body, textSecondary] пояснение

  Card soft (легенда):
    [caption] "Легенда"
    Row: dot(12, primary) "Идёт сейчас" | dot(12, secondary) "Завершён" | dot(12, border) "Впереди"

  LeapTimeline:
    каждый пункт: dot(40, circle) + вертикальная линия(2) + content
    dot активный: bg primary, text white
    dot завершённый: bg secondary, text white
    dot будущий: bg surfaceAlt, text textSecondary, border primary если pre-leap
    content: subtitle + caption (статус) + caption (дата, textMuted)
    tap → LeapDetail
```

### Журнал

```
bg: bg, SafeArea top
  header (не скроллируется):
    [caption] "Журнал"
    [title] "Поведение малыша"

  horizontal ScrollView (фильтры):
    Chip fill=true для каждого фильтра
    gap sm

  если пусто → EmptyState

  ScrollView вертикальный:
    группы по дням:
      [captionStrong, textSecondary] дата группы
      стек JournalEntryCard + кнопка удаления

  FAB (56pt, pill, bg primary, shadow md):
    Ionicon "add", 28, white
    position: absolute, right xl, bottom xl
```

### Я (профиль)

```
bg: bg, SafeArea top
ScrollView, gap xl:
  [caption] "Профиль"
  [title] "Я"

  Card (аккаунт, если залогинен):
    [caption] "Аккаунт"
    [subtitle] displayName
    [body, textSecondary] email · провайдер

  Card (ребёнок, tap → редактировать):
    Row: [content] + ChevronRight icon

  SettingsSection "Настройки":
    Card padding md:
      ListItem: Уведомления + Switch trailing
      Divider
      ListItem: Язык + "Русский" hint
      Divider
      ListItem: Приватность

  SettingsSection "Данные":
    Card padding md:
      ListItem: Экспорт данных + hint
      Divider
      ListItem: Удалить аккаунт (destructive)

  SettingsSection "О приложении":
    Card padding md:
      ListItem: Версия + "0.1.0 (MVP)" hint
      Divider
      ListItem: Дисклеймер + hint

  [Button standalone, не Card]:
    Icon log-out + "Выйти" — цвет error, border border
    gap sm, center, paddingV lg, radius 12, border 1

  bottom padding: huge
```

### Детальный экран скачка

```
bg: bg, SafeArea bottom
ScrollView, gap lg:
  headerRow:
    [caption] "Скачок N"
    [hero] название скачка
    [body, textSecondary] возраст · длительность
    CloseButton: 36pt circle, bg surfaceAlt, icon "close"

  StatusPill (pill, border 1, alignSelf start):
    active    → bg primarySoft, border primary, text primary
    pre-leap  → bg surfaceAlt, border border, text textSecondary
    upcoming  → bg surfaceAlt, border border, text textSecondary
    completed → bg secondarySoft, border secondary, text secondary

  Card default:
    [subtitle] "Что происходит"
    [body] текст
    [caption, textMuted] ориентировочная дата
    InfoBox info (если недоношенный): icon + caption

  Card default:
    [subtitle] "Что часто бывает"
    [caption, textSecondary] оговорка
    список: bulletDot(6, primary) + body для каждого пункта

  Card soft:  ← единственная карточка с тоном на экране
    [subtitle] "Что можно попробовать"
    пронумерованный список: numCircle(24, primary) + body

  Card default:
    [subtitle] "Что появится после"
    список: Ionicon "sparkles-outline"(16, secondary) + body

  [Button primary, lg] "Добавить запись в журнал"

  [caption, textMuted, center] дисклеймер

  bottom padding: xxl
```

### Новая запись

```
bg: bg, SafeArea bottom, modal presentation
ScrollView, gap xl:
  headerRow:
    [caption] "Новая запись"
    [title] "Что происходит?"
    CloseButton: 36pt circle, bg surfaceAlt

  Section "Настроение":
    [subtitle]
    MoodPicker: 5 эмодзи, fill=true selected

  Section "Что заметили":
    [subtitle]
    Wrap chips: Chip fill=false, selected=primarySoft

  Section "Заметка":
    [subtitle]
    TextInput multiline, minHeight 100, radius md, border 1

  InfoBox info (если скачок активен):
    icon "link-outline" + caption

  [Button primary, lg] "Сохранить" (disabled если mood не выбран)

  bottom padding: huge
```

---

## Правила, которые нельзя нарушать

1. Одна `Button primary` в видимой области экрана
2. Одна карточка с тоном `accent` на весь экран
3. Карточка `soft` — только для "практических советов / действий"
4. Иконки строго outline, размер 20–28
5. Градиентных фонов нет
6. Тёмная тема: `bg` всегда `#1A1614` с коричневым, не серым подтоном
7. Анимации не быстрее 150ms, easing ease-out
8. `textMuted` — только для декоративного текста (timestamps, третичные подписи)
9. Деструктивные действия (удалить / выйти) — только цвет `error`, только с подтверждением
10. Никаких sad-face / broken-state иллюстраций
