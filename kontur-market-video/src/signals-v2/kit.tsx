import React from 'react';
import {Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {font} from '../theme';

/*
 * Общие приёмы ролика «ИИ Бизнес сигналы» v2 (по гайду «Видео о сервисах»):
 * зум камеры, подсветка затемнением (Spot), выделение маркером (Mark), анимация интерфейса.
 */

export const FPS = 30;
export const s2f = (s: number) => Math.round(s * FPS);

export const C = {
  blue: '#2291FF',
  blueDeep: '#0B74E5',
  sky: '#51ADFF',
  onBlue: '#A9D4FF', // второй цвет текста на синем (как в перебивках гайда)
  mist: '#E8F3FF',
  ink: '#222222',
  gray: '#707070',
  gray2: '#9B9B9B',
  line: '#E4E4E4',
  page: '#F2F2F2',
  bg: '#F2F3F5',
  white: '#FFFFFF',
  red: '#EB4D3D',
  redText: '#C42B1E',
  redBg: '#FFE8E5',
  orange: '#F7A21B',
  orangeText: '#8A4B00',
  orangeBg: '#FFEAD7',
  green: '#1FA35B',
  greenText: '#13804A',
  greenBg: '#E2F5EA',
  marker: '#FFE27A',
};
export {font};

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.65, 0, 0.35, 1); // камера, перемещения
export const out = Easing.bezier(0.16, 1, 0.3, 1); // появление элементов интерфейса
export const lerp = (f: number, a: number, b: number, x = 0, y = 1, e: (t: number) => number = out) =>
  interpolate(f, [a, b], [x, y], {...clamp, easing: e});
export const spr = (f: number, at: number, damping = 16, stiffness = 140) => spring({frame: f - at, fps: FPS, config: {damping, stiffness}});

/* 151350 → «151 350» (обычные пробелы: в шрифте нет узкого неразрывного) */
export const fmt = (n: number, digits = 0) => {
  const s = Math.abs(n).toFixed(digits).replace('.', ',');
  const [i, d] = s.split(',');
  return (n < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d ? ',' + d : '');
};

/* ---------------------------------- текст ---------------------------------- */

/* Строка выезжает снизу из‑под маски */
export const Reveal: React.FC<{at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; out?: number}> = ({at, dur = 16, children, style, out: o}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + dur);
  const q = o === undefined ? 0 : lerp(f, o, o + 12, 0, 1, ease);
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em', ...style}}>
      <div style={{transform: `translateY(${(1 - p) * 105 - q * 105}%)`, opacity: Math.min(p * 1.4, 1 - q)}}>{children}</div>
    </div>
  );
};

export const CountUp: React.FC<{from?: number; to: number; at: number; dur?: number; digits?: number; prefix?: string; suffix?: string}> = ({from = 0, to, at, dur = 24, digits = 0, prefix = '', suffix = ''}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + dur], [from, to], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <span style={{fontVariantNumeric: 'tabular-nums'}}>
      {prefix}
      {fmt(v, digits)}
      {suffix}
    </span>
  );
};

/* Маркер по тексту: фон «прокрашивается» слева направо, переносы строк поддерживаются */
export const Mark: React.FC<{at: number; color?: string; dur?: number; children: React.ReactNode}> = ({at, color = C.marker, dur = 12, children}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + dur, 0, 1, ease);
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${color}, ${color})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${p * 100}% 100%`,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        borderRadius: 6,
        padding: '0 4px',
        margin: '0 -4px',
      }}
    >
      {children}
    </span>
  );
};

/* Печать текста: сегменты могут нести маркер */
export type Seg = {t: string; mark?: {at: number; color?: string}; b?: boolean};
export const Typewriter: React.FC<{segs: Seg[]; at: number; cps?: number; caret?: boolean}> = ({segs, at, cps = 55, caret = true}) => {
  const f = useCurrentFrame();
  let left = Math.max(0, ((f - at) / FPS) * cps);
  const total = segs.reduce((a, s) => a + s.t.length, 0);
  const done = left >= total;
  return (
    <>
      {segs.map((s, i) => {
        const n = Math.min(s.t.length, Math.floor(left));
        left -= n;
        if (n <= 0) return null;
        const text = s.t.slice(0, n);
        const node = s.b ? <b style={{fontWeight: 700}}>{text}</b> : text;
        return s.mark ? (
          <Mark key={i} at={s.mark.at} color={s.mark.color}>
            {node}
          </Mark>
        ) : (
          <React.Fragment key={i}>{node}</React.Fragment>
        );
      })}
      {caret && f >= at && !done && <span style={{display: 'inline-block', width: 3, height: '1em', background: C.blue, marginLeft: 2, verticalAlign: '-0.12em'}} />}
    </>
  );
};

/* ------------------------------ камера и фокус ----------------------------- */

/* Ключ камеры: точка (x, y) слоя ставится в центр кадра (cx, cy) с масштабом s */
export type CamKey = {at: number; s: number; x: number; y: number};
export const camAt = (f: number, keys: CamKey[]) => {
  let last = -Infinity;
  const k = keys.map((q) => {
    const at = Math.max(q.at, last + 1);
    last = at;
    return {...q, at};
  });
  if (k.length === 1) return k[0];
  const fr = k.map((q) => q.at);
  const p = (key: 's' | 'x' | 'y') => interpolate(f, fr, k.map((q) => q[key]), {...clamp, easing: ease});
  return {at: f, s: p('s'), x: p('x'), y: p('y')};
};
export const Cam: React.FC<{keys: CamKey[]; cx?: number; cy?: number; children: React.ReactNode}> = ({keys, cx = 960, cy = 540, children}) => {
  const f = useCurrentFrame();
  const {s, x, y} = camAt(f, keys);
  return <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${cx - x * s}px, ${cy - y * s}px) scale(${s})`}}>{children}</div>;
};

/* Подсветка за счёт затенения остального интерфейса (координаты слоя).
   Фазы идут подряд; если в соседних фазах одинаковое число областей, рамка плавно переезжает. */
export type Rect = {x: number; y: number; w: number; h: number; r?: number};
export type SpotPhase = {from: number; to?: number; rects: Rect[]};
export const Spot: React.FC<{phases: SpotPhase[]; w: number; h: number; dim?: number; ring?: boolean}> = ({phases, w, h, dim = 0.5, ring = true}) => {
  const f = useCurrentFrame();
  const T = 14;
  let i = -1;
  for (let k = 0; k < phases.length; k++) if (f >= phases[k].from) i = k;
  if (i < 0) return null;
  const ph = phases[i];
  const end = ph.to ?? 1e9;
  const prev = i > 0 ? phases[i - 1] : null;
  const contiguous = prev && (prev.to ?? 1e9) >= ph.from - 1;
  let rects = ph.rects;
  let a = lerp(f, ph.from, ph.from + T, 0, 1, ease);
  if (contiguous && prev) {
    a = 1;
    if (prev.rects.length === ph.rects.length) {
      const t = lerp(f, ph.from, ph.from + T + 4, 0, 1, ease);
      rects = ph.rects.map((r, k) => {
        const q = prev.rects[k];
        return {x: q.x + (r.x - q.x) * t, y: q.y + (r.y - q.y) * t, w: q.w + (r.w - q.w) * t, h: q.h + (r.h - q.h) * t, r: r.r};
      });
    }
  }
  a *= 1 - lerp(f, end, end + T, 0, 1, ease);
  if (a <= 0) return null;
  const pad = 10 + (1 - a) * 18;
  const hole = (r: Rect) => {
    const x = r.x - pad;
    const y = r.y - pad;
    const ww = r.w + pad * 2;
    const hh = r.h + pad * 2;
    const rr = Math.min((r.r ?? 18) + pad * 0.6, ww / 2, hh / 2);
    return `M ${x + rr} ${y} H ${x + ww - rr} A ${rr} ${rr} 0 0 1 ${x + ww} ${y + rr} V ${y + hh - rr} A ${rr} ${rr} 0 0 1 ${x + ww - rr} ${y + hh} H ${x + rr} A ${rr} ${rr} 0 0 1 ${x} ${y + hh - rr} V ${y + rr} A ${rr} ${rr} 0 0 1 ${x + rr} ${y} Z`;
  };
  const d = `M -4000 -4000 H ${w + 4000} V ${h + 4000} H -4000 Z ` + rects.map(hole).join(' ');
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
      <path d={d} fill={`rgba(16, 24, 40, ${dim * a})`} fillRule="evenodd" />
      {ring && rects.map((r, k) => <path key={k} d={hole(r)} fill="none" stroke={C.blue} strokeWidth={3.5} opacity={a} />)}
    </svg>
  );
};

/* Выделение цветом с наложением Multiply */
export const Marker: React.FC<{x: number; y: number; w: number; h: number; at: number; until?: number; color?: string; r?: number}> = ({x, y, w, h, at, until = 1e9, color = C.marker, r = 8}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 12, 0, 1, ease);
  const o = 1 - lerp(f, until, until + 10);
  if (p <= 0 || o <= 0) return null;
  return <div style={{position: 'absolute', left: x, top: y, width: w * p, height: h, background: color, mixBlendMode: 'multiply', borderRadius: r, opacity: o}} />;
};

/* Курсор: едет по точкам, нажимает с «волной» */
export type CurPt = {x: number; y: number; at: number; click?: boolean};
export const cursorAt = (f: number, path: CurPt[], move = 18) => {
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (f >= b.at - move) {
      const t = interpolate(f, [b.at - move, b.at], [0, 1], {...clamp, easing: ease});
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    }
  }
  return {x, y};
};
const ARROW = 'M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z';
// указательный палец (как системный курсор над ссылкой)
const HAND = 'M8.6 2.2c.9 0 1.6.7 1.6 1.6v6.3l.5-.1c.9-.1 1.6.5 1.7 1.3v.4l.5-.1c.9-.1 1.6.5 1.7 1.3l.1.5.4-.1c.9-.1 1.6.6 1.7 1.4l.3 3.2c.2 1.9-.4 3.7-1.7 5l-.6.6H9.7l-4.4-4.9c-.6-.7-.6-1.8.1-2.4.7-.6 1.7-.5 2.3.1l.8.9V3.8c0-.9.7-1.6 1.6-1.6z';
/* Реалистичный курсор: стрелка, над кликабельным — рука; нажатие с «волной» */
export const Cursor: React.FC<{path: CurPt[]; size?: number; hideAt?: number}> = ({path, size = 40, hideAt = 1e9}) => {
  const f = useCurrentFrame();
  const show = lerp(f, path[0].at - 10, path[0].at) * (1 - lerp(f, hideAt, hideAt + 8));
  if (show <= 0) return null;
  const {x, y} = cursorAt(f, path);
  const clickAt = path.filter((p) => p.click && f >= p.at - 3).map((p) => p.at).pop();
  const press = clickAt !== undefined && Math.abs(f - clickAt) < 4 ? 0.84 : 1;
  const r = clickAt !== undefined ? lerp(f, clickAt, clickAt + 16, 0, 1, Easing.out(Easing.quad)) : 1;
  const hand = path.some((p) => p.click && f >= p.at - 9 && f <= p.at + 12);
  return (
    <>
      {r < 1 && <div style={{position: 'absolute', left: x - 34 * r, top: y - 34 * r, width: 68 * r, height: 68 * r, borderRadius: '50%', background: 'rgba(34,145,255,0.22)', border: `2.5px solid ${C.blue}`, opacity: 1 - r}} />}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{position: 'absolute', left: x - size * (hand ? 0.36 : 0.17), top: y - size * (hand ? 0.09 : 0.08), opacity: show, transform: `scale(${press})`, transformOrigin: hand ? '36% 9%' : '17% 8%', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.28))'}}>
        <path d={hand ? HAND : ARROW} fill={hand ? '#fff' : C.ink} stroke={hand ? C.ink : '#fff'} strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </>
  );
};
/* Наведение и нажатие кнопки, на которой стоит курсор: 0..1 */
export const hoverP = (f: number, from: number, to = 1e9) => lerp(f, from - 6, from, 0, 1) * (1 - lerp(f, to, to + 6));
export const pressP = (f: number, at: number) => (f >= at - 2 && f < at + 5 ? 1 : 0);

/* ---------------------------------- звук ----------------------------------- */

export type SfxName = 'click' | 'whoosh' | 'pop' | 'chime' | 'tick' | 'swipe' | 'type';
const SFX_VOL: Record<SfxName, number> = {click: 0.5, whoosh: 0.32, pop: 0.38, chime: 0.3, tick: 0.25, swipe: 0.3, type: 0.18};
export const Sfx: React.FC<{at: number; name: SfxName; vol?: number}> = ({at, name, vol = 1}) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={FPS * 3} layout="none">
    <Audio src={staticFile(`signals-v2/sfx/${name}.wav`)} volume={SFX_VOL[name] * vol} />
  </Sequence>
);

/* --------------------------------- значки ---------------------------------- */

export const AiIcon: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => <Img src={staticFile('signals/ai-icon.svg')} style={{width: size, height: size, display: 'block', ...style}} />;

const P: Record<string, string> = {
  home: 'M4 10.5 12 4l8 6.5V20h-5v-5.5h-6V20H4z',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 15.5h6',
  box: 'M12 3 20 7.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9',
  truck: 'M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7M7 18.5a1.6 1.6 0 1 0 0-.01M17.5 18.5a1.6 1.6 0 1 0 0-.01',
  journal: 'M6 3h12v18H6zM9 7.5h6M9 11h6M9 14.5h4',
  register: 'M5 9h14v11H5zM8 9V4h8v5M8 13h2M11 13h2M14 13h2M8 16.5h8',
  chart: 'M4 20h16M7 16.5V11M11.5 16.5V7M16 16.5v-4',
  people: 'M9 11a3 3 0 1 0 0-.01M3.5 19.5c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M16 10.5a2.5 2.5 0 1 0 0-.01M15.5 14.6c2.6-.2 4.4 1.3 5 4.4',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5h4',
  shield: 'M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6zM9 12l2.2 2.2L15.5 10',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
  wallet: 'M4 7h15v12H4zM4 7l11-3v3M15 13h4',
  check: 'M5 12.5 10 17.5 19 7',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  right: 'M5 12h14M13 6l6 6-6 6',
  upRight: 'M7 17 17 7M9 7h8v8',
  downRight: 'M7 7l10 10M17 9v8H9',
  equal: 'M5 9h14M5 15h14',
  close: 'M6 6l12 12M18 6 6 18',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20',
  store: 'M4 9.5 5.5 4h13L20 9.5M4 9.5h16v.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 10zM5.5 12.5V20h13v-7.5M10 20v-4.5h4V20',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
  code: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2',
  alert: 'M12 4 21 19.5H3zM12 10v4.5M12 17.2v.3',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  tag: 'M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5zM8 8.5a.5.5 0 1 0 0-.01',
  hourglass: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  ruble: 'M8 20V4h5.5a4 4 0 0 1 0 8H6M6 15.5h8',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  database: 'M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3',
  cloud: 'M7 18.5h10.5a4 4 0 0 0 .5-8 6 6 0 0 0-11.6-1.2A4.6 4.6 0 0 0 7 18.5z',
  scan: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10',
  percent: 'M18 6 6 18M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};
export const Ico: React.FC<{n: keyof typeof P | string; size?: number; color?: string; sw?: number; style?: React.CSSProperties}> = ({n, size = 24, color = C.ink, sw = 1.6, style}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{display: 'block', flexShrink: 0, ...style}}>
    <path d={P[n] ?? ''} />
  </svg>
);

/* ---------------------------- мелкие элементы ------------------------------ */

export const Dot: React.FC<{color: string; size?: number; pulse?: number}> = ({color, size = 12, pulse}) => {
  const f = useCurrentFrame();
  const k = pulse === undefined ? 0 : ((f - pulse) % 40) / 40;
  return (
    <span style={{position: 'relative', display: 'inline-block', width: size, height: size, flexShrink: 0}}>
      {pulse !== undefined && f >= pulse && <span style={{position: 'absolute', inset: -size * k, borderRadius: '50%', background: color, opacity: 0.35 * (1 - k)}} />}
      <span style={{position: 'absolute', inset: 0, borderRadius: '50%', background: color}} />
    </span>
  );
};

export const Pill: React.FC<{children: React.ReactNode; color?: string; bg?: string; size?: number; style?: React.CSSProperties}> = ({children, color = C.ink, bg = C.page, size = 22, style}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: size * 0.4, fontFamily: font, fontWeight: 500, fontSize: size, lineHeight: 1.2, color, background: bg, padding: `${size * 0.32}px ${size * 0.66}px`, borderRadius: 999, whiteSpace: 'nowrap', ...style}}>{children}</span>
);

export type Tone = 'red' | 'orange' | 'green' | 'blue' | 'gray';
export const TONE: Record<Tone, {c: string; t: string; bg: string}> = {
  red: {c: C.red, t: C.redText, bg: C.redBg},
  orange: {c: C.orange, t: C.orangeText, bg: C.orangeBg},
  green: {c: C.green, t: C.greenText, bg: C.greenBg},
  blue: {c: C.blue, t: C.blueDeep, bg: C.mist},
  gray: {c: C.gray2, t: C.gray, bg: C.page},
};
export const Tag: React.FC<{tone: Tone; children: React.ReactNode; size?: number; style?: React.CSSProperties}> = ({tone, children, size = 19, style}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font, fontWeight: 500, fontSize: size, color: TONE[tone].t, background: TONE[tone].bg, padding: `${size * 0.22}px ${size * 0.55}px`, borderRadius: 8, whiteSpace: 'nowrap', ...style}}>{children}</span>
);

/* Поля по шаблону гайда: контент в 148 px от краёв */
export const SAFE = 148;
/* Заголовок по шаблону гайда: Medium, строки проявляются снизу, вторая строка — акцентным цветом */
export const Head: React.FC<{lines: {t: React.ReactNode; at: number; color?: string; out?: number}[]; size?: number; x?: number; y?: number; width?: number}> = ({lines, size = 88, x = SAFE, y = SAFE - 20, width}) => (
  <div style={{position: 'absolute', left: x, top: y, width, fontFamily: font, fontWeight: 500, fontSize: size, lineHeight: 1.08, letterSpacing: -size * 0.025, color: C.ink}}>
    {lines.map((l, i) => (
      <Reveal key={i} at={l.at} out={l.out} style={{color: l.color}}>
        {l.t}
      </Reveal>
    ))}
  </div>
);

/* Сноска‑дисклеймер внизу кадра */
export const Footnote: React.FC<{at: number; children: React.ReactNode; color?: string; left?: number; right?: number; bottom?: number}> = ({at, children, color = C.gray, left = 148, right = 148, bottom = 60}) => {
  const f = useCurrentFrame();
  const o = lerp(f, at, at + 14);
  return <div style={{position: 'absolute', left, right, bottom, fontFamily: font, fontSize: 22, lineHeight: 1.35, color, opacity: o, transform: `translateY(${(1 - o) * 8}px)`}}>{children}</div>;
};

/* Подпись‑якорь в синей плашке (видна и на синем фоне, и поверх интерфейса при зуме) */
export const Caption: React.FC<{items: {at: number; text: string; light?: string}[]; until?: number; x?: number; y?: number}> = ({items, until = 1e9, x = 148, y = 48}) => {
  const f = useCurrentFrame();
  let i = -1;
  items.forEach((it, k) => {
    if (f >= it.at) i = k;
  });
  if (i < 0) return null;
  const it = items[i];
  const p = lerp(f, it.at, it.at + 14);
  const o = 1 - lerp(f, until, until + 10);
  return (
    <div style={{position: 'absolute', left: x, top: y, opacity: o, display: 'flex'}}>
      <div style={{background: C.blue, borderRadius: 999, padding: '14px 30px', fontFamily: font, fontSize: 36, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', boxShadow: '0 8px 30px rgba(10, 60, 130, 0.18)', clipPath: `inset(0 ${(1 - p) * 100}% 0 0 round 999px)`}}>
        {it.text}
        {it.light && <span style={{color: C.onBlue}}> {it.light}</span>}
      </div>
    </div>
  );
};

/* Пунктирный поток данных по пути (бегущий штрих) */
export const Flow: React.FC<{d: string; at: number; color?: string; w?: number; dash?: number; speed?: number; draw?: number}> = ({d, at, color = C.blue, w = 3, dash = 10, speed = 1.6, draw = 18}) => {
  const f = useCurrentFrame();
  const o = lerp(f, at, at + draw);
  if (o <= 0) return null;
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${dash} ${dash * 0.9}`} strokeDashoffset={-(f - at) * speed} opacity={o} />;
};
