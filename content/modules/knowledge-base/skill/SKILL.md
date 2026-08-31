---
name: chatfuel-knowledge-base
description: Build and edit everything the Chatfuel AI knows about a business, over the GraphQL API — structured business info with one granular setter per field, opening hours, a free-text business description (the misnamed `additionalInstructions`), FAQs (whole-list replace, no entry ids), the goods catalog of products and services with prices and images, bookable specialists, the character budget that constrains all of it, and a read-only sweep of conversations the assistant handed to a human. Use when building a knowledge-base or AI-training UI, syncing business data into Chatfuel, importing FAQs or a catalog from a file or pasted text, or finding out what the assistant cannot answer. Not a document store — there is no ingestion API. Requires the chatfuel-core skill (auth, CORS proxy, schema); recommends chatfuel-automations (how the AI behaves) and chatfuel-bookings (which owns services and staff).
---

# Chatfuel Knowledge Base

The product "Knowledge base" page: structured business info, a free-text business description, FAQs, the goods catalog and specialists — the record the platform's AI reads on every message.

**Not a document store.** There is no file upload, no URL crawling, no chunking, no embeddings, no retrieval endpoint and no similarity score anywhere in this API. Everything here is a structured record under `bot.fuelyConfig` plus two entity lists on `Bot`. Anything that looks like RAG in a UI over this API is local and lexical, and must say so.

**Nothing here is live.** The schema has exactly one Fuely subscription (`fuelyAutomationUpdated`) and it belongs to the automations domain. Freshness is: merge each setter's own response, refetch on reconnect, and a Refresh control.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The model, the character budget, the per-field setters, where the persona knobs really live, permissions, error codes, the traps |
| `references/faq.md` | The replace-all list: identity by position, stable local keys, read-merge-write, conflicts, reorder, bulk, lint |
| `references/catalog.md` | Products and services: the union with `DeletedGoodsService`, the two response shapes, prices as strings, images over REST, specialists |
| `references/gaps.md` | What the API exposes about conversations the assistant could not answer, how to sweep it without hammering the API, and what it genuinely cannot see |
| `references/import.md` | Turning a file or pasted text into FAQ entries and catalog items, and why reading the customer's website is left out |
| `playbooks/customize.md` | Every knob: the sources, the lint thresholds, the budget model, caps, keys, commands |
| `playbooks/embed.md` | Mounting inside a host app: deep links, the REST passthrough, hotkey scoping |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-automations/references/guide.md` | How the AI behaves, if installed — the persona knobs that used to live here moved there |
| `../chatfuel-bookings/references/staff.md` | Services and specialists from the booking side, if installed — that module owns editing them |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/files-tasks.md` | The REST upload endpoint for catalog images and avatars |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- The persona knobs — agent name, chat language, greeting, message length, emoji policy, catalog photo sharing, missing-info fallback, who to respond to — are not on `FuelyKnowledgeBase`. They are per-scope automation settings; a design that asks for them on this page belongs to the automations module.
- Treat `FuelyKnowledgeBaseLimitReached` as a first-class state, not a generic error: it is the only way to learn the knowledge base is full, because the schema publishes no limit.
- The FAQ write replaces the whole array. Read, merge, write — and check the list did not move under you first.
