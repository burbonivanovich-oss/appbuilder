import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {AiIcon, C, Cursor, Dot, Flow, Ico, Reveal, Sfx, Spot, TONE, Tone, Typewriter, clamp, ease, font, hoverP, lerp, pressP, spr} from './kit';
import {AiNote, Btn, Card, MarketWindow, NAV_Y, PageHead, PX, R, Screen, SignalCard, home} from './market-ui';
import type {SceneProps} from './SignalsV2';

/* =============================== 0:00 Заставка =============================== */

const INTRO_CARDS: {tone: Tone; title: string; module: string}[] = [
  {tone: 'red', title: 'Валовая прибыль снизилась на 12%', module: 'Аудит торговой точки'},
  {tone: 'orange', title: 'У 98 товаров истекает срок годности', module: 'Сверка с Честным знаком'},
  {tone: 'blue', title: '13 товаров дороже рынка', module: 'Сравнение с конкурентами'},
];
export const Intro: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 120, top: 96, height: 44, opacity: lerp(f, 2, 14)}} />
      <div style={{position: 'absolute', left: 120, top: 300}}>
        <Reveal at={6} style={{fontSize: 30, color: C.gray, display: 'flex'}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 12}}>
            <AiIcon size={30} /> Модификатор Контур.Маркета
          </span>
        </Reveal>
        <Reveal at={10} style={{fontSize: 150, fontWeight: 700, letterSpacing: -5, lineHeight: 1, marginTop: 26}}>
          ИИ Бизнес
        </Reveal>
        <Reveal at={15} style={{fontSize: 150, fontWeight: 700, letterSpacing: -5, lineHeight: 1}}>
          сигналы
        </Reveal>
        <Reveal at={24} style={{fontSize: 38, color: C.gray, marginTop: 36, lineHeight: 1.3, width: 760}}>
          Находят в данных магазина потери, риски и точки роста
        </Reveal>
      </div>
      {INTRO_CARDS.map((c, i) => {
        const p = spr(f, 18 + i * 9, 15);
        return (
          <div key={c.title} style={{position: 'absolute', left: 1050 + (i % 2) * 40, top: 300 + i * 170 - f * 0.25, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * 120}px)`}}>
            <SignalCard tone={c.tone} title={c.title} module={c.module} w={760} pulse={30 + i * 9} />
          </div>
        );
      })}
      {INTRO_CARDS.map((_, i) => (
        <Sfx key={i} at={20 + i * 9} name="pop" vol={0.7} />
      ))}
    </AbsoluteFill>
  );
};

/* ============================ 0:03 Данных достаточно ============================ */

const GOODS = ['Молоко «Простоквашино» 2,5%', 'Хлеб «Бородинский» 400 г', 'Вода «Бонаква» 0,5 л', 'Сыр «Российский» 200 г', 'Кефир «Домик в деревне» 1%', 'Яйцо С1 10 шт', 'Печенье «Юбилейное» 190 г', 'Сок «Добрый» яблочный 1 л', 'Кофе «Жокей» 250 г', 'Масло сливочное 82,5%', 'Йогурт «Чудо» персик', 'Батон нарезной 400 г', 'Чай «Майский» 100 пак.', 'Колбаса «Докторская» 400 г', 'Пельмени «Сибирские» 800 г', 'Шоколад «Алёнка» 90 г'];
const OPS = ['Продажа', 'Продажа', 'Продажа', 'Продажа', 'Приёмка', 'Продажа', 'Возврат', 'Продажа', 'Переоценка', 'Продажа'];
const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
type Row = {time: string; op: string; good: string; qty: string; sum: string; rest: string; tone?: Tone; label?: string};
const ROW_H = 58;
const HL: Record<number, Row> = {
  9: {time: '', op: 'Списание', good: 'Хлеб «Бородинский» 400 г', qty: '24 шт', sum: '−1 080 ₽', rest: '6 шт', tone: 'red', label: 'Теряются деньги'},
  13: {time: '', op: 'Остаток', good: 'Сок «Добрый» яблочный 1 л', qty: '36 шт', sum: 'годен до 28.10', rest: '36 шт', tone: 'orange', label: 'Появился риск'},
  17: {time: '', op: 'Продажа', good: 'Молоко «Простоквашино» 2,5%', qty: '42 шт', sum: '85 ₽ · рынок 100 ₽', rest: '64 шт', tone: 'green', label: 'Точка роста'},
};
const hhmm = (i: number) => {
  const m = 7 * 60 + 40 + i * 6 + Math.floor(rnd(i + 2) * 5);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const rows: Row[] = Array.from({length: 40}, (_, i) => {
  if (HL[i]) return {...HL[i], time: hhmm(i)};
  const g = GOODS[Math.floor(rnd(i) * GOODS.length)];
  const op = OPS[Math.floor(rnd(i + 3) * OPS.length)];
  const q = 1 + Math.floor(rnd(i + 7) * (op === 'Приёмка' ? 60 : 6));
  const price = 49 + Math.floor(rnd(i + 11) * 400);
  return {time: hhmm(i), op, good: g, qty: `${q} шт`, sum: `${op === 'Возврат' ? '−' : ''}${(q * price).toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`, rest: `${8 + Math.floor(rnd(i + 5) * 300)} шт`};
});
const COLS = [
  {k: 'time', w: 110, t: 'Время'},
  {k: 'op', w: 170, t: 'Операция'},
  {k: 'good', w: 450, t: 'Товар'},
  {k: 'qty', w: 120, t: 'Кол-во'},
  {k: 'sum', w: 260, t: 'Сумма'},
  {k: 'rest', w: 140, t: 'Остаток'},
] as const;
const TableRow: React.FC<{r: Row; style?: React.CSSProperties; strong?: boolean}> = ({r, style, strong}) => (
  <div style={{display: 'flex', alignItems: 'center', height: ROW_H, fontSize: 23, borderBottom: `1px solid ${C.line}`, color: C.ink, ...style}}>
    {COLS.map((c) => (
      <div key={c.k} style={{width: c.w, paddingLeft: 22, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: strong && (c.k === 'sum' || c.k === 'good') ? 700 : 400, color: c.k === 'time' ? C.gray : undefined}}>
        {r[c.k]}
      </div>
    ))}
  </div>
);
export const Data: React.FC<SceneProps> = ({cue}) => {
  const f = useCurrentFrame();
  const no = cue('Но');
  const hlAt = [cue('теряются'), cue('риск'), cue('роста')];
  // таблица прокручивается и останавливается к «Но»
  const stopAt = no + 18;
  const v = (t: number) => Math.min(t, stopAt) * 3.2 - Math.max(0, Math.min(t, stopAt) - (stopAt - 24)) ** 2 * (3.2 / 48);
  const scroll = v(f) + 40;
  const blur = lerp(f, no, no + 20, 0, 1, ease);
  const TX = 920;
  const TY = 120 - scroll;
  const rowY = (i: number) => TY + 64 + i * ROW_H;
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: TX, top: TY, width: 1260, background: '#fff', borderRadius: 28, filter: `blur(${blur * 3}px)`, opacity: 1 - blur * 0.45}}>
        <div style={{display: 'flex', height: 64, alignItems: 'center', fontSize: 20, color: C.gray, borderBottom: `1px solid ${C.line}`}}>
          {COLS.map((c) => (
            <div key={c.k} style={{width: c.w, paddingLeft: 22}}>
              {c.t}
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <TableRow key={i} r={r} />
        ))}
      </div>
      {/* левая колонка с заголовком поверх затухания таблицы */}
      <div style={{position: 'absolute', left: 0, top: 0, width: 980, bottom: 0, background: `linear-gradient(90deg, ${C.bg} 86%, rgba(242,243,245,0))`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 110, background: `linear-gradient(${C.bg} 30%, rgba(242,243,245,0))`}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: `linear-gradient(rgba(242,243,245,0), ${C.bg} 70%)`}} />
      <div style={{position: 'absolute', left: 120, top: 200}}>
        <Reveal at={cue('достаточно') - 10} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2.4, lineHeight: 1.06}}>
          Данных достаточно.
        </Reveal>
        <Reveal at={no} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2.4, lineHeight: 1.06, color: C.blue}}>
          Что важно —
        </Reveal>
        <Reveal at={no + 5} style={{fontSize: 80, fontWeight: 700, letterSpacing: -2.4, lineHeight: 1.06, color: C.blue}}>
          не видно.
        </Reveal>
      </div>
      {/* три найденные строки «вытаскиваются» из размытой таблицы, к ним тянутся выноски */}
      {[9, 13, 17].map((idx, k) => {
        const r = rows[idx];
        const at = hlAt[k];
        if (f < at) return null;
        const p = spr(f, at, 15);
        const t = TONE[r.tone!];
        const y = rowY(idx);
        const ly = 590 + k * 92;
        const lx = 120 + 34 + r.label!.length * 21.5 + 16;
        return (
          <React.Fragment key={idx}>
            <div style={{position: 'absolute', left: TX - 10, top: y - 6, width: 1280, height: ROW_H + 12, background: '#fff', borderRadius: 16, boxShadow: `0 16px 40px rgba(20,40,80,${0.16 * p})`, transform: `scale(${1 + 0.03 * p})`, transformOrigin: 'left center', opacity: Math.min(1, p * 2), overflow: 'hidden', border: `3px solid ${t.c}`, boxSizing: 'border-box'}}>
              <div style={{position: 'absolute', inset: 0, background: t.bg, opacity: 0.7}} />
              <TableRow r={r} strong style={{position: 'relative', height: ROW_H + 6, borderBottom: 'none'}} />
            </div>
            <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
              <path d={`M ${lx} ${ly + 26} C ${lx + 120} ${ly + 26}, ${TX - 140} ${y + ROW_H / 2}, ${TX - 16} ${y + ROW_H / 2}`} fill="none" stroke={t.c} strokeWidth={3} strokeLinecap="round" strokeDasharray="2000" strokeDashoffset={2000 * (1 - lerp(f, at + 4, at + 22, 0, 1, ease))} />
            </svg>
            <div style={{position: 'absolute', left: 120, top: ly, display: 'flex', alignItems: 'center', gap: 16, opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - p) * -30}px)`}}>
              <Dot color={t.c} size={18} pulse={at + 6} />
              <span style={{fontSize: 40, fontWeight: 700, whiteSpace: 'nowrap'}}>{r.label}</span>
            </div>
            <Sfx at={at} name="pop" />
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/* ===================== 0:14 Причины ищут вручную → поздно ===================== */

const REPORTS = [
  {t: 'Отчёт о продажах', cue: 'продажах', icon: 'chart', x: 120, y: 290, rows: [['Пиво', '10 386 ₽', '↑ 2%'], ['Хлеб и выпечка', '3 231 ₽', '↓ 18%'], ['Напитки', '2 539 ₽', '↑ 1%'], ['Снеки и закуски', '2 077 ₽', '↓ 9%'], ['Кондитерские', '1 616 ₽', '↑ 3%'], ['Молочное', '1 385 ₽', '↑ 2%']]},
  {t: 'Остатки на складе', cue: 'остатках', icon: 'box', x: 690, y: 320, rows: [['Сок «Добрый» 1 л', '36 шт', ''], ['Молоко 2,5%', '64 шт', ''], ['Хлеб «Бородинский»', '6 шт', ''], ['Вода «Бонаква»', '120 шт', ''], ['Печенье «Юбилейное»', '48 шт', ''], ['Кефир 1%', '22 шт', '']]},
  {t: 'Списания за неделю', cue: 'списаниях', icon: 'doc', x: 1260, y: 290, rows: [['Хлеб «Бородинский»', '24 шт', '1 080 ₽'], ['Кефир 1%', '6 шт', '540 ₽'], ['Батон нарезной', '12 шт', '456 ₽'], ['Йогурт «Чудо»', '9 шт', '405 ₽'], ['Сыр «Российский»', '2 шт', '398 ₽'], ['Молоко 2,5%', '4 шт', '340 ₽']]},
];
const WEEK = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TL = {x0: 220, x1: 1700, y: 700};
const dayX = (i: number) => TL.x0 + ((TL.x1 - TL.x0) / 6) * i;
const LOSS = [1200, 1100, 1300, 1250, 1150, 1200];

/* Неделя: проблема в понедельник, заметили в воскресенье. mode=signal — сигнал во вторник. */
const Week: React.FC<{show: number; problem: number; late: number; signal?: number; out?: number}> = ({show, problem, late, signal = 1e9, out: o = 1e9}) => {
  const f = useCurrentFrame();
  const line = lerp(f, show, show + 22, 0, 1, ease);
  const e = evolvePath(line, `M ${TL.x0 - 60} ${TL.y} H ${TL.x1 + 60}`);
  const sig = spr(f, signal, 13);
  const fadeOut = 1 - lerp(f, o, o + 14, 0, 1, ease);
  let total = 0;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: fadeOut, transform: `translateY(${(1 - fadeOut) * 60}px)`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <path d={`M ${TL.x0 - 60} ${TL.y} H ${TL.x1 + 60}`} stroke={C.line} strokeWidth={4} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
      {WEEK.map((d, i) => (
        <div key={d} style={{position: 'absolute', left: dayX(i) - 40, top: TL.y + 24, width: 80, textAlign: 'center', fontSize: 28, color: C.gray, opacity: lerp(f, show + 4 + i * 2, show + 14 + i * 2)}}>
          {d}
        </div>
      ))}
      {/* потери по дням */}
      {LOSS.map((v, i) => {
        const at = problem + 10 + i * 9;
        const p = lerp(f, at, at + 10);
        const prevented = signal < 1e8 && i >= 1 ? lerp(f, signal + 6 + i * 2, signal + 18 + i * 2, 0, 1, ease) : 0;
        if (f >= at) total += v * p;
        const h = (v / 1300) * 150 * p;
        return (
          <div key={i} style={{position: 'absolute', left: dayX(i) + 30, top: TL.y - 14 - h, width: (dayX(1) - dayX(0)) - 60, height: h, borderRadius: 10, background: prevented > 0.5 ? 'transparent' : C.red, border: prevented > 0.5 ? `3px dashed ${C.line}` : 'none', opacity: 0.85 - prevented * 0.35, boxSizing: 'border-box'}} />
        );
      })}
      <div style={{position: 'absolute', left: dayX(3) - 160, top: TL.y - 290, width: 320, textAlign: 'center', opacity: lerp(f, problem + 10, problem + 20) * (1 - lerp(f, signal, signal + 10))}}>
        <div style={{fontSize: 26, color: C.gray}}>Потери</div>
        <div style={{fontSize: 64, fontWeight: 700, color: C.redText, fontVariantNumeric: 'tabular-nums'}}>−{Math.round(total).toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽</div>
      </div>
      {/* начало проблемы */}
      <Marker x={dayX(0)} at={problem} tone="red" icon="alert" text="Выросла закупочная цена" above />
      {/* заметили поздно */}
      <Marker x={dayX(6)} at={late} tone="gray" icon="eye" text="Заметили в отчёте" />
      <div style={{position: 'absolute', left: dayX(0), top: TL.y + 92, width: dayX(6) - dayX(0), opacity: lerp(f, late + 8, late + 18) * (1 - lerp(f, signal, signal + 10))}}>
        <div style={{height: 14, borderLeft: `3px solid ${C.redText}`, borderRight: `3px solid ${C.redText}`, borderBottom: `3px solid ${C.redText}`, borderRadius: '0 0 8px 8px'}} />
        <div style={{textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.redText, marginTop: 10}}>6 дней</div>
      </div>
      {/* сигнал раньше */}
      {f >= signal && (
        <div style={{position: 'absolute', left: dayX(1) - 46, top: TL.y - 46, width: 92, height: 92, borderRadius: 28, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${sig})`, boxShadow: '0 12px 30px rgba(34,145,255,0.4)'}}>
          <AiIcon size={52} style={{filter: 'brightness(0) invert(1)'}} />
        </div>
      )}
      {f >= signal && (
        <div style={{position: 'absolute', left: dayX(1) - 60, top: TL.y + 84, opacity: lerp(f, signal + 6, signal + 16)}}>
          <div style={{background: '#fff', borderRadius: 18, padding: '16px 24px', boxShadow: '0 12px 30px rgba(20,40,80,0.12)', fontSize: 30, fontWeight: 700, whiteSpace: 'nowrap'}}>
            <span style={{color: C.blue}}>Сигнал</span> — раньше, чем отчёт
          </div>
        </div>
      )}
    </div>
  );
};
const Marker: React.FC<{x: number; at: number; tone: Tone; icon: string; text: string; above?: boolean}> = ({x, at, tone, icon, text, above}) => {
  const f = useCurrentFrame();
  const p = spr(f, at, 14);
  if (f < at) return null;
  return (
    <>
      <div style={{position: 'absolute', left: x - 22, top: TL.y - 22, width: 44, height: 44, borderRadius: 22, background: TONE[tone].c, border: '6px solid #fff', boxSizing: 'border-box', transform: `scale(${p})`}} />
      <div style={{position: 'absolute', left: x - 30, top: TL.y - 310, opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 20}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 18, padding: '14px 22px', boxShadow: '0 12px 30px rgba(20,40,80,0.12)', fontSize: 28, fontWeight: 500, whiteSpace: 'nowrap', transform: x > 1400 ? 'translateX(-70%)' : undefined}}>
          <Ico n={icon} size={30} color={TONE[tone].t} />
          {text}
        </div>
      </div>
    </>
  );
};
const MiniReport: React.FC<{t: string; icon: string; rows: string[][]; active: number; scan: number}> = ({t, icon, rows: rr, active, scan}) => (
  <div style={{width: 540, height: 470, background: '#fff', borderRadius: 24, padding: '26px 28px', boxSizing: 'border-box', boxShadow: `0 ${10 + active * 14}px ${30 + active * 30}px rgba(20,40,80,${0.08 + active * 0.08})`, border: `3px solid ${active > 0.5 ? C.blue : 'transparent'}`, position: 'relative', overflow: 'hidden'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700}}>
      <Ico n={icon} size={30} color={C.blue} />
      {t}
    </div>
    <div style={{marginTop: 18}}>
      {rr.map(([a, b, c]) => (
        <div key={a} style={{display: 'flex', alignItems: 'center', height: 58, borderBottom: `1px solid ${C.line}`, fontSize: 21, position: 'relative'}}>
          <span style={{flex: 1, whiteSpace: 'nowrap'}}>{a}</span>
          <span style={{width: 110, textAlign: 'right', color: C.gray}}>{b}</span>
          {c && <span style={{width: 100, textAlign: 'right', color: c.startsWith('↓') ? C.redText : c.startsWith('↑') ? C.greenText : C.ink}}>{c}</span>}
        </div>
      ))}
    </div>
    {/* «лупа» идёт по строкам */}
    {active > 0 && <div style={{position: 'absolute', left: 14, right: 14, top: 86 + scan * 290, height: 54, borderRadius: 12, background: 'rgba(34,145,255,0.12)', border: `2px solid ${C.blue}`, opacity: active}} />}
  </div>
);
export const Owner: React.FC<SceneProps> = ({cue}) => {
  const f = useCurrentFrame();
  const time = cue('время');
  const away = lerp(f, time - 6, time + 14, 0, 1, ease);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 120, top: 110}}>
        <Reveal at={4} out={time - 8} style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5}}>
          Причины изменений ищут вручную
        </Reveal>
      </div>
      <div style={{position: 'absolute', left: 120, top: 110}}>
        <Reveal at={time + 4} style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5}}>
          На это уходит время,
        </Reveal>
        <Reveal at={cue('поздно') - 4} style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5, color: C.redText}}>
          а проблему замечают поздно
        </Reveal>
      </div>
      {REPORTS.map((r, i) => {
        const p = spr(f, 8 + i * 7, 15);
        const c = cue(r.cue);
        const active = lerp(f, c - 4, c + 6) * (1 - lerp(f, c + 30, c + 38));
        const scan = interpolate(f, [c - 4, c + 28], [0, 1], {...clamp, easing: ease});
        return (
          <div key={r.t} style={{position: 'absolute', left: r.x, top: r.y + away * -120, opacity: Math.min(1, p * 1.5) * (1 - away), transform: `translateY(${(1 - p) * 80}px) scale(${1 + active * 0.04 - away * 0.2})`}}>
            <MiniReport t={r.t} icon={r.icon} rows={r.rows} active={active} scan={scan} />
          </div>
        );
      })}
      {REPORTS.map((r) => (
        <Sfx key={r.cue} at={cue(r.cue) - 3} name="tick" />
      ))}
      <Week show={time} problem={cue('проблема')} late={cue('поздно')} />
      <Sfx at={cue('проблема')} name="pop" />
      <Sfx at={cue('поздно')} name="pop" />
    </AbsoluteFill>
  );
};

/* ================== 0:25 Как работает сигнал: из чего он состоит ================== */

const STEPS = [
  {t: 'Анализирует данные Маркета', i: 'database', cue: 'анализ'},
  {t: 'Находит отклонение', i: 'alert', cue: 'отклонения'},
  {t: 'Объясняет причину', i: 'search', cue: 'причину'},
  {t: 'Рекомендует, что проверить', i: 'check', cue: 'рекомендуют'},
  {t: 'Решение — за вами', i: 'people', cue: 'Финальное'},
];
const SOURCES = ['Продажи', 'Остатки', 'Закупки', 'Списания'];
export const Chain: React.FC<SceneProps> = ({cue, dur}) => {
  const f = useCurrentFrame();
  const a = cue('анализ');
  const dev = cue('отклонения');
  const why = cue('причину');
  const rec = cue('рекомендуют');
  const fin = cue('Финальное');
  const weekOut = a - 14;
  const cardIn = lerp(f, a - 8, a + 12);
  const click = fin + 46;
  const spark = 'M 0 40 C 30 36, 50 20, 80 24 S 130 10, 160 16 S 200 60, 230 70 S 260 64, 280 66';
  const sp = evolvePath(lerp(f, dev, dev + 20, 0, 1, ease), spark);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      {/* продолжение недели: сигнал раньше */}
      {f < weekOut + 20 && (
        <>
          <div style={{position: 'absolute', left: 120, top: 110, opacity: 1 - lerp(f, weekOut, weekOut + 12)}}>
            <div style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5}}>На это уходит время,</div>
            <div style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5, color: C.blue}}>а сигнал показывает раньше</div>
          </div>
          <Week show={-60} problem={-200} late={-60} signal={4} out={weekOut} />
          <Sfx at={4} name="chime" />
        </>
      )}
      {/* шаги */}
      <div style={{position: 'absolute', left: 120, top: 210, opacity: cardIn}}>
        <Reveal at={a - 6} style={{fontSize: 56, fontWeight: 700, letterSpacing: -1.2, marginBottom: 40}}>
          Как устроен сигнал
        </Reveal>
        {STEPS.map((s, i) => {
          const at = cue(s.cue);
          const on = lerp(f, at - 4, at + 8);
          const fill = i < STEPS.length - 1 ? lerp(f, cue(STEPS[i + 1].cue) - 10, cue(STEPS[i + 1].cue) - 2) : 0;
          const last = i === STEPS.length - 1;
          return (
            <div key={s.t} style={{position: 'relative', height: 112, display: 'flex', alignItems: 'center', gap: 26}}>
              {i < STEPS.length - 1 && (
                <div style={{position: 'absolute', left: 35, top: 82, width: 3, height: 60, background: C.line}}>
                  <div style={{width: 3, height: 60 * fill, background: C.blue}} />
                </div>
              )}
              <div style={{width: 72, height: 72, borderRadius: 24, background: on > 0.5 ? (last ? C.blue : '#fff') : '#E8EAEE', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.1 * Math.sin(Math.min(1, Math.max(0, (f - at) / 10)) * Math.PI)})`, boxShadow: on > 0.5 ? '0 8px 24px rgba(34,145,255,0.22)' : 'none'}}>
                <Ico n={s.i} size={36} color={on > 0.5 ? (last ? '#fff' : C.blue) : C.gray2} sw={1.8} />
              </div>
              <div style={{fontSize: 34, fontWeight: on > 0.5 ? 700 : 400, color: on > 0.5 ? C.ink : C.gray2}}>{s.t}</div>
            </div>
          );
        })}
      </div>
      {/* карточка сигнала собирается по шагам */}
      <div style={{position: 'absolute', left: 800, top: 170, width: 1000, height: 740, background: '#fff', borderRadius: 32, padding: '36px 44px 40px', boxSizing: 'border-box', boxShadow: '0 30px 70px rgba(20,40,80,0.14)', opacity: cardIn, transform: `translateY(${(1 - cardIn) * 60}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, color: C.gray}}>
          <AiIcon size={26} /> Аудит торговой точки · сигнал
        </div>
        {/* анализ: источники и «мерцающие» строки */}
        {f < dev + 6 ? (
          <div style={{marginTop: 22}}>
            <div style={{fontSize: 34, fontWeight: 700, color: C.gray2}}>ИИ анализирует данные…</div>
            <div style={{display: 'flex', gap: 12, marginTop: 22}}>
              {SOURCES.map((s, i) => {
                const ok = f > a + 14 + i * 12;
                return (
                  <span key={s} style={{display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 22, padding: '8px 16px', borderRadius: 999, background: ok ? C.mist : C.page, color: ok ? C.blueDeep : C.gray, opacity: lerp(f, a + i * 5, a + 8 + i * 5)}}>
                    {ok ? <Ico n="check" size={20} color={C.blue} sw={2.2} /> : <Dot color={C.gray2} size={8} />}
                    {s}
                  </span>
                );
              })}
            </div>
            {[0, 1].map((k) => (
              <div key={k} style={{height: 18, width: k ? '62%' : '88%', borderRadius: 9, marginTop: 22, background: `linear-gradient(90deg, ${C.page} 0%, #E3EEFB ${((f * 3) % 140) - 20}%, ${C.page} ${((f * 3) % 140) + 20}%)`}} />
            ))}
          </div>
        ) : (
          <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 20}}>
            <Dot color={C.red} size={18} pulse={dev + 6} />
            <div style={{fontSize: 38, fontWeight: 700, letterSpacing: -0.6, whiteSpace: 'nowrap'}}>Валовая прибыль снизилась на 12%</div>
            <svg width={230} height={84} viewBox="-5 0 290 84" style={{marginLeft: 'auto'}}>
              <path d={spark} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" strokeDasharray={sp.strokeDasharray} strokeDashoffset={sp.strokeDashoffset} />
              <circle cx={230} cy={70} r={14 * lerp(f, dev + 16, dev + 26)} fill="none" stroke={C.red} strokeWidth={3} />
            </svg>
          </div>
        )}
        <div style={{height: 1, background: C.line, margin: '28px 0 24px', opacity: lerp(f, why - 4, why + 6)}} />
        <div style={{opacity: lerp(f, why - 4, why + 6)}}>
          <div style={{fontSize: 22, color: C.gray, marginBottom: 8}}>Возможная причина</div>
          <div style={{fontSize: 30, lineHeight: 1.4, minHeight: 84}}>
            <Typewriter at={why + 2} cps={60} segs={[{t: 'Выросли закупочные цены в категориях '}, {t: '«Хлеб и выпечка»', b: true}, {t: ' и '}, {t: '«Снеки»', b: true}]} />
          </div>
        </div>
        <div style={{opacity: lerp(f, rec - 4, rec + 6), marginTop: 20}}>
          <div style={{fontSize: 22, color: C.gray, marginBottom: 12}}>Что проверить</div>
          {['Цены у поставщиков', 'Условия закупки'].map((t, i) => (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, marginTop: 10, opacity: lerp(f, rec + 4 + i * 8, rec + 14 + i * 8)}}>
              <div style={{width: 30, height: 30, borderRadius: 8, border: `2.5px solid ${C.blue}`, boxSizing: 'border-box'}} />
              {t}
            </div>
          ))}
        </div>
        <div style={{position: 'absolute', left: 44, right: 44, bottom: 40, display: 'flex', gap: 16, opacity: lerp(f, fin - 2, fin + 10), alignItems: 'center'}}>
          <Btn kind="primary" size={26} hover={hoverP(f, click - 10)} press={pressP(f, click)}>
            Проверить
          </Btn>
          <Btn size={26} hover={hoverP(f, fin + 22, click - 16)}>
            Отложить
          </Btn>
          <span style={{marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 500, color: C.blueDeep, background: C.mist, padding: '10px 18px', borderRadius: 999, opacity: lerp(f, fin + 10, fin + 20)}}>
            <Ico n="people" size={24} color={C.blueDeep} /> Решение — за вами
          </span>
        </div>
      </div>
      <Cursor path={[{x: 1500, y: 1020, at: fin + 8}, {x: 1130, y: 840, at: fin + 24}, {x: 940, y: 840, at: click, click: true}]} size={44} hideAt={dur - 6} />
      <Sfx at={a} name="whoosh" vol={0.6} />
      <Sfx at={dev + 4} name="chime" />
      <Sfx at={click} name="click" />
    </AbsoluteFill>
  );
};

/* ================= 0:37 ИИ Контура: данные остаются внутри Маркета ================= */

const TRUST_SRC = [
  {t: 'Продажи и чеки', i: 'register'},
  {t: 'Товары и остатки', i: 'box'},
  {t: 'Поставки', i: 'truck'},
  {t: 'Маркировка', i: 'code'},
  {t: 'Цены', i: 'tag'},
];
export const Trust: React.FC<SceneProps> = ({cue}) => {
  const f = useCurrentFrame();
  const work = cue('работает');
  const inside = cue('внутри');
  const send = cue('передавать');
  const box = lerp(f, work - 6, work + 16, 0, 1, ease);
  const border = evolvePath(box, 'M 160 300 H 1300 A 36 36 0 0 1 1336 336 V 944 A 36 36 0 0 1 1300 980 H 156 A 36 36 0 0 1 120 944 V 336 A 36 36 0 0 1 156 300 Z');
  const node = spr(f, 2, 13);
  const label = lerp(f, inside, inside + 10);
  const ghost = lerp(f, send, send + 12);
  const cut = lerp(f, send + 26, send + 36, 0, 1, ease);
  const NX = 1010;
  const NY = 640;
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 120, top: 100}}>
        <Reveal at={cue('контура') - 8} style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5}}>
          ИИ Контура работает
        </Reveal>
        <Reveal at={inside - 4} style={{fontSize: 64, fontWeight: 700, letterSpacing: -1.5, color: C.blue}}>
          внутри Контур.Маркета
        </Reveal>
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <path d="M 160 300 H 1300 A 36 36 0 0 1 1336 336 V 944 A 36 36 0 0 1 1300 980 H 156 A 36 36 0 0 1 120 944 V 336 A 36 36 0 0 1 156 300 Z" fill="#fff" opacity={box} />
        <path d="M 160 300 H 1300 A 36 36 0 0 1 1336 336 V 944 A 36 36 0 0 1 1300 980 H 156 A 36 36 0 0 1 120 944 V 336 A 36 36 0 0 1 156 300 Z" fill="none" stroke={C.blue} strokeWidth={4} strokeDasharray={border.strokeDasharray} strokeDashoffset={border.strokeDashoffset} />
        {TRUST_SRC.map((_, i) => {
          const y = 384 + i * 112 + 40;
          return <Flow key={i} at={inside + 8 + i * 3} d={`M 540 ${y} C 720 ${y}, 760 ${NY}, ${NX - 130} ${NY}`} />;
        })}
        {/* в сторонний сервис — не нужно */}
        <path d={`M 1340 ${NY} H 1480`} stroke={C.gray2} strokeWidth={4} strokeDasharray="12 10" opacity={ghost * (1 - cut * 0.7)} strokeDashoffset={-f * 1.4} />
      </svg>
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 170, top: 330, height: 38, opacity: lerp(f, work + 6, work + 18)}} />
      {TRUST_SRC.map((s, i) => {
        const p = spr(f, work + 10 + i * 5, 15);
        return (
          <div key={s.t} style={{position: 'absolute', left: 170, top: 384 + i * 112, width: 370, height: 82, borderRadius: 20, background: C.page, display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px', boxSizing: 'border-box', fontSize: 28, fontWeight: 500, opacity: Math.min(1, p * 1.5), transform: `translateX(${(1 - p) * -30}px)`}}>
            <Ico n={s.i} size={32} color={C.blue} />
            {s.t}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: NX - 130, top: NY - 130, width: 260, height: 260, borderRadius: 80, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${node})`, boxShadow: '0 24px 60px rgba(34,145,255,0.4)'}}>
        <AiIcon size={130} style={{filter: 'brightness(0) invert(1)'}} />
      </div>
      <div style={{position: 'absolute', left: NX - 200, top: NY + 150, width: 400, textAlign: 'center', fontSize: 30, fontWeight: 700}}>
        <span style={{opacity: 1 - label, position: 'absolute', left: 0, right: 0}}>ИИ Контура</span>
        <span style={{opacity: label}}>ИИ Бизнес сигналы</span>
      </div>
      {/* сторонний сервис */}
      <div style={{position: 'absolute', left: 1490, top: NY - 110, width: 310, height: 220, borderRadius: 28, border: `3px dashed ${C.gray2}`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 28, color: C.gray, opacity: ghost * (1 - cut * 0.6)}}>
        <Ico n="cloud" size={56} color={C.gray2} />
        Сторонний сервис
      </div>
      <div style={{position: 'absolute', left: 1378, top: NY - 34, width: 68, height: 68, borderRadius: 34, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, send + 26, 12)})`}}>
        <Ico n="close" size={38} color="#fff" sw={3} />
      </div>
      <div style={{position: 'absolute', left: 1380, top: 870, opacity: lerp(f, send + 34, send + 46), display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 500, width: 440}}>
        <Ico n="shield" size={44} color={C.blue} />
        Не нужно передавать данные в другой сервис
      </div>
      <Sfx at={work} name="whoosh" vol={0.6} />
      <Sfx at={2} name="pop" />
      <Sfx at={inside} name="chime" vol={0.6} />
      <Sfx at={send + 26} name="tick" vol={1.4} />
    </AbsoluteFill>
  );
};

/* ===================== 0:48 Раздел «ИИ бизнес-сигналы»: три модуля ===================== */

const Bullet: React.FC<{c: string; children: React.ReactNode}> = ({c, children}) => (
  <div style={{display: 'flex', alignItems: 'baseline', gap: 12, fontSize: 21, lineHeight: 1.35, marginTop: 10}}>
    <span style={{width: 10, height: 10, borderRadius: 5, background: c, flexShrink: 0, transform: 'translateY(-2px)'}} />
    <span>{children}</span>
  </div>
);
const Stat: React.FC<{label: React.ReactNode; value: string; w: number; ring?: number}> = ({label, value, w, ring}) => (
  <div style={{width: w, height: 112, border: `2px solid ${C.line}`, borderRadius: 18, padding: '18px 22px', boxSizing: 'border-box', position: 'relative'}}>
    <div style={{fontSize: 19, color: C.ink, display: 'flex', alignItems: 'center', gap: 6}}>{label}</div>
    <div style={{fontSize: 30, fontWeight: 700, marginTop: 6}}>{value}</div>
    {ring !== undefined && (
      <svg width={72} height={72} style={{position: 'absolute', right: 18, top: 20}}>
        <circle cx={36} cy={36} r={30} fill="none" stroke={C.line} strokeWidth={6} />
        {ring > 0 && <circle cx={36} cy={36} r={30} fill="none" stroke={C.orange} strokeWidth={6} strokeDasharray={`${ring * 188} 188`} transform="rotate(-90 36 36)" strokeLinecap="round" />}
        <text x={36} y={42} textAnchor="middle" fontSize={17} fill={C.gray} fontFamily={font}>
          {ring > 0 ? `${Math.round(ring * 100)}%` : '✓'}
        </text>
      </svg>
    )}
  </div>
);
export const HubPage: React.FC<{t: number}> = ({t}) => (
  <>
    <PageHead title="ИИ бизнес-сигналы" />
    <Card x={44} y={130} w={700} h={404}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 700}}>
        <Ico n="shield" size={28} /> Сверка с Честным знаком
      </div>
      <div style={{fontSize: 19, color: C.gray, marginTop: 6}}>Находит расхождения между остатками в системе и данными маркировки</div>
      <div style={{display: 'flex', gap: 14, marginTop: 20}}>
        <Stat w={313} label={<>Риски <Dot color={C.green} size={12} /></>} value="Не найдены" ring={0} />
        <Stat w={313} label={<>Предупреждения <Dot color={C.orange} size={12} /></>} value="293 позиции" ring={0.2 * lerp(t, 10, 40)} />
      </div>
      <Bullet c={C.orange}>Истекает срок годности: влияет на 150 позиций</Bullet>
      <Bullet c={C.orange}>Долго на балансе: влияет на 50 позиций</Bullet>
    </Card>
    <Card x={768} y={130} w={568} h={404}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 700}}>
        <Ico n="store" size={28} /> Сравнение с конкурентами
      </div>
      <div style={{fontSize: 19, color: C.gray, marginTop: 6}}>Сравнивает цены ваших товаров с конкурентами</div>
      <div style={{display: 'flex', gap: 14, marginTop: 20}}>
        <Stat w={247} label={<>Дороже рынка <Ico n="upRight" size={18} color={C.blue} /></>} value="12 позиций" />
        <Stat w={247} label={<>Дешевле рынка <Ico n="downRight" size={18} color={C.blue} /></>} value="27 позиций" />
      </div>
      <Bullet c={C.blue}>13 товаров дороже рынка: риск потери покупателей</Bullet>
      <Bullet c={C.blue}>27 товаров дешевле рынка: риск потери прибыли</Bullet>
    </Card>
    <Card x={44} y={558} w={700} h={330}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 700}}>
        <Ico n="chart" size={28} /> Аудит торговой точки
      </div>
      <div style={{fontSize: 19, color: C.gray, marginTop: 6}}>Помогает выявлять и исправлять проблемные места в учёте товаров</div>
      <Bullet c={C.blue}>Выручка выросла на 3%</Bullet>
      <Bullet c={C.orange}>Валовая прибыль снизилась на 12%</Bullet>
      <Bullet c={C.orange}>Списания выросли на 8%</Bullet>
      <div style={{position: 'absolute', left: 30, bottom: 26}}>
        <Btn size={19}>Перейти в отчёт →</Btn>
      </div>
      <div style={{position: 'absolute', right: 30, bottom: 36, fontSize: 18, color: C.gray}}>Данные за 29 июня — 5 июля</div>
    </Card>
  </>
);
export const Modules: React.FC<SceneProps> = ({cue, dur}) => {
  const f = useCurrentFrame();
  const a = cue('аудит');
  const b = cue('сверка');
  const c = cue('сравнение');
  return (
    <Screen
      enter={0}
      cam={[home(0), home(a - 16), {at: a + 4, s: 1.05, x: 830, y: 372}, {at: dur, s: 1.07, x: 840, y: 365}]}
      overlay={<Caption2 at={10} />}
    >
      <MarketWindow active="ai">
        <HubPage t={f} />
      </MarketWindow>
      <div style={{position: 'absolute', left: 22, top: NAV_Y('ai'), width: 256, height: 50, borderRadius: 14, border: `3px solid ${C.blue}`, boxSizing: 'border-box', opacity: lerp(f, 12, 20) * (1 - lerp(f, a - 10, a))}} />
      <Spot
        w={1680}
        h={1040}
        phases={[
          {from: a, rects: [R(44, 558, 700, 330, 22)]},
          {from: b, rects: [R(44, 130, 700, 404, 22)]},
          {from: c, to: dur - 4, rects: [R(768, 130, 568, 404, 22)]},
        ]}
      />
      <Sfx at={a} name="tick" />
      <Sfx at={b} name="tick" />
      <Sfx at={c} name="tick" />
    </Screen>
  );
};
const Caption2: React.FC<{at: number}> = ({at}) => {
  const f = useCurrentFrame();
  const p = lerp(f, at, at + 14);
  return (
    <div style={{position: 'absolute', left: 120, top: 46, fontFamily: font, fontSize: 40, fontWeight: 700, color: '#fff', opacity: p, transform: `translateY(${(1 - p) * 16}px)`}}>
      Три ИИ-модуля <span style={{color: C.onBlue, fontWeight: 500}}>в разделе «ИИ бизнес-сигналы»</span>
    </div>
  );
};

