### Coworker (coworker)

The operator-facing AI assistant, on its own page at `/coworker` (deep link
`/coworker?c=<conversationID>`) — one thread over one bot-scoped subscription.

Because the page runs inside the dashboard shell, the assistant can do two
things an embed cannot, and both are wired: it answers `get_frontend_state`
with what the operator is actually looking at (modules publish that through
`usePublishScreenContext`), and it executes `navigate` frontend actions by
moving the app — never from history, never for a conversation nobody is
reading, never mid-keystroke, and always with an undo. Everything that changes
account data stays behind the server's own approval batch; replying while one
is pending rejects it.

The protocol, its traps and the findings behind all of this are in this
module's skill: `references/guide.md`.

First-task ideas:
1. Publish screen context from the modules that do not yet — `contacts`,
   `knowledge-base`, `publishing` and `ads-optimization` — the way
   `deals/DealsApp.tsx` does. Three lines each.
2. Give the assistant more to act on: the `navigate` vocabulary is a page name
   plus deep-link params, so `{pathKey: 'Deals', params: {deal: '<id>'}}`
   already opens one record. Teach the modules to publish the ids it would need.
3. Conversation rename and pin live in `frontendStateStorage`, which the agent
   can also read. If that ever collides with the agent's own use of the map,
   move them under a namespaced key.
4. Attachments are images and documents only; video has no route at all, and
   audio is not an attachment — it goes through its own mutation, one file per
   message. A voice note recorded in the browser goes through that one.

Known limits, all of them named rather than papered over:

- A single tool call in flight shows no spinner: the wire never says which call
  is running, and with one step there is no run group to carry the state. The
  typing indicator and the composer's Stop cover it.

Not in the API, and not faked: rename, delete or archive a conversation
server-side; per-message read marks; ice breakers
(`coworkerConversationCreateIceBreakers` and
`coworkerConversationClickIceBreaker` are not usable from this API); skills
(`coworkerConversationCreateInSkill` needs ids that are not listable publicly).
