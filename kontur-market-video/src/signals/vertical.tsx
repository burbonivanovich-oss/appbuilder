import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {colors, font} from '../theme';
import {AuditScreen, CompScreen, CzScreen, HubScreen} from './real';
import {SceneProps, Spark} from './scenes';
import {Anchor, Footnote, GRAY, INK, Pill, RED, TILE, clamp, useAppear, usePop} from './ui';

/* Вертикальные (9:16, 1080×1920) версии сцен коротких роликов */

const W: React.CSSProperties = {background: '#fff'};

const Center: React.FC<{top: number; children: React.ReactNode; style?: React.CSSProperties}> = ({top, children, style}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', ...style}}>{children}</div>
);

export const IntroV: React.FC<SceneProps> = () => {
  const frame = useCurrentFrame();
  const m = usePop(6, 12);
  const ring = interpolate(frame, [4, 34], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const circle = 'M 540 360 A 200 200 0 1 1 539.9 360';
  const e = evolvePath(ring, circle);
  const title = useAppear(16, 20);
  const logo = useAppear(30);
  const chips = [
    {t: 'Аудит точки', x: 70, y: 330},
    {t: 'Честный Знак', x: 690, y: 300},
    {t: 'Конкуренты', x: 700, y: 700},
  ];
  return (
    <AbsoluteFill style={W}>
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <path d={circle} fill="none" stroke={colors.blue} strokeWidth={5} strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', left: 540 - 120, top: 440, transform: `scale(${m})`}}>
        <Spark size={240} rot={frame * 0.6} />
      </div>
      {chips.map((c, i) => (
        <div key={c.t} style={{position: 'absolute', left: c.x, top: c.y + Math.sin(frame / 18 + i) * 6, transform: `scale(${usePop(14 + i * 6, 13)})`}}>
          <Pill color={INK} bg={TILE} size={30}>{c.t}</Pill>
        </div>
      ))}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1000, textAlign: 'center', fontFamily: font, fontWeight: 700, fontSize: 132, lineHeight: 1.05, letterSpacing: -3, color: INK, clipPath: `inset(-10% ${(1 - title) * 50}% -10% ${(1 - title) * 50}%)`}}>
        ИИ Бизнес
        <br />
        сигналы
      </div>
      <Center top={1330} style={{alignItems: 'center', gap: 22, opacity: logo, transform: `translateY(${(1 - logo) * 20}px)`}}>
        <span style={{fontFamily: font, fontSize: 44, color: GRAY}}>от</span>
        <Img src={staticFile('logo-market-32.svg')} style={{height: 70}} />
      </Center>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{text: string}> = ({text}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: 90, display: 'flex', justifyContent: 'center', opacity: useAppear(4)}}>
    <Pill color="#fff" bg={colors.blue} size={40}>{text}</Pill>
  </div>
);

export const HubV: React.FC<SceneProps> = ({beats, dur}) => <HubScreen beats={beats} dur={dur} />;
export const AuditV: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <AuditScreen beats={beats} dur={dur} />
    <Tag text="Аудит торговой точки" />
  </AbsoluteFill>
);
export const CzV: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <CzScreen beats={beats.length >= 3 ? beats : [beats[0] ?? 6, (beats[0] ?? 6) + 30, dur * 0.6, dur * 0.75]} dur={dur} />
    <Tag text="Сверка с Честным Знаком" />
  </AbsoluteFill>
);
export const CompV: React.FC<SceneProps> = ({beats, dur}) => (
  <AbsoluteFill>
    <CompScreen beats={beats.length >= 2 ? [beats[0], beats[1], dur * 0.72] : [6, beats[0] ?? dur * 0.4, dur * 0.7]} dur={dur} />
    <Tag text="Сравнение с конкурентами" />
  </AbsoluteFill>
);

export const PriceV: React.FC<SceneProps> = ({cue}) => {
  const a = usePop(cue('22') - 4, 13);
  const b = usePop(cue('скидка'), 12);
  return (
    <AbsoluteFill style={W}>
      <Center top={140}>
        <div style={{fontFamily: font, fontSize: 64, fontWeight: 700, color: INK, opacity: useAppear(2)}}>ИИ Бизнес сигналы</div>
      </Center>
      <Center top={380}>
        <Spark size={300} />
      </Center>
      <Center top={820} style={{transform: `scale(${a})`}}>
        <div style={{textAlign: 'center', fontFamily: font}}>
          <div style={{fontSize: 40, color: GRAY}}>Модификатор Контур.Маркета</div>
          <div style={{fontSize: 190, fontWeight: 700, color: INK, letterSpacing: -6, lineHeight: 1.05}}>22 000 ₽</div>
        </div>
      </Center>
      <Center top={1160} style={{transform: `scale(${b})`}}>
        <div style={{background: colors.blue, color: '#fff', fontFamily: font, fontWeight: 500, fontSize: 52, lineHeight: 1.2, textAlign: 'center', padding: '28px 56px', borderRadius: 48}}>
          Скидка до 32%
          <br />— до 30 ноября
        </div>
      </Center>
    </AbsoluteFill>
  );
};

export const CtaV: React.FC<SceneProps> = ({cue}) => {
  const k = cue('оставляйте') || cue('Оставляйте');
  const btn = usePop(k + 4, 12);
  return (
    <AbsoluteFill style={{background: colors.blue}}>
      <div style={{position: 'absolute', left: 80, top: 220, fontFamily: font, fontSize: 52, fontWeight: 700, color: '#fff', opacity: useAppear(2)}}>ИИ Бизнес сигналы</div>
      <Anchor lines={[{text: 'Оставляйте', at: 8, color: '#fff'}, {text: 'заявку', at: 14, color: '#fff'}, {text: 'на сайте', at: 20, color: '#fff'}]} size={140} x={80} y={420} />
      <div style={{position: 'absolute', left: 80, top: 1020, display: 'flex', flexDirection: 'column', gap: 40, transform: `scale(${btn})`, transformOrigin: 'left center'}}>
        <div style={{background: '#fff', color: colors.blue, fontFamily: font, fontWeight: 700, fontSize: 52, padding: '30px 64px', borderRadius: 70, alignSelf: 'flex-start'}}>Оставить заявку</div>
        <div style={{fontFamily: font, fontSize: 52, color: '#fff'}}>kontur.ru/market</div>
      </div>
      <Img src={staticFile('logo-market-32.svg')} style={{position: 'absolute', left: 80, bottom: 120, height: 60, filter: 'brightness(0) invert(1)'}} />
    </AbsoluteFill>
  );
};

export const HookAuditV: React.FC<SceneProps> = ({cue}) => {
  const frame = useCurrentFrame();
  const pts = [0, 1, 2, 3, 4, 5].map((i) => [100 + i * 176, 1350 - [120, 180, 150, 210, 40, -120][i]]);
  const d = 'M ' + pts.map((p) => p.join(' ')).join(' L ');
  const e = evolvePath(interpolate(frame, [0, 40], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}), d);
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Прибыль', at: 2}, {text: 'изменилась.', at: 6}, {text: 'Почему?', at: cue('почему') - 6, color: colors.blue}]} size={130} x={80} y={260} />
      <svg width={1080} height={1920} style={{position: 'absolute'}}>
        <path d={d} fill="none" stroke={colors.blue} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={e.strokeDasharray} strokeDashoffset={e.strokeDashoffset} />
      </svg>
    </AbsoluteFill>
  );
};

export const HookCzV: React.FC<SceneProps> = ({cue, dur}) => {
  const chips = [['Срок годности истёк', RED, '#FDE8E8'], ['Не введён в оборот', RED, '#FDE8E8'], ['Долго на балансе', '#8A5A00', '#FFF3D6']];
  const a = cue('автоштрафы');
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'С 1 сентября 2026 —', at: 2}, {text: 'автоштрафы', at: a - 4, color: colors.blue}, {text: 'по данным', at: a, color: colors.blue}, {text: 'Честного Знака', at: a + 4, color: colors.blue}]} size={96} x={80} y={260} />
      <div style={{position: 'absolute', left: 80, top: 900, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'flex-start'}}>
        {chips.map(([t, c, bg], i) => (
          <div key={t} style={{transform: `scale(${usePop(14 + i * 8, 12)})`, transformOrigin: 'left center'}}>
            <Pill color={c} bg={bg} size={48}>{t}</Pill>
          </div>
        ))}
      </div>
      <Footnote at={dur - 50} text="Источник: Роспотребнадзор, разъяснение от 19.08.2026. Сверка помогает выявить риск, но не гарантирует отсутствие штрафов." />
    </AbsoluteFill>
  );
};

export const HookCompV: React.FC<SceneProps> = ({cue}) => {
  const tags = [['Ваш магазин', '100 ₽', true], ['Конкурент А', '115 ₽', false], ['Конкурент Б', '92 ₽', false]] as const;
  return (
    <AbsoluteFill style={W}>
      <Anchor lines={[{text: 'Где ваши цены', at: 2}, {text: 'выше рынка,', at: cue('выше') - 4, color: colors.blue}, {text: 'а где ниже?', at: cue('ниже') - 4, color: colors.blue}]} size={110} x={80} y={260} />
      <div style={{position: 'absolute', left: 80, right: 80, top: 900, display: 'flex', flexDirection: 'column', gap: 30}}>
        {tags.map(([n, p, us], i) => (
          <div key={n} style={{transform: `scale(${usePop(10 + i * 8, 12)})`, transformOrigin: 'left center', fontFamily: font, background: us ? colors.blue : TILE, color: us ? '#fff' : INK, borderRadius: 36, padding: '30px 44px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{fontSize: 40, opacity: 0.85}}>{n}</div>
            <div style={{fontSize: 90, fontWeight: 700}}>{p}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const CUT_SCENES_V: Record<string, React.FC<SceneProps>> = {
  intro: IntroV,
  hub: HubV,
  audit: AuditV,
  cz: CzV,
  comp: CompV,
  price: PriceV,
  cta: CtaV,
  'hook-audit': HookAuditV,
  'hook-cz': HookCzV,
  'hook-comp': HookCompV,
};
