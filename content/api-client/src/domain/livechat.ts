import {
  ContactAssigneeFilterType,
  type ChatListCountQueryVariables,
  type ChatListQueryVariables,
  type ChatListUpdatesSubscriptionVariables,
  type ContactAssigneeFilter,
  type SalesStageV2,
} from '../generated/livechat/graphql';

/**
 * Everything that narrows the chat list, as ONE object.
 *
 * The ChatListUpdates subscription must run on byte-identical filters to the
 * ChatList query (guide.md). When they drift, the subscription answers a
 * different question than the query did, and its Add/Update events are contacts
 * from somebody else's result set being merged into this list — a list that
 * then disagrees with itself until the next full refetch, silently.
 *
 * A shared constant was not enough to make that impossible: nothing stopped a
 * caller from spreading it into the query and then adding `textInputFilter` to
 * only one of the two call sites. The builders below are the fix. They take the
 * same filter object and return each operation's variables, so a filter can
 * only reach the wire through a function that serves all of them.
 *
 * There are three now, not two. The count is the same question asked for a
 * cardinality instead of a page, and it is the one most likely to drift,
 * because the SDL gives it a DIFFERENT input type — `ContactChatsCountFilter`
 * rather than the connection's inline arguments. A count built by hand beside
 * a list built by a builder is a number that disagrees with the rows under it,
 * and nothing in the type system would have said so.
 */
export interface ChatListFilter {
  assigneeFilter: ContactAssigneeFilter;
  unreadOnly: boolean;
  salesStageV2Filter: SalesStageV2[];
  textInputFilter: string | null;
}

/** The default: every contact with a conversation, read or not. */
export const UNFILTERED_CHAT_ARGS: ChatListFilter = {
  assigneeFilter: { type: ContactAssigneeFilterType.Any },
  unreadOnly: false,
  salesStageV2Filter: [],
  textInputFilter: null,
};

export const CHAT_LIST_PAGE_SIZE = 50;
export const MESSAGES_PAGE_SIZE = 50;

/**
 * Chat-list page request. `after` walks forward through the list; page 1 passes
 * null. The return type is the generated one on purpose — if codegen ever grows
 * the query a new variable, this stops compiling instead of quietly sending a
 * narrower request than the subscription is listening on.
 */
export function chatListQueryVars(
  botID: string,
  filter: ChatListFilter,
  after: string | null = null,
): ChatListQueryVariables {
  return { botID, first: CHAT_LIST_PAGE_SIZE, after, ...filter };
}

/** The same filter, on the live channel. Paging arguments are the only difference. */
export function chatListSubscriptionVars(botID: string, filter: ChatListFilter): ChatListUpdatesSubscriptionVariables {
  return { botID, ...filter };
}

/**
 * The same filter, asked for its size.
 *
 * `ContactChatsCountFilter` is a superset of what the connection takes — it
 * also has `lastMessageTimeAfter` / `Before`, which the list has no way to
 * express — so the mapping is a widening and every field `ChatListFilter`
 * carries lands on it by name. The spread is deliberate rather than passing
 * `filter` straight through: it makes the object the caller holds and the
 * object on the wire different objects, so a later mutation of one cannot
 * reach the other, and it puts excess-property checking on this line.
 */
export function chatListCountVars(botID: string, filter: ChatListFilter): ChatListCountQueryVariables {
  return { botID, filter: { ...filter } };
}
