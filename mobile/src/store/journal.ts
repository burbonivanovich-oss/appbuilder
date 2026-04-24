import { useSyncExternalStore } from 'react';

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

type Listener = () => void;

class JournalStore {
  private entries: JournalEntry[];
  private listeners = new Set<Listener>();

  constructor(initial: JournalEntry[]) {
    this.entries = [...initial].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  get = (): JournalEntry[] => this.entries;

  add = (entry: Omit<JournalEntry, 'id'>) => {
    const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next: JournalEntry = { id, ...entry };
    this.entries = [next, ...this.entries].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    this.emit();
    return next;
  };

  remove = (id: string) => {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.emit();
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const l of this.listeners) l();
  }
}

function makeSeedEntries(): JournalEntry[] {
  const now = new Date();
  return [
    {
      id: 'seed-1',
      date: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      mood: 'fussy',
      symptoms: ['crying', 'bad-sleep'],
      note: 'Плохо засыпал днём, много плакал без видимой причины.',
      linkedLeapNumber: 3,
    },
    {
      id: 'seed-2',
      date: new Date(now.getTime() - 1000 * 60 * 60 * 26),
      mood: 'ok',
      symptoms: ['needs-contact'],
      note: 'Просился на руки весь вечер.',
    },
    {
      id: 'seed-3',
      date: new Date(now.getTime() - 1000 * 60 * 60 * 50),
      mood: 'great',
      symptoms: ['milestone'],
      note: 'Первая осознанная улыбка на папу!',
    },
  ];
}

export const journalStore = new JournalStore(makeSeedEntries());

export function useJournal(): JournalEntry[] {
  return useSyncExternalStore(journalStore.subscribe, journalStore.get, journalStore.get);
}
