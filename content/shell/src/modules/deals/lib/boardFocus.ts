/**
 * Where the arrow keys go on a six-column board.
 *
 * Pure, because vitest here is node-only: left inside the component this would
 * be untestable forever, and roving focus is exactly the kind of code that is
 * right in four cases and wrong in the fifth.
 *
 * The board is a grid whose columns have different heights, which is where the
 * rules come from:
 *
 * - **Vertical clamps, it never wraps.** ↓ on the last card stays put. Wrapping
 *   to the top of a twenty-card column reads as a scroll jump, not a move.
 * - **Horizontal keeps your place and clamps.** → from row 7 of a long column
 *   into a three-card column lands on row 3, not row 1 — the eye is tracking
 *   roughly where it was. It does not remember the original row afterwards;
 *   that is a well-known refinement and also a well-known source of surprise.
 * - **A collapsed column is skipped.** It is still a drop target (a drag has a
 *   pointer to aim with) but it shows no cards, so there is nothing to focus.
 * - **An empty column is skipped too**, for the same reason.
 */
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { STAGES } from './stages';

/** Ordered card ids per column — exactly what the store's `order` holds. */
export type BoardOrder = Record<SalesStageV2, string[]>;

export interface BoardPosition {
  stage: SalesStageV2;
  index: number;
}

const focusable = (order: BoardOrder, collapsed: readonly SalesStageV2[]): SalesStageV2[] =>
  STAGES.filter((stage) => !collapsed.includes(stage) && (order[stage]?.length ?? 0) > 0);

/** Where a card currently sits, or null if it is not on the board. */
export function positionOf(order: BoardOrder, id: string | null): BoardPosition | null {
  if (!id) return null;
  for (const stage of STAGES) {
    const index = order[stage]?.indexOf(id) ?? -1;
    if (index !== -1) return { stage, index };
  }
  return null;
}

/** The first card anyone should land on when nothing is focused yet. */
export function firstFocusable(order: BoardOrder, collapsed: readonly SalesStageV2[]): string | null {
  const stage = focusable(order, collapsed)[0];
  return stage ? (order[stage][0] ?? null) : null;
}

/**
 * Keep focus somewhere real.
 *
 * A live `Remove`, a filter change or a page reset can take the focused card
 * out from under the user. Returning the first focusable card is deliberately
 * blunt: the alternative — remembering the slot and landing on its neighbour —
 * is only better when the card vanished *while* you were looking at it, and is
 * worse every other time, because it silently moves focus after a refetch.
 */
export function resolveFocus(
  order: BoardOrder,
  collapsed: readonly SalesStageV2[],
  current: string | null,
): string | null {
  if (current && positionOf(order, current)) return current;
  return firstFocusable(order, collapsed);
}

export interface NextFocusInput {
  order: BoardOrder;
  collapsed: readonly SalesStageV2[];
  current: string | null;
  key: string;
}

/**
 * The id the given key should move focus to, or null to leave it alone.
 *
 * Null means "not ours" — the caller must not preventDefault, or every
 * unhandled key would be swallowed by the board.
 */
export function nextFocus({ order, collapsed, current, key }: NextFocusInput): string | null {
  const NAV = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!NAV.includes(key)) return null;

  const at = positionOf(order, current);
  /* Nothing focused, or focus is on a card that has gone: any navigation key
   * puts you on the board rather than doing nothing. */
  if (!at || collapsed.includes(at.stage)) return firstFocusable(order, collapsed);

  const column = order[at.stage];

  if (key === 'Home') return column[0] ?? null;
  if (key === 'End') return column.at(-1) ?? null;

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const next = at.index + (key === 'ArrowDown' ? 1 : -1);
    /* Clamped, not wrapped — and returning the same id rather than null keeps
     * the key ours, so the column does not scroll underneath. */
    if (next < 0 || next >= column.length) return column[at.index] ?? null;
    return column[next] ?? null;
  }

  const lane = focusable(order, collapsed);
  const here = lane.indexOf(at.stage);
  const target = lane[here + (key === 'ArrowRight' ? 1 : -1)];
  if (!target) return column[at.index] ?? null;

  const targetColumn = order[target];
  return targetColumn[Math.min(at.index, targetColumn.length - 1)] ?? null;
}

/**
 * Everything in the focused card's column — what `⌘A` selects.
 *
 * The column, not the board: six columns of twenty is not a selection anyone
 * acts on, and `MAX_MULTI_MOVE` would refuse it anyway.
 */
export function columnIds(order: BoardOrder, current: string | null): string[] {
  const at = positionOf(order, current);
  return at ? [...order[at.stage]] : [];
}

/**
 * The ids between the anchor and the target **inside one column**.
 *
 * Shift+↓ across a column boundary has no meaning here — the two columns are
 * different lists, and a range spanning them would select cards the user never
 * passed over. Returns null when the two are not in the same column.
 */
export function rangeIds(order: BoardOrder, anchor: string | null, target: string | null): string[] | null {
  const from = positionOf(order, anchor);
  const to = positionOf(order, target);
  if (!from || !to || from.stage !== to.stage) return null;
  const [start, end] = from.index <= to.index ? [from.index, to.index] : [to.index, from.index];
  return order[from.stage].slice(start, end + 1);
}
