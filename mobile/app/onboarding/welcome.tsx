import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { Button } from '@/src/components/Button';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';

export default function Welcome() {
  const t = useThemedTokens();
  return (
    <OnboardingShell
      step={{ current: 1, total: 3 }}
      title="Понимайте поведение малыша"
      subtitle="10 ментальных скачков роста в первые полтора года объясняют, почему ребёнок вдруг плачет, плохо спит или требует внимания."
      footer={
        <>
          <Button title="Далее" size="lg" onPress={() => router.push('/onboarding/how-it-works')} />
        </>
      }
    >
      <View style={styles.illustration}>
        <View style={[styles.circle, { backgroundColor: t.primarySoft, borderColor: t.primary }]}>
          <Ionicons name="heart" size={64} color={t.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[typography.subtitle, { color: t.textPrimary, textAlign: 'center' }]}>
            Спокойнее родителям — спокойнее малышу
          </Text>
          <Text
            style={[
              typography.body,
              { color: t.textSecondary, textAlign: 'center', marginTop: spacing.sm },
            ]}
          >
            Мы подскажем, что происходит в каждый момент, и предложим, что можно сделать.
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  illustration: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  copy: {
    paddingHorizontal: spacing.lg,
  },
});
