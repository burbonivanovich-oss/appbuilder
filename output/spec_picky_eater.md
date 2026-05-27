# Picky eater toddler — спецификация запуска

Документ для пары: разработчик (full-stack или RN-dev) + registered dietitian
(RDN) специалист по pediatric feeding. Без RDN не запускайте.
Цель — выйти на iOS + Android за 90 дней и достичь $8k MRR на 9 месяце.

---

## 1. Позиционирование

**Название (рабочее)**: NextBite. **Альтернативы**: TinyTaster, Munch, Sevenfoods.

**Слоган**: "Stop fighting at dinner. Start expanding their plate."

**Анти-позиционирование**:
- НЕ "приложение для здорового питания детей" (общее, безличное)
- НЕ "рецепты для малышей" (рынок насыщен — Yumi, Solid Starts)
- НЕ "трекер калорий ребёнка" (родители ненавидят считать)

**Главное обещание**: "Через 4 недели твой ребёнок будет пробовать 7 новых продуктов. Без слёз, без давления."

Основан на проверенном методе **responsive feeding** (Ellyn Satter Division of Responsibility) — это признанная клиническая модель, не trendy biohack. Это даёт credibility и снижает риск "очередное родительское приложение".

**Целевая персона**: мама ребёнка 2-5 лет (с мужем-помощником или solo), миллениал 28-40 лет, в Instagram-комьюнити Solid Starts / Feeding Littles, тревожная (это generation), уже в отчаянии от того что ребёнок ест 5 продуктов. Готова платить $10-15/мес если видит progress.

---

## 2. MVP — список экранов

### 2.1 Onboarding (10 экранов, 4-5 минут)

1. **Hook** — "Does your toddler refuse most foods? You're not alone — 30% of 2-5yo are picky eaters. We can fix that in 4 weeks." (Не "продам", а "присоединись")
2. **Child info** — имя, возраст (месяцы), пол
3. **Safe foods** — выбор из ~50 пресетов ("Что ваш ребёнок ест регулярно?") + custom
4. **Fears** — какие категории отказывает (овощи / белок / новые текстуры / новые цвета)
5. **Mealtime context** — за столом всей семьёй / в high chair / с TV-фоном / без структуры
6. **Previous attempts** — "Что вы уже пробовали?" (давление / прятать в еду / готовить отдельно / голодом)
7. **Parent goals** — short-term ("чтобы перестал кричать") vs long-term ("выработать разнообразие")
8. **Method intro** — "Мы используем responsive feeding (Ellyn Satter). Это значит: ВЫ решаете *что, когда, где*. Ребёнок решает *сколько и есть ли*. Никакого давления."
9. **Photo of typical plate** — фото текущей тарелки (для тренировки AI и baseline)
10. **Trial** — 7 дней бесплатно. Без карточки.

### 2.2 Today (главный экран)

- **Сверху**: "День 12 из 28. Прогресс: 3 из 7 продуктов пробовал."
- **Today's plate** — фото-пример "вот так выглядит тарелка сегодня" + текст-инструкция:
  - "На обед: положи кусочек морковки рядом с любимыми макаронами. Не зови есть, не давит. Просто поставь."
- **Why this works** — короткое объяснение (раскрывается тапом): "12-15 экспозиций нужно чтобы ребёнок попробовал новое. Сегодня — экспозиция №3 морковки."
- **Bottom card**: "Покажи как прошёл обед" (фото + tap "ел / отказал / пробовал")

### 2.3 7 foods tracker (визуальный прогресс)

- Большая сетка 4×7 = 28 квадратов = 4 недели экспозиций
- Каждый квадрат = один день × один target food
- Цвета: серый (ещё не было), серый со штрихом (предлагали-отказался), жёлтый (попробовал кусочек), зелёный (съел нормально)
- Топ: "Цели на эту программу: морковь, брокколи, курица, кефир, авокадо, рис коричневый, рыба"
- Тап на квадрат → история этой экспозиции (фото, заметки)

### 2.4 Photo log

- Фото-камера в приложении
- После фото — quick tags: "ел нормально / попробовал кусочек / отказал / выплюнул / выкинул"
- Опционально: запись 10 секунд аудио ("он сказал ужас на вкус")
- Все фото лежат локально + опционально синк с iCloud (для родителей с тремя устройствами)

### 2.5 Weekly review (раз в 7 дней — push)

- "Неделя 1 завершена. Вот что мы видим:"
- 3 success ("Морковь — он попробовал кусочек 2 раза! Это уже прогресс.")
- 2 challenges ("Брокколи — пока не идёт. Меняем стратегию.")
- AI-generated next week plan (на основе patterns):
  - "На следующую неделю: уменьшаем дозы брокколи до 1 цветочка, плюс пробуем 'broccoli forest' — игровая подача."
- Кнопка "Применить план"

### 2.6 Library (экспозиции и рецепты)

- 100+ exposure activities, разбитых по:
  - Возраст (2-3 / 3-4 / 4-5)
  - Категория еды (овощи / белок / молочное / зерновые / фрукты)
  - Тип подачи (как есть / нарезано / спрятано / игровое)
- Каждая активность — короткое видео 15-30 секунд + текст-инструкция
- "Pin to today" — добавить в свой план

### 2.7 Community

- Чат-группы по возрасту ребёнка (одна на каждые 12 месяцев)
- Модерация — обязательна (родители-тревожные, легко свалиться в panic-mode)
- Pinned posts: "Что НЕ делать" (давить, обещать награду, прятать в еду)

### 2.8 Settings

- Subscription
- Child profiles (если есть второй ребёнок — добавить)
- Family members (мама + папа + бабушка с доступом)
- Privacy & data export

---

## 3. Тех-стек

| Слой | Технология | Почему |
|---|---|---|
| Платформа | iOS 15+ AND Android 9+ | Мамы делятся 50/50 между Android и iOS |
| Cross-platform | React Native (Expo) или Flutter | Скорость; команда из 1 dev не сделает 2 native |
| Backend | Firebase (Auth + Firestore + Storage) | Самый быстрый путь от 0 до 10k users |
| AI/планирование | Anthropic Claude API (Sonnet) для генерации недельных планов | Лучше OpenAI на длинные структурированные ответы |
| Photo storage | Firebase Storage + local cache | Низкая стоимость до scale |
| Подписки | RevenueCat (cross-platform) | Решает iOS+Android StoreKit/Play Billing разом |
| Community chat | Stream Chat (бесплатно до 100 chat users; потом $499/мес) | Готовое решение, экономит 2 месяца |
| Аналитика | Mixpanel или PostHog | Воронка onboarding критична |
| Контент CMS | Sanity.io | Для рецептов и exposure activities — нон-dev команда обновляет |
| Email | Postmark или Resend | Welcome series + weekly digest |
| Push | Firebase Cloud Messaging | Cross-platform |

**Главное отличие от Dopamine**: здесь обязателен backend. Контент-библиотека центральная, синк между устройствами критичен, AI-планы нужно генерить серверно.

---

## 4. 90-дневный бэклог

### Неделя 1
- **Найти RDN-партнёра** (registered dietitian, specialty: pediatric feeding therapy / responsive feeding). Это критический путь. Источники: International Association for Feeding Professionals, Ellyn Satter Institute directory, LinkedIn search "pediatric feeding RDN".
- Контракт: контент-консультант + ревью каждой activity, доля в компании (5-10% equity) или контрактные часы ($75-100/час)
- Брендинг, домен, social handles
- Wireframes основных экранов в Figma

### Неделя 2
- Firebase project setup
- React Native Expo skeleton
- Дизайн-система (palette, typography, child-friendly но не infantile)
- Onboarding flow (10 экранов)

### Неделя 3-4
- Photo log mechanic (камера + tagging)
- Today's plate UI (статика, без AI пока)
- Database schema: child profile, foods, exposures, photos, plans
- Authentication (email + Apple Sign In)

### Неделя 5
- **RDN пишет первую 4-недельную программу для возраста 3-4** (28 exposure activities × 7 target foods, с текстами и рецептами)
- 7 foods tracker UI
- Базовая интеграция Claude API для generation prompts (использует контент RDN как контекст)

### Неделя 6
- Weekly review flow
- AI generation: "given previous week data, propose next week" — prompt-engineering, не fine-tuning
- Push-уведомления и notifications scheduling

### Неделя 7
- Library из 30 первых activities (на 4 недели первой программы)
- Photo + audio recording для каждой
- Community basics (Stream Chat integration)

### Неделя 8
- Subscription (RevenueCat) + paywall
- 7-day free trial logic
- Settings, profile, child management

### Неделя 9
- **TestFlight + Android Internal** в bug-bash режиме (10-15 моих знакомых с детьми 2-5)
- Параллельно: outreach 50 mom-Instagram-аккаунтов в picky-eating space (через DM) — "looking for 30 beta testers"
- Цель: 30 mom-testers активных всю неделю

### Неделя 10
- Итерации на основе фидбека (типичные жалобы: "хочу два детей в одном профиле", "слишком много текста", "забываю фотать — добавь напоминалку")
- Polish + второй age band (2-3 года, RDN добавляет 28 новых exposures)
- App Store + Play Store listings: скриншоты, описание, ASO

### Неделя 11
- App Store + Play Store submit (review 24-72 часа)
- Подготовка launch-материалов: 60-секундное демо-видео, 10 Instagram-постов, partnership outreach к Solid Starts, Feeding Littles

### Неделя 12
- **Public launch** в Instagram + Reddit (r/toddlers, r/parenting) + Product Hunt (опционально)
- Engagement: ответ на все DM первые 72 часа
- Цель: 500 downloads, 40 paying trials, $360 MRR

### Месяц 2 (недели 13-16)
- Анализ воронки (типично: install → onboarding 60%, onboarding → trial 70%, trial → paid 30%)
- A/B пейволла, оптимизация
- Расширение библиотеки до 100 activities + RDN добавляет третий age band (4-5 лет)
- Партнёрство-pitch: Solid Starts (50k Insta), Feeding Littles (250k), Yummy Toddler Food (300k)
- Reddit-сообщество engagement: pinned posts с tips, AMA с RDN-партнёром в r/parenting

### Месяц 3 (недели 17-26)
- Если воронка работает: paid Instagram + TikTok ads ($1k тест бюджет)
- Создание viral-контента: own TikTok account с RDN-партнёром, контент "vegetables I learned to love through this method"
- Pediatric clinics: pilot с 2-3 клиниками в одном городе — flyer-distribution за commission share
- Цель к концу 6 месяца: 12k downloads, 800 paying, $5-6k MRR

---

## 5. Unit-экономика

### 5.1 Доход на пользователя (ARPU)

| Тир | Цена | Доля | Вклад в ARPU |
|---|---|---|---|
| Free | $0 | 92% installs | $0 |
| Monthly $9.99 | $119.88/yr | 50% paid | $59.94 |
| Annual $59 | $59/yr | 35% paid | $20.65 |
| Family monthly $14.99 | $179.88/yr | 15% paid | $26.98 |

- Конверсия install → trial: 25% (родители в боли — выше чем у "fitness" приложений)
- Конверсия trial → paid: 25% (умеренно — не "острая боль 3 ночи" как baby sleep)
- Эффективная конверсия install → paid: ~6%

**Blended ARPU**: $59.94 × 0.5 + $20.65 × 0.35 + $26.98 × 0.15 / (0.5 + 0.35 + 0.15) = **~$54/yr/payer**

При среднем удержании 14 мес: **~$63 per payer LTV**

### 5.2 Retention и LTV

**Важно**: retention в parenting apps падает быстро — дети растут.
- Month 1 retention: 80% (родитель в боли, держится)
- Month 3 retention: 60%
- Month 6 retention: 40%
- Month 12 retention: 25%
- К 18 месяцу: 15% (ребёнок 4-летний может перерасти проблему сам)

**Retention-расширение**: после 3-летней программы можно перейти к "Mealtime Family" — нутриция всей семьи, не только picky eater. Это потенциальный 2× LTV для тех 15% что доживут.

**LTV расчёт**:
- Mean lifespan = 10 месяцев платящего
- LTV = ARPU × lifespan = $54 × (10/12) = **~$45**
- С учётом Family-апгрейда 20% юзеров на месяце 4: LTV bump до **~$70**

### 5.3 CAC по каналам

| Канал | CPI | Конверсия в paid | CAC |
|---|---|---|---|
| **Instagram органика** (партнёрство с Solid Starts) | $0-3 | 7-10% | $0-30 |
| **TikTok органика** (свой канал с RDN) | $5-15 | 5-7% | $70-200 |
| **Pinterest paid** | $10-20 | 4-6% | $200-330 |
| **Instagram paid** (mom 2-5yo targeting) | $20-30 | 4-6% | $330-500 |
| App Store ASO (long-tail keywords) | $0-2 | 5-7% | $0-40 |
| Apple Search Ads | $3-5 | 4-5% | $60-125 |
| Подкаст-реклама (parenting podcasts) | $30-100 fixed CPM | mixed | $50-150 |
| **Pediatric clinic partnership** (комиссия с подписки) | $0 | 30-50% | $0 base + 20% revenue share |

**Реалистичный CAC mix:**
- Месяцы 1-3: 70% Instagram органика (партнёрства) + 20% ASO + 10% Reddit organic → blended CAC $25-40
- Месяцы 4-6: 40% органика + 30% influencer paid + 20% IG ads + 10% clinic → CAC $40-60
- Месяцы 7-12: 30% органика + 50% paid + 20% partnerships → CAC $60-90

**LTV/CAC**: $70 / $25-90 = **0.8× → 2.8×**. Существенно хуже Dopamine. **Это требует:**
1. Сильнейшее партнёрство (Solid Starts уровень) для дешёвого acquisition в первые 6 месяцев
2. Family-апгрейд должен работать (boosts LTV)
3. Возможно extra retention через "Mealtime Family" модуль

### 5.4 Чувствительность модели

**Если конверсия trial → paid 35% (не 25%)**: LTV $90 → LTV/CAC 1.5-3.5×

**Если удержание 16 мес (не 10)**: LTV $90 → LTV/CAC аналогично

**Если CAC $40 (через Solid Starts partnership)**: LTV/CAC 1.75× — нижний порог нормальности

**Чёткий приоритет: получить partnership с Solid Starts или Feeding Littles до launch.** Без этого экономика плохая.

### 5.5 Финансовая модель — 6 месяцев

| Месяц | Installs | Paying (cumul) | MRR | Cum revenue |
|---|---|---|---|---|
| 1 | 500 | 30 | $270 | $270 |
| 2 | 1,500 | 120 | $1,080 | $1,350 |
| 3 | 3,000 | 280 | $2,520 | $3,870 |
| 4 | 6,000 | 530 | $4,770 | $8,640 |
| 5 | 9,500 | 800 | $7,200 | $15,840 |
| 6 | 14,000 | 1,100 | $9,900 | $25,740 |

Допущения: 6% install → paying, ARPU $9/мес, churn 5%/мес после месяца 2, рост через organic 30%/мес.

К концу года 1: ~50k installs, ~3k paying, **~$22k MRR** (~$260k ARR). Требует команды из 2-3 человек к этому моменту.

---

## 6. Go-to-market: 0 → 10,000 пользователей

### 6.1 Первые 100 (недели 9-10)
- **DM 50 mom-Instagram-аккаунтов** (picky-eating, baby-led weaning, anti-pressure feeding ниши):
  - Текст: "Я строю приложение для родителей детей, которые отказываются от еды. Метод responsive feeding (Ellyn Satter, RDN-approved). Хочу 30 mama-testers."
  - Из 50 ответят 15, попробуют 8-10 серьёзно
- **r/toddlers** (350k members) — пост "Built a 4-week program for picky eaters based on Ellyn Satter method. Free TestFlight beta, looking for honest feedback."
- **r/parenting**, **r/Mommit** — повторить
- **Facebook-группы**: "Picky Eaters Support Group", "Toddler Feeding Solutions" (там 50k+ людей; модератор может разрешить пост за explicit ask + benefit)

### 6.2 100 → 1000 (месяцы 1-3 после launch)
- **Solid Starts партнёрство** (50k Insta + 100k newsletter): главная цель. Подход — через основателя Jenny Best (LinkedIn DM или Twitter), предложить co-marketing (вы упомянутые в их email серии, они — в вашей; ничего не платите, оба растёте). Или revenue-share на attributed referrals.
- **Feeding Littles** (250k Insta — Megan McNamee + Judy Delaware): то же предложение
- **Yummy Toddler Food** (300k Insta + рецептарный сайт): они уже монетизируют через рецепты-cookbook, ваш — complementary
- **Parenting podcasts** в picky eating niche: Picky Eating Podcast (Adina Soclof), The Picky Eating Solution Podcast — спонсорство $200-500 за эпизод, 5-15k слушателей
- **Pinterest organic** — Pinterest = mom-traffic. Создать 20 пинов "How I got my toddler to eat broccoli" с links в приложение
- **App Store ASO**: keywords "picky eater toddler", "toddler nutrition", "kids won't eat", "baby led weaning toddler"

### 6.3 1000 → 10000 (месяцы 4-6)
- **Instagram + TikTok paid** с lookalike audiences from existing paying users
- **Pediatric clinic partnership pilot** — найти 3-5 pediatric offices в одном городе, договориться о flyer-distribution + first month free promo code; commission share 20% на attributed (требует tracking promo codes per clinic)
- **YouTube creator collabs** — 5-10 mama-YouTubers (200k-1M subs, parenting niche), отправить free family-subscription + ask for honest review
- **RDN-сертификация программа** — позиционировать как сертифицированную IBCLC / RDN supplement к их private practice; pediatric RDN могут продавать своим клиентам со скидкой 20%
- **Conference**: International Association for Feeding Professionals annual conference — booth $1.5k, ~200 RDN connections

### 6.4 Удержание (всегда)
- Daily push: "Сегодня день 12 из 28. На обед сделай морковный pasta — рецепт здесь."
- Weekly digest email: progress summary + photos of week + RDN tip
- After 4-week программы — congrats + next program ("дополнительные 7 продуктов" / "Mealtime Family")
- Community engagement — daily moderation, RDN-партнёр отвечает на 5 вопросов в день

---

## 7. Главные риски и митигация

### Риск 1 (высокий): Slow paid acquisition (CAC > LTV)
**Митигация**: ВСЕ ресурсы первые 6 месяцев на organic + partnership. Никакого paid ads пока CAC ≤ $30 не подтверждён организически. Заработать первые $5k MRR на чисто органике. Только после — paid expansion.

### Риск 2 (средний): Retention слишком короткий (children outgrow)
**Митигация**: Сразу планировать "Mealtime Family" модуль на 4-й месяц (нутриция для всех членов семьи). Это меняет retention сценарий с "ребёнок вырос → ушёл" на "ребёнок вырос, мама осталась для себя и партнёра".

### Риск 3 (средний): RDN-партнёр уходит / конфликт
**Митигация**: Equity вместо часовой оплаты + контент-buyout право (вы платите $X за полное право на каждую activity, чтобы можно было использовать после если разойдётесь). Без этого = bus factor 1.

### Риск 4 (низкий): Apple/Google отклоняют за medical claims
**Митигация**: В описаниях избегать "treat ARFID", "diagnose feeding disorder". Использовать "support responsive feeding", "encourage exposure", "based on Ellyn Satter method" — disclaimer "not medical advice; consult your pediatrician".

### Риск 5 (средний): Конкуренция от Solid Starts launching app
**Митигация**: Solid Starts фокусируется на baby-led weaning (4-12 месяцев). Picky-eater (2-5 лет) — adjacent но другой market. Если они зайдут — будете дополнительной выгодой от их audience, не прямой конкурент.

---

## 8. Метрики успеха

**К концу 90 дней (запуск)**:
- 500+ downloads
- 30+ paying subscribers
- 4.5+ App Store / Play Store rating
- 1+ репост от mom-Instagram-аккаунта 50k+ followers

**К концу месяца 6**:
- 14k+ downloads
- $8k+ MRR
- 4.7+ store rating
- 1+ partnership с Solid Starts / Feeding Littles / Yummy Toddler Food
- 3+ pediatric clinic pilot active

**К концу года 1**:
- 50k+ downloads
- $22k+ MRR (~$260k ARR)
- 35% trial → paid конверсия
- 10+ pediatric clinic active partnerships

К году 1 это уже бизнес требующий 3-4 человек (dev, RDN partnership + content, community moderator + GTM, customer success). Уже не solo lifestyle, но защищённый растущий бизнес.

---

## 9. Когда НЕ делать

- **Если у тебя нет выхода на качественного RDN** с pediatric feeding специализацией. Без неё/него = wellness-app без credibility, конкуренция с Solid Starts проиграна.
- **Если ты сам не родитель**. Mom-empathy критично — невозможно построить онбординг и community, не понимая, как родитель в 3 ночи открывает приложение со слезами на глазах.
- **Если ты не готов вести community** — это не Forest, где юзер один. Здесь нужна модерация, RDN-Q&A, eженедельные emails. Без этого retention рухнет.
- **Если у тебя нет $20-50k savings на 6 месяцев** — partnerships + RDN equity + content production занимают ресурсы. Дешевле Dopamine, но не self-funded из ничего.
