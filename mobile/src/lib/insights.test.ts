import { computeWeeklyInsights } from './insights';
import type { JournalEntry } from '@/src/store/journal';

const NOW = new Date('2026-04-25T12:00:00Z');

function entry(
  partial: Partial<JournalEntry> & { date: Date; id?: string },
): JournalEntry {
  return {
    id: partial.id ?? `e-${partial.date.toISOString()}`,
    date: partial.date,
    mood: partial.mood ?? 'ok',
    symptoms: partial.symptoms ?? [],
    note: partial.note ?? '',
    linkedLeapNumber: partial.linkedLeapNumber,
  };
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

describe('computeWeeklyInsights', () => {
  it('returns null when there are no entries', () => {
    expect(computeWeeklyInsights([], NOW)).toBeNull();
  });

  it('returns null when all entries are older than 7 days', () => {
    const entries = [entry({ date: daysAgo(8) }), entry({ date: daysAgo(30) })];
    expect(computeWeeklyInsights(entries, NOW)).toBeNull();
  });

  it('counts entries and unique days within the 7-day window', () => {
    const entries = [
      entry({ date: daysAgo(0), id: 'a' }),
      entry({ date: daysAgo(0, 18), id: 'b' }), // same day, second entry
      entry({ date: daysAgo(2), id: 'c' }),
      entry({ date: daysAgo(5), id: 'd' }),
      entry({ date: daysAgo(8), id: 'e' }), // outside window
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result).not.toBeNull();
    expect(result!.totalEntries).toBe(4);
    expect(result!.daysCovered).toBe(3);
  });

  it('treats fussy/sad mood as a fussy day', () => {
    const entries = [
      entry({ date: daysAgo(1), mood: 'fussy' }),
      entry({ date: daysAgo(2), mood: 'sad' }),
      entry({ date: daysAgo(3), mood: 'great' }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.fussyDays).toBe(2);
  });

  it('treats crying/bad-sleep symptoms as a fussy day even if mood is ok', () => {
    const entries = [
      entry({ date: daysAgo(1), mood: 'ok', symptoms: ['crying'] }),
      entry({ date: daysAgo(2), mood: 'ok', symptoms: ['bad-sleep'] }),
      entry({ date: daysAgo(3), mood: 'ok', symptoms: ['milestone'] }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.fussyDays).toBe(2);
  });

  it('does not double-count multiple fussy entries on the same day', () => {
    const entries = [
      entry({ date: daysAgo(1, 8), mood: 'fussy' }),
      entry({ date: daysAgo(1, 18), mood: 'sad' }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.fussyDays).toBe(1);
  });

  it('reports the most frequent symptom when seen 2+ times', () => {
    const entries = [
      entry({ date: daysAgo(0), symptoms: ['bad-sleep'] }),
      entry({ date: daysAgo(1), symptoms: ['bad-sleep', 'crying'] }),
      entry({ date: daysAgo(2), symptoms: ['bad-sleep'] }),
      entry({ date: daysAgo(3), symptoms: ['crying'] }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.topSymptom).toEqual({ symptom: 'bad-sleep', count: 3 });
  });

  it('returns no top symptom when nothing repeats', () => {
    const entries = [
      entry({ date: daysAgo(0), symptoms: ['crying'] }),
      entry({ date: daysAgo(1), symptoms: ['bad-sleep'] }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.topSymptom).toBeNull();
  });

  it('includes today and excludes day 7+ ago (rolling 7-day window)', () => {
    const entries = [
      entry({ date: daysAgo(0), id: 'today' }),
      entry({ date: daysAgo(6), id: 'edge-in' }),
      entry({ date: daysAgo(7), id: 'edge-out' }),
    ];
    const result = computeWeeklyInsights(entries, NOW);
    expect(result!.totalEntries).toBe(2);
  });
});
