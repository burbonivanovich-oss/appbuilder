import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {z} from 'zod';
import {colors, font, site} from '../theme';
import {clamp} from '../components';

/* ------------------------------------------------------------------ */
/* Параметры: одна композиция → ролики под разные сегменты               */
/* ------------------------------------------------------------------ */
export const verticalSchema = z.object({
  segment: z.enum(['cafe', 'retail', 'services']),
  cta: z.string(),
});
export type VerticalProps = z.infer<typeof verticalSchema>;

const SEGMENTS = {
  cafe: {
    who: 'кофейни',
    device: 'mspos-f20-f.png',
    items: [['Капучино', '220'], ['Круассан', '150'], ['Раф', '260']],
    total: '630',
  },
  retail: {
    who: 'магазина',
    device: 'atol-optima.png',
    items: [['Молоко 3,2%', '96'], ['Хлеб', '54'], ['Сыр 200 г', '289']],
    total: '439',
  },
  services: {
    who: 'салона',
    device: 'mspos-f20-f.png',
    items: [['Стрижка', '1 500'], ['Укладка', '900'], ['Уход', '700']],
    total: '3 100',
  },
} as const;

/* ------------------------------------------------------------------ */
/* Ритм: 120 BPM при 30 fps → удар каждые 15 кадров                    */
/* ------------------------------------------------------------------ */
export const BEAT = 15;
export const V_TOTAL = 600;
const beatPulse = (frame: number, decay = 5) => Math.exp(-(frame % BEAT) / decay);
const bar = (n: number) => n * BEAT * 4;

/* Общие элементы */
const Punch: React.FC<{children: React.ReactNode; at: number; size?: number; color?: string; rot?: number}> = ({
  children,
  at,
  size = 180,
  color = colors.ink,
  rot = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 9, stiffness: 180}});
  if (frame < at) return null;
  return (
    <div
      style={{
        fontFamily: font,
        fontWeight: 700,
        fontSize: size,
        color,
        letterSpacing: -size * 0.04,
        lineHeight: 0.95,
        transform: `scale(${interpolate(p, [0, 1], [2.4, 1])}) rotate(${rot * (1 - p) * 3 + rot}deg)`,
        opacity: Math.min(1, p * 2),
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
};

const Grid: React.FC<{dark?: boolean}> = ({dark}) => {
  const frame = useCurrentFrame();
  const off = (frame * 2) % 90;
  const c = dark ? 'rgba(255,255,255,0.06)' : 'rgba(34,145,255,0.08)';
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${c} 2px, transparent 2px), linear-gradient(90deg, ${c} 2px, transparent 2px)`,
        backgroundSize: '90px 90px',
        backgroundPosition: `0 ${off}px`,
      }}
    />
  );
};

const Flash: React.FC<{at: number; color?: string}> = ({at, color = colors.white}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2, at + 8], [0, 0.9, 0], clamp);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

/* 1. Хаос: вопросы бьют в такт, фон мигает */
const QUESTIONS = ['Касса?', 'ОФД?', 'ФН?', 'Маркировка?', 'ЕГАИС?', '54‑ФЗ?', 'Честный\nзнак?'];
const Chaos: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.min(QUESTIONS.length - 1, Math.floor(frame / BEAT));
  const shake = frame > 90 ? (random(`s${frame}`) - 0.5) * 30 : 0;
  const inverted = i % 2 === 1;
  return (
    <AbsoluteFill style={{background: inverted ? colors.blue : colors.ink, transform: `translate(${shake}px, ${-shake}px)`}}>
      <Grid dark />
      {/* эхо‑слои предыдущих вопросов */}
      {QUESTIONS.slice(0, i).map((q, k) => (
        <div
          key={q}
          style={{
            position: 'absolute',
            left: `${10 + random(q) * 50}%`,
            top: `${8 + random(q + 'y') * 80}%`,
            fontFamily: font,
            fontWeight: 700,
            fontSize: 90,
            color: 'rgba(255,255,255,0.12)',
            transform: `rotate(${(random(q + 'r') - 0.5) * 30}deg)`,
            whiteSpace: 'pre',
          }}
        >
          {q}
        </div>
      ))}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', whiteSpace: 'pre'}}>
        <Punch key={i} at={i * BEAT} color={colors.white} rot={(i % 2 ? 1 : -1) * 3}>
          {QUESTIONS[i]}
        </Punch>
      </AbsoluteFill>
      {QUESTIONS.map((_, k) => (
        <Flash key={k} at={k * BEAT} color={colors.sky} />
      ))}
    </AbsoluteFill>
  );
};

/* 2. Дроп: белый взрыв и логотип */
const Drop: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 8}});
  const pulse = 1 + beatPulse(frame) * 0.06;
  const rays = 18;
  return (
    <AbsoluteFill style={{background: colors.white}}>
      <Grid />
      <AbsoluteFill style={{transform: `rotate(${frame * 0.6}deg) scale(${p * 1.2})`, opacity: 0.5}}>
        {Array.from({length: rays}).map((_, k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 2000,
              height: 60,
              marginTop: -30,
              transformOrigin: '0 50%',
              transform: `rotate(${(k / rays) * 360}deg)`,
              background: `linear-gradient(90deg, ${colors.mist}, transparent 70%)`,
            }}
          />
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 60}}>
        <Img
          src={staticFile('market-24.svg')}
          style={{width: 360, height: 360, borderRadius: 90, transform: `scale(${p * pulse}) rotate(${(1 - p) * 180}deg)`, boxShadow: '0 60px 120px rgba(34,145,255,0.45)'}}
        />
        <Img src={staticFile('logo-market-32.svg')} style={{height: 120, opacity: p, transform: `translateY(${(1 - p) * 80}px)`}} />
      </AbsoluteFill>
      <Flash at={0} />
    </AbsoluteFill>
  );
};

/* 3. 3D‑касса на пьедестале */
const Hero: React.FC<{seg: (typeof SEGMENTS)[keyof typeof SEGMENTS]}> = ({seg}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 14}});
  const rotY = interpolate(frame, [0, 120], [-35, 25]);
  const pulse = beatPulse(frame, 6);
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${colors.white} 0%, ${colors.mist} 100%)`}}>
      <Grid />
      <div style={{position: 'absolute', top: 170, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        <Punch at={0} size={110}>
          Касса для
        </Punch>
        <Punch at={BEAT} size={150} color={colors.blue}>
          {seg.who}
        </Punch>
      </div>
      {/* пьедестал */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 1380,
          width: 820 + pulse * 40,
          height: 180,
          marginLeft: -(410 + pulse * 20),
          borderRadius: '50%',
          background: `radial-gradient(closest-side, ${colors.sky}, rgba(81,173,255,0))`,
          opacity: 0.8,
        }}
      />
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', perspective: 1600}}>
        <Img
          src={staticFile(seg.device)}
          style={{
            width: 1000,
            transform: `translateY(${(1 - p) * 700 + Math.sin(frame / 12) * 14}px) rotateY(${rotY}deg) rotateX(8deg) scale(${1 + pulse * 0.03})`,
            filter: 'drop-shadow(0 70px 60px rgba(20,60,120,0.3))',
          }}
        />
      </div>
      {/* орбитальные чипы */}
      {['Кассовое ПО', 'Учёт', 'ОФД'].map((t, k) => {
        const a = frame / 30 + (k * Math.PI * 2) / 3;
        const s = spring({frame: frame - 20 - k * 8, fps, config: {damping: 12}});
        const z = Math.sin(a);
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: 540 + Math.cos(a) * 430,
              top: 1080 + z * 120,
              transform: `translate(-50%,-50%) scale(${s * (0.8 + (z + 1) * 0.15)})`,
              zIndex: z > 0 ? 2 : 0,
              fontFamily: font,
              fontWeight: 700,
              fontSize: 44,
              color: colors.white,
              background: colors.blue,
              padding: '18px 34px',
              borderRadius: 40,
              boxShadow: '0 20px 40px rgba(34,145,255,0.4)',
              opacity: 0.6 + (z + 1) * 0.2,
            }}
          >
            {t}
          </div>
        );
      })}
      <Flash at={0} />
    </AbsoluteFill>
  );
};

/* 4. Шторм чеков, которые засасывает в ОФД */
const Storm: React.FC<{seg: (typeof SEGMENTS)[keyof typeof SEGMENTS]}> = ({seg}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cx = 540;
  const cy = 1150;
  const N = 26;
  const badge = spring({frame: frame - 5, fps, config: {damping: 10}});
  const pulse = beatPulse(frame);
  const count = Math.round(interpolate(frame, [0, 85], [0, 12480], {...clamp, easing: Easing.out(Easing.quad)}));
  return (
    <AbsoluteFill style={{background: colors.ink}}>
      <Grid dark />
      {Array.from({length: N}).map((_, k) => {
        const start = k * 2;
        const t = interpolate(frame, [start, start + 40], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
        const ang = random(`a${k}`) * Math.PI * 2;
        const r = 900 + random(`r${k}`) * 500;
        const x = cx + Math.cos(ang) * r * (1 - t);
        const y = cy + Math.sin(ang) * r * (1 - t);
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 150,
              padding: 14,
              background: colors.white,
              borderRadius: 10,
              fontFamily: font,
              fontSize: 14,
              color: colors.ink,
              transform: `translate(-50%,-50%) rotate(${(1 - t) * 540 * (random(`d${k}`) - 0.5)}deg) scale(${1 - t * 0.9})`,
              opacity: t >= 1 ? 0 : 1,
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{fontWeight: 700, marginBottom: 6}}>Чек № {1000 + k}</div>
            {seg.items.map(([n, p]) => (
              <div key={n} style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>{n}</span>
                <span>{p}</span>
              </div>
            ))}
            <div style={{borderTop: '1px dashed #999', marginTop: 6, paddingTop: 4, fontWeight: 700}}>Итого {seg.total} ₽</div>
          </div>
        );
      })}
      {/* ОФД в центре с кольцами */}
      {[0, 1, 2].map((k) => {
        const rf = (frame + k * 20) % 60;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: cx,
              top: cy,
              width: 260 + rf * 12,
              height: 260 + rf * 12,
              borderRadius: '50%',
              border: `4px solid ${colors.sky}`,
              opacity: 1 - rf / 60,
              transform: 'translate(-50%,-50%)',
            }}
          />
        );
      })}
      <Img
        src={staticFile('ofd-24.svg')}
        style={{position: 'absolute', left: cx - 140, top: cy - 140, width: 280, height: 280, borderRadius: 70, transform: `scale(${badge * (1 + pulse * 0.08)})`}}
      />
      <div style={{position: 'absolute', top: 200, width: '100%', textAlign: 'center', fontFamily: font, color: colors.white}}>
        <div style={{fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1}}>
          Чеки — в ОФД
          <br />
          <span style={{color: colors.sky}}>автоматически</span>
        </div>
      </div>
      <div style={{position: 'absolute', top: 1500, width: '100%', textAlign: 'center', fontFamily: font, color: colors.white}}>
        <div style={{fontSize: 150, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: -4}}>{count.toLocaleString('ru-RU')}</div>
        <div style={{fontSize: 44, color: 'rgba(255,255,255,0.6)'}}>чеков передано в ФНС ✓</div>
      </div>
    </AbsoluteFill>
  );
};

/* 5. Телефон с аналитикой: столбики растут в такт */
const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 15}});
  const bars = [0.45, 0.62, 0.38, 0.7, 0.55, 0.82, 0.6, 0.9, 0.74, 1];
  const rev = Math.round(interpolate(frame, [0, 100], [0, 378783], {...clamp, easing: Easing.out(Easing.cubic)}));
  const tilt = interpolate(frame, [0, 120], [18, -8]);
  return (
    <AbsoluteFill style={{background: colors.blue}}>
      <Grid dark />
      <div style={{position: 'absolute', top: 150, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Punch at={0} size={120} color={colors.white}>
          Выручка
        </Punch>
        <Punch at={BEAT} size={120} color={colors.ink}>
          в кармане
        </Punch>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', perspective: 1800}}>
        <div
          style={{
            width: 620,
            height: 1240,
            borderRadius: 90,
            background: colors.ink,
            padding: 22,
            boxShadow: '0 80px 140px rgba(0,30,80,0.5)',
            transform: `translateY(${(1 - p) * 900}px) rotateY(${tilt}deg) rotateX(6deg)`,
          }}
        >
          <div style={{width: '100%', height: '100%', borderRadius: 70, background: colors.white, padding: '90px 50px', fontFamily: font, position: 'relative', overflow: 'hidden'}}>
            <div style={{position: 'absolute', top: 24, left: '50%', marginLeft: -80, width: 160, height: 36, borderRadius: 20, background: colors.ink}} />
            <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
              <Img src={staticFile('ofd-24.svg')} style={{width: 70, height: 70, borderRadius: 18}} />
              <div style={{fontSize: 34, fontWeight: 700}}>Моя точка · сегодня</div>
            </div>
            <div style={{fontSize: 30, color: colors.gray, marginTop: 50}}>Выручка за месяц, ₽</div>
            <div style={{fontSize: 96, fontWeight: 700, letterSpacing: -3, fontVariantNumeric: 'tabular-nums'}}>{rev.toLocaleString('ru-RU')}</div>
            <div style={{display: 'flex', gap: 14, marginTop: 20}}>
              {[['Чеков', '1 600'], ['Ср. чек', '362 ₽']].map(([a, b]) => (
                <div key={a} style={{flex: 1, background: colors.mist, borderRadius: 24, padding: '20px 24px'}}>
                  <div style={{fontSize: 24, color: colors.gray}}>{a}</div>
                  <div style={{fontSize: 44, fontWeight: 700}}>{b}</div>
                </div>
              ))}
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 380, marginTop: 60}}>
              {bars.map((h, k) => {
                const grow = spring({frame: frame - 10 - k * (BEAT / 2), fps, config: {damping: 11}});
                return <div key={k} style={{flex: 1, height: `${h * 100 * grow}%`, background: k === bars.length - 1 ? colors.deep : colors.blue, borderRadius: 10}} />;
              })}
            </div>
          </div>
        </div>
      </div>
      {/* всплывающий push */}
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 1640,
          background: colors.white,
          borderRadius: 36,
          padding: '28px 36px',
          fontFamily: font,
          display: 'flex',
          gap: 24,
          alignItems: 'center',
          boxShadow: '0 30px 80px rgba(0,30,80,0.35)',
          transform: `translateY(${(1 - spring({frame: frame - 70, fps, config: {damping: 12}})) * 400}px)`,
        }}
      >
        <Img src={staticFile('ofd-24.svg')} style={{width: 80, height: 80, borderRadius: 20}} />
        <div>
          <div style={{fontSize: 26, color: colors.gray}}>Контур.ОФД · сейчас</div>
          <div style={{fontSize: 36, fontWeight: 700}}>Срок ФН истекает через 30 дней</div>
        </div>
      </div>
      <Flash at={0} />
    </AbsoluteFill>
  );
};

/* 6. Финал */
const Final: React.FC<{cta: string}> = ({cta}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 10}});
  const btn = spring({frame: frame - BEAT, fps, config: {damping: 8}});
  const pulse = beatPulse(frame, 6);
  return (
    <AbsoluteFill style={{background: colors.white}}>
      <Grid />
      {/* конфетти из фирменных цветов */}
      {Array.from({length: 40}).map((_, k) => {
        const t = frame / 30;
        const vx = (random(`vx${k}`) - 0.5) * 1400;
        const vy = -600 - random(`vy${k}`) * 900;
        const x = 540 + vx * t;
        const y = 960 + vy * t + 900 * t * t;
        const c = [colors.blue, colors.sky, colors.ink, colors.mist][k % 4];
        return (
          <div
            key={k}
            style={{position: 'absolute', left: x, top: y, width: 26, height: 14, background: c, borderRadius: 4, transform: `rotate(${frame * (8 + k)}deg)`, opacity: interpolate(frame, [0, 70], [1, 0], clamp)}}
          />
        );
      })}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 70}}>
        <Img src={staticFile('market-24.svg')} style={{width: 260, height: 260, borderRadius: 64, transform: `scale(${p * (1 + pulse * 0.05)})`, boxShadow: '0 50px 100px rgba(34,145,255,0.4)'}} />
        <Img src={staticFile('logo-market-32.svg')} style={{height: 100, opacity: p}} />
        <div style={{fontFamily: font, fontSize: 64, fontWeight: 500, textAlign: 'center', color: colors.ink, opacity: p, lineHeight: 1.15}}>
          Торгуйте.
          <br />
          <span style={{color: colors.blue}}>Рутину возьмём на себя</span>
        </div>
        <div
          style={{
            transform: `scale(${btn * (1 + pulse * 0.04)})`,
            background: colors.blue,
            color: colors.white,
            fontFamily: font,
            fontWeight: 700,
            fontSize: 60,
            padding: '40px 80px',
            borderRadius: 30,
            boxShadow: '0 30px 70px rgba(34,145,255,0.5)',
          }}
        >
          {cta}
        </div>
        <div style={{fontFamily: font, fontSize: 50, fontWeight: 700, color: colors.ink, opacity: btn}}>{site}</div>
      </AbsoluteFill>
      <Flash at={0} />
    </AbsoluteFill>
  );
};

export const Vertical: React.FC<VerticalProps> = ({segment, cta}) => {
  const seg = SEGMENTS[segment];
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [V_TOTAL - 30, V_TOTAL], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: colors.ink}}>
      <Audio src={staticFile('beat.wav')} volume={volume} />
      <Sequence durationInFrames={bar(2)}>
        <Chaos />
      </Sequence>
      <Sequence from={bar(2)} durationInFrames={bar(1)}>
        <Drop />
      </Sequence>
      <Sequence from={bar(3)} durationInFrames={bar(2)}>
        <Hero seg={seg} />
      </Sequence>
      <Sequence from={bar(5)} durationInFrames={bar(1.5)}>
        <Storm seg={seg} />
      </Sequence>
      <Sequence from={bar(6.5)} durationInFrames={bar(2)}>
        <Phone />
      </Sequence>
      <Sequence from={bar(8.5)}>
        <Final cta={cta} />
      </Sequence>
    </AbsoluteFill>
  );
};
