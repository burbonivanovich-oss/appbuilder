import { applyFilter, countByFilter, FILTER_ORDER, FILTER_LABELS } from './journalFilters';
import type { JournalEntry } from '@/src/store/journal';

const entry = (id: string, symptoms: JournalEntry['symptoms']): JournalEntry => ({
  id,
  date: new Date(2024, 0, 1),
  mood: 'ok',
  symptoms,
  note: '',
});

const fixtures: JournalEntry[] = [
  entry('1', ['crying', 'bad-sleep']),
  entry('2', ['milestone']),
  entry('3', []),
  entry('4', ['crying']),
  entry('5', ['needs-contact', 'low-appetite']),
];

describe('applyFilter', () => {
  it('all returns everything', () => {
    expect(applyFilter(fixtures, 'all')).toHaveLength(5);
  });

  it('filters by crying', () => {
    const r = applyFilter(fixtures, 'crying');
    expect(r.map((e) => e.id)).toEqual(['1', '4']);
  });

  it('filters by milestone', () => {
    const r = applyFilter(fixtures, 'milestone');
    expect(r.map((e) => e.id)).toEqual(['2']);
  });

  it('filters by bad-sleep', () => {
    expect(applyFilter(fixtures, 'bad-sleep').map((e) => e.id)).toEqual(['1']);
  });

  it('returns empty when no matches', () => {
    expect(applyFilter([], 'crying')).toHaveLength(0);
    expect(applyFilter(fixtures, 'other')).toHaveLength(0);
  });

  it('does not mutate input', () => {
    const before = fixtures.length;
    applyFilter(fixtures, 'milestone');
    expect(fixtures.length).toBe(before);
  });
});

describe('countByFilter', () => {
  it('counts matches', () => {
    expect(countByFilter(fixtures, 'all')).toBe(5);
    expect(countByFilter(fixtures, 'crying')).toBe(2);
    expect(countByFilter(fixtures, 'milestone')).toBe(1);
    expect(countByFilter(fixtures, 'other')).toBe(0);
  });
});

describe('FILTER_ORDER + FILTER_LABELS', () => {
  it('all order entries have labels', () => {
    for (const f of FILTER_ORDER) {
      expect(FILTER_LABELS[f]).toBeTruthy();
    }
  });

  it('all starts the order', () => {
    expect(FILTER_ORDER[0]).toBe('all');
  });
});
