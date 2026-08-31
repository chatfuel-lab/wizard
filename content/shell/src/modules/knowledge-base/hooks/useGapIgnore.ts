import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createUserStorage } from '~api';
import { useKnowledgeBase } from '../KnowledgeBaseContext';
import {
  GAP_IGNORE_KEY,
  addIgnored,
  parseIgnored,
  removeIgnored,
  serializeIgnored,
  type IgnoredGap,
} from '../lib/gapsStorage';

export interface GapIgnoreState {
  ignored: readonly IgnoredGap[];
  /** False until the stored list has been read - the list is hidden until then, not shown as empty. */
  loaded: boolean;
  ignore: (question: string) => void;
  restore: (question: string) => void;
}

/**
 * The questions YOU have dismissed, in the per-user store (see
 * `lib/gapsStorage.ts` for the shape and for why nothing it reads is trusted).
 *
 * One id, one JSON string, every write sends the whole list - the same
 * contract bookings' preferences use. The in-memory list moves first and a
 * failed write is kept locally for the session: a dismissal is not worth a
 * spinner, and re-showing a row somebody just dismissed because the network
 * hiccuped is worse than losing the dismissal on the next reload.
 */
export function useGapIgnore(): GapIgnoreState {
  const { client } = useKnowledgeBase();
  const [ignored, setIgnored] = useState<readonly IgnoredGap[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ignoredRef = useRef(ignored);
  ignoredRef.current = ignored;

  /* Memoised on the client: a fresh store per render would re-read storage
     every render. */
  const store = useMemo(() => createUserStorage(client, GAP_IGNORE_KEY), [client]);

  useEffect(() => {
    let cancelled = false;
    store
      .read()
      .then((raw) => {
        if (cancelled) return;
        setIgnored(parseIgnored(raw));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const write = useCallback(
    (next: readonly IgnoredGap[]) => {
      setIgnored(next);
      store.write(serializeIgnored(next)).catch(() => {
        /* kept locally for this session */
      });
    },
    [store],
  );

  const ignore = useCallback((question: string) => write(addIgnored(ignoredRef.current, question)), [write]);
  const restore = useCallback((question: string) => write(removeIgnored(ignoredRef.current, question)), [write]);

  return { ignored, loaded, ignore, restore };
}
