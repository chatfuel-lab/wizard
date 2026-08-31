---
name: chatfuel-ads-optimization
description: Build the conversion-reporting surface for click-to-WhatsApp ads on the Chatfuel GraphQL API — event sets over the WhatsAppClickFromAds automations, the ads each set claims, and the conversions it reports back to Meta over the Conversions API (seven triggers, Meta's fourteen standard names or your own, at most twenty per set, order preserved), with inheritance from the default set and the WhatsApp permission that decides whether any of it is delivered. Use when building any Meta conversions, CAPI or ad-attribution UI over Chatfuel. Requires the chatfuel-core skill; recommends chatfuel-automations (the same automations seen from the AI side) and chatfuel-contacts (the properties and statuses the triggers fire on).
---

# Chatfuel Ads Optimization

Event sets over `bot.fuelyAutomations(scope: WhatsAppClickFromAds)`. Each set says which ads it covers and which moments in the conversation are reported to Meta as conversions, so Meta can optimize delivery towards the people who actually convert.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The model: base and custom sets, inheritance, the limits, what a write actually sends, and the traps |
| `references/events.md` | The seven triggers and the conversion names, field by field, with every server error code |
| `references/ads.md` | Ad ids: what the API does and does not check, parsing them out of an Ads Manager link, and what nothing can tell you |
| `playbooks/customize.md` | Every knob: limits, labels, the keyboard, the palette, undo |
| `playbooks/embed.md` | Mounting inside a host app: deep links, one live channel, container breakpoints, hotkey scoping |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-automations/references/guide.md` | The same automations from the AI side, if installed |
| `../chatfuel-contacts/references/guide.md` | The contact properties and statuses two of the triggers fire on, if installed |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- **One scope.** `WhatsAppClickFromAds` is the only scope that carries a send-events-to-meta setting. Nothing here applies to another scope, and asking for one answers `FuelySettingNotAllowedInScope`.
- **A write sends the whole ordered list.** There is no add-one or delete-one mutation for events: rebuild every event, in order, on every save. An event you cannot rebuild is an event you would delete.
- **Configured is not delivered.** Conversions go out only while the bot's WhatsApp number carries `hasMetaConversionsAPIPermission`. Read it, and say so when it is false.
