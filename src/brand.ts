import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Фирменный шрифт Контура — Lab Grotesque (коммерческий). Inter — ближайшая открытая замена с кириллицей.
// Для финального рендера положите Lab Grotesque в public/fonts и поменяйте файлы ниже.
export const fontFamily = 'Inter';
for (const w of ['400', '600', '800']) {
  for (const s of ['cyrillic', 'latin']) {
    loadFont({family: fontFamily, url: staticFile(`fonts/inter-${s}-${w}-normal.woff2`), weight: w});
  }
}

// Цвета с kontur.ru/market и официальных SVG (s.kontur.ru/common-v2/logos/logo-market-32.svg)
export const C = {
  blue: '#2291FF', // цвет логотипа Маркета
  sky: '#51ADFF', // иконка продукта Маркет
  blueDark: '#0059C6',
  blueTint: '#E9F4FF',
  ink: '#222222', // графит знака Контура
  gray: '#8A8A8A',
  line: '#C4C4C4',
  light: '#F2F2F2',
  white: '#FFFFFF',
  good: '#1FAA5C',
};
