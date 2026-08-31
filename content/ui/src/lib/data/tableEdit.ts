/**
 * Inline cell editing — the decisions, without the DOM.
 *
 * DataTable owns focus, the editor element and the promise. Everything here is
 * what can be WRONG: which cell a key moves to, what each key means, and what a
 * rejected save is allowed to print. A rule left inside the component would be
 * untestable forever — vitest in this package is node-only, there is no render.
 *
 * The grid this file reasons about is the EDITABLE grid, not the table: hidden
 * columns and read-only columns are already gone by the time it gets here, so
 * "one row down" means the next row that can actually take the value.
 */

export interface EditableCell {
  rowId: string;
  columnKey: string;
}

export interface EditableGrid {
  /** Row ids in display order. */
  rows: readonly string[];
  /** Keys of the columns that declare an editor, in display order. */
  columns: readonly string[];
  /**
   * Cell-level veto. One predicate rather than a list of locked rows because
   * both cases are real and they compose: a restricted record is closed
   * entirely, and a field can be missing from one record while present on the
   * next. Default: every cell of the grid is editable.
   */
  isEditable?: (cell: EditableCell) => boolean;
}

/**
 * `down`/`up` hold the column, `left`/`right` hold the row, and `next`/
 * `previous` walk reading order across row boundaries. Enter uses the first
 * pair (a column of values is what someone is actually typing down), Tab the
 * last (a record is what someone is actually filling in).
 */
export type EditMove = 'up' | 'down' | 'left' | 'right' | 'next' | 'previous';

export function sameCell(a: EditableCell | null, b: EditableCell | null): boolean {
  if (a === null || b === null) return a === b;
  return a.rowId === b.rowId && a.columnKey === b.columnKey;
}

export function isEditableCell(grid: EditableGrid, cell: EditableCell): boolean {
  if (!grid.rows.includes(cell.rowId)) return false;
  if (!grid.columns.includes(cell.columnKey)) return false;
  return grid.isEditable?.(cell) ?? true;
}

function editableAt(grid: EditableGrid, rowIndex: number, columnIndex: number): EditableCell | null {
  const rowId = grid.rows[rowIndex];
  const columnKey = grid.columns[columnIndex];
  if (rowId === undefined || columnKey === undefined) return null;
  const cell = { rowId, columnKey };
  return (grid.isEditable?.(cell) ?? true) ? cell : null;
}

/** Where the cell cursor starts, and where it falls back to when a row is paged away. */
export function firstEditableCell(grid: EditableGrid): EditableCell | null {
  for (let row = 0; row < grid.rows.length; row += 1) {
    for (let column = 0; column < grid.columns.length; column += 1) {
      const cell = editableAt(grid, row, column);
      if (cell !== null) return cell;
    }
  }
  return null;
}

/**
 * The cell a move lands on, or null when there is nowhere to go.
 *
 * Nothing wraps. Enter on the last row must not teleport the caret to the top
 * of a 500-row page — the person typing has no idea the page ended, and the
 * next keystroke would overwrite a record they cannot see. Null means "stop
 * editing and stay put", which is also what lets Tab hand focus back to the
 * browser at the end of the grid instead of trapping it there.
 */
export function nextEditableCell(grid: EditableGrid, from: EditableCell, move: EditMove): EditableCell | null {
  const rowIndex = grid.rows.indexOf(from.rowId);
  const columnIndex = grid.columns.indexOf(from.columnKey);
  /* The row this edit started on has been paged or filtered away. There is no
   * honest answer to "one row down" from a row that is gone. */
  if (rowIndex === -1 || columnIndex === -1) return null;

  if (move === 'down' || move === 'up') {
    const step = move === 'down' ? 1 : -1;
    for (let row = rowIndex + step; row >= 0 && row < grid.rows.length; row += step) {
      const cell = editableAt(grid, row, columnIndex);
      if (cell !== null) return cell;
    }
    return null;
  }

  if (move === 'right' || move === 'left') {
    const step = move === 'right' ? 1 : -1;
    for (let column = columnIndex + step; column >= 0 && column < grid.columns.length; column += step) {
      const cell = editableAt(grid, rowIndex, column);
      if (cell !== null) return cell;
    }
    return null;
  }

  const width = grid.columns.length;
  if (width === 0) return null;
  const step = move === 'next' ? 1 : -1;
  const total = grid.rows.length * width;
  for (let flat = rowIndex * width + columnIndex + step; flat >= 0 && flat < total; flat += step) {
    const cell = editableAt(grid, Math.floor(flat / width), flat % width);
    if (cell !== null) return cell;
  }
  return null;
}

export interface EditKeyLike {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export type EditKeyAction = { type: 'commit'; move: EditMove | null } | { type: 'cancel' } | { type: 'none' };

/**
 * What a key does while an editor is open.
 *
 * Escape is answered before the modifier gate, because Escape means "get me
 * out" whatever else is held down. Everything after it defers to a held
 * Cmd/Ctrl/Alt: Cmd+Enter belongs to the application (send, save the whole
 * form), and a cell editor that swallowed it would break a shortcut the user
 * never aimed at it.
 */
export function editKeyAction(event: EditKeyLike): EditKeyAction {
  if (event.key === 'Escape') return { type: 'cancel' };
  if (event.metaKey === true || event.ctrlKey === true || event.altKey === true) {
    return { type: 'none' };
  }
  const shift = event.shiftKey === true;
  if (event.key === 'Enter') return { type: 'commit', move: shift ? 'up' : 'down' };
  if (event.key === 'Tab') return { type: 'commit', move: shift ? 'previous' : 'next' };
  return { type: 'none' };
}

/**
 * Keys an open editor has to keep away from the table around it.
 *
 * The editor lives in a `<td>` inside a `<tr>`, and that row owns Enter (open
 * the record), Space (select it) and the arrows plus Home/End (move to another
 * row) as soon as row navigation is on. Every key typed into the editor
 * bubbles straight through them. Left alone: Space selects the row instead of
 * typing a space — so a two-word value cannot be entered at all — Home jumps
 * to the first row rather than to the start of the sentence being typed, and
 * an arrow key drags focus out of the input mid-edit, committing a
 * half-written value on the way.
 *
 * This is a separate question from `editKeyAction`, which is about what the
 * editor DOES with a key. Most of these it does nothing with: it just has to
 * be the one that does nothing with them.
 *
 * The list is exactly the surrounding table's own keyboard contract and no
 * wider. Escape and Tab are not on it: nothing outside the editor claims
 * them, and swallowing Escape would take away the way out of whatever the
 * table is sitting in. Both arrows on the horizontal axis ARE on it, because
 * out of edit mode they move the cell cursor and in edit mode they move the
 * caret — the one pair where the two meanings would collide silently.
 *
 * Modifiers pass through: nothing in that contract fires with one held, and
 * Cmd+K belongs to the application.
 */
const HELD_KEYS = new Set(['Enter', ' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

export function editorHoldsKey(event: EditKeyLike): boolean {
  if (event.metaKey === true || event.ctrlKey === true || event.altKey === true) return false;
  return HELD_KEYS.has(event.key);
}

export type CellKeyAction = { type: 'edit' } | { type: 'move'; move: EditMove } | { type: 'none' };

/**
 * What a key does on a focused cell that is NOT being edited.
 *
 * Space is deliberately absent. In a table with row navigation Space toggles
 * the row's selection and the cell cursor sits inside that row — leaving Space
 * alone lets it bubble, so a row can still be selected from a cell. Tab is
 * absent for the same reason: out of edit mode, Tab belongs to the browser.
 */
export function cellKeyAction(event: EditKeyLike): CellKeyAction {
  if (event.metaKey === true || event.ctrlKey === true || event.altKey === true) {
    return { type: 'none' };
  }
  /* F2 as well as Enter: it is the spreadsheet's edit key, and it is the only
   * one left where Enter already means "open this record". */
  if (event.key === 'Enter' || event.key === 'F2') return { type: 'edit' };
  if (event.key === 'ArrowDown') return { type: 'move', move: 'down' };
  if (event.key === 'ArrowUp') return { type: 'move', move: 'up' };
  if (event.key === 'ArrowRight') return { type: 'move', move: 'right' };
  if (event.key === 'ArrowLeft') return { type: 'move', move: 'left' };
  return { type: 'none' };
}

export type CellEditStatus = 'idle' | 'pending' | 'saved' | 'error';

export interface CellEditState {
  status: CellEditStatus;
  /** Only ever set on 'error'. */
  message?: string;
}

/** How long the saved tick stays up. Long enough to see, short enough not to lie. */
export const SAVED_FLASH_MS = 1400;

export const DEFAULT_EDIT_ERROR = 'Could not save.';

/**
 * The sentence a failed save is allowed to print.
 *
 * `instanceof Error` alone is not enough here: a GraphQL failure arrives as a
 * plain object carrying `message`, so an instanceof test would print the
 * generic fallback for every real API error while the useful one sat in the
 * object. And an unrecognised reason must never reach the cell — "[object
 * Object]" and "undefined" are both worse than saying nothing specific.
 */
export function editErrorMessage(reason: unknown): string {
  if (typeof reason === 'string' && reason.trim() !== '') return reason.trim();
  if (typeof reason === 'object' && reason !== null && 'message' in reason) {
    const message = (reason as { message: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message.trim();
  }
  return DEFAULT_EDIT_ERROR;
}

/**
 * Is there anything to save?
 *
 * Blur commits, so every cell a person merely tabs THROUGH would otherwise fire
 * a mutation carrying the value it already had — and on this API writing an
 * attribute CREATES it, so a no-op write is not free.
 *
 * Exact comparison, no trimming: a trailing space is a bad value, not a
 * non-change, and normalising it here would hide it from the caller's
 * validation instead of letting it be rejected.
 */
export function editChanged(draft: string, initial: string): boolean {
  return draft !== initial;
}

/**
 * Did the caller hand back something to wait on?
 *
 * Duck-typed rather than `instanceof Promise`: a client can return its own
 * thenable, and a cell that showed "saved" the instant a real request left the
 * browser would be a lie every time the request then failed.
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';
}

/*
 * Composite key for the per-cell status map.
 *
 * NUL is the one separator a row id or a column key cannot contain, which is
 * exactly why it is the right one. Written as the escape and never as the raw
 * byte: a literal NUL makes git call the whole file binary — no diff, no blame,
 * no merge. The runtime value is identical.
 */
const CELL_KEY_SEPARATOR = '\u0000';

export function cellId(cell: EditableCell): string {
  return `${cell.rowId}${CELL_KEY_SEPARATOR}${cell.columnKey}`;
}
