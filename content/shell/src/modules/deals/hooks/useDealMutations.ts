import { useCallback, type Dispatch } from 'react';
import { DealSetStageDocument, type SalesStageV2 } from '~api/generated/deals/graphql';
import { useDeals } from '../DealsContext';
import type { DealsAction, DealsState } from '../lib/dealsStore';
import type { DealCard } from '../types';

/** What actually happened to a batch — the board announces and toasts this once. */
export interface MoveReport {
  moved: DealCard[];
  failed: DealCard[];
  /** The first error message, for the toast. */
  message: string | null;
}

export interface DealMutations {
  /** Optimistic stage move; rolls back exactly this card on failure. */
  moveDeal: (card: DealCard, to: SalesStageV2) => Promise<MoveReport>;
  /**
   * Several cards at once. There is no bulk mutation in this API, so this is N
   * sequential round trips and a partial failure is a normal outcome.
   */
  moveDeals: (cards: readonly DealCard[], to: SalesStageV2) => Promise<MoveReport>;
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Optimistic stage moves, with nothing captured in a closure. `moveStarted`
 * records the inverse patch inside the reducer, so `moveFailed` needs only an
 * id — which is what makes the rollback correct under StrictMode's double
 * invocation, and what stops one failure from reverting another card's success.
 *
 * **Optimism is batched, the network is sequential.** Every `moveStarted`
 * dispatches up front so a multi-card drag lands as one visual jump; the
 * mutations then run one at a time, and the caller gets a single report rather
 * than N callbacks — one announcement, one toast.
 */
export function useDealMutations(state: DealsState, dispatch: Dispatch<DealsAction>): DealMutations {
  const { client } = useDeals();
  const { epoch } = state;

  const moveDeals = useCallback(
    async (cards: readonly DealCard[], to: SalesStageV2): Promise<MoveReport> => {
      const pending = cards.filter((card) => card.salesStageV2 !== to);
      if (pending.length === 0) return { moved: [], failed: [], message: null };

      const now = new Date().toISOString();
      for (const card of pending) dispatch({ type: 'moveStarted', epoch, card, to, now });

      const moved: DealCard[] = [];
      const failed: DealCard[] = [];
      let message: string | null = null;

      for (const card of pending) {
        try {
          const data = await client.mutate(DealSetStageDocument, { contactID: card.id, stage: to });
          dispatch({ type: 'moveSucceeded', id: card.id, patch: data.contactSetSalesStage });
          moved.push(card);
        } catch (err) {
          dispatch({ type: 'moveFailed', id: card.id, now: Date.now() });
          failed.push(card);
          message ??= messageOf(err);
        }
      }

      return { moved, failed, message };
    },
    [client, dispatch, epoch],
  );

  const moveDeal = useCallback((card: DealCard, to: SalesStageV2) => moveDeals([card], to), [moveDeals]);

  return { moveDeal, moveDeals };
}
