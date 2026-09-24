import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {wipe} from '@remotion/transitions/wipe';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';
import {noise2D} from '@remotion/noise';
import {evolvePath} from '@remotion/paths';
import {Trail} from '@remotion/motion-blur';
import {C, fontFamily} from './brand';

const T = 16;
const S = {hook: 150, intro: 120, how: 210, signals: 330, systems: 180, decide: 150, pack: 150};
export const TOTAL = Object.values(S).reduce((a, b) => a + b, 0) - 6 * T;

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const useU = () => {
  const {width, height} = useVideoConfig();
  return Math.min(width, height) / 1080;
};

/* Кинетическая типографика: слова выезжают из-под маски */
const Title: React.FC<{text: string; delay?: number; size?: number; color?: string; weight?: number}> = ({text, delay = 0, size = 80, color = C.ink, weight = 800}) => {
  const f = useCurrentFrame();
  const u = useU();
  return (
    <div style={{fontFamily, fontWeight: weight, fontSize: size * u, color, lineHeight: 1.1, letterSpacing: -0.02 * size * u, textAlign: 'center'}}>
      {text.split(' ').map((w, i) => {
        const p = interpolate(f - delay - i * 2.5, [0, 14], [0, 1], {...clamp, easing: ease});
        return (
          <span key={i} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: 0.12 * size * u}}>
            <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`}}>{w}&nbsp;</span>
          </span>
        );
      })}
    </div>
  );
};

/* Персонаж «Марк»: форма и градиент иконки продукта Маркет, плюс «взгляд» — глаза следят и моргают */
const MarkAvatar: React.FC<{size: number; look?: number}> = ({size, look = 0}) => {
  const f = useCurrentFrame();
  const blink = f % 75 > 70 ? 0.15 : 1;
  const lx = look * size * 0.06 + noise2D('eye', f / 50, 0) * size * 0.015;
  return (
    <div style={{width: size, height: size, borderRadius: size * 0.26, background: `linear-gradient(145deg, ${C.sky}, ${C.blue})`, position: 'relative', boxShadow: `0 ${size * 0.15}px ${size * 0.4}px rgba(34,145,255,.35)`}}>
      {[-1, 1].map((s) => (
        <div key={s} style={{position: 'absolute', top: size * 0.3 + size * 0.1 * (1 - blink), left: size * 0.43 + s * size * 0.15 + lx, width: size * 0.14, height: size * 0.2 * blink, borderRadius: size, background: C.white}} />
      ))}
      <svg viewBox="0 0 24 12" style={{position: 'absolute', left: size * 0.3, top: size * 0.6, width: size * 0.4}}>
        <path d="M4 2 Q12 10 20 2" stroke={C.white} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/* ---------- 1. Хук: бесконечные отчёты ---------- */
const Hook = () => {
  const f = useCurrentFrame();
  const u = useU();
  const dim = interpolate(f, [50, 75], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: C.light, fontFamily}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-f * 9 * u}px) rotate(-4deg) scale(1.2)`, filter: `blur(${dim * 6}px)`, opacity: 1 - dim * 0.65}}>
        {Array.from({length: 40}).map((_, i) => (
          <div key={i} style={{display: 'flex', gap: 12 * u, padding: `${6 * u}px ${80 * u}px`}}>
            {['Товар ' + (1000 + i * 37), ((i * 7919) % 900) + ' шт', ((i * 104729) % 90000).toLocaleString('ru') + ' ₽', (i % 5 === 0 ? '−' : '+') + ((i * 13) % 30) + '%', 'остаток ' + ((i * 31) % 120), 'списано ' + (i % 9)].map((c, j) => (
              <div key={j} style={{flex: 1, background: C.white, borderRadius: 8 * u, padding: `${14 * u}px ${18 * u}px`, fontSize: 24 * u, color: C.gray}}>{c}</div>
            ))}
          </div>
        ))}
      </div>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: 80 * u}}>
        <Title text="Отчёты есть." delay={55} size={110} />
        <Title text="Времени смотреть их — нет." delay={75} size={110} color={C.blue} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- 2. Знакомство ---------- */
const Intro = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const pop = spring({frame: f, fps, config: {damping: 11}});
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', gap: 36 * u, fontFamily, padding: 60 * u}}>
      <div style={{transform: `scale(${pop}) rotate(${(1 - pop) * -20}deg)`}}>
        <MarkAvatar size={220 * u} look={Math.sin(f / 20)} />
      </div>
      <Title text="Знакомьтесь, это Марк" delay={10} size={100} />
      <Title text="ИИ‑помощник для владельцев магазинов и сферы услуг" delay={30} size={46} weight={600} color={C.gray} />
    </AbsoluteFill>
  );
};

/* ---------- 3. Как работает: данные → Марк → сигнал ---------- */
const SOURCES = ['Продажи', 'Закупки', 'Остатки', 'Списания', 'Цены', 'Платежи'];
const How = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const W = 1600, H = 620;
  const hub = {x: 800, y: 330};
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', fontFamily}}>
      <div style={{position: 'absolute', top: '7%', width: '100%'}}>
        <Title text="Марк сам читает данные вашей учётной системы" size={62} />
      </div>
      <div style={{position: 'relative', width: W * u, height: H * u, marginTop: 100 * u}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          {SOURCES.map((_, i) => {
            const y = 60 + i * 100;
            const d = `M 330 ${y} C 560 ${y}, 560 ${hub.y}, ${hub.x - 110} ${hub.y}`;
            const p = interpolate(f, [15 + i * 5, 55 + i * 5], [0, 1], {...clamp, easing: ease});
            const e = evolvePath(p, d);
            const t = ((f * 2 + i * 23) % 100) / 100; // «пакет данных» бежит по линии
            return (
              <g key={i}>
                <path d={d} stroke={C.line} strokeWidth={3} fill="none" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
                {p === 1 && <path d={d} stroke={C.sky} strokeWidth={7} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={-t} />}
              </g>
            );
          })}
          {(() => {
            const d = `M ${hub.x + 110} ${hub.y} L 1150 ${hub.y}`;
            const e = evolvePath(interpolate(f, [80, 100], [0, 1], clamp), d);
            return <path d={d} stroke={C.blue} strokeWidth={6} fill="none" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />;
          })()}
        </svg>
        {SOURCES.map((s, i) => {
          const a = spring({frame: f - i * 4, fps, config: {damping: 14}});
          return (
            <div key={s} style={{position: 'absolute', left: 60 * u, top: (26 + i * 100) * u, width: 270 * u, height: 68 * u, borderRadius: 14 * u, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 * u, fontWeight: 600, color: C.ink, transform: `translateX(${(1 - a) * -200}px)`, opacity: a}}>{s}</div>
          );
        })}
        <div style={{position: 'absolute', left: (hub.x - 100) * u, top: (hub.y - 100) * u, transform: `scale(${1 + 0.04 * Math.sin(f / 5)})`}}>
          <MarkAvatar size={200 * u} look={-0.8} />
        </div>
        <SignalCard x={1150 * u} y={(hub.y - 110) * u} delay={98} />
      </div>
      <div style={{position: 'absolute', bottom: '6%', width: '100%'}}>
        <Title text="Без выгрузок, таблиц и промптов" delay={130} size={46} weight={600} color={C.blue} />
      </div>
    </AbsoluteFill>
  );
};
const SignalCard: React.FC<{x: number; y: number; delay: number}> = ({x, y, delay}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const a = spring({frame: f - delay, fps, config: {damping: 12}});
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 420 * u, transform: `scale(${a})`, transformOrigin: 'left center', background: C.white, borderRadius: 24 * u, padding: 28 * u, boxShadow: '0 20px 60px rgba(0,40,100,.18)', borderTop: `${8 * u}px solid ${C.blue}`}}>
      <div style={{fontSize: 22 * u, fontWeight: 600, color: C.blue, letterSpacing: 1}}>СИГНАЛ</div>
      <div style={{fontSize: 36 * u, fontWeight: 800, color: C.ink, marginTop: 8 * u, lineHeight: 1.1}}>Что изменилось</div>
      <div style={{fontSize: 26 * u, color: C.gray, marginTop: 10 * u, lineHeight: 1.3}}>почему это важно<br />и что проверить</div>
    </div>
  );
};

/* ---------- 4. Что именно замечает: лента сигналов в телефоне ---------- */
const SIGNALS = [
  {k: 'Выручка растёт, прибыль падает', why: 'Выручка +12%, прибыль −4% за месяц. Причина — скидка 15% на молочку.', act: 'Пересмотреть акцию', chart: 'diverge'},
  {k: 'Деньги заморожены в товаре', why: '380 000 ₽ лежат в позициях без продаж больше 60 дней.', act: 'Показать список', chart: 'bars'},
  {k: 'Одна точка отстаёт', why: 'Магазин на Садовой: средний чек −18%, у остальных точек — в норме.', act: 'Сравнить точки', chart: 'dots'},
];
const MiniChart: React.FC<{kind: string; p: number}> = ({kind, p}) => {
  const box = {width: '100%', height: '100%'};
  if (kind === 'diverge') {
    const A = 'M0 70 C 60 60, 120 40, 200 10', B = 'M0 50 C 60 48, 120 60, 200 80';
    const a = evolvePath(p, A), b = evolvePath(p, B);
    return (
      <svg viewBox="-6 0 212 90" style={box}>
        <path d={A} stroke={C.sky} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={a.strokeDasharray} strokeDashoffset={a.strokeDashoffset} />
        <path d={B} stroke={C.ink} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={b.strokeDasharray} strokeDashoffset={b.strokeDashoffset} />
        <text x={0} y={89} fontSize={14} fill={C.blue} fontFamily={fontFamily} opacity={p}>выручка</text>
        <text x={0} y={38} fontSize={14} fill={C.ink} fontFamily={fontFamily} opacity={p}>прибыль</text>
      </svg>
    );
  }
  if (kind === 'bars')
    return (
      <svg viewBox="0 0 200 90" style={box}>
        {[60, 40, 70, 20, 85, 30, 50].map((h, i) => (
          <rect key={i} x={i * 29} y={90 - h * p} width={22} height={h * p} rx={4} fill={i === 4 ? C.blue : C.line} />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 200 90" style={box}>
      {Array.from({length: 12}).map((_, i) => (
        <circle key={i} cx={20 + (i % 6) * 32} cy={25 + Math.floor(i / 6) * 40} r={(i === 8 ? 14 : 10) * p} fill={i === 8 ? C.blue : C.line} />
      ))}
    </svg>
  );
};
const Signals = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const per = 100;
  const idx = Math.min(2, Math.floor(f / per));
  return (
    <AbsoluteFill style={{background: C.blueTint, fontFamily, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 90 * u, flexWrap: 'wrap'}}>
      <div style={{width: 700 * u}}>
        <div style={{fontSize: 36 * u, fontWeight: 600, color: C.blue}}>Что замечает Марк</div>
        {SIGNALS.map((s, i) => {
          const on = interpolate(f, [i * per, i * per + 12], [0, 1], clamp);
          return (
            <div key={i} style={{fontSize: 56 * u, fontWeight: 800, lineHeight: 1.1, marginTop: 28 * u, color: i === idx ? C.ink : C.line, opacity: on, transform: `translateX(${(1 - on) * 40}px)`}}>
              {s.k}
            </div>
          );
        })}
      </div>
      <div style={{width: 470 * u, height: 900 * u, borderRadius: 64 * u, background: C.ink, padding: 16 * u, boxShadow: '0 40px 100px rgba(0,40,100,.3)'}}>
        <div style={{width: '100%', height: '100%', borderRadius: 50 * u, background: C.light, overflow: 'hidden', position: 'relative'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 14 * u, padding: `${50 * u}px ${28 * u}px ${20 * u}px`, background: C.white}}>
            <MarkAvatar size={56 * u} />
            <div>
              <div style={{fontSize: 28 * u, fontWeight: 800, color: C.ink}}>Марк</div>
              <div style={{fontSize: 18 * u, color: C.gray}}>следит за вашим бизнесом</div>
            </div>
          </div>
          {SIGNALS.map((s, i) => {
            const local = f - i * per;
            if (local < 0) return null;
            const a = spring({frame: local, fps, config: {damping: 15}});
            // предыдущие карточки уходят «в стопку» наверх
            const back = spring({frame: f - (i + 1) * per, fps, config: {damping: 20}}) * (i < idx ? 1 : 0);
            return (
              <div key={i} style={{position: 'absolute', left: 20 * u, right: 20 * u, top: 150 * u, transform: `translateY(${(1 - a) * 700 * u - back * 30 * u}px) scale(${1 - back * 0.08})`, opacity: 1 - back * 0.5, background: C.white, borderRadius: 28 * u, padding: 26 * u, boxShadow: '0 10px 30px rgba(0,0,0,.08)'}}>
                <div style={{fontSize: 18 * u, fontWeight: 600, color: C.blue}}>● Новый сигнал</div>
                <div style={{fontSize: 32 * u, fontWeight: 800, color: C.ink, margin: `${8 * u}px 0`, lineHeight: 1.1}}>{s.k}</div>
                <div style={{height: 120 * u, margin: `${14 * u}px 0`}}>
                  <MiniChart kind={s.chart} p={interpolate(local, [10, 50], [0, 1], {...clamp, easing: ease})} />
                </div>
                <div style={{fontSize: 22 * u, color: C.ink, lineHeight: 1.3}}><b>Почему:</b> {s.why}</div>
                <div style={{marginTop: 18 * u, background: C.blue, color: C.white, borderRadius: 14 * u, padding: 14 * u, textAlign: 'center', fontSize: 24 * u, fontWeight: 600}}>{s.act}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 5. Разные учётные системы ---------- */
const Systems = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const col = (i: number, title: React.ReactNode, body: string, btn: string) => {
    const a = spring({frame: f - 20 - i * 15, fps, config: {damping: 14}});
    return (
      <div style={{width: 640 * u, background: C.white, borderRadius: 32 * u, padding: 44 * u, transform: `translateY(${(1 - a) * 80}px)`, opacity: a, boxShadow: '0 20px 60px rgba(0,40,100,.1)'}}>
        <div style={{height: 56 * u, display: 'flex', alignItems: 'center'}}>{title}</div>
        <div style={{fontSize: 34 * u, fontWeight: 600, color: C.ink, margin: `${24 * u}px 0`, lineHeight: 1.25}}>{body}</div>
        <div style={{display: 'inline-block', background: i === 0 ? C.blue : C.light, color: i === 0 ? C.white : C.ink, borderRadius: 14 * u, padding: `${16 * u}px ${28 * u}px`, fontSize: 28 * u, fontWeight: 600}}>{btn}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{background: C.light, alignItems: 'center', justifyContent: 'center', fontFamily, gap: 60 * u, padding: 40 * u}}>
      <Title text="Работает не только с Контур.Маркетом" size={70} />
      <div style={{display: 'flex', gap: 40 * u, flexWrap: 'wrap', justifyContent: 'center'}}>
        {col(0, <Img src={staticFile('brand/logo-market-32.svg')} style={{height: 48 * u}} />, 'Подтверждаете действие прямо в продукте', 'Подтвердить')}
        {col(1, <div style={{fontSize: 38 * u, fontWeight: 800, color: C.ink}}>Другая учётная система</div>, 'Получаете подсказку и вносите изменение сами', 'Понятно')}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 6. Решение за человеком ---------- */
const Cursor: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const u = useU();
  const p = interpolate(f, [20, 55], [0, 1], {...clamp, easing: ease});
  return (
    <svg width={56 * u} height={56 * u} viewBox="0 0 24 24" style={{position: 'absolute', left: interpolate(p, [0, 1], [width * 0.9, width / 2 + 80 * u]), top: interpolate(p, [0, 1], [height * 0.95, height / 2 + 10 * u])}}>
      <path d="M3 2l7 19 2.5-8L20 10z" fill={C.ink} stroke={C.white} strokeWidth={1.5} />
    </svg>
  );
};
const Decide = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const press = spring({frame: f - 58, fps, config: {damping: 10}});
  const done = f > 62;
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', fontFamily, gap: 50 * u}}>
      <Title text="Марк подсказывает." size={90} />
      <div style={{padding: `${26 * u}px ${60 * u}px`, borderRadius: 18 * u, fontWeight: 600, fontSize: 44 * u, color: C.white, background: done ? C.good : C.blue, transform: `scale(${1 - 0.08 * Math.sin(press * Math.PI)})`}}>
        {done ? '✓ Решение принято' : 'Принять решение'}
      </div>
      <Title text="Решаете вы." delay={70} size={90} color={C.blue} />
      <Trail layers={6} lagInFrames={0.4} trailOpacity={0.6}>
        <Cursor />
      </Trail>
    </AbsoluteFill>
  );
};

/* ---------- 7. Пэкшот ---------- */
const Pack = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const u = useU();
  const a = spring({frame: f - 30, fps, config: {damping: 200}});
  const b = spring({frame: f, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{background: C.white, alignItems: 'center', justifyContent: 'center', fontFamily, gap: 36 * u}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 36 * u, transform: `scale(${b})`}}>
        <MarkAvatar size={170 * u} />
        <div style={{fontSize: 190 * u, fontWeight: 800, color: C.ink, letterSpacing: -6 * u, lineHeight: 1}}>Марк</div>
      </div>
      <Title text="Замечает важное в цифрах вашего бизнеса" delay={15} size={54} weight={600} />
      <div style={{opacity: a, marginTop: 20 * u, display: 'flex', alignItems: 'center', gap: 20 * u, fontSize: 30 * u, color: C.gray}}>
        ИИ‑сервис от <Img src={staticFile('brand/logo-market-32.svg')} style={{height: 44 * u}} />
      </div>
      <div style={{position: 'absolute', bottom: 30 * u, fontSize: 18 * u, color: C.gray, textAlign: 'center', padding: `0 ${40 * u}px`}}>
        Сервис в разработке. Сигналы и цифры в ролике — иллюстрация, не результаты клиентов.
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
        <TransitionSeries.Transition presentation={fade()} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.intro}><Intro /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={springTiming({durationInFrames: T, config: {damping: 200}})} />
        <TransitionSeries.Sequence durationInFrames={S.how}><How /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-bottom'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.signals}><Signals /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-bottom'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.systems}><Systems /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.decide}><Decide /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={lt} />
        <TransitionSeries.Sequence durationInFrames={S.pack}><Pack /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
