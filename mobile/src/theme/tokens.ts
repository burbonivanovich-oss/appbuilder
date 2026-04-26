export type Theme = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

const light: Theme = {
  bg: '#FEFAF5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6EFE6',
  border: '#EDE4DA',
  textPrimary: '#2C2420',
  textSecondary: '#6F6661',
  textMuted: '#9A8F87',
  primary: '#E8876B',
  primarySoft: '#FADFD1',
  secondary: '#8FAF99',
  secondarySoft: '#D7E5D9',
  accent: '#E8B86B',
  success: '#7BA68E',
  warning: '#E8B86B',
  error: '#D97878',
  tabIconDefault: '#9A8F87',
  tabIconSelected: '#E8876B',
};

const dark: Theme = {
  bg: '#1A1614',
  surface: '#25201C',
  surfaceAlt: '#2F2925',
  border: '#3A322D',
  textPrimary: '#F4EDE4',
  textSecondary: '#C4B9B0',
  textMuted: '#958B83',
  primary: '#F4A588',
  primarySoft: '#3F2E26',
  secondary: '#A5C4AD',
  secondarySoft: '#2A342D',
  accent: '#F0C482',
  success: '#8FB89E',
  warning: '#F0C482',
  error: '#E09090',
  tabIconDefault: '#887E76',
  tabIconSelected: '#F4A588',
};

// Raised from #887E76 to meet WCAG AA (≥4.5:1) on dark bg
// #887E76 on #1A1614 ≈ 3.5:1 — acceptable only for decorative text

export const colors = { light, dark } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  captionStrong: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
} as const;

export const shadows = {
  sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg: { shadowColor: '#000', shadowOpacity: 0.20, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

export const animation = {
  duration: {
    fast: 150,
    normal: 220,
    slow: 350,
  },
  easing: 'ease-out',
} as const;

// SF Pro Rounded on iOS (ui-rounded) — warmer, friendlier than default SF Pro
// Applied to all text elements for consistent warm tone
import { Platform } from 'react-native';
export const fontFamily = Platform.select({
  ios: 'ui-rounded',
  android: 'sans-serif',
  default: 'system-ui',
}) as string;

export function getTheme(scheme: 'light' | 'dark' | null | undefined): Theme {
  return scheme === 'dark' ? colors.dark : colors.light;
}
