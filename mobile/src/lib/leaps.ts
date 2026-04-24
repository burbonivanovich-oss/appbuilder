import { addWeeks, diffDays, startOfDay } from './date';

export type LeapStatus = 'upcoming' | 'pre-leap' | 'active' | 'completed';

export type LeapSchedule = {
  number: number;
  weekFromDueDate: number;
};

export const LEAP_SCHEDULE: readonly LeapSchedule[] = [
  { number: 1, weekFromDueDate: 5 },
  { number: 2, weekFromDueDate: 8 },
  { number: 3, weekFromDueDate: 12 },
  { number: 4, weekFromDueDate: 19 },
  { number: 5, weekFromDueDate: 26 },
  { number: 6, weekFromDueDate: 37 },
  { number: 7, weekFromDueDate: 46 },
  { number: 8, weekFromDueDate: 55 },
  { number: 9, weekFromDueDate: 64 },
  { number: 10, weekFromDueDate: 75 },
];

export const LEAP_WINDOW_WEEKS = 1;
export const PRE_LEAP_WARNING_DAYS = 7;

export type LeapState = {
  number: number;
  status: LeapStatus;
  centerDate: Date;
  startDate: Date;
  endDate: Date;
  daysUntilStart: number;
  daysIntoLeap: number;
  daysSinceEnded: number;
  durationDays: number;
};

export function computeLeapStates(expectedDueDate: Date, now: Date = new Date()): LeapState[] {
  const today = startOfDay(now);
  return LEAP_SCHEDULE.map(({ number, weekFromDueDate }) => {
    const centerDate = addWeeks(expectedDueDate, weekFromDueDate);
    const startDate = addWeeks(centerDate, -LEAP_WINDOW_WEEKS);
    const endDate = addWeeks(centerDate, LEAP_WINDOW_WEEKS);

    const daysUntilStart = diffDays(startDate, today);
    const daysIntoLeap = diffDays(today, startDate);
    const daysSinceEnded = diffDays(today, endDate);
    const durationDays = diffDays(endDate, startDate);

    let status: LeapStatus;
    if (today < startDate) {
      status = daysUntilStart <= PRE_LEAP_WARNING_DAYS ? 'pre-leap' : 'upcoming';
    } else if (today <= endDate) {
      status = 'active';
    } else {
      status = 'completed';
    }

    return {
      number,
      status,
      centerDate,
      startDate,
      endDate,
      daysUntilStart,
      daysIntoLeap,
      daysSinceEnded,
      durationDays,
    };
  });
}

export function getActiveLeap(states: LeapState[]): LeapState | null {
  return states.find((s) => s.status === 'active') ?? null;
}

export function getNextLeap(states: LeapState[]): LeapState | null {
  return states.find((s) => s.status === 'pre-leap' || s.status === 'upcoming') ?? null;
}

export function getLastCompletedLeap(states: LeapState[]): LeapState | null {
  const completed = states.filter((s) => s.status === 'completed');
  return completed.length > 0 ? completed[completed.length - 1] : null;
}

export type TodaySnapshot =
  | { kind: 'active'; leap: LeapState }
  | { kind: 'pre-leap'; leap: LeapState }
  | { kind: 'calm'; next: LeapState | null; last: LeapState | null }
  | { kind: 'all-done'; last: LeapState };

export function getTodaySnapshot(states: LeapState[]): TodaySnapshot {
  const active = getActiveLeap(states);
  if (active) return { kind: 'active', leap: active };

  const next = getNextLeap(states);
  const last = getLastCompletedLeap(states);

  if (next && next.status === 'pre-leap') {
    return { kind: 'pre-leap', leap: next };
  }

  if (!next && last) {
    return { kind: 'all-done', last };
  }

  return { kind: 'calm', next, last };
}
