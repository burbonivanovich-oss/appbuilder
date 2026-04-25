import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { authStore } from '@/src/store/auth';
import { childStore } from '@/src/store/child';
import { journalStore } from '@/src/store/journal';
import { settingsStore } from '@/src/store/settings';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type Props = {
  children: React.ReactNode;
};

export function HydrationGate({ children }: Props) {
  const t = useThemedTokens();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      authStore.hydrate(),
      childStore.hydrate(),
      journalStore.hydrate(),
      settingsStore.hydrate(),
    ]).then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={[styles.splash, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
