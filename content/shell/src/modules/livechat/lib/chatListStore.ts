import type { ChatListFilter } from '~api/domain/livechat';
import type { ChatListQuery, SalesStageV2 } from '~api/generated/livechat/graphql';
import type { ChatNode } from '../types';
import { applyConversationPatch, type ConversationPatch } from './conversationPatch';

/**
 * The inbox list as a pure reducer.
 *
 * What this file exists to make testable:
 *
 * - The filter is state. Both the query and the subscription build their
 *   variables from `vars.filter` through the shared builders in
 *   `~api/domain/livechat`, so the live channel cannot end up listening on a
 *   narrower or wider question than the one the list was answering.
 * - The server sends no positions. Add and Update are upserts followed by a
 *   re-sort on `lastConversationMessageTime`; a contact that stops matching the
 *   filter arrives as a Remove, never as an Update, so both have to be handled
 *   and only one of them deletes.
 * - `byId` is exactly the loaded window, not a cache. This is the one place
 *   this store deliberately departs from the deals board: there is a single
 *   view here, and a contact kept around after it fell out of the filter would
 *   be resurrected by the next re-sort.
 * - `epoch` lives in state rather than in a ref, so the stale-response guard is
 *   something a test can assert. `live` is the exception, guarded by `loading`
 *   instead — epoch-gating it would force the subscription effect to depend on
 *   the epoch, and the WebSocket would then tear down and re-establish on every
 *   reconnect-driven refetch.
 *
 * The reducer never reads the clock: `now` arrives in the action.
 */

/** Everything a chat-list request keys on. One object, so no half of it can go stale alone. */
export interface ChatListVars {
  filter: ChatListFilter;
}

export interface ChatListState {
  vars: ChatListVars;
  /** id → contact. Exactly the loaded window. */
  byId: Record<string, ChatNode>;
  /** Contact ids, newest activity first. */
  order: string[];
  endCursor: string | null;
  hasMore: boolean;
  /** A page request is in flight. */
  loadingMore: boolean;
  epoch: number;
  loading: boolean;
  error: string | null;
}

/** One `ChatList` response. */
export interface LoadedChatPage {
  nodes: readonly ChatNode[];
  hasNext: boolean;
  endCursor: string | null;
}

/** A `ChatList` response, shaped for `loaded` / `pageLoaded`. */
export const toPage = (data: ChatListQuery): LoadedChatPage => {
  const connection = data.bot?.contactChatsConnection;
  return {
    nodes: (connection?.edges ?? []).map((edge) => edge.node),
    hasNext: connection?.pageInfo.hasNextPage ?? false,
    endCursor: connection?.pageInfo.endCursor ?? null,
  };
};

export type ChatListUpdateAction = 'Add' | 'Update' | 'Remove';

export interface ChatListUpdate {
  action: ChatListUpdateAction;
  node: ChatNode;
}

export type ChatListAction =
  | { type: 'reset'; vars: ChatListVars }
  | { type: 'refetch' }
  | { type: 'loaded'; epoch: number; page: LoadedChatPage }
  | { type: 'pageRequested'; epoch: number }
  | { type: 'pageLoaded'; epoch: number; page: LoadedChatPage }
  | { type: 'pageFailed'; epoch: number }
  | { type: 'live'; updates: readonly ChatListUpdate[] }
  | { type: 'conversationChanged'; patch: ConversationPatch }
  /**
   * The contact's sales stage moved — "close as won / lost" from the thread.
   * A contact-level answer, unlike the conversation patch above: the row IS
   * the contact, and its `updatedAt` is the contact's, so the same freshness
   * rule applies against it.
   */
  | { type: 'stageChanged'; id: string; salesStageV2: SalesStageV2; updatedAt: string }
  | { type: 'failed'; epoch: number; message: string }
  | { type: 'liveFailed'; message: string };

export function initialChatListState(vars: ChatListVars): ChatListState {
  return {
    vars,
    byId: {},
    order: [],
    endCursor: null,
    hasMore: false,
    loadingMore: false,
    epoch: 0,
    loading: true,
    error: null,
  };
}

/** Last activity, falling back to the contact's own timestamp. */
const lastActivity = (chat: ChatNode): string => chat.lastConversationMessageTime ?? chat.updatedAt;

/**
 * Newest first, ties broken by id.
 *
 * The tie-break is load-bearing rather than tidy: `Object.keys` hands back
 * insertion order, so without it two contacts stamped at the same second trade
 * places every time any batch lands, and the row under the pointer is not the
 * row that gets clicked.
 */
function orderOf(byId: Record<string, ChatNode>): string[] {
  const keys = new Map<string, string>();
  for (const [id, chat] of Object.entries(byId)) keys.set(id, lastActivity(chat));
  return [...keys.keys()].sort((a, b) => {
    const ka = keys.get(a)!;
    const kb = keys.get(b)!;
    if (ka !== kb) return ka < kb ? 1 : -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

const indexed = (nodes: readonly ChatNode[]): Record<string, ChatNode> => {
  const byId: Record<string, ChatNode> = {};
  for (const node of nodes) byId[node.id] = node;
  return byId;
};

export function chatListReducer(state: ChatListState, action: ChatListAction): ChatListState {
  switch (action.type) {
    /* A new filter. The rows on screen are answers to a different question, so
     * they go — and the epoch bump IS the request for the new ones. */
    case 'reset':
      return { ...initialChatListState(action.vars), epoch: state.epoch + 1 };

    /* Same filter, asked again: a reconnect, or the resume a
     * ContactListUpdateStopped scheduled. The rows stay on screen until the
     * response lands — blanking the inbox to a spinner every time a WebSocket
     * blinks is the reason this is a separate action from `reset`. Paging goes
     * back to page one, which is what the response will answer with. */
    case 'refetch':
      return {
        ...state,
        endCursor: null,
        hasMore: false,
        loadingMore: false,
        epoch: state.epoch + 1,
        error: null,
      };

    /* Page one replaces the window. It is the whole membership of the filter as
     * the server currently sees it, so anything not on it no longer belongs. */
    case 'loaded': {
      if (action.epoch !== state.epoch) return state;
      const byId = indexed(action.page.nodes);
      return {
        ...state,
        byId,
        order: orderOf(byId),
        endCursor: action.page.endCursor,
        hasMore: action.page.hasNext,
        loadingMore: false,
        loading: false,
        error: null,
      };
    }

    /* Marks the request in flight so a scroll sentinel cannot fire twice for
     * the same page. A no-op when there is nothing more to fetch. */
    case 'pageRequested': {
      if (action.epoch !== state.epoch) return state;
      if (state.loadingMore || !state.hasMore || !state.endCursor) return state;
      return { ...state, loadingMore: true };
    }

    case 'pageLoaded': {
      if (action.epoch !== state.epoch) return state;
      const byId = { ...state.byId, ...indexed(action.page.nodes) };
      const empty = action.page.nodes.length === 0;
      return {
        ...state,
        byId,
        order: orderOf(byId),
        /* An empty page ends the walk whatever hasNextPage claims, and does not
         * adopt its cursor — a null one would restart paging from the top. */
        endCursor: empty ? state.endCursor : action.page.endCursor,
        hasMore: empty ? false : action.page.hasNext,
        loadingMore: false,
      };
    }

    case 'pageFailed':
      return action.epoch === state.epoch ? { ...state, loadingMore: false } : state;

    /* Ignored while the first page is in flight: that response supersedes it,
     * and this is also what swallows the last event of a subscription being
     * torn down after a filter change. */
    case 'live': {
      if (state.loading || action.updates.length === 0) return state;
      const byId = { ...state.byId };
      for (const { action: kind, node } of action.updates) {
        /* A contact that no longer matches the filter arrives here, not as an
         * Update — which is why Update may never be treated as a possible
         * removal, and why Remove has to delete rather than upsert. */
        if (kind === 'Remove') delete byId[node.id];
        else byId[node.id] = node;
      }
      return { ...state, byId, order: orderOf(byId) };
    }

    /* A lifecycle mutation's answer, applied to the row it names. Not an
     * upsert: the answer is three fields of a `Conversation`, not a contact,
     * and a row this list does not hold is not invented from it — the server's
     * `Add` is what carries a name and a preview. `read: true` also zeroes the
     * badge, because that is what the field means and the count is what the
     * row draws. The order is untouched: none of these bump
     * `lastConversationMessageTime`, and re-sorting on a status change would
     * move the row under the pointer of the person who just pressed the button. */
    case 'conversationChanged': {
      const chat = state.byId[action.patch.id];
      if (!chat?.conversation) return state;
      const conversation = applyConversationPatch(chat.conversation, action.patch);
      if (conversation === chat.conversation) return state;
      const next: ChatNode = { ...chat, conversation };
      if (action.patch.read === true) next.unreadMessagesCount = 0;
      return { ...state, byId: { ...state.byId, [chat.id]: next } };
    }

    case 'stageChanged': {
      const chat = state.byId[action.id];
      if (!chat) return state;
      /* Same rule as the conversation patch: a late answer never overwrites a
         fresher event, and no change is the same object. */
      if (action.updatedAt < chat.updatedAt) return state;
      if (chat.salesStageV2 === action.salesStageV2 && chat.updatedAt === action.updatedAt) return state;
      return {
        ...state,
        byId: { ...state.byId, [chat.id]: { ...chat, salesStageV2: action.salesStageV2, updatedAt: action.updatedAt } },
      };
    }

    case 'failed':
      return action.epoch === state.epoch ? { ...state, loading: false, error: action.message } : state;

    /* The live channel dropping is not a load failure: the rows on screen are
     * still true, so `loading` is left alone and the pane keeps rendering them. */
    case 'liveFailed':
      return { ...state, error: action.message };
  }
}

/** The list the components render. Ids with no record are skipped. */
export function selectChats(state: ChatListState): ChatNode[] {
  const chats: ChatNode[] = [];
  for (const id of state.order) {
    const chat = state.byId[id];
    if (chat) chats.push(chat);
  }
  return chats;
}

/**
 * How long until a throttled subscription resumes.
 *
 * `ContactListUpdateStopped` means the server has stopped sending this list's
 * updates for a while; the only correct response is a full refetch when it says
 * it will start again. An unparseable or already-past timestamp refetches now
 * rather than never — the alternative is an inbox that silently stops moving.
 */
export function resumeDelay(willResumeAt: string, now: number): number {
  const at = Date.parse(willResumeAt);
  return Number.isFinite(at) ? Math.max(0, at - now) : 0;
}
