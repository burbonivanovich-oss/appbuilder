import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {AiIcon, C, CountUp, Cursor, Dot, Footnote, Head, Ico, Reveal, SAFE, Sfx, ease, font, hoverP, lerp, pressP, s2f, spr} from './kit';
import type {SceneProps} from './SignalsV2';

/* ------------------------------- перебивка -------------------------------- */

const MODULES = [
  {id: 'audit', t: 'Аудит торговой точки'},
  {id: 'cz', t: 'Сверка с Честным знаком'},
  {id: 'comp', t: 'Сравнение с конкурентами'},
];
const DIV_OUT = s2f(1.35) - 8;

/* Перебивка по шаблону гайда: синий экран, светлая строка + белая строка, Medium */
export const Divider: React.FC<{light: string; title: string; chapter: string}> = ({light, title, chapter}) => {
  const f = useCurrentFrame();
  const inP = lerp(f, 0, 12, 0, 1, ease);
  const outP = lerp(f, DIV_OUT, DIV_OUT + 16, 0, 1, ease);
  const isModule = MODULES.some((m) => m.id === chapter);
  return (
    <AbsoluteFill style={{background: C.blue, transform: `translateY(${(1 - inP) * 100 - outP * 100}%)`, fontFamily: font, overflow: 'hidden'}}>
      <Sfx at={0} name="swipe" />
      <Sfx at={DIV_OUT} name="whoosh" />
      <div style={{position: 'absolute', left: SAFE, top: 324, fontWeight: 500, fontSize: 112, lineHeight: 1.18, letterSpacing: -2.6}}>
        <Reveal at={4} style={{color: C.onBlue}}>
          {light}
        </Reveal>
        <Reveal at={9} style={{color: '#fff'}}>
          {title}
        </Reveal>
      </div>
      {isModule && (
        <div style={{position: 'absolute', left: SAFE, top: 1080 - SAFE - 56, display: 'flex', gap: 16, opacity: lerp(f, 12, 24)}}>
          {MODULES.map((m, i) => {
            const on = m.id === chapter;
            return (
              <div key={m.id} style={{display: 'flex', alignItems: 'center', gap: 12, height: 56, padding: '0 26px', boxSizing: 'border-box', borderRadius: 999, fontSize: 25, fontWeight: 500, background: on ? '#fff' : 'transparent', color: on ? C.blue : C.onBlue, border: on ? 'none' : `2px solid rgba(169, 212, 255, 0.55)`}}>
                <span style={{opacity: 0.7}}>{i + 1}</span>
                {m.t}
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ------------------- финальный кадр отдельных частей ---------------------- */

export const END_CARD = s2f(2.8);
/* Аутро по шаблону гайда: синий экран, призыв и адрес по центру, реалистичный курсор нажимает кнопку */
const Outro: React.FC<{btnAt: number; click: number; siteAt: number; logoAt: number; sub?: boolean; hideCursor?: number}> = ({btnAt, click, siteAt, logoAt, sub, hideCursor}) => {
  const f = useCurrentFrame();
  const btn = spr(f, btnAt, 13);
  const BTN_TOP = sub ? 560 : 520;
  const BTN_H = 110;
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: sub ? 250 : 300, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 26, fontFamily: font}}>
        <div style={{width: 112, height: 112, borderRadius: 32, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${spr(f, 2, 12)})`}}>
          <AiIcon size={68} />
        </div>
        <Reveal at={6} style={{fontSize: 112, fontWeight: 500, color: '#fff', letterSpacing: -2.6, lineHeight: 1.1}}>
          ИИ Бизнес сигналы
        </Reveal>
      </div>
      {sub && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 410, display: 'flex', justifyContent: 'center', fontFamily: font}}>
          <Reveal at={14} style={{fontSize: 44, color: C.onBlue}}>
            Потери, риски и точки роста — с причиной и подсказкой
          </Reveal>
        </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: BTN_TOP, display: 'flex', justifyContent: 'center'}}>
        <div style={{height: BTN_H, display: 'flex', alignItems: 'center', boxSizing: 'border-box', transform: `scale(${btn * (1 - pressP(f, click) * 0.04)})`, background: hoverP(f, click - 8) > 0.5 ? '#F2F8FF' : '#fff', color: C.blue, fontFamily: font, fontSize: 44, fontWeight: 500, padding: '0 64px', borderRadius: 999}}>Оставить заявку</div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: BTN_TOP + BTN_H + 36, textAlign: 'center', fontFamily: font, fontSize: 44, color: '#fff', opacity: lerp(f, siteAt - 4, siteAt + 10)}}>kontur.ru/market</div>
      <Cursor path={[{x: 1260, y: 980, at: btnAt + 8}, {x: 1010, y: BTN_TOP + BTN_H / 2 + 6, at: click, click: true}]} size={48} hideAt={hideCursor} />
      <Sfx at={click} name="click" />
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 960 - 115, top: 1080 - SAFE + 40, height: 46, filter: 'brightness(0) invert(1)', opacity: lerp(f, logoAt, logoAt + 14)}} />
    </>
  );
};
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const inP = lerp(f, 0, 14, 0, 1, ease);
  return (
    <AbsoluteFill style={{background: C.blue, fontFamily: font, transform: `translateY(${(1 - inP) * 100}%)`}}>
      <Sfx at={0} name="swipe" />
      <Outro btnAt={12} click={46} siteAt={20} logoAt={16} hideCursor={76} />
    </AbsoluteFill>
  );
};

/* --------------------------- экономика и цена ----------------------------- */

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
export const Econ: React.FC<SceneProps> = ({cue, enter}) => {
  const f = useCurrentFrame();
  const h5 = cue('5');
  const h20 = cue('20');
  const help = cue('помогают');
  const price = cue('Стоимость');
  const sale = cue('скидка');
  // фаза 1: неделя (5 блоков по часу) → месяц (4 недели = 20 ч) → блоки собираются в сигнал
  const weekX = SAFE;
  const gather = lerp(f, help - 4, help + 22, 0, 1, ease);
  const leave = lerp(f, price - 10, price + 14, 0, 1, ease);
  const card = lerp(f, help + 10, help + 30);
  const priceIn = spr(f, price, 15);
  const saleIn = spr(f, sale, 11, 180);
  return (
    <AbsoluteFill style={{background: C.bg, fontFamily: font, color: C.ink}}>
      {/* заголовок‑якорь */}
      <div style={{opacity: 1 - leave}}>
        <Head
          size={76}
          y={120}
          lines={[
            {t: 'Поиск точек роста вручную', at: enter + 4},
            {t: '— до 20 часов в месяц*', at: h20 + 8, color: C.blue},
          ]}
        />
      </div>
      {/* календарь часов */}
      <div style={{position: 'absolute', left: weekX, top: 360, opacity: 1 - leave}}>
        <div style={{display: 'flex', gap: 20, marginLeft: 170, marginBottom: 14, opacity: 1 - gather}}>
          {DAYS.map((d, i) => (
            <div key={d} style={{width: 190, fontSize: 26, color: C.gray, opacity: lerp(f, h5 - 20 + i * 2, h5 - 8 + i * 2)}}>
              {d}
            </div>
          ))}
        </div>
        {[0, 1, 2, 3].map((w) => (
          <div key={w} style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16}}>
            <div style={{width: 150, fontSize: 26, color: C.gray, opacity: (w === 0 ? lerp(f, h5 - 20, h5 - 8) : lerp(f, h20 - 6 + w * 4, h20 + 6 + w * 4)) * (1 - gather)}}>{w + 1}‑я неделя</div>
            {DAYS.map((d, i) => {
              const at = w === 0 ? h5 + i * 4 : h20 + w * 5 + i * 2;
              const p = spr(f, at, 14, 170);
              // к «помогают» блоки летят в карточку сигнала справа
              const k = w * 5 + i;
              const tx = gather * (900 - (170 + i * 210) - weekX + Math.sin(k) * 10);
              const ty = gather * (600 - (360 + 50 + w * 100));
              return (
                <div key={d} style={{width: 190, height: 84, borderRadius: 18, background: C.redBg, color: C.redText, fontSize: 26, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transform: `translate(${tx}px, ${ty}px) scale(${p * (1 - gather * 0.7)})`, opacity: 1 - gather * gather}}>
                  <Ico n="clock" size={24} color={C.redText} /> 1 ч
                </div>
              );
            })}
          </div>
        ))}
        <div style={{position: 'absolute', left: 1290, top: 40, whiteSpace: 'nowrap', opacity: lerp(f, h5 + 22, h5 + 34) * (1 - gather)}}>
          <div style={{fontSize: 30, color: C.gray}}>в неделю</div>
          <div style={{fontSize: 150, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05}}>
            {f < h20 + 8 ? '5 ч' : <CountUp from={5} to={20} at={h20 + 8} dur={26} suffix=" ч" />}
          </div>
          <div style={{fontSize: 30, color: C.gray, opacity: lerp(f, h20 + 8, h20 + 20)}}>в месяц</div>
        </div>
      </div>
      {/* сигнал вместо ручного поиска */}
      <div style={{position: 'absolute', left: SAFE, top: 380, width: 1624, opacity: card * (1 - leave), transform: `translateY(${(1 - card) * 30 - leave * 40}px)`}}>
        <div style={{fontSize: 32, color: C.gray, marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12}}>
          <AiIcon size={32} />
          Вместо этого — начать анализ с конкретного сигнала и его причины
        </div>
        <div style={{background: '#fff', borderRadius: 36, padding: '40px 48px', boxShadow: '0 24px 60px rgba(20,40,80,0.12)', display: 'flex', gap: 56}}>
          <div style={{flex: 1.25}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <Dot color={C.red} size={18} pulse={help + 20} />
              <span style={{fontSize: 44, fontWeight: 500, letterSpacing: -0.8}}>Валовая прибыль снизилась на 12%</span>
            </div>
            <div style={{fontSize: 24, color: C.gray, marginTop: 26}}>Возможная причина</div>
            <div style={{fontSize: 32, lineHeight: 1.35, marginTop: 6}}>
              Выросли закупочные цены в категориях <b>«Хлеб и выпечка»</b> и <b>«Снеки»</b>
            </div>
          </div>
          <div style={{flex: 1, borderLeft: `2px solid ${C.line}`, paddingLeft: 48}}>
            <div style={{fontSize: 24, color: C.gray}}>Что проверить</div>
            {['Цены у поставщиков', 'Условия закупки'].map((t, i) => (
              <div key={t} style={{display: 'flex', alignItems: 'center', gap: 16, fontSize: 32, marginTop: 18, opacity: lerp(f, help + 24 + i * 6, help + 34 + i * 6)}}>
                <div style={{width: 34, height: 34, borderRadius: 9, border: `3px solid ${C.blue}`, boxSizing: 'border-box'}} />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* цена: три модуля собираются в один модификатор */}
      <div style={{position: 'absolute', left: SAFE, top: 190, width: 1040, height: 720, background: '#fff', borderRadius: 40, boxShadow: '0 30px 80px rgba(20,40,80,0.12)', padding: '48px 56px', boxSizing: 'border-box', opacity: Math.min(1, priceIn * 1.4), transform: `translateY(${(1 - priceIn) * 60}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <AiIcon size={56} />
          <span style={{fontSize: 56, fontWeight: 500, letterSpacing: -1.2}}>ИИ Бизнес сигналы</span>
        </div>
        <div style={{fontSize: 30, color: C.gray, marginTop: 8, marginLeft: 74}}>Модификатор Контур.Маркета</div>
        {[
          {t: 'Аудит торговой точки', i: 'chart'},
          {t: 'Сверка с Честным знаком', i: 'shield'},
          {t: 'Сравнение с конкурентами', i: 'store'},
        ].map((m, i) => {
          const p = spr(f, price + 6 + i * 7, 14);
          return (
            <div key={m.t} style={{position: 'absolute', left: 56, right: 56, top: 220 + i * 104, height: 84, borderRadius: 22, background: C.page, display: 'flex', alignItems: 'center', gap: 20, padding: '0 22px', boxSizing: 'border-box', fontSize: 32, fontWeight: 500, opacity: Math.min(1, p * 1.5), transform: `translate(${(1 - p) * 760}px, ${(1 - p) * -40}px) rotate(${(1 - p) * 6}deg)`}}>
              <div style={{width: 56, height: 56, borderRadius: 16, background: C.mist, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Ico n={m.i} size={30} color={C.blue} sw={1.8} />
              </div>
              {m.t}
              <Ico n="check" size={32} color={C.blue} sw={2.4} style={{marginLeft: 'auto'}} />
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 56, bottom: 44, fontSize: 132, fontWeight: 700, letterSpacing: -4, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
          <CountUp from={0} to={22000} at={price + 24} dur={Math.max(12, cue('22') - price - 24)} suffix=" ₽" />
        </div>
      </div>
      <div style={{position: 'absolute', left: 1250, top: 430, transform: `scale(${saleIn}) rotate(${(1 - saleIn) * -8}deg)`, transformOrigin: 'left center'}}>
        <div style={{background: C.blue, color: '#fff', borderRadius: 36, padding: '30px 44px', fontFamily: font, boxShadow: '0 20px 50px rgba(34,145,255,0.35)'}}>
          <div style={{fontSize: 34, fontWeight: 500, color: C.onBlue}}>до 30 ноября</div>
          <div style={{fontSize: 76, fontWeight: 500, letterSpacing: -2, lineHeight: 1.05, whiteSpace: 'nowrap'}}>
            скидка до <CountUp from={0} to={32} at={cue('32') - 4} dur={12} suffix="%" />
          </div>
        </div>
      </div>
      <Sfx at={h5} name="tick" />
      <Sfx at={help + 6} name="whoosh" vol={0.7} />
      <Sfx at={help + 22} name="chime" />
      <Sfx at={price + 6} name="swipe" vol={0.5} />
      <Sfx at={price + 13} name="swipe" vol={0.4} />
      <Sfx at={price + 20} name="swipe" vol={0.4} />
      <Sfx at={sale} name="pop" vol={1.2} />
      <Footnote at={h20 + 20}>* Расчётный сценарий; не является гарантией эффекта или окупаемости. Стоимость и условия скидки уточняйте у менеджера Контур.Маркета.</Footnote>
    </AbsoluteFill>
  );
};

/* ---------------------------------- финал ---------------------------------- */

export const Cta: React.FC<SceneProps> = ({cue, dur}) => {
  const k = cue('оставляйте');
  const site = cue('сайте');
  return (
    <AbsoluteFill style={{background: C.blue, fontFamily: font}}>
      <Outro btnAt={k} click={k + 34} siteAt={site} logoAt={site + 20} sub hideCursor={dur - 20} />
    </AbsoluteFill>
  );
};
