/**
 * Pure board-order logic (unit-tested): the subscription protocol from
 * guide.md — an Update may be a stage change, so Add/Update REMOVE the id
 * from every column first, then insert it into its current stage sorted by
 * lastSalesStageUpdateTime desc; Remove drops it from all columns.
 *
 * Columns hold ids, not cards. `dealsStore.ts` keeps the one record cache, so
 * the board and (from S7) the table can show the same contact without two
 * copies drifting apart — which means ordering needs a `timeOf` lookup rather
 * than reading the card it was handed.
 */

export interface BoardCard {
  id: string;
  salesStageV2?: string | null;
  lastSalesStageUpdateTime?: string | null;
}

/** Ordered ids per stage. */
export type BoardOrder = Record<string, string[]>;

/** Sort key by id. */
export type TimeOf = (id: string) => number;

/** lastSalesStageUpdateTime as a number; absent and unparseable both sort last. */
export function timeOfCard(card: BoardCard | undefined): number {
  const parsed = card?.lastSalesStageUpdateTime ? Date.parse(card.lastSalesStageUpdateTime) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Remove the id from every column. Untouched columns — and an untouched board — keep identity. */
export function removeFromAll(board: BoardOrder, id: string): BoardOrder {
  let changed = false;
  const next: BoardOrder = {};
  for (const [stage, ids] of Object.entries(board)) {
    const filtered = ids.filter((each) => each !== id);
    next[stage] = filtered.length === ids.length ? ids : filtered;
    if (filtered.length !== ids.length) changed = true;
  }
  return changed ? next : board;
}

/** Dedupe by id, insert, keep the column in lastSalesStageUpdateTime desc order. */
export function insertSorted(ids: readonly string[], id: string, timeOf: TimeOf): string[] {
  const without = ids.filter((each) => each !== id);
  const time = timeOf(id);
  const at = without.findIndex((each) => timeOf(each) < time);
  if (at === -1) return [...without, id];
  return [...without.slice(0, at), id, ...without.slice(at)];
}
