# Customizing this module

Shared ground rules (tokens, design system, adding operations) live in
`../chatfuel-core/playbooks/customize.md`. Module-specific ideas:

- Restyle the bubbles in `vendor/ui` chat components (`MessageBubble`, `MessageList`, `ThreadHeader`, `Composer`) — the flow builder's Test dock, the Automations Test panel and coworker reuse them.
- Reword the thread: `lib/messageKinds.ts` is one table over every concrete `Message` typename (platform, shape, label), and `lib/messageErrors.ts` is the same for every `MessageErrorCode`. Both are total records typed against the generated union, so a typename you delete is a compile error, not a silent gap.
- Show more of a message: a typename is "described" rather than drawn only because its payload fields are not in `examples/operations.graphql`. Add the inline fragment to `src/vendor/api/operations/livechat.graphql`, run `npm run codegen` in the app, and add the case in `readPayload` — the coverage test names what is missing. The full cycle, including the one-off install the first run prints, is in `../chatfuel-core/playbooks/customize.md`.
- Add quick replies / canned answers to the composer.
