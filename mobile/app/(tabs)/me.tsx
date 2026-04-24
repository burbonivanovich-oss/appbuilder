import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { Card } from '@/src/components/Card';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useChild } from '@/src/store/child';
import { formatAgeRu } from '@/src/lib/age';
import { formatDateRu } from '@/src/lib/date';

export default function MeScreen() {
  const t = useThemedTokens();
  const child = useChild();

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[typography.caption, { color: t.textSecondary }]}>Профиль</Text>
          <Text style={[typography.title, { color: t.textPrimary }]}>Я</Text>
        </View>

        <Card>
          <Text style={[typography.caption, { color: t.textSecondary }]}>Ребёнок</Text>
          <Text style={[typography.subtitle, { color: t.textPrimary, marginTop: spacing.xs }]}>
            {child.name}
          </Text>
          <Text style={[typography.body, { color: t.textSecondary }]}>
            {formatAgeRu(child.dob)} · родился {formatDateRu(child.dob, { withYear: true })}
          </Text>
        </Card>

        <SettingsSection title="Совместный доступ">
          <Row icon="people-outline" label="Пригласить партнёра" stub />
        </SettingsSection>

        <SettingsSection title="Настройки">
          <Row icon="notifications-outline" label="Уведомления" stub />
          <Row icon="language-outline" label="Язык" hint="Русский" stub />
          <Row icon="lock-closed-outline" label="Приватность" stub />
        </SettingsSection>

        <SettingsSection title="Данные">
          <Row icon="download-outline" label="Экспорт в PDF" stub />
          <Row icon="trash-outline" label="Удалить аккаунт" stub destructive />
        </SettingsSection>

        <SettingsSection title="О приложении">
          <Row icon="information-circle-outline" label="Версия" hint="0.1.0 (MVP)" />
          <Row icon="medkit-outline" label="Дисклеймер" hint="Не заменяет педиатра" />
        </SettingsSection>

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useThemedTokens();
  return (
    <View style={styles.section}>
      <Text style={[typography.captionStrong, { color: t.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
      <Card padding="md">
        <View style={{ gap: 0 }}>{children}</View>
      </Card>
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  stub,
  destructive,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  stub?: boolean;
  destructive?: boolean;
}) {
  const t = useThemedTokens();
  const color = destructive ? t.error : t.textPrimary;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={destructive ? t.error : t.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color }]}>{label}</Text>
        {hint && (
          <Text style={[typography.caption, { color: t.textMuted }]}>{hint}</Text>
        )}
      </View>
      {stub && (
        <Text style={[typography.micro, { color: t.textMuted }]}>скоро</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
});
