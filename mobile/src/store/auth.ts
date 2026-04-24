import { useSyncExternalStore } from 'react';
import { PersistentStore, jsonSerializer } from '@/src/lib/persistence';

export type AuthProvider = 'apple' | 'google' | 'email';

export type User = {
  id: string;
  email: string;
  provider: AuthProvider;
  displayName: string;
};

type AuthState = {
  user: User | null;
};

const store = new PersistentStore<AuthState>(
  'auth:v1',
  { user: null },
  jsonSerializer<AuthState>(),
);

export const authStore = {
  hydrate: store.hydrate,
  subscribe: store.subscribe,
  get: store.get,
  getIsHydrated: store.getIsHydrated,

  signInMock: (provider: AuthProvider, email?: string): User => {
    const user: User = {
      id: `mock-${provider}-${Date.now()}`,
      email: email ?? `demo@${provider}.local`,
      provider,
      displayName: provider === 'apple' ? 'Пользователь Apple' : provider === 'google' ? 'Пользователь Google' : (email ?? 'Вы'),
    };
    store.set({ user });
    return user;
  },

  signOut: () => {
    store.reset();
  },
};

export function useAuth(): { user: User | null; isHydrated: boolean } {
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const isHydrated = useSyncExternalStore(
    store.subscribe,
    store.getIsHydrated,
    store.getIsHydrated,
  );
  return { user: state.user, isHydrated };
}
