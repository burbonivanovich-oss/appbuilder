import { useEffect } from 'react';
import { useChild } from '@/src/store/child';
import { useSettings } from '@/src/store/settings';
import {
  cancelAll,
  getPermissionStatus,
  rescheduleForChild,
} from '@/src/services/notifications';

/**
 * Reschedules local notifications when child or settings change.
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

  return null;
}
