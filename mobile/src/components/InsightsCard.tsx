import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { computeWeeklyInsights, formatInsightsText } from '@/src/lib/insights';
import { useJournal } from '@/src/store/journal';

/**
 * Soft, non-judgemental summary of the last 7 days. Hides itself entirely
 * when there's nothing to report.
 */
export function InsightsCard() {
  const t = useThemedTokens();
  const entries = useJournal();
  const insights = useMemo(() => computeWeeklyInsights(entries), [entries]);

  if (!insights) return null;

  const text = formatInsightsText(insights);

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={20} color={t.primary} />
        <Text style={[typography.captionStrong, { color: t.textSecondary, letterSpacing: 0.5 }]}>
          ЗА 7 ДНЕЙ
        </Text>
      </View>
      <Text style={[typography.bodyStrong, { color: t.textPrimary, marginTop: spacing.sm }]}>
        {text.entriesLine}
      </Text>
      <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}>
        {text.fussyLine}
      </Text>
      {text.topSymptomLine && (
        <View style={[styles.tag, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
          <Ionicons name="trending-up-outline" size={14} color={t.textSecondary} />
          <Text style={[typography.caption, { color: t.textSecondary }]}>
            {text.topSymptomLine}
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
