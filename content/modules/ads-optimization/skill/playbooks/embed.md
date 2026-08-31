# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and
the mounting pattern all live there. This file only adds what is specific to
this module.

- Entry component: `<AdsOptimizationApp />` from `src/chatfuel/modules/ads-optimization/`.
- Deep links: the path segment after the module id is the event set
  (`/ads-optimization/<automationID>`), and `?e=<eventID>` opens that event's
  editor beside it; `?e=new` opens an empty one. An id the bot does not have
  falls back to the default set and replaces the address, so a stale link never
  leaves a dead page in the back stack.
- **A WebSocket is worth having.** The workspace subscribes to
  `fuelyAutomationUpdated` and merges by id: one write on the default set
  republishes every set that follows it, and without the socket those keep
  showing the old value until a reload. HTTP alone still works — it is stale,
  not broken.
- The module owns its `ToastProvider` and a single undo entry; ⌘K, ⌘Z and the
  rest are scoped to the module root, so a host's own shortcuts keep working
  outside it (`useHotkeys({ rootRef })`).
- Container, not viewport: below the wide band `SplitPane` stacks the rail and
  the open set into one pane with a back control, measured with `useBand()` on
  the module root. Mounting the module in a narrow panel is enough to see it —
  no browser resize needed.
- Live settings: every write lands on the production bot immediately. There is
  no draft mode and no preview.
- Permissions: `Flows: View` to read, `Flows: Edit` for every write. Reading the
  WhatsApp connection additionally needs `Bot: View`.
