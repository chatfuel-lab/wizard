import { sortByDesc } from '~api';
import { filterItems, relativeDay, type TextRange } from '~ui';
import { conversationTitle, operatorTitleOf, TITLE_MAX } from './titles';
import type { ConvState } from '../types';

/** One sidebar row: conversation state + first-message preview (list query only). */
export interface ChatRow {
  state: ConvState;
  preview: string | null;
}

/**
 * Upsert by id. CoworkerConversationUpdated payloads carry NO
 * messagesConnection, so an update must preserve the existing row's preview.
 */
export function upsertRow(rows: readonly ChatRow[], state: ConvState): ChatRow[] {
  const index = rows.findIndex((row) => row.state.id === state.id);
  if (index === -1) return [...rows, { state, preview: null }];
  const next = [...rows];
  next[index] = { state, preview: rows[index]!.preview };
  return next;
}

/** First sight of a message fills an empty preview (makes the row visible). */
export function setPreview(rows: readonly ChatRow[], conversationID: string, content: string | null): ChatRow[] {
  const index = rows.findIndex((row) => row.state.id === conversationID);
  if (index === -1 || rows[index]!.preview !== null) return [...rows];
  const next = [...rows];
  next[index] = { ...next[index]!, preview: content ?? '' };
  return next;
}

export function sortRows(rows: readonly ChatRow[]): ChatRow[] {
  return sortByDesc(rows, (row) => row.state.updatedAt);
}

/**
 * Never-used conversations (empty messagesConnection) are hidden.
 * Rows created in THIS session (localIds) stay visible so the user can type
 * the first message.
 */
export function visibleRows(rows: readonly ChatRow[], localIds: ReadonlySet<string>): ChatRow[] {
  return rows.filter((row) => row.preview !== null || localIds.has(row.state.id));
}

/* -------------------------------------------------------------------------- */
/* The operator's own two facts about a chat                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renaming and pinning, on an API that has neither.
 *
 * `guide.md` is explicit: there is **no rename, no delete and no archive** in
 * the public API. What there is, is `frontendStateStorage` — a per-conversation
 * string map the server keeps, already on `CoworkerConvState`, with a
 * set/unset mutation pair. So that is where an operator's own title and their
 * pin live.
 *
 * The alternative was localStorage, and it is worse in every way that matters:
 * it is per-browser, so a chat renamed at the desk is nameless on the laptop;
 * it survives the conversation being deleted server-side and leaks names for
 * ids that no longer exist; and it is invisible to everything but this tab.
 * The storage map is none of those — it is the same account state as the
 * conversation itself.
 *
 * One consequence worth stating out loud, because it is a feature and a
 * caveat at once: **the assistant can read this map.** `frontendStateStorage`
 * exists so the agent has a scratchpad it shares with the client, so a chat the
 * operator renamed "Pricing experiments" is a chat the model can see is called
 * that. That is why the keys are plain words rather than a namespaced blob —
 * `title` and `pinned` read correctly to a model that stumbles across them.
 *
 * Values are strings (the mutation takes `value: String!` and rejects an empty
 * one), so `pinned` is the presence of `'1'` and clearing either is the *unset*
 * mutation, never a set to `''`.
 */
export const STORAGE_PINNED_KEY = 'pinned';
export const STORAGE_PINNED_VALUE = '1';

interface ConvPrefs {
  /** The operator's own name for the chat, or null when they never set one. */
  title: string | null;
  pinned: boolean;
}

export function readPrefs(state: ConvState): ConvPrefs {
  const storage = state.frontendStateStorage ?? {};
  return {
    /* The title half lives in `titles.ts` — see `STORAGE_TITLE_KEY` there. */
    title: operatorTitleOf(storage),
    pinned: storage[STORAGE_PINNED_KEY] === STORAGE_PINNED_VALUE,
  };
}

/* -------------------------------------------------------------------------- */
/* The rail's view model                                                       */
/* -------------------------------------------------------------------------- */

export interface RailRow extends ChatRow {
  /** What the row prints, already decided and truncated — see `titles.ts`. */
  title: string;
  pinned: boolean;
  /**
   * Where the query landed inside `title`, for underlining it.
   *
   * Empty when nothing was searched, and empty when the row matched on its
   * PREVIEW instead — marking characters in a title that had nothing to do with
   * the hit is worse than marking none, because it invites the reader to work
   * out a pattern that is not there. The preview is not marked at all: it is
   * the row's second line and a search that decorates both lines stops looking
   * like a list.
   */
  titleMatch: readonly TextRange[];
}

/**
 * Decorate and order. Pinned rows lead; everything else keeps the recency order
 * the caller sorted, which is the API's own (`updatedAt` desc).
 *
 * The pin sort happens here rather than in `sortRows` because pinning is a
 * *display* choice over a list the server ordered, and `sortRows` is also what
 * the merge tests assert about the wire order.
 */
export function railRows(rows: readonly ChatRow[], max: number = TITLE_MAX): RailRow[] {
  const decorated = rows.map((row): RailRow => ({
    ...row,
    title: conversationTitle(row.state, row.preview, max),
    pinned: readPrefs(row.state).pinned,
    titleMatch: [],
  }));
  /* Two stable passes, not a comparator: `Array.prototype.sort` is stable, so
     filtering by the flag and concatenating says the same thing more plainly. */
  return [...decorated.filter((row) => row.pinned), ...decorated.filter((row) => !row.pinned)];
}

/**
 * Search, client-side, over the rows that are loaded — and the reason is that
 * there is no other kind available.
 *
 * Livechat argues at length that a client-side matcher over a paging list is a
 * lie: it reports "no results" for a contact on page four. The argument is
 * right, and it does not apply here, because it rests on there *being* a
 * server-side filter — `ChatListFilter.textInputFilter` narrows livechat's
 * query and its subscription. `coworkerConversationsConnection` takes `botID`,
 * `first` and `after`, and nothing else. There is no text filter to send.
 *
 * So the honest version is: match what is loaded, and behave accordingly. The
 * rail's search empty state offers to load more chats, which is the difference
 * between a narrow answer and a wrong one.
 */
export function searchRailRows(rows: readonly RailRow[], query: string): RailRow[] {
  const trimmed = query.trim();
  if (trimmed === '') return [...rows];
  /* Title first, preview second: `filterItems` penalises a hit by the position
     of the text it landed in, so a chat whose NAME matches always outranks one
     that merely mentioned the word once in its first message.

     `index` is which of those two texts won, and `ranges` are the hit's
     character positions inside it. Both are carried onto the row rather than
     dropped: `ConversationListItem.name` takes a node now, so the rail can show
     WHY a chat is in a ranked list instead of asking the reader to guess. The
     ranges are attached only for a title hit — see `titleMatch`. */
  return filterItems(rows, trimmed, (row) => [row.title, row.preview ?? '']).map((result) => ({
    ...result.item,
    titleMatch: result.index === 0 ? result.ranges : [],
  }));
}

/* -------------------------------------------------------------------------- */
/* Grouping                                                                    */
/* -------------------------------------------------------------------------- */

type RailGroupId = 'pinned' | 'today' | 'yesterday' | 'earlier';

export interface RailGroup {
  id: RailGroupId;
  label: string;
  rows: RailRow[];
}

const GROUP_LABEL: Record<RailGroupId, string> = {
  pinned: 'Pinned',
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

const ORDER: readonly RailGroupId[] = ['pinned', 'today', 'yesterday', 'earlier'];

/**
 * Date headings over a recency-ordered list, with the pins lifted out.
 *
 * A pinned chat is in the Pinned group and nowhere else — repeating it under
 * Today would make the same conversation two rows, and `j`/`k` would visit it
 * twice. Empty groups are dropped, so a rail with three chats from this morning
 * is one heading, not four.
 *
 * `relativeDay` is `~ui`'s, the same one the message list uses for its day
 * dividers, so "Today" means the same thing in the rail and in the thread.
 */
export function groupRailRows(rows: readonly RailRow[], now: number): RailGroup[] {
  const buckets: Record<RailGroupId, RailRow[]> = { pinned: [], today: [], yesterday: [], earlier: [] };
  for (const row of rows) {
    if (row.pinned) {
      buckets.pinned.push(row);
      continue;
    }
    const at = Date.parse(row.state.updatedAt);
    /* An unparseable timestamp is `NaN`; `relativeDay` answers 'older' for it,
       which is the right place for a row nobody can date. */
    const day = relativeDay(at, now);
    buckets[day === 'today' ? 'today' : day === 'yesterday' ? 'yesterday' : 'earlier'].push(row);
  }
  return ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    label: GROUP_LABEL[id],
    rows: buckets[id],
  }));
}

/** The rows a group list holds, flattened — what `j`/`k` walks. */
export function flattenGroups(groups: readonly RailGroup[]): RailRow[] {
  return groups.flatMap((group) => group.rows);
}

/**
 * Where `j`/`k` land. Nothing selected steps to the first row (or the last, for
 * `k`), and both ends stop rather than wrap — a rail that jumps from the newest
 * chat to the oldest reads as a bug, not as a feature.
 */
export function stepSelection(rows: readonly RailRow[], selectedId: string | null, delta: 1 | -1): string | null {
  if (rows.length === 0) return null;
  const index = rows.findIndex((row) => row.state.id === selectedId);
  if (index === -1) return (delta === 1 ? rows[0] : rows[rows.length - 1])!.state.id;
  const next = index + delta;
  if (next < 0 || next >= rows.length) return null;
  return rows[next]!.state.id;
}
