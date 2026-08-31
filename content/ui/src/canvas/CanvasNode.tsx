import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { type Point, type Rect } from '../lib/geometry/viewport';
import { LONG_PRESS_MS } from '../lib/geometry/dragGeometry';
import {
  beginDrag,
  dragActivated,
  dragTo,
  endDrag,
  fireHold,
  guideNeighbours,
  holdArms,
  pressRelease,
  type CanvasDragSession,
} from '../lib/geometry/nodeDrag';
import { rafThrottle } from '../lib/interaction/rafThrottle';
import { useCanvasInternals, useCanvasVisible, type CanvasGuide, type CanvasOffset } from './canvasContext';

/** How near an edge has to be to snap to it, in SCREEN pixels. */
const GUIDE_TOLERANCE_PX = 6;

export interface CanvasNodeProps {
  id: string;
  /** World position of the node's top-left corner. */
  x: number;
  y: number;
  children: ReactNode;
  selected?: boolean;
  draggable?: boolean;
  /** Stacking within the world layer. Selected nodes usually want to be above. */
  zIndex?: number;
  onDragStart?: (id: string) => void;
  /**
   * Every frame of the drag. `delta` is this node's total displacement since the
   * drag began, in world units — pass it to `api.moveNodes` to carry the rest of
   * a multi-selection along.
   */
  onDrag?: (id: string, position: Point, delta: CanvasOffset) => void;
  /**
   * The drag finished at this world position.
   *
   * Apply it SYNCHRONOUSLY — optimistically, before the server answers. The node
   * drops its local displacement in the same tick, so a position that only
   * arrives a round trip later leaves the node standing where it started for the
   * length of that round trip.
   */
  onDragEnd?: (id: string, position: Point) => void;
  /**
   * Which other nodes this one may align to while dragged. Default: all of
   * them.
   *
   * A group drag is where the default is wrong: the neighbours then include the
   * nodes moving WITH this one, and a member sharing an edge with the dragged
   * node raises a guide line that never goes away, because the two are moving
   * in lockstep and the alignment is always true. The consumer knows what the
   * group is; the canvas does not. `(id) => !selection.isSelected(id)` is the
   * usual answer.
   */
  guideAgainst?: (id: string) => boolean;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  /** A press that never became a drag, and was not a long-press. Where a multi-selection collapses. */
  onClick?: (event: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  /** A mouse's right button — and, without `onLongPress`, whatever the browser makes of a held finger. */
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, id: string) => void;
  /**
   * A finger or pen held still on the node for `LONG_PRESS_MS`. The touch
   * road to whatever `onContextMenu` is the mouse road to.
   *
   * Timed here rather than left to the browser's own `contextmenu` because
   * that event is unreliable on touch — Chrome on Android fires it, Safari on
   * iOS does not — and a menu that only some phones can open is not a menu.
   * A hold that moves past the drag threshold is a drag and never fires; a
   * hold that fires makes the lift that follows neither a click on the node
   * nor the native click the browser synthesises after it, so a menu the hold
   * opened is not immediately covered by the inspector the tap would have.
   * With this set, a `contextmenu` from a finger is swallowed — the two roads
   * would otherwise both arrive on Android — and a mouse's still reaches
   * `onContextMenu`. The event is the press that began the hold; its
   * `clientX`/`clientY` are where to anchor whatever opens.
   */
  onLongPress?: (event: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  className?: string;
}

/**
 * One node, positioned in world coordinates.
 *
 * It is content-sized: nothing here sets a width, the node is as big as what is
 * put inside it, and a `ResizeObserver` tells the store how big that turned out
 * to be. Everything downstream depends on that measurement — edges start at
 * handles measured against this box, the marquee tests against it, `fitView`
 * bounds it, and the alignment guides align to it.
 *
 * ## Dragging without rendering
 *
 * A drag writes this element's `transform` directly, once per frame, and React
 * is not told. That is the same rule the drag layer follows, for the same
 * reason: sixteen renders of a card per hundred milliseconds is sixteen renders
 * too many, and the position is not information anyone else needs until the drag
 * ends.
 *
 * Which is why the transform is NEVER a React style prop. A property written
 * imperatively must not also be declared: React diffs a style against its own
 * last render rather than against the DOM, so it skips writing a value it
 * already believes it wrote — and every imperative write in between survives.
 * One layout effect below owns the property and writes it unconditionally after
 * every render.
 *
 * The displacement lives in the store rather than in a local ref, which is what
 * makes a group drag possible: the node under the pointer sets its own, and the
 * consumer sets everyone else's through `api.moveNodes` with the same delta.
 * Both paths are the same path, so a multi-selection drags exactly the way a
 * single node does.
 *
 * A re-render mid-drag — the flow rebuilding from a server response, say —
 * cannot yank the node, because the rendered transform is composed from the prop
 * position PLUS the live displacement. The node under the pointer stays under
 * the pointer.
 *
 * ## Touch drags immediately, and holds for a menu
 *
 * Unlike the board's drag session, there is no hold delay. A hold delay exists
 * to let a finger scroll a list first; a canvas has no scroll to protect —
 * `touch-action: none` on the canvas already claimed the gesture — so waiting
 * 180ms would only make the canvas feel slow.
 *
 * A finger that stays put instead is a long-press (`onLongPress`), timed here
 * because the browser's own `contextmenu` on touch is a coin toss between
 * platforms. The two never fight: the drag threshold ends the hold, and the
 * hold firing ends the press's claim to be a click. `lib/geometry/nodeDrag` decides
 * all of that on the session; this file only owns the timer.
 *
 * None of it starts until the canvas has declined the press. A second finger
 * that lands on a card while the first is drawing a marquee is a pinch, not a
 * drag of that card; `claimPointer` on the canvas context says which, from
 * the same table a background press consults, and a claimed press gets no
 * session, no hold and no click.
 */
export function CanvasNode({
  id,
  x,
  y,
  children,
  selected = false,
  draggable = true,
  zIndex,
  onDragStart,
  onDrag,
  onDragEnd,
  guideAgainst,
  onPointerDown,
  onClick,
  onContextMenu,
  onLongPress,
  className,
}: CanvasNodeProps) {
  const { store, api, snapGrid, guides, claimPointer } = useCanvasInternals();
  const visible = useCanvasVisible(id);
  const nodeRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);

  const positionRef = useRef<Point>({ x, y });
  positionRef.current = { x, y };

  const dragRef = useRef<CanvasDragSession | null>(null);
  /* The hold timer for the press in `dragRef`, armed only for a finger or a
     pen and only when someone is listening. Cleared by a lift, a cancel, or
     the press becoming a drag. */
  const holdRef = useRef<{ pointerId: number; timer: number } | null>(null);
  /* A press the canvas claimed — a second finger during a marquee, now part of
     a pinch. There is no session for it, and a lift with no session would
     otherwise read as a click: the node under the pinching finger would open
     its inspector as the fingers came off. */
  const claimedRef = useRef<number | null>(null);

  /**
   * Everything the drag reads, in one ref, refreshed on every render.
   *
   * The window listeners below must be registered ONCE per node and never
   * re-registered, and that is not tidiness. They used to depend on the
   * callback props, which a consumer writes as inline arrows — so they were
   * fresh on every parent render, so the effect tore down and rebuilt on every
   * parent render, and its cleanup calls `moveDrag.cancel()`. A parent that
   * re-renders during a drag was therefore dropping animation frames out from
   * under the gesture, and the flow builder re-renders on pointer-down.
   *
   * The same shape `useCanvasSelection` uses for its `onChange`, for the same
   * reason: a callback that changes identity must not be allowed to change what
   * is subscribed.
   */
  const live = useRef({ onDrag, onDragEnd, onDragStart, onLongPress, guideAgainst, snapGrid, guides, api, draggable });
  live.current = { onDrag, onDragEnd, onDragStart, onLongPress, guideAgainst, snapGrid, guides, api, draggable };

  const disarmHold = useCallback(() => {
    if (!holdRef.current) return;
    window.clearTimeout(holdRef.current.timer);
    holdRef.current = null;
  }, []);
  useEffect(() => disarmHold, [disarmHold]);

  useEffect(() => {
    const element = nodeRef.current;
    if (!element) return;
    const release = store.registerNode(id, element);
    const observer = new ResizeObserver(() => {
      /* offsetWidth/Height, not getBoundingClientRect: the client rect is the
         box AFTER the world layer's scale, so it would have to be divided by a
         zoom read from the store — and the store's zoom is one frame ahead of
         the transform the browser has actually applied. Layout pixels have no
         such disagreement, and world units are layout pixels by construction. */
      sizeRef.current = { width: element.offsetWidth, height: element.offsetHeight };
      const offset = store.getOffset(id);
      store.setNodeRect(id, {
        x: positionRef.current.x + offset.dx,
        y: positionRef.current.y + offset.dy,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      release();
    };
  }, [id, store]);

  /* The prop position moved — a server response, an undo, a layout pass. The
     store's rect has to follow, or edges keep pointing at the old place. */
  useEffect(() => {
    const offset = store.getOffset(id);
    store.setNodeRect(id, {
      x: x + offset.dx,
      y: y + offset.dy,
      width: sizeRef.current.width,
      height: sizeRef.current.height,
    });
  }, [id, store, x, y]);

  /* Built once per node. Its deps are `id` and `store`, both stable for the
     node's lifetime, so the throttle it closes over — and the pending frame
     inside that throttle — survive every render of every ancestor. */
  const moveDrag = useMemo(
    () =>
      rafThrottle((client: Point) => {
        const session = dragRef.current;
        if (!session) return;
        const {
          api: liveApi,
          snapGrid: grid,
          guides: withGuides,
          guideAgainst: allowed,
          onDrag: notify,
        } = live.current;

        const size = sizeRef.current;
        const others = withGuides && size.width > 0 ? guideNeighbours(store.getNodes(), id, allowed) : null;

        const step = dragTo(session, liveApi.clientToWorld(client), {
          snapGrid: grid,
          neighbours: others,
          size,
          /* Screen pixels over zoom: a guide that grabs from six pixels away
             should keep grabbing from six pixels away when the canvas is zoomed
             out, not from six world units that are now half the screen. */
          tolerance: GUIDE_TOLERANCE_PX / (store.getViewport().zoom || 1),
        });

        if (others) {
          const moving: Rect = { x: step.target.x, y: step.target.y, ...size };
          store.setGuides(step.guides.map((guide) => spanGuide(guide.axis, guide.position, moving, others)));
        }

        store.setOffset(id, step.delta);
        notify?.(id, step.target, step.delta);
      }),
    [id, store],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const at = { x: event.clientX, y: event.clientY };
      if (!session.moved) {
        if (!dragActivated(session, at, event.pointerType)) return;
        /* A drag is not a hold. `fireHold` would refuse anyway; clearing the
           timer is so it does not fire into a session that has moved on. */
        disarmHold();
        /* A node that does not drag still holds — the session exists for the
           timer — but past the threshold there is nothing for it to become,
           so it simply ends. */
        if (!live.current.draggable) {
          dragRef.current = null;
          return;
        }
        session.moved = true;
        setDragging(true);
        live.current.onDragStart?.(id);
      }
      moveDrag(at);
    };

    const onPointerUp = (event: PointerEvent) => {
      const session = dragRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      dragRef.current = null;
      disarmHold();

      moveDrag.flush();
      store.setGuides(null);
      /* The SESSION's answer, not the store's.
         The store is written by the throttle above, so reading it here made the
         commit depend on whether the last animation frame happened to run — one
         dropped frame committed a stale position, and a drag whose frames were
         all dropped committed the ORIGIN, which is a block snapping back to
         where it started and staying there after a refetch. The session has
         known the right answer the whole time. */
      const final = endDrag(session);
      if (final === null) return; // never became a drag; nothing to commit
      /* Commit first, drop the displacement second, both inside one tick: React
         batches them into a single render in which the prop position has already
         become the final position and the displacement has already become zero.
         Either order alone flashes. */
      live.current.onDragEnd?.(id, final);
      store.clearOffsets();
      setDragging(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      moveDrag.cancel();
    };
    /* `id` and `store` only. Not the callbacks — those are read from `live` —
       and so this registers once and its cleanup, which cancels the pending
       frame, runs only when the node really goes away. */
  }, [id, moveDrag, store, disarmHold]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      /* Before anything else, including the consumer's own `onPointerDown`: a
         finger the canvas claims is a pinch, and a pinch must not select the
         card it happened to land on. */
      claimedRef.current = null;
      if (claimPointer(event)) {
        claimedRef.current = event.pointerId;
        return;
      }
      onPointerDown?.(event, id);
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      /* Anything that handles its own pointer — a handle, a button inside the
         card — opts out by saying so, rather than by the node guessing. */
      if ((event.target as HTMLElement).closest('[data-canvas-no-drag]')) return;
      /* A session even for a node that does not drag: the long-press timer
         needs one to ask "did this press move or lift" when it elapses. The
         move handler refuses to turn it into a drag. */
      if (!draggable && !live.current.onLongPress) return;

      const at = { x: event.clientX, y: event.clientY };
      const session = beginDrag({
        pointerId: event.pointerId,
        startClient: at,
        startWorld: api.clientToWorld(at),
        origin: { x, y },
      });
      dragRef.current = session;

      disarmHold();
      if (live.current.onLongPress && holdArms(event.pointerType)) {
        /* Read now: React clears `currentTarget` once the handler returns. */
        const doc = event.currentTarget.ownerDocument;
        holdRef.current = {
          pointerId: event.pointerId,
          timer: window.setTimeout(() => {
            holdRef.current = null;
            /* The press may have ended or become a drag since; the session
               says which, and a hold that fires marks it so the lift is not a
               click. */
            if (dragRef.current !== session || !fireHold(session)) return;
            swallowNextClick(doc);
            live.current.onLongPress?.(event, id);
          }, LONG_PRESS_MS),
        };
      }
    },
    [api, claimPointer, disarmHold, draggable, id, onPointerDown, x, y],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (claimedRef.current === event.pointerId) {
        claimedRef.current = null;
        return;
      }
      const session = dragRef.current;
      if (session && pressRelease(session) !== 'click') return;
      onClick?.(event, id);
    },
    [id, onClick],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      /* A hold is armed or has fired for this press: it is a finger, and the
         long-press is its road. The browser's own long-press menu — Chrome on
         Android sends one — must neither open natively nor arrive here as a
         second copy of the same intent. */
      if (holdRef.current || dragRef.current?.held) {
        event.preventDefault();
        return;
      }
      onContextMenu?.(event, id);
    },
    [id, onContextMenu],
  );

  /**
   * The transform has ONE writer, and it is imperative.
   *
   * It used to be a React `style` prop, and that is a trap when the same
   * property is also written directly — which it is, once per frame, by the
   * drag. React diffs a style against ITS OWN last render, not against the DOM,
   * so a value it already believes it wrote is skipped. Both writers together
   * produce this, every time:
   *
   *   render during the drag → React's VDOM records `translate(250px, 333px)`
   *   pointer up             → `clearOffsets` writes `translate(100px, 100px)`
   *   commit render          → computes `translate(250px, 333px)`, sees no
   *                            change from its own last value, writes nothing
   *
   * and the node stays at the position `clearOffsets` put it, which is where the
   * drag STARTED. The server has the right position by then — a refetch showed
   * the block in its new place — so the picture and the data disagreed, which is
   * the worst of the available failures.
   *
   * A layout effect with no dependency array runs after every render and writes
   * unconditionally, before paint. React has no opinion about the property any
   * more, so there is nothing for it to skip.
   */
  useLayoutEffect(() => {
    const element = nodeRef.current;
    if (!element) return;
    const displacement = store.getOffset(id);
    element.style.transform = `translate(${x + displacement.dx}px, ${y + displacement.dy}px)`;
  });

  return (
    <div
      ref={nodeRef}
      data-canvas-node={id}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={onContextMenu || onLongPress ? handleContextMenu : undefined}
      style={{ zIndex: zIndex ?? (dragging ? 2 : selected ? 1 : undefined) }}
      className={`absolute left-0 top-0 ${className ?? ''}`}
    >
      {visible ? (
        children
      ) : (
        /* Clipped out. The box stays, at its last measured size, so the node's
           rect does not collapse to a point the moment it leaves the screen —
           which would make it invisible to `fitView` and to the marquee, and
           would put every edge that ends here at the same spot. */
        <div style={{ width: sizeRef.current.width, height: sizeRef.current.height }} />
      )}
    </div>
  );
}

/**
 * Eat the `click` the browser synthesises after the lift that ends a
 * long-press.
 *
 * A native long-press swallows its own click; a timed one has to do it by
 * hand, or the card's own click handler opens the inspector over the menu the
 * hold just opened. Capture phase on the document, so it runs before anything
 * on the card. One-shot: consumed by the click, or dropped by the next press
 * if no click ever came — a cancelled touch, say — so it can never eat a
 * click that belongs to a later, unrelated tap.
 */
function swallowNextClick(doc: Document): void {
  const off = () => {
    doc.removeEventListener('click', swallow, true);
    doc.removeEventListener('pointerdown', off, true);
  };
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    off();
  };
  doc.addEventListener('click', swallow, true);
  doc.addEventListener('pointerdown', off, true);
}

/**
 * How far to draw a guide line: across everything it actually aligns.
 *
 * A guide that spans the whole scene says "something over there lines up" and
 * makes the reader find it; one that stops at the two boxes it connects says
 * which two.
 */
function spanGuide(axis: 'x' | 'y', position: number, moving: Rect, others: readonly Rect[]): CanvasGuide {
  const cross = (rect: Rect) =>
    axis === 'x' ? { from: rect.y, to: rect.y + rect.height } : { from: rect.x, to: rect.x + rect.width };
  const touches = (rect: Rect) => {
    const start = axis === 'x' ? rect.x : rect.y;
    const extent = axis === 'x' ? rect.width : rect.height;
    return (
      Math.abs(start - position) < 0.5 ||
      Math.abs(start + extent / 2 - position) < 0.5 ||
      Math.abs(start + extent - position) < 0.5
    );
  };

  let { from, to } = cross(moving);
  for (const rect of others) {
    if (!touches(rect)) continue;
    const span = cross(rect);
    from = Math.min(from, span.from);
    to = Math.max(to, span.to);
  }
  return { axis, position, from, to };
}
