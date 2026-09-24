import React from 'react';
import {AbsoluteFill} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {slide} from '@remotion/transitions/slide';
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';
import {Alerts, Benefits, CTA, Dashboard, Hook, Intro, Kassa, ReceiptFlow} from './scenes';

const T = 15; // длительность перехода, кадров
const SCENES: [React.FC, number][] = [
  [Hook, 150],
  [Intro, 135],
  [Kassa, 195],
  [ReceiptFlow, 195],
  [Dashboard, 180],
  [Alerts, 150],
  [Benefits, 165],
  [CTA, 180],
];
const TRANSITIONS = [
  fade(),
  slide({direction: 'from-right'}),
  slide({direction: 'from-bottom'}),
  wipe({direction: 'from-left'}),
  slide({direction: 'from-right'}),
  fade(),
  slide({direction: 'from-bottom'}),
];

export const TOTAL = SCENES.reduce((a, [, d]) => a + d, 0) - T * TRANSITIONS.length;

export const KassaOFD: React.FC = () => (
  <AbsoluteFill style={{background: '#F6F7F9'}}>
    <TransitionSeries>
      {SCENES.map(([Scene, dur], i) => (
        <React.Fragment key={i}>
          <TransitionSeries.Sequence durationInFrames={dur}>
            <Scene />
          </TransitionSeries.Sequence>
          {i < TRANSITIONS.length && (
            <TransitionSeries.Transition
              presentation={TRANSITIONS[i] as never}
              timing={i % 2 ? springTiming({config: {damping: 200}, durationInFrames: T}) : linearTiming({durationInFrames: T})}
            />
          )}
        </React.Fragment>
      ))}
    </TransitionSeries>
  </AbsoluteFill>
);
