# Спецификация экрана: Dopamine fasting — "Today"

Документ для разработчика. Цель — взять и кодить без вопросов.
Это главный экран приложения, который пользователь открывает 10+ раз в день.

Платформа: iOS 16+ / SwiftUI. Без backend.

---

## 1. Цель экрана

Пользователь должен за 1.5 секунды понять:
1. Сейчас что-то заблокировано? Что именно?
2. Когда разблокируется?
3. Как у меня дела со streak?
4. Что я могу быстро запустить (Focus / Sabbath / Sleep)?

Все остальные действия (создание правил, статистика) находятся в других tabs/screens. На "Today" — только живая ситуация.

---

## 2. Layout — обзор

```
┌─────────────────────────────────┐
│ status bar (iOS native)         │
├─────────────────────────────────┤
│                                 │
│   HardMode                  ⚙   │  ← title bar (44pt)
│                                 │
├─────────────────────────────────┤
│                                 │
│            🔥 12                │  ← streak hero (180pt height)
│         day streak              │
│                                 │
├─────────────────────────────────┤
│  NOW BLOCKED                    │
│  ┌───────────────────────────┐  │
│  │ 📱 Instagram              │  │
│  │    Unblocks in 4h 23m     │  │
│  ├───────────────────────────┤  │
│  │ 💬 Reddit                 │  │  ← block list cards
│  │    Until tomorrow 7:00 AM │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  QUICK MODES                    │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ Focus│ │Sabbath│ │Sleep │   │  ← quick-action buttons
│  │ 45min│ │ 24h  │ │22-7AM│    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
├─────────────────────────────────┤
│ [Today] [Rules] [Stats] [⚙]    │  ← tab bar (49pt iOS native)
└─────────────────────────────────┘
```

---

## 3. Компоненты подробно

### 3.1 Title bar

- Высота: 44pt (native iOS large title)
- Заголовок: "HardMode" — system font, bold, 28pt
- Справа: settings gear icon (24pt SF Symbol `gear`), tap → presents `SettingsView` as sheet
- Background: system background (адаптируется под light/dark)

### 3.2 Streak Hero (центральный блок)

- Высота: ~180pt fixed
- Background: linear gradient — `Color(red: 1.0, green: 0.35, blue: 0.2)` к `Color(red: 0.95, green: 0.25, blue: 0.15)` (огонь)
- Скругление углов: 24pt
- Padding: 16pt по бокам, 12pt сверху-снизу от safe area

Содержимое:
- Сверху по центру: emoji "🔥" — размер 56pt
- Под ним: текущий streak — `"12"` (или текущее число), font system rounded bold 72pt, цвет белый
- Под цифрой: `"day streak"` (если 1 → `"day streak"`, иначе `"days streak"` — but English we keep "day streak" minimally)
- Снизу справа маленький badge: текущий streak record (вроде `"Best: 34"`) — font 13pt, opacity 0.7
- Tap на блок → presents `StreakDetailView` (модальный fullscreen с heatmap)

**Состояние "0 days"**:
- Заменяем "🔥" на "⚪" (потушенный)
- Цифра "0"
- Подпись "Start your streak today"
- Background — серый gradient вместо оранжевого

**Состояние "broke streak"** (за последние 24 часа сорвался):
- Эмодзи "💔"
- Подпись "Streak ended. Yesterday: 8 days"
- Кнопка "Start again" появляется внизу блока

### 3.3 NOW BLOCKED section

- Заголовок секции: `"NOW BLOCKED"` — font 13pt uppercase letter-spacing 0.5, color secondary (gray), padding 16pt sides, 12pt top
- Под заголовком — стек cards

#### Card (один заблокированный app/правило)

- Background: secondary system background, скругление 12pt
- Высота: 64pt
- Layout: HStack
  - Слева: иконка приложения (SF Symbol или favicon) 32pt
  - Center-left: имя приложения (Instagram, Reddit, etc) — body weight medium
  - Center-right: countdown — body weight regular secondary
- Padding inside: 12pt
- Margin between cards: 8pt
- Tap on card → `BlockedAppDetailView` (modal sheet) с возможностью запросить unlock (см. п. 4.3)

#### Состояния:

- **0 blocks active**: secjа пустая, вместо неё — placeholder card "🍃 Nothing blocked right now" + кнопка "Set up your first rule"
- **>3 blocks**: показываем первые 3, под ними кнопка "Show 4 more" → разворачивается inline
- **Hard mode block**: на card маленький badge "HARD" (orange pill)

### 3.4 QUICK MODES section

- Заголовок: `"QUICK MODES"` (same style as NOW BLOCKED)
- 3 кнопки в HStack, equal width, spacing 8pt
- Каждая кнопка: square aspect ratio 1:1.1, скругление 16pt
- Background: tertiary system background

#### Каждая кнопка:

- Top: SF Symbol icon 28pt (Focus → `brain.head.profile`, Sabbath → `moon.stars`, Sleep → `bed.double`)
- Middle: label — bold 16pt ("Focus", "Sabbath", "Sleep")
- Bottom: subtitle — regular 11pt secondary ("45min", "24h", "22-7AM")
- Spacing внутри: 4pt

#### Tap-action:

- **Focus**: запускает 45-минутный full block социалок. Tap → confirmation sheet "Start focus session?". При активной — кнопка превращается в "Cancel focus (44:32)"
- **Sabbath**: 24h block on social media. Tap → confirmation "Lock socials for 24 hours? Hard mode — you can't unlock until tomorrow." Если confirm — кнопка превращается в "Active until ...".
- **Sleep**: переход в `SleepScheduleView` где user может настроить часы один раз и больше не возвращаться (default 22:00-7:00)

#### Состояние "active":

- Кнопка переключается в active state: оранжевый border 2pt, оранжевый текст
- Subtitle меняется на "Active 12:34" (countdown) или "Until tomorrow 7:00"

### 3.5 Tab bar (iOS native)

- 4 tabs: Today (выбран), Rules, Stats, Settings
- Iconography: `house.fill`, `list.bullet`, `chart.bar.fill`, `gear`
- Active state — оранжевый акцент-цвет `Color(red: 1.0, green: 0.42, blue: 0.21)`
- iOS native height 49pt + safe area

---

## 4. Интерактивные сценарии

### 4.1 Tap на streak hero

→ `StreakDetailView` (modal fullscreen):
- Большая heatmap (GitHub contributions style) последних 90 дней
- Сегодняшнее число
- Best streak ever
- Total clean days (всё время)
- Кнопка "Share my streak" → генерация PNG с текущим streak (см. spec для share-image-generation в Appendix A)
- Кнопка "Close" в top-right

### 4.2 Tap на blocked app card

→ `BlockedAppDetailView` (modal sheet, .medium detent):
- Иконка app + name
- "Blocked since: [date/time]"
- "Reason: [rule name]"
- Если правило в hard mode:
  - Текст "Hard mode active. Cannot unlock now."
  - Кнопка "Request unlock (24h cooldown)" — primary action
  - Если уже запрошено: "Unlock available in [count]" + кнопка "Cancel request"
- Если обычное правило:
  - Кнопка "Disable rule now" — destructive style
  - Confirmation alert: "Disable [rule name]? You can re-enable in Rules tab."

### 4.3 Request unlock flow (hard mode)

1. Tap "Request unlock" → confirmation sheet
2. Sheet: "Are you sure? The unlock will be available in 24 hours. Most people don't actually want this when 24h passes."
3. Confirm → start 24-hour timer
4. UI changes: app card теперь показывает "Unlock in [time remaining]" + small "Cancel unlock request" link
5. После 24 часов: push-уведомление "Your unlock is now available. Still want to disable [rule]?"
6. Tap push → opens `UnlockConfirmationView`:
   - "Record yourself saying: 'I really want to unblock [app] right now.'"
   - Native voice record UI (10 сек max)
   - После записи — "Confirm unlock" / "Cancel"
7. Если confirm → правило отключается на 24 часа (потом включается обратно автоматически)

### 4.4 Tap "Focus" (45 min mode)

1. Confirmation sheet (.small detent):
   - "Focus mode: 45 minutes"
   - "Will block: Instagram, Reddit, TikTok, X, YouTube"
   - "Start" button (primary) / "Cancel"
2. Tap "Start" → applies block immediately
3. Button on Today screen becomes:
   ```
   ┌──────────┐
   │ ⏱ 44:32  │
   │  active  │
   └──────────┘
   ```
4. Tap on active Focus button → "End early?" alert. If end early → streak doesn't count, gentle "next time" message
5. Auto-end after 45 min → push "Focus session done. 45 minutes saved."

### 4.5 Pull-to-refresh

- Pull down on the scroll view → spinner appears under title
- Refreshes: countdown timers (in case timezone changed, daylight savings, etc.)
- Haptic feedback `UIImpactFeedbackGenerator(style: .soft)` at trigger

---

## 5. Data model

### 5.1 ViewModel

```swift
@MainActor
final class TodayViewModel: ObservableObject {
    @Published var streak: Streak
    @Published var blockedApps: [BlockedApp]
    @Published var activeQuickMode: QuickMode?
    @Published var pendingUnlockRequests: [UnlockRequest]

    func refresh() async { ... }
    func startQuickMode(_ mode: QuickMode) { ... }
    func cancelQuickMode() { ... }
    func requestUnlock(for rule: Rule) { ... }
    func cancelUnlockRequest(_ request: UnlockRequest) { ... }
}

struct Streak {
    let currentDays: Int
    let bestEver: Int
    let totalCleanDays: Int
    let isActive: Bool      // true unless broken in last 24h
    let brokenAt: Date?     // for "broke streak" state
}

struct BlockedApp: Identifiable {
    let id: UUID
    let appName: String
    let bundleId: String
    let iconImage: Image
    let unblocksAt: Date
    let ruleName: String
    let isHardMode: Bool
}

enum QuickMode {
    case focus(endsAt: Date)
    case sabbath(endsAt: Date)
    case sleep
}
```

### 5.2 Source of truth

- `Streak`: derived from Core Data — sequence of "clean" days (no blocked-app launches during blocking window)
- `BlockedApps`: queried from `DeviceActivityCenter` + active rules in Core Data
- `QuickMode.active`: ephemeral state in Core Data with start/end timestamps
- `pendingUnlockRequests`: Core Data — `UnlockRequest` entity with `requestedAt`, `availableAt`, `ruleId`

### 5.3 Data refresh

- On `.onAppear` → `viewModel.refresh()`
- Timer every 1 second updates countdowns (only when screen visible — `.task` + `try await Task.sleep`)
- On `.onReceive(NotificationCenter...UIApplication.willEnterForeground)` → refresh

---

## 6. Анимации и микроинтеракции

| Действие | Анимация | Haptic |
|---|---|---|
| Tap streak hero | scale 0.98 → 1.0 (0.1s spring) | light |
| Tap blocked card | press: 0.97; release: spring back | soft |
| Quick mode tap | scale 0.95 + glow on success | medium |
| Quick mode active state appearance | 0.3s ease-in-out | success |
| Pull to refresh | native iOS spinner | (built-in) |
| Streak increment (passing midnight while open) | confetti burst + scale animation | success |
| Request unlock confirmation | sheet slide-up | (built-in) |
| Streak broken (rare; on open with detected break) | hero shakes once + transitions to broken state | error |

Все анимации respect `accessibilityReduceMotion` — заменяем на crossfade 0.2s.

---

## 7. Состояния экрана

| State | Trigger | UI |
|---|---|---|
| First launch (no Family Controls auth) | Не одобрил Family Controls | Full-screen overlay "Grant Family Controls to continue. Without this, we can't block anything." + кнопка "Open Settings" |
| No rules created | После Family Controls auth, no rules in Core Data | Streak block есть, NOW BLOCKED секция показывает "🍃 Nothing blocked right now" + кнопка "Set up your first rule" → Rules tab |
| Normal | Имеются правила, может быть активные блоки | Layout как описано |
| Quick mode active | Запустил Focus / Sabbath / Sleep | Соответствующая кнопка превращается в active state |
| Streak broken | Detected app launch during blocking window | Hero показывает 💔 + "Yesterday's streak ended. Start fresh today." |
| Hard mode unlock pending | Has UnlockRequest with availableAt > now | Banner-toast сверху (под title): "Unlock request for Instagram available in 12h 34m. [Cancel]" |
| Hard mode unlock available | UnlockRequest availableAt < now and not yet acted | Banner: "Your unlock for Instagram is available. [Confirm unlock] [Cancel]" |
| Offline | Никакого специального состояния — всё работает локально | (No specific UI — no internet needed for core flow) |
| Subscription expired | Был paid, отписался, free tier kicked in | Banner at top: "Pro features paused. [Resubscribe]". Hard mode disabled, max 1 rule. |

---

## 8. Accessibility

- Все text scales with Dynamic Type (don't hardcode sizes, use `.font(.title)`, `.body`, etc.)
- Все interactive элементы min 44pt tap target
- VoiceOver labels:
  - Streak hero: `"Current streak: 12 days. Best ever: 34 days. Tap for details."`
  - Each blocked card: `"Instagram. Blocked until 6 PM today. Tap to manage."`
  - Quick modes: `"Focus mode. 45 minutes. Tap to start."`
- High Contrast mode: gradient becomes solid orange, secondary background gets harder contrast
- Reduce Motion: no spring animations, only crossfades
- Reduce Transparency: gradient becomes solid color

---

## 9. Edge cases и ошибки

| Edge case | Поведение |
|---|---|
| Family Controls auth revoked в системных настройках | На next refresh показываем overlay "Family Controls disabled. Tap to re-enable." |
| Timezone change (поездка) | Streak считается по device local time; всё пересчитывается. Banner "Timezone updated to GMT+3" в первый день |
| iOS update breaks Family Controls | Defensive error handling — если DeviceActivityCenter возвращает error, показываем soft banner "Sync issue, retry" + log to crash reporter |
| Subscription receipt validation fails | Запускаем grace period (7 дней с last successful validation). После — degrade to free tier. |
| Multiple devices (iPhone + iPad) | iCloud sync через Core Data + CloudKit. Streak считается общий. Active rules sync. |
| User changes device time backwards | Detect by comparing to last-known-good timestamp; treat as no-op (не reset-ит streak) |
| App killed / crash | All state persisted; on launch — refresh recreates UI |

---

## 10. Acceptance criteria

Разработчик готов закрыть тикет, когда:

- [ ] Экран рендерится в light и dark mode без багов
- [ ] Streak hero показывает корректно current / 0 / broken состояния
- [ ] NOW BLOCKED секция показывает активные блоки с right countdown в real-time
- [ ] Quick modes стартуют и заканчиваются как заявлено, активное состояние видно
- [ ] Pull-to-refresh работает с правильным haptic
- [ ] Tap на blocked card открывает sheet с правильной информацией
- [ ] Unlock request flow работает full cycle (request → 24h wait → voice confirm → unlock)
- [ ] VoiceOver проходит ручной тест на главных элементах
- [ ] Dynamic Type — крупный размер (XXL) — нет clipping и broken layouts
- [ ] Все анимации respect Reduce Motion
- [ ] Offline mode работает (no network needed for any of this)
- [ ] Family Controls revoke → overlay появляется на next foreground
- [ ] Crash в DeviceActivityCenter не крашит UI — soft error banner
- [ ] Performance: scroll smooth at 120 Hz (Pro Motion), no frame drops
- [ ] No memory leaks за 1 час активного использования

---

## 11. Appendix A — Share streak image generation

При tap "Share my streak" в `StreakDetailView`:

1. Generate UIImage программно (Canvas API в SwiftUI или UIGraphicsImageRenderer):
   - 1080×1920 (Stories format) или 1080×1080 (square для X)
   - Background: gradient orange (как hero)
   - Centered: emoji 🔥 + "12 days" + "of HardMode"
   - Bottom: small "hardmode.app" mark
   - Optional: heatmap grid
2. Present `UIActivityViewController` с image + текст: "I'm on day 12 of HardMode. Blocking Instagram and Reddit during work hours. https://hardmode.app"
3. After share — analytics event `streak_shared` with streak_count

---

## 12. Appendix B — Acceptance test scenarios

### Scenario 1: First-time user
1. Install app
2. Open — нет Family Controls — overlay появляется
3. Tap "Open Settings" → Settings.app, юзер одобряет
4. Возвращается в app — overlay исчезает
5. Today screen: streak 0, "🍃 Nothing blocked", "Set up your first rule" CTA
6. Юзер настраивает первое правило через Rules tab, возвращается
7. Today screen: streak 0 (ещё не накопил), но в NOW BLOCKED — теперь его правило

### Scenario 2: Existing user, normal use
1. Open app утром
2. Streak shows "🔥 12 days" (ещё не сорвался сегодня)
3. NOW BLOCKED показывает Instagram (заблокирован до 18:00)
4. Tap Focus quick mode → 45 минут блок социалок поверх существующих правил
5. Closes app, работает 45 минут
6. Push "Focus session done"
7. Opens app — Focus button обратно в idle state, streak +1 если midnight прошёл

### Scenario 3: Unlock request — frustrated user
1. User tries to open Instagram → blocked
2. Opens HardMode app, taps на Instagram card
3. Sees "Hard mode active. Cannot unlock now."
4. Taps "Request unlock"
5. Confirmation: "Are you sure? Wait 24h."
6. Confirms — banner появляется "Unlock available in 24h"
7. Через 24 часа — push notification
8. User действительно всё ещё хочет — opens, records voice, confirms
9. Instagram unblocked на 24 часа
10. **Most likely outcome**: User cancels request в течение 24 часов когда страсть ушла. Метрика "cancel rate" — ключевая для оценки эффекта приложения.

---

Это полная спека одного экрана. Аналогичная глубина нужна для Rules editor, Stats, Onboarding. На остальные 5 экранов — ~3-4 дня работы дизайнера + ~2 недели работы 1 iOS-разработчика.
