import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, ContactAssigneeFilterType, SalesStageV2, Sort } from '~api/generated/deals/graphql';
import { EMPTY_FILTER, type AttrPredicate, type DealsFilter } from './dealsFilter';
import {
  applyClientFilters,
  countFilterOf,
  countGapCaveat,
  planQuery,
  stageTotal,
  type Caveat,
  type QueryPlan,
} from './queryPlan';
import { STAGES } from './stages';
import { SEGMENT_ID } from './dealsSegment';
import { isUuid } from '~api';

const FIELDS = ['deal amount', 'deal close date'];

const plan = (over: Partial<DealsFilter> = {}): QueryPlan =>
  planQuery({ filter: { ...EMPTY_FILTER, ...over }, fieldNames: FIELDS });

const predicate = (over: Partial<AttrPredicate> = {}): AttrPredicate => ({
  id: 'p1',
  name: 'deal amount',
  operator: AttrFilterDefaultOperator.Is,
  values: ['1000'],
  ...over,
});

const textOf = (caveats: readonly Caveat[], id: string): string | undefined =>
  caveats.find((caveat) => caveat.id === id)?.text;

describe('planQuery — engine B is the default', () => {
  it('routes everything engine B can express to the chats connection', () => {
    const result = plan({ assignee: 'Unassigned', q: '  kaya  ', unreadOnly: true });
    expect(result.engine).toBe('chats');
    expect(result.live).toBe(true);
    if (result.engine !== 'chats') throw new Error('unreachable');
    expect(result.vars.assigneeFilter).toEqual({ type: ContactAssigneeFilterType.Unassigned });
    expect(result.vars.unreadOnly).toBe(true);
    expect(result.vars.textInputFilter).toBe('kaya');
    expect(result.vars.fieldNames).toEqual(FIELDS);
  });

  it('an empty stage selection means all six — that IS the unlock over the board', () => {
    const result = plan();
    if (result.engine !== 'chats') throw new Error('unreachable');
    expect(result.vars.stages).toEqual(STAGES);
  });

  it('sends only the chosen stages when there are some', () => {
    const result = plan({ stages: [SalesStageV2.Won, SalesStageV2.Lost] });
    if (result.engine !== 'chats') throw new Error('unreachable');
    expect(result.vars.stages).toEqual([SalesStageV2.Won, SalesStageV2.Lost]);
  });

  it('has nothing to filter client-side and nothing to warn about', () => {
    const result = plan({ q: 'kaya', stages: [SalesStageV2.New], unreadOnly: true });
    expect(result.clientFilters).toEqual({ stages: [], unreadOnly: false, q: '' });
    expect(result.caveats).toEqual([]);
  });

  it('builds the count filter from the very object the connection uses', () => {
    const result = plan({ assignee: 'FuelyAI', q: 'kaya', unreadOnly: true, stages: [SalesStageV2.New] });
    if (result.engine !== 'chats') throw new Error('unreachable');
    expect(countFilterOf(result.vars)).toEqual({
      assigneeFilter: { type: ContactAssigneeFilterType.FuelyAi },
      unreadOnly: true,
      salesStageV2Filter: [SalesStageV2.New],
      textInputFilter: 'kaya',
    });
  });

  it('is honest about when the two counts are comparable at all', () => {
    expect(plan().totalsComparable).toBe(true);
    expect(plan({ assignee: 'Unassigned' }).totalsComparable).toBe(true);
    // DealsByStagesFilter carries neither of these, so the numbers would
    // describe different sets and any difference would be unattributable.
    expect(plan({ q: 'kaya' }).totalsComparable).toBe(false);
    expect(plan({ unreadOnly: true }).totalsComparable).toBe(false);
  });

  it('is not flipped to engine C by a half-typed predicate', () => {
    expect(plan({ predicates: [predicate({ name: '' })] }).engine).toBe('chats');
  });
});

describe('planQuery — engine C', () => {
  it('routes a usable predicate to the segment search, without live updates', () => {
    const result = plan({ predicates: [predicate()] });
    expect(result.engine).toBe('segment');
    expect(result.live).toBe(false);
    expect(result.totalsComparable).toBe(false);
    if (result.engine !== 'segment') throw new Error('unreachable');
    expect(result.vars.segment).toEqual({
      id: SEGMENT_ID,
      name: 'Deals table',
      resultOperator: 'AND',
      filters: [
        {
          id: result.vars.segment?.filters[0]?.id,
          byAttribute: {
            name: 'deal amount',
            defaultStrategy: { operator: AttrFilterDefaultOperator.Is, comparableValues: ['1000'] },
          },
        },
      ],
    });
    /* The ids are UUIDs, not readable strings: the API rejects
       anything else. */
    expect(isUuid(result.vars.segment!.id)).toBe(true);
    expect(isUuid(result.vars.segment!.filters[0].id)).toBe(true);
    expect(result.vars.orderBy).toBeNull();
  });

  it('routes a sort there too, and sends it as orderBy', () => {
    const result = plan({ sort: { attribute: 'deal amount', direction: Sort.Desc } });
    if (result.engine !== 'segment') throw new Error('unreachable');
    expect(result.vars.orderBy).toEqual({ orderBy: 'deal amount', direction: Sort.Desc });
  });

  it('floors a sort with no filter, so the page is not all blanks', () => {
    const result = plan({ sort: { attribute: 'deal amount', direction: Sort.Asc } });
    if (result.engine !== 'segment') throw new Error('unreachable');
    expect(result.vars.segment?.filters).toEqual([
      {
        id: result.vars.segment?.filters[0]?.id,
        byAttribute: {
          name: 'deal amount',
          defaultStrategy: {
            operator: AttrFilterDefaultOperator.IsNotEmpty,
            comparableValues: [],
          },
        },
      },
    ]);
  });

  it('does not floor a sort that already has predicates to narrow it', () => {
    const result = plan({
      predicates: [predicate()],
      sort: { attribute: 'deal amount', direction: Sort.Asc },
    });
    if (result.engine !== 'segment') throw new Error('unreachable');
    expect(result.vars.segment?.filters).toHaveLength(1);
    expect(textOf(result.caveats, 'sortFloor')).toBeUndefined();
  });

  it('moves stage, search and unread to the client — the segment cannot express them', () => {
    const result = plan({
      predicates: [predicate()],
      stages: [SalesStageV2.Won],
      q: '  Kaya ',
      unreadOnly: true,
    });
    expect(result.clientFilters).toEqual({
      stages: [SalesStageV2.Won],
      unreadOnly: true,
      q: 'kaya',
    });
  });
});

/* Every string the caveat bar can print, asserted. This is the whole reason
 * the routing lives in a pure function: "honest about its limits" is a build
 * gate here, not a comment. */
describe('caveats', () => {
  it('says nothing at all on the default route', () => {
    expect(plan().caveats).toEqual([]);
  });

  it('states the lost deal isolation', () => {
    expect(textOf(plan({ predicates: [predicate()] }).caveats, 'contacts')).toBe(
      'Attribute filters cannot reach the sales stage, so this list is contacts rather than deals — a contact that has never been a deal can appear in it.',
    );
  });

  it('states the lost live updates', () => {
    expect(textOf(plan({ predicates: [predicate()] }).caveats, 'stale')).toBe(
      'Live updates are off in this mode: no subscription exists for an attribute search. Use Refresh to pick up changes.',
    );
  });

  it('names exactly the filters that moved to the client', () => {
    expect(textOf(plan({ predicates: [predicate()], stages: [SalesStageV2.Won] }).caveats, 'clientSide')).toBe(
      'Applied to loaded rows only: stage. The total counts every contact the attribute filter matches, so it will read higher than the list.',
    );
    expect(
      textOf(
        plan({ predicates: [predicate()], stages: [SalesStageV2.Won], q: 'kaya', unreadOnly: true }).caveats,
        'clientSide',
      ),
    ).toBe(
      'Applied to loaded rows only: stage, search and unread. The total counts every contact the attribute filter matches, so it will read higher than the list.',
    );
  });

  it('does not claim a client-side filter that is not set', () => {
    expect(textOf(plan({ predicates: [predicate()] }).caveats, 'clientSide')).toBeUndefined();
  });

  it('states that a custom-attribute sort is text order', () => {
    expect(textOf(plan({ sort: { attribute: 'deal amount', direction: Sort.Asc } }).caveats, 'textSort')).toBe(
      'Sorting by “deal amount” is text order — custom attributes are stored as text, so “9” comes after “1000”.',
    );
  });

  it('states the sort floor it applied', () => {
    expect(textOf(plan({ sort: { attribute: 'deal amount', direction: Sort.Asc } }).caveats, 'sortFloor')).toBe(
      'Only contacts that have “deal amount” are listed: sorting with no filter would return every contact, most with nothing to sort by.',
    );
  });

  it('states that a range predicate ORs the interpretations, naming the attributes once each', () => {
    const result = plan({
      predicates: [
        predicate({ operator: AttrFilterDefaultOperator.Gt }),
        predicate({ id: 'p2', operator: AttrFilterDefaultOperator.Lt }),
        predicate({ id: 'p3', name: 'deal probability', operator: AttrFilterDefaultOperator.Gt }),
      ],
    });
    expect(textOf(result.caveats, 'range')).toBe(
      'Range filters on “deal amount” and “deal probability” are approximate: the server compares the value as text, whole number, decimal and date at once, and keeps the row if any of those matches.',
    );
  });

  it('says nothing about ranges when no predicate uses one', () => {
    expect(textOf(plan({ predicates: [predicate()] }).caveats, 'range')).toBeUndefined();
  });

  it('orders them worst-first: what the list is, then what it costs', () => {
    const result = plan({
      predicates: [predicate({ operator: AttrFilterDefaultOperator.Gt })],
      stages: [SalesStageV2.Won],
      sort: { attribute: 'deal amount', direction: Sort.Asc },
    });
    expect(result.caveats.map((caveat) => caveat.id)).toEqual(['contacts', 'clientSide', 'stale', 'textSort', 'range']);
  });
});

describe('countGapCaveat — measured, never asserted', () => {
  const chats = plan();

  it('states the real numbers when the chat count is short', () => {
    expect(countGapCaveat(chats, 118, 124)?.text).toBe('Showing 118 of 124 deals; 6 have no conversation.');
  });

  it('agrees with itself about one', () => {
    expect(countGapCaveat(chats, 123, 124)?.text).toBe('Showing 123 of 124 deals; 1 has no conversation.');
  });

  it('says nothing when the numbers agree, or when the chat count is the larger one', () => {
    expect(countGapCaveat(chats, 124, 124)).toBeNull();
    expect(countGapCaveat(chats, 130, 124)).toBeNull();
  });

  it('says nothing while either number is unknown', () => {
    expect(countGapCaveat(chats, null, 124)).toBeNull();
    expect(countGapCaveat(chats, 118, null)).toBeNull();
  });

  it('refuses to attribute a gap the filter itself could explain', () => {
    expect(countGapCaveat(plan({ q: 'kaya' }), 3, 124)).toBeNull();
    expect(countGapCaveat(plan({ unreadOnly: true }), 3, 124)).toBeNull();
    expect(countGapCaveat(plan({ predicates: [predicate()] }), 3, 124)).toBeNull();
  });
});

describe('stageTotal', () => {
  const totals = {
    [SalesStageV2.New]: 5,
    [SalesStageV2.Sorting]: 3,
    [SalesStageV2.Ready]: 2,
    [SalesStageV2.WorkingOn]: 4,
    [SalesStageV2.Won]: 7,
    [SalesStageV2.Lost]: 1,
  };

  it('sums every stage when none is chosen', () => {
    expect(stageTotal(totals, [])).toBe(22);
  });

  it('sums only the stages in play, so the gap compares like with like', () => {
    expect(stageTotal(totals, [SalesStageV2.Won, SalesStageV2.Lost])).toBe(8);
  });

  it('is null while the totals are unknown', () => {
    expect(stageTotal(null, [])).toBeNull();
  });
});

describe('applyClientFilters', () => {
  const rows = [
    { name: 'Aylin K.', salesStageV2: SalesStageV2.Won, unreadMessagesCount: 0 },
    { name: 'Jonas Weber', salesStageV2: SalesStageV2.New, unreadMessagesCount: 2, phone: '+49 151 234' },
    { name: 'No stage', salesStageV2: null, unreadMessagesCount: 1 },
  ];

  it('keeps the array identity when there is nothing to apply', () => {
    expect(applyClientFilters(rows, { stages: [], unreadOnly: false, q: '' })).toBe(rows);
  });

  it('narrows by stage, dropping contacts that were never deals', () => {
    expect(
      applyClientFilters(rows, { stages: [SalesStageV2.Won], unreadOnly: false, q: '' }).map((row) => row.name),
    ).toEqual(['Aylin K.']);
  });

  it('narrows by unread', () => {
    expect(applyClientFilters(rows, { stages: [], unreadOnly: true, q: '' }).map((row) => row.name)).toEqual([
      'Jonas Weber',
      'No stage',
    ]);
  });

  it('searches name and phone, the same two fields the server searches', () => {
    expect(applyClientFilters(rows, { stages: [], unreadOnly: false, q: 'jonas' }).map((row) => row.name)).toEqual([
      'Jonas Weber',
    ]);
    expect(applyClientFilters(rows, { stages: [], unreadOnly: false, q: '151' }).map((row) => row.name)).toEqual([
      'Jonas Weber',
    ]);
  });
});
