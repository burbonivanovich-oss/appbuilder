import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type CardProps = ViewProps & {
  tone?: 'default' | 'soft' | 'accent';
  padding?: keyof typeof spacing;
};

export function Card({
  tone = 'default',
  padding = 'xl',
  style,
  children,
  ...rest
}: CardProps) {
  const t = useThemedTokens();

  const backgroundColor =
    tone === 'soft'
      ? t.surfaceAlt
      : tone === 'accent'
        ? t.primarySoft
        : t.surface;

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderColor: t.border,
    padding: spacing[padding],
  };

  return (
    <View style={[styles.card, cardStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
