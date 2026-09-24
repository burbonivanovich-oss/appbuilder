// Скачивает фирменный шрифт Lab Grotesque с kontur.ru и встраивает его в src/fontData.ts
// (base64 — чтобы рендер не зависел от сетевой загрузки шрифта). Файл не коммитится.
import {writeFileSync} from 'node:fs';

const base = 'https://s.kontur.ru/common-v2/fonts/LabGrotesque/LabGrotesque-';
const weights = {400: 'Regular', 500: 'Medium', 700: 'Bold'};
const out = {};
for (const [w, name] of Object.entries(weights)) {
  const res = await fetch(`${base}${name}.woff2`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  out[w] = Buffer.from(await res.arrayBuffer()).toString('base64');
}
writeFileSync('src/fontData.ts', `export const fontData: Record<string, string> = ${JSON.stringify(out)};\n`);
console.log('src/fontData.ts written');
