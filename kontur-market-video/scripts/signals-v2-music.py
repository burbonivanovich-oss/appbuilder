"""Музыка для «ИИ Бизнес сигналы» v2 — написана кодом под таймлайн, без лицензий.

  python3 scripts/signals-v2-music.py   → public/signals-v2/music.wav (48 кГц, стерео, −16 LUFS)

Что в ней (в отличие от старой подложки из голых синусов):
  · электропиано (FM, как Rhodes) с арпеджио по восьмым, живая динамика и сдвиги по времени;
  · мягкий пэд из расстроенных пил через фильтр, стерео;
  · саб‑бас и «полусогнутый» грув: мягкая бочка, шейкер, тихий риму;
  · маримба‑мотив на перебивках; перед каждой главой — подъём (райзер), на перебивке — вдох;
  · гармония меняется по главам (Ре мажор → си минор на «Честном знаке» → снова мажор),
    в финале — разрешение в тонику и хвост реверберации.
Сетка тактов каждой главы начинается с конца перебивки, поэтому сильные доли попадают в монтаж.
"""
import json
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
BPM = 100
BEAT = 60 / BPM
BAR = BEAT * 4
DIV = 1.35  # длительность перебивки, с
T = json.load(open('src/signals-v2/timeline.json'))
TOTAL = T['total'] + 0.5
N = int(TOTAL * SR)
rng = np.random.default_rng(11)

L = np.zeros(N)
R = np.zeros(N)
send_L = np.zeros(N)  # шина реверберации
send_R = np.zeros(N)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)


def put(sig, t0, pan=0.0, rev=0.0, gain=1.0):
    """Положить моно‑звук в микс: pan −1…1 (равная мощность), rev — посыл в реверберацию."""
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    gl, gr = np.cos(a), np.sin(a)
    L[i: i + len(sig)] += sig * gl
    R[i: i + len(sig)] += sig * gr
    if rev:
        send_L[i: i + len(sig)] += sig * gl * rev
        send_R[i: i + len(sig)] += sig * gr * rev


# ------------------------------- инструменты -------------------------------

def epiano(m, dur, vel=1.0):
    """FM‑электропиано: несущая 1:1 с убывающим индексом + «язычок» 14:1 на атаке."""
    d = dur + 1.2
    t = np.arange(int(d * SR)) / SR
    f = hz(m)
    idx = (2.3 * vel) * np.exp(-t / 0.35) + 0.4
    tine = 0.12 * vel * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.012)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t)) + tine
    y += 0.18 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.5)
    env = np.minimum(1, t / 0.003) * np.exp(-t / (1.1 + 120 / f))
    rel = np.clip((dur + 0.25 - t) / 0.25, 0, 1)
    y = y * env * rel * vel
    return lp(y, 10000)


def mallet(m, vel=1.0):
    """Маримба/колокольчик: обертоны 1 : 3.9 : 9.2 с быстрым затуханием."""
    t = np.arange(int(1.6 * SR)) / SR
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55)
    y += 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.12)
    y += 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.04)
    return y * np.minimum(1, t / 0.002) * vel


def pad(notes, dur, att=0.9, rel=1.4, bright=1400):
    """Пэд: на ноту три расстроенные пилы, фильтр, медленная атака. Возвращает (L, R)."""
    d = dur + rel
    n = int(d * SR)
    t = np.arange(n) / SR
    yl = np.zeros(n)
    yr = np.zeros(n)
    for m in notes:
        for k, det in enumerate((-7, 0, 7)):
            f = hz(m) * 2 ** (det / 1200)
            ph = (f * t + rng.random()) % 1.0
            saw = 2 * ph - 1
            if k == 0:
                yl += saw
            elif k == 2:
                yr += saw
            else:
                yl += 0.7 * saw
                yr += 0.7 * saw
    env = np.minimum(1, t / att) * np.clip((d - t) / rel, 0, 1)
    sweep = 1 + 0.25 * np.sin(2 * np.pi * t / max(d, 1))
    yl = lp(yl * env, bright, 2)
    yr = lp(yr * env, bright * sweep.mean(), 2)
    return yl / (len(notes) * 2.2), yr / (len(notes) * 2.2)


def bass(m, dur, vel=1.0):
    t = np.arange(int((dur + 0.15) * SR)) / SR
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t) + 0.06 * np.sin(2 * np.pi * 3 * f * t)
    env = np.minimum(1, t / 0.008) * np.clip((dur + 0.15 - t) / 0.15, 0, 1) * (0.75 + 0.25 * np.exp(-t / 0.25))
    return lp(y * env * vel, 900)


def kick(vel=1.0):
    t = np.arange(int(0.45 * SR)) / SR
    f = 46 + 70 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.18) * np.minimum(1, t / 0.001)
    y += 0.15 * lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)
    return y * vel


def shaker(vel=1.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    y = hp(rng.standard_normal(n), 5500) * np.minimum(1, t / 0.006) * np.exp(-t / 0.03)
    return lp(y, 11000) * vel


def rim(vel=1.0):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    y = 0.6 * np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.018)
    y += sosfilt(butter(2, [1200, 4500], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.03)
    return y * vel


def riser(d=1.6):
    n = int(d * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 512
    for i in range(0, n, hop):
        c = 300 * (12000 / 300) ** ((i / n) ** 1.6)
        seg = sosfilt(butter(1, [c * 0.7, min(c * 1.4, SR / 2 - 200)], 'bandpass', fs=SR, output='sos'), x[max(0, i - 4096): i + hop])[-hop:]
        out[i: i + len(seg)] = seg[: n - i]
    return out * (t / d) ** 2.2


def swell_sub():
    t = np.arange(int(1.2 * SR)) / SR
    f = 38 + 30 * np.exp(-t / 0.2)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5) * np.minimum(1, t / 0.01)


# --------------------------------- гармония ---------------------------------

MAJ = [  # (бас, голоса) по тактам; Ре мажор
    (38, [54, 57, 61, 64]),  # Dmaj9
    (35, [50, 54, 57, 61]),  # Bm9
    (43, [54, 57, 59, 62]),  # Gmaj7(9)
    (45, [52, 57, 59, 64]),  # A6sus2
]
MIN = [  # глава про риски: начинаем с си минора
    (35, [50, 54, 57, 61]),  # Bm9
    (43, [50, 54, 59, 62]),  # Gmaj7
    (38, [50, 54, 57, 61]),  # Dmaj7
    (45, [52, 57, 61, 64]),  # A
]
MOTIF = [(0, 81, 0.9), (0.5, 78, 0.7), (1.0, 74, 0.8), (1.5, 76, 0.75), (2.25, 81, 0.6)]  # в долях: A F# D E A
MOTIF_MIN = [(0, 78, 0.9), (0.5, 74, 0.7), (1.0, 71, 0.8), (1.5, 73, 0.75), (2.25, 78, 0.6)]  # си минор: F# D B C# F#

ch = T['chapters']
starts = [c['start'] for c in ch] + [T['total']]
cta = next(s['start'] for c in ch for s in c['scenes'] if s['id'] == 'cta')
owner = next(s['start'] for c in ch for s in c['scenes'] if s['id'] == 'owner')
chain = next(s['start'] for c in ch for s in c['scenes'] if s['id'] == 'chain')
data = next(s['start'] for c in ch for s in c['scenes'] if s['id'] == 'data')


def motif(t0, notes=MOTIF, vel=1.0):
    for b, m, v in notes:
        put(mallet(m, v * vel), t0 + b * BEAT, pan=0.25, rev=0.45, gain=0.22)


def section(t0, t1, prog, *, keys8=0.0, hats=0.0, drums=0.0, bass_on=True, pad_on=True, bright=2600):
    """Грув от t0 до t1 по одной сетке тактов от t0. keys8/hats/drums — с какой секунды включать слой
    (включается с ближайшего такта, ритм не рвётся)."""
    on = lambda since, t: since is not None and t >= since - BAR * 0.5
    bar = 0
    t = t0
    while t < t1 - 0.05:
        b, voices = prog[bar % len(prog)]
        bar_end = min(t + BAR, t1)
        dur = bar_end - t
        if pad_on:
            pl, pr = pad(voices, dur + 0.3, att=0.6, rel=1.0, bright=bright)
            i = int(t * SR)
            n = min(len(pl), N - i)
            L[i: i + n] += pl[:n] * 0.13
            R[i: i + n] += pr[:n] * 0.13
            send_L[i: i + n] += pl[:n] * 0.06
            send_R[i: i + n] += pr[:n] * 0.06
        # электропиано: арпеджио восьмыми (или четвертями)
        k8 = on(keys8, t)
        pattern = [0, 1, 2, 3, 2, 1, 2, 3] if k8 else [0, 2, 1, 3]
        step = BEAT / 2 if k8 else BEAT
        vels = [1.0, 0.55, 0.8, 0.6, 0.9, 0.55, 0.75, 0.6]
        for k, p in enumerate(pattern):
            tk = t + k * step + rng.normal(0, 0.006)
            if tk >= bar_end - 0.02:
                break
            m = voices[p] + (12 if (k == 4 and bar % 2 == 1) else 0)
            put(epiano(m, step * 1.6, vels[k % 8] * rng.uniform(0.9, 1.05)), tk, pan=-0.2 + 0.4 * (p / 3), rev=0.22, gain=0.2)
        if bass_on:
            put(bass(b, BEAT * 2.4, 0.9), t, gain=0.19)
            if t + BEAT * 2.5 < bar_end:
                put(bass(b + 12 if bar % 4 == 3 else b, BEAT * 1.3, 0.7), t + BEAT * 2.5, gain=0.17)
        if on(drums, t):
            put(kick(0.95), t, gain=0.28)
            if t + BEAT * 2 < bar_end:
                put(kick(0.8), t + BEAT * 2, gain=0.28)
            for beat in (1, 3):
                if t + beat * BEAT < bar_end:
                    put(rim(0.8), t + beat * BEAT + rng.normal(0, 0.004), pan=0.15, rev=0.3, gain=0.1)
        if on(hats, t):
            for k in range(8):
                th = t + k * BEAT / 2 + (BEAT * 0.06 if k % 2 else 0)  # лёгкий свинг
                if th < bar_end:
                    put(shaker([0.5, 0.25, 0.4, 0.25][k % 4] * rng.uniform(0.8, 1.1)), th, pan=0.35, rev=0.1, gain=0.22)
        t += BAR
        bar += 1


# 0:00 заставка: пэд набирается, мотив
pl, pr = pad(MAJ[0][1], data + 0.6, att=1.6, rel=1.2, bright=2200)
L[: len(pl)] += pl[:N] * 0.18
R[: len(pr)] += pr[:N] * 0.18
motif(0.35)
put(swell_sub(), 0.3, gain=0.15)

# глава 1: клавиши и бас, шейкер с «собственника», бочка с «как устроен сигнал»
section(data, starts[1], MAJ, keys8=owner, hats=owner, drums=chain)

PROGS = [None, MAJ, MIN, MAJ, MAJ]
for i in range(1, len(ch)):
    s0, s1 = starts[i], starts[i + 1]
    # подъём к перебивке и вдох на ней
    r = riser(1.6)
    put(r, s0 - 1.6, pan=-0.2, rev=0.3, gain=0.07)
    put(swell_sub(), s0, gain=0.16)
    pl, pr = pad(PROGS[i][0][1], DIV + 0.4, att=0.25, rel=0.8, bright=2800)
    j = int(s0 * SR)
    n = min(len(pl), N - j)
    L[j: j + n] += pl[:n] * 0.17
    R[j: j + n] += pr[:n] * 0.17
    motif(s0 + 0.1, notes=MOTIF_MIN if PROGS[i] is MIN else MOTIF, vel=0.9)
    end = cta if i == len(ch) - 1 else s1
    section(s0 + DIV, end, PROGS[i], bright=2800 if i != 2 else 2200)

# финал: разрешение в тонику, мотив, хвост
put(riser(1.2), cta - 1.2, gain=0.05)
pl, pr = pad([50, 54, 57, 61, 64], TOTAL - cta, att=0.3, rel=3.0, bright=2600)
j = int(cta * SR)
n = min(len(pl), N - j)
L[j: j + n] += pl[:n] * 0.2
R[j: j + n] += pr[:n] * 0.2
put(bass(38, 3.5, 0.9), cta, gain=0.2)
put(kick(0.9), cta, gain=0.26)
for k, m in enumerate([62, 66, 69, 73, 76]):
    put(epiano(m, 3.0, 0.8 - k * 0.08), cta + k * 0.09, pan=-0.3 + k * 0.15, rev=0.35, gain=0.14)
motif(cta + 2.4, vel=0.8)

# ------------------------------- обработка шины -------------------------------

def reverb(x, seed, dur=2.4):
    g = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    ir = g.standard_normal(n) * np.exp(-t / (dur / 6.9) * 1.0)
    ir = lp(hp(ir, 180), 7000)
    ir[: int(0.012 * SR)] = 0  # предзадержка
    ir /= np.sqrt(np.sum(ir ** 2))
    return fftconvolve(x, ir)[: len(x)]


L += reverb(send_L, 1) * 0.9
R += reverb(send_R, 2) * 0.9
mix = np.stack([L, R], axis=1)
mix = hp(mix.T, 32).T
# наклон АЧХ: +3 дБ «воздуха» выше 3 кГц
mix = mix + 0.41 * hp(mix.T, 3000, 1).T

# мягкая компрессия по RMS (ratio 2:1)
rms = np.sqrt(lp(np.mean(mix ** 2, axis=1), 6, 1) + 1e-12)
db = 20 * np.log10(rms)
thr = np.percentile(db, 75)
gain_db = np.where(db > thr, (thr - db) * 0.5, 0)
mix *= (10 ** (gain_db / 20))[:, None]

# громкость −16 LUFS и мягкий лимитер
meter = pyln.Meter(SR)
mix *= 10 ** ((-16 - meter.integrated_loudness(mix)) / 20)
mix = np.tanh(mix / 0.89) * 0.89
fade_in = np.minimum(1, np.arange(N) / (0.02 * SR))
mix *= fade_in[:, None]
sf.write('public/signals-v2/music.wav', mix.astype(np.float32), SR, subtype='PCM_16')
print('music', round(N / SR, 1), 's, LUFS', round(meter.integrated_loudness(mix), 1), 'peak', round(20 * np.log10(np.max(np.abs(mix))), 1), 'dBFS')
