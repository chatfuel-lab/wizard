import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  activationExceeded,
  autoScrollVelocity,
  MOUSE_ACTIVATION_PX,
  TOUCH_HOLD_MS,
  TOUCH_TOLERANCE_PX,
  type Point,
} from '../lib/geometry/dragGeometry';
import {
  beginGridDrag,
  endGridDrag,
  gridDragTo,
  gridKeyStep,
  type GridDragKind,
  type GridDragRules,
  type GridDragState,
  type GridPoint,
  type GridSpan,
} from '../lib/time/gridDrag';
import { formatDuration, timeRangeLabel } from '../lib/time/timeOfDay';

export type GridDragPhase = 'grab' | 'move' | 'drop' | 'cancel';

export interface GridDragAnnouncement {
  phase: GridDragPhase;
  state: GridDragState;
  via: 'pointer' | 'keyboard';
}

export interface UseGridDragSessionOptions {
  rules: GridDragRules;
  /**
   * Client point → grid position, unsnapped, or null when the point is not
   * over the grid at all. Called once per animation frame while dragging,
   * so it should read cached geometry — `onMeasure` is when to refresh it.
   */
  locate: (point: Point) => GridPoint | null;
  /** Called at activation and after every auto-scroll step: re-measure whatever `locate` reads. */
  onMeasure?: () => void;
  /** Container to auto-scroll while the pointer is near its edges. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Off to disable edge scrolling. Default on when scrollRef is given. */
  autoScroll?: boolean;
  /**
   * The span changed. Called INSIDE the animation frame for pointer drags
   * (write the preview's geometry straight to the DOM here — do not set
   * state) and synchronously for keyboard steps; called with null when the
   * session ends, so the preview can be hidden.
   */
  onPreview?: (state: GridDragState | null) => void;
  /** The release moved something. `state.current` is what to commit. */
  onCommit: (state: GridDragState) => void;
  onCancel?: (state: GridDragState) => void;
  /**
   * A press that never became a drag — a click, in other words. `id` is the
   * event pressed, or null for the empty grid; `at` is where, unsnapped.
   */
  onPress?: (id: string | null, at: GridPoint, event: PointerEvent) => void;
  /** Text for the live region. Omit for the built-in wording. */
  getAnnouncement?: (event: GridDragAnnouncement) => string;
  disabled?: boolean;
}

export interface GridEventProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  /** A grabbed block that loses focus drops the grab — nothing would receive the next arrow. */
  onBlur: () => void;
  style: CSSProperties;
  'data-dragging': true | undefined;
  /** Held by the keyboard — the block the arrows are moving. */
  'data-grabbed': true | undefined;
  'aria-describedby': string;
}

export interface GridResizeHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  style: CSSProperties;
}

export interface GridSurfaceProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  style: CSSProperties;
}

export interface GridDragSession {
  eventProps: (id: string, span: GridSpan, options?: { movable?: boolean; resizable?: boolean }) => GridEventProps;
  resizeHandleProps: (id: string, span: GridSpan, edge: 'start' | 'end') => GridResizeHandleProps;
  /** Spread onto the grid body: presses on empty cells become creates (or slot clicks). */
  surfaceProps: (options?: { create?: boolean }) => GridSurfaceProps;
  /** The session at grab time. Only begin and end cross React; the span itself flows through `onPreview`. */
  active: GridDragState | null;
  isDragging: boolean;
  cancel: () => void;
  announcement: string;
  /** Put this id on the visually-hidden hint that explains the keyboard model. */
  hintId: string;
}

interface Pending {
  kind: GridDragKind;
  id: string | null;
  span: GridSpan;
  at: GridPoint;
  pointerId: number;
  start: Point;
  holdTimer: number;
  /** False for a press on something that may not drag: it can only become a click. */
  activatable: boolean;
}

interface Session {
  state: GridDragState;
  via: 'pointer' | 'keyboard';
  pointerId: number | null;
}

const KEYBOARD_HELP =
  'Arrow keys move by one step, Shift by four; Left and Right change column; Alt with Up or Down resizes the end. Enter drops, Escape cancels.';

function defaultAnnouncement(event: GridDragAnnouncement): string {
  const { start, end } = event.state.current;
  const range = timeRangeLabel(start, end);
  const length = formatDuration(end - start);
  switch (event.phase) {
    case 'grab':
      return event.state.kind === 'create'
        ? `Creating from ${range}. ${KEYBOARD_HELP}`
        : `Grabbed ${range}. ${KEYBOARD_HELP}`;
    case 'move':
      return event.state.kind === 'move'
        ? `${range}, column ${event.state.current.column + 1}.`
        : `${range}, ${length}.`;
    case 'drop':
      return event.state.kind === 'create'
        ? `Created ${range}.`
        : `Dropped at ${range}, column ${event.state.current.column + 1}.`;
    case 'cancel':
      return 'Cancelled.';
  }
}

/**
 * Continuous drag on a time grid — move, resize, drag-to-create — as a
 * SIBLING of `useDragSession`, which stays untouched. That one is discrete
 * (a card lands on one of N targets); this one is continuous (a block lands
 * on any 15-minute line of any column), and forcing the two through one
 * hook would give both a worse API. They share the geometry file, the
 * activation rules and the touch model, and nothing else.
 *
 * What the hook owns: pointer events, the 5px / 180ms activation, the rAF
 * loop, auto-scroll, the keyboard grab, Escape/blur, the live region. What
 * it does NOT own: any decision about where the span goes — that is
 * `lib/time/gridDrag.ts`, tested — or any pixel: `locate` maps a client point to
 * (column, minute) and `onPreview` writes whatever the caller draws.
 *
 * Three rules, and the reasons:
 *
 * 1. **The span never crosses React per frame.** `onPreview` runs inside the
 *    animation frame and the caller writes `top`/`height`/`left` to a
 *    preview node directly. Only grab and release set state. A pointer at
 *    1000 Hz driving `setState` would re-render a grid of two hundred
 *    events a thousand times a second.
 * 2. **Commit from the session, never from the preview.** `onCommit` gets
 *    `state.current`, which every pointer move wrote synchronously; the DOM
 *    preview is one frame behind at best and absent at worst (canvas lesson,
 *    `lib/geometry/nodeDrag.ts`).
 * 3. **Keyboard handlers `preventDefault()`.** The module scopes its own
 *    hotkeys with `useHotkeys`, which stands down for a prevented event —
 *    so a grabbed block's arrow keys are the block's, not the calendar's
 *    "next event" binding. Escape during a pointer drag belongs to the
 *    session for the same reason.
 *
 * Touch: activation is a 180ms hold (`TOUCH_HOLD_MS`); a finger that moves
 * more than `TOUCH_TOLERANCE_PX` before the hold completes was scrolling and
 * the pending press is dropped. Once dragging, a non-passive `touchmove`
 * listener stops the page from scrolling — `touch-action` cannot help by
 * then, the browser has already classified the gesture.
 */
export function useGridDragSession(options: UseGridDragSessionOptions): GridDragSession {
  const {
    rules,
    locate,
    onMeasure,
    scrollRef,
    autoScroll = true,
    onPreview,
    onCommit,
    onCancel,
    onPress,
    getAnnouncement = defaultAnnouncement,
    disabled = false,
  } = options;

  const hintId = useId();
  const [live, setLive] = useState<{ state: GridDragState; via: 'pointer' | 'keyboard' } | null>(null);
  const active = live?.state ?? null;
  const [announcement, setAnnouncement] = useState('');

  /* Latest callbacks and rules in refs, so the window listeners below are
     attached once and never torn down mid-drag by a re-render. */
  const latest = useRef({
    rules,
    locate,
    onMeasure,
    onPreview,
    onCommit,
    onCancel,
    onPress,
    getAnnouncement,
    disabled,
  });
  latest.current = { rules, locate, onMeasure, onPreview, onCommit, onCancel, onPress, getAnnouncement, disabled };

  const pending = useRef<Pending | null>(null);
  const session = useRef<Session | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const frame = useRef(0);

  const announce = useCallback((phase: GridDragPhase, state: GridDragState, via: 'pointer' | 'keyboard') => {
    setAnnouncement(latest.current.getAnnouncement({ phase, state, via }));
  }, []);

  const clearPending = useCallback(() => {
    if (pending.current) window.clearTimeout(pending.current.holdTimer);
    pending.current = null;
  }, []);

  /** One frame: locate → step the machine → preview; auto-scroll and re-measure. */
  const tick = useCallback(() => {
    frame.current = 0;
    const current = session.current;
    if (!current || current.via !== 'pointer') return;
    const { locate: at, rules: currentRules, onPreview: preview, onMeasure: measure } = latest.current;

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
        /* The scroll moved the grid under a pointer that did not move. */
        measure?.();
        frame.current = requestAnimationFrame(tick);
      }
    }

    const point = at(pointer.current);
    if (!point) return;
    const next = gridDragTo(current.state, point, currentRules);
    if (next !== current.state) {
      current.state = next;
      preview?.(next);
    }
  }, [autoScroll, scrollRef]);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(tick);
  }, [tick]);

  const finish = useCallback(
    (kind: 'drop' | 'cancel') => {
      const current = session.current;
      if (!current) return;
      session.current = null;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;

      const {
        onCommit: commit,
        onCancel: cancelled,
        onPreview: preview,
        locate: at,
        rules: currentRules,
      } = latest.current;
      /* The last pointer position may still be waiting for a frame; step the
         machine once, synchronously, so the release commits where the pointer
         IS and not where it was sixteen milliseconds ago. */
      if (kind === 'drop' && current.via === 'pointer') {
        const point = at(pointer.current);
        if (point) current.state = gridDragTo(current.state, point, currentRules);
      }
      const span = kind === 'drop' ? endGridDrag(current.state) : null;
      preview?.(null);
      if (span) {
        announce('drop', current.state, current.via);
        /* Fire before clearing state, so the optimistic update is already
           rendering when the dragging flag comes off. */
        commit(current.state);
      } else {
        announce('cancel', current.state, current.via);
        cancelled?.(current.state);
      }
      setLive(null);
    },
    [announce],
  );

  const begin = useCallback(
    (waiting: Pending, at: Point) => {
      clearPending();
      const { rules: currentRules, onMeasure: measure, onPreview: preview } = latest.current;
      measure?.();
      /* The anchor is where the pointer went DOWN, not where activation
         happened five pixels later: a create's first slot is the pressed one,
         and a move's delta is measured from the grab. */
      const state = beginGridDrag({
        kind: waiting.kind,
        id: waiting.id,
        span: waiting.span,
        at: waiting.at,
        rules: currentRules,
      });
      session.current = { state, via: 'pointer', pointerId: waiting.pointerId };
      pointer.current = at;
      setLive({ state, via: 'pointer' });
      announce('grab', state, 'pointer');
      preview?.(state);
      schedule();
    },
    [announce, clearPending, schedule],
  );

  /* Window-level listeners rather than pointer capture on the source: capture
     is released the moment React re-renders the element holding it, which
     happens on the very first `data-dragging` flip. */
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const at = { x: event.clientX, y: event.clientY };
      const current = session.current;
      if (current) {
        if (current.via !== 'pointer' || event.pointerId !== current.pointerId) return;
        pointer.current = at;
        schedule();
        return;
      }
      const waiting = pending.current;
      if (!waiting || event.pointerId !== waiting.pointerId) return;
      if (event.pointerType === 'touch') {
        /* Before the hold completes a touch is still a scroll: leaving the
           tolerance means the user meant to scroll, so give up quietly. */
        if (activationExceeded(waiting.start, at, TOUCH_TOLERANCE_PX)) clearPending();
        else pointer.current = at;
        return;
      }
      if (waiting.activatable && activationExceeded(waiting.start, at, MOUSE_ACTIVATION_PX)) begin(waiting, at);
    };

    const onPointerUp = (event: PointerEvent) => {
      const current = session.current;
      if (current && current.via === 'pointer' && event.pointerId === current.pointerId) {
        pointer.current = { x: event.clientX, y: event.clientY };
        finish('drop');
        return;
      }
      const waiting = pending.current;
      if (waiting && event.pointerId === waiting.pointerId) {
        clearPending();
        latest.current.onPress?.(waiting.id, waiting.at, event);
        return;
      }
      clearPending();
    };

    const onPointerCancel = () => {
      const current = session.current;
      if (current && current.via === 'pointer') finish('cancel');
      else clearPending();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const current = session.current;
      if (current && current.via === 'pointer') {
        event.preventDefault();
        finish('cancel');
      }
    };

    /* Focus left the page — or the grabbed block. A keyboard grab whose
       element blurred has nothing to receive the next arrow key. */
    const onBlur = () => {
      if (session.current) finish('cancel');
      else clearPending();
    };

    /* Non-passive so it can actually stop the page scrolling. */
    const onTouchMove = (event: TouchEvent) => {
      if (session.current?.via === 'pointer') event.preventDefault();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onBlur);
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

  const press = useCallback(
    (
      event: ReactPointerEvent<HTMLElement>,
      kind: GridDragKind,
      id: string | null,
      span: GridSpan,
      activatable: boolean,
    ) => {
      if (session.current) return;
      /* Primary button only — a right-click must stay a context menu. */
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const start = { x: event.clientX, y: event.clientY };
      const at = latest.current.locate(start) ?? { column: span.column, minute: span.start };
      clearPending();
      const base = { kind, id, span, at, pointerId: event.pointerId, start, activatable };
      pending.current = {
        ...base,
        holdTimer:
          event.pointerType === 'touch' && activatable
            ? window.setTimeout(() => {
                const waiting = pending.current;
                if (waiting && waiting.pointerId === event.pointerId) begin(waiting, pointer.current);
              }, TOUCH_HOLD_MS)
            : 0,
      };
      pointer.current = start;
    },
    [begin, clearPending],
  );

  const keyboardGrab = useCallback(
    (id: string, span: GridSpan) => {
      const { rules: currentRules, onPreview: preview } = latest.current;
      const state = beginGridDrag({
        kind: 'move',
        id,
        span,
        at: { column: span.column, minute: span.start },
        rules: currentRules,
      });
      session.current = { state, via: 'keyboard', pointerId: null };
      setLive({ state, via: 'keyboard' });
      preview?.(state);
      announce('grab', state, 'keyboard');
    },
    [announce],
  );

  const eventProps = useCallback(
    (id: string, span: GridSpan, eventOptions?: { movable?: boolean; resizable?: boolean }): GridEventProps => {
      const movable = eventOptions?.movable ?? true;
      const grabbed = live !== null && live.via === 'keyboard' && live.state.id === id;
      return {
        onPointerDown: (event) => {
          if (latest.current.disabled) return;
          /* Stop the surface beneath from also arming a create. */
          event.stopPropagation();
          press(event, 'move', id, span, movable);
        },
        onKeyDown: (event) => {
          if (latest.current.disabled) return;
          const current = session.current;
          if (current && current.via === 'keyboard' && current.state.id === id) {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              finish('cancel');
              return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              finish('drop');
              return;
            }
            const next = gridKeyStep(current.state, event, latest.current.rules);
            if (next === null) return;
            event.preventDefault();
            event.stopPropagation();
            if (next !== current.state) {
              current.state = next;
              latest.current.onPreview?.(next);
              announce('move', next, 'keyboard');
            }
            return;
          }
          if (event.key === ' ' && movable && !current) {
            event.preventDefault();
            event.stopPropagation();
            keyboardGrab(id, span);
          }
        },
        onBlur: () => {
          const current = session.current;
          if (current && current.via === 'keyboard' && current.state.id === id) finish('cancel');
        },
        style: {
          /* `manipulation` before activation keeps the grid scrollable; the
             non-passive touchmove listener takes over once dragging starts. */
          touchAction: 'manipulation',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        },
        'data-dragging': live !== null && live.state.id === id ? true : undefined,
        'data-grabbed': grabbed ? true : undefined,
        'aria-describedby': hintId,
      };
    },
    [live, announce, finish, hintId, keyboardGrab, press],
  );

  const resizeHandleProps = useCallback(
    (id: string, span: GridSpan, edge: 'start' | 'end'): GridResizeHandleProps => ({
      onPointerDown: (event) => {
        if (latest.current.disabled) return;
        event.stopPropagation();
        press(event, edge === 'start' ? 'resize-start' : 'resize-end', id, span, true);
      },
      style: { touchAction: 'none', cursor: 'ns-resize' },
    }),
    [press],
  );

  const surfaceProps = useCallback(
    (surfaceOptions?: { create?: boolean }): GridSurfaceProps => ({
      onPointerDown: (event) => {
        if (latest.current.disabled) return;
        const at = latest.current.locate({ x: event.clientX, y: event.clientY });
        if (!at) return;
        press(
          event,
          'create',
          null,
          { column: at.column, start: at.minute, end: at.minute },
          surfaceOptions?.create ?? true,
        );
      },
      style: { touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' },
    }),
    [press],
  );

  return {
    eventProps,
    resizeHandleProps,
    surfaceProps,
    active,
    isDragging: active !== null,
    cancel: useCallback(() => finish('cancel'), [finish]),
    announcement,
    hintId,
  };
}
