---
name: chatfuel-publishing
description: Build a publishing surface for Instagram on the Chatfuel GraphQL API — feed photos, Reels, Stories and carousels through the four instagramAccountPublish mutations, the connected account and the permission that gates them, and the account's existing media over bot.instagramMediasConnection. Use when building any Instagram posting, scheduling or content-calendar UI over Chatfuel. Covers the two things the API does not have and an app must therefore supply: a queue, because nothing here can schedule, and a guard against publishing twice, because a publish blocks for minutes and its HTTP call can be lost while the post still lands. Requires the chatfuel-core skill; recommends chatfuel-auth (the database a schedule needs to fire from) and chatfuel-automations (the same media, seen from the comment-reply side).
---

# Chatfuel Publishing

Publishing to the Instagram account connected to a bot, and reading back what is already on it.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The model: the four publish shapes and what each input really takes, the permission gate, the timeout, and the double-publish guard |
| `references/scheduler.md` | Why a queue has to be yours, the two places it can live, and the SQL and cron that make a scheduled post fire |
| `references/library.md` | Reading the account's media: the union, the cursor, `isUnknown`, and what carries no date |
| `playbooks/customize.md` | Every knob: the limits, the kinds, the preview, the queue, the timeouts |
| `playbooks/embed.md` | Mounting inside a host app: deep links, the proxy routes, container breakpoints |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-auth/references/guide.md` | The project a scheduled queue lives on, if installed |
| `../chatfuel-automations/references/guide.md` | The same media as comment-reply targets, if installed |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- **Publishing takes URLs, not files.** Every publish input carries a link, and Instagram's own servers fetch the bytes. A URL that needs an `Authorization` header cannot be published, however valid it looks in a browser that is already signed in.
- **A publish blocks, and can block for minutes.** `instagramAccountPublishReel` waits inside the mutation while Instagram transcodes. Give those four operations a budget of their own; a client-wide thirty seconds turns every video into a failure that already succeeded.
- **A failed publish is not the same as a publish that did not happen.** Watch `botInstagramMediaAdded` before offering a retry — retrying one that landed posts it twice.
- **There is no scheduling and there are no metrics.** No input takes a time, and no media type carries a count or a date. Both are absences to design around, not fields to go looking for.
