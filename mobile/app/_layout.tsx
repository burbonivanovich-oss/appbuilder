import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { HydrationGate } from '@/src/components/HydrationGate';
import { RouteGuard } from '@/src/components/RouteGuard';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <HydrationGate>
        <RouteGuard>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen
              name="leap/[number]"
              options={{ presentation: 'modal', title: 'Скачок' }}
            />
            <Stack.Screen
              name="journal/new"
              options={{ presentation: 'modal', title: 'Новая запись' }}
            />
          </Stack>
        </RouteGuard>
      </HydrationGate>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
