# Ролик «Марк» (Remotion)

Сценарий — [SCENARIO.md](SCENARIO.md). Код — `src/MarkPromo.tsx`.

```bash
npm i
npx remotion studio src/index.ts            # превью
npx remotion render src/index.ts MarkPromo out/mark-promo.mp4
npx remotion render src/index.ts MarkPromoVertical out/mark-promo-9x16.mp4
```
Библиотеки: `@remotion/transitions` (wipe, clock-wipe, slide), `@remotion/noise`, `@remotion/paths`, `@remotion/shapes`, `@remotion/motion-blur`, `@remotion/fonts`.
