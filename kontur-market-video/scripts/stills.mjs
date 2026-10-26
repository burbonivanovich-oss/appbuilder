// Контактный лист кадров для проверки: один бандл, один браузер, много кадров.
//   node scripts/stills.mjs <CompositionId> <out-dir> <кадр|сек s> [...]
//   node scripts/stills.mjs SignalsV2 out/check 120 12.5s 900
// Кадры сохраняются как <out-dir>/<кадр>.jpg, рядом — sheet.html (сетка для просмотра).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const [id, outDir, ...raw] = process.argv.slice(2);
if (!id || !outDir || !raw.length) {
  console.error('usage: node scripts/stills.mjs <Id> <out-dir> <frame|12.5s> ...');
  process.exit(1);
}
mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome');
const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
const frames = raw.map((r) => (r.endsWith('s') ? Math.round(parseFloat(r) * composition.fps) : parseInt(r, 10)));
const scale = Number(process.env.SCALE ?? 0.5);
for (const frame of frames) {
  const f = Math.min(frame, composition.durationInFrames - 1);
  await renderStill({serveUrl, composition, frame: f, output: path.join(outDir, `${f}.jpg`), imageFormat: 'jpeg', jpegQuality: 85, scale, puppeteerInstance: browser});
  process.stdout.write(`${f} `);
}
await browser.close({silent: true});
const cells = frames
  .map((f) => Math.min(f, composition.durationInFrames - 1))
  .map((f) => `<figure><img src="${f}.jpg"><figcaption>${f} · ${(f / composition.fps).toFixed(2)} с</figcaption></figure>`)
  .join('');
writeFileSync(
  path.join(outDir, 'sheet.html'),
  `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#222;font:14px sans-serif;color:#ddd;display:grid;grid-template-columns:repeat(${process.env.COLS ?? 3},1fr);gap:8px;padding:8px}img{width:100%;display:block}figure{margin:0}</style>${cells}`,
);
console.log(`\n${outDir}/sheet.html`);
