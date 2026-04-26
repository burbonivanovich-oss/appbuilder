import { useSyncExternalStore } from 'react';
import { PersistentStore } from '@/src/lib/persistence';

export type SettingsState = {
  notificationsEnabled: boolean;
  disclaimerAccepted: boolean;
  isPremium: boolean;
  premiumSince: string | null;
};

const DEFAULT: SettingsState = {
  notificationsEnabled: true,
  disclaimerAccepted: false,
  isPremium: false,
  premiumSince: null,
};

const store = new PersistentStore<SettingsState>(
  'settings:v1',
  DEFAULT,
  {
    version: 2,
    migrate: (raw, fromVersion) => {
      const r = (raw as Partial<SettingsState>) ?? {};
      if (fromVersion === 0) {
        return {
          ...DEFAULT,
          notificationsEnabled:
            typeof r.notificationsEnabled === 'boolean' ? r.notificationsEnabled : true,
          disclaimerAccepted: false,
        };
      }
      if (fromVersion === 1) {
        return {
          ...DEFAULT,
          notificationsEnabled:
            typeof r.notificationsEnabled === 'boolean' ? r.notificationsEnabled : true,
          disclaimerAccepted:
            typeof r.disclaimerAccepted === 'boolean' ? r.disclaimerAccepted : false,
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

  activatePremium: () => {
    store.set({
      ...store.get(),
      isPremium: true,
      premiumSince: new Date().toISOString(),
    });
  },

  deactivatePremium: () => {
    store.set({ ...store.get(), isPremium: false, premiumSince: null });
  },
};

export function useSettings(): SettingsState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function useIsPremium(): boolean {
  return useSettings().isPremium;
}
