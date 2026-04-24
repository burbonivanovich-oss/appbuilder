import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { LeapTimeline } from '@/src/components/LeapTimeline';
import { Card } from '@/src/components/Card';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useChildRequired } from '@/src/store/child';
import { computeLeapStates } from '@/src/lib/leaps';

export default function CalendarScreen() {
  const t = useThemedTokens();
  const child = useChildRequired();
  const states = useMemo(() => computeLeapStates(child.expectedDob), [child.expectedDob]);

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.caption, { color: t.textSecondary }]}>Календарь</Text>
          <Text style={[typography.title, { color: t.textPrimary }]}>
            10 скачков роста
          </Text>
          <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}>
            Даты рассчитаны от ПДР малыша. Отклонение ±1 неделя — это норма.
          </Text>
        </View>

        <Card tone="soft">
          <Text style={[typography.caption, { color: t.textSecondary }]}>Легенда</Text>
          <View style={styles.legendRow}>
            <LegendItem color={t.primary} label="Идёт сейчас" />
            <LegendItem color={t.secondary} label="Завершён" />
            <LegendItem color={t.border} label="Впереди" />
          </View>
        </Card>

        <LeapTimeline
          states={states}
          onSelect={(n) => router.push(`/leap/${n}` as any)}
        />

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const t = useThemedTokens();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[typography.caption, { color: t.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
