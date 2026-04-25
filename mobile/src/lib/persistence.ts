import AsyncStorage from '@react-native-async-storage/async-storage';

export type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const asyncStorageBackend: Storage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

type Wrapper<T> = { __v: number; data: T };

function isWrapper(value: unknown): value is { __v: number; data: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { __v?: unknown }).__v === 'number' &&
    'data' in value
  );
}

export type StoreOptions<T> = {
  /** Schema version. Bump when the shape of T changes incompatibly. Defaults to 1. */
  version?: number;
  /**
   * Called when persisted data is at an older version (or has no version
   * marker, meaning legacy data). Receives the raw deserialized value and
   * the version it was written at (0 for legacy, otherwise the recorded
   * `__v`). Must return the data shaped to the current version.
   *
   * Default: identity, returns the raw value typed as T. Safe only when the
   * shape hasn't actually changed.
   */
  migrate?: (raw: unknown, fromVersion: number) => T;
  /** Inject a different storage backend (used in tests). Defaults to AsyncStorage. */
  storage?: Storage;
};

export class PersistentStore<T> {
  private state: T;
  private isHydrated = false;
  private listeners = new Set<() => void>();
  private hydrationPromise: Promise<void> | null = null;
  private readonly version: number;
  private readonly migrate: (raw: unknown, fromVersion: number) => T;
  private readonly storage: Storage;

  constructor(
    private readonly key: string,
    private readonly initial: T,
    options: StoreOptions<T> = {},
  ) {
    this.state = initial;
    this.version = options.version ?? 1;
    this.migrate = options.migrate ?? ((raw) => raw as T);
    this.storage = options.storage ?? asyncStorageBackend;
  }

  get = (): T => this.state;

  getIsHydrated = (): boolean => this.isHydrated;

  set = (next: T) => {
    this.state = next;
    this.emit();
    this.persist();
  };

  update = (patch: Partial<T>) => {
    this.state = { ...this.state, ...patch } as T;
    this.emit();
    this.persist();
  };

  reset = () => {
    this.state = this.initial;
    this.emit();
    void this.storage.removeItem(this.key);
  };

  hydrate = async (): Promise<void> => {
    if (this.isHydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      try {
        const raw = await this.storage.getItem(this.key);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw, dateReviver);
          if (isWrapper(parsed)) {
            if (parsed.__v === this.version) {
              this.state = parsed.data as T;
            } else if (parsed.__v < this.version) {
              this.state = this.migrate(parsed.data, parsed.__v);
              await this.persist();
            } else {
              // Persisted version is newer than what this build understands —
              // safer to fall back to defaults than to use future-shaped data.
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.warn(
                  `[PersistentStore:${this.key}] persisted v${parsed.__v} > current v${this.version}; falling back to initial`,
                );
              }
            }
          } else {
            // Legacy data written before versioning was introduced.
            this.state = this.migrate(parsed, 0);
            await this.persist();
          }
        }
      } catch {
        // Corrupt data — fall back to initial. Don't throw, the app must boot.
      }
      this.isHydrated = true;
      this.emit();
    })();
    return this.hydrationPromise;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const l of this.listeners) l();
  }

  private async persist(): Promise<void> {
    const wrapper: Wrapper<T> = { __v: this.version, data: this.state };
    try {
      await this.storage.setItem(this.key, JSON.stringify(wrapper));
    } catch {
      // ignore — best effort, app continues to function in-memory
    }
  }
}

export function dateReviver(_: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(value)
  ) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return value;
}

/**
 * In-memory storage backend, useful for tests. Each instance has its own
 * isolated map so test cases don't bleed state.
 */
export function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => {
      map.set(k, v);
    },
    removeItem: async (k) => {
      map.delete(k);
    },
  };
}
