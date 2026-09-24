import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import tl from './timeline.json';

export const KIT_TOTAL = tl.total;
const mono = '"JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

const useSp = (at: number, damping = 14, stiffness = 120) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness}});
};

/* Камера: ключевые кадры масштаба и сдвига всего «мира» */
const CAM = {
  f: [0, tl.kassa - 10, tl.kassa + 40, tl.fn, tl.fn + 50, tl.scanner + 10, tl.ofd + 10, tl.market, tl.market + 60, tl.final, tl.final + 50, tl.total],
  s: [1.35, 1.35, 1.12, 1.12, 1.3, 1.02, 0.9, 0.9, 0.8, 0.8, 0.58, 0.6],
  x: [0, 0, 0, 0, -180, 120, -150, -150, -120, -120, -520, -540],
  y: [0, 0, 20, 20, 60, 0, 40, 40, 20, 20, 30, 30],
  r: [0, 0, 0, 0, 0, 3, -2, -2, -6, -6, 0, 0],
};
const cam = (frame: number, k: 's' | 'x' | 'y' | 'r') => interpolate(frame, CAM.f, CAM[k], {...clamp, easing: ease});

/* Чертёжная сетка, которая «прочерчивается» в начале */
const Blueprint: React.FC = () => {
  const frame = useCurrentFrame();
  const cols = 24;
  const rows = 14;
  return (
    <AbsoluteFill>
      {Array.from({length: cols + 1}).map((_, i) => {
        const p = interpolate(frame, [i * 1.2, i * 1.2 + 30], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <div key={`c${i}`} style={{position: 'absolute', left: `${(i / cols) * 100}%`, top: 0, width: i % 4 ? 1 : 2, height: `${p * 100}%`, background: i % 4 ? 'rgba(34,145,255,0.08)' : 'rgba(34,145,255,0.16)'}} />;
      })}
      {Array.from({length: rows + 1}).map((_, i) => {
        const p = interpolate(frame, [i * 1.5 + 6, i * 1.5 + 36], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <div key={`r${i}`} style={{position: 'absolute', top: `${(i / rows) * 100}%`, left: 0, height: i % 4 ? 1 : 2, width: `${p * 100}%`, background: i % 4 ? 'rgba(34,145,255,0.08)' : 'rgba(34,145,255,0.16)'}} />;
      })}
      {Array.from({length: cols / 4}).map((_, i) => (
        <div key={`l${i}`} style={{position: 'absolute', left: `${((i * 4) / cols) * 100 + 0.4}%`, top: 14, fontFamily: mono, fontSize: 16, color: 'rgba(34,145,255,0.5)', opacity: interpolate(frame, [30, 50], [0, 1], clamp)}}>
          {String.fromCharCode(65 + i)}
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* Выноска как на чертеже: линия с изломом + подпись */
const Callout: React.FC<{at: number; until: number; x: number; y: number; dx: number; dy: number; title: string; sub: string; align?: 'left' | 'right'}> = ({at, until, x, y, dx, dy, title, sub, align = 'right'}) => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [until, until + 12], [1, 0], clamp);
  if (fadeOut <= 0) return null;
  const len = align === 'right' ? 220 : -220;
  const d = `M ${x} ${y} L ${x + dx} ${y + dy} L ${x + dx + len} ${y + dy}`;
  const draw = interpolate(frame, [at, at + 22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const {strokeDasharray, strokeDashoffset} = evolvePath(draw, d);
  const text = interpolate(frame, [at + 14, at + 26], [0, 1], clamp);
  const dot = interpolate(frame, [at, at + 6], [0, 1], clamp);
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: fadeOut}}>
        <circle cx={x} cy={y} r={9 * dot} fill={colors.white} stroke={colors.blue} strokeWidth={3} />
        <path d={d} fill="none" stroke={colors.blue} strokeWidth={2.5} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: align === 'right' ? x + dx : undefined,
          right: align === 'left' ? 1920 - (x + dx) : undefined,
          top: y + dy - 62,
          width: 620,
          whiteSpace: 'nowrap',
          textAlign: align === 'right' ? 'left' : 'right',
          opacity: text * fadeOut,
          transform: `translateY(${(1 - text) * 12}px)`,
        }}
      >
        <div style={{fontFamily: font, fontWeight: 700, fontSize: 36, color: colors.ink, letterSpacing: -0.5}}>{title}</div>
        <div style={{fontFamily: mono, fontSize: 22, color: colors.blue, marginTop: 30}}>{sub}</div>
      </div>
    </>
  );
};

/* Падение детали с отскоком и тенью */
const Drop: React.FC<{at: number; from?: {x: number; y: number; r: number}; x: number; y: number; w: number; src: string; children?: React.ReactNode}> = ({
  at,
  from = {x: 0, y: -900, r: -12},
  x,
  y,
  w,
  src,
}) => {
  const frame = useCurrentFrame();
  const p = useSp(at, 11, 140);
  if (frame < at - 2) return null;
  const px = interpolate(p, [0, 1], [from.x, 0]);
  const py = interpolate(p, [0, 1], [from.y, 0]);
  const pr = interpolate(p, [0, 1], [from.r, 0]);
  const lift = Math.max(0, -py) / 900;
  const float = Math.sin((frame - at) / 25) * 6 * Math.min(1, (frame - at) / 40);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - w * 0.4,
          top: y + w * 0.3,
          width: w * 0.8,
          height: w * 0.1,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(20,50,100,0.28), rgba(20,50,100,0))',
          transform: `scale(${1 - lift * 0.6})`,
          opacity: 1 - lift,
        }}
      />
      <Img src={staticFile(src)} style={{position: 'absolute', left: x - w / 2, top: y - w * 0.32, width: w, transform: `translate(${px}px, ${py + float}px) rotate(${pr}deg)`}} />
    </>
  );
};

const Flash: React.FC<{at: number; x: number; y: number; size?: number}> = ({at, x, y, size = 260}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + 18], [0, 1], clamp);
  if (frame < at || t >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - (size * t) / 2,
        top: y - (size * t) / 2,
        width: size * t,
        height: size * t,
        borderRadius: '50%',
        border: `${6 * (1 - t)}px solid ${colors.sky}`,
        opacity: 1 - t,
      }}
    />
  );
};

/* ФН: подлетает, уменьшается и «входит» в кассу */
const FiscalDrive: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.fn;
  const snap = tl.snaps[1];
  const t = interpolate(frame, [at, snap], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (frame < at) return null;
  const x = interpolate(t, [0, 1], [1700, 1150]);
  const y = interpolate(t, [0, 1], [180, 470]) - Math.sin(t * Math.PI) * 120;
  const s = interpolate(t, [0, 0.7, 1], [1, 0.9, 0.25]);
  const o = interpolate(frame, [snap - 2, snap + 2], [1, 0], clamp);
  const badge = spring({frame: frame - snap, fps: 30, config: {damping: 10}});
  return (
    <>
      <Img src={staticFile('fn.png')} style={{position: 'absolute', left: x - 170, top: y - 110, width: 340, transform: `scale(${s}) rotate(${(1 - t) * 30}deg)`, opacity: o, filter: 'drop-shadow(0 20px 20px rgba(20,50,100,0.25))'}} />
      <div
        style={{
          position: 'absolute',
          left: 1110,
          top: 440,
          transform: `scale(${badge})`,
          fontFamily: font,
          fontWeight: 700,
          fontSize: 24,
          color: colors.white,
          background: colors.blue,
          padding: '8px 18px',
          borderRadius: 30,
          boxShadow: '0 10px 30px rgba(34,145,255,0.4)',
        }}
      >
        ФН ✓
      </div>
      <Flash at={snap} x={1150} y={470} size={320} />
    </>
  );
};

/* ОФД и поток данных */
const OfdLink: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.ofd;
  const p = useSp(at, 10, 150);
  if (frame < at - 2) return null;
  const main = 'M 1080 420 C 1180 260, 1320 250, 1440 300';
  const up = 'M 1590 290 C 1660 230, 1700 210, 1770 210';
  const down = 'M 1590 330 C 1660 390, 1700 410, 1770 410';
  const e1 = evolvePath(interpolate(frame, [at + 12, at + 34], [0, 1], clamp), main);
  const e2 = evolvePath(interpolate(frame, [at + 36, at + 52], [0, 1], clamp), up);
  const e3 = evolvePath(interpolate(frame, [at + 40, at + 56], [0, 1], clamp), down);
  const flow = -frame * 2.5;
  const chip = (d: number) => spring({frame: frame - at - d, fps: 30, config: {damping: 11}});
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[{d: main, e: e1}, {d: up, e: e2}, {d: down, e: e3}].map((o, i) => (
          <g key={i}>
            <path d={o.d} fill="none" stroke={colors.blue} strokeWidth={3} strokeDasharray={o.e.strokeDasharray} strokeDashoffset={o.e.strokeDashoffset} opacity={0.25} />
            <path d={o.d} fill="none" stroke={colors.blue} strokeWidth={3} strokeDasharray="10 14" strokeDashoffset={flow} opacity={o.e.strokeDashoffset === 0 ? 1 : 0} />
          </g>
        ))}
      </svg>
      <Img
        src={staticFile('ofd-24.svg')}
        style={{position: 'absolute', left: 1440, top: 230, width: 150, height: 150, borderRadius: 38, transform: `translateY(${(1 - p) * -500}px) scale(${0.6 + p * 0.4})`, boxShadow: '0 30px 60px rgba(34,145,255,0.4)'}}
      />
      {[
        {t: 'ФНС ✓', y: 180, d: 50},
        {t: 'Честный знак ✓', y: 380, d: 56},
      ].map((c) => (
        <div
          key={c.t}
          style={{
            position: 'absolute',
            left: 1780,
            top: c.y,
            transform: `scale(${chip(c.d)})`,
            transformOrigin: 'left center',
            fontFamily: font,
            fontWeight: 700,
            fontSize: 28,
            background: colors.white,
            padding: '12px 22px',
            borderRadius: 30,
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 30px rgba(34,145,255,0.2)',
          }}
        >
          {c.t}
        </div>
      ))}
      <Flash at={tl.snaps[3]} x={1515} y={305} size={300} />
    </>
  );
};

/* Экран учётной системы разворачивается за кассой */
const MarketScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.market;
  const p = useSp(at, 16, 90);
  if (frame < at - 2) return null;
  return (
    <div style={{position: 'absolute', left: 680, top: 40, width: 1100, perspective: 2400, opacity: Math.min(1, p * 1.5)}}>
      <Img
        src={staticFile('demo-market.png')}
        style={{
          width: '100%',
          borderRadius: 24,
          boxShadow: '0 50px 120px rgba(20,60,120,0.22), 0 0 0 1px rgba(0,0,0,0.05)',
          transformOrigin: '50% 100%',
          transform: `rotateX(${(1 - p) * 80}deg) translateZ(-200px) scale(0.92)`,
        }}
      />
    </div>
  );
};

/* Индикатор шага (экранное пространство) */
const STEPS = [
  {at: tl.kassa, name: 'Касса'},
  {at: tl.fn, name: 'Фискальный накопитель'},
  {at: tl.scanner, name: 'Сканер'},
  {at: tl.ofd, name: 'ОФД'},
  {at: tl.market, name: 'Учётная система'},
];
const StepBar: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = STEPS.filter((s) => frame >= s.at).length - 1;
  const visible = interpolate(frame, [tl.kassa, tl.kassa + 15, tl.final, tl.final + 15], [0, 1, 1, 0], clamp);
  if (idx < 0) return null;
  const s = STEPS[idx];
  const swap = interpolate(frame, [s.at, s.at + 12], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', right: 80, top: 70, textAlign: 'right', opacity: visible}}>
      <div style={{fontFamily: mono, fontSize: 24, color: colors.blue}}>
        {String(idx + 1).padStart(2, '0')} / 05
      </div>
      <div style={{fontFamily: font, fontWeight: 700, fontSize: 40, color: colors.ink, opacity: swap, transform: `translateY(${(1 - swap) * 16}px)`}}>{s.name}</div>
      <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16}}>
        {STEPS.map((_, i) => (
          <div key={i} style={{width: i === idx ? 56 : 24, height: 8, borderRadius: 4, background: i <= idx ? colors.blue : 'rgba(34,145,255,0.2)'}} />
        ))}
      </div>
    </div>
  );
};

/* Заголовок: сначала крупно по центру, затем уезжает в угол */
const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [tl.kassa - 20, tl.kassa + 10], [0, 1], {...clamp, easing: ease});
  const out = interpolate(frame, [tl.final - 10, tl.final + 5], [1, 0], clamp);
  const words = ['Что', 'нужно,', 'чтобы', 'открыться?'];
  return (
    <div
      style={{
        position: 'absolute',
        left: interpolate(t, [0, 1], [960, 80]),
        top: interpolate(t, [0, 1], [470, 70]),
        transform: `translateX(${interpolate(t, [0, 1], [-50, 0])}%)`,
        fontFamily: font,
        fontWeight: 700,
        fontSize: interpolate(t, [0, 1], [120, 44]),
        letterSpacing: -2,
        whiteSpace: 'nowrap',
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const p = spring({frame: frame - 25 - i * 5, fps: 30, config: {damping: 16}});
        return (
          <span key={w} style={{display: 'inline-block', marginRight: '0.25em', opacity: p, transform: `translateY(${(1 - p) * 40}px)`, color: i === 3 ? colors.blue : colors.ink}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/* Финал: чек‑лист и CTA справа от уменьшенного комплекта */
const FinalPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.final;
  const p = useSp(at + 20, 16);
  const items = ['Касса с кассовым ПО', 'Фискальный накопитель', '2D‑сканер', 'ОФД', 'Учётная система'];
  const btn = useSp(tl.snaps[9] + 5, 10);
  if (frame < at) return null;
  return (
    <div style={{position: 'absolute', left: 1080, top: 150, width: 760, opacity: p, transform: `translateX(${(1 - p) * 80}px)`}}>
      <Img src={staticFile('logo-market-32.svg')} style={{height: 54}} />
      <div style={{fontFamily: font, fontWeight: 700, fontSize: 104, letterSpacing: -3, lineHeight: 1, marginTop: 16}}>
        Работает
        <br />
        <span style={{color: colors.blue}}>с первого дня</span>
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 44}}>
        {items.map((t, i) => {
          const s = spring({frame: frame - tl.snaps[5 + i], fps: 30, config: {damping: 12}});
          return (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 20, fontFamily: font, fontSize: 36, fontWeight: 500, opacity: 0.3 + s * 0.7}}>
              <div style={{width: 44, height: 44, borderRadius: 12, background: s > 0.5 ? colors.blue : 'rgba(34,145,255,0.15)', color: colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, transform: `scale(${0.7 + s * 0.3})`}}>
                ✓
              </div>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 40, marginTop: 56}}>
        <div style={{transform: `scale(${btn})`, transformOrigin: 'left center', background: colors.blue, color: colors.white, fontFamily: font, fontWeight: 700, fontSize: 40, padding: '26px 52px', borderRadius: 20, whiteSpace: 'nowrap', boxShadow: '0 24px 60px rgba(34,145,255,0.45)'}}>
          Подобрать комплект
        </div>
        <div style={{fontFamily: mono, fontSize: 30, color: colors.ink, opacity: btn}}>kontur.ru/market</div>
      </div>
    </div>
  );
};

export const Kit: React.FC = () => {
  const frame = useCurrentFrame();
  const s = cam(frame, 's');
  const x = cam(frame, 'x');
  const y = cam(frame, 'y');
  const r = cam(frame, 'r');
  const worldIn = interpolate(frame, [tl.kassa - 5, tl.kassa], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Audio src={staticFile('kit.wav')} />
      <Blueprint />
      {/* «мир» со всеми деталями — двигается камерой */}
      <AbsoluteFill style={{transform: `translate(${x}px, ${y}px) scale(${s}) perspective(3000px) rotateY(${r}deg)`, transformOrigin: '50% 55%', opacity: worldIn}}>
        <MarketScreen />
        <Drop at={tl.kassa} x={960} y={560} w={820} src="mspos-f20-f.png" />
        <Flash at={tl.snaps[0]} x={960} y={700} size={600} />
        <Drop at={tl.scanner} from={{x: -700, y: -200, r: 25}} x={420} y={650} w={400} src="2d-skaner-neo-max-sd.png" />
        <Flash at={tl.snaps[2]} x={420} y={680} size={300} />
        <FiscalDrive />
        <OfdLink />
        <div style={{opacity: interpolate(frame, [tl.market, tl.market + 20], [1, 0], clamp)}}>
          <Callout until={tl.fn} at={tl.kassa + 30} x={800} y={420} dx={-90} dy={-120} align="left" title="Смарт‑терминал" sub="касса + кассовое ПО" />
          <Callout until={tl.fn} at={tl.kassa + 42} x={1260} y={640} dx={90} dy={110} title="Встроенный принтер" sub="чек за секунду" />
          <Callout until={tl.scanner} at={tl.fn + 50} x={1150} y={470} dx={140} dy={-200} title="Фискальный накопитель" sub="на 15 или 36 месяцев" />
          <Callout until={tl.ofd} at={tl.scanner + 28} x={420} y={600} dx={-60} dy={-190} align="left" title="2D‑сканер" sub="маркировка и ЕГАИС" />
          <Callout until={tl.market} at={tl.ofd + 60} x={1515} y={380} dx={0} dy={200} title="Контур.ОФД" sub="чеки в ФНС онлайн" />
        </div>
      </AbsoluteFill>
      <Question />
      <StepBar />
      <FinalPanel />
    </AbsoluteFill>
  );
};
