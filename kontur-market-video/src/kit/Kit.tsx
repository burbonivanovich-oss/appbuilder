import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import tl from './timeline.json';
import vo from '../../voice/kit.json';

/*
 * Стиль — как на текущем kontur.ru/market: студийная предметка «тёмно‑синяя стена + светлый стол»,
 * белые жирные заголовки на синем, плоские светлые плитки с большим скруглением без теней,
 * пилюли‑переключатели и синие стрелки ↗. В финале вся сцена сворачивается в карточку сайта.
 */

export const KIT_TOTAL = tl.total;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

const studio = {
  wallTop: '#12163A',
  wallBottom: '#1D2352',
  tableTop: '#DCD9D5',
  tableBottom: '#C9C5C0',
  tile: '#F4F5F7',
  softText: 'rgba(255,255,255,0.72)',
};
const HORIZON = 640; // линия стола в координатах «мира»

const useSp = (at: number, damping = 14, stiffness = 120) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness}});
};

/* Камера: ключевые кадры масштаба и сдвига «мира» */
const CAM = {
  f: [0, tl.kassa - 10, tl.kassa + 40, tl.fn, tl.fn + 50, tl.scanner + 10, tl.ofd + 10, tl.market, tl.market + 60, tl.final, tl.total],
  s: [1.25, 1.25, 1.1, 1.1, 1.28, 1.0, 0.92, 0.92, 0.84, 0.84, 0.84],
  x: [0, 0, 0, 0, -180, 120, -140, -140, -60, -60, -60],
  y: [0, 0, 10, 10, 60, 0, 30, 30, 10, 10, 10],
};
const cam = (frame: number, k: 's' | 'x' | 'y') => interpolate(frame, CAM.f, CAM[k], {...clamp, easing: ease});

/* Студийный сет: стена, стол, мягкий свет */
const Studio: React.FC = () => {
  const frame = useCurrentFrame();
  const light = interpolate(frame, [0, 60], [0.2, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: -800, right: -800, top: -800, height: HORIZON + 800, background: `linear-gradient(180deg, ${studio.wallTop} 40%, ${studio.wallBottom})`}} />
      <div style={{position: 'absolute', left: -800, right: -800, top: HORIZON, bottom: -800, background: `linear-gradient(180deg, ${studio.tableTop}, ${studio.tableBottom} 60%)`}} />
      {/* пятно света от софтбокса */}
      <div
        style={{
          position: 'absolute',
          left: 960 - 900,
          top: HORIZON - 420,
          width: 1800,
          height: 900,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(255,255,255,0.16), rgba(255,255,255,0))',
          opacity: light,
        }}
      />
    </AbsoluteFill>
  );
};

/* Деталь падает на стол: отскок + контактная тень */
const Drop: React.FC<{at: number; from?: {x: number; y: number; r: number}; x: number; y: number; w: number; src: string}> = ({at, from = {x: 0, y: -900, r: -10}, x, y, w, src}) => {
  const frame = useCurrentFrame();
  const p = useSp(at, 12, 140);
  if (frame < at - 2) return null;
  const px = interpolate(p, [0, 1], [from.x, 0]);
  const py = interpolate(p, [0, 1], [from.y, 0]);
  const pr = interpolate(p, [0, 1], [from.r, 0]);
  const lift = Math.min(1, Math.max(0, -py) / 600);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - w * 0.42,
          top: y + w * 0.22,
          width: w * 0.84,
          height: w * 0.12,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(30,25,20,0.45), rgba(30,25,20,0))',
          transform: `scale(${1 - lift * 0.5})`,
          opacity: 1 - lift,
        }}
      />
      <Img src={staticFile(src)} style={{position: 'absolute', left: x - w / 2, top: y - w * 0.32, width: w, transform: `translate(${px}px, ${py}px) rotate(${pr}deg)`}} />
    </>
  );
};

/* Подпись на «стене»: тонкая белая линия и белый текст, как заголовки карточек сайта */
const Label: React.FC<{at: number; until: number; x: number; y: number; tx: number; ty: number; title: string; sub: string; align?: 'left' | 'right'}> = ({at, until, x, y, tx, ty, title, sub, align = 'left'}) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [until, until + 12], [1, 0], clamp);
  if (frame < at || out <= 0) return null;
  const d = `M ${x} ${y} L ${tx} ${ty}`;
  const draw = interpolate(frame, [at, at + 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const e = evolvePath(draw, d);
  const text = interpolate(frame, [at + 10, at + 24], [0, 1], clamp);
  return (
    <div style={{opacity: out}}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={x} cy={y} r={7 * Math.min(1, draw * 3)} fill={colors.white} />
        <path d={d} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: align === 'left' ? tx + 16 : undefined,
          right: align === 'right' ? 1920 - tx + 16 : undefined,
          top: ty - 30,
          textAlign: align,
          whiteSpace: 'nowrap',
          opacity: text,
          transform: `translateY(${(1 - text) * 14}px)`,
          fontFamily: font,
        }}
      >
        <div style={{fontSize: 40, fontWeight: 700, color: colors.white, letterSpacing: -0.5}}>{title}</div>
        <div style={{fontSize: 28, color: studio.softText, marginTop: 4}}>{sub}</div>
      </div>
    </div>
  );
};

/* ФН: подлетает по дуге и «входит» в кассу */
const FiscalDrive: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.fn;
  const snap = tl.snaps[1];
  const t = interpolate(frame, [at, snap], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  if (frame < at) return null;
  const x = interpolate(t, [0, 1], [1650, 1170]);
  const y = interpolate(t, [0, 1], [230, 560]) - Math.sin(t * Math.PI) * 140;
  const s = interpolate(t, [0, 0.7, 1], [1, 0.9, 0.2]);
  const o = interpolate(frame, [snap - 2, snap + 2], [1, 0], clamp);
  const pill = spring({frame: frame - snap, fps: 30, config: {damping: 11}});
  return (
    <>
      <Img src={staticFile('fn.png')} style={{position: 'absolute', left: x - 160, top: y - 100, width: 320, transform: `scale(${s}) rotate(${(1 - t) * 24}deg)`, opacity: o}} />
      <div style={{position: 'absolute', left: 1120, top: 520, transform: `scale(${pill})`, fontFamily: font, fontWeight: 500, fontSize: 26, color: colors.white, background: colors.blue, padding: '10px 22px', borderRadius: 40}}>
        ФН внутри
      </div>
    </>
  );
};

/* ОФД: иконка продукта и белые пунктирные потоки данных */
const OfdLink: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.ofd;
  const p = useSp(at, 11, 150);
  if (frame < at - 2) return null;
  const main = 'M 1120 520 C 1220 360, 1330 330, 1440 330';
  const up = 'M 1600 300 C 1660 240, 1700 225, 1760 225';
  const down = 'M 1600 360 C 1660 420, 1700 435, 1760 435';
  const e1 = evolvePath(interpolate(frame, [at + 12, at + 32], [0, 1], clamp), main);
  const e2 = evolvePath(interpolate(frame, [at + 34, at + 50], [0, 1], clamp), up);
  const e3 = evolvePath(interpolate(frame, [at + 38, at + 54], [0, 1], clamp), down);
  const pill = (d: number) => spring({frame: frame - at - d, fps: 30, config: {damping: 12}});
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[{d: main, e: e1}, {d: up, e: e2}, {d: down, e: e3}].map((o, i) => (
          <g key={i}>
            <path d={o.d} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeDasharray={o.e.strokeDasharray} strokeDashoffset={o.e.strokeDashoffset} />
            <path d={o.d} fill="none" stroke={colors.white} strokeWidth={2.5} strokeDasharray="6 12" strokeDashoffset={-frame * 2.5} opacity={o.e.strokeDashoffset === 0 ? 1 : 0} />
          </g>
        ))}
      </svg>
      <Img src={staticFile('ofd-24.svg')} style={{position: 'absolute', left: 1440, top: 250, width: 160, height: 160, borderRadius: 40, transform: `translateY(${(1 - p) * -500}px) scale(${0.6 + p * 0.4})`}} />
      {[
        {t: 'ФНС', y: 195, d: 48},
        {t: 'Честный знак', y: 405, d: 54},
      ].map((c) => (
        <div
          key={c.t}
          style={{
            position: 'absolute',
            left: 1772,
            top: c.y,
            transform: `scale(${pill(c.d)})`,
            transformOrigin: 'left center',
            fontFamily: font,
            fontWeight: 500,
            fontSize: 28,
            color: colors.ink,
            background: colors.white,
            padding: '12px 24px',
            borderRadius: 40,
            whiteSpace: 'nowrap',
          }}
        >
          {c.t} <span style={{color: colors.blue}}>✓</span>
        </div>
      ))}
    </>
  );
};

/* Экран учётной системы «встаёт» на стене за кассой */
const MarketScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const p = useSp(tl.market, 18, 90);
  if (frame < tl.market - 2) return null;
  return (
    <div style={{position: 'absolute', left: 560, top: 70, width: 1060, perspective: 2400, opacity: Math.min(1, p * 1.5)}}>
      <Img src={staticFile('demo-market.png')} style={{width: '100%', borderRadius: 28, transformOrigin: '50% 100%', transform: `rotateX(${(1 - p) * 70}deg)`}} />
    </div>
  );
};

/* Пилюли шагов — как переключатель «Бизнесу больше 1 года / меньше 1 года» на сайте */
const STEPS = [
  {at: tl.kassa, name: 'Касса'},
  {at: tl.fn, name: 'ФН'},
  {at: tl.scanner, name: 'Сканер'},
  {at: tl.ofd, name: 'ОФД'},
  {at: tl.market, name: 'Учёт'},
];
const StepPills: React.FC = () => {
  const frame = useCurrentFrame();
  const idx = STEPS.filter((s) => frame >= s.at).length - 1;
  const vis = interpolate(frame, [tl.kassa, tl.kassa + 15, tl.final - 10, tl.final], [0, 1, 1, 0], clamp);
  if (idx < 0) return null;
  return (
    <div style={{position: 'absolute', right: 80, top: 70, display: 'flex', gap: 10, opacity: vis}}>
      {STEPS.map((s, i) => {
        const on = interpolate(frame, [s.at, s.at + 10], [0, 1], clamp);
        const active = i === idx;
        return (
          <div
            key={s.name}
            style={{
              fontFamily: font,
              fontWeight: 500,
              fontSize: 26,
              padding: '12px 24px',
              borderRadius: 40,
              color: active ? colors.white : i < idx ? colors.ink : 'rgba(255,255,255,0.7)',
              background: active ? colors.blue : i < idx ? colors.white : 'rgba(255,255,255,0.12)',
              transform: `scale(${active ? 1 + (1 - on) * 0.1 : 1})`,
            }}
          >
            {s.name}
          </div>
        );
      })}
    </div>
  );
};

/* Вопрос: крупно по центру стены, затем уезжает в угол */
const Question: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [tl.kassa - 20, tl.kassa + 10], [0, 1], {...clamp, easing: ease});
  const out = interpolate(frame, [tl.final - 10, tl.final], [1, 0], clamp);
  const words = ['Что', 'нужно,', 'чтобы', 'открыться?'];
  return (
    <div
      style={{
        position: 'absolute',
        left: interpolate(t, [0, 1], [960, 80]),
        top: interpolate(t, [0, 1], [380, 74]),
        transform: `translateX(${interpolate(t, [0, 1], [-50, 0])}%)`,
        fontFamily: font,
        fontWeight: 700,
        fontSize: interpolate(t, [0, 1], [124, 44]),
        letterSpacing: -2,
        whiteSpace: 'nowrap',
        color: colors.white,
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const p = spring({frame: frame - 20 - i * 5, fps: 30, config: {damping: 16}});
        return (
          <span key={w} style={{display: 'inline-block', marginRight: '0.25em', opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

/* Стрелка ↗ как в карточках сайта */
const Arrow: React.FC<{size?: number; color?: string}> = ({size = 56, color = colors.white}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 18 L18 6 M8 6 H18 V16" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Финал: справа — белая колонка как на странице «Готовые комплекты» */
const CARD = {x: 120, y: 120, w: 820, h: 840, r: 48};
const FinalPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const at = tl.final;
  const p = useSp(at + 20, 16);
  const btn = useSp(tl.snaps[9] + 4, 12);
  const items = ['Касса с кассовым ПО', 'Фискальный накопитель', '2D‑сканер', 'ОФД для передачи данных в ФНС', 'Учётная система Маркета'];
  if (frame < at) return null;
  return (
    <div style={{position: 'absolute', left: 1030, top: 150, width: 800, opacity: p, transform: `translateX(${(1 - p) * 60}px)`, fontFamily: font}}>
      <Img src={staticFile('logo-market-32.svg')} style={{height: 46}} />
      <div style={{fontWeight: 700, fontSize: 92, letterSpacing: -3, lineHeight: 1.02, marginTop: 36, color: colors.ink}}>
        Готовый комплект
        <br />
        под ваш бизнес
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 44}}>
        {items.map((t, i) => {
          const s = spring({frame: frame - tl.snaps[5 + i], fps: 30, config: {damping: 14}});
          return (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 34, color: colors.ink, opacity: 0.25 + s * 0.75}}>
              <svg width={34} height={34} viewBox="0 0 24 24" style={{transform: `scale(${0.6 + s * 0.4})`}}>
                <path d="M4 12.5 L9.5 18 L20 6.5" fill="none" stroke={colors.blue} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </div>
          );
        })}
      </div>
      <div style={{display: 'flex', gap: 16, marginTop: 56, transform: `scale(${btn})`, transformOrigin: 'left center'}}>
        <div style={{background: colors.blue, color: colors.white, fontWeight: 500, fontSize: 36, padding: '24px 48px', borderRadius: 60, whiteSpace: 'nowrap'}}>Подобрать комплект</div>
        <div style={{border: `2px solid ${colors.blue}`, color: colors.blue, fontWeight: 500, fontSize: 36, padding: '22px 44px', borderRadius: 60, whiteSpace: 'nowrap'}}>Тарифы</div>
      </div>
    </div>
  );
};

export type KitProps = {voice: 'none' | 'xenia' | 'eugene'};

// музыка приглушается под каждой репликой диктора
const duck = (f: number) => {
  const t = f / 30;
  const speaking = vo.some((l) => t > l.at - 0.2 && t < l.at + 2.4);
  return speaking ? 0.35 : 1;
};

export const Kit: React.FC<KitProps> = ({voice}) => {
  const frame = useCurrentFrame();
  const s = cam(frame, 's');
  const x = cam(frame, 'x');
  const y = cam(frame, 'y');
  // финальная «сборка в карточку»: сцена сжимается клипом до карточки сайта
  const c = interpolate(frame, [tl.final, tl.final + 30], [0, 1], {...clamp, easing: ease});
  const inset = {
    t: CARD.y * c,
    l: CARD.x * c,
    r: (1920 - CARD.x - CARD.w) * c,
    b: (1080 - CARD.y - CARD.h) * c,
  };
  const cardScale = interpolate(c, [0, 1], [1, 0.62]);
  const cardShiftX = interpolate(c, [0, 1], [0, -430]);
  const cardText = interpolate(frame, [tl.final + 25, tl.final + 40], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: colors.white}}>
      <Audio src={staticFile('kit.wav')} volume={voice === 'none' ? 1 : duck} />
      {voice !== 'none' && <Audio src={staticFile(`kit-vo-${voice}.wav`)} />}
      <AbsoluteFill style={{clipPath: `inset(${inset.t}px ${inset.r}px ${inset.b}px ${inset.l}px round ${CARD.r * c}px)`}}>
        <AbsoluteFill style={{transform: `translate(${x * (1 - c) + cardShiftX}px, ${y * (1 - c) + 40 * c}px) scale(${s * cardScale / (c > 0 ? 1 : 1)})`, transformOrigin: '50% 60%'}}>
          <Studio />
          <MarketScreen />
          <Drop at={tl.kassa} x={960} y={660} w={800} src="mspos-f20-f.png" />
          <Drop at={tl.scanner} from={{x: -700, y: -240, r: 20}} x={420} y={720} w={380} src="2d-skaner-neo-max-sd.png" />
          <FiscalDrive />
          <OfdLink />
          <div style={{opacity: interpolate(frame, [tl.market, tl.market + 15], [1, 0], clamp)}}>
            <Label until={tl.fn} at={tl.kassa + 30} x={780} y={500} tx={560} ty={330} align="right" title="Смарт‑терминал" sub="касса и кассовое ПО" />
            <Label until={tl.fn} at={tl.kassa + 42} x={1250} y={470} tx={1180} ty={250} align="right" title="Встроенный принтер" sub="печатает чеки" />
            <Label until={tl.scanner} at={tl.fn + 45} x={1170} y={540} tx={1090} ty={300} align="right" title="Фискальный накопитель" sub="на 15 или 36 месяцев" />
            <Label until={tl.ofd} at={tl.scanner + 28} x={430} y={610} tx={560} ty={330} title="2D‑сканер" sub="маркировка и ЕГАИС" />
            <Label until={tl.market} at={tl.ofd + 58} x={1520} y={420} tx={1680} ty={580} title="Контур.ОФД" sub="чеки в ФНС онлайн" />
          </div>
        </AbsoluteFill>
        {/* заголовок и стрелка карточки, как «Подобрать кассу, ФН или ОФД» на сайте */}
        <div style={{position: 'absolute', left: CARD.x + 56, top: CARD.y + 56, opacity: cardText, fontFamily: font, color: colors.white}}>
          <div style={{fontSize: 52, fontWeight: 700, letterSpacing: -1}}>Всё для старта</div>
          <div style={{fontSize: 30, color: studio.softText, marginTop: 10}}>Работает с первого дня</div>
        </div>
        <div style={{position: 'absolute', left: CARD.x + CARD.w - 110, top: CARD.y + CARD.h - 110, opacity: cardText}}>
          <Arrow />
        </div>
      </AbsoluteFill>
      <Question />
      <StepPills />
      <FinalPanel />
    </AbsoluteFill>
  );
};
