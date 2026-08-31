import { describe, expect, it } from 'vitest';
import {
  BOTTOM_THRESHOLD_PX,
  buildChatRows,
  distanceFromBottom,
  localDayKey,
  nextUnreadAnchor,
  preservedScrollTop,
  relativeDay,
  shouldStickToBottom,
  unreadRowIndex,
  type ChatMessageLike,
  type ChatRow,
} from './messageList';

/* Every timestamp below is built from local-time components, never from a UTC
   string, so the assertions mean the same thing in every timezone the repo is
   checked out in. */
const at = (year: number, month: number, day: number, hour = 12, minute = 0): number =>
  new Date(year, month - 1, day, hour, minute).getTime();

const msg = (id: string, when: number): ChatMessageLike => ({ id, at: when });

const days = (rows: readonly ChatRow<ChatMessageLike>[]): string[] =>
  rows.flatMap((row) => (row.kind === 'day' ? [row.day] : []));

const kinds = (rows: readonly ChatRow<ChatMessageLike>[]): string[] => rows.map((row) => row.kind);

describe('localDayKey', () => {
  it('reports the local calendar day, not the UTC one', () => {
    /* 23:30 local on the 13th is the 14th in UTC anywhere east of London — the
       exact case a toISOString().slice(0, 10) implementation gets wrong. */
    expect(localDayKey(at(2026, 8, 13, 23, 30))).toBe('2026-08-13');
    expect(localDayKey(at(2026, 8, 13, 0, 15))).toBe('2026-08-13');
  });

  it('zero-pads so keys sort lexicographically', () => {
    expect(localDayKey(at(2026, 1, 5, 9))).toBe('2026-01-05');
  });

  it('survives a bad timestamp instead of throwing mid-render', () => {
    expect(localDayKey(Number.NaN)).toBe('');
  });
});

describe('relativeDay', () => {
  const now = at(2026, 8, 13, 14, 30);

  it('names today and yesterday, and nothing else', () => {
    expect(relativeDay(at(2026, 8, 13, 1, 0), now)).toBe('today');
    expect(relativeDay(at(2026, 8, 13, 23, 59), now)).toBe('today');
    expect(relativeDay(at(2026, 8, 12, 23, 59), now)).toBe('yesterday');
    expect(relativeDay(at(2026, 8, 11, 23, 59), now)).toBe('older');
  });

  it('treats a future day as older rather than claiming it is today', () => {
    expect(relativeDay(at(2026, 8, 14, 9, 0), now)).toBe('older');
  });

  it('crosses a month and a year boundary', () => {
    expect(relativeDay(at(2026, 7, 31, 20, 0), at(2026, 8, 1, 9, 0))).toBe('yesterday');
    expect(relativeDay(at(2025, 12, 31, 20, 0), at(2026, 1, 1, 9, 0))).toBe('yesterday');
  });
});

describe('buildChatRows — day separators', () => {
  it('returns nothing for an empty thread', () => {
    expect(buildChatRows({ items: [] })).toEqual([]);
  });

  it('opens with a separator even for a single message', () => {
    const rows = buildChatRows({ items: [msg('a', at(2026, 8, 13, 9))] });
    expect(kinds(rows)).toEqual(['day', 'message']);
  });

  it('emits one separator per day, not one per message', () => {
    const rows = buildChatRows({
      items: [
        msg('a', at(2026, 8, 12, 9)),
        msg('b', at(2026, 8, 12, 17)),
        msg('c', at(2026, 8, 13, 8)),
        msg('d', at(2026, 8, 13, 8, 30)),
      ],
    });
    expect(days(rows)).toEqual(['2026-08-12', '2026-08-13']);
    expect(kinds(rows)).toEqual(['day', 'message', 'message', 'day', 'message', 'message']);
  });

  it('does not separate messages that straddle midnight-adjacent hours of the same day', () => {
    /* 00:01 and 23:59 of the SAME day are one bucket — the boundary that a
       "more than N hours apart" heuristic would split and a calendar-day one
       must not. */
    const rows = buildChatRows({
      items: [msg('a', at(2026, 8, 13, 0, 1)), msg('b', at(2026, 8, 13, 23, 59))],
    });
    expect(days(rows)).toEqual(['2026-08-13']);
  });

  it('separates two messages two minutes apart when midnight is between them', () => {
    const rows = buildChatRows({
      items: [msg('a', at(2026, 8, 13, 23, 59)), msg('b', at(2026, 8, 14, 0, 1))],
    });
    expect(days(rows)).toEqual(['2026-08-13', '2026-08-14']);
  });

  it('dates the separator from its first message, not from midnight', () => {
    const first = at(2026, 8, 13, 9, 15);
    const rows = buildChatRows({ items: [msg('a', first)] });
    expect(rows[0]).toMatchObject({ kind: 'day', at: first });
  });

  it('honours an injected day key, so a module can pin a zone', () => {
    const rows = buildChatRows({
      items: [msg('a', at(2026, 8, 12, 9)), msg('b', at(2026, 8, 13, 9))],
      dayKey: () => 'always-the-same-day',
    });
    expect(days(rows)).toEqual(['always-the-same-day']);
  });

  it('gives every row a key unique within the list', () => {
    const rows = buildChatRows({
      items: [msg('a', at(2026, 8, 12, 9)), msg('b', at(2026, 8, 13, 9))],
      unreadAnchorId: 'b',
    });
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });
});

describe('buildChatRows — the unread divider', () => {
  const thread = [msg('a', at(2026, 8, 13, 9)), msg('b', at(2026, 8, 13, 10)), msg('c', at(2026, 8, 13, 11))];

  it('sits directly above its anchor', () => {
    const rows = buildChatRows({ items: thread, unreadAnchorId: 'b' });
    expect(kinds(rows)).toEqual(['day', 'message', 'unread', 'message', 'message']);
    const divider = unreadRowIndex(rows);
    expect(rows[divider + 1]).toMatchObject({ kind: 'message', key: 'msg:b' });
  });

  it('counts every message from the anchor down', () => {
    const rows = buildChatRows({ items: thread, unreadAnchorId: 'b' });
    expect(rows[unreadRowIndex(rows)]).toMatchObject({ kind: 'unread', count: 2 });
  });

  it('renders below the day separator when the anchor opens a day', () => {
    /* "Yesterday" then "New", never a divider orphaned above the date. */
    const rows = buildChatRows({
      items: [msg('a', at(2026, 8, 12, 9)), msg('b', at(2026, 8, 13, 9))],
      unreadAnchorId: 'b',
    });
    expect(kinds(rows)).toEqual(['day', 'message', 'day', 'unread', 'message']);
  });

  it('renders no divider with no anchor, or an anchor outside the loaded page', () => {
    expect(unreadRowIndex(buildChatRows({ items: thread }))).toBe(-1);
    expect(unreadRowIndex(buildChatRows({ items: thread, unreadAnchorId: null }))).toBe(-1);
    expect(unreadRowIndex(buildChatRows({ items: thread, unreadAnchorId: 'paged-out' }))).toBe(-1);
  });

  it('stays put when new messages arrive', () => {
    /* The whole feature, in one assertion: the divider is anchored to a
       message id, so appending moves it neither up nor down the list. */
    const before = buildChatRows({ items: thread, unreadAnchorId: 'b' });
    const after = buildChatRows({
      items: [...thread, msg('d', at(2026, 8, 13, 12)), msg('e', at(2026, 8, 13, 13))],
      unreadAnchorId: 'b',
    });
    expect(unreadRowIndex(after)).toBe(unreadRowIndex(before));
    expect(after[unreadRowIndex(after) + 1]).toMatchObject({ key: 'msg:b' });
  });

  it('moves down by exactly the number of rows prepended when history loads', () => {
    const older = [msg('older-1', at(2026, 8, 11, 9)), msg('older-2', at(2026, 8, 11, 10))];
    const before = buildChatRows({ items: thread, unreadAnchorId: 'b' });
    const after = buildChatRows({ items: [...older, ...thread], unreadAnchorId: 'b' });
    /* Two messages plus the extra day separator they bring with them. */
    expect(unreadRowIndex(after) - unreadRowIndex(before)).toBe(3);
  });

  it('counts only the messages still below it after an append', () => {
    const rows = buildChatRows({
      items: [...thread, msg('d', at(2026, 8, 13, 12))],
      unreadAnchorId: 'b',
    });
    expect(rows[unreadRowIndex(rows)]).toMatchObject({ count: 3 });
  });
});

describe('nextUnreadAnchor', () => {
  it('adopts the server cursor when a thread opens', () => {
    expect(nextUnreadAnchor(null, 'chat-1', 'm-7')).toEqual({ threadKey: 'chat-1', messageId: 'm-7' });
  });

  it('freezes while the reader reads, even as the cursor advances or clears', () => {
    const pinned = nextUnreadAnchor(null, 'chat-1', 'm-7');
    expect(nextUnreadAnchor(pinned, 'chat-1', 'm-9')).toBe(pinned);
    expect(nextUnreadAnchor(pinned, 'chat-1', null)).toBe(pinned);
    expect(nextUnreadAnchor(pinned, 'chat-1', undefined)).toBe(pinned);
  });

  it('returns the same object when nothing changed, so state bails out', () => {
    const pinned = nextUnreadAnchor(null, 'chat-1', 'm-7');
    expect(nextUnreadAnchor(pinned, 'chat-1', 'm-7')).toBe(pinned);
  });

  it('re-anchors on a different thread', () => {
    const pinned = nextUnreadAnchor(null, 'chat-1', 'm-7');
    expect(nextUnreadAnchor(pinned, 'chat-2', 'm-2')).toEqual({
      threadKey: 'chat-2',
      messageId: 'm-2',
    });
  });

  it('still claims a null pin when the unread cursor arrives a tick late', () => {
    /* Messages and the unread cursor come from separate queries. A thread that
       renders before the cursor lands must not be stuck with no divider. */
    const early = nextUnreadAnchor(null, 'chat-1', undefined);
    expect(early.messageId).toBeNull();
    const settled = nextUnreadAnchor(early, 'chat-1', 'm-7');
    expect(settled.messageId).toBe('m-7');
    /* …and having claimed it once, it freezes like any other anchor. */
    expect(nextUnreadAnchor(settled, 'chat-1', 'm-9')).toBe(settled);
  });

  it('keeps a fully-read thread free of a divider', () => {
    const anchor = nextUnreadAnchor(null, 'chat-1', null);
    expect(anchor.messageId).toBeNull();
    expect(
      unreadRowIndex(buildChatRows({ items: [msg('a', at(2026, 8, 13, 9))], unreadAnchorId: anchor.messageId })),
    ).toBe(-1);
  });
});

describe('shouldStickToBottom', () => {
  const metrics = (scrollTop: number) => ({ scrollTop, scrollHeight: 2000, clientHeight: 600 });

  it('sticks when the reader is at or near the bottom', () => {
    expect(shouldStickToBottom(metrics(1400))).toBe(true);
    expect(shouldStickToBottom(metrics(1400 - BOTTOM_THRESHOLD_PX))).toBe(true);
  });

  it('lets go the moment the reader scrolls up past the threshold', () => {
    expect(shouldStickToBottom(metrics(1400 - BOTTOM_THRESHOLD_PX - 1))).toBe(false);
    expect(shouldStickToBottom(metrics(0))).toBe(false);
  });

  it('sticks when the thread is shorter than its viewport', () => {
    expect(shouldStickToBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 600 })).toBe(true);
  });

  it('sticks through an overscroll bounce past the end', () => {
    expect(distanceFromBottom(metrics(1600))).toBe(0);
    expect(shouldStickToBottom(metrics(1600))).toBe(true);
  });

  it('takes a caller threshold, including zero', () => {
    expect(shouldStickToBottom(metrics(1390), 0)).toBe(false);
    expect(shouldStickToBottom(metrics(1400), 0)).toBe(true);
    expect(shouldStickToBottom(metrics(600), 800)).toBe(true);
  });

  it('does not decide "scrolled away" from an unmeasured scroller', () => {
    expect(shouldStickToBottom({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 })).toBe(true);
    expect(shouldStickToBottom({ scrollTop: Number.NaN, scrollHeight: 2000, clientHeight: 600 })).toBe(true);
  });
});

describe('preservedScrollTop', () => {
  it('adds exactly the height that appeared above the viewport', () => {
    expect(preservedScrollTop(120, 2000, 3200)).toBe(1320);
  });

  it('leaves the position alone when nothing grew', () => {
    expect(preservedScrollTop(120, 2000, 2000)).toBe(120);
    expect(preservedScrollTop(120, 2000, 1500)).toBe(120);
    expect(preservedScrollTop(120, Number.NaN, 2000)).toBe(120);
  });
});
