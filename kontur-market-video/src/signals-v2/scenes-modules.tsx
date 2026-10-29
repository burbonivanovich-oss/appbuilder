import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {AiIcon, C, useBg, useAsset, Caption, CountUp, Cursor, Dot, Footnote, Head, Ico, Mark, SAFE, Sfx, Spot, Tag, Tone, TONE, Typewriter, ease, font, hoverP, lerp, pressP, spr} from './kit';
import {AiNote, Appear, Btn, Card, Delta, Lift, MarketWindow, PX, PageHead, R, Screen, SidePanel, SignalCard, Tabs, WIN_H, WIN_W, home, liftFocus} from './market-ui';
import type {SceneProps} from './SignalsV2';

/*
 * Модули. Экраны перерисованы упрощённо (меньше строк, крупнее текст), а главное в каждом
 * шаге выносится из интерфейса вперёд (Lift), интерфейс за ним размыт — как это делает дизайнер.
 */

const W = WIN_W;
const H = WIN_H;
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ============================ Аудит торговой точки ============================ */

const KPI: {t: string; i: string; v: number; suf: string; digits?: number; d: string; dir: 'up' | 'down'; tone: Tone; prev: string; badge: string}[] = [
  {t: 'Выручка', i: 'wallet', v: 151350, suf: ' ₽', d: '3%', dir: 'up', tone: 'green', prev: '146 940 ₽ на прошлой неделе', badge: 'повышение'},
  {t: 'Прибыль', i: 'ruble', v: 23080, suf: ' ₽', d: '12%', dir: 'down', tone: 'red', prev: '26 230 ₽ на прошлой неделе', badge: 'снижение'},
  {t: 'Средний чек', i: 'doc', v: 645, suf: ' ₽', d: '1%', dir: 'up', tone: 'green', prev: '639 ₽ на прошлой неделе', badge: 'повышение'},
  {t: 'Глубина чека', i: 'box', v: 3.7, suf: ' шт', digits: 1, d: '0,1 шт', dir: 'up', tone: 'green', prev: '3,6 шт на прошлой неделе', badge: 'повышение'},
];
const KY = (i: number) => 150 + i * 178;
const KpiBody: React.FC<{k: (typeof KPI)[number]; at: number}> = ({k, at}) => (
  <>
    <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 22}}>
      <Ico n={k.i} size={24} />
      {k.t}
      <span style={{marginLeft: 'auto', fontSize: 18, color: TONE[k.tone === 'red' ? 'red' : 'blue'].t, background: TONE[k.tone === 'red' ? 'red' : 'blue'].bg, padding: '3px 10px', borderRadius: 7}}>{k.badge}</span>
    </div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 12}}>
      <span style={{fontSize: 40, fontWeight: 700}}>
        <CountUp to={k.v} at={at} dur={26} digits={k.digits ?? 0} suffix={k.suf} />
      </span>
      <Delta dir={k.dir} tone={k.tone} size={24}>
        {k.d}
      </Delta>
    </div>
    <div style={{fontSize: 19, color: C.gray, marginTop: 4}}>{k.prev}</div>
  </>
);
const AuditDash: React.FC<{t0: number; why: number; hideKpi?: number}> = ({t0, why, hideKpi}) => {
  const f = useCurrentFrame();
  return (
    <>
      <PageHead title="Аудит торговой точки" back="ИИ бизнес-сигналы" meta="Данные за 29 июня — 5 июля" />
      <Appear at={t0 + 6}>
        <Card x={44} y={150} w={820} h={330} bg={C.orangeBg} style={{padding: '30px 34px'}}>
          <div style={{fontSize: 30, fontWeight: 700}}>Есть повод обратить внимание</div>
          {[
            ['Валовая прибыль снизилась на 12%', C.orange, true],
            ['Списания выросли на 8%', C.orange, false],
            ['Выручка выросла на 3%', C.blue, false],
          ].map(([t, c, m]) => (
            <div key={t as string} style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 27, marginTop: 16}}>
              <span style={{width: 12, height: 12, borderRadius: 6, background: c as string, flexShrink: 0}} />
              {m ? (
                <Mark at={why + 8} color="#FFC98F">
                  {t as string}
                </Mark>
              ) : (
                (t as string)
              )}
            </div>
          ))}
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 21, color: C.gray, marginTop: 22}}>
            <AiIcon size={22} /> Обзор сделан с помощью ИИ Контура
          </div>
        </Card>
      </Appear>
      <Appear at={t0 + 14}>
        <Card x={44} y={500} w={820} h={344} style={{padding: '30px 34px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700}}>
            Списания <span style={{fontSize: 19, fontWeight: 500, color: C.orangeText, background: C.orangeBg, padding: '4px 12px', borderRadius: 8}}>рост списаний</span>
          </div>
          {[
            ['Недостача', 52, '3 193 ₽'],
            ['Срок годности', 33, '2 026 ₽'],
            ['Иные цели', 15, '921 ₽'],
          ].map(([t, p, v], i) => (
            <div key={t as string} style={{display: 'flex', alignItems: 'center', fontSize: 23, marginTop: i ? 16 : 28}}>
              <span style={{width: 210}}>{t}</span>
              <div style={{flex: 1, height: 10, borderRadius: 5, background: C.page, marginRight: 24}}>
                <div style={{width: `${(p as number) * lerp(f, t0 + 20 + i * 4, t0 + 44 + i * 4)}%`, height: 10, borderRadius: 5, background: C.blue}} />
              </div>
              <span style={{width: 64, color: C.gray}}>{p}%</span>
              <span style={{width: 120, textAlign: 'right'}}>{v}</span>
            </div>
          ))}
          <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 26}}>
            <span style={{fontSize: 36, fontWeight: 700}}>6 140 ₽</span>
            <Delta dir="up" tone="red" size={22}>
              8%
            </Delta>
          </div>
        </Card>
      </Appear>
      {KPI.map((k, i) => (
        <Appear key={k.t} at={t0 + 8 + i * 4}>
          <Card x={888} y={KY(i)} w={448} h={160} style={{opacity: hideKpi === i ? 0 : 1}}>
            <KpiBody k={k} at={t0 + 12 + i * 4} />
          </Card>
        </Appear>
      ))}
    </>
  );
};

const DAYS7 = ['29 июн', '30 июн', '1 июл', '2 июл', '3 июл', '4 июл', '5 июл'];
const VALS = [3620, 4010, 3790, 3550, 3060, 2690, 2360];
/* Мини‑график прибыли по дням (координаты карточки шириной w) */
const ProfitChart: React.FC<{w: number; h: number; y0: number; draw: number; red: number; label?: number}> = ({w, h, y0, draw, red, label = 15}) => {
  const cx = (i: number) => 30 + (i * (w - 60)) / 6;
  const cy = (v: number) => y0 + h - 18 - ((v - 2200) / 2000) * (h - 40);
  const pts = VALS.map((v, i) => [cx(i), cy(v)]);
  const path = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const e = evolvePath(draw, path);
  return (
    <svg width={w} height={y0 + h + 30} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="pfm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.blue} stopOpacity={0.16} />
          <stop offset="1" stopColor={C.blue} stopOpacity={0} />
        </linearGradient>
      </defs>
      {DAYS7.map((d, i) => (
        <text key={d} x={cx(i)} y={y0 + h + 18} textAnchor="middle" fontSize={label} fill={C.gray} fontFamily={font}>
          {d}
        </text>
      ))}
      <path d={`${path} L ${cx(6)} ${y0 + h} L ${cx(0)} ${y0 + h} Z`} fill="url(#pfm)" opacity={draw} />
      <path d={path} fill="none" stroke={C.blue} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      <path d={'M ' + pts.slice(3).map((p) => p.join(' ')).join(' L ')} fill="none" stroke={C.red} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" opacity={red} />
      {pts.slice(3).map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill="#fff" stroke={C.red} strokeWidth={2.5} opacity={red} />
      ))}
    </svg>
  );
};
const CATS: {g: string; share: number; sum: string; d: string; dir: 'up' | 'down'}[] = [
  {g: 'Пиво', share: 45, sum: '10 386 ₽', d: '2%', dir: 'up'},
  {g: 'Хлеб и выпечка', share: 14, sum: '3 231 ₽', d: '18%', dir: 'down'},
  {g: 'Напитки', share: 11, sum: '2 539 ₽', d: '1%', dir: 'up'},
  {g: 'Снеки и закуски', share: 9, sum: '2 077 ₽', d: '9%', dir: 'down'},
];
const CAT_Y = (i: number) => 748 + i * 60;
const CatRow: React.FC<{c: (typeof CATS)[number]; bold?: boolean}> = ({c, bold}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', fontSize: 24, padding: '0 16px', fontWeight: bold ? 700 : 400}}>
    <span style={{width: 420}}>{c.g}</span>
    <div style={{width: 300, height: 10, borderRadius: 5, background: C.page}}>
      <div style={{width: `${c.share * 2}%`, height: 10, borderRadius: 5, background: C.blue}} />
    </div>
    <span style={{width: 110, paddingLeft: 30, color: C.gray, fontWeight: 400}}>{c.share}%</span>
    <span style={{width: 200, textAlign: 'right'}}>{c.sum}</span>
    <span style={{marginLeft: 'auto'}}>
      <Delta dir={c.dir} tone={c.dir === 'down' ? 'red' : 'green'} size={24}>
        {c.d}
      </Delta>
    </span>
  </div>
);
const INSIGHT = 'Валовая прибыль снизилась на 12% — до 23 080 ₽. Основной вклад — «Хлеб и выпечка» и «Снеки и закуски»: выросли закупочные цены. ';
const ProfitPage: React.FC<{t0: number; hideRows?: boolean; hideInsight?: boolean}> = ({t0, hideRows, hideInsight}) => {
  const f = useCurrentFrame();
  return (
    <>
      <PageHead title="Прибыль" back="Аудит торговой точки" meta="Данные за 29 июня — 5 июля" />
      <Card x={44} y={120} w={1292} h={360}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
          <span style={{fontSize: 44, fontWeight: 700}}>23 080 ₽</span>
          <Delta dir="down" tone="red" size={28}>
            12%
          </Delta>
          <span style={{fontSize: 22, color: C.gray}}>26 230 ₽ на прошлой неделе</span>
        </div>
        <ProfitChart w={1292} h={220} y0={100} draw={lerp(f, t0, t0 + 30, 0, 1, easeIO)} red={lerp(f, t0 + 20, t0 + 30)} label={18} />
      </Card>
      <div style={{position: 'absolute', left: 44, top: 500, width: 1292, opacity: hideInsight ? 0 : 1}}>
        <AiNote style={{minHeight: 170}} size={24}>
          {INSIGHT}
        </AiNote>
      </div>
      <Card x={44} y={690} w={1292} h={330} style={{padding: '18px 30px'}}>
        <div style={{display: 'flex', fontSize: 19, color: C.gray}}>
          <span style={{width: 436}}>Группа</span>
          <span style={{width: 300}}>Доля</span>
          <span style={{width: 310}} />
          <span>Динамика</span>
        </div>
      </Card>
      {CATS.map((c, i) => (
        <div key={c.g} style={{position: 'absolute', left: 58, width: 1264, top: CAT_Y(i), height: 60, borderBottom: `1px solid ${C.line}`, opacity: hideRows && c.dir === 'down' ? 0.25 : 1}}>
          <CatRow c={c} />
        </div>
      ))}
    </>
  );
};

export const Audit: React.FC<SceneProps> = ({cue, enter, dur}) => {
  const f = useCurrentFrame();
  const changed = cue('изменилось');
  const why = cue('почему');
  const eg = cue('Например');
  const drop = cue('снижение');
  const goods = cue('товары');
  const rec = cue('предлагает');
  const click = eg + 18;
  const liftAt = click + 3;
  const liftEnd = goods - 8;
  const page2 = click + 16; // страница «Прибыль» открывается под вынесенной карточкой
  const rowsAt = goods + 2;
  const rowsEnd = rec - 10;
  const p2 = lerp(f, page2, page2 + 16, 0, 1, ease);
  const clean = useAsset() === 'window'; // для ассета экрана — без скрытых под вынос элементов
  const spans: [number, number][] = [
    [liftAt, liftEnd],
    [rowsAt, rowsEnd],
    [rec, dur + 20],
  ];
  return (
    <Screen
      enter={enter}
      focus={liftFocus(f, spans) * 0.8}
      cam={[home(0), home(changed - 10), {at: changed + 8, s: 1.04, x: 900, y: 440}, {at: eg, s: 1.04, x: 900, y: 440}, {at: page2, s: 1, x: 840, y: 390}, {at: dur, s: 1.03, x: 850, y: 400}]}
      overlay={
        <Caption
          items={[
            {at: enter + 14, text: 'Что изменилось', light: 'и почему'},
            {at: drop, text: 'Сигнал:', light: 'прибыль снизилась на 12%'},
            {at: goods, text: 'Причина:', light: 'какие категории повлияли'},
            {at: rec, text: 'Что проверить:', light: 'цены и закупочные условия'},
          ]}
        />
      }
      lifts={
        <>
          {/* карточка «Прибыль» вылетает и раскрывается графиком */}
          <Lift rect={R(888, KY(1), 448, 160)} to={{x: 470, y: 230, w: 980}} at={liftAt} until={liftEnd} grow={160}>
            {(p) => (
              <div style={{position: 'absolute', inset: 0, padding: '26px 30px', boxSizing: 'border-box'}}>
                <KpiBody k={KPI[1]} at={-100} />
                <div style={{position: 'absolute', left: 0, right: 0, top: 150, opacity: lerp(p, 0.5, 1)}}>
                  <ProfitChart w={448} h={120} y0={14} draw={lerp(f, drop - 8, drop + 22, 0, 1, easeIO)} red={lerp(f, drop + 14, drop + 24)} label={11} />
                </div>
              </div>
            )}
          </Lift>
          {/* две категории‑причины выходят вперёд */}
          {[1, 3].map((ci, k) => (
            <Lift key={ci} rect={R(58, CAT_Y(ci), 1264, 60)} to={{x: 240, y: 380 + k * 170, w: 1440}} at={rowsAt + k * 5} until={rowsEnd} grow={52} r={16}>
              {(p) => (
                <>
                  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 60}}>
                    <CatRow c={CATS[ci]} bold />
                  </div>
                  <div style={{position: 'absolute', left: 16, top: 62, display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, color: C.redText, opacity: lerp(p, 0.6, 1)}}>
                    <Ico n="up" size={20} color={C.redText} sw={2} /> выросли закупочные цены — основной вклад в снижение прибыли
                  </div>
                </>
              )}
            </Lift>
          ))}
          {/* вывод ИИ — крупно, рекомендация печатается */}
          <Lift rect={R(44, 500, 1292, 170)} to={{x: SAFE, y: 340, w: 1624}} at={rec} out="fade" r={20} bg={C.mist}>
            {() => (
              <AiNote style={{minHeight: 170, background: 'transparent'}} size={24}>
                {INSIGHT}
                <b style={{fontWeight: 700}}>
                  <Typewriter at={rec + 8} cps={60} segs={[{t: 'Проверьте '}, {t: 'цены и закупочные условия', mark: {at: cue('цены') + 6}}, {t: ' у поставщиков.'}]} />
                </b>
              </AiNote>
            )}
          </Lift>
        </>
      }
    >
      <MarketWindow active="ai">
        <div style={{position: 'absolute', inset: 0, opacity: 1 - p2}}>
          <AuditDash t0={enter + 6} why={why} hideKpi={!clean && f >= liftAt && f < page2 + 4 ? 1 : undefined} />
        </div>
        {f >= page2 && (
          <div style={{position: 'absolute', inset: 0, background: C.page, opacity: p2}}>
            <ProfitPage t0={page2} hideRows={!clean && f >= rowsAt && f < rowsEnd + 14} hideInsight={!clean && f >= rec} />
          </div>
        )}
      </MarketWindow>
      <Spot
        w={W}
        h={H}
        phases={[
          {from: changed, rects: [R(888, 150, 448, 694, 22)]},
          {from: why, rects: [R(44, 150, 820, 330, 22)]},
          {from: eg, to: liftAt, rects: [R(888, KY(1), 448, 160, 22)]},
        ]}
      />
      <Cursor path={[{x: PX + 700, y: 900, at: eg - 4}, {x: PX + 1180, y: KY(1) + 80, at: click, click: true}]} hideAt={click + 8} />
      <Sfx at={changed} name="tick" />
      <Sfx at={why} name="tick" />
      <Sfx at={click} name="click" />
      <Sfx at={liftAt} name="swipe" vol={0.6} />
      <Sfx at={drop + 14} name="pop" vol={0.6} />
      <Sfx at={rowsAt} name="swipe" vol={0.5} />
      <Sfx at={rec} name="swipe" vol={0.5} />
      <Sfx at={rec + 8} name="type" />
    </Screen>
  );
};

/* ============================ Дубли товарных карточек ============================ */

const DUPES = [
  {n: 'Молоко «Домик в деревне» 950 мл', g: 'Молочная продукция', d: 4, a: 3},
  {n: 'Печенье «Юбилейное» 190 г', g: 'Кондитерские изделия', d: 3, a: 2},
  {n: 'Вода газированная «Бонаква» 0,5 л', g: 'Напитки', d: 2, a: 2},
  {n: 'Пиво светлое «Жигулёвское» 0,5 л', g: 'Пиво', d: 3, a: 1},
];
const DY = (i: number) => 594 + i * 88;
const CARDS = [
  ['Карточка 1', '10234', '89,90 ₽', '4607012345671'],
  ['Карточка 2', '10877', '91,50 ₽', '4607012345671'],
  ['Карточка 3', '11002', '89,90 ₽', '4607012345671'],
  ['Карточка 4', '11420', '92,00 ₽', '4607012345671'],
];
const PAN_X = 1380 - 640; // левый край панели в координатах страницы
const BTN_Y = 700;
const DupeRow: React.FC<{r: (typeof DUPES)[number]}> = ({r}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 88, display: 'flex', alignItems: 'center', fontSize: 24, padding: '0 16px'}}>
    <div style={{width: 884}}>
      <div style={{fontWeight: 500}}>{r.n}</div>
      <div style={{fontSize: 20, color: C.gray, marginTop: 2}}>{r.g}</div>
    </div>
    <span style={{width: 160}}>{r.d}</span>
    <span>{r.a}</span>
  </div>
);
export const Dupes: React.FC<SceneProps> = ({cue, dur}) => {
  const f = useCurrentFrame();
  const tabClick = 30;
  const d = cue('дубли');
  const user = cue('Пользователь');
  const ok = cue('подтверждает');
  const no = cue('отклон');
  const manual = cue('Ручной');
  const liftEnd = user - 6;
  const click = user;
  const open = click + 4;
  const merge = manual + 34;
  const m = lerp(f, merge + 4, merge + 22, 0, 1, ease);
  return (
    <Screen
      focus={liftFocus(f, [[d, liftEnd]]) * 0.8}
      cam={[home(0), home(open - 2), {at: open + 16, s: 1.2, x: PX + 1060, y: 470}, {at: dur, s: 1.22, x: PX + 1060, y: 470}]}
      overlay={
        <Caption
          items={[
            {at: 8, text: 'Аудит находит', light: 'вероятные дубли карточек'},
            {at: user, text: 'Решение — за вами:', light: 'объединить или отклонить'},
          ]}
        />
      }
      lifts={
        <Lift rect={R(58, DY(0), 1264, 88)} to={{x: 230, y: 300, w: 1460}} at={d} until={liftEnd} grow={300} r={18}>
          {(p) => (
            <>
              <DupeRow r={DUPES[0]} />
              <div style={{position: 'absolute', left: 16, right: 16, top: 98, display: 'flex', gap: 16}}>
                {CARDS.map(([a, art, pr, bar], i) => {
                  const q = lerp(f, d + 10 + i * 4, d + 22 + i * 4);
                  return (
                    <div key={a} style={{flex: 1, height: 260, borderRadius: 16, border: `2px solid ${C.line}`, padding: '18px 20px', boxSizing: 'border-box', opacity: q * lerp(p, 0.4, 1), transform: `translateY(${(1 - q) * 30}px)`, fontSize: 20, lineHeight: 1.5}}>
                      <div style={{fontSize: 19, color: C.gray}}>{a}</div>
                      <div style={{fontSize: 22, fontWeight: 700, lineHeight: 1.25, marginTop: 4}}>Молоко «Домик в деревне» 950 мл</div>
                      <div style={{marginTop: 10}}>
                        Арт.{' '}
                        <Mark at={d + 34 + i * 3} color="#FFE27A">
                          {art}
                        </Mark>
                      </div>
                      <div style={{color: C.gray}}>ШК {bar}</div>
                      <div style={{fontWeight: 500}}>{pr}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Lift>
      }
    >
      <MarketWindow active="ai">
        <PageHead title="Качество ведения учёта" back="Аудит торговой точки" meta="Данные за 29 июня — 5 июля" />
        <Card x={44} y={130} w={1292} h={200}>
          <svg width={140} height={140} style={{position: 'absolute', left: 30, top: 30}}>
            <circle cx={70} cy={70} r={58} fill="none" stroke={C.line} strokeWidth={11} />
            <circle cx={70} cy={70} r={58} fill="none" stroke={C.blue} strokeWidth={11} strokeDasharray={`${0.85 * 364} 364`} strokeLinecap="round" transform="rotate(-90 70 70)" />
            <text x={70} y={81} textAnchor="middle" fontSize={32} fontWeight={700} fill={C.ink} fontFamily={font}>
              85
            </text>
          </svg>
          <div style={{position: 'absolute', left: 200, top: 52, fontSize: 38, fontWeight: 700}}>85 из 100</div>
          <div style={{position: 'absolute', left: 200, top: 106, fontSize: 21, color: C.gray}}>82 из 100 на прошлой неделе</div>
          <div style={{position: 'absolute', left: 560, top: 24, width: 700}}>
            <AiNote size={21} footer={false} style={{padding: '18px 24px 18px 70px'}}>
              Оценку снижают отрицательные остатки, товары без закупочных цен и дубли карточек.
            </AiNote>
          </div>
        </Card>
        <Tabs
          x={44}
          y={362}
          at={tabClick}
          from={0}
          to={2}
          items={[
            {t: 'Отрицательные остатки', n: '112', w: 300},
            {t: 'Без закупочных цен', n: '34', w: 250},
            {t: 'Дубли', n: '43', w: 104},
          ]}
        />
        <Appear at={tabClick + 4}>
          <div style={{position: 'absolute', left: 44, top: 436, width: 1292, background: '#E9EBEE', borderRadius: 16, padding: '16px 22px', boxSizing: 'border-box', fontSize: 21, lineHeight: 1.4}}>
            Дубли приводят к неверным остаткам и ошибкам в учёте продаж. Лишние карточки можно объединить, разные товары — отметить «Это не дубли».
          </div>
        </Appear>
        <Card x={44} y={530} w={1292} h={560} style={{padding: 0}}>
          <div style={{display: 'flex', fontSize: 19, color: C.gray, padding: '20px 30px 0'}}>
            <span style={{width: 884}}>Позиция и группа</span>
            <span style={{width: 160}}>Дублей</span>
            <span>Активных</span>
          </div>
        </Card>
        {DUPES.map((r, i) => (
          <Appear key={r.n} at={tabClick + 8 + i * 3} dy={14}>
            <div style={{position: 'absolute', left: 58, width: 1264, top: DY(i), height: 88, borderBottom: `1px solid ${C.line}`}}>
              <DupeRow r={r} />
            </div>
          </Appear>
        ))}
        <SidePanel at={open} w={640}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div style={{fontSize: 32, fontWeight: 700, lineHeight: 1.2, width: 470}}>Молоко «Домик в деревне» 950 мл</div>
            <Ico n="close" size={30} color={C.gray} />
          </div>
          <div style={{fontSize: 21, color: C.gray, marginTop: 8}}>Молочная продукция</div>
          <div style={{marginTop: 22}}>
            <Tag tone="green" size={20}>
              <Ico n="check" size={18} color={C.greenText} sw={2.2} /> Совпадают название, штрихкод и объём
            </Tag>
          </div>
          <div style={{fontSize: 23, fontWeight: 700, marginTop: 30}}>Карточки в группе</div>
          <div style={{position: 'relative', height: 4 * 64, marginTop: 6}}>
            {CARDS.map(([a, art, pr], i) => {
              const y = i * 64 * (1 - m);
              return (
                <div key={a} style={{position: 'absolute', left: 0, right: 0, top: y, height: 64, display: 'flex', alignItems: 'center', fontSize: 22, borderBottom: `1px solid ${C.line}`, background: '#fff', opacity: i === 0 ? 1 : 1 - m}}>
                  <span style={{width: 170}}>{m > 0.9 && i === 0 ? 'Карточка' : a}</span>
                  <span style={{color: C.gray}}>Арт. {art}</span>
                  <span style={{marginLeft: 'auto'}}>{pr}</span>
                </div>
              );
            })}
            {m > 0.5 && (
              <div style={{position: 'absolute', left: 0, top: 80, opacity: lerp(f, merge + 14, merge + 24)}}>
                <Tag tone="green" size={21}>
                  <Ico n="check" size={20} color={C.greenText} sw={2.2} /> Объединено: остатки и продажи — на одной карточке
                </Tag>
              </div>
            )}
          </div>
          <div style={{position: 'absolute', left: 40, right: 40, top: BTN_Y}}>
            <Btn kind="primary" size={24} style={{width: '100%'}} hover={hoverP(f, ok - 2, no - 14) + hoverP(f, merge - 6)} press={pressP(f, merge)}>
              Объединить карточки
            </Btn>
            <div style={{fontSize: 19, color: C.gray, margin: '12px 0 20px', lineHeight: 1.35}}>Остатки и продажи перенесутся на одну карточку, остальные уйдут в архив</div>
            <Btn size={24} style={{width: '100%'}} hover={hoverP(f, no + 2, merge - 20)}>
              Это не дубли
            </Btn>
          </div>
          <div style={{position: 'absolute', left: 40, top: BTN_Y + 220, opacity: lerp(f, manual, manual + 10)}}>
            <Tag tone="blue" size={22}>
              <Ico n="people" size={22} color={C.blueDeep} /> Решение — за пользователем
            </Tag>
          </div>
        </SidePanel>
      </MarketWindow>
      <Cursor
        path={[
          {x: PX + 900, y: 300, at: 12},
          {x: PX + 44 + 300 + 34 + 250 + 34 + 40, y: 375, at: tabClick, click: true},
          {x: PX + 500, y: 1000, at: d - 2},
          {x: PX + 400, y: DY(0) + 44, at: click, click: true},
          {x: PX + PAN_X + 300, y: BTN_Y + 28, at: ok + 2},
          {x: PX + PAN_X + 320, y: BTN_Y + 172, at: no + 6},
          {x: PX + PAN_X + 300, y: BTN_Y + 28, at: merge, click: true},
        ]}
      />
      <Sfx at={tabClick} name="click" />
      <Sfx at={d} name="swipe" vol={0.6} />
      <Sfx at={click} name="click" />
      <Sfx at={open} name="swipe" vol={0.5} />
      <Sfx at={merge} name="click" />
      <Sfx at={merge + 14} name="chime" vol={0.8} />
    </Screen>
  );
};

/* ============================ Сверка с Честным знаком ============================ */

type CzTag = {t: string; tone: Tone; w: number; to?: {label: string; icon: string; at: 'codes' | 'exp' | 'old'; slot: number}};
type CzRow = {n: string; gtin: string; rest: string; viol: string; tags: CzTag[]};
const CZ: CzRow[] = [
  {n: 'Хиршбрауер 0,5 л', gtin: '04023159041355', rest: '22', viol: '22', tags: [{t: 'Срок истёк 19', tone: 'red', w: 168, to: {label: 'Срок годности истёк · 60 позиций', icon: 'hourglass', at: 'exp', slot: 1}}, {t: 'Не введён 3', tone: 'red', w: 150, to: {label: 'Коды не введены в оборот · 9', icon: 'code', at: 'codes', slot: 0}}]},
  {n: 'Корона Экстра 0,355 л', gtin: '04627126229199', rest: '12', viol: '6', tags: [{t: 'Не введён 6', tone: 'red', w: 150}]},
  {n: 'Сок «Добрый» яблочный 1 л', gtin: '04600682001123', rest: '36', viol: '—', tags: [{t: 'Истекает 36', tone: 'orange', w: 160, to: {label: 'Срок истекает · 98 позиций', icon: 'clock', at: 'exp', slot: 2}}]},
  {n: 'Сигареты, блок 10 пачек', gtin: '04600266013589', rest: '120', viol: '—', tags: [{t: '> 6 мес. 120', tone: 'orange', w: 160, to: {label: 'Залежались > 6 мес. · 3 030', icon: 'box', at: 'old', slot: 3}}]},
];
const czY = (i: number) => 400 + i * 100;
const TAG_X = 44 + 30 + 360 + 120 + 100;
const TODO = [
  {t: 'Истёк срок годности', s: '60 товаров — Пиво (51) и Вода (9)', c: C.red},
  {t: 'Не введено в оборот', s: '9 КМ в Пиве не оформлены в ЧЗ', c: C.red},
  {t: 'Залежавшиеся', s: '3 030 в Табаке на остатке > 6 мес.', c: C.orange},
  {t: 'Истекает срок', s: '98 в Напитках и Молочке — менее 30 дней', c: C.orange},
];
const TODO_Y = (i: number) => 196 + i * 160;
export const Marking: React.FC<SceneProps> = ({cue, enter, dur}) => {
  const f = useCurrentFrame();
  const codes = cue('коды');
  const exp = cue('истёкший');
  const old = cue('залежавшиеся');
  const check = cue('проверку');
  const chipsEnd = check - 26;
  const click = check - 4;
  const open = click + 6;
  const atOf = {codes, exp, old};
  const lifted = CZ.flatMap((r, i) => {
    let x = TAG_X;
    return r.tags.flatMap((t) => {
      const rect = R(x, czY(i) + 31, t.w, 38);
      x += t.w + 10;
      return t.to ? [{...t, to: t.to, rect}] : [];
    });
  });
  return (
    <Screen
      enter={enter}
      focus={liftFocus(f, [[codes, chipsEnd]]) * 0.82}
      cam={[home(0), home(click - 24), {at: click - 6, s: 1.2, x: PX + 1000, y: 470}, {at: dur, s: 1.22, x: PX + 1020, y: 460}]}
      overlay={
        <Caption
          items={[
            {at: enter + 14, text: 'Сверка с Честным знаком', light: 'подсвечивает проблемы'},
            {at: check, text: 'Проверить товар', light: 'до продажи'},
          ]}
        />
      }
      lifts={
        <>
          {lifted.map((t) => {
            const at = atOf[t.to.at] + (t.to.slot === 2 ? 8 : 0);
            return (
              <Lift key={t.t} rect={t.rect} to={{x: 1000, y: 300 + t.to.slot * 120, w: t.w * 1.85}} at={at} until={chipsEnd} out="fade" r={8} bg={TONE[t.tone].bg} growW={370 - t.w}>
                {(p) => (
                  <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 19, fontWeight: 500, color: TONE[t.tone].t, whiteSpace: 'nowrap'}}>
                    <span style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', opacity: 1 - lerp(p, 0.2, 0.5)}}>{t.t}</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: 8, opacity: lerp(p, 0.5, 0.9)}}>
                      <Ico n={t.to.icon} size={20} color={TONE[t.tone].t} sw={1.8} />
                      {t.to.label}
                    </span>
                  </div>
                )}
              </Lift>
            );
          })}
        </>
      }
    >
      <MarketWindow active="ai">
        <PageHead title="Сверка с Честным знаком" back="ИИ бизнес-сигналы" meta="Обновлено 11 июня, 12:30" />
        {[
          {x: 44, t: 'Нарушения', v: 69, s: 'Срок истёк 60 · Не введено 9', tone: 'red' as Tone, i: 'alert'},
          {x: 488, t: 'Предупреждения', v: 3128, s: 'Истекает 98 · Залежались 3 030', tone: 'orange' as Tone, i: 'clock'},
        ].map((k, i) => (
          <Appear key={k.t} at={enter + 8 + i * 4}>
            <Card x={k.x} y={130} w={424} h={200}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 23, color: TONE[k.tone].t, fontWeight: 500}}>
                <Ico n={k.i} size={24} color={TONE[k.tone].c} /> {k.t}
              </div>
              <div style={{fontSize: 58, fontWeight: 700, color: TONE[k.tone].t, marginTop: 6}}>
                <CountUp to={k.v} at={enter + 12 + i * 4} dur={26} />
              </div>
              <div style={{fontSize: 19, color: C.gray}}>{k.s}</div>
            </Card>
          </Appear>
        ))}
        <Appear at={enter + 14}>
          <Card x={44} y={350} w={912} h={760} style={{padding: 0}}>
            <div style={{display: 'flex', fontSize: 19, color: C.gray, padding: '0 30px', height: 42, alignItems: 'flex-end'}}>
              <span style={{width: 360}}>Товар</span>
              <span style={{width: 120}}>Остаток ЧЗ</span>
              <span style={{width: 100}}>Нарушения</span>
              <span>Причины / статус</span>
            </div>
          </Card>
        </Appear>
        {CZ.map((r, i) => (
          <Appear key={r.n} at={enter + 18 + i * 3} dy={12}>
            <div style={{position: 'absolute', left: 74, top: czY(i), width: 852, height: 100, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.line}`, fontSize: 23}}>
              <div style={{width: 360}}>
                <div style={{fontWeight: 500}}>{r.n}</div>
                <div style={{fontSize: 18, color: C.gray, marginTop: 3}}>GTIN {r.gtin}</div>
              </div>
              <span style={{width: 120}}>{r.rest}</span>
              <span style={{width: 100, color: r.viol === '—' ? C.gray : C.redText, fontWeight: 500}}>{r.viol}</span>
              <div style={{display: 'flex', gap: 10}}>
                {r.tags.map((t) => (
                  <Tag key={t.t} tone={t.tone} size={19} style={{width: t.w, height: 38, boxSizing: 'border-box', justifyContent: 'center'}}>
                    {t.t}
                  </Tag>
                ))}
              </div>
            </div>
          </Appear>
        ))}
        <Appear at={enter + 16}>
          <Card x={976} y={130} w={360} h={980} bg="#fff" style={{padding: '26px 26px'}}>
            <div style={{fontSize: 23, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10}}>
              <AiIcon size={24} /> Что делать
            </div>
          </Card>
        </Appear>
        {TODO.map((t, i) => (
          <Appear key={t.t} at={enter + 22 + i * 4} dy={12}>
            <div style={{position: 'absolute', left: 1002, top: TODO_Y(i), width: 308, fontSize: 21, lineHeight: 1.35}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700}}>
                <Dot color={t.c} size={11} /> {t.t}
              </div>
              <div style={{color: C.gray, marginTop: 4}}>{t.s}</div>
              <div style={{color: C.blue, marginTop: 6}}>→ Смотреть в таблице</div>
            </div>
          </Appear>
        ))}
        <SidePanel at={open} w={600}>
          <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <div style={{fontSize: 32, fontWeight: 700}}>Срок годности истекает</div>
            <Ico n="close" size={30} color={C.gray} />
          </div>
          <div style={{fontSize: 23, lineHeight: 1.45, marginTop: 22}}>98 товаров в категориях «Напитки» и «Молочка» истекут в течение 30 дней.</div>
          <div style={{fontSize: 23, fontWeight: 700, marginTop: 30}}>Что можно сделать</div>
          {['Уценить товар, пока срок не истёк', 'Переставить на более заметное место в зале', 'Проверить остатки до продажи — после истечения срока это нарушение'].map((t, i) => {
            const at = open + 18 + i * 10;
            return (
              <div key={t} style={{display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 23, lineHeight: 1.4, marginTop: 18, opacity: lerp(f, at, at + 8)}}>
                <div style={{width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: C.mist, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, at + 4, 12)})`}}>
                  <Ico n="check" size={20} color={C.blue} sw={2.4} />
                </div>
                {t}
              </div>
            );
          })}
          <div style={{fontSize: 21, color: C.blue, marginTop: 30, opacity: lerp(f, open + 50, open + 60)}}>Подробнее в справке Контур.Маркета →</div>
        </SidePanel>
      </MarketWindow>
      <Spot w={W} h={H} phases={[{from: click - 18, to: open, rects: [R(990, TODO_Y(3) - 12, 336, 128, 16)]}]} dim={0.42} />
      <Cursor path={[{x: PX + 700, y: 900, at: click - 30}, {x: PX + 1100, y: TODO_Y(3) + 90, at: click, click: true}]} hideAt={open + 8} />
      <Sfx at={codes} name="swipe" vol={0.55} />
      <Sfx at={exp} name="swipe" vol={0.55} />
      <Sfx at={exp + 8} name="pop" vol={0.5} />
      <Sfx at={old} name="swipe" vol={0.55} />
      <Sfx at={click} name="click" />
      <Sfx at={open} name="swipe" vol={0.5} />
    </Screen>
  );
};

/* ================================ Автоштрафы ================================ */
/* Процесс схемой (по гайду): продажа → запрет Честного знака → автоштраф; снизу — ветка сверки,
   которая ловит риск раньше, до продажи. */

const NODE_Y = 380;
const NODE_H = 320;
const NODES = [148, 735, 1322];
const NODE_W = 450;
const Node: React.FC<{x: number; at: number; icon: string; kicker: string; title: string; tone?: Tone; dim?: number; children?: React.ReactNode}> = ({x, at, icon, kicker, title, tone = 'blue', dim = 0, children}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, 15);
  return (
    <div style={{position: 'absolute', left: x, top: NODE_Y, width: NODE_W, height: NODE_H, background: '#fff', borderRadius: 32, padding: '28px 32px', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(20,40,80,0.10)', opacity: Math.min(1, p * 1.5) * (1 - dim * 0.55), transform: `translateY(${(1 - p) * 50}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{width: 56, height: 56, borderRadius: 18, background: TONE[tone].bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Ico n={icon} size={30} color={TONE[tone].c} sw={1.8} />
        </div>
        <div>
          <div style={{fontSize: 22, color: C.gray}}>{kicker}</div>
          <div style={{fontSize: 30, fontWeight: 500, lineHeight: 1.15}}>{title}</div>
        </div>
      </div>
      <div style={{marginTop: 24}}>{children}</div>
    </div>
  );
};
export const Fines: React.FC<SceneProps> = ({cue}) => {
  const f = useCurrentFrame();
  const sept = cue('сентября');
  const auto = cue('автоштрафов');
  const eg = cue('Например');
  const ten = cue('10');
  const twenty = cue('20');
  const sv = cue('Сверка');
  const scan = lerp(f, eg + 4, eg + 24);
  const stamp = spr(f, eg + 30, 10, 200);
  const red = lerp(f, eg + 44, eg + 64, 0, 1, ease);
  const prevent = lerp(f, sv, sv + 24, 0, 1, ease);
  const arrow = (x1: number, x2: number, p: number, color: string, dashed = false) => {
    const y = NODE_Y + NODE_H / 2;
    const xe = x1 + (x2 - x1) * p;
    return (
      <g>
        <path d={`M ${x1} ${y} H ${xe}`} stroke={color} strokeWidth={4} strokeDasharray={dashed ? '12 10' : undefined} strokeDashoffset={dashed ? -f * 1.2 : undefined} />
        {p > 0.95 && <path d={`M ${x2 - 14} ${y - 10} L ${x2} ${y} L ${x2 - 14} ${y + 10}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    );
  };
  return (
    <AbsoluteFill style={{background: useBg(C.bg), fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      <Head
        size={72}
        y={110}
        lines={[
          {t: 'С 1 сентября 2026 года —', at: sept - 10},
          {t: 'автоштрафы по данным Честного знака', at: auto - 6, color: C.blue},
        ]}
      />
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        {arrow(NODES[0] + NODE_W + 8, NODES[1] - 8, lerp(f, auto - 4, auto + 10, 0, 1, ease), C.gray2)}
        {arrow(NODES[1] + NODE_W + 8, NODES[2] - 8, red, C.red, true)}
        {/* ветка сверки: до продажи */}
        <path d={`M ${NODES[0] + 120} ${820} C ${NODES[0] + 120} ${760}, ${NODES[0] + 120} ${720}, ${NODES[0] + 120} ${NODE_Y + NODE_H + 10}`} fill="none" stroke={C.blue} strokeWidth={4} strokeDasharray="1000" strokeDashoffset={1000 * (1 - prevent)} />
        {prevent > 0.95 && <path d={`M ${NODES[0] + 108} ${NODE_Y + NODE_H + 26} L ${NODES[0] + 120} ${NODE_Y + NODE_H + 10} L ${NODES[0] + 132} ${NODE_Y + NODE_H + 26}`} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div style={{position: 'absolute', left: NODES[1] + NODE_W + 10, top: NODE_Y + NODE_H / 2 - 64, width: NODES[2] - NODES[1] - NODE_W - 20, textAlign: 'center', fontSize: 22, color: C.redText, opacity: red * (1 - prevent * 0.6), lineHeight: 1.25}}>
        продали
        <br />
        вопреки запрету
      </div>
      <Node x={NODES[0]} at={sept + 8} icon="register" kicker="Касса" title="Продажа товара">
        <div style={{position: 'relative', background: C.page, borderRadius: 16, padding: '16px 18px', fontSize: 23, overflow: 'hidden'}}>
          <div style={{fontWeight: 500}}>Сок «Добрый» 1 л</div>
          <div style={{marginTop: 8}}>
            <Tag tone="red" size={20}>
              срок годности истёк
            </Tag>
          </div>
          {scan > 0 && scan < 1 && <div style={{position: 'absolute', left: 0, right: 0, top: `${scan * 100}%`, height: 3, background: C.red, boxShadow: '0 0 12px rgba(235,77,61,0.8)'}} />}
        </div>
      </Node>
      <Node x={NODES[1]} at={auto} icon="code" kicker="Честный знак" title="Проверка кода" tone="red">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: 110, border: `4px solid ${C.red}`, borderRadius: 20, color: C.redText, fontSize: 34, fontWeight: 700, gap: 12, transform: `scale(${1.6 - 0.6 * stamp}) rotate(${-4 * stamp}deg)`, opacity: stamp}}>
          <Ico n="close" size={36} color={C.redText} sw={3} /> Продажа запрещена
        </div>
      </Node>
      <Node x={NODES[2]} at={auto + 12} icon="ruble" kicker="Автоштраф" title="За каждую единицу товара" tone="red" dim={prevent}>
        {[
          {who: 'ИП', v: 10000, at: ten},
          {who: 'Юрлицо', v: 20000, at: twenty},
        ].map((k) => (
          <div key={k.who} style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `1px solid ${C.line}`, padding: '8px 0'}}>
            <span style={{fontSize: 26, color: C.gray}}>{k.who}</span>
            <span style={{fontSize: 46, fontWeight: 700, color: C.redText, opacity: lerp(f, k.at - 8, k.at)}}>
              <CountUp to={k.v} at={k.at - 6} dur={16} suffix=" ₽" />
            </span>
          </div>
        ))}
      </Node>
      {/* сверка заранее */}
      <div style={{position: 'absolute', left: NODES[0], top: 820, display: 'flex', alignItems: 'center', gap: 36, opacity: lerp(f, sv - 4, sv + 10), transform: `translateY(${(1 - lerp(f, sv - 4, sv + 16)) * 30}px)`}}>
        <SignalCard tone="orange" title="У 98 товаров истекает срок годности" module="Сверка с Честным знаком — до продажи" w={820} pulse={sv + 10} />
        <div style={{fontSize: 34, fontWeight: 500, lineHeight: 1.25, width: 700}}>
          Сверка помогает заметить риск <Mark at={sv + 14}>заранее</Mark>
        </div>
      </div>
      <Sfx at={sept + 8} name="pop" vol={0.6} />
      <Sfx at={auto} name="pop" vol={0.6} />
      <Sfx at={auto + 12} name="pop" vol={0.6} />
      <Sfx at={eg + 4} name="tick" />
      <Sfx at={eg + 30} name="click" vol={1.2} />
      <Sfx at={ten - 6} name="tick" />
      <Sfx at={twenty - 6} name="tick" />
      <Sfx at={sv} name="chime" vol={0.8} />
      <Footnote at={cue('гарантирует') - 6} bottom={40}>Источник: Роспотребнадзор, разъяснение от 19.08.2026. Сверка помогает выявить риск, но не гарантирует отсутствие штрафов. Ответственность за соблюдение требований и решение о продаже остаются у продавца.</Footnote>
    </AbsoluteFill>
  );
};

/* ============================ Сравнение с конкурентами ============================ */
/* Карта рынка вокруг магазина → магазины «ложатся» на шкалу цен → видно, что вы дешевле медианы на 15 ₽.
   Потом экран сравнения с карточкой товара, и значения из неё перелетают в расчёт. */

const RIVALS = [
  {n: 'Магазин А', p: 100, a: -0.6, r: 250},
  {n: 'Магазин Б', p: 99, a: 0.5, r: 330},
  {n: 'Магазин В', p: 104, a: 2.3, r: 290},
  {n: 'Магазин Г', p: 101, a: 3.6, r: 380},
];
const AX = {x0: 300, x1: 1620, y: 640, p0: 80, p1: 110};
const ax = (p: number) => AX.x0 + ((p - AX.p0) / (AX.p1 - AX.p0)) * (AX.x1 - AX.x0);
const PriceMap: React.FC<{at: number; rivals: number; morph: number; gap: number; out: number}> = ({at, rivals, morph, gap, out: o}) => {
  const f = useCurrentFrame();
  const q = lerp(f, o, o + 16, 0, 1, ease);
  const m = lerp(f, morph, morph + 26, 0, 1, ease);
  const g = lerp(f, gap, gap + 18, 0, 1, ease);
  const CX = 960;
  const CY = 600;
  const you = {x: CX + (ax(85) - CX) * m, y: CY + (AX.y - 150 - CY) * m};
  return (
    <AbsoluteFill style={{opacity: 1 - q, fontFamily: font}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {[160, 290, 420].map((r, i) => {
          const p = lerp(f, at + i * 5, at + 26 + i * 5, 0, 1, ease);
          return <circle key={r} cx={CX} cy={CY} r={r * p} fill="none" stroke="#fff" strokeOpacity={(0.35 - i * 0.08) * (1 - m)} strokeWidth={3} />;
        })}
        {/* шкала цен */}
        <path d={`M ${AX.x0 - 40} ${AX.y} H ${AX.x1 + 40}`} stroke="#fff" strokeOpacity={0.5 * m} strokeWidth={3} />
        {[80, 85, 90, 95, 100, 105, 110].map((p) => (
          <g key={p} opacity={m}>
            <path d={`M ${ax(p)} ${AX.y - 8} V ${AX.y + 8}`} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
            <text x={ax(p)} y={AX.y + 44} textAnchor="middle" fontSize={24} fill={C.onBlue} fontFamily={font}>
              {p} ₽
            </text>
          </g>
        ))}
        <path d={`M ${ax(100)} ${AX.y - 230} V ${AX.y + 10}`} stroke="#fff" strokeWidth={3} strokeDasharray="10 8" opacity={lerp(f, morph + 20, morph + 34)} />
        {/* разрыв 15 ₽ */}
        <g opacity={g}>
          <path d={`M ${ax(85)} ${AX.y + 90} V ${AX.y + 74} H ${ax(85) + (ax(100) - ax(85)) * g} V ${AX.y + 90}`} fill="none" stroke="#fff" strokeWidth={4} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: ax(100) - 200, top: AX.y - 300, width: 400, textAlign: 'center', fontSize: 28, color: '#fff', opacity: lerp(f, morph + 24, morph + 36)}}>
        Медиана рынка — <b>100 ₽</b>
      </div>
      <div style={{position: 'absolute', left: (ax(85) + ax(100)) / 2 - 150, top: AX.y + 104, width: 300, textAlign: 'center', fontSize: 64, fontWeight: 700, color: '#fff', opacity: g, transform: `scale(${0.8 + 0.2 * g})`}}>
        −15 ₽
      </div>
      {/* ваш магазин: из центра карты — на шкалу, над своей ценой */}
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, opacity: m}}>
        <path d={`M ${ax(85)} ${you.y + 48} V ${AX.y}`} stroke="#fff" strokeWidth={3} />
        <circle cx={ax(85)} cy={AX.y} r={12} fill="#fff" />
      </svg>
      <div style={{position: 'absolute', left: you.x - 64, top: you.y - 64, width: 128, height: 128, borderRadius: 40, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, at, 13) * (1 - 0.25 * m)})`, boxShadow: '0 20px 50px rgba(6,50,110,0.3)'}}>
        <Ico n="store" size={70} color={C.blue} sw={1.7} />
      </div>
      <div style={{position: 'absolute', left: you.x - 220, top: you.y + 84, width: 440, textAlign: 'center', opacity: lerp(f, at + 8, at + 18) * (1 - lerp(m, 0, 0.4))}}>
        <div style={{fontSize: 30, color: '#fff', fontWeight: 700}}>Ваш магазин</div>
        <div style={{fontSize: 26, color: C.onBlue}}>Сок «Добрый» 1 л — 85 ₽</div>
      </div>
      <div style={{position: 'absolute', left: you.x - 220, top: you.y - 140, width: 440, textAlign: 'center', opacity: lerp(m, 0.6, 1)}}>
        <div style={{fontSize: 26, color: C.onBlue}}>Ваша цена</div>
        <div style={{fontSize: 44, color: '#fff', fontWeight: 700}}>85 ₽</div>
      </div>
      {RIVALS.map((r, i) => {
        const p = spr(f, rivals + i * 6, 13);
        const mx = CX + Math.cos(r.a) * r.r * 1.5;
        const my = CY + Math.sin(r.a) * r.r * 0.85;
        const x = mx + (ax(r.p) - mx) * m;
        const y = my + (AX.y - my) * m;
        return (
          <div key={r.n} style={{position: 'absolute', left: x - 36, top: y - 36, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${p * (1 - 0.6 * m)})`, transformOrigin: '36px 36px'}}>
            <div style={{width: 72, height: 72, borderRadius: 24 + 12 * m, background: m > 0.6 ? '#fff' : 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Ico n="store" size={38} color={m > 0.6 ? C.blue : '#fff'} />
            </div>
            <div style={{whiteSpace: 'nowrap', opacity: 1 - lerp(m, 0, 0.5)}}>
              <div style={{fontSize: 22, color: C.onBlue}}>{r.n}</div>
              <div style={{fontSize: 32, fontWeight: 700, color: '#fff'}}>{r.p} ₽</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const COMP_ROWS = [
  {n: 'Кофе Milk Submarine 200 г', c: 'Дороже рынка на 8%', dir: 'upRight', p: '1 024 ₽'},
  {n: 'Вода «Бонаква» 0,5 л', c: 'Дороже рынка на 13%', dir: 'upRight', p: '70 ₽'},
  {n: 'Сок «Добрый» яблочный 1 л', c: 'Дешевле рынка на 15 ₽', dir: 'downRight', p: '85 ₽', target: true},
  {n: 'Чай холодный «Lipton» 0,5 л', c: 'Дешевле рынка на 11%', dir: 'downRight', p: '59 ₽'},
];
const CR_Y = (i: number) => 470 + i * 88;
const FIELD_Y = (i: number) => 140 + i * 60; // поля карточки товара (координаты окна)
const VAL_X = PX + 740 + 40 + 300;
export const Market: React.FC<SceneProps> = ({cue, enter, dur}) => {
  const f = useCurrentFrame();
  const rynok = cue('рынок');
  const esli = cue('Если');
  const d15 = cue('15');
  const sells = cue('продаётся');
  const n20 = cue('20');
  const pot = cue('потенциальная');
  const n9 = cue('9');
  const cond = cue('cond');
  const winIn = sells - 16;
  const click = winIn + 10;
  const open = click + 4;
  const calc = pot - 6;
  const calcP = lerp(f, calc, calc + 20, 0, 1, ease);
  const slotsIn = lerp(f, calc + 22, calc + 32);
  const mode = useAsset();
  return (
    <AbsoluteFill style={{background: useBg(C.blue), fontFamily: font, overflow: 'hidden'}}>
      {f < winIn + 30 && mode !== 'window' && <PriceMap at={enter + 2} rivals={rynok} morph={esli} gap={d15} out={winIn} />}
      {f >= winIn && (
        <Screen
          bg="transparent"
          enter={winIn}
          exit={calc + 6}
          cam={[home(0), home(open - 2), {at: open + 14, s: 1.26, x: PX + 1060, y: 440}, {at: dur, s: 1.27, x: PX + 1060, y: 440}]}
          mid={
            <>
      {/* расчёт потенциала */}
          {f >= calc && (
        <div style={{position: 'absolute', left: SAFE, top: 190, width: 1624, height: 720, background: '#fff', borderRadius: 40, opacity: calcP, transform: `translateY(${(1 - calcP) * 40}px)`, boxShadow: '0 30px 80px rgba(6,50,110,0.28)', color: C.ink}}>
          <div style={{position: 'absolute', left: 80, top: 56, fontSize: 30, color: C.gray, display: 'flex', alignItems: 'center', gap: 12}}>
            <Ico n="tag" size={30} color={C.gray} /> Сок «Добрый» яблочный 1 л · потенциал одной позиции
          </div>
          {[
            {v: '15 ₽', s: 'разница с рынком', x: 80, w: 360, at: calc + 22},
            {v: '20–50 шт.', s: 'продаж в день', x: 564, w: 420, at: calc + 26},
            {v: '30 дней', s: 'в месяце', x: 1108, w: 360, at: calc + 34},
          ].map((k, i) => (
            <React.Fragment key={k.v}>
              {i > 0 && <div style={{position: 'absolute', left: k.x - 82, top: 210, width: 60, textAlign: 'center', fontSize: 70, color: C.gray2, opacity: lerp(f, k.at - 6, k.at)}}>×</div>}
              <div style={{position: 'absolute', left: k.x, top: 170, width: k.w, height: 170, background: C.page, borderRadius: 28, padding: '26px 36px', boxSizing: 'border-box', opacity: i < 2 ? slotsIn : lerp(f, k.at, k.at + 8), transform: `scale(${i < 2 ? 1 : spr(f, k.at, 13)})`}}>
                <div style={{fontSize: 72, fontWeight: 700, letterSpacing: -2, whiteSpace: 'nowrap', lineHeight: 1.05, opacity: i < 2 ? lerp(f, calc + 36, calc + 44) : 1}}>{k.v}</div>
                <div style={{fontSize: 27, color: C.gray}}>{k.s}</div>
              </div>
            </React.Fragment>
          ))}
          <div style={{position: 'absolute', left: 80, top: 400, display: 'flex', alignItems: 'baseline', gap: 30, opacity: lerp(f, n9 - 14, n9 - 4)}}>
            <div style={{fontSize: 70, color: C.gray2}}>=</div>
            <div style={{fontSize: 130, fontWeight: 700, letterSpacing: -4, color: C.blue, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
              <CountUp to={9000} at={n9 - 6} dur={20} />–<CountUp to={22500} at={n9 + 2} dur={24} suffix=" ₽" />
            </div>
            <div style={{fontSize: 30, color: C.gray, lineHeight: 1.25}}>
              в месяц
              <br />
              потенциально*
            </div>
          </div>
          <div style={{position: 'absolute', left: 80, bottom: 56, transform: `scale(${spr(f, cond, 13)})`, transformOrigin: 'left center'}}>
            <span style={{display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 30, fontWeight: 500, color: C.orangeText, background: C.orangeBg, borderRadius: 999, padding: '14px 28px'}}>
              <Ico n="alert" size={30} color={C.orangeText} /> Если после изменения цены спрос сохранится
            </span>
          </div>
        </div>
      )}
            </>
          }
          lifts={
            <>
              {/* значения из карточки товара перелетают в расчёт */}
              <Lift rect={{x: VAL_X - 8, y: FIELD_Y(2) - 4, w: 250, h: 44}} to={{x: SAFE + 116, y: 392, w: 340}} at={calc} until={calc + 22} out="fade" r={10} bg={C.marker}>
                {() => <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 24, fontWeight: 500}}>↘ Дешевле на 15 ₽</div>}
              </Lift>
              <Lift rect={{x: VAL_X - 8, y: FIELD_Y(3) - 4, w: 140, h: 44}} to={{x: SAFE + 600, y: 392, w: 200}} at={calc + 4} until={calc + 24} out="fade" r={10} bg={C.marker}>
                {() => <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 24, fontWeight: 500}}>20–50 шт.</div>}
              </Lift>
            </>
          }
        >
          <MarketWindow active="ai">
            <PageHead title="Сравнение с конкурентами" back="ИИ бизнес-сигналы" meta="Данные за 29 июня — 5 июля" />
            {[
              {t: 'Дороже рынка', v: '12 позиций', i: 'upRight'},
              {t: 'Дешевле рынка', v: '27 позиций', i: 'downRight'},
              {t: 'На уровне рынка', v: '5 позиций', i: 'equal'},
            ].map((s, i) => (
              <Card key={s.t} x={44 + i * 302} y={130} w={286} h={150}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 21}}>
                  {s.t} <Ico n={s.i} size={20} color={C.blue} />
                </div>
                <div style={{fontSize: 34, fontWeight: 700, marginTop: 10}}>{s.v}</div>
              </Card>
            ))}
            <Card x={44} y={300} w={892} h={800} style={{padding: '24px 30px'}}>
              <div style={{fontSize: 21, color: C.gray}}>Сравнили с рынком 45 позиций из 1 034</div>
              <div style={{display: 'flex', fontSize: 19, color: C.gray, marginTop: 28}}>
                <span style={{width: 380}}>Позиция</span>
                <span style={{width: 320}}>Сравнение с рынком</span>
                <span>Цена</span>
              </div>
            </Card>
            {COMP_ROWS.map((r, i) => (
              <div key={r.n} style={{position: 'absolute', left: 74, top: CR_Y(i), width: 832, height: 88, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', fontSize: 23, background: r.target ? '#F2F8FF' : undefined}}>
                <span style={{width: 380, fontWeight: r.target ? 700 : 400}}>{r.n}</span>
                <span style={{width: 320, display: 'flex', alignItems: 'center', gap: 6}}>
                  <Ico n={r.dir} size={22} color={C.blue} />
                  {r.c}
                </span>
                <span>{r.p}</span>
              </div>
            ))}
            <Card x={956} y={130} w={380} h={970} bg={C.mist} style={{padding: '30px 28px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                <AiIcon size={40} />
                <div style={{fontSize: 25, fontWeight: 700}}>Сигналы</div>
                <div style={{fontSize: 19, color: C.gray}}>По данным отчёта</div>
              </div>
              {['13 товаров дороже рынка: риск потери покупателей', '27 товаров дешевле рынка: риск потери прибыли'].map((t) => (
                <div key={t} style={{background: '#fff', borderRadius: 16, padding: '18px 20px', fontSize: 21, fontWeight: 500, lineHeight: 1.35, marginTop: 22}}>
                  {t}
                </div>
              ))}
            </Card>
            <SidePanel at={open} w={640}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <div style={{fontSize: 32, fontWeight: 700}}>Сок «Добрый» яблочный 1 л</div>
                <Ico n="close" size={30} color={C.gray} />
              </div>
              {[
                ['Ваша цена', '85 ₽'],
                ['Медианная цена рынка', '100 ₽'],
                ['Сравнение с рынком', '↘ Дешевле на 15 ₽'],
                ['Продажи в день', '20–50 шт.'],
              ].map(([a, b], i) => (
                <div key={a} style={{position: 'absolute', left: 40, right: 40, top: FIELD_Y(i), display: 'flex', fontSize: 24}}>
                  <span style={{width: 300, color: C.gray}}>{a}</span>
                  <span style={{fontWeight: 500}}>{i === 3 ? <Mark at={n20 + 2}>{b}</Mark> : i === 2 ? <Mark at={open + 16}>{b}</Mark> : b}</span>
                </div>
              ))}
              <div style={{position: 'absolute', left: 40, right: 40, top: FIELD_Y(4) + 30}}>
                <div style={{fontSize: 27, fontWeight: 700}}>Сравнение с конкурентами</div>
                <div style={{fontSize: 19, color: C.gray, marginTop: 6, lineHeight: 1.4}}>Названия магазинов скрыты для сохранения конфиденциальности данных</div>
                {RIVALS.slice(0, 3).map((r) => (
                  <div key={r.n} style={{display: 'flex', justifyContent: 'space-between', fontSize: 23, padding: '16px 0', borderBottom: `1px solid ${C.line}`}}>
                    <span>{r.n}</span>
                    <span>{r.p} ₽</span>
                  </div>
                ))}
              </div>
            </SidePanel>
          </MarketWindow>
          <Cursor path={[{x: PX + 700, y: 950, at: winIn + 2}, {x: PX + 300, y: CR_Y(2) + 44, at: click, click: true}]} hideAt={open + 6} />
        </Screen>
      )}
      <Caption
        items={[
          {at: enter + 10, text: 'Рынок вокруг магазина', light: '— цены конкурентов рядом'},
          {at: esli, text: 'Конкуренты дороже', light: 'на 15 ₽'},
          {at: winIn + 6, text: 'Товар продаётся', light: 'по 20–50 шт. в день'},
          {at: calc + 10, text: 'Потенциальная выручка', light: 'по одной позиции'},
        ]}
      />
      <Footnote at={cue('спрос') - 10} color={C.onBlue} bottom={40}>
        * Расчётный сценарий: применим при подтверждённой разнице в цене, объёме продаж и сохранении спроса после корректировки; не является гарантией эффекта.
      </Footnote>
      <Sfx at={enter + 2} name="pop" />
      {RIVALS.map((r, i) => (
        <Sfx key={r.n} at={rynok + i * 6} name="tick" vol={0.8} />
      ))}
      <Sfx at={esli} name="whoosh" vol={0.5} />
      <Sfx at={d15} name="pop" />
      <Sfx at={winIn} name="whoosh" vol={0.6} />
      <Sfx at={click} name="click" />
      <Sfx at={open} name="swipe" vol={0.5} />
      <Sfx at={calc} name="swipe" vol={0.6} />
      <Sfx at={n9 - 6} name="chime" vol={0.8} />
      <Sfx at={cond} name="pop" />
    </AbsoluteFill>
  );
};

