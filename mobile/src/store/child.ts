import { useSyncExternalStore } from 'react';
import { PersistentStore, jsonSerializer } from '@/src/lib/persistence';

export type ChildProfile = {
  id: string;
  name: string;
  dob: Date;
  expectedDob: Date;
  sex: 'male' | 'female' | 'unspecified';
};

type ChildState = {
  child: ChildProfile | null;
};

const store = new PersistentStore<ChildState>(
  'child:v1',
  { child: null },
  jsonSerializer<ChildState>(),
);

export const childStore = {
  hydrate: store.hydrate,
  subscribe: store.subscribe,
  get: store.get,
  getIsHydrated: store.getIsHydrated,

  create: (input: Omit<ChildProfile, 'id'>): ChildProfile => {
    const child: ChildProfile = {
      id: `child-${Date.now()}`,
      ...input,
    };
    store.set({ child });
    return child;
  },

  update: (patch: Partial<ChildProfile>) => {
    const current = store.get().child;
    if (!current) return;
    store.set({ child: { ...current, ...patch } });
  },

  clear: () => {
    store.reset();
  },
};

export function useChild(): ChildProfile | null {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  return state.child;
}

export function useChildRequired(): ChildProfile {
  const child = useChild();
  if (!child) {
    throw new Error('useChildRequired called without a child profile');
  }
  return child;
}

export function isPreterm(child: ChildProfile): boolean {
  return child.dob.getTime() !== child.expectedDob.getTime();
}
