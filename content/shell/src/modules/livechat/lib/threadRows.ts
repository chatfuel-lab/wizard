import type { ChatMessageLike } from '~ui';
import { messageDirection } from './direction';
import { messageKind } from './messageKinds';
import type { MessageEntry } from './threadStore';

/**
 * The thread, in the shape `~ui`'s `MessageList` places rows from.
 *
 * `ChatMessageLike` is `{ id: string; at: number }` and the `at` is epoch
 * milliseconds rather than the RFC3339 string the API sends, deliberately: the
 * list asks "same calendar day as the previous row?" and "newer than the unread
 * anchor?" on every scroll frame, and parsing a string per comparison is a cost
 * that only shows up on a long thread. Parsed once, here.
 */
export interface ThreadRow extends ChatMessageLike {
  /** `clientId` — the merge key. `Message.id` is nullable and cannot be one. */
  id: string;
  at: number;
  entry: MessageEntry;
}

/**
 * Entries → rows, with one defensive rule.
 *
 * `sentTime` is a `Time` scalar, which is to say an opaque string this module
 * has never validated. A value `Date.parse` cannot read yields `NaN`, and
 * `MessageList`'s default day label formats `at` through `Intl.DateTimeFormat`
 * — which THROWS `RangeError: Invalid time value` on `NaN` rather than
 * returning something ugly. One malformed timestamp would take down the whole
 * thread, and no test in a node-only suite would ever have rendered it.
 *
 * So an unreadable time inherits the previous row's, which keeps the day
 * grouping monotonic and costs nothing when every timestamp is fine — which is
 * every timestamp the real API has ever sent. Falling back to `Date.now()`
 * instead would have been the obvious choice and is the wrong one: the reducer
 * that produced these entries never reads the clock, and a row whose position
 * depends on when it was rendered cannot be tested.
 */
export function toThreadRows(entries: readonly MessageEntry[]): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let previous = 0;
  for (const entry of entries) {
    const parsed = Date.parse(entry.sentTime);
    const at = Number.isNaN(parsed) ? previous : parsed;
    previous = at;
    rows.push({ id: entry.clientId, at, entry });
  }
  return rows;
}

/**
 * Where the "N new messages" divider goes, or null for no divider.
 *
 * The schema has no per-message read cursor: `Conversation.read` is a single
 * boolean and `conversationReadMessages(before:)` is write-only. So the anchor
 * is derived — the oldest message in the unbroken run of inbound messages at
 * the end of the thread, which is precisely "everything since the operator last
 * said something".
 *
 * System lines neither anchor the divider nor break the run. A takeover marker
 * or an auto-close notice landing between two of the contact's messages is not
 * something the operator read, and letting it end the run would put the divider
 * below half the messages it should be above.
 *
 * `read` is nullable in the schema, and only an explicit `false` means unread —
 * a null is the server declining to say, which is not the same as "new". The
 * divider is pinned per thread by `MessageList` itself, so this being derived
 * from a snapshot that mark-as-read is about to invalidate is fine: only the
 * first non-null answer per `threadKey` is ever used.
 */
export function firstUnreadClientId(entries: readonly MessageEntry[], read: boolean | null | undefined): string | null {
  if (read !== false) return null;
  let anchor: string | null = null;
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i]!;
    /* No node means an optimistic send: outbound by definition, and it ends the
       run for the same reason a delivered reply does. */
    if (!entry.node) break;
    if (messageKind(entry.node.__typename).row === 'system') continue;
    if (messageDirection(entry.node) !== 'in') break;
    anchor = entry.clientId;
  }
  return anchor;
}
