import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { buildLeapHero } from '@/src/lib/leapHero';
import type { TodaySnapshot } from '@/src/lib/leaps';

type Props = {
  snapshot: TodaySnapshot;
  onPress?: () => void;
};

export function LeapHeroCard({ snapshot, onPress }: Props) {
  const t = useThemedTokens();
  const content = buildLeapHero(snapshot);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: content.accent ? t.primarySoft : t.surface,
          borderColor: content.accent ? t.primary : t.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.textSecondary }]}>{content.label}</Text>
      <Text style={[styles.title, typography.title, { color: t.textPrimary }]}>
        {content.title}
      </Text>
      {content.subtitle && (
        <Text style={[styles.subtitle, typography.body, { color: t.textSecondary }]}>
          {content.subtitle}
        </Text>
      )}
      {content.progress !== undefined && (
        <View style={[styles.progressTrack, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: t.primary, width: `${Math.round(content.progress * 100)}%` },
            ]}
          />
        </View>
      )}
      {content.cta && (
        <Text style={[styles.cta, { color: t.primary }]}>{content.cta} →</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  progressTrack: {
    marginTop: spacing.md,
    height: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  cta: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
});
