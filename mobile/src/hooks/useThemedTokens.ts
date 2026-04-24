import { useColorScheme } from 'react-native';
import { getTheme, type Theme } from '@/src/theme/tokens';

export function useThemedTokens(): Theme {
  const scheme = useColorScheme();
  return getTheme(scheme);
}
