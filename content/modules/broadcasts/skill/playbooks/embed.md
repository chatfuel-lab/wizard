# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and
the mounting pattern all live there. This file only adds what is specific to
this module.

- Entry component: `<BroadcastsApp />` from `src/chatfuel/modules/broadcasts/`.
- Views are path segments and state is in the query: `''` (the list),
  `templates`, `compose`. Params: `c` (the campaign — a flow id — whose panel
  or composer is open), `step` (composer only), `status` and `q` (list only),
  `t` (the template whose preview is open). A host that routes the module must
  hand `view`/`setView` through as the shell does; the composer is a route and
  a reload lands on the same draft.
- **Changing anything needs Flows: Edit.** The module asks `MyBotRole` and
  shows New campaign, Edit, Send, Schedule and Delete only when the role holds
  it. That is a decision about what to offer, not an authorization boundary —
  the API enforces the token owner's role on every block mutation.
- **The module mounts its own `ToastProvider`.** Sent, scheduled and deleted
  are toasts; a host that strips the provider loses them.
- **"New template" leaves the app** for WhatsApp Manager in a new tab, built
  from the WhatsApp Business Account behind the bot's number.
- **A bot with no WhatsApp number** sees one empty state on every surface —
  the list, the catalog, the composer's message step — with a Connect WhatsApp
  button that goes to `/channels` when the channels module is installed
  (`installedModules` from the shell), and nothing to press otherwise. The
  template catalog is not even asked for until a number is there, because the
  template service answers a server error for a bot without one.
- Breakpoints are container-based: the module measures its own root and lays
  out correctly at any width the host gives it. No media queries are involved
  and none should be added.
- `BroadcastsApp`'s root carries `relative` on purpose: the dialogs portal to
  the design system's portal root, but anything the module positions absolutely
  anchors to this element.
