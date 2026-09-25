// Тихая музыкальная подложка под голос: мягкие аккорды без ударных. node scripts/make-bed.mjs <сек> <файл>
import {writeFileSync} from 'node:fs';
const DUR = Number(process.argv[2] ?? 60), OUT = process.argv[3] ?? 'public/bed.wav';
const SR = 44100, N = Math.floor(SR * DUR), buf = new Float32Array(N);
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const chords = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 52, 55, 62], [55, 59, 62, 69]];
const bar = 4.8;
for (let b = 0; b * bar < DUR; b++) {
  const ch = chords[b % 4], s0 = Math.floor(b * bar * SR), len = Math.floor((bar + 1) * SR);
  for (let i = 0; i < len && s0 + i < N; i++) {
    const x = i / SR, env = Math.min(1, x / 1.2) * Math.min(1, (bar + 1 - x) / 1.2);
    let v = 0;
    for (const n of ch) v += Math.sin(2 * Math.PI * hz(n) * x) * 0.6 + Math.sin(2 * Math.PI * hz(n + 12) * x * 1.003) * 0.15;
    // лёгкое «пианино» на первой доле
    v += Math.sin(2 * Math.PI * hz(ch[0] + 12) * x) * Math.exp(-x * 2.5) * 1.2;
    buf[s0 + i] += v * env;
  }
}
let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, i / (SR * 2), (N - i) / (SR * 3));
  pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.8 * fade * 32767), i * 2);
}
const h = Buffer.alloc(44);
h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
writeFileSync(OUT, Buffer.concat([h, pcm]));
console.log(OUT);
