import {
  buildExportPayload,
  exportFilename,
  exportSummary,
  serializeExport,
  EXPORT_FORMAT_VERSION,
} from './exportData';
import type { ChildProfile } from '@/src/store/child';
import type { JournalEntry } from '@/src/store/journal';

const NOW = new Date('2026-04-25T12:00:00.000Z');

const child: ChildProfile = {
  id: 'child-1',
  name: 'Стас',
  dob: new Date('2025-09-01T00:00:00.000Z'),
  expectedDob: new Date('2025-09-15T00:00:00.000Z'),
  sex: 'male',
};

const entries: JournalEntry[] = [
  {
    id: 'e1',
    date: new Date('2026-04-24T08:00:00.000Z'),
    mood: 'fussy',
    symptoms: ['bad-sleep', 'crying'],
    note: 'Долго укладывался',
    linkedLeapNumber: 5,
  },
  {
    id: 'e2',
    date: new Date('2026-04-23T19:30:00.000Z'),
    mood: 'great',
    symptoms: [],
    note: '',
  },
];

describe('buildExportPayload', () => {
  it('serializes the child profile with ISO dates', () => {
    const payload = buildExportPayload(child, entries, NOW);
    expect(payload.child).toEqual({
      id: 'child-1',
      name: 'Стас',
      dob: '2025-09-01T00:00:00.000Z',
      expectedDob: '2025-09-15T00:00:00.000Z',
      sex: 'male',
    });
  });

  it('serializes journal entries with ISO dates and preserves all fields', () => {
    const payload = buildExportPayload(child, entries, NOW);
    expect(payload.journal).toHaveLength(2);
    expect(payload.journal[0]).toEqual({
      id: 'e1',
      date: '2026-04-24T08:00:00.000Z',
      mood: 'fussy',
      symptoms: ['bad-sleep', 'crying'],
      note: 'Долго укладывался',
      linkedLeapNumber: 5,
    });
    expect(payload.journal[1].linkedLeapNumber).toBeUndefined();
  });

  it('handles null child gracefully', () => {
    const payload = buildExportPayload(null, [], NOW);
    expect(payload.child).toBeNull();
    expect(payload.journal).toEqual([]);
  });

  it('records the format version and app marker', () => {
    const payload = buildExportPayload(child, [], NOW);
    expect(payload.app).toBe('rost-malysha');
    expect(payload.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(payload.exportedAt).toBe(NOW.toISOString());
  });
});

describe('serializeExport', () => {
  it('produces pretty-printed JSON that parses back to the same payload', () => {
    const payload = buildExportPayload(child, entries, NOW);
    const text = serializeExport(payload);
    expect(text).toContain('\n');
    expect(JSON.parse(text)).toEqual(payload);
  });
});

describe('exportFilename', () => {
  it('includes sanitized child name and the export date', () => {
    const payload = buildExportPayload(child, entries, NOW);
    const name = exportFilename(payload);
    expect(name).toMatch(/^rost-malysha-.+-2026-04-25\.json$/);
    expect(name).not.toContain(' ');
    expect(name).not.toContain('/');
  });

  it('falls back to "data" when there is no child', () => {
    const payload = buildExportPayload(null, [], NOW);
    expect(exportFilename(payload)).toBe('rost-malysha-data-2026-04-25.json');
  });

  it('strips path-unsafe characters from the name', () => {
    const evilChild = { ...child, name: '../../etc/passwd' };
    const payload = buildExportPayload(evilChild, [], NOW);
    const name = exportFilename(payload);
    expect(name).not.toContain('..');
    expect(name).not.toContain('/');
  });
});

describe('exportSummary', () => {
  it('uses correct Russian pluralization', () => {
    const payload1 = buildExportPayload(child, entries.slice(0, 1), NOW);
    expect(exportSummary(payload1)).toBe('Стас: 1 запись');

    const payload2 = buildExportPayload(child, entries, NOW);
    expect(exportSummary(payload2)).toBe('Стас: 2 записи');

    const payload5 = buildExportPayload(
      child,
      Array.from({ length: 5 }, (_, i) => ({ ...entries[0], id: `e${i}` })),
      NOW,
    );
    expect(exportSummary(payload5)).toBe('Стас: 5 записей');
  });
});
