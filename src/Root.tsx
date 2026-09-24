import {Composition} from 'remotion';
import {MarkPromo, TOTAL} from './MarkPromo';

export const Root = () => (
  <>
    <Composition id="MarkPromo" component={MarkPromo} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="MarkPromoVertical" component={MarkPromo} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
  </>
);
