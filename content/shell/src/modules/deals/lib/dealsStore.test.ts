import { describe, expect, it } from 'vitest';
import { ContactAssigneeFilterType, SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealCard } from '../types';
import {
  dealsReducer,
  initialDealsState,
  selectColumns,
  selectSelectedCards,
  shouldAutoPage,
  type DealsAction,
  type DealsState,
  type LoadedPage,
} from './dealsStore';

const { New, Sorting, Ready, WorkingOn, Won, Lost } = SalesStageV2;
const ANY_VARS = { filter: { type: ContactAssigneeFilterType.Any }, fieldNames: ['deal amount'] };
const UNASSIGNED_VARS = {
  filter: { type: ContactAssigneeFilterType.Unassigned },
  fieldNames: ['deal amount'],
};

/** Fixed epoch — the reducer never reads the clock, so neither does the test. */
const BASE = Date.UTC(2026, 7, 11, 12, 0);
const iso = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();

const card = (id: string, stage: SalesStageV2 | null, minutesAgo = 0): DealCard => ({
  __typename: 'WidgetContact',
  id,
  name: id.toUpperCase(),
  profilePictureUrl: null,
  updatedAt: iso(minutesAgo),
  salesStageV2: stage,
  lastSalesStageUpdateTime: iso(minutesAgo),
  lastConversationMessageTime: iso(minutesAgo),
  unreadMessagesCount: 0,
  unhandledSwitchToHuman: false,
  note: null,
  assignee: null,
  conversation: null,
  attributes: [],
});

const page = (stage: SalesStageV2, nodes: DealCard[]): LoadedPage => ({
  stage,
  nodes,
  hasNext: false,
  endCursor: null,
});

const run = (state: DealsState, ...actions: DealsAction[]): DealsState => actions.reduce(dealsReducer, state);

/** New: a(1m) b(5m) · Won: c(2m), totals matching. */
const loaded = (): DealsState =>
  run(
    initialDealsState(ANY_VARS),
    {
      type: 'columnsLoaded',
      epoch: 0,
      pages: [page(New, [card('a', New, 1), card('b', New, 5)]), page(Won, [card('c', Won, 2)])],
    },
    {
      type: 'totalsLoaded',
      epoch: 0,
      totals: { [New]: 2, [Sorting]: 0, [Ready]: 0, [WorkingOn]: 0, [Won]: 1, [Lost]: 0 },
    },
  );

describe('epoch', () => {
  it('drops every request-shaped action issued under a spent epoch', () => {
    const state = run(loaded(), { type: 'reset', vars: UNASSIGNED_VARS });
    const stale: DealsAction[] = [
      { type: 'columnsLoaded', epoch: 0, pages: [page(New, [card('z', New)])] },
      { type: 'pageLoaded', epoch: 0, page: page(New, [card('z', New)]) },
      { type: 'totalsLoaded', epoch: 0, totals: state.totals },
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Ready, now: iso(0) },
      { type: 'failed', epoch: 0, message: 'stale' },
    ];
    for (const action of stale) expect(dealsReducer(state, action)).toBe(state);
  });

  it('reset takes the new vars, keeps byId as a cache, clears the board and pending', () => {
    const state = run(loaded(), {
      type: 'moveStarted',
      epoch: 0,
      card: card('a', New, 1),
      to: Ready,
      now: iso(0),
    });
    const next = dealsReducer(state, { type: 'reset', vars: UNASSIGNED_VARS });
    expect(next.epoch).toBe(1);
    expect(next.vars).toBe(UNASSIGNED_VARS);
    expect(next.byId.a).toBeDefined();
    expect(next.order[New]).toEqual([]);
    expect(next.pending).toEqual({});
    expect(next.loading).toBe(true);
  });
});

describe('loading', () => {
  it('columnsLoaded fills the cache, the orders and paging', () => {
    const state = loaded();
    expect(state.order[New]).toEqual(['a', 'b']);
    expect(state.order[Won]).toEqual(['c']);
    expect(state.byId.a!.name).toBe('A');
    expect(state.loading).toBe(false);
  });

  it('a refetch re-applies moves the server has not answered yet', () => {
    const moved = run(loaded(), {
      type: 'moveStarted',
      epoch: 0,
      card: card('a', New, 1),
      to: Ready,
      now: iso(0),
    });
    // The server still reports `a` in New — it has not processed the move.
    const next = dealsReducer(moved, {
      type: 'columnsLoaded',
      epoch: 0,
      pages: [page(New, [card('a', New, 1), card('b', New, 5)]), page(Ready, [])],
    });
    expect(next.order[New]).toEqual(['b']);
    expect(next.order[Ready]).toEqual(['a']);
  });

  it('pageLoaded appends in sort order and dedupes', () => {
    const next = dealsReducer(loaded(), {
      type: 'pageLoaded',
      epoch: 0,
      page: { stage: New, nodes: [card('x', New, 3), card('a', New, 1)], hasNext: true, endCursor: 'c9' },
    });
    expect(next.order[New]).toEqual(['a', 'x', 'b']);
    expect(next.paging[New]).toEqual({ hasNext: true, endCursor: 'c9', pages: 2, loading: false });
  });
});

describe('moveStarted', () => {
  it('moves the card, stamps the optimistic time and adjusts both totals', () => {
    const next = dealsReducer(loaded(), {
      type: 'moveStarted',
      epoch: 0,
      card: card('b', New, 5),
      to: Won,
      now: iso(0),
    });
    expect(next.order[New]).toEqual(['a']);
    expect(next.order[Won]).toEqual(['b', 'c']);
    expect(next.byId.b!.lastSalesStageUpdateTime).toBe(iso(0));
    expect(next.totals[New]).toBe(1);
    expect(next.totals[Won]).toBe(2);
    expect(next.pending.b).toEqual({ from: New, to: Won, prevTime: iso(5) });
  });

  it('a second drag before the first settles keeps the ORIGINAL rollback target', () => {
    const next = run(
      loaded(),
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Ready, now: iso(0) },
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Won, now: iso(0) },
    );
    expect(next.pending.a).toEqual({ from: New, to: Won, prevTime: iso(1) });
    expect(next.order[Ready]).toEqual([]);
    expect(next.totals[New]).toBe(1);
    expect(next.totals[Ready]).toBe(0);
    expect(next.totals[Won]).toBe(2);
  });

  it('a same-stage drop changes nothing', () => {
    const state = loaded();
    expect(dealsReducer(state, { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: New, now: iso(0) })).toBe(
      state,
    );
  });
});

describe('moveSucceeded', () => {
  it('clears pending and takes the position from the server sort key', () => {
    const next = run(
      loaded(),
      { type: 'moveStarted', epoch: 0, card: card('b', New, 5), to: Won, now: iso(0) },
      {
        type: 'moveSucceeded',
        id: 'b',
        patch: { salesStageV2: Won, lastSalesStageUpdateTime: iso(4), updatedAt: iso(4) },
      },
    );
    expect(next.pending).toEqual({});
    // iso(4) is older than c's iso(2), so the server put b below it.
    expect(next.order[Won]).toEqual(['c', 'b']);
    expect(next.byId.b!.lastSalesStageUpdateTime).toBe(iso(4));
  });
});

describe('moveFailed', () => {
  it('rolls back ONLY its own card', () => {
    const next = run(
      loaded(),
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Ready, now: iso(0) },
      { type: 'moveStarted', epoch: 0, card: card('b', New, 5), to: Won, now: iso(0) },
      {
        type: 'moveSucceeded',
        id: 'b',
        patch: { salesStageV2: Won, lastSalesStageUpdateTime: iso(0), updatedAt: iso(0) },
      },
      { type: 'liveBatch', updates: [{ action: 'Add', node: card('d', New, 0) }] },
      { type: 'moveFailed', id: 'a', now: 1 },
    );
    // a is back in New at its own sort position, below the newer d.
    expect(next.order[New]).toEqual(['d', 'a']);
    expect(next.byId.a!.salesStageV2).toBe(New);
    expect(next.byId.a!.lastSalesStageUpdateTime).toBe(iso(1));
    // The concurrent successful move and the live insert both survive.
    expect(next.order[Won]).toEqual(['b', 'c']);
    expect(next.order[Ready]).toEqual([]);
    expect(next.totals[New]).toBe(1);
    expect(next.totals[Ready]).toBe(0);
    expect(next.totals[Won]).toBe(2);
    expect(next.pending).toEqual({});
  });

  it('is a no-op without a pending patch', () => {
    const state = loaded();
    expect(dealsReducer(state, { type: 'moveFailed', id: 'a', now: 1 })).toBe(state);
  });
});

describe('liveBatch', () => {
  it('routes Add, re-routes Update across columns and drops Remove everywhere', () => {
    const next = dealsReducer(loaded(), {
      type: 'liveBatch',
      updates: [
        { action: 'Add', node: card('d', Won, 0) },
        { action: 'Update', node: card('a', Won, 3) },
        { action: 'Remove', node: card('b', New, 5) },
      ],
    });
    expect(next.order[New]).toEqual([]);
    expect(next.order[Won]).toEqual(['d', 'c', 'a']);
    expect(next.byId.b).toBeUndefined();
  });

  it('a null stage clears the card from the board', () => {
    const next = dealsReducer(loaded(), {
      type: 'liveBatch',
      updates: [{ action: 'Update', node: card('a', null, 0) }],
    });
    expect(next.order[New]).toEqual(['b']);
  });

  it('patches a pending card but does not let the echo move it back', () => {
    const next = run(
      loaded(),
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Ready, now: iso(0) },
      // The server has not processed the move yet, so its echo still says New.
      {
        type: 'liveBatch',
        updates: [{ action: 'Update', node: { ...card('a', New, 1), unreadMessagesCount: 7 } }],
      },
    );
    expect(next.order[Ready]).toEqual(['a']);
    expect(next.order[New]).toEqual(['b']);
    expect(next.byId.a!.unreadMessagesCount).toBe(7);
    expect(next.byId.a!.salesStageV2).toBe(Ready);
    expect(next.byId.a!.lastSalesStageUpdateTime).toBe(iso(0));
  });

  it('is ignored while a load is in flight — the load supersedes it', () => {
    const state = run(loaded(), { type: 'reset', vars: UNASSIGNED_VARS });
    expect(state.loading).toBe(true);
    expect(dealsReducer(state, { type: 'liveBatch', updates: [{ action: 'Add', node: card('z', New) }] })).toBe(state);
  });

  it('Remove clears the pending patch with the card', () => {
    const next = run(
      loaded(),
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Ready, now: iso(0) },
      { type: 'liveBatch', updates: [{ action: 'Remove', node: card('a', Ready, 0) }] },
    );
    expect(next.pending).toEqual({});
    expect(next.order[Ready]).toEqual([]);
    expect(dealsReducer(next, { type: 'moveFailed', id: 'a', now: 1 })).toBe(next);
  });
});

describe('purity', () => {
  it('does not mutate the previous state and is deterministic (StrictMode runs it twice)', () => {
    const state = loaded();
    const before = JSON.stringify(state);
    const action: DealsAction = {
      type: 'moveStarted',
      epoch: 0,
      card: card('a', New, 1),
      to: Ready,
      now: iso(0),
    };
    const first = dealsReducer(state, action);
    const second = dealsReducer(state, action);
    expect(JSON.stringify(state)).toBe(before);
    expect(first).toEqual(second);
  });
});

describe('selectColumns', () => {
  it('rebuilds the shape the components consume', () => {
    const columns = selectColumns(loaded());
    expect(columns[New].cards.map((each) => each.id)).toEqual(['a', 'b']);
    expect(columns[New].total).toBe(2);
    expect(columns[Won].cards.map((each) => each.id)).toEqual(['c']);
    expect(columns[Sorting]).toEqual({
      cards: [],
      total: 0,
      hasNext: false,
      endCursor: null,
      // This column never got a response in this case, so it has no pages.
      pages: 0,
      loadingMore: false,
    });
  });

  it('skips an id with no record rather than rendering a hole', () => {
    const state = loaded();
    const orphaned: DealsState = { ...state, order: { ...state.order, [New]: ['a', 'ghost'] } };
    expect(selectColumns(orphaned)[New].cards.map((each) => each.id)).toEqual(['a']);
  });
});

describe('paging state', () => {
  const withNext = (state: DealsState): DealsState =>
    run(state, {
      type: 'columnsLoaded',
      epoch: state.epoch,
      pages: [{ stage: New, nodes: [card('a', New, 1)], hasNext: true, endCursor: 'c1' }],
    });

  it('counts pages from the first load, so the auto-page cap includes it', () => {
    const state = withNext(initialDealsState(ANY_VARS));
    expect(state.paging[New].pages).toBe(1);
    expect(state.paging[New].loading).toBe(false);
  });

  it('pageRequested marks the column busy, and a second one is a no-op', () => {
    const first = run(withNext(initialDealsState(ANY_VARS)), {
      type: 'pageRequested',
      epoch: 0,
      stage: New,
    });
    expect(first.paging[New].loading).toBe(true);
    expect(dealsReducer(first, { type: 'pageRequested', epoch: 0, stage: New })).toBe(first);
  });

  it('refuses to request a page for a column with nothing more to fetch', () => {
    const state = loaded(); // hasNext false everywhere
    expect(dealsReducer(state, { type: 'pageRequested', epoch: 0, stage: New })).toBe(state);
  });

  it('pageLoaded increments the count and clears the busy flag', () => {
    const state = run(
      withNext(initialDealsState(ANY_VARS)),
      { type: 'pageRequested', epoch: 0, stage: New },
      {
        type: 'pageLoaded',
        epoch: 0,
        page: { stage: New, nodes: [card('b', New, 5)], hasNext: true, endCursor: 'c2' },
      },
    );
    expect(state.paging[New]).toMatchObject({ pages: 2, loading: false, endCursor: 'c2' });
  });

  it('shouldAutoPage stops at the cap, while loading, and with no next page', () => {
    let state = withNext(initialDealsState(ANY_VARS));
    expect(shouldAutoPage(state, New, 3)).toBe(true);
    expect(shouldAutoPage(state, Won, 3)).toBe(false); // hasNext false

    state = run(state, { type: 'pageRequested', epoch: 0, stage: New });
    expect(shouldAutoPage(state, New, 3)).toBe(false); // in flight

    state = run(
      state,
      { type: 'pageLoaded', epoch: 0, page: { stage: New, nodes: [], hasNext: true, endCursor: 'c2' } },
      { type: 'pageRequested', epoch: 0, stage: New },
      { type: 'pageLoaded', epoch: 0, page: { stage: New, nodes: [], hasNext: true, endCursor: 'c3' } },
    );
    expect(state.paging[New].pages).toBe(3);
    expect(shouldAutoPage(state, New, 3)).toBe(false); // at the cap
  });

  it('reset zeroes the page count and the busy flag', () => {
    const state = run(
      withNext(initialDealsState(ANY_VARS)),
      { type: 'pageRequested', epoch: 0, stage: New },
      { type: 'reset', vars: ANY_VARS },
    );
    expect(state.paging[New]).toMatchObject({ pages: 0, loading: false, hasNext: false });
  });
});

describe('flash', () => {
  const failing = (): DealsState =>
    run(loaded(), { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Won, now: iso(0) });

  it('stamps exactly the card that rolled back', () => {
    const state = run(failing(), { type: 'moveFailed', id: 'a', now: 111 });
    expect(state.flash).toEqual({ a: 111 });
  });

  it('flashCleared removes only that id, and a second failure re-stamps', () => {
    let state = run(failing(), { type: 'moveFailed', id: 'a', now: 111 });
    state = run(state, { type: 'flashCleared', id: 'a' });
    expect(state.flash).toEqual({});
    // Clearing an id that is not flashing is a no-op, not a new object.
    expect(dealsReducer(state, { type: 'flashCleared', id: 'a' })).toBe(state);

    state = run(
      state,
      { type: 'moveStarted', epoch: 0, card: card('a', New, 1), to: Won, now: iso(0) },
      { type: 'moveFailed', id: 'a', now: 222 },
    );
    expect(state.flash).toEqual({ a: 222 });
  });

  it('reset clears every flash', () => {
    const state = run(failing(), { type: 'moveFailed', id: 'a', now: 111 }, { type: 'reset', vars: ANY_VARS });
    expect(state.flash).toEqual({});
  });
});

describe('selection', () => {
  it('toggles on and off', () => {
    let state = run(loaded(), { type: 'selectionToggled', id: 'a' });
    expect(state.selection).toEqual(['a']);
    state = run(state, { type: 'selectionToggled', id: 'b' }, { type: 'selectionToggled', id: 'a' });
    expect(state.selection).toEqual(['b']);
  });

  it('selectionSet replaces, selectionCleared empties and is a no-op when already empty', () => {
    const state = run(loaded(), { type: 'selectionSet', ids: ['a', 'c'] });
    expect(state.selection).toEqual(['a', 'c']);
    const cleared = run(state, { type: 'selectionCleared' });
    expect(cleared.selection).toEqual([]);
    expect(dealsReducer(cleared, { type: 'selectionCleared' })).toBe(cleared);
  });

  it('a subscription Remove prunes the id — the reason selection lives in the reducer', () => {
    const state = run(
      loaded(),
      { type: 'selectionSet', ids: ['a', 'b'] },
      { type: 'liveBatch', updates: [{ action: 'Remove', node: card('a', New, 1) }] },
    );
    // Firing a mutation against a contact the server has already retired fails
    // for a reason nobody can see.
    expect(state.selection).toEqual(['b']);
  });

  it('reset clears the selection', () => {
    const state = run(loaded(), { type: 'selectionSet', ids: ['a'] }, { type: 'reset', vars: ANY_VARS });
    expect(state.selection).toEqual([]);
  });

  it('selectSelectedCards returns them in board order and skips retired ids', () => {
    const state = run(loaded(), { type: 'selectionSet', ids: ['c', 'gone', 'b'] });
    expect(selectSelectedCards(state).map((c) => c.id)).toEqual(['b', 'c']);
  });
});
