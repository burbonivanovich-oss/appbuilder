import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';

/*
 * Автопрезентация в стиле роликов Контура: светло‑серый фон, крупные заголовки обычного начертания,
 * синие контурные иконки, пункты появляются под голос, скриншот интерфейса с подсветкой блока.
 * Слайды и элементы расставляются по таймингам озвучки (scripts/autopres-vo.py).
 */

type Item = {icon: string; text: string; say: string};
type Focus = {x: number; y: number; w: number; h: number; say: string};
export type Slide =
  | {type: 'intro'; title: string; say: string}
  | {type: 'hero'; title: string; art: 'receipt'; say: string}
  | {type: 'bullets'; title: string; photo: string; items: Item[]; say?: string}
  | {type: 'grid'; title: string; items: Item[]; say?: string}
  | {type: 'ui'; image: string; imageWidth: number; imageHeight: number; focus: Focus[]; say: string}
  | {type: 'outro'; title: string; icons: string[]; say: string};
export type Scenario = {voice: string; slides: Slide[]};
export type Timing = {total: number; starts: {start: number; items: number[]}[]};
export type AutoPresProps = {scenario: Scenario; timing: Timing; audio: string};

const FPS = 30;
const BG = '#F5F5F5';
const INK = '#222222';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const f = (sec: number) => Math.round(sec * FPS);
const LEFT = 110;

/* Заголовок: строки проявляются слева направо, как в оригинальных роликах */
const Title: React.FC<{text: string; at?: number; size?: number; color?: string; top?: number; center?: boolean}> = ({text, at = 0, size = 104, color = INK, top = 96, center}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: center ? 0 : LEFT, right: center ? 0 : undefined, top, textAlign: center ? 'center' : 'left', fontFamily: font, fontWeight: 400, fontSize: size, lineHeight: 1.1, letterSpacing: -size * 0.015, color}}>
      {text.split('\n').map((line, i) => {
        const p = interpolate(frame, [at + i * 5, at + i * 5 + 20], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return (
          <div key={i} style={{clipPath: center ? `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)` : `inset(0 ${(1 - p) * 100}% 0 0)`, opacity: 0.3 + p * 0.7}}>
            {line}
          </div>
        );
      })}
    </div>
  );
};

/* Контурная иконка Контура, перекрашенная в фирменный синий */
const Icon: React.FC<{name: string; size: number}> = ({name, size}) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: colors.blue,
      WebkitMaskImage: `url(${staticFile(`icons/${name}.svg`)})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
    }}
  />
);

const Point: React.FC<{item: Item; at: number; iconSize: number; fontSize: number}> = ({item, at, iconSize, fontSize}) => {
  const frame = useCurrentFrame();
  const icon = interpolate(frame, [at, at + 10], [0, 1], clamp);
  const text = interpolate(frame, [at + 4, at + 26], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{display: 'flex', gap: iconSize * 0.7, alignItems: 'flex-start'}}>
      <div style={{opacity: icon, transform: `scale(${0.8 + icon * 0.2})`, marginTop: fontSize * 0.08}}>
        <Icon name={item.icon} size={iconSize} />
      </div>
      <div style={{fontFamily: font, fontSize, lineHeight: 1.2, color: INK, clipPath: `inset(0 ${(1 - text) * 100}% 0 0)`, whiteSpace: 'pre'}}>{item.text}</div>
    </div>
  );
};

/* Иллюстрация: синий чек с кодом и тёмной орбитой */
const ReceiptArt: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const up = spring({frame: frame - 6, fps, config: {damping: 16}});
  const ring = interpolate(frame, [18, 50], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const back = 'M 1195 880 C 1140 790, 1700 770, 1795 880';
  const front = 'M 1795 880 C 1830 970, 1560 1060, 1300 1055 C 1150 1050, 1080 990, 1110 940';
  const eb = evolvePath(ring, back);
  const ef = evolvePath(ring, front);
  const cells = [
    [0, 0, 1, 1, 0, 1, 1], [1, 0, 0, 1, 1, 0, 1], [1, 1, 0, 0, 1, 1, 0], [0, 1, 1, 0, 0, 1, 1], [1, 0, 1, 1, 0, 0, 1], [0, 1, 0, 1, 1, 0, 0], [1, 1, 0, 0, 1, 1, 1],
  ];
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={back} fill="none" stroke="#162D6E" strokeWidth={6} strokeLinecap="round" strokeDasharray={eb.strokeDasharray} strokeDashoffset={eb.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', left: 1218, top: 460, transform: `translateY(${(1 - up) * 500}px)`}}>
        <svg width={460} height={620} viewBox="0 0 460 620">
          <path d={`M0 20 ${Array.from({length: 8}).map((_, i) => `L${28.75 * (2 * i + 1)} 0 L${28.75 * (2 * i + 2)} 20`).join(' ')} L460 620 L0 620 Z`} fill={colors.blue} />
          <rect x={60} y={130} width={205} height={8} rx={4} fill="#fff" />
          <rect x={330} y={130} width={60} height={8} rx={4} fill="#fff" />
          <rect x={52} y={205} width={222} height={222} rx={26} fill="#fff" />
          {cells.map((row, y) => row.map((on, x) => (on ? <rect key={`${x}${y}`} x={76 + x * 25} y={229 + y * 25} width={25.5} height={25.5} fill="#162D6E" /> : null)))}
        </svg>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={front} fill="none" stroke="#162D6E" strokeWidth={6} strokeLinecap="round" strokeDasharray={ef.strokeDasharray} strokeDashoffset={ef.strokeDashoffset} />
      </svg>
    </>
  );
};

/* ------------------------------ слайды ------------------------------ */

const Intro: React.FC<{s: Extract<Slide, {type: 'intro'}>}> = ({s}) => {
  const frame = useCurrentFrame();
  const light = interpolate(frame, [8, 24], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: colors.blue}}>
      <AbsoluteFill style={{background: '#7DB9FF', opacity: light}} />
      <Title text={s.title} at={14} color={colors.white} top={380} size={120} />
    </AbsoluteFill>
  );
};

const Hero: React.FC<{s: Extract<Slide, {type: 'hero'}>}> = ({s}) => (
  <AbsoluteFill style={{background: BG}}>
    <Title text={s.title} at={4} />
    <ReceiptArt />
  </AbsoluteFill>
);

const Bullets: React.FC<{s: Extract<Slide, {type: 'bullets'}>; items: number[]}> = ({s, items}) => {
  const frame = useCurrentFrame();
  const photo = interpolate(frame, [0, 20], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: BG}}>
      <Title text={s.title} at={4} />
      <div style={{position: 'absolute', left: 1175, top: 90, width: 630, height: 900, borderRadius: 44, overflow: 'hidden', opacity: photo}}>
        <Img src={staticFile(s.photo)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.08 - photo * 0.08})`}} />
      </div>
      <div style={{position: 'absolute', left: LEFT, top: 480, display: 'flex', flexDirection: 'column', gap: 70}}>
        {s.items.map((it, i) => (
          <Point key={i} item={it} at={items[i]} iconSize={84} fontSize={50} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Grid: React.FC<{s: Extract<Slide, {type: 'grid'}>; items: number[]}> = ({s, items}) => {
  const half = Math.ceil(s.items.length / 2);
  return (
    <AbsoluteFill style={{background: BG}}>
      <Title text={s.title} at={4} />
      {[0, 1].map((col) => (
        <div key={col} style={{position: 'absolute', left: LEFT + col * 880, top: 420, display: 'flex', flexDirection: 'column', gap: 80}}>
          {s.items.slice(col * half, (col + 1) * half).map((it, i) => (
            <Point key={i} item={it} at={items[col * half + i]} iconSize={72} fontSize={46} />
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Ui: React.FC<{s: Extract<Slide, {type: 'ui'}>; items: number[]}> = ({s, items}) => {
  const frame = useCurrentFrame();
  const W = 1540;
  const k = W / s.imageWidth;
  const H = s.imageHeight * k;
  const enter = interpolate(frame, [0, 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  // текущий фокус плавно переезжает между блоками
  const idx = items.filter((t) => frame >= t).length - 1;
  const lerp = (key: 'x' | 'y' | 'w' | 'h') => {
    if (idx < 0) return s.focus[0][key];
    const from = s.focus[Math.max(0, idx - 1)][key];
    const to = s.focus[idx][key];
    return interpolate(frame, [items[idx], items[idx] + 14], [idx === 0 ? to : from, to], {...clamp, easing: Easing.inOut(Easing.cubic)});
  };
  const dim = idx < 0 ? 0 : interpolate(frame, [items[0], items[0] + 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: BG}}>
      <div style={{position: 'absolute', left: (1920 - W) / 2, top: (1080 - H) / 2, width: W, height: H, borderRadius: 44, overflow: 'hidden', opacity: enter, transform: `scale(${0.96 + enter * 0.04})`, background: colors.white}}>
        <Img src={staticFile(s.image)} style={{width: W, height: H, display: 'block'}} />
        <div
          style={{
            position: 'absolute',
            left: lerp('x') * k,
            top: lerp('y') * k,
            width: lerp('w') * k,
            height: lerp('h') * k,
            borderRadius: 22,
            boxShadow: `0 0 0 3000px rgba(60,60,60,${0.28 * dim})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{s: Extract<Slide, {type: 'outro'}>}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: BG}}>
      <Title text={s.title} at={4} size={84} top={300} center />
      <div style={{position: 'absolute', top: 620, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40}}>
        {s.icons.map((ic, i) => {
          const p = spring({frame: frame - 20 - i * 12, fps, config: {damping: 13}});
          return (
            <React.Fragment key={ic}>
              {i > 0 && (
                <div style={{opacity: p}}>
                  <svg width={60} height={60} viewBox="0 0 24 24">
                    <circle cx={12} cy={12} r={10} fill="none" stroke={colors.blue} strokeWidth={1.4} />
                    <path d="M12 7v10M7 12h10" stroke={colors.blue} strokeWidth={1.4} strokeLinecap="round" />
                  </svg>
                </div>
              )}
              <Img src={staticFile(ic)} style={{width: 180, height: 180, borderRadius: 44, transform: `scale(${p})`}} />
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* Слайд: мягкое появление и уход в «светлое», как в оригинале */
const SlideShell: React.FC<{dur: number; children: React.ReactNode; first?: boolean}> = ({dur, children, first}) => {
  const frame = useCurrentFrame();
  const inO = first ? 1 : interpolate(frame, [0, 10], [0, 1], clamp);
  const outO = interpolate(frame, [dur - 10, dur], [1, 0], clamp);
  return <AbsoluteFill style={{opacity: Math.min(inO, outO)}}>{children}</AbsoluteFill>;
};

export const autoPresDuration = (t: Timing) => f(t.total);

export const AutoPres: React.FC<AutoPresProps> = ({scenario, timing, audio}) => {
  const bounds = timing.starts.map((st, i) => (i === 0 ? 0 : f(st.start) - 12));
  const total = f(timing.total);
  return (
    <AbsoluteFill style={{background: BG}}>
      <Audio src={staticFile(audio)} />
      {scenario.slides.map((s, i) => {
        const from = bounds[i];
        const to = i + 1 < bounds.length ? bounds[i + 1] + 10 : total;
        const dur = to - from;
        const items = timing.starts[i].items.map((t) => f(t) - from);
        let body: React.ReactNode = null;
        if (s.type === 'intro') body = <Intro s={s} />;
        if (s.type === 'hero') body = <Hero s={s} />;
        if (s.type === 'bullets') body = <Bullets s={s} items={items} />;
        if (s.type === 'grid') body = <Grid s={s} items={items} />;
        if (s.type === 'ui') body = <Ui s={s} items={items} />;
        if (s.type === 'outro') body = <Outro s={s} />;
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <SlideShell dur={i + 1 < bounds.length ? dur : dur + 20} first={i === 0}>
              {body}
            </SlideShell>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
