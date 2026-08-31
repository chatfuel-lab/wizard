import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  activationExceeded,
  autoScrollVelocity,
  layerOrigin,
  resolveTarget,
  MOUSE_ACTIVATION_PX,
  TOUCH_HOLD_MS,
  TOUCH_TOLERANCE_PX,
  type DropTarget,
  type Point,
} from '../lib/geometry/dragGeometry';
import { DURATION, EASING, prefersReducedMotion } from '../lib/interaction/motion';

export interface DragAnnouncement<T> {
  phase: 'start' | 'over' | 'drop' | 'cancel';
  data: T;
  sourceId: string;
  targetId: string | null;
}

export interface UseDragSessionOptions<T> {
  onDrop: (data: T, targetId: string, sourceId: string) => void;
  onDragStart?: (data: T, sourceId: string) => void;
  onDragOver?: (targetId: string | null) => void;
  onCancel?: (data: T, sourceId: string) => void;
  /** Container to auto-scroll while dragging near its edges. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Off to disable edge scrolling entirely. Default on when scrollRef is given. */
  autoScroll?: boolean;
  /** Text for the live region. Omit for the built-in wording. */
  getAnnouncement?: (event: DragAnnouncement<T>) => string;
  disabled?: boolean;
}

export interface DraggableProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  style: CSSProperties;
  'data-dragging': boolean | undefined;
}

export interface DropTargetProps {
  ref: (node: HTMLElement | null) => void;
  'data-over': boolean | undefined;
}

export interface DragSession<T> {
  draggableProps: (id: string, data: T) => DraggableProps;
  dropTargetProps: (id: string, options?: { disabled?: boolean }) => DropTargetProps;
  /** Attach to the drag layer element; the hook writes its transform directly. */
  layerRef: RefObject<HTMLDivElement | null>;
  activeId: string | null;
  activeData: T | null;
  /** Size the layer to this so the ghost matches the card it came from. */
  activeRect: DOMRect | null;
  overId: string | null;
  isDragging: boolean;
  cancel: () => void;
  announcement: string;
}

interface Registration {
  node: HTMLElement;
}

const defaultAnnouncement = <T>(event: DragAnnouncement<T>): string => {
  switch (event.phase) {
    case 'start':
      return 'Picked up. Drag to a column, or press Escape to cancel.';
    case 'over':
      return event.targetId === null ? 'Not over a drop target.' : `Over ${event.targetId}.`;
    case 'drop':
      return `Dropped on ${event.targetId}.`;
    case 'cancel':
      return 'Cancelled. Returned to the original position.';
  }
};

/**
 * Pointer-Events drag and drop.
 *
 * Hand-rolled rather than a library, for a reason specific to this API: the one
 * feature a DnD library sells you — sortable — cannot be persisted here. Board
 * order is fixed to `lastSalesStageUpdateTime` server-side, so there is no
 * within-column position to save. What is left is a handful of static drop
 * targets and one axis of hit testing.
 *
 * Pointer Events rather than HTML5 drag-and-drop because HTML5 DnD simply does
 * not fire on touch — which is why the board still ships a per-card <Select>.
 *
 * Three rules hold the performance and the feel together:
 *
 * 1. The layer's transform is written STRAIGHT TO THE DOM inside a rAF. Only
 *    `activeId` and `overId` cross the React boundary, and those change a
 *    handful of times per drag rather than once per pointermove.
 * 2. Target rects are measured once at activation, then re-measured while
 *    auto-scrolling — the scroll moves them out from under the pointer.
 * 3. Touch activates on a 180ms hold, and a non-passive `touchmove` listener
 *    then preventDefault()s the page scroll. Flipping `touch-action` at that
 *    point would be too late: the browser has already committed the gesture.
 */
export function useDragSession<T>(options: UseDragSessionOptions<T>): DragSession<T> {
  const {
    onDrop,
    onDragStart,
    onDragOver,
    onCancel,
    scrollRef,
    autoScroll = true,
    getAnnouncement = defaultAnnouncement,
    disabled = false,
  } = options;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<T | null>(null);
  const [activeRect, setActiveRect] = useState<DOMRect | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const layerRef = useRef<HTMLDivElement>(null);
  const registry = useRef(new Map<string, Registration>());
  const targets = useRef<DropTarget[]>([]);
  /* One stable ref callback per target id. Without this every `overId` change
   * would hand React a new function, and React answers a changed ref callback
   * by calling the old one with null — unregistering every column mid-drag.
   * Disabled state therefore lives in its own map, written during render and
   * read at measure time. */
  const targetRefs = useRef(new Map<string, (node: HTMLElement | null) => void>());
  const targetDisabled = useRef(new Map<string, boolean>());

  const pending = useRef<{
    id: string;
    data: T;
    node: HTMLElement;
    pointerId: number;
    start: Point;
    holdTimer: number;
  } | null>(null);
  const drag = useRef<{
    id: string;
    data: T;
    node: HTMLElement;
    pointerId: number;
    grab: Point;
    sourceRect: DOMRect;
  } | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const overRef = useRef<string | null>(null);
  const frame = useRef(0);

  const measureTargets = useCallback(() => {
    targets.current = [...registry.current.entries()].map(([id, registration]) => {
      const rect = registration.node.getBoundingClientRect();
      return {
        id,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        disabled: targetDisabled.current.get(id) ?? false,
      };
    });
  }, []);

  const announce = useCallback(
    (event: DragAnnouncement<T>) => setAnnouncement(getAnnouncement(event)),
    [getAnnouncement],
  );

  /** One rAF: move the layer, auto-scroll, re-hit-test. */
  const tick = useCallback(() => {
    frame.current = 0;
    const session = drag.current;
    if (!session) return;

    const origin = layerOrigin(pointer.current, session.grab);
    if (layerRef.current) {
      layerRef.current.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
    }

    if (autoScroll && scrollRef?.current) {
      const container = scrollRef.current;
      const box = container.getBoundingClientRect();
      const velocity = autoScrollVelocity(pointer.current, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });
      if (velocity.x !== 0 || velocity.y !== 0) {
        container.scrollLeft += velocity.x;
        container.scrollTop += velocity.y;
        /* The scroll just moved every target; anything cached is now a lie. */
        measureTargets();
        /* Keep scrolling while the pointer stays put in the edge band. */
        frame.current = requestAnimationFrame(tick);
      }
    }

    const next = resolveTarget(pointer.current, targets.current);
    if (next !== overRef.current) {
      overRef.current = next;
      setOverId(next);
      onDragOver?.(next);
      announce({ phase: 'over', data: session.data, sourceId: session.id, targetId: next });
    }
  }, [autoScroll, scrollRef, measureTargets, onDragOver, announce]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const clearPending = useCallback(() => {
    if (pending.current) window.clearTimeout(pending.current.holdTimer);
    pending.current = null;
  }, []);

  /** Fly the ghost back to where it was picked up, then let it unmount. */
  const flyBack = useCallback((sourceRect: DOMRect, from: Point) => {
    const node = layerRef.current;
    if (!node || prefersReducedMotion()) return Promise.resolve();
    return node
      .animate(
        [
          { transform: `translate3d(${from.x}px, ${from.y}px, 0)` },
          { transform: `translate3d(${sourceRect.x}px, ${sourceRect.y}px, 0)` },
        ],
        { duration: DURATION.slow, easing: EASING.standard },
      )
      .finished.catch(() => undefined);
  }, []);

  /**
   * On a successful drop the ghost fades where it was released rather than
   * flying to its destination: the server re-stamps the sort key, so the row's
   * final position is not knowable here. Animating the arrival is the board's
   * job (a FLIP over the real card), not the primitive's — a guessed
   * destination would be a lie that lands in the wrong place.
   */
  const settle = useCallback(() => {
    const node = layerRef.current;
    if (!node || prefersReducedMotion()) return Promise.resolve();
    return node
      .animate([{ opacity: 1 }, { opacity: 0, transform: `${node.style.transform} scale(0.96)` }], {
        duration: DURATION.fast,
        easing: EASING.exit,
        fill: 'forwards',
      })
      .finished.catch(() => undefined);
  }, []);

  const finish = useCallback(
    async (kind: 'drop' | 'cancel') => {
      const session = drag.current;
      if (!session) return;
      drag.current = null;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;

      const target = kind === 'drop' ? overRef.current : null;
      announce({
        phase: target === null ? 'cancel' : 'drop',
        data: session.data,
        sourceId: session.id,
        targetId: target,
      });

      if (kind === 'cancel' || target === null) {
        await flyBack(session.sourceRect, layerOrigin(pointer.current, session.grab));
        onCancel?.(session.data, session.id);
      } else {
        /* Fire first, animate second: the optimistic update should already be
         * on screen while the ghost is still fading out. */
        onDrop(session.data, target, session.id);
        await settle();
      }

      overRef.current = null;
      setOverId(null);
      setActiveId(null);
      setActiveData(null);
      setActiveRect(null);
    },
    [announce, flyBack, onCancel, onDrop, settle],
  );

  const begin = useCallback(
    (start: { id: string; data: T; node: HTMLElement; pointerId: number }, at: Point) => {
      clearPending();
      const sourceRect = start.node.getBoundingClientRect();
      drag.current = {
        ...start,
        grab: { x: at.x - sourceRect.x, y: at.y - sourceRect.y },
        sourceRect,
      };
      pointer.current = at;
      measureTargets();

      setActiveId(start.id);
      setActiveData(start.data);
      setActiveRect(sourceRect);
      onDragStart?.(start.data, start.id);
      announce({ phase: 'start', data: start.data, sourceId: start.id, targetId: null });
      schedule();
    },
    [clearPending, measureTargets, onDragStart, announce, schedule],
  );

  /* Window-level listeners rather than pointer capture on the source node:
   * capture is released the moment React re-renders the element that holds it,
   * which happens on the very first `data-dragging` flip. */
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const at = { x: event.clientX, y: event.clientY };

      if (drag.current) {
        if (event.pointerId !== drag.current.pointerId) return;
        pointer.current = at;
        schedule();
        return;
      }

      const waiting = pending.current;
      if (!waiting || event.pointerId !== waiting.pointerId) return;

      if (event.pointerType === 'touch') {
        /* Before the hold completes a touch drag is still a scroll; moving out
         * of tolerance means the user meant to scroll, so give up quietly. */
        if (activationExceeded(waiting.start, at, TOUCH_TOLERANCE_PX)) clearPending();
        /* Still within tolerance — keep the position current so the grab offset
         * is measured from where the finger actually is when the hold fires. */
        else pointer.current = at;
        return;
      }
      if (activationExceeded(waiting.start, at, MOUSE_ACTIVATION_PX)) {
        begin(waiting, at);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (drag.current && event.pointerId === drag.current.pointerId) {
        pointer.current = { x: event.clientX, y: event.clientY };
        void finish('drop');
        return;
      }
      clearPending();
    };

    const onPointerCancel = () => {
      if (drag.current) void finish('cancel');
      else clearPending();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault();
        void finish('cancel');
      }
    };

    /* Non-passive so it can actually stop the page scrolling. touch-action
     * cannot help here: by the time the hold completes the browser has already
     * decided the gesture is a scroll. */
    const onTouchMove = (event: TouchEvent) => {
      if (drag.current) event.preventDefault();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onPointerCancel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onPointerCancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [begin, clearPending, finish, schedule]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (pending.current) window.clearTimeout(pending.current.holdTimer);
    },
    [],
  );

  const draggableProps = useCallback(
    (id: string, data: T): DraggableProps => ({
      onPointerDown: (event) => {
        if (disabled || drag.current) return;
        /* Primary button only — a right-click must stay a context menu. */
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        const node = event.currentTarget;
        const start = { x: event.clientX, y: event.clientY };
        const base = { id, data, node, pointerId: event.pointerId };

        clearPending();
        pending.current = {
          ...base,
          start,
          holdTimer:
            event.pointerType === 'touch' ? window.setTimeout(() => begin(base, pointer.current), TOUCH_HOLD_MS) : 0,
        };
        pointer.current = start;
      },
      style: {
        /* `manipulation` before activation keeps the column scrollable; the
         * non-passive touchmove listener takes over once dragging starts. */
        touchAction: 'manipulation',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      },
      'data-dragging': activeId === id ? true : undefined,
    }),
    [activeId, begin, clearPending, disabled],
  );

  const dropTargetProps = useCallback(
    (id: string, targetOptions?: { disabled?: boolean }): DropTargetProps => {
      targetDisabled.current.set(id, targetOptions?.disabled ?? false);

      let ref = targetRefs.current.get(id);
      if (!ref) {
        ref = (node: HTMLElement | null) => {
          if (node) registry.current.set(id, { node });
          else registry.current.delete(id);
        };
        targetRefs.current.set(id, ref);
      }

      return { ref, 'data-over': overId === id ? true : undefined };
    },
    [overId],
  );

  return {
    draggableProps,
    dropTargetProps,
    layerRef,
    activeId,
    activeData,
    activeRect,
    overId,
    isDragging: activeId !== null,
    cancel: useCallback(() => void finish('cancel'), [finish]),
    announcement,
  };
}
