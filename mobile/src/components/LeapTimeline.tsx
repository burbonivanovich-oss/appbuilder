import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { formatDateRu, pluralRu } from '@/src/lib/date';
import type { LeapState } from '@/src/lib/leaps';

type Props = {
  states: LeapState[];
  onSelect?: (number: number) => void;
};

export function LeapTimeline({ states, onSelect }: Props) {
  const t = useThemedTokens();
  return (
    <View style={styles.wrap}>
      {states.map((leap, i) => {
        const isLast = i === states.length - 1;
        const dotBg =
          leap.status === 'active'
            ? t.primary
            : leap.status === 'completed'
              ? t.secondary
              : t.surfaceAlt;
        const dotBorder =
          leap.status === 'active'
            ? t.primary
            : leap.status === 'pre-leap'
              ? t.primary
              : t.border;
        const textColor =
          leap.status === 'completed' ? t.textSecondary : t.textPrimary;

        return (
          <Pressable
            key={leap.number}
            onPress={() => onSelect?.(leap.number)}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={styles.railCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: dotBg,
                    borderColor: dotBorder,
                    borderWidth: leap.status === 'pre-leap' ? 2 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.captionStrong,
                    {
                      color:
                        leap.status === 'active'
                          ? '#FFFFFF'
                          : leap.status === 'completed'
                            ? '#FFFFFF'
                            : t.textSecondary,
                    },
                  ]}
                >
                  {leap.number}
                </Text>
              </View>
              {!isLast && (
                <View style={[styles.rail, { backgroundColor: t.border }]} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={[typography.subtitle, { color: textColor }]}>
                Скачок {leap.number}
              </Text>
              <Text style={[typography.caption, { color: t.textSecondary }]}>
                {statusText(leap)}
              </Text>
              <Text style={[typography.caption, { color: t.textMuted }]}>
                {formatDateRu(leap.centerDate)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function statusText(leap: LeapState): string {
  switch (leap.status) {
    case 'active':
      return `Идёт прямо сейчас · день ${leap.daysIntoLeap + 1}`;
    case 'pre-leap': {
      const d = leap.daysUntilStart;
      return `Начнётся через ${d} ${pluralRu(d, ['день', 'дня', 'дней'])}`;
    }
    case 'upcoming': {
      const weeks = Math.max(1, Math.round(leap.daysUntilStart / 7));
      return `Через ${weeks} ${pluralRu(weeks, ['неделю', 'недели', 'недель'])}`;
    }
    case 'completed': {
      const weeks = Math.max(1, Math.round(leap.daysSinceEnded / 7));
      return `Завершён ${weeks} ${pluralRu(weeks, ['неделю', 'недели', 'недель'])} назад`;
    }
  }
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  railCol: {
    alignItems: 'center',
    width: 40,
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rail: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    gap: 2,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
});
