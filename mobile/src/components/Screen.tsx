import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type ScreenProps = ViewProps & {
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({ style, edges, children, ...rest }: ScreenProps) {
  const t = useThemedTokens();
  return (
    <SafeAreaView
      edges={edges ?? ['top']}
      style={[styles.safe, { backgroundColor: t.bg }]}
    >
      <View style={[styles.container, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
});
