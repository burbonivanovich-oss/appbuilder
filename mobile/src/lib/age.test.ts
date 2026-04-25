import {
  ageInDays,
  ageInWeeks,
  ageInMonthsApprox,
  formatAgeRu,
  formatAgeWithCorrection,
  getPretermInfo,
} from './age';
import { addDays, addWeeks } from './date';

describe('ageInDays', () => {
  it('counts days between DOB and now', () => {
    const dob = new Date(2024, 0, 1);
    const now = addDays(dob, 10);
    expect(ageInDays(dob, now)).toBe(10);
  });
});

describe('ageInWeeks', () => {
  it('floors to whole weeks', () => {
    const dob = new Date(2024, 0, 1);
    expect(ageInWeeks(dob, addDays(dob, 6))).toBe(0);
    expect(ageInWeeks(dob, addDays(dob, 7))).toBe(1);
    expect(ageInWeeks(dob, addDays(dob, 13))).toBe(1);
    expect(ageInWeeks(dob, addDays(dob, 14))).toBe(2);
  });
});

describe('ageInMonthsApprox', () => {
  it('returns 0 for same-month', () => {
    const dob = new Date(2024, 0, 1);
    expect(ageInMonthsApprox(dob, new Date(2024, 0, 20))).toBe(0);
  });

  it('increments when month boundary crossed', () => {
    const dob = new Date(2024, 0, 15);
    expect(ageInMonthsApprox(dob, new Date(2024, 1, 15))).toBe(1);
    expect(ageInMonthsApprox(dob, new Date(2024, 1, 14))).toBe(0);
  });
});

describe('formatAgeRu', () => {
  const dob = new Date(2024, 0, 1);

  it('days for < 14 days old', () => {
    expect(formatAgeRu(dob, addDays(dob, 1))).toBe('1 день');
    expect(formatAgeRu(dob, addDays(dob, 3))).toBe('3 дня');
    expect(formatAgeRu(dob, addDays(dob, 10))).toBe('10 дней');
  });

  it('weeks for 2 to 16 weeks', () => {
    expect(formatAgeRu(dob, addWeeks(dob, 2))).toBe('2 недели');
    expect(formatAgeRu(dob, addWeeks(dob, 5))).toBe('5 недель');
    expect(formatAgeRu(dob, addWeeks(dob, 16))).toBe('16 недель');
  });

  it('months for 17 weeks+', () => {
    expect(formatAgeRu(dob, addWeeks(dob, 17))).toMatch(/месяц/);
  });

  it('years+months for 2 years+', () => {
    const result = formatAgeRu(dob, new Date(2027, 0, 1));
    expect(result).toMatch(/год|лет/);
  });

  it('not yet born', () => {
    const future = addDays(dob, 10);
    expect(formatAgeRu(future, dob)).toBe('ещё не родился');
  });
});

describe('getPretermInfo', () => {
  it('not preterm when dob === expectedDob', () => {
    const dob = new Date(2024, 0, 1);
    const info = getPretermInfo(dob, dob, addWeeks(dob, 14));
    expect(info.isPreterm).toBe(false);
    expect(info.chronological).toBe(info.corrected);
  });

  it('preterm when dob earlier than expectedDob', () => {
    const dob = new Date(2024, 0, 1);
    const expected = addWeeks(dob, 7); // 7 weeks early
    const info = getPretermInfo(dob, expected, addWeeks(dob, 14));
    expect(info.isPreterm).toBe(true);
    expect(info.chronological).not.toBe(info.corrected);
  });
});

describe('formatAgeWithCorrection', () => {
  it('returns plain age for term babies', () => {
    const dob = new Date(2024, 0, 1);
    expect(formatAgeWithCorrection(dob, dob, addWeeks(dob, 14))).toBe('14 недель');
  });

  it('shows both ages for preterm with скорр.', () => {
    const dob = new Date(2024, 0, 1);
    const expected = addWeeks(dob, 7); // born 7 weeks early
    const result = formatAgeWithCorrection(dob, expected, addWeeks(dob, 14));
    // chronological: 14 weeks; corrected: 7 weeks
    expect(result).toContain('14 недель');
    expect(result).toContain('7 недель');
    expect(result).toContain('скорр');
  });
});
