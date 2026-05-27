# Юридические нюансы — Picky eater toddler

> **Важно**: это не юридическая консультация. Перед запуском **обязательно**
> привлечь юриста, специализирующегося на (1) children's privacy (COPPA),
> (2) health-tech regulation, (3) consumer apps. Бюджет на legal review
> запуска: $3k-8k единоразово.

Документ разделён на разделы по убыванию риска для бизнеса.

---

## 1. КРИТИЧЕСКИЙ риск: COPPA (Children's Online Privacy Protection Act)

### 1.1 Что это и почему касается вас

**COPPA** — федеральный закон США, регулирующий сбор данных детей до 13 лет.
Штрафы FTC до **$50,120 за каждое нарушение** (т.е. за каждого затронутого
ребёнка). TikTok заплатил $5.7M, YouTube $170M.

**Ваше приложение** работает с данными детей 2-5 лет → COPPA применяется
**даже если данные собирает родитель**, потому что это persistent identifier
ребёнка (имя, возраст, паттерны еды, фото блюд могут содержать лицо).

### 1.2 Стратегия минимизации (выбрать одну)

**Вариант A — "Parent as user" framing (рекомендуется)**
- Приложение позиционируется как инструмент для **родителя**, не для ребёнка
- Account создаётся на родителя; ребёнок — это просто "profile" в нём
- Данные о ребёнке — это metadata о пользователе-родителе (как, например, "имя моего питомца")
- Не собираем биометрию ребёнка, не используем face/voice ID
- Минимизировать identifiers ребёнка: только имя (опционально nickname) и возраст в месяцах
- **Это не освобождает полностью от COPPA**, но переключает на более мягкую интерпретацию

**Вариант B — Verified parental consent**
- Прямая COPPA compliance: при добавлении child profile запрашивать verifiable parental consent
- VPC methods, признанные FTC:
  - Credit card transaction ($0.50 charge → refund)
  - Government ID upload + verification
  - Video conference с staff (impractical)
  - Knowledge-based authentication via signed legal form
- Сложно и дорого; не рекомендуется для micro-SaaS
- Используют только если планируете AI-features что-то "обучаются" на ребёнке

### 1.3 Конкретные действия (Variant A)

1. **Privacy policy** должен явно указать:
   - "We do not knowingly collect personal information from children under 13"
   - "Parent accounts may include limited info about their child (first name, age in months) for personalization. This is metadata, not child's account."
   - "Photos uploaded should be of food items, not children. We auto-redact faces detected in uploads." (см. ниже)
2. **In-app**: при photo upload — если on-device ML detects face → soft warning "We detected a face. Please reshoot to show only the plate."
3. **Не позволяем** ребёнку взаимодействовать с приложением напрямую (no "child mode", no chat for kids)
4. **Не таргетируем рекламу** ребёнку. Никаких ads вообще в первый год — простой и чистый model.
5. **Не используем** child name/age для маркетинга, аналитики, кросс-app tracking
6. **Удаление**: parent должен иметь возможность удалить child profile одним тапом + полное стирание данных в 30 дней

### 1.4 FTC Safe Harbor

Можно записаться в одну из FTC-approved safe harbor programs (CARU, ESRB, kidSAFE и др.) — снижает риск штрафа, но повышает compliance overhead. Для micro-SaaS обычно не стоит до 10k+ paying users. **Минимум**: ежегодный self-audit чеклиста COPPA.

---

## 2. ВЫСОКИЙ риск: Health claims / FTC marketing

### 2.1 Что нельзя говорить

FTC агрессивно преследует health-related apps за необоснованные claims.
Примеры запрещённого:

- ❌ "Лечит ARFID" (Avoidant Restrictive Food Intake Disorder)
- ❌ "Diagnose feeding disorder"
- ❌ "Improves your child's nutrition" (без клинических доказательств)
- ❌ "Cures picky eating"
- ❌ "Pediatrician-recommended" (если у вас нет 5+ pediatricians в endorsement пуле)
- ❌ "Evidence-based" (если у вас нет конкретных peer-reviewed studies)

### 2.2 Что МОЖНО говорить

- ✅ "Supports responsive feeding" (метод, не результат)
- ✅ "Based on Ellyn Satter Division of Responsibility method" (с reference)
- ✅ "Encourages exposure to new foods" (механика, не claim)
- ✅ "Developed with input from a Registered Dietitian Nutritionist" (если правда — назвать имя и credentials)
- ✅ "Tracks your child's eating patterns over time" (function description)
- ✅ "Not medical advice. Consult your pediatrician." (disclaimer)

### 2.3 Disclaimer template (везде где marketing говорит про здоровье)

```
This app provides educational content and tracking tools to support
responsive feeding practices. It is not a substitute for professional
medical, nutritional, or psychological advice, diagnosis, or treatment.
Always consult a qualified healthcare provider for concerns about your
child's eating, growth, or behavior. If you suspect ARFID, food allergies,
or feeding disorder, please see your pediatrician immediately.
```

Этот disclaimer должен быть:
1. В Terms of Service
2. В Privacy Policy
3. В app — модальный экран в onboarding (юзер тапает "I understand")
4. В каждом push-уведомлении с health-related контентом — мелким шрифтом

### 2.4 Testimonials и reviews

- Не позволяйте testimonials с конкретными медицинскими результатами ("My son was diagnosed with ARFID and your app cured him")
- Если такой review приходит — модерируйте: "We appreciate your story, but we can't display claims about specific medical diagnoses."
- В Apple App Store / Play Store screenshots — никаких количественных health claims ("88% of users see improvement")

---

## 3. ВЫСОКИЙ риск: privacy / GDPR / CCPA

### 3.1 Минимальный privacy stack

| Юрисдикция | Закон | Что нужно |
|---|---|---|
| США (национальный) | COPPA | См. п. 1 |
| Калифорния | CCPA / CPRA | "Do not sell my info" link, deletion request, opt-out |
| Виргиния, Колорадо, Юта, Коннектикут | VCDPA et al | Аналогично CCPA |
| EU + UK | GDPR / UK GDPR | Lawful basis для каждой category data, right to erasure, DPO если obligatory |
| Канада | PIPEDA | Consent, accountability |

### 3.2 Practical compliance

**Privacy Policy** должен включать (Terms-of-art):
1. **Categories of data collected**:
   - Account data (email, name родителя)
   - Child profile data (имя, возраст в месяцах, пищевые предпочтения)
   - Usage data (interactions, экраны посещённые)
   - Photo uploads (food plates)
   - Optional health logs (allergies, symptoms если ввели)
2. **Purposes** каждой категории — конкретно, не общо
3. **Third-party sharing** — Firebase, Stream Chat, RevenueCat, Mixpanel/PostHog, Claude API
4. **Retention period** — конкретные сроки (мы храним фото 12 месяцев после удаления аккаунта; analytics events — 24 мес; etc.)
5. **User rights** — access, correct, delete, port, restrict, object
6. **DPO contact** — если оперируете в EU и обрабатываете "large scale" data
7. **Children**: явный раздел про COPPA-compliance (см. п. 1.3)
8. **International transfers** — если используете US-cloud (Firebase, Claude), нужен Standard Contractual Clauses + UK Addendum

### 3.3 Cookie/tracking consent (для EU)

- В первое открытие из EU IP — модальное "Manage your privacy" с гранулярными toggles
- Не показывать essential trackers (Sentry crash reporter) — toggle on by default OK
- Analytics (Mixpanel, etc.) — toggle off by default, ask user
- Запоминать выбор на устройстве

### 3.4 Data deletion

Пользователь должен иметь возможность:
1. Удалить account через app (Settings → "Delete account") — не за email-запросом
2. Удаление инициирует grace period 30 дней (можно отменить)
3. Через 30 дней — полное стирание данных из всех систем (Firebase, photo storage, analytics, partner systems)
4. Email confirmation после complete deletion

**Apple требует** удаление-в-app для всех новых приложений с 2022. Это и так нужно.

---

## 4. СРЕДНИЙ риск: Apple App Store / Google Play guidelines

### 4.1 App Store Review Guidelines (релевантные секции)

- **5.1.1** — Privacy: точное privacy nutrition label в App Store Connect (что собирается, кому передаётся)
- **5.1.4** — Kids Category: если попадаете в Kids — стрингент рестрикции. **Не подавайте в Kids category** — оставайтесь в Lifestyle или Health & Fitness
- **5.5** — Mobile Device Management: не относится
- **3.1.2** — Subscriptions: правила (см. п. 5)
- **1.4.1** — Physical Harm: medical apps with diagnostic features требуют дополнительной проверки. **Избегайте diagnostic features**

### 4.2 Play Store guidelines

- **Families Policy**: если targeting "primarily children" — попадаете в стрингент режим. Опять — **позиционируйтесь как parent-tool**
- **Designed for Families**: только если хотите эту значок, в основном не нужно

### 4.3 Health-app submission tip

Apple часто запрашивает доп. информацию по health apps. Готовьтесь:
- Описание методологии (Ellyn Satter — link to published works)
- Список medical/clinical advisor (имя RDN-партнёра, credentials)
- "How we ensure safety" — упоминание disclaimers и referrals to professionals

---

## 5. СРЕДНИЙ риск: Subscriptions и refunds

### 5.1 Apple/Google rules

- Trial должен быть **7 дней минимум** для credibility
- Auto-renewal disclosure: ясно показать перед оплатой
- Cancellation: easy access в app (Settings → "Manage subscription" с deeplink в iOS Settings)
- Restore purchases: button должна работать
- **Family Sharing** (Apple) — если поддерживаете семейный план, надо настроить в App Store Connect

### 5.2 Возвраты

- Apple/Google решает возвраты сами. Вы не контролируете.
- Внутри app предоставьте clear support contact: "Contact support" → mailto: или Intercom-style
- Refund-rate target: <5%. Если выше — что-то не так с onboarding/expectations.

### 5.3 Pricing rules

- Discount-обещания должны быть честны: "$59/yr (regularly $119)" → "$119" должна быть реальной non-discount цена когда-то
- Free trial должен явно превращаться в paid (no "secret" renewal)
- В EU дополнительно — 14-day right of withdrawal не действует на digital услуги после "performance" но многие компании дают refund anyway

---

## 6. НИЗКИЙ риск: Terms of Service

### 6.1 Essential clauses

1. **Acceptance** — клик "I agree" в onboarding, не buried link
2. **Service description** — что app does (parent-tracking tool, not medical)
3. **User obligations** — accurate info, no harm to others
4. **License** — limited, non-exclusive, non-transferable
5. **IP** — content (videos, exposure plans) принадлежит вам; user-generated (photos, notes) лицензируются вам для service operation
6. **Disclaimer of warranties** — "as is, as available"
7. **Limitation of liability** — capped at fees paid в последние 12 мес (но в California / EU ограничения)
8. **Indemnification** — user indemnifies вас за нарушения
9. **Termination** — вы можете прекратить service в любой момент с notice
10. **Governing law** — выберите Delaware (Delaware General Corporation Law)
11. **Dispute resolution**:
    - **Arbitration clause** — preempt class actions (важно для consumer apps)
    - Carveout для small claims court
    - **Class action waiver** — но note: некоторые юрисдикции (California consumers) могут это оспорить
    - JAMS или AAA arbitration

### 6.2 Что НЕ писать (вызовет вопросы юриста или regulator):

- "We have no liability ever for anything" — слишком broad
- "We can use your photos for marketing without permission" — нет, нужен явный opt-in
- "Children may use this app" — никогда; всегда "parent uses this for/with their child"

---

## 7. ОСОБЫЕ нюансы для Picky eater specifically

### 7.1 Если хотите partnership с pediatric clinics

- Если врачи продают подписку своим пациентам → это **HIPAA-territory**, если врач передаёт вам patient identifiable info
- Решение: clinic share только **promo code** (anonymized); patient signs up directly with you and is not identified to clinic
- Revenue share через **promo code attribution**, не patient identifiers

### 7.2 Если AI-feature на основе фото

- Photos лица детей — особо чувствительные данные
- Если AI на сервере (e.g. Claude analyzes photos) — фото уходят за periметр приложения
- Альтернативы:
  - On-device ML (Core ML / TensorFlow Lite) — никакая фото не уходит. **Рекомендуется.**
  - Если cloud-based AI — нужен extra protection: encryption in transit + at rest, retention 30 дней max, no training on user data
- **Никогда** не используйте user photos для training models без explicit consent (отдельный opt-in toggle)

### 7.3 Health information в community chat

- Родители могут делиться history "у моего сына аутизм и ARFID"
- Это **sensitive health info** (HIPAA-like, не purely COPPA)
- В Privacy Policy явно: "Community posts may contain user-shared health information. Posts are visible to other community members. Don't share what you wouldn't share publicly."
- Moderation должна удалять PII (имена детей, школы, доктора)

### 7.4 RDN-партнёр liability

- RDN партнёр — это nutritional professional с licenses. Если он даёт specific dietary advice через app → potentially treating patients in states where не имеет license
- Решение: позиционировать RDN как **content curator**, не как **treating clinician**
- Контент должен быть general educational, not "personalized advice to user X"
- В договоре с RDN — clear scope: "you provide content, you do not provide treatment to app users"

---

## 8. Чеклист до запуска

- [ ] Privacy Policy составлен профессионалом + reviewed for COPPA/CCPA/GDPR
- [ ] Terms of Service составлен (arbitration clause, class action waiver, capped liability)
- [ ] Disclaimer на medical advice — в каждом нужном месте
- [ ] In-app deletion работает (Settings → Delete account)
- [ ] Photo upload — face-detection warning
- [ ] Cookie/tracking consent для EU
- [ ] App Store privacy nutrition label заполнен правильно
- [ ] No claims в маркетинге, которые нельзя доказать
- [ ] RDN partner agreement определяет scope как "content curator"
- [ ] Apple Family Sharing настроен (если family plan)
- [ ] Support email и Intercom-like channel работают
- [ ] Insurance: **Professional Liability** ($1M policy ~$1500/year, recommended for health-adjacent apps)
- [ ] Юрист просмотрел всё (минимум: 2 hours, $800-1500)

---

## 9. Recommended legal counsel resources

- **General consumer-tech**: GreatPlains, BurkeWilliams, Vela Wood — есть startup-friendly billing
- **COPPA-specialised**: Cooley LLP, Fenwick & West (expensive but specialised)
- **DIY templates** для bootstrapped стадии: Termly, iubenda — для privacy policy auto-generation; но юрист-review всё равно нужен
- **FTC COPPA Compliance Plan**: FTC's "Six-Step Compliance Plan for COPPA" — обязательное чтение

---

## 10. Бюджет на legal на запуск

| Артефакт | Стоимость | Когда |
|---|---|---|
| Privacy Policy review by lawyer | $800-1500 | Перед launch |
| Terms of Service custom draft | $1000-2500 | Перед launch |
| COPPA compliance audit (chosen counsel) | $1500-3000 | Перед launch |
| RDN partner agreement | $500-1500 | Перед началом работы |
| App Store / Play Store submission consultation | $300-600 | Если первое отклонение |
| Annual compliance review | $1500-2500/yr | Каждый год |
| Insurance: Professional Liability | $1200-2000/yr | Перед launch |

**Total пре-запуск**: ~$5k-10k. Это нелегко, но **не делать стоит дороже**.
Штраф FTC за COPPA-нарушение начинается с $50k.

---

## 11. Что не нужно (anti-patterns)

- ❌ Стартовать без Terms of Service ("разберёмся когда вырастем") — Apple/Google не примет
- ❌ Скопировать privacy policy у Yumi / Solid Starts — у них своя специфика, не подойдёт под вашу архитектуру
- ❌ Игнорировать GDPR потому что "мы в США" — если у вас есть хотя бы 1 EU user, GDPR applies
- ❌ Использовать "AI doctor" брендинг — FDA рассматривает это как medical device
- ❌ Запускаться без disclaimer, потом добавлять — Apple/Google могут попросить вытащить app до compliance
