import { describe, expect, it } from 'vitest';
import { ContactListUpdateAction, Platform, SalesStageV2 } from '~api/generated/contacts/graphql';
import type { ContactRow } from '../types';
import { EMPTY_FILTER } from './contactsFilter';
import { planQuery } from './queryPlan';
import {
  ARRIVED_MS,
  AUTO_PAGE_CAP,
  applyClientFilters,
  canAutoPage,
  contactsReducer,
  initialState,
  needsManualPage,
  selectCounts,
  selectRows,
  selectSelectedRows,
  type ContactsAction,
  type ContactsState,
} from './contactsStore';

const PLAN = planQuery({ filter: EMPTY_FILTER, attrNames: [] });

const row = (id: string, patch: Partial<ContactRow> = {}): ContactRow =>
  ({
    __typename: 'WhatsappContact',
    id,
    name: `Contact ${id}`,
    profilePictureUrl: null,
    updatedAt: '2026-08-18T00:00:00Z',
    note: null,
    salesStageV2: SalesStageV2.New,
    lastSalesStageUpdateTime: null,
    lastConversationMessageTime: '2026-08-17T00:00:00Z',
    unreadMessagesCount: 0,
    unhandledSwitchToHuman: false,
    assignee: null,
    conversation: null,
    attributes: [],
    phone: `+100000${id}`,
    ...patch,
  }) as unknown as ContactRow;

const run = (state: ContactsState, ...actions: ContactsAction[]) => actions.reduce(contactsReducer, state);

const loaded = (rows: ContactRow[], hasNext = false) =>
  run(initialState(PLAN), {
    type: 'pageLoaded',
    epoch: 0,
    append: false,
    result: { rows, cursors: rows.map((r) => `c-${r.id}`), hasNext, endCursor: hasNext ? 'cursor' : null },
  });

describe('epoch', () => {
  it('drops a response that answered the previous plan', () => {
    const state = run(initialState(PLAN), { type: 'reset', plan: PLAN });
    const stale = contactsReducer(state, {
      type: 'pageLoaded',
      epoch: 0,
      append: false,
      result: { rows: [row('a')], cursors: [], hasNext: false, endCursor: null },
    });
    expect(stale.order).toEqual([]);
    expect(stale.loading).toBe(true);
  });

  it('accepts the response for the current epoch', () => {
    const state = run(initialState(PLAN), { type: 'reset', plan: PLAN });
    const fresh = contactsReducer(state, {
      type: 'pageLoaded',
      epoch: state.epoch,
      append: false,
      result: { rows: [row('a')], cursors: [], hasNext: false, endCursor: null },
    });
    expect(fresh.order).toEqual(['a']);
    expect(fresh.loading).toBe(false);
  });

  it('drops rows and selection on reset — old rows answered a different question', () => {
    const state = run(loaded([row('a'), row('b')]), { type: 'selectionSet', ids: ['a'] });
    const next = contactsReducer(state, { type: 'reset', plan: PLAN });
    expect(next.order).toEqual([]);
    expect(next.selection).toEqual([]);
  });
});

describe('paging', () => {
  it('appends without duplicating an id that is already there', () => {
    const state = loaded([row('a')], true);
    const next = contactsReducer(state, {
      type: 'pageLoaded',
      epoch: 0,
      append: true,
      result: { rows: [row('a'), row('b')], cursors: [], hasNext: false, endCursor: null },
    });
    expect(next.order).toEqual(['a', 'b']);
    expect(next.pages).toBe(2);
  });

  it('auto-pages up to the cap and then asks for a click', () => {
    const state = { ...loaded([row('a')], true), pages: AUTO_PAGE_CAP - 1 };
    expect(canAutoPage(state)).toBe(true);
    expect(needsManualPage(state)).toBe(false);
    const capped = { ...state, pages: AUTO_PAGE_CAP };
    expect(canAutoPage(capped)).toBe(false);
    expect(needsManualPage(capped)).toBe(true);
  });

  it('prunes a selected row that a refetched first page no longer contains', () => {
    const state = run(loaded([row('a'), row('b')]), { type: 'selectionSet', ids: ['a', 'b'] });
    const next = contactsReducer(state, {
      type: 'pageLoaded',
      epoch: 0,
      append: false,
      result: { rows: [row('b')], cursors: [], hasNext: false, endCursor: null },
    });
    expect(next.selection).toEqual(['b']);
  });
});

describe('live updates', () => {
  it('is dropped while the first page is in flight', () => {
    const state = initialState(PLAN);
    const next = contactsReducer(state, {
      type: 'liveBatch',
      now: 1000,
      updates: [{ action: ContactListUpdateAction.Add, id: 'a', row: row('a') }],
    });
    expect(next.order).toEqual([]);
  });

  it('adds to the top and marks the arrival', () => {
    const state = loaded([row('a')]);
    const next = contactsReducer(state, {
      type: 'liveBatch',
      now: 1000,
      updates: [{ action: ContactListUpdateAction.Add, id: 'b', row: row('b') }],
    });
    expect(next.order).toEqual(['b', 'a']);
    expect(next.arrived.b).toBe(1000);
    expect(next.liveTick).toBe(1);
  });

  it('removes a row and drops it from the selection', () => {
    const state = run(loaded([row('a'), row('b')]), { type: 'selectionSet', ids: ['a', 'b'] });
    const next = contactsReducer(state, {
      type: 'liveBatch',
      now: 1,
      updates: [{ action: ContactListUpdateAction.Remove, id: 'a', row: row('a') }],
    });
    expect(next.order).toEqual(['b']);
    expect(next.selection).toEqual(['b']);
  });

  it('caches an update for a row outside the loaded window without showing it', () => {
    const state = loaded([row('a')]);
    const next = contactsReducer(state, {
      type: 'liveBatch',
      now: 1,
      updates: [{ action: ContactListUpdateAction.Update, id: 'z', row: row('z') }],
    });
    expect(next.order).toEqual(['a']);
    expect(next.byId.z).toBeDefined();
  });

  it('keeps an optimistic edit on top of an echo that predates it', () => {
    const state = run(loaded([row('a', { salesStageV2: SalesStageV2.New })]), {
      type: 'editStarted',
      id: 'a',
      patch: { salesStageV2: SalesStageV2.Won },
      now: 1,
    });
    const next = contactsReducer(state, {
      type: 'liveBatch',
      now: 2,
      updates: [
        {
          action: ContactListUpdateAction.Update,
          id: 'a',
          row: row('a', { salesStageV2: SalesStageV2.New, name: 'Renamed' }),
        },
      ],
    });
    expect(next.byId.a.salesStageV2).toBe(SalesStageV2.Won);
    expect(next.byId.a.name).toBe('Renamed');
  });

  it('expires an arrival stamp', () => {
    const state = contactsReducer(loaded([row('a')]), {
      type: 'liveBatch',
      now: 1000,
      updates: [{ action: ContactListUpdateAction.Add, id: 'b', row: row('b') }],
    });
    expect(contactsReducer(state, { type: 'expire', now: 1000 + ARRIVED_MS + 1 }).arrived).toEqual({});
  });
});

describe('optimistic edits', () => {
  it('applies, then adopts the server row', () => {
    const started = run(loaded([row('a')]), { type: 'editStarted', id: 'a', patch: { name: 'New' }, now: 1 });
    expect(started.byId.a.name).toBe('New');
    const done = contactsReducer(started, { type: 'editSucceeded', id: 'a', row: row('a', { name: 'Server' }) });
    expect(done.byId.a.name).toBe('Server');
    expect(done.pending).toEqual({});
  });

  it('rolls exactly its own row back and flashes it', () => {
    const state = run(
      loaded([row('a', { name: 'A' }), row('b', { name: 'B' })]),
      { type: 'editStarted', id: 'a', patch: { name: 'A2' }, now: 1 },
      { type: 'editStarted', id: 'b', patch: { name: 'B2' }, now: 1 },
      { type: 'editSucceeded', id: 'b', row: row('b', { name: 'B2' }) },
      { type: 'editFailed', id: 'a', now: 5 },
    );
    expect(state.byId.a.name).toBe('A');
    expect(state.byId.b.name).toBe('B2');
    expect(state.flash.a).toBe(5);
  });

  it('stamps the flash even when the row has gone', () => {
    const state = run(
      loaded([row('a')]),
      { type: 'editStarted', id: 'a', patch: { name: 'x' }, now: 1 },
      { type: 'liveBatch', now: 2, updates: [{ action: ContactListUpdateAction.Remove, id: 'a', row: row('a') }] },
      { type: 'editFailed', id: 'a', now: 3 },
    );
    expect(state.flash.a).toBe(3);
  });
});

describe('client-side narrowing', () => {
  const rows = [
    row('a', { salesStageV2: SalesStageV2.Won, unreadMessagesCount: 2, name: 'Anna' }),
    row('b', { salesStageV2: SalesStageV2.New, unreadMessagesCount: 0, name: 'Boris' }),
    { ...row('c', { name: 'Widget person' }), __typename: 'WidgetContact' } as ContactRow,
  ];

  it('narrows by stage, unread, text and channel', () => {
    expect(
      applyClientFilters(rows, {
        platforms: [],
        stages: [SalesStageV2.Won],
        unreadOnly: false,
        assignee: 'Any',
        text: '',
        since: null,
        until: null,
      }).map((r) => r.id),
    ).toEqual(['a']);
    expect(
      applyClientFilters(rows, {
        platforms: [],
        stages: [],
        unreadOnly: true,
        assignee: 'Any',
        text: '',
        since: null,
        until: null,
      }).map((r) => r.id),
    ).toEqual(['a']);
    expect(
      applyClientFilters(rows, {
        platforms: [],
        stages: [],
        unreadOnly: false,
        assignee: 'Any',
        text: 'bor',
        since: null,
        until: null,
      }).map((r) => r.id),
    ).toEqual(['b']);
    expect(
      applyClientFilters(rows, {
        platforms: [Platform.Widget],
        stages: [],
        unreadOnly: false,
        assignee: 'Any',
        text: '',
        since: null,
        until: null,
      }).map((r) => r.id),
    ).toEqual(['c']);
  });

  it('matches text against the phone as well as the name', () => {
    expect(
      applyClientFilters(rows, {
        platforms: [],
        stages: [],
        unreadOnly: false,
        assignee: 'Any',
        text: '100000a',
        since: null,
        until: null,
      }).map((r) => r.id),
    ).toEqual(['a']);
  });

  it('keeps a bulk action off rows the client filter hid', () => {
    const plan = planQuery({
      filter: {
        ...EMPTY_FILTER,
        unreadOnly: true,
        groups: [
          {
            id: 'g1',
            operator: 'AND' as never,
            predicates: [{ id: 'p1', name: 'city', operator: 'IS_NOT_EMPTY' as never, values: [] }],
          },
        ],
      },
      attrNames: [],
    });
    const state = run({ ...loaded(rows), plan }, { type: 'selectionSet', ids: ['a', 'b'] });
    expect(selectRows(state).map((r) => r.id)).toEqual(['a']);
    expect(selectSelectedRows(state).map((r) => r.id)).toEqual(['a']);
  });
});

describe('counts', () => {
  it('reports what is shown, what the server counted, and what restriction hides', () => {
    const state = run(loaded([row('a'), row('b')]), { type: 'countsLoaded', epoch: 0, visible: 40, total: 67 });
    expect(selectCounts(state)).toEqual({ shown: 2, serverCount: 40, narrowed: false, hiddenByRestriction: 27 });
  });
});
