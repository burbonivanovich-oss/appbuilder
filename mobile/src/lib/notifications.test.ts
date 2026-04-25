import {
  computeScheduledNotifications,
  notificationId,
  NOTIFICATION_HOUR,
  PRE_LEAP_REMINDER_DAYS,
} from './notifications';
import { addWeeks, addDays } from './date';
import type { ChildProfile } from '@/src/store/child';

function makeChild(opts: Partial<ChildProfile> = {}): ChildProfile {
  const dob = new Date(2024, 0, 1);
  return {
    id: 'child-1',
    name: 'Стас',
    dob,
    expectedDob: dob,
    sex: 'male',
    ...opts,
  };
}

describe('computeScheduledNotifications', () => {
  it('schedules 2 notifications per upcoming leap (pre-leap + start)', () => {
    const child = makeChild();
    const now = new Date(2024, 0, 1); // at birth
    const result = computeScheduledNotifications(child, now);
    // 10 leaps × 2 = 20 expected
    expect(result).toHaveLength(20);
    expect(result.filter((n) => n.data.kind === 'pre-leap')).toHaveLength(10);
    expect(result.filter((n) => n.data.kind === 'leap-start')).toHaveLength(10);
  });

  it('filters out past notifications', () => {
    const child = makeChild();
    const now = addWeeks(child.dob, 30); // past leap 5 (week 26)
    const result = computeScheduledNotifications(child, now);
    // leaps 1-5 are past, only leaps 6-10 remain × 2 = 10
    expect(result.length).toBeLessThan(20);
    expect(result.length).toBeGreaterThan(0);
    // verify no past dates
    for (const n of result) {
      expect(n.fireAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('returns empty when all leaps are past', () => {
    const child = makeChild();
    const now = addWeeks(child.dob, 100);
    expect(computeScheduledNotifications(child, now)).toHaveLength(0);
  });

  it('pre-leap fires 3 days before window start at 9am', () => {
    const child = makeChild();
    const now = child.dob;
    const result = computeScheduledNotifications(child, now);
    const leap1Pre = result.find(
      (n) => n.data.kind === 'pre-leap' && n.data.leapNumber === 1,
    );
    expect(leap1Pre).toBeDefined();
    // leap 1 center is week 5, window starts at week 4 (5 - 1)
    // pre-leap is 3 days before that = week 4 - 3 days
    const expectedDate = addDays(addWeeks(child.dob, 4), -PRE_LEAP_REMINDER_DAYS);
    expect(leap1Pre!.fireAt.getDate()).toBe(expectedDate.getDate());
    expect(leap1Pre!.fireAt.getHours()).toBe(NOTIFICATION_HOUR);
    expect(leap1Pre!.fireAt.getMinutes()).toBe(0);
  });

  it('preterm: schedules from expectedDob, not actual dob', () => {
    const dob = new Date(2024, 0, 1);
    const expectedDob = addWeeks(dob, 7); // born 7 weeks early
    const child = makeChild({ dob, expectedDob });
    const now = dob;
    const result = computeScheduledNotifications(child, now);
    const leap1Start = result.find(
      (n) => n.data.kind === 'leap-start' && n.data.leapNumber === 1,
    );
    expect(leap1Start).toBeDefined();
    // leap 1 should fire at expectedDob + 4 weeks (window start), not dob + 4 weeks
    const expectedFire = addWeeks(expectedDob, 4);
    expect(leap1Start!.fireAt.getDate()).toBe(expectedFire.getDate());
    expect(leap1Start!.fireAt.getMonth()).toBe(expectedFire.getMonth());
  });

  it('uses child name in title and body', () => {
    const child = makeChild({ name: 'Лёва' });
    const result = computeScheduledNotifications(child, child.dob);
    for (const n of result) {
      expect(n.title).toContain('Лёва');
    }
  });

  it('passes tone-of-voice checks', () => {
    const child = makeChild();
    const result = computeScheduledNotifications(child, child.dob);
    const banned = ['срочно', 'опасно', 'тревога', 'симптом', 'должн', 'не пропуст'];
    for (const n of result) {
      const text = `${n.title} ${n.body}`.toLowerCase();
      for (const word of banned) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('uses softer language: "возможно", "может"', () => {
    const child = makeChild();
    const result = computeScheduledNotifications(child, child.dob);
    for (const n of result) {
      const text = `${n.title} ${n.body}`.toLowerCase();
      expect(text).toMatch(/возможно|может/);
    }
  });
});

describe('notificationId', () => {
  it('produces deterministic id', () => {
    expect(notificationId('child-1', 3, 'pre-leap')).toBe('child:child-1:leap:3:pre-leap');
    expect(notificationId('child-1', 3, 'leap-start')).toBe('child:child-1:leap:3:leap-start');
  });

  it('different leaps produce different ids', () => {
    expect(notificationId('child-1', 1, 'pre-leap')).not.toBe(
      notificationId('child-1', 2, 'pre-leap'),
    );
  });
});
