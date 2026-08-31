import { Island } from '../layout/Island';
import { Tooltip } from '../floating/Tooltip';
import { IconMaximize, IconMinus, IconPlus } from '../icons';
import { useCanvas, useCanvasViewport } from './canvasContext';

export interface CanvasZoomControlsProps {
  /** Hide the "fit to content" button — a scene with nothing to fit. */
  showFit?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const BUTTON =
  'flex size-7 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:focus-ring';

/**
 * Zoom out, the current zoom, zoom in, fit.
 *
 * One of the two components in this package that subscribes to the live
 * viewport, and it is the reason `useCanvasViewport` exists: a zoom readout has
 * to change sixty times a second during a pinch, and it costs one number and one
 * `<span>` to do so. A node subscribing to the same thing would cost a card.
 *
 * Clicking the percentage returns to 100%, which is the shortcut everyone tries
 * and almost nothing implements.
 */
export function CanvasZoomControls({ showFit = true, orientation = 'horizontal', className }: CanvasZoomControlsProps) {
  const api = useCanvas();
  const viewport = useCanvasViewport();
  const percent = Math.round(viewport.zoom * 100);

  return (
    <Island padding="sm" orientation={orientation} className={className}>
      <Tooltip label="Zoom out">
        <button type="button" aria-label="Zoom out" onClick={api.zoomOut} className={BUTTON}>
          <IconMinus size={14} />
        </button>
      </Tooltip>
      <Tooltip label="Reset to 100%">
        <button
          type="button"
          onClick={() => api.zoomTo(1)}
          /* Tabular figures: without them the strip changes width as the digits
             change, and a control that resizes while you use it is unusable. */
          className="min-w-11 rounded-control px-1 text-center text-micro font-medium tabular-nums text-text-muted transition-colors hover:bg-surface-hover hover:text-text focus-visible:focus-ring"
        >
          {percent}%
        </button>
      </Tooltip>
      <Tooltip label="Zoom in">
        <button type="button" aria-label="Zoom in" onClick={api.zoomIn} className={BUTTON}>
          <IconPlus size={14} />
        </button>
      </Tooltip>
      {showFit ? (
        <Tooltip label="Fit to content">
          <button type="button" aria-label="Fit to content" onClick={() => api.fitView()} className={BUTTON}>
            <IconMaximize size={14} />
          </button>
        </Tooltip>
      ) : null}
    </Island>
  );
}
