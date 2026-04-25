import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { Card } from '@/src/components/Card';
import { spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useChildRequired, childStore } from '@/src/store/child';
import { useAuth, authStore } from '@/src/store/auth';
import { journalStore } from '@/src/store/journal';
import { settingsStore, useSettings } from '@/src/store/settings';
import {
  getPermissionStatus,
  requestPermission,
  type PermissionStatus,
} from '@/src/services/notifications';
import { formatAgeWithCorrection } from '@/src/lib/age';
import { formatDateRu } from '@/src/lib/date';
import { resetAnalytics, track } from '@/src/lib/analytics';

export default function MeScreen() {
  const t = useThemedTokens();
  const child = useChildRequired();
  const { user } = useAuth();
  const settings = useSettings();
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');

  useEffect(() => {
    void getPermissionStatus().then(setPermission);
  }, []);

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      const status = await requestPermission();
      setPermission(status);
      track(status === 'granted' ? 'notif_permission_granted' : 'notif_permission_denied', {
        source: 'settings',
      });
      if (status === 'granted') {
        settingsStore.setNotificationsEnabled(true);
        track('settings_notifications_toggled', { enabled: true });
      }
    } else {
      settingsStore.setNotificationsEnabled(false);
      track('settings_notifications_toggled', { enabled: false });
    }
  };

  const handleSignOut = () => {
    const confirm = () => {
      track('signed_out');
      authStore.signOut();
      childStore.clear();
      journalStore.clear();
      resetAnalytics();
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Выйти и очистить данные?')) {
        confirm();
      }
    } else {
      Alert.alert('Выйти?', 'Локальные данные будут очищены.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: confirm },
      ]);
    }
  };

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

        {user && (
          <Card>
            <Text style={[typography.caption, { color: t.textSecondary }]}>Аккаунт</Text>
            <Text style={[typography.subtitle, { color: t.textPrimary, marginTop: spacing.xs }]}>
              {user.displayName}
            </Text>
            <Text style={[typography.body, { color: t.textSecondary }]}>
              {user.email} · вход через {providerLabel(user.provider)}
            </Text>
          </Card>
        )}

        <Pressable
          onPress={() => router.push('/child/edit' as any)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <Card>
            <View style={styles.childHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: t.textSecondary }]}>Ребёнок</Text>
                <Text
                  style={[typography.subtitle, { color: t.textPrimary, marginTop: spacing.xs }]}
                >
                  {child.name}
                </Text>
                <Text style={[typography.body, { color: t.textSecondary }]}>
                  {formatAgeWithCorrection(child.dob, child.expectedDob)} · родился {formatDateRu(child.dob, { withYear: true })}
                </Text>
                {child.dob.getTime() !== child.expectedDob.getTime() && (
                  <Text
                    style={[typography.caption, { color: t.textMuted, marginTop: spacing.xs }]}
                  >
                    ПДР: {formatDateRu(child.expectedDob, { withYear: true })}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            </View>
          </Card>
        </Pressable>

        <SettingsSection title="Совместный доступ">
          <Row icon="people-outline" label="Пригласить партнёра" stub />
        </SettingsSection>

        <SettingsSection title="Настройки">
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={22} color={t.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: t.textPrimary }]}>Уведомления</Text>
              <Text style={[typography.caption, { color: t.textMuted }]}>
                {permission === 'denied'
                  ? 'Разрешите в системных настройках'
                  : 'За 3 дня до скачка и в день начала'}
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled && permission === 'granted'}
              onValueChange={handleNotificationsToggle}
              disabled={permission === 'denied'}
              trackColor={{ true: t.primary, false: t.border }}
              thumbColor="#FFFFFF"
            />
          </View>
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

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: t.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={t.error} />
          <Text style={[typography.bodyStrong, { color: t.error }]}>Выйти</Text>
        </Pressable>

        <View style={{ height: spacing.huge }} />
      </ScrollView>
    </Screen>
  );
}

function providerLabel(p: 'apple' | 'google' | 'email'): string {
  return p === 'apple' ? 'Apple' : p === 'google' ? 'Google' : 'Email';
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
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
