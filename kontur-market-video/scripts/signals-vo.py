"""Озвучка «ИИ Бизнес сигналы» через OpenRouter (Gemini TTS) + привязка графики к словам.

  OPENROUTER_API_KEY=... python3 scripts/signals-vo.py            # все сцены
  python3 scripts/signals-vo.py --only audit,fines                  # перегенерировать часть

Ключ берётся из OPENROUTER_API_KEY или ~/.config/openrouter.key (в репозиторий не кладётся).
Каждая сцена озвучивается отдельно (public/signals/vo/<id>.wav), затем faster-whisper
находит время слов‑«якорей» (cues), и всё пишется в src/signals/timing.json.
"""
import json, os, sys, time, urllib.request, wave

SC = 'src/signals/scenario.json'
OUT = 'public/signals/vo'
sc = json.load(open(SC))
only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
key = os.environ.get('OPENROUTER_API_KEY') or open(os.path.expanduser('~/.config/openrouter.key')).read().strip()
os.makedirs(OUT, exist_ok=True)

def tts(text):
    body = json.dumps({'model': 'google/gemini-3.8-flash-lite-tts', 'voice': sc['voice'], 'instructions': sc['instructions'], 'input': text, 'response_format': 'pcm'}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request('https://openrouter.ai/api/v1/audio/speech', body, {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
            return urllib.request.urlopen(req, timeout=180).read()
        except Exception as e:
            print('  retry', attempt + 1, e); time.sleep(2 ** attempt)
    raise RuntimeError('TTS failed')

for s in sc['scenes']:
    path = f"{OUT}/{s['id']}.wav"
    if only and s['id'] not in only and os.path.exists(path):
        continue
    pcm = tts(s['say'])
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    print(f"{s['id']:8s} {len(pcm) / 48000:5.1f}s")

from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')
timing, t = {'scenes': []}, 0.0
LEAD, TAIL = 0.5, 0.9
for s in sc['scenes']:
    path = f"{OUT}/{s['id']}.wav"
    with wave.open(path) as w:
        dur = w.getnframes() / w.getframerate()
    segs, _ = model.transcribe(path, language='ru', word_timestamps=True)
    norm = lambda x: x.lower().replace('ё', 'е').strip('.,:;—–-!?«»')
    words = [(norm(wd.word.strip()), wd.start) for sg in segs for wd in sg.words]
    cues, pos = {}, 0
    for c in s.get('cues', []):
        stem = norm(c)[:5]
        hit = next(((i, st) for i, (w_, st) in enumerate(words[pos:], pos) if w_.startswith(stem) or (c.isdigit() and c in w_)), None)
        if hit:
            pos = hit[0] + 1
            cues[c] = round(hit[1] + LEAD, 2)
        else:
            # запасной вариант: позиция слова в тексте пропорционально длительности
            frac = s['say'].find(c) / len(s['say'])
            cues[c] = round(LEAD + frac * dur, 2)
            print(f"  ~ cue «{c}» estimated in {s['id']}")
    scene_dur = round(LEAD + dur + TAIL, 2)
    timing['scenes'].append({'id': s['id'], 'start': round(t, 2), 'dur': scene_dur, 'vo': dur, 'cues': cues})
    t += scene_dur
timing['total'] = round(t, 2)
json.dump(timing, open('src/signals/timing.json', 'w'), ensure_ascii=False, indent=1)
print('total', round(t, 1), 's')
