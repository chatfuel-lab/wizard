import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * One stored string under one key: read it back, or replace it whole.
 *
 * Declared here structurally rather than imported, so this package keeps no
 * dependency on any API client — the app's client factory hands the module a
 * store this shape, and a test hands it a plain object.
 */
export interface KeyedTextStore {
  read(): Promise<string | null | undefined>;
  write(value: string): Promise<void>;
}

export interface UseStoredListOptions<T> {
  store: KeyedTextStore;
  /** The stored string → the list, plus whether anything was ever stored. Must never throw. */
  parse: (raw: string | null | undefined) => { entries: T[]; empty: boolean };
  serialize: (entries: readonly T[]) => string;
  /**
   * What a first run starts with. Called only when nothing readable was ever
   * stored — a stored empty list is emphatically not that — and the seed is
   * WRITTEN, best-effort, so deleting a seeded entry sticks across reloads.
   */
  seed?: () => T[];
}

export interface StoredListState<T> {
  entries: T[];
  loading: boolean;
  /** A write is in flight. */
  saving: boolean;
  error: string | null;
  /** One write for the whole list. State moves only once the server has it; false = the write failed and nothing moved. */
  commit: (next: T[]) => Promise<boolean>;
  /** The list as of right now — for read-modify-write callbacks that must not close over stale state. */
  latest: () => T[];
  reload: () => void;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * A list persisted as ONE string in a per-user store.
 *
 * The whole list is one value under one key, so every mutation writes the
 * entire list — and a write that fails must leave the in-memory list exactly
 * as it was, which is why `commit` updates state only after the write
 * resolves, never optimistically. What an entry is, and which edits exist,
 * stay with the caller; this owns only the load, the seed and the write.
 */
export function useStoredList<T>({ store, parse, serialize, seed }: UseStoredListOptions<T>): StoredListState<T> {
  const [entries, setEntries] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  /* Read through refs rather than dependencies: a caller passing a fresh
     parse closure or seed per render must not re-read storage every render —
     the STORE changing is what means "different data". */
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const serializeRef = useRef(serialize);
  serializeRef.current = serialize;
  const seedRef = useRef(seed);
  seedRef.current = seed;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    store
      .read()
      .then((raw) => {
        if (cancelled) return;
        const stored = parseRef.current(raw);
        setError(null);
        setLoading(false);

        if (!stored.empty || !seedRef.current) {
          setEntries(stored.entries);
          return;
        }

        /* First run: seed, and write it, so deleting a seeded entry sticks. A
           failed seed write leaves them on screen anyway — the next commit
           writes the whole list and repairs it. */
        const seeded = seedRef.current();
        setEntries(seeded);
        store.write(serializeRef.current(seeded)).catch(() => undefined);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(messageOf(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [store, nonce]);

  const commit = useCallback(
    async (next: T[]): Promise<boolean> => {
      setSaving(true);
      try {
        await store.write(serializeRef.current(next));
        setEntries(next);
        setError(null);
        return true;
      } catch (err) {
        setError(messageOf(err));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [store],
  );

  const latest = useCallback(() => entriesRef.current, []);
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  /* Memoised because this object tends to become a context value: a fresh
     literal every render would re-render every consumer on every keystroke. */
  return useMemo(
    () => ({ entries, loading, saving, error, commit, latest, reload }),
    [entries, loading, saving, error, commit, latest, reload],
  );
}
