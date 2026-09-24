// Минималистичный саундтрек для ролика «Комплект собирается сам»:
// мягкий пульс 100 BPM, пэд и «щелчки» точно в моменты сборки (src/kit/timeline.json).
import {readFileSync, writeFileSync} from 'node:fs';

const tl = JSON.parse(readFileSync('src/kit/timeline.json', 'utf8'));
const SR = 44100, DUR = tl.total / tl.fps, N = Math.floor(SR * DUR), BEAT = 60 / 100;
const buf = new Float32Array(N);
const add = (t, len, fn) => {
  const s0 = Math.floor(t * SR);
  for (let i = 0; i < len * SR && s0 + i < N; i++) if (s0 + i >= 0) buf[s0 + i] += fn(i / SR);
};
const noise = () => Math.random() * 2 - 1;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

// пэд: Dmaj9 → Bm9 → Gmaj7 → A
const chords = [[62, 66, 69, 76], [59, 62, 66, 73], [55, 59, 62, 66], [57, 61, 64, 69]];
const barLen = BEAT * 4;
for (let b = 0; b * barLen < DUR; b++) {
  const ch = chords[b % 4];
  add(b * barLen, barLen + 0.3, (x) => {
    const env = Math.min(1, x * 1.5) * Math.min(1, (barLen + 0.3 - x) * 3);
    let v = 0;
    for (const n of ch) v += Math.sin(2 * Math.PI * hz(n) * x) + 0.3 * Math.sin(2 * Math.PI * hz(n + 12) * x * 1.002);
    return v * env * 0.018;
  });
}
// пульс: мягкий кик и шейкер с момента появления кассы
const start = tl.kassa / tl.fps;
for (let t = start; t < DUR - 1; t += BEAT) {
  add(t, 0.3, (x) => Math.sin(2 * Math.PI * (45 + 80 * Math.exp(-x * 35)) * x) * Math.exp(-x * 12) * 0.55);
  add(t + BEAT / 2, 0.06, (x) => noise() * Math.exp(-x * 70) * 0.06);
}
// щелчки сборки: мягкий «тук» с плавной атакой и приглушённый тон
const lp = (() => { let y = 0; return (x) => (y += 0.15 * (x - y)); })(); // простой ФНЧ для шума
for (const f of tl.snaps) {
  const t = f / tl.fps;
  add(t, 0.03, (x) => lp(noise()) * Math.min(1, x * 800) * Math.exp(-x * 220) * 0.12);
  add(t, 0.35, (x) => Math.sin(2 * Math.PI * 880 * x) * Math.min(1, x * 400) * Math.exp(-x * 14) * 0.035);
  add(t, 0.2, (x) => Math.sin(2 * Math.PI * (70 + 30 * Math.exp(-x * 40)) * x) * Math.min(1, x * 300) * Math.exp(-x * 22) * 0.18);
}
// «вжух» перед каждой деталью
for (const k of ['kassa', 'fn', 'scanner', 'ofd', 'market']) {
  const t = tl[k] / tl.fps;
  add(t - 0.1, 0.5, (x) => noise() * Math.sin((Math.PI * x) / 0.5) ** 2 * 0.07);
}

let peak = 0;
for (const v of buf) peak = Math.max(peak, Math.abs(v));
const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 0.5), (N - i) / (SR * 1.5));
  pcm.writeInt16LE(Math.round(Math.tanh((buf[i] / peak) * 1.2) * 0.85 * fade * 32767), i * 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
writeFileSync('public/kit.wav', Buffer.concat([h, pcm]));
console.log('public/kit.wav written');
