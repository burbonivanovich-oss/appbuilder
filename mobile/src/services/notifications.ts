import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { computeScheduledNotifications } from '@/src/lib/notifications';
import type { ChildProfile } from '@/src/store/child';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

let handlerConfigured = false;

function ensureHandler() {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return 'granted';
    if (settings.canAskAgain === false) return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<PermissionStatus> {
  ensureHandler();
  try {
    const settings = await Notifications.requestPermissionsAsync();
    if (settings.granted) return 'granted';
    if (settings.canAskAgain === false) return 'denied';
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function cancelAllForChild(childId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((s) => s.identifier.startsWith(`child:${childId}:`));
    await Promise.all(
      ours.map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
    );
  } catch {
    // ignore
  }
}

export async function rescheduleForChild(child: ChildProfile): Promise<number> {
  ensureHandler();
  await cancelAllForChild(child.id);

  const upcoming = computeScheduledNotifications(child);
  if (upcoming.length === 0) return 0;

  let scheduled = 0;
  for (const n of upcoming) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: {
          title: n.title,
          body: n.body,
          data: n.data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: n.fireAt,
        },
      });
      scheduled += 1;
    } catch {
      // platform may not support — skip
    }
  }
  return scheduled;
}

export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export const isWeb = Platform.OS === 'web';
