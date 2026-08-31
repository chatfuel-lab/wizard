import { useCallback, useMemo, useRef, type RefObject } from 'react';
import type { SalesStageV2 } from '~api/generated/deals/graphql';
import { useDragSession, type DragSession } from '~ui';
import { dragAnnouncement } from '../lib/announce';
import { CLICK_SUPPRESS_MS, MAX_MULTI_MOVE } from '../lib/constants';
import { movesFor, payloadFor, type DragPayload } from '../lib/dragPayload';
import { STAGE_META } from '../lib/stages';
import type { DealCard } from '../types';

export interface UseBoardDragOptions {
  byId: Readonly<Record<string, DealCard>>;
  selection: readonly string[];
  canEdit: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  /** Runs the moves. An empty list means the drop was a cancel. */
  onDrop: (cards: DealCard[], to: SalesStageV2) => void;
  /** Refused because the selection is too large for N sequential round trips. */
  onTooMany: (count: number) => void;
}

export interface BoardDrag {
  session: DragSession<DragPayload>;
  draggableProps: (id: string, card: DealCard) => Record<string, unknown>;
  /** True while a click is really the tail of a drag's pointerup. */
  suppressClick: () => boolean;
}

const namesOf = (payload: DragPayload, byId: Readonly<Record<string, DealCard>>): string[] =>
  payload.ids.map((id) => byId[id]?.name ?? 'Unnamed');

/**
 * The board's one drag session.
 *
 * Two things live here rather than in `useDragSession` because they are about
 * deals, not about dragging:
 *
 * - **The click suppressor.** A browser fires `click` on pointerup, so without
 *   this the detail panel opens after every single drag. `onDrop` and `onCancel`
 *   both run synchronously inside the pointerup dispatch, before the click, so
 *   stamping a ref there is enough.
 * - **The size cap.** There is no bulk mutation, so a fifty-card drag is fifty
 *   round trips; past `MAX_MULTI_MOVE` the drag is refused with an explanation
 *   rather than quietly hammering a rate-limited bot.
 */
export function useBoardDrag({
  byId,
  selection,
  canEdit,
  scrollRef,
  onDrop,
  onTooMany,
}: UseBoardDragOptions): BoardDrag {
  const draggedAt = useRef(0);

  const stamp = useCallback(() => {
    draggedAt.current = Date.now();
  }, []);

  const session = useDragSession<DragPayload>({
    disabled: !canEdit,
    scrollRef,
    getAnnouncement: ({ phase, data, targetId }) =>
      dragAnnouncement({
        phase,
        names: namesOf(data, byId),
        stageLabel: targetId ? (STAGE_META[targetId as SalesStageV2]?.label ?? null) : null,
      }),
    onDrop: (payload, targetId) => {
      stamp();
      const to = targetId as SalesStageV2;
      if (!STAGE_META[to]) return;
      if (payload.ids.length > MAX_MULTI_MOVE) {
        onTooMany(payload.ids.length);
        return;
      }
      // An empty list is the same-column drop: a cancel, not a reorder. Board
      // order is fixed server-side, so any drop index would be a lie.
      onDrop(movesFor(payload, to, byId), to);
    },
    onCancel: stamp,
  });

  const draggableProps = useCallback(
    (id: string, _card: DealCard) => {
      const payload = payloadFor(id, selection, byId);
      if (!payload) return {};
      return session.draggableProps(id, payload) as unknown as Record<string, unknown>;
    },
    [session, selection, byId],
  );

  const suppressClick = useCallback(() => Date.now() - draggedAt.current < CLICK_SUPPRESS_MS, []);

  return useMemo(() => ({ session, draggableProps, suppressClick }), [session, draggableProps, suppressClick]);
}
