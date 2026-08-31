# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<BookingsApp />` from `src/chatfuel/modules/bookings/`.
- The surface is the `view` prop — `''` (the calendar), `'appointments'`,
  `'staff'`, `'services'`, `'settings'` or `'insights'` — and `setView` moves
  it. In the standalone app it is a path segment (`/bookings/staff`); in an
  embed give it whatever your router has. A stale `?view=` is still read once.
- Deep-link params (all optional, an unknown value falls back silently):
  `mode=day|week|month`,
  `date=YYYY-MM-DD`, `by=time|specialist`, `color=specialist|status`, the shared filter
  `specialist=`,`service=`,`status=` (comma lists), `q=`, `range=upcoming|past|custom`
  with `from=`/`to=`, `sort=<key>:asc|desc`, `period=`, `density=`, `s=<specialistID>|new`,
  `b=<bookingID>` (opens the booking), and `new=1&start=&end=&contact=&ns=<specialistID>&nsvc=<serviceID>`
  (opens the wizard prefilled — what a "Book an appointment" button elsewhere links to). The old
  `?week=YYYY-MM-DD` still opens that week. Back them with the host router's search params
  and every link becomes shareable.
- **One live channel.** The module subscribes ONCE to `bookingAdded` / `bookingUpdated` /
  `bookingDeleted` (bot-wide) and to `taskUpdated` while a Google Calendar sync runs, and
  fans the events out internally — the WS relay is required for real time; without it every
  window still refetches on action and on reconnect.
- **Times are sent in the bot's zone.** `bot.timezone` is read on mount; if the host knows
  the bot has none, set it in the Settings section (or `botUpdateTimezone`) before booking —
  otherwise the API reads zero-offset instants as bot wall clock (see
  `references/guide.md`, "Time zone").
- Uploads (specialist avatars, service images) need `client.uploadFile` — the dev proxy's
  `/chatfuel/api` path; the controls hide when it is absent.
- The mounting user needs **People: Edit** to write bookings and **Ai: Edit** to manage staff,
  services and settings; a role the server answers and does not grant closes the controls, and
  only a lookup that never reached the server leaves them open. The API refuses either way.
- **Breakpoints are container-based.** The module measures its own root (`useBand`), so it
  lays out correctly at 700px inside a 2560px page: below 600 the calendar is a day agenda,
  the panel a bottom drawer and the wizard full-screen; below 900 density is compact and
  staff/services stack; at 1280 and above the booking panel becomes a second column.
- **The module mounts its own `ToastProvider`** — failed optimistic edits and undo offers are
  toasts; a host that strips it loses the only rollback signal.

## The keyboard, inside somebody else's app

- `⌘K`, `⌘Z`, `?`, `/`, `r`, `n`, `t`, `[`, `]`, `d` `w` `m` and `g c/a/s/v/e/i` are bound
  at the module root by ONE window listener (`useHotkeys`) that fires only when
  `document.activeElement` is inside the module root — or is `body`. A host's own ⌘K in the
  host's own field is never stolen. The full list is `lib/shortcuts.ts`; the `?` sheet
  renders from the same array.
- Anything that portals (dialogs, the palette, menus, the wizard, the drawer) holds focus
  outside the root, so module hotkeys stand down while one is open. The inline panel is a
  column, not an overlay; its Escape is a local handler on the panel.
- The calendar's own keyboard (Space grabs a booking, arrows move it, digits set status,
  `x` selects) is element-scoped on the focused block, not window-scoped.
- The bulk `ActionBar` deliberately does not portal — it is `position: absolute` against the
  module root's `relative`. Keep that `relative` if you restyle the root.
