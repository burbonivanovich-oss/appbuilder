import { computeLeapStates, LEAP_WINDOW_WEEKS } from './leaps';
import { addDays, pluralRu } from './date';
import type { ChildProfile } from '@/src/store/child';

export const PRE_LEAP_REMINDER_DAYS = 3;
export const NOTIFICATION_HOUR = 9;

export type ScheduledNotification = {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  data: {
    kind: 'pre-leap' | 'leap-start';
    leapNumber: number;
  };
};

export function computeScheduledNotifications(
  child: ChildProfile,
  now: Date = new Date(),
): ScheduledNotification[] {
  const states = computeLeapStates(child.expectedDob, now);
  const result: ScheduledNotification[] = [];

  for (const state of states) {
    // Pre-leap reminder: 3 days before the leap window starts
    const preLeapDate = atHour(addDays(state.startDate, -PRE_LEAP_REMINDER_DAYS), NOTIFICATION_HOUR);
    if (preLeapDate > now) {
      result.push({
        id: notificationId(child.id, state.number, 'pre-leap'),
        fireAt: preLeapDate,
        title: `${child.name}: возможно скоро скачок ${state.number}`,
        body:
          `Через ${PRE_LEAP_REMINDER_DAYS} ${pluralRu(PRE_LEAP_REMINDER_DAYS, ['день', 'дня', 'дней'])} ` +
          `может начаться скачок ${state.number}. Можно готовиться — больше объятий, размеренный режим.`,
        data: { kind: 'pre-leap', leapNumber: state.number },
      });
    }

    // Leap start day at 09:00
    const startDate = atHour(state.startDate, NOTIFICATION_HOUR);
    if (startDate > now) {
      result.push({
        id: notificationId(child.id, state.number, 'leap-start'),
        fireAt: startDate,
        title: `${child.name}: возможно начался скачок ${state.number}`,
        body:
          `На этой неделе может начаться скачок ${state.number}. ` +
          `Будьте рядом — подробности в приложении.`,
        data: { kind: 'leap-start', leapNumber: state.number },
      });
    }
  }

  return result;
}

export function notificationId(
  childId: string,
  leapNumber: number,
  kind: 'pre-leap' | 'leap-start',
): string {
  return `child:${childId}:leap:${leapNumber}:${kind}`;
}

function atHour(date: Date, hour: number): Date {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

// Re-export for tests
export { LEAP_WINDOW_WEEKS };
