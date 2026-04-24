import AsyncStorage from '@react-native-async-storage/async-storage';

type Serializer<T> = {
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
};

export class PersistentStore<T> {
  private state: T;
  private isHydrated = false;
  private listeners = new Set<() => void>();
  private hydrationPromise: Promise<void> | null = null;

  constructor(
    private readonly key: string,
    private readonly initial: T,
    private readonly serializer: Serializer<T> = defaultSerializer<T>(),
  ) {
    this.state = initial;
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
    void AsyncStorage.removeItem(this.key);
  };

  hydrate = async (): Promise<void> => {
    if (this.isHydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(this.key);
        if (raw !== null) {
          this.state = this.serializer.deserialize(raw);
        }
      } catch {
        // ignore, fall back to initial
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

  private persist() {
    void AsyncStorage.setItem(this.key, this.serializer.serialize(this.state));
  }
}

function defaultSerializer<T>(): Serializer<T> {
  return {
    serialize: (v) => JSON.stringify(v),
    deserialize: (raw) => JSON.parse(raw) as T,
  };
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

export function jsonSerializer<T>(): Serializer<T> {
  return {
    serialize: (v) => JSON.stringify(v),
    deserialize: (raw) => JSON.parse(raw, dateReviver) as T,
  };
}
