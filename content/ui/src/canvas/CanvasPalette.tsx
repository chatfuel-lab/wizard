import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Island } from '../layout/Island';
import { Input } from '../primitives/Input';
import { Portal } from '../overlay/Portal';
import { IconSearch } from '../icons';
import { filterItems, highlightRanges, type TextRange } from '../lib/data/filter';
import { useRovingFocus } from '../hooks/useRovingFocus';
import {
  activationExceeded,
  MOUSE_ACTIVATION_PX,
  TOUCH_HOLD_MS,
  TOUCH_TOLERANCE_PX,
  type Point,
} from '../lib/geometry/dragGeometry';
import { rafThrottle } from '../lib/interaction/rafThrottle';

export interface CanvasPaletteItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** Section header. Items keep the order they were given within a group. */
  group?: string;
  /** Extra words the search should match — a platform name, a synonym. */
  keywords?: readonly string[];
  /** A short right-aligned note: "entry point", a shortcut, a platform. */
  note?: string;
  disabled?: boolean;
}

export interface CanvasPaletteProps {
  items: readonly CanvasPaletteItem[];
  /**
   * An item dragged out and released over the canvas. `client` is where the
   * pointer let go; the caller turns it into a world position with
   * `api.clientToWorld`.
   *
   * This is the primary way to add something, because dragging says WHERE in
   * the same gesture that says WHAT. It fires only for a release over canvas
   * background — a drop back onto the palette, onto a toolbar, or outside the
   * canvas entirely is a cancelled drag, not an insert at a nonsense position.
   */
  onDrop?: (id: string, client: Point) => void;
  /**
   * The armed item, or null. The keyboard's way in, and the fallback for a
   * click that never became a drag.
   *
   * Kept alongside the drag rather than replaced by it: a drag is not reachable
   * from a keyboard at all, and a palette that can only be used with a pointer
   * is a palette that locks some people out of creating anything. Armed means
   * "the next click on the canvas puts this there", which the canvas can also
   * offer to a keyboard as "press Enter to place at the centre".
   */
  value?: string | null;
  onChange?: (id: string | null) => void;
  searchable?: boolean;
  placeholder?: string;
  /** Height of the scrolling list, px. The island itself does not scroll. */
  maxHeight?: number;
  emptyLabel?: string;
  className?: string;
  'aria-label'?: string;
}

interface Row {
  kind: 'group' | 'item';
  key: string;
  label: string;
  item?: CanvasPaletteItem;
  ranges?: readonly TextRange[];
}

/**
 * The insert palette — what a canvas can have put on it.
 *
 * Excalidraw's tool strip is a row of glyphs because its tools are shapes and a
 * rectangle icon means rectangle in every language. Ours are twenty-six block
 * families across five platforms, and "WhatsApp text + buttons" is not a glyph.
 * So the shape that ports is the *island*, always visible, next to the canvas —
 * and the contents become a searchable grouped list, because that is what a
 * list of twenty-six named things wants to be.
 *
 * Three things it does that a `<Select>` in a header cannot:
 *
 * 1. **It is next to where the thing lands.** A picker four hundred pixels from
 *    the drop point is a picker that has to guess the drop point.
 * 2. **It is searchable.** Twenty-six families in one popup list is a scroll and
 *    a squint; "wa but" is two keystrokes.
 * 3. **It stays open.** Adding three blocks is three clicks, not three
 *    open-scroll-pick cycles.
 *
 * Groups are section headers when the list is unfiltered, and disappear when it
 * is: a search result is ranked by relevance, so grouping it would put the best
 * match under a heading halfway down.
 */
function GhostBody({ item }: { item: CanvasPaletteItem }) {
  const Icon = item.icon;
  return (
    <span className="flex items-center gap-2 rounded-control border border-border bg-surface-overlay px-2 py-1.5 text-label text-text shadow-drag">
      <Icon size={14} />
      {item.label}
    </span>
  );
}

export function CanvasPalette({
  items,
  onDrop,
  value = null,
  onChange,
  searchable = true,
  placeholder = 'Search blocks',
  maxHeight = 320,
  emptyLabel = 'Nothing matches',
  className,
  'aria-label': ariaLabel = 'Blocks',
}: CanvasPaletteProps) {
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo<Row[]>(() => {
    const trimmed = query.trim();

    if (trimmed !== '') {
      return filterItems(items, trimmed, (item) => [item.label, ...(item.keywords ?? [])]).map((result) => ({
        kind: 'item' as const,
        key: result.item.id,
        label: result.item.label,
        item: result.item,
        /* Only highlight when the label itself matched — ranges index into
             whichever text scored best, and painting label ranges taken from a
             keyword underlines the wrong letters. */
        ranges: result.index === 0 ? result.ranges : [],
      }));
    }

    const out: Row[] = [];
    let current: string | undefined;
    for (const item of items) {
      if (item.group !== current) {
        current = item.group;
        if (current) out.push({ kind: 'group', key: `group:${current}`, label: current });
      }
      out.push({ kind: 'item', key: item.id, label: item.label, item });
    }
    return out;
  }, [items, query]);

  const itemRows = useMemo(() => rows.filter((row) => row.kind === 'item'), [rows]);
  const disabledIndexes = useMemo(
    () =>
      itemRows.reduce<number[]>((acc, row, index) => {
        if (row.item?.disabled) acc.push(index);
        return acc;
      }, []),
    [itemRows],
  );

  const roving = useRovingFocus(itemRows.length, {
    orientation: 'vertical',
    disabled: disabledIndexes,
    labels: itemRows.map((row) => row.label),
  });

  /* ── dragging an item out ───────────────────────────────────────────── */
  const [dragging, setDragging] = useState<CanvasPaletteItem | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    item: CanvasPaletteItem;
    start: Point;
    holdTimer: number;
    active: boolean;
  } | null>(null);

  const moveGhost = useMemo(
    () =>
      rafThrottle((at: Point) => {
        const ghost = ghostRef.current;
        if (ghost) ghost.style.transform = `translate3d(${at.x + 12}px, ${at.y + 12}px, 0)`;
      }),
    [],
  );

  const endDrag = useCallback(() => {
    if (dragRef.current) window.clearTimeout(dragRef.current.holdTimer);
    dragRef.current = null;
    moveGhost.cancel();
    setDragging(null);
  }, [moveGhost]);

  /**
   * Did the pointer let go over canvas background?
   *
   * Two questions, in this order, because the palette is itself inside the
   * canvas: the release has to be inside a canvas AND outside the chrome
   * floating over it. Dropping a block back onto the palette that produced it
   * is a cancelled drag, not an insert underneath the palette.
   */
  const droppedOnCanvas = useCallback((at: Point): boolean => {
    const element = document.elementFromPoint(at.x, at.y);
    if (!element) return false;
    return element.closest('[data-canvas-root]') !== null && element.closest('[data-canvas-chrome]') === null;
  }, []);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const at = { x: event.clientX, y: event.clientY };

      if (!drag.active) {
        if (event.pointerType === 'touch') {
          /* Before the hold completes a touch is still a scroll of the list.
             Moving out of tolerance means they meant to scroll, so give up. */
          if (activationExceeded(drag.start, at, TOUCH_TOLERANCE_PX)) endDrag();
          return;
        }
        if (!activationExceeded(drag.start, at, MOUSE_ACTIVATION_PX)) return;
        drag.active = true;
        setDragging(drag.item);
      }
      moveGhost(at);
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const at = { x: event.clientX, y: event.clientY };
      const active = drag.active;
      endDrag();
      if (active && event.type === 'pointerup' && droppedOnCanvas(at)) onDrop?.(drag.item.id, at);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dragRef.current?.active) endDrag();
    };

    /* Non-passive: a touch drag out of the list must not also scroll it. */
    const onTouchMove = (event: TouchEvent) => {
      if (dragRef.current?.active) event.preventDefault();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [droppedOnCanvas, endDrag, moveGhost, onDrop]);

  useEffect(() => endDrag, [endDrag]);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, item: CanvasPaletteItem) => {
      if (!onDrop || item.disabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const start = { x: event.clientX, y: event.clientY };
      dragRef.current = {
        pointerId: event.pointerId,
        item,
        start,
        active: false,
        holdTimer:
          event.pointerType === 'touch'
            ? window.setTimeout(() => {
                if (!dragRef.current) return;
                dragRef.current.active = true;
                setDragging(item);
                moveGhost(start);
              }, TOUCH_HOLD_MS)
            : 0,
      };
    },
    [moveGhost, onDrop],
  );

  const pick = useCallback(
    (item: CanvasPaletteItem) => {
      if (item.disabled) return;
      /* Clicking the armed item again disarms it. Without that the only way out
         of "armed" is to place something, and a user who changed their mind has
         to place a block and delete it. */
      onChange?.(item.id === value ? null : item.id);
    },
    [onChange, value],
  );

  let itemIndex = -1;

  return (
    <Island padding="sm" orientation="vertical" className={className}>
      <div className="w-full space-y-1">
        {searchable ? (
          <div className="relative">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-field-sm pl-7 text-label"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  /* Escape empties the box first and disarms second — one
                     Escape should not undo two decisions at once. */
                  if (query !== '') setQuery('');
                  else onChange?.(null);
                  return;
                }
                if (event.key === 'Enter') {
                  const first = itemRows.find((row) => !row.item?.disabled);
                  if (first?.item) pick(first.item);
                  return;
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  roving.setActiveIndex(0);
                  listRef.current?.querySelector<HTMLElement>('[data-palette-item]')?.focus();
                }
              }}
            />
          </div>
        ) : null}

        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-orientation="vertical"
          onKeyDown={roving.onKeyDown}
          style={{ maxHeight }}
          className="select-none overflow-y-auto overscroll-contain"
        >
          {rows.length === 0 ? <p className="px-2 py-3 text-center text-micro text-text-faint">{emptyLabel}</p> : null}

          {rows.map((row) => {
            if (row.kind === 'group') {
              return (
                <div
                  key={row.key}
                  role="presentation"
                  className="px-2 pb-0.5 pt-2 text-nano font-semibold uppercase tracking-wide text-text-faint"
                >
                  {row.label}
                </div>
              );
            }

            const item = row.item!;
            const Icon = item.icon;
            const armed = item.id === value;
            itemIndex += 1;

            return (
              <button
                key={row.key}
                type="button"
                role="option"
                aria-selected={armed}
                data-palette-item
                disabled={item.disabled}
                onPointerDown={(event) => startDrag(event, item)}
                onClick={() => {
                  /* A click that turned into a drag has already been answered
                     by the drop; arming it as well would leave the palette
                     armed after every successful drag. */
                  if (dragRef.current?.active) return;
                  pick(item);
                }}
                {...roving.itemProps(itemIndex)}
                className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors focus-visible:focus-ring disabled:opacity-40 ${
                  armed ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-hover'
                } ${onDrop ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                <Icon size={14} />
                <span className="min-w-0 flex-1 truncate text-label">
                  {row.ranges && row.ranges.length > 0
                    ? highlightRanges(item.label, row.ranges).map((segment, at) =>
                        segment.match ? (
                          <mark key={`${row.key}:${at}`} className="bg-transparent font-semibold text-accent">
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={`${row.key}:${at}`}>{segment.text}</span>
                        ),
                      )
                    : item.label}
                </span>
                {item.note ? <span className="shrink-0 text-nano text-text-faint">{item.note}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {dragging ? (
        <Portal>
          {/* Portalled and pointer-events-none, so the ghost is never its own
              drop target and never blocks the hit test that decides where the
              block lands. Its transform is written straight to the DOM in a rAF
              — the position of a ghost is not information React needs. */}
          <div
            ref={ghostRef}
            aria-hidden
            style={{ position: 'fixed', left: 0, top: 0, willChange: 'transform' }}
            className="pointer-events-none z-drag font-sans"
          >
            <GhostBody item={dragging} />
          </div>
        </Portal>
      ) : null}
    </Island>
  );
}
