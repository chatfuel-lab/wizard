import type { ModuleClient } from '~api';
import type { ChatListQuery, ConversationMessagesQuery } from '~api/generated/livechat/graphql';

/**
 * The injected client, under the module's historical local name. Satisfied by
 * the real ChatfuelClient (~api) — this module never constructs one.
 */
export type ApiClient = ModuleClient;

/** One chat-list entry (the ChatListContact fragment shape). */
export type ChatNode = NonNullable<ChatListQuery['bot']>['contactChatsConnection']['edges'][number]['node'];

export type ConversationInfo = NonNullable<NonNullable<ConversationMessagesQuery['bot']>['conversation']>;

/** One thread message (MessageCommon + per-platform parts union). */
export type MessageNode = ConversationInfo['messages']['edges'][number]['node'];

/**
 * The chat list's `lastMessage` (the `LastMessagePreview` fragment): the one
 * string that summarises a message plus the outbound status field, and no
 * sender, no errors. A different projection of the same typenames as
 * `MessageNode`, and read through the same typename discipline.
 */
export type LastMessageNode = NonNullable<NonNullable<ChatNode['conversation']>['lastMessage']>;
