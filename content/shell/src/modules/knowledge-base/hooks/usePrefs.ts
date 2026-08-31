import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createUserStorage } from '~api';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, samePrefs, serializePrefs, type KnowledgePrefs } from '../lib/prefs';

export interface PrefsState {
  prefs: KnowledgePrefs;
  /** False until the stored value has landed — a layout switch must not flip once under the reader. */
  loaded: boolean;
  /** Merge and persist. The in-memory value moves first: a preference is not worth a spinner, and a failed write is kept locally for the session. */
  update: (patch: Partial<KnowledgePrefs>) => void;
}

/**
 * Per-user preferences over the shared user storage (see `lib/prefs.ts`) —
 * one id, one JSON string, every write sending the whole thing.
 *
 * The same shape bookings uses, deliberately: it is the only per-user
 * persistence the API has, and two modules inventing two conventions for it
 * would be two things to learn.
 */
export function usePrefs(): PrefsState {
  const { client } = useKnowledgeBase();
  const [prefs, setPrefs] = useState<KnowledgePrefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  /* A ref as well as state: `update` merges onto the CURRENT value, and a
     callback closed over the render's `prefs` would drop a second change made
     in the same tick. */
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
        /* No preferences is not an error worth a banner — the defaults are fine. */
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const update = useCallback(
    (patch: Partial<KnowledgePrefs>) => {
      const next = { ...prefsRef.current, ...patch };
      if (samePrefs(next, prefsRef.current)) return;
      setPrefs(next);
      store.write(serializePrefs(next)).catch(() => {
        /* Kept locally for this session. */
      });
    },
    [store],
  );

  return { prefs, loaded, update };
}
