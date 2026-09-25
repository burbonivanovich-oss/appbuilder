"""Озвучка ролика офлайн‑моделью Silero TTS v4 (русский).

  python3 scripts/make-vo.py voice/kit.json xenia public/kit-vo-xenia.wav 25

Реплики и их тайминги — в JSON (`at` — секунда старта, `ssml` — текст с интонацией:
<prosody pitch/rate>, <break>, ударение через «+»). Модель скачивается один раз в ~/.cache.
Голоса: xenia, baya, kseniya (жен.), aidar, eugene (муж.).
"""
import json, os, sys, urllib.request, wave
import numpy as np
import torch

src, speaker, out, total = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
cache = os.path.expanduser('~/.cache/silero/v4_ru.pt')
if not os.path.exists(cache):
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    urllib.request.urlretrieve('https://models.silero.ai/models/tts/ru/v4_ru.pt', cache)
model = torch.package.PackageImporter(cache).load_pickle('tts_models', 'model')

SR = 48000
track = np.zeros(int(SR * total), dtype=np.float32)
for line in json.load(open(src)):
    a = model.apply_tts(ssml_text=f"<speak>{line['ssml']}</speak>", speaker=speaker, sample_rate=SR, put_accent=True, put_yo=True).numpy()
    a = a / (np.abs(a).max() + 1e-9) * 0.9
    s = int(line['at'] * SR)
    end = min(len(track), s + len(a))
    track[s:end] += a[: end - s]
    print(f"{line['at']:5.1f}s  {len(a) / SR:4.2f}s  {line['ssml'][:60]}")

# мягкое «радио»-уплотнение и нормализация
track = np.tanh(track * 1.3) / np.tanh(1.3)
pcm = (np.clip(track, -1, 1) * 32767 * 0.9).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('written', out)
