import {Composition} from 'remotion';
import './fonts';
import {KassaOFD, TOTAL} from './KassaOFD';
import {FPS} from './theme';

export const Root: React.FC = () => (
  <Composition id="KassaOFD" component={KassaOFD} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
);
