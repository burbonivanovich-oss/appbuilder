import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { pluralRu } from '@/src/lib/date';
import { computeWeeklyInsights } from '@/src/lib/insights';
import { SYMPTOM_LABEL, useJournal } from '@/src/store/journal';

/**
 * Soft, non-judgemental summary of the last 7 days. Hides itself entirely
 * when there's nothing to report.
 */
export function InsightsCard() {
  const t = useThemedTokens();
  const entries = useJournal();
  const insights = useMemo(() => computeWeeklyInsights(entries), [entries]);

  if (!insights) return null;

  const entriesLine = `${insights.totalEntries} ${pluralRu(insights.totalEntries, [
    'запись',
    'записи',
    'записей',
  ])} за ${insights.daysCovered} ${pluralRu(insights.daysCovered, [
    'день',
    'дня',
    'дней',
  ])}`;

  const fussyLine =
    insights.fussyDays > 0
      ? `Из них ${insights.fussyDays} ${pluralRu(insights.fussyDays, [
          'беспокойный день',
          'беспокойных дня',
          'беспокойных дней',
        ])} — это нормально, малыши не машины.`
      : 'Спокойная неделя — здорово.';

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={20} color={t.primary} />
        <Text style={[typography.captionStrong, { color: t.textSecondary, letterSpacing: 0.5 }]}>
          ЗА 7 ДНЕЙ
        </Text>
      </View>
      <Text style={[typography.bodyStrong, { color: t.textPrimary, marginTop: spacing.sm }]}>
        {entriesLine}
      </Text>
      <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}>
        {fussyLine}
      </Text>
      {insights.topSymptom && (
        <View style={[styles.tag, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
          <Ionicons name="trending-up-outline" size={14} color={t.textSecondary} />
          <Text style={[typography.caption, { color: t.textSecondary }]}>
            Чаще всего: {SYMPTOM_LABEL[insights.topSymptom.symptom].toLowerCase()} (
            {insights.topSymptom.count})
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tag: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
});
