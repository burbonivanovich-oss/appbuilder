import { buildLeapHero } from './leapHero';
import type { LeapState, TodaySnapshot } from './leaps';

function activeLeap(over: Partial<LeapState> = {}): LeapState {
  return {
    number: 4,
    status: 'active',
    centerDate: new Date('2026-04-25'),
    startDate: new Date('2026-04-22'),
    endDate: new Date('2026-04-29'),
    daysUntilStart: 0,
    daysIntoLeap: 2,
    daysSinceEnded: 0,
    durationDays: 6,
    ...over,
  };
}

function preLeap(over: Partial<LeapState> = {}): LeapState {
  return {
    number: 5,
    status: 'pre-leap',
    centerDate: new Date('2026-05-10'),
    startDate: new Date('2026-05-05'),
    endDate: new Date('2026-05-15'),
    daysUntilStart: 5,
    daysIntoLeap: 0,
    daysSinceEnded: 0,
    durationDays: 10,
    ...over,
  };
}

describe('buildLeapHero', () => {
  describe('active', () => {
    it('shows day count, progress, and a CTA pointing to the leap detail', () => {
      const snapshot: TodaySnapshot = { kind: 'active', leap: activeLeap() };
      const hero = buildLeapHero(snapshot);
      expect(hero.label).toBe('Сейчас идёт');
      expect(hero.title).toBe('Скачок 4');
      expect(hero.subtitle).toContain('День 3 из ≈7');
      expect(hero.cta).toBe('Подробнее о скачке');
      expect(hero.accent).toBe(true);
      expect(hero.progress).toBeCloseTo(3 / 7, 5);
    });

    it('caps progress at 1 even if daysIntoLeap exceeds duration', () => {
      const snapshot: TodaySnapshot = {
        kind: 'active',
        leap: activeLeap({ daysIntoLeap: 99, durationDays: 6 }),
      };
      const hero = buildLeapHero(snapshot);
      expect(hero.progress).toBe(1);
    });
  });

  describe('pre-leap', () => {
    it('uses correct Russian pluralization for "день"', () => {
      const oneDay = buildLeapHero({ kind: 'pre-leap', leap: preLeap({ daysUntilStart: 1 }) });
      expect(oneDay.title).toBe('Скачок 5 через 1 день');

      const threeDays = buildLeapHero({ kind: 'pre-leap', leap: preLeap({ daysUntilStart: 3 }) });
      expect(threeDays.title).toBe('Скачок 5 через 3 дня');

      const sevenDays = buildLeapHero({ kind: 'pre-leap', leap: preLeap({ daysUntilStart: 7 }) });
      expect(sevenDays.title).toBe('Скачок 5 через 7 дней');
    });

    it('is non-accent (informational, not alarming)', () => {
      const hero = buildLeapHero({ kind: 'pre-leap', leap: preLeap() });
      expect(hero.accent).toBe(false);
    });

    it('subtitle uses tone-of-voice approved phrasing', () => {
      const hero = buildLeapHero({ kind: 'pre-leap', leap: preLeap() });
      // tone-of-voice rules: no "должен", no "симптомы", no "пропустите"
      expect(hero.subtitle).not.toMatch(/симптом/i);
      expect(hero.subtitle).not.toMatch(/должн/i);
      expect(hero.subtitle).not.toMatch(/пропуст/i);
      expect(hero.subtitle).toMatch(/можно готовиться/i);
    });
  });

  describe('calm', () => {
    it('shows weeks-until-next when there is a next leap', () => {
      const snapshot: TodaySnapshot = {
        kind: 'calm',
        next: preLeap({ number: 6, daysUntilStart: 21 }),
        last: null,
      };
      const hero = buildLeapHero(snapshot);
      expect(hero.subtitle).toBe('До следующего скачка ≈3 недели.');
      expect(hero.cta).toBe('Посмотреть скачок 6');
    });

    it('rounds weeks up to at least 1 even for short remaining time', () => {
      const snapshot: TodaySnapshot = {
        kind: 'calm',
        next: preLeap({ daysUntilStart: 2 }),
        last: null,
      };
      const hero = buildLeapHero(snapshot);
      expect(hero.subtitle).toContain('≈1 неделю');
    });

    it('omits CTA and subtitle when there is no next leap (between birth and first)', () => {
      const snapshot: TodaySnapshot = { kind: 'calm', next: null, last: null };
      const hero = buildLeapHero(snapshot);
      expect(hero.cta).toBeUndefined();
      expect(hero.subtitle).toBeUndefined();
      expect(hero.label).toBe('Спокойный период');
    });
  });

  describe('all-done', () => {
    it('renders a celebratory non-accent card', () => {
      const snapshot: TodaySnapshot = {
        kind: 'all-done',
        last: { ...activeLeap({ number: 10 }), status: 'completed' },
      };
      const hero = buildLeapHero(snapshot);
      expect(hero.label).toBe('Поздравляем');
      expect(hero.title).toContain('10 скачков');
      expect(hero.accent).toBe(false);
    });
  });
});
