# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy and
the mounting pattern all live there. This file only adds what is specific to
this module.

- Entry component: `<AutomationsApp />` from `src/chatfuel/modules/automations/`.
- Deep links: `?scope=<FuelyAutomationScope>`, `&automation=<id>` (expands
  that rule card and pins the Test panel to it), `&setting=<key>` (opens that
  section once), `&new=<scope>` (the New-rule dialog). Unknown values fall
  back silently; the retired keys of the five-view build (`view`, `test`,
  `mode`, `platform`, `q`, `filter`, `sort`) are ignored.
- **A WebSocket is required**, unlike the previous version of this module: the
  workspace subscribes to `fuelyAutomationUpdated` before it loads, and the test
  chat subscribes per conversation. HTTP alone leaves both stale.
- The module owns its `ToastProvider` and a single undo entry; ⌘K, ⌘S, ⌘Z and
  the rest are scoped to the module root, so a host's own shortcuts keep working
  outside it (`useHotkeys({ rootRef })`).
- Live AI config: edits apply to the production bot immediately — warn the user.
  The test chat starts real preview conversations that the production AI answers.
- Permissions: `Ai: View` to read, `Ai: Edit` for every write and for testing
  (managers cannot test — the panel is not mounted for them).
