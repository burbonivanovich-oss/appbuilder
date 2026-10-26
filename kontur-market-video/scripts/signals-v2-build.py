"""Сборка таймлайна «ИИ Бизнес сигналы v2»: монтаж реплик + время слов‑якорей + главы.

  python3 scripts/signals-v2-build.py                 # из src/signals-v2/script.json

Что делает:
  1. Берёт реплики из voSrc (первая версия, Gemini TTS), режет по `trim`, срезает тишину
     по краям, выравнивает громкость (lufs) и пишет 48 кГц WAV в voOut.
  2. По распознанным словам (asr.json, faster-whisper word_timestamps) находит время cues.
     Нет asr.json или новая реплика — распознаёт сама.
  3. Пишет timeline.json (главы → сцены → старт, длительность, реплика, cues в секундах)
     chapters.vtt (главы для плеера на сайте) и subtitles.vtt (субтитры по тексту реплик).

Заменить голос на запись диктора: положить <id>.wav в voSrc (по одному файлу на реплику,
имена — как в script.json), удалить asr.json и запустить скрипт заново — тайминги,
якоря анимации и главы пересчитаются сами.
"""
import json, os, sys
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from math import gcd
from scipy.signal import resample_poly

SC = sys.argv[1] if len(sys.argv) > 1 else 'src/signals-v2/script.json'
sc = json.load(open(SC))
SR = 48000
os.makedirs(sc['voOut'], exist_ok=True)
asr = json.load(open(sc['asr'])) if os.path.exists(sc['asr']) else {}
norm = lambda x: x.lower().replace('ё', 'е').strip('.,:;—–-!?«»"\' ')
meter = pyln.Meter(SR)


def load(path):
    a, sr = sf.read(path, dtype='float32')
    if a.ndim > 1:
        a = a.mean(1)
    if sr != SR:
        g = gcd(SR, sr)
        a = resample_poly(a, SR // g, sr // g).astype('float32')
    return a


def recognize(name, path):
    if name in asr:
        return asr[name]['words']
    from faster_whisper import WhisperModel
    model = WhisperModel('medium', device='cpu', compute_type='int8')
    a = load(path)
    a16 = resample_poly(a, 1, 3).astype('float32')
    segs, _ = model.transcribe(a16, language='ru', word_timestamps=True)
    words = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in s.words]
    asr[name] = {'dur': round(len(a) / SR, 2), 'words': words}
    json.dump(asr, open(sc['asr'], 'w'), ensure_ascii=False, indent=0)
    return words


def speech_edges(a, thr_db=-42):
    """Первый и последний 10‑мс блок громче порога."""
    w = SR // 100
    n = len(a) // w
    rms = np.sqrt(np.mean(a[: n * w].reshape(n, w) ** 2, axis=1) + 1e-12)
    on = np.where(20 * np.log10(rms) > thr_db)[0]
    return (on[0] * w, (on[-1] + 1) * w) if len(on) else (0, len(a))


timeline = {'fps': 30, 'chapters': []}
t = 0.0
for ch in sc['chapters']:
    c = {'id': ch['id'], 'title': ch['title'], 'start': round(t, 3), 'scenes': []}
    if 'divider' in ch:
        c['divider'] = ch['divider']
    for s in ch['scenes']:
        scene = {'id': s['id'], 'start': round(t, 3), 'cues': {}}
        if 'vo' not in s:
            scene['dur'] = s['dur']
            t += s['dur']
            c['scenes'].append(scene)
            continue
        src = f"{sc['voSrc']}/{s['vo']}.wav"
        a = load(src)
        words = recognize(s['vo'], src)
        t0, t1 = s.get('trim', [0, None])
        i0 = int(t0 * SR)
        i1 = int(t1 * SR) if t1 else len(a)
        seg = a[i0:i1]
        e0, e1 = speech_edges(seg)
        e0 = max(0, e0 - int(0.06 * SR))
        e1 = min(len(seg), e1 + int(0.06 * SR))
        seg = seg[e0:e1].copy()
        fade = int(0.008 * SR)
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        gain = 10 ** ((sc['lufs'] - meter.integrated_loudness(seg)) / 20)
        seg = np.clip(seg * gain, -0.99, 0.99)
        sf.write(f"{sc['voOut']}/{s['id']}.wav", seg, SR, subtype='PCM_16')
        vo_dur = len(seg) / SR
        offset = t0 + e0 / SR  # секунда исходника, с которой начинается смонтированная реплика
        pre = s.get('pre', 0.0)
        pos = 0
        for key in s.get('cues', []):
            if '@' in key:  # явное время от начала реплики: «три@0»
                k, _, at = key.partition('@')
                scene['cues'][k] = round(pre + float(at), 3)
                continue
            k, _, wd = key.partition('=') if '=' in key else (key, '', key)
            stem = norm(wd)[:6]
            hit = None
            for i in range(pos, len(words)):
                w = norm(words[i][0])
                if words[i][2] < offset + 0.05:
                    continue
                if w.startswith(stem) or (wd.isdigit() and wd in w):
                    hit = i
                    break
            if hit is None:
                print(f'  ! cue «{wd}» не найден в {s["id"]}')
                continue
            pos = hit + 1
            scene['cues'][k] = round(pre + max(0, words[hit][1] - offset), 3)
        dur = pre + vo_dur + s.get('post', sc['gap'])
        scene.update({'dur': round(dur, 3), 'vo': {'at': pre, 'dur': round(vo_dur, 3)}})
        t += dur
        c['scenes'].append(scene)
        scene['_words'] = [(w[0], w[1] - offset + pre) for w in words if w[2] > offset + 0.05 and w[1] < offset + vo_dur]
        heard = ' '.join(w[0] for w in words if offset - 0.05 <= w[1] <= offset + vo_dur)
        print(f"{s['id']:8s} {vo_dur:5.2f}s  {heard[:90]}")
    c['dur'] = round(t - c['start'], 3)
    timeline['chapters'].append(c)
timeline['total'] = round(t, 3)


def chunks(text, limit=84):
    """Реплика → титры по ≤ 2 строки × 42 знака, режем по знакам препинания."""
    parts = [x.strip() for x in __import__('re').split(r'(?<=[.,:;—])\s+', text) if x.strip()]
    out, cur = [], ''
    for x in parts:
        if cur and len(cur) + 1 + len(x) > limit:
            out.append(cur)
            cur = x
        else:
            cur = f'{cur} {x}'.strip()
    out.append(cur)
    return out


def two_lines(x, w=42):
    if len(x) <= w:
        return x
    cut = x.rfind(' ', 0, len(x) // 2 + 8)
    return x[:cut] + '\n' + x[cut + 1:]


subs = []
say = {s['id']: s.get('say') for c in sc['chapters'] for s in c['scenes']}
for c in timeline['chapters']:
    for s in c['scenes']:
        words = s.pop('_words', None)
        text = say.get(s['id'])
        if not words or not text:
            continue
        # время по доле символов: положение куска в тексте ↔ положение в распознанных словах
        lens = [len(w[0]) + 1 for w in words]
        tot = sum(lens)
        acc = [sum(lens[:i]) / tot for i in range(len(words))]
        at = lambda frac: next((words[i][1] for i in range(len(words)) if acc[i] >= frac - 1e-6), words[-1][1])
        cs = chunks(text)
        pos = 0
        starts = []
        for ch in cs:
            starts.append(s['start'] + at(pos / len(text)))
            pos += len(ch) + 1
        end = s['start'] + s['vo']['at'] + s['vo']['dur']
        for i, ch in enumerate(cs):
            subs.append({'start': round(starts[i], 2), 'end': round((starts[i + 1] - 0.04) if i + 1 < len(cs) else end + 0.2, 2), 'text': two_lines(ch)})
for a_, b_ in zip(subs, subs[1:]):
    a_['end'] = round(min(a_['end'], b_['start'] - 0.04), 2)
json.dump(subs, open(os.path.join(os.path.dirname(sc['timeline']), 'subtitles.json'), 'w'), ensure_ascii=False, indent=0)
json.dump(timeline, open(sc['timeline'], 'w'), ensure_ascii=False, indent=1)


def ts(x):
    return f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'


vtt = ['WEBVTT', '']
for i, c in enumerate(timeline['chapters'], 1):
    vtt += [str(i), f"{ts(c['start'])} --> {ts(c['start'] + c['dur'])}", c['title'], '']
open(os.path.join(os.path.dirname(sc['timeline']), 'chapters.vtt'), 'w').write('\n'.join(vtt))
sub = ['WEBVTT', '']
for i, q in enumerate(subs, 1):
    sub += [str(i), f"{ts(q['start'])} --> {ts(q['end'])}", q['text'], '']
open(os.path.join(os.path.dirname(sc['timeline']), 'subtitles.vtt'), 'w').write('\n'.join(sub))
print(f"total {t:.1f}s ·", ' · '.join(f"{c['title']} {c['start']:.1f}" for c in timeline['chapters']))
