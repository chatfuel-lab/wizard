# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, the CORS
proxy and the mounting pattern all live there. This file adds only what is
specific to contacts.

- **Entry component:** `<ContactsApp />` from `src/chatfuel/modules/contacts/`.
  It takes `botId`, `client`, `params`, `setParams`, `view`, `setView` and
  `navigate`, and never touches `window.location` — routing is the host's.

## Deep links

`view` is the surface — `''` (the list), `'fields'` or `'audience'`. In the
standalone app it is a path segment (`/contacts/fields`); in an embed give it
whatever your router has and back `setView` with the move. A stale
`?view=list|fields|audience` is still read once. `?contact=<contactID>` opens a
contact as a full record page and `?tab=overview|fields|activity` picks its tab.
The filter travels too —
`q`, `assignee`, `stage`, `unread`, `since`, `until`, `platform`, `sort`,
`density` — so a filtered list is a shareable link.

Back these with the host router's search params and every one of them becomes a
real URL. An id that no longer resolves renders a "not available" body; it never
white-screens.

**Predicate groups are not in the URL** — they are unbounded, and a link with
twenty predicates in it is not a link. They live in saved views, which are
per-signed-in-user server storage. Two people on the same bot do not see each
other's views, so do not label them "shared".

## What the host has to provide

- **A WebSocket relay for live updates.** The open contact
  (`contactUpdated`) and the conversation-filtered list (`contactsChatUpdates`)
  are subscriptions. Without a relay both still work — they fall back to
  refetch on action and on Refresh — but the default list has no subscription
  at all in this API, so it is a snapshot either way and Refresh is what moves
  it.
- **`client.uploadFile`.** The CSV import starts with a REST upload
  (`POST …/filestorage/upload/bot?fileType=Document&botID=…`); the dev proxy already
  forwards it. Without an upload function the import wizard replaces its file
  picker with a sentence explaining why, rather than offering a control that
  cannot work. Export needs nothing extra — the finished file's `url` is a
  direct download link.
- **`People: View`** to read, **`People: Edit`** to write. The module reads the
  caller's role once and disables what cannot work instead of letting every
  click fail with `NotEnoughPermissions`.

## Layout is container-based, not viewport-based

The module measures its **own root** with a `ResizeObserver` (`useContainerBand`
via `ModuleRoot` from `~ui`), so it lays out correctly at 700px inside a 2560px
page. No media queries are involved and none should be added — a viewport prefix
in module code is a build error here, for exactly this reason.

The thresholds live in the design system as both the `--container-*` tokens and
the `Band` constants, and a test asserts they are the same numbers. As the
container narrows the table drops columns (`NARROW_HIDDEN`) rather than
scrolling sideways.

**The observer must sit on the module root, never on the canvas.** An inline
panel narrows the canvas, so an observer there would flip the band, close the
panel, widen the canvas and oscillate. `ModuleRoot` makes that structurally
impossible.

## Overlays and focus, inside somebody else's app

- **The module mounts its own `ToastProvider`.** A failed inline edit is
  optimistic-then-rolled-back, and the toast is the only signal the value went
  back. Toasts portal to the design system's portal root on `document.body`.
- **Dialogs, drawers, menus and the command palette portal to the body** and
  hold focus, which is by definition outside the module root — so the module's
  own hotkeys stand down while one is open, and Escape unwinds one layer at a
  time through the design system's layer stack. A host's own `⌘K`, pressed in
  the host's own search box, is never stolen.
- **The bulk `ActionBar` deliberately does not portal.** `position: fixed` on
  the body would stretch it across the *host's* whole viewport for a selection
  that exists inside one panel. It is `position: absolute` and anchors to the
  nearest positioned ancestor, which the module root supplies
  (`className="relative …"`). Keep that `relative` if you restyle the root, or
  the bar escapes upwards into the host's layout until it finds one.
