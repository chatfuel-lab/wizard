# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and
the mounting pattern all live there. This file only adds what is specific to
this module.

- Entry component: `<ChannelsApp />` from `src/chatfuel/modules/channels/`.
- There are no views. The module ignores `view`, and the only params it reads
  are the two the return leg of a hand-off writes (`result`, `channel`), which
  it clears from the address as soon as it has said what they said.
- **Connecting leaves the app in the same tab** and comes back by redirect, to
  this module's own address. A host that mounts it somewhere `window.location`
  cannot describe — inside a cross-origin iframe, say — gets the hand-off out
  and no way home; mount it as a page.
- **Changing anything needs Configure: Edit.** The module asks `MyBotRole` and
  shows Connect, Refresh access and Disconnect only when the role holds it; a
  role without sees the connection state and nothing to change. That is a decision
  about what to offer, not an authorization boundary — through a proxy the API
  enforces the token owner's role, so a host that wants a harder line draws it
  in the proxy.
- **The module mounts its own `ToastProvider`.** Coming back from a hand-off
  with a channel connected is a toast, and so is a disconnect; a host that
  strips the provider loses both signals.
- Breakpoints are container-based: the module measures its own root and lays
  out correctly at any width the host gives it. No media queries are involved
  and none should be added.
- `ChannelsApp`'s root carries `relative` on purpose: the confirm dialogs
  portal to the design system's portal root, but anything the module positions
  absolutely anchors to this element.
