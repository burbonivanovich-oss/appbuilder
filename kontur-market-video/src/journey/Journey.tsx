import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import tl from './timeline.json';

export const JOURNEY_TOTAL = tl.total;
const mono = '"JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.7, 0, 0.3, 1);
const Z = 15; // длительность «пролёта» между сценами

const useSp = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping}});
};

/* ------------------------------------------------------------------ */
/* Пролёт: уходящая сцена бесконечно приближается к точке фокуса,       */
/* входящая вырастает из этой же точки                                  */
/* ------------------------------------------------------------------ */
const ZoomOut: React.FC<{at: number; fx: number; fy: number; dir?: 'in' | 'out'; children: React.ReactNode}> = ({at, fx, fy, dir = 'in', children}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [at, at + Z], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const s = dir === 'in' ? Math.pow(40, t) : 1 - t * 0.85;
  return (
    <AbsoluteFill style={{transformOrigin: `${fx}px ${fy}px`, transform: `scale(${s})`, opacity: dir === 'in' ? 1 - t * t : 1 - t}}>
      {children}
    </AbsoluteFill>
  );
};
const ZoomIn: React.FC<{fx: number; fy: number; dir?: 'in' | 'out'; children: React.ReactNode}> = ({fx, fy, dir = 'in', children}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, Z + 5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const s = dir === 'in' ? interpolate(t, [0, 1], [0.08, 1]) : interpolate(t, [0, 1], [3, 1]);
  return (
    <AbsoluteFill style={{transformOrigin: `${fx}px ${fy}px`, transform: `scale(${s})`, opacity: Math.min(1, t * 2)}}>
      {children}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* Общие элементы                                                       */
/* ------------------------------------------------------------------ */
const DataMatrix: React.FC<{size: number; seed?: string; color?: string}> = ({size, seed = 'milk', color = colors.ink}) => {
  const n = 16;
  const c = size / n;
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const border = x === 0 || y === n - 1;
      const timing = (y === 0 && x % 2 === 0) || (x === n - 1 && y % 2 === 1);
      const on = border || timing || (x > 0 && y < n - 1 && x < n - 1 && y > 0 && random(`${seed}${x}-${y}`) > 0.5);
      if (on) cells.push(<rect key={`${x}-${y}`} x={x * c} y={y * c} width={c + 0.3} height={c + 0.3} fill={color} />);
    }
  return (
    <svg width={size} height={size}>
      {cells}
    </svg>
  );
};

/** Пакет молока (SVG): одна «звезда» ролика */
const Carton: React.FC<{w: number; code?: boolean}> = ({w, code = true}) => {
  const h = w * 1.9;
  return (
    <svg width={w} height={h} viewBox="0 0 100 190">
      <polygon points="10,40 50,8 90,40" fill="#E9F3FF" stroke="#C9DDF2" strokeWidth={1.5} />
      <rect x="44" y="0" width="12" height="12" rx="2" fill="#DCEBFB" />
      <rect x="10" y="40" width="80" height="148" rx="4" fill="#FFFFFF" stroke="#D5E3F2" strokeWidth={1.5} />
      <rect x="10" y="40" width="80" height="54" fill={colors.sky} />
      <path d="M10 94 C 30 84, 50 104, 90 90 L 90 94 L 10 94 Z" fill="#FFFFFF" />
      <text x="50" y="66" textAnchor="middle" fontFamily="Lab Grotesque, Arial" fontWeight={700} fontSize={16} fill="#fff">
        Молоко
      </text>
      <text x="50" y="84" textAnchor="middle" fontFamily="Lab Grotesque, Arial" fontWeight={500} fontSize={11} fill="#fff">
        3,2% · 930 мл
      </text>
      {code && (
        <g transform="translate(58 150)">
          <rect x="-3" y="-3" width="30" height="30" fill="#fff" />
          <foreignObject x="0" y="0" width="24" height="24">
            <DataMatrix size={24} />
          </foreignObject>
        </g>
      )}
      <text x="18" y="164" fontFamily="Lab Grotesque, Arial" fontSize={8} fill="#8A96A3">
        годен до
      </text>
      <text x="18" y="175" fontFamily="Lab Grotesque, Arial" fontWeight={700} fontSize={9} fill="#44505C">
        02.10
      </text>
    </svg>
  );
};

const Caption: React.FC<{step: string; title: string; accent?: string; at?: number; dark?: boolean}> = ({step, title, accent, at = 0, dark}) => {
  const p = useSp(at, 16);
  return (
    <div style={{position: 'absolute', left: 90, top: 80, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
      <div style={{fontFamily: mono, fontSize: 24, color: colors.blue, letterSpacing: 1}}>{step}</div>
      <div style={{fontFamily: font, fontWeight: 700, fontSize: 72, letterSpacing: -2, lineHeight: 1.02, color: dark ? colors.white : colors.ink, marginTop: 10, maxWidth: 1300}}>
        {title}
        {accent && (
          <>
            <br />
            <span style={{color: colors.blue}}>{accent}</span>
          </>
        )}
      </div>
    </div>
  );
};

const Tick: React.FC<{at: number; text: string; x: number; y: number; icon?: string}> = ({at, text, x, y, icon = 'check-circle-cut'}) => {
  const p = useSp(at, 11);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${p})`,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: colors.white,
        borderRadius: 40,
        padding: '14px 26px',
        fontFamily: font,
        fontWeight: 500,
        fontSize: 30,
        whiteSpace: 'nowrap',
        boxShadow: '0 14px 40px rgba(34,145,255,0.22)',
      }}
    >
      <Img src={staticFile(`icons/${icon}.svg`)} style={{width: 34, height: 34}} />
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* 1. Код на пакете                                                     */
/* ------------------------------------------------------------------ */
const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const p = useSp(0, 18);
  const scan = interpolate(frame, [45, 85], [0, 1], clamp);
  const zoom = interpolate(frame, [0, 110], [1, 1.15], {...clamp, easing: ease});
  const found = useSp(85, 12);
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 70% 50%, ${colors.mist}, ${colors.bg} 60%)`}}>
      <div style={{position: 'absolute', left: 1080, top: 110, transform: `translateY(${(1 - p) * 300}px) scale(${zoom}) rotate(${(1 - p) * 8}deg)`, transformOrigin: '336px 778px'}}>
        <Carton w={480} />
      </div>
      {/* лазер сканера по коду: код на пакете находится около (1416, 780) */}
      <div
        style={{
          position: 'absolute',
          left: 1350,
          top: 832 + scan * 112,
          width: 132,
          height: 4,
          background: colors.blue,
          boxShadow: `0 0 24px 6px ${colors.sky}`,
          opacity: frame > 45 && frame < 88 ? 1 : 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1331,
          top: 803,
          width: 170,
          height: 170,
          border: `4px solid ${colors.blue}`,
          borderRadius: 24,
          opacity: found,
          transform: `scale(${1.3 - found * 0.3})`,
        }}
      />
      <Caption step="ОДИН ТОВАР · ВЕСЬ ПУТЬ" title="У каждого пакета" accent="теперь есть код" at={8} />
      <div style={{position: 'absolute', left: 90, top: 380, fontFamily: mono, fontSize: 30, color: colors.gray, opacity: found}}>
        0104601234567890 21aB7xQ…
      </div>
      <div style={{position: 'absolute', left: 90, top: 440, fontFamily: font, fontSize: 36, color: colors.ink, opacity: found, maxWidth: 820}}>
        Посмотрим, что с ним происходит в магазине
      </div>
    </AbsoluteFill>
  );
};

/* Накладная в стиле интерфейса Маркета */
const BTN = {x: 430, y: 800};
const ROW = {x: 560, y: 570};
const ROWS = [
  ['Молоко 3,2% · 930 мл', '120 шт', '9 480 ₽'],
  ['Кефир 1% · 900 мл', '60 шт', '4 560 ₽'],
  ['Сметана 20% · 300 г', '40 шт', '3 960 ₽'],
];
const Invoice: React.FC<{p: number; accepted: boolean}> = ({p, accepted}) => (
  <div
    style={{
      position: 'absolute',
      left: 180,
      top: 360,
      width: 1020,
      background: colors.white,
      borderRadius: 24,
      boxShadow: '0 50px 120px rgba(20,60,120,0.2)',
      transform: `translateY(${(1 - p) * 200}px)`,
      opacity: p,
      display: 'flex',
      overflow: 'hidden',
      fontFamily: font,
    }}
  >
    <div style={{width: 90, background: '#F2F4F7', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, paddingTop: 30}}>
      <Img src={staticFile('market-24.svg')} style={{width: 48, height: 48, borderRadius: 12}} />
      {['doc-arrow-sync', 'delivery-box-iso', 'market-register-classic', 'data-chart-pie-a-1'].map((i) => (
        <Img key={i} src={staticFile(`icons/${i}.svg`)} style={{width: 32, height: 32, opacity: 0.6}} />
      ))}
    </div>
    <div style={{flex: 1, padding: '34px 44px'}}>
      <div style={{fontSize: 38, fontWeight: 700}}>Накладная № 24 от 25.09</div>
      <div style={{fontSize: 22, color: colors.gray, marginTop: 6}}>Поставщик ООО «Молочная ферма» · пришла по ЭДО</div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 140px 160px', fontSize: 20, color: colors.gray, marginTop: 30, paddingBottom: 12, borderBottom: '1px solid #E6EBF0'}}>
        <span>Товар</span>
        <span style={{textAlign: 'right'}}>Кол‑во</span>
        <span style={{textAlign: 'right'}}>Сумма</span>
      </div>
      {ROWS.map(([n, q, sum], i) => (
        <div key={n} style={{display: 'grid', gridTemplateColumns: '1fr 140px 160px', fontSize: 28, padding: '18px 0', borderBottom: '1px solid #E6EBF0', background: i === 0 ? colors.mist : undefined, margin: i === 0 ? '0 -16px' : undefined, paddingLeft: i === 0 ? 16 : 0, paddingRight: i === 0 ? 16 : 0, borderRadius: i === 0 ? 10 : 0}}>
          <span style={{fontWeight: i === 0 ? 700 : 400}}>{n}</span>
          <span style={{textAlign: 'right'}}>{q}</span>
          <span style={{textAlign: 'right'}}>{sum}</span>
        </div>
      ))}
      <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 30}}>
        <div style={{background: accepted ? '#1FA36B' : colors.blue, color: colors.white, fontSize: 26, fontWeight: 700, padding: '16px 30px', borderRadius: 12}}>
          {accepted ? 'Принято ✓' : 'Принять товары'}
        </div>
        <div style={{fontSize: 24, color: colors.gray}}>Итого 18 000 ₽</div>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* 2. ЭДО и приёмка                                                     */
/* ------------------------------------------------------------------ */
const EdoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const local = (f: number) => f - tl.edo;
  const clickAt = local(tl.click);
  const doc = useSp(0, 16);
  // курсор: из угла к кнопке «Принять товары»
  const cur = interpolate(frame, [20, clickAt], [0, 1], {...clamp, easing: ease});
  const cx = interpolate(cur, [0, 1], [1700, BTN.x]);
  const cy = interpolate(cur, [0, 1], [1000, BTN.y]);
  const press = frame >= clickAt && frame < clickAt + 5 ? 0.85 : 1;
  const ripple = interpolate(frame, [clickAt, clickAt + 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Caption step="01 · ПРИЁМКА" title="Накладная пришла по ЭДО." accent="Принять — одна кнопка" />
      <Invoice p={doc} accepted={frame >= clickAt} />
      {/* подсветка строки «Молоко» — сюда полетим дальше */}
      {ripple > 0 && (
        <div
          style={{
            position: 'absolute',
            left: BTN.x - 120 * ripple,
            top: BTN.y - 120 * ripple,
            width: 240 * ripple,
            height: 240 * ripple,
            borderRadius: '50%',
            border: `4px solid ${colors.sky}`,
            opacity: 1 - ripple,
          }}
        />
      )}
      <svg width={48} height={48} viewBox="0 0 24 24" style={{position: 'absolute', left: cx, top: cy, transform: `scale(${press})`, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'}}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill={colors.ink} stroke="#fff" strokeWidth={1.2} />
      </svg>
      <Tick at={local(tl.ticks[0])} x={1250} y={420} text="УПД подписан" icon="doc-arrow-sync" />
      <Tick at={local(tl.ticks[1])} x={1250} y={530} text="Меркурий: ВСД погашен" />
      <Tick at={local(tl.ticks[2])} x={1250} y={640} text="Честный знак: коды приняты" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 3. Полка: продажи, остаток, автозаказ                                */
/* ------------------------------------------------------------------ */
const SLOTS = 24;
const ShelfScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = (f: number) => f - tl.shelf;
  const alertAt = local(tl.alert);
  const orderAt = local(tl.order);
  // продажи: пакеты исчезают один за другим, всё быстрее
  const sold = Math.floor(interpolate(frame, [30, alertAt], [0, 20], {...clamp, easing: Easing.in(Easing.quad)}));
  const stock = 120 - Math.floor(interpolate(frame, [30, alertAt], [0, 100], {...clamp, easing: Easing.in(Easing.quad)}));
  const refill = spring({frame: frame - (orderAt + 80), fps, config: {damping: 14}});
  const alert = spring({frame: frame - alertAt, fps, config: {damping: 11}});
  const orderP = interpolate(frame, [orderAt + 15, orderAt + 55], [0, 1], {...clamp, easing: ease});
  const path = 'M 1260 560 C 1330 400, 1400 300, 1480 250';
  const ev = evolvePath(orderP, path);
  const sup = spring({frame: frame - orderAt - 50, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Caption step="02 · ПОЛКА И ПРОДАЖИ" title="Каждая продажа —" accent="минус код и минус остаток" />
      {/* полка */}
      <div style={{position: 'absolute', left: 90, top: 330, width: 1080, padding: 30, borderRadius: 30, background: colors.white, boxShadow: '0 30px 80px rgba(20,60,120,0.12)'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', rowGap: 30, columnGap: 12}}>
          {Array.from({length: SLOTS}).map((_, i) => {
            const goneOrder = SLOTS - 1 - i; // уходят с конца полки
            const gone = goneOrder < sold;
            const goneAt = goneOrder; // для анимации «улёта»
            const back = refill > 0.05 && gone;
            const y = gone && !back ? -60 : 0;
            return (
              <div key={i} style={{height: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderBottom: '6px solid #E3EAF2'}}>
                <div
                  style={{
                    opacity: gone ? (back ? refill : 0) : 1,
                    transform: `translateY(${back ? (1 - refill) * -200 : y}px) scale(${gone && !back ? 0.6 : 1})`,
                    transition: 'none',
                  }}
                  data-k={goneAt}
                >
                  <Carton w={64} code={false} />
                </div>
              </div>
            );
          })}
        </div>
        {/* касса‑счётчик */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 30, fontFamily: font}}>
          <div>
            <div style={{fontSize: 26, color: colors.gray}}>Остаток «Молоко 3,2%»</div>
            <div style={{fontSize: 110, fontWeight: 700, letterSpacing: -3, color: stock <= 20 && refill < 0.5 ? '#E0443A' : colors.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>
              {refill > 0.5 ? 140 : stock} <span style={{fontSize: 40, color: colors.gray}}>шт</span>
            </div>
          </div>
          <div style={{fontFamily: mono, fontSize: 24, color: colors.blue, textAlign: 'right'}}>
            продано сегодня: {Math.min(100, 120 - stock)}
            <br />
            кодов выведено из оборота: {Math.min(100, 120 - stock)}
          </div>
        </div>
      </div>
      {/* лента чеков справа */}
      {Array.from({length: 7}).map((_, k) => {
        const at = 40 + k * 14;
        const t = interpolate(frame, [at, at + 30], [0, 1], clamp);
        if (frame < at || frame > alertAt + 10) return null;
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: 1230 + (k % 2) * 40,
              top: 880 - t * 380,
              opacity: 1 - t,
              fontFamily: mono,
              fontSize: 26,
              color: colors.ink,
              background: colors.white,
              padding: '8px 16px',
              borderRadius: 12,
              boxShadow: '0 8px 20px rgba(20,60,120,0.12)',
            }}
          >
            чек · −1 молоко ✓
          </div>
        );
      })}
      {/* предупреждение */}
      <div
        style={{
          position: 'absolute',
          left: 1240,
          top: 560,
          width: 640,
          transform: `scale(${alert})`,
          transformOrigin: 'left center',
          background: colors.white,
          borderRadius: 28,
          padding: '26px 30px',
          boxShadow: '0 30px 80px rgba(20,60,120,0.22)',
          fontFamily: font,
          display: 'flex',
          gap: 20,
          alignItems: 'center',
          opacity: frame >= alertAt ? 1 : 0,
        }}
      >
        <Img src={staticFile('market-24.svg')} style={{width: 72, height: 72, borderRadius: 18}} />
        <div>
          <div style={{fontSize: 24, color: colors.gray}}>Контур.Маркет · сейчас</div>
          <div style={{fontSize: 32, fontWeight: 700}}>Молоко заканчивается: 20 шт</div>
        </div>
      </div>
      {/* заказ уходит поставщику */}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={path} fill="none" stroke={colors.blue} strokeWidth={4} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
      </svg>
      {frame > orderAt && (
        <Img
          src={staticFile('block_1_card_4.png')}
          style={{
            position: 'absolute',
            left: interpolate(orderP, [0, 1], [1240, 1480]),
            top: interpolate(orderP, [0, 1], [700, 120]),
            width: interpolate(orderP, [0, 1], [560, 320]),
            borderRadius: 16,
            boxShadow: '0 30px 60px rgba(20,60,120,0.25)',
            opacity: interpolate(frame, [orderAt, orderAt + 10], [0, 1], clamp),
            transform: `rotate(${orderP * 6}deg)`,
          }}
        />
      )}
      <div style={{position: 'absolute', left: 1480, top: 400, transform: `scale(${sup})`, transformOrigin: 'left top'}}>
        <div style={{fontFamily: font, fontWeight: 700, fontSize: 32, background: colors.blue, color: colors.white, padding: '12px 24px', borderRadius: 30, whiteSpace: 'nowrap'}}>Заказ поставщику ✓</div>
        <div style={{fontFamily: mono, fontSize: 22, color: colors.gray, marginTop: 10}}>сформирован по остаткам</div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 4. Петля: весь цикл одним кругом                                     */
/* ------------------------------------------------------------------ */
const NODES = [
  {name: 'Поставщик', sub: 'УПД по ЭДО', icon: 'delivery-box-iso'},
  {name: 'Приёмка', sub: 'Меркурий, Честный знак', icon: 'doc-arrow-sync'},
  {name: 'Полка', sub: 'остатки онлайн', icon: 'market-register-classic'},
  {name: 'Продажа', sub: 'чек в ОФД, вывод кода', icon: 'money-wallet-a'},
  {name: 'Заказ', sub: 'по остаткам', icon: 'data-chart-pie-a-1'},
];
const LoopScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cx = 1180;
  const cy = 560;
  const R = 330;
  const ring = interpolate(frame, [5, 45], [0, 1], {...clamp, easing: ease});
  const circle = `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}`;
  const ev = evolvePath(ring, circle);
  const dotA = -Math.PI / 2 + (frame / 60) * Math.PI * 2 * 0.5;
  const center = spring({frame: frame - 20, fps, config: {damping: 11}});
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Caption step="03 · ВЕСЬ ЦИКЛ" title="Товар идёт по кругу." accent="Вы видите каждый шаг" />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={circle} fill="none" stroke="rgba(34,145,255,0.25)" strokeWidth={4} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        <path d={circle} fill="none" stroke={colors.blue} strokeWidth={4} strokeDasharray="14 18" strokeDashoffset={-frame * 3} opacity={ring >= 1 ? 1 : 0} />
        <circle cx={cx + Math.cos(dotA) * R} cy={cy + Math.sin(dotA) * R} r={16} fill={colors.blue} opacity={ring >= 1 ? 1 : 0} />
      </svg>
      <Img src={staticFile('market-24.svg')} style={{position: 'absolute', left: cx - 110, top: cy - 110, width: 220, height: 220, borderRadius: 56, transform: `scale(${center})`, boxShadow: '0 40px 90px rgba(34,145,255,0.45)'}} />
      {NODES.map((n, i) => {
        const a = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
        const x = cx + Math.cos(a) * R;
        const y = cy + Math.sin(a) * R;
        const at = tl.ticks[5 + i] - tl.loop;
        const p = spring({frame: frame - at, fps, config: {damping: 12}});
        const right = Math.cos(a) >= -0.1;
        const active = Math.floor(((dotA + Math.PI / 2) / (Math.PI * 2)) * NODES.length + 0.5) % NODES.length === i && ring >= 1;
        return (
          <div key={n.name} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${p})`}}>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 30,
                background: active ? colors.blue : colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 50px rgba(34,145,255,0.25)',
              }}
            >
              <Img src={staticFile(`icons/${n.icon}.svg`)} style={{width: 56, height: 56, filter: active ? 'invert(1)' : undefined}} />
            </div>
            <div
              style={{
                position: 'absolute',
                top: 18,
                [right ? 'left' : 'right']: 134,
                whiteSpace: 'nowrap',
                textAlign: right ? 'left' : 'right',
                fontFamily: font,
              }}
            >
              <div style={{fontSize: 36, fontWeight: 700}}>{n.name}</div>
              <div style={{fontFamily: mono, fontSize: 22, color: colors.blue}}>{n.sub}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 5. Финал                                                             */
/* ------------------------------------------------------------------ */
const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 14}});
  const btn = spring({frame: frame - 30, fps, config: {damping: 10}});
  return (
    <AbsoluteFill style={{background: colors.white, justifyContent: 'center', alignItems: 'center', gap: 44}}>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 30, transform: `translateY(${(1 - p) * 60}px)`, opacity: p}}>
        <Carton w={110} />
        <Img src={staticFile('market-24.svg')} style={{width: 170, height: 170, borderRadius: 44, boxShadow: '0 30px 70px rgba(34,145,255,0.4)'}} />
      </div>
      <div style={{fontFamily: font, fontWeight: 700, fontSize: 96, letterSpacing: -3, textAlign: 'center', lineHeight: 1.02, opacity: p}}>
        Весь путь товара —
        <br />
        <span style={{color: colors.blue}}>в одном окне</span>
      </div>
      <div style={{display: 'flex', gap: 40, alignItems: 'center', transform: `scale(${btn})`}}>
        <div style={{background: colors.blue, color: colors.white, fontFamily: font, fontWeight: 700, fontSize: 44, padding: '28px 60px', borderRadius: 22, boxShadow: '0 24px 60px rgba(34,145,255,0.45)'}}>
          Попробовать бесплатно
        </div>
        <Img src={staticFile('logo-market-32.svg')} style={{height: 60}} />
      </div>
      <div style={{fontFamily: mono, fontSize: 30, color: colors.gray, opacity: btn}}>kontur.ru/market</div>
      <div style={{position: 'absolute', inset: 0, background: colors.bg, opacity: interpolate(frame, [0, 8], [1, 0], clamp), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const Journey: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <Audio src={staticFile('journey.wav')} />
      <Sequence durationInFrames={tl.zoom1 + Z}>
        <ZoomOut at={tl.zoom1} fx={1416} fy={888}>
          <CodeScene />
        </ZoomOut>
      </Sequence>
      <Sequence from={tl.zoom1} durationInFrames={tl.zoom2 + Z - tl.zoom1}>
        <ZoomIn fx={960} fy={540}>
          <Sequence from={tl.edo - tl.zoom1} layout="none">
            <ZoomOut at={tl.zoom2 - tl.edo} fx={ROW.x} fy={ROW.y}>
              <EdoScene />
            </ZoomOut>
          </Sequence>
        </ZoomIn>
      </Sequence>
      <Sequence from={tl.zoom2} durationInFrames={tl.zoom3 + Z - tl.zoom2}>
        <ZoomIn fx={960} fy={540}>
          <Sequence from={tl.shelf - tl.zoom2} layout="none">
            <ZoomOut at={tl.zoom3 - tl.shelf} fx={1180} fy={560} dir="out">
              <ShelfScene />
            </ZoomOut>
          </Sequence>
        </ZoomIn>
      </Sequence>
      <Sequence from={tl.zoom3} durationInFrames={tl.final + 10 - tl.zoom3}>
        <ZoomIn fx={1180} fy={560} dir="out">
          <Sequence from={tl.loop - tl.zoom3} layout="none">
            <LoopScene />
          </Sequence>
        </ZoomIn>
      </Sequence>
      <Sequence from={tl.final}>
        <FinalScene />
      </Sequence>
      {/* тонкий прогресс «пути» внизу */}
      <div style={{position: 'absolute', left: 90, right: 90, bottom: 50, height: 4, borderRadius: 2, background: 'rgba(34,145,255,0.15)'}}>
        <div style={{width: `${(frame / tl.total) * 100}%`, height: '100%', borderRadius: 2, background: colors.blue}} />
      </div>
    </AbsoluteFill>
  );
};
