---
name: chatfuel-deals
description: Build a deals/leads kanban on the Chatfuel GraphQL API — contacts grouped by the 6 fixed salesStageV2 stages (New, Sorting, Ready, WorkingOn, Won, Lost), per-column pagination and totals, optimistic drag-and-drop stage moves, live board updates over subscriptions, and deal amount / close date / company carried as custom contact attributes. Use when building a sales pipeline or kanban UI over Chatfuel contacts. Requires the chatfuel-contacts skill (the contact model — a deal IS a contact) and the chatfuel-core skill.
---

# Chatfuel Deals

Board, table and forecast over contacts by sales stage. There is **no Deal entity** — a "deal" is a `Contact` whose `salesStageV2` is set; the board is 6 fixed columns, and within-column order cannot be persisted (the sort is fixed server-side and there is no `orderBy`).

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | Board queries, column totals, moving cards, live updates, deal fields |
| `references/table.md` | The two list engines, what each can and cannot express, and how to route |
| `references/forecast.md` | Windowed totals, why there is no velocity or funnel, CSV export, saved views |
| `playbooks/customize.md` | Every knob: stages, deal fields, both paging caps, columns, saved views, keys, undo, motion |
| `playbooks/embed.md` | Mounting inside a host app: container breakpoints, hotkey scoping, what does and does not portal |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-contacts/references/guide.md` | The underlying contact model, attributes, assignment |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
