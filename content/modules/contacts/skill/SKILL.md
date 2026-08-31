---
name: chatfuel-contacts
description: Build a CRM over Chatfuel contacts (People) on the GraphQL API — the two list engines and when each is wrong, inline SegmentInput filter trees with client-generated UUID ids, the attribute catalog and per-contact attribute CRUD, assignment, sales stages, WhatsApp contact creation, and the CSV import wizard and export task. Use when building a contact table, a record page, an audience breakdown or a bulk import/export over Chatfuel contacts, or when syncing them with another CRM. Requires the chatfuel-core skill (auth, CORS proxy, pagination, schema).
---

# Chatfuel Contacts

The contact directory of a Chatfuel bot and the CRM built on it. A contact is a
channel-specific type behind one interface (`WhatsappContact`,
`InstagramContact`, …), its custom fields are **contact attributes** that exist
because some contact has a value for one, and filtering is an **inline
`SegmentInput`** carried on every query — there is no saved-segment API.

Three facts decide most designs on this API, and all three hold in practice:

1. **`contactChatsConnection` lists only contacts that have a conversation.** It
   is the live, server-searching engine, and it cannot see a contact created by
   import or by `whatsappContactCreateV2`.
   `contactsConnection` + `SegmentInput` is the engine that sees everyone.
2. **`SegmentID` and `FilterID` must be real UUIDs.** A readable id fails the
   whole query with a generic error that names no field.
3. **There is no bulk mutation, no delete, no merge, no tags and no
   `createdAt`.** A great deal of ordinary CRM UI is simply not buildable here,
   and the honest move is to say so rather than fake it.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL,
> token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The model, the two engines, attributes, editing, bulk, live, permissions — and what this API cannot do |
| `references/filters.md` | `SegmentInput` in full: UUID ids, strategies, operators, nesting, the branches that fail live |
| `references/import-export.md` | The CSV import wizard and the export task, end to end, with every error code |
| `playbooks/customize.md` | Every knob: the engine router, the filter model, columns, paging caps, deep links, import/export |
| `playbooks/embed.md` | Mounting inside a host app: deep links, what the host must provide, container bands, what does and does not portal |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `assets/contacts-sample.csv` | Eight believable rows for a demo import — upload it as-is |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |
| `../chatfuel-core/references/files-tasks.md` | The CSV upload endpoint and async `Task` semantics |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs`
  against `../chatfuel-core/references/schema.graphql` before running it live.
- Always select `__typename` on `Contact` — it is the channel, it is the
  restricted flag, and omitting it makes fields go missing.
- Ask for the attribute names you need. `attributes(names: null)` returns every
  attribute of every row.
- Treat the schema as a superset of the API: `byTag`, `byStoredSegment` and
  `dateStrategy` are all in the SDL and all fail.
