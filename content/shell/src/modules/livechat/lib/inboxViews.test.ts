import { describe, expect, it } from 'vitest';
import { SalesStageV2 } from '~api/generated/livechat/graphql';
import { renameEntry, serializeStoredList } from '~ui';
import { EMPTY_INBOX_FILTER, STAGES, userAssigneeKey, withAssignee, withQuery, withUnreadOnly } from './inboxFilter';
import {
  MAX_NAME_LENGTH,
  MAX_SAVED_VIEWS,
  describeSavedView,
  findMatchingView,
  parseSavedViews,
  sanitizeFilter,
  type SavedInboxView,
} from './inboxViews';

/** How the hook serializes — the shared list serializer under this module's cap. */
const serializeSavedViews = (views: readonly SavedInboxView[]): string => serializeStoredList(views, MAX_SAVED_VIEWS);

const NOW = 1_700_000_000_000;

const view = (over: Partial<SavedInboxView> = {}): SavedInboxView => ({
  id: 'mine-unread',
  name: 'Mine, unread',
  filter: withUnreadOnly(EMPTY_INBOX_FILTER, true),
  savedAt: NOW,
  ...over,
});

/**
 * Everything here is about untrusted input. The stored value is a string in
 * per-user storage that an older build, another tab, or a console can have
 * written, and the only unacceptable outcome is a throw.
 */
describe('parseSavedViews', () => {
  it('reads back what it wrote', () => {
    const views = [view()];
    expect(parseSavedViews(serializeSavedViews(views), NOW)).toEqual(views);
  });

  it('treats nothing-ever-written as no views', () => {
    /* An id never written comes back as an item with a null value, not as an
       error, so this is the ordinary first-run path rather than a failure. */
    expect(parseSavedViews(null)).toEqual([]);
    expect(parseSavedViews(undefined)).toEqual([]);
    expect(parseSavedViews('')).toEqual([]);
    expect(parseSavedViews('   ')).toEqual([]);
  });

  it('does not throw on anything at all', () => {
    for (const raw of ['{', 'null', 'true', '"a string"', '42', '[1,2,3]', '{"views":9}']) {
      expect(() => parseSavedViews(raw, NOW)).not.toThrow();
      expect(Array.isArray(parseSavedViews(raw, NOW))).toBe(true);
    }
  });

  it('accepts the enveloped form an earlier shape may have written', () => {
    const raw = JSON.stringify({ views: [view()] });
    expect(parseSavedViews(raw, NOW)).toHaveLength(1);
  });

  it('drops entries that are not objects, keeping the ones that are', () => {
    const raw = JSON.stringify([null, 'nope', 7, view()]);
    const parsed = parseSavedViews(raw, NOW);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe('Mine, unread');
  });

  it('names an entry that has no name', () => {
    const parsed = parseSavedViews(JSON.stringify([{ id: 'a' }]), NOW);
    expect(parsed[0]!.name).toBe('Untitled view');
  });

  it('gives an entry with no id one derived from its position', () => {
    const parsed = parseSavedViews(JSON.stringify([{ name: 'A' }, { name: 'B' }]), NOW);
    expect(parsed.map((entry) => entry.id)).toEqual(['view-0', 'view-1']);
  });

  it('keeps the first of two entries sharing an id', () => {
    const raw = JSON.stringify([view({ name: 'first' }), view({ name: 'second' })]);
    const parsed = parseSavedViews(raw, NOW);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.name).toBe('first');
  });

  it('stamps a missing or unusable savedAt with the supplied clock', () => {
    const raw = JSON.stringify([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', savedAt: 'soon' },
    ]);
    const parsed = parseSavedViews(raw, NOW);
    expect(parsed[0]!.savedAt).toBe(NOW);
    expect(parsed[1]!.savedAt).toBe(NOW);
  });

  it('caps a hostile list at the maximum', () => {
    const many = Array.from({ length: MAX_SAVED_VIEWS + 25 }, (_, index) => view({ id: `v${index}` }));
    expect(parseSavedViews(JSON.stringify(many), NOW)).toHaveLength(MAX_SAVED_VIEWS);
  });

  it('truncates an absurd name rather than rendering it', () => {
    const raw = JSON.stringify([view({ name: 'x'.repeat(500) })]);
    expect(parseSavedViews(raw, NOW)[0]!.name).toHaveLength(MAX_NAME_LENGTH);
  });
});

describe('sanitizeFilter', () => {
  it('turns anything unrecognisable into the empty filter', () => {
    expect(sanitizeFilter(null)).toEqual(EMPTY_INBOX_FILTER);
    expect(sanitizeFilter('nope')).toEqual(EMPTY_INBOX_FILTER);
    expect(sanitizeFilter(undefined)).toEqual(EMPTY_INBOX_FILTER);
  });

  it('keeps a known preset and a real user key', () => {
    expect(sanitizeFilter({ assignee: 'Unassigned' }).assignee).toBe('Unassigned');
    expect(sanitizeFilter({ assignee: 'u:42' }).assignee).toBe('u:42');
  });

  it('rejects a bare "u:" rather than filtering by an empty id', () => {
    /* Sent on, it matches nobody — which renders as a quiet inbox, not as a
       broken one, and is therefore the hardest version of this to notice. */
    expect(sanitizeFilter({ assignee: 'u:' }).assignee).toBe('Any');
  });

  it('rejects an assignee that is neither a preset nor a user key', () => {
    expect(sanitizeFilter({ assignee: 'Everyone' }).assignee).toBe('Any');
    expect(sanitizeFilter({ assignee: 42 }).assignee).toBe('Any');
  });

  it('drops stages the schema does not have, and orders what is left', () => {
    const filter = sanitizeFilter({ stages: ['Won', 'Elvis', 'New'] });
    expect(filter.stages).toEqual([SalesStageV2.New, SalesStageV2.Won]);
  });

  it('dedupes stages', () => {
    expect(sanitizeFilter({ stages: ['Won', 'Won'] }).stages).toEqual([SalesStageV2.Won]);
  });

  it('reads a non-array stage list as no stages', () => {
    expect(sanitizeFilter({ stages: 'Won' }).stages).toEqual([]);
  });

  it('only accepts a literal true for unreadOnly', () => {
    expect(sanitizeFilter({ unreadOnly: true }).unreadOnly).toBe(true);
    expect(sanitizeFilter({ unreadOnly: 'yes' }).unreadOnly).toBe(false);
    expect(sanitizeFilter({ unreadOnly: 1 }).unreadOnly).toBe(false);
  });

  it('caps a very long query', () => {
    expect(sanitizeFilter({ q: 'x'.repeat(9999) }).q.length).toBeLessThanOrEqual(200);
  });

  it('accepts every stage the schema really has', () => {
    expect(sanitizeFilter({ stages: [...STAGES] }).stages).toEqual([...STAGES]);
  });
});

describe('list edits through the shared helpers', () => {
  /* The mechanics themselves are covered where they live; what is pinned here
     is this module's own limits flowing into them. */
  it("caps a rename at this module's name limit", () => {
    const views = [view({ id: 'a', name: 'A' })];
    expect(renameEntry(views, 'a', 'x'.repeat(200), MAX_NAME_LENGTH)[0]!.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('never writes more than the maximum', () => {
    const many = Array.from({ length: MAX_SAVED_VIEWS + 5 }, (_, i) => view({ id: `v${i}` }));
    expect(parseSavedViews(serializeSavedViews(many), NOW)).toHaveLength(MAX_SAVED_VIEWS);
  });
});

describe('findMatchingView', () => {
  it('recognises the filter currently in force', () => {
    const saved = view();
    expect(findMatchingView([saved], withUnreadOnly(EMPTY_INBOX_FILTER, true))).toBe(saved);
  });

  it('returns null once the filter has moved off it', () => {
    expect(findMatchingView([view()], EMPTY_INBOX_FILTER)).toBeNull();
  });

  it('compares by value, not by object identity', () => {
    const saved = view({ filter: { ...EMPTY_INBOX_FILTER, unreadOnly: true } });
    expect(findMatchingView([saved], withUnreadOnly(EMPTY_INBOX_FILTER, true))).toBe(saved);
  });
});

describe('describeSavedView', () => {
  it('says so when a saved view narrows nothing', () => {
    expect(describeSavedView(view({ filter: EMPTY_INBOX_FILTER }))).toBe('No filters');
  });

  it('names what it narrows', () => {
    const saved = view({ filter: withQuery(withUnreadOnly(EMPTY_INBOX_FILTER, true), 'ada') });
    const text = describeSavedView(saved);
    expect(text).toContain('unread only');
    expect(text).toContain('ada');
  });

  it('resolves a teammate through the supplied lookup', () => {
    const saved = view({ filter: withAssignee(EMPTY_INBOX_FILTER, userAssigneeKey('u-42')) });
    expect(describeSavedView(saved, (id) => (id === 'u-42' ? 'Ada' : id))).toBe('Ada');
  });
});
