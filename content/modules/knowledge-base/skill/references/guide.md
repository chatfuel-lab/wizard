# Knowledge base

Everything the Chatfuel AI knows about a business. Operations: `examples/operations.graphql`.

## The model, and what it is not

The knowledge base is a **structured record**, not a corpus:

| Piece | Where it lives |
|---|---|
| Business profile, opening hours, how to pay, free-text business notes | `bot.fuelyConfig.knowledgeBase` |
| FAQs | `bot.fuelyConfig.knowledgeBase.faqs` — one array, replaced whole |
| Products and services | `bot.goodsCatalog` |
| Bookable staff | `bot.specialists` |
| How much of the AI's reading budget all of it spends | `bot.fuelyConfig.usage { total, catalog }` |

There is **no** file upload, URL crawl, chunking, embedding, vector search, retrieval endpoint, relevance score or citation anywhere in this API. If a design calls for any of those, it has to be built out of the pieces above and labelled honestly. Nothing here is live either: the only Fuely subscription in the schema is `fuelyAutomationUpdated`, which belongs to `../chatfuel-automations/references/guide.md`. Freshness comes from merging each setter's own response, refetching on reconnect, and a Refresh control.

How the AI *behaves* — which channels it answers on, when it hands over, message delays, emoji, catalog photos — is the automations domain, not this one.

## The character budget

Everything in the record is fed to the assistant as text, so the server counts characters and refuses writes past a limit:

- `usage.total` — every character in the record.
- `usage.catalog` — the goods catalog's share of it.
- **There is no limit field in the schema.** Do not draw a gauge against an invented maximum. Show the composition (which source spends what) and treat "full" as a verdict the server delivers.
- The verdict arrives as `FuelyKnowledgeBaseLimitReached` (or `FuelyKnowledgeBaseLimitExceeded`) on a failed write, and `FuelyAdditionalInstructionsCharLimitExceeded` specifically on the prompt. Surface them as "the knowledge base is full", with the breakdown, not as a generic failure.

Every setter and every catalog write in `examples/operations.graphql` re-selects `usage { total catalog }` so the number moves without a refetch.

## Business info

Read with the `KnowledgeBase` query. Live fields only:

`companyName, email, phone, address, website, howToPay, additionalInstructions, businessHoursSchedule.workingHours[{day, enabled, start, end}], faqs[{question, answer}]`

Writes are **one granular mutation per field** — `KBSetCompanyName`, `KBSetPhone`, `KBSetEmail`, `KBSetAddress`, `KBSetWebsite`, `KBSetHowToPay`, `KBSetAdditionalInstructions`, `KBSetBusinessHours`. There is no bulk update. A generated-document map keyed by field collapses into a union no `mutate` call can satisfy; use a switch with one arm per field.

`businessHoursSchedule` is a **full replace**: send all seven days every time, and note that the SDL's `Weekday` enum is alphabetical (`Fri, Mon, Sat, Sun, Thu, Tue, Wed`), so keep your own display order.

### The persona knobs are not here

Agent name, chat language, greeting, message length, emoji policy, catalog photo sharing, the missing-info fallback, the extra agent instructions and who to respond to are **per-scope Fuely automation settings**, not knowledge-base fields, and the schema does not publish them on `FuelyKnowledgeBase` at all. If a design asks for them on this page, it is asking for the automations module.

`additionalInstructions` IS live, and its NAME is the trap. It is not a prompt: the behaviour prompt lives in the automation settings. What is left under this name is the free-text half of the business — how you work, what you will not do, the things a customer has to be told that do not fit a profile field, an FAQ row or a catalog item. A UI that labels it "AI instructions" sends people to write a prompt in a box meant for facts.

## FAQs

See `references/faq.md`. The short version: `KBSetFAQs` replaces the entire array, entries have no ids and are identified by position, and concurrent editors are last-write-wins.

## Goods catalog and specialists

See `references/catalog.md`. The short version: one unpaginated union list containing `DeletedGoodsService` stubs, create and delete answer with the whole catalog while update answers with one item, prices are strings, and images go up over REST first.

## Conversations the assistant could not answer

See `references/gaps.md`. Two contact-level signals exist and nothing else does.

## Importing content

See `references/import.md`. There is no ingestion API, so an import is a local parse that produces FAQ entries or catalog items a person reviews before they are written.

## Permissions

| Object / action | What it gates |
|---|---|
| `Ai: Edit` | Every write on this page |
| `Inbox: View` | Reading conversations for the gap sweep |

Query them with the core skill's `MyBotRole`. Fail CLOSED on a lookup error, the way every module in this repo does: the proxy talks upstream under one master token, so the API enforces the token owner's role rather than the signed-in person's, and a write a failed lookup would leave offered is a write it accepts.

## Error codes worth mapping to field-level messages

| Code | Meaning |
|---|---|
| `FuelyKnowledgeBaseLimitReached` / `FuelyKnowledgeBaseLimitExceeded` | The knowledge base is full |
| `FuelyAdditionalInstructionsCharLimitExceeded` | The free-text business notes alone are over their limit |
| `GoodsItemTitleRequired` / `…NotUnique` / `…TooShort` / `…TooLong` | Title field |
| `GoodsItemDescriptionTooLong` | Description field |
| `GoodsItemPriceAmountWrongFormat` | The price amount is a STRING like `"29.00"` |
| `GoodsItemPriceCurrencyRequired` | Currency missing |
| `GoodsProductImagesTooMuch` / `GoodsServiceImagesTooMuch` | Images row |
| `GoodsServiceDurationRequired` | Duration |
| `GoodsItemsTooMuchForBot` | The bot's catalog cap, separate from the character budget |
| `GoodsItemNotFound` | The item is already gone — refetch |
| `FileTooBig` / `FileContentTypeNotSupported` | Image upload; the REST endpoint mirrors these |
| `FuelyBusinessHoursScheduleInvalidTimeFormat` / `…InvalidTimeRange` / `…DuplicateDays` | Business-hours editor |
| `BotMigratedToNewFuelySettings` | A retired persona setter — do not offer it |

## Traps

- **The persona knobs are not on this type at all.** See above: they are per-scope automation settings.
- **`price.amount` is a String on the wire**, not a number. `"29"` and `"29.00"` both pass; `29` does not typecheck and a locale-formatted `"29,00"` fails with `GoodsItemPriceAmountWrongFormat`.
- **`goodsCatalog` contains `DeletedGoodsService` stubs** that carry nothing but a `__typename`. Narrow before touching any field.
- **Update returns one item, create and delete return the whole catalog.** Two different merge paths in the same store.
- **`conversation(conversationID:)` takes the CONTACT id.** Passing a contact id there is correct.
- **`unhandledSwitchToHuman` goes false the moment an operator opens the chat**, so a hand-off somebody already handled is invisible to a sweep. Say so in the UI rather than implying the list is exhaustive.
- **A business-hours write with one day missing wipes that day.** Always send seven.
