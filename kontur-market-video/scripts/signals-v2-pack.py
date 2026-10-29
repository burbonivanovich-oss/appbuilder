"""Пакет ассетов «ИИ Бизнес сигналы» v2 для моушн‑дизайнера.

  node scripts/signals-v2-assets.mjs          # сначала: слои PNG и раздельные дорожки → out/assets-raw
  python3 scripts/signals-v2-pack.py          # → out/signals-v2-assets/ и два архива рядом

Что внутри пакета — в README.md, который скрипт кладёт в корень пакета.
"""
import csv, json, os, re, shutil, subprocess, zipfile
import numpy as np
import soundfile as sf
from PIL import Image

RAW = 'out/assets-raw'
OUT = 'out/signals-v2-assets'
FPS = 30
T = json.load(open('src/signals-v2/timeline.json'))
S = json.load(open('src/signals-v2/script.json'))
SB = json.load(open('src/signals-v2/storyboard.json'))
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)


def tc(sec):
    f = round(sec * FPS)
    return f'{f // (3600 * FPS):02d}:{f // (60 * FPS) % 60:02d}:{f // FPS % 60:02d}:{f % FPS:02d}'


def copy(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy(src, dst)


# ----------------------------- 00 раскадровка -----------------------------
for f in sorted(os.listdir(f'{RAW}/00_storyboard')):
    copy(f'{RAW}/00_storyboard/{f}', f'{OUT}/00_storyboard/frames/{f}')
for f in ['index.html', 'storyboard.pdf', 'shots.json']:
    if os.path.exists(f'out/storyboard/{f}'):
        copy(f'out/storyboard/{f}', f'{OUT}/00_storyboard/{f}')
if os.path.exists('out/storyboard/index.html'):
    shutil.rmtree(f'{OUT}/00_storyboard/frames')
    shutil.copytree('out/storyboard/frames', f'{OUT}/00_storyboard/frames')

# ----------------------------- 01 экраны -----------------------------
for f in sorted(os.listdir(f'{RAW}/01_ui')):
    copy(f'{RAW}/01_ui/{f}', f'{OUT}/01_ui/{f}')

# ----------------------------- 02 вынесенные элементы: обрезка по альфе + координаты в кадре
place = {}
PAD = 80  # запас под тень, px @2x
for f in sorted(os.listdir(f'{RAW}/02_hero')):
    im = Image.open(f'{RAW}/02_hero/{f}')
    a = np.array(im.getchannel('A'))
    ys, xs = np.where(a > 2)
    x0, y0 = int(max(0, xs.min() - PAD)), int(max(0, ys.min() - PAD))
    x1, y1 = int(min(im.width, xs.max() + PAD)), int(min(im.height, ys.max() + PAD))
    os.makedirs(f'{OUT}/02_hero', exist_ok=True)
    im.crop((x0, y0, x1, y1)).save(f'{OUT}/02_hero/{f}', optimize=True)
    full = im.width == 3840
    place[f] = {'w': x1 - x0, 'h': y1 - y0, 'scale': 2, **({'x_in_1080p': x0 / 2, 'y_in_1080p': y0 / 2} if full else {})}
json.dump(place, open(f'{OUT}/02_hero/placement.json', 'w'), ensure_ascii=False, indent=1)

# ----------------------------- 03 графика, 04 упаковка -----------------------------
for d in ['03_graphics', '04_packaging']:
    for f in sorted(os.listdir(f'{RAW}/{d}')):
        im = Image.open(f'{RAW}/{d}/{f}')
        if f.startswith('08_caption'):  # подпись — по размеру плашки
            a = np.array(im.getchannel('A'))
            ys, xs = np.where(a > 2)
            im = im.crop((max(0, xs.min() - 60), max(0, ys.min() - 60), xs.max() + 60, ys.max() + 60))
        os.makedirs(f'{OUT}/{d}', exist_ok=True)
        im.save(f'{OUT}/{d}/{f}', optimize=True)

# ----------------------------- 05 иконки и логотипы (SVG) -----------------------------
kit = open('src/signals-v2/kit.tsx', encoding='utf8').read()
paths = dict(re.findall(r"^\s+(\w+): '([^']+)',$", kit[kit.index('const P: Record'): kit.index('export const Ico')], re.M))
os.makedirs(f'{OUT}/05_icons/ui', exist_ok=True)
for name, d in paths.items():
    open(f'{OUT}/05_icons/ui/{name}.svg', 'w').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#222222" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="{d}"/></svg>\n'
    )
arrow = re.search(r"const ARROW = '([^']+)'", kit).group(1)
hand = re.search(r"const HAND = '([^']+)'", kit).group(1)
open(f'{OUT}/05_icons/cursor-arrow.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="{arrow}" fill="#222222" stroke="#FFFFFF" stroke-width="1.4" stroke-linejoin="round"/></svg>\n')
open(f'{OUT}/05_icons/cursor-hand.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="{hand}" fill="#FFFFFF" stroke="#222222" stroke-width="1.4" stroke-linejoin="round"/></svg>\n')
for f in ['public/signals/ai-icon.svg', 'public/logo-market-32.svg', 'public/logo-kontur-32.svg']:
    copy(f, f'{OUT}/05_icons/{os.path.basename(f)}')

# ----------------------------- 06 звук -----------------------------
A = f'{OUT}/06_audio'
os.makedirs(f'{A}/stems', exist_ok=True)
for n in ['voice', 'sfx', 'music-mix']:
    a, sr = sf.read(f'{RAW}/stems/{n}.wav', dtype='int16')
    if n in ('voice', 'sfx') and a.ndim == 2:
        a = a.mean(1).astype('int16')  # голос и звуки интерфейса — моно (каналы одинаковые)
    sf.write(f'{A}/stems/{n}.wav', a, sr, subtype='PCM_16')
copy('public/signals-v2/music.wav', f'{A}/stems/music-raw.wav')
vo_lines = []
for c in T['chapters']:
    for s in c['scenes']:
        if 'vo' in s:
            copy(f'public/signals-v2/vo/{s["id"]}.wav', f'{A}/vo-lines/{s["id"]}.wav')
            vo_lines.append((s['id'], round(s['start'] + s['vo']['at'], 3), s['vo']['dur']))
for f in sorted(os.listdir('public/signals-v2/sfx')):
    copy(f'public/signals-v2/sfx/{f}', f'{A}/sfx/{f}')

# ----------------------------- 07 тайминг и маркеры -----------------------------
os.makedirs(f'{OUT}/07_timing', exist_ok=True)
markers = []
for c in T['chapters']:
    markers.append((c['start'], 'глава', c['id'], c['title']))
    if 'divider' in c:
        markers.append((c['start'], 'перебивка', c['id'], f'{c["divider"]["light"]} / {c["divider"]["title"]}'))
    for s in c['scenes']:
        markers.append((s['start'], 'сцена', s['id'], s['id']))
        if 'vo' in s:
            markers.append((s['start'] + s['vo']['at'], 'голос', s['id'], f'{s["id"]}.wav'))
        for k, v in s['cues'].items():
            markers.append((s['start'] + v, 'слово', s['id'], k))
for sh in json.load(open('out/storyboard/shots.json')):
    markers.append((sh['start'], 'кадр', '', f'{sh["id"]} {sh["title"]}'))
markers.sort(key=lambda m: (m[0], m[1]))
with open(f'{OUT}/07_timing/markers.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh, delimiter=';')
    w.writerow(['секунда', 'таймкод (30 fps)', 'кадр', 'тип', 'сцена', 'метка'])
    for t, kind, scene, label in markers:
        w.writerow([f'{t:.3f}'.replace('.', ','), tc(t), round(t * FPS), kind, scene, label])
for f in ['timeline.json', 'storyboard.json', 'chapters.vtt', 'subtitles.vtt', 'script.json']:
    copy(f'src/signals-v2/{f}', f'{OUT}/07_timing/{f}')

# ----------------------------- 08 After Effects -----------------------------
def js(s):
    return json.dumps(s, ensure_ascii=False)


frames = sorted(os.listdir(f'{OUT}/00_storyboard/frames'))
RANGES = {x['id']: x for x in json.load(open('out/storyboard/shots.json'))}
shots = [(RANGES[sh['id']]['start'], f'00_storyboard/frames/{sh["id"]}.jpg', f'{sh["id"]} {sh["title"]}') for sh in SB['shots'] if f'{sh["id"]}.jpg' in frames]
jsx = f'''// «ИИ Бизнес сигналы» v2 — стартовый проект для After Effects.
// File → Scripts → Run Script File… → этот файл. Скрипт должен лежать в папке 08_ae распакованного пакета.
// Создаёт композицию 1920×1080, 30 fps, {T["total"]:.2f} с: дорожки звука, реплики голоса (выключены — для перестановки),
// кадры раскадровки и референс‑видео как направляющие слои, маркеры глав, сцен, слов и кадров на нулевом слое.
// Скрипт не проверен в After Effects: если что‑то не импортируется, сообщение покажет, какой файл.
(function () {{
  var root = new File($.fileName).parent.parent;
  var DUR = {T["total"]:.3f};
  if (!app.project) app.newProject();
  app.beginUndoGroup("ИИ Бизнес сигналы — импорт");
  var proj = app.project;
  var folder = proj.items.addFolder("ИИ Бизнес сигналы v2");
  function sub(name) {{ var f = proj.items.addFolder(name); f.parentFolder = folder; return f; }}
  var fAudio = sub("Звук"), fVo = sub("Реплики"), fSb = sub("Раскадровка"), fRef = sub("Референс");
  function imp(rel, parent) {{
    var file = new File(root.fsName + "/" + rel);
    if (!file.exists) {{ alert("Нет файла: " + rel); return null; }}
    var item = proj.importFile(new ImportOptions(file));
    item.parentFolder = parent;
    return item;
  }}
  var comp = proj.items.addComp("SignalsV2_1920x1080_30", 1920, 1080, 1, DUR, 30);
  comp.parentFolder = folder;

  var ref = imp("00_reference/signals-v2-full.mp4", fRef);
  if (ref) {{ var r = comp.layers.add(ref); r.guideLayer = true; r.audioEnabled = false; r.name = "РЕФЕРЕНС (итоговый ролик)"; r.enabled = false; }}

  var sb = {js(shots)};
  for (var i = 0; i < sb.length; i++) {{
    var it = imp(sb[i][1], fSb);
    if (!it) continue;
    var end = i + 1 < sb.length ? sb[i + 1][0] : DUR;
    var L = comp.layers.add(it, end - sb[i][0]);
    L.startTime = sb[i][0];
    L.guideLayer = true;
    L.name = "кадр " + sb[i][2];
    L.property("ADBE Transform Group").property("ADBE Scale").setValue([150, 150]);
  }}

  var vo = {js(vo_lines)};
  for (var v = 0; v < vo.length; v++) {{
    var a = imp("06_audio/vo-lines/" + vo[v][0] + ".wav", fVo);
    if (!a) continue;
    var V = comp.layers.add(a);
    V.startTime = vo[v][1];
    V.audioEnabled = false;
    V.name = "реплика " + vo[v][0];
  }}

  var stems = [["06_audio/stems/music-mix.wav", "Музыка (с приглушением под голос)"], ["06_audio/stems/sfx.wav", "Звуки интерфейса"], ["06_audio/stems/voice.wav", "Голос"]];
  for (var s = 0; s < stems.length; s++) {{
    var st = imp(stems[s][0], fAudio);
    if (st) {{ var S = comp.layers.add(st); S.name = stems[s][1]; }}
  }}

  var marks = {js([(round(m[0], 3), f'{m[1]}: {m[3]}') for m in markers])};
  var nul = comp.layers.addNull(DUR);
  nul.name = "МАРКЕРЫ";
  nul.guideLayer = true;
  var mp = nul.property("ADBE Marker");
  for (var m = 0; m < marks.length; m++) mp.setValueAtTime(marks[m][0], new MarkerValue(marks[m][1]));

  comp.openInViewer();
  app.endUndoGroup();
}})();
'''
os.makedirs(f'{OUT}/08_ae', exist_ok=True)
open(f'{OUT}/08_ae/import_signals.jsx', 'w', encoding='utf-8-sig').write(jsx)

# ----------------------------- референс -----------------------------
copy('out/signals-v2/signals-v2-full.mp4', f'{OUT}/00_reference/signals-v2-full.mp4')

# ----------------------------- README -----------------------------
shutil.copy('scripts/signals-v2-pack-readme.md', f'{OUT}/README.md')

# ----------------------------- архивы -----------------------------
def zipdir(name, parts):
    z = f'out/{name}.zip'
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for p in parts:
            base = f'{OUT}/{p}'
            if os.path.isfile(base):
                zf.write(base, f'signals-v2-assets/{p}')
                continue
            for dp, _, fs in os.walk(base):
                for f in sorted(fs):
                    full = os.path.join(dp, f)
                    zf.write(full, 'signals-v2-assets/' + os.path.relpath(full, OUT))
    print(z, round(os.path.getsize(z) / 1e6, 1), 'MB')


zipdir('signals-v2-assets-visual', ['README.md', '00_storyboard', '01_ui', '02_hero', '03_graphics', '04_packaging', '05_icons', '07_timing', '08_ae'])
zipdir('signals-v2-assets-audio-ref', ['README.md', '00_reference', '06_audio'])
n = sum(len(fs) for _, _, fs in os.walk(OUT))
print(OUT, n, 'files')
