import {
  createContext,
  useContext,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import {
  IDENTITY_VIEWPORT,
  isRectVisible,
  type CanvasItem,
  type FitOptions,
  type Point,
  type Rect,
  type Size,
  type Viewport,
} from '../lib/geometry/viewport';
import type { Side } from '../lib/geometry/position';

/**
 * The canvas store, and the reason the canvas re-renders as little as it does.
 *
 * ## Why a store instead of state
 *
 * A pan is a continuous gesture: sixty viewport values a second. If the viewport
 * were React state on `Canvas`, every one of those would re-render `Canvas`, and
 * a context holding it would re-render every consumer — which is every node on
 * the screen. The canvas would then be doing per-frame reconciliation of the
 * exact subtrees that did not change, because a node in world coordinates does
 * not move when the viewport does. The parent it lives in moves.
 *
 * So the viewport lives here, in a plain mutable object with a subscription, and
 * the pan writes ONE transform to ONE element. Anything that genuinely needs the
 * live viewport — a minimap, a zoom readout — subscribes on purpose via
 * `useCanvasViewport()`. Nodes never do, so they never re-render on pan.
 *
 * This is Excalidraw's static-layer idea with the noun changed. Excalidraw
 * freezes its static layer by rasterising it to a `<canvas>` and re-drawing only
 * when the scene's nonce changes. We cannot rasterise: our nodes are real DOM —
 * focusable buttons, error badges, themed cards, selectable text — and a bitmap
 * throws away accessibility, hit testing and theming, which is most of what the
 * design system is for. What ports is the SEPARATION, not the medium: one layer
 * that changes when the graph changes, one that changes at the frequency of the
 * pointer, and a hard rule that the second may never touch the first.
 *
 * ## What the store holds
 *
 * - the viewport, and the container's size
 * - every node's world rect, and the DOM element it is drawn by
 * - every handle's offset from its node's origin, so a moving node carries its
 *   handles without anyone recomputing them
 * - a live drag offset per node, which is how a node is moved during a drag
 *   without a React render — and how a group drag moves nodes that are not the
 *   one under the pointer
 * - visibility, subscribable per node id, so scrolling a node into view wakes
 *   that node and nothing else
 */

export interface CanvasNodeEntry {
  id: string;
  /** World rect, including any live drag offset. */
  rect: Rect;
  element: HTMLElement;
}

export interface CanvasHandleEntry {
  /** `nodeId` for a handle-less node pip, `nodeId::handleId` otherwise. */
  key: string;
  nodeId: string;
  handleId: string | null;
  side: Side;
  type: 'source' | 'target';
  /** Offset from the node's origin, in world units. */
  offset: Point;
}

/**
 * What layer 2 is drawing right now.
 *
 * In the store rather than behind an imperative handle on the overlay
 * component, which is what it was first. The handle worked in principle and was
 * the wrong shape in practice: it added an attachment step — a ref that has to
 * be populated before the first gesture — to a channel that already existed and
 * needed none. Everything else transient about this canvas (the viewport, the
 * geometry version, per-node visibility) is a store subscription; this is too,
 * and there is now no state in which a marquee is being dragged and the thing
 * that draws it has not been wired up yet.
 */
export interface CanvasOverlayState {
  /** Marquee rect in WORLD coordinates. */
  marquee: Rect | null;
  /** In-flight connection, world-space SVG path data. */
  ghost: string | null;
  /** Alignment guides in world coordinates. */
  guides: readonly CanvasGuide[] | null;
}

export const EMPTY_OVERLAY: CanvasOverlayState = { marquee: null, ghost: null, guides: null };

export interface CanvasGuide {
  axis: 'x' | 'y';
  position: number;
  /** The span the line is drawn over, world units, on the other axis. */
  from: number;
  to: number;
}

/** A live displacement applied to a node without re-rendering it. */
export interface CanvasOffset {
  dx: number;
  dy: number;
}

const NO_OFFSET: CanvasOffset = { dx: 0, dy: 0 };

export interface CanvasStore {
  getViewport: () => Viewport;
  setViewport: (next: Viewport) => void;
  subscribeViewport: (listener: () => void) => () => void;

  getSize: () => Size;
  setSize: (size: Size) => void;

  registerNode: (id: string, element: HTMLElement) => () => void;
  setNodeRect: (id: string, rect: Rect) => void;
  getNode: (id: string) => CanvasNodeEntry | undefined;
  getNodes: () => readonly CanvasNodeEntry[];
  getItems: () => CanvasItem[];

  /** Move a node by writing its transform, with no React render at all. */
  setOffset: (id: string, offset: CanvasOffset) => void;
  getOffset: (id: string) => CanvasOffset;
  clearOffsets: () => void;

  /** Idempotent: re-measuring a handle that has not moved costs nothing. */
  setHandle: (entry: CanvasHandleEntry) => void;
  removeHandle: (key: string) => void;
  handleKey: (nodeId: string, handleId: string | null) => string;
  getHandles: () => readonly CanvasHandleEntry[];
  /** Where a handle is right now, in world coordinates. */
  handlePoint: (nodeId: string, handleId: string | null) => Point | null;
  handleSide: (nodeId: string, handleId: string | null) => Side | null;

  /**
   * Bumped whenever the graph's GEOMETRY changes — a node registered, measured,
   * moved, or a handle appeared. Edges subscribe to it; nothing else should.
   */
  getGeometryVersion: () => number;
  subscribeGeometry: (listener: () => void) => () => void;

  getOverlay: () => CanvasOverlayState;
  subscribeOverlay: (listener: () => void) => () => void;
  setMarquee: (rect: Rect | null) => void;
  setGhost: (path: string | null) => void;
  setGuides: (guides: readonly CanvasGuide[] | null) => void;

  isVisible: (id: string) => boolean;
  subscribeVisibility: (id: string, listener: () => void) => () => void;
  /** Recompute every node's visibility, waking only the ones that flipped. */
  refreshVisibility: () => void;
  setClip: (clip: { enabled: boolean; margin: number }) => void;
}

export function createCanvasStore(initial: Viewport): CanvasStore {
  let viewport = initial;
  let size: Size = { width: 0, height: 0 };
  let geometry = 0;
  let clip = { enabled: true, margin: 200 };

  let overlay = EMPTY_OVERLAY;

  const viewportListeners = new Set<() => void>();
  const overlayListeners = new Set<() => void>();
  const geometryListeners = new Set<() => void>();
  const visibilityListeners = new Map<string, Set<() => void>>();

  const nodes = new Map<string, CanvasNodeEntry>();
  const offsets = new Map<string, CanvasOffset>();
  const handles = new Map<string, CanvasHandleEntry>();
  const visible = new Set<string>();

  const emit = (listeners: Set<() => void>) => {
    for (const listener of listeners) listener();
  };

  const bumpGeometry = () => {
    geometry += 1;
    emit(geometryListeners);
  };

  /* Only the nodes whose answer CHANGED are notified. A pan across a large
     scene flips a handful of nodes per frame; waking all of them because the
     viewport moved would put us back where we started. */
  const refreshVisibility = () => {
    for (const [id, entry] of nodes) {
      /* An unmeasured node is never clipped. Clipping one is a deadlock: a node
         with no rect fails every visibility test, so it never renders, so its
         ResizeObserver never sees content, so it never gets a rect. */
      const unmeasured = entry.rect.width === 0 && entry.rect.height === 0;
      const next = !clip.enabled || unmeasured || isRectVisible(entry.rect, viewport, size, clip.margin);
      const was = visible.has(id);
      if (next === was) continue;
      if (next) visible.add(id);
      else visible.delete(id);
      const listeners = visibilityListeners.get(id);
      if (listeners) emit(listeners);
    }
  };

  const handleKey = (nodeId: string, handleId: string | null) =>
    handleId === null ? nodeId : `${nodeId}::${handleId}`;

  return {
    getViewport: () => viewport,
    setViewport: (next) => {
      if (next.x === viewport.x && next.y === viewport.y && next.zoom === viewport.zoom) return;
      viewport = next;
      refreshVisibility();
      emit(viewportListeners);
    },
    subscribeViewport: (listener) => {
      viewportListeners.add(listener);
      return () => viewportListeners.delete(listener);
    },

    getSize: () => size,
    setSize: (next) => {
      if (next.width === size.width && next.height === size.height) return;
      size = next;
      refreshVisibility();
      emit(viewportListeners);
    },

    registerNode: (id, element) => {
      nodes.set(id, { id, rect: { x: 0, y: 0, width: 0, height: 0 }, element });
      /* Optimistic: an unmeasured node is visible, so it gets one render in
         which to measure itself. Starting it hidden is a deadlock — a node with
         no rect can never be found visible, so it would never render, so it
         would never be measured. */
      visible.add(id);
      bumpGeometry();
      return () => {
        nodes.delete(id);
        offsets.delete(id);
        visible.delete(id);
        for (const key of [...handles.keys()]) {
          if (handles.get(key)?.nodeId === id) handles.delete(key);
        }
        bumpGeometry();
      };
    },
    setNodeRect: (id, rect) => {
      const entry = nodes.get(id);
      if (!entry) return;
      if (
        entry.rect.x === rect.x &&
        entry.rect.y === rect.y &&
        entry.rect.width === rect.width &&
        entry.rect.height === rect.height
      ) {
        return;
      }
      entry.rect = rect;
      refreshVisibility();
      bumpGeometry();
    },
    getNode: (id) => nodes.get(id),
    getNodes: () => [...nodes.values()],
    getItems: () => [...nodes.values()].map((entry) => ({ id: entry.id, rect: entry.rect })),

    setOffset: (id, offset) => {
      const entry = nodes.get(id);
      if (!entry) return;
      const previous = offsets.get(id) ?? NO_OFFSET;
      if (previous.dx === offset.dx && previous.dy === offset.dy) return;
      offsets.set(id, offset);
      /* The rect follows the transform, because everything that reads a rect —
         edges, marquee hits, alignment guides, the minimap — has to see the node
         where it is on screen, not where the last render put it. */
      entry.rect = {
        x: entry.rect.x - previous.dx + offset.dx,
        y: entry.rect.y - previous.dy + offset.dy,
        width: entry.rect.width,
        height: entry.rect.height,
      };
      entry.element.style.transform = `translate(${entry.rect.x}px, ${entry.rect.y}px)`;
      bumpGeometry();
    },
    getOffset: (id) => offsets.get(id) ?? NO_OFFSET,
    /**
     * Drop every displacement, putting the rects and the transforms back where
     * they were before the drag.
     *
     * Actually putting them back, not just forgetting the numbers. Forgetting
     * leaves the rect displaced while the next render writes an undisplaced
     * transform, and the two disagree until something else moves the node —
     * which shows up as edges attached a drag's worth of distance away from the
     * block they belong to. When the caller does commit the new position, its
     * render lands in the same tick and overwrites all of this.
     */
    clearOffsets: () => {
      if (offsets.size === 0) return;
      for (const [id, offset] of offsets) {
        const entry = nodes.get(id);
        if (!entry) continue;
        entry.rect = {
          x: entry.rect.x - offset.dx,
          y: entry.rect.y - offset.dy,
          width: entry.rect.width,
          height: entry.rect.height,
        };
        entry.element.style.transform = `translate(${entry.rect.x}px, ${entry.rect.y}px)`;
      }
      offsets.clear();
      bumpGeometry();
    },

    setHandle: (entry) => {
      const previous = handles.get(entry.key);
      if (
        previous &&
        previous.offset.x === entry.offset.x &&
        previous.offset.y === entry.offset.y &&
        previous.side === entry.side &&
        previous.type === entry.type
      ) {
        return;
      }
      handles.set(entry.key, entry);
      bumpGeometry();
    },
    removeHandle: (key) => {
      if (!handles.delete(key)) return;
      bumpGeometry();
    },
    handleKey,
    getHandles: () => [...handles.values()],
    handlePoint: (nodeId, handleId) => {
      const node = nodes.get(nodeId);
      if (!node) return null;
      const handle = handles.get(handleKey(nodeId, handleId));
      /* A node with no handle registered under that id still has a position —
         its centre. Edges drawn before the pips have measured therefore start
         somewhere sane rather than at the world origin. */
      if (!handle) {
        return { x: node.rect.x + node.rect.width / 2, y: node.rect.y + node.rect.height / 2 };
      }
      return { x: node.rect.x + handle.offset.x, y: node.rect.y + handle.offset.y };
    },
    handleSide: (nodeId, handleId) => handles.get(handleKey(nodeId, handleId))?.side ?? null,

    getGeometryVersion: () => geometry,
    subscribeGeometry: (listener) => {
      geometryListeners.add(listener);
      return () => geometryListeners.delete(listener);
    },

    getOverlay: () => overlay,
    subscribeOverlay: (listener) => {
      overlayListeners.add(listener);
      return () => overlayListeners.delete(listener);
    },
    /* Each setter leaves early on null-to-null. Every gesture clears all three
       when it ends and again when its effect tears down, and an emit per clear
       is a render of the overlay per pointer-up for nothing. */
    setMarquee: (rect) => {
      if (overlay.marquee === null && rect === null) return;
      overlay = { ...overlay, marquee: rect };
      emit(overlayListeners);
    },
    setGhost: (path) => {
      if (overlay.ghost === null && path === null) return;
      if (overlay.ghost === path) return;
      overlay = { ...overlay, ghost: path };
      emit(overlayListeners);
    },
    setGuides: (guides) => {
      if (overlay.guides === null && guides === null) return;
      overlay = { ...overlay, guides };
      emit(overlayListeners);
    },

    isVisible: (id) => visible.has(id),
    subscribeVisibility: (id, listener) => {
      let listeners = visibilityListeners.get(id);
      if (!listeners) {
        listeners = new Set();
        visibilityListeners.set(id, listeners);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) visibilityListeners.delete(id);
      };
    },
    refreshVisibility,
    setClip: (next) => {
      clip = next;
      refreshVisibility();
    },
  };
}

/**
 * What a module drives the canvas with.
 *
 * Note what is NOT here: a way to make the viewport a controlled prop. That is
 * deliberate. A controlled viewport means a React render per frame of every pan,
 * which is the one cost this whole design exists to avoid, and a consumer that
 * asks for it does not want it — it wants "fit the view", "zoom in", or "where
 * did the user click, in world coordinates". Those are all here.
 */
export interface CanvasApi {
  getViewport: () => Viewport;
  setViewport: (next: Viewport) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number) => void;
  /** Frame the whole scene. With nothing measured yet, the identity viewport. */
  fitView: (options?: FitOptions) => void;
  /** Frame just these nodes — "zoom to selection". */
  fitNodes: (ids: readonly string[], options?: FitOptions) => void;
  screenToWorld: (point: Point) => Point;
  worldToScreen: (point: Point) => Point;
  /**
   * A `clientX`/`clientY` pair — from any event, anywhere on the page — in world
   * coordinates. The replacement for xyflow's `screenToFlowPosition`, and what a
   * menu rendered outside the canvas needs to place what it creates.
   */
  clientToWorld: (point: Point) => Point;
  /** Move nodes without a render — for dragging a multi-selection. */
  moveNodes: (ids: readonly string[], offset: CanvasOffset) => void;
  /** Node rects in world coordinates, for a caller doing its own hit testing. */
  getNodeRects: () => CanvasItem[];
  /**
   * The canvas element, as a ref rather than a getter.
   *
   * `useHotkeys({ rootRef })` wants exactly this shape, and that pairing is the
   * embed rule made mechanical: a module's canvas keys fire only while focus is
   * inside the canvas, so `Delete` pressed in the host application's own search
   * box stays the host's.
   */
  containerRef: RefObject<HTMLDivElement | null>;
}

interface CanvasContextValue {
  store: CanvasStore;
  api: CanvasApi;
  containerRef: RefObject<HTMLDivElement | null>;
  /**
   * The `<g>` the edge layer draws into, already carrying the viewport
   * transform. `CanvasEdges` arrives inside `children` — that is the API worth
   * keeping — but it has to paint UNDER the nodes, and the nodes are the
   * children. A portal is what reconciles those two.
   */
  edgeGroup: SVGGElement | null;
  connectionRadius: number;
  /** World-unit grid dragged nodes snap to. 0 is free movement. */
  snapGrid: number;
  /** Draw alignment guides while a node is dragged. */
  guides: boolean;
  /**
   * A node asks this FIRST on pointer down, before its own callbacks and
   * before it begins a drag. True means the canvas took the pointer — it was
   * a further finger during a marquee or a pan and is now the viewport's — and
   * the node must do nothing with the press: no drag, no hold, no click on the
   * lift. `lib/geometry/canvasGesture` is the table that decides.
   */
  claimPointer: (event: ReactPointerEvent<HTMLElement>) => boolean;
  onConnect?: (connection: CanvasConnection) => void;
  onConnectEnd?: (end: CanvasConnectEnd) => void;
}

export interface CanvasConnection {
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
}

/** A connection dragged from a handle and released on empty canvas. */
export interface CanvasConnectEnd {
  source: string;
  sourceHandle: string | null;
  /** Release point in world coordinates — where the new node should land. */
  position: Point;
  /** Release point in client coordinates — where a picker should open. */
  client: Point;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export { CanvasContext };
export type { CanvasContextValue };

function useCanvasContext(): CanvasContextValue {
  const value = useContext(CanvasContext);
  if (!value) throw new Error('Canvas components must be rendered inside a <Canvas>.');
  return value;
}

/** The imperative handle on the canvas this component is inside. */
export function useCanvas(): CanvasApi {
  return useCanvasContext().api;
}

/** The store. Canvas's own parts use it; a module rarely needs to. */
export function useCanvasStore(): CanvasStore {
  return useCanvasContext().store;
}

/** Everything the canvas's own children need, in one call. */
export function useCanvasInternals(): CanvasContextValue {
  return useCanvasContext();
}

/**
 * The live viewport, re-rendering the caller on every change.
 *
 * For chrome that has to follow the canvas: a zoom percentage, a minimap frame.
 * Not for nodes — a node is positioned in world coordinates and does not move
 * when the viewport does, so subscribing here would buy it sixty re-renders a
 * second in exchange for nothing.
 */
export function useCanvasViewport(): Viewport {
  const store = useCanvasStore();
  return useSyncExternalStore(store.subscribeViewport, store.getViewport, () => IDENTITY_VIEWPORT);
}

/** Bumped on any geometry change. What the edge layer redraws on. */
export function useCanvasGeometry(): number {
  const store = useCanvasStore();
  return useSyncExternalStore(store.subscribeGeometry, store.getGeometryVersion, () => 0);
}

/** Whether this node is inside the visible box. Wakes only when it flips. */
export function useCanvasVisible(id: string): boolean {
  const store = useCanvasStore();
  return useSyncExternalStore(
    (listener) => store.subscribeVisibility(id, listener),
    () => store.isVisible(id),
    () => true,
  );
}
