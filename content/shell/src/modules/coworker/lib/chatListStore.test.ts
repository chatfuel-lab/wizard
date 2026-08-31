import { describe, expect, it } from 'vitest';
import type { ConvState } from '../types';
import {
  flattenGroups,
  groupRailRows,
  railRows,
  readPrefs,
  searchRailRows,
  setPreview,
  sortRows,
  stepSelection,
  upsertRow,
  visibleRows,
  type ChatRow,
} from './chatListStore';

const conv = (id: string, updatedAt: string, over: Partial<ConvState> = {}): ConvState =>
  ({
    __typename: 'CoworkerConversation',
    id,
    title: null,
    updatedAt,
    isAgentLoopActive: false,
    unreadMessagesCountFromAssistant: 0,
    latestReadMessageIDFromAssistant: null,
    frontendStateStorage: null,
    pendingAction: null,
    ...over,
  }) as ConvState;

const row = (id: string, updatedAt: string, preview: string | null): ChatRow => ({
  state: conv(id, updatedAt),
  preview,
});

describe('conversation list merge', () => {
  it('upsert preserves the existing preview (updates carry no messages)', () => {
    const rows = [row('c-1', '2026-08-11T10:00:00Z', 'first message')];
    const next = upsertRow(rows, conv('c-1', '2026-08-11T11:00:00Z', { isAgentLoopActive: true }));
    expect(next).toHaveLength(1);
    expect(next[0]!.preview).toBe('first message');
    expect(next[0]!.state.isAgentLoopActive).toBe(true);
  });

  it('upsert appends unknown conversations with an empty preview', () => {
    const next = upsertRow([], conv('c-2', '2026-08-11T10:00:00Z'));
    expect(next[0]!.preview).toBeNull();
  });

  it('setPreview fills only an empty preview', () => {
    const rows = [row('c-1', 't', null), row('c-2', 't', 'kept')];
    const filled = setPreview(rows, 'c-1', 'now visible');
    expect(filled[0]!.preview).toBe('now visible');
    expect(setPreview(filled, 'c-2', 'overwrite?')[1]!.preview).toBe('kept');
  });

  it('sorts by updatedAt descending', () => {
    const rows = [row('old', '2026-08-10T10:00:00Z', 'a'), row('new', '2026-08-11T10:00:00Z', 'b')];
    expect(sortRows(rows).map((r) => r.state.id)).toEqual(['new', 'old']);
  });

  it('hides never-used conversations unless created this session', () => {
    const rows = [row('used', 't', 'hi'), row('fresh-mine', 't', null), row('fresh-other', 't', null)];
    const visible = visibleRows(rows, new Set(['fresh-mine']));
    expect(visible.map((r) => r.state.id)).toEqual(['used', 'fresh-mine']);
  });
});

/* -------------------------------------------------------------------------- */

const stored = (
  id: string,
  updatedAt: string,
  storage: Record<string, unknown> | null,
  over: Partial<ConvState> = {},
): ChatRow => ({
  state: conv(id, updatedAt, { frontendStateStorage: storage, ...over }),
  preview: 'a message',
});

describe('readPrefs', () => {
  it('reads the operator title and the pin out of frontendStateStorage', () => {
    expect(readPrefs(conv('c', 't', { frontendStateStorage: { title: ' Price list ', pinned: '1' } }))).toEqual({
      title: 'Price list',
      pinned: true,
    });
  });

  it('survives a map the assistant wrote into', () => {
    expect(readPrefs(conv('c', 't', { frontendStateStorage: { title: 42, pinned: true } }))).toEqual({
      title: null,
      pinned: false,
    });
    expect(readPrefs(conv('c', 't', { frontendStateStorage: null }))).toEqual({ title: null, pinned: false });
    expect(readPrefs(conv('c', 't', { frontendStateStorage: { title: '   ' } })).title).toBeNull();
  });
});

describe('railRows', () => {
  it('lifts the pinned rows to the front and keeps the rest in order', () => {
    const rows = [
      stored('a', '2026-08-11T10:00:00Z', null),
      stored('b', '2026-08-11T09:00:00Z', { pinned: '1' }),
      stored('c', '2026-08-11T08:00:00Z', null),
    ];
    expect(railRows(rows).map((r) => r.state.id)).toEqual(['b', 'a', 'c']);
  });

  it('prints the operator title over the server one, and survives "null"', () => {
    const rows = [
      stored('a', 't', { title: 'Pricing experiments' }, { title: 'How much should I charge?' }),
      stored('b', 't', null, { title: 'null' }),
    ];
    const [first, second] = railRows(rows);
    expect(first!.title).toBe('Pricing experiments');
    expect(second!.title).toBe('a message');
  });
});

describe('searchRailRows', () => {
  const rows = railRows([
    stored('pipeline', 't', null, { title: 'How is my pipeline doing?' }),
    stored('colour', 't', null, { title: 'Add a colour consultation' }),
  ]);

  it('returns everything for an empty query, and a copy', () => {
    const all = searchRailRows(rows, '   ');
    expect(all.map((r) => r.state.id)).toEqual(['pipeline', 'colour']);
    expect(all).not.toBe(rows);
  });

  it('matches on the title', () => {
    expect(searchRailRows(rows, 'colour').map((r) => r.state.id)).toEqual(['colour']);
  });

  it('matches on the preview too, so a chat is findable by what was said in it', () => {
    expect(
      searchRailRows(rows, 'message')
        .map((r) => r.state.id)
        .sort(),
    ).toEqual(['colour', 'pipeline']);
  });

  it('ranks a title hit above a preview hit', () => {
    const mixed = railRows([
      stored('by-preview', 't', null, { title: 'Something else entirely' }),
      stored('by-title', 't', null, { title: 'A message about pricing' }),
    ]);
    expect(searchRailRows(mixed, 'message')[0]!.state.id).toBe('by-title');
  });
});

describe('groupRailRows', () => {
  const now = Date.parse('2026-08-11T12:00:00Z');
  const rows = railRows([
    stored('today', '2026-08-11T09:00:00Z', null),
    stored('pinned-old', '2026-06-01T09:00:00Z', { pinned: '1' }),
    stored('yesterday', '2026-08-10T09:00:00Z', null),
    stored('earlier', '2026-08-02T09:00:00Z', null),
    stored('undated', 'not-a-date', null),
  ]);

  it('buckets by day, pins first, and drops the empties', () => {
    const groups = groupRailRows(rows, now);
    expect(groups.map((g) => g.id)).toEqual(['pinned', 'today', 'yesterday', 'earlier']);
    expect(groups[0]!.rows.map((r) => r.state.id)).toEqual(['pinned-old']);
    expect(groups[3]!.rows.map((r) => r.state.id)).toEqual(['earlier', 'undated']);
  });

  it('puts a pinned chat in exactly one group', () => {
    expect(flattenGroups(groupRailRows(rows, now)).filter((r) => r.state.id === 'pinned-old')).toHaveLength(1);
  });

  it('emits no group at all for no rows', () => {
    expect(groupRailRows([], now)).toEqual([]);
  });
});

describe('stepSelection', () => {
  const rows = railRows([stored('a', 't', null), stored('b', 't', null), stored('c', 't', null)]);

  it('steps forward and back', () => {
    expect(stepSelection(rows, 'a', 1)).toBe('b');
    expect(stepSelection(rows, 'b', -1)).toBe('a');
  });

  it('enters at the near end when nothing is selected', () => {
    expect(stepSelection(rows, null, 1)).toBe('a');
    expect(stepSelection(rows, null, -1)).toBe('c');
  });

  it('stops at both ends rather than wrapping', () => {
    expect(stepSelection(rows, 'c', 1)).toBeNull();
    expect(stepSelection(rows, 'a', -1)).toBeNull();
    expect(stepSelection([], null, 1)).toBeNull();
  });
});
