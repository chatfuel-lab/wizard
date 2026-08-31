import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { Checkbox } from '../../forms/Checkbox';
import type { UseRovingFocusResult } from '../../hooks/useRovingFocus';
import { cellId, sameCell, type EditableCell } from '../../lib/data/tableEdit';
import { CellStatus } from './CellStatus';
import { DENSITY_CELL, DENSITY_ROW, type DataTableColumn, type DataTableDensity } from './tableContract';
import type { TableEditApi } from './useTableEdit';

interface TableRowProps<T> {
  row: T;
  rowIndex: number;
  rowCount: number;
  rowKey: (row: T) => string;
  shown: DataTableColumn<T>[];
  density: DataTableDensity;
  selectable: boolean;
  selectedSet: Set<string>;
  onToggleRow: (id: string, shift: boolean) => void;
  pinFirstColumn: boolean;
  pinnedLeft: (index: number) => number | undefined;
  onRowClick?: (row: T) => void;
  onRowContextMenu?: (row: T, event: ReactMouseEvent) => void;
  isRowDisabled?: (row: T) => boolean;
  rowActions?: (row: T) => ReactNode;
  rowNavigation: boolean;
  roving: UseRovingFocusResult;
  edit: TableEditApi<T>;
}

/**
 * One body row.
 *
 * The root stays a bare `<tr>` — no wrapper, no fragment siblings — because a
 * consumer reaches rows as `tbody.children[i]` and animates them by index; any
 * extra node would break that contract. And no `React.memo`: the edit API
 * object is rebuilt on every table render, so memo would compare a fresh
 * object each time and never skip — a no-op that only invites stale-closure
 * "fixes" later.
 */
export function TableRow<T>({
  row,
  rowIndex,
  rowCount,
  rowKey,
  shown,
  density,
  selectable,
  selectedSet,
  onToggleRow,
  pinFirstColumn,
  pinnedLeft,
  onRowClick,
  onRowContextMenu,
  isRowDisabled,
  rowActions,
  rowNavigation,
  roving,
  edit,
}: TableRowProps<T>) {
  const { editing, cellStates, cellCursor, cellNodes, beginEdit, onCellKeyDown, renderEditor } = edit;

  const id = rowKey(row);
  const disabled = isRowDisabled?.(row) ?? false;
  const isSelected = selectedSet.has(id);
  const clickable = onRowClick !== undefined && !disabled;
  /* The row owns the background so `bg-[inherit]` on a pinned
   * cell picks up hover and selection instead of punching a hole. */
  const rowBg = isSelected ? 'bg-row-selected hover:bg-row-selected-hover' : 'bg-surface-raised hover:bg-row-hover';
  const cell = `${rowIndex === rowCount - 1 ? '' : 'border-b border-border'} ${DENSITY_CELL[density]}`;

  const navProps = rowNavigation ? roving.itemProps(rowIndex) : null;

  return (
    <tr
      ref={navProps?.ref}
      tabIndex={navProps?.tabIndex}
      aria-selected={selectable ? isSelected : undefined}
      onClick={clickable ? () => onRowClick(row) : undefined}
      onContextMenu={onRowContextMenu && !disabled ? (event) => onRowContextMenu(row, event) : undefined}
      onKeyDown={
        navProps
          ? (event) => {
              if (event.key === 'Enter' && clickable) {
                event.preventDefault();
                onRowClick(row);
                return;
              }
              if (event.key === ' ' && selectable && !disabled) {
                /* Without this the scroll container jumps a page
                   on every selection. */
                event.preventDefault();
                onToggleRow(id, event.shiftKey);
                return;
              }
              roving.onKeyDown(event);
            }
          : undefined
      }
      className={`group ${DENSITY_ROW[density]} ${rowBg} ${clickable ? 'cursor-pointer' : ''} ${
        rowNavigation ? 'focus-visible:focus-ring' : ''
      }`}
    >
      {selectable ? (
        <td
          style={pinFirstColumn ? { left: 0 } : undefined}
          className={`px-2 ${cell} ${pinFirstColumn ? 'sticky z-sticky bg-[inherit]' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            disabled={disabled}
            onChange={(_, event) => onToggleRow(id, event.shiftKey)}
            aria-label={`Select row ${id}`}
          />
        </td>
      ) : null}

      {shown.map((column, index) => {
        const left = pinnedLeft(index);
        /* overflow-hidden is not optional under
           table-layout: fixed — without it an over-wide cell
           paints straight over its neighbour. */
        const cellClass = `text-text ${column.wrap ? 'overflow-hidden' : 'truncate'} ${cell} ${
          column.align === 'end' ? 'text-right tabular-nums' : ''
        } ${left === undefined ? '' : 'sticky z-sticky bg-[inherit]'}`;
        const content = column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '');

        if (column.edit === undefined) {
          return (
            <td key={column.key} style={left === undefined ? undefined : { left }} className={cellClass}>
              {content}
            </td>
          );
        }

        const here: EditableCell = { rowId: id, columnKey: column.key };
        const stateKey = cellId(here);
        const state = cellStates[stateKey];
        /* Spelled out rather than asking isEditableCell, which
         * would scan the row list once per cell. This row is in
         * the grid by construction; the same two questions are
         * left. */
        const editable = !disabled && (column.edit.enabled?.(row) ?? true);
        const session = editing !== null && editing.rowId === id && editing.columnKey === column.key ? editing : null;

        return (
          <td
            key={column.key}
            ref={(node) => {
              if (node) cellNodes.current.set(stateKey, node);
              else cellNodes.current.delete(stateKey);
            }}
            style={left === undefined ? undefined : { left }}
            tabIndex={editable ? (sameCell(cellCursor, here) ? 0 : -1) : undefined}
            aria-busy={state?.status === 'pending' ? true : undefined}
            onClick={
              editable
                ? (event) => {
                    /* An editable cell is not a way into the
                       record: a single click edits it, which is
                       what every CRM grid does and what the
                       pointer is already over. */
                    event.stopPropagation();
                    /* A click INSIDE the open editor bubbles to
                       this same cell. Restarting the edit there
                       would throw the draft away every time
                       somebody clicked to move the caret. */
                    if (session === null) beginEdit(here);
                  }
                : undefined
            }
            onKeyDown={editable ? (event) => onCellKeyDown(event, here) : undefined}
            className={`${cellClass} ${editable ? 'cursor-text focus-visible:focus-ring' : ''}`}
          >
            {session !== null ? (
              renderEditor(row, column, session)
            ) : (
              <span className="flex items-center gap-1.5">
                <span className={`min-w-0 flex-1 ${column.wrap ? '' : 'truncate'}`}>{content}</span>
                <CellStatus state={state} />
              </span>
            )}
          </td>
        );
      })}

      {rowActions ? (
        <td className={`${cell} text-right`} onClick={(event) => event.stopPropagation()}>
          {/* Hidden until hover, but focus-within brings it back
              so a Tab user can still reach it. */}
          <span className="opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 group-focus-within:opacity-100">
            {rowActions(row)}
          </span>
        </td>
      ) : null}
    </tr>
  );
}
