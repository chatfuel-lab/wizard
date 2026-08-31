---
name: chatfuel-bookings
description: Build a booking workspace on the Chatfuel GraphQL API — a day/week/month calendar with drag-and-drop over bookingsV2, an appointments list, staff (specialists) with weekly working hours and per-specialist Google Calendar sync, the services catalog, the AI booking settings and the bot time zone, live subscriptions, and an availability-driven booking flow (bookingAvailableStartTime). Use when building any appointment, scheduling or staff-calendar UI over Chatfuel. Requires the chatfuel-core skill; recommends chatfuel-contacts (booking real chat contacts) and chatfuel-knowledge-base (the same services catalog seen from the AI side).
---

# Chatfuel Bookings

Calendar, appointments, staff, services, settings and insights over `bot.bookingsV2` and its neighbours. Services and specialists are edited here (and, for the AI's view of the same catalog, in chatfuel-knowledge-base); the calendar, availability and Google Calendar sync are this skill's.

> Before writing code read `../chatfuel-core/SKILL.md`: required inputs (base URL, token, botID), the mandatory CORS proxy, and the working rules.

## Files

| File | What's inside |
|---|---|
| `references/guide.md` | The model, the **time-zone rule** (a zero offset is read as bot wall clock), availability semantics, statuses, staff schedules, Google Calendar, live updates, undo, keyboard, traps confirmed |
| `references/calendar.md` | The grid: modes, columns by day or specialist, the drag-and-drop protocol, keyboard, colours, states |
| `references/booking-flow.md` | The detail panel and the wizard: customer identities, availability slots, zone, undo |
| `references/appointments.md` | The list (ranges without pagination, filters, bulk, CSV) and the insights — what is computed and what the API cannot support |
| `references/staff.md` | Specialists and weekly hours (full-replace input), the Google Calendar flow, services, the AI booking settings |
| `playbooks/customize.md` | Every knob: slot step, snap, range chunks, statuses, colours, week start, undo TTL, keys, commands |
| `playbooks/embed.md` | Mounting inside a host app: deep links, one live channel, container breakpoints, hotkey scoping |
| `examples/operations.graphql` | Validated ready-to-use operations — copy these as the starting point |
| `../chatfuel-contacts/references/guide.md` | The contact model, if installed (real customers on a booking are contacts) |
| `../chatfuel-knowledge-base/references/guide.md` | The same catalog and business info from the AI side, if installed |
| `../chatfuel-core/references/gotchas.md` | Read before writing any operation |

## Rules

- Validate every operation with `../chatfuel-core/scripts/validate-operations.mjs` against `../chatfuel-core/references/schema.graphql` before running it live.
- Format every `Time` you send with the **bot zone's offset**, never `Z` — see `references/guide.md`, "Time zone".
