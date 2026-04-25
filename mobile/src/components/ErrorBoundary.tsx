import { Component, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { track } from '@/src/lib/analytics';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

const PRIMARY = '#E8876B';
const BG = '#FEFAF5';
const TEXT_PRIMARY = '#2C2420';
const TEXT_SECONDARY = '#6F6661';
const SURFACE = '#FFFFFF';
const BORDER = '#EDE4DA';

/**
 * Catches render-phase errors anywhere in the tree below it and shows a
 * friendly recovery screen rather than a white blank. Two recovery paths:
 * "Try again" (just clears the error and re-renders) and "Reset data"
 * (wipes AsyncStorage and reloads — last resort for corrupted state).
 *
 * Has to be a class component: componentDidCatch / getDerivedStateFromError
 * have no hook equivalent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    track('crash_caught', {
      message: error.message.slice(0, 200),
      stack: (info.componentStack ?? '').slice(0, 500),
    });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] caught:', error, info);
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  private handleReset = async () => {
    try {
      await AsyncStorage.clear();
    } catch {
      // ignore — best effort
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={32} color={PRIMARY} />
          </View>
          <Text style={[typography.title, styles.title]}>Что-то пошло не так</Text>
          <Text style={[typography.body, styles.body]}>
            Приложение поймало ошибку и не показало экран. Ваши данные на месте — попробуйте
            ещё раз.
          </Text>
          {__DEV__ && (
            <View style={styles.debugBox}>
              <Text style={[typography.captionStrong, styles.debugLabel]}>DEV: ошибка</Text>
              <Text style={[typography.caption, styles.debugText]} numberOfLines={6}>
                {this.state.error.message}
              </Text>
            </View>
          )}
          <View style={styles.buttons}>
            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => [
                styles.btn,
                styles.primaryBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>Попробовать снова</Text>
            </Pressable>
            <Pressable
              onPress={this.handleReset}
              style={({ pressed }) => [
                styles.btn,
                styles.secondaryBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[typography.body, { color: TEXT_SECONDARY }]}>
                Сбросить локальные данные
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: '#FADFD1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    color: TEXT_PRIMARY,
    marginTop: spacing.sm,
  },
  body: {
    color: TEXT_SECONDARY,
  },
  debugBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  debugLabel: {
    color: TEXT_SECONDARY,
    marginBottom: spacing.xs,
  },
  debugText: {
    color: TEXT_PRIMARY,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  buttons: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  btn: {
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BORDER,
  },
});
