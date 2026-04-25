import { useSyncExternalStore } from 'react';
import { PersistentStore } from '@/src/lib/persistence';

export type Mood = 'great' | 'ok' | 'sad' | 'fussy' | 'sleepy';

export const MOOD_EMOJI: Record<Mood, string> = {
  great: '😊',
  ok: '😐',
  sad: '😢',
  fussy: '😫',
  sleepy: '😴',
};

export const MOOD_LABEL: Record<Mood, string> = {
  great: 'Хорошо',
  ok: 'Нормально',
  sad: 'Грустит',
  fussy: 'Капризничает',
  sleepy: 'Сонный',
};

export type SymptomTag =
  | 'crying'
  | 'bad-sleep'
  | 'needs-contact'
  | 'low-appetite'
  | 'milestone'
  | 'other';

export const SYMPTOM_LABEL: Record<SymptomTag, string> = {
  crying: 'Больше плачет',
  'bad-sleep': 'Хуже спит',
  'needs-contact': 'Требует контакта',
  'low-appetite': 'Меньше ест',
  milestone: 'Новая веха',
  other: 'Другое',
};

export type JournalEntry = {
  id: string;
  date: Date;
  mood: Mood;
  symptoms: SymptomTag[];
  note: string;
  linkedLeapNumber?: number;
};

type JournalState = {
  entries: JournalEntry[];
};

const store = new PersistentStore<JournalState>(
  'journal:v1',
  { entries: [] },
  { version: 1 },
);

function sortByDateDesc(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const journalStore = {
  hydrate: store.hydrate,
  subscribe: store.subscribe,
  get: store.get,
  getIsHydrated: store.getIsHydrated,

  add: (entry: Omit<JournalEntry, 'id'>): JournalEntry => {
    const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const created: JournalEntry = { id, ...entry };
    const next = sortByDateDesc([created, ...store.get().entries]);
    store.set({ entries: next });
    return created;
  },

  remove: (id: string) => {
    const next = store.get().entries.filter((e) => e.id !== id);
    store.set({ entries: next });
  },

  clear: () => {
    store.reset();
  },
};

export function useJournal(): JournalEntry[] {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  return state.entries;
}
