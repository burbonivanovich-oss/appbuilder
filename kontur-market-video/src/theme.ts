// Цвета взяты из официальных ассетов kontur.ru (логотипы и иконки Маркета/ОФД).
export const colors = {
  blue: '#2291FF', // цвет «.Маркет» в логотипе и графиков в ОФД
  sky: '#51ADFF', // плашка иконки продукта Маркет / ОФД
  deep: '#0059C6', // тёмный акцент
  mist: '#EAF4FF', // светлая подложка
  ink: '#222222', // текст и «Контур» в логотипе
  gray: '#757575',
  bg: '#F6F7F9',
  white: '#FFFFFF',
  red: '#DE2038', // корпоративный красный Контура — только для редких акцентов
};
export const font = '"Lab Grotesque", "Inter", "Segoe UI", Arial, sans-serif';
export const site = 'kontur.ru/market';
export const phone = '8 800 500-10-26';
export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);
