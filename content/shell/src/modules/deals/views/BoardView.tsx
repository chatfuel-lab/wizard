import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import {
  ActionBar,
  IconArrowRight,
  IconChecks,
  IconExternal,
  IconLink,
  IconSparkles,
  useToast,
  type MenuItem,
} from '~ui';
import { useDealsUndo } from '../DealsUndoContext';
import { BoardFilterBar } from '../components/BoardFilterBar';
import type { BoardChrome } from '../components/DealCard';
import { DealsBoard } from '../components/DealsBoard';
import { RollupStrip } from '../components/RollupStrip';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardKeyboard } from '../hooks/useBoardKeyboard';
import { useDealsBoard } from '../hooks/useDealsBoard';
import { moveResultPhrase } from '../lib/announce';
import { columnIds } from '../lib/boardFocus';
import { AGE_TICK_MS, MAX_MULTI_MOVE } from '../lib/constants';
import { toAssigneeFilter } from '../lib/dealsFilter';
import { isRestricted } from '../lib/dragPayload';
import { STAGES, STAGE_META } from '../lib/stages';
import { dealLink } from '../lib/tableSelection';
import { undoEntryFor, undoLabel, undoMoves } from '../lib/undo';
import type { DealCard } from '../types';
import type { DealsViewProps } from './types';

/** `1`–`6` in board order — the same keys the card takes, shown in the menu. */
const STAGE_SHORTCUT: Record<SalesStageV2, string[]> = {
  [SalesStageV2.New]: ['1'],
  [SalesStageV2.Sorting]: ['2'],
  [SalesStageV2.Ready]: ['3'],
  [SalesStageV2.WorkingOn]: ['4'],
  [SalesStageV2.Won]: ['5'],
  [SalesStageV2.Lost]: ['6'],
};

/**
 * The kanban.
 *
 * It reads only the assignee half of the shared filter, because
 * `contactDealsConnection` cannot express the rest — the table is the view that
 * can. It owns one drag session for all six columns, the selection, the
 * keyboard, and a single clock tick that every card's age and rot is computed
 * from, so they can never disagree with each other.
 */
export function BoardView({
  filter,
  onFilterChange,
  density,
  onDensityChange,
  band,
  collapsed,
  onCollapsedChange,
  fields,
  canEdit,
  onCount,
  onBusy,
  refreshToken,
  onOpenDeal,
}: DealsViewProps) {
  const assigneeFilter = useMemo(() => toAssigneeFilter(filter.assignee), [filter.assignee]);
  const board = useDealsBoard(assigneeFilter, fields.names);
  const toast = useToast();
  const undo = useDealsUndo();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');
  const [sweep, setSweep] = useState<{ stage: SalesStageV2 | null; nonce: number }>({
    stage: null,
    nonce: 0,
  });

  /* One clock read for the whole board, refreshed on a slow tick. Every age
   * label and rot bar then agrees, and the pure functions stay clockless. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), AGE_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const { refetchAll, loading, columns, moveDeals, clearSelection } = board;
  const total = STAGES.reduce((sum, stage) => sum + columns[stage].total, 0);

  useEffect(() => onCount(loading ? null : total), [onCount, loading, total]);
  useEffect(() => onBusy(loading), [onBusy, loading]);
  useEffect(() => {
    if (refreshToken > 0) refetchAll();
  }, [refreshToken, refetchAll]);

  /** Ordered ids per column — what the keyboard navigates and `⌘A` selects. */
  const order = useMemo(() => {
    const next = {} as Record<SalesStageV2, string[]>;
    for (const stage of STAGES) next[stage] = columns[stage].cards.map((card) => card.id);
    return next;
  }, [columns]);

  /**
   * Every stage change on the board funnels through here — drag, `1`-`6`, the
   * context menu, the bulk bar — so the announcement, the toast, the undo offer
   * and the selection clear happen once per batch rather than once per card.
   * There is no bulk mutation, so a partial failure is an ordinary outcome and
   * has to read like one.
   */
  const runMoves = useCallback(
    async (cards: DealCard[], to: SalesStageV2, offerUndo = true) => {
      if (cards.length === 0) return;
      const label = STAGE_META[to].label;
      const report = await moveDeals(cards, to);
      setAnnouncement(
        moveResultPhrase(
          report.moved.map((card) => card.name || 'Unnamed'),
          report.failed.map((card) => card.name || 'Unnamed'),
          label,
        ),
      );
      if (report.failed.length > 0) {
        toast.show({
          tone: 'danger',
          title:
            report.failed.length === 1
              ? `${report.failed[0]!.name || 'A deal'} could not be moved`
              : `${report.failed.length} deals could not be moved`,
          description: report.message ?? undefined,
        });
      }
      if (report.moved.length === 0) return;

      clearSelection();
      if (to === SalesStageV2.Won) {
        setSweep((prev) => ({ stage: SalesStageV2.Won, nonce: prev.nonce + 1 }));
      }

      /* `report.moved` holds the cards as they were BEFORE the move, so
       * `salesStageV2` on them is the origin — exactly what an inverse needs.
       * `offerUndo` is false when this call IS the undo, or a user could ping
       * cards back and forth forever, each round re-stamping their sort time. */
      if (!offerUndo) return;
      const entry = undoEntryFor(
        report.moved.flatMap((card) => (card.salesStageV2 ? [{ id: card.id, from: card.salesStageV2 }] : [])),
        to,
        Date.now(),
      );
      if (!entry) return;

      const runUndo = () => {
        /* Clear first, and here rather than at the call site. The toast's action
         * button holds this closure directly — it cannot go through `undo.run`,
         * which is rebuilt from the pending entry and so is still the previous
         * render's version at the moment `toast.show` captures it. Without this
         * line, pressing Undo in the toast leaves the entry live and a following
         * ⌘Z fires the same compensating mutation a second time. */
        undo.clear();
        /* Grouped by destination stage: undoing a batch that came from three
         * columns is three calls, not one per card. */
        const back = new Map<SalesStageV2, DealCard[]>();
        for (const move of undoMoves(entry)) {
          const card = board.byId[move.id];
          if (!card) continue;
          back.set(move.to, [...(back.get(move.to) ?? []), card]);
        }
        for (const [stage, cards] of back) void runMoves(cards, stage, false);
      };

      undo.push(entry, runUndo);
      toast.show({
        tone: 'success',
        title: report.moved.length === 1 ? `Moved to ${label}` : `${report.moved.length} moved to ${label}`,
        description: 'They return to the top of their column — the server re-stamps the sort time.',
        action: { label: undoLabel(entry), onClick: runUndo },
      });
    },
    [moveDeals, toast, clearSelection, undo, board.byId],
  );

  const drag = useBoardDrag({
    byId: board.byId,
    selection: board.selection,
    canEdit,
    scrollRef,
    onDrop: (cards, to) => void runMoves(cards, to),
    onTooMany: (count) =>
      toast.show({
        tone: 'warning',
        title: `Too many deals selected (${count})`,
        description: `Every move is a separate request — ${MAX_MULTI_MOVE} at a time is the limit.`,
      }),
  });

  /* A keyboard or menu stage change applies to the selection when the target
   * card is part of it, exactly like a drag does. */
  const setStage = useCallback(
    (card: DealCard, to: SalesStageV2) => {
      const cards = board.selection.includes(card.id) ? board.selectedCards : [card];
      void runMoves(
        cards.filter((each) => each.salesStageV2 !== to && !isRestricted(each)),
        to,
      );
    },
    [board.selection, board.selectedCards, runMoves],
  );

  const keyboard = useBoardKeyboard({
    order,
    collapsed,
    byId: board.byId,
    selection: board.selection,
    canEdit,
    dragging: drag.session.isDragging,
    onOpen: onOpenDeal,
    onToggleSelect: board.toggleSelect,
    onSetSelection: board.setSelection,
    onClearSelection: clearSelection,
    onSetStage: setStage,
  });

  /**
   * Right-click items. A card that is part of the selection acts on the whole
   * selection — the same rule `payloadFor` applies to a drag, so the two never
   * disagree about what "this card" means.
   */
  const menuItems = useCallback(
    (card: DealCard): MenuItem[] => {
      const inSelection = board.selection.includes(card.id);
      const count = inSelection ? board.selectedCards.length : 1;
      const suffix = count > 1 ? ` (${count})` : '';

      return [
        { kind: 'label', id: 'header', label: inSelection ? `${count} selected` : card.name || 'Deal' },
        {
          id: 'open',
          label: 'Open deal',
          icon: <IconExternal size={14} />,
          shortcut: ['enter'],
          onSelect: () => onOpenDeal(card.id),
        },
        {
          id: 'copy',
          label: 'Copy link',
          icon: <IconLink size={14} />,
          onSelect: () => {
            void navigator.clipboard?.writeText(dealLink(window.location.href, card.id));
          },
        },
        { kind: 'separator', id: 's1' },
        { kind: 'label', id: 'stages', label: `Move to${suffix}` },
        ...STAGES.filter((stage) => stage !== card.salesStageV2).map((stage) => ({
          id: `stage-${stage}`,
          label: STAGE_META[stage].label,
          shortcut: STAGE_SHORTCUT[stage],
          onSelect: () => setStage(card, stage),
        })),
        { kind: 'separator', id: 's2' },
        {
          id: 'select-column',
          label: 'Select the whole column',
          icon: <IconChecks size={14} />,
          shortcut: ['mod', 'a'],
          onSelect: () => board.setSelection(columnIds(order, card.id)),
        },
      ];
    },
    [board, order, onOpenDeal, setStage],
  );

  const chrome = useMemo<BoardChrome>(
    () => ({
      density,
      canEdit,
      bindings: fields.bindings,
      now,
      anySelected: board.selection.length > 0,
      focusedId: keyboard.focusedId,
      draggableProps: drag.draggableProps,
      onOpen: onOpenDeal,
      onToggleSelect: board.toggleSelect,
      onSetStage: setStage,
      onFlashDone: board.clearFlash,
      onKeyDown: keyboard.onCardKeyDown,
      onCardFocus: keyboard.onCardFocus,
      onCardBlur: keyboard.onCardBlur,
      registerCard: keyboard.registerCard,
      menuItems,
      suppressClick: drag.suppressClick,
    }),
    [
      density,
      canEdit,
      fields.bindings,
      now,
      board.selection.length,
      board.toggleSelect,
      board.clearFlash,
      drag.draggableProps,
      drag.suppressClick,
      keyboard.focusedId,
      keyboard.onCardKeyDown,
      keyboard.onCardFocus,
      keyboard.onCardBlur,
      keyboard.registerCard,
      menuItems,
      onOpenDeal,
      setStage,
    ],
  );

  const toggleCollapsed = useCallback(
    (stage: SalesStageV2) =>
      onCollapsedChange(
        collapsed.includes(stage)
          ? collapsed.filter((each) => each !== stage)
          : STAGES.filter((each) => each === stage || collapsed.includes(each)),
      ),
    [collapsed, onCollapsedChange],
  );

  /**
   * The column `⋯` menu, deferred from S4 because its items did not exist yet.
   * All three act on the selection or create one, which is why the view owns it
   * and the column only renders it.
   */
  const columnMenuItems = useCallback(
    (stage: SalesStageV2): MenuItem[] => {
      const incoming = board.selectedCards.filter((card) => card.salesStageV2 !== stage && !isRestricted(card));
      return [
        {
          id: 'select-all',
          label: 'Select every deal here',
          icon: <IconChecks size={14} />,
          shortcut: ['mod', 'a'],
          disabled: order[stage].length === 0,
          onSelect: () => board.setSelection(order[stage]),
        },
        {
          id: 'move-here',
          label:
            incoming.length === 1
              ? `Move the selected deal to ${STAGE_META[stage].label}`
              : `Move ${incoming.length} selected here`,
          icon: <IconArrowRight size={14} />,
          disabled: incoming.length === 0,
          onSelect: () => void runMoves(incoming, stage),
        },
        { kind: 'separator', id: 's1' },
        {
          id: 'collapse',
          label: 'Collapse the column',
          onSelect: () => toggleCollapsed(stage),
        },
      ];
    },
    [board, order, runMoves, toggleCollapsed],
  );

  const bulkActions = useMemo<MenuItem[]>(
    () => [
      { kind: 'label', id: 'move', label: 'Move to' },
      ...STAGES.map((stage) => ({
        id: `bulk-${stage}`,
        label: STAGE_META[stage].label,
        shortcut: STAGE_SHORTCUT[stage],
        icon: stage === SalesStageV2.Won ? <IconSparkles size={14} /> : <IconArrowRight size={14} />,
        onSelect: () =>
          void runMoves(
            board.selectedCards.filter((card) => card.salesStageV2 !== stage && !isRestricted(card)),
            stage,
          ),
      })),
    ],
    [board.selectedCards, runMoves],
  );

  return (
    <>
      <BoardFilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        density={density}
        onDensityChange={onDensityChange}
        band={band}
        collapsedCount={collapsed.length}
        onExpandAll={() => onCollapsedChange([])}
        selectedCount={board.selection.length}
        onClearSelection={clearSelection}
      />
      <RollupStrip columns={columns} bindings={fields.bindings} />
      <DealsBoard
        columns={columns}
        byId={board.byId}
        chrome={chrome}
        bindings={fields.bindings}
        density={density}
        selection={board.selection}
        flash={board.flash}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        loading={board.loading}
        error={board.error}
        onRetry={refetchAll}
        onLoadMore={board.loadMore}
        onAutoPage={board.autoPage}
        columnMenuItems={columnMenuItems}
        drag={drag}
        scrollRef={scrollRef}
        sweep={sweep}
        announcement={announcement}
      />
      {canEdit ? <ActionBar count={board.selection.length} actions={bulkActions} onClear={clearSelection} /> : null}
    </>
  );
}
