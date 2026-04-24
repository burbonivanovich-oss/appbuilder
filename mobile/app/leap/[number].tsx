import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { Card } from '@/src/components/Card';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useChildRequired } from '@/src/store/child';
import { computeLeapStates, type LeapState } from '@/src/lib/leaps';
import { LEAPS, type LeapContent } from '@/src/content/leaps';
import { formatDateRu, pluralRu } from '@/src/lib/date';

export async function generateStaticParams(): Promise<{ number: string }[]> {
  return LEAPS.map((leap) => ({ number: String(leap.number) }));
}

export default function LeapDetailScreen() {
  const t = useThemedTokens();
  const params = useLocalSearchParams<{ number: string }>();
  const leapNumber = Number(params.number);
  const child = useChildRequired();

  const state = useMemo<LeapState | undefined>(
    () =>
      computeLeapStates(child.expectedDob).find((s) => s.number === leapNumber),
    [child.expectedDob, leapNumber],
  );

  const content = useMemo<LeapContent | undefined>(
    () => LEAPS.find((l) => l.number === leapNumber),
    [leapNumber],
  );

  if (!state || !content) {
    return (
      <Screen>
        <Text style={[typography.body, { color: t.textPrimary }]}>
          Скачок {leapNumber} не найден.
        </Text>
      </Screen>
    );
  }

  const statusPill = getStatusPill(state);

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: t.textSecondary }]}>
              Скачок {content.number}
            </Text>
            <Text style={[typography.hero, { color: t.textPrimary }]}>{content.name}</Text>
            <Text style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}>
              {content.ageDescription} · длится {content.durationWeeks[0]}–
              {content.durationWeeks[1]}{' '}
              {pluralRu(content.durationWeeks[1], ['неделю', 'недели', 'недель'])}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: t.surfaceAlt }]}
          >
            <Ionicons name="close" size={20} color={t.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.pill,
            {
              backgroundColor: statusPill.bg(t),
              borderColor: statusPill.border(t),
            },
          ]}
        >
          <Text style={[typography.captionStrong, { color: statusPill.fg(t) }]}>
            {statusPill.label(state)}
          </Text>
        </View>

        <Card>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Что происходит</Text>
          <Text style={[typography.body, { color: t.textPrimary, marginTop: spacing.sm }]}>
            {content.whatHappens}
          </Text>
          <Text style={[typography.caption, { color: t.textMuted, marginTop: spacing.md }]}>
            Ориентировочная дата: {formatDateRu(state.centerDate, { withYear: true })}
          </Text>
        </Card>

        <Card>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Частые проявления</Text>
          <Text style={[typography.caption, { color: t.textSecondary, marginTop: spacing.xs }]}>
            Это необязательно бывает у всех детей.
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {content.symptoms.map((s, i) => (
              <View key={i} style={styles.bullet}>
                <View style={[styles.bulletDot, { backgroundColor: t.primary }]} />
                <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>{s}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card tone="soft">
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>Что можно попробовать</Text>
          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            {content.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipNum, { backgroundColor: t.primary }]}>
                  <Text style={[typography.captionStrong, { color: '#FFFFFF' }]}>{i + 1}</Text>
                </View>
                <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[typography.subtitle, { color: t.textPrimary }]}>
            Что нового появится после
          </Text>
          <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
            {content.newAbilities.map((a, i) => (
              <View key={i} style={styles.bullet}>
                <Ionicons name="sparkles-outline" size={16} color={t.secondary} />
                <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>{a}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button
          title="Добавить запись в журнал"
          onPress={() =>
            router.push({
              pathname: '/journal/new',
              params: { leap: String(leapNumber) },
            } as any)
          }
        />

        <Text style={[typography.caption, { color: t.textMuted, textAlign: 'center' }]}>
          Эта информация ознакомительная. При тревоге — к педиатру.
        </Text>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

type Pill = {
  label: (s: LeapState) => string;
  bg: (t: ReturnType<typeof useThemedTokens>) => string;
  border: (t: ReturnType<typeof useThemedTokens>) => string;
  fg: (t: ReturnType<typeof useThemedTokens>) => string;
};

function getStatusPill(state: LeapState): Pill {
  switch (state.status) {
    case 'active':
      return {
        label: (s) => `Идёт сейчас · день ${s.daysIntoLeap + 1}`,
        bg: (t) => t.primarySoft,
        border: (t) => t.primary,
        fg: (t) => t.primary,
      };
    case 'pre-leap':
      return {
        label: (s) =>
          `Начнётся через ${s.daysUntilStart} ${pluralRu(s.daysUntilStart, ['день', 'дня', 'дней'])}`,
        bg: (t) => t.surfaceAlt,
        border: (t) => t.border,
        fg: (t) => t.textSecondary,
      };
    case 'upcoming':
      return {
        label: (s) => {
          const w = Math.max(1, Math.round(s.daysUntilStart / 7));
          return `Через ≈${w} ${pluralRu(w, ['неделю', 'недели', 'недель'])}`;
        },
        bg: (t) => t.surfaceAlt,
        border: (t) => t.border,
        fg: (t) => t.textSecondary,
      };
    case 'completed':
      return {
        label: (s) => {
          const w = Math.max(1, Math.round(s.daysSinceEnded / 7));
          return `Прошёл ${w} ${pluralRu(w, ['неделю', 'недели', 'недель'])} назад`;
        },
        bg: (t) => t.secondarySoft,
        border: (t) => t.secondary,
        fg: (t) => t.secondary,
      };
  }
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  bullet: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  tipNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
