/**
 * Everything a message list decides before it renders anything.
 *
 * A thread scroller is the one surface in the product where the *decisions* are
 * hard and the markup is trivial: which day separators exist, where the unread
 * divider sits, whether new messages are allowed to move the viewport. All
 * three are pure functions of the message array plus a scroll measurement, so
 * they live here and `chat/MessageList.tsx` is a renderer over them.
 *
 * That split is not only taste — vitest in this repo is node-only, with no
 * jsdom. Logic left inside the component is logic nothing can assert.
 */

/**
 * The minimum a message has to be for this file to place it.
 *
 * `at` is epoch milliseconds, not an RFC3339 string: every question below is
 * arithmetic (same day? newer than the anchor?) and parsing a string per
 * comparison inside a scroll handler is the kind of cost that only shows up on
 * a long thread. The caller parses once, when it maps the API node.
 */
export interface ChatMessageLike {
  id: string;
  at: number;
}

export type ChatRow<T extends ChatMessageLike> =
  /** A day separator. `at` is the first message of that day, not midnight. */
  | { kind: 'day'; key: string; at: number; day: string }
  /** The one-shot unread divider. `count` is how many messages sit below it. */
  | { kind: 'unread'; key: string; at: number; count: number }
  | { kind: 'message'; key: string; at: number; item: T };

/**
 * `YYYY-MM-DD` in the viewer's own zone.
 *
 * Local, deliberately: a separator reading "Aug 13" has to match the day the
 * reader lived through, not UTC's. Built by hand rather than through
 * `toISOString()` — that one converts to UTC first and silently reports the
 * wrong day for anyone east of London after 5pm.
 */
export function localDayKey(at: number): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Which of the three labels a day separator gets.
 *
 * Returns a token rather than text so the component owns the wording and the
 * Intl formatting, and so this stays testable in any timezone.
 *
 * "Yesterday" is computed by stepping the calendar date back one, not by
 * subtracting 86_400_000ms: a DST day is 23 or 25 hours long, and on those two
 * mornings a year the millisecond version labels yesterday as "older".
 */
export function relativeDay(at: number, now: number): 'today' | 'yesterday' | 'older' {
  const target = new Date(at);
  if (Number.isNaN(target.getTime())) return 'older';
  if (sameCalendarDay(target, new Date(now))) return 'today';
  /* Stepped from `now`'s actual time of day, never from midnight — in the
     zones where midnight itself does not exist on a DST morning, a date built
     at 00:00 lands on the previous day and the comparison silently fails. */
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return sameCalendarDay(target, yesterday) ? 'yesterday' : 'older';
}

export interface ChatRowsInput<T extends ChatMessageLike> {
  /** Oldest first — the order the list paints them. */
  items: readonly T[];
  /** The message the divider sits ABOVE. Null/unknown id renders no divider. */
  unreadAnchorId?: string | null;
  /** Same-day test. Override to pin a zone; the default is the viewer's. */
  dayKey?: (at: number) => string;
}

/**
 * The message array, flattened into the rows a scroller actually paints.
 *
 * One flat array rather than nested day sections, because the virtualizer
 * indexes rows: a separator has a height and occupies a slot exactly like a
 * message does, and a nested shape would force every window calculation to
 * flatten it again on each scroll frame.
 *
 * A day separator is emitted when a message's day differs from the previous
 * message's — so the first message always gets one, and a thread that never
 * crosses midnight gets exactly one. The unread divider goes immediately above
 * its anchor, AFTER any separator for that day, so the reader sees
 * "Yesterday" then "New" rather than a divider orphaned above the date.
 */
export function buildChatRows<T extends ChatMessageLike>({
  items,
  unreadAnchorId = null,
  dayKey = localDayKey,
}: ChatRowsInput<T>): ChatRow<T>[] {
  const rows: ChatRow<T>[] = [];
  let previousDay: string | null = null;

  items.forEach((item, index) => {
    const day = dayKey(item.at);
    if (day !== previousDay) {
      rows.push({ kind: 'day', key: `day:${day}`, at: item.at, day });
      previousDay = day;
    }
    if (unreadAnchorId !== null && item.id === unreadAnchorId) {
      rows.push({ kind: 'unread', key: 'unread', at: item.at, count: items.length - index });
    }
    rows.push({ kind: 'message', key: `msg:${item.id}`, at: item.at, item });
  });

  return rows;
}

/**
 * Where the unread divider landed, as an index into `rows`. -1 when there is
 * none — the anchor is not in the loaded page, or everything is read.
 *
 * Exists for the test that matters most about this feature: append a message
 * and the number must not change.
 */
export function unreadRowIndex<T extends ChatMessageLike>(rows: readonly ChatRow<T>[]): number {
  return rows.findIndex((row) => row.kind === 'unread');
}

/**
 * The divider anchor, pinned per thread.
 *
 * The whole point of an unread divider is that it does NOT track the server's
 * idea of "first unread". The moment the reader looks at the thread everything
 * in it is read, so a divider following `firstUnreadId` would slide down to the
 * newest message and then disappear — losing the one thing the reader needed,
 * which is where they had got to.
 *
 * So the anchor is captured once per thread and frozen. Two exceptions, both
 * real:
 *
 * - the thread changed, which is a different anchor by definition;
 * - the thread opened before its unread cursor had loaded. A null pin is not a
 *   decision, it is a thread whose first page had not arrived yet, so the first
 *   non-null id still gets to claim it. Without this the divider never appears
 *   on any thread whose messages and unread cursor come from separate queries,
 *   which is all of them.
 *
 * Returns the SAME object when nothing changed, so a caller holding this in
 * state re-renders only when the divider genuinely moves.
 */
export interface UnreadAnchor {
  threadKey: string;
  messageId: string | null;
}

export function nextUnreadAnchor(
  current: UnreadAnchor | null,
  threadKey: string,
  firstUnreadId: string | null | undefined,
): UnreadAnchor {
  const incoming = firstUnreadId ?? null;
  if (current === null || current.threadKey !== threadKey) return { threadKey, messageId: incoming };
  if (current.messageId === null && incoming !== null) return { threadKey, messageId: incoming };
  return current;
}

/**
 * How close to the bottom still counts as "at the bottom".
 *
 * 80px ≈ one and a bit message bubbles: far enough that a half-scrolled last
 * message still sticks, near enough that a reader who has deliberately scrolled
 * up to re-read something is never dragged back down by an arriving message.
 */
export const BOTTOM_THRESHOLD_PX = 80;

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/** Pixels of content below the viewport. Never negative, even mid-overscroll. */
export function distanceFromBottom({ scrollTop, scrollHeight, clientHeight }: ScrollMetrics): number {
  const distance = scrollHeight - scrollTop - clientHeight;
  return Number.isFinite(distance) ? Math.max(distance, 0) : 0;
}

/**
 * Whether an arriving message is allowed to move the viewport.
 *
 * Measured BEFORE the new content lands, always: once it is in the DOM the
 * scroller is no longer at the bottom by definition, and asking afterwards
 * answers a question nobody wanted. `chat/MessageList.tsx` records this in the
 * scroll handler for exactly that reason.
 *
 * Content shorter than its viewport is "at the bottom" — there is nowhere else
 * to be, and returning false there would strand a two-message thread.
 */
export function shouldStickToBottom(metrics: ScrollMetrics, threshold: number = BOTTOM_THRESHOLD_PX): boolean {
  return distanceFromBottom(metrics) <= Math.max(threshold, 0);
}

/**
 * The scrollTop that keeps the reader looking at the same message after older
 * history is prepended above them.
 *
 * Prepending grows the content upward, so every pixel added above the viewport
 * has to be added to scrollTop or the view jumps back in time by exactly the
 * height of the page that just loaded — the classic "load older" bug, and the
 * reason it is a one-line function with a name instead of an inline expression.
 */
export function preservedScrollTop(scrollTop: number, previousScrollHeight: number, nextScrollHeight: number): number {
  const grown = nextScrollHeight - previousScrollHeight;
  if (!Number.isFinite(grown) || grown <= 0) return scrollTop;
  return scrollTop + grown;
}
