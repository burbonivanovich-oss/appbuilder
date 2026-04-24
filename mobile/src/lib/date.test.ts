import {
  addDays,
  addWeeks,
  diffDays,
  diffWeeks,
  isSameDay,
  pluralRu,
  startOfDay,
  formatDateRu,
  formatRelativeDayRu,
} from './date';

describe('addWeeks', () => {
  it('adds positive weeks', () => {
    const d = new Date(2024, 0, 1);
    const r = addWeeks(d, 2);
    expect(r.getDate()).toBe(15);
  });

  it('subtracts with negative weeks', () => {
    const d = new Date(2024, 0, 15);
    const r = addWeeks(d, -1);
    expect(r.getDate()).toBe(8);
  });

  it('does not mutate input', () => {
    const d = new Date(2024, 0, 1);
    addWeeks(d, 10);
    expect(d.getDate()).toBe(1);
  });

  it('crosses month boundary correctly', () => {
    const d = new Date(2024, 0, 25);
    const r = addWeeks(d, 1);
    expect(r.getMonth()).toBe(1);
    expect(r.getDate()).toBe(1);
  });
});

describe('addDays', () => {
  it('adds days', () => {
    const d = new Date(2024, 5, 10);
    expect(addDays(d, 5).getDate()).toBe(15);
  });
});

describe('diffDays', () => {
  it('returns positive diff when a > b', () => {
    const a = new Date(2024, 0, 10);
    const b = new Date(2024, 0, 1);
    expect(diffDays(a, b)).toBe(9);
  });

  it('returns negative diff when a < b', () => {
    const a = new Date(2024, 0, 1);
    const b = new Date(2024, 0, 10);
    expect(diffDays(a, b)).toBe(-9);
  });

  it('returns 0 for same day with different times', () => {
    const a = new Date(2024, 0, 10, 9, 0);
    const b = new Date(2024, 0, 10, 21, 30);
    expect(diffDays(a, b)).toBe(0);
  });

  it('handles DST transitions on same-day logic', () => {
    // Both dates in same local day even around DST
    const a = new Date(2024, 2, 31, 1, 0);
    const b = new Date(2024, 2, 31, 23, 0);
    expect(diffDays(a, b)).toBe(0);
  });
});

describe('diffWeeks', () => {
  it('computes weeks floor', () => {
    const a = new Date(2024, 0, 15);
    const b = new Date(2024, 0, 1);
    expect(diffWeeks(a, b)).toBe(2);
  });
});

describe('startOfDay', () => {
  it('zeros out time', () => {
    const d = new Date(2024, 5, 10, 15, 30, 45);
    const s = startOfDay(d);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getSeconds()).toBe(0);
    expect(s.getDate()).toBe(10);
  });
});

describe('isSameDay', () => {
  it('true for same date different times', () => {
    expect(
      isSameDay(new Date(2024, 0, 1, 3), new Date(2024, 0, 1, 22)),
    ).toBe(true);
  });
  it('false for different dates', () => {
    expect(
      isSameDay(new Date(2024, 0, 1), new Date(2024, 0, 2)),
    ).toBe(false);
  });
});

describe('pluralRu', () => {
  const forms: [string, string, string] = ['день', 'дня', 'дней'];

  it('singular for 1', () => {
    expect(pluralRu(1, forms)).toBe('день');
  });

  it('few for 2-4', () => {
    expect(pluralRu(2, forms)).toBe('дня');
    expect(pluralRu(3, forms)).toBe('дня');
    expect(pluralRu(4, forms)).toBe('дня');
  });

  it('many for 5-20', () => {
    expect(pluralRu(5, forms)).toBe('дней');
    expect(pluralRu(11, forms)).toBe('дней');
    expect(pluralRu(14, forms)).toBe('дней');
    expect(pluralRu(20, forms)).toBe('дней');
  });

  it('singular for 21', () => {
    expect(pluralRu(21, forms)).toBe('день');
  });

  it('few for 22', () => {
    expect(pluralRu(22, forms)).toBe('дня');
  });

  it('handles large numbers', () => {
    expect(pluralRu(101, forms)).toBe('день');
    expect(pluralRu(111, forms)).toBe('дней');
    expect(pluralRu(121, forms)).toBe('день');
  });

  it('handles 0', () => {
    expect(pluralRu(0, forms)).toBe('дней');
  });
});

describe('formatDateRu', () => {
  it('formats without year', () => {
    expect(formatDateRu(new Date(2024, 2, 15))).toBe('15 марта');
  });
  it('formats with year', () => {
    expect(formatDateRu(new Date(2024, 2, 15), { withYear: true })).toBe(
      '15 марта 2024',
    );
  });
});

describe('formatRelativeDayRu', () => {
  const now = new Date(2024, 5, 10);
  it('today', () => {
    expect(formatRelativeDayRu(new Date(2024, 5, 10, 15), now)).toBe('Сегодня');
  });
  it('yesterday', () => {
    expect(formatRelativeDayRu(new Date(2024, 5, 9), now)).toBe('Вчера');
  });
  it('tomorrow', () => {
    expect(formatRelativeDayRu(new Date(2024, 5, 11), now)).toBe('Завтра');
  });
  it('other day', () => {
    expect(formatRelativeDayRu(new Date(2024, 2, 15), now)).toBe('15 марта');
  });
});
