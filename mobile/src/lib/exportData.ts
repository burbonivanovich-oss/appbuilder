import type { ChildProfile } from '@/src/store/child';
import type { JournalEntry } from '@/src/store/journal';

export const EXPORT_FORMAT_VERSION = 1;

export type ExportedJournalEntry = {
  id: string;
  date: string; // ISO
  mood: JournalEntry['mood'];
  symptoms: JournalEntry['symptoms'];
  note: string;
  linkedLeapNumber?: number;
};

export type ExportedChildProfile = {
  id: string;
  name: string;
  dob: string; // ISO
  expectedDob: string; // ISO
  sex: ChildProfile['sex'];
};

export type ExportPayload = {
  app: 'rost-malysha';
  formatVersion: number;
  exportedAt: string; // ISO
  child: ExportedChildProfile | null;
  journal: ExportedJournalEntry[];
};

export function buildExportPayload(
  child: ChildProfile | null,
  entries: readonly JournalEntry[],
  now: Date = new Date(),
): ExportPayload {
  return {
    app: 'rost-malysha',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    child: child
      ? {
          id: child.id,
          name: child.name,
          dob: child.dob.toISOString(),
          expectedDob: child.expectedDob.toISOString(),
          sex: child.sex,
        }
      : null,
    journal: entries.map((e) => ({
      id: e.id,
      date: e.date.toISOString(),
      mood: e.mood,
      symptoms: e.symptoms,
      note: e.note,
      linkedLeapNumber: e.linkedLeapNumber,
    })),
  };
}

export function serializeExport(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/**
 * Suggested filename. Includes child name (sanitized to ASCII-safe) and date,
 * so multiple exports don't collide.
 */
export function exportFilename(payload: ExportPayload): string {
  const datePart = payload.exportedAt.slice(0, 10); // YYYY-MM-DD
  const namePart = payload.child
    ? sanitize(payload.child.name) || 'baby'
    : 'data';
  return `rost-malysha-${namePart}-${datePart}.json`;
}

function sanitize(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .toLowerCase();
}

export function exportSummary(payload: ExportPayload): string {
  const entryCount = payload.journal.length;
  return payload.child
    ? `${payload.child.name}: ${entryCount} ${plural(entryCount, ['запись', 'записи', 'записей'])}`
    : `${entryCount} ${plural(entryCount, ['запись', 'записи', 'записей'])}`;
}

function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
