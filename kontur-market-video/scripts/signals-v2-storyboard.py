"""Раскадровка «ИИ Бизнес сигналы» v2: страница (для публикации) + PDF.

  node scripts/signals-v2-assets.mjs 00_storyboard   # кадры → out/assets-raw/00_storyboard
  python3 scripts/signals-v2-storyboard.py           # → out/storyboard/index.html, frames/, storyboard.pdf

Заметки к кадрам — src/signals-v2/storyboard.json; голос подставляется из субтитров (src/signals-v2/subtitles.json).
"""
import html, json, os, shutil, subprocess

T = json.load(open('src/signals-v2/timeline.json'))
SB = json.load(open('src/signals-v2/storyboard.json'))
SUBS = json.load(open('src/signals-v2/subtitles.json'))
OUT = 'out/storyboard'
FPS = 30
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(f'{OUT}/frames')
for sh in SB['shots']:
    shutil.copy(f'out/assets-raw/00_storyboard/{sh["id"]}.jpg', f'{OUT}/frames/{sh["id"]}.jpg')

e = html.escape
scene_start = {s['id']: s['start'] for c in T['chapters'] for s in c['scenes']}
chapter_of = {s['id']: c for c in T['chapters'] for s in c['scenes']}


def tc(sec):
    f = round(sec * FPS)
    return f'{f // (60 * FPS):02d}:{f // FPS % 60:02d}:{f % FPS:02d}'


def mmss(sec):
    return f'{int(sec // 60)}:{int(sec % 60):02d}'


# границы кадров: перебивка — от начала главы 1,35 с; иначе от начала сцены или середины между соседними кадрами
shots = SB['shots']
for i, sh in enumerate(shots):
    c = chapter_of[sh['scene']]
    div = sh['title'].startswith('Перебивка')
    if div:
        sh['a'] = c['start']
    else:
        lo = scene_start[sh['scene']] + (1.35 if 'divider' in c and c['scenes'][0]['id'] == sh['scene'] else 0)
        prev = shots[i - 1] if i else None
        sh['a'] = max(lo, (prev['t'] + sh['t']) / 2) if prev and prev['scene'] == sh['scene'] and not prev['title'].startswith('Перебивка') else lo
for i, sh in enumerate(shots):
    sh['b'] = shots[i + 1]['a'] if i + 1 < len(shots) else T['total']
    if sh['title'].startswith('Перебивка'):
        sh['b'] = chapter_of[sh['scene']]['start'] + 1.35
# слова субтитров раскладываются по времени внутри фразы (пропорционально длине) и попадают в свой кадр
words = []
for q in SUBS:
    ws = q['text'].replace('\n', ' ').split()
    total = sum(len(w) + 1 for w in ws)
    acc = 0
    for w in ws:
        words.append((q['start'] + (q['end'] - q['start']) * (acc + len(w) / 2) / total, w))
        acc += len(w) + 1
# субтитр может начаться чуть раньше реплики — слово прижимается к началу ближайшей реплики
vo_iv = [(x['start'] + x['vo']['at'], x['start'] + x['vo']['at'] + x['vo']['dur']) for c in T['chapters'] for x in c['scenes'] if 'vo' in x]


def snap(t):
    if any(a_ <= t <= b_ for a_, b_ in vo_iv):
        return t
    nxt = [a_ for a_, _ in vo_iv if 0 < a_ - t < 0.8]
    return nxt[0] + 0.01 if nxt else t


words = [(snap(t), w) for t, w in words]
for sh in shots:
    sh['vo'] = ' '.join(w for t, w in words if sh['a'] <= t < sh['b'])

css = '''
:root{
  /* Лист раскадровки: кадр слева, заметки справа; главы — секции с линейкой времени */
  --bg:#F3F5F8; --surface:#FFFFFF; --ink:#1B2330; --muted:#5D6878; --line:#DDE3EA;
  --accent:#2291FF; --accent-ink:#0B66C9; --on-accent:#FFFFFF; --mark:#FFE27A; --mark-ink:#1B2330;
  --display:"Golos Text","Segoe UI",Arial,sans-serif; --mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#0E141E; --surface:#161F2D; --ink:#E5EAF1; --muted:#97A3B4; --line:#263245;
  --accent:#4DA3FF; --accent-ink:#8CC4FF; --on-accent:#0E141E; --mark:#5C4A00; --mark-ink:#FFF3C4; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#0E141E; --surface:#161F2D; --ink:#E5EAF1; --muted:#97A3B4; --line:#263245;
  --accent:#4DA3FF; --accent-ink:#8CC4FF; --on-accent:#0E141E; --mark:#5C4A00; --mark-ink:#FFF3C4; color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font:400 15px/1.5 var(--display);margin:0;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:40px 64px}
.wrap{max-width:1240px;margin:0 auto;display:grid;gap:40px}
h1,h2,h3{text-wrap:balance;margin:0}
h1{font-size:clamp(28px,4vw,44px);line-height:1.08;font-weight:600;letter-spacing:-.02em}
h2{font-size:26px;font-weight:600;letter-spacing:-.01em}
h3{font-size:18px;font-weight:600}
.lede{color:var(--muted);max-width:68ch;margin:12px 0 0}
.facts{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:20px;font-family:var(--mono);font-size:13px;color:var(--muted)}
.facts b{color:var(--ink);font-weight:500}
.howto{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px 24px;font-size:14px;color:var(--muted)}
.howto b{display:block;color:var(--ink);font-weight:600;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:2px}
nav{display:flex;flex-wrap:wrap;gap:8px}
nav a{display:inline-flex;gap:10px;align-items:baseline;padding:8px 14px;border:1px solid var(--line);border-radius:999px;
  color:var(--ink);text-decoration:none;background:var(--surface);font-size:14px}
nav a span{font-family:var(--mono);font-size:12px;color:var(--muted)}
nav a:hover,nav a:focus-visible{border-color:var(--accent);outline:none}
section.ch{display:grid;gap:18px;scroll-margin-top:16px}
.chhead{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px 24px;border-top:2px solid var(--ink);padding-top:14px}
.chhead .meta{font-family:var(--mono);font-size:13px;color:var(--muted)}
.ruler{position:relative;height:30px;border-bottom:1px solid var(--line)}
.ruler i{position:absolute;bottom:0;height:12px;border-left:2px solid var(--accent)}
.ruler i span{position:absolute;bottom:14px;left:-10px;font:500 11px var(--mono);color:var(--accent-ink);font-style:normal}
.ruler .vo{position:absolute;bottom:0;height:4px;background:var(--line);border-radius:2px}
.shot{display:grid;grid-template-columns:minmax(0,46fr) minmax(0,54fr);gap:22px;background:var(--surface);border:1px solid var(--line);
  border-radius:14px;padding:16px;break-inside:avoid}
.frame{position:relative;margin:0}
.frame img{display:block;width:100%;height:auto;aspect-ratio:16/9;border-radius:8px;border:1px solid var(--line);background:var(--bg)}
.frame figcaption{position:absolute;left:8px;top:8px;display:flex;gap:6px}
.tag{font:500 12px var(--mono);padding:3px 8px;border-radius:6px;background:rgba(14,20,30,.78);color:#fff}
.tag.no{background:var(--accent);color:var(--on-accent)}
.notes{display:grid;gap:10px;align-content:start;min-width:0}
.notes h3 span{font:500 12px var(--mono);color:var(--muted);margin-left:8px}
.vo{margin:0;padding:8px 12px;border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:0 8px 8px 0;font-style:italic}
.vo.empty{font-style:normal;color:var(--muted)}
dl{display:grid;grid-template-columns:96px minmax(0,1fr);gap:6px 14px;margin:0;font-size:14px}
dt{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding-top:2px}
dd{margin:0}
.assets{display:flex;flex-wrap:wrap;gap:6px}
.assets code{font:12px var(--mono);padding:2px 7px;border-radius:5px;border:1px solid var(--line);color:var(--accent-ink);word-break:break-all}
.spec{display:grid;gap:24px}
.spec .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:16px;display:grid;gap:8px;align-content:start}
.card p{margin:0;color:var(--muted);font-size:14px}
.curve{width:100%;height:auto;max-width:260px}
.curve .ax{stroke:var(--line);fill:none}
.curve .c{stroke:var(--accent);stroke-width:3;fill:none}
.curve text{fill:var(--muted);font:11px var(--mono)}
.tblwrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:500}
td.n{font-family:var(--mono);white-space:nowrap}
.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.sw div{display:flex;gap:10px;align-items:center;font-size:13px}
.sw i{width:28px;height:28px;border-radius:8px;border:1px solid var(--line);flex:none}
.sw code{font:12px var(--mono);color:var(--muted)}
footer{color:var(--muted);font-size:13px}
@media (max-width:760px){.shot{grid-template-columns:1fr}dl{grid-template-columns:1fr;gap:2px 0}dt{padding-top:6px}.ruler i span{display:none}}
@media print{
  @page{size:A4 landscape;margin:10mm}
  body{padding:0;background:#fff;font-size:12px}
  nav,.howto{display:none}
  .wrap{gap:14px;max-width:none}
  section.ch{gap:10px}
  section.ch + section.ch,.spec{break-before:page}
  .shot{break-inside:avoid;padding:10px;gap:14px;border-radius:8px;grid-template-columns:minmax(0,44fr) minmax(0,56fr)}
  dl{grid-template-columns:80px minmax(0,1fr);font-size:11px;gap:3px 10px}
  .vo{padding:5px 10px}
  .notes{gap:6px}
  .tblwrap{overflow:visible}
  .sw,.tblwrap,table,tr{break-inside:avoid}
  .vo{background:#EEF6FF}
}
'''

parts = []
P = parts.append
P('<title>Раскадровка «ИИ Бизнес сигналы»</title>\n<meta name="claude:viewport-fit-sides" content="cover">')
P('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
P('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">')
P(f'<style>{css}</style>')
P('<div class="wrap">')
P('<header><h1>Раскадровка «ИИ Бизнес сигналы»</h1>')
P('<p class="lede">ТЗ на анимацию для моушн‑дизайнера по гайду «Видео о сервисах»: по каждому кадру — что звучит, что в кадре, как движется, где акцент и какие ассеты из пакета нужны. Кадры сняты с текущей версии ролика.</p>')
P(f'<div class="facts"><span><b>{mmss(T["total"])}</b> длина</span><span><b>1920×1080</b> 30 fps</span><span><b>{len(shots)}</b> кадров</span><span><b>{len(T["chapters"])}</b> частей</span><span><b>12</b> реплик</span><span>таймкоды <b>ММ:СС:КК</b></span></div></header>')
P('<div class="howto"><div><b>Голос</b>Что говорит диктор на этом кадре — из субтитров итоговой версии.</div><div><b>В кадре</b>Композиция и тексты на экране.</div><div><b>Движение</b>Как появляется и движется; длительности в кадрах (к) при 30 fps.</div><div><b>Акцент</b>Приём выделения по гайду: зум, затенение, маркер, вынос элемента вперёд.</div><div><b>Ассеты</b>Файлы из пакета signals-v2-assets.</div></div>')
P('<nav aria-label="Части ролика">' + ''.join(f'<a href="#{c["id"]}">{i}. {e(c["title"])} <span>{mmss(c["start"])}</span></a>' for i, c in enumerate(T['chapters'], 1)) + '</nav>')

for ci, c in enumerate(T['chapters'], 1):
    a, b = c['start'], c['start'] + c['dur']
    cs = [s for s in shots if chapter_of[s['scene']]['id'] == c['id']]
    P(f'<section class="ch" id="{c["id"]}"><div class="chhead"><h2>{ci}. {e(c["title"])}</h2><span class="meta">{tc(a)} – {tc(b)} · {c["dur"]:.0f} с · part{ci}-{c["id"]}.mp4</span></div>')
    ruler = ''.join(f'<span class="vo" style="left:{(s["start"] + s["vo"]["at"] - a) / c["dur"] * 100:.2f}%;width:{s["vo"]["dur"] / c["dur"] * 100:.2f}%"></span>' for s in c['scenes'] if 'vo' in s)
    ruler += ''.join(f'<i style="left:{(s["t"] - a) / c["dur"] * 100:.2f}%"><span>{s["id"]}</span></i>' for s in cs)
    P(f'<div class="ruler" aria-hidden="true">{ruler}</div>')
    for s in cs:
        vo = f'<p class="vo">«{e(s["vo"])}»</p>' if s['vo'] else '<p class="vo empty">Без голоса</p>'
        assets = ''.join(f'<code>{e(x)}</code>' for x in s['assets'])
        P(f'''<article class="shot"><figure class="frame"><img src="frames/{s["id"]}.jpg" alt="Кадр {s["id"]}: {e(s["title"])}" loading="lazy" width="1280" height="720"><figcaption><span class="tag no">К{s["id"]}</span><span class="tag">{tc(s["a"])}–{tc(s["b"])}</span></figcaption></figure>
<div class="notes"><h3>{e(s["title"])}<span>{s["b"] - s["a"]:.1f} с</span></h3>{vo}
<dl><dt>В кадре</dt><dd>{e(s["frame"])}</dd><dt>Движение</dt><dd>{e(s["motion"])}</dd><dt>Акцент</dt><dd>{e(s["accent"])}</dd><dt>Звук</dt><dd>{e(s["sound"])}</dd><dt>Ассеты</dt><dd class="assets">{assets}</dd></dl></div></article>''')
    P('</section>')


def curve(x1, y1, x2, y2, label):
    W, H, p = 220, 150, 20
    X = lambda v: p + v * (W - 2 * p)
    Y = lambda v: H - p - v * (H - 2 * p)
    return f'<svg class="curve" viewBox="0 0 {W} {H}" role="img" aria-label="{label}"><path class="ax" d="M{X(0)} {Y(0)}H{X(1)}M{X(0)} {Y(0)}V{Y(1)}"/><path class="c" d="M{X(0)} {Y(0)}C{X(x1)} {Y(y1)} {X(x2)} {Y(y2)} {X(1)} {Y(1)}"/><text x="{X(0)}" y="{H - 4}">время</text></svg>'


def spring_curve(damping=17, stiffness=120):
    import math
    W, H, p = 220, 150, 20
    m, k, c = 1, stiffness, damping
    pts, x, v, dt = [], 0.0, 0.0, 1 / 300
    for i in range(300):
        a_ = (-k * (x - 1) - c * v) / m
        v += a_ * dt
        x += v * dt
        if i % 3 == 0:
            pts.append((p + i / 300 * (W - 2 * p), H - p - x * (H - 2 * p) * 0.85))
    d = 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    return f'<svg class="curve" viewBox="0 0 {W} {H}" role="img" aria-label="Пружина"><path class="ax" d="M{p} {H - p}H{W - p}M{p} {H - p}V{p}"/><path class="c" d="{d}"/><text x="{p}" y="{H - 4}">1 с</text></svg>'


moves = [
    ('Строка заголовка из‑под маски', '16 к', 'снизу на 105% высоты строки, шаг 5 к'),
    ('Окно интерфейса въезжает', '22 к', 'снизу на 760 px'),
    ('Вынос элемента вперёд', '≈20 к', 'пружина 17/120; ×1,15–2,2; фон размыт до 5,5 px и притенён'),
    ('Подсветка затенением', '14 к', 'притенение rgba(16,24,40,.5), рамка 3,5 px #2291FF'),
    ('Маркер по тексту', '12 к', 'прокрашивание слева направо, #FFE27A'),
    ('Боковая панель', '18 к', 'справа, страница под ней притенена'),
    ('Перебивка', '12 + 21 + 16 к', 'вход снизу, пауза, уход вверх'),
    ('Смена сцен', '12 к', 'растворение; «Как устроен сигнал» — склейка'),
    ('Курсор', '18 к переезд', 'над кнопкой рука; нажатие 0,84 / 4 к, «волна» 16 к'),
]
swatches = [('#2291FF', 'синий, фон модулей'), ('#A9D4FF', 'вторая строка на синем'), ('#F2F3F5', 'светлый фон'), ('#F2F2F2', 'страница интерфейса'),
            ('#222222', 'текст'), ('#707070', 'вторичный текст'), ('#E8F3FF', 'блоки ИИ'), ('#FFE27A', 'маркер'),
            ('#EB4D3D', 'риск'), ('#F7A21B', 'предупреждение'), ('#1FA35B', 'норма')]
P('<section class="spec" id="spec"><div class="chhead"><h2>Спецификация движения</h2><span class="meta">одинаково во всех частях</span></div><div class="grid">')
P(f'<div class="card"><h3>Камера и перемещения</h3>{curve(0.65, 0, 0.35, 1, "cubic-bezier 0.65 0 0.35 1")}<p>cubic‑bezier(0.65, 0, 0.35, 1) — в After Effects «Easy Ease» с влиянием около 65%.</p></div>')
P(f'<div class="card"><h3>Появление интерфейса</h3>{curve(0.16, 1, 0.3, 1, "cubic-bezier 0.16 1 0.3 1")}<p>cubic‑bezier(0.16, 1, 0.3, 1), 16 кадров: резкий старт, долгое торможение.</p></div>')
P(f'<div class="card"><h3>Пружина выноса</h3>{spring_curve()}<p>Затухание 14–17, жёсткость 120–140, масса 1: небольшой перелёт без дрожания.</p></div>')
P('<div class="card"><h3>Кадр и шрифт</h3><p>1920×1080, 30 fps, поля 148 px. Lab Grotesque: заголовки Medium 72–128, перебивки Medium 112, текст интерфейса в кадре 20–30, крупные цифры Bold 130–210.</p></div>')
P('</div><div class="tblwrap"><table><thead><tr><th>Движение</th><th>Длительность</th><th>Детали</th></tr></thead><tbody>')
P(''.join(f'<tr><td>{e(a)}</td><td class="n">{e(b)}</td><td>{e(c)}</td></tr>' for a, b, c in moves))
P('</tbody></table></div><div class="sw">' + ''.join(f'<div><i style="background:{h}"></i><span>{e(n)}<br><code>{h}</code></span></div>' for h, n in swatches) + '</div></section>')
P('<footer>Собрано из проекта kontur-market-video (src/signals-v2): заметки — storyboard.json, тайминг — timeline.json. Экраны интерфейса перерисованы по макетам Figma «Цифровой опердир», тестовые данные.</footer>')
P('</div>')
page = '\n'.join(parts)
json.dump([{'id': x['id'], 'title': x['title'], 'start': round(x['a'], 3), 'end': round(x['b'], 3), 'vo': x['vo']} for x in shots], open(f'{OUT}/shots.json', 'w'), ensure_ascii=False, indent=1)
open(f'{OUT}/index.html', 'w').write(page)

# PDF: та же страница в обёртке документа, печать через Chromium
open(f'{OUT}/print.html', 'w').write('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' + page.replace('<title>', '<title>', 1) + '</head></html>')
subprocess.run(['node', '-e', '''
const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.emulateMedia({colorScheme: 'light'});
  await p.goto('file://' + process.argv[1], {waitUntil: 'networkidle'});
  await p.pdf({path: process.argv[2], format: 'A4', landscape: true, printBackground: true, margin: {top: '10mm', bottom: '10mm', left: '10mm', right: '10mm'}});
  await b.close();
})();
''', os.path.abspath(f'{OUT}/print.html'), os.path.abspath(f'{OUT}/storyboard.pdf')], check=True)
os.remove(f'{OUT}/print.html')
print(f'{OUT}/index.html', len(shots), 'кадров;', f'{OUT}/storyboard.pdf', round(os.path.getsize(f"{OUT}/storyboard.pdf") / 1e6, 1), 'MB')
