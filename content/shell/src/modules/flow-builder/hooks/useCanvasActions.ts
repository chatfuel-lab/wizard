import { useCallback } from 'react';
import type { BlockPositionBulkUpdate } from '~api/generated/flow-builder/graphql';
import type { CanvasApi, CanvasSelection } from '~ui';
import { alignBlocks, type AlignEdge } from '../lib/alignBlocks';
import { FIT_PADDING } from '../lib/graph';
import { computeAutoLayout } from '../lib/layout';
import type { FlowT, Selection } from '../types';

export interface CanvasActions {
  /** The centre of what the canvas is showing, in world coordinates. */
  viewportCentre: () => { x: number; y: number } | null;
  /** Frame the selection when there is one, the whole scene otherwise. */
  fit: () => void;
  align: (edge: AlignEdge) => void;
  autoLayout: () => void;
  /** Select a block in both selections and frame it. */
  goToBlock: (blockId: string) => void;
}

/**
 * The canvas verbs that read the api handle and the selection: framing,
 * alignment, auto-layout and go-to-block. Pure fan-out — every one of them
 * ends in the api or in `onMoveBlocks`, and none of them owns state.
 */
export function useCanvasActions(
  api: CanvasApi | null,
  selection: CanvasSelection,
  select: (selection: Selection | null) => void,
  flow: FlowT,
  onMoveBlocks: (updates: BlockPositionBulkUpdate[]) => Promise<void>,
): CanvasActions {
  const viewportCentre = useCallback(() => {
    /* The canvas's OWN box, not the wrapper's. They differ the moment the
       inspector opens beside it, and it is the canvas that knows its size —
       its ResizeObserver is on itself. */
    const rect = api?.containerRef.current?.getBoundingClientRect();
    if (!api || !rect) return null;
    return api.clientToWorld({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [api]);

  const fit = useCallback(() => {
    if (!api) return;
    if (selection.selected.size > 0) api.fitNodes([...selection.selected], { padding: FIT_PADDING, maxZoom: 1 });
    else api.fitView({ padding: FIT_PADDING, maxZoom: 1 });
  }, [api, selection.selected]);

  const align = useCallback(
    (edge: AlignEdge) => {
      const updates = alignBlocks(flow.blocks, selection.selected, edge);
      if (updates.length > 0) void onMoveBlocks(updates);
    },
    [flow.blocks, onMoveBlocks, selection.selected],
  );

  const autoLayout = useCallback(() => {
    /* The fit has to come after the move and not with it: the layout usually
       makes the graph a different shape entirely, and framing the old shape
       would leave half of it off screen. */
    void onMoveBlocks(computeAutoLayout(flow)).then(() => api?.fitView({ padding: FIT_PADDING, maxZoom: 1 }));
  }, [api, flow, onMoveBlocks]);

  const goToBlock = useCallback(
    (blockId: string) => {
      select({ blockId, elementId: null });
      selection.replace([blockId]);
      api?.fitNodes([blockId], { padding: FIT_PADDING * 2, maxZoom: 1 });
    },
    [api, select, selection],
  );

  return { viewportCentre, fit, align, autoLayout, goToBlock };
}
