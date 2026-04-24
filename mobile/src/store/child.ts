import { useSyncExternalStore } from 'react';

export type ChildProfile = {
  id: string;
  name: string;
  dob: Date;
  expectedDob: Date;
  sex: 'male' | 'female' | 'unspecified';
};

type Listener = () => void;

class ChildStore {
  private child: ChildProfile;
  private listeners = new Set<Listener>();

  constructor(initial: ChildProfile) {
    this.child = initial;
  }

  get = (): ChildProfile => this.child;

  set = (next: ChildProfile) => {
    this.child = next;
    this.emit();
  };

  update = (patch: Partial<ChildProfile>) => {
    this.child = { ...this.child, ...patch };
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

function makeDemoChild(): ChildProfile {
  const now = new Date();
  const dob = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14 * 7);
  return {
    id: 'demo-child',
    name: 'Лёва',
    dob,
    expectedDob: dob,
    sex: 'male',
  };
}

export const childStore = new ChildStore(makeDemoChild());

export function useChild(): ChildProfile {
  return useSyncExternalStore(childStore.subscribe, childStore.get, childStore.get);
}
