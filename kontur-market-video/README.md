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
