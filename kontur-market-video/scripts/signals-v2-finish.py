"""Финальная сборка «ИИ Бизнес сигналы» v2: рендер, громкость, части для сайта, главы, обложка.

  python3 scripts/signals-v2-finish.py            # рендерит то, чего ещё нет в out/signals-v2, и собирает итог
  python3 scripts/signals-v2-finish.py --force    # перерендерить всё заново

Результат в out/signals-v2/:
  signals-v2-full.mp4            полная версия (голос + музыка + звуки интерфейса)
  signals-v2-full-nomusic.mp4    та же картинка, без музыки (голос + звуки интерфейса)
  part1-how.mp4 … part5-price.mp4  части для сайта: глава + финальный кадр с заявкой
  chapters.vtt / chapters.json   главы для плеера (переход к нужной части в полной версии)
  *.vtt                          субтитры к полной версии и к каждой части
  cover.png                      обложка (заголовок + пример интерфейса, по гайду)
Громкость: −16 LUFS, пик −1,5 dBTP (веб), видео не перекодируется.
"""
import json, os, subprocess, sys

OUT = 'out/signals-v2'
os.makedirs(OUT, exist_ok=True)
T = json.load(open('src/signals-v2/timeline.json'))
force = '--force' in sys.argv


def run(cmd):
    print('$', ' '.join(cmd))
    subprocess.run(cmd, check=True)


def render(comp, out, extra=()):
    if os.path.exists(out) and not force:
        print('есть', out)
        return
    run(['npx', 'remotion', 'render', comp, out, '--concurrency=4', '--log=error', *extra])


def loudnorm(src, dst, audio=None):
    """Двухпроходная нормализация EBU R128; audio — взять звук из другого файла."""
    a_in = audio or src
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-i', a_in, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'): probe.rindex('}') + 1])
    af = f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000"
    cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src]
    if audio:
        cmd += ['-i', audio, '-map', '0:v:0', '-map', '1:a:0']
    cmd += ['-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst]
    run(cmd)


chapters = T['chapters']
render('SignalsV2', f'{OUT}/full-raw.mp4')
render('SignalsV2-nomusic', f'{OUT}/nomusic-raw.wav', ['--codec=wav'])
for i, c in enumerate(chapters, 1):
    render(f'SignalsV2-part{i}-{c["id"]}', f'{OUT}/part{i}-raw.mp4')
if force or not os.path.exists(f'{OUT}/cover.png'):
    run(['npx', 'remotion', 'still', 'SignalsV2', f'{OUT}/cover.png', '--frame=96', '--log=error'])

loudnorm(f'{OUT}/full-raw.mp4', f'{OUT}/signals-v2-full.mp4')
loudnorm(f'{OUT}/full-raw.mp4', f'{OUT}/signals-v2-full-nomusic.mp4', audio=f'{OUT}/nomusic-raw.wav')
files = []
for i, c in enumerate(chapters, 1):
    name = f'part{i}-{c["id"]}.mp4'
    loudnorm(f'{OUT}/part{i}-raw.mp4', f'{OUT}/{name}')
    files.append(name)

json.dump(
    {
        'video': 'signals-v2-full.mp4',
        'duration': T['total'],
        'chapters': [{'n': i, 'id': c['id'], 'title': c['title'], 'start': c['start'], 'end': round(c['start'] + c['dur'], 3), 'file': f} for i, (c, f) in enumerate(zip(chapters, files), 1)],
    },
    open(f'{OUT}/chapters.json', 'w'),
    ensure_ascii=False,
    indent=1,
)
subprocess.run(['cp', 'src/signals-v2/chapters.vtt', f'{OUT}/chapters.vtt'], check=True)
subprocess.run(['cp', 'src/signals-v2/subtitles.vtt', f'{OUT}/signals-v2-full.vtt'], check=True)
subs = json.load(open('src/signals-v2/subtitles.json'))


def ts(x):
    return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'


for i, c in enumerate(chapters, 1):
    a, b = c['start'], c['start'] + c['dur']
    lines = ['WEBVTT', '']
    for k, q in enumerate([q for q in subs if a - 0.3 <= q['start'] < b], 1):
        lines += [str(k), f"{ts(max(0, q['start'] - a))} --> {ts(q['end'] - a)}", q['text'], '']
    open(f'{OUT}/part{i}-{c["id"]}.vtt', 'w').write('\n'.join(lines))
print('готово:', ', '.join(sorted(os.listdir(OUT))))
