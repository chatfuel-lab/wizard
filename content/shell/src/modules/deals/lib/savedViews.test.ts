import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, SalesStageV2, Sort } from '~api/generated/deals/graphql';
import { renameEntry, serializeStoredList } from '~ui';
import { EMPTY_FILTER, type DealsFilter } from './dealsFilter';
import {
  MAX_NAME_LENGTH,
  MAX_SAVED_VIEWS,
  describeSavedView,
  findMatchingView,
  parseSavedViews,
  sameFilter,
  sanitizeFilter,
  type SavedView,
} from './savedViews';

/** How the hook serializes — the shared list serializer under this module's cap. */
const serializeSavedViews = (views: readonly SavedView[]): string => serializeStoredList(views, MAX_SAVED_VIEWS);

const NOW = Date.UTC(2026, 4, 20);

const filter = (over: Partial<DealsFilter> = {}): DealsFilter => ({ ...EMPTY_FILTER, ...over });

const view = (over: Partial<SavedView> = {}): SavedView => ({
  id: 'v1',
  name: 'Big open deals',
  view: 'table',
  filter: filter({ assignee: 'Unassigned' }),
  savedAt: NOW,
  ...over,
});

describe('round trip', () => {
  it('survives the whole filter model, predicates and sort included', () => {
    const original = view({
      filter: filter({
        assignee: 'FuelyAI',
        q: 'kaya',
        stages: [SalesStageV2.New, SalesStageV2.Won],
        unreadOnly: true,
        predicates: [{ id: 'p1', name: 'deal amount', operator: AttrFilterDefaultOperator.Gt, values: ['1000'] }],
        sort: { attribute: 'deal close date', direction: Sort.Asc },
      }),
    });
    expect(parseSavedViews(serializeSavedViews([original]))).toEqual([original]);
  });

  it('keeps the URL-invisible half — predicates are the reason saved views exist', () => {
    const stored = serializeSavedViews([
      view({
        filter: filter({
          predicates: [{ id: 'p1', name: 'deal company', operator: AttrFilterDefaultOperator.IsNotEmpty, values: [] }],
        }),
      }),
    ]);
    expect(parseSavedViews(stored)[0]!.filter.predicates).toHaveLength(1);
  });
});

describe('parseSavedViews tolerates garbage', () => {
  it('never throws for anything a storage item can hold', () => {
    for (const raw of [null, undefined, '', '   ', 'not json', '{', '42', '"a string"', 'null']) {
      expect(parseSavedViews(raw, NOW)).toEqual([]);
    }
  });

  it('accepts an object envelope as well as a bare array', () => {
    const stored = JSON.stringify({ views: [view()] });
    expect(parseSavedViews(stored, NOW)).toHaveLength(1);
  });

  it('repairs an entry rather than dropping the whole list', () => {
    const stored = JSON.stringify([
      { name: 'No id, no view, no filter' },
      { id: 'v2', name: '   ', view: 'wormhole', filter: 'not an object' },
    ]);
    const views = parseSavedViews(stored, NOW);
    expect(views).toHaveLength(2);
    expect(views[0]!.id).toBe('view-0');
    expect(views[0]!.view).toBe('board');
    expect(views[0]!.filter).toEqual(EMPTY_FILTER);
    expect(views[1]!.name).toBe('Untitled view');
    expect(views[1]!.savedAt).toBe(NOW);
  });

  it('drops entries that are not objects at all, and duplicate ids', () => {
    const stored = JSON.stringify([null, 7, 'x', view(), view({ name: 'Same id' })]);
    const views = parseSavedViews(stored, NOW);
    expect(views).toHaveLength(1);
    expect(views[0]!.name).toBe('Big open deals');
  });

  it('caps the list, so one huge item cannot become unwritable', () => {
    const stored = JSON.stringify(
      Array.from({ length: MAX_SAVED_VIEWS + 10 }, (_, index) => view({ id: `v${index}` })),
    );
    expect(parseSavedViews(stored, NOW)).toHaveLength(MAX_SAVED_VIEWS);
  });
});

describe('sanitizeFilter', () => {
  it('falls back on every unknown enum member instead of passing it to a query', () => {
    const sanitized = sanitizeFilter({
      assignee: 'TheBoss',
      q: 42,
      stages: ['New', 'Atlantis', 'Won'],
      unreadOnly: 'yes',
      predicates: [
        { name: 'deal amount', operator: 'NOT_AN_OPERATOR', values: ['1', 2, null] },
        { name: '   ' },
        'nonsense',
      ],
      sort: { attribute: 'deal amount', direction: 'sideways' },
    });
    expect(sanitized.assignee).toBe('Any');
    expect(sanitized.q).toBe('');
    expect(sanitized.stages).toEqual([SalesStageV2.New, SalesStageV2.Won]);
    expect(sanitized.unreadOnly).toBe(false); // only a real boolean counts
    expect(sanitized.predicates).toHaveLength(1);
    expect(sanitized.predicates[0]!.operator).toBe(AttrFilterDefaultOperator.Is);
    expect(sanitized.predicates[0]!.values).toEqual(['1']);
    expect(sanitized.sort).toBeNull();
  });

  it('puts stages back in canonical order and dedupes them', () => {
    expect(sanitizeFilter({ stages: ['Won', 'New', 'Won'] }).stages).toEqual([SalesStageV2.New, SalesStageV2.Won]);
  });
});

describe('list edits through the shared helpers', () => {
  /* The mechanics themselves are covered where they live; what is pinned here
     is this module's own limit flowing into them. */
  it("caps a rename at this module's name limit", () => {
    const list = [view({ id: 'a' })];
    expect(renameEntry(list, 'a', 'x'.repeat(200), MAX_NAME_LENGTH)[0]!.name).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('sameFilter', () => {
  it('ignores predicate ids — they are local handles, not data', () => {
    const a = filter({
      predicates: [{ id: 'p1', name: 'deal amount', operator: AttrFilterDefaultOperator.Gt, values: ['1'] }],
    });
    const b = filter({
      predicates: [{ id: 'p9', name: 'deal amount', operator: AttrFilterDefaultOperator.Gt, values: ['1'] }],
    });
    expect(sameFilter(a, b)).toBe(true);
  });

  it('sees a difference in any other part', () => {
    expect(sameFilter(EMPTY_FILTER, filter({ unreadOnly: true }))).toBe(false);
    expect(sameFilter(EMPTY_FILTER, filter({ stages: [SalesStageV2.Won] }))).toBe(false);
    expect(sameFilter(EMPTY_FILTER, filter({ sort: { attribute: 'x', direction: Sort.Asc } }))).toBe(false);
    expect(sameFilter(filter({ q: ' kaya ' }), filter({ q: 'kaya' }))).toBe(true);
  });

  it('matches the current state against the list', () => {
    const list = [view({ id: 'a', view: 'board', filter: EMPTY_FILTER })];
    expect(findMatchingView(list, 'board', EMPTY_FILTER)?.id).toBe('a');
    expect(findMatchingView(list, 'table', EMPTY_FILTER)).toBeNull();
  });
});

describe('describeSavedView', () => {
  it('says what the view will do before it is applied', () => {
    expect(describeSavedView(view({ view: 'board', filter: EMPTY_FILTER }))).toBe('Board · no filters');
    expect(
      describeSavedView(
        view({
          view: 'forecast',
          filter: filter({ assignee: 'FuelyAI', stages: [SalesStageV2.Won], unreadOnly: true }),
        }),
      ),
    ).toBe('Forecast · Fuely AI · Won · Unread');
  });
});
