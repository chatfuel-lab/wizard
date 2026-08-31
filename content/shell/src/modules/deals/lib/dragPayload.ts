import type { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealCard } from '../types';

/**
 * What a drag actually carries, and which moves it turns into.
 *
 * Three rules live here rather than in a component, because each of them is a
 * behaviour people notice and none of them can be tested through the DOM in a
 * node-only vitest setup.
 */

export interface DragPayload {
  /** The card under the pointer — the one the ghost renders. */
  leadId: string;
  /** Everything being moved, lead first. */
  ids: string[];
}

/** Restricted contacts render as a locked placeholder: no drag, no selection, no mutation. */
export function isRestricted(card: Pick<DealCard, '__typename'> | undefined): boolean {
  return card?.__typename === 'UnavailableContact';
}

const timeOf = (card: DealCard | undefined): number => {
  const parsed = card?.lastSalesStageUpdateTime ? Date.parse(card.lastSalesStageUpdateTime) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Dragging a card that is part of the selection moves the whole selection;
 * dragging one outside it moves only that card. That is the convention in every
 * file manager and every board people already use — deviating from it loses
 * work silently.
 */
export function payloadFor(
  cardId: string,
  selection: readonly string[],
  byId: Readonly<Record<string, DealCard>>,
): DragPayload | null {
  if (byId[cardId] === undefined || isRestricted(byId[cardId])) return null;
  if (!selection.includes(cardId)) return { leadId: cardId, ids: [cardId] };
  const rest = pruneSelection(selection, byId).filter((id) => id !== cardId);
  return { leadId: cardId, ids: [cardId, ...rest] };
}

/**
 * The moves to actually issue.
 *
 * A card already in the target stage produces nothing — so an all-same-column
 * drop yields an empty list, and **that empty list is what makes a same-column
 * drop a cancel rather than a reorder.** Within-column order cannot be
 * persisted at all: the board's sort is fixed to `lastSalesStageUpdateTime`
 * desc server-side and `contactDealsConnection` has no `orderBy`.
 *
 * Ordered most-recently-moved first, so the visually topmost card is mutated
 * first and a partial failure is legible rather than arbitrary.
 */
export function movesFor(payload: DragPayload, to: SalesStageV2, byId: Readonly<Record<string, DealCard>>): DealCard[] {
  return payload.ids
    .map((id) => byId[id])
    .filter((card): card is DealCard => card !== undefined)
    .filter((card) => !isRestricted(card) && card.salesStageV2 !== to)
    .sort((a, b) => timeOf(b) - timeOf(a));
}

/** Drop ids the board no longer holds — a subscription `Remove` can retire a selected card. */
export function pruneSelection(selection: readonly string[], byId: Readonly<Record<string, DealCard>>): string[] {
  return selection.filter((id) => byId[id] !== undefined && !isRestricted(byId[id]));
}
