import { describe, expect, it } from 'vitest';
import {
  AttrFilterDefaultOperator,
  BoolOperator,
  ContactAssigneeFilterType,
  Platform,
  SalesStageV2,
  Sort,
} from '~api/generated/contacts/graphql';
import { EMPTY_FILTER, userAssigneeKey, type ContactsFilter } from './contactsFilter';
import { hasClientFilters, planQuery } from './queryPlan';

const plan = (
  filter: Partial<ContactsFilter>,
  attrNames: string[] = ['city'],
  dataTypeOf?: (n: string) => string | undefined,
) => planQuery({ filter: { ...EMPTY_FILTER, ...filter }, attrNames, dataTypeOf });

const group = (name: string, operator = AttrFilterDefaultOperator.Is, values = ['x']) => ({
  id: 'g1',
  operator: BoolOperator.And,
  predicates: [{ id: 'p1', name, operator, values }],
});

const caveatIds = (f: Partial<ContactsFilter>) => plan(f).caveats.map((c) => c.id);

describe('planQuery — engine choice', () => {
  it('an empty filter uses the engine that can see every contact', () => {
    const p = plan({});
    expect(p.engine).toBe('segment');
    expect(p.segmentVars?.segment).toBeNull();
    expect(p.live).toBe(false);
  });

  it('a text search alone goes to the chat engine, which searches server-side', () => {
    const p = plan({ q: 'dana' });
    expect(p.engine).toBe('chats');
    expect(p.chatsVars?.textInputFilter).toBe('dana');
    expect(p.live).toBe(true);
  });

  it.each([
    ['assignee', { assignee: userAssigneeKey('u-1') }],
    ['stages', { stages: [SalesStageV2.Won] }],
    ['unread', { unreadOnly: true }],
    ['window', { since: '2026-01-01T00:00:00Z' }],
  ])('%s alone goes to the chat engine', (_label, filter) => {
    expect(plan(filter as Partial<ContactsFilter>).engine).toBe('chats');
  });

  it('any attribute predicate pulls the whole query back to the segment engine', () => {
    const p = plan({ q: 'dana', groups: [group('city')] });
    expect(p.engine).toBe('segment');
    expect(p.segmentVars?.segment?.filters).toHaveLength(1);
    expect(p.clientFilters.text).toBe('dana');
  });

  it('a sort does too — the chat engine has none', () => {
    const p = plan({ unreadOnly: true, sort: { name: 'city', direction: Sort.Asc } });
    expect(p.engine).toBe('segment');
    expect(p.segmentVars?.orderBy).toEqual({ orderBy: 'city', direction: Sort.Asc });
    expect(p.clientFilters.unreadOnly).toBe(true);
  });

  it('an unusable predicate does not count as a segment ask', () => {
    const p = plan({
      q: 'dana',
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [{ id: 'p1', name: '', operator: AttrFilterDefaultOperator.Is, values: [''] }],
        },
      ],
    });
    expect(p.engine).toBe('chats');
  });
});

describe('planQuery — variables', () => {
  it('passes the column attribute names to both engines', () => {
    expect(plan({}, ['city', 'company']).segmentVars?.attrNames).toEqual(['city', 'company']);
    expect(plan({ q: 'x' }, ['city']).chatsVars?.attrNames).toEqual(['city']);
  });

  it('maps the assignee key to the API filter', () => {
    expect(plan({ assignee: 'FuelyAI' }).chatsVars?.assigneeFilter).toEqual({
      type: ContactAssigneeFilterType.FuelyAi,
    });
    expect(plan({ assignee: userAssigneeKey('u-7') }).chatsVars?.assigneeFilter).toEqual({
      type: ContactAssigneeFilterType.AssigneeId,
      assigneeID: 'u-7',
    });
  });

  it('sends every platform when the user narrowed none', () => {
    expect(plan({}).segmentVars?.platforms).toHaveLength(5);
    expect(plan({ platforms: [Platform.Whatsapp] }).segmentVars?.platforms).toEqual([Platform.Whatsapp]);
  });

  it('leaves the chat engine no client work when only its own filters are set', () => {
    expect(hasClientFilters(plan({ q: 'x', unreadOnly: true }).clientFilters)).toBe(false);
  });

  it('but narrows channels client-side there, because the connection takes none', () => {
    const p = plan({ q: 'x', platforms: [Platform.Whatsapp] });
    expect(p.clientFilters.platforms).toEqual([Platform.Whatsapp]);
    expect(p.caveats.map((c) => c.id)).toContain('platform-client');
  });
});

describe('planQuery — caveats are emitted only when true', () => {
  it('warns that the chat engine hides contacts with no conversation', () => {
    expect(caveatIds({ q: 'x' })).toContain('no-conversation');
    expect(caveatIds({})).not.toContain('no-conversation');
  });

  it('warns that a segment list is a snapshot, and only there', () => {
    expect(caveatIds({})).toContain('snapshot');
    expect(caveatIds({ q: 'x' })).not.toContain('snapshot');
  });

  it('warns about client-side narrowing only when there is some', () => {
    expect(caveatIds({ groups: [group('city')] })).not.toContain('client-narrowing');
    expect(caveatIds({ groups: [group('city')], unreadOnly: true })).toContain('client-narrowing');
  });

  it('warns about approximate ranges only for GT/LT', () => {
    expect(caveatIds({ groups: [group('amount', AttrFilterDefaultOperator.Gt, ['100'])] })).toContain(
      'approximate-range',
    );
    expect(caveatIds({ groups: [group('amount', AttrFilterDefaultOperator.Is, ['100'])] })).not.toContain(
      'approximate-range',
    );
  });

  it('warns about text ordering only for string-typed sorts', () => {
    const asText = planQuery({
      filter: { ...EMPTY_FILTER, sort: { name: 'amount', direction: Sort.Asc } },
      attrNames: [],
      dataTypeOf: () => 'string',
    });
    expect(asText.caveats.map((c) => c.id)).toContain('text-sort');
    const asNumber = planQuery({
      filter: { ...EMPTY_FILTER, sort: { name: 'age', direction: Sort.Asc } },
      attrNames: [],
      dataTypeOf: () => 'long',
    });
    expect(asNumber.caveats.map((c) => c.id)).not.toContain('text-sort');
  });

  it('says the sort is off when the chat engine won the route', () => {
    expect(caveatIds({ q: 'x', sort: null })).not.toContain('no-sort');
  });

  it('never emits a caveat with an empty message', () => {
    for (const filter of [
      {},
      { q: 'x' },
      { groups: [group('a', AttrFilterDefaultOperator.Gt, ['1'])], unreadOnly: true },
    ]) {
      for (const caveat of plan(filter as Partial<ContactsFilter>).caveats)
        expect(caveat.text.length).toBeGreaterThan(20);
    }
  });
});
