import { describe, expect, it } from 'vitest';
import { AttrFilterDefaultOperator, BoolOperator, Platform, SalesStageV2, Sort } from '~api/generated/contacts/graphql';
import { EMPTY_FILTER, type ContactsFilter } from './contactsFilter';
import {
  DEFAULT_STARTER_FIELDS,
  MAX_SAVED_VIEWS,
  describeSavedView,
  detectRolling,
  findMatchingView,
  nextViewId,
  parseSavedViews,
  removeSavedView,
  renameSavedView,
  resolveSavedFilter,
  sameFilter,
  sanitizeFilter,
  serializeSavedViews,
  starterViews,
  upsertSavedView,
  type SavedView,
} from './savedViews';

const NOW = Date.parse('2026-08-18T12:00:00.000Z');
const DAY = 86_400_000;

const view = (over: Partial<SavedView> = {}): SavedView => ({
  id: 'v1',
  name: 'Mine',
  filter: EMPTY_FILTER,
  density: 'cozy',
  layout: null,
  rolling: null,
  savedAt: NOW,
  ...over,
});

describe('nothing read back can throw', () => {
  it('treats a missing item as never stored', () => {
    expect(parseSavedViews(null, NOW)).toEqual({ views: [], empty: true });
    expect(parseSavedViews(undefined, NOW)).toEqual({ views: [], empty: true });
    expect(parseSavedViews('   ', NOW)).toEqual({ views: [], empty: true });
  });

  it('treats unreadable JSON as never stored rather than as a crash', () => {
    expect(parseSavedViews('{oh no', NOW).empty).toBe(true);
    expect(parseSavedViews('"a string"', NOW).empty).toBe(true);
    expect(parseSavedViews('42', NOW).empty).toBe(true);
  });

  it('distinguishes a stored empty list from nothing stored', () => {
    expect(parseSavedViews('[]', NOW)).toEqual({ views: [], empty: false });
  });

  it('accepts both the bare array and the envelope', () => {
    const one = [{ id: 'a', name: 'A' }];
    expect(parseSavedViews(JSON.stringify(one), NOW).views).toHaveLength(1);
    expect(parseSavedViews(JSON.stringify({ views: one }), NOW).views).toHaveLength(1);
  });

  it('repairs what it can and drops what it cannot', () => {
    const raw = JSON.stringify([null, 42, { id: 'ok', name: '  Trimmed  ', filter: { q: 'anna' } }, { name: '' }]);
    const { views } = parseSavedViews(raw, NOW);
    expect(views.map((entry) => entry.name)).toEqual(['Trimmed', 'Untitled view']);
    expect(views[0].filter.q).toBe('anna');
  });

  it('drops a duplicate id rather than showing two rows that fight', () => {
    const raw = JSON.stringify([
      { id: 'same', name: 'First' },
      { id: 'same', name: 'Second' },
    ]);
    expect(parseSavedViews(raw, NOW).views.map((entry) => entry.name)).toEqual(['First']);
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_SAVED_VIEWS + 10 }, (_, index) => ({
      id: `v${index}`,
      name: `View ${index}`,
    }));
    expect(parseSavedViews(JSON.stringify(many), NOW).views).toHaveLength(MAX_SAVED_VIEWS);
    expect(JSON.parse(serializeSavedViews(parseSavedViews(JSON.stringify(many), NOW).views))).toHaveLength(
      MAX_SAVED_VIEWS,
    );
  });
});

describe('a filter read back is one this module can run', () => {
  it('falls back on every unknown enum member', () => {
    const filter = sanitizeFilter({
      assignee: 'whoever',
      stages: ['Ready', 'Nope'],
      platforms: ['whatsapp', 'carrier pigeon'],
      groupOperator: 'MAYBE',
      sort: { name: 'city', direction: 'sideways' },
      groups: [{ id: 'g1', operator: 'XOR', predicates: [{ name: 'city', operator: 'FUZZY' }] }],
    });
    expect(filter.assignee).toBe('Any');
    expect(filter.stages).toEqual([SalesStageV2.Ready]);
    expect(filter.platforms).toEqual([Platform.Whatsapp]);
    expect(filter.groupOperator).toBe(BoolOperator.And);
    expect(filter.sort).toBeNull();
    expect(filter.groups[0].operator).toBe(BoolOperator.And);
    expect(filter.groups[0].predicates[0].operator).toBe(AttrFilterDefaultOperator.Is);
  });

  it('reads every stage as no stage filter, the way the URL does', () => {
    expect(sanitizeFilter({ stages: [...Object.values(SalesStageV2)] }).stages).toEqual([]);
  });

  it('reads no channel as every channel', () => {
    expect(sanitizeFilter({ platforms: [] }).platforms).toHaveLength(5);
  });

  it('drops an instant Date cannot read instead of sending it', () => {
    expect(sanitizeFilter({ since: 'yesterday-ish' }).since).toBeNull();
    expect(sanitizeFilter({ since: '2026-08-11T00:00:00.000Z' }).since).toBe('2026-08-11T00:00:00.000Z');
  });

  it('drops a nameless predicate and an empty group', () => {
    const filter = sanitizeFilter({
      groups: [
        { id: 'g1', predicates: [{ name: '   ' }] },
        { id: 'g2', predicates: [{ name: 'city', values: ['Berlin', 7] }] },
      ],
    });
    expect(filter.groups).toHaveLength(1);
    expect(filter.groups[0].id).toBe('g2');
    expect(filter.groups[0].predicates[0].values).toEqual(['Berlin']);
  });

  it('caps the number of predicates a stored view can smuggle in', () => {
    const predicates = Array.from({ length: 40 }, (_, index) => ({ name: `f${index}` }));
    const filter = sanitizeFilter({ groups: [{ id: 'g1', predicates }] });
    expect(filter.groups[0].predicates).toHaveLength(20);
  });

  it('keeps a layout only when it says something', () => {
    expect(sanitizeFilter({}).groups).toEqual([]);
    const { views } = parseSavedViews(
      JSON.stringify([
        { id: 'a', name: 'A', layout: { columns: [], hidden: [], widths: {} } },
        { id: 'b', name: 'B', layout: { columns: ['fixed:name'], widths: { 'fixed:name': -3 } } },
      ]),
      NOW,
    );
    expect(views[0].layout).toBeNull();
    expect(views[1].layout).toEqual({ columns: ['fixed:name'], hidden: [], widths: {} });
  });
});

describe('rolling windows', () => {
  it('recomputes a since window from now', () => {
    const rolling = view({
      filter: { ...EMPTY_FILTER, since: '2020-01-01T00:00:00.000Z' },
      rolling: { days: 7, target: { kind: 'since' } },
    });
    const filter = resolveSavedFilter(rolling, NOW);
    expect(filter.since).toBe(new Date(NOW - 7 * DAY).toISOString());
    expect(filter.until).toBeNull();
  });

  it('recomputes a greater-than predicate as a millisecond stamp', () => {
    const [, , , , recent] = starterViews(NOW);
    const filter = resolveSavedFilter(recent, NOW + 30 * DAY);
    expect(filter.groups[0].predicates[0].values).toEqual([String(NOW + 30 * DAY - 7 * DAY)]);
  });

  it('leaves a view with no rolling spec exactly as saved', () => {
    const fixed = view({ filter: { ...EMPTY_FILTER, since: '2026-08-11T00:00:00.000Z' } });
    expect(resolveSavedFilter(fixed, NOW)).toBe(fixed.filter);
  });

  it('offers a rolling spec for a plain window', () => {
    const filter: ContactsFilter = { ...EMPTY_FILTER, since: new Date(NOW - 7 * DAY).toISOString() };
    expect(detectRolling(filter, NOW)).toEqual({ days: 7, target: { kind: 'since' } });
  });

  it('does not offer one for a closed window', () => {
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      since: new Date(NOW - 7 * DAY).toISOString(),
      until: new Date(NOW - DAY).toISOString(),
    };
    expect(detectRolling(filter, NOW)).toBeNull();
  });

  it('offers one for a lone greater-than on a timestamp', () => {
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [
            {
              id: 'p1',
              name: 'last seen',
              operator: AttrFilterDefaultOperator.Gt,
              values: [String(NOW - 30 * DAY)],
            },
          ],
        },
      ],
    };
    expect(detectRolling(filter, NOW)).toEqual({
      days: 30,
      target: { kind: 'predicate', groupId: 'g1', predicateId: 'p1' },
    });
  });

  it('declines when two timestamps compete', () => {
    const predicate = (id: string) => ({
      id,
      name: 'last seen',
      operator: AttrFilterDefaultOperator.Gt,
      values: [String(NOW - 30 * DAY)],
    });
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      groups: [{ id: 'g1', operator: BoolOperator.And, predicates: [predicate('p1'), predicate('p2')] }],
    };
    expect(detectRolling(filter, NOW)).toBeNull();
  });

  it('declines a greater-than that is not a timestamp at all', () => {
    const filter: ContactsFilter = {
      ...EMPTY_FILTER,
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [{ id: 'p1', name: 'deal amount', operator: AttrFilterDefaultOperator.Gt, values: ['1000'] }],
        },
      ],
    };
    expect(detectRolling(filter, NOW)).toBeNull();
  });
});

describe('the starter set', () => {
  it('is five questions a person asks on day one', () => {
    expect(starterViews(NOW).map((entry) => entry.name)).toEqual([
      'Unassigned',
      'Unread',
      'Hot leads',
      'No phone',
      'Recently active',
    ]);
  });

  it('marks every one of them as seeded, with a stable id', () => {
    for (const entry of starterViews(NOW)) {
      expect(entry.starter).toBe(true);
      expect(entry.id.startsWith('starter-')).toBe(true);
    }
  });

  it('asks for the two stages a lead is actually working through', () => {
    const hot = starterViews(NOW).find((entry) => entry.id === 'starter-hot-leads');
    expect(hot?.filter.stages).toEqual([SalesStageV2.Ready, SalesStageV2.WorkingOn]);
  });

  it('takes the field names from the live catalog when it has them', () => {
    const [, , , noPhone] = starterViews(NOW, { phone: 'phone number', lastSeen: 'seen at' });
    expect(noPhone.filter.groups[0].predicates[0].name).toBe('phone number');
  });

  it('defaults to the names this API actually uses', () => {
    expect(DEFAULT_STARTER_FIELDS).toEqual({ phone: 'whatsapp phone', lastSeen: 'last seen' });
  });

  it('survives a round trip through storage', () => {
    const { views, empty } = parseSavedViews(serializeSavedViews(starterViews(NOW)), NOW);
    expect(empty).toBe(false);
    expect(views).toEqual(starterViews(NOW));
  });
});

describe('editing the list', () => {
  it('replaces by id and puts the newest first', () => {
    const list = [view({ id: 'a', name: 'A' }), view({ id: 'b', name: 'B' })];
    const next = upsertSavedView(list, view({ id: 'b', name: 'B2' }));
    expect(next.map((entry) => entry.name)).toEqual(['B2', 'A']);
  });

  it('renames, and refuses to rename to nothing', () => {
    const list = [view({ id: 'a', name: 'A' })];
    expect(renameSavedView(list, 'a', '  New  ')[0].name).toBe('New');
    expect(renameSavedView(list, 'a', '   ')[0].name).toBe('A');
  });

  it('removes by id', () => {
    const list = [view({ id: 'a' }), view({ id: 'b' })];
    expect(removeSavedView(list, 'a').map((entry) => entry.id)).toEqual(['b']);
  });

  it('never hands out an id already taken', () => {
    const taken = [view({ id: `mine-${NOW.toString(36)}` })];
    expect(nextViewId(taken, 'Mine', NOW)).toBe(`mine-${NOW.toString(36)}-2`);
    expect(nextViewId([], '  ✳︎  ', NOW)).toBe(`view-${NOW.toString(36)}`);
  });
});

describe('which view the screen is', () => {
  it('ignores ids and half-typed rows', () => {
    const a: ContactsFilter = {
      ...EMPTY_FILTER,
      groups: [
        {
          id: 'g1',
          operator: BoolOperator.And,
          predicates: [{ id: 'p1', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin'] }],
        },
      ],
    };
    const b: ContactsFilter = {
      ...EMPTY_FILTER,
      groups: [
        {
          id: 'other',
          operator: BoolOperator.And,
          predicates: [
            { id: 'zz', name: 'city', operator: AttrFilterDefaultOperator.Is, values: ['Berlin'] },
            { id: 'draft', name: '', operator: AttrFilterDefaultOperator.Is, values: [''] },
          ],
        },
      ],
    };
    expect(sameFilter(a, b)).toBe(true);
  });

  it('does not care what order the channels came in', () => {
    const a: ContactsFilter = { ...EMPTY_FILTER, platforms: [Platform.Whatsapp, Platform.Widget] };
    const b: ContactsFilter = { ...EMPTY_FILTER, platforms: [Platform.Widget, Platform.Whatsapp] };
    expect(sameFilter(a, b)).toBe(true);
  });

  it('separates two sorts of the same field', () => {
    const a: ContactsFilter = { ...EMPTY_FILTER, sort: { name: 'city', direction: Sort.Asc } };
    const b: ContactsFilter = { ...EMPTY_FILTER, sort: { name: 'city', direction: Sort.Desc } };
    expect(sameFilter(a, b)).toBe(false);
  });

  it('ticks a rolling view even though its instant moved', () => {
    const views = starterViews(NOW);
    const applied = resolveSavedFilter(views[4], NOW);
    // Half an hour later the rolling instant is different, and it is still that view.
    expect(findMatchingView(views, applied, NOW + 1_800_000)?.id).toBe('starter-recently-active');
  });

  it('finds nothing once the filter has moved on', () => {
    const views = starterViews(NOW);
    expect(findMatchingView(views, { ...EMPTY_FILTER, q: 'anna' }, NOW)).toBeNull();
  });
});

describe('the caption under a name', () => {
  it('says what the filter asks for', () => {
    const caption = describeSavedView(
      view({
        filter: {
          ...EMPTY_FILTER,
          q: 'anna',
          assignee: 'Unassigned',
          stages: [SalesStageV2.Ready],
          unreadOnly: true,
          platforms: [Platform.Whatsapp],
          sort: { name: 'city', direction: Sort.Asc },
        },
      }),
    );
    expect(caption).toBe('“anna” · Unassigned · Ready · Unread · WhatsApp · sorted by city');
  });

  it('counts field conditions and names a rolling window', () => {
    const [, , , , recent] = starterViews(NOW);
    expect(describeSavedView(recent)).toBe('1 field condition · rolling 7 days');
  });

  it('calls a fixed window what it is', () => {
    const caption = describeSavedView(view({ filter: { ...EMPTY_FILTER, since: '2026-08-11T00:00:00.000Z' } }));
    expect(caption).toBe('a fixed time window');
  });

  it('says so when there is nothing to say', () => {
    expect(describeSavedView(view())).toBe('Every contact');
  });

  it('mentions the columns only when it carries them', () => {
    const withLayout = view({ layout: { columns: ['fixed:name'], hidden: [], widths: {} } });
    expect(describeSavedView(withLayout)).toContain('its columns');
  });
});
