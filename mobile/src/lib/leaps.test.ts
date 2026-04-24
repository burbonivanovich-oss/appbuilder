import {
  LEAP_SCHEDULE,
  LEAP_WINDOW_WEEKS,
  PRE_LEAP_WARNING_DAYS,
  computeLeapStates,
  getActiveLeap,
  getNextLeap,
  getLastCompletedLeap,
  getTodaySnapshot,
} from './leaps';
import { addDays, addWeeks } from './date';

describe('LEAP_SCHEDULE', () => {
  it('has 10 leaps', () => {
    expect(LEAP_SCHEDULE).toHaveLength(10);
  });

  it('starts at week 5 and ends at week 75', () => {
    expect(LEAP_SCHEDULE[0].weekFromDueDate).toBe(5);
    expect(LEAP_SCHEDULE[9].weekFromDueDate).toBe(75);
  });

  it('leap numbers are 1..10 in order', () => {
    LEAP_SCHEDULE.forEach((l, i) => {
      expect(l.number).toBe(i + 1);
    });
  });
});

describe('computeLeapStates', () => {
  const due = new Date(2024, 0, 1);

  it('returns 10 entries', () => {
    expect(computeLeapStates(due, due)).toHaveLength(10);
  });

  it('marks all upcoming at birth', () => {
    const states = computeLeapStates(due, due);
    // Leap 1 at week 5 is still ~5 weeks away = > PRE_LEAP_WARNING_DAYS, so upcoming
    expect(states[0].status).toBe('upcoming');
  });

  it('center date = due + weekFromDueDate weeks', () => {
    const states = computeLeapStates(due, due);
    expect(states[0].centerDate.getTime()).toBe(addWeeks(due, 5).getTime());
    expect(states[2].centerDate.getTime()).toBe(addWeeks(due, 12).getTime());
  });

  it('window is ±LEAP_WINDOW_WEEKS around center', () => {
    const states = computeLeapStates(due, due);
    expect(states[0].startDate.getTime()).toBe(
      addWeeks(states[0].centerDate, -LEAP_WINDOW_WEEKS).getTime(),
    );
    expect(states[0].endDate.getTime()).toBe(
      addWeeks(states[0].centerDate, LEAP_WINDOW_WEEKS).getTime(),
    );
  });

  it('status is active when today is within window', () => {
    // Place "now" right on leap 3 (week 12) center
    const now = addWeeks(due, 12);
    const states = computeLeapStates(due, now);
    expect(states[2].status).toBe('active');
    expect(states[2].daysIntoLeap).toBeGreaterThanOrEqual(0);
  });

  it('status is pre-leap within warning days', () => {
    // 3 days before leap 3 start
    const leap3Start = addWeeks(addWeeks(due, 12), -LEAP_WINDOW_WEEKS);
    const now = addDays(leap3Start, -3);
    const states = computeLeapStates(due, now);
    expect(states[2].status).toBe('pre-leap');
    expect(states[2].daysUntilStart).toBe(3);
  });

  it('status is upcoming beyond warning days', () => {
    const leap3Start = addWeeks(addWeeks(due, 12), -LEAP_WINDOW_WEEKS);
    const now = addDays(leap3Start, -(PRE_LEAP_WARNING_DAYS + 5));
    const states = computeLeapStates(due, now);
    expect(states[2].status).toBe('upcoming');
  });

  it('status is completed after window', () => {
    // 5 weeks after leap 3 center
    const now = addWeeks(addWeeks(due, 12), 5);
    const states = computeLeapStates(due, now);
    expect(states[2].status).toBe('completed');
    expect(states[2].daysSinceEnded).toBeGreaterThan(0);
  });

  it('works for preterm: calculate from expectedDob not actualDob', () => {
    const expectedDob = new Date(2024, 0, 15); // ПДР
    const now = addWeeks(expectedDob, 12); // at ПДР + 12 weeks
    const states = computeLeapStates(expectedDob, now);
    expect(states[2].status).toBe('active');
  });
});

describe('getActiveLeap', () => {
  const due = new Date(2024, 0, 1);

  it('returns active leap when one exists', () => {
    const now = addWeeks(due, 12);
    const active = getActiveLeap(computeLeapStates(due, now));
    expect(active?.number).toBe(3);
  });

  it('returns null when no active leap', () => {
    const now = due;
    expect(getActiveLeap(computeLeapStates(due, now))).toBeNull();
  });
});

describe('getNextLeap', () => {
  const due = new Date(2024, 0, 1);

  it('returns first upcoming/pre-leap after active', () => {
    const now = addWeeks(due, 12);
    const next = getNextLeap(computeLeapStates(due, now));
    expect(next?.number).toBe(4);
  });

  it('returns null when all leaps done', () => {
    const now = addWeeks(due, 100);
    expect(getNextLeap(computeLeapStates(due, now))).toBeNull();
  });
});

describe('getLastCompletedLeap', () => {
  const due = new Date(2024, 0, 1);

  it('returns last completed', () => {
    const now = addWeeks(due, 15); // after leap 3 (week 12)
    const last = getLastCompletedLeap(computeLeapStates(due, now));
    expect(last?.number).toBe(3);
  });

  it('returns null before any leap', () => {
    const now = due;
    expect(getLastCompletedLeap(computeLeapStates(due, now))).toBeNull();
  });
});

describe('getTodaySnapshot', () => {
  const due = new Date(2024, 0, 1);

  it('kind active when in a leap', () => {
    const now = addWeeks(due, 12);
    const snap = getTodaySnapshot(computeLeapStates(due, now));
    expect(snap.kind).toBe('active');
  });

  it('kind pre-leap within warning window', () => {
    const leap3Start = addWeeks(addWeeks(due, 12), -LEAP_WINDOW_WEEKS);
    const now = addDays(leap3Start, -3);
    const snap = getTodaySnapshot(computeLeapStates(due, now));
    expect(snap.kind).toBe('pre-leap');
  });

  it('kind calm when far from any leap', () => {
    const now = addWeeks(due, 30); // between leap 5 (week 26) and 6 (week 37)
    const snap = getTodaySnapshot(computeLeapStates(due, now));
    expect(snap.kind).toBe('calm');
  });

  it('kind all-done after last leap', () => {
    const now = addWeeks(due, 200);
    const snap = getTodaySnapshot(computeLeapStates(due, now));
    expect(snap.kind).toBe('all-done');
  });
});
