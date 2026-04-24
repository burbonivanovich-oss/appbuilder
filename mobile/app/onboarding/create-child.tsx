import { Text } from 'react-native';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { Button } from '@/src/components/Button';
import { ChildForm } from '@/src/components/ChildForm';
import { typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { childStore } from '@/src/store/child';

export default function CreateChild() {
  const t = useThemedTokens();

  return (
    <OnboardingShell
      eyebrow="Шаг 2 из 2"
      title="Расскажите о малыше"
      subtitle="Эти данные нужны для точного расчёта скачков. Меняются позже в настройках."
    >
      <ChildForm
        footerNote="Это приложение — не медицинское устройство. При тревоге обращайтесь к педиатру."
        onSubmit={(values) => {
          childStore.create(values);
          router.replace('/');
        }}
        renderSubmit={({ onPress, disabled, error }) => (
          <>
            {error && (
              <Text style={[typography.caption, { color: t.error, textAlign: 'center', marginBottom: 12 }]}>
                {error}
              </Text>
            )}
            <Button title="Готово" size="lg" onPress={onPress} disabled={disabled} />
          </>
        )}
      />
    </OnboardingShell>
  );
}
