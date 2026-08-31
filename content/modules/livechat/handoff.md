### Live Chat Inbox (livechat)

The operator inbox: chat list + message thread + composer, live over
WebSocket. Route: `/livechat`; a conversation deep link is
`/livechat?c=<conversationId>` and opens the thread even when the
conversation is not listed in the inbox.

First-task ideas:
1. Open the inbox, write to the bot from a connected channel, and watch the
   conversation arrive live.
2. Add close-to-flow to the thread header — needs a flows list query; see
   `references/guide.md` in chatfuel-livechat and the chatfuel-core references.
3. Add attachment upload to the composer — REST upload via the dev proxy's
   `/chatfuel/api/*` route (the `uploadFile` helper in `src/vendor/api` does
   it), then the Send*Attachment mutations (guide.md "Sending").
4. Add chat-list search using `textInputFilter` — put the filter in
   `chatListStore`'s `vars` and let `chatListQueryVars` /
   `chatListSubscriptionVars` in `src/vendor/api/domain/livechat.ts` build both
   sets of variables from it. The query and the ChatListUpdates subscription
   must run on identical filters, and going through the two builders is what
   makes that structural rather than a thing to remember.
