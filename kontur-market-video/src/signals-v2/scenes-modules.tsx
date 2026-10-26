import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {AiIcon, C, Caption, CountUp, Cursor, Dot, Footnote, Ico, Mark, Marker, Reveal, Sfx, Spot, Tag, Tone, TONE, Typewriter, ease, font, hoverP, lerp, pressP, spr} from './kit';
import {AiNote, Appear, Btn, Card, Delta, MarketWindow, PX, PageHead, R, Screen, SidePanel, SignalCard, Tabs, WIN_H, WIN_W, home} from './market-ui';
import type {SceneProps} from './SignalsV2';

const W = WIN_W;
const H = WIN_H;

/* ============================ Аудит торговой точки ============================ */

const KPI: {t: string; i: string; v: number; suf: string; digits?: number; d: string; dir: 'up' | 'down'; tone: Tone; prev: string; badge: string}[] = [
  {t: 'Выручка', i: 'wallet', v: 151350, suf: ' ₽', d: '3%', dir: 'up', tone: 'green', prev: '146 940 ₽ на прошлой неделе', badge: 'повышение'},
  {t: 'Прибыль', i: 'ruble', v: 23080, suf: ' ₽', d: '12%', dir: 'down', tone: 'red', prev: '26 230 ₽ на прошлой неделе', badge: 'снижение'},
  {t: 'Средний чек', i: 'doc', v: 645, suf: ' ₽', d: '1%', dir: 'up', tone: 'green', prev: '639 ₽ на прошлой неделе', badge: 'повышение'},
  {t: 'Глубина чека', i: 'box', v: 3.7, suf: ' шт', digits: 1, d: '0,1 шт', dir: 'up', tone: 'green', prev: '3,6 шт на прошлой неделе', badge: 'повышение'},
];
const KY = (i: number) => 150 + i * 178;
const AuditDash: React.FC<{t0: number}> = ({t0}) => {
  const f = useCurrentFrame();
  const ring = lerp(f, t0 + 14, t0 + 44, 0, 1, ease);
  return (
    <>
      <PageHead title="Аудит торговой точки" back="ИИ бизнес-сигналы" meta="Данные за 29 июня — 5 июля" />
      <Appear at={t0 + 6}>
        <Card x={44} y={150} w={820} h={250} bg={C.orangeBg}>
          <div style={{fontSize: 26, fontWeight: 700}}>Есть повод обратить внимание</div>
          {[
            ['Валовая прибыль снизилась на 12%', C.orange],
            ['Списания выросли на 8%', C.orange],
            ['Выручка выросла на 3%', C.blue],
          ].map(([t, c]) => (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, marginTop: 12}}>
              <span style={{width: 10, height: 10, borderRadius: 5, background: c}} />
              {t}
            </div>
          ))}
          <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 19, color: C.gray, marginTop: 18}}>
            <AiIcon size={20} /> Обзор сделан с помощью ИИ Контура
          </div>
        </Card>
      </Appear>
      <Appear at={t0 + 12}>
        <Card x={44} y={420} w={820} h={250}>
          <div style={{fontSize: 24, fontWeight: 700}}>Качество ведения учёта</div>
          <svg width={150} height={150} style={{position: 'absolute', left: 30, top: 80}}>
            <circle cx={75} cy={75} r={62} fill="none" stroke={C.line} strokeWidth={12} />
            <circle cx={75} cy={75} r={62} fill="none" stroke={C.blue} strokeWidth={12} strokeDasharray={`${0.85 * ring * 389.6} 389.6`} strokeLinecap="round" transform="rotate(-90 75 75)" />
            <text x={75} y={86} textAnchor="middle" fontSize={34} fontWeight={700} fill={C.ink} fontFamily={font}>
              {Math.round(85 * ring)}
            </text>
          </svg>
          <div style={{position: 'absolute', left: 210, top: 120, fontSize: 40, fontWeight: 700}}>85 из 100</div>
          <div style={{position: 'absolute', left: 210, top: 172}}>
            <Delta dir="up" tone="green" size={21}>
              4 пункта
            </Delta>
          </div>
        </Card>
      </Appear>
      <Appear at={t0 + 16}>
        <Card x={44} y={690} w={820} h={260}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 700}}>
            Списания <span style={{fontSize: 19, fontWeight: 500, color: C.orangeText, background: C.orangeBg, padding: '4px 12px', borderRadius: 8}}>рост списаний</span>
          </div>
          {[
            ['Недостача', 52, '3 193 ₽'],
            ['Срок годности', 33, '2 026 ₽'],
            ['Иные цели', 15, '921 ₽'],
          ].map(([t, p, v], i) => (
            <div key={t as string} style={{display: 'flex', alignItems: 'center', fontSize: 21, marginTop: i ? 12 : 22}}>
              <span style={{width: 200}}>{t}</span>
              <div style={{flex: 1, height: 8, borderRadius: 4, background: C.page, marginRight: 24}}>
                <div style={{width: `${(p as number) * lerp(f, t0 + 20 + i * 4, t0 + 44 + i * 4)}%`, height: 8, borderRadius: 4, background: C.blue}} />
              </div>
              <span style={{width: 60, color: C.gray}}>{p}%</span>
              <span style={{width: 110, textAlign: 'right'}}>{v}</span>
            </div>
          ))}
        </Card>
      </Appear>
      {KPI.map((k, i) => (
        <Appear key={k.t} at={t0 + 8 + i * 4}>
          <Card x={888} y={KY(i)} w={448} h={160}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 21}}>
              <Ico n={k.i} size={22} />
              {k.t}
              <span style={{marginLeft: 'auto', fontSize: 17, color: TONE[k.tone === 'red' ? 'red' : 'blue'].t, background: TONE[k.tone === 'red' ? 'red' : 'blue'].bg, padding: '3px 10px', borderRadius: 7}}>{k.badge}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 14}}>
              <span style={{fontSize: 38, fontWeight: 700}}>
                <CountUp to={k.v} at={t0 + 12 + i * 4} dur={26} digits={k.digits ?? 0} suffix={k.suf} />
              </span>
              <Delta dir={k.dir} tone={k.tone}>
                {k.d}
              </Delta>
            </div>
            <div style={{fontSize: 18, color: C.gray, marginTop: 6}}>{k.prev}</div>
          </Card>
        </Appear>
      ))}
    </>
  );
};

const DAYS7 = ['29 июн', '30 июн', '1 июл', '2 июл', '3 июл', '4 июл', '5 июл'];
const VALS = [3620, 4010, 3790, 3550, 3060, 2690, 2360];
const CATS: {g: string; share: number; sum: string; d: string; dir: 'up' | 'down'; bad?: boolean}[] = [
  {g: 'Пиво', share: 45, sum: '10 386 ₽', d: '2%', dir: 'up'},
  {g: 'Хлеб и выпечка', share: 14, sum: '3 231 ₽', d: '18%', dir: 'down', bad: true},
  {g: 'Напитки', share: 11, sum: '2 539 ₽', d: '1%', dir: 'up'},
  {g: 'Снеки и закуски', share: 9, sum: '2 077 ₽', d: '9%', dir: 'down', bad: true},
  {g: 'Кондитерские изделия', share: 7, sum: '1 616 ₽', d: '3%', dir: 'up'},
  {g: 'Молочная продукция', share: 6, sum: '1 385 ₽', d: '2%', dir: 'up'},
];
const CAT_Y = (i: number) => 718 + i * 50;
const ProfitPage: React.FC<{t0: number; drawAt: number; recAt: number; marks: [number, number]}> = ({t0, drawAt, recAt, marks}) => {
  const f = useCurrentFrame();
  const cx = (i: number) => 110 + i * 190;
  const cy = (v: number) => 350 - ((v - 2000) / 2400) * 200;
  const pts = VALS.map((v, i) => [cx(i), cy(v)]);
  const path = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const draw = lerp(f, t0 + 6, drawAt + 16, 0, 1, Easing2);
  const e = evolvePath(draw, path);
  const area = `${path} L ${cx(6)} 360 L ${cx(0)} 360 Z`;
  return (
    <>
      <PageHead title="Прибыль" back="Аудит торговой точки" meta="Данные за 29 июня — 5 июля" />
      <Card x={44} y={120} w={1292} h={380}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
          <span style={{fontSize: 44, fontWeight: 700}}>23 080 ₽</span>
          <Delta dir="down" tone="red" size={28}>
            12%
          </Delta>
          <span style={{fontSize: 21, color: C.gray}}>26 230 ₽ на прошлой неделе</span>
          <span style={{marginLeft: 'auto', fontSize: 18, color: C.redText, background: C.redBg, padding: '4px 12px', borderRadius: 8}}>снижение</span>
        </div>
        <svg width={1292} height={400} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <linearGradient id="pf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.blue} stopOpacity={0.16} />
              <stop offset="1" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          {DAYS7.map((d, i) => (
            <g key={d}>
              <line x1={cx(i)} x2={cx(i)} y1={130} y2={360} stroke={C.line} strokeDasharray="4 6" />
              <text x={cx(i)} y={120} textAnchor="middle" fontSize={17} fill={C.gray} fontFamily={font}>
                {d}
              </text>
            </g>
          ))}
          <path d={area} fill="url(#pf)" opacity={draw} />
          <path d={path} fill="none" stroke={C.blue} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
          {/* участок снижения */}
          <path d={'M ' + pts.slice(3).map((p) => p.join(' ')).join(' L ')} fill="none" stroke={C.red} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" opacity={lerp(f, drawAt + 10, drawAt + 20)} />
          {pts.slice(3).map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={7} fill="#fff" stroke={C.red} strokeWidth={4} opacity={lerp(f, drawAt + 12 + i * 3, drawAt + 18 + i * 3)} />
          ))}
        </svg>
      </Card>
      <div style={{position: 'absolute', left: 44, top: 520, width: 1292}}>
        <AiNote style={{minHeight: 160}} size={22}>
          Валовая прибыль снизилась на 12% — до 23 080 ₽. Основной вклад — «Хлеб и выпечка» и «Снеки и закуски»: выросли закупочные цены.{' '}
          <b style={{fontWeight: 700}}>
            <Typewriter at={recAt} cps={70} segs={[{t: 'Проверьте '}, {t: 'цены и закупочные условия', mark: {at: marks[0]}}, {t: ' у поставщиков.'}]} />
          </b>
        </AiNote>
      </div>
      <Card x={44} y={700} w={1292} h={340} style={{padding: '0 30px'}}>
        <div style={{display: 'flex', fontSize: 18, color: C.gray, height: 18, marginTop: 0}} />
      </Card>
      {CATS.map((c, i) => (
        <div key={c.g} style={{position: 'absolute', left: 74, width: 1232, top: CAT_Y(i), height: 50, display: 'flex', alignItems: 'center', fontSize: 22, borderBottom: `1px solid ${C.line}`, fontWeight: c.bad && f > marks[1] ? 700 : 400}}>
          <span style={{width: 420}}>{c.g}</span>
          <div style={{width: 300, height: 8, borderRadius: 4, background: C.page}}>
            <div style={{width: `${c.share * 2}%`, height: 8, borderRadius: 4, background: C.blue}} />
          </div>
          <span style={{width: 120, paddingLeft: 30, color: C.gray}}>{c.share}%</span>
          <span style={{width: 200, textAlign: 'right'}}>{c.sum}</span>
          <span style={{marginLeft: 'auto'}}>
            <Delta dir={c.dir} tone={c.dir === 'down' ? 'red' : 'green'} size={22}>
              {c.d}
            </Delta>
          </span>
        </div>
      ))}
    </>
  );
};
const Easing2 = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const Audit: React.FC<SceneProps> = ({cue, enter, dur}) => {
  const f = useCurrentFrame();
  const changed = cue('изменилось');
  const why = cue('почему');
  const eg = cue('Например');
  const drop = cue('снижение');
  const goods = cue('товары');
  const rec = cue('предлагает');
  const click = eg + 22;
  const page2 = click + 6;
  const p2 = lerp(f, page2, page2 + 16, 0, 1, ease);
  return (
    <Screen
      enter={enter}
      cam={[home(0), home(changed - 10), {at: changed + 8, s: 1.04, x: 900, y: 450}, {at: eg, s: 1.04, x: 900, y: 450}, {at: page2, s: 1, x: 840, y: 400}, {at: drop - 4, s: 1.32, x: PX + 690, y: 330}, {at: goods - 8, s: 1.32, x: PX + 690, y: 330}, {at: goods + 10, s: 1.3, x: PX + 690, y: 790}, {at: rec - 10, s: 1.3, x: PX + 690, y: 790}, {at: rec + 8, s: 1.4, x: PX + 690, y: 600}, {at: dur, s: 1.44, x: PX + 690, y: 600}]}
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
    >
      <MarketWindow active="ai">
        <div style={{position: 'absolute', inset: 0, opacity: 1 - p2, transform: `translateX(${-p2 * 120}px)`}}>
          <AuditDash t0={enter + 6} />
        </div>
        {f >= page2 && (
          <div style={{position: 'absolute', inset: 0, background: C.page, opacity: p2, transform: `translateX(${(1 - p2) * 160}px)`}}>
            <ProfitPage t0={page2} drawAt={drop} recAt={rec + 2} marks={[cue('цены') + 4, goods]} />
          </div>
        )}
      </MarketWindow>
      <Spot
        w={W}
        h={H}
        phases={[
          {from: changed, rects: [R(888, 150, 448, 694, 22)]},
          {from: why, rects: [R(44, 150, 820, 250, 22)]},
          {from: eg, to: page2 - 2, rects: [R(888, KY(1), 448, 160, 22)]},
          {from: goods + 6, to: rec - 8, rects: [R(60, CAT_Y(1), 1260, 50, 10), R(60, CAT_Y(3), 1260, 50, 10)]},
        ]}
      />
      {f >= why && f < page2 && <Marker x={PX + 74} y={203} w={420} h={36} at={why + 8} color="#FFD7A8" />}
      <Cursor path={[{x: PX + 700, y: 900, at: eg - 4}, {x: PX + 1180, y: KY(1) + 80, at: click, click: true}]} hideAt={page2 + 10} />
      <Sfx at={changed} name="tick" />
      <Sfx at={why} name="tick" />
      <Sfx at={click} name="click" />
      <Sfx at={page2} name="swipe" vol={0.6} />
      <Sfx at={goods + 6} name="tick" />
      <Sfx at={rec + 2} name="type" />
    </Screen>
  );
};

/* ============================ Дубли товарных карточек ============================ */

const DUPES = [
  {n: 'Молоко «Домик в деревне» 950 мл', g: 'Молочная продукция', d: 4, a: 3},
  {n: 'Печенье «Юбилейное» 190 г', g: 'Кондитерские изделия', d: 3, a: 2},
  {n: 'Вода газированная «Бонаква» 0,5 л', g: 'Напитки', d: 2, a: 2},
  {n: 'Пиво светлое «Жигулёвское» 0,5 л', g: 'Пиво', d: 3, a: 1},
  {n: 'Форель слабосолёная 150 г', g: 'Рыба и морепродукты', d: 2, a: 0},
];
const DY = (i: number) => 590 + i * 78;
const CARDS = [
  ['Карточка 1', '10234', '89,90 ₽'],
  ['Карточка 2', '10877', '91,50 ₽'],
  ['Карточка 3', '11002', '89,90 ₽'],
  ['Карточка 4', '11420', '92,00 ₽'],
];
const PAN_X = 1380 - 640; // левый край панели в координатах страницы
const BTN_Y = 700;
export const Dupes: React.FC<SceneProps> = ({cue, dur}) => {
  const f = useCurrentFrame();
  const tabClick = 30;
  const d = cue('дубли');
  const open = d + 30;
  const user = cue('Пользователь');
  const ok = cue('подтверждает');
  const no = cue('отклон');
  const manual = cue('Ручной');
  const merge = manual + 34;
  const m = lerp(f, merge + 4, merge + 22, 0, 1, ease);
  return (
    <Screen
      cam={[home(0), home(open - 4), {at: open + 16, s: 1.2, x: PX + 1060, y: 470}, {at: dur, s: 1.22, x: PX + 1060, y: 470}]}
      overlay={
        <Caption
          items={[
            {at: 8, text: 'Аудит находит', light: 'вероятные дубли карточек'},
            {at: user, text: 'Решение — за вами:', light: 'объединить или отклонить'},
          ]}
        />
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
          <div style={{position: 'absolute', left: 200, top: 52, fontSize: 36, fontWeight: 700}}>85 из 100</div>
          <div style={{position: 'absolute', left: 200, top: 104, fontSize: 20, color: C.gray}}>82 из 100 на прошлой неделе</div>
          <div style={{position: 'absolute', left: 560, top: 24, width: 700}}>
            <AiNote size={20} footer={false} style={{padding: '18px 24px 18px 70px'}}>
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
          <div style={{position: 'absolute', left: 44, top: 436, width: 1292, background: '#E9EBEE', borderRadius: 16, padding: '16px 22px', boxSizing: 'border-box', fontSize: 20, lineHeight: 1.4}}>
            Дубли могут приводить к неверным остаткам и ошибкам в учёте продаж. Лишние карточки можно объединить, разные товары — отметить «Это не дубли».
          </div>
        </Appear>
        <Card x={44} y={530} w={1292} h={520} style={{padding: 0}}>
          <div style={{display: 'flex', fontSize: 18, color: C.gray, padding: '18px 30px 0'}}>
            <span style={{width: 900}}>Позиция и группа</span>
            <span style={{width: 160}}>Дублей</span>
            <span>Активных</span>
          </div>
        </Card>
        {DUPES.map((r, i) => (
          <Appear key={r.n} at={tabClick + 8 + i * 3} dy={14}>
            <div style={{position: 'absolute', left: 74, width: 1232, top: DY(i), height: 78, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', fontSize: 22}}>
              <div style={{width: 900}}>
                <div style={{fontWeight: 500}}>{r.n}</div>
                <div style={{fontSize: 18, color: C.gray, marginTop: 2}}>{r.g}</div>
              </div>
              <span style={{width: 160}}>{r.d}</span>
              <span>{r.a}</span>
            </div>
          </Appear>
        ))}
        <SidePanel at={open} w={640}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div style={{fontSize: 32, fontWeight: 700, lineHeight: 1.2, width: 470}}>Молоко «Домик в деревне» 950 мл</div>
            <Ico n="close" size={30} color={C.gray} />
          </div>
          <div style={{fontSize: 20, color: C.gray, marginTop: 8}}>Молочная продукция</div>
          <div style={{marginTop: 22}}>
            <Tag tone="green" size={19}>
              <Ico n="check" size={18} color={C.greenText} sw={2.2} /> Совпадают название, производитель и объём
            </Tag>
          </div>
          <div style={{fontSize: 22, fontWeight: 700, marginTop: 30}}>Карточки в группе</div>
          <div style={{position: 'relative', height: 4 * 64, marginTop: 6}}>
            {CARDS.map(([a, art, pr], i) => {
              const y = i * 64 * (1 - m);
              return (
                <div key={a} style={{position: 'absolute', left: 0, right: 0, top: y, height: 64, display: 'flex', alignItems: 'center', fontSize: 21, borderBottom: `1px solid ${C.line}`, background: '#fff', opacity: i === 0 ? 1 : 1 - m}}>
                  <span style={{width: 170}}>{m > 0.9 && i === 0 ? 'Карточка' : a}</span>
                  <span style={{color: C.gray}}>
                    Арт.{' '}
                    <Mark at={open + 26 + i * 4} color="#FFF1B8">
                      {art}
                    </Mark>
                  </span>
                  <span style={{marginLeft: 'auto'}}>{pr}</span>
                </div>
              );
            })}
            {m > 0.5 && (
              <div style={{position: 'absolute', left: 0, top: 80, opacity: lerp(f, merge + 14, merge + 24)}}>
                <Tag tone="green" size={21}>
                  <Ico n="check" size={20} color={C.greenText} sw={2.2} /> Карточки объединены: остатки и продажи — на одной
                </Tag>
              </div>
            )}
          </div>
          <div style={{position: 'absolute', left: 40, right: 40, top: BTN_Y}}>
            <Btn kind="primary" size={23} style={{width: '100%'}} hover={hoverP(f, user + 10, no - 14) + hoverP(f, merge - 6)} press={pressP(f, merge)}>
              Объединить карточки
            </Btn>
            <div style={{fontSize: 18, color: C.gray, margin: '12px 0 20px', lineHeight: 1.35}}>Остатки и продажи перенесутся на одну карточку, остальные уйдут в архив</div>
            <Btn size={23} style={{width: '100%'}} hover={hoverP(f, no + 2, merge - 20)}>
              Это не дубли
            </Btn>
          </div>
        </SidePanel>
      </MarketWindow>
      <Spot w={W} h={H} phases={[{from: d, to: open - 4, rects: [R(60, DY(0), 1260, 78, 12)]}]} />
      <Cursor
        path={[
          {x: PX + 900, y: 300, at: 12},
          {x: PX + 44 + 300 + 34 + 250 + 34 + 40, y: 375, at: tabClick, click: true},
          {x: PX + 400, y: DY(0) + 40, at: open - 6, click: true},
          {x: PX + PAN_X + 300, y: BTN_Y + 26, at: user + 14},
          {x: PX + PAN_X + 320, y: BTN_Y + 168, at: no + 6},
          {x: PX + PAN_X + 300, y: BTN_Y + 26, at: merge, click: true},
        ]}
      />
      <Sfx at={tabClick} name="click" />
      <Sfx at={d} name="tick" />
      <Sfx at={open - 6} name="click" />
      <Sfx at={open} name="swipe" vol={0.6} />
      <Sfx at={merge} name="click" />
      <Sfx at={merge + 14} name="chime" vol={0.8} />
    </Screen>
  );
};

/* ============================ Сверка с Честным знаком ============================ */

type CzRow = {g?: string; n?: string; gtin?: string; rest?: string; viol?: string; tags?: {t: string; tone: Tone; kind: 'code' | 'exp' | 'soon' | 'old'; w: number}[]};
const CZ: CzRow[] = [
  {g: 'Пиво · 44 позиции'},
  {n: 'Хиршбрауер 0,5 л', gtin: '04023159041355', rest: '22', viol: '22', tags: [{t: 'Срок истёк 19', tone: 'red', kind: 'exp', w: 150}, {t: 'Не введён 3', tone: 'red', kind: 'code', w: 136}]},
  {n: 'Сливовый портер 0,5 л', gtin: '00688444500654', rest: '10', viol: '9', tags: [{t: 'Срок истёк 9', tone: 'red', kind: 'exp', w: 150}, {t: '> 6 мес. 1', tone: 'orange', kind: 'old', w: 120}]},
  {n: 'Корона Экстра 0,355 л', gtin: '04627126229199', rest: '12', viol: '12', tags: [{t: 'Срок истёк 6', tone: 'red', kind: 'exp', w: 150}, {t: 'Не введён 6', tone: 'red', kind: 'code', w: 136}]},
  {g: 'Напитки · 21 позиция'},
  {n: 'Сок «Добрый» яблочный 1 л', gtin: '04600682001123', rest: '36', viol: '—', tags: [{t: 'Истекает 36', tone: 'orange', kind: 'soon', w: 150}]},
  {g: 'Табак · 6 позиций'},
  {n: 'Сигареты, блок 10 пачек', gtin: '04600266013589', rest: '120', viol: '—', tags: [{t: '> 6 мес. на балансе 120', tone: 'orange', kind: 'old', w: 262}]},
];
const CZ_Y0 = 380;
const czY = (i: number) => CZ_Y0 + CZ.slice(0, i).reduce((a, r) => a + (r.g ? 52 : 76), 0);
const TAG_X = 44 + 30 + 330 + 110 + 120;
const tagRects = (kinds: string[]) =>
  CZ.flatMap((r, i) => {
    let x = TAG_X;
    return (r.tags ?? []).flatMap((t) => {
      const rect = R(x - 2, czY(i) + 21, t.w + 4, 34, 10);
      x += t.w + 10;
      return kinds.includes(t.kind) ? [rect] : [];
    });
  });
const TODO = [
  {t: 'Истёк срок годности', s: '60 товаров — Пиво (51) и Вода (9)', c: C.red},
  {t: 'Не введено в оборот', s: '9 КМ в Пиве не оформлены в ЧЗ', c: C.red},
  {t: 'Залежавшиеся', s: '3 030 в Табаке на остатке > 6 мес.', c: C.orange},
  {t: 'Истекает срок', s: '98 в Напитках и Молочке — менее 30 дней', c: C.orange},
];
const TODO_Y = (i: number) => 196 + i * 150;
export const Marking: React.FC<SceneProps> = ({cue, enter, dur}) => {
  const f = useCurrentFrame();
  const codes = cue('коды');
  const exp = cue('истёкший');
  const old = cue('залежавшиеся');
  const check = cue('проверку');
  const click = check - 4;
  const open = click + 6;
  return (
    <Screen
      enter={enter}
      cam={[home(0), home(codes - 12), {at: codes + 6, s: 1.34, x: PX + 600, y: 560}, {at: old - 10, s: 1.34, x: PX + 600, y: 560}, {at: old + 8, s: 1.3, x: PX + 600, y: 680}, {at: click - 24, s: 1.3, x: PX + 600, y: 680}, {at: click - 6, s: 1.2, x: PX + 1000, y: 470}, {at: dur, s: 1.22, x: PX + 1020, y: 460}]}
      overlay={
        <Caption
          items={[
            {at: enter + 14, text: 'Сверка с Честным знаком', light: 'подсвечивает проблемы'},
            {at: codes, text: 'Коды', light: 'не введены в оборот'},
            {at: exp, text: 'Срок годности', light: 'истёк или скоро истечёт'},
            {at: old, text: 'Залежавшиеся', light: 'остатки'},
            {at: check, text: 'Проверить товар', light: 'до продажи'},
          ]}
        />
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
              <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, color: TONE[k.tone].t, fontWeight: 500}}>
                <Ico n={k.i} size={24} color={TONE[k.tone].c} /> {k.t}
              </div>
              <div style={{fontSize: 56, fontWeight: 700, color: TONE[k.tone].t, marginTop: 8}}>
                <CountUp to={k.v} at={enter + 12 + i * 4} dur={26} />
              </div>
              <div style={{fontSize: 18, color: C.gray}}>{k.s}</div>
            </Card>
          </Appear>
        ))}
        <Appear at={enter + 14}>
          <Card x={44} y={350} w={912} h={700} style={{padding: 0}}>
            <div style={{display: 'flex', fontSize: 17, color: C.gray, padding: '0 30px', height: 30, alignItems: 'flex-end'}}>
              <span style={{width: 330}}>Группа / товар</span>
              <span style={{width: 110}}>Остаток ЧЗ</span>
              <span style={{width: 120}}>Нарушения</span>
              <span>Причины / статус</span>
            </div>
          </Card>
        </Appear>
        {CZ.map((r, i) => (
          <Appear key={i} at={enter + 18 + i * 2} dy={12}>
            {r.g ? (
              <div style={{position: 'absolute', left: 74, top: czY(i), width: 852, height: 52, display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, fontWeight: 700, background: '#F7F8FA', borderRadius: 10, paddingLeft: 10, boxSizing: 'border-box'}}>
                <Ico n="down" size={18} /> {r.g}
              </div>
            ) : (
              <div style={{position: 'absolute', left: 74, top: czY(i), width: 852, height: 76, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.line}`, fontSize: 21}}>
                <div style={{width: 330}}>
                  <div style={{fontWeight: 500}}>{r.n}</div>
                  <div style={{fontSize: 16, color: C.gray, marginTop: 2}}>GTIN {r.gtin}</div>
                </div>
                <span style={{width: 110}}>{r.rest}</span>
                <span style={{width: 120, color: r.viol === '—' ? C.gray : C.redText, fontWeight: 500}}>{r.viol}</span>
                <div style={{display: 'flex', gap: 10}}>
                  {r.tags!.map((t) => (
                    <Tag key={t.t} tone={t.tone} size={18} style={{width: t.w, boxSizing: 'border-box', justifyContent: 'center'}}>
                      {t.t}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Appear>
        ))}
        <Appear at={enter + 16}>
          <Card x={976} y={130} w={360} h={920} bg="#fff" style={{padding: '26px 26px'}}>
            <div style={{fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10}}>
              <AiIcon size={24} /> Что делать
            </div>
          </Card>
        </Appear>
        {TODO.map((t, i) => (
          <Appear key={t.t} at={enter + 22 + i * 4} dy={12}>
            <div style={{position: 'absolute', left: 1002, top: TODO_Y(i), width: 308, fontSize: 20, lineHeight: 1.35}}>
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
          <div style={{fontSize: 22, lineHeight: 1.45, marginTop: 22}}>98 товаров в категориях «Напитки» и «Молочка» истекут в течение 30 дней.</div>
          <div style={{fontSize: 22, fontWeight: 700, marginTop: 30}}>Что можно сделать</div>
          {['Уценить товар, пока срок не истёк', 'Переставить на более заметное место в зале', 'Проверить остатки до продажи — после истечения срока это нарушение'].map((t, i) => {
            const at = open + 18 + i * 10;
            return (
              <div key={t} style={{display: 'flex', gap: 14, alignItems: 'flex-start', fontSize: 22, lineHeight: 1.4, marginTop: 18, opacity: lerp(f, at, at + 8)}}>
                <div style={{width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: C.mist, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, at + 4, 12)})`}}>
                  <Ico n="check" size={20} color={C.blue} sw={2.4} />
                </div>
                {t}
              </div>
            );
          })}
          <div style={{fontSize: 20, color: C.blue, marginTop: 30, opacity: lerp(f, open + 50, open + 60)}}>Подробнее в справке Контур.Маркета →</div>
        </SidePanel>
      </MarketWindow>
      <Spot
        w={W}
        h={H}
        phases={[
          {from: codes, rects: tagRects(['code'])},
          {from: exp, rects: tagRects(['exp', 'soon'])},
          {from: old, to: click - 20, rects: tagRects(['old'])},
          {from: click - 18, to: open, rects: [R(990, TODO_Y(3) - 12, 336, 120, 16)]},
        ]}
        dim={0.42}
      />
      <Cursor path={[{x: PX + 700, y: 900, at: click - 30}, {x: PX + 1100, y: TODO_Y(3) + 86, at: click, click: true}]} hideAt={open + 8} />
      <Sfx at={codes} name="tick" />
      <Sfx at={exp} name="tick" />
      <Sfx at={old} name="tick" />
      <Sfx at={click} name="click" />
      <Sfx at={open} name="swipe" vol={0.6} />
    </Screen>
  );
};

/* ================================ Автоштрафы ================================ */

export const Fines: React.FC<SceneProps> = ({cue}) => {
  const f = useCurrentFrame();
  const auto = cue('автоштрафов');
  const eg = cue('Например');
  const ten = cue('10');
  const twenty = cue('20');
  const sv = cue('Сверка');
  const shift = lerp(f, eg - 6, eg + 14, 0, 1, ease);
  const cal = spr(f, 4, 14);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      {/* календарь: 1 сентября 2026 */}
      <div style={{position: 'absolute', left: 120, top: interpolate(shift, [0, 1], [250, 110]), transform: `scale(${interpolate(shift, [0, 1], [1, 0.42]) * cal})`, transformOrigin: 'left top'}}>
        <div style={{width: 420, borderRadius: 36, background: '#fff', overflow: 'hidden', boxShadow: '0 24px 60px rgba(20,40,80,0.12)'}}>
          <div style={{background: C.blue, color: '#fff', fontSize: 40, fontWeight: 500, padding: '26px 36px'}}>Сентябрь 2026</div>
          <div style={{fontSize: 260, fontWeight: 700, lineHeight: 1, textAlign: 'center', padding: '30px 0 10px', letterSpacing: -8}}>1</div>
          <div style={{fontSize: 36, color: C.gray, textAlign: 'center', paddingBottom: 36}}>вторник</div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 640, top: 330, opacity: 1 - shift}}>
        <Reveal at={8} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2}}>
          С 1 сентября 2026 года
        </Reveal>
        <Reveal at={auto - 6} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2, color: C.blue}}>
          работают автоштрафы
        </Reveal>
        <Reveal at={auto + 4} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2}}>
          по данным Честного знака
        </Reveal>
      </div>
      {/* суммы штрафов */}
      <div style={{position: 'absolute', left: 340, top: 128, opacity: shift, fontSize: 44, fontWeight: 700, letterSpacing: -0.8, width: 1400, lineHeight: 1.2}}>
        Например, за продажу просроченного товара,
        <br />
        <span style={{color: C.gray}}>несмотря на запрет</span>
      </div>
      {[
        {v: 10000, who: 'ИП', at: ten, x: 120},
        {v: 20000, who: 'Юрлицо', at: twenty, x: 990},
      ].map((k) => {
        const p = spr(f, eg + 12 + (k.who === 'ИП' ? 0 : 8), 14);
        const num = lerp(f, k.at - 8, k.at);
        return (
          <div key={k.who} style={{position: 'absolute', left: k.x, top: 380, width: 810, height: 330, background: '#fff', borderRadius: 40, padding: '44px 56px', boxSizing: 'border-box', opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 80}px)`, boxShadow: '0 24px 60px rgba(20,40,80,0.08)'}}>
            <div style={{fontSize: 40, fontWeight: 500, color: C.blue}}>{k.who}</div>
            <div style={{fontSize: 150, fontWeight: 700, letterSpacing: -5, lineHeight: 1.05, color: C.redText, position: 'relative'}}>
              <span style={{opacity: num}}>
                <CountUp to={k.v} at={k.at - 6} dur={18} suffix=" ₽" />
              </span>
              <span style={{position: 'absolute', left: 0, top: 0, color: C.line, opacity: 1 - num}}>— ₽</span>
            </div>
            <div style={{fontSize: 30, color: C.gray, display: 'flex', alignItems: 'center', gap: 10}}>
              <Ico n="box" size={30} color={C.gray} /> за каждую единицу товара
            </div>
          </div>
        );
      })}
      {/* сверка заранее показывает риск */}
      <div style={{position: 'absolute', left: 120, top: 760, display: 'flex', alignItems: 'center', gap: 40, opacity: lerp(f, sv - 4, sv + 10), transform: `translateY(${(1 - lerp(f, sv - 4, sv + 14)) * 40}px)`}}>
        <SignalCard tone="orange" title="У 98 товаров истекает срок годности" module="Сверка с Честным знаком" w={860} pulse={sv + 10} />
        <div style={{fontSize: 34, fontWeight: 500, lineHeight: 1.25, width: 760}}>
          Сверка помогает заметить риск <Mark at={sv + 14}>заранее</Mark>
        </div>
      </div>
      <Sfx at={4} name="pop" />
      <Sfx at={eg} name="whoosh" vol={0.6} />
      <Sfx at={eg + 12} name="pop" vol={0.7} />
      <Sfx at={eg + 20} name="pop" vol={0.7} />
      <Sfx at={ten - 6} name="tick" />
      <Sfx at={twenty - 6} name="tick" />
      <Sfx at={sv} name="chime" vol={0.8} />
      <Footnote at={cue('гарантирует') - 6}>Источник: Роспотребнадзор, разъяснение от 19.08.2026. Сверка помогает выявить риск, но не гарантирует отсутствие штрафов. Ответственность за соблюдение требований и решение о продаже остаются у продавца.</Footnote>
    </AbsoluteFill>
  );
};

/* ============================ Сравнение с конкурентами ============================ */

const RIVALS = [
  {n: 'Магазин А', p: '100 ₽', a: -0.6, r: 250},
  {n: 'Магазин Б', p: '99 ₽', a: 0.5, r: 330},
  {n: 'Магазин В', p: '104 ₽', a: 2.3, r: 290},
  {n: 'Магазин Г', p: '101 ₽', a: 3.6, r: 380},
];
const MapScene: React.FC<{at: number; rivals: number; out: number}> = ({at, rivals, out: o}) => {
  const f = useCurrentFrame();
  const q = lerp(f, o, o + 16, 0, 1, ease);
  const CX = 960;
  const CY = 600;
  return (
    <AbsoluteFill style={{opacity: 1 - q, transform: `scale(${1 + q * 0.15})`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {[160, 290, 420].map((r, i) => {
          const p = lerp(f, at + i * 5, at + 26 + i * 5, 0, 1, ease);
          return <circle key={r} cx={CX} cy={CY} r={r * p} fill="none" stroke="#fff" strokeOpacity={0.35 - i * 0.08} strokeWidth={3} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: CX - 64, top: CY - 64, width: 128, height: 128, borderRadius: 40, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, at, 13)})`, boxShadow: '0 20px 50px rgba(6,50,110,0.3)'}}>
        <Ico n="store" size={70} color={C.blue} sw={1.7} />
      </div>
      <div style={{position: 'absolute', left: CX - 220, top: CY + 84, width: 440, textAlign: 'center', fontFamily: font, opacity: lerp(f, at + 8, at + 18)}}>
        <div style={{fontSize: 30, color: '#fff', fontWeight: 700}}>Ваш магазин</div>
        <div style={{fontSize: 26, color: C.onBlue}}>Сок «Добрый» 1 л — 85 ₽</div>
      </div>
      {RIVALS.map((r, i) => {
        const p = spr(f, rivals + i * 6, 13);
        const x = CX + Math.cos(r.a) * r.r * 1.5;
        const y = CY + Math.sin(r.a) * r.r * 0.85;
        return (
          <div key={r.n} style={{position: 'absolute', left: x - 140, top: y - 40, width: 280, display: 'flex', alignItems: 'center', gap: 14, transform: `scale(${p})`, fontFamily: font}}>
            <div style={{width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
              <Ico n="store" size={38} color="#fff" />
            </div>
            <div>
              <div style={{fontSize: 22, color: C.onBlue}}>{r.n}</div>
              <div style={{fontSize: 34, fontWeight: 700, color: '#fff'}}>{r.p}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
const COMP_ROWS = [
  {n: 'Кофе Milk Submarine 200 г', c: 'Дороже рынка на 8%', dir: 'upRight', p: '1 024 ₽', s: '15 350 ₽'},
  {n: 'Вода «Бонаква» 0,5 л', c: 'Дороже рынка на 13%', dir: 'upRight', p: '70 ₽', s: '4 060 ₽'},
  {n: 'Сок «Добрый» яблочный 1 л', c: 'Дешевле рынка на 15 ₽', dir: 'downRight', p: '85 ₽', s: '19 125 ₽', target: true},
  {n: 'Чай холодный «Lipton» 0,5 л', c: 'Дешевле рынка на 11%', dir: 'downRight', p: '59 ₽', s: '4 130 ₽'},
  {n: 'Напиток «Тархун» 0,5 л', c: 'На уровне рынка', dir: 'equal', p: '59 ₽', s: '1 770 ₽'},
];
const CR_Y = (i: number) => 470 + i * 80;
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
  const winIn = esli - 8;
  const click = sells - 6;
  const open = click + 6;
  const calc = pot - 6;
  const calcP = lerp(f, calc, calc + 20, 0, 1, ease);
  return (
    <AbsoluteFill style={{background: C.blue, fontFamily: font, overflow: 'hidden'}}>
      {f < winIn + 30 && <MapScene at={enter + 2} rivals={rynok} out={winIn} />}
      {f >= winIn && f < calc + 30 && (
        <Screen
          bg="transparent"
          enter={winIn}
          exit={calc}
          cam={[home(0), home(d15 - 12), {at: d15 + 4, s: 1.22, x: PX + 600, y: 620}, {at: click - 6, s: 1.22, x: PX + 600, y: 620}, {at: open + 12, s: 1.26, x: PX + 1060, y: 440}, {at: dur, s: 1.27, x: PX + 1060, y: 440}]}
        >
          <MarketWindow active="ai">
            <PageHead title="Сравнение с конкурентами" back="ИИ бизнес-сигналы" meta="Данные за 29 июня — 5 июля" />
            {[
              {t: 'Дороже рынка', v: '12 позиций', i: 'upRight'},
              {t: 'Дешевле рынка', v: '27 позиций', i: 'downRight'},
              {t: 'На уровне рынка', v: '5 позиций', i: 'equal'},
            ].map((s, i) => (
              <Card key={s.t} x={44 + i * 302} y={130} w={286} h={150}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 20}}>
                  {s.t} <Ico n={s.i} size={20} color={C.blue} />
                </div>
                <div style={{fontSize: 34, fontWeight: 700, marginTop: 10}}>{s.v}</div>
              </Card>
            ))}
            <Card x={44} y={300} w={892} h={760} style={{padding: '24px 30px'}}>
              <div style={{fontSize: 20, color: C.gray}}>Сравнили с рынком 45 позиций из 1 034</div>
              <div style={{display: 'flex', fontSize: 17, color: C.gray, marginTop: 28}}>
                <span style={{width: 360}}>Группа / позиция</span>
                <span style={{width: 290}}>Сравнение с рынком</span>
                <span style={{width: 90}}>Цена</span>
                <span>Выручка</span>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 21, fontWeight: 700, marginTop: 18}}>
                <Ico n="down" size={18} /> Напитки · 8 позиций
              </div>
            </Card>
            {COMP_ROWS.map((r, i) => (
              <div key={r.n} style={{position: 'absolute', left: 74, top: CR_Y(i), width: 832, height: 80, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', fontSize: 21}}>
                <span style={{width: 360, fontWeight: r.target ? 500 : 400}}>{r.n}</span>
                <span style={{width: 290, display: 'flex', alignItems: 'center', gap: 6}}>
                  <Ico n={r.dir} size={20} color={C.blue} />
                  {r.target ? <Mark at={d15 + 6}>{r.c}</Mark> : r.c}
                </span>
                <span style={{width: 90}}>{r.p}</span>
                <span>{r.s}</span>
              </div>
            ))}
            <Card x={956} y={130} w={380} h={930} bg={C.mist} style={{padding: '30px 28px'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
                <AiIcon size={40} />
                <div style={{fontSize: 24, fontWeight: 700}}>Сигналы</div>
                <div style={{fontSize: 18, color: C.gray}}>По данным отчёта</div>
              </div>
              {['13 товаров дороже рынка: риск потери покупателей', '27 товаров дешевле рынка: риск потери прибыли'].map((t) => (
                <div key={t} style={{background: '#fff', borderRadius: 16, padding: '18px 20px', fontSize: 20, fontWeight: 500, lineHeight: 1.35, marginTop: 22}}>
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
                <div key={a} style={{display: 'flex', fontSize: 23, marginTop: i ? 16 : 30}}>
                  <span style={{width: 300, color: C.gray}}>{a}</span>
                  <span style={{fontWeight: 500}}>{i === 3 ? <Mark at={n20 + 2}>{b}</Mark> : i === 2 ? <Mark at={open + 18}>{b}</Mark> : b}</span>
                </div>
              ))}
              <div style={{fontSize: 26, fontWeight: 700, marginTop: 40}}>Сравнение с конкурентами</div>
              <div style={{fontSize: 18, color: C.gray, marginTop: 6, lineHeight: 1.4}}>Названия магазинов скрыты для сохранения конфиденциальности данных</div>
              {RIVALS.slice(0, 3).map((r) => (
                <div key={r.n} style={{display: 'flex', justifyContent: 'space-between', fontSize: 22, padding: '18px 0', borderBottom: `1px solid ${C.line}`}}>
                  <span>{r.n}</span>
                  <span>{r.p}</span>
                </div>
              ))}
            </SidePanel>
          </MarketWindow>
          <Spot w={W} h={H} phases={[{from: d15, to: click - 2, rects: [R(60, CR_Y(2), 860, 80, 12)]}]} />
          <Cursor path={[{x: PX + 700, y: 950, at: click - 26}, {x: PX + 300, y: CR_Y(2) + 40, at: click, click: true}]} hideAt={open + 6} />
        </Screen>
      )}
      {/* расчёт потенциала */}
      {f >= calc && (
        <div style={{position: 'absolute', left: 120, top: 190, width: 1680, height: 700, background: '#fff', borderRadius: 40, opacity: calcP, transform: `translateY(${(1 - calcP) * 80}px)`, boxShadow: '0 30px 80px rgba(6,50,110,0.28)', padding: '60px 80px', boxSizing: 'border-box', color: C.ink}}>
          <div style={{fontSize: 30, color: C.gray, display: 'flex', alignItems: 'center', gap: 12}}>
            <Ico n="tag" size={30} color={C.gray} /> Сок «Добрый» яблочный 1 л · потенциал одной позиции
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 30, marginTop: 70}}>
            {[
              {v: '15 ₽', s: 'разница с рынком'},
              {v: '20–50 шт.', s: 'продаж в день'},
              {v: '30 дней', s: 'в месяце'},
            ].map((k, i) => {
              const p = spr(f, calc + 10 + i * 10, 13);
              return (
                <React.Fragment key={k.v}>
                  {i > 0 && <div style={{fontSize: 70, color: C.gray2, opacity: p}}>×</div>}
                  <div style={{background: C.page, borderRadius: 28, padding: '26px 36px', transform: `scale(${p})`}}>
                    <div style={{fontSize: 70, fontWeight: 700, letterSpacing: -2, whiteSpace: 'nowrap'}}>{k.v}</div>
                    <div style={{fontSize: 26, color: C.gray}}>{k.s}</div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 30, marginTop: 70, opacity: lerp(f, n9 - 14, n9 - 4)}}>
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
      <Caption
        items={[
          {at: enter + 10, text: 'Рынок вокруг магазина', light: '— цены конкурентов рядом'},
          {at: esli, text: 'Ваша цена ниже рынка', light: 'на 15 ₽'},
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
      <Sfx at={winIn} name="whoosh" vol={0.6} />
      <Sfx at={d15} name="tick" />
      <Sfx at={click} name="click" />
      <Sfx at={open} name="swipe" vol={0.6} />
      <Sfx at={calc} name="whoosh" vol={0.6} />
      <Sfx at={n9 - 6} name="chime" vol={0.8} />
      <Sfx at={cond} name="pop" />
    </AbsoluteFill>
  );
};

