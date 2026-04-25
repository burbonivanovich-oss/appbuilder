import { useSyncExternalStore } from 'react';
import { PersistentStore } from '@/src/lib/persistence';

export type SettingsState = {
  notificationsEnabled: boolean;
  disclaimerAccepted: boolean;
};

const store = new PersistentStore<SettingsState>(
  'settings:v1',
  { notificationsEnabled: true, disclaimerAccepted: false },
  {
    version: 1,
    migrate: (raw, fromVersion) => {
      // fromVersion 0 = legacy pre-versioning data, which only had
      // notificationsEnabled (disclaimerAccepted was added later). Backfill
      // it as false so existing users see the disclaimer once.
      if (fromVersion === 0) {
        const r = (raw as { notificationsEnabled?: unknown }) ?? {};
        return {
          notificationsEnabled:
            typeof r.notificationsEnabled === 'boolean' ? r.notificationsEnabled : true,
          disclaimerAccepted: false,
        };
      }
      return raw as SettingsState;
    },
  },
);

export const settingsStore = {
  hydrate: store.hydrate,
  subscribe: store.subscribe,
  get: store.get,
  getIsHydrated: store.getIsHydrated,

  setNotificationsEnabled: (enabled: boolean) => {
    store.set({ ...store.get(), notificationsEnabled: enabled });
  },

  acceptDisclaimer: () => {
    store.set({ ...store.get(), disclaimerAccepted: true });
  },
};

export function useSettings(): SettingsState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
