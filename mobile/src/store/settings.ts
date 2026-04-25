import { useSyncExternalStore } from 'react';
import { PersistentStore, jsonSerializer } from '@/src/lib/persistence';

export type SettingsState = {
  notificationsEnabled: boolean;
};

const store = new PersistentStore<SettingsState>(
  'settings:v1',
  { notificationsEnabled: true },
  jsonSerializer<SettingsState>(),
);

export const settingsStore = {
  hydrate: store.hydrate,
  subscribe: store.subscribe,
  get: store.get,
  getIsHydrated: store.getIsHydrated,

  setNotificationsEnabled: (enabled: boolean) => {
    store.set({ ...store.get(), notificationsEnabled: enabled });
  },
};

export function useSettings(): SettingsState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
