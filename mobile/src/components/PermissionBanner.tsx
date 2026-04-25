import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '@/src/theme/tokens';
import { useThemedTokens } from '@/src/hooks/useThemedTokens';
import { useSettings, settingsStore } from '@/src/store/settings';
import {
  getPermissionStatus,
  requestPermission,
  type PermissionStatus,
} from '@/src/services/notifications';
import { track } from '@/src/lib/analytics';

/**
 * Soft prompt to enable notifications. Hides when:
 * - User explicitly turned off notifications in settings
 * - Permission already granted
 * - Permission denied beyond ask (user has to go to system settings)
 */
export function PermissionBanner() {
  const t = useThemedTokens();
  const { notificationsEnabled } = useSettings();
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void getPermissionStatus().then(setStatus);
  }, []);

  if (
    !notificationsEnabled ||
    status === null ||
    status === 'granted' ||
    status === 'denied' ||
    dismissed
  ) {
    return null;
  }

  const handleEnable = async () => {
    const next = await requestPermission();
    setStatus(next);
    track(next === 'granted' ? 'notif_permission_granted' : 'notif_permission_denied', {
      source: 'banner',
    });
    if (next !== 'granted') {
      // user declined — disable in settings so we don't keep asking
      settingsStore.setNotificationsEnabled(false);
    }
  };

  return (
    <View
      style={[styles.banner, { backgroundColor: t.primarySoft, borderColor: t.primary }]}
    >
      <Ionicons name="notifications-outline" size={20} color={t.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: t.textPrimary }]}>
          Включите уведомления
        </Text>
        <Text style={[typography.caption, { color: t.textSecondary }]}>
          Чтобы не пропустить скачок — мягкое напоминание за 3 дня и в день начала.
        </Text>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Pressable
          onPress={handleEnable}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[typography.captionStrong, { color: '#FFFFFF' }]}>Включить</Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
          <Text style={[typography.caption, { color: t.textMuted, textAlign: 'center' }]}>
            Позже
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
});
