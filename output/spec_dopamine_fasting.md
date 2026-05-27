# Dopamine fasting — спецификация запуска

Документ для solo iOS-разработчика или малой команды (1 dev + 1 дизайнер).
Цель — выйти на App Store за 90 дней и достичь $5k MRR на 6 месяце.

---

## 1. Позиционирование

**Название (рабочее)**: HardMode. **Альтернативы**: Discipline, Switch, NotNow.

**Слоган**: "Block what wrecks you. No backdoors."

**Анти-позиционирование** (от чего бежим):
- НЕ «улучшенный Screen Time» (Apple это убьёт через 2 фич-релиза)
- НЕ «помощник продуктивности» (слишком общее, рынок насыщен)
- НЕ «детокс от телефона» (звучит wellness, не привлекает tech-аудиторию)

**Главное обещание**: "Когда твоя воля слаба, продукт сильнее тебя."
Через 24-часовой cooldown на отключение правил, hard mode, голосовое подтверждение.

**Целевая персона**: программисты / knowledge workers 22-38 лет, читали книгу Cal Newport "Deep Work", слушали Andrew Huberman, пробовали Opal/ScreenZen и обходили их. Готовы платить за решение, которое они НЕ смогут обойти.

---

## 2. MVP — список экранов

### 2.1 Onboarding (7 экранов, занимает 90 секунд)

1. **Hook** — "How much time did you lose to Instagram yesterday? — 1h 47min. Want to make that impossible?"
2. **Family Controls auth** — нужно одобрить системный диалог (это единственный способ блокировать чужие приложения в iOS)
3. **Выбор приложений** — Reddit, Instagram, TikTok, X, YouTube как пресеты + custom
4. **Выбор паттерна** — три радио-кнопки: "Школьник" (блокировка по расписанию), "Хардкор" (24/7 пока сам не разрешишь), "Контекст" (по геолокации и времени)
5. **Первое правило** — рекомендация под паттерн: "Заблокируем Instagram, Reddit, TikTok с 9 утра до 6 вечера, пн-пт"
6. **Hard mode explanation** — "Чтобы снять блокировку, ты не нажмёшь кнопку. Нужно подождать 24 часа. Согласен?" (Toggle, default OFF — но мы поощряем включить)
7. **Trial** — "Попробуй бесплатно 7 дней. Без карточки."

### 2.2 Home / "Today" (1 экран)

- **Сверху**: large streak counter ("🔥 12 days") — основной элемент
- **Mid**: "Сейчас заблокировано" — список приложений с countdown ("Instagram unblocks in 4h 23min")
- **Quick modes** (большие кнопки):
  - "Focus" (45 min блок всего) — для Pomodoro-режима
  - "Sabbath" (24 часа всего соц-сети) — для weekend detox
  - "Sleep" (с 22:00 до 7:00 — соцсети + новости)
- **Bottom nav**: Today / Rules / Stats / Settings

### 2.3 Rules editor (1 экран + sheets)

- Список текущих правил с toggle on/off
- "+" → новое правило
- При создании правила — последовательно:
  1. Что блокируем (приложения / категории / ключевые слова в браузере / sites)
  2. Когда (расписание / геолокация / "всегда" / по триггеру)
  3. Hard mode для этого правила (otherwise отключается одним тапом)

### 2.4 Stats (1 экран)

- График streak (heatmap по дням, как GitHub contributions)
- "Blocks attempted" — сколько раз ты попытался открыть заблокированное (психологически важно — показывает "вот сколько я бы залип, если бы не приложение")
- "Time saved" estimate (количество попыток × средний скролл-time)
- **Кнопка "Share streak"** — генерирует красивую картинку в стиле Strava/Apple Fitness — для шеринга в X/Insta

### 2.5 Hard mode / unlock flow

- Юзер тапает "Disable this rule"
- Sheet: "Это правило в hard mode. Если хочешь отключить — подожди 24 часа."
- Кнопка "Request unlock" → 24-часовой countdown
- Через 24 часа — push: "Ты всё ещё хочешь отключить блокировку?"
- Голосовое подтверждение (запись 3 секунд: "I really want to unblock Instagram right now") — психологический барьер
- Можно отменить unlock-запрос в любой момент

### 2.6 Settings

- Subscription status (trial / monthly / yearly)
- Restore purchases
- Family Controls re-auth
- Privacy (полностью локально — ничего не на сервере; это маркетинговый pluss)
- Delete account

---

## 3. Тех-стек

| Слой | Технология | Почему |
|---|---|---|
| Платформа | iOS 16+ (single platform v1) | Family Controls — iOS-only |
| Язык | Swift 5.9 / SwiftUI | Нативная iOS-разработка |
| Блокировка | Apple Family Controls framework | Единственный официальный путь блокировать чужие приложения |
| Tracking | DeviceActivityCenter | Tracking использования |
| Хранение | Core Data | Все локально — privacy plus |
| Подписки | StoreKit 2 | Современный официальный путь |
| Анимации | Lottie / native SwiftUI | Лёгкие, не тормозят |
| Push | Apple Push (UserNotifications) | Для streak alerts |
| Аналитика | TelemetryDeck или Plausible-like | НЕ Google/FB — privacy ценность |
| Креш-репортинг | Sentry self-hosted (или Apple Crash Reports only) | Не хочется засветить юзеров |

**Backend**: НЕТ. Всё локально. Это и быстрее, и privacy-ценность ("ваши данные не покидают телефон" — реальное преимущество перед Opal, который шлёт в свой backend).

**Apple Family Controls entitlement** — критический момент:
- Нужно подать заявку через developer portal
- Apple review historically 2-4 недели, иногда отклоняют
- Часто отклоняют формулировкой "duplicate of Screen Time"
- **Митигация**: в заявке делать упор на "more restrictive than Screen Time, designed for users with compulsive behavior patterns"
- Подавать заявку на **неделе 1**, не позже — это критический путь

---

## 4. 90-дневный бэклог

### Неделя 1
- Подать заявку на Family Controls entitlement (письмо Apple через developer portal с обоснованием)
- Купить домен (hardmode.app / disciplineapp.io / etc)
- Создать Twitter/X account с tease-контентом ("building a screen time app that actually works")
- Apple Developer account + bundle ID
- Дизайн-система: design tokens, набор иконок (SF Symbols + custom)
- Wireframes всех 6 экранов в Figma

### Неделя 2
- Получить entitlement (если получили — продолжаем; если нет — appeal + продолжаем)
- Setup Xcode project, SwiftUI scaffold
- Onboarding flow (экраны 1-7)
- Family Controls auth integration (DeviceActivityCenter, ManagedSettings setup)

### Неделя 3-4
- Rule engine (создание / редактирование / удаление правил)
- Базовое блокирование одного-двух приложений по простому расписанию
- Schedule-based триггеры (например, "пн-пт 9-18")
- Local storage в Core Data

### Неделя 5
- Hard mode (24-часовой cooldown логика)
- Голосовая запись для unlock confirmation
- Streak counter + еженедельная heatmap

### Неделя 6
- Geolocation-триггеры (region monitoring через CoreLocation)
- Keyword blocking в браузере (Safari Content Blocker extension)
- Quick modes (Focus / Sabbath / Sleep)

### Неделя 7
- StoreKit 2 интеграция, paywall дизайн
- 7-дневный trial, monthly ($5.99) и annual ($39.99) tiers
- "Time saved" calculation
- Share streak — image generation для соцсетей

### Неделя 8
- Apple Watch widget (current streak + quick toggle Focus mode)
- Push notifications (daily streak update, friendly nudges)
- Аналитика events: install → onboarding complete → first rule → trial start → conversion

### Неделя 9
- **TestFlight beta launch** в r/digitalminimalism (1.5M members) — пост "iOS app for people who can't quit Reddit, free testflight" — цель 50-100 тестеров
- Дополнительный пост в r/getdisciplined, r/decidingtobebetter
- Сбор фидбека через TestFlight feedback + Discord (для testers)

### Неделя 10
- Итерации на основе фидбека (типичные жалобы: "хочу больше пресетов", "не работает на iPad", "хочу настроить ringtone-эффект")
- Polish: анимации, haptics, чистый dark mode
- App Store listing: скриншоты, описание, ASO keywords ("focus blocker", "screen time hardcore", "phone addiction", "social media block")

### Неделя 11
- App Store submit (Apple review обычно 24-48 часов)
- Подготовка launch-материалов: видео-демо (45 секунд), 5 X-постов, Product Hunt launch draft

### Неделя 12
- **Public launch** в App Store + Product Hunt + X-thread
- Engagement-режим: ответ на каждый комментарий первые 72 часа
- Цель: 1000 downloads, 50 paid trials, $200 MRR

### Месяц 2 (недели 13-16)
- Анализ воронки: где отваливаются (онбординг? trial?)
- A/B на paywall pricing
- Виральность: усиление share-streak (auto-prompt после рекорда)
- Подкаст-туры: 3-5 productivity-podcasts (Less Doing, The Productive Programmer, etc.)
- iPad version

### Месяц 3 (недели 17-26 — extended)
- Если воронка работает: paid acquisition на Apple Search Ads (целевой CPI $2-4)
- Создание контента: "Я бросил Reddit на 90 дней" — собственное case study
- Engagement: ежедневные tweet с "today's streak record", создаём виральный pattern
- Цель к концу 6 месяца: 30k downloads, 1500 paid, $5-7k MRR

---

## 5. Unit-экономика

### 5.1 Доход на пользователя (ARPU)

| Тир | Цена | Доля | Вклад в ARPU |
|---|---|---|---|
| Free | $0 | 95% installs | $0 |
| Monthly $5.99 | $71.88/yr | 40% paid | $28.75 |
| Annual $39.99 | $39.99/yr | 60% paid | $23.99 |

- Конверсия trial → paid: 30% (типичная для productivity apps в App Store)
- Конверсия install → trial: 15% (после Family Controls auth)
- Эффективная конверсия install → paid: 4.5%

**Blended ARPU (по платящим)**: ($28.75 + $23.99 × 1.5) / 2.5 = **~$35/yr**

### 5.2 Retention и LTV

Опираясь на бенчмарки Opal / Forest / ScreenZen:
- Month 1 retention (платящих): 75%
- Month 3 retention: 60%
- Month 6 retention: 45%
- Month 12 retention: 30%
- Annual churn ~70%

Это выглядит плохо, но **annual subscribers держатся ~14 месяцев в среднем** — даже после non-renewal они часто возвращаются через 3-6 месяцев когда снова падают в скролл.

**LTV расчёт** (консервативный):
- Annual sub: $39.99 × 1.4 (среднее ренью) = **$56**
- Monthly sub: $5.99 × 5 months avg = **$30**
- Blended LTV ≈ **$45**

### 5.3 CAC по каналам

| Канал | CPI | Конверсия в paid | CAC |
|---|---|---|---|
| **Reddit органика** (постинг в нишевых subs) | $0 | 6-8% | **$0** (но не масштабируется бесконечно) |
| **X/Twitter органика** (streak шеринг, threads) | $0 | 5-7% | **$0** |
| **Product Hunt** (разовый запуск) | $0 (но рискованный) | 4-6% | **$0** |
| App Store ASO (long-tail keywords) | $0-1 | 5-7% | $0-15 |
| Apple Search Ads (целевые keywords) | $2-4 | 4-5% | **$45-100** |
| Reddit Ads (узкий targeting) | $4-8 | 3-4% | $100-250 |
| Twitter/X promoted | $3-5 | 4-5% | $60-120 |
| Influencer (productivity X-account) | $200-1000 fixed | mixed | $30-80 |

**Реалистичный CAC mix:**
- Месяцы 1-3: 90% органика → blended CAC $5
- Месяцы 4-6: 60% органика + 30% ASO + 10% Search Ads → CAC $15
- Месяцы 7-12: 30% органика + 40% paid → CAC $25

**LTV/CAC**: $45 / $5-25 = **9× → 18×**. Очень хороший индикатор — можно scale без VC.

### 5.4 Чувствительность модели

**Если конверсия trial → paid 20% (не 30%)**: ARPU $23 → LTV $30 → LTV/CAC 6× (всё ещё хорошо)

**Если retention плохой (annual churn 90%)**: LTV $20 → LTV/CAC 4× (порог нормальности)

**Если CAC $40 (paid-only)**: LTV/CAC 1.1× — катастрофа. **Поэтому органический канал критичен.**

**Что нужно сделать чтобы скейл-нуть:**
1. Streak-шеринг должен генерировать min 0.3 new install per existing user/month
2. ASO должен покрывать минимум 30 keywords на топ-10 место
3. Apple Search Ads keywords с CPI < $3

### 5.5 Финансовая модель — 6 месяцев

| Месяц | Installs | Paying (cumul) | MRR | Cum revenue |
|---|---|---|---|---|
| 1 | 1,000 | 30 | $90 | $90 |
| 2 | 2,500 | 110 | $330 | $510 |
| 3 | 5,000 | 280 | $840 | $1,890 |
| 4 | 10,000 | 600 | $1,800 | $5,490 |
| 5 | 18,000 | 1,100 | $3,300 | $13,290 |
| 6 | 28,000 | 1,700 | $5,100 | $26,790 |

Допущения: 6% install → paying, 70% annual / 30% monthly mix, churn 5%/мес после месяца 2.

К концу года 1: ~80k installs, ~5k paying, **~$15k MRR** (~$180k ARR). Достижимо solo.

---

## 6. Go-to-market: 0 → 10,000 пользователей

### 6.1 Первые 100 (недели 9-10)
- **r/digitalminimalism** (1.5M members) — пост: "I built an iOS Screen Time app that's actually impossible to bypass. Free TestFlight beta — looking for 100 honest testers."
  - Самые активные комменты часов 3-7 после поста; будь онлайн
- **r/getdisciplined**, **r/decidingtobebetter**, **r/nosurf** — повторить
- **Hacker News "Show HN"** — но только если ready и polished
- **X**: 1 тред "I lost 3 hours/day to Reddit. Built this. Here's what worked." → DM в DM каждому, кто запросит

### 6.2 100 → 1000 (месяцы 1-3 после launch)
- **Product Hunt** launch (выбрать вторник или среду, 12:01 PST)
  - Чем больше hunter с trafik — тем лучше; идеал — Andrew Wilkinson или другой productivity-figure
- **X-инфлюэнсеры в productivity nice** (Cal Newport adjacent — есть человек 20-30 с 50k-300k подписчиков):
  - Подход: писать прямо, "Hey, built X, would love your honest thoughts. Here's free year for you."
  - Из 30 отправленных — обычно отвечает 5-10, постят 2-3
- **App Store ASO**: keywords "focus blocker", "screen time hardcore", "social media block", "phone addiction"
  - Описание оптимизировать под poll-keyword research
- **Контент-маркетинг**: пост в personal blog "Я бросил Reddit на 90 дней — вот как" с упоминанием продукта в конце

### 6.3 1000 → 10000 (месяцы 4-6)
- **Apple Search Ads** на 5-10 keywords с целевым CPI $2-3 (бюджет $500-2000/мес)
- **Подкаст-туры**: 5-10 productivity / philosophy podcasts (не нужны топ-10; нужны Tier 2 со 5k-50k слушателей)
- **YouTube creator-партнёрство**: 3-5 productivity-YouTubers (Ali Abdaal-adjacent), бартер за free year
- **Reddit Ads** в r/programming, r/dataisbeautiful (специфические нишевые subs) — попробовать $500 тест
- **Виральный механизм**: после каждого 30-дневного streak — авто-prompt "Поделиться достижением" с готовой картинкой

### 6.4 Удержание (всегда)
- Push: "Запись — 12 дней без Reddit. Сегодня день 13!" (один в день, утром)
- Email последовательность: при trial signup → 3 письма за 7 дней с инсайтами других юзеров
- Sunday email с "Weekly digest" — суммарка времени сэкономленного

---

## 7. Главные риски и митигация

### Риск 1 (высокий): Apple убивает или ограничивает Family Controls API
**Митигация**: Позиционирование "for compulsive users" — апеллируем к use case, который Apple Screen Time системно не закрывает. Если API закроют — pivot к Safari Content Blocker (ограниченнее, но всё ещё работает) + Shortcut-based ограничения.

### Риск 2 (средний): Низкая trial → paid конверсия
**Митигация**: Не сразу платный triial — после онбординга показать значимую ценность бесплатно (1 rule, 1 schedule) на 7 дней, потом hardcore upsell под боль "ты уже сорвался 3 раза за неделю — попробуй hard mode на 2 недели".

### Риск 3 (средний): Apple отклоняет приложение на review за "дубль Screen Time"
**Митигация**: В App Store description явно различать ("Designed for users who Screen Time isn't strict enough for"). Заявка с заранее подготовленным ответом на возможный вопрос reviewer.

### Риск 4 (низкий): Юзеры обходят hard mode через удаление приложения
**Митигация**: Family Controls привязывается на уровне OS — удалить приложение HardMode не снимет ограничения сразу (требуется отдельное действие в Screen Time, что само по себе барьер). Это уже сильнее Opal.

---

## 8. Метрики успеха

**К концу 90 дней (запуск)**:
- 1000+ downloads
- 50+ paying subscribers
- 4.5+ App Store rating (после первых 50 reviews)

**К концу месяца 6**:
- 25k+ downloads
- $5k+ MRR
- 4.7+ App Store rating
- 1+ виральный момент (трендится в X / Product Hunt top 5 за день)

**К концу года 1**:
- 100k+ downloads
- $15k+ MRR (~$180k ARR)
- 70%+ retention 30 day

Это уровень solo-founder lifestyle business. Без VC, без команды. Хорошее ARR на одного человека.

---

## 9. Когда НЕ делать

- Если у тебя нет навыков нативной iOS-разработки (Swift, SwiftUI, Apple APIs) — react-native не подойдёт, Family Controls только native
- Если ты не используешь продукт сам — это категория где personal pain == product insight. Если у тебя нет проблемы с Reddit/Instagram, ты не построишь правильный hard mode
- Если ты не готов 12 недель работать в одиночку без обратной связи рынка — Opal делал MVP 9 месяцев
