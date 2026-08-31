import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { Island } from '../layout/Island';
import { boundsOf, screenToWorld, type Point, type Rect } from '../lib/geometry/viewport';
import { useCanvas, useCanvasGeometry, useCanvasStore, useCanvasViewport } from './canvasContext';

export interface CanvasMinimapProps {
  width?: number;
  height?: number;
  /** World-unit breathing room around the scene. */
  padding?: number;
  /** Paint a node differently — a selected one, an errored one. */
  nodeClassName?: (id: string) => string | undefined;
  className?: string;
  'aria-label'?: string;
}

const DEFAULT_NODE = 'fill-border-strong';

/**
 * The scene, small, with the viewport drawn on it.
 *
 * Scaled to fit the union of the nodes AND the current viewport rather than the
 * nodes alone. Fitting the nodes alone is the obvious version and it is wrong in
 * the one case a minimap is for: pan away from everything and the frame leaves
 * the map, so the map stops answering "where am I" exactly when the question
 * became worth asking.
 *
 * Pressing anywhere on it centres the viewport there, and the press keeps
 * tracking until release, so it drags as well as clicks. The zoom is never
 * touched — a minimap answers "where", and a click that also changed the
 * magnification would answer a question nobody asked.
 */
export function CanvasMinimap({
  width = 176,
  height = 120,
  padding = 80,
  nodeClassName,
  className,
  'aria-label': ariaLabel = 'Minimap',
}: CanvasMinimapProps) {
  const store = useCanvasStore();
  const api = useCanvas();
  const viewport = useCanvasViewport();
  useCanvasGeometry();

  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<number | null>(null);

  const nodes = store.getNodes().filter((node) => node.rect.width > 0);
  const size = store.getSize();

  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld({ x: size.width, y: size.height }, viewport);
  const frame: Rect = {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };

  const scene = boundsOf([...nodes.map((node) => node.rect), frame]) ?? frame;
  const world: Rect = {
    x: scene.x - padding,
    y: scene.y - padding,
    width: Math.max(scene.width + padding * 2, 1),
    height: Math.max(scene.height + padding * 2, 1),
  };

  const scale = Math.min(width / world.width, height / world.height);
  const offset = {
    x: (width - world.width * scale) / 2,
    y: (height - world.height * scale) / 2,
  };
  const project = (point: Point): Point => ({
    x: (point.x - world.x) * scale + offset.x,
    y: (point.y - world.y) * scale + offset.y,
  });

  const centreOn = useCallback(
    (client: Point) => {
      const box = svgRef.current?.getBoundingClientRect();
      if (!box) return;
      const target = {
        x: (client.x - box.x - offset.x) / scale + world.x,
        y: (client.y - box.y - offset.y) / scale + world.y,
      };
      const current = store.getViewport();
      const canvas = store.getSize();
      api.setViewport({
        x: canvas.width / 2 - target.x * current.zoom,
        y: canvas.height / 2 - target.y * current.zoom,
        zoom: current.zoom,
      });
    },
    [api, offset.x, offset.y, scale, store, world.x, world.y],
  );

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    /* Capture on the SVG rather than window listeners: the minimap is small and
       the pointer leaves it constantly while dragging, and capture is safe here
       precisely because nothing re-renders this element mid-drag — the viewport
       it draws changes, its identity does not. */
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = event.pointerId;
    centreOn({ x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingRef.current !== event.pointerId) return;
    centreOn({ x: event.clientX, y: event.clientY });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingRef.current !== event.pointerId) return;
    draggingRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const framePosition = project({ x: frame.x, y: frame.y });

  return (
    <Island padding="sm" className={className}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="touch-none rounded-chip bg-canvas"
      >
        {nodes.map((node) => {
          const at = project({ x: node.rect.x, y: node.rect.y });
          return (
            <rect
              key={node.id}
              x={at.x}
              y={at.y}
              width={Math.max(node.rect.width * scale, 1)}
              height={Math.max(node.rect.height * scale, 1)}
              rx={1}
              className={nodeClassName?.(node.id) ?? DEFAULT_NODE}
            />
          );
        })}
        <rect
          x={framePosition.x}
          y={framePosition.y}
          width={Math.max(frame.width * scale, 2)}
          height={Math.max(frame.height * scale, 2)}
          strokeWidth={1}
          className="fill-selection-fill stroke-selection-stroke"
        />
      </svg>
    </Island>
  );
}
