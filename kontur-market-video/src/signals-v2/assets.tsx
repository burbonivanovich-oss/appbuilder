import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction} from 'remotion';
import {AssetCtx, AssetMode, Caption, s2f} from './kit';
import {MarketWindow, SignalCard, WIN_H, WIN_W} from './market-ui';
import {HomePage, HubPage} from './scenes-how';
import {Divider, END_CARD, EndCard} from './scenes-final';
import {SCENES} from './scenes';
import {CHAPTERS, DIVIDER_IN} from './SignalsV2';

/*
 * Композиции для пакета ассетов (scripts/signals-v2-assets.mjs):
 *  SignalsV2-scene — одна сцена ролика в режиме ассета (окно / вынесенные элементы / графика без фона / как в ролике);
 *  SignalsV2-asset — отдельный элемент: экран, карточка сигнала, перебивка, подпись.
 */

const SCENE_LIST = CHAPTERS.flatMap((c) => c.scenes.map((s, i) => ({...s, enter: i === 0 && c.divider ? DIVIDER_IN : 0})));

export type SceneAssetProps = {scene: string; mode: AssetMode};
export const SceneAsset: React.FC<SceneAssetProps> = ({scene, mode}) => {
  const s = SCENE_LIST.find((x) => x.id === scene)!;
  const Def = SCENES[scene].C;
  const dur = s2f(s.dur);
  return (
    <AssetCtx.Provider value={mode}>
      <AbsoluteFill>
        <Def dur={dur} enter={s.enter} cue={(k) => (k in s.cues ? s2f(s.cues[k]) : Math.round(dur / 2))} />
      </AbsoluteFill>
    </AssetCtx.Provider>
  );
};
export const sceneAssetMeta: CalculateMetadataFunction<SceneAssetProps> = ({props}) => {
  const s = SCENE_LIST.find((x) => x.id === props.scene)!;
  const win = props.mode === 'window';
  return {durationInFrames: s2f(s.dur), width: win ? WIN_W : 1920, height: win ? WIN_H : 1080};
};

const box = (w: number, h: number, node: React.ReactNode) => ({w, h, node});
const card = (tone: 'red' | 'orange' | 'blue', title: string, module: string) =>
  box(800, 220, (
    <div style={{position: 'absolute', left: 40, top: 40}}>
      <SignalCard tone={tone} title={title} module={module} w={720} />
    </div>
  ));
const DIV = Object.fromEntries(CHAPTERS.filter((c) => c.divider).map((c) => [`divider-${c.id}`, box(1920, 1080, <Divider light={c.divider!.light} title={c.divider!.title} chapter={c.id} />)]));

export const ASSETS: Record<string, {w: number; h: number; node: React.ReactNode; mode?: AssetMode}> = {
  'ui-home': {
    ...box(WIN_W, WIN_H, (
      <MarketWindow active="home">
        <HomePage t={999} at={0} hl={1e9} />
      </MarketWindow>
    )),
    mode: 'window',
  },
  'ui-hub': {
    ...box(WIN_W, WIN_H, (
      <MarketWindow active="ai">
        <HubPage t={999} />
      </MarketWindow>
    )),
    mode: 'window',
  },
  'signal-card-audit': card('red', 'Валовая прибыль снизилась на 12%', 'Аудит торговой точки'),
  'signal-card-cz': card('orange', 'У 98 товаров истекает срок годности', 'Сверка с Честным знаком'),
  'signal-card-comp': card('blue', '13 товаров дороже рынка', 'Сравнение с конкурентами'),
  'caption': box(1920, 160, <Caption force items={[{at: 0, text: 'Сигнал:', light: 'прибыль снизилась на 12%'}]} />),
  ...DIV,
  endcard: box(1920, 1080, <EndCard />),
};
export const ASSET_FRAMES = {divider: 30, endcard: END_CARD - 4};

export type AssetSheetProps = {id: string};
export const AssetSheet: React.FC<AssetSheetProps> = ({id}) => {
  const a = ASSETS[id];
  return (
    <AssetCtx.Provider value={a.mode ?? 'off'}>
      <AbsoluteFill>{a.node}</AbsoluteFill>
    </AssetCtx.Provider>
  );
};
export const assetSheetMeta: CalculateMetadataFunction<AssetSheetProps> = ({props}) => ({width: ASSETS[props.id].w, height: ASSETS[props.id].h, durationInFrames: 120});
