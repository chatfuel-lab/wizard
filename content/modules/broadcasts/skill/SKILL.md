---
name: chatfuel-broadcasts
description: Build a WhatsApp campaigns tool over the Chatfuel GraphQL API — a campaign is a flow holding a one-time notification or scheduled message entry point (audience + schedule) connected to a WhatsApp template block (the message); create the pair with whatsAppScheduledMessageCreateWithBlockAndWATemplate / whatsAppOneTimeNotificationCreateWithBlockAndWATemplate, fill the template with the whatsAppTemplateSet* setters, set the audience with a SegmentInput, arm with blockEnableEntryPoint or fire with whatsAppOneTimeNotificationSend, list by walking bot.flowGroups. Read-only template catalog (bot.whatsAppTemplates) with a WhatsApp Manager hand-off — the API authors no templates. Use when building any broadcast, campaign, mass-message or template-picker UI over Chatfuel. Requires the chatfuel-core skill.
---

# Chatfuel Broadcasts

WhatsApp campaigns over the flow API: list, compose, audience, schedule, send.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/campaign-model.md` | How a flow becomes a campaign row: the two blocks and their three ids, the status table from live behaviour, what a list is, what can and cannot be undone — and two worked sequences, from nothing to a scheduled campaign and from nothing to a sent one, the kind switch and the duplicate recipe |
| `references/schedule.md` | Times are instants; the bot zone; the corrected-weekdays rule with a worked example; recurrence limits; the order of writes; what arming does and does not do |
| `references/audience.md` | `SegmentInput` as the server takes it, the recipient count, what "everyone" is, what fails on write, and how the builder reads a segment back and writes it |
| `references/templates.md` | The catalog, statuses, the fill setters, the blanks by key, personalisation with `{{Attribute}}`, header media, the WhatsApp Manager hand-off |
| `references/errors.md` | The three error channels — element verdicts, part verdicts and thrown codes — every code this module meets, and where each lands on screen |
| `playbooks/customize.md` | Every knob |
| `playbooks/embed.md` | Mounting inside a host app |
| `examples/operations.graphql` | Every operation the module sends, all prefixed `Broadcast` |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- **A campaign is a flow.** Create it with `createFlow` (answers the Bot — the new flow is the id that was not there before), then ONE pair mutation makes the entry point and the template block connected. Every setter afterwards is keyed by a block element id; arming and deleting by the block id. `references/campaign-model.md` walks both kinds from nothing to done.
- **Validation is data, refusal is thrown.** `blockElements[].errors[].code` (snake_case) says what is incomplete and is recomputed on every write; a campaign cannot go live while any stands. A thrown code sits at `errors[0].extensions.code`, one level down through the router — use the api-client's `nestedErrorCodes`.
- **Arming is silent when it fails.** `blockEnableEntryPoint` re-validates and, when anything is wrong, answers the flow unchanged with `isEntryPointEnabled` still false. Read the bit back; never assume.
- **Disarming makes a draft.** `blockDisableEntryPoint` puts the element's status back to Draft. There is no paused state to show.
- **The five time setters refuse while armed** with a bare server error. Disarm, write, arm.
- **A one-time campaign that has started is immutable**: send and segment both answer `WhatsAppOneTimeBroadcastAlreadyStarted`. Its entry point is born enabled and cannot be disabled — ignore the bit, read `status`.
- **Times are instants.** Send `toISOString()`; the server answers `Z` strings. Weekdays are stored UTC-normalised — shift by the bot zone's day offset at the first send (`references/schedule.md`) and send `correctedWeekdays` on every first-send-time write while the stored list is non-empty. Write the repeat type, then its list, then the first send time, in that order.
- **"Everyone" is `filters: []`** on the segment, valid as it stands. Ids are client-minted UUIDs. The count to show is `contactsTotalCount`, with the very same segment.
- **Only names from `botAttributes(platforms: [whatsapp])` go into a parameter.** An unknown `{{name}}` is accepted and CREATES a custom attribute on the bot; a name another platform owns is refused with `AttributeIsNotAllowedForPlatform` on the part. In an audience filter an unknown name is harmless — it selects nobody.
- **A block never changes type.** "Send now" on a scheduled draft is a new pair on the same flow and `deleteBlock` on the old one; duplicate is a new flow with the source replayed onto it. Neither is one operation (`references/campaign-model.md`).
- **Never call `deleteFlowGroup`.** It deletes every flow in the group.
- **There are no delivery figures.** `WhatsAppTemplateBlock.stats` answers a server error; the only count is `sentToContactsCount` on a finished one-time element, and it is sometimes null. Do not select `stats`.
- **Sending is for a person.** `whatsAppOneTimeNotificationSend` and `blockEnableEntryPoint` on a real audience sit behind a confirm dialog that prints the recipient count; never run them from a script.
- Every name in the operations document is prefixed `Broadcast`; the flow-builder skill owns the plain names.
