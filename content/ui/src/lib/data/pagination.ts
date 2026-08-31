/**
 * Which page numbers a pager shows.
 *
 * Split out because the interesting part is entirely arithmetic: the window
 * has to stay a constant width as it slides, or the buttons shuffle sideways
 * under the cursor between clicks.
 */

export type PageSlot = number | 'gap';

/**
 * Page numbers around `page`, with 'gap' where the sequence jumps.
 *
 * Always the same number of slots (when there are enough pages), so the pager
 * never changes width. `siblings` counts pages on EACH side of the current one;
 * first and last are always present because "jump to the end" is the one move
 * a pager must never make impossible.
 */
export function paginationRange(page: number, pageCount: number, siblings = 1): PageSlot[] {
  if (pageCount <= 0) return [];

  /* first + last + current + 2 siblings + 2 gaps. Below this everything fits. */
  const maxSlots = siblings * 2 + 5;
  if (pageCount <= maxSlots) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const current = Math.min(Math.max(page, 1), pageCount);
  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, pageCount);

  /* A gap standing in for exactly one page is a lie that costs a click, so
   * near either end the window widens instead of collapsing to an ellipsis. */
  const showLeftGap = left > 3;
  const showRightGap = right < pageCount - 2;

  if (!showLeftGap && showRightGap) {
    const count = siblings * 2 + 3;
    return [...Array.from({ length: count }, (_, i) => i + 1), 'gap', pageCount];
  }

  if (showLeftGap && !showRightGap) {
    const count = siblings * 2 + 3;
    return [1, 'gap', ...Array.from({ length: count }, (_, i) => pageCount - count + 1 + i)];
  }

  if (!showLeftGap && !showRightGap) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  return [1, 'gap', ...Array.from({ length: right - left + 1 }, (_, i) => left + i), 'gap', pageCount];
}
