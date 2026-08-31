import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  SAVED_FLASH_MS,
  cellId,
  cellKeyAction,
  editChanged,
  editErrorMessage,
  editKeyAction,
  editorHoldsKey,
  firstEditableCell,
  isEditableCell,
  isThenable,
  nextEditableCell,
  type CellEditState,
  type EditableCell,
  type EditableGrid,
} from '../../lib/data/tableEdit';
import { headerLabel, type DataTableColumn, type DataTableEditorContext } from './tableContract';

export interface EditingSession {
  rowId: string;
  columnKey: string;
  draft: string;
  initial: string;
}

export interface TableEditApi<T> {
  editing: EditingSession | null;
  cellStates: Record<string, CellEditState>;
  cellCursor: EditableCell | null;
  cellNodes: RefObject<Map<string, HTMLTableCellElement>>;
  beginEdit: (cell: EditableCell) => void;
  onCellKeyDown: (event: ReactKeyboardEvent<HTMLElement>, cell: EditableCell) => void;
  renderEditor: (row: T, column: DataTableColumn<T>, session: EditingSession) => ReactNode;
}

/* ── inline editing ─────────────────────────────────────────────────── */

export function useTableEdit<T>(options: {
  rows: T[];
  rowKey: (row: T) => string;
  /** The VISIBLE columns — editing stays coupled to hiding: a hidden column is not a stop. */
  shown: DataTableColumn<T>[];
  isRowDisabled?: (row: T) => boolean;
}): TableEditApi<T> {
  const { rows, rowKey, shown, isRowDisabled } = options;

  const editableColumns = shown.filter((column) => column.edit !== undefined);
  const hasEditors = editableColumns.length > 0;
  /* Only paid by a table that actually has editors. A table without them
   * renders exactly the DOM it rendered before this feature landed. */
  const rowById = new Map<string, T>();
  if (hasEditors) for (const row of rows) rowById.set(rowKey(row), row);

  const grid: EditableGrid = {
    rows: hasEditors ? [...rowById.keys()] : [],
    columns: editableColumns.map((column) => column.key),
    isEditable: (cell) => {
      const row = rowById.get(cell.rowId);
      if (row === undefined || isRowDisabled?.(row) === true) return false;
      const column = editableColumns.find((each) => each.key === cell.columnKey);
      if (column?.edit === undefined) return false;
      return column.edit.enabled?.(row) ?? true;
    },
  };

  const [editing, setEditing] = useState<EditingSession | null>(null);
  const [cursor, setCursor] = useState<EditableCell | null>(null);
  const [cellStates, setCellStates] = useState<Record<string, CellEditState>>({});
  const cellNodes = useRef(new Map<string, HTMLTableCellElement>());
  const savedTimers = useRef(new Map<string, number>());
  const restoreFocus = useRef(false);
  const skipBlurCommit = useRef(false);
  /* One counter per cell, bumped on every write. A person who fixes a value
   * the API just rejected has two writes in flight on the same cell, and the
   * slower one is the older one — without this the stale rejection lands on
   * top of the correction and the cell claims the fixed value failed. Last
   * write wins, not last answer. */
  const editSequence = useRef(new Map<string, number>());

  useEffect(
    () => () => {
      for (const timer of savedTimers.current.values()) window.clearTimeout(timer);
    },
    [],
  );

  /* Focus returns to the cell only when a KEY closed the editor. Closing by
   * blur means the user clicked something else, and yanking focus back out of
   * whatever they clicked is the worst bug an inline editor can have. */
  useEffect(() => {
    if (editing !== null || !restoreFocus.current) return;
    restoreFocus.current = false;
    if (cursor !== null) cellNodes.current.get(cellId(cursor))?.focus();
  }, [editing, cursor]);

  const writeCellState = useCallback((key: string, state: CellEditState) => {
    window.clearTimeout(savedTimers.current.get(key));
    savedTimers.current.delete(key);
    setCellStates((prev) => ({ ...prev, [key]: state }));
    if (state.status !== 'saved') return;
    /* The tick clears itself. An error does not: it is the only record that the
     * write failed, since nothing server-side kept one. */
    savedTimers.current.set(
      key,
      window.setTimeout(() => {
        savedTimers.current.delete(key);
        setCellStates((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, SAVED_FLASH_MS),
    );
  }, []);

  const editColumn = (key: string) => editableColumns.find((column) => column.key === key);

  const beginEdit = (cell: EditableCell) => {
    const row = rowById.get(cell.rowId);
    const column = editColumn(cell.columnKey);
    if (row === undefined || column?.edit === undefined) return;
    if (!isEditableCell(grid, cell)) return;
    const initial = column.edit.value(row);
    /* Deliberately does NOT clear skipBlurCommit. Moving here from a cell that
     * a key already committed leaves that flag standing, and the outgoing
     * editor's blur — which some browsers fire on removal and some do not —
     * has to find it. The incoming editor clears it from its own onFocus,
     * which happens either way. */
    setCursor(cell);
    setEditing({ rowId: cell.rowId, columnKey: cell.columnKey, draft: initial, initial });
  };

  const commitEdit = (session: EditingSession) => {
    if (!editChanged(session.draft, session.initial)) return;
    const row = rowById.get(session.rowId);
    const column = editColumn(session.columnKey);
    if (row === undefined || column?.edit === undefined) return;

    const key = cellId(session);
    const ticket = (editSequence.current.get(key) ?? 0) + 1;
    editSequence.current.set(key, ticket);
    const current = () => editSequence.current.get(key) === ticket;

    const result = column.edit.commit(row, session.draft);
    if (!isThenable(result)) {
      writeCellState(key, { status: 'saved' });
      return;
    }
    writeCellState(key, { status: 'pending' });
    void result.then(
      () => {
        if (current()) writeCellState(key, { status: 'saved' });
      },
      (reason: unknown) => {
        if (current()) writeCellState(key, { status: 'error', message: editErrorMessage(reason) });
      },
    );
  };

  const onEditorKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (editing === null) return;
    const action = editKeyAction(event);
    if (action.type === 'none') return;
    event.preventDefault();
    /* The row owns Enter (open the record) and Space (select it). While an
     * editor is open neither may also fire. */
    event.stopPropagation();

    const session = editing;
    skipBlurCommit.current = true;

    if (action.type === 'cancel') {
      setEditing(null);
      restoreFocus.current = true;
      return;
    }

    commitEdit(session);
    const next =
      action.move === null
        ? null
        : nextEditableCell(grid, { rowId: session.rowId, columnKey: session.columnKey }, action.move);
    if (next === null) {
      setEditing(null);
      restoreFocus.current = true;
      return;
    }
    beginEdit(next);
  };

  const onEditorBlur = () => {
    /* A key already dealt with this cell and moved on; the blur it caused by
     * unmounting the input must not commit a second time. */
    if (skipBlurCommit.current) {
      skipBlurCommit.current = false;
      return;
    }
    if (editing === null) return;
    commitEdit(editing);
    setEditing(null);
  };

  const onCellKeyDown = (event: ReactKeyboardEvent<HTMLElement>, cell: EditableCell) => {
    /* The editor lives inside this <td>, so every key pressed in it bubbles
     * here. Without this line the arrow keys that move a caret through the
     * text being typed would also move the cell cursor out from under it.
     *
     * And the <td> is the last stop before the <tr>, which owns Enter, Space,
     * the arrows and Home/End whenever row navigation is on — so this is also
     * where the keys the editor needs are taken off the wire. See
     * editorHoldsKey: it covers an editor that never spread `inputProps` too,
     * which onEditorKeyDown by definition cannot. */
    if (editing !== null) {
      if (editorHoldsKey(event)) event.stopPropagation();
      return;
    }
    const action = cellKeyAction(event);
    if (action.type === 'none') return;
    event.preventDefault();
    event.stopPropagation();
    if (action.type === 'edit') {
      beginEdit(cell);
      return;
    }
    const next = nextEditableCell(grid, cell, action.move);
    if (next === null) return;
    setCursor(next);
    cellNodes.current.get(cellId(next))?.focus();
  };

  /* Exactly one editable cell is a tab stop, the way a roving group works — a
   * 50-row table with six editable columns would otherwise put 300 tab stops
   * between the table and whatever comes after it. Falls back to the first
   * editable cell whenever the cursor's row is paged or filtered away. */
  const cellCursor = cursor !== null && isEditableCell(grid, cursor) ? cursor : firstEditableCell(grid);

  const renderEditor = (row: T, column: DataTableColumn<T>, session: EditingSession): ReactNode => {
    const edit = column.edit;
    if (edit === undefined) return null;
    const context: DataTableEditorContext<T> = {
      row,
      column,
      value: session.draft,
      setValue: (value) => setEditing((prev) => (prev === null ? prev : { ...prev, draft: value })),
      commit: (value) => {
        skipBlurCommit.current = true;
        commitEdit(value === undefined ? session : { ...session, draft: value });
        setEditing(null);
        restoreFocus.current = true;
      },
      cancel: () => {
        skipBlurCommit.current = true;
        setEditing(null);
        restoreFocus.current = true;
      },
      status: cellStates[cellId(session)]?.status ?? 'idle',
      inputProps: {
        autoFocus: true,
        onKeyDown: onEditorKeyDown,
        onBlur: onEditorBlur,
        onFocus: () => {
          skipBlurCommit.current = false;
        },
      },
    };
    if (edit.render !== undefined) return edit.render(context);
    return (
      <input
        {...context.inputProps}
        value={context.value}
        onChange={(event) => context.setValue(event.target.value)}
        placeholder={edit.placeholder}
        aria-label={headerLabel(column)}
        /* No size class: Tailwind's preflight gives form controls
           `font-size: 100%`, so the editor already matches the density the
           cell is rendered at. Naming a size here would fight it. */
        className="h-6 w-full rounded-control border border-accent bg-surface-raised px-1.5 text-text placeholder:text-text-faint focus-visible:focus-ring"
      />
    );
  };

  return { editing, cellStates, cellCursor, cellNodes, beginEdit, onCellKeyDown, renderEditor };
}
