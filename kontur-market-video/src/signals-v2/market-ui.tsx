import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {AiIcon, C, CamKey, Ico, Tone, TONE, Dot, camAt, font, lerp, ease, spr, useAsset} from './kit';

/*
 * Интерфейс Контур.Маркета, перерисованный по макетам из Figma (public/signals/ui/*.png):
 * та же структура и стиль, но крупнее и чище, чтобы читалось в видео и анимировалось по частям.
 * Координаты окна: 1680 × 1320, меню слева 300, страница справа (PX).
 */

export const WIN_W = 1680;
export const WIN_H = 1320; // окно выше кадра: при зуме нижний край не попадает в кадр
export const PX = 300; // левый край страницы в окне
export const HOME: CamKey = {at: 0, s: 1, x: 840, y: 390}; // окно в кадре целиком: (120, 150)
export const home = (at: number): CamKey => ({...HOME, at});
/* Прямоугольник в координатах страницы → координаты окна */
export const R = (x: number, y: number, w: number, h: number, r = 18) => ({x: x + PX, y, w, h, r});

const NAV: {k: string; t: string; i: string; badge?: string}[] = [
  {k: 'notify', t: 'Уведомления', i: 'bell'},
  {k: 'home', t: 'Главная', i: 'home'},
  {k: 'docs', t: 'Документы', i: 'doc'},
  {k: 'goods', t: 'Товары', i: 'box', badge: '87'},
  {k: 'supply', t: 'Поставки', i: 'truck'},
  {k: 'journal', t: 'Журнал продаж', i: 'journal'},
  {k: 'kkt', t: 'Кассы', i: 'register'},
  {k: 'reports', t: 'Отчёты', i: 'chart'},
  {k: 'people', t: 'Сотрудники и клиенты', i: 'people'},
  {k: 'ai', t: 'ИИ бизнес-сигналы', i: 'ai'},
];
export const NAV_Y = (k: string) => 132 + NAV.findIndex((n) => n.k === k) * 58;

export const Sidebar: React.FC<{active?: string}> = ({active = 'ai'}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: PX, bottom: 0, padding: '38px 22px', fontFamily: font}}>
    <Img src={staticFile('logo-market-32.svg')} style={{height: 34, marginLeft: 14, display: 'block'}} />
    {NAV.map((n) => {
      const on = n.k === active;
      return (
        <div key={n.k} style={{position: 'absolute', left: 22, right: 22, top: NAV_Y(n.k), height: 50, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px', borderRadius: 14, background: on ? '#fff' : 'transparent', fontSize: 21, fontWeight: on ? 500 : 400, color: C.ink}}>
          {n.i === 'ai' ? <AiIcon size={24} /> : <Ico n={n.i} size={24} color={C.ink} sw={1.5} />}
          <span style={{whiteSpace: 'nowrap'}}>{n.t}</span>
          {n.badge && <span style={{marginLeft: 'auto', background: C.blue, color: '#fff', fontSize: 15, fontWeight: 700, borderRadius: 999, padding: '2px 9px'}}>{n.badge}</span>}
        </div>
      );
    })}
    <div style={{position: 'absolute', left: 22, right: 22, bottom: 40, display: 'flex', flexDirection: 'column', gap: 18, fontSize: 19, color: C.gray, paddingLeft: 14}}>
      <div>Настройки</div>
      <div>Пит Мондриан</div>
    </div>
  </div>
);

/* Окно Маркета: меню + страница. Страница — абсолютные координаты от (PX, 0). */
export const MarketWindow: React.FC<{active?: string; children: React.ReactNode; page?: React.CSSProperties}> = ({active, children, page}) => {
  const shadow = useAsset() === 'window' ? 'none' : '0 30px 80px rgba(6, 50, 110, 0.28)';
  return (
  <div style={{position: 'absolute', left: 0, top: 0, width: WIN_W, height: WIN_H, borderRadius: 30, overflow: 'hidden', background: C.page, fontFamily: font, color: C.ink, boxShadow: shadow}}>
    <Sidebar active={active} />
    <div style={{position: 'absolute', left: PX, top: 0, right: 0, bottom: 0, ...page}}>{children}</div>
  </div>

  );
};

export const PageHead: React.FC<{title: string; back?: string; meta?: string; style?: React.CSSProperties}> = ({title, back, meta, style}) => (
  <div style={{position: 'absolute', left: 44, right: 44, top: back ? 26 : 40, ...style}}>
    {back && <div style={{fontSize: 19, color: C.blue, marginBottom: 6}}>← {back}</div>}
    <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
      <div style={{fontSize: 40, fontWeight: 700, letterSpacing: -0.6}}>{title}</div>
      {meta && <div style={{fontSize: 19, color: C.gray}}>{meta}</div>}
    </div>
  </div>
);

export const Card: React.FC<{x: number; y: number; w: number; h?: number; children?: React.ReactNode; style?: React.CSSProperties; bg?: string}> = ({x, y, w, h, children, style, bg = '#fff'}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: bg, borderRadius: 22, padding: '26px 30px', boxSizing: 'border-box', ...style}}>{children}</div>
);

/* Появление блока интерфейса: снизу и из прозрачности */
export const Appear: React.FC<{at: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties}> = ({at, children, dy = 24, style}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 16);
  return <div style={{opacity: p, transform: `translateY(${(1 - p) * dy}px)`, ...style}}>{children}</div>;
};

export const Delta: React.FC<{dir: 'up' | 'down'; tone: Tone; children: React.ReactNode; size?: number}> = ({dir, tone, children, size = 22}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 2, color: TONE[tone].t, fontSize: size, fontWeight: 500}}>
    <Ico n={dir} size={size} color={TONE[tone].t} sw={2} />
    {children}
  </span>
);

export const Btn: React.FC<{kind?: 'primary' | 'secondary'; hover?: number; press?: number; children: React.ReactNode; size?: number; style?: React.CSSProperties; icon?: string}> = ({kind = 'secondary', hover = 0, press = 0, children, size = 21, style, icon}) => {
  const primary = kind === 'primary';
  const bg = primary ? (hover > 0.5 ? C.blueDeep : C.blue) : hover > 0.5 ? '#F0F2F5' : '#fff';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: size * 2.3,
        padding: `0 ${size * 1.1}px`,
        borderRadius: 12,
        boxSizing: 'border-box',
        background: bg,
        color: primary ? '#fff' : C.ink,
        border: primary ? 'none' : `2px solid ${hover > 0.5 ? '#C9CED6' : C.line}`,
        fontFamily: font,
        fontSize: size,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        transform: `scale(${1 - press * 0.04})`,
        ...style,
      }}
    >
      {icon && <Ico n={icon} size={size * 1.1} color={primary ? '#fff' : C.ink} />}
      {children}
    </div>
  );
};

/* Вкладки с подчёркиванием, которое переезжает к активной */
export const Tabs: React.FC<{items: {t: string; n?: string; w: number}[]; from: number; to: number; at: number; x: number; y: number}> = ({items, from, to, at, x, y}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 14, 0, 1, ease);
  const left = (i: number) => items.slice(0, i).reduce((a, it) => a + it.w + 34, 0);
  const ux = left(from) + (left(to) - left(from)) * p;
  const uw = items[from].w + (items[to].w - items[from].w) * p;
  return (
    <div style={{position: 'absolute', left: x, top: y, height: 50, fontSize: 21}}>
      {items.map((it, i) => (
        <div key={it.t} style={{position: 'absolute', left: left(i), top: 0, width: it.w, whiteSpace: 'nowrap', color: C.ink, fontWeight: (p > 0.5 ? to : from) === i ? 500 : 400}}>
          {it.t} {it.n && <span style={{color: C.gray2}}>{it.n}</span>}
        </div>
      ))}
      <div style={{position: 'absolute', left: ux, top: 38, width: uw, height: 3, borderRadius: 2, background: C.blue}} />
      <div style={{position: 'absolute', left: 0, top: 49, width: left(items.length) - 34, height: 1, background: C.line}} />
    </div>
  );
};

/* Боковая панель поверх страницы, страница затемняется */
export const SidePanel: React.FC<{at: number; w?: number; children: React.ReactNode; until?: number}> = ({at, w = 640, children, until = 1e9}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 18) * (1 - lerp(f, until, until + 14, 0, 1, ease));
  if (p <= 0) return null;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `rgba(30, 34, 40, ${0.38 * p})`}} />
      <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: w, background: '#fff', transform: `translateX(${(1 - p) * (w + 40)}px)`, boxShadow: '-24px 0 60px rgba(0,0,0,0.14)', padding: '40px 40px', boxSizing: 'border-box'}}>{children}</div>
    </>
  );
};

/* Блок вывода ИИ — как в интерфейсе: голубая подложка, значок ИИ, подпись «Создано ИИ Контура» */
export const AiNote: React.FC<{children: React.ReactNode; style?: React.CSSProperties; footer?: boolean; size?: number}> = ({children, style, footer = true, size = 22}) => (
  <div style={{background: C.mist, borderRadius: 20, padding: '24px 28px 22px 80px', position: 'relative', fontSize: size, lineHeight: 1.5, color: C.ink, boxSizing: 'border-box', ...style}}>
    <AiIcon size={34} style={{position: 'absolute', left: 28, top: 26}} />
    <div>{children}</div>
    {footer && <div style={{fontSize: size * 0.82, color: C.gray, marginTop: 10}}>Создано ИИ Контура</div>}
  </div>
);

/* Карточка сигнала (вне окна — в инфографике и заставке) */
export const SignalCard: React.FC<{tone: Tone; title: string; module: string; w?: number; pulse?: number; style?: React.CSSProperties}> = ({tone, title, module, w = 640, pulse, style}) => (
  <div style={{width: w, background: '#fff', borderRadius: 24, padding: '24px 28px', boxSizing: 'border-box', fontFamily: font, boxShadow: '0 18px 50px rgba(20, 40, 80, 0.12)', display: 'flex', gap: 20, alignItems: 'flex-start', ...style}}>
    <div style={{width: 56, height: 56, borderRadius: 16, background: TONE[tone].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
      <Dot color={TONE[tone].c} size={16} pulse={pulse} />
    </div>
    <div style={{minWidth: 0}}>
      <div style={{fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1.2}}>{title}</div>
      <div style={{fontSize: 21, color: C.gray, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8}}>
        <AiIcon size={20} />
        {module}
      </div>
    </div>
  </div>
);

/* ------------------------- окно в кадре и камера ------------------------- */

type CamState = {s: number; x: number; y: number; dy: number};
const CamCtx = createContext<CamState>({s: 1, x: 840, y: 390, dy: 0});
/* Положение камеры в кадре f: края окна не обрываются посреди кадра, нижний край окна не виден */
const camState = (f: number, cam: CamKey[]) => {
  const k = camAt(f, cam);
  let {x, y} = k;
  const s = k.s;
  if (WIN_W * s > 1920) x = Math.min(Math.max(x, 960 / s), WIN_W - 960 / s);
  y = Math.min(y, WIN_H - 540 / s);
  return {s, x, y};
};
/* Прямоугольник окна → прямоугольник кадра при текущей камере */
export const useWinToFrame = () => {
  const c = useContext(CamCtx);
  return (r: {x: number; y: number; w: number; h: number}) => ({x: 960 + (r.x - c.x) * c.s, y: 540 + (r.y - c.y) * c.s + c.dy, w: r.w * c.s, h: r.h * c.s, s: c.s});
};

/* Синий фон «продуктового» цвета + окно + камера. Окно въезжает снизу в кадре enter.
   focus 0…1 — интерфейс размывается и притеняется, когда ключевой элемент вынесен вперёд (Lift).
   При быстрых перелётах камеры окно чуть размывается — как motion blur. */
export const Screen: React.FC<{enter?: number; cam: CamKey[]; children: React.ReactNode; overlay?: React.ReactNode; lifts?: React.ReactNode; mid?: React.ReactNode; bg?: string; exit?: number; focus?: number}> = ({enter = 0, cam, children, overlay, lifts, mid, bg = C.blue, exit, focus = 0}) => {
  const f = useCurrentFrame();
  const p = lerp(f, enter, enter + 22);
  const q = exit === undefined ? 0 : lerp(f, exit, exit + 18, 0, 1, ease);
  const dy = (1 - p) * 760 + q * 1300;
  const {s, x, y} = camState(f, cam);
  const prev = camState(f - 1, cam);
  const move = Math.hypot(960 - x * s - (960 - prev.x * prev.s), 540 - y * s - (540 - prev.y * prev.s)) + Math.abs(s - prev.s) * 900;
  const mb = Math.min(3.5, Math.max(0, (move - 8) * 0.05));
  const blur = focus * 7 + mb;
  const mode = useAsset();
  if (mode === 'window') {
    // только окно: без камеры, фона, размытия и вынесенных элементов
    return <div style={{position: 'absolute', left: 0, top: 0, width: WIN_W, height: WIN_H}}>{children}</div>;
  }
  if (mode === 'lifts') {
    return (
      <AbsoluteFill>
        <CamCtx.Provider value={{s, x, y, dy}}>{lifts}</CamCtx.Provider>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{background: mode === 'graphics' ? 'transparent' : bg, overflow: 'hidden'}}>
      <CamCtx.Provider value={{s, x, y, dy}}>
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${dy}px)`, filter: blur > 0.05 ? `blur(${blur}px)` : undefined}}>
          <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 - x * s}px, ${540 - y * s}px) scale(${s})`}}>
            <div style={{position: 'relative', width: WIN_W, height: WIN_H}}>{children}</div>
          </div>
        </div>
        {focus > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(10, 30, 70, ${0.32 * focus})`}} />}
        {mid}
        {lifts}
        {overlay}
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

/* Вынос ключевого элемента интерфейса вперёд: копия элемента вылетает из окна (rect — в координатах окна)
   в позицию кадра to (левый верхний угол и ширина исходного прямоугольника), крупнее, с тенью; grow/growW —
   на сколько (в px элемента) он вырастает, чтобы показать подробности. Пока элемент вынесен, сцена
   передаёт focus в Screen — интерфейс за ним размыт. children получают p (0…1), чтобы дорисовать детали. */
export const Lift: React.FC<{rect: {x: number; y: number; w: number; h: number}; to: {x: number; y: number; w: number}; at: number; until?: number; out?: 'back' | 'fade'; r?: number; bg?: string; grow?: number; growW?: number; children: (p: number) => React.ReactNode}> = ({rect, to, at, until = 1e9, out = 'back', r = 22, bg = '#fff', grow = 0, growW = 0, children}) => {
  const f = useCurrentFrame();
  const map = useWinToFrame();
  const pin = spr(f, at, 17, 120);
  const pout = lerp(f, until, until + 16, 0, 1, ease);
  const p = out === 'back' ? pin * (1 - pout) : pin;
  if (f < at || (out === 'fade' && pout >= 1) || (out === 'back' && pout >= 1)) return null;
  const a = map(rect);
  const k = to.w / rect.w;
  const sc = a.s + (k - a.s) * p;
  const left = a.x + (to.x - a.x) * p;
  const top = a.y + (to.y - a.y) * p;
  const fade = out === 'fade' ? 1 - pout : 1;
  return (
    <div style={{position: 'absolute', left, top, width: rect.w + growW * p, height: rect.h + grow * p, transformOrigin: '0 0', transform: `scale(${sc * (out === 'fade' ? 1 - pout * 0.06 : 1)})`, opacity: fade, borderRadius: r, background: bg, boxShadow: `0 ${30 * p}px ${70 * p}px rgba(6, 30, 70, ${0.35 * p})`, overflow: 'hidden', fontFamily: font, color: C.ink}}>
      {children(p)}
    </div>
  );
};
/* Сколько «вынесено» в кадре f: для focus у Screen */
export const liftFocus = (f: number, spans: [number, number][]) => Math.max(0, ...spans.map(([a, b]) => lerp(f, a, a + 14) * (1 - lerp(f, b, b + 14))));
