// Пакет ассетов «ИИ Бизнес сигналы» v2 для моушн‑дизайнера: слои PNG с прозрачностью.
//   node scripts/signals-v2-assets.mjs [фильтр]   → out/assets-raw/<папка>/<имя>.png
// Дальше scripts/signals-v2-pack.py обрезает элементы по альфе, собирает звук, маркеры, иконки и архив.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const T = JSON.parse(readFileSync('src/signals-v2/timeline.json', 'utf8'));
const FPS = 30;
const SC = Object.fromEntries(T.chapters.flatMap((c) => c.scenes).map((s) => [s.id, s]));
const cue = (s, k) => Math.round(SC[s].cues[k] * FPS);
const dur = (s) => Math.round(SC[s].dur * FPS);
const story = JSON.parse(readFileSync('src/signals-v2/storyboard.json', 'utf8'));

// [папка, имя, композиция, props, кадр, масштаб, формат]
const scene = (dir, name, id, mode, frame, scale = 2) => [dir, name, 'SignalsV2-scene', {scene: id, mode}, frame, scale, 'png'];
const asset = (dir, name, id, frame = 60, scale = 2) => [dir, name, 'SignalsV2-asset', {id}, frame, scale, 'png'];
const JOBS = [
  // 01 — экраны интерфейса: только окно, без камеры и акцентов, @2x
  asset('01_ui', '01_home', 'ui-home'),
  asset('01_ui', '02_hub', 'ui-hub'),
  scene('01_ui', '03_audit-dashboard', 'audit', 'window', cue('audit', 'почему') + 24),
  scene('01_ui', '04_audit-profit', 'audit', 'window', cue('audit', 'предлагает') - 2),
  scene('01_ui', '05_dupes-tab', 'dupes', 'window', cue('dupes', 'дубли') - 2),
  scene('01_ui', '06_dupes-panel', 'dupes', 'window', cue('dupes', 'Ручной') + 4),
  scene('01_ui', '07_dupes-merged', 'dupes', 'window', dur('dupes') - 3),
  scene('01_ui', '08_cz', 'marking', 'window', cue('marking', 'коды') + 14),
  scene('01_ui', '09_cz-panel', 'marking', 'window', dur('marking') - 3),
  scene('01_ui', '10_comp', 'market', 'window', cue('market', 'продаётся') - 8),
  scene('01_ui', '11_comp-panel', 'market', 'window', cue('market', 'потенциальная') - 8),
  // 02 — вынесенные вперёд элементы (кадр 1920×1080 @2x; обрезка по альфе — в pack.py)
  scene('02_hero', '01_hub-card-audit', 'modules', 'lifts', cue('modules', 'аудит') + 20),
  scene('02_hero', '02_hub-card-cz', 'modules', 'lifts', cue('modules', 'сверка') + 20),
  scene('02_hero', '03_hub-card-comp', 'modules', 'lifts', cue('modules', 'сравнение') + 20),
  scene('02_hero', '04_profit-card-chart', 'audit', 'lifts', cue('audit', 'снижение') + 30),
  scene('02_hero', '05_cause-rows', 'audit', 'lifts', cue('audit', 'товары') + 26),
  scene('02_hero', '06_ai-insight', 'audit', 'lifts', cue('audit', 'предлагает') + 70),
  scene('02_hero', '07_dupe-cards', 'dupes', 'lifts', cue('dupes', 'Пользователь') - 8),
  scene('02_hero', '08_cz-chips', 'marking', 'lifts', cue('marking', 'проверку') - 28),
  asset('02_hero', '09_signal-card-audit', 'signal-card-audit'),
  asset('02_hero', '10_signal-card-cz', 'signal-card-cz'),
  asset('02_hero', '11_signal-card-comp', 'signal-card-comp'),
  // 03 — инфографика на прозрачном фоне (весь кадр @2x)
  scene('03_graphics', '01_intro-cards', 'intro', 'graphics', dur('intro') - 2),
  scene('03_graphics', '02_data-journal', 'data', 'graphics', dur('data') - 2),
  scene('03_graphics', '03_owner-reports', 'owner', 'graphics', cue('owner', 'списаниях') + 20),
  scene('03_graphics', '04_owner-week-losses', 'owner', 'graphics', dur('owner') - 2),
  scene('03_graphics', '05_week-signal-earlier', 'chain', 'graphics', 30),
  scene('03_graphics', '06_signal-anatomy', 'chain', 'graphics', dur('chain') - 2),
  scene('03_graphics', '07_trust-schema', 'trust', 'graphics', dur('trust') - 2),
  scene('03_graphics', '08_fines-schema', 'fines', 'graphics', dur('fines') - 2),
  scene('03_graphics', '09_market-map', 'market', 'graphics', cue('market', 'Если') - 4),
  scene('03_graphics', '10_market-price-axis', 'market', 'graphics', cue('market', '15') + 30),
  scene('03_graphics', '11_market-calc', 'market', 'graphics', dur('market') - 2),
  scene('03_graphics', '12_econ-hours', 'econ', 'graphics', cue('econ', '20') + 40),
  scene('03_graphics', '13_econ-signal', 'econ', 'graphics', cue('econ', 'Стоимость') - 14),
  scene('03_graphics', '14_econ-price', 'econ', 'graphics', dur('econ') - 2),
  // 04 — упаковка по шаблонам гайда (с фоном)
  scene('04_packaging', '01_intro-cover', 'intro', 'off', dur('intro') - 2),
  ...T.chapters.filter((c) => c.divider).map((c, i) => asset('04_packaging', `0${i + 2}_divider-${c.id}`, `divider-${c.id}`, 30)),
  scene('04_packaging', '06_outro', 'cta', 'off', dur('cta') - 2),
  asset('04_packaging', '07_endcard-parts', 'endcard', 80),
  asset('04_packaging', '08_caption', 'caption', 30),
  // 00 — раскадровка: кадры ролика как в итоге (JPEG)
  ...story.shots.map((s) => ['00_storyboard', s.id, 'SignalsV2', {}, Math.round(s.t * FPS), 2 / 3, 'jpeg']),
];

const filter = process.argv[2];
const jobs = JOBS.filter(([dir, name]) => !filter || `${dir}/${name}`.includes(filter));
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome');
const cache = new Map();
for (const [dir, name, id, props, frame, scale, fmt] of jobs) {
  const key = id + JSON.stringify(props);
  if (!cache.has(key)) cache.set(key, await selectComposition({serveUrl, id, inputProps: props, puppeteerInstance: browser}));
  const composition = cache.get(key);
  const out = `out/assets-raw/${dir}/${name}.${fmt === 'jpeg' ? 'jpg' : 'png'}`;
  mkdirSync(path.dirname(out), {recursive: true});
  await renderStill({serveUrl, composition, frame: Math.min(frame, composition.durationInFrames - 1), output: out, inputProps: props, imageFormat: fmt, ...(fmt === 'jpeg' ? {jpegQuality: 88} : {}), scale, puppeteerInstance: browser});
  process.stdout.write(`${dir}/${name} `);
}
await browser.close({silent: true});
writeFileSync('out/assets-raw/jobs.json', JSON.stringify(jobs, null, 1));
console.log(`\n${jobs.length} files`);
