import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

const items = [
  'Данные ребёнка хранятся на вашем устройстве.',
  'Мы не продаём и не передаём их рекламодателям.',
  'Экспорт и удаление в один тап в настройках.',
];

export default function Privacy() {
  const t = useThemedTokens();
  return (
    <OnboardingShell
      step={{ current: 3, total: 3 }}
      title="Приватность и доверие"
      subtitle="Это приложение не заменяет педиатра. Мы помогаем понимать, а не ставим диагнозы."
      footer={
        <Button title="Продолжить" size="lg" onPress={() => router.push('/onboarding/sign-in')} />
      }
    >
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={[styles.lockBox, { backgroundColor: t.secondarySoft }]}>
          <Ionicons name="lock-closed" size={28} color={t.secondary} />
        </View>
        {items.map((item, i) => (
          <View key={i} style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color={t.secondary} />
            <Text style={[typography.body, { color: t.textPrimary, flex: 1 }]}>{item}</Text>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  lockBox: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
});
