import {fontData} from './fontData';

// Фирменный шрифт Контура, встроенный в бандл (npm run fetch-fonts).
// Шрифт из ArrayBuffer разбирается сразу, поэтому delayRender не нужен.
if (typeof window !== 'undefined' && 'FontFace' in window) {
  for (const [weight, b64] of Object.entries(fontData)) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    document.fonts.add(new FontFace('Lab Grotesque', bytes, {weight}));
  }
}
