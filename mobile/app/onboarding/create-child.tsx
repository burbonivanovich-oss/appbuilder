import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { OnboardingShell } from '@/src/components/OnboardingShell';
import { Button } from '@/src/components/Button';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { childStore, type ChildProfile } from '@/src/store/child';
import { formatDateRu } from '@/src/lib/date';

type Sex = ChildProfile['sex'];

export default function CreateChild() {
  const t = useThemedTokens();
  const [name, setName] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [sex, setSex] = useState<Sex>('unspecified');
  const [isPreterm, setIsPreterm] = useState(false);
  const [expectedDobInput, setExpectedDobInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedDob = parseDate(dobInput);
  const parsedExpected = isPreterm ? parseDate(expectedDobInput) : parsedDob;
  const canSave =
    parsedDob !== null && parsedDob <= new Date() && (!isPreterm || parsedExpected !== null);

  const handleSave = () => {
    if (!parsedDob) {
      setError('Проверьте дату рождения.');
      return;
    }
    if (parsedDob > new Date()) {
      setError('Дата рождения не может быть в будущем.');
      return;
    }
    const expected = isPreterm && parsedExpected ? parsedExpected : parsedDob;
    childStore.create({
      name: name.trim() || 'Малыш',
      dob: parsedDob,
      expectedDob: expected,
      sex,
    });
    router.replace('/');
  };

  return (
    <OnboardingShell
      eyebrow="Шаг 2 из 2"
      title="Расскажите о малыше"
      subtitle="Эти данные нужны для точного расчёта скачков. Меняются позже в настройках."
      footer={
        <>
          {error && (
            <Text style={[typography.caption, { color: t.error, textAlign: 'center' }]}>
              {error}
            </Text>
          )}
          <Button title="Готово" size="lg" onPress={handleSave} disabled={!canSave} />
        </>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Field label="Имя" hint="Можно просто «Малыш»">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Как зовут?"
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { backgroundColor: t.surface, borderColor: t.border, color: t.textPrimary },
            ]}
          />
        </Field>

        <Field
          label="Дата рождения"
          hint={Platform.OS === 'web' ? 'Формат: ДД.ММ.ГГГГ' : 'Введите в формате ДД.ММ.ГГГГ'}
        >
          <TextInput
            value={dobInput}
            onChangeText={(v) => {
              setError(null);
              setDobInput(formatDobMask(v));
            }}
            placeholder="ДД.ММ.ГГГГ"
            placeholderTextColor={t.textMuted}
            keyboardType="number-pad"
            style={[
              styles.input,
              { backgroundColor: t.surface, borderColor: t.border, color: t.textPrimary },
            ]}
          />
          {parsedDob && (
            <Text style={[typography.caption, { color: t.textMuted, marginTop: spacing.xs }]}>
              {formatDateRu(parsedDob, { withYear: true })}
            </Text>
          )}
        </Field>

        <Field label="Пол (опционально)">
          <View style={styles.sexRow}>
            <SexChip label="Мальчик" value="male" current={sex} setSex={setSex} />
            <SexChip label="Девочка" value="female" current={sex} setSex={setSex} />
            <SexChip label="Пропустить" value="unspecified" current={sex} setSex={setSex} />
          </View>
        </Field>

        <View
          style={[
            styles.pretermRow,
            { backgroundColor: t.surfaceAlt, borderColor: t.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
              Родился раньше срока
            </Text>
            <Text style={[typography.caption, { color: t.textSecondary }]}>
              Тогда скачки считаем от ПДР, а не от ДР.
            </Text>
          </View>
          <Switch
            value={isPreterm}
            onValueChange={setIsPreterm}
            trackColor={{ true: t.primary, false: t.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        {isPreterm && (
          <Field label="ПДР (предполагаемая дата родов)">
            <TextInput
              value={expectedDobInput}
              onChangeText={(v) => setExpectedDobInput(formatDobMask(v))}
              placeholder="ДД.ММ.ГГГГ"
              placeholderTextColor={t.textMuted}
              keyboardType="number-pad"
              style={[
                styles.input,
                { backgroundColor: t.surface, borderColor: t.border, color: t.textPrimary },
              ]}
            />
          </Field>
        )}

        <View style={[styles.note, { borderColor: t.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={t.textSecondary} />
          <Text style={[typography.caption, { color: t.textSecondary, flex: 1 }]}>
            Это приложение — не медицинское устройство. При тревоге обращайтесь к педиатру.
          </Text>
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useThemedTokens();
  return (
    <View style={styles.field}>
      <Text style={[typography.captionStrong, { color: t.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
      {children}
      {hint && (
        <Text style={[typography.caption, { color: t.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

function SexChip({
  label,
  value,
  current,
  setSex,
}: {
  label: string;
  value: Sex;
  current: Sex;
  setSex: (s: Sex) => void;
}) {
  const t = useThemedTokens();
  const selected = current === value;
  return (
    <Pressable
      onPress={() => setSex(value)}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? t.primarySoft : t.surface,
          borderColor: selected ? t.primary : t.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[typography.body, { color: selected ? t.primary : t.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDobMask(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function parseDate(v: string): Date | null {
  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getDate() !== Number(dd) || date.getMonth() !== Number(mm) - 1) return null;
  return date;
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  sexRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pretermRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
