import { matchRanges, type TextRange } from '~ui';

/**
 * How the inbox list renders: how tall a row is, when the next page is fetched,
 * and which characters of a name get marked as the search hit.
 *
 * All three are arithmetic, and all three are things that are wrong silently.
 * vitest here is node-only with no jsdom, so a decision left inside a component
 * is a decision no test can reach — which is how `hasNextPage` came to be
 * silently discarded. They live here so they can be asserted.
 */

/**
 * A row's height before anything has been measured.
 *
 * Every row is structurally identical — a fixed-size avatar beside three lines
 * of `truncate` text — so there is exactly one height and the list measures a
 * single rendered row rather than keeping a per-row cache. This number only has
 * to be close enough that the scrollbar is not absurd on the first frame.
 */
export const ESTIMATED_ROW_HEIGHT = 73;

/** Rows rendered past each edge of the viewport, so a fast scroll is not blank. */
export const ROW_OVERSCAN = 6;

/**
 * How close to the end of the loaded rows the window has to get before the next
 * page is requested.
 *
 * Not zero: fetching only once the last row is on screen means the reader hits
 * the bottom and waits. Not large either — every page is a round trip, and a
 * threshold bigger than a screenful would walk the whole inbox on first paint.
 */
export const PAGE_AHEAD_ROWS = 10;

export interface LoadMoreInput {
  /** One past the last row the virtual window renders. */
  end: number;
  /** Rows currently loaded. */
  count: number;
  hasMore: boolean;
  loadingMore: boolean;
  threshold?: number;
}

/**
 * Whether the scroller has come close enough to the end to ask for another page.
 *
 * The guards matter more than the arithmetic. `loadingMore` is what stops a
 * scroll — which fires many times per second — from firing a page request per
 * frame; the store guards the same thing again, and both are wanted, because
 * this one also stops the request being *built*. `hasMore` is the server's
 * answer, and without it a list that has reached the end asks forever.
 */
export function shouldLoadMore({
  end,
  count,
  hasMore,
  loadingMore,
  threshold = PAGE_AHEAD_ROWS,
}: LoadMoreInput): boolean {
  if (!hasMore || loadingMore) return false;
  if (count <= 0) return false;
  return end >= count - Math.max(threshold, 0);
}

/**
 * Which characters of `name` to mark as the search hit, or an empty list.
 *
 * This is a rendering decision, NOT a membership decision — the server already
 * decided which contacts match, via `textInputFilter`. The distinction is the
 * whole reason this is so conservative.
 *
 * `matchRanges` is the repo's one matcher and it is deliberately fuzzy: failing
 * a substring hit it falls back to a scattered subsequence, which is right for
 * a command palette ranking its own items. Here it would be a lie. The server
 * matches on name **and phone**, so a row can legitimately be in the list with
 * a name that has nothing to do with the query — and a subsequence match will
 * almost always find *something* to underline in a long name. Marking those
 * characters would tell the reader the name matched when the phone number did.
 *
 * So only a contiguous hit counts, which is exactly the case where `matchRanges`
 * returns a single range as long as the query. Everything else highlights
 * nothing and the row still renders, unmarked and correct.
 */
export function nameHighlight(name: string, query: string): TextRange[] {
  const trimmed = query.trim();
  if (trimmed === '') return [];
  const ranges = matchRanges(name, trimmed);
  if (ranges === null || ranges.length !== 1) return [];
  const [only] = ranges;
  return only && only.end - only.start === trimmed.length ? ranges : [];
}

/**
 * Where `j` / `k` land: the row after or before the selected one, in the order
 * the list is drawn.
 *
 * No wrapping. The bottom of an inbox is where the oldest conversation is, and
 * the top is where the newest is; a keypress that jumps from one to the other
 * is a keypress that loses the operator's place, and holding `j` to walk down
 * a queue must stop at its end rather than start over. With nothing selected
 * either key opens the top row — that is the one the eye is on — and a
 * selection the list no longer holds (it fell out of the filter, or was closed
 * elsewhere) starts over from the top too rather than answering with nothing.
 * `null` is the answer only when there is nothing to open at all, or when the
 * walk is already at the end it was asked to pass.
 */
export function neighbourChatId(order: readonly string[], selectedId: string | null, step: 1 | -1): string | null {
  if (order.length === 0) return null;
  const index = selectedId === null ? -1 : order.indexOf(selectedId);
  if (index === -1) return order[0] ?? null;
  const next = index + step;
  if (next < 0 || next >= order.length) return null;
  return order[next] ?? null;
}
