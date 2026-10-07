import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import fullTiming from './timing.json';
import short30 from './cuts/short30.timing.json';
import mAudit from './cuts/module-audit.timing.json';
import mCz from './cuts/module-cz.timing.json';
import mComp from './cuts/module-comp.timing.json';
import {CUT_SCENES, SCENES, SceneProps, toFrames} from './scenes';
import {clamp} from './ui';

type Timing = {total: number; scenes: {id: string; start: number; dur: number; vo: number; cues: Record<string, number>}[]};
export type SignalsProps = {cut: 'full' | 'short30' | 'module-audit' | 'module-cz' | 'module-comp'};

const CUTS: Record<SignalsProps['cut'], {timing: Timing; vo: string; scenes: Record<string, React.FC<SceneProps>>}> = {
  full: {timing: fullTiming as unknown as Timing, vo: 'signals/vo', scenes: SCENES},
  short30: {timing: short30 as unknown as Timing, vo: 'signals/vo-short30', scenes: CUT_SCENES},
  'module-audit': {timing: mAudit as unknown as Timing, vo: 'signals/vo-module-audit', scenes: CUT_SCENES},
  'module-cz': {timing: mCz as unknown as Timing, vo: 'signals/vo-module-cz', scenes: CUT_SCENES},
  'module-comp': {timing: mComp as unknown as Timing, vo: 'signals/vo-module-comp', scenes: CUT_SCENES},
};
export const signalsDuration = (cut: SignalsProps['cut']) => toFrames(CUTS[cut].timing.total);
export const SIGNALS_TOTAL = signalsDuration('full');

const Shell: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [0, 8], [0, 1], clamp), interpolate(frame, [dur - 8, dur], [1, 0], clamp));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Signals: React.FC<SignalsProps> = ({cut}) => {
  const {timing, vo, scenes} = CUTS[cut];
  const total = toFrames(timing.total);
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <Audio src={staticFile('signals/bed.wav')} volume={(f) => 0.22 * interpolate(f, [total - 45, total], [1, 0], clamp)} />
      {timing.scenes.map((s) => {
        const Scene = scenes[s.id];
        const from = toFrames(s.start);
        const dur = toFrames(s.dur);
        const cues = s.cues;
        const beats = Object.values(cues).map(toFrames);
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur}>
            {s.vo > 0 && <Audio src={staticFile(`${vo}/${s.id}.wav`)} />}
            <Shell dur={dur}>
              <Scene dur={dur} beats={beats} cue={(k) => toFrames(cues[k] ?? 0)} />
            </Shell>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
