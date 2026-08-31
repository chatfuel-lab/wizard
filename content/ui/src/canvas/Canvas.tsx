import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  IDENTITY_VIEWPORT,
  marqueeHits,
  readyToFit,
  rectFromPoints,
  type FitInset,
  type Point,
  type Viewport,
} from '../lib/geometry/viewport';
import { activationExceeded, MOUSE_ACTIVATION_PX } from '../lib/geometry/dragGeometry';
import {
  backgroundPointerDown,
  backgroundPointerUp,
  IDLE_GESTURE,
  nodePointerDown,
  type BackgroundGesture,
} from '../lib/geometry/canvasGesture';
import { rafThrottle } from '../lib/interaction/rafThrottle';
import {
  CanvasContext,
  createCanvasStore,
  type CanvasApi,
  type CanvasConnectEnd,
  type CanvasConnection,
} from './canvasContext';
import { CanvasOverlay } from './internal/CanvasOverlay';
import { isChrome, useViewport, type WheelMode } from './useViewport';

export interface CanvasProps {
  /** `CanvasEdges` and `CanvasNode`s, in world coordinates. */
  children: ReactNode;
  /**
   * Toolbars, zoom controls, a minimap — anything that floats over the scene
   * in SCREEN coordinates.
   *
   * A separate slot rather than more `children`, and not optional guidance:
   * chrome put in `children` lands inside the transformed layer and pans and
   * zooms with the scene, and chrome put outside `<Canvas>` is outside the
   * provider, so `useCanvas()` throws. Both mistakes are easy and only one of
   * them is loud. This slot is the only position that is neither.
   */
  chrome?: ReactNode;
  /** Where the canvas starts. Not a controlled prop — see `CanvasApi`. */
  defaultViewport?: Viewport;
  /** Frame the scene once, as soon as anything has been measured. */
  fitOnMount?: boolean;
  /**
   * Screen pixels of the canvas that `chrome` covers, per side. The default
   * `inset` for `fitOnMount` and for every `fitView` / `fitNodes` that does not
   * name its own — the palette is over the scene when the zoom controls' fit
   * button is pressed just as much as at mount, and a fit that centres the flow
   * under the palette has framed the palette.
   */
  fitInset?: FitInset;
  minZoom?: number;
  maxZoom?: number;
  /** What a bare wheel does. Modifier + wheel always zooms. */
  wheel?: WheelMode;
  /** Dot grid spacing in world units. 0 draws no grid. */
  grid?: number;
  /** Snap dragged nodes to this world-unit grid. 0 is free movement. */
  snapGrid?: number;
  /** Show alignment guides while a node is dragged. */
  guides?: boolean;
  /** A background drag pans instead of drawing a marquee — the Pan tool. */
  panOnDrag?: boolean;
  /** How near a handle has to be dropped to snap onto it, screen px. */
  connectionRadius?: number;
  /** Skip rendering nodes outside the viewport. */
  clip?: boolean;
  /** Screen-pixel slack around the viewport before a node is dropped. */
  clipMargin?: number;
  onViewportChange?: (viewport: Viewport) => void;
  onBackgroundClick?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onBackgroundContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  /** A marquee finished. `additive` means it should extend the selection. */
  onMarquee?: (ids: string[], additive: boolean) => void;
  onConnect?: (connection: CanvasConnection) => void;
  onConnectEnd?: (end: CanvasConnectEnd) => void;
  ref?: Ref<CanvasApi>;
  className?: string;
  'aria-label'?: string;
}

/**
 * An infinite pan-and-zoom canvas.
 *
 * ## Two layers, and the rule between them
 *
 * Layer 1 is the world: the node DOM and the edge `<svg>`, both drawn in world
 * coordinates inside one transformed element. It re-renders when the GRAPH
 * changes — a node added, an edge rerouted — and at no other time. A pan does
 * not re-render it, because a pan does not move anything in world coordinates;
 * it moves the layer.
 *
 * Layer 2 is the overlay: the marquee, the connection in flight, the alignment
 * guides. It updates at the frequency of the pointer, and it may never re-render
 * layer 1. Its state is held below this component for exactly that reason.
 *
 * The idea is Excalidraw's, the medium is not: Excalidraw's static layer is a
 * rasterised `<canvas>` and ours is DOM, because our nodes are cards with
 * focusable buttons, error badges and a dark theme, and rasterising them throws
 * away accessibility, hit testing and theming — most of what the design system
 * is for.
 *
 * ## The viewport is not a prop
 *
 * `defaultViewport` sets where it starts; after that the viewport belongs to the
 * gesture. Making it controlled would mean a React render for every frame of
 * every pan, which is the cost this whole design exists to avoid. Drive it
 * through the `ref` instead — `fitView`, `zoomIn`, `setViewport`, and
 * `clientToWorld` for turning a click anywhere on the page into a world
 * position.
 *
 * ## Two slots, because there are two coordinate systems
 *
 * `children` is the world: nodes and edges, positioned in world units inside
 * the transformed layer. `chrome` is the screen: toolbars, zoom controls, a
 * minimap — all of which read the canvas through its context and none of which
 * may move when the scene moves.
 *
 * ## Not a container
 *
 * Do not put `@container` on a canvas or observe it with `useContainerBand`. A
 * detail panel that opens beside the canvas narrows it, which would flip the
 * band, which would close the panel, which would widen the canvas, forever. The
 * module root is the observed element; the canvas is inside it.
 */
export function Canvas({
  children,
  chrome,
  defaultViewport = IDENTITY_VIEWPORT,
  fitOnMount = false,
  fitInset,
  minZoom,
  maxZoom,
  wheel = 'zoom',
  grid = 24,
  snapGrid = 0,
  guides = false,
  panOnDrag = false,
  connectionRadius = 24,
  clip = true,
  clipMargin = 200,
  onViewportChange,
  onBackgroundClick,
  onBackgroundContextMenu,
  onMarquee,
  onConnect,
  onConnectEnd,
  ref,
  className,
  'aria-label': ariaLabel = 'Canvas',
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const overlayGroupRef = useRef<SVGGElement>(null);
  /* State, not a ref: `CanvasEdges` arrives inside `children` and portals into
     this group, and a portal target has to exist during render. */
  const [edgeGroup, setEdgeGroup] = useState<SVGGElement | null>(null);

  /* Created once. `defaultViewport` is read at that moment and never again —
     the store owns mutable scene state, and re-creating it because a caller
     passed a fresh object literal would throw every registration away. */
  const initialViewportRef = useRef(defaultViewport);
  const store = useMemo(() => createCanvasStore(initialViewportRef.current), []);

  /* Hoisted so the array identity is stable — it is a dependency of the rAF
     writer, and a fresh array every render would rebuild it every render. */
  const groupRefs = useMemo(() => [overlayGroupRef], []);

  const { api, beginPan, spaceHeldRef } = useViewport({
    containerRef,
    worldRef,
    groupRefs,
    edgeGroup,
    store,
    wheel,
    grid,
    minZoom,
    maxZoom,
    fitInset,
    onViewportChange,
  });

  useEffect(() => store.setClip({ enabled: clip, margin: clipMargin }), [store, clip, clipMargin]);

  useImperativeHandle(ref, () => api, [api]);

  /* The canvas's own size, which `fitView` divides by and clipping compares
     against. Its own box, not the module's — the inspector opening beside it
     narrows the canvas and nothing above it notices. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const box = container.getBoundingClientRect();
      store.setSize({ width: box.width, height: box.height });
    });
    observer.observe(container);
    const box = container.getBoundingClientRect();
    store.setSize({ width: box.width, height: box.height });
    return () => observer.disconnect();
  }, [store]);

  /* Fitting on mount cannot happen on mount: nodes are content-sized, so at
     first paint every rect is 0×0 and the fit would frame a point. Nor on the
     first measurement: each node's ResizeObserver reports on its own, and a
     fit taken when one node has a size and the rest are still points frames
     their POSITIONS — a 2-block flow "fit at 1:1" with the second block off
     the right edge. `readyToFit` waits for every registered node, which is a
     frame; then fit once, and never again — a later measurement must not
     yank a viewport the user has since panned. */
  const fittedRef = useRef(!fitOnMount);
  useEffect(() => {
    if (fittedRef.current) return undefined;
    const attempt = () => {
      if (fittedRef.current) return;
      if (!readyToFit(store.getItems())) return;
      fittedRef.current = true;
      api.fitView();
    };
    attempt();
    return store.subscribeGeometry(attempt);
  }, [store, api]);

  const marqueeRef = useRef<{
    pointerId: number;
    origin: Point;
    additive: boolean;
    /* Where the pointer is NOW, kept for the hand-off below: a second finger
       turns the marquee into a pinch, and the viewport must take this pointer
       from where it is, not from where it went down. */
    client: Point;
  } | null>(null);
  const pressRef = useRef<{ pointerId: number; client: Point; moved: boolean } | null>(null);
  /* Which gesture the background owns — marquee, viewport, or none — decided
     by `lib/geometry/canvasGesture` from pointer counts. It is what turns two fingers on
     the Select tool into a pinch instead of two marquees. */
  const gestureRef = useRef<BackgroundGesture>(IDLE_GESTURE);

  const drawMarquee = useMemo(
    () =>
      rafThrottle((client: Point) => {
        const session = marqueeRef.current;
        if (!session) return;
        store.setMarquee(rectFromPoints(session.origin, api.clientToWorld(client)));
      }),
    [api, store],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const press = pressRef.current;
      if (press && press.pointerId === event.pointerId && !press.moved) {
        const at = { x: event.clientX, y: event.clientY };
        if (activationExceeded(press.client, at, MOUSE_ACTIVATION_PX)) press.moved = true;
      }
      const marquee = marqueeRef.current;
      if (marquee?.pointerId !== event.pointerId) return;
      marquee.client = { x: event.clientX, y: event.clientY };
      drawMarquee(marquee.client);
    };

    const onPointerUp = (event: PointerEvent) => {
      gestureRef.current = backgroundPointerUp(gestureRef.current, event.pointerId);
      const session = marqueeRef.current;
      if (session && session.pointerId === event.pointerId) {
        marqueeRef.current = null;
        drawMarquee.cancel();
        store.setMarquee(null);
        const rect = rectFromPoints(session.origin, api.clientToWorld({ x: event.clientX, y: event.clientY }));
        /* A marquee that never grew is a click on the background, and it has
           already been reported as one. Reporting zero hits as well would clear
           the selection twice and, with `additive`, clear it wrongly. */
        if (rect.width > 0 || rect.height > 0) {
          onMarquee?.(marqueeHits(rect, store.getItems()), session.additive);
        }
      }
      pressRef.current = null;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      drawMarquee.cancel();
    };
  }, [api, drawMarquee, onMarquee, store]);

  /* The viewport half of a gesture step, shared by a press on the background
     and a press on a node — one road, so the two cannot drift apart. A marquee
     in progress that the step cancels simply goes: nothing is selected, a
     marquee that ends this way was never meant as one. Each pointer the step
     hands over goes to the viewport from its CURRENT position — the new one
     from the event, the one that was drawing the marquee from where the move
     handler above last saw it — so the scene does not jump by however far the
     box had already been dragged. */
  const handToViewport = useCallback(
    (step: { cancelMarquee: boolean; handToViewport: readonly number[] }, pointerId: number, client: Point) => {
      const marquee = marqueeRef.current;
      if (step.cancelMarquee) {
        marqueeRef.current = null;
        drawMarquee.cancel();
        store.setMarquee(null);
      }
      for (const id of step.handToViewport) {
        const at = id === pointerId ? client : id === marquee?.pointerId ? marquee.client : null;
        if (at) beginPan({ pointerId: id, clientX: at.x, clientY: at.y });
      }
    },
    [beginPan, drawMarquee, store],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      /* Only a press on the background. A press that landed on a node or an
         edge belongs to that node or edge, and it bubbles here afterwards. */
      if (event.target !== containerRef.current && event.target !== worldRef.current) return;

      const middle = event.pointerType === 'mouse' && event.button === 1;
      const primary = event.pointerType !== 'mouse' || event.button === 0;
      if (event.pointerType === 'mouse' && event.button === 2) return;
      if (!middle && !primary) return;

      const client = { x: event.clientX, y: event.clientY };
      const step = backgroundPointerDown(gestureRef.current, {
        pointerId: event.pointerId,
        pan: middle || spaceHeldRef.current || (panOnDrag && primary),
      });
      gestureRef.current = step.gesture;
      handToViewport(step, event.pointerId, client);

      /* One press, and it might be a click; that is decided on release. A
         second finger — one that cancelled a marquee, or joined a viewport
         gesture — is not one, though: two fingers are never one press, and a
         two-finger tap must not clear the selection. */
      const joined = step.gesture.kind === 'viewport' && step.gesture.pointerIds.length > 1;
      pressRef.current = joined ? null : { pointerId: event.pointerId, client, moved: false };
      if (!step.startMarquee) return;

      marqueeRef.current = {
        pointerId: event.pointerId,
        origin: api.clientToWorld(client),
        additive: event.shiftKey || event.metaKey,
        client,
      };
    },
    [api, handToViewport, panOnDrag, spaceHeldRef],
  );

  /* A node asks before it starts anything with a press. Claimed means the
     press was a further finger on the canvas — during a marquee or a pan — and
     has joined the viewport; the node must not drag with it or click on it. */
  const claimPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>): boolean => {
      const step = nodePointerDown(gestureRef.current, event.pointerId);
      if (!step.claimed) return false;
      gestureRef.current = step.gesture;
      handToViewport(step, event.pointerId, { x: event.clientX, y: event.clientY });
      /* The marquee's press cannot become a background click either. */
      pressRef.current = null;
      return true;
    },
    [handToViewport],
  );

  /* A click is a press that never moved. Reported on release rather than on
     press, so that starting a marquee — or a pan — is not also a click that
     clears the selection the marquee is about to make. */
  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const press = pressRef.current;
      if (!press || press.pointerId !== event.pointerId || press.moved) return;
      if (event.target !== containerRef.current && event.target !== worldRef.current) return;
      onBackgroundClick?.(event);
    },
    [onBackgroundClick],
  );

  const value = useMemo(
    () => ({
      store,
      api,
      containerRef,
      edgeGroup,
      connectionRadius,
      snapGrid,
      guides,
      claimPointer,
      onConnect,
      onConnectEnd,
    }),
    [store, api, edgeGroup, connectionRadius, snapGrid, guides, claimPointer, onConnect, onConnectEnd],
  );

  return (
    <div
      ref={containerRef}
      /* Marks the drop zone. `CanvasPalette` releases an item over the page and
         asks the DOM what is underneath: inside this, and outside the chrome
         floating on top of it, means the canvas. */
      data-canvas-root
      role="application"
      aria-label={ariaLabel}
      tabIndex={0}
      /* Capture, so it runs for a press anywhere inside — including one on a
         node or a handle, which stop propagation before the bubble phase gets
         here. A canvas that is not focused cannot receive Delete, ⌘A, or an
         arrow key, so "click the canvas, press Delete" quietly does nothing.
         `preventScroll` because focusing must not also scroll the page. */
      onPointerDownCapture={(event) => {
        if (isChrome(event.target)) return;
        containerRef.current?.focus({ preventScroll: true });
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={onBackgroundContextMenu}
      /* `touch-none` is not a nicety: without it the browser claims one-finger
         drags for page scrolling and two-finger ones for its own pinch, and the
         canvas never sees either. */
      className={`relative min-h-0 min-w-0 flex-1 touch-none select-none overflow-hidden outline-none focus-visible:focus-ring ${
        grid > 0 ? 'canvas-grid' : 'bg-canvas'
      }${className ? ` ${className}` : ''}`}
    >
      <CanvasContext.Provider value={value}>
        {/* Edges, UNDER the nodes. Full-size and in screen coordinates, with
            the viewport transform on the group inside — not a zero-sized svg
            leaning on `overflow: visible`, which is what this was and which
            never drew a single pixel: by the SVG specification a width or
            height of zero disables rendering of the element outright. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <g ref={setEdgeGroup} data-canvas-world />
        </svg>

        <div ref={worldRef} className="absolute left-0 top-0 origin-top-left will-change-transform">
          {children}
        </div>

        {/* The interaction layer, OVER the nodes. Two svgs rather than one
            because the nodes are DOM between them, and "edges below, marquee
            above" cannot be said any other way. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <g ref={overlayGroupRef} data-canvas-world>
            <CanvasOverlay />
          </g>
        </svg>

        {chrome ? (
          /* Screen space, not world space, and `pointer-events-none` so a press
             that misses an island still reaches the background — the islands
             themselves opt back in. The layer is inside the provider because
             every one of them reads the canvas; it is OUTSIDE the world div
             because chrome that panned and zoomed with the scene would not be
             chrome. */
          <div data-canvas-chrome className="pointer-events-none absolute inset-0">
            {chrome}
          </div>
        ) : null}
      </CanvasContext.Provider>
    </div>
  );
}
