import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { pluralRu } from '@/src/lib/date';
import type { TodaySnapshot } from '@/src/lib/leaps';

type Props = {
  snapshot: TodaySnapshot;
  onPress?: () => void;
};

export function LeapHeroCard({ snapshot, onPress }: Props) {
  const t = useThemedTokens();
  const content = renderContent(snapshot);

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

type HeroContent = {
  label: string;
  title: string;
  subtitle?: string;
  progress?: number;
  cta?: string;
  accent: boolean;
};

function renderContent(s: TodaySnapshot): HeroContent {
  switch (s.kind) {
    case 'active': {
      const day = s.leap.daysIntoLeap + 1;
      const total = s.leap.durationDays + 1;
      return {
        label: 'Сейчас идёт',
        title: `Скачок ${s.leap.number}`,
        subtitle: `День ${day} из ≈${total}. Будьте рядом и обнимайте чаще.`,
        progress: Math.min(day / total, 1),
        cta: 'Подробнее о скачке',
        accent: true,
      };
    }
    case 'pre-leap': {
      const days = s.leap.daysUntilStart;
      const w = pluralRu(days, ['день', 'дня', 'дней']);
      return {
        label: 'Скоро',
        title: `Скачок ${s.leap.number} через ${days} ${w}`,
        subtitle: 'Можно готовиться: больше объятий и размеренный режим.',
        cta: 'Что ожидать',
        accent: false,
      };
    }
    case 'calm': {
      if (s.next) {
        const weeks = Math.max(1, Math.round(s.next.daysUntilStart / 7));
        const w = pluralRu(weeks, ['неделю', 'недели', 'недель']);
        return {
          label: 'Спокойный период',
          title: 'Наслаждайтесь',
          subtitle: `До следующего скачка ≈${weeks} ${w}.`,
          cta: s.next ? `Посмотреть скачок ${s.next.number}` : undefined,
          accent: false,
        };
      }
      return {
        label: 'Спокойный период',
        title: 'Наслаждайтесь',
        accent: false,
      };
    }
    case 'all-done': {
      return {
        label: 'Поздравляем',
        title: 'Все 10 скачков позади',
        subtitle: 'Малыш прошёл большой путь. Следующий этап — в V2 приложения.',
        accent: false,
      };
    }
  }
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
