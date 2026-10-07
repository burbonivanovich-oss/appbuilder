import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {colors, font} from '../theme';
import {FPS, clamp, ease} from './ui';

/*
 * Реальные экраны «ИИ Бизнес сигналов» (макеты из Figma, public/signals/ui/*.png, 2x).
 * Всё внутри ScreenView задаётся в пикселях исходной картинки: камера, рамки, курсор, заплатки, панели.
 */

type Key = {at: number; s: number; x: number; y: number};
const ScaleCtx = createContext(1);
const DW = 1720; // ширина экрана в кадре при s = 1

// ключи камеры всегда идут строго по возрастанию (в коротких сценах моменты могут налезать)
const fixKeys = (keys: Key[]) => {
  let last = -Infinity;
  return keys.map((q) => {
    const a = Math.max(q.at, last + 1);
    last = a;
    return {...q, at: a};
  });
};
const pick = (frame: number, raw: Key[], k: 's' | 'x' | 'y') => {
  const keys = fixKeys(raw);
  return keys.length > 1 ? interpolate(frame, keys.map((q) => q.at), keys.map((q) => q[k]), {...clamp, easing: ease}) : keys[0][k];
};

export const ScreenView: React.FC<{src: string; w: number; h: number; cam: Key[]; children?: React.ReactNode}> = ({src, w, h, cam, children}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  // в вертикали экран крупнее кадра: камера сама держит в центре нужный блок
  const K = ((height > width ? 1950 : DW) / w) * pick(frame, cam, 's');
  const x = pick(frame, cam, 'x');
  const y = pick(frame, cam, 'y');
  return (
    <AbsoluteFill style={{background: '#EEF1F5', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transformOrigin: '0 0', transform: `translate(${width / 2 - x * K}px, ${height / 2 - y * K}px) scale(${K})`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 40, overflow: 'hidden', background: '#fff', boxShadow: `0 0 0 ${3 / K}px #DDE3EA`}}>
          <Img src={staticFile(`signals/ui/${src}`)} style={{width: w, height: h, display: 'block'}} />
          <ScaleCtx.Provider value={K}>{children}</ScaleCtx.Provider>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* Рамка вокруг одного объекта (в пикселях картинки) */
export const IFocus: React.FC<{x: number; y: number; w: number; h: number; at: number; until?: number}> = ({x, y, w, h, at, until = 1e9}) => {
  const frame = useCurrentFrame();
  const K = useContext(ScaleCtx);
  const p = interpolate(frame, [at, at + 10], [0, 1], clamp) * interpolate(frame, [until, until + 10], [1, 0], clamp);
  if (p <= 0) return null;
  const pad = (12 + (1 - p) * 24) / K;
  return <div style={{position: 'absolute', left: x - pad, top: y - pad, width: w + pad * 2, height: h + pad * 2, borderRadius: 24 / K + pad, border: `${4 / K}px solid ${colors.blue}`, boxShadow: `0 0 0 ${8 / K}px rgba(34,145,255,0.14)`, opacity: p}} />;
};

/* Курсор по точкам (пиксели картинки) */
export const ICursor: React.FC<{path: {x: number; y: number; at: number; click?: boolean}[]}> = ({path}) => {
  const frame = useCurrentFrame();
  const K = useContext(ScaleCtx);
  if (!path.length || frame < path[0].at - 10) return null;
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (frame >= b.at - 18) {
      const t = interpolate(frame, [b.at - 18, b.at], [0, 1], {...clamp, easing: ease});
      x = a.x + (b.x - a.x) * t;
      y = a.y + (b.y - a.y) * t;
    }
  }
  const clickAt = path.filter((p) => p.click && frame >= p.at).map((p) => p.at).pop();
  const press = clickAt !== undefined && frame - clickAt < 5 ? 0.85 : 1;
  const r = clickAt !== undefined ? interpolate(frame - clickAt, [0, 18], [0, 1], clamp) : 1;
  const sz = 44 / K;
  return (
    <>
      {r < 1 && <div style={{position: 'absolute', left: x - (40 * r) / K, top: y - (40 * r) / K, width: (80 * r) / K, height: (80 * r) / K, borderRadius: '50%', border: `${3 / K}px solid ${colors.blue}`, opacity: 1 - r}} />}
      <svg width={sz} height={sz} viewBox="0 0 24 24" style={{position: 'absolute', left: x - sz * 0.14, top: y - sz * 0.07, opacity: interpolate(frame, [path[0].at - 10, path[0].at], [0, 1], clamp), transform: `scale(${press})`, transformOrigin: '14% 7%', filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))'}}>
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill="#1F2328" stroke="#fff" strokeWidth={1.3} />
      </svg>
    </>
  );
};

/* Заплатка: перекрыть кусок макета своим содержимым (пиксели картинки) */
export const Patch: React.FC<{x: number; y: number; w: number; h: number; bg?: string; r?: number; at?: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, h, bg = '#fff', r = 0, at, children, style}) => {
  const frame = useCurrentFrame();
  const o = at === undefined ? 1 : interpolate(frame, [at, at + 8], [0, 1], clamp);
  return <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: bg, borderRadius: r, opacity: o, fontFamily: font, ...style}}>{children}</div>;
};

/* Пункт меню «ИИ бизнес-сигналы» поверх старого названия в макете */
export const NavPatch: React.FC<{x?: number; y: number; w?: number; h?: number}> = ({x = 62, y, w = 420, h = 84}) => (
  <Patch x={x} y={y} w={w} h={h} r={18} style={{display: 'flex', alignItems: 'center', gap: 22, paddingLeft: 22}}>
    <svg width={40} height={40} viewBox="0 0 24 24">
      <path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z M18.5 3.5 l.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6z" fill="none" stroke="#1F2328" strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
    <span style={{fontSize: 28, color: '#1F2328'}}>ИИ бизнес-сигналы</span>
  </Patch>
);

/* Боковая панель выезжает справа поверх затемнённого экрана (кусок другой картинки) */
export const SlidePanel: React.FC<{src: string; srcW: number; crop: {x: number; y: number; w: number; h: number}; baseW: number; baseH: number; top?: number; at: number; children?: React.ReactNode}> = ({src, srcW, crop, baseW, baseH, top = 0, at, children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  if (p <= 0) return null;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `rgba(20,25,35,${0.32 * p})`}} />
      <div style={{position: 'absolute', left: baseW - crop.w, top, width: crop.w, height: Math.max(crop.h, baseH - top), background: '#fff', overflow: 'hidden', transform: `translateX(${(1 - p) * crop.w}px)`, boxShadow: '-20px 0 60px rgba(0,0,0,0.12)'}}>
        {src && <Img src={staticFile(`signals/ui/${src}`)} style={{position: 'absolute', left: -crop.x, top: -crop.y, width: srcW}} />}
        {children}
      </div>
    </>
  );
};

/* Маскот ИИ Контура — вырезан из дашборда аудита */
export const Mascot: React.FC<{size: number; style?: React.CSSProperties}> = ({size, style}) => {
  const k = size / 500;
  return (
    <div style={{width: size, height: size * 0.82, overflow: 'hidden', borderRadius: size * 0.16, background: '#E9F3FE', position: 'relative', ...style}}>
      <Img src={staticFile('signals/ui/audit-dash.png')} style={{position: 'absolute', width: 2882 * k, left: -1300 * k, top: -190 * k}} />
    </div>
  );
};

const at = (beats: number[], i: number, fallback: number) => (beats[i] !== undefined ? beats[i] : fallback);

/* ------------------------------ пресеты экранов ------------------------------ */

/** Хаб «ИИ бизнес-сигналы»: обзор и проход по трём модулям */
export const HubScreen: React.FC<{beats: number[]; dur: number}> = ({beats, dur}) => {
  const b0 = at(beats, 0, dur * 0.3);
  const b1 = at(beats, 1, dur * 0.55);
  return (
    <ScreenView
      src="hub.png"
      w={2874}
      h={1806}
      cam={[
        {at: 0, s: 1, x: 1437, y: 903},
        {at: b0, s: 1, x: 1437, y: 903},
        {at: b0 + 20, s: 1.25, x: 1240, y: 650},
        {at: b1, s: 1.25, x: 1240, y: 650},
        {at: b1 + 24, s: 1.25, x: 1900, y: 900},
      ]}
    >
      <IFocus x={530} y={185} w={1350} h={820} at={b0 + 10} until={b1} />
      <IFocus x={1915} y={185} w={910} h={820} at={b1 + 14} until={b1 + 50} />
      <IFocus x={530} y={1050} w={1350} h={540} at={b1 + 50} />
    </ScreenView>
  );
};

/** Аудит: экран «Прибыль». Сигнал о снижении дорисован поверх макета (в макетах прибыль растёт). */
export const AuditScreen: React.FC<{beats: number[]; dur: number}> = ({beats, dur}) => {
  const s1 = at(beats, 0, dur * 0.2);
  const s2 = at(beats, 1, dur * 0.45);
  const s3 = at(beats, 2, dur * 0.7);
  return (
    <ScreenView
      src="audit-profit.png"
      w={2878}
      h={2490}
      cam={[
        {at: 0, s: 1, x: 1439, y: 780},
        {at: s1, s: 1, x: 1439, y: 780},
        {at: s1 + 18, s: 1.3, x: 1500, y: 540},
        {at: s2, s: 1.3, x: 1500, y: 540},
        {at: s2 + 18, s: 1.3, x: 1650, y: 1880},
        {at: s3, s: 1.3, x: 1650, y: 1880},
        {at: s3 + 18, s: 1.45, x: 1700, y: 1100},
      ]}
    >
      {/* шапка: снижение на 12% */}
      <Patch x={595} y={198} w={950} h={90} style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
        <span style={{fontSize: 60, fontWeight: 700, color: '#1F2328'}}>23 080 ₽</span>
        <span style={{fontSize: 34, fontWeight: 700, color: '#E5484D'}}>↓ 12%</span>
        <span style={{fontSize: 30, color: '#8A949E'}}>26 230 ₽ на прошлой неделе</span>
      </Patch>
      <Patch x={2560} y={212} w={230} h={70} r={16} bg="#FDE8E8" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#C8323A'}}>
        снижение
      </Patch>
      {/* ИИ‑вывод */}
      <Patch x={575} y={1000} w={2245} h={205} r={28} bg="#EAF3FE" style={{padding: '34px 40px 0 112px'}}>
        <svg width={52} height={52} viewBox="0 0 24 24" style={{position: 'absolute', left: 36, top: 34}}>
          <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill={colors.blue} />
        </svg>
        <div style={{fontSize: 29, lineHeight: 1.5, color: '#1F2328'}}>
          Валовая прибыль снизилась на 12% — до 23 080 ₽. Основной вклад внесли «Хлеб и выпечка» и «Снеки и закуски»: выросли закупочные цены. Проверьте цены и закупочные условия у поставщиков.
        </div>
        <div style={{fontSize: 27, color: '#8A949E', marginTop: 14}}>Создано ИИ Контура</div>
      </Patch>
      <IFocus x={590} y={190} w={2230} h={790} at={s1} until={s2} />
      <IFocus x={575} y={1700} w={2245} h={490} at={s2} until={s3} />
      <IFocus x={575} y={1000} w={2245} h={205} at={s3} />
    </ScreenView>
  );
};

/** Дубли: вкладка «Дубли» + панель «Объединить карточки / Это не дубли» */
export const DupesScreen: React.FC<{beats: number[]; dur: number}> = ({beats, dur}) => {
  const open = at(beats, 0, dur * 0.25) + 14;
  const ok = at(beats, 1, dur * 0.5);
  const no = at(beats, 2, dur * 0.65);
  const cards = [['Карточка 1', 'Арт. 10234 · 89,90 ₽'], ['Карточка 2', 'Арт. 10877 · 91,50 ₽'], ['Карточка 3', 'Арт. 11002 · 89,90 ₽'], ['Карточка 4', 'Арт. 11420 · 92,00 ₽']];
  return (
    <ScreenView
      src="dupes-tab.png"
      w={2944}
      h={2066}
      cam={[
        {at: 0, s: 1, x: 1472, y: 1000},
        {at: open - 30, s: 1.2, x: 1500, y: 1250},
        {at: open, s: 1.2, x: 1500, y: 1250},
        {at: open + 20, s: 1.08, x: 2050, y: 570},
      ]}
    >
      <NavPatch y={1068} />
      <IFocus x={590} y={1395} w={2310} h={105} at={open - 26} until={open} />
      <ICursor path={[{x: 1700, y: 1700, at: open - 30}, {x: 1100, y: 1448, at: open - 2, click: true}, {x: 2410, y: 790, at: ok}, {x: 2410, y: 982, at: no}]} />
      <SlidePanel src="" srcW={0} crop={{x: 0, y: 0, w: 1060, h: 2066}} baseW={2944} baseH={2066} at={open}>
        <div style={{position: 'absolute', inset: 0, padding: '60px 56px', fontFamily: font, color: '#1F2328'}}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div style={{fontSize: 44, fontWeight: 700, lineHeight: 1.2}}>Молоко «Домик в деревне» 950 мл</div>
            <div style={{fontSize: 40, color: '#8A949E'}}>✕</div>
          </div>
          <div style={{fontSize: 28, color: '#8A949E', marginTop: 16}}>Молочная продукция</div>
          <div style={{fontSize: 30, fontWeight: 700, marginTop: 50}}>Карточки в группе</div>
          {cards.map(([a, b]) => (
            <div key={a} style={{display: 'flex', justifyContent: 'space-between', fontSize: 28, padding: '22px 0', borderBottom: '2px solid #E6EBF0'}}>
              <span>{a}</span>
              <span style={{color: '#6B7580'}}>{b}</span>
            </div>
          ))}
          <div style={{position: 'absolute', left: 56, right: 56, top: 745}}>
            <div style={{background: colors.blue, color: '#fff', fontSize: 30, fontWeight: 500, textAlign: 'center', padding: '26px 0', borderRadius: 18}}>Объединить карточки</div>
            <div style={{fontSize: 24, color: '#8A949E', margin: '14px 0 26px', lineHeight: 1.35}}>Остатки и продажи перенесутся на одну карточку, остальные уйдут в архив</div>
            <div style={{border: '3px solid #DDE3EA', fontSize: 30, fontWeight: 500, textAlign: 'center', padding: '23px 0', borderRadius: 18}}>Это не дубли</div>
          </div>
        </div>
      </SlidePanel>
      {open > 0 && <IFocus x={1940} y={745} w={948} h={88} at={ok} until={no} />}
      {open > 0 && <IFocus x={1940} y={937} w={948} h={90} at={no} />}
    </ScreenView>
  );
};

/** Сверка с Честным знаком: риски → коды → «долго на балансе» → подсказка в панели */
export const CzScreen: React.FC<{beats: number[]; dur: number}> = ({beats, dur}) => {
  const b0 = at(beats, 0, dur * 0.15);
  const b1 = at(beats, 1, dur * 0.35);
  const b2 = at(beats, 2, dur * 0.55);
  const b3 = at(beats, 3, dur * 0.72);
  const panel = b3 + 16;
  return (
    <ScreenView
      src="cz-codes.png"
      w={2920}
      h={3730}
      cam={[
        {at: 0, s: 1, x: 1460, y: 900},
        {at: b0, s: 1, x: 1460, y: 900},
        {at: b0 + 18, s: 1.25, x: 1350, y: 560},
        {at: b1, s: 1.25, x: 1350, y: 560},
        {at: b1 + 20, s: 1.2, x: 1400, y: 1420},
        {at: b2, s: 1.2, x: 1400, y: 1420},
        {at: b2 + 20, s: 1.3, x: 2250, y: 1150},
        {at: panel, s: 1.3, x: 2250, y: 1150},
        {at: panel + 20, s: 1.15, x: 2150, y: 900},
      ]}
    >
      <IFocus x={590} y={180} w={1660} h={250} at={b0} until={b1} />
      <IFocus x={590} y={1105} w={1660} h={650} at={b1} until={b2} />
      <IFocus x={2365} y={1262} w={515} h={290} at={b2} until={b3} />
      <ICursor path={[{x: 2200, y: 1700, at: b3 - 14}, {x: 2620, y: 1080, at: panel, click: true}]} />
      <SlidePanel src="cz-hint.png" srcW={2953} crop={{x: 1712, y: 70, w: 1100, h: 1700}} baseW={2920} baseH={1900} at={panel} />
    </ScreenView>
  );
};

/** Сравнение с конкурентами: обзор → «дешевле рынка» → карточка товара с ценами конкурентов */
export const CompScreen: React.FC<{beats: number[]; dur: number}> = ({beats, dur}) => {
  const b0 = at(beats, 0, dur * 0.2);
  const b1 = at(beats, 1, dur * 0.45);
  const b2 = at(beats, 2, dur * 0.7);
  return (
    <ScreenView
      src="comp-group.png"
      w={2944}
      h={1866}
      cam={[
        {at: 0, s: 1, x: 1472, y: 933},
        {at: b0, s: 1, x: 1472, y: 933},
        {at: b0 + 18, s: 1.25, x: 1350, y: 1050},
        {at: b1, s: 1.25, x: 1350, y: 1050},
        {at: b1 + 20, s: 1.2, x: 1500, y: 1250},
        {at: b2, s: 1.2, x: 1500, y: 1250},
        {at: b2 + 20, s: 1.15, x: 2100, y: 800},
      ]}
    >
      <NavPatch y={1060} />
      <IFocus x={590} y={180} w={1730} h={245} at={b0} until={b1} />
      <IFocus x={590} y={1322} w={1690} h={100} at={b1} until={b2} />
      <SlidePanel src="comp-card.png" srcW={2944} crop={{x: 1712, y: 0, w: 1232, h: 1866}} baseW={2944} baseH={1866} at={b2} />
    </ScreenView>
  );
};

export const secs = (s: number) => Math.round(s * FPS);
export {spring};
