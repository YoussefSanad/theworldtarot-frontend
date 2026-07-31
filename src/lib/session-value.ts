/**
 * A single sessionStorage entry exposed as an external store, so components can
 * read it with `useSyncExternalStore` instead of syncing it in an effect.
 *
 * Writes in the same tab do not raise a `storage` event, so subscribers are
 * notified directly.
 */
export type SessionValue = {
  subscribe: (listener: () => void) => () => void;
  get: () => string | null;
  set: (value: string) => void;
};

export function createSessionValue(key: string): SessionValue {
  const listeners = new Set<() => void>();
  let snapshot: string | null = null;
  let loaded = false;

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get() {
      if (!loaded) {
        snapshot = sessionStorage.getItem(key);
        loaded = true;
      }
      return snapshot;
    },
    set(value) {
      sessionStorage.setItem(key, value);
      snapshot = value;
      loaded = true;
      for (const listener of listeners) listener();
    },
  };
}
