# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and
the mounting pattern all live there. This file only adds what is specific to
this module.

- Entry component: `<PublishingApp />` from `src/chatfuel/modules/publishing/`.
- Views are path segments: the module root is the calendar, `queue` and
  `library` are the other two. Deep-link params: `?compose=<id|new>` opens the
  composer, `?mode=` and `?month=` are the calendar's, `?status=` the queue's,
  `?kind=` the library's. Every unknown value falls back silently, so a
  hand-edited address never white-screens.
- **Publishing needs a longer request budget than anything else in the product.**
  `instagramAccountPublishReel` blocks while Instagram transcodes — up to five
  minutes — so the host's HTTP client and any proxy in front of it both need a
  budget for those four operations specifically. A client-wide thirty seconds
  turns every video publish into a failure that already succeeded. Raising the
  default everywhere is the wrong fix: a dead upstream would then be felt five
  minutes late on every other request.
- **A host that terminates requests of its own** — a serverless function with a
  ceiling, a load balancer with an idle timeout — caps this whether the client
  agrees or not. Five minutes is the number to check against.

## The proxy routes

The scheduled half of the queue is served by routes on the same proxy that
carries GraphQL, under its own prefix. The module asks for them once, at
startup, and a **404 is a valid answer**: it means this deployment was
scaffolded without the database half, and the module falls back to a queue in
the signed-in user's own storage — drafts and publish-now, and no time control.

A host that mounts the proxy somewhere unusual does not need to tell the module:
the prefix is resolved by the host's own client factory, the same place
`uploadFile` gets its path. Nothing in the module writes a proxy URL.

The module never talks to a database and holds no key. It sends its own session
bearer to those routes, they check it against the same gate every other request
goes through, and only then is anything read or written.

## Media

Uploads go through the host client's `uploadFile`, and the resulting link has to
be reachable by **Instagram's servers** — not by the signed-in browser. A host
whose file storage is token-gated should point the module at a bucket of its own
instead; the composer takes a pasted link and existing account media as well, so
there is always a path that works.

For a scheduled post this matters more than it looks: the link has to still
resolve when the post fires, which may be hours later.

## Layout and layering

- **Breakpoints are container-based.** The module measures its own root, so it
  lays out correctly at 700px inside a 2560px page. No media queries are
  involved and none should be added. Below the wide band the calendar's month
  grid gives way to a list, and the composer opens narrower — one column at
  every size, so the band changes how wide the panel is and never what is in it.
- **The module mounts its own `ToastProvider`.** A failed publish is a toast, so
  a host that strips it loses the only signal that something did not go out.
- **The composer is a Dialog** — a card centred over the page, as tall as the
  post in it — and portals to the design system's portal root on
  `document.body`, so it layers over a host's own chrome rather than inside the
  module's box. Escape unwinds one layer at a time through the shared layer
  stack. Its width is `--container-composer` bounded by the window, and its
  height follows its contents until `calc(100vh - 4rem)`, past which the body
  scrolls under a header and footer that stay put. At the compact band it goes
  full-screen instead of getting narrower.
- `PublishingApp`'s root carries `relative` on purpose: anything the module
  positions absolutely anchors to it. Strip it and those escape upwards into the
  host's layout until they find a positioned ancestor.
