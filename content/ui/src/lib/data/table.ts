/**
 * Table state arithmetic — sorting, selection and column widths.
 *
 * DataTable is fully controlled, so none of this lives in the component: the
 * owner holds the state and calls these to compute the next one. Which means
 * the interesting logic is testable without a DOM, and the same helpers work
 * for a table whose rows arrive by subscription.
 */

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDirection;
}

/**
 * Header click cycle: unsorted -> asc -> desc -> unsorted.
 *
 * The third click clears rather than going back to asc. Without it there is no
 * way back to the server's own order, and here that order is meaningful —
 * "most recently updated" is the only sort the deals board can actually persist.
 */
export function nextSortState(current: SortState | null, key: string): SortState | null {
  if (current === null || current.key !== key) return { key, dir: 'asc' };
  if (current.dir === 'asc') return { key, dir: 'desc' };
  return null;
}

export type CheckboxState = boolean | 'indeterminate';

/**
 * State of the select-all box. `selectableCount` excludes disabled rows —
 * restricted contacts can never be selected, so a page made entirely of them
 * must not render a header box that looks actionable.
 */
export function headerCheckboxState(selectedCount: number, selectableCount: number): CheckboxState {
  if (selectableCount === 0 || selectedCount === 0) return false;
  if (selectedCount >= selectableCount) return true;
  return 'indeterminate';
}

export interface SelectionInput {
  /** Every selectable id, in display order. Disabled rows must be excluded. */
  ids: readonly string[];
  selected: readonly string[];
  /** The row whose checkbox was clicked. */
  id: string;
  /** Where the last plain click landed. */
  anchor: string | null;
  shift?: boolean;
}

export interface SelectionResult {
  selected: string[];
  anchor: string | null;
}

/**
 * Next selection after a checkbox click.
 *
 * The part everyone gets subtly wrong is the anchor. A plain click moves it; a
 * shift-click does NOT. That is what lets you shift-click once to take a range,
 * then shift-click again further down to grow the same range — if the anchor
 * followed the shift-click, the second one would start from the wrong end and
 * the range would jump.
 *
 * A shift-click applies the ANCHOR's state to the whole span, so shift also
 * un-selects a range when the anchor itself is unselected. That is the Finder
 * behaviour, and it is the only way to shrink a selection without starting over.
 */
export function toggleSelection(input: SelectionInput): SelectionResult {
  const { ids, selected, id, anchor, shift = false } = input;
  const current = new Set(selected);

  const anchorIndex = anchor === null ? -1 : ids.indexOf(anchor);
  const targetIndex = ids.indexOf(id);

  if (!shift || anchorIndex === -1 || targetIndex === -1) {
    if (current.has(id)) current.delete(id);
    else current.add(id);
    /* Anchor follows a plain click, even a de-selecting one: the next
     * shift-click should extend from where the user last was. */
    return { selected: ids.filter((each) => current.has(each)), anchor: id };
  }

  const from = Math.min(anchorIndex, targetIndex);
  const to = Math.max(anchorIndex, targetIndex);
  const select = current.has(ids[anchorIndex]!);
  for (let index = from; index <= to; index += 1) {
    if (select) current.add(ids[index]!);
    else current.delete(ids[index]!);
  }

  return { selected: ids.filter((each) => current.has(each)), anchor };
}

export interface ColumnWidthSpec {
  key: string;
  /** Declared CSS width, e.g. '12rem' or '30%'. */
  width?: string;
  /** Floor for interactive resizing, in px. */
  minWidth?: number;
}

export const DEFAULT_MIN_COLUMN_WIDTH = 64;

/** Keeps a dragged column from collapsing to nothing. */
export function clampColumnWidth(px: number, column: ColumnWidthSpec): number {
  return Math.max(px, column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH);
}

/**
 * One CSS width per column for the `<colgroup>`, override winning over the
 * declared value. `undefined` means "let the table decide" — that is not the
 * same as 'auto', which would stop the browser from sharing leftover space.
 */
export function resolveColumnWidths(
  columns: readonly ColumnWidthSpec[],
  overrides?: Readonly<Record<string, number>>,
): (string | undefined)[] {
  return columns.map((column) => {
    const override = overrides?.[column.key];
    if (override !== undefined) return `${clampColumnWidth(override, column)}px`;
    return column.width;
  });
}

/**
 * Columns still on screen.
 *
 * Hiding every column is never what someone meant, and an empty `<colgroup>`
 * renders as a blank rectangle with no way back — so the first column always
 * survives.
 */
export function visibleColumns<T extends { key: string }>(columns: readonly T[], hidden?: readonly string[]): T[] {
  if (!hidden || hidden.length === 0) return [...columns];
  const shown = columns.filter((column) => !hidden.includes(column.key));
  if (shown.length > 0) return shown;
  return columns.length > 0 ? [columns[0]!] : [];
}

/**
 * Column order — the arithmetic behind a header drag and its keyboard twin.
 *
 * The moved column ends up at the index the target column occupied, which is
 * the only rule that reads the same in both directions: drag left and it takes
 * the slot you dropped it on, drag right and it takes the slot you dropped it
 * on. Insert-before/insert-after semantics need a hit test against the target's
 * midpoint and get the last column wrong on every implementation that tries.
 */
export function reorderColumns(order: readonly string[], key: string, targetKey: string): string[] {
  const from = order.indexOf(key);
  const to = order.indexOf(targetKey);
  if (from === -1 || to === -1 || from === to) return [...order];
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
}

/**
 * Project a reordering done over the VISIBLE columns back onto the full order.
 *
 * The table can only show, and therefore only reorder, the columns that are on
 * screen — but the caller persists one list, hidden columns included. A hidden
 * column keeps the slot it already held: unhide it again and it comes back
 * where it was, instead of appearing at the end of the table as a stranger.
 *
 * `visibleOrder` is expected to be a permutation of the visible members of
 * `order`; anything shorter leaves the remaining slots untouched rather than
 * dropping columns on the floor.
 */
export function applyVisibleOrder(order: readonly string[], visibleOrder: readonly string[]): string[] {
  const visible = new Set(visibleOrder);
  let cursor = 0;
  return order.map((key) => {
    if (!visible.has(key)) return key;
    const next = visibleOrder[cursor];
    cursor += 1;
    return next ?? key;
  });
}

/**
 * Reorder within the movable slots only, leaving every other column at the
 * index it already holds.
 *
 * `reorderColumns` alone is not enough once a column opts out of reordering.
 * "Opts out" has to mean its POSITION is fixed, not merely that it cannot be
 * picked up — it is the pinned identity column everything else is read
 * against, and a table whose first column silently became `city` is a table
 * nobody can read. But removing a column from index 0 and re-inserting it at
 * index 2 shifts everything in between, frozen or not.
 *
 * So the movable columns are treated as a set of slots: the permutation is
 * computed over that sub-sequence and written back into exactly those
 * positions. A frozen column in the MIDDLE of the table therefore stays in the
 * middle without cutting the row in two — the columns either side of it can
 * still trade places across it.
 *
 * With nothing frozen this is `reorderColumns`, exactly.
 */
export function reorderMovableColumns(
  order: readonly string[],
  movable: readonly string[],
  key: string,
  targetKey: string,
): string[] {
  if (!movable.includes(key) || !movable.includes(targetKey)) return [...order];
  const slots: number[] = [];
  const sequence: string[] = [];
  order.forEach((each, index) => {
    if (!movable.includes(each)) return;
    slots.push(index);
    sequence.push(each);
  });

  const moved = reorderColumns(sequence, key, targetKey);
  const next = [...order];
  slots.forEach((slot, index) => {
    next[slot] = moved[index]!;
  });
  return next;
}

/**
 * The column one keyboard step in `delta` should displace, or null when there
 * is none left that way.
 *
 * Frozen columns are stepped OVER rather than treated as a wall: they keep
 * their own slot (see reorderMovableColumns) but they must not divide the
 * table into two halves that can never trade columns.
 *
 * The pointer route gets this for free — a column that cannot move is never
 * registered as a drop target — so the keyboard route has to be told, and
 * until it was it walked the pinned identity column out of position one.
 */
export function nextReorderTarget(
  order: readonly string[],
  movable: readonly string[],
  key: string,
  delta: -1 | 1,
): string | null {
  const from = order.indexOf(key);
  if (from === -1 || !movable.includes(key)) return null;
  for (let index = from + delta; index >= 0 && index < order.length; index += delta) {
    const candidate = order[index]!;
    if (movable.includes(candidate)) return candidate;
  }
  return null;
}

export type ColumnReorderAction =
  { type: 'grab' } | { type: 'drop' } | { type: 'cancel' } | { type: 'move'; delta: -1 | 1 } | { type: 'none' };

/**
 * The keyboard route to a header drag, which is otherwise unreachable: grab
 * with Space, arrows to move, Space or Enter to drop, Escape to put it back.
 *
 * Modal on purpose. The alternative — a bare Ctrl+Arrow on a focused header —
 * has no state to announce, so a screen reader user gets a column that moved
 * with no way to tell where it now is, and no way to change their mind.
 */
export function columnReorderAction(key: string, grabbed: boolean): ColumnReorderAction {
  if (key === ' ' || key === 'Spacebar') return grabbed ? { type: 'drop' } : { type: 'grab' };
  if (!grabbed) return { type: 'none' };
  if (key === 'Enter') return { type: 'drop' };
  if (key === 'Escape') return { type: 'cancel' };
  if (key === 'ArrowLeft') return { type: 'move', delta: -1 };
  if (key === 'ArrowRight') return { type: 'move', delta: 1 };
  return { type: 'none' };
}
