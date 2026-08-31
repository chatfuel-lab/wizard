import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/deals/graphql';
import { isUndoExpired, isUndoable, undoEntryFor, undoLabel, undoMoves, UNDO_TTL_MS } from './undo';

const moved = (id: string, from: SalesStageV2) => ({ id, from });

describe('undoEntryFor', () => {
  it('records where each card came from', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.New), moved('b', SalesStageV2.Ready)], SalesStageV2.Won, 1000);
    expect(entry).toEqual({
      ids: ['a', 'b'],
      from: { a: SalesStageV2.New, b: SalesStageV2.Ready },
      to: SalesStageV2.Won,
      at: 1000,
    });
  });

  it('returns null for an empty batch rather than an entry that does nothing', () => {
    expect(undoEntryFor([], SalesStageV2.Won, 0)).toBeNull();
  });

  it('keeps the FIRST origin when an id repeats', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.New), moved('a', SalesStageV2.Sorting)], SalesStageV2.Won, 0);
    expect(entry?.ids).toEqual(['a']);
    expect(entry?.from.a).toBe(SalesStageV2.New);
  });
});

describe('undoMoves', () => {
  it('sends each card back to its own stage', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.New), moved('b', SalesStageV2.Ready)], SalesStageV2.Won, 0)!;
    expect(undoMoves(entry)).toEqual([
      { id: 'a', to: SalesStageV2.New },
      { id: 'b', to: SalesStageV2.Ready },
    ]);
  });

  it('drops a card that was already in the target — undoing it is a no-op that still costs a write', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.Won), moved('b', SalesStageV2.New)], SalesStageV2.Won, 0)!;
    expect(undoMoves(entry)).toEqual([{ id: 'b', to: SalesStageV2.New }]);
    expect(isUndoable(entry)).toBe(true);
  });

  it('is not undoable when every card was already there', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.Won)], SalesStageV2.Won, 0)!;
    expect(undoMoves(entry)).toEqual([]);
    expect(isUndoable(entry)).toBe(false);
  });
});

describe('undoLabel', () => {
  it('names the destination for one card and the count for several', () => {
    const one = undoEntryFor([moved('a', SalesStageV2.New)], SalesStageV2.Won, 0)!;
    expect(undoLabel(one)).toBe('Undo move to Won');

    const many = undoEntryFor(
      [moved('a', SalesStageV2.New), moved('b', SalesStageV2.Ready), moved('c', SalesStageV2.New)],
      SalesStageV2.Lost,
      0,
    )!;
    expect(undoLabel(many)).toBe('Undo 3 moves');
  });

  it('counts only the cards that would actually move', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.Won), moved('b', SalesStageV2.New)], SalesStageV2.Won, 0)!;
    expect(undoLabel(entry)).toBe('Undo move to Won');
  });
});

describe('isUndoExpired', () => {
  it('expires exactly at the TTL, not before', () => {
    const entry = undoEntryFor([moved('a', SalesStageV2.New)], SalesStageV2.Won, 0)!;
    expect(isUndoExpired(entry, UNDO_TTL_MS)).toBe(false);
    expect(isUndoExpired(entry, UNDO_TTL_MS + 1)).toBe(true);
  });
});
