import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/src/components/Screen';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

type Props = {
  step?: { current: number; total: number };
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function OnboardingShell({ step, eyebrow, title, subtitle, children, footer }: Props) {
  const t = useThemedTokens();
  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.header}>
          {step && (
            <View style={styles.dots}>
              {Array.from({ length: step.total }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i + 1 <= step.current ? t.primary : t.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}
          {eyebrow && (
            <Text style={[typography.captionStrong, { color: t.textSecondary }]}>
              {eyebrow.toUpperCase()}
            </Text>
          )}
          <Text style={[typography.hero, { color: t.textPrimary, marginTop: spacing.sm }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                typography.body,
                { color: t.textSecondary, marginTop: spacing.md, lineHeight: 22 },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.body}>{children}</View>

        {footer && <View style={styles.footer}>{footer}</View>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    gap: spacing.md,
  },
});
