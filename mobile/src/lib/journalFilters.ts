import type { JournalEntry, SymptomTag } from '@/src/store/journal';

export type JournalFilter = 'all' | SymptomTag;

export const FILTER_LABELS: Record<JournalFilter, string> = {
  all: 'Все',
  crying: 'Плач',
  'bad-sleep': 'Сон',
  'needs-contact': 'Контакт',
  'low-appetite': 'Аппетит',
  milestone: 'Вехи',
  other: 'Другое',
};

export const FILTER_ORDER: JournalFilter[] = [
  'all',
  'milestone',
  'crying',
  'bad-sleep',
  'needs-contact',
  'low-appetite',
  'other',
];

export function applyFilter(entries: JournalEntry[], filter: JournalFilter): JournalEntry[] {
  if (filter === 'all') return entries;
  return entries.filter((e) => e.symptoms.includes(filter));
}

export function countByFilter(
  entries: JournalEntry[],
  filter: JournalFilter,
): number {
  return applyFilter(entries, filter).length;
}
