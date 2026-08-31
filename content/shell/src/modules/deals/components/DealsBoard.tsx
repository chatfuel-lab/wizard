import type { RefObject } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { Alert, Button, DragLayer, EmptyState, IconKanban, type MenuItem } from '~ui';
import type { BoardDrag } from '../hooks/useBoardDrag';
import { useBoardFlip } from '../hooks/useBoardFlip';
import type { ColumnState } from '../hooks/useDealsBoard';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import type { Density } from '../lib/layout';
import { STAGES } from '../lib/stages';
import type { DealCard } from '../types';
import { BoardSkeleton } from './BoardSkeleton';
import { ColumnRail } from './ColumnRail';
import type { BoardChrome } from './DealCard';
import { DragGhost } from './DragGhost';
import { KanbanColumn } from './KanbanColumn';

export interface DealsBoardProps {
  columns: Record<SalesStageV2, ColumnState>;
  byId: Readonly<Record<string, DealCard>>;
  chrome: BoardChrome;
  bindings: DealFieldBindings;
  density: Density;
  selection: readonly string[];
  flash: Record<string, number>;
  collapsed: readonly SalesStageV2[];
  onToggleCollapsed: (stage: SalesStageV2) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLoadMore: (stage: SalesStageV2) => void;
  onAutoPage: (stage: SalesStageV2) => void;
  /** The `⋯` menu per column — the view builds it, since it acts on the selection. */
  columnMenuItems: (stage: SalesStageV2) => MenuItem[];
  drag: BoardDrag;
  /** The horizontal scroller, so the drag session can auto-scroll it. Owned by
   *  the view, because the session is created before this component renders. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Which stage just received a successful move, and a counter to re-fire it. */
  sweep: { stage: SalesStageV2 | null; nonce: number };
  /** Spoken after a batch settles — outcomes only, never during the drag. */
  announcement: string;
}

/**
 * The canvas: six columns or rails, the drag layer, and the three states a
 * board can be in.
 *
 * No virtualization. It would fight the drag layer's rect caching — every
 * target is measured once at activation — for no gain at kanban column depths.
 */
export function DealsBoard({
  columns,
  byId,
  chrome,
  bindings,
  density,
  selection,
  flash,
  collapsed,
  onToggleCollapsed,
  loading,
  error,
  onRetry,
  onLoadMore,
  onAutoPage,
  columnMenuItems,
  drag,
  scrollRef,
  sweep,
  announcement,
}: DealsBoardProps) {
  const { session } = drag;

  /* Recomputed every render, but it is six joins over id lists — cheap, and it
   * is the only thing that says "the layout can have changed" without also
   * firing on a hover or a selection. */
  const signature = STAGES.map((stage) => columns[stage].cards.map((c) => c.id).join(',')).join('|');
  useBoardFlip(scrollRef, signature, session.isDragging);

  if (loading) return <BoardSkeleton density={density} />;

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Alert tone="danger" title="The board could not load">
          <p>{error}</p>
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  const empty = STAGES.every((s) => columns[s].cards.length === 0 && columns[s].total === 0);
  if (empty) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={<IconKanban />}
          title="No deals yet"
          description="Set a sales stage on a contact (Contacts module, or via the API) and it appears here."
        />
      </div>
    );
  }

  return (
    <>
      {/* Outcomes only. DragLayer ships its own live region for the phases of a
          drag; two polite regions are fine as long as they never say the same
          thing twice. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* The scroll row, and below the compact band the stage pager.
       *
       * `@max-compact:` turns snapping on only where it is wanted. A column is
       * `85cqw` there — 85% of the MODULE, because `cqw` resolves against
       * `@container/module` on `ModuleRoot` rather than against the window, so an
       * embed 700px wide inside a 2560px screen gets a pager too. The remaining
       * 15% is the edge of the next stage: that sliver is what makes the layout
       * read as a swipe rather than as something clipped.
       *
       * ⚠ `data-dragging` HERE IS NOT the `data-dragging` `useDragSession` sets.
       * That one is on the dragged CARD (`draggableProps`); this one is on the
       * SCROLL CONTAINER, and the two have nothing to do with each other beyond
       * the name. This one exists because scroll snapping fights the drag
       * autoscroll: the session scrolls this very element via
       * `autoScrollVelocity` while a card is held near an edge, and
       * `scroll-snap-type: mandatory` hauls it straight back to the nearest snap
       * point — so the column never advances, and dragging a card to a stage that
       * is off screen silently stops working. Suspending the snap for the length
       * of the drag is the fix. Delete the wrong one and a different feature
       * breaks. */}
      <div
        ref={scrollRef}
        data-dragging={session.isDragging ? true : undefined}
        className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-gutter @max-compact:snap-x @max-compact:snap-mandatory @max-compact:scroll-p-gutter data-[dragging]:snap-none"
      >
        {STAGES.map((stage) => {
          const dropTargetProps = session.dropTargetProps(stage, {
            disabled: !chrome.canEdit,
          }) as unknown as Record<string, unknown>;
          const isOver = session.overId === stage;

          return collapsed.includes(stage) ? (
            <ColumnRail
              key={stage}
              stage={stage}
              total={columns[stage].total}
              isOver={isOver}
              dropTargetProps={dropTargetProps}
              onExpand={() => onToggleCollapsed(stage)}
            />
          ) : (
            <KanbanColumn
              key={stage}
              stage={stage}
              column={columns[stage]}
              chrome={chrome}
              bindings={bindings}
              selection={selection}
              flash={flash}
              activeId={session.activeId}
              isOver={isOver}
              dragging={session.isDragging}
              dropTargetProps={dropTargetProps}
              onLoadMore={() => onLoadMore(stage)}
              onAutoPage={() => onAutoPage(stage)}
              onCollapse={() => onToggleCollapsed(stage)}
              menuItems={columnMenuItems(stage)}
              sweep={sweep.stage === stage ? sweep.nonce : 0}
            />
          );
        })}
      </div>

      <DragLayer session={session}>
        {(payload) => (
          <DragGhost payload={payload} byId={byId} bindings={bindings} density={density} now={chrome.now} />
        )}
      </DragLayer>
    </>
  );
}
