import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/src/components/Card';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { LEAPS } from '@/src/content/leaps';

export function AllDoneCard() {
  const t = useThemedTokens();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.hero,
          { backgroundColor: t.secondarySoft, borderColor: t.secondary, borderRadius: radius.lg },
        ]}
      >
        <Text style={[styles.label, { color: t.textSecondary }]}>Поздравляем</Text>
        <Text style={[typography.hero, { color: t.textPrimary, marginTop: spacing.xs }]}>
          Все 10 скачков{'\n'}позади 🎉
        </Text>
        <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.sm }]}>
          Малыш прошёл огромный путь за первые полтора года. Это было непросто — ни для него, ни для вас.
        </Text>
      </View>

      <Card>
        <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>Путь малыша</Text>
        {LEAPS.map((leap) => (
          <View key={leap.number} style={styles.leapRow}>
            <Ionicons name="checkmark-circle" size={18} color={t.success} />
            <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>
              Скачок {leap.number} · {leap.name}
            </Text>
            <Text style={[typography.micro, { color: t.textMuted }]}>{leap.ageDescription}</Text>
          </View>
        ))}
      </Card>

      <Card tone="soft">
        <View style={styles.teaserRow}>
          <Ionicons name="rocket-outline" size={24} color={t.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
              Скоро в приложении
            </Text>
            <Text style={[typography.caption, { color: t.textSecondary, marginTop: spacing.xs }]}>
              Трекер развития 1–3 года: речь, первые слова, ходьба и сюжетная игра.
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  hero: {
    padding: spacing.xxl,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  leapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  teaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
