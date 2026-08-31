# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<DealsApp />` from `src/chatfuel/modules/deals/`.
- Deep-link params: `?deal=<contactID>` opens the detail panel. Back it with the
  host router's search params and a deal link becomes shareable. An id that no
  longer resolves renders a "not available" body — it never white-screens.
- Uses live subscriptions for the board (`contactsDealUpdates`) and for the open
  deal (`contactUpdated`) — the WS relay is required for real-time; without it
  both still work via refetch on action.
- **Deal amount, close date and company are custom contact attributes**, not
  fields of a Deal entity. The names are in `lib/dealFields.ts`; if the host's
  bot already uses different ones, either rename them there or add the existing
  names as `aliases`. Writing a value is what creates the attribute, so the
  mounting user needs the **People: Edit** permission for the panel to save.

- **Breakpoints are container-based.** The module measures its own root with a
  `ResizeObserver` (`useContainerBand` from `~ui`), so it lays out correctly at
  700px inside a 2560px page. No media queries are involved and none should be
  added. The thresholds live in the design system, as both the `--container-*`
  tokens and the `Band` constants — they are the same numbers, and a test
  asserts it. Below **900** density is forced to compact, the density control is
  hidden and the table drops five columns; the board itself scrolls its columns
  horizontally. At **1280** and above the deal panel becomes a second column
  instead of a drawer. All of it measures the module, not the viewport — so a
  1400px host page with a 600px module slot gets the narrow band, which is
  correct.
- **The module mounts its own `ToastProvider`.** Failed stage moves are toasts,
  so a host that strips it loses the only signal that an optimistic move was
  rolled back. Toasts portal to the design system's portal root on `document.body`.

## The keyboard, inside somebody else's app

- **`⌘K` is bound**, along with `⌘Z`, `?`, `/`, `r` and `g b` / `g t` / `g f`.
  The full list is `lib/shortcuts.ts` and the `?` sheet renders from the same
  array.
- **It is one window listener, and it scopes itself.** `useHotkeys` is bound at
  the module root and fires only when `document.activeElement` is inside that
  root — or is `body`, i.e. nothing is focused. A host's own ⌘K, pressed in the
  host's own search box, is never stolen, and no key of ours reaches a host
  field. Nothing else in the module may add a window listener; a second one
  would race this one for the same keys.
- **The same rule handles layering for free.** A Dialog, Drawer, Popover or the
  command palette portals to the body and holds focus, which is by definition
  outside the module root — so module hotkeys stand down while one is open, and
  Escape unwinds one layer at a time through the design system's layer stack.
  The inline deal panel is the exception worth knowing about: it is a column
  rather than an overlay, so it is *not* in that stack, and its Escape is a
  local handler on the panel itself that only fires with focus inside it.
- **The bulk `ActionBar` deliberately does not portal.** Everything else that
  floats — toasts, dialogs, menus, the drag layer — hangs off `document.body`.
  A bulk bar cannot: `position: fixed` on the body would stretch it across the
  *host's* whole viewport, floating over the host's own content, for a
  selection that exists inside one panel. So it is `position: absolute` and
  anchors to the nearest positioned ancestor, which `DealsApp`'s own root
  supplies (`className="relative …"`). Keep that `relative` if you restyle the
  root — strip it and the bar escapes upwards into the host's layout until it
  finds one.
