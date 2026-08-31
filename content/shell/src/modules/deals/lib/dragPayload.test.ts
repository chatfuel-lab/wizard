import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealCard } from '../types';
import { isRestricted, movesFor, payloadFor, pruneSelection } from './dragPayload';

const card = (id: string, stage: SalesStageV2, minutesAgo = 0, typename = 'WidgetContact') =>
  ({
    __typename: typename,
    id,
    name: id,
    salesStageV2: stage,
    lastSalesStageUpdateTime: new Date(Date.parse('2026-08-13T12:00:00Z') - minutesAgo * 60_000).toISOString(),
  }) as unknown as DealCard;

const board = (...cards: DealCard[]): Record<string, DealCard> => Object.fromEntries(cards.map((c) => [c.id, c]));

const byId = board(
  card('a', SalesStageV2.New, 10),
  card('b', SalesStageV2.New, 5),
  card('c', SalesStageV2.Won, 1),
  card('r', SalesStageV2.New, 3, 'UnavailableContact'),
);

describe('payloadFor', () => {
  it('drags only the card under the pointer when it is not selected', () => {
    expect(payloadFor('a', ['b', 'c'], byId)).toEqual({ leadId: 'a', ids: ['a'] });
  });

  it('drags the whole selection when the grabbed card is part of it', () => {
    expect(payloadFor('b', ['a', 'b'], byId)).toEqual({ leadId: 'b', ids: ['b', 'a'] });
  });

  it('puts the grabbed card first — the ghost renders the lead', () => {
    expect(payloadFor('a', ['a', 'b', 'c'], byId)?.ids[0]).toBe('a');
  });

  it('refuses to drag a restricted contact at all', () => {
    expect(payloadFor('r', [], byId)).toBeNull();
    expect(payloadFor('r', ['r', 'a'], byId)).toBeNull();
  });

  it('never carries a restricted contact along with a selection', () => {
    expect(payloadFor('a', ['a', 'r', 'b'], byId)?.ids).toEqual(['a', 'b']);
  });

  it('drops selected ids the board no longer holds', () => {
    expect(payloadFor('a', ['a', 'gone'], byId)?.ids).toEqual(['a']);
  });

  it('returns null for a card that is not on the board', () => {
    expect(payloadFor('gone', [], byId)).toBeNull();
  });
});

describe('movesFor', () => {
  it('drops cards already in the target stage', () => {
    const moves = movesFor({ leadId: 'a', ids: ['a', 'c'] }, SalesStageV2.Won, byId);
    expect(moves.map((m) => m.id)).toEqual(['a']);
  });

  it('yields NOTHING for an all-same-column drop — that is what makes it a cancel', () => {
    expect(movesFor({ leadId: 'a', ids: ['a', 'b'] }, SalesStageV2.New, byId)).toEqual([]);
  });

  it('orders most recently moved first, so the topmost card mutates first', () => {
    const moves = movesFor({ leadId: 'a', ids: ['a', 'b'] }, SalesStageV2.Won, byId);
    expect(moves.map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('skips ids the board no longer holds instead of crashing', () => {
    const moves = movesFor({ leadId: 'a', ids: ['a', 'gone'] }, SalesStageV2.Won, byId);
    expect(moves.map((m) => m.id)).toEqual(['a']);
  });

  it('never issues a mutation for a restricted contact', () => {
    expect(movesFor({ leadId: 'r', ids: ['r'] }, SalesStageV2.Won, byId)).toEqual([]);
  });
});

describe('pruneSelection / isRestricted', () => {
  it('drops retired and restricted ids', () => {
    expect(pruneSelection(['a', 'gone', 'r', 'b'], byId)).toEqual(['a', 'b']);
  });

  it('recognises the restricted typename', () => {
    expect(isRestricted(byId.r)).toBe(true);
    expect(isRestricted(byId.a)).toBe(false);
    expect(isRestricted(undefined)).toBe(false);
  });
});
