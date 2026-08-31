import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UNDO_OFFER_TTL_MS, nextOffer, type UndoOffer } from '../lib/app/undoOffer';

export interface UseUndoOfferOptions {
  /** How long an offer stays live. */
  ttlMs?: number;
  /**
   * Where a REJECTED compensating call is reported — the one place that can
   * still say so, since the offer is already cleared. Omitted, the rejection
   * is swallowed: the change the undo failed to revert is still on screen.
   */
  onError?: (err: unknown) => void;
}

export interface UndoOfferApi<E> {
  /** The live offer's entry, or null. One deep: this is a toast, not a history. */
  entry: E | null;
  /**
   * Offer an undo, or clear with null. The surface that made the change
   * supplies the runner — it is what holds the mutation — and the caller of
   * `run` only needs to know that something is undoable.
   */
  push: (entry: E | null, run: () => void | Promise<void>) => void;
  /** Run and clear. Safe to call twice; the second does nothing. */
  run: () => void;
  clear: () => void;
}

/**
 * Where the one undo offer lives.
 *
 * A change happens inside a surface, but the undo key is bound once at the
 * workspace above all of them; this hook is the shared home that keeps the
 * hotkey from reaching into whichever surface happens to be mounted. The offer
 * expires on its own — an offer with no expiry is a lie, because the toast
 * that announced it is long gone.
 *
 * `run` clears BEFORE calling the runner, so the toast's action button and the
 * hotkey cannot both fire the same compensating mutation.
 */
export function useUndoOffer<E>({ ttlMs = UNDO_OFFER_TTL_MS, onError }: UseUndoOfferOptions = {}): UndoOfferApi<E> {
  const [offer, setOffer] = useState<UndoOffer<E> | null>(null);
  /* Read through a ref so `run` keeps one identity — it is handed to context
     values and toast actions, and a fresh closure per offer re-renders both. */
  const offerRef = useRef(offer);
  offerRef.current = offer;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const push = useCallback((entry: E | null, run: () => void | Promise<void>) => {
    setOffer(nextOffer(entry, run));
  }, []);
  const clear = useCallback(() => setOffer(null), []);
  const run = useCallback(() => {
    const current = offerRef.current;
    if (!current) return;
    setOffer(null);
    void Promise.resolve()
      .then(() => current.run())
      .catch((err: unknown) => onErrorRef.current?.(err));
  }, []);

  useEffect(() => {
    if (!offer) return undefined;
    const timer = setTimeout(() => setOffer(null), ttlMs);
    return () => clearTimeout(timer);
  }, [offer, ttlMs]);

  return useMemo(() => ({ entry: offer?.entry ?? null, push, run, clear }), [offer, push, run, clear]);
}
