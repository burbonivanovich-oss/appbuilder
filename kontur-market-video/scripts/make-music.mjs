// Синтезирует бит 120 BPM (20 с) для вертикального ролика: kick, clap, hi-hat, бас и пэд.
// Всё генерируется кодом — никаких лицензий на музыку. Результат: public/beat.wav
import {writeFileSync} from 'node:fs';

const SR = 44100, BPM = 120, BEAT = 60 / BPM, DUR = 20;
const N = SR * DUR;
const buf = new Float32Array(N);
const add = (start, len, fn) => {
  const s0 = Math.floor(start * SR);
  for (let i = 0; i < len * SR && s0 + i < N; i++) buf[s0 + i] += fn(i / SR);
};
const noise = () => Math.random() * 2 - 1;
const note = (n) => 440 * 2 ** ((n - 69) / 12);

const bars = DUR / (BEAT * 4);
// Прогрессия: Am F C G (по такту)
const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const bass = [45, 41, 48, 43];

for (let bar = 0; bar < bars; bar++) {
  const t0 = bar * BEAT * 4;
  const intro = bar < 2; // первые 2 такта — напряжённое вступление
  const outro = bar === bars - 1;
  for (let b = 0; b < 4; b++) {
    const t = t0 + b * BEAT;
    // kick
    add(t, 0.35, (x) => Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-x * 30)) * x) * Math.exp(-x * 9) * 0.9);
    // clap на 2 и 4
    if (!intro && b % 2 === 1) add(t, 0.2, (x) => noise() * Math.exp(-x * 25) * 0.35);
    // hi-hat на восьмых
    for (const off of intro ? [0.5] : [0.25, 0.5, 0.75]) add(t + off * BEAT, 0.05, (x) => noise() * Math.exp(-x * 90) * 0.12);
    // бас: восьмые
    if (!intro)
      for (const off of [0, 0.5])
        add(t + off * BEAT, BEAT * 0.45, (x) => {
          const f = note(bass[bar % 4]);
          return (((x * f) % 1) * 2 - 1) * 0.22 * Math.min(1, x * 200) * Math.exp(-x * 4);
        });
  }
  // пэд: мягкая пила аккордом на весь такт
  const ch = chords[bar % 4];
  add(t0, BEAT * 4, (x) => {
    const env = Math.min(1, x * 3) * Math.min(1, (BEAT * 4 - x) * 4);
    let v = 0;
    for (const n of ch) for (const det of [-0.08, 0.08]) v += Math.sin(2 * Math.PI * note(n + 12) * (1 + det / 100) * x);
    return v * env * (intro ? 0.03 : outro ? 0.07 : 0.045);
  });
  // «вжух» перед дропом (конец 2-го такта)
  if (bar === 1) add(t0 + BEAT * 2, BEAT * 2, (x) => noise() * (x / (BEAT * 2)) ** 2 * 0.25);
}

// мягкий лимитер + fade out
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * 0.8));
  const v = Math.tanh((buf[i] / peak) * 1.4) * 0.9 * fade;
  pcm.writeInt16LE(Math.round(v * 32767), i * 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
writeFileSync('public/beat.wav', Buffer.concat([h, pcm]));
console.log('public/beat.wav written');
