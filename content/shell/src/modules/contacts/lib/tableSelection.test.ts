import { describe, expect, it } from 'vitest';
import type { CountSummary } from './contactsStore';
import {
  actionTargets,
  contactLinkFor,
  emptyKind,
  fillStep,
  freshStamps,
  isPageSelected,
  isRestrictedRow,
  listStatus,
  loadMoreLabel,
  moduleParams,
  nextExpiry,
  nextRowId,
  previousRowId,
  pruneSelection,
  restrictionNote,
  rowsFor,
  selectAllLabel,
  selectAllPlan,
  selectableIds,
} from './tableSelection';

type Row = { __typename: string; id: string };

const row = (id: string): Row => ({ __typename: 'WhatsappContact', id });
const locked = (id: string): Row => ({ __typename: 'UnavailableContact', id });

const byId = (...rows: Row[]): Record<string, Row> => Object.fromEntries(rows.map((each) => [each.id, each]));

const counts = (over: Partial<CountSummary> = {}): CountSummary => ({
  shown: 0,
  serverCount: null,
  narrowed: false,
  hiddenByRestriction: 0,
  ...over,
});

describe('restricted rows', () => {
  it('are recognised by typename alone — every field on one is empty', () => {
    expect(isRestrictedRow(locked('r'))).toBe(true);
    expect(isRestrictedRow(row('a'))).toBe(false);
    expect(isRestrictedRow(undefined)).toBe(false);
  });

  it('never survive a prune, and neither do ids the cache has lost', () => {
    expect(pruneSelection(['a', 'r', 'gone'], byId(row('a'), locked('r')))).toEqual(['a']);
  });

  it('are not selectable and are excluded from "the whole page is selected"', () => {
    const rows = [row('a'), locked('r'), row('b')];
    expect(selectableIds(rows)).toEqual(['a', 'b']);
    expect(isPageSelected(rows, ['a', 'b'])).toBe(true);
    expect(isPageSelected(rows, ['a'])).toBe(false);
    expect(isPageSelected([], [])).toBe(false);
  });
});

describe('actionTargets', () => {
  const cache = byId(row('a'), row('b'), row('c'), locked('r'));

  it('acts on the whole selection when the row is inside it', () => {
    expect(actionTargets('b', ['a', 'b'], cache)).toEqual(['a', 'b']);
  });

  it('acts on that row alone when it is outside the selection', () => {
    expect(actionTargets('c', ['a', 'b'], cache)).toEqual(['c']);
  });

  it('does nothing at all for a restricted or unknown row', () => {
    expect(actionTargets('r', ['r'], cache)).toEqual([]);
    expect(actionTargets('nope', [], cache)).toEqual([]);
  });

  it('keeps the order it was given and skips what it cannot touch', () => {
    expect(rowsFor(['c', 'r', 'a'], cache).map((each) => each.id)).toEqual(['c', 'a']);
  });
});

describe('selectAllPlan', () => {
  it('selects the whole match when it fits under the cap', () => {
    const plan = selectAllPlan(120, 50, true, 500);
    expect(plan).toMatchObject({ target: 120, capped: false, uncovered: 0, needsMore: true });
  });

  it('caps a bigger match and reports exactly what it leaves out', () => {
    const plan = selectAllPlan(1234, 50, true, 500);
    expect(plan).toMatchObject({ target: 500, capped: true, uncovered: 734 });
  });

  it('needs no more pages once the target is loaded', () => {
    expect(selectAllPlan(40, 40, false, 500).needsMore).toBe(false);
    expect(selectAllPlan(40, 10, false, 500).needsMore).toBe(false);
  });

  it('still works when the count query failed, and never invents a number', () => {
    const plan = selectAllPlan(null, 0, true, 500);
    expect(plan).toMatchObject({ target: 500, capped: true, uncovered: 0 });
    expect(selectAllLabel(plan, null)).toContain('did not return a count');
    expect(selectAllLabel(plan, null)).not.toContain('NaN');
  });

  it('prints the real number in the confirm dialog', () => {
    expect(selectAllLabel(selectAllPlan(120, 0, true, 500), 120)).toBe(
      'Select all 120 contacts that match this filter.',
    );
    const capped = selectAllLabel(selectAllPlan(1234, 0, true, 500), 1234);
    expect(capped).toContain('1,234 contacts match');
    expect(capped).toContain('at most 500');
    expect(capped).toContain('734 are left out');
  });
});

describe('fillStep', () => {
  const step = (over: Partial<Parameters<typeof fillStep>[0]> = {}) =>
    fillStep({ loading: false, paging: false, loaded: 0, target: 100, hasNext: true, ...over });

  it('waits while any page is in flight', () => {
    expect(step({ loading: true })).toBe('wait');
    expect(step({ paging: true })).toBe('wait');
  });

  it('finishes once the target is loaded', () => {
    expect(step({ loaded: 100 })).toBe('finish');
    expect(step({ loaded: 150 })).toBe('finish');
  });

  it('finishes early when the list ends before the target', () => {
    expect(step({ loaded: 40, hasNext: false })).toBe('finish');
  });

  it('pages while the target is still out of reach', () => {
    expect(step({ loaded: 40 })).toBe('page');
  });
});

describe('listStatus', () => {
  it('says "loaded" rather than a total when the server count is missing', () => {
    expect(listStatus(counts({ shown: 30 }), 30, true).headline).toBe('30 loaded so far');
    expect(listStatus(counts({ shown: 30 }), 30, false).headline).toBe('30 loaded');
  });

  it('says the plain count only when the list really is complete', () => {
    expect(listStatus(counts({ shown: 7, serverCount: 7 }), 7, false).headline).toBe('7 contacts');
    expect(listStatus(counts({ shown: 1, serverCount: 1 }), 1, false).headline).toBe('1 contact');
  });

  it('never prints a server count as though it described the rows on screen', () => {
    const status = listStatus(counts({ shown: 12, serverCount: 400, narrowed: true }), 50, true);
    expect(status.headline).toBe('12 of 400');
    expect(status.note).toContain('50 rows loaded so far');
  });

  it('has no note when nothing was narrowed', () => {
    expect(listStatus(counts({ shown: 50, serverCount: 400 }), 50, true).note).toBeNull();
  });
});

describe('the restriction gap', () => {
  it('is silent when the role hides nothing', () => {
    expect(restrictionNote(counts({ hiddenByRestriction: 0 }))).toBeNull();
  });

  it('says how many and that they cannot be opened', () => {
    const note = restrictionNote(counts({ hiddenByRestriction: 3 })) ?? '';
    expect(note).toContain('hides 3 contacts');
    expect(note).toContain('cannot be opened');
  });
});

describe('loadMoreLabel', () => {
  it('says how many are loaded out of how many', () => {
    expect(loadMoreLabel(counts({ serverCount: 1234 }), 300)).toBe('Load more — 300 of 1,234 loaded');
  });

  it('drops the total it does not have', () => {
    expect(loadMoreLabel(counts(), 300)).toBe('Load more (300 loaded)');
  });
});

describe('moving between rows', () => {
  const order = ['a', 'b', 'c'];

  it('stops at the ends rather than wrapping — an edit chain must end', () => {
    expect(nextRowId(order, 'a')).toBe('b');
    expect(nextRowId(order, 'c')).toBeNull();
    expect(previousRowId(order, 'a')).toBeNull();
    expect(previousRowId(order, 'b')).toBe('a');
  });

  it('is null for a row that is not in the order at all', () => {
    expect(nextRowId(order, 'zzz')).toBeNull();
    expect(previousRowId(order, 'zzz')).toBeNull();
  });
});

describe('emptyKind', () => {
  it('blames the role first: no filter change would help', () => {
    expect(emptyKind(counts({ serverCount: 0, hiddenByRestriction: 4 }), true)).toBe('restricted');
    expect(emptyKind(counts({ serverCount: 0, hiddenByRestriction: 4 }), false)).toBe('restricted');
  });

  it('blames the filter when there is one', () => {
    expect(emptyKind(counts({ serverCount: 0 }), false)).toBe('filtered');
  });

  it('says the bot is empty only when nothing is narrowing it', () => {
    expect(emptyKind(counts({ serverCount: 0 }), true)).toBe('none');
    expect(emptyKind(counts(), true)).toBe('none');
  });
});

describe('stamps that expire on their own', () => {
  it('keeps only what is still inside the window', () => {
    expect(freshStamps({ a: 900, b: 100 }, 1000, 500)).toEqual({ a: 900 });
    expect(freshStamps({}, 1000, 500)).toEqual({});
  });

  it('reports when the next one dies, so the view sets exactly one timer', () => {
    expect(nextExpiry({ a: 900, b: 800 }, 1000, 500)).toBe(300);
    expect(nextExpiry({}, 1000, 500)).toBeNull();
    expect(nextExpiry({ a: 0 }, 1000, 500)).toBe(0);
  });
});

describe('contactLinkFor', () => {
  it("adds the module parameter and leaves the host's own keys alone", () => {
    const link = contactLinkFor('https://host.example/app?bot=abc&panel=crm', 'ct-1');
    const url = new URL(link);
    expect(url.searchParams.get('contact')).toBe('ct-1');
    expect(url.searchParams.get('bot')).toBe('abc');
    expect(url.searchParams.get('panel')).toBe('crm');
    expect(url.origin + url.pathname).toBe('https://host.example/app');
  });

  it('writes into the route the shell actually uses', () => {
    const link = contactLinkFor('https://app.example/contacts?density=compact', 'ct-1');
    expect(link).toBe('https://app.example/contacts?density=compact&contact=ct-1');
  });

  it('adds the parameter to a route that had none', () => {
    expect(contactLinkFor('https://app.example/contacts', 'ct-1')).toBe('https://app.example/contacts?contact=ct-1');
  });

  /* The view is a path segment, and a link to a record opens the record — the
     surface it was copied from is still the one behind it. */
  it('keeps the view segment it was copied from', () => {
    expect(contactLinkFor('https://app.example/contacts/audience?q=ann', 'ct-1')).toBe(
      'https://app.example/contacts/audience?q=ann&contact=ct-1',
    );
  });
});

describe('moduleParams', () => {
  it('reads the query string, routed or embedded alike', () => {
    expect(moduleParams('https://app.example/contacts?cols=attr:Plan').get('cols')).toBe('attr:Plan');
    expect(moduleParams('https://host.example/app?cols=attr:Plan').get('cols')).toBe('attr:Plan');
  });

  it('is empty rather than wrong for a page that carries nothing of ours', () => {
    expect(moduleParams('https://host.example/app#section').get('cols')).toBeNull();
    expect([...moduleParams('https://app.example/contacts')]).toEqual([]);
  });
});
