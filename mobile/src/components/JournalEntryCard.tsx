import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { formatRelativeDayRu, formatTimeRu } from '@/src/lib/date';
import { MOOD_EMOJI, SYMPTOM_LABEL, type JournalEntry } from '@/src/store/journal';

type Props = {
  entry: JournalEntry;
  compact?: boolean;
};

export function JournalEntryCard({ entry, compact }: Props) {
  const t = useThemedTokens();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          width: compact ? 220 : '100%',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>{MOOD_EMOJI[entry.mood]}</Text>
        <View style={styles.headerText}>
          <Text style={[typography.captionStrong, { color: t.textPrimary }]}>
            {formatRelativeDayRu(entry.date)}
          </Text>
          <Text style={[typography.caption, { color: t.textMuted }]}>
            {formatTimeRu(entry.date)}
            {entry.linkedLeapNumber ? ` · Скачок ${entry.linkedLeapNumber}` : ''}
          </Text>
        </View>
      </View>
      {entry.symptoms.length > 0 && (
        <View style={styles.chips}>
          {entry.symptoms.slice(0, compact ? 2 : 6).map((s) => (
            <View
              key={s}
              style={[styles.chip, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}
            >
              <Text style={[typography.micro, { color: t.textSecondary }]}>
                {SYMPTOM_LABEL[s]}
              </Text>
            </View>
          ))}
        </View>
      )}
      {entry.note.length > 0 && (
        <Text
          numberOfLines={compact ? 2 : undefined}
          style={[typography.body, { color: t.textPrimary, marginTop: spacing.sm }]}
        >
          {entry.note}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: { fontSize: 28 },
  headerText: { flex: 1 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
