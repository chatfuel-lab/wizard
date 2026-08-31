import { useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { arrowHeadAngle, edgePolyline, pathMidpoint, roundedPath } from '../lib/geometry/edgePath';
import { isRectVisible, type Point } from '../lib/geometry/viewport';
import { useCanvasGeometry, useCanvasInternals } from './canvasContext';

export type CanvasEdgeTone = 'default' | 'muted';

export interface CanvasEdgeSpec {
  id: string;
  source: string;
  /** Which handle on the source. `null` is the node's own handle. */
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  label?: string;
  selected?: boolean;
  tone?: CanvasEdgeTone;
}

export interface CanvasEdgesProps {
  edges: readonly CanvasEdgeSpec[];
  onSelect?: (id: string, event: ReactMouseEvent<SVGPathElement>) => void;
  onDoubleClick?: (id: string, event: ReactMouseEvent<SVGPathElement>) => void;
  onContextMenu?: (id: string, event: ReactMouseEvent<SVGPathElement>) => void;
  /** Corner radius, world units. */
  radius?: number;
  /** How far an edge runs straight out of a handle before it may turn. */
  offset?: number;
  arrows?: boolean;
}

/** Width of the invisible band that catches clicks, world units. */
const HIT_WIDTH = 16;
const ARROW_SIZE = 9;

/* Spelled out rather than derived from the stroke class. Tailwind reads the
   source as text: a class assembled at runtime — `stroke-edge`.replace(...) —
   never appears in the file, so the utility is never generated and the arrow
   comes out unpainted. Twelve characters of duplication buy a class that
   actually exists. */
const STROKE: Record<'default' | 'muted' | 'selected', string> = {
  default: 'stroke-edge',
  muted: 'stroke-edge-ghost',
  selected: 'stroke-edge-selected',
};
const FILL: Record<'default' | 'muted' | 'selected', string> = {
  default: 'fill-edge',
  muted: 'fill-edge-ghost',
  selected: 'fill-edge-selected',
};

interface Route {
  edge: CanvasEdgeSpec;
  points: Point[];
  d: string;
  end: Point;
  angle: number;
  label: Point | null;
}

/**
 * Every edge, in one `<svg>`, in world coordinates.
 *
 * World coordinates are the reason a pan costs nothing here: the edges are
 * inside the layer that pans, so panning moves them the same way it moves the
 * nodes — by moving their parent. Nothing recomputes, nothing re-renders. The
 * only thing that has to be corrected for zoom is stroke width, and
 * `vector-effect="non-scaling-stroke"` does that in the renderer.
 *
 * It renders through a PORTAL into a group `Canvas` owns. That is not
 * indirection for its own sake: edges have to paint under the nodes, the nodes
 * are `children`, and this component is one of them. The alternative was
 * splitting the API into `nodes` and `edges` slots, which makes every caller
 * pay for a problem that belongs here.
 *
 * What DOES re-render it is geometry: a node measured, moved or removed, a
 * handle appearing. That includes every frame of a node drag, which is correct
 * and unavoidable — the edges attached to a moving block have to move with it.
 * The cost is bounded by only recomputing routes when the geometry version
 * changes, and by skipping any edge whose whole span is off-screen, which is
 * cheaper than it sounds: an edge's bounding box is two points.
 *
 * Hit testing gets its own transparent, fat, `pointer-events: stroke` path per
 * edge. An edge is a two-pixel line and nobody can click a two-pixel line.
 */
export function CanvasEdges({
  edges,
  onSelect,
  onDoubleClick,
  onContextMenu,
  radius = 8,
  offset = 24,
  arrows = true,
}: CanvasEdgesProps) {
  const { store, edgeGroup } = useCanvasInternals();
  const geometry = useCanvasGeometry();

  const routes = useMemo<Route[]>(() => {
    const viewport = store.getViewport();
    const size = store.getSize();
    const out: Route[] = [];

    for (const edge of edges) {
      const from = store.handlePoint(edge.source, edge.sourceHandle ?? null);
      const to = store.handlePoint(edge.target, edge.targetHandle ?? null);
      if (!from || !to) continue;

      /* Both endpoints off-screen is not enough to skip: an edge between two
         distant blocks crosses the viewport with neither end in it. The span is
         what has to be tested. */
      const span = {
        x: Math.min(from.x, to.x),
        y: Math.min(from.y, to.y),
        width: Math.abs(to.x - from.x),
        height: Math.abs(to.y - from.y),
      };
      if (size.width > 0 && !isRectVisible(span, viewport, size)) continue;

      const points = edgePolyline(from, to, {
        sourceSide: store.handleSide(edge.source, edge.sourceHandle ?? null) ?? 'right',
        targetSide: store.handleSide(edge.target, edge.targetHandle ?? null) ?? 'left',
        offset,
      });

      out.push({
        edge,
        points,
        d: roundedPath(points, radius),
        end: points[points.length - 1] ?? to,
        angle: arrowHeadAngle(points),
        label: edge.label ? pathMidpoint(points) : null,
      });
    }
    return out;
    // `geometry` is the dependency that matters: it is bumped by every change
    // to a rect or a handle, which is every input `store` is read for here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, geometry, offset, radius, store]);

  if (!edgeGroup) return null;

  return createPortal(
    <>
      {routes.map(({ edge, d, end, angle, label }) => {
        const tone = edge.selected ? 'selected' : (edge.tone ?? 'default');
        return (
          <g key={edge.id} data-canvas-edge={edge.id}>
            <path
              d={d}
              fill="none"
              strokeWidth={HIT_WIDTH}
              stroke="transparent"
              style={{ pointerEvents: 'stroke' }}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={onSelect ? (event) => onSelect(edge.id, event) : undefined}
              onDoubleClick={onDoubleClick ? (event) => onDoubleClick(edge.id, event) : undefined}
              onContextMenu={onContextMenu ? (event) => onContextMenu(edge.id, event) : undefined}
            />
            <path
              d={d}
              fill="none"
              strokeWidth={edge.selected ? 2.5 : 1.5}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={`${STROKE[tone]} transition-colors`}
            />
            {arrows ? (
              <path
                d={`M 0,0 L ${-ARROW_SIZE},${-ARROW_SIZE / 2} L ${-ARROW_SIZE},${ARROW_SIZE / 2} Z`}
                transform={`translate(${end.x} ${end.y}) rotate(${angle})`}
                className={FILL[tone]}
              />
            ) : null}
            {label ? (
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                /* Stroke first, fill second, in the canvas's own colour: the
                   label reads over the line it sits on without anyone having to
                   measure the text to size a plate behind it. */
                paintOrder="stroke"
                strokeWidth={4}
                strokeLinejoin="round"
                fontSize={11}
                className="pointer-events-none select-none fill-text-muted stroke-canvas"
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </>,
    edgeGroup,
  );
}
