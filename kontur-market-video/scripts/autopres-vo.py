"""Автопрезентация: озвучивает сценарий и считает тайминги слайдов.

  python3 scripts/autopres-vo.py src/autopres/ofd-stats.json

Берёт реплики в порядке показа (реплика слайда, затем реплики пунктов/фокусов),
синтезирует их Silero TTS, склеивает с паузами в public/autopres/<name>.wav
и пишет <name>.timing.json: когда начинается каждая реплика. Композиция AutoPres
по этим таймингам сама расставляет слайды и появление элементов.
"""
import json, os, sys, urllib.request, wave
import numpy as np
import torch

src = sys.argv[1]
name = os.path.splitext(os.path.basename(src))[0]
sc = json.load(open(src))
cache = os.path.expanduser('~/.cache/silero/v4_ru.pt')
if not os.path.exists(cache):
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    urllib.request.urlretrieve('https://models.silero.ai/models/tts/ru/v4_ru.pt', cache)
model = torch.package.PackageImporter(cache).load_pickle('tts_models', 'model')
SR = 48000
GAP, SLIDE_GAP, LEAD, TAIL = 0.3, 0.7, 0.8, 1.5

chunks, timing, t = [], [], LEAD
chunks.append(np.zeros(int(LEAD * SR), np.float32))
for si, slide in enumerate(sc['slides']):
    head = [slide['say']] if slide.get('say') else []
    lines = head + [x['say'] for x in slide.get('items', []) + slide.get('focus', [])]
    starts = []
    for li, text in enumerate(lines):
        a = model.apply_tts(text=text, speaker=sc.get('voice', 'xenia'), sample_rate=SR, put_accent=True, put_yo=True).numpy()
        a = (a / (np.abs(a).max() + 1e-9) * 0.9).astype(np.float32)
        starts.append(round(t, 3))
        gap = SLIDE_GAP if li == len(lines) - 1 else GAP
        chunks += [a, np.zeros(int(gap * SR), np.float32)]
        t += len(a) / SR + gap
        print(f'{starts[-1]:6.2f}s  {text}')
    timing.append({'start': starts[0], 'items': starts[len(head):]})
chunks.append(np.zeros(int(TAIL * SR), np.float32))
t += TAIL
track = np.concatenate(chunks)
os.makedirs('public/autopres', exist_ok=True)
with wave.open(f'public/autopres/{name}.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(track, -1, 1) * 32767).astype('<i2').tobytes())
json.dump({'total': round(t, 3), 'starts': timing}, open(f'src/autopres/{name}.timing.json', 'w'), indent=1)
print('total', round(t, 2), 's')
