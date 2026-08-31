import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, SalesStageV2 } from '~api/generated/deals/graphql';
import type { DealsTableRow } from '../types';
import { EMPTY_FILTER, type AttrPredicate } from './dealsFilter';
import { planQuery } from './queryPlan';
import { STAGES } from './stages';
import {
  AUTO_PAGE_CAP,
  addPredicate,
  adoptPredicates,
  beyondWindow,
  canAutoPage,
  dealsTableReducer,
  initialTableState,
  needsManualPage,
  nextPredicateId,
  removePredicate,
  selectCaveats,
  selectRows,
  selectSelectedRows,
  timeOfRow,
  toggleStage,
  updatePredicate,
  type DealsTableAction,
  type DealsTableState,
} from './dealsTableStore';

const CHATS_PLAN = planQuery({ filter: EMPTY_FILTER, fieldNames: ['deal amount'] });
const SEGMENT_PLAN = planQuery({
  filter: {
    ...EMPTY_FILTER,
    predicates: [{ id: 'p1', name: 'deal amount', operator: AttrFilterDefaultOperator.Is, values: ['1000'] }],
    stages: [SalesStageV2.Won],
  },
  fieldNames: ['deal amount'],
});

const at = (minutes: number) => new Date(Date.UTC(2026, 7, 13, 12, 0) - minutes * 60_000).toISOString();

const row = (id: string, minutesAgo: number, over: Partial<DealsTableRow> = {}): DealsTableRow =>
  ({
    __typename: 'WidgetContact',
    id,
    name: `Row ${id}`,
    profilePictureUrl: null,
    updatedAt: at(minutesAgo),
    salesStageV2: SalesStageV2.New,
    lastSalesStageUpdateTime: at(minutesAgo),
    lastConversationMessageTime: at(minutesAgo),
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    note: null,
    assignee: null,
    conversation: null,
    attributes: [],
    ...over,
  }) as DealsTableRow;

const run = (state: DealsTableState, ...actions: DealsTableAction[]): DealsTableState =>
  actions.reduce(dealsTableReducer, state);

const loaded = (
  rows: DealsTableRow[],
  over: { hasNext?: boolean; endCursor?: string | null; append?: boolean } = {},
): DealsTableAction => ({
  type: 'pageLoaded',
  epoch: 0,
  append: over.append ?? false,
  page: {
    nodes: rows,
    hasNext: over.hasNext ?? false,
    endCursor: over.endCursor ?? rows.at(-1)?.id ?? null,
  },
});

const ids = (state: DealsTableState) => selectRows(state).map((each) => each.id);

describe('loading', () => {
  it('takes the server’s order as the list, newest first', () => {
    const state = run(initialTableState(CHATS_PLAN), loaded([row('a', 1), row('b', 10)]));
    expect(ids(state)).toEqual(['a', 'b']);
    expect(state.loading).toBe(false);
  });

  it('appends the next page and dedupes an id that arrived live in between', () => {
    const state = run(
      initialTableState(CHATS_PLAN),
      loaded([row('a', 1), row('b', 10)], { hasNext: true }),
      loaded([row('b', 10), row('c', 20)], { append: true }),
    );
    expect(ids(state)).toEqual(['a', 'b', 'c']);
    expect(state.pages).toBe(1);
  });

  it('drops a response issued under a filter that has since changed', () => {
    const state = run(initialTableState(CHATS_PLAN), { type: 'reset', plan: SEGMENT_PLAN }, loaded([row('a', 1)]));
    expect(ids(state)).toEqual([]);
    expect(state.loading).toBe(true);
  });

  it('a reset keeps the record cache but not the list', () => {
    const state = run(initialTableState(CHATS_PLAN), loaded([row('a', 1)]), { type: 'reset', plan: CHATS_PLAN });
    expect(state.order).toEqual([]);
    expect(state.byId.a).toBeDefined();
  });
});

describe('paging cap', () => {
  const paged = (pages: number): DealsTableState => ({
    ...initialTableState(CHATS_PLAN),
    loading: false,
    hasNext: true,
    pages,
  });

  it('lets the sentinel page until the cap, then hands over to a button', () => {
    expect(canAutoPage(paged(0))).toBe(true);
    expect(canAutoPage(paged(AUTO_PAGE_CAP - 1))).toBe(true);
    expect(canAutoPage(paged(AUTO_PAGE_CAP))).toBe(false);
    expect(needsManualPage(paged(AUTO_PAGE_CAP))).toBe(true);
    expect(needsManualPage(paged(0))).toBe(false);
  });

  it('never pages while a request is already in flight', () => {
    expect(canAutoPage({ ...paged(0), loadingMore: true })).toBe(false);
    expect(canAutoPage({ ...paged(0), loading: true })).toBe(false);
  });

  it('never pages past the end', () => {
    expect(canAutoPage({ ...paged(0), hasNext: false })).toBe(false);
  });
});

describe('live merge', () => {
  const base = run(initialTableState(CHATS_PLAN), loaded([row('a', 1), row('b', 10), row('c', 20)]));

  it('inserts an Add at its place in lastConversationMessageTime order', () => {
    const state = dealsTableReducer(base, {
      type: 'liveBatch',
      updates: [{ action: 'Add', node: row('new', 5) }],
    });
    expect(ids(state)).toEqual(['a', 'new', 'b', 'c']);
  });

  it('re-sorts an Update whose conversation time moved', () => {
    const state = dealsTableReducer(base, {
      type: 'liveBatch',
      updates: [{ action: 'Update', node: row('c', 0) }],
    });
    expect(ids(state)).toEqual(['c', 'a', 'b']);
  });

  it('drops a Remove from the list and the cache', () => {
    const state = dealsTableReducer(base, {
      type: 'liveBatch',
      updates: [{ action: 'Remove', node: row('b', 10) }],
    });
    expect(ids(state)).toEqual(['a', 'c']);
    expect(state.byId.b).toBeUndefined();
  });

  it('caches but does not show a row that belongs to a page not fetched yet', () => {
    const partial = run(initialTableState(CHATS_PLAN), loaded([row('a', 1), row('b', 10)], { hasNext: true }));
    const state = dealsTableReducer(partial, {
      type: 'liveBatch',
      updates: [{ action: 'Add', node: row('old', 900) }],
    });
    expect(ids(state)).toEqual(['a', 'b']);
    expect(state.byId.old).toBeDefined();
    expect(beyondWindow(state.order, 'old', (id) => timeOfRow(state.byId[id]), true)).toBe(true);
  });

  it('is ignored while a full load is in flight — the load supersedes it', () => {
    const state = dealsTableReducer(initialTableState(CHATS_PLAN), {
      type: 'liveBatch',
      updates: [{ action: 'Add', node: row('a', 1) }],
    });
    expect(state.order).toEqual([]);
  });

  it('is ignored under engine C, which has no subscription to trust', () => {
    const segment = run(initialTableState(SEGMENT_PLAN), {
      type: 'pageLoaded',
      epoch: 0,
      append: false,
      page: { nodes: [], hasNext: false, endCursor: null },
    });
    const state = dealsTableReducer(segment, {
      type: 'liveBatch',
      updates: [{ action: 'Add', node: row('a', 1) }],
    });
    expect(state).toBe(segment);
  });
});

describe('inline stage change', () => {
  const base = run(initialTableState(CHATS_PLAN), loaded([row('a', 1), row('b', 10)]), {
    type: 'totalsLoaded',
    epoch: 0,
    totals: {
      [SalesStageV2.New]: 2,
      [SalesStageV2.Sorting]: 0,
      [SalesStageV2.Ready]: 0,
      [SalesStageV2.WorkingOn]: 0,
      [SalesStageV2.Won]: 5,
      [SalesStageV2.Lost]: 0,
    },
  });
  const started: DealsTableAction = {
    type: 'stageChangeStarted',
    epoch: 0,
    id: 'a',
    to: SalesStageV2.Won,
    now: at(0),
  };

  it('shows the new stage at once and moves the totals with it', () => {
    const state = dealsTableReducer(base, started);
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.Won);
    expect(state.totals?.[SalesStageV2.New]).toBe(1);
    expect(state.totals?.[SalesStageV2.Won]).toBe(6);
    expect(state.pending.a).toEqual({ from: SalesStageV2.New, to: SalesStageV2.Won });
  });

  it('keeps the row in place — the table sorts by conversation time, which a stage does not touch', () => {
    expect(ids(dealsTableReducer(base, started))).toEqual(['a', 'b']);
  });

  it('rolls back exactly that row, leaving another in-flight change alone', () => {
    const state = run(
      base,
      started,
      { type: 'stageChangeStarted', epoch: 0, id: 'b', to: SalesStageV2.Lost, now: at(0) },
      { type: 'stageChangeFailed', id: 'a' },
    );
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.New);
    expect(state.byId.b?.salesStageV2).toBe(SalesStageV2.Lost);
    // Both left New; only a's ±1 came back, and b's move to Lost is untouched.
    expect(state.totals?.[SalesStageV2.New]).toBe(1);
    expect(state.totals?.[SalesStageV2.Won]).toBe(5);
    expect(state.totals?.[SalesStageV2.Lost]).toBe(1);
    expect(state.pending.a).toBeUndefined();
    expect(state.pending.b).toBeDefined();
  });

  it('rolls back to the FIRST stage after two changes, never to an intermediate one', () => {
    const state = run(
      base,
      started,
      { type: 'stageChangeStarted', epoch: 0, id: 'a', to: SalesStageV2.Lost, now: at(0) },
      { type: 'stageChangeFailed', id: 'a' },
    );
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.New);
  });

  it('takes the server’s answer as final', () => {
    const state = run(base, started, {
      type: 'stageChangeSucceeded',
      id: 'a',
      patch: {
        salesStageV2: SalesStageV2.WorkingOn,
        lastSalesStageUpdateTime: at(0),
        updatedAt: at(0),
      },
    });
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.WorkingOn);
    expect(state.pending.a).toBeUndefined();
  });

  it('survives a refetch that lands before the mutation answers', () => {
    const state = run(base, started, loaded([row('a', 1), row('b', 10)]));
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.Won);
  });

  it('keeps its optimistic stage when the subscription echoes the old one', () => {
    const state = run(base, started, {
      type: 'liveBatch',
      updates: [{ action: 'Update', node: row('a', 1) }],
    });
    expect(state.byId.a?.salesStageV2).toBe(SalesStageV2.Won);
  });
});

describe('selection', () => {
  const base = run(
    initialTableState(CHATS_PLAN),
    loaded([row('a', 1), row('b', 10), row('locked', 20, { __typename: 'UnavailableContact' })]),
  );
  const select = (state: DealsTableState, ...ids: string[]): DealsTableState =>
    dealsTableReducer(state, { type: 'selectionSet', ids });

  it('takes the ids it is given, in the order it is given them', () => {
    expect(select(base, 'b', 'a').selection).toEqual(['b', 'a']);
  });

  it('never selects a restricted contact, whichever path set it', () => {
    expect(select(base, 'a', 'locked').selection).toEqual(['a']);
  });

  it('drops an id the table does not hold', () => {
    expect(select(base, 'a', 'ghost').selection).toEqual(['a']);
  });

  it('keeps state identity when nothing about the selection changed', () => {
    const selected = select(base, 'a');
    expect(select(selected, 'a')).toBe(selected);
    expect(dealsTableReducer(base, { type: 'selectionCleared' })).toBe(base);
  });

  it('clears on demand', () => {
    expect(dealsTableReducer(select(base, 'a'), { type: 'selectionCleared' }).selection).toEqual([]);
  });

  /* The whole reason the selection lives in the reducer: a mutation fired at an
   * id the server has already retired fails with nothing on screen to explain it. */
  it('prunes an id the subscription removed', () => {
    const state = dealsTableReducer(select(base, 'a', 'b'), {
      type: 'liveBatch',
      updates: [{ action: 'Remove', node: row('b', 10) }],
    });
    expect(state.selection).toEqual(['a']);
  });

  it('leaves the selection alone when a live batch only updates rows', () => {
    const selected = select(base, 'a', 'b');
    const state = dealsTableReducer(selected, {
      type: 'liveBatch',
      updates: [{ action: 'Update', node: row('b', 0) }],
    });
    expect(state.selection).toBe(selected.selection);
  });

  it('is dropped by a reset: the rows it named are about to be replaced', () => {
    expect(run(select(base, 'a'), { type: 'reset', plan: CHATS_PLAN }).selection).toEqual([]);
  });

  it('reads back as rows in display order, not in click order', () => {
    expect(selectSelectedRows(select(base, 'b', 'a')).map((each) => each.id)).toEqual(['a', 'b']);
    expect(selectSelectedRows(base)).toEqual([]);
  });

  it('hides a selected row the client-side filters are hiding', () => {
    const segment = run(
      initialTableState(SEGMENT_PLAN),
      loaded([row('won', 1, { salesStageV2: SalesStageV2.Won }), row('new', 2, { salesStageV2: SalesStageV2.New })]),
    );
    const selected = dealsTableReducer(segment, { type: 'selectionSet', ids: ['won', 'new'] });
    expect(selected.selection).toEqual(['won', 'new']);
    expect(selectSelectedRows(selected).map((each) => each.id)).toEqual(['won']);
  });
});

describe('client-side filters and caveats', () => {
  it('hides rows the segment engine could not narrow', () => {
    const state = run(
      initialTableState(SEGMENT_PLAN),
      loaded([
        row('won', 1, { salesStageV2: SalesStageV2.Won }),
        row('new', 2, { salesStageV2: SalesStageV2.New }),
        row('none', 3, { salesStageV2: null }),
      ]),
    );
    expect(ids(state)).toEqual(['won']);
  });

  it('appends the measured gap to the plan’s own caveats, and only then', () => {
    const state = run(
      initialTableState(CHATS_PLAN),
      loaded([row('a', 1)]),
      { type: 'countLoaded', epoch: 0, count: 118 },
      {
        type: 'totalsLoaded',
        epoch: 0,
        totals: {
          [SalesStageV2.New]: 100,
          [SalesStageV2.Sorting]: 10,
          [SalesStageV2.Ready]: 6,
          [SalesStageV2.WorkingOn]: 4,
          [SalesStageV2.Won]: 3,
          [SalesStageV2.Lost]: 1,
        },
      },
    );
    expect(selectCaveats(state).map((caveat) => caveat.text)).toEqual([
      'Showing 118 of 124 deals; 6 have no conversation.',
    ]);
  });

  it('says nothing while the totals have not landed', () => {
    const state = run(initialTableState(CHATS_PLAN), loaded([row('a', 1)]), {
      type: 'countLoaded',
      epoch: 0,
      count: 118,
    });
    expect(selectCaveats(state)).toEqual([]);
  });
});

describe('errors', () => {
  it('stops both spinners and clears on demand', () => {
    const failed = run(initialTableState(CHATS_PLAN), {
      type: 'failed',
      epoch: 0,
      message: 'nope',
    });
    expect(failed).toMatchObject({ loading: false, loadingMore: false, error: 'nope' });
    expect(dealsTableReducer(failed, { type: 'errorCleared' }).error).toBeNull();
  });

  it('ignores a failure from a superseded request', () => {
    const state = run(
      initialTableState(CHATS_PLAN),
      { type: 'reset', plan: CHATS_PLAN },
      {
        type: 'failed',
        epoch: 0,
        message: 'stale',
      },
    );
    expect(state.error).toBeNull();
  });
});

describe('toolbar edits', () => {
  it('toggles a stage and keeps the canonical order', () => {
    expect(toggleStage([SalesStageV2.Won], SalesStageV2.New, STAGES)).toEqual([SalesStageV2.New, SalesStageV2.Won]);
    expect(toggleStage([SalesStageV2.New, SalesStageV2.Won], SalesStageV2.Won, STAGES)).toEqual([SalesStageV2.New]);
  });

  it('collapses "all six selected" to the empty set, which means the same thing', () => {
    const five = STAGES.filter((stage) => stage !== SalesStageV2.Lost);
    expect(toggleStage(five, SalesStageV2.Lost, STAGES)).toEqual([]);
  });

  it('gives a new predicate the smallest unused id, so its FilterID is deterministic', () => {
    const list: AttrPredicate[] = [
      { id: 'p1', name: 'a', operator: AttrFilterDefaultOperator.Is, values: ['1'] },
      { id: 'p3', name: 'b', operator: AttrFilterDefaultOperator.Is, values: ['1'] },
    ];
    expect(nextPredicateId(list)).toBe('p2');
    const added = addPredicate(list, {
      name: 'c',
      operator: AttrFilterDefaultOperator.Is,
      values: [],
    });
    expect(added.map((each) => each.id)).toEqual(['p1', 'p3', 'p2']);
  });

  it('updates and removes by id', () => {
    const list = addPredicate([], {
      name: 'deal amount',
      operator: AttrFilterDefaultOperator.Is,
      values: [],
    });
    expect(updatePredicate(list, 'p1', { values: ['5'] })[0]?.values).toEqual(['5']);
    expect(removePredicate(list, 'p1')).toEqual([]);
    expect(removePredicate(list, 'nope')).toEqual(list);
  });

  it('keeps local predicates against the empty list the URL always hands back', () => {
    const local = addPredicate([], {
      name: 'deal amount',
      operator: AttrFilterDefaultOperator.Is,
      values: ['1'],
    });
    expect(adoptPredicates(local, [])).toBe(local);
    expect(adoptPredicates(local, local)).toBe(local);
  });

  it('adopts a non-empty list — the only source of one is a saved view', () => {
    const incoming: AttrPredicate[] = [
      { id: 'p9', name: 'deal company', operator: AttrFilterDefaultOperator.Is, values: ['Acme'] },
    ];
    expect(adoptPredicates([], incoming)).toEqual(incoming);
  });
});
