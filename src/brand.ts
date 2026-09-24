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

// Цвета сняты с kontur.ru/market
export const C = {
  red: '#DE2038', // фирменный красный Контура
  blue: '#2291FF', // акцент Маркета
  blueDark: '#0059C6',
  ink: '#1F1F1F',
  gray: '#C4C4C4',
  light: '#ECECEC',
  white: '#FFFFFF',
};
