# Gaps — what the assistant could not answer

Every mature AI-support product ships a version of this: the questions the assistant failed on, grouped, as a list of content to write. Chatfuel exposes no analytics for it, so it has to be assembled from the inbox — carefully, because this reads other people's conversations and costs real API calls.

## The two signals, and they are the only two

On `Contact`:

```graphql
"""
Means that after the automation handed the chat with the contact over to a human,
no operator has opened it yet
"""
unhandledSwitchToHuman: Boolean!

assignee: ContactAssignee   # FuelyAIAssignee | PublicUserAccount
```

- `unhandledSwitchToHuman: true` — the automation gave up and nobody has picked it up. The strongest signal there is.
- `assignee` is a `PublicUserAccount` — a person owns the chat now, so the assistant is no longer driving it.

`ContactAssigneeFilterType` also has a `FuelyAI` member, so "still with the AI" is filterable server-side.

There is **no** resolution flag, no CSAT, no "the AI said it did not know" marker, and no server-side grouping. Everything past "which conversations went wrong" is local.

## What it genuinely cannot see

Say this in the UI. It is the difference between a useful report and a misleading one:

- `unhandledSwitchToHuman` flips to **false** as soon as an operator opens the chat. A hand-off somebody already handled is invisible. The assignee check catches some of those — the ones still assigned to a person — and nothing catches a chat that was handled and reassigned back.
- A customer who gave up and left without a hand-off leaves no trace at all.
- There is no way to know whether an answer the assistant *did* give was any good.

## The sweep

1. Page `bot.contactChatsConnection(first, after, assigneeFilter: {type: Any}, unreadOnly: false, salesStageV2Filter: [])`, newest first, to a hard cap (~200 contacts / 10 pages).
2. Keep the contacts either signal flags.
3. For those, read the tail of the conversation with `bot.conversation(conversationID:).messages(first:)` — newest first with no cursor — capped (~50) and throttled with a small concurrency limit.
4. Cache the result. Re-scanning on every visit to the page is not acceptable behaviour against somebody's production inbox.

**Start it from a button, never on mount**, show progress, and let it be cancelled.

`conversationID` is the CONTACT id. Passing a contact id there is correct.

Keep the message fragment **slim** — `__typename`, `id`, `sentTime`, `sender { __typename }` and `text` on the inbound text shapes. The livechat skill's message fragment selects every payload field of every platform and its generated types are 1.7 MB; a sweep does not need a bubble.

`sender.__typename` is what tells you who spoke: `ContactMessageSender` (the customer), `AutomationMessageSender` (the assistant), `AdminMessageSender` (a human operator).

## From a thread to a question

Walk the newest-first thread, find the assistant's last message, and take the most recent customer text before it. Handle the threads that break the pattern: no customer text at all, all assistant, or a human who already replied.

## Grouping

Normalise (lowercase, strip punctuation, collapse whitespace, drop stopwords in more than one language — these bots are not all English) and group by token-set overlap. A defensible threshold with a test beats a clever one without.

Rank by count, then recency. Compare each group against the existing FAQ list: a group that already matches an FAQ is a **different problem** — the answer exists and did not fire, so it needs improving, not writing.

**Never invent a number.** No confidence percentages, no "87% match", unless the arithmetic behind it is in a test. Where the result is a heuristic, the UI says so in words a customer would understand.

## The payoff

One button per group: create an FAQ with that question prefilled. That is the whole loop — a failed conversation becomes an answer, and the next customer gets it.
