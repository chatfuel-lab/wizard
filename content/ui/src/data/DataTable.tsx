import { useRef } from 'react';
import { DragLayer } from '../dnd/DragLayer';
import { Checkbox } from '../forms/Checkbox';
import { useRovingFocus } from '../hooks/useRovingFocus';
import { headerCheckboxState, resolveColumnWidths, visibleColumns } from '../lib/data/table';
import { Skeleton } from '../primitives/Skeleton';
import { HeaderCell } from './internal/HeaderCell';
import { TableRow } from './internal/TableRow';
import { useColumnReorder } from './internal/useColumnReorder';
import { useTableEdit } from './internal/useTableEdit';
import { useTableSelection } from './internal/useTableSelection';
import { DENSITY_CELL, DENSITY_ROW, SELECT_COLUMN_PX, type DataTableProps } from './internal/tableContract';

/**
 * Generic table.
 *
 * Fully controlled, deliberately: rows here are server-paged and merged from
 * subscriptions, so any sort or selection this component held internally would
 * be overwritten on every live echo. The owner holds the state and lib/data/table.ts
 * computes the next one.
 *
 * Every prop beyond the original five is optional, so a plain
 * `<DataTable columns rows rowKey />` renders exactly what it did before.
 *
 * Two structural choices worth knowing:
 *
 * - `border-separate` with borders on the CELLS, never on the row. Under
 *   `border-collapse: collapse` the border belongs to the table rather than the
 *   cell, so a sticky header's underline simply vanishes as you scroll.
 * - Widths live in `<colgroup>`, so dragging a column edge resizes one `<col>`
 *   instead of reflowing every cell in the body.
 *
 * Two things are NOT controlled, because they are transient rather than state:
 * which cell is open for editing, and where the cell cursor sits. Both die with
 * the interaction; neither survives a page of rows arriving, and lifting them
 * out would make every keystroke the owner's problem.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  density = 'cozy',
  stickyHeader = false,
  pinFirstColumn = false,
  sort = null,
  onSortChange,
  selectedIds,
  onSelectionChange,
  columnWidths,
  onColumnWidthsChange,
  hiddenColumns,
  onColumnOrderChange,
  loading = false,
  skeletonRows = 6,
  rowActions,
  isRowDisabled,
  onRowContextMenu,
  rowNavigation = false,
  caption,
  className = '',
}: DataTableProps<T>) {
  const shown = visibleColumns(columns, hiddenColumns);
  const widths = resolveColumnWidths(shown, columnWidths);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* Hooks cannot be conditional, so the roving state exists either way; only
   * the props it hands out are withheld when rowNavigation is off. */
  const roving = useRovingFocus(rows.length, { orientation: 'vertical' });

  const { selectable, selectableIds, selectedSet, selectedHere, onToggleRow, onToggleAll } = useTableSelection({
    rows,
    rowKey,
    isRowDisabled,
    selectedIds,
    onSelectionChange,
  });

  /* The frozen region is the checkbox plus the first data column: pinning only
   * a checkbox would freeze the one column nobody needs to read. */
  const pinnedLeft = (index: number): number | undefined => {
    if (!pinFirstColumn || index !== 0) return undefined;
    return selectable ? SELECT_COLUMN_PX : 0;
  };

  const headBase = stickyHeader ? 'sticky top-0 z-sticky bg-surface-raised' : 'bg-surface-raised';
  const showEmpty = !loading && rows.length === 0 && empty !== undefined;

  const edit = useTableEdit({
    rows,
    rowKey,
    shown,
    isRowDisabled,
  });

  const {
    session: orderSession,
    reorderable,
    reorderNote,
    labelOf,
    onHeaderSort,
    reorderFor,
    headerPointerDown,
  } = useColumnReorder({
    columns,
    shown,
    scrollRef,
    onColumnOrderChange,
    onSortChange,
  });

  return (
    /* `contain: paint` is not decoration: without it Chromium lets the table's
       scrollable overflow reach the PAGE — a table wider than its card scrolls
       inside the card AND drags the whole document sideways (found on the
       automations Handoff matrix at every width). Paint containment is what a
       scroll container already implies visually, and it stops the leak. */
    <div ref={scrollRef} className={`overflow-auto [contain:paint] ${className}`}>
      <table className="w-full border-separate border-spacing-0 text-sm" style={{ tableLayout: 'fixed' }}>
        {caption !== undefined ? <caption className="sr-only">{caption}</caption> : null}

        {/* HeaderCell resizes by writing to these <col>s via th.cellIndex — the
            col sequence must mirror the header-cell sequence exactly, checkbox
            and actions cols included. */}
        <colgroup>
          {selectable ? <col style={{ width: `${SELECT_COLUMN_PX}px` }} /> : null}
          {shown.map((column, index) => (
            <col key={column.key} style={widths[index] ? { width: widths[index] } : undefined} />
          ))}
          {rowActions ? <col style={{ width: '3rem' }} /> : null}
        </colgroup>

        <thead>
          <tr className="text-left">
            {selectable ? (
              <th
                scope="col"
                style={pinFirstColumn ? { left: 0 } : undefined}
                className={`border-b border-border-strong px-2 ${DENSITY_CELL[density]} ${headBase} ${
                  pinFirstColumn ? 'sticky' : ''
                }`}
              >
                <Checkbox
                  checked={headerCheckboxState(selectedHere, selectableIds.length)}
                  onChange={onToggleAll}
                  disabled={selectableIds.length === 0}
                  aria-label="Select all rows"
                />
              </th>
            ) : null}

            {shown.map((column, index) => (
              <HeaderCell
                key={column.key}
                column={column}
                density={density}
                sort={sort}
                onSortChange={onHeaderSort}
                headBase={headBase}
                pinnedLeft={pinnedLeft(index)}
                currentWidth={columnWidths?.[column.key]}
                onResize={
                  onColumnWidthsChange
                    ? (next) => onColumnWidthsChange({ ...columnWidths, [column.key]: next })
                    : undefined
                }
                reorder={reorderFor(column)}
                onPointerDown={headerPointerDown?.(column)}
              />
            ))}

            {rowActions ? (
              <th scope="col" className={`border-b border-border-strong ${DENSITY_CELL[density]} ${headBase}`}>
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>

        <tbody>
          {loading && rows.length === 0
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <tr key={`skeleton-${index}`} className={DENSITY_ROW[density]}>
                  {selectable ? <td className={`border-b border-border ${DENSITY_CELL[density]}`} /> : null}
                  {shown.map((column) => (
                    <td key={column.key} className={`border-b border-border ${DENSITY_CELL[density]}`}>
                      <Skeleton variant="text" width={index % 2 === 0 ? '70%' : '45%'} />
                    </td>
                  ))}
                  {rowActions ? <td className={`border-b border-border ${DENSITY_CELL[density]}`} /> : null}
                </tr>
              ))
            : rows.map((row, rowIndex) => (
                <TableRow
                  key={rowKey(row)}
                  row={row}
                  rowIndex={rowIndex}
                  rowCount={rows.length}
                  rowKey={rowKey}
                  shown={shown}
                  density={density}
                  selectable={selectable}
                  selectedSet={selectedSet}
                  onToggleRow={onToggleRow}
                  pinFirstColumn={pinFirstColumn}
                  pinnedLeft={pinnedLeft}
                  onRowClick={onRowClick}
                  onRowContextMenu={onRowContextMenu}
                  isRowDisabled={isRowDisabled}
                  rowActions={rowActions}
                  rowNavigation={rowNavigation}
                  roving={roving}
                  edit={edit}
                />
              ))}
        </tbody>
      </table>

      {showEmpty ? <>{empty}</> : null}

      {reorderable ? (
        <>
          <DragLayer session={orderSession}>
            {(key) => (
              <div className="rounded-card border border-accent bg-surface-raised px-3 py-1.5 text-meta font-medium text-text">
                {labelOf(key)}
              </div>
            )}
          </DragLayer>
          {/* The keyboard route never goes through the drag session, so it
              needs its own live region — a column that moves in silence is a
              column a screen-reader user cannot move on purpose. */}
          <div role="status" aria-live="polite" className="sr-only">
            {reorderNote}
          </div>
        </>
      ) : null}
    </div>
  );
}

export type {
  DataTableDensity,
  DataTableEdit,
  DataTableEditorContext,
  DataTableColumn,
  DataTableProps,
} from './internal/tableContract';
