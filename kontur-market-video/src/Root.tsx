import {Composition, Folder} from 'remotion';
import './fonts';
import {KassaOFD, TOTAL} from './KassaOFD';
import {Vertical, V_TOTAL, verticalSchema} from './vertical/Vertical';
import {FPS} from './theme';

const segments = ['cafe', 'retail', 'services'] as const;

export const Root: React.FC = () => (
  <>
    <Composition id="KassaOFD" component={KassaOFD} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
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
