# Готовность к закрытой бете

Что осталось сделать после текущего MVP, прежде чем показывать приложение реальным родителям. Сгруппировано по треку, не по приоритету — приоритет проставлен внутри (P0 / P1 / P2).

Текущее состояние ветки на момент написания: 94 unit-теста зелёные, web-export собирается, основные фичи (10 скачков, журнал, уведомления, шеринг, инсайты, дисклеймер, all-done, splash, error boundary, аналитика-stub) на месте. Это **technical-MVP**, не **beta-ready**.

---

## 1. Технический трек

### P0 — без этого нельзя выпускать
- **Реальный Apple Sign-In** (`expo-apple-authentication`) — обязательно для App Store, у нас только mock
- **Реальный Google Sign-In** (`@react-native-google-signin/google-signin` + Firebase или Supabase OAuth) — у нас mock
- **Бэкенд Supabase** по схеме из `03-architecture.md`: users, children, child_access, journal_entries, notifications_log
- **Sync**: при сетевом подключении выгружать локальный AsyncStorage в Supabase; при пере-входе — наоборот
- **EAS build setup**: `eas.json` profiles (development / preview / production), Apple Developer cert ($99/год), Google Play Developer ($25 один раз)
- **Sentry** или аналог для crash-репортов на проде — `crash_caught` событие из ErrorBoundary недостаточно само по себе
- **Реальный analytics-провайдер** (PostHog / Amplitude) — заменить тело `devProvider` в `src/lib/analytics.ts`. Опросный план уже в коде через 17 событий

### P1 — сильно желательно к бете
- **Background-обновление расписания уведомлений** — сейчас reschedule только при изменении ребёнка/настроек; если приложение не открывается месяц, уведомления могут устареть. expo-task-manager + headless task раз в неделю
- **Deep-link на уведомление** работает, но cold-start route иногда не готов — добавить retry/queue
- **Migrations для AsyncStorage** — сейчас при изменении формы стора (добавили `disclaimerAccepted`) старые юзеры получают undefined; `disclaimerAccepted` defaults to false, но это случайно повезло. Нужен `version` в каждом сторе и явный `migrate(prev, target)`
- **i18n scaffolding** — весь текст хардкоден на русский. До V2 хватит, но если выходим на ЕС-рынок — i18next нужен сразу
- **e2e тесты на критичные флоу** — Detox / Maestro для: онбординг → создание ребёнка → добавление записи → шеринг
- **Snapshot-тесты компонентов** через React Native Testing Library — сейчас покрыты только pure libs

### P2 — можно после первой беты
- **Темная тема** — токены есть, но визуально не проверена; контраст на тёмном фоне может быть сломан
- **Accessibility audit** — `accessibilityLabel`, `accessibilityRole`, проверка с VoiceOver / TalkBack
- **Анимации перехода между скачками** на Calendar
- **Photo-attachment к записям журнала** — есть поле в схеме (photo_path), но UI не реализован
- **Экспорт в PDF/JSON** — кнопка-stub в Me, реализовать минимум JSON через `expo-file-system` + Share

---

## 2. Продуктовый трек

### P0
- **Реальные user-тесты с 5–8 родителями** до запуска платных каналов. Симулированные интервью (`docs/05-personas.md`) полезны как гипотезы, но не заменяют. Critical question: «Запускаешь ли ты приложение чаще раза в неделю на 4-й неделе?»
- **Onboarding-метрики**: % завершивших create-child, % включивших уведомления, % давших согласие на disclaimer (события уже летят)
- **Retention D1/D7/D30** — без них непонятно, лечит ли «Рост малыша» болью или это рекреационный флирт
- **Channel test**: в каком из (Telegram-чаты родителей / Instagram реклама / органика App Store / sarafan) дешевле CAC

### P1
- **Onboarding A/B** — сравнить «Sign-in first» vs «Try first, sign-in on save» (interview pattern from persona Лена)
- **Empty-state нудж после 3 дней без записей** — push «Как сегодня?» с быстрым moodом из уведомления
- **Weekly digest** для партнёра — был в плане как часть фичи D, отложен. Реализовать как cron из бэкенда → email или PDF в шеринг

### P2
- **AI-теги для свободных заметок** — в V2, но можно начать собирать notes сейчас, чтобы было на чём учить
- **Голосовые заметки** — родители не печатают в 3 ночи

---

## 3. Юридический и compliance-трек

### P0
- **Privacy Policy** (хостить как `appname.app/privacy`) — что собираем, кому передаём, как удалить
- **Terms of Service** — стандартный шаблон + dispute resolution
- **GDPR DPA** если выходим на EU — Supabase EU region уже выбран, но нужен формальный DPA с ними
- **Apple App Privacy** в App Store Connect — указать каждое поле что собираем (email, child name, child DOB)
- **Cookie/Tracking consent** на лендинге

### P1
- **Дисклеймер о медицине** уже есть в приложении (модалка G), нужна юридическая формулировка от профильного юриста для health-app
- **Возрастная маркировка** — 4+ для контента, но сами родители — adults; уточнить
- **Согласие на обработку данных ребёнка** — отдельный чекбокс в onboarding, не в общем PP

### P2
- **HIPAA**? — если выходим на US, формально нет (мы не covered entity), но best-practice применить
- **РФ 152-ФЗ** — если работаем с РФ-юзерами, серверы в РФ или согласие на трансграничную передачу

---

## 4. Операционный трек

### P0
- **Support email** + сервис (Helpscout / Crisp) — `support@appname.app`. Без этого первые баги уйдут в 1-star
- **Status page** для бэкенда (если Supabase лежит — родители не понимают почему нет данных)
- **Process для critical bug**: SLA в 24 часа, hotfix через EAS Update
- **Database backup** включён в Supabase Pro по умолчанию, проверить что включён point-in-time recovery

### P1
- **Документация для бета-тестеров**: «как сообщать о багах», «что в скоупе беты», «куда идут данные»
- **NPS-опрос** в-приложении после 14 дней use
- **Changelog-канал** в Telegram / discord для бета-группы

### P2
- **Onboarding для новых членов команды** — README в репо обновить, добавить SETUP.md

---

## 5. Marketing & launch-трек

### P0
- **Лендинг** на appname.app с одним CTA (preorder email или TestFlight invite)
- **App Store screenshots** (5 экранов на каждый размер устройства) + текст описания
- **Tagline и позиционирование** — у нас в `00-plan.md` есть набросок, нужно финализировать после user-тестов

### P1
- **Posts в Telegram-чатах родителей** — органика, но требует ручной работы; основной канал по interview-данным
- **Партнёрство с инфлюенсерами-педиатрами** (мама-доктор) — выгоднее чем медийка, выше доверие в health
- **App Store ASO** — ключевые слова, A/B preview видео

### P2
- **Press / Habr** — после первых 1000 active users, не до

---

## Sequencing

Минимум до первой закрытой беты (10–20 родителей):
1. Реальный Apple/Google sign-in (P0 tech)
2. Supabase + sync (P0 tech)
3. Sentry + PostHog (P0 tech)
4. Privacy Policy + Terms (P0 legal)
5. Support email (P0 ops)
6. EAS production build → TestFlight (P0 tech)

После — публичная бета через лендинг + Telegram-органика.

После первых 100 активных:
- Retention анализ → решение о монетизации (модель в `00-plan.md`)
- A/B onboarding
- V2 AI-роадмап (отдельный документ)
