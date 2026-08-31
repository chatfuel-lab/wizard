/**
 * Selection and bulk-action arithmetic for the table.
 *
 * The selection itself lives in the reducer (`dealsTableStore.ts`), for the
 * same reason the board's does. Everything *decided* about it is here: which
 * rows a right-click acts on, which of them a move would actually change, and
 * which of those can be undone at all. All pure — vitest runs node-only here,
 * so a rule left inside a component is untestable forever.
 */
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import type { HotkeyBinding } from '~ui';
import type { DealsTableRow } from '../types';
import { parseDealsParams, writeDealsParams } from './dealsParams';
import { BOARD_BINDINGS, type BoardShortcutId } from './shortcuts';
import { undoMoves, type MovedCard, type StageUndoEntry } from './undo';

/** Restricted contacts render as a locked placeholder: no selection, no mutation. */
export function isRestrictedRow(row: DealsTableRow | undefined): boolean {
  return row?.__typename === 'UnavailableContact';
}

/**
 * Drop ids the table can no longer act on. A subscription `Remove` retires a
 * record, and a mutation fired against one afterwards fails for a reason nobody
 * can see — which is why the reducer prunes on every batch and why anything
 * setting a selection from outside runs through this first.
 */
export function pruneSelection(selection: readonly string[], byId: Readonly<Record<string, DealsTableRow>>): string[] {
  return selection.filter((id) => byId[id] !== undefined && !isRestrictedRow(byId[id]));
}

/**
 * What a row-level action applies to.
 *
 * Right-clicking a row that is part of the selection acts on the whole
 * selection; right-clicking one outside it acts on that row alone. Same
 * convention as a drag on the board (`lib/dragPayload.ts`) and as every file
 * manager — deviating from it loses work silently.
 */
export function actionTargets(
  rowId: string,
  selection: readonly string[],
  byId: Readonly<Record<string, DealsTableRow>>,
): string[] {
  const row = byId[rowId];
  if (row === undefined || isRestrictedRow(row)) return [];
  if (!selection.includes(rowId)) return [rowId];
  return pruneSelection(selection, byId);
}

/** Rows in `ids`, in the order given, skipping anything the table cannot touch. */
export function rowsFor(ids: readonly string[], byId: Readonly<Record<string, DealsTableRow>>): DealsTableRow[] {
  return ids.map((id) => byId[id]).filter((row): row is DealsTableRow => row !== undefined && !isRestrictedRow(row));
}

/**
 * The rows a move would actually change.
 *
 * A row already in the target stage produces nothing: the mutation would still
 * cost a round trip and would still re-stamp `lastSalesStageUpdateTime`, which
 * is a real edit to the deal's age with nothing to show for it.
 */
export function movableRows(
  ids: readonly string[],
  byId: Readonly<Record<string, DealsTableRow>>,
  to: SalesStageV2,
): DealsTableRow[] {
  return rowsFor(ids, byId).filter((row) => row.salesStageV2 !== to);
}

export interface StageChange {
  row: DealsTableRow;
  /**
   * Where the row came from, or null when it had no stage at all — engine C
   * returns contacts, and `contactSetSalesStage(salesStageV2: SalesStageV2!)`
   * has no value meaning "none". Such a move is real but cannot be undone.
   */
  from: SalesStageV2 | null;
}

/** What a bulk move actually did. One report per batch, so one toast per batch. */
export interface StageChangeReport {
  moved: StageChange[];
  failed: DealsTableRow[];
  /** The first error message — the toast says it once, not N times. */
  message: string | null;
}

export const EMPTY_STAGE_REPORT: StageChangeReport = { moved: [], failed: [], message: null };

/** The half of a landed batch `undoEntryFor` can take. See `StageChange.from`. */
export function undoableMoves(moved: readonly StageChange[]): MovedCard[] {
  return moved.flatMap((change) => (change.from === null ? [] : [{ id: change.row.id, from: change.from }]));
}

/**
 * An undo entry as the batches a stage mutation can actually carry.
 *
 * `contactSetSalesStage` takes one stage, and a batch can have come from
 * several — so undoing a move that swept three stages together is three calls,
 * one per destination, rather than one per row.
 */
export function groupUndoMoves(entry: StageUndoEntry): { to: SalesStageV2; ids: string[] }[] {
  const groups = new Map<SalesStageV2, string[]>();
  for (const move of undoMoves(entry)) {
    const ids = groups.get(move.to);
    if (ids) ids.push(move.id);
    else groups.set(move.to, [move.id]);
  }
  return [...groups].map(([to, ids]) => ({ to, ids }));
}

/** The view segment of a routed URL — '' for an embed, which has no route. */
function viewOf(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const at = segments.indexOf('deals');
  return at === -1 ? '' : (segments[at + 1] ?? '');
}

/**
 * A shareable link to one deal.
 *
 * Built through `writeDealsParams` rather than by setting `deal=` by hand: that
 * file owns which query keys are the module's, and it also leaves every other
 * key alone. The keys ride on the query string whether the app routed the page
 * or a host embedded it, so a link that is read and a link that is written
 * cannot disagree. In an embed the result is the HOST's page carrying our
 * parameter — the best a module that does not own the address bar can offer.
 */
export function dealLink(href: string, contactId: string): string {
  const url = new URL(href);
  const current = url.searchParams;
  url.search = writeDealsParams(current, {
    ...parseDealsParams(current, viewOf(url)),
    deal: contactId,
  }).toString();
  return url.toString();
}

/* -------------------------------------------------------------------------
 * Keyboard
 * ---------------------------------------------------------------------- */

/**
 * The keys a non-empty table selection answers to, **derived** from
 * `BOARD_BINDINGS` rather than restated.
 *
 * `shortcuts.ts` exists because a cheat sheet, a `Kbd` hint and a handler that
 * each keep their own copy of the key map drift invisibly. The `?` sheet
 * already documents `1`–`6`, `[`, `]` and `esc`, and `shortcuts.test.ts`
 * asserts it covers that list exactly — so taking the table's bindings from
 * the same array is what keeps the context menu's hints true.
 *
 * Deliberately NOT the movement or selection keys: `rowNavigation` in
 * `DataTable` already owns the arrows, Enter and Space on a focused row, and a
 * second window-level listener for them would double-fire.
 */
const ROW_ACTION_IDS: readonly BoardShortcutId[] = [
  'stage1',
  'stage2',
  'stage3',
  'stage4',
  'stage5',
  'stage6',
  'stagePrev',
  'stageNext',
  'clear',
];

export const TABLE_ROW_BINDINGS: HotkeyBinding<BoardShortcutId>[] = BOARD_BINDINGS.filter((binding) =>
  ROW_ACTION_IDS.includes(binding.id),
);

/**
 * The literal key a row binding fires on — what `stageForKey` reads, and what
 * `Kbd` prints in the context menu. Read off the binding so the three can never
 * disagree.
 */
export function rowShortcutKey(id: BoardShortcutId): string | null {
  return TABLE_ROW_BINDINGS.find((binding) => binding.id === id)?.keys ?? null;
}

/** `SalesStageV2` in board order → the `1`–`6` key that sets it. */
export function stageShortcutKey(index: number): string | null {
  return rowShortcutKey(`stage${index + 1}` as BoardShortcutId);
}
