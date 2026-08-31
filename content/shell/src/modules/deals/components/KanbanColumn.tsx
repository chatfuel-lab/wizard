import { useEffect, useRef } from 'react';
import {
  Button,
  DURATION,
  EASING,
  IconChevronLeft,
  MenuButton,
  Skeleton,
  Tooltip,
  prefersReducedMotion,
  type MenuItem,
} from '~ui';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import type { ColumnState } from '../hooks/useDealsBoard';
import { useSentinel } from '../hooks/useSentinel';
import { AUTO_PAGE_CAP, PAGE_SIZE } from '../lib/constants';
import type { DealFieldBindings } from '../lib/dealFieldBinding';
import { rollupAmountLabel, rollupColumn, rollupCoverage, rollupExplanation } from '../lib/dealRollup';
import { CARD_HEIGHT } from '../lib/layout';
import { STAGE_META } from '../lib/stages';
import { DealCard, type BoardChrome } from './DealCard';

export interface KanbanColumnProps {
  stage: SalesStageV2;
  column: ColumnState;
  chrome: BoardChrome;
  bindings: DealFieldBindings;
  selection: readonly string[];
  flash: Record<string, number>;
  activeId: string | null;
  /** True while a drag is over this column. */
  isOver: boolean;
  dragging: boolean;
  dropTargetProps: Record<string, unknown>;
  onLoadMore: () => void;
  onAutoPage: () => void;
  onCollapse: () => void;
  /** The `⋯` menu, built by the view because its items act on the selection. */
  menuItems: MenuItem[];
  /** Bumped when a deal lands here successfully; drives the one celebratory beat. */
  sweep?: number;
}

/**
 * One kanban column.
 *
 * Two structural rules that are not stylistic:
 *
 * - **The drop placeholder is always first, and there is no drop index.** The
 *   server re-stamps `lastSalesStageUpdateTime` on a move and the board's sort
 *   is fixed to it, so a card always lands at the top. Showing any other
 *   position would be a lie the next render corrects.
 * - **The column's outer box must not resize during a drag.** `useDragSession`
 *   measures drop-target rects once at activation, so the placeholder lives
 *   inside the inner scroller and the column keeps a fixed width and height.
 */
export function KanbanColumn({
  stage,
  column,
  chrome,
  bindings,
  selection,
  flash,
  activeId,
  isOver,
  dragging,
  dropTargetProps,
  onLoadMore,
  onAutoPage,
  onCollapse,
  menuItems,
  sweep = 0,
}: KanbanColumnProps) {
  const meta = STAGE_META[stage];
  const headerRef = useRef<HTMLElement>(null);

  /* One 600ms sweep across the header when a deal is won. Deliberately not
   * confetti: a rep moves forty deals a day, and a full-screen celebration is
   * noise by lunch and unprofessional inside a client's app. */
  useEffect(() => {
    if (sweep === 0 || prefersReducedMotion()) return;
    headerRef.current?.animate(
      [
        { backgroundColor: 'transparent' },
        { backgroundColor: 'var(--color-success-soft)' },
        { backgroundColor: 'transparent' },
      ],
      { duration: DURATION.slow * 2, easing: EASING.standard },
    );
  }, [sweep]);
  const rollup = rollupColumn(column.cards, bindings, column.total);
  const money = rollupAmountLabel(rollup);
  const coverage = rollupCoverage(rollup);
  const remaining = Math.max(0, column.total - column.cards.length);
  const canAutoPage = column.hasNext && column.pages < AUTO_PAGE_CAP;
  const sentinel = useSentinel(canAutoPage && !dragging, onAutoPage);

  return (
    <section
      aria-label={meta.label}
      {...dropTargetProps}
      /* `snap-start` is inert until a container declares a snap type, and only
         `DealsBoard`'s scroll row does, only below the compact band — where the
         column also stops being a fixed 18rem and becomes 85% of the module, one
         page of the stage pager. `shrink-0` still has to hold: a flex child that
         shrinks is a page that does not line up with its snap point. */
      className={`flex h-full w-column shrink-0 snap-start flex-col rounded-card border transition-colors @max-compact:w-[85cqw] ${
        isOver ? 'border-accent bg-accent-soft/40' : 'border-border bg-surface-sunken'
      }`}
    >
      <header ref={headerRef} className="group/header flex shrink-0 items-start gap-2 px-2.5 pb-1.5 pt-2">
        <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${meta.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{meta.label}</span>
            <Tooltip label="Server count — exact. The money below covers loaded deals only.">
              <span className="shrink-0 text-xs tabular-nums text-text-muted">{column.total}</span>
            </Tooltip>
          </div>
          {money ? (
            <p className="mt-0.5 truncate text-xs tabular-nums text-text-muted" title={rollupExplanation(rollup)}>
              <span className="font-medium text-text">{money}</span>
              {coverage ? <span className="text-text-faint"> · {coverage}</span> : null}
            </p>
          ) : null}
        </div>
        {/* Revealed on hover, but focus-visible brings both back so a Tab user
            can still reach them — and `@max-compact:` brings them back for good
            below 600px, where neither of those happens. Tailwind compiles
            `hover:` inside `@media (hover: hover)`, so on a phone this span
            stayed at opacity 0 permanently: still hit-testable (an opacity-0
            element takes pointer events), which is worse than hidden, because
            the `⋯` menu is where a touch user selects a column and then moves it
            somewhere the pager cannot drag to. */}
        <span className="flex shrink-0 items-center opacity-0 transition-opacity duration-fast ease-standard focus-within:opacity-100 group-hover/header:opacity-100 @max-compact:opacity-100">
          <button
            type="button"
            onClick={onCollapse}
            aria-label={`Collapse ${meta.label}`}
            className="focus-visible:focus-ring rounded p-0.5 text-text-faint hover:text-text"
          >
            <IconChevronLeft />
          </button>
          <MenuButton items={menuItems} label={`${meta.label} column actions`} />
        </span>
      </header>

      <div
        ref={sentinel.setRoot}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 [scrollbar-gutter:stable]"
      >
        {isOver && dragging ? (
          <div
            aria-hidden
            style={{ height: CARD_HEIGHT[chrome.density] }}
            className="shrink-0 rounded-card border border-dashed border-accent bg-accent-soft/30 transition-[height] duration-normal"
          />
        ) : null}

        {/* The role="list" wraps only the cards: a placeholder, a skeleton and a
            "load more" button are not list items, and a list with other children
            is worse semantics than no list at all. */}
        <div role="list" className="contents">
          {column.cards.map((card) => (
            <DealCard
              key={card.id}
              card={card}
              chrome={chrome}
              selected={selection.includes(card.id)}
              dragging={activeId === card.id}
              flashAt={flash[card.id]}
            />
          ))}
        </div>

        {column.cards.length === 0 && !column.loadingMore && !isOver ? (
          <div className="rounded-card border border-dashed border-border p-3 text-center text-xs text-text-faint">
            No deals
          </div>
        ) : null}

        {column.loadingMore ? (
          <>
            <Skeleton variant="block" height={`${CARD_HEIGHT[chrome.density]}px`} />
            <Skeleton variant="block" height={`${CARD_HEIGHT[chrome.density]}px`} />
          </>
        ) : null}

        {column.hasNext ? (
          canAutoPage ? (
            <span ref={sentinel.setTarget} aria-hidden className="h-px shrink-0" />
          ) : (
            <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={column.loadingMore}>
              Load {PAGE_SIZE} more{remaining > 0 ? ` · ${remaining} remaining` : ''}
            </Button>
          )
        ) : null}
      </div>
    </section>
  );
}
