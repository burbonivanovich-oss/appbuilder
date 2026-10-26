import React from 'react';
import type {SceneProps} from './SignalsV2';
import {Chain, Data, Intro, Modules, Owner, Trust} from './scenes-how';
import {Audit, Dupes, Fines, Market, Marking} from './scenes-modules';
import {Cta, Econ} from './scenes-final';

/* id сцены из timeline.json → компонент и тип входа (fade — растворение, cut — монтажная склейка) */
export const SCENES: Record<string, {C: React.FC<SceneProps>; tin?: 'fade' | 'cut'}> = {
  intro: {C: Intro},
  data: {C: Data},
  owner: {C: Owner},
  chain: {C: Chain, tin: 'cut'},
  trust: {C: Trust},
  modules: {C: Modules},
  audit: {C: Audit},
  dupes: {C: Dupes},
  marking: {C: Marking},
  fines: {C: Fines},
  market: {C: Market},
  econ: {C: Econ},
  cta: {C: Cta},
};
