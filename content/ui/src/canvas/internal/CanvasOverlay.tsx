import { useSyncExternalStore } from 'react';
import { EMPTY_OVERLAY, useCanvasStore } from '../canvasContext';

/**
 * Layer 2 — everything drawn at the frequency of the pointer.
 *
 * The marquee, the connection in flight, the alignment guides. All of it is
 * transient, none of it is part of the graph, and the entire point of putting it
 * in its own element is the rule it makes enforceable: **nothing here may
 * re-render a node.** It subscribes to one slice of the store and nothing above
 * it re-renders when that slice changes, so a marquee dragged across a hundred
 * nodes re-renders one `<svg>` with one `<rect>` in it.
 *
 * It draws in WORLD coordinates, inside the same transformed layer the nodes
 * are in. That is what makes it free: a marquee rect stated in world units
 * needs no per-frame conversion, and it pans and zooms with the scene because
 * its parent does. `vector-effect="non-scaling-stroke"` keeps the outlines one
 * pixel wide at every zoom, which is the one thing world-space drawing would
 * otherwise get wrong.
 *
 * It renders bare SVG children rather than its own `<svg>`: `Canvas` owns a
 * full-size element above the nodes and this draws into the group inside it.
 * The first version was a zero-sized `<svg>` with `overflow: visible`, which
 * never painted anything at all — by the SVG specification a width or height of
 * zero disables rendering of the element, and no amount of overflow argues with
 * that.
 */
export function CanvasOverlay() {
  const store = useCanvasStore();
  const { marquee, ghost, guides } = useSyncExternalStore(
    store.subscribeOverlay,
    store.getOverlay,
    () => EMPTY_OVERLAY,
  );

  return (
    <>
      {ghost ? (
        <path
          d={ghost}
          fill="none"
          strokeWidth={2}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
          className="stroke-edge-ghost"
        />
      ) : null}

      {guides?.map((guide) => (
        <line
          key={`${guide.axis}:${guide.position}`}
          x1={guide.axis === 'x' ? guide.position : guide.from}
          y1={guide.axis === 'x' ? guide.from : guide.position}
          x2={guide.axis === 'x' ? guide.position : guide.to}
          y2={guide.axis === 'x' ? guide.to : guide.position}
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          className="stroke-guide"
        />
      ))}

      {marquee ? (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.width}
          height={marquee.height}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="fill-selection-fill stroke-selection-stroke"
        />
      ) : null}
    </>
  );
}
