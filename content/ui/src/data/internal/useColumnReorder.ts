import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useDragSession, type DragAnnouncement, type DragSession } from '../../dnd/useDragSession';
import {
  applyVisibleOrder,
  columnReorderAction,
  nextReorderTarget,
  reorderMovableColumns,
  type SortState,
} from '../../lib/data/table';
import type { HeaderReorder } from './HeaderCell';
import { headerLabel, type DataTableColumn } from './tableContract';

export interface ColumnReorderApi<T> {
  session: DragSession<string>;
  reorderable: boolean;
  reorderNote: string;
  labelOf: (key: string) => string;
  onHeaderSort: ((sort: SortState | null) => void) | undefined;
  reorderFor: (column: DataTableColumn<T>) => HeaderReorder | undefined;
  headerPointerDown: ((column: DataTableColumn<T>) => (event: ReactPointerEvent<HTMLElement>) => void) | undefined;
}

/* ── column reorder ─────────────────────────────────────────────────── */

export function useColumnReorder<T>(options: {
  columns: DataTableColumn<T>[];
  shown: DataTableColumn<T>[];
  scrollRef: RefObject<HTMLDivElement | null>;
  onColumnOrderChange?: (keys: string[]) => void;
  onSortChange?: (sort: SortState | null) => void;
}): ColumnReorderApi<T> {
  const { columns, shown, scrollRef, onColumnOrderChange, onSortChange } = options;

  const reorderable = onColumnOrderChange !== undefined;
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [reorderNote, setReorderNote] = useState('');
  const grabOrigin = useRef<string[] | null>(null);
  /* A header is both a drag handle and a sort button. The 5px activation
   * threshold means a plain click still sorts — but the click the browser
   * fires at the END of a drag must not. */
  const draggedRef = useRef(false);

  /* Grip nodes, and the one whose focus a keyboard move has to give back.
   * Reordering re-orders the <th> elements, and React moves a keyed DOM node
   * by re-inserting it — which blurs whatever inside it had focus. Without
   * this the first arrow press drops the grip on the floor and the rest of the
   * move is typed at nothing. */
  const gripNodes = useRef(new Map<string, HTMLElement>());
  const gripRefs = useRef(new Map<string, (node: HTMLElement | null) => void>());
  const refocusGrip = useRef<string | null>(null);
  useLayoutEffect(() => {
    const key = refocusGrip.current;
    if (key === null) return;
    refocusGrip.current = null;
    gripNodes.current.get(key)?.focus();
  });

  /* One stable callback per key, for the same reason useDragSession keeps one:
   * a fresh ref callback each render makes React detach the old one, and a
   * grip that is momentarily unregistered is a grip the refocus above cannot
   * find. */
  const gripRefFor = (key: string) => {
    let ref = gripRefs.current.get(key);
    if (ref === undefined) {
      ref = (node: HTMLElement | null) => {
        if (node) gripNodes.current.set(key, node);
        else gripNodes.current.delete(key);
      };
      gripRefs.current.set(key, ref);
    }
    return ref;
  };

  const visibleKeys = shown.map((column) => column.key);
  const allKeys = columns.map((column) => column.key);
  const canMove = (column: DataTableColumn<T>) => reorderable && column.reorderable !== false;
  const movableKeys = shown.filter(canMove).map((column) => column.key);

  const emitOrder = (movedKey: string, targetKey: string) => {
    if (movedKey === targetKey) return;
    onColumnOrderChange?.(
      applyVisibleOrder(
        allKeys,
        /* Movable-slots, not a plain splice: a column that opted out of
         * reordering has to keep its index, and lifting another column past it
         * would otherwise shift it by one. See lib/data/table.ts. */
        reorderMovableColumns(visibleKeys, movableKeys, movedKey, targetKey),
      ),
    );
  };

  /* Latest-ref rather than an inline closure. useDragSession re-subscribes its
   * five window listeners whenever `onDrop` changes identity, and a table
   * re-renders on every keystroke of an inline edit. */
  const latestDrop = useRef<(moved: string, target: string) => void>(() => undefined);
  const labels = useRef(new Map<string, string>());
  useEffect(() => {
    latestDrop.current = emitOrder;
    labels.current = new Map(columns.map((column) => [column.key, headerLabel(column)]));
  });

  const labelOf = useCallback((key: string) => labels.current.get(key) ?? key, []);
  const onColumnDrop = useCallback((moved: string, target: string) => {
    latestDrop.current(moved, target);
  }, []);
  const onColumnDragStart = useCallback(() => {
    draggedRef.current = true;
  }, []);
  const announceDrag = useCallback(
    (event: DragAnnouncement<string>): string => {
      const moving = labelOf(event.data);
      switch (event.phase) {
        case 'start':
          return `Moving the ${moving} column. Drop it on another header, or press Escape to cancel.`;
        case 'over':
          return event.targetId === null
            ? `${moving} is not over a column.`
            : `${moving} over ${labelOf(event.targetId)}.`;
        case 'drop':
          return `${moving} moved to where ${labelOf(event.targetId ?? '')} was.`;
        case 'cancel':
          return `${moving} put back.`;
      }
    },
    [labelOf],
  );

  const orderSession = useDragSession<string>({
    disabled: !reorderable,
    scrollRef,
    onDrop: onColumnDrop,
    onDragStart: onColumnDragStart,
    getAnnouncement: announceDrag,
  });

  const onHeaderSort = onSortChange
    ? (next: SortState | null) => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        onSortChange(next);
      }
    : undefined;

  /* One wording for both routes. A grabbed column announces where it now is
   * on every step, and "position 2 of 4" is the only phrasing that survives
   * being read on its own — "moved right" tells a screen-reader user nothing
   * about where they ended up. */
  const place = (at: number) => `position ${at + 1} of ${visibleKeys.length}`;

  const onGripKeyDown = (column: DataTableColumn<T>) => (event: ReactKeyboardEvent<HTMLElement>) => {
    const action = columnReorderAction(event.key, grabbed === column.key);
    if (action.type === 'none') return;
    event.preventDefault();
    event.stopPropagation();

    const label = labelOf(column.key);
    const index = visibleKeys.indexOf(column.key);

    if (action.type === 'grab') {
      grabOrigin.current = allKeys;
      setGrabbed(column.key);
      setReorderNote(`${label} grabbed, ${place(index)}. Arrow keys move it, Enter drops it, Escape puts it back.`);
      return;
    }
    if (action.type === 'drop') {
      grabOrigin.current = null;
      setGrabbed(null);
      setReorderNote(`${label} dropped at ${place(index)}.`);
      return;
    }
    if (action.type === 'cancel') {
      const origin = grabOrigin.current;
      grabOrigin.current = null;
      setGrabbed(null);
      /* Escape restores the order the column was grabbed FROM, not the last
       * step — otherwise a five-step move needs five Escapes. */
      if (origin !== null) {
        refocusGrip.current = column.key;
        onColumnOrderChange?.(origin);
      }
      setReorderNote(`${label} put back.`);
      return;
    }

    /* The next column that may be DISPLACED, which is not always the next
     * column: one that opted out of reordering is stepped over, exactly as the
     * pointer route steps over it by never registering it as a drop target. */
    const target = nextReorderTarget(visibleKeys, movableKeys, column.key, action.delta);
    if (target === null) {
      setReorderNote(`${label} is already at ${place(index)}.`);
      return;
    }
    refocusGrip.current = column.key;
    emitOrder(column.key, target);
    setReorderNote(`${label} moved to ${place(visibleKeys.indexOf(target))}.`);
  };

  /* Losing the grip's focus ends the grab, because the arrows that drive it
   * are bound to the grip: a header left highlighted as picked up, that
   * nothing can move any more and Escape can no longer put back, is a lie the
   * next person has to click away. The move already made is kept — every step
   * was emitted as it happened, and Escape while the grip still has focus is
   * the way to undo it. */
  const onGripBlur = (column: DataTableColumn<T>) => () => {
    if (grabbed !== column.key || refocusGrip.current === column.key) return;
    grabOrigin.current = null;
    setGrabbed(null);
    setReorderNote(`${labelOf(column.key)} dropped at ${place(visibleKeys.indexOf(column.key))}.`);
  };

  /* Armed on EVERY header, movable or not. It is read by the click the browser
   * fires at the end of a drag, so it has to be re-armed by the next press
   * wherever that press lands — a column that opted out of reordering has no
   * drag handler of its own, and used to carry somebody else's finished drag
   * into its own first sort click and swallow it. */
  const headerPointerDown = reorderable
    ? (column: DataTableColumn<T>) => (event: ReactPointerEvent<HTMLElement>) => {
        draggedRef.current = false;
        if (canMove(column)) {
          orderSession.draggableProps(column.key, column.key).onPointerDown(event);
        }
      }
    : undefined;

  const reorderFor = (column: DataTableColumn<T>): HeaderReorder | undefined => {
    if (!canMove(column)) return undefined;
    return {
      style: orderSession.draggableProps(column.key, column.key).style,
      dropRef: orderSession.dropTargetProps(column.key).ref,
      dragging: orderSession.activeId === column.key,
      over: orderSession.overId === column.key && orderSession.activeId !== column.key,
      grabbed: grabbed === column.key,
      onGripKeyDown: onGripKeyDown(column),
      onGripBlur: onGripBlur(column),
      gripRef: gripRefFor(column.key),
    };
  };

  return {
    session: orderSession,
    reorderable,
    reorderNote,
    labelOf,
    onHeaderSort,
    reorderFor,
    headerPointerDown,
  };
}
