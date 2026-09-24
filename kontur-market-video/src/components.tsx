import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {colors, font} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const useSpring = (delay = 0, damping = 16, mass = 1) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, mass}});
};

/** Мягкий фон: светлая подложка и медленно плавающие голубые «пятна». */
export const SoftBackground: React.FC<{tone?: 'light' | 'blue'}> = ({tone = 'light'}) => {
  const frame = useCurrentFrame();
  const blue = tone === 'blue';
  const blobs = [
    {x: 15, y: 20, r: 700, c: blue ? colors.sky : colors.mist, sp: 0.011},
    {x: 85, y: 75, r: 900, c: blue ? colors.deep : '#DDEEFF', sp: 0.008},
    {x: 70, y: 10, r: 500, c: blue ? '#3AA0FF' : '#F0F7FF', sp: 0.014},
  ];
  return (
    <AbsoluteFill style={{background: blue ? colors.blue : colors.bg, overflow: 'hidden'}}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x + Math.sin(frame * b.sp + i) * 6}%`,
            top: `${b.y + Math.cos(frame * b.sp + i * 2) * 6}%`,
            width: b.r,
            height: b.r,
            borderRadius: '50%',
            background: b.c,
            filter: 'blur(120px)',
            opacity: 0.9,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Заголовок, который собирается по словам. */
export const Headline: React.FC<{
  text: string;
  size?: number;
  color?: string;
  delay?: number;
  stagger?: number;
  weight?: number;
  highlight?: string[];
  align?: 'left' | 'center';
}> = ({text, size = 96, color = colors.ink, delay = 0, stagger = 3, weight = 700, highlight = [], align = 'left'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = text.split('\n');
  let idx = 0;
  return (
    <div style={{fontFamily: font, fontSize: size, fontWeight: weight, lineHeight: 1.08, letterSpacing: -size * 0.025, textAlign: align}}>
      {lines.map((line, li) => (
        <div key={li} style={{overflow: 'hidden', paddingBottom: size * 0.12}}>
          {line.split(' ').map((w, wi) => {
            const p = spring({frame: frame - delay - idx++ * stagger, fps, config: {damping: 18}});
            const hl = highlight.some((h) => w.includes(h));
            return (
              <span
                key={wi}
                style={{
                  display: 'inline-block',
                  marginRight: size * 0.25,
                  color: hl ? colors.blue : color,
                  transform: `translateY(${(1 - p) * 110}%)`,
                  opacity: p,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Chip: React.FC<{children: React.ReactNode; tone?: 'white' | 'blue' | 'dark'; size?: number; style?: React.CSSProperties}> = ({
  children,
  tone = 'white',
  size = 40,
  style,
}) => {
  const t = {
    white: {background: colors.white, color: colors.ink, boxShadow: '0 12px 40px rgba(34,145,255,0.18)'},
    blue: {background: colors.blue, color: colors.white, boxShadow: '0 12px 40px rgba(34,145,255,0.35)'},
    dark: {background: colors.ink, color: colors.white, boxShadow: '0 12px 40px rgba(0,0,0,0.25)'},
  }[tone];
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 500,
        fontSize: size,
        padding: `${size * 0.4}px ${size * 0.75}px`,
        borderRadius: size,
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.35,
        ...t,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Icon: React.FC<{name: string; size?: number; white?: boolean}> = ({name, size = 48, white}) => (
  <Img src={staticFile(`icons/${name}.svg`)} style={{width: size, height: size, filter: white ? 'invert(1)' : undefined}} />
);

/** Иконка продукта: голубая плашка с белым символом (как на kontur.ru). */
export const ProductBadge: React.FC<{file: string; size?: number}> = ({file, size = 120}) => (
  <Img src={staticFile(file)} style={{width: size, height: size, borderRadius: size * 0.25, boxShadow: '0 20px 50px rgba(34,145,255,0.35)'}} />
);

export const Logo: React.FC<{file?: string; height?: number; white?: boolean}> = ({file = 'logo-market-32.svg', height = 80, white}) => (
  <Img src={staticFile(file)} style={{height, filter: white ? 'brightness(0) invert(1)' : undefined}} />
);

/** Окно браузера со скриншотом интерфейса. */
export const BrowserFrame: React.FC<{src: string; width: number; style?: React.CSSProperties}> = ({src, width, style}) => (
  <div
    style={{
      width,
      borderRadius: 28,
      overflow: 'hidden',
      background: colors.white,
      boxShadow: '0 50px 120px rgba(20,60,120,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
      ...style,
    }}
  >
    <Img src={staticFile(src)} style={{width: '100%', display: 'block'}} />
  </div>
);

export const Counter: React.FC<{to: number; delay?: number; dur?: number; suffix?: string; style?: React.CSSProperties}> = ({
  to,
  delay = 0,
  dur = 40,
  suffix = '',
  style,
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + dur], [0, to], {...clamp, easing: Easing.out(Easing.cubic)});
  return <span style={{fontVariantNumeric: 'tabular-nums', ...style}}>{Math.round(v).toLocaleString('ru-RU')}{suffix}</span>;
};
