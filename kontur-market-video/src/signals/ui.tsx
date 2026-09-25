import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, Easing} from 'remotion';
import {colors, font} from '../theme';

/* Общие элементы ролика «ИИ Бизнес сигналы»: шаблон «Контур Blue» — белый фон, синий акцент, много воздуха */

export const FPS = 30;
export const INK = '#1F2328';
export const GRAY = '#6B7580';
export const LINE = '#E3E8EE';
export const TILE = '#F4F6F8';
export const GREEN = '#1FA36B';
export const YELLOW = '#F2A900';
export const RED = '#E5484D';
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.65, 0, 0.35, 1);

export const useAppear = (at: number, dur = 16) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
};
export const usePop = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  return spring({frame: frame - at, fps: FPS, config: {damping}});
};

/* Смысловой якорь: короткий крупный текст, строки проявляются слева направо */
export const Anchor: React.FC<{lines: {text: string; at: number; color?: string}[]; x?: number; y?: number; size?: number; weight?: number}> = ({lines, x = 120, y = 96, size = 76, weight = 700}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: x, top: y, fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.08, letterSpacing: -size * 0.02}}>
      {lines.map((l, i) => {
        const p = interpolate(frame, [l.at, l.at + 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return (
          <div key={i} style={{color: l.color ?? INK, clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`, whiteSpace: 'nowrap'}}>
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

/* Контурная иконка Контура в фирменном синем */
export const Icon: React.FC<{name: string; size: number; color?: string}> = ({name, size, color = colors.blue}) => (
  <div style={{width: size, height: size, flexShrink: 0, backgroundColor: color, WebkitMaskImage: `url(${staticFile(`icons/${name}.svg`)})`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center'}} />
);

export const Pill: React.FC<{children: React.ReactNode; color?: string; bg?: string; size?: number; style?: React.CSSProperties}> = ({children, color = INK, bg = TILE, size = 22, style}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: font, fontWeight: 500, fontSize: size, color, background: bg, padding: `${size * 0.3}px ${size * 0.7}px`, borderRadius: 999, whiteSpace: 'nowrap', ...style}}>{children}</span>
);

export const Footnote: React.FC<{text: string; at: number; color?: string}> = ({text, at, color = GRAY}) => {
  const o = useAppear(at, 12);
  return <div style={{position: 'absolute', left: 120, right: 120, bottom: 52, fontFamily: font, fontSize: 22, lineHeight: 1.35, color, opacity: o}}>{text}</div>;
};

/* Курсор, который плавно едет по точкам и «кликает» */
export const Cursor: React.FC<{path: {x: number; y: number; at: number; click?: boolean}[]}> = ({path}) => {
  const frame = useCurrentFrame();
  if (!path.length || frame < path[0].at - 10) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const t = interpolate(frame, [b.at - 16, b.at], [0, 1], {...clamp, easing: ease});
    if (frame >= b.at - 16) {
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    }
  }
  const clickAt = path.filter((p) => p.click && frame >= p.at).map((p) => p.at).pop();
  const press = clickAt !== undefined && frame - clickAt < 5 ? 0.85 : 1;
  const ripple = clickAt !== undefined ? interpolate(frame - clickAt, [0, 18], [0, 1], clamp) : 1;
  const o = interpolate(frame, [path[0].at - 10, path[0].at], [0, 1], clamp);
  return (
    <>
      {ripple < 1 && <div style={{position: 'absolute', left: x - 40 * ripple, top: y - 40 * ripple, width: 80 * ripple, height: 80 * ripple, borderRadius: '50%', border: `3px solid ${colors.blue}`, opacity: 1 - ripple}} />}
      <svg width={44} height={44} viewBox="0 0 24 24" style={{position: 'absolute', left: x - 6, top: y - 3, opacity: o, transform: `scale(${press})`, transformOrigin: '6px 3px', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))'}}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill={INK} stroke="#fff" strokeWidth={1.3} />
      </svg>
    </>
  );
};

/* Рамка‑подсветка одного объекта */
export const Focus: React.FC<{x: number; y: number; w: number; h: number; at: number; until?: number; r?: number}> = ({x, y, w, h, at, until = 1e9, r = 20}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], clamp) * interpolate(frame, [until, until + 10], [1, 0], clamp);
  if (p <= 0) return null;
  const pad = 10 + (1 - p) * 20;
  return <div style={{position: 'absolute', left: x - pad, top: y - pad, width: w + pad * 2, height: h + pad * 2, borderRadius: r + pad / 2, border: `4px solid ${colors.blue}`, opacity: p, boxShadow: '0 0 0 8px rgba(34,145,255,0.12)'}} />;
};

/* Окно Контур.Маркета — макет интерфейса ИИ Бизнес сигналов */
const NAV = [
  {icon: 'market-register-classic', t: 'Продажи'},
  {icon: 'delivery-box-iso', t: 'Товары'},
  {icon: 'doc-arrow-sync', t: 'Документы'},
  {icon: 'data-chart-pie-a-1', t: 'Отчёты'},
  {icon: 'notification-bell-alarm', t: 'ИИ Бизнес сигналы', active: true},
  {icon: 'people-3', t: 'Сотрудники'},
];
export const MarketWindow: React.FC<{x?: number; y?: number; w?: number; h?: number; title: string; tabs?: string[]; activeTab?: number; children: React.ReactNode; concept?: boolean}> = ({
  x = 150,
  y = 250,
  w = 1620,
  h = 780,
  title,
  tabs,
  activeTab = 0,
  children,
  concept = true,
}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 28, background: '#fff', border: `2px solid ${LINE}`, overflow: 'hidden', display: 'flex', fontFamily: font}}>
    <div style={{width: 300, background: TILE, padding: '30px 22px', display: 'flex', flexDirection: 'column', gap: 6}}>
      <Img src={staticFile('logo-market-32.svg')} style={{height: 30, alignSelf: 'flex-start', marginBottom: 28, marginLeft: 12}} />
      {NAV.map((n) => (
        <div key={n.t} style={{display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 14, background: n.active ? '#fff' : 'transparent', fontSize: 21, fontWeight: n.active ? 700 : 400, color: n.active ? INK : GRAY}}>
          <Icon name={n.icon} size={26} color={n.active ? colors.blue : GRAY} />
          {n.t}
        </div>
      ))}
    </div>
    <div style={{flex: 1, padding: '34px 44px', position: 'relative'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{fontSize: 38, fontWeight: 700, color: INK}}>{title}</div>
        {concept && <Pill color="#8A5A00" bg="#FFF3D6" size={20}>Концепт интерфейса</Pill>}
      </div>
      {tabs && (
        <div style={{display: 'flex', gap: 10, marginTop: 22}}>
          {tabs.map((t, i) => (
            <Pill key={t} color={i === activeTab ? '#fff' : INK} bg={i === activeTab ? colors.blue : TILE} size={22}>
              {t}
            </Pill>
          ))}
        </div>
      )}
      <div style={{position: 'absolute', left: 44, right: 44, top: tabs ? 170 : 110, bottom: 30}}>{children}</div>
    </div>
  </div>
);

/* Карточка сигнала */
export const SignalCard: React.FC<{tone?: 'red' | 'yellow' | 'green' | 'blue'; title: string; sub: string; w?: number; style?: React.CSSProperties}> = ({tone = 'red', title, sub, w = 460, style}) => {
  const c = {red: RED, yellow: YELLOW, green: GREEN, blue: colors.blue}[tone];
  return (
    <div style={{width: w, background: '#fff', border: `2px solid ${LINE}`, borderRadius: 22, padding: '20px 24px', fontFamily: font, display: 'flex', gap: 16, alignItems: 'flex-start', ...style}}>
      <div style={{width: 14, height: 14, borderRadius: 7, background: c, marginTop: 10, flexShrink: 0}} />
      <div>
        <div style={{fontSize: 26, fontWeight: 700, color: INK}}>{title}</div>
        <div style={{fontSize: 20, color: GRAY, marginTop: 4}}>{sub}</div>
      </div>
    </div>
  );
};

/* Камера: плавный зум окна на нужную область */
export const Camera: React.FC<{keys: {at: number; s: number; cx: number; cy: number}[]; children: React.ReactNode}> = ({keys, children}) => {
  const frame = useCurrentFrame();
  const f = keys.map((k) => k.at);
  const pick = (k: 's' | 'cx' | 'cy') => (keys.length > 1 ? interpolate(frame, f, keys.map((x) => x[k]), {...clamp, easing: ease}) : keys[0][k]);
  const s = pick('s');
  const cx = pick('cx');
  const cy = pick('cy');
  return <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})`}}>{children}</div>;
};
