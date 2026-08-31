import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { IconGrip, IconSortAsc, IconSortDesc } from '../../icons';
import { clampColumnWidth, nextSortState, type SortState } from '../../lib/data/table';
import { DENSITY_CELL, headerLabel, type DataTableColumn, type DataTableDensity } from './tableContract';

export interface HeaderReorder {
  style: CSSProperties;
  dropRef: (node: HTMLElement | null) => void;
  gripRef: (node: HTMLElement | null) => void;
  dragging: boolean;
  over: boolean;
  grabbed: boolean;
  onGripKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onGripBlur: () => void;
}

interface HeaderCellProps<T> {
  column: DataTableColumn<T>;
  density: DataTableDensity;
  sort: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  headBase: string;
  pinnedLeft?: number;
  currentWidth?: number;
  onResize?: (width: number) => void;
  reorder?: HeaderReorder;
  /**
   * Header press. Given to every header while reordering is on — including the
   * ones that cannot move, which still have to re-arm the drag-versus-sort
   * guard. Absent entirely when the table does not reorder, so such a table
   * renders the handlers it always did.
   */
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
}

export function HeaderCell<T>({
  column,
  density,
  sort,
  onSortChange,
  headBase,
  pinnedLeft,
  currentWidth,
  onResize,
  reorder,
  onPointerDown: onHeaderPointerDown,
}: HeaderCellProps<T>) {
  const thRef = useRef<HTMLTableCellElement>(null);
  const [dragging, setDragging] = useState(false);
  const active = sort?.key === column.key ? sort : null;
  const sortable = column.sortable === true && onSortChange !== undefined;
  const resizable = column.resizable === true && onResize !== undefined;
  const headerText = headerLabel(column);

  /* One ref callback, not one per render. useDragSession hands out a STABLE
   * ref per target id precisely so a changed callback cannot unregister the
   * target mid-drag (React answers a new ref callback by calling the old one
   * with null); merging it with thRef inline would throw that away. */
  const dropRef = reorder?.dropRef;
  const setThRef = useCallback(
    (node: HTMLTableCellElement | null) => {
      thRef.current = node;
      dropRef?.(node);
    },
    [dropRef],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (!onResize) return;
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      setDragging(true);

      const startX = event.clientX;
      const startWidth = currentWidth ?? thRef.current?.offsetWidth ?? 0;
      let latest = startWidth;
      let frame = 0;

      const onMove = (move: PointerEvent) => {
        latest = clampColumnWidth(startWidth + (move.clientX - startX), column);
        if (frame) return;
        /* Written straight to the <col> inside a rAF. Routing every pointermove
         * through React state would re-render the entire table body. */
        frame = requestAnimationFrame(() => {
          frame = 0;
          const th = thRef.current;
          if (!th) return;
          const col = th.closest('table')?.querySelectorAll('col')[th.cellIndex];
          if (col instanceof HTMLTableColElement) col.style.width = `${latest}px`;
        });
      };

      const finish = () => {
        if (frame) cancelAnimationFrame(frame);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', finish);
        handle.removeEventListener('pointercancel', finish);
        setDragging(false);
        /* Commit once, at the end: the controlled value catches up with what
         * the DOM has been showing throughout the drag. */
        onResize(latest);
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', finish);
      handle.addEventListener('pointercancel', finish);
    },
    [column, currentWidth, onResize],
  );

  const label = sortable ? (
    <button
      type="button"
      onClick={() => onSortChange?.(nextSortState(sort, column.key))}
      className={`inline-flex max-w-full items-center gap-1 rounded-control text-xs font-medium transition-colors duration-fast ease-standard hover:text-text focus-visible:focus-ring ${
        active ? 'text-text' : ''
      }`}
    >
      <span className="truncate">{column.header}</span>
      {active ? (
        active.dir === 'asc' ? (
          <IconSortAsc size={12} className="shrink-0" />
        ) : (
          <IconSortDesc size={12} className="shrink-0" />
        )
      ) : (
        /* Reserves the arrow's space so the label does not jump on sort. */
        <IconSortAsc size={12} aria-hidden className="shrink-0 opacity-0" />
      )}
    </button>
  ) : (
    <span className="block truncate text-xs">{column.header}</span>
  );

  const headerStyle: CSSProperties | undefined =
    reorder === undefined && pinnedLeft === undefined
      ? undefined
      : { ...reorder?.style, ...(pinnedLeft === undefined ? undefined : { left: pinnedLeft }) };

  return (
    <th
      ref={setThRef}
      scope="col"
      aria-sort={active ? (active.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      style={headerStyle}
      onPointerDown={onHeaderPointerDown}
      className={`group/th relative select-none border-b border-border-strong font-medium text-text-muted ${
        DENSITY_CELL[density]
      } ${headBase} ${pinnedLeft === undefined ? '' : 'sticky'} ${
        column.align === 'end' ? 'text-right' : ''
      } ${reorder === undefined ? '' : reorder.dragging ? 'cursor-grabbing opacity-50' : 'cursor-grab'} ${
        reorder?.over === true || reorder?.grabbed === true ? 'bg-accent-soft' : ''
      }`}
    >
      {reorder === undefined ? (
        label
      ) : (
        /* The grip always occupies its space, at zero opacity until the header
           is hovered or it is focused. Revealing it by inserting it would shift
           every label sideways on hover, which reads as the table twitching. */
        <span className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            ref={reorder.gripRef}
            aria-pressed={reorder.grabbed}
            aria-label={
              reorder.grabbed
                ? `${headerText} grabbed. Arrow keys move it, Enter drops it, Escape puts it back.`
                : `Reorder ${headerText}`
            }
            onKeyDown={reorder.onGripKeyDown}
            onBlur={reorder.onGripBlur}
            className={`shrink-0 rounded-chip text-text-faint opacity-0 transition-opacity duration-fast ease-standard focus-visible:opacity-100 focus-visible:focus-ring group-hover/th:opacity-100 ${
              reorder.grabbed ? 'text-accent opacity-100' : ''
            }`}
          >
            <IconGrip size={12} />
          </button>
          {label}
        </span>
      )}

      {resizable ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${headerText}`}
          onPointerDown={onPointerDown}
          className={`absolute -right-1 top-0 z-sticky h-full w-2 cursor-col-resize touch-none after:absolute after:inset-y-1 after:left-1/2 after:w-px after:bg-border-strong after:opacity-0 after:transition-opacity after:duration-fast hover:after:opacity-100 ${
            dragging ? 'after:bg-accent after:opacity-100' : ''
          }`}
        />
      ) : null}
    </th>
  );
}
