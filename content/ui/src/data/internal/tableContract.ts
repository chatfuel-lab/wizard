import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { SortState } from '../../lib/data/table';
import type { CellEditStatus } from '../../lib/data/tableEdit';

export type DataTableDensity = 'compact' | 'cozy' | 'comfortable';

/**
 * Everything an editor needs, handed to `column.edit.render`.
 *
 * The table holds the draft, not the caller. That is what lets Escape restore
 * the original, lets blur ask "did anything actually change?", and lets Enter
 * carry a half-typed value into the cell below without a round trip through
 * the owner's state — which at 500 rows would re-render the whole body on
 * every keystroke.
 *
 * The context belongs to the render it came from: call `commit`/`cancel` from
 * the editor, not from a callback stored for later.
 */
export interface DataTableEditorContext<T> {
  row: T;
  column: DataTableColumn<T>;
  /** The draft, as typed so far. */
  value: string;
  setValue: (value: string) => void;
  /**
   * Save and close. Already wired to Enter, Tab and blur.
   *
   * Takes an optional value because a `<select>` has to: its change event
   * carries the chosen option, and `setValue` then `commit()` in the same
   * handler would commit the value from before the change.
   */
  commit: (value?: string) => void;
  /** Close and throw the draft away. Already wired to Escape. */
  cancel: () => void;
  status: CellEditStatus;
  /**
   * Spread onto the editor's own FOCUSABLE element — a native input, select or
   * textarea, not a wrapper. It carries the key handling and the blur commit;
   * an editor that drops it still edits, but Enter, Tab and Escape stop
   * working, and `onFocus` is what tells the table this editor is now the live
   * one, so a commit already made by a key is not made a second time by the
   * blur that follows it.
   */
  inputProps: {
    autoFocus: boolean;
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
    onBlur: () => void;
    onFocus: () => void;
  };
}

export interface DataTableEdit<T> {
  /** The value the editor opens with. */
  value: (row: T) => string;
  /**
   * Save. Called only when the draft actually differs from what the editor
   * opened with — blur commits, so every cell somebody merely tabs through
   * would otherwise fire a mutation.
   *
   * Return a promise and the cell shows pending, then a tick or the rejection's
   * message. Return nothing and it shows the tick immediately.
   */
  commit: (row: T, value: string) => void | Promise<unknown>;
  /** Custom editor. Default: a single-line text input. */
  render?: (context: DataTableEditorContext<T>) => ReactNode;
  /** Per-row veto — a computed field, an attribute this record does not carry. */
  enabled?: (row: T) => boolean;
  /** Placeholder for the default input. */
  placeholder?: string;
}

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** CSS width (e.g. '12rem', '30%'). An interactive resize overrides it. */
  width?: string;
  /** Floor for interactive resizing, px. Default 64. */
  minWidth?: number;
  align?: 'start' | 'end';
  sortable?: boolean;
  resizable?: boolean;
  /**
   * Opt OUT of column reordering, which is otherwise on for every column as
   * soon as the table is given `onColumnOrderChange`.
   *
   * The odd one out among `sortable`/`resizable`, and deliberately: those are
   * per-column capabilities (only some columns have a server-side sort), while
   * reordering is a property of the table. The exception is a column that must
   * stay put — the pinned identity column everything else is read against.
   */
  reorderable?: boolean;
  /**
   * Let the cell wrap onto more lines instead of truncating with an ellipsis.
   * Needed by any cell holding a control or a stacked error message — nowrap
   * would keep those on one line and clip them.
   */
  wrap?: boolean;
  /** Turns the cell into an editor. See DataTableEdit. */
  edit?: DataTableEdit<T>;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Rendered when rows is empty and nothing is loading. */
  empty?: ReactNode;

  density?: DataTableDensity;
  /** Header stays put while the scroll container moves. */
  stickyHeader?: boolean;
  /** Freeze the leading column (and the checkbox with it) horizontally. */
  pinFirstColumn?: boolean;

  sort?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;

  /** Passing both of these is what turns selection on. */
  selectedIds?: readonly string[];
  onSelectionChange?: (ids: string[]) => void;

  columnWidths?: Readonly<Record<string, number>>;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  hiddenColumns?: readonly string[];
  /**
   * Turns header drag and its keyboard twin on. Receives the FULL key order,
   * hidden columns included and back in the slots they already held — the
   * caller persists one list, so handing it only what was on screen would drop
   * every hidden column on the floor.
   */
  onColumnOrderChange?: (keys: string[]) => void;

  loading?: boolean;
  skeletonRows?: number;

  /** Trailing cell, revealed on row hover or keyboard focus. */
  rowActions?: (row: T) => ReactNode;
  /** Restricted records: not selectable, not clickable, not editable, still counted. */
  isRowDisabled?: (row: T) => boolean;

  /** Right-click a row. The handler owns preventDefault. */
  onRowContextMenu?: (row: T, event: ReactMouseEvent) => void;
  /**
   * Rows become a single tab stop with arrow-key navigation: Enter opens,
   * Space toggles selection. Off by default — a table of five settings rows
   * does not want to swallow the arrow keys.
   */
  rowNavigation?: boolean;
  /** Accessible description of what the table holds. */
  caption?: string;
  className?: string;
}

export const DENSITY_ROW: Record<DataTableDensity, string> = {
  compact: 'h-row-compact',
  cozy: 'h-row-cozy',
  comfortable: 'h-row-comfortable',
};

export const DENSITY_CELL: Record<DataTableDensity, string> = {
  compact: 'px-2 py-0.5 text-xs',
  cozy: 'px-3 py-1.5 text-sm',
  comfortable: 'px-3 py-2.5 text-sm',
};

/** Checkbox column width, in px — also the pinned first column's left offset. */
export const SELECT_COLUMN_PX = 40;

/** A header is a ReactNode; every announcement about it needs a string. */
export function headerLabel<T>(column: DataTableColumn<T>): string {
  return typeof column.header === 'string' ? column.header : column.key;
}
