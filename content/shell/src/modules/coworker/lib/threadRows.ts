import { localDayKey, type ChatMessageLike } from '~ui';
import type { MessageNode, ToolCall } from '../types';
import { GROUP_WINDOW_MS } from './constants';
import { classifyAction, quickReplyText } from './frontendActions';
import { entryKey, messageKind } from './messages';
import type { ThreadEntry } from './threadStore';

/**
 * The thread, flattened into the rows `~ui`'s `MessageList` places.
 *
 * `MessageList` already owns day separators, the unread divider and the
 * virtualization — `buildChatRows` runs inside it over whatever this returns —
 * so what is left here is the part that is specific to an assistant thread and
 * is exactly the part that is easy to get wrong:
 *
 * 1. **Steps collapse.** One question can produce five messages: a skill
 *    lookup, two read tools, a navigation and the answer. Four of those are
 *    steps, and four separate rows read as four separate events when they are
 *    one piece of work. Consecutive steps become ONE run row, and the run
 *    layer draws them as one thing.
 * 2. **Quick replies leave the thread.** `suggest_quick_reply` arrives as a
 *    frontend-action step, one message per option. The newest run of them is
 *    the offer that is still live, and it belongs under the composer as chips,
 *    not in the history as three grey lines — so those entries are pulled out
 *    of the rows entirely. Older ones stay as steps: a record of what was
 *    offered before is history, and history is what a thread is for.
 * 3. **Grouping.** Same author, inside the window, same calendar day, nothing
 *    in between. The day test is `localDayKey` from `~ui` — the same function
 *    the separator above the row is drawn from, so a message can never be
 *    grouped under a separator that says it is a different day.
 *
 * `at` is epoch milliseconds and not the RFC3339 string the API sends, because
 * `MessageList` asks "same day as the row above?" and "newer than the anchor?"
 * on every scroll frame. Parsed once, here.
 */

/** One tool call, with the message it arrived on — the run layer's key. */
export interface RunStep {
  messageId: string;
  call: ToolCall;
}

interface Row extends ChatMessageLike {
  id: string;
  at: number;
}

export interface MessageRow extends Row {
  kind: 'message';
  entry: ThreadEntry;
  /** Same author as the row above, within the window — no name, no timestamp. */
  grouped: boolean;
}

export interface RunRow extends Row {
  kind: 'run';
  steps: RunStep[];
}

export type ThreadRow = MessageRow | RunRow;

export interface Thread {
  /** Oldest first, the order the list paints them. */
  rows: ThreadRow[];
  /** The live offer, in the order the assistant made it. Empty when there is none. */
  quickReplies: string[];
}

/**
 * `Time` is an opaque scalar this module has never validated, and a value
 * `Date.parse` cannot read yields `NaN` — which `MessageList`'s default day
 * label puts through `Intl.DateTimeFormat`, and that THROWS on `NaN` rather
 * than printing something ugly. One malformed timestamp would take the whole
 * thread down, and no test in a node-only suite would ever have rendered it.
 *
 * So an unreadable time inherits the previous row's. That keeps the day
 * grouping monotonic and costs nothing when every timestamp is fine, which is
 * every timestamp the real API has ever sent. `Date.now()` would have been the
 * obvious fallback and is the wrong one: nothing else in this pipeline reads
 * the clock, and a row whose position depends on when it was rendered cannot
 * be tested.
 */
function timeOf(node: MessageNode, previous: number): number {
  const parsed = Date.parse(node.time);
  return Number.isNaN(parsed) ? previous : parsed;
}

/** The single call on a step message, or null. `toolCalls` holds 0 or 1. */
function stepCall(node: MessageNode): ToolCall | null {
  return node.toolCalls?.[0] ?? null;
}

/** The text this entry offers as a quick reply, or null if it is not one. */
function offeredReply(node: MessageNode): string | null {
  const call = stepCall(node);
  if (!call || call.__typename !== 'CoworkerFrontendAction') return null;
  if (classifyAction(call.actionType) !== 'quick-reply') return null;
  return quickReplyText(call.parameters ?? {});
}

/**
 * Entries (ascending, already filtered of noise) → rows and the live offer.
 *
 * One traversal returning both, deliberately. The two answers are not
 * independent: an entry that became a chip must NOT also be a row, and two
 * functions each deciding "is this one of the trailing quick replies?" is how
 * the same option ends up drawn twice, once as a chip and once as a grey line
 * in the history.
 */
export function buildThread(entries: readonly ThreadEntry[]): Thread {
  /* The live offer is the UNBROKEN run of quick-reply actions at the very end.
     Anything else after them — the operator answered, the assistant said
     something more — means the offer is spent, and a spent offer that still
     rendered chips would send a message the operator thought they were
     choosing from a menu that is no longer there. */
  let firstOffered = entries.length;
  while (firstOffered > 0 && offeredReply(entries[firstOffered - 1]!.node) !== null) {
    firstOffered -= 1;
  }
  const quickReplies = entries
    .slice(firstOffered)
    .map((entry) => offeredReply(entry.node))
    .filter((text): text is string => text !== null);

  const rows: ThreadRow[] = [];
  let at = 0;
  let run: RunRow | null = null;
  /* The last MESSAGE row's author and time — a run between two messages does
     not carry them forward, it breaks the group. */
  let previousRole: string | null = null;
  let previousAt = 0;

  for (const entry of entries.slice(0, firstOffered)) {
    const node = entry.node;
    at = timeOf(node, at);

    if (messageKind(node) === 'step') {
      const call = stepCall(node);
      if (call === null) continue;
      if (run === null) {
        run = { kind: 'run', id: `run:${node.id}`, at, steps: [] };
        rows.push(run);
      }
      run.steps.push({ messageId: node.id, call });
      previousRole = null;
      continue;
    }

    run = null;
    const grouped =
      previousRole === node.role && at - previousAt <= GROUP_WINDOW_MS && localDayKey(at) === localDayKey(previousAt);
    rows.push({ kind: 'message', id: entryKey(node), at, entry, grouped });
    previousRole = node.role;
    previousAt = at;
  }

  return { rows, quickReplies };
}

/**
 * Which row the unread divider sits above, or null for no divider.
 *
 * The API's read cursor is `latestReadMessageIDFromAssistant` — the newest
 * assistant message the operator has seen — so the anchor is whatever comes
 * after it. Resolved against the ROWS rather than the entries because the
 * divider is placed by row key, and the message the cursor names may well have
 * been folded into a run.
 *
 * Null when the cursor is not in the loaded rows at all, which is the common
 * case and correct in both directions: an id from before the first page means
 * everything on screen is old, and an id the reducer never saw is one of the
 * invisible messages the counter also advances on. A divider guessed from
 * `unreadMessagesCountFromAssistant` would be worse than none — the guide is
 * explicit that the count includes messages this thread will never draw.
 */
export function unreadAnchorRowId(
  rows: readonly ThreadRow[],
  latestReadMessageId: string | null | undefined,
): string | null {
  if (!latestReadMessageId) return null;
  const index = rows.findIndex((row) =>
    row.kind === 'run'
      ? row.steps.some((step) => step.messageId === latestReadMessageId)
      : row.entry.node.id === latestReadMessageId,
  );
  if (index === -1) return null;
  return rows[index + 1]?.id ?? null;
}
