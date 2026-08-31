/**
 * What the table animates, as index arithmetic.
 *
 * `DataTable` owns the `<tr>` elements, so a row cannot carry an enter class of
 * its own — the view reaches the freshly inserted rows through the tbody by
 * index instead. That index is the only part worth getting right, so it is
 * computed here and the DOM work stays a three-line effect.
 *
 * **There is no exit animation, deliberately.** A `Remove` retires the record
 * in the reducer, and the only way to fade the row out would be to keep
 * rendering one the store no longer holds — a row that could then be selected,
 * or have a mutation fired at it, after the server has already dropped it. That
 * trade is not worth 180ms of polish. `references/table.md` says so too.
 */

/**
 * How many rows may flash at once. A live batch that adds twenty is a refetch
 * in disguise; strobing half the table draws the eye to nothing in particular,
 * so past the cap nothing animates at all.
 */
export const MAX_ROW_FLASH = 6;

/**
 * Indexes in `next` of rows that were not in `prev`.
 *
 * Empty when `prev` is empty: the first page is not an arrival, it is the
 * table appearing. Empty when more than `limit` rows entered, for the reason
 * above — the caller then simply does nothing.
 */
export function enteredIndexes(
  prev: readonly string[],
  next: readonly string[],
  limit: number = MAX_ROW_FLASH,
): number[] {
  if (prev.length === 0) return [];
  const before = new Set(prev);
  const entered: number[] = [];
  for (let index = 0; index < next.length; index += 1) {
    if (!before.has(next[index] as string)) entered.push(index);
  }
  return entered.length > limit ? [] : entered;
}

/**
 * The sort, as one string an effect's dependency array can compare.
 *
 * The sort transition has to run when the *order* changed and at no other time;
 * keying the effect on the `SortState` object would re-run it on every render,
 * because `sortStateFor` builds a fresh one each time.
 */
export function sortSignature(sort: { key: string; dir: string } | null): string {
  return sort === null ? '' : `${sort.key}:${sort.dir}`;
}
