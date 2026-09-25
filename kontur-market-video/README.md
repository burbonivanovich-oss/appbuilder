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
