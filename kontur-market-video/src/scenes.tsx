import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {BrowserFrame, Chip, Counter, Headline, Icon, Logo, ProductBadge, SoftBackground, clamp, useSpring} from './components';
import {colors, font, phone, site} from './theme';

/* 1. Хук: хаос терминов вокруг вопроса */
const TERMS = ['54‑ФЗ', 'ОФД', 'Фискальный накопитель', 'Честный знак', 'ЕГАИС', 'Меркурий', 'Регистрация ККТ', 'Z‑отчёт', 'Маркировка'];
export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SoftBackground />
      {TERMS.map((t, i) => {
        const angle = (i / TERMS.length) * Math.PI * 2 + 0.3;
        const p = useSpring(i * 4, 12);
        const orbit = frame * 0.004;
        const rx = 720 + (i % 2) * 60;
        const ry = 380 + (i % 3) * 20;
        const x = Math.cos(angle + orbit) * rx * p;
        const y = Math.sin(angle + orbit) * ry * p;
        const tension = interpolate(frame, [80, 140], [0, 1], clamp);
        const jitter = Math.sin(frame * 1.7 + i) * 6 * tension;
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%,-50%) translate(${x + jitter}px, ${y}px) rotate(${Math.sin(i * 3) * 6}deg) scale(${0.6 + p * 0.4})`,
              opacity: p,
            }}
          >
            <Chip tone={i % 4 === 1 ? 'dark' : 'white'} size={36}>
              {t}
            </Chip>
          </div>
        );
      })}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <Headline text={'Открываете магазин\nили кофейню?'} size={120} align="center" delay={12} />
        <div style={{opacity: interpolate(frame, [70, 85], [0, 1], clamp), fontFamily: font, fontSize: 44, color: colors.gray, marginTop: 10}}>
          Касса, ОФД, госсистемы… с чего начать?
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 2. Знакомство: логотип и позиционирование */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useSpring(0, 11);
  const logo = useSpring(10, 16);
  const ring = interpolate(frame, [0, 30], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  return (
    <AbsoluteFill>
      <SoftBackground />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '34%',
          width: 900 * ring,
          height: 900 * ring,
          borderRadius: '50%',
          border: `3px solid ${colors.sky}`,
          opacity: 1 - ring,
          transform: 'translate(-50%,-50%)',
        }}
      />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 50}}>
        <div style={{transform: `scale(${badge}) rotate(${(1 - badge) * -20}deg)`}}>
          <ProductBadge file="market-24.svg" size={190} />
        </div>
        <div style={{opacity: logo, transform: `translateY(${(1 - logo) * 30}px)`}}>
          <Logo height={110} />
        </div>
        <Headline text="Кассы, учёт и госсистемы — без лишней рутины" size={58} weight={500} delay={30} stagger={2} align="center" highlight={['рутины']} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 3. Касса: реальное оборудование из каталога */
export const Kassa: React.FC = () => {
  const frame = useCurrentFrame();
  const dev = useSpring(5, 14);
  const float = Math.sin(frame / 18) * 12;
  const small = [
    {src: 'atol-optima.png', x: 1150, y: 880, d: 45},
    {src: 'atol-30f-1.png', x: 1480, y: 890, d: 52},
    {src: 'fn.png', x: 1790, y: 880, d: 60},
  ];
  const chips = [
    {t: 'Кассовое ПО', icon: 'market-register-classic', d: 50},
    {t: 'Учётная система', icon: 'delivery-box-iso', d: 60},
    {t: 'ОФД на 15 месяцев', icon: 'doc-arrow-sync', d: 70},
  ];
  return (
    <AbsoluteFill>
      <SoftBackground />
      <div style={{position: 'absolute', left: 120, top: 200, width: 800}}>
        <Chip tone="blue" size={30}>
          Шаг 1
        </Chip>
        <div style={{height: 30}} />
        <Headline text={'Касса под ваш\nбизнес — готовым\nкомплектом'} size={92} delay={5} highlight={['комплектом']} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 30}}>
          {chips.map((c) => {
            const p = useSpring(c.d, 15);
            return (
              <div key={c.t} style={{opacity: p, transform: `translateX(${(1 - p) * -60}px)`}}>
                <Chip size={36}>
                  <Icon name={c.icon} size={40} />
                  {c.t}
                </Chip>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1000,
          top: 180,
          width: 900,
          height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(81,173,255,0.45), rgba(81,173,255,0))',
        }}
      />
      <Img
        src={staticFile('mspos-f20-f.png')}
        style={{
          position: 'absolute',
          left: 980,
          top: 90,
          width: 880,
          transform: `translateX(${(1 - dev) * 500}px) translateY(${float}px) rotate(${(1 - dev) * 15 - 4}deg)`,
          opacity: dev,
          filter: 'drop-shadow(0 50px 50px rgba(20,60,120,0.25))',
        }}
      />
      {small.map((s) => {
        const p = useSpring(s.d, 13);
        return (
          <Img
            key={s.src}
            src={staticFile(s.src)}
            style={{
              position: 'absolute',
              left: s.x - 150,
              top: s.y - 95 + Math.sin((frame + s.d * 3) / 22) * 8,
              width: 280,
              opacity: p,
              transform: `scale(${p})`,
              filter: 'drop-shadow(0 20px 30px rgba(20,60,120,0.2))',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/* 4. Чек улетает в ОФД → ФНС и Честный знак */
export const ReceiptFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const print = interpolate(frame, [10, 55], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
  const fly = interpolate(frame, [70, 100], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const path = 'M 560 540 C 760 300, 1000 300, 1180 540';
  const path2 = 'M 1300 540 C 1450 380, 1560 330, 1680 330';
  const path3 = 'M 1300 540 C 1450 700, 1560 750, 1680 750';
  const line1 = evolvePath(interpolate(frame, [60, 100], [0, 1], clamp), path);
  const line2 = evolvePath(interpolate(frame, [100, 130], [0, 1], clamp), path2);
  const line3 = evolvePath(interpolate(frame, [105, 135], [0, 1], clamp), path3);
  const ofd = useSpring(40, 12);
  const dest1 = useSpring(125, 12);
  const dest2 = useSpring(132, 12);
  const items = [
    ['Капучино 0,3', '220,00'],
    ['Круассан', '150,00'],
    ['Молоко 3,2%', '96,00'],
  ];
  return (
    <AbsoluteFill>
      <SoftBackground />
      <div style={{position: 'absolute', top: 90, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Headline text="Чеки уходят в ФНС и Честный знак сами" size={74} align="center" highlight={['сами']} />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {[{p: path, l: line1}, {p: path2, l: line2}, {p: path3, l: line3}].map((o, i) => (
          <path key={i} d={o.p} fill="none" stroke={colors.blue} strokeWidth={6} strokeLinecap="round" strokeDasharray={o.l.strokeDasharray} strokeDashoffset={o.l.strokeDashoffset} />
        ))}
      </svg>
      {/* чек */}
      <div
        style={{
          position: 'absolute',
          left: 260,
          top: 300,
          width: 480,
          background: colors.white,
          borderRadius: 20,
          padding: '36px 40px',
          fontFamily: font,
          fontSize: 28,
          color: colors.ink,
          boxShadow: '0 40px 80px rgba(20,60,120,0.18)',
          clipPath: `inset(0 0 ${(1 - print) * 100}% 0 round 20px)`,
          transform: `translate(${fly * 820}px, ${-fly * 60}px) scale(${1 - fly * 0.85}) rotate(${fly * 25}deg)`,
          opacity: 1 - interpolate(fly, [0.7, 1], [0, 1], clamp),
        }}
      >
        <div style={{fontWeight: 700, fontSize: 32, marginBottom: 24}}>Кассовый чек</div>
        {items.map(([n, p]) => (
          <div key={n} style={{display: 'flex', justifyContent: 'space-between', marginBottom: 12}}>
            <span>{n}</span>
            <span>{p}</span>
          </div>
        ))}
        <div style={{borderTop: `2px dashed #C4C4C4`, margin: '20px 0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 36}}>
          <span>Итого</span>
          <span>466,00 ₽</span>
        </div>
        <div style={{color: colors.gray, fontSize: 22}}>ФД № 1024 · ФПД 3826415907</div>
      </div>
      {/* ОФД */}
      <div style={{position: 'absolute', left: 1240, top: 540, transform: `translate(-50%,-50%) scale(${ofd})`, textAlign: 'center'}}>
        <ProductBadge file="ofd-24.svg" size={170} />
        <div style={{marginTop: 20}}>
          <Logo file="logo-ofd-32.svg" height={52} />
        </div>
      </div>
      {[
        {t: 'ФНС', y: 330, s: dest1},
        {t: 'Честный знак', y: 750, s: dest2},
      ].map((d) => (
        <div key={d.t} style={{position: 'absolute', left: 1700, top: d.y, transform: `translateY(-50%) scale(${d.s})`, transformOrigin: 'left center'}}>
          <Chip size={40}>
            <Icon name="check-circle-cut" size={44} />
            {d.t}
          </Chip>
        </div>
      ))}
    </AbsoluteFill>
  );
};

/* 5. Аналитика продаж в ОФД — реальный интерфейс */
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useSpring(0, 18);
  const zoom = interpolate(frame, [0, 180], [1, 1.12], clamp);
  const pan = interpolate(frame, [0, 180], [0, -60], clamp);
  const card = useSpring(55, 14);
  return (
    <AbsoluteFill>
      <SoftBackground />
      <div style={{position: 'absolute', left: 110, top: 110, width: 700}}>
        <Headline text={'Выручка\nи средний чек —\nонлайн'} size={72} highlight={['онлайн']} />
        <div style={{fontFamily: font, fontSize: 36, color: colors.gray, marginTop: 10, opacity: interpolate(frame, [20, 35], [0, 1], clamp)}}>
          В личном кабинете и в приложении
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 760,
          top: 150,
          transformOrigin: 'left top',
          transform: `translateY(${(1 - enter) * 300 + pan}px) scale(${zoom}) perspective(2000px) rotateY(${(1 - enter) * -18 - 4}deg)`,
          opacity: enter,
        }}
      >
        <BrowserFrame src="ofd-demo.png" width={1260} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 560,
          opacity: card,
          transform: `translateY(${(1 - card) * 80}px)`,
          background: colors.white,
          borderRadius: 32,
          padding: '40px 50px',
          boxShadow: '0 40px 100px rgba(20,60,120,0.2)',
          fontFamily: font,
          width: 560,
        }}
      >
        <div style={{fontSize: 30, color: colors.gray}}>Выручка сегодня, ₽</div>
        <div style={{fontSize: 96, fontWeight: 700, color: colors.ink, letterSpacing: -2}}>
          <Counter to={48250} delay={60} dur={50} />
        </div>
        <div style={{display: 'flex', gap: 16, marginTop: 10}}>
          <Chip tone="blue" size={28}>
            ▲ 12% к прошлой неделе
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* 6. Уведомления о ФН и работе кассы */
export const Alerts: React.FC = () => {
  const frame = useCurrentFrame();
  const shot = useSpring(0, 18);
  const pushes = [
    {t: 'Срок ФН истекает через 30 дней', d: 35},
    {t: 'Касса не передаёт чеки 3 дня', d: 60},
    {t: 'ФНС приняла все документы ✓', d: 85},
  ];
  return (
    <AbsoluteFill>
      <SoftBackground />
      <div style={{position: 'absolute', left: 1040, top: 110}}>
        <Headline text={'Напомним, когда\nпора менять ФН'} size={82} highlight={['ФН']} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 40}}>
          {pushes.map((p) => {
            const s = useSpring(p.d, 13);
            return (
              <div
                key={p.t}
                style={{
                  opacity: s,
                  transform: `translateX(${(1 - s) * 120}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  background: colors.white,
                  borderRadius: 28,
                  padding: '24px 32px',
                  width: 760,
                  boxShadow: '0 20px 60px rgba(20,60,120,0.14)',
                  fontFamily: font,
                }}
              >
                <ProductBadge file="ofd-24.svg" size={64} />
                <div>
                  <div style={{fontSize: 22, color: colors.gray}}>Контур.ОФД · сейчас</div>
                  <div style={{fontSize: 34, fontWeight: 500, color: colors.ink}}>{p.t}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Img
        src={staticFile('ofd-card-1.png')}
        style={{
          position: 'absolute',
          left: 60,
          top: 40,
          width: 960,
          WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 99%)',
          opacity: shot,
          transform: `translateX(${(1 - shot) * -200}px) translateY(${Math.sin(frame / 25) * 8}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/* 7. Почему Контур */
export const Benefits: React.FC = () => {
  const cards = [
    {big: '1 день', small: 'и можно торговать', icon: 'check-circle-cut'},
    {big: '24/7', small: 'техподдержка, даже в праздники', icon: 'people-3'},
    {big: 'По закону', small: 'сервис обновляется сам', icon: 'security-shield'},
  ];
  return (
    <AbsoluteFill>
      <SoftBackground tone="blue" />
      <AbsoluteFill style={{padding: '140px 120px', flexDirection: 'column', gap: 80}}>
        <Headline text="Законодательство без тревог" size={96} color={colors.white} />
        <div style={{display: 'flex', gap: 40}}>
          {cards.map((c, i) => {
            const p = useSpring(15 + i * 10, 13);
            return (
              <div
                key={c.big}
                style={{
                  flex: 1,
                  background: colors.white,
                  borderRadius: 40,
                  padding: '50px 50px 60px',
                  fontFamily: font,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 150}px) rotate(${(1 - p) * (i - 1) * 6}deg)`,
                  boxShadow: '0 40px 100px rgba(0,40,100,0.3)',
                }}
              >
                <div style={{width: 90, height: 90, borderRadius: 24, background: colors.mist, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name={c.icon} size={52} />
                </div>
                <div style={{fontSize: 84, fontWeight: 700, color: colors.blue, marginTop: 40, whiteSpace: 'nowrap', letterSpacing: -2}}>{c.big}</div>
                <div style={{fontSize: 38, color: colors.ink, marginTop: 8}}>{c.small}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* 8. Призыв к действию */
export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useSpring(0, 14);
  const btn = useSpring(25, 10);
  const pulse = 1 + Math.max(0, Math.sin((frame - 40) / 7)) * 0.03;
  return (
    <AbsoluteFill>
      <SoftBackground />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 44}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 40, opacity: logo, transform: `scale(${0.8 + logo * 0.2})`}}>
          <ProductBadge file="market-24.svg" size={150} />
          <Logo height={120} />
        </div>
        <Headline text="Торгуйте. Рутину возьмём на себя" size={64} weight={500} align="center" delay={10} highlight={['Рутину']} />
        <div
          style={{
            transform: `scale(${btn * pulse})`,
            background: colors.blue,
            color: colors.white,
            fontFamily: font,
            fontWeight: 500,
            fontSize: 54,
            padding: '34px 80px',
            borderRadius: 24,
            boxShadow: '0 30px 70px rgba(34,145,255,0.45)',
          }}
        >
          Попробовать бесплатно
        </div>
        <div style={{fontFamily: font, fontSize: 44, color: colors.ink, opacity: interpolate(frame, [45, 60], [0, 1], clamp), display: 'flex', gap: 50}}>
          <span style={{fontWeight: 700}}>{site}</span>
          <span style={{color: colors.gray}}>{phone}</span>
        </div>
      </AbsoluteFill>
      <div style={{position: 'absolute', bottom: 50, width: '100%', textAlign: 'center', opacity: interpolate(frame, [60, 75], [0, 1], clamp)}}>
        <Logo file="logo-kontur-32.svg" height={44} />
      </div>
    </AbsoluteFill>
  );
};
