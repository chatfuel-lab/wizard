/**
 * The transient undo offer, as data.
 *
 * This is a toast's undo, not an editor's: ONE entry, not a stack. Every undo
 * it carries is a compensating forward mutation — the APIs behind it keep no
 * history and re-stamp their own timestamps — so a second level of undo would
 * not restore an earlier state, it would just write again. A deep history
 * would promise something those APIs cannot do; a module that has a real undo
 * stack (a document editor) wants that stack, not this.
 *
 * The hook half is `hooks/useUndoOffer.ts`; the rules live here so they can be
 * asserted without a render.
 */

export interface UndoOffer<E> {
  /** What the caller wants to say about it — a label, ids, whatever the toast and palette need. */
  entry: E;
  /** The compensating call. Supplied by the surface that made the change, because it holds the mutation. */
  run: () => void | Promise<void>;
}

/** How long an offer stays live. Past this the toast is gone anyway, and an undo five minutes later would move things the user has stopped thinking about. */
export const UNDO_OFFER_TTL_MS = 60_000;

/** The push rule: a real entry replaces the current offer, null clears it. */
export function nextOffer<E>(entry: E | null, run: () => void | Promise<void>): UndoOffer<E> | null {
  return entry === null ? null : { entry, run };
}
