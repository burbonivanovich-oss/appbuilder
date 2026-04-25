import { PersistentStore, memoryStorage } from './persistence';

type FooV1 = { count: number; name: string };
type FooV2 = { count: number; name: string; flag: boolean };

describe('PersistentStore', () => {
  describe('hydration', () => {
    it('uses initial state when storage is empty', async () => {
      const storage = memoryStorage();
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      await store.hydrate();
      expect(store.get()).toEqual({ count: 0, name: '' });
      expect(store.getIsHydrated()).toBe(true);
    });

    it('loads persisted current-version data', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 1, data: { count: 5, name: 'hello' } }),
      });
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      await store.hydrate();
      expect(store.get()).toEqual({ count: 5, name: 'hello' });
    });

    it('falls back to initial when storage contains corrupt JSON', async () => {
      const storage = memoryStorage({ k: '{not json' });
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      await store.hydrate();
      expect(store.get()).toEqual({ count: 0, name: '' });
    });

    it('hydration is idempotent across concurrent calls', async () => {
      let reads = 0;
      const baseStorage = memoryStorage({
        k: JSON.stringify({ __v: 1, data: { count: 1, name: 'a' } }),
      });
      const storage = {
        ...baseStorage,
        getItem: async (key: string) => {
          reads += 1;
          return baseStorage.getItem(key);
        },
      };
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      await Promise.all([store.hydrate(), store.hydrate(), store.hydrate()]);
      expect(reads).toBe(1);
    });
  });

  describe('migrations', () => {
    it('migrates legacy data with no version marker as fromVersion=0', async () => {
      // pre-versioning format: raw T at the key, no { __v, data } wrapper
      const storage = memoryStorage({
        k: JSON.stringify({ count: 7 }), // missing `name`, missing `flag`
      });
      const migrate = jest.fn((raw: unknown, fromVersion: number): FooV2 => {
        const r = raw as Partial<FooV2>;
        return {
          count: r.count ?? 0,
          name: r.name ?? '(legacy)',
          flag: false,
        };
      });
      const store = new PersistentStore<FooV2>(
        'k',
        { count: 0, name: '', flag: false },
        { version: 2, migrate, storage },
      );
      await store.hydrate();

      expect(migrate).toHaveBeenCalledWith({ count: 7 }, 0);
      expect(store.get()).toEqual({ count: 7, name: '(legacy)', flag: false });
    });

    it('migrates older wrapper version with the recorded fromVersion', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 1, data: { count: 3, name: 'old' } }),
      });
      const migrate = jest.fn((raw: unknown, fromVersion: number): FooV2 => {
        const r = raw as FooV1;
        return { ...r, flag: false };
      });
      const store = new PersistentStore<FooV2>(
        'k',
        { count: 0, name: '', flag: false },
        { version: 2, migrate, storage },
      );
      await store.hydrate();

      expect(migrate).toHaveBeenCalledWith({ count: 3, name: 'old' }, 1);
      expect(store.get()).toEqual({ count: 3, name: 'old', flag: false });
    });

    it('persists in current wrapper format after migration', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ count: 9 }),
      });
      const migrate = (raw: unknown): FooV1 => ({
        count: (raw as FooV1).count,
        name: 'migrated',
      });
      const store = new PersistentStore<FooV1>(
        'k',
        { count: 0, name: '' },
        { version: 1, migrate, storage },
      );
      await store.hydrate();

      const persisted = await storage.getItem('k');
      expect(persisted).not.toBeNull();
      expect(JSON.parse(persisted!)).toEqual({
        __v: 1,
        data: { count: 9, name: 'migrated' },
      });
    });

    it('falls back to initial when persisted version is newer (downgrade)', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 99, data: { count: 1, name: 'future' } }),
      });
      const migrate = jest.fn();
      const store = new PersistentStore<FooV1>(
        'k',
        { count: 0, name: '' },
        { version: 1, migrate, storage },
      );
      await store.hydrate();

      expect(migrate).not.toHaveBeenCalled();
      expect(store.get()).toEqual({ count: 0, name: '' });
    });

    it('does not call migrate when version matches exactly', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 2, data: { count: 1, name: 'a', flag: true } }),
      });
      const migrate = jest.fn();
      const store = new PersistentStore<FooV2>(
        'k',
        { count: 0, name: '', flag: false },
        { version: 2, migrate, storage },
      );
      await store.hydrate();

      expect(migrate).not.toHaveBeenCalled();
      expect(store.get()).toEqual({ count: 1, name: 'a', flag: true });
    });
  });

  describe('persistence format', () => {
    it('writes wrapper format on set', async () => {
      const storage = memoryStorage();
      const store = new PersistentStore<FooV1>(
        'k',
        { count: 0, name: '' },
        { version: 3, storage },
      );
      await store.hydrate();
      store.set({ count: 42, name: 'set' });
      // give the async setItem inside set() a tick
      await new Promise((r) => setTimeout(r, 0));

      const persisted = await storage.getItem('k');
      expect(JSON.parse(persisted!)).toEqual({
        __v: 3,
        data: { count: 42, name: 'set' },
      });
    });

    it('round-trips Date objects through hydration', async () => {
      type WithDate = { when: Date };
      const storage = memoryStorage();
      const fixedDate = new Date('2026-04-25T10:30:00.000Z');
      const writer = new PersistentStore<WithDate>(
        'k',
        { when: new Date(0) },
        { version: 1, storage },
      );
      await writer.hydrate();
      writer.set({ when: fixedDate });
      await new Promise((r) => setTimeout(r, 0));

      const reader = new PersistentStore<WithDate>(
        'k',
        { when: new Date(0) },
        { version: 1, storage },
      );
      await reader.hydrate();

      expect(reader.get().when).toBeInstanceOf(Date);
      expect(reader.get().when.getTime()).toBe(fixedDate.getTime());
    });
  });

  describe('reset', () => {
    it('clears storage and returns to initial state', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 1, data: { count: 5, name: 'x' } }),
      });
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      await store.hydrate();
      expect(store.get().count).toBe(5);

      store.reset();
      expect(store.get()).toEqual({ count: 0, name: '' });
      // give removeItem a tick
      await new Promise((r) => setTimeout(r, 0));
      expect(await storage.getItem('k')).toBeNull();
    });
  });

  describe('subscriptions', () => {
    it('notifies subscribers on set/update/reset/hydrate', async () => {
      const storage = memoryStorage({
        k: JSON.stringify({ __v: 1, data: { count: 1, name: 'a' } }),
      });
      const store = new PersistentStore<FooV1>('k', { count: 0, name: '' }, {
        version: 1,
        storage,
      });
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      await store.hydrate();
      store.set({ count: 2, name: 'b' });
      store.update({ count: 3 });
      store.reset();

      expect(listener).toHaveBeenCalledTimes(4);
      unsubscribe();
      store.set({ count: 9, name: 'after-unsub' });
      expect(listener).toHaveBeenCalledTimes(4);
    });
  });
});
