import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import {AuditScreen, CompScreen, CzScreen, DupesScreen, HubScreen} from './real';
import {Anchor, Camera, Cursor, FPS, Focus, Footnote, GRAY, GREEN, INK, Icon, LINE, MarketWindow, Pill, RED, SignalCard, TILE, YELLOW, clamp, ease, useAppear, usePop} from './ui';

export type SceneProps = {cue: (k: string) => number; dur: number; beats: number[]};
const W: React.CSSProperties = {background: '#fff'};

/* 0:00 — данные есть, ясности нет */
const DATA = [
  {t: 'Продажи', v: '412 чеков', icon: 'market-register-classic', x: 260, y: 360},
  {t: 'Остатки', v: '1 284 позиции', icon: 'delivery-box-iso', x: 1380, y: 330},
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
        <Img src={staticFile('signals/ui/hub.png')} style={{width: '100%', display: 'block'}} />
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

/* 1:12 — аудит торговой точки: график падает → реальный экран «Прибыль» */
export const Audit: React.FC<SceneProps> = ({cue, dur}) => {
  const frame = useCurrentFrame();
  const ex = cue('Например');
  const chartOut = interpolate(frame, [ex - 12, ex + 6], [1, 0], clamp);
  const pts = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [300 + i * 140, 700 - [40, 70, 55, 90, 80, 110, 95, 60, -40, -120][i]]);
  const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const draw = interpolate(frame, [6, 70], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const e = evolvePath(draw, d);
  const win = useAppear(ex - 6, 14);
  return (
    <AbsoluteFill style={W}>
      <div style={{position: 'absolute', inset: 0, opacity: chartOut}}>
        <Anchor lines={[{text: 'Сигнал → Причина → Что проверить', at: 4}]} size={64} />
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          <line x1={300} x2={1640} y1={760} y2={760} stroke={LINE} strokeWidth={3} />
          <path d={d} fill="none" stroke={colors.blue} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
        </svg>
        <div style={{position: 'absolute', left: 1480, top: 560, opacity: interpolate(frame, [60, 75], [0, 1], clamp)}}>
          <SignalCard w={380} title="Прибыль снизилась" sub="−12% к прошлой неделе" />
        </div>
      </div>
      {frame >= ex - 8 && (
        <div style={{position: 'absolute', inset: 0, opacity: win}}>
          <AuditScreen beats={[cue('снижение'), cue('товары'), cue('предлагает')]} dur={dur} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/* 1:37 — дубли товарных карточек (реальный экран + выезжающая панель) */
export const Dupes: React.FC<SceneProps> = ({cue, dur}) => (
  <AbsoluteFill style={W}>
    <DupesScreen beats={[cue('дубли'), cue('подтверждает'), cue('отклоняет')]} dur={dur} />
    <div style={{position: 'absolute', left: 80, bottom: 60, opacity: useAppear(cue('ручной'))}}>
      <Pill color="#fff" bg={colors.blue} size={36}>Решение — за вами</Pill>
    </div>
  </AbsoluteFill>
);

/* 1:49 — сверка с Честным Знаком (реальный экран, подсказка выезжает в панели) */
export const Marking: React.FC<SceneProps> = ({cue, dur}) => (
  <AbsoluteFill style={W}>
    <CzScreen beats={[cue('коды'), cue('срок'), cue('залежавшиеся'), cue('проверку')]} dur={dur} />
    <div style={{position: 'absolute', left: 80, bottom: 60, opacity: useAppear(dur - 70)}}>
      <Pill color={INK} bg="#fff" size={28} style={{boxShadow: '0 10px 30px rgba(0,0,0,0.12)'}}>С 1 сентября 2026 — автоштрафы по данным Честного Знака</Pill>
    </div>
  </AbsoluteFill>
);

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

/* 2:29 — сравнение с конкурентами: реальный экран → расчёт */
export const Market: React.FC<SceneProps> = ({cue, dur}) => {
  const frame = useCurrentFrame();
  const res = cue('потенциальная');
  const calc = res - 70;
  const shrink = interpolate(frame, [calc - 14, calc + 10], [0, 1], {...clamp, easing: ease});
  const low = Math.round(interpolate(frame, [res, res + 40], [0, 9000], {...clamp, easing: Easing.out(Easing.cubic)}));
  const high = Math.round(interpolate(frame, [res, res + 40], [0, 22500], {...clamp, easing: Easing.out(Easing.cubic)}));
  return (
    <AbsoluteFill style={{background: '#EEF1F5'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '60px 540px', transform: `scale(${1 - shrink * 0.48})`, borderRadius: shrink * 40, overflow: 'hidden'}}>
        <CompScreen beats={[cue('рынок'), cue('Если'), cue('продаётся') - 40]} dur={dur} />
      </div>
      <div style={{position: 'absolute', left: 1060, top: 300, fontFamily: font, opacity: shrink}}>
        <div style={{fontSize: 30, color: GRAY}}>Разница × продажи × дни</div>
        <div style={{fontSize: 70, fontWeight: 700, color: INK, letterSpacing: -2, marginTop: 10}}>15 ₽ × 20–50 шт. × 30</div>
        <div style={{height: 4, width: 760, background: LINE, margin: '40px 0', opacity: useAppear(res)}} />
        <div style={{fontSize: 30, color: GRAY, opacity: useAppear(res)}}>Потенциально на одной позиции в месяц*</div>
        <div style={{fontSize: 92, fontWeight: 700, color: colors.blue, letterSpacing: -3, marginTop: 6, opacity: useAppear(res), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
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
        <span style={{fontSize: 60, fontWeight: 700}}>22 000 ₽</span>
      </div>
      <div style={{position: 'absolute', left: 1060, top: 750, transform: `scale(${usePop(cue('скидка'), 12)})`, transformOrigin: 'left center'}}>
        <Pill color={colors.blue} bg="#EAF4FF" size={40}>Скидка до 32% — до 30 ноября</Pill>
      </div>
      <Footnote at={cue('Стоимость')} text="* Расчётные сценарии; не являются гарантией эффекта или окупаемости." />
    </AbsoluteFill>
  );
};

/* Значок ИИ: синяя плашка с «искрой», как иконка ИИ в интерфейсе Маркета */
const Spark: React.FC<{size: number; rot?: number}> = ({size, rot = 0}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.26, background: colors.blue, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" style={{transform: `rotate(${rot}deg)`}}>
      <path d="M12 1.5 L14.3 9.7 L22.5 12 L14.3 14.3 L12 22.5 L9.7 14.3 L1.5 12 L9.7 9.7 Z" fill="#fff" />
    </svg>
  </div>
);

/* Финал: заявка на сайте */
export const Cta: React.FC<SceneProps> = ({cue}) => {
  const k = cue('оставляйте') || cue('Оставляйте');
  const btn = usePop(k + 4, 12);
  return (
    <AbsoluteFill style={{background: colors.blue}}>
      <div style={{position: 'absolute', left: 120, top: 150, display: 'flex', alignItems: 'center', gap: 28, opacity: useAppear(2)}}>
        <div style={{fontFamily: font, fontSize: 48, fontWeight: 700, color: '#fff'}}>ИИ Бизнес сигналы</div>
      </div>
      <Anchor lines={[{text: 'Оставляйте заявку', at: 8, color: '#fff'}, {text: 'на сайте', at: 16, color: '#fff'}]} size={120} y={360} />
      <div style={{position: 'absolute', left: 120, top: 700, display: 'flex', gap: 30, alignItems: 'center', transform: `scale(${btn})`, transformOrigin: 'left center'}}>
        <div style={{background: '#fff', color: colors.blue, fontFamily: font, fontWeight: 700, fontSize: 44, padding: '26px 56px', borderRadius: 60}}>Оставить заявку</div>
        <div style={{fontFamily: font, fontSize: 44, color: '#fff'}}>kontur.ru/market</div>
      </div>
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 120, bottom: 70, height: 50, filter: 'brightness(0) invert(1)'}} />
    </AbsoluteFill>
  );
};

/* Заставка: «ИИ Бизнес сигналы» от Контур.Маркета — графика без персонажа */
export const Intro: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const m = usePop(6, 12);
  const ring = interpolate(frame, [4, 34], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const circle = 'M 960 170 A 190 190 0 1 1 959.9 170';
  const e = evolvePath(ring, circle);
  const title = useAppear(16, 20);
  const logo = useAppear(30);
  const chips = [
    {t: 'Аудит точки', x: 520, y: 250},
    {t: 'Честный Знак', x: 1400, y: 230},
    {t: 'Конкуренты', x: 1430, y: 470},
  ];
  return (
    <AbsoluteFill style={W}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <path d={circle} fill="none" stroke={colors.blue} strokeWidth={5} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', left: 960 - 110, top: 250, transform: `scale(${m})`}}>
        <Spark size={220} rot={frame * 0.6} />
      </div>
      {chips.map((c, i) => {
        const p = usePop(14 + i * 6, 13);
        return (
          <div key={c.t} style={{position: 'absolute', left: c.x, top: c.y + Math.sin(frame / 18 + i) * 6, transform: `scale(${p})`}}>
            <Pill color={INK} bg={TILE} size={30}>{c.t}</Pill>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: font, fontWeight: 700, fontSize: 124, letterSpacing: -2.5, color: INK, clipPath: `inset(-10% ${(1 - title) * 50}% -10% ${(1 - title) * 50}%)`}}>
        ИИ Бизнес сигналы
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: logo, transform: `translateY(${(1 - logo) * 20}px)`}}>
        <span style={{fontFamily: font, fontSize: 40, color: GRAY}}>от</span>
        <Img src={staticFile('logo-market-32.svg')} style={{height: 62}} />
      </div>
    </AbsoluteFill>
  );
};

/* Цена (короткие версии) */
export const Price: React.FC<SceneProps> = ({cue}) => {
  const a = usePop(cue('22') - 4, 13);
  const b = usePop(cue('скидка'), 12);
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'ИИ Бизнес сигналы', at: 2}]} size={64} />
      <div style={{position: 'absolute', left: 120, top: 300, fontFamily: font, transform: `scale(${a})`, transformOrigin: 'left center'}}>
        <div style={{fontSize: 36, color: GRAY}}>Модификатор Контур.Маркета</div>
        <div style={{fontSize: 200, fontWeight: 700, color: INK, letterSpacing: -6, lineHeight: 1.05}}>22 000 ₽</div>
      </div>
      <div style={{position: 'absolute', left: 120, top: 650, transform: `scale(${b})`, transformOrigin: 'left center'}}>
        <Pill color="#fff" bg={colors.blue} size={56}>Скидка до 32% — до 30 ноября</Pill>
      </div>
      <div style={{position: 'absolute', right: 200, top: 330}}>
        <Spark size={340} />
      </div>
    </AbsoluteFill>
  );
};

/* Крючки для версий по модулям */
export const HookAudit: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [260 + i * 200, 820 - [90, 130, 110, 160, 150, 100, 20, -60][i]]);
  const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const e = evolvePath(interpolate(frame, [0, 40], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}), d);
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Прибыль изменилась.', at: 2}, {text: 'Почему?', at: cue('почему') - 6, color: colors.blue}]} size={100} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <path d={d} fill="none" stroke={colors.blue} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
    </AbsoluteFill>
  );
};
export const HookCz: React.FC<SceneProps> = ({cue, dur}) => {
  const chips = [['Срок годности истёк', RED, '#FDE8E8'], ['Не введён в оборот', RED, '#FDE8E8'], ['Долго на балансе', '#8A5A00', '#FFF3D6']];
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'С 1 сентября 2026 —', at: 2}, {text: 'автоштрафы по данным', at: cue('автоштрафы') - 4, color: colors.blue}, {text: 'Честного Знака', at: cue('автоштрафы') + 4, color: colors.blue}]} size={88} />
      <div style={{position: 'absolute', left: 120, top: 560, display: 'flex', gap: 20}}>
        {chips.map(([t, c, bg], i) => (
          <div key={t} style={{transform: `scale(${usePop(14 + i * 8, 12)})`}}>
            <Pill color={c} bg={bg} size={40}>{t}</Pill>
          </div>
        ))}
      </div>
      <Footnote at={dur - 50} text="Источник: Роспотребнадзор, разъяснение от 19.08.2026. Сверка помогает выявить риск, но не гарантирует отсутствие штрафов." />
    </AbsoluteFill>
  );
};
export const HookComp: React.FC<SceneProps> = ({cue}) => {
  const tags = [['Ваш магазин', '100 ₽', true], ['Конкурент А', '115 ₽', false], ['Конкурент Б', '92 ₽', false]] as const;
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Где ваши цены', at: 2}, {text: 'выше рынка, а где ниже?', at: cue('выше') - 4, color: colors.blue}]} size={96} />
      <div style={{position: 'absolute', left: 120, top: 560, display: 'flex', gap: 36}}>
        {tags.map(([n, p, us], i) => (
          <div key={n} style={{transform: `scale(${usePop(10 + i * 8, 12)})`, fontFamily: font, background: us ? colors.blue : TILE, color: us ? '#fff' : INK, borderRadius: 32, padding: '30px 40px'}}>
            <div style={{fontSize: 30, opacity: 0.8}}>{n}</div>
            <div style={{fontSize: 80, fontWeight: 700}}>{p}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* Экранные сцены для коротких версий: ключевые моменты берутся из cues по порядку */
const AnchorOver: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 60, top: 50, opacity: useAppear(4)}}>
    <Pill color="#fff" bg={colors.blue} size={34}>{text}</Pill>
  </div>
);
export const HubCut: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <HubScreen beats={beats} dur={dur} />
  </AbsoluteFill>
);
export const AuditCut: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <AuditScreen beats={beats} dur={dur} />
    <AnchorOver text="Аудит торговой точки" />
  </AbsoluteFill>
);
export const CzCut: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <CzScreen beats={beats.length >= 3 ? beats : [beats[0] ?? 6, (beats[0] ?? 6) + 30, dur * 0.6, dur * 0.75]} dur={dur} />
    <AnchorOver text="Сверка с Честным Знаком" />
  </AbsoluteFill>
);
export const CompCut: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <CompScreen beats={beats.length >= 2 ? [beats[0], beats[1], dur * 0.72] : [6, beats[0] ?? dur * 0.4, dur * 0.7]} dur={dur} />
    <AnchorOver text="Сравнение с конкурентами" />
  </AbsoluteFill>
);

export const SCENES: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
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
/* Сцены коротких версий (тот же id может значить другое, поэтому отдельная карта) */
export const CUT_SCENES: Record<string, React.FC<SceneProps>> = {
  intro: Intro,
  hub: HubCut,
  audit: AuditCut,
  cz: CzCut,
  comp: CompCut,
  price: Price,
  cta: Cta,
  'hook-audit': HookAudit,
  'hook-cz': HookCz,
  'hook-comp': HookComp,
};
export const toFrames = (sec: number) => Math.round(sec * FPS);
