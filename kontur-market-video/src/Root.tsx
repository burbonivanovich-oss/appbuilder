import {Composition, Folder} from 'remotion';
import './fonts';
import {KassaOFD, TOTAL} from './KassaOFD';
import {Vertical, V_TOTAL, verticalSchema} from './vertical/Vertical';
import {FPS} from './theme';
import {Kit, KIT_TOTAL} from './kit/Kit';
import {Journey, JOURNEY_TOTAL} from './journey/Journey';
import {AutoPres, autoPresDuration, type Scenario, type Timing} from './autopres/AutoPres';
import ofdStats from './autopres/ofd-stats.json';
import {Signals, SIGNALS_TOTAL} from './signals/Signals';
import ofdStatsTiming from './autopres/ofd-stats.timing.json';

const segments = ['cafe', 'retail', 'services'] as const;

export const Root: React.FC = () => (
  <>
    <Composition id="KassaOFD" component={KassaOFD} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit" component={Kit} defaultProps={{voice: 'none' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit-xenia" component={Kit} defaultProps={{voice: 'xenia' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit-eugene" component={Kit} defaultProps={{voice: 'eugene' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Journey" component={Journey} durationInFrames={JOURNEY_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Signals" component={Signals} durationInFrames={SIGNALS_TOTAL} fps={FPS} width={1920} height={1080} />
    <Folder name="AutoPres">
      <Composition
        id="AutoPres-ofd-stats"
        component={AutoPres}
        defaultProps={{scenario: ofdStats as Scenario, timing: ofdStatsTiming as Timing, audio: 'autopres/ofd-stats.wav'}}
        durationInFrames={autoPresDuration(ofdStatsTiming as Timing)}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </Folder>
    <Folder name="Vertical">
      {segments.map((segment) => (
        <Composition
          key={segment}
          id={`Vertical-${segment}`}
          component={Vertical}
          schema={verticalSchema}
          defaultProps={{segment, cta: 'Попробовать бесплатно'}}
          durationInFrames={V_TOTAL}
          fps={FPS}
          width={1080}
          height={1920}
        />
      ))}
    </Folder>
  </>
);
