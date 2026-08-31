/**
 * Undo for stage changes, as pure functions.
 *
 * **What undo is here, exactly.** There is no server-side revert:
 * `contactSetSalesStage(id, salesStageV2: SalesStageV2!)` is the only write,
 * and it is non-null, so undo is a *compensating forward mutation* back to the
 * stage the card came from. Two consequences the UI has to own rather than hide:
 *
 * - `lastSalesStageUpdateTime` is re-stamped by the server, and it is the board's
 *   sort key. The card returns to its old column but to the **top** of it, not
 *   to where it was.
 * - The rot clock (`lib/rot.ts`) reads the same field, so an undone move resets
 *   the ageing bar. A deal that had been sitting in Sorting for nine days comes
 *   back looking fresh.
 *
 * Both go in `references/guide.md`. Neither is fixable — there is no
 * stage-change history in this API.
 *
 * A lib rather than a hook because the board undoes a batch of up to 25 and the
 * table undoes one row, and both must behave identically; and because vitest
 * here is node-only, so anything left inside a component is untestable.
 */
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { STAGE_META } from './stages';

export interface StageUndoEntry {
  /** Ids in the order they were moved — the board moves topmost-first. */
  ids: string[];
  /** Where each id came from. A batch can span several source stages. */
  from: Record<string, SalesStageV2>;
  /** Where they all went. One target per entry, by construction. */
  to: SalesStageV2;
  /** Set by the caller from its own clock; the lib never reads one. */
  at: number;
}

export interface MovedCard {
  id: string;
  from: SalesStageV2;
}

/** How long an entry stays offered. Past this the toast is gone anyway. */
export const UNDO_TTL_MS = 60_000;

/**
 * Build an entry from the cards a move actually landed.
 *
 * Returns null for an empty list — a failed batch must not offer an Undo that
 * would do nothing, and "0 deals moved" is not a thing to say.
 */
export function undoEntryFor(moved: readonly MovedCard[], to: SalesStageV2, at: number): StageUndoEntry | null {
  if (moved.length === 0) return null;

  const from: Record<string, SalesStageV2> = {};
  const ids: string[] = [];
  for (const card of moved) {
    /* A card cannot be in the batch twice, but a caller assembling this from a
     * report plus a retry could repeat one. First writer wins: that is the
     * stage it started from. */
    if (card.id in from) continue;
    from[card.id] = card.from;
    ids.push(card.id);
  }

  return { ids, from, to, at };
}

/**
 * A card that never left its stage is not an undo — it is a no-op that would
 * still cost a round trip and still re-stamp the sort key.
 */
export function undoMoves(entry: StageUndoEntry): { id: string; to: SalesStageV2 }[] {
  return entry.ids
    .filter((id) => entry.from[id] !== undefined && entry.from[id] !== entry.to)
    .map((id) => ({ id, to: entry.from[id] }));
}

/** Whether the entry still has anything to do. */
export function isUndoable(entry: StageUndoEntry): boolean {
  return undoMoves(entry).length > 0;
}

export function isUndoExpired(entry: StageUndoEntry, now: number, ttl = UNDO_TTL_MS): boolean {
  return now - entry.at > ttl;
}

/**
 * The toast's action label and the palette's command label.
 *
 * Singular names the destination because that is the sentence the user just
 * read ("Moved to Won"); plural names the count, because listing three stage
 * labels in a button is unreadable.
 */
export function undoLabel(entry: StageUndoEntry): string {
  const count = undoMoves(entry).length;
  if (count === 0) return 'Undo';
  if (count === 1) return `Undo move to ${STAGE_META[entry.to].label}`;
  return `Undo ${count} moves`;
}
