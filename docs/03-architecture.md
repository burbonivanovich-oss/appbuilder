# Техническая архитектура

Стек рассчитан на одного разработчика + быстрый MVP + готовность к AI-слою в V2 без смены платформы.

## Общая схема

```
Клиент (Expo)                    Бэкенд (Supabase)         Инфра
─────────────                    ─────────────────         ──────
Expo SDK 51                      Postgres (EU region)      Sentry (crash)
  ├ expo-router (file-based)     Auth                      PostHog (analytics)
  ├ TypeScript strict            Row-Level Security        Expo EAS (build)
  ├ expo-notifications           Storage (photos)          App Store Connect
  ├ expo-sqlite + Drizzle ORM    Edge Functions (Deno)     Play Console
  ├ expo-secure-store            Realtime (partner sync)
  ├ react-native-mmkv
  ├ zustand (state)
  ├ react-hook-form + zod
  ├ i18next (ru/en)
  └ react-native-reusables (UI kit)
```

## Почему Supabase, а не Firebase / собственный бэкенд

- PII ребёнка → RLS закрывает row-level доступ, Firebase security rules сложнее и дырявее
- EU region (Frankfurt) для GDPR; self-hosted вариант доступен при необходимости РФ-хостинга
- Edge Functions на Deno — AI-слой в V2 без смены платформы
- Миграции через `supabase db`, всё в git
- Цена на старте $0, до ~5K MAU остаёмся на Pro ($25/мес)

## Данные и БД

### Схема (упрощённо)

```sql
users (id, email, created_at, locale)
children (id, parent_id, name, dob, expected_dob, sex, created_at)
  -- expected_dob = ПДР, используется для расчёта скачков у недоношенных
child_access (child_id, user_id, role)   -- для совместного доступа
leap_events (child_id, leap_number, status)
  -- status: upcoming / active / completed / skipped (ручной override)
journal_entries (id, child_id, author_id, date, mood, symptoms[], note, photo_path)
notifications_log (id, user_id, type, sent_at, leap_number)
```

### Оффлайн-first

Обязательно:

- Родители открывают приложение в 3 ночи в метро / парке / даче
- Любая задержка на сеть = отток
- WatermelonDB или Drizzle + expo-sqlite, синхронизация через `updated_at` + Supabase Realtime

### Конфликты синхронизации

- `journal_entries` — last-write-wins по `updated_at`, конфликты редки (два родителя не пишут в одну запись)
- `leap_events.status` — если оба родителя меняют, последний побеждает, показываем toast "Партнёр изменил"

## Auth

- Supabase Auth: email + пароль, Apple (обязательно для iOS review), Google
- Без SMS в MVP (дорого, не нужно)
- `expo-secure-store` для refresh token
- `react-native-mmkv` для некритичного кэша
- Приглашение партнёра: магик-линк с `child_id` в payload, конкретно на этого ребёнка

## Push-уведомления

- `expo-notifications` + Expo Push Service (бесплатно, проксирует APNs / FCM)
- **Локальные** уведомления для предсказуемых событий (за 3 дня до скачка по расписанию) — работает без сервера, не требует push-токена
- **Серверные** пуши — только для совместности ("партнёр добавил запись") через Supabase Edge Function + `expo-server-sdk`
- Квота Expo: 600 пушей/сек бесплатно, хватит надолго

## AI-слой (V2, не MVP)

Архитектура уже под это готова:

- Edge Function `/ai/advise` → Anthropic API (Claude Sonnet 4.6 или Haiku для дешёвых запросов)
- Промпт собирается из журнала ребёнка + текущий скачок
- Кэш ответов в Postgres по хэшу входа — не платим дважды
- Лимиты на free tier (5 запросов/день), unlimited на premium
- Эстимейт стоимости: ~$0.10–0.30 на активного пользователя в месяц при среднем использовании

## Приватность и безопасность

- Все таблицы под RLS: `user_id = auth.uid()` или доступ через `child_access`
- Фото шифруются at rest в Supabase Storage
- Возраст совершеннолетия проверяем на входе (COPPA: аккаунт на родителя, не на ребёнка)
- Экспорт данных в JSON + PDF — обязательная кнопка в настройках
- Удаление аккаунта в 1 клик → каскад по FK
- Дисклеймер "не медицинское устройство" на онбординге и в настройках

## CI / CD

- EAS Build для iOS / Android, 2 профиля: `development` (internal) и `production`
- EAS Update для OTA-патчей JS-кода без релиза в стор
- GitHub Actions: lint + typecheck + jest на каждом PR

## Риски стека

- **Supabase vendor lock-in.** Postgres мигрируется куда угодно, но Auth / Storage / Edge придётся переписать. Для MVP ок.
- **Expo ограничения на нативный код.** Config plugins решают 95% случаев, Expo SDK 51 покрывает всё нужное.
- **EAS цены.** После 30 бесплатных билдов в месяц — $99/мес, добавляем когда упрёмся.
