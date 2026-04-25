import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '@/src/store/auth';
import { childStore } from '@/src/store/child';
import { journalStore } from '@/src/store/journal';
import { settingsStore } from '@/src/store/settings';
import { typography } from '@/src/theme/tokens';

type Props = {
  children: React.ReactNode;
};

const PRIMARY = '#E8876B';
const BG = '#FEFAF5';

export function HydrationGate({ children }: Props) {
  const [ready, setReady] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      authStore.hydrate(),
      childStore.hydrate(),
      journalStore.hydrate(),
      settingsStore.hydrate(),
    ]).then(() => {
      if (!mounted) return;
      // fade out splash before revealing content
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (mounted) setReady(true);
      });
    });
    return () => {
      mounted = false;
    };
  }, [opacity]);

  if (ready) return <>{children}</>;

  return (
    <Animated.View style={[styles.splash, { opacity }]}>
      <View style={styles.logoMark}>
        <Ionicons name="leaf" size={40} color="#FFFFFF" />
      </View>
      <Text style={[typography.title, styles.appName]}>Рост малыша</Text>
      <Text style={[typography.caption, styles.tagline]}>Wonder Weeks на русском</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    color: '#2C2420',
  },
  tagline: {
    color: '#9A8F87',
  },
});
