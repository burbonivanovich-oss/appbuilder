import {Composition, Folder} from 'remotion';
import './fonts';
import {KassaOFD, TOTAL} from './KassaOFD';
import {Vertical, V_TOTAL, verticalSchema} from './vertical/Vertical';
import {FPS} from './theme';
import {Kit, KIT_TOTAL} from './kit/Kit';
import {Journey, JOURNEY_TOTAL} from './journey/Journey';
import {AutoPres, autoPresDuration, type Scenario, type Timing} from './autopres/AutoPres';
import ofdStats from './autopres/ofd-stats.json';
import {Signals, signalsDuration} from './signals/Signals';
import ofdStatsTiming from './autopres/ofd-stats.timing.json';
import {SignalsV2, v2Duration, CHAPTERS} from './signals-v2/SignalsV2';

const segments = ['cafe', 'retail', 'services'] as const;

export const Root: React.FC = () => (
  <>
    <Composition id="KassaOFD" component={KassaOFD} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit" component={Kit} defaultProps={{voice: 'none' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit-xenia" component={Kit} defaultProps={{voice: 'xenia' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Kit-eugene" component={Kit} defaultProps={{voice: 'eugene' as const}} durationInFrames={KIT_TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Journey" component={Journey} durationInFrames={JOURNEY_TOTAL} fps={FPS} width={1920} height={1080} />
    <Folder name="Signals">
      {(['full', 'short30', 'module-audit', 'module-cz', 'module-comp'] as const).map((cut) => (
        <Composition key={cut} id={cut === 'full' ? 'Signals' : `Signals-${cut}`} component={Signals} defaultProps={{cut}} durationInFrames={signalsDuration(cut)} fps={FPS} width={1920} height={1080} />
      ))}
      {(['short30', 'module-audit', 'module-cz', 'module-comp'] as const).map((cut) => (
        <Composition key={`v-${cut}`} id={`Signals-${cut}-9x16`} component={Signals} defaultProps={{cut, vertical: true}} durationInFrames={signalsDuration(cut)} fps={FPS} width={1080} height={1920} />
      ))}
    </Folder>
    <Folder name="SignalsV2">
      <Composition id="SignalsV2" component={SignalsV2} defaultProps={{music: true}} durationInFrames={v2Duration()} fps={FPS} width={1920} height={1080} />
      <Composition id="SignalsV2-nomusic" component={SignalsV2} defaultProps={{music: false}} durationInFrames={v2Duration()} fps={FPS} width={1920} height={1080} />
      {CHAPTERS.map((c, i) => (
        <Composition key={c.id} id={`SignalsV2-part${i + 1}-${c.id}`} component={SignalsV2} defaultProps={{part: i + 1, music: true}} durationInFrames={v2Duration(i + 1)} fps={FPS} width={1920} height={1080} />
      ))}
    </Folder>
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
