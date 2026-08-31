# Embedding this module

Follow `../chatfuel-core/playbooks/embed.md` first — aliases, styles, proxy
and the mounting pattern all live there. This file only adds what is specific
to this module.

- Entry component: `<KnowledgeBaseApp />` from `src/chatfuel/modules/knowledge-base/`.
- **Deep-link params** (all optional, an unknown value falls back silently):
  `?source=overview|profile|instructions|faq|products|services|team|gaps`,
  `item=<id>` (the row to open — a catalog item id or an FAQ key),
  `q=<text>` (the page's search box),
  `import=faq|products` (opens the import wizard on that target),
  `draft=<text>` (opens a NEW FAQ with that question prefilled — this is how the
  Gaps source hands a question to the FAQ source, and it works from a cold link).
  The retired `?tab=business|faq|faqs|catalog` from the three-tab version is read
  once, mapped onto `source`, and dropped on the next write, so old links keep
  working. Back these with the host router's search params and every link
  becomes shareable.
- **Nothing here is live.** The schema has no subscription for the Fuely config,
  the goods catalog or the specialists, so the module refetches on reconnect and
  on every write and offers a Refresh control. Do not wire a WS expectation.
- Catalog and avatar image upload rides `/chatfuel/api/*` — the REST passthrough
  must be wired, and `client.uploadFile` must be provided. The photo controls
  hide when it is absent and say why.
- **Import reads a file or pasted text, and nothing else.** Reading a page from
  the customer's website is left out on purpose — `references/import.md` says
  why. No server route is needed for import at all.
- The mounting user needs **Ai: Edit** to write anything and **Inbox: View** for
  the Gaps source. A role the server answers and does not grant closes the
  controls; only a lookup that never reached the server leaves them open, and
  the API refuses either way — the way every module in this scaffold does.
- **The module reads `installedModules`** from the shell contract to decide
  whether it edits services and staff or links into the bookings module. A host
  that mounts it directly can pass `installedModules={[]}` to get the full
  editors, or `['bookings']` to get the read-only mirrors plus the links.
- **The module mounts its own `ToastProvider`** — undo offers and failed writes
  are toasts; a host that strips it loses the only rollback signal.
- **Breakpoints are container-based.** The module measures its own root
  (`useBand`), so it lays out correctly at 700px inside a 2560px page: below the
  `wide` band the sources rail stacks over the source page with a back control.

## The keyboard, inside somebody else's app

- `⌘K`, `⌘S`, `⌘Z`, `?`, `/`, `r`, `n`, `i`, `e`, `[` and `]` are bound at the
  module root by ONE window listener (`useHotkeys`) that fires only when
  `document.activeElement` is inside the module root — or is `body`. A host's own
  ⌘K in the host's own field is never stolen. The full list is `lib/shortcuts.ts`;
  the `?` sheet renders from the same array, and a test asserts they cover each
  other exactly.
- `⌘K` and `⌘S` are the two bindings scoped `always`, because both are pressed
  while typing inside a field.
- `/`, `n`, `i` and `e` reach the open page through the DOM rather than through
  props, so a page can own its own controls: the contracts are
  `[data-knowledge-search]`, `[data-knowledge-create]` and
  `[data-knowledge-export]`. A page with no such control simply does not respond
  to that key.
- Anything that portals (dialogs, the palette, the import wizard) holds focus
  outside the root, so module hotkeys stand down while one is open.
