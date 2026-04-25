import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { authStore } from '@/src/store/auth';
import { track } from '@/src/lib/analytics';

export default function SignIn() {
  const t = useThemedTokens();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const after = () => router.replace('/onboarding/create-child');

  const handleProvider = (p: 'apple' | 'google') => {
    authStore.signInMock(p);
    track('auth_signed_in', { provider: p });
    after();
  };

  const handleEmail = () => {
    if (!email.trim()) return;
    authStore.signInMock('email', email.trim());
    track('auth_signed_in', { provider: 'email' });
    after();
  };

  return (
    <OnboardingShell
      eyebrow="Шаг 1 из 2"
      title="Войдите или создайте аккаунт"
      subtitle="В MVP это демо-вход: реальной авторизации пока нет. Данные сохраняются локально."
    >
      <View style={{ gap: spacing.md }}>
        <ProviderButton
          label="Войти с Apple"
          icon="logo-apple"
          bg="#111111"
          fg="#FFFFFF"
          onPress={() => handleProvider('apple')}
        />
        <ProviderButton
          label="Войти с Google"
          icon="logo-google"
          bg={t.surface}
          fg={t.textPrimary}
          border={t.border}
          onPress={() => handleProvider('google')}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
          <Text style={[typography.caption, { color: t.textMuted }]}>или по email</Text>
          <View style={[styles.divider, { backgroundColor: t.border }]} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@example.com"
          placeholderTextColor={t.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            },
          ]}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="пароль (≥ 8 символов)"
          placeholderTextColor={t.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            },
          ]}
        />

        <Pressable
          onPress={handleEmail}
          disabled={!email.trim()}
          style={({ pressed }) => [
            styles.emailBtn,
            {
              backgroundColor: email.trim() ? t.primary : t.surfaceAlt,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              typography.bodyStrong,
              { color: email.trim() ? '#FFFFFF' : t.textMuted },
            ]}
          >
            Продолжить
          </Text>
        </Pressable>

        <Text style={[typography.caption, { color: t.textMuted, textAlign: 'center' }]}>
          Продолжая, вы соглашаетесь с условиями использования и политикой приватности.
        </Text>
      </View>
    </OnboardingShell>
  );
}

function ProviderButton({
  label,
  icon,
  bg,
  fg,
  border,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
  fg: string;
  border?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.provider,
        {
          backgroundColor: bg,
          borderColor: border ?? bg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={[typography.bodyStrong, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  provider: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  emailBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
  },
});
