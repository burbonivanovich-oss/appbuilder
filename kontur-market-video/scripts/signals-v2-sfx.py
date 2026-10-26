"""Звуки интерфейса для «ИИ Бизнес сигналы» v2 — синтез, без чужих сэмплов и лицензий.

  python3 scripts/signals-v2-sfx.py   → public/signals-v2/sfx/*.wav

Все звуки короткие и мягкие: плавная атака, без жёстких верхов — под голос, а не поверх него.
"""
import os
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

SR = 48000
OUT = 'public/signals-v2/sfx'
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.002, d=0.05):
    x = np.arange(n) / SR
    return np.minimum(1, x / a) * np.exp(-x / d)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def save(name, x, peak=0.7):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    fade = int(0.004 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)
    sf.write(f'{OUT}/{name}.wav', x.astype(np.float32), SR, subtype='PCM_16')
    print(name, round(len(x) / SR, 2), 's')


def room(x, mix=0.18, dur=0.35):
    """Короткая «комната»: свёртка с затухающим шумом."""
    n = int(SR * dur)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / (dur / 5))
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.convolve(x, ir)
    dry = np.concatenate([x, np.zeros(len(wet) - len(x))])
    return dry + mix * wet


# клик мыши: короткий щелчок + мягкое «тело»
n = int(SR * 0.09)
x = bp(rng.standard_normal(n), 1800, 5200) * env(n, 0.0004, 0.004)
x += 0.5 * np.sin(2 * np.pi * 1450 * t(0.09)) * env(n, 0.0006, 0.012)
x += 0.35 * np.sin(2 * np.pi * 210 * t(0.09)) * env(n, 0.001, 0.02)
save('click', room(x, 0.12, 0.2), 0.6)

# тик: лёгкая отметка (подсветка, появление строки)
n = int(SR * 0.08)
x = 0.8 * np.sin(2 * np.pi * 2350 * t(0.08)) * env(n, 0.0008, 0.010)
x += 0.4 * np.sin(2 * np.pi * 3520 * t(0.08)) * env(n, 0.0008, 0.006)
x += 0.3 * bp(rng.standard_normal(n), 3000, 7000) * env(n, 0.0003, 0.003)
save('tick', room(x, 0.15, 0.25), 0.45)

# поп: появление карточки (тон падает)
d = 0.16
n = int(SR * d)
fr = 520 * np.exp(-t(d) / 0.05) + 330
ph = 2 * np.pi * np.cumsum(fr) / SR
x = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * env(n, 0.003, 0.05)
save('pop', room(x, 0.2, 0.3), 0.55)

# звон сигнала: две мягкие «колокольные» ноты (до и соль), неровные обертоны
d = 1.6
x = np.zeros(int(SR * d))
for f0, delay, amp in [(1046.5, 0.0, 1.0), (1568.0, 0.075, 0.8)]:
    s = int(delay * SR)
    tt = t(d - delay)
    note = np.zeros_like(tt)
    for ratio, a, dec in [(1, 1, 0.55), (2.0, 0.35, 0.3), (2.76, 0.18, 0.18), (5.4, 0.06, 0.08)]:
        note += a * np.sin(2 * np.pi * f0 * ratio * tt) * np.exp(-tt / dec)
    note *= np.minimum(1, tt / 0.004)
    x[s:] += amp * note
save('chime', room(lp(x, 7000), 0.35, 0.9), 0.5)


def whoosh(d, f_lo, f_hi, peak_at=0.55):
    n = int(SR * d)
    noise = rng.standard_normal(n)
    # розовый шум (−3 дБ/окт) через накопление с утечкой
    pink = lp(noise, 4000, 1)
    out = np.zeros(n)
    hop = 256
    pos = np.arange(n) / n
    cf = f_lo * (f_hi / f_lo) ** np.sin(np.pi * np.clip(pos / peak_at * 0.5, 0, 1))
    for i in range(0, n, hop):
        c = cf[i]
        seg = bp(pink[max(0, i - 2048): i + hop], c * 0.6, min(c * 1.6, SR / 2 - 100), 1)[-hop:]
        out[i: i + len(seg)] = seg[: n - i]
    a = np.sin(np.pi * np.clip(pos, 0, 1)) ** 1.5
    a *= np.minimum(1, pos / peak_at) ** 0.5
    return out * a


save('whoosh', room(whoosh(0.55, 300, 2200), 0.25, 0.5), 0.55)
save('swipe', room(whoosh(0.32, 600, 3200, 0.4), 0.2, 0.3), 0.5)

# печать: серия тихих щелчков клавиш
d = 1.0
x = np.zeros(int(SR * d))
pos = 0.0
while pos < d - 0.06:
    s = int(pos * SR)
    k = int(SR * 0.03)
    click = bp(rng.standard_normal(k), 2000, 6000) * env(k, 0.0003, 0.004) * rng.uniform(0.5, 1)
    click += 0.3 * np.sin(2 * np.pi * rng.uniform(900, 1300) * t(0.03)) * env(k, 0.0005, 0.006)
    x[s: s + k] += click
    pos += rng.uniform(0.055, 0.1)
save('type', room(x, 0.1, 0.2), 0.4)
