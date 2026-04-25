import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useChild } from '@/src/store/child';
import { useSettings } from '@/src/store/settings';
import {
  cancelAll,
  getPermissionStatus,
  rescheduleForChild,
} from '@/src/services/notifications';
import { track } from '@/src/lib/analytics';

/**
 * Reschedules local notifications when child or settings change, and routes
 * the user to the relevant leap detail when they tap a notification (whether
 * the app is in background or launched cold from the notification).
 * Mounted once at root after hydration. Renders nothing.
 */
export function NotificationsManager() {
  const child = useChild();
  const { notificationsEnabled } = useSettings();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!notificationsEnabled || !child) {
        await cancelAll();
        return;
      }
      const status = await getPermissionStatus();
      if (status !== 'granted') return;
      if (cancelled) return;
      await rescheduleForChild(child);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    notificationsEnabled,
    child?.id,
    child?.expectedDob.getTime(),
    child?.name,
  ]);

  // Deep-link from notification taps. expo-notifications does not implement
  // these APIs on web, so we skip mounting the listener entirely there.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, []);

  return null;
}

function handleResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as
    | { kind?: string; leapNumber?: number }
    | undefined;
  const leapNumber = data?.leapNumber;
  if (typeof leapNumber !== 'number' || leapNumber < 1 || leapNumber > 10) return;

  track('notif_tapped', { kind: data?.kind ?? 'unknown', leapNumber });

  try {
    router.push(`/leap/${leapNumber}` as never);
  } catch {
    // navigation may not be ready yet (cold start) — ignore; the app
    // will still open to the home screen, which is acceptable.
  }
}
