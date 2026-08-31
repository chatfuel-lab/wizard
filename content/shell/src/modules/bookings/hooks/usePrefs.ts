import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createUserStorage } from '~api';
import { useBookings } from '../BookingsContext';
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, samePrefs, serializePrefs, type BookingsPrefs } from '../lib/prefs';

export interface PrefsState {
  prefs: BookingsPrefs;
  loaded: boolean;
  /** Merge and persist. The in-memory value updates first (a preference is not worth a spinner); a failed write is silently kept locally. */
  update: (patch: Partial<BookingsPrefs>) => void;
}

/**
 * Per-user preferences over the shared user storage (see `lib/prefs.ts`).
 * One id, one JSON string; every write sends the whole thing.
 */
export function usePrefs(): PrefsState {
  const { client } = useBookings();
  const [prefs, setPrefs] = useState<BookingsPrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  /* Memoised on the client: a fresh store per render would re-read storage
     every render. */
  const store = useMemo(() => createUserStorage(client, PREFS_KEY), [client]);

  useEffect(() => {
    let cancelled = false;
    store
      .read()
      .then((raw) => {
        if (cancelled) return;
        setPrefs(parsePrefs(raw));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const update = useCallback(
    (patch: Partial<BookingsPrefs>) => {
      const next = { ...prefsRef.current, ...patch };
      if (samePrefs(next, prefsRef.current)) return;
      setPrefs(next);
      store.write(serializePrefs(next)).catch(() => {
        /* kept locally for this session */
      });
    },
    [store],
  );

  return { prefs, loaded, update };
}
