import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

const items = [
  {
    icon: 'calendar-outline' as const,
    title: 'Календарь из 10 скачков',
    text: 'Считаем даты от ПДР. Если малыш родился раньше срока — учитываем.',
  },
  {
    icon: 'journal-outline' as const,
    title: 'Журнал — на минуту в день',
    text: 'Настроение, что заметили, короткая заметка. Без обязательств.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Мягкие напоминания',
    text: 'За 3 дня до скачка — чтобы было время подготовиться.',
  },
];

export default function HowItWorks() {
  const t = useThemedTokens();
  return (
    <OnboardingShell
      step={{ current: 2, total: 3 }}
      title="Как мы помогаем"
      subtitle="Три простых вещи, которые делают будни с малышом немного понятнее."
      footer={
        <>
          <Button title="Далее" size="lg" onPress={() => router.push('/onboarding/privacy')} />
        </>
      }
    >
      <View style={{ gap: spacing.lg }}>
        {items.map((item, i) => (
          <View
            key={i}
            style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: t.primarySoft }]}>
              <Ionicons name={item.icon} size={24} color={t.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={[typography.subtitle, { color: t.textPrimary }]}>{item.title}</Text>
              <Text
                style={[typography.body, { color: t.textSecondary, marginTop: spacing.xs }]}
              >
                {item.text}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
});
