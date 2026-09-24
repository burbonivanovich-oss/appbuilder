import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {slide} from '@remotion/transitions/slide';
import {noise2D, noise3D} from '@remotion/noise';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {makeCircle, Circle} from '@remotion/shapes';
import {Trail} from '@remotion/motion-blur';
import {C, fontFamily} from './brand';

const T = 18; // длительность переходов
const S = {hook: 120, chart: 165, notice: 180, stores: 150, decide: 165, pack: 150};
export const TOTAL = Object.values(S).reduce((a, b) => a + b, 0) - 5 * T;

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const useUnit = () => {
  const {width, height} = useVideoConfig();
  return Math.min(width, height) / 1080;
};

const Caption: React.FC<{children: React.ReactNode; delay?: number; color?: string; size?: number}> = ({
  children,
  delay = 0,
  color = C.ink,
  size = 84,
}) => {
  const f = useCurrentFrame();
  const u = useUnit();
  const words = String(children).split(' ');
  return (
    <div style={{fontFamily, fontWeight: 800, fontSize: size * u, color, lineHeight: 1.05, letterSpacing: -2 * u, textAlign: 'center'}}>
      {words.map((w, i) => {
        const p = interpolate(f - delay - i * 3, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: 8 * u}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`}}>{w}&nbsp;</span>
          </span>
        );
      })}
    </div>
  );
};

/* 1. Хук: хаос цифр, дрейфующих по шуму Перлина */
const NUMS = ['+12 480 ₽', '−3 шт', 'возврат', '−15%', 'списание', '1 870 ₽', 'закупка', 'остаток 0', '+4 200 ₽', 'наценка', 'чек №2291', '−640 ₽'];
const Hook = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const calm = interpolate(f, [15, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: C.light, alignItems: 'center', justifyContent: 'center'}}>
      {Array.from({length: 48}).map((_, i) => {
        const bx = ((i * 97) % 100) / 100;
        const by = ((i * 61) % 100) / 100;
        const x = bx * width + noise3D('x', i, 0, f / 90) * 160 * u;
        const y = by * height + noise3D('y', i, 0, f / 90) * 160 * u;
        const o = 0.25 + 0.5 * Math.abs(noise2D('o', i, f / 60));
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, fontFamily, fontWeight: 600, fontSize: (22 + (i % 4) * 10) * u, color: i % 7 === 0 ? C.red : C.ink, opacity: o * (1 - calm * 0.75), filter: `blur(${calm * 6}px)`, whiteSpace: 'nowrap'}}>
            {NUMS[i % NUMS.length]}
          </div>
        );
      })}
      <div style={{padding: 60 * u}}>
        <Caption delay={10}>Каждый день бизнес говорит цифрами.</Caption>
        <div style={{height: 20 * u}} />
        <Caption delay={45} color={C.red} size={64}>Кто их слушает?</Caption>
      </div>
    </AbsoluteFill>
  );
};

/* 2. Проблема: выручка вверх, прибыль вниз — линии рисуются через evolvePath */
const REV = 'M 0 300 C 150 280, 250 240, 400 200 S 650 110, 800 60';
const PROFIT = 'M 0 250 C 150 240, 250 230, 400 250 S 650 300, 800 340';
const Chart = () => {
  const f = useCurrentFrame();
  const u = useUnit();
  const p = interpolate(f, [10, 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const r = evolvePath(p, REV);
  const q = evolvePath(p, PROFIT);
  const len = getLength(PROFIT);
  const tip = getPointAtLength(PROFIT, Math.max(0.01, p * len));
  const pulse = 1 + 0.25 * Math.sin(f / 4);
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', gap: 40 * u}}>
      <svg viewBox="-40 0 1000 400" style={{width: 1200 * u, maxWidth: '92%'}}>
        {[80, 160, 240, 320].map((y) => (
          <line key={y} x1={0} x2={800} y1={y} y2={y} stroke={C.light} strokeWidth={2} />
        ))}
        <path d={REV} fill="none" stroke={C.blue} strokeWidth={10} strokeLinecap="round" strokeDasharray={r.strokeDasharray} strokeDashoffset={r.strokeDashoffset} />
        <path d={PROFIT} fill="none" stroke={C.red} strokeWidth={10} strokeLinecap="round" strokeDasharray={q.strokeDasharray} strokeDashoffset={q.strokeDashoffset} />
        <circle cx={tip.x} cy={tip.y} r={14 * (p > 0.98 ? pulse : 1)} fill={C.red} />
        <text x={810} y={70} fontFamily={fontFamily} fontWeight={600} fontSize={26} fill={C.blue} opacity={p}>выручка</text>
        <text x={640} y={380} fontFamily={fontFamily} fontWeight={600} fontSize={26} fill={C.red} opacity={p}>прибыль</text>
      </svg>
      <Caption delay={85} size={72}>Выручка растёт. А прибыль — нет.</Caption>
    </AbsoluteFill>
  );
};

/* 3. Марк замечает: сканирующее кольцо + всплывающий сигнал */
const Notice = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useUnit();
  const ring = makeCircle({radius: 220 * u});
  const sweep = evolvePath(interpolate(f, [0, 40], [0, 1], {extrapolateRight: 'clamp', easing: ease}), ring.path);
  const card = spring({frame: f - 45, fps, config: {damping: 14, mass: 0.8}});
  const typed = 'Скидки на молочную группу за неделю сократили маржу. Проверьте акцию.';
  const chars = Math.floor(interpolate(f, [70, 140], [0, typed.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <AbsoluteFill style={{background: C.ink, alignItems: 'center', justifyContent: 'center'}}>
      {[0, 1, 2].map((i) => {
        const w = ((f + i * 20) % 60) / 60;
        return <div key={i} style={{position: 'absolute', width: 440 * u, height: 440 * u, borderRadius: '50%', border: `${3 * u}px solid ${C.blue}`, transform: `scale(${1 + w * 1.6})`, opacity: (1 - w) * 0.5}} />;
      })}
      <svg width={ring.width + 20} height={ring.height + 20} style={{position: 'absolute'}}>
        <path d={ring.path} transform="translate(10 10)" fill="none" stroke={C.red} strokeWidth={8 * u} strokeLinecap="round" strokeDasharray={sweep.strokeDasharray} strokeDashoffset={sweep.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', top: '12%', width: '100%'}}>
        <Caption color={C.white} size={96}>Марк замечает.</Caption>
      </div>
      <div
        style={{
          transform: `translateY(${(1 - card) * 300}px) scale(${0.8 + card * 0.2})`,
          opacity: card,
          background: C.white,
          borderRadius: 28 * u,
          padding: `${36 * u}px ${44 * u}px`,
          width: 900 * u,
          maxWidth: '88%',
          boxShadow: '0 30px 80px rgba(0,0,0,.4)',
          fontFamily,
          borderLeft: `${12 * u}px solid ${C.red}`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16 * u, fontWeight: 600, color: C.red, fontSize: 30 * u}}>
          <Circle radius={9 * u} fill={C.red} style={{opacity: 0.5 + 0.5 * Math.sin(f / 3)}} /> Марк · сигнал
        </div>
        <div style={{fontSize: 44 * u, fontWeight: 600, color: C.ink, marginTop: 14 * u, minHeight: 110 * u, lineHeight: 1.2}}>
          {typed.slice(0, chars)}
          <span style={{opacity: f % 20 < 10 ? 1 : 0, color: C.blue}}>▍</span>
        </div>
      </div>
      <div style={{position: 'absolute', bottom: '8%', width: '100%'}}>
        <Caption delay={140} color={C.gray} size={40}>Без отчётов, выгрузок и промптов.</Caption>
      </div>
    </AbsoluteFill>
  );
};

/* 4. Несколько точек: сетка магазинов, одна отклоняется */
const Stores = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useUnit();
  const cols = 8, rows = 4, bad = 19;
  const zoom = interpolate(f, [60, 120], [1, 1.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const bx = (bad % cols) - (cols - 1) / 2;
  const by = Math.floor(bad / cols) - (rows - 1) / 2;
  const gap = 120 * u;
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{transform: `scale(${zoom}) translate(${-bx * gap * (zoom - 1) / zoom}px, ${-by * gap * (zoom - 1) / zoom}px)`, display: 'grid', gridTemplateColumns: `repeat(${cols}, ${gap}px)`, gridAutoRows: gap, placeItems: 'center'}}>
        {Array.from({length: cols * rows}).map((_, i) => {
          const s = spring({frame: f - i * 1.2, fps, config: {damping: 12}});
          const isBad = i === bad && f > 40;
          const shake = isBad ? noise2D('s', f / 3, 0) * 6 * u : 0;
          return (
            <div key={i} style={{width: 70 * u, height: 70 * u, borderRadius: 18 * u, transform: `scale(${s}) translateX(${shake}px)`, background: isBad ? C.red : C.light, boxShadow: isBad ? `0 0 ${40 * u}px ${C.red}` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontFamily, fontWeight: 800, fontSize: 34 * u}}>
              {isBad ? '!' : ''}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', bottom: '9%', width: '100%', background: 'rgba(255,255,255,.85)', padding: 20 * u}}>
        <Caption delay={70} size={60}>Отклонение в одной точке — раньше, чем в общем отчёте.</Caption>
      </div>
    </AbsoluteFill>
  );
};

/* 5. Решение за человеком: курсор с motion blur нажимает «Подтвердить» */
const Cursor: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <svg width={48 * s} height={48 * s} viewBox="0 0 24 24" style={{position: 'absolute', left: x, top: y}}>
    <path d="M3 2l7 19 2.5-8L20 10z" fill={C.ink} stroke={C.white} strokeWidth={1.5} />
  </svg>
);
const MovingCursor = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useUnit();
  const p = interpolate(f, [30, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return <Cursor x={interpolate(p, [0, 1], [width * 0.85, width / 2 - 150 * u])} y={interpolate(p, [0, 1], [height * 0.9, height / 2 + 70 * u])} s={u} />;
};
const Decide = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useUnit();
  const press = spring({frame: f - 72, fps, config: {damping: 10}});
  const done = f > 78;
  const btn = (label: string, primary: boolean) => (
    <div style={{padding: `${22 * u}px ${40 * u}px`, borderRadius: 14 * u, fontWeight: 600, fontSize: 34 * u, background: primary ? (done ? '#1BA35A' : C.blue) : C.light, color: primary ? C.white : C.ink, transform: primary ? `scale(${1 - 0.08 * Math.sin(press * Math.PI)})` : undefined}}>
      {primary && done ? '✓ Подтверждено' : label}
    </div>
  );
  return (
    <AbsoluteFill style={{background: C.light, alignItems: 'center', justifyContent: 'center', fontFamily, gap: 60 * u}}>
      <div style={{background: C.white, borderRadius: 28 * u, padding: 44 * u, width: 860 * u, maxWidth: '88%', boxShadow: '0 20px 60px rgba(0,0,0,.12)'}}>
        <div style={{color: C.blueDark, fontWeight: 600, fontSize: 28 * u}}>Марк предлагает</div>
        <div style={{fontSize: 42 * u, fontWeight: 600, color: C.ink, margin: `${12 * u}px 0 ${30 * u}px`, lineHeight: 1.2}}>Сократить скидку на молочную группу с 15% до 7%</div>
        <div style={{display: 'flex', gap: 20 * u}}>
          {btn('Подтвердить', true)}
          {btn('Не сейчас', false)}
        </div>
      </div>
      <Caption delay={95} size={80}>Решение — за вами.</Caption>
      <Trail layers={6} lagInFrames={0.4} trailOpacity={0.6}>
        <MovingCursor />
      </Trail>
    </AbsoluteFill>
  );
};

/* 6. Пэкшот */
const Logo: React.FC<{u: number}> = ({u}) => (
  // Упрощённый словесный знак. Для эфира замените на официальный SVG-логотип из брендбука Контура.
  <div style={{display: 'flex', alignItems: 'center', gap: 18 * u, fontFamily, fontWeight: 800, fontSize: 64 * u, color: C.ink, letterSpacing: -1.5 * u}}>
    <div style={{width: 64 * u, height: 64 * u, borderRadius: 16 * u, background: C.red}} />
    Контур<span style={{color: C.red}}>.</span>Маркет
  </div>
);
const Pack = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useUnit();
  const a = spring({frame: f, fps, config: {damping: 200}});
  const b = spring({frame: f - 20, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', fontFamily, gap: 30 * u}}>
      <div style={{opacity: a, transform: `translateY(${(1 - a) * 40}px)`}}>
        <Logo u={u} />
      </div>
      <div style={{transform: `scale(${b})`, fontWeight: 800, fontSize: 200 * u, color: C.red, letterSpacing: -8 * u, lineHeight: 1}}>Марк</div>
      <Caption delay={35} size={48}>Следит за цифрами. Замечает важное. Решаете вы.</Caption>
      <div style={{opacity: interpolate(f, [60, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), fontSize: 30 * u, color: C.blueDark, fontWeight: 600}}>
        kontur.ru/market
      </div>
      <div style={{position: 'absolute', bottom: 30 * u, fontSize: 18 * u, color: '#888', textAlign: 'center', padding: `0 ${40 * u}px`}}>
        Сервис в разработке. Сценарии и сигналы в ролике иллюстративные, не результаты клиентов.
      </div>
    </AbsoluteFill>
  );
};

export const MarkPromo = () => {
  const lt = linearTiming({durationInFrames: T, easing: ease});
  return (
    <AbsoluteFill style={{background: C.white}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={S.hook}><Hook /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.chart}><Chart /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={clockWipe({width: 1920, height: 1920})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.notice}><Notice /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={springTiming({durationInFrames: T, config: {damping: 200}})} />
        <TransitionSeries.Sequence durationInFrames={S.stores}><Stores /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-top-right'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.decide}><Decide /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.pack}><Pack /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
