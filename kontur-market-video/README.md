# Контур.Маркет — рекламный ролик «Кассы и ОФД» (Remotion)

Сценарий: [SCENARIO.md](SCENARIO.md).

```bash
npm install
npm run fetch-fonts   # скачивает Lab Grotesque с kontur.ru и встраивает в src/fontData.ts
npm run studio        # превью и правки
npm run render        # → out/kassa-ofd.mp4
```

- `src/theme.ts` — цвета бренда, сайт, телефон.
- `src/scenes.tsx` — 8 сцен; `src/KassaOFD.tsx` — тайминг и переходы.
- `public/` — логотипы, иконки, фото касс и экраны ОФД с kontur.ru.

## Автопрезентации (`src/autopres`)

Ролики в стиле автопрезентаций Контура собираются из сценария в JSON:

1. Опишите слайды в `src/autopres/<name>.json`. Типы слайдов: `intro`, `hero`, `bullets` (пункты с иконками и фото), `grid` (пункты в две колонки), `ui` (скриншот с подсветкой блоков `focus`), `outro`. У каждого слайда, пункта и фокуса есть реплика `say`.
2. `python3 scripts/autopres-vo.py src/autopres/<name>.json` синтезирует голос и пишет тайминги в `<name>.timing.json`.
3. Слайды и появление пунктов автоматически встают под голос: `npm run autopres:render`.

## «ИИ Бизнес сигналы» v2 (`src/signals-v2`) — сервисное видео по гайду

Переделка ролика после дизайн‑ревью: интерфейс перерисован в коде по макетам Figma и анимирован,
подсветка по гайду (зум, затенение, маркер Multiply), перебивки по модулям, своя музыка, 5 частей для сайта.

```bash
npm run fetch-fonts
python3 scripts/signals-v2-build.py   # реплики → timeline.json (главы, сцены, время слов‑якорей), chapters.vtt
python3 scripts/signals-v2-sfx.py     # звуки интерфейса → public/signals-v2/sfx
python3 scripts/signals-v2-music.py   # музыка под таймлайн → public/signals-v2/music.wav
npx remotion studio                   # папка SignalsV2: полная версия, без музыки, part1…part5
python3 scripts/signals-v2-finish.py  # рендер + −16 LUFS + части + главы + обложка → out/signals-v2
python3 scripts/signals-v2-docx.py    # сценарий v2 с текстом для диктора → Сценарий_ИИ_Бизнес_сигналы_v2.docx
```

- `script.json` — главы и сцены: какая реплика, где резать (`trim`), слова‑якоря для анимации (`cues`).
- `kit.tsx` — приёмы: `Spot` (затенение с «окном»), `Marker`/`Mark` (маркер), `Cursor` (стрелка, над кнопкой — рука),
  `CountUp`, `Typewriter`, `Caption`, `Head` (заголовок по шаблону: Medium, поля `SAFE` = 148 px), `Sfx`.
- `market-ui.tsx` — интерфейс Маркета (меню, карточки, вкладки, панели, вывод ИИ) и `Screen`: синий фон + окно + камера,
  которая не даёт краю окна оборваться посреди кадра, с размытием при быстрых перелётах. `Lift` — вынос элемента
  интерфейса вперёд (копия вылетает из окна, растёт, может раскрыться подробностями), `focus` у `Screen` размывает экран за ним.
- `scenes-how.tsx`, `scenes-modules.tsx`, `scenes-final.tsx` — сцены; `scenes.tsx` — карта id → компонент.
- Голос заменить записью диктора: файлы `public/signals/vo/<id>.wav` (имена и тексты — в сценарии v2), удалить
  `src/signals-v2/asr.json`, запустить `signals-v2-build.py` — анимация подстроится под новые длины.
- Проверка кадров: `node scripts/stills.mjs SignalsV2 out/check 12.5s 40s 900` → `out/check/sheet.html`.

### Раскадровка и пакет ассетов для моушн‑дизайнера

```bash
node scripts/signals-v2-assets.mjs          # слои PNG @2x (экраны, вынесенные элементы, графика, упаковка) и кадры раскадровки
                                             # + раздельные дорожки: npx remotion render SignalsV2 x.wav --codec=wav --props='{"music":false,"sfx":false}'
python3 scripts/signals-v2-storyboard.py    # раскадровка: out/storyboard/index.html + storyboard.pdf (заметки — src/signals-v2/storyboard.json)
python3 scripts/signals-v2-pack.py          # пакет out/signals-v2-assets + архивы visual / audio-ref (README пакета — scripts/signals-v2-pack-readme.md)
```

Слои рендерятся теми же сценами, что и ролик, в режимах `AssetCtx` (kit.tsx): `window` — только окно интерфейса без камеры,
затемнений и курсора; `lifts` — только вынесенные элементы; `graphics` — сцена без фона, курсора и подписей.
Композиции `SignalsV2-scene` (сцена в режиме ассета) и `SignalsV2-asset` (отдельный элемент) — в `src/signals-v2/assets.tsx`.
