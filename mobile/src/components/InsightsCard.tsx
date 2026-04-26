import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { PaywallSheet } from '@/src/components/PaywallSheet';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { computeWeeklyInsights, formatInsightsText } from '@/src/lib/insights';
import { useJournal } from '@/src/store/journal';
import { useIsPremium } from '@/src/store/settings';

/**
 * Soft, non-judgemental summary of the last 7 days. Hides itself entirely
 * when there's nothing to report.
 */
export function InsightsCard() {
  const t = useThemedTokens();
  const entries = useJournal();
  const isPremium = useIsPremium();
  const [paywallVisible, setPaywallVisible] = useState(false);
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

      {!isPremium && (
        <Pressable
          onPress={() => setPaywallVisible(true)}
          style={({ pressed }) => [styles.upgradeRow, { borderTopColor: t.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="analytics-outline" size={14} color={t.primary} />
          <Text style={[typography.captionStrong, { color: t.primary }]}>
            Подробная аналитика в Premium →
          </Text>
        </Pressable>
      )}

      <PaywallSheet
        visible={paywallVisible}
        trigger="insights"
        onClose={() => setPaywallVisible(false)}
      />
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
