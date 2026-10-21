/** Nur Mock-Deltas persistieren: der große deterministische Seed bleibt im Speicher. */
export const MOCK_STORAGE_PREFIX = 'moodmap:mock:v1:';

export function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function createMockStorage(storage: Storage | null) {
  const memory = new Map<string, string>();
  return {
    entries<T>(kind: string): [string, T][] {
      const prefix = `${MOCK_STORAGE_PREFIX}${kind}:`;
      const values = new Map(memory);
      try {
        for (let i = 0; storage && i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(prefix)) values.set(key, storage.getItem(key)!);
        }
      } catch {
        /* Safari-Privatmodus: nur in dieser Session. */
      }
      return [...values]
        .filter(([key]) => key.startsWith(prefix))
        .flatMap(([key, value]) => {
          try {
            return [[key.slice(prefix.length), JSON.parse(value) as T] as [string, T]];
          } catch {
            return [];
          } // Beschädigte Cache-Einträge verhindern keine Demo.
        });
    },
    put(kind: string, id: string, value: unknown) {
      const key = `${MOCK_STORAGE_PREFIX}${kind}:${id}`;
      const json = JSON.stringify(value);
      try {
        if (!storage) throw new Error('no storage');
        storage.setItem(key, json);
        memory.delete(key);
      } catch {
        memory.set(key, json);
      }
    },
    /** Entfernt einen Eintrag aus Storage und Speicher-Fallback; `true`, wenn es ihn gab. */
    remove(kind: string, id: string): boolean {
      const key = `${MOCK_STORAGE_PREFIX}${kind}:${id}`;
      let existed = memory.delete(key);
      try {
        if (storage && storage.getItem(key) !== null) {
          storage.removeItem(key);
          existed = true;
        }
      } catch {
        /* Safari-Privatmodus: nur der Speicher-Fallback zählt. */
      }
      return existed;
    },
  };
}
