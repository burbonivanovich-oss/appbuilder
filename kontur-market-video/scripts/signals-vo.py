"""Озвучка роликов «ИИ Бизнес сигналы» через OpenRouter (Gemini TTS) + привязка графики к словам.

  python3 scripts/signals-vo.py                                   # полная версия: src/signals/scenario.json
  python3 scripts/signals-vo.py src/signals/cuts/short30.json     # короткая версия

Ключ: OPENROUTER_API_KEY или ~/.config/openrouter.key (в репозиторий не кладётся).
Каждая сцена озвучивается в <voDir>/<id>.wav; рядом лежит <id>.txt с текстом — если текст
не менялся, сцена не перегенерируется. Сцена без "say" — немая (длительность из "dur").
faster-whisper находит время слов‑«якорей» (cues) → <timing>.
"""
import json, os, sys, time, urllib.request, wave

SC = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'src/signals/scenario.json'
sc = json.load(open(SC))
OUT = sc.get('voDir', 'public/signals/vo')
TIMING = sc.get('timing', 'src/signals/timing.json')
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
    if not s.get('say'):
        continue
    path, txt = f"{OUT}/{s['id']}.wav", f"{OUT}/{s['id']}.txt"
    if os.path.exists(path) and os.path.exists(txt) and open(txt).read() == s['say']:
        continue
    if os.environ.get('VO_PLACEHOLDER'):
        print(f"{s['id']:10s} placeholder"); continue
    pcm = tts(s['say'])
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
    open(txt, 'w').write(s['say'])
    print(f"{s['id']:10s} {len(pcm) / 48000:5.1f}s  (new)")

from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')
timing, t = {'scenes': []}, 0.0
LEAD, TAIL = sc.get('lead', 0.5), sc.get('tail', 0.9)
norm = lambda x: x.lower().replace('ё', 'е').strip('.,:;—–-!?«»')
for s in sc['scenes']:
    if not s.get('say'):
        d = s.get('dur', 3)
        timing['scenes'].append({'id': s['id'], 'start': round(t, 2), 'dur': d, 'vo': 0, 'cues': {}})
        t += d
        continue
    path = f"{OUT}/{s['id']}.wav"
    if os.path.exists(path):
        with wave.open(path) as w:
            dur = w.getnframes() / w.getframerate()
        segs, _ = model.transcribe(path, language='ru', word_timestamps=True)
        words = [(norm(wd.word.strip()), wd.start) for sg in segs for wd in sg.words]
    else:  # черновой тайминг без озвучки (~14 символов в секунду)
        dur, words = len(s['say']) / 14, []
    cues, pos = {}, 0
    for c in s.get('cues', []):
        stem = norm(c)[:5]
        hit = next(((i, st) for i, (w_, st) in enumerate(words[pos:], pos) if w_.startswith(stem) or (c.isdigit() and c in w_)), None)
        if hit:
            pos = hit[0] + 1
            cues[c] = round(hit[1] + LEAD, 2)
        else:
            frac = max(0, s['say'].find(c)) / len(s['say'])
            cues[c] = round(LEAD + frac * dur, 2)
            print(f"  ~ cue «{c}» estimated in {s['id']}")
    scene_dur = round(LEAD + dur + TAIL + s.get('extra', 0), 2)
    timing['scenes'].append({'id': s['id'], 'start': round(t, 2), 'dur': scene_dur, 'vo': dur, 'cues': cues})
    t += scene_dur
timing['total'] = round(t, 2)
os.makedirs(os.path.dirname(TIMING), exist_ok=True)
json.dump(timing, open(TIMING, 'w'), ensure_ascii=False, indent=1)
print(TIMING, 'total', round(t, 1), 's')
