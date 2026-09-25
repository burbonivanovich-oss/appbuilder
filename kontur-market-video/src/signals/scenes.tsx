import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import {Anchor, Camera, Cursor, FPS, Focus, Footnote, GRAY, GREEN, INK, Icon, LINE, MarketWindow, Pill, RED, SignalCard, TILE, YELLOW, clamp, ease, useAppear, usePop} from './ui';

export type SceneProps = {cue: (k: string) => number; dur: number};
const W: React.CSSProperties = {background: '#fff'};

/* 0:00 — данные есть, ясности нет */
const DATA = [
  {t: 'Продажи', v: '412 чеков', icon: 'market-register-classic', x: 260, y: 360},
  {t: 'Остатки', v: '1 284 SKU', icon: 'delivery-box-iso', x: 1380, y: 330},
  {t: 'Списания', v: '−6 800 ₽', icon: 'doc-arrow-sync', x: 420, y: 720},
  {t: 'Цены', v: '38 изменений', icon: 'money-wallet-a', x: 1180, y: 700},
  {t: 'Маркировка', v: '9 120 кодов', icon: 'check-circle-cut', x: 820, y: 520},
];
export const Data: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const gather = interpolate(frame, [cue('риск'), cue('роста') + 10], [0, 1], {...clamp, easing: ease});
  const ring = interpolate(frame, [cue('роста'), cue('роста') + 30], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const rect = 'M 560 400 H 1360 A 40 40 0 0 1 1400 440 V 900 A 40 40 0 0 1 1360 940 H 560 A 40 40 0 0 1 520 900 V 440 A 40 40 0 0 1 560 400 Z';
  const e = evolvePath(ring, rect);
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Данные есть.', at: 6}, {text: 'Ясности нет.', at: cue('Но'), color: colors.blue}]} />
      {DATA.map((d, i) => {
        const p = usePop(8 + i * 6, 15);
        const tx = 600 + (i % 3) * 260;
        const ty = 470 + Math.floor(i / 3) * 210;
        const x = interpolate(gather, [0, 1], [d.x, tx]) + Math.sin(frame / 30 + i) * 10 * (1 - gather);
        const y = interpolate(gather, [0, 1], [d.y, ty]) + Math.cos(frame / 26 + i) * 10 * (1 - gather);
        return (
          <div key={d.t} style={{position: 'absolute', left: x, top: y, width: 240, padding: '20px 22px', background: TILE, borderRadius: 22, fontFamily: font, transform: `scale(${p * (1 - gather * 0.08)}) rotate(${(1 - gather) * ((i % 2) * 2 - 1) * 3}deg)`}}>
            <Icon name={d.icon} size={34} />
            <div style={{fontSize: 22, color: GRAY, marginTop: 12}}>{d.t}</div>
            <div style={{fontSize: 30, fontWeight: 700, color: INK}}>{d.v}</div>
          </div>
        );
      })}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={rect} fill="none" stroke={colors.blue} strokeWidth={5} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
    </AbsoluteFill>
  );
};

/* 0:10 — владелец ищет причины сам → отчёты превращаются в сигналы */
const SHEETS = [
  {t: 'Отчёт о продажах', cue: 'продажах'},
  {t: 'Остатки на складе', cue: 'остатках'},
  {t: 'Списания за неделю', cue: 'списаниях'},
];
export const Owner: React.FC<SceneProps> = ({cue, dur}) => {
  const frame = useCurrentFrame();
  const turn = interpolate(frame, [cue('поздно') - 10, cue('поздно') + 25], [0, 1], {...clamp, easing: ease});
  const clock = useAppear(cue('время'));
  return (
    <AbsoluteFill style={W}>
      {/* владелец: телефон, касса и стопка отчётов */}
      <div style={{position: 'absolute', left: 150, top: 300, width: 700, height: 600, borderRadius: 40, background: TILE}} />
      <div style={{position: 'absolute', left: 200, top: 350, width: 140, height: 140, borderRadius: 70, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name="people-3" size={80} />
      </div>
      <div style={{position: 'absolute', left: 200, top: 510, fontFamily: font, fontSize: 28, color: GRAY}}>Собственник</div>
      <Img src={staticFile('mspos-f20-f.png')} style={{position: 'absolute', left: 170, top: 610, width: 360}} />
      {SHEETS.map((s, i) => {
        const p = useAppear(cue(s.cue), 12);
        const fx = interpolate(turn, [0, 1], [460 + i * 18, 1120]);
        const fy = interpolate(turn, [0, 1], [380 + i * 70, 330 + i * 190]);
        return (
          <div key={s.t} style={{position: 'absolute', left: fx, top: fy, opacity: p, transform: `rotate(${(1 - turn) * (i - 1) * 4}deg) translateY(${(1 - p) * -40}px)`}}>
            {turn < 0.5 ? (
              <div style={{width: 340, height: 170, background: '#fff', border: `2px solid ${LINE}`, borderRadius: 16, padding: 22, fontFamily: font, opacity: 1 - turn * 2}}>
                <div style={{fontSize: 24, fontWeight: 700, color: INK}}>{s.t}</div>
                {[0, 1, 2, 3].map((k) => (
                  <div key={k} style={{height: 10, borderRadius: 5, background: LINE, marginTop: 14, width: `${90 - k * 15}%`}} />
                ))}
              </div>
            ) : (
              <SignalCard
                w={620}
                tone={(['red', 'yellow', 'blue'] as const)[i]}
                title={['Прибыль снизилась на 12%', 'Коды без движения 45 дней', 'Цена ниже рынка на 15 ₽'][i]}
                sub={['Аудит точки · что проверить: цены', 'Сверка с Честным Знаком', 'Сравнение с конкурентами'][i]}
                style={{opacity: (turn - 0.5) * 2}}
              />
            )}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 620, top: 700, opacity: clock * (1 - turn), transform: `rotate(${frame * 4}deg)`}}>
        <Icon name="time-clock-fast" size={110} color={GRAY} />
      </div>
      <Anchor lines={[{text: 'Не новые отчёты.', at: cue('поздно') + 5}, {text: 'Рекомендации к действию.', at: cue('поздно') + 18, color: colors.blue}]} size={64} />
      <div style={{position: 'absolute', left: 0, top: 0, opacity: 0 * dur}} />
    </AbsoluteFill>
  );
};

/* 0:24 — для кого */
export const Who: React.FC<SceneProps> = ({cue}) => {
  const cards = [
    {t: 'Управляю сам', icon: 'people-3', at: cue('управляет')},
    {t: 'Отчёты есть,\nвремени нет', icon: 'time-clock-fast', at: cue('отчёты')},
    {t: 'Не хочу\nупускать деньги', icon: 'money-wallet-a', at: cue('важно')},
  ];
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Для кого', at: 4}]} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 340, display: 'flex', gap: 40}}>
        {cards.map((c) => {
          const p = usePop(c.at, 15);
          return (
            <div key={c.t} style={{flex: 1, height: 460, background: TILE, borderRadius: 40, padding: 50, fontFamily: font, transform: `translateY(${(1 - p) * 120}px)`, opacity: Math.min(1, p * 1.5)}}>
              <Icon name={c.icon} size={80} />
              <div style={{fontSize: 56, fontWeight: 700, color: INK, lineHeight: 1.1, marginTop: 150, whiteSpace: 'pre'}}>{c.t}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 0:38 — цепочка: данные → сигнал → причина → действие → решение */
export const Chain: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const nodes = [
    {t: 'Данные учёта', icon: 'delivery-box-iso', at: cue('данные')},
    {t: 'Отклонение', icon: 'data-chart-pie-a-1', at: cue('отклонения')},
    {t: 'Сигнал', icon: 'notification-bell-alarm', at: cue('отклонения') + 12},
    {t: 'Причина', icon: 'doc-arrow-sync', at: cue('причину')},
    {t: 'Что проверить', icon: 'check-circle-cut', at: cue('рекомендуют')},
    {t: 'Решение\nза вами', icon: 'people-3', at: cue('Финальное'), owner: true},
  ];
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Данные → сигнал → причина → действие', at: 4}]} size={64} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 450, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        {nodes.map((n, i) => {
          const p = usePop(n.at, 13);
          const line = interpolate(frame, [n.at, n.at + 12], [0, 1], clamp);
          return (
            <div key={n.t} style={{width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'}}>
              {i > 0 && <div style={{position: 'absolute', right: 150, top: 70, width: 110 * line, height: 4, borderRadius: 2, background: colors.blue, transformOrigin: 'right'}} />}
              <div style={{width: 140, height: 140, borderRadius: 40, background: n.owner ? colors.blue : TILE, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${p})`, position: 'relative'}}>
                <Icon name={n.icon} size={64} color={n.owner ? '#fff' : colors.blue} />
                {n.owner && (
                  <div style={{position: 'absolute', right: -14, bottom: -14, width: 52, height: 52, borderRadius: 26, background: GREEN, color: '#fff', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #fff'}}>✓</div>
                )}
              </div>
              <div style={{fontFamily: font, fontSize: 28, fontWeight: 500, textAlign: 'center', marginTop: 26, color: INK, opacity: p, whiteSpace: 'pre'}}>{n.t}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 0:52 — данные остаются внутри Контур.Маркета */
export const Trust: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const ring = interpolate(frame, [6, 40], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const circle = 'M 960 380 A 200 200 0 1 1 959.9 380';
  const e = evolvePath(ring, circle);
  const toWin = interpolate(frame, [cue('внутри') - 10, cue('внутри') + 20], [0, 1], {...clamp, easing: ease});
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Данные остаются', at: 4}, {text: 'внутри Контур.Маркета', at: 14, color: colors.blue}]} size={64} />
      <div style={{opacity: 1 - toWin, transform: `scale(${1 - toWin * 0.3})`, transformOrigin: '960px 580px', position: 'absolute', inset: 0}}>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <path d={circle} fill="none" stroke={colors.blue} strokeWidth={6} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
        </svg>
        <div style={{position: 'absolute', left: 890, top: 510}}>
          <Icon name="security-shield" size={140} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 330,
          width: 1200,
          borderRadius: 28,
          overflow: 'hidden',
          border: `5px solid ${colors.blue}`,
          opacity: toWin,
          transform: `scale(${0.7 + toWin * 0.3})`,
        }}
      >
        <Img src={staticFile('demo-market.png')} style={{width: '100%', display: 'block'}} />
      </div>
      <div style={{position: 'absolute', left: 1400, top: 300, opacity: useAppear(cue('передавать'))}}>
        <Pill color="#fff" bg={colors.blue} size={26}>Без сторонних сервисов</Pill>
      </div>
    </AbsoluteFill>
  );
};

/* 1:02 — три модуля (карточки + быстрый переход по вкладкам) */
const MODULES = [
  {t: 'Аудит\nторговой точки', icon: 'data-chart-pie-a-1', cue: 'аудит'},
  {t: 'Сверка\nс Честным Знаком', icon: 'check-circle-cut', cue: 'сверка'},
  {t: 'Сравнение\nс конкурентами', icon: 'money-wallet-a', cue: 'сравнение'},
];
export const Modules: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill style={W}>
    <Anchor lines={[{text: '3 модуля для ежедневных решений', at: 4}]} size={64} />
    <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'flex', gap: 40}}>
      {MODULES.map((m) => {
        const p = usePop(cue(m.cue), 14);
        return (
          <div key={m.t} style={{flex: 1, height: 520, background: colors.blue, borderRadius: 40, padding: 50, fontFamily: font, color: '#fff', transform: `translateY(${(1 - p) * 140}px)`, opacity: Math.min(1, p * 1.5)}}>
            <Icon name={m.icon} size={80} color="#fff" />
            <div style={{fontSize: 54, fontWeight: 700, lineHeight: 1.1, marginTop: 200, whiteSpace: 'pre'}}>{m.t}</div>
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);

/* 1:12 — аудит торговой точки: сигнал → причина → что проверить */
export const Audit: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const ex = cue('Например');
  const chartOut = interpolate(frame, [ex - 12, ex + 6], [1, 0], clamp);
  const pts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [300 + i * 140, 700 - [40, 70, 55, 90, 80, 110, 95, 60, -40, -120][i]]);
  const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const draw = interpolate(frame, [6, 70], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const e = evolvePath(draw, d);
  const win = useAppear(ex, 18);
  const s1 = cue('снижение');
  const s2 = cue('товары');
  const s3 = cue('предлагает');
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Сигнал → Причина → Что проверить', at: 4}]} size={64} />
      <div style={{position: 'absolute', inset: 0, opacity: chartOut}}>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <line x1={300} x2={1640} y1={760} y2={760} stroke={LINE} strokeWidth={3} />
          <path d={d} fill="none" stroke={colors.blue} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
        </svg>
        <div style={{position: 'absolute', left: 1480, top: 560, opacity: interpolate(frame, [60, 75], [0, 1], clamp)}}>
          <SignalCard w={380} title="Прибыль снизилась" sub="−12% к прошлой неделе" />
        </div>
      </div>
      <div style={{opacity: win, position: 'absolute', inset: 0}}>
        <Camera keys={[{at: ex, s: 1, cx: 960, cy: 640}, {at: s1, s: 1, cx: 960, cy: 640}, {at: s1 + 15, s: 1.2, cx: 1110, cy: 500}, {at: s2, s: 1.2, cx: 1110, cy: 500}, {at: s2 + 15, s: 1.2, cx: 1110, cy: 680}, {at: s3, s: 1.2, cx: 1110, cy: 680}, {at: s3 + 15, s: 1.2, cx: 1110, cy: 800}]}>
          <MarketWindow title="Аудит торговой точки" tabs={['Аудит точки', 'Сверка с ЧЗ', 'Конкуренты']} activeTab={0} y={250} h={800}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 22, fontFamily: font}}>
              <div style={{background: TILE, borderRadius: 22, padding: '24px 28px'}}>
                <div style={{fontSize: 20, color: GRAY}}>Сигнал · Магазин на Ленина · 16–22 сентября</div>
                <div style={{fontSize: 40, fontWeight: 700, color: INK, marginTop: 6}}>
                  Прибыль снизилась на <span style={{color: RED}}>12%</span> к прошлой неделе
                </div>
              </div>
              <div style={{background: TILE, borderRadius: 22, padding: '22px 28px'}}>
                <div style={{fontSize: 24, fontWeight: 700, color: INK}}>Возможная причина</div>
                {[['Молочная продукция', '−8 400 ₽', 'выросла закупочная цена'], ['Хлеб и выпечка', '−3 100 ₽', 'меньше продаж утром'], ['Напитки', '−1 200 ₽', 'рост списаний']].map(([c, v, why]) => (
                  <div key={c} style={{display: 'grid', gridTemplateColumns: '1fr 160px 1fr', fontSize: 24, padding: '10px 0', borderBottom: `1px solid ${LINE}`}}>
                    <span style={{color: INK}}>{c}</span>
                    <span style={{color: RED, fontWeight: 700}}>{v}</span>
                    <span style={{color: GRAY}}>{why}</span>
                  </div>
                ))}
              </div>
              <div style={{background: '#EAF4FF', borderRadius: 22, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div>
                  <div style={{fontSize: 24, fontWeight: 700, color: INK}}>Что проверить</div>
                  <div style={{fontSize: 24, color: INK, marginTop: 4}}>Цены и закупочные условия по молочной продукции</div>
                </div>
                <Pill color="#fff" bg={colors.blue} size={22}>Перейти к проверке</Pill>
              </div>
            </div>
          </MarketWindow>
          <Focus x={494} y={420} w={1232} h={126} at={s1} until={s2} />
          <Focus x={494} y={568} w={1232} h={228} at={s2} until={s3} />
          <Focus x={494} y={818} w={1232} h={110} at={s3} />
          <Cursor path={[{x: 1300, y: 950, at: s3 - 6}, {x: 1590, y: 873, at: s3 + 30, click: true}]} />
        </Camera>
      </div>
    </AbsoluteFill>
  );
};

/* 1:37 — дубли товарных карточек */
const Product: React.FC<{name: string; sub: string; style?: React.CSSProperties}> = ({name, sub, style}) => (
  <div style={{width: 520, background: '#fff', border: `2px solid ${LINE}`, borderRadius: 20, padding: '18px 24px', fontFamily: font, ...style}}>
    <div style={{fontSize: 28, fontWeight: 700, color: INK}}>{name}</div>
    <div style={{fontSize: 20, color: GRAY, marginTop: 4}}>{sub}</div>
  </div>
);
export const Dupes: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const a = cue('дубли');
  const ok = cue('подтверждает') + 14;
  const no = cue('отклоняет') + 14;
  const merge = interpolate(frame, [ok, ok + 16], [0, 1], {...clamp, easing: ease});
  const split = interpolate(frame, [no, no + 16], [0, 1], {...clamp, easing: ease});
  const p1 = useAppear(a, 14);
  const p2 = useAppear(cue('подтверждает') - 10, 14);
  return (
    <AbsoluteFill style={W}>
      <MarketWindow title="Возможные дубли товаров" tabs={['Аудит точки', 'Сверка с ЧЗ', 'Конкуренты']} activeTab={0} y={140} h={880}>
        <div style={{position: 'relative', height: '100%', fontFamily: font}}>
          {/* пара 1 — подтверждаем */}
          <div style={{position: 'absolute', left: 0, top: 10, opacity: p1}}>
            <Product name="Молоко 3,2% 930 мл «Ферма»" sub="Артикул 10234 · 128 продаж" style={{transform: `translateX(${merge * 290}px)`}} />
            <Product name="Молоко 3.2% 0,93 л Ферма" sub="Артикул 10877 · 41 продажа" style={{position: 'absolute', left: 580, top: 0, transform: `translateX(${-merge * 290}px)`, opacity: 1 - merge}} />
            <div style={{position: 'absolute', left: 0, top: 130, display: 'flex', gap: 14, alignItems: 'center', opacity: 1 - merge}}>
              <Pill color={GRAY} bg={TILE} size={22}>Совпадение 94%</Pill>
              <Pill color="#fff" bg={colors.blue} size={22}>Подтвердить</Pill>
              <Pill color={INK} bg="#fff" size={22} style={{border: `2px solid ${LINE}`}}>Отклонить</Pill>
            </div>
            <div style={{position: 'absolute', left: 290, top: 130, opacity: merge}}>
              <Pill color="#fff" bg={GREEN} size={22}>Объединено ✓</Pill>
            </div>
          </div>
          {/* пара 2 — отклоняем */}
          <div style={{position: 'absolute', left: 0, top: 290, opacity: p2}}>
            <Product name="Кефир 1% 900 мл" sub="Артикул 20411 · 76 продаж" style={{transform: `translateX(${-split * 20}px)`}} />
            <Product name="Кефир 2,5% 900 мл" sub="Артикул 20412 · 58 продаж" style={{position: 'absolute', left: 580, top: 0, transform: `translateX(${split * 40}px)`}} />
            <div style={{position: 'absolute', left: 0, top: 130, display: 'flex', gap: 14, alignItems: 'center', opacity: 1 - split}}>
              <Pill color={GRAY} bg={TILE} size={22}>Совпадение 81%</Pill>
              <Pill color="#fff" bg={colors.blue} size={22}>Подтвердить</Pill>
              <Pill color={INK} bg="#fff" size={22} style={{border: `2px solid ${LINE}`}}>Отклонить</Pill>
            </div>
            <div style={{position: 'absolute', left: 0, top: 130, opacity: split}}>
              <Pill color={INK} bg={TILE} size={22}>Разные товары ✕</Pill>
            </div>
          </div>
        </div>
      </MarketWindow>
      <Cursor path={[{x: 1500, y: 900, at: cue('подтверждает') - 12}, {x: 800, y: 470, at: ok, click: true}, {x: 990, y: 750, at: no, click: true}]} />
      <div style={{position: 'absolute', left: 1180, top: 760, opacity: useAppear(cue('ручной'))}}>
        <Anchor lines={[{text: 'Решение — за вами', at: cue('ручной')}]} x={0} y={0} size={44} />
      </div>
    </AbsoluteFill>
  );
};

/* 1:49 — сверка с Честным Знаком */
const CODES = [
  {code: '0104601234567890 21aB7xQ', item: 'Молоко 3,2% 930 мл', st: 'В обороте', c: GREEN, cue: 'коды'},
  {code: '0104601234567891 21kL2mP', item: 'Молоко 3,2% 930 мл', st: 'Не введён в оборот', c: RED, cue: 'коды'},
  {code: '0104607770001112 21zQ9wE', item: 'Творог 5% 200 г', st: 'Срок истекает через 2 дня', c: YELLOW, cue: 'срок'},
  {code: '0104607770001113 21rT4yU', item: 'Творог 5% 200 г', st: 'Срок годности истёк', c: RED, cue: 'срок'},
  {code: '0104609990003334 21pO8iA', item: 'Сыр 45% 200 г', st: 'Без движения 45 дней', c: YELLOW, cue: 'залежавшиеся'},
];
export const Marking: React.FC<SceneProps> = ({cue, dur}) => {
  const frame = useCurrentFrame();
  const det = cue('проверку') + 14;
  const panel = interpolate(frame, [det, det + 16], [0, 1], {...clamp, easing: ease});
  const banner = useAppear(dur - 70);
  return (
    <AbsoluteFill style={W}>
      <MarketWindow title="Сверка с Честным Знаком" tabs={['Аудит точки', 'Сверка с ЧЗ', 'Конкуренты']} activeTab={1} y={120} h={900}>
        <div style={{fontFamily: font}}>
          <div style={{display: 'flex', gap: 12, marginBottom: 18}}>
            <Pill color={INK} bg={TILE} size={22}>Товарная группа: Молочная продукция ▾</Pill>
            <Pill color={INK} bg={TILE} size={22}>Все статусы ▾</Pill>
          </div>
          {CODES.map((r, i) => {
            const p = useAppear(cue(r.cue) + (i % 2) * 6, 12);
            const sel = i === 3 && frame >= det;
            return (
              <div key={r.code} style={{display: 'grid', gridTemplateColumns: '420px 1fr 330px', alignItems: 'center', fontSize: 23, padding: '16px 18px', borderRadius: 14, background: sel ? '#EAF4FF' : 'transparent', borderBottom: `1px solid ${LINE}`, opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}>
                <span style={{fontFamily: 'DejaVu Sans Mono, monospace', fontSize: 20, color: GRAY}}>{r.code}</span>
                <span style={{color: INK}}>{r.item}</span>
                <Pill color={r.c === GREEN ? GREEN : r.c === RED ? RED : '#8A5A00'} bg={r.c === GREEN ? '#E3F6EC' : r.c === RED ? '#FDE8E8' : '#FFF3D6'} size={20}>
                  {r.st}
                </Pill>
              </div>
            );
          })}
        </div>
        {/* детали кода */}
        <div style={{position: 'absolute', right: -44, top: -170, bottom: -30, width: 520, background: '#fff', borderLeft: `2px solid ${LINE}`, padding: 36, fontFamily: font, transform: `translateX(${(1 - panel) * 560}px)`}}>
          <div style={{fontSize: 30, fontWeight: 700, color: INK}}>Код маркировки</div>
          {[['Товар', 'Творог 5% 200 г'], ['Код', '…21rT4yU'], ['Срок годности', '21.09.2026'], ['Статус', 'Срок истёк'], ['Остаток', 'на полке, 1 шт']].map(([k, v]) => (
            <div key={k} style={{marginTop: 20}}>
              <div style={{fontSize: 20, color: GRAY}}>{k}</div>
              <div style={{fontSize: 26, color: k === 'Статус' ? RED : INK, fontWeight: 500}}>{v}</div>
            </div>
          ))}
          <div style={{marginTop: 34}}>
            <Pill color="#fff" bg={colors.blue} size={22}>Снять с продажи и проверить</Pill>
          </div>
        </div>
      </MarketWindow>
      <Cursor path={[{x: 1400, y: 950, at: cue('проверку') - 10}, {x: 1000, y: 575, at: det, click: true}]} />
      <div style={{position: 'absolute', left: 150, top: 40, opacity: banner}}>
        <Pill color={INK} bg={TILE} size={24}>С 1 сентября 2026 — автоштрафы по данным Честного Знака</Pill>
      </div>
    </AbsoluteFill>
  );
};

/* 2:15 — автоштрафы */
export const Fines: React.FC<SceneProps> = ({cue}) => {
  const big = (at: number) => usePop(at, 13);
  const a = big(cue('10'));
  const b = big(cue('20'));
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'С 1 сентября 2026 —', at: 4}, {text: 'автоштрафы по данным Честного Знака', at: 14, color: colors.blue}]} size={60} />
      <div style={{position: 'absolute', left: 120, top: 420, display: 'flex', gap: 60, fontFamily: font}}>
        {[
          {v: '10 000 ₽', w: 'ИП', p: a},
          {v: '20 000 ₽', w: 'юрлицо', p: b},
        ].map((x) => (
          <div key={x.v} style={{width: 760, background: TILE, borderRadius: 40, padding: '50px 56px', opacity: Math.min(1, x.p * 1.5), transform: `translateY(${(1 - x.p) * 80}px)`}}>
            <div style={{fontSize: 140, fontWeight: 700, letterSpacing: -4, color: INK, lineHeight: 1}}>{x.v}</div>
            <div style={{fontSize: 44, color: colors.blue, marginTop: 16}}>{x.w}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 120, top: 820, fontFamily: font, fontSize: 34, color: INK, opacity: useAppear(cue('20') + 20)}}>
        За каждую единицу просроченного товара при игнорировании запрета на продажу
      </div>
      <Footnote at={cue('гарантирует')} text="Источник: Роспотребнадзор, разъяснение от 19.08.2026. Сверка помогает выявить риск и организовать проверку. Ответственность за соблюдение требований и решение о продаже остаются у продавца." />
    </AbsoluteFill>
  );
};

/* 2:29 — сравнение с конкурентами */
export const Market: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const map = useAppear(cue('рынок'));
  const tags = cue('Если');
  const calc = cue('продаётся');
  const res = cue('потенциальная');
  const low = Math.round(interpolate(frame, [res, res + 40], [0, 9000], {...clamp, easing: Easing.out(Easing.cubic)}));
  const high = Math.round(interpolate(frame, [res, res + 40], [0, 22500], {...clamp, easing: Easing.out(Easing.cubic)}));
  const pins = [
    {x: 420, y: 560, t: 'Ваш магазин', price: '100 ₽', us: true},
    {x: 250, y: 380, t: 'Конкурент А', price: '115 ₽'},
    {x: 640, y: 420, t: 'Конкурент Б', price: '115 ₽'},
    {x: 610, y: 760, t: 'Конкурент В', price: '118 ₽'},
  ];
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Рынок вокруг магазина', at: 4}]} size={64} />
      {/* схема района */}
      <div style={{position: 'absolute', left: 120, top: 260, width: 760, height: 700, borderRadius: 40, background: TILE, overflow: 'hidden', opacity: map}}>
        {[140, 330, 520].map((y) => <div key={y} style={{position: 'absolute', left: 0, right: 0, top: y, height: 26, background: '#fff'}} />)}
        {[180, 460].map((x) => <div key={x} style={{position: 'absolute', top: 0, bottom: 0, left: x, width: 26, background: '#fff'}} />)}
      </div>
      {pins.map((p, i) => {
        const s = usePop(cue('рынок') + i * 6, 12);
        const tag = usePop(tags + i * 5, 12);
        return (
          <div key={p.t} style={{position: 'absolute', left: p.x, top: p.y}}>
            <div style={{width: 34, height: 34, borderRadius: 17, background: p.us ? colors.blue : GRAY, border: '5px solid #fff', transform: `scale(${s}) translate(-50%,-50%)`}} />
            <div style={{position: 'absolute', left: 30, top: -44, transform: `scale(${tag})`, transformOrigin: 'left bottom', fontFamily: font, whiteSpace: 'nowrap'}}>
              <div style={{fontSize: 20, color: GRAY}}>{p.t}</div>
              <Pill color={p.us ? '#fff' : INK} bg={p.us ? colors.blue : '#fff'} size={30}>{p.price}</Pill>
            </div>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 150, top: 880, opacity: useAppear(res + 10)}}>
        <Pill color="#fff" bg={colors.blue} size={24}>Рекомендация: проверьте цену на молоко 3,2%</Pill>
      </div>
      {/* расчёт */}
      <div style={{position: 'absolute', left: 980, top: 300, fontFamily: font}}>
        <div style={{fontSize: 30, color: GRAY, opacity: useAppear(calc)}}>Разница × продажи × дни</div>
        <div style={{fontSize: 76, fontWeight: 700, color: INK, letterSpacing: -2, marginTop: 10, opacity: useAppear(calc + 6)}}>15 ₽ × 20–50 шт. × 30</div>
        <div style={{height: 4, width: 780, background: LINE, margin: '40px 0', opacity: useAppear(res)}} />
        <div style={{fontSize: 30, color: GRAY, opacity: useAppear(res)}}>Потенциально на одном SKU в месяц*</div>
        <div style={{fontSize: 100, fontWeight: 700, color: colors.blue, letterSpacing: -3, marginTop: 6, opacity: useAppear(res), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
          {low.toLocaleString('ru-RU')}–{high.toLocaleString('ru-RU')} ₽
        </div>
      </div>
      <Footnote at={cue('спрос')} text="* Расчётный сценарий. Применим при подтверждённой разнице в цене, объёме продаж и сохранении спроса после корректировки; не является гарантией эффекта." />
    </AbsoluteFill>
  );
};

/* 2:51 — итог по модулям */
export const Recap: React.FC<SceneProps> = ({cue}) => {
  const outs = ['Понять', 'Проверить риск', 'Найти возможность'];
  const cues = [cue('понять'), cue('проверить'), cue('увидеть')];
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Вместо ручного поиска — три сценария', at: 4}]} size={64} />
      <div style={{position: 'absolute', left: 120, right: 120, top: 330, display: 'flex', gap: 40}}>
        {MODULES.map((m, i) => {
          const p = usePop(8 + i * 5, 15);
          const o = usePop(cues[i], 13);
          return (
            <div key={m.t} style={{flex: 1, height: 560, border: `4px solid ${colors.blue}`, borderRadius: 40, padding: 50, fontFamily: font, opacity: p, position: 'relative'}}>
              <Icon name={m.icon} size={70} />
              <div style={{fontSize: 42, fontWeight: 700, lineHeight: 1.1, marginTop: 40, whiteSpace: 'pre', color: INK}}>{m.t}</div>
              <div style={{position: 'absolute', left: 50, bottom: 50, transform: `scale(${o})`, transformOrigin: 'left bottom'}}>
                <Pill color="#fff" bg={colors.blue} size={36}>{outs[i]}</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* 3:02 — экономика */
export const Econ: React.FC<SceneProps> = ({cue}) => {
  const a = usePop(cue('пяти'), 14);
  const b = usePop(cue('20'), 14);
  const c = useAppear(cue('помогают'));
  const d = usePop(cue('Стоимость'), 14);
  return (
    <AbsoluteFill style={W}>
      <div style={{position: 'absolute', left: 120, top: 260, display: 'flex', alignItems: 'center', gap: 60, fontFamily: font}}>
        <div style={{transform: `scale(${a})`, transformOrigin: 'left center'}}>
          <div style={{fontSize: 140, fontWeight: 700, color: INK, letterSpacing: -4}}>5 ч</div>
          <div style={{fontSize: 36, color: GRAY}}>в неделю на первичный поиск</div>
        </div>
        <div style={{fontSize: 90, color: colors.blue, opacity: b}}>→</div>
        <div style={{transform: `scale(${b})`, transformOrigin: 'left center'}}>
          <div style={{fontSize: 140, fontWeight: 700, color: colors.blue, letterSpacing: -4}}>до 20 ч*</div>
          <div style={{fontSize: 36, color: GRAY}}>в месяц на первичный анализ</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 600, opacity: c}}>
        <Pill color={INK} bg={TILE} size={32}>Начать анализ с конкретного сигнала и его причины</Pill>
      </div>
      <div style={{position: 'absolute', left: 120, top: 720, width: 900, background: colors.blue, color: '#fff', borderRadius: 32, padding: '30px 44px', fontFamily: font, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transform: `scale(${d})`, transformOrigin: 'left center'}}>
        <span style={{fontSize: 38, fontWeight: 500}}>ИИ Бизнес сигналы</span>
        <span style={{fontSize: 60, fontWeight: 700}}>15 000 ₽</span>
      </div>
      <Footnote at={cue('Стоимость')} text="* Расчётные сценарии; не являются гарантией эффекта или окупаемости. Стоимость и условия подключения требуют подтверждения перед публикацией." />
    </AbsoluteFill>
  );
};

/* 3:12 — финальный синий экран */
export const Cta: React.FC<SceneProps> = ({cue}) => {
  const items = [
    {t: 'Определим нужный сценарий', at: cue('определим')},
    {t: 'Покажем логику сигналов', at: cue('покажем')},
    {t: 'Уточним условия подключения', at: cue('уточним')},
  ];
  return (
    <AbsoluteFill style={{background: colors.blue}}>
      <Anchor lines={[{text: 'Разберите одну задачу', at: 4, color: '#fff'}, {text: 'вашего магазина', at: 12, color: '#fff'}]} size={96} y={120} />
      <div style={{position: 'absolute', left: 120, top: 400, opacity: useAppear(cue('20'))}}>
        <Pill color={colors.blue} bg="#fff" size={34}>Демонстрация 20–30 минут</Pill>
      </div>
      <div style={{position: 'absolute', left: 120, top: 530, display: 'flex', flexDirection: 'column', gap: 22, fontFamily: font}}>
        {items.map((it) => {
          const p = useAppear(it.at);
          return (
            <div key={it.t} style={{display: 'flex', gap: 20, alignItems: 'center', fontSize: 44, color: '#fff', opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
              <svg width={40} height={40} viewBox="0 0 24 24">
                <path d="M4 12.5 L9.5 18 L20 6.5" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {it.t}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', right: 140, top: 400, width: 380, height: 380, borderRadius: 32, border: '4px dashed rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: font, fontSize: 28, color: 'rgba(255,255,255,0.85)', padding: 30}}>
        QR-код / ссылка
        <br />
        после утверждения
      </div>
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 120, bottom: 70, height: 50, filter: 'brightness(0) invert(1)'}} />
    </AbsoluteFill>
  );
};

export const SCENES: Record<string, React.FC<SceneProps>> = {
  data: Data,
  owner: Owner,
  who: Who,
  chain: Chain,
  trust: Trust,
  modules: Modules,
  audit: Audit,
  dupes: Dupes,
  marking: Marking,
  fines: Fines,
  market: Market,
  recap: Recap,
  econ: Econ,
  cta: Cta,
};
export const toFrames = (sec: number) => Math.round(sec * FPS);
