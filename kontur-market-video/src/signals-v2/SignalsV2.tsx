import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import timeline from './timeline.json';
import {C, clamp, s2f} from './kit';
import {Divider, EndCard, END_CARD} from './scenes-final';
import {SCENES} from './scenes';

/*
 * «ИИ Бизнес сигналы» v2. Ролик собран из глав (timeline.json ← scripts/signals-v2-build.py).
 * part = 1…5 — отдельная часть для сайта: глава + короткий финальный кадр с заявкой.
 */

export type SceneProps = {cue: (k: string) => number; dur: number; enter: number};
type Scene = {id: string; start: number; dur: number; cues: Record<string, number>; vo?: {at: number; dur: number}};
type Chapter = {id: string; title: string; start: number; dur: number; divider?: {light: string; title: string}; scenes: Scene[]};
const T = timeline as unknown as {total: number; chapters: Chapter[]};
export const CHAPTERS = T.chapters;

const OVERLAP = 12; // кадров, на которые сцена остаётся под следующей (для плавного перехода)
export const DIVIDER_IN = s2f(1.35); // когда перебивка уходит и появляется содержимое главы

export const v2Duration = (part?: number) => {
  if (!part) return s2f(T.total);
  const ch = T.chapters[part - 1];
  return s2f(ch.dur) + (part < T.chapters.length ? END_CARD : 0);
};

const Fade: React.FC<{len: number; on: boolean; children: React.ReactNode}> = ({len, on, children}) => {
  const f = useCurrentFrame();
  const o = on ? interpolate(f, [0, len], [0, 1], clamp) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const SignalsV2: React.FC<{part?: number; music?: boolean}> = ({part, music = true}) => {
  const chapters = part ? [T.chapters[part - 1]] : T.chapters;
  const t0 = s2f(chapters[0].start);
  const total = v2Duration(part);
  const fr = (s: number) => s2f(s) - t0;
  // интервалы голоса — для приглушения музыки
  const vo = chapters.flatMap((c) => c.scenes.filter((s) => s.vo).map((s) => [fr(s.start + s.vo!.at), fr(s.start + s.vo!.at + s.vo!.dur)]));
  const duck = (f: number) => {
    let d = 0;
    for (const [a, b] of vo) d = Math.max(d, Math.min(interpolate(f, [a - 9, a], [0, 1], clamp), interpolate(f, [b, b + 18], [1, 0], clamp)));
    return d;
  };
  const musicVol = (f: number) => {
    const fadeIn = interpolate(f, [0, 6], [0, 1], clamp);
    const fadeOut = interpolate(f, [total - (part ? 30 : 75), total], [1, 0], clamp);
    return (0.62 - 0.44 * duck(f)) * fadeIn * fadeOut;
  };
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {music && <Audio src={staticFile('signals-v2/music.wav')} startFrom={t0} volume={musicVol} />}
      {chapters.map((ch, ci) =>
        ch.scenes.map((s, si) => {
          const def = SCENES[s.id];
          const from = fr(s.start);
          const dur = fr(s.start + s.dur) - from;
          const first = si === 0 && !!ch.divider;
          const fadeIn = !first && !(ci === 0 && si === 0) && def.tin !== 'cut';
          const last = ci === chapters.length - 1 && si === ch.scenes.length - 1;
          return (
            <Sequence key={s.id} from={from} durationInFrames={dur + (last ? 0 : OVERLAP)} name={s.id}>
              <Fade len={OVERLAP} on={fadeIn}>
                <def.C dur={dur} enter={first ? DIVIDER_IN : 0} cue={(k) => (k in s.cues ? s2f(s.cues[k]) : Math.round(dur / 2))} />
              </Fade>
            </Sequence>
          );
        }),
      )}
      {chapters.map((ch) =>
        ch.scenes
          .filter((s) => s.vo)
          .map((s) => (
            <Sequence key={`vo-${s.id}`} from={fr(s.start + s.vo!.at)} durationInFrames={s2f(s.vo!.dur) + 6} name={`vo ${s.id}`}>
              <Audio src={staticFile(`signals-v2/vo/${s.id}.wav`)} />
            </Sequence>
          )),
      )}
      {chapters.map(
        (ch) =>
          ch.divider && (
            <Sequence key={`div-${ch.id}`} from={fr(ch.start)} durationInFrames={s2f(2)} name={`перебивка ${ch.id}`}>
              <Divider light={ch.divider.light} title={ch.divider.title} chapter={ch.id} />
            </Sequence>
          ),
      )}
      {part && part < T.chapters.length && (
        <Sequence from={total - END_CARD} durationInFrames={END_CARD} name="финальный кадр">
          <EndCard />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

