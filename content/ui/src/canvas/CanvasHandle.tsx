import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { edgePolyline, roundedPath } from '../lib/geometry/edgePath';
import { rafThrottle } from '../lib/interaction/rafThrottle';
import type { Side } from '../lib/geometry/position';
import type { Point } from '../lib/geometry/viewport';
import { useCanvasInternals } from './canvasContext';

const OPPOSITE: Record<Side, Side> = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
};

export interface CanvasHandleProps {
  /** The node this handle belongs to. */
  nodeId: string;
  /**
   * Which handle on that node. `null` is the node's own handle — the one an
   * edge means when it names a block and nothing finer.
   */
  id?: string | null;
  /** Which way edges leave or arrive. Decides the route, not the position. */
  side?: Side;
  /**
   * Sources start connections; targets receive them.
   *
   * Strictly one-directional on purpose. Let a target start a drag and the
   * direction of the resulting connection is whatever the user happened to grab
   * first, which for a flow graph is a different edge entirely.
   */
  type?: 'source' | 'target';
  disabled?: boolean;
  /** Announced to screen readers. Defaults to the direction. */
  label?: string;
  className?: string;
}

/**
 * A connection pip.
 *
 * Positioned by the node's own layout, not by this component: a block's outlet
 * sits at the right of the element row it belongs to, and only the node knows
 * where that is. What this adds is the measurement — the pip's centre, as an
 * offset from its node's origin in world units — which is how the edge layer
 * knows where to start and end without asking the DOM per frame.
 *
 * Storing an OFFSET rather than a position is what makes a drag cheap. The node
 * moves, its rect moves, and every handle on it is already in the right place;
 * nothing re-measures, and the edge layer recomputes from two numbers.
 */
export function CanvasHandle({
  nodeId,
  id = null,
  side = 'right',
  type = 'source',
  disabled = false,
  label,
  className,
}: CanvasHandleProps) {
  const { store, api, connectionRadius, onConnect, onConnectEnd } = useCanvasInternals();
  const pipRef = useRef<HTMLSpanElement>(null);
  const [connecting, setConnecting] = useState(false);
  const key = store.handleKey(nodeId, id);

  /* Measured against the node, then divided by the zoom: both boxes come from
     `getBoundingClientRect`, which reports what is on screen, and the offset has
     to be in world units to survive the next zoom. */
  useEffect(() => {
    const pip = pipRef.current;
    if (!pip) return;

    const measure = () => {
      const node = store.getNode(nodeId)?.element;
      if (!node) return;
      const pipBox = pip.getBoundingClientRect();
      const nodeBox = node.getBoundingClientRect();
      /* The scale is derived from the node's own two measurements rather than
         read from the store: `nodeBox` is what the browser has actually painted
         and the store's zoom can be a frame ahead of it. Dividing one by the
         other cannot disagree with itself. */
      const scale = node.offsetWidth > 0 ? nodeBox.width / node.offsetWidth : 1;
      store.setHandle({
        key,
        nodeId,
        handleId: id,
        side,
        type,
        offset: {
          x: (pipBox.x + pipBox.width / 2 - nodeBox.x) / scale,
          y: (pipBox.y + pipBox.height / 2 - nodeBox.y) / scale,
        },
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pip);
    const node = store.getNode(nodeId)?.element;
    if (node) observer.observe(node);

    return () => {
      observer.disconnect();
      store.removeHandle(key);
    };
  }, [id, key, nodeId, side, store, type]);

  const dragRef = useRef<number | null>(null);

  const drawGhost = useMemo(
    () =>
      rafThrottle((client: Point) => {
        const from = store.handlePoint(nodeId, id);
        if (!from) return;
        const to = api.clientToWorld(client);
        store.setGhost(roundedPath(edgePolyline(from, to, { sourceSide: side, targetSide: OPPOSITE[side] })));
      }),
    [api, id, nodeId, side, store],
  );

  /**
   * What the release landed on.
   *
   * Two chances, in this order. First the nearest registered TARGET handle
   * within `connectionRadius` — measured in screen pixels, so the grab radius
   * feels the same at every zoom rather than growing as the canvas shrinks.
   * Then, failing that, whichever node the pointer is actually over, which is
   * how dropping anywhere on a block still connects to it.
   */
  const resolveDrop = useCallback(
    (client: Point): { nodeId: string; handleId: string | null } | null => {
      const world = api.clientToWorld(client);
      const zoom = store.getViewport().zoom || 1;
      const radius = connectionRadius / zoom;

      let best: { nodeId: string; handleId: string | null } | null = null;
      let bestDistance = radius;
      for (const handle of store.getHandles()) {
        if (handle.type !== 'target' || handle.nodeId === nodeId) continue;
        const point = store.handlePoint(handle.nodeId, handle.handleId);
        if (!point) continue;
        const distance = Math.hypot(point.x - world.x, point.y - world.y);
        if (distance > bestDistance) continue;
        best = { nodeId: handle.nodeId, handleId: handle.handleId };
        bestDistance = distance;
      }
      if (best) return best;

      const element = document.elementFromPoint(client.x, client.y);
      const host = element?.closest('[data-canvas-node]');
      const dropped = host?.getAttribute('data-canvas-node');
      if (!dropped || dropped === nodeId) return null;
      return { nodeId: dropped, handleId: null };
    },
    [api, connectionRadius, nodeId, store],
  );

  /* Registered unconditionally rather than gated on `connecting`. Gating it
     means the listeners only exist after React has committed the state change
     the pointer-down asked for, and every pointer event in that gap is lost —
     which on a quick flick is the whole gesture, silently. Nothing is being
     dragged is a cheap ref check, not a reason to have no listener. */
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (dragRef.current !== event.pointerId) return;
      drawGhost({ x: event.clientX, y: event.clientY });
    };

    const finish = (event: PointerEvent) => {
      if (dragRef.current !== event.pointerId) return;
      dragRef.current = null;
      drawGhost.cancel();
      store.setGhost(null);
      setConnecting(false);

      const client = { x: event.clientX, y: event.clientY };
      const drop = event.type === 'pointercancel' ? null : resolveDrop(client);
      if (drop) {
        onConnect?.({
          source: nodeId,
          sourceHandle: id,
          target: drop.nodeId,
          targetHandle: drop.handleId,
        });
        return;
      }
      if (event.type === 'pointercancel') return;
      /* Landed on nothing. That is not a failed connection, it is the
         create-and-connect gesture: the caller opens a picker at `client` and
         puts whatever is chosen at `position`. */
      onConnectEnd?.({
        source: nodeId,
        sourceHandle: id,
        position: api.clientToWorld(client),
        client,
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      drawGhost.cancel();
      if (dragRef.current !== null) store.setGhost(null);
    };
  }, [api, drawGhost, id, nodeId, onConnect, onConnectEnd, resolveDrop, store]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (disabled || type !== 'source') return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.stopPropagation();
      dragRef.current = event.pointerId;
      setConnecting(true);
      drawGhost({ x: event.clientX, y: event.clientY });
    },
    [disabled, drawGhost, type],
  );

  return (
    /* Two elements, and the split is not decoration.
     *
     * The OUTER one carries the caller's className and nothing of its own that
     * could fight it — in particular no `position`. It used to be one element
     * with `relative` baked in, and a caller writing `absolute -left-1 top-4`
     * then had two position utilities on one node: which one wins is decided by
     * the order Tailwind emits its `position` group, not by which was written
     * last, and `relative` is emitted after `absolute`. So the target pip
     * silently stayed in normal flow and hung below its own block.
     *
     * The INNER one is the pip: the circle you see, the `::after` that triples
     * what you can hit, and the element that gets measured. */
    <span
      data-canvas-no-drag
      aria-label={label ?? (type === 'source' ? 'Connection source' : 'Connection target')}
      onPointerDown={handlePointerDown}
      className={`block size-2.5 ${className ?? ''}`}
    >
      <span
        ref={pipRef}
        data-canvas-handle={id ?? ''}
        data-connecting={connecting || undefined}
        /* The space before `${` is load-bearing. Tailwind reads source files as
           text, and a class flush against an interpolation is scanned with the
           `${` attached, matches no utility, and is dropped silently.

           The pip is 10px because that is the size it should LOOK; the `after`
           box is the size it has to BE. A ten-pixel target is a miss on a
           trackpad and unusable on a phone, and growing the element itself
           would move the measured centre every edge on the node points at. A
           pseudo element is outside `getBoundingClientRect`, so the hit area
           triples and the geometry does not move at all. */
        className={`relative block size-full rounded-full border border-surface-raised bg-handle transition-transform after:absolute after:-inset-2 after:content-[''] data-[connecting]:scale-125 data-[connecting]:bg-handle-active ${
          disabled
            ? 'opacity-40 after:hidden'
            : type === 'source'
              ? 'cursor-crosshair hover:scale-125 hover:bg-handle-active'
              : ''
        }`}
      />
    </span>
  );
}
