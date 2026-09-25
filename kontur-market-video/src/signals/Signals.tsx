import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import timing from './timing.json';
import {SCENES, toFrames} from './scenes';
import {clamp} from './ui';

export const SIGNALS_TOTAL = toFrames(timing.total);

const Shell: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = Math.min(interpolate(frame, [0, 8], [0, 1], clamp), interpolate(frame, [dur - 8, dur], [1, 0], clamp));
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Signals: React.FC = () => (
  <AbsoluteFill style={{background: '#fff'}}>
    <Audio src={staticFile('signals/bed.wav')} volume={0.22} />
    {timing.scenes.map((s) => {
      const Scene = SCENES[s.id];
      const from = toFrames(s.start);
      const dur = toFrames(s.dur);
      const cues = s.cues as unknown as Record<string, number>;
      return (
        <Sequence key={s.id} from={from} durationInFrames={dur}>
          <Audio src={staticFile(`signals/vo/${s.id}.wav`)} startFrom={0} />
          <Shell dur={dur}>
            <Scene dur={dur} cue={(k) => toFrames(cues[k] ?? 0)} />
          </Shell>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
