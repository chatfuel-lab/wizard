import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  boundsOf,
  clampZoom,
  fitToBounds,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAt,
  ZOOM_STEP,
  type FitInset,
  type FitOptions,
  type Point,
  type Viewport,
} from '../lib/geometry/viewport';
import { rafThrottle } from '../lib/interaction/rafThrottle';
import type { CanvasApi, CanvasOffset, CanvasStore } from './canvasContext';

/** Firefox reports wheel deltas in lines; roughly one line of text. */
const LINE_HEIGHT_PX = 16;

/** How hard a trackpad pinch bites. Tuned against Chrome and Safari on a Mac. */
const PINCH_SENSITIVITY = 0.01;

export type WheelMode = 'zoom' | 'pan';

/** Did this event start inside the chrome layer rather than on the canvas? */
export function isChrome(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-canvas-chrome]') !== null;
}

export interface UseViewportOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  /** The transformed div the nodes are drawn inside. */
  worldRef: RefObject<HTMLDivElement | null>;
  /** SVG groups carrying the same transform — the edge and overlay layers. */
  groupRefs?: readonly RefObject<SVGGElement | null>[];
  /** The edge group, which lives in state because it is a portal target. */
  edgeGroup?: SVGGElement | null;
  store: CanvasStore;
  /** What a bare wheel does. Modifier + wheel always zooms, either way. */
  wheel?: WheelMode;
  /** Dot grid spacing in world units. 0 draws no grid. */
  grid?: number;
  minZoom?: number;
  maxZoom?: number;
  /** The inset every fit uses unless its own options name one. */
  fitInset?: FitInset;
  /** Notified after a gesture settles, not during it. */
  onViewportChange?: (viewport: Viewport) => void;
}

/** What `beginPan` needs from a pointer — an event has it, and so does a record of one. */
export interface PanPointer {
  pointerId: number;
  clientX: number;
  clientY: number;
}

export interface UseViewportResult {
  api: CanvasApi;
  /**
   * Give a pointer to the viewport: one pans, two pinch. Called with the
   * pointer's CURRENT position — for a pointer handed over mid-gesture that is
   * where it is now, not where it went down, or the scene jumps by the
   * difference on the first frame.
   */
  beginPan: (pointer: PanPointer) => boolean;
  /** True while the space bar is held — the cursor should say "grab". */
  spaceHeldRef: RefObject<boolean>;
}

/**
 * The viewport gestures, and the one element they write to.
 *
 * The whole of pan and zoom is a single `transform` on the world layer plus a
 * `background-position`/`background-size` on the container behind it. Both are
 * written straight to the DOM inside a rAF; React is not involved in a pan at
 * all. What crosses the React boundary is the store's subscription, and the only
 * things subscribed to it are the ones that genuinely follow the viewport.
 *
 * ## Wheel
 *
 * A bare wheel zooms by default, because that is what the flow editor this
 * replaces did and a swap that changes the feel is not a swap. `wheel="pan"`
 * gives the Figma/Excalidraw reading instead (wheel scrolls, shift+wheel
 * scrolls sideways), and either way **ctrl/⌘ + wheel always zooms** — that is
 * not a preference, it is the event a trackpad pinch actually sends. Every
 * browser reports a pinch as a wheel event with `ctrlKey: true` and no ctrl key
 * pressed, so the two cannot be told apart and must do the same thing.
 *
 * Safari additionally fires non-standard `gesturestart`/`gesturechange`
 * /`gestureend` with a cumulative `scale`, and it fires them INSTEAD of a
 * ctrl-wheel for a real trackpad pinch. Both paths are wired; on Safari the
 * gesture path wins and the wheel path never sees the pinch.
 *
 * ## Zoom anchoring
 *
 * Every zoom goes through `zoomAt` with the pointer as the anchor, so the thing
 * under the cursor stays under the cursor. Zooming toward the centre instead
 * makes the user chase their target across the screen; it reads as the canvas
 * fighting them, and it is the single most noticeable difference between a
 * canvas that feels right and one that does not.
 */
export function useViewport(options: UseViewportOptions): UseViewportResult {
  const {
    containerRef,
    worldRef,
    groupRefs,
    edgeGroup,
    store,
    wheel = 'zoom',
    grid = 0,
    minZoom,
    maxZoom,
    fitInset,
    onViewportChange,
  } = options;

  const spaceHeldRef = useRef(false);
  const pointersRef = useRef(new Map<number, Point>());
  const previousRef = useRef<{ count: number; midpoint: Point; distance: number } | null>(null);
  const gestureRef = useRef<{ zoom: number; anchor: Point } | null>(null);
  const changeRef = useRef(onViewportChange);
  changeRef.current = onViewportChange;

  const gridRef = useRef(grid);
  gridRef.current = grid;

  /* A ref, not a dependency of `api`: a caller writes `fitInset={{ left: 240 }}`
     inline, and an api rebuilt on every render would re-render every consumer
     of the canvas context on every render. Read at fit time instead. */
  const insetRef = useRef(fitInset);
  insetRef.current = fitInset;

  const clamp = useCallback(
    (zoom: number) => {
      const bounded = clampZoom(zoom);
      if (minZoom !== undefined && bounded < minZoom) return minZoom;
      if (maxZoom !== undefined && bounded > maxZoom) return maxZoom;
      return bounded;
    },
    [minZoom, maxZoom],
  );

  /* The refs and the state-held group, in one array the writer can iterate.
     `edgeGroup` cannot be a ref: `CanvasEdges` portals into it during render,
     so it has to exist as a value rather than as a mutable box. */
  const groups = useMemo(() => [...(groupRefs ?? [])], [groupRefs]);

  /**
   * The one place the DOM is written. Coalesced to one call per frame.
   *
   * Three elements now carry the viewport instead of one — the node div and the
   * two SVG groups — plus the grid on the container behind them. Still one
   * frame's work and still no React render; the groups take the SVG `transform`
   * ATTRIBUTE rather than a CSS transform, because CSS transforms on SVG
   * elements resolve their origin against `transform-box` and that is a
   * difference nobody should have to remember.
   */
  const draw = useMemo(
    () =>
      rafThrottle(() => {
        const viewport = store.getViewport();
        const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
        const world = worldRef.current;
        if (world) world.style.transform = transform;

        const svgTransform = `translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`;
        for (const ref of groups) ref.current?.setAttribute('transform', svgTransform);
        edgeGroup?.setAttribute('transform', svgTransform);

        const container = containerRef.current;
        if (container && gridRef.current > 0) {
          const spacing = gridRef.current * viewport.zoom;
          container.style.backgroundSize = `${spacing}px ${spacing}px`;
          container.style.backgroundPosition = `${viewport.x}px ${viewport.y}px`;
        }
      }),
    [store, worldRef, containerRef, groups, edgeGroup],
  );

  useEffect(() => () => draw.cancel(), [draw]);

  const settle = useMemo(() => rafThrottle(() => changeRef.current?.(store.getViewport())), [store]);

  const apply = useCallback(
    (next: Viewport) => {
      store.setViewport({ ...next, zoom: clamp(next.zoom) });
      draw();
      settle();
    },
    [store, clamp, draw, settle],
  );

  /** A client point relative to the container's top-left — our screen space. */
  const toLocal = useCallback(
    (point: Point): Point => {
      const box = containerRef.current?.getBoundingClientRect();
      return box ? { x: point.x - box.x, y: point.y - box.y } : point;
    },
    [containerRef],
  );

  const api = useMemo<CanvasApi>(() => {
    const zoomAtCentre = (zoom: number) => {
      const size = store.getSize();
      apply(zoomAt(store.getViewport(), { x: size.width / 2, y: size.height / 2 }, clamp(zoom)));
    };

    const fitRects = (
      rects: readonly { rect: { x: number; y: number; width: number; height: number } }[],
      fitOptions?: FitOptions,
    ) => {
      const bounds = boundsOf(rects.map((entry) => entry.rect));
      /* The canvas's inset is the default for EVERY fit, not only the first:
         the palette is over the scene when the zoom controls' fit button is
         pressed just as much as at mount. A call that names its own wins. */
      const inset = fitOptions?.inset ?? insetRef.current;
      apply(fitToBounds(bounds, store.getSize(), inset ? { ...fitOptions, inset } : fitOptions));
    };

    return {
      getViewport: store.getViewport,
      setViewport: apply,
      zoomIn: () => zoomAtCentre(store.getViewport().zoom * ZOOM_STEP),
      zoomOut: () => zoomAtCentre(store.getViewport().zoom / ZOOM_STEP),
      zoomTo: zoomAtCentre,
      fitView: (fitOptions) => fitRects(store.getNodes(), fitOptions),
      fitNodes: (ids, fitOptions) => {
        const wanted = new Set(ids);
        fitRects(
          store.getNodes().filter((entry) => wanted.has(entry.id)),
          fitOptions,
        );
      },
      screenToWorld: (point) => screenToWorld(point, store.getViewport()),
      worldToScreen: (point) => worldToScreen(point, store.getViewport()),
      clientToWorld: (point) => screenToWorld(toLocal(point), store.getViewport()),
      moveNodes: (ids, offset: CanvasOffset) => {
        for (const id of ids) store.setOffset(id, offset);
      },
      getNodeRects: store.getItems,
      containerRef,
    };
  }, [store, apply, clamp, toLocal, containerRef]);

  /* Non-passive, and attached by hand rather than through a JSX prop: React
     attaches wheel listeners passively, and a passive listener cannot
     preventDefault, so the page would zoom underneath the canvas. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (event: WheelEvent) => {
      /* A wheel over the chrome belongs to the chrome. Without this the
         container's preventDefault swallows it and a scrollable island — the
         block palette, a long menu, an inspector — cannot scroll at all, while
         the canvas zooms underneath it. */
      if (isChrome(event.target)) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? LINE_HEIGHT_PX : 1;
      const deltaX = event.deltaX * scale;
      const deltaY = event.deltaY * scale;
      const viewport = store.getViewport();

      if (event.ctrlKey || event.metaKey || wheel === 'zoom') {
        const anchor = toLocal({ x: event.clientX, y: event.clientY });
        /* Exponential in the delta, so a trackpad's many small events and a
           mouse's few large ones compose to the same total zoom. */
        apply(zoomAt(viewport, anchor, viewport.zoom * Math.exp(-deltaY * PINCH_SENSITIVITY)));
        return;
      }

      /* Shift+wheel is the browser's own "scroll sideways" on a wheel mouse;
         a trackpad already sends deltaX and needs no help. */
      if (event.shiftKey && deltaX === 0) apply(panBy(viewport, -deltaY, 0));
      else apply(panBy(viewport, -deltaX, -deltaY));
    };

    /* Safari only. `scale` is cumulative from the start of the gesture, so the
       zoom is computed against the zoom the gesture began at rather than
       multiplied frame by frame. */
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { clientX: number; clientY: number };
      gestureRef.current = {
        zoom: store.getViewport().zoom,
        anchor: toLocal({ x: gesture.clientX, y: gesture.clientY }),
      };
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as Event & { scale: number };
      const start = gestureRef.current;
      if (!start) return;
      apply(zoomAt(store.getViewport(), start.anchor, start.zoom * gesture.scale));
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureRef.current = null;
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('gesturestart', onGestureStart);
    container.addEventListener('gesturechange', onGestureChange);
    container.addEventListener('gestureend', onGestureEnd);
    return () => {
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('gesturestart', onGestureStart);
      container.removeEventListener('gesturechange', onGestureChange);
      container.removeEventListener('gestureend', onGestureEnd);
    };
  }, [containerRef, store, apply, toLocal, wheel]);

  /* Space to pan is a canvas convention old enough that its absence reads as a
     bug. Held on the window, because the canvas itself is rarely focused. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      spaceHeldRef.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spaceHeldRef.current = false;
    };
    const onBlur = () => {
      spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  /**
   * One pointer pans; two pinch.
   *
   * Both live in the same gesture because they are the same gesture — a finger
   * lifted mid-pinch has to become a pan without the canvas jumping, and a
   * second finger landing mid-pan has to become a pinch the same way. That only
   * works if the previous frame's reference (a point for a pan, a distance and
   * a midpoint for a pinch) is discarded whenever the pointer COUNT changes,
   * which is what `previous.count` is for. Without it, the frame the second
   * finger lands on measures a distance against nothing and the scene snaps.
   *
   * Touch never sends `wheel`, so this is the only pinch a phone or tablet
   * gets; the wheel and Safari-gesture paths above are trackpads only.
   */
  const applyGesture = useMemo(
    () =>
      rafThrottle(() => {
        const points = [...pointersRef.current.values()];
        const previous = previousRef.current;

        if (points.length === 1) {
          const [point] = points;
          if (previous?.count === 1) {
            apply(panBy(store.getViewport(), point.x - previous.midpoint.x, point.y - previous.midpoint.y));
          }
          previousRef.current = { count: 1, midpoint: point, distance: 0 };
          return;
        }

        if (points.length >= 2) {
          const [a, b] = points;
          const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (previous?.count === 2 && previous.distance > 0) {
            const anchor = toLocal(midpoint);
            const zoomed = zoomAt(
              store.getViewport(),
              anchor,
              store.getViewport().zoom * (distance / previous.distance),
            );
            apply(panBy(zoomed, midpoint.x - previous.midpoint.x, midpoint.y - previous.midpoint.y));
          }
          previousRef.current = { count: 2, midpoint, distance };
          return;
        }

        previousRef.current = null;
      }),
    [apply, store, toLocal],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      applyGesture();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!pointersRef.current.delete(event.pointerId)) return;
      applyGesture.cancel();
      previousRef.current = null;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      applyGesture.cancel();
    };
  }, [applyGesture]);

  const beginPan = useCallback((pointer: PanPointer): boolean => {
    pointersRef.current.set(pointer.pointerId, { x: pointer.clientX, y: pointer.clientY });
    /* The count changed, so the previous frame's reference is stale — see
       `applyGesture`. Cleared here as well as on lift so a pointer joining
       mid-pan does not measure the first pinch frame against a pan point. */
    previousRef.current = null;
    return true;
  }, []);

  /* The first paint has to carry the initial viewport too, or a canvas restored
     to a saved position renders once at the origin and jumps. */
  useEffect(() => {
    draw();
    draw.flush();
  }, [draw]);

  return { api, beginPan, spaceHeldRef };
}
