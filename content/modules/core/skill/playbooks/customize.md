# Customizing the Chatfuel modules

Everything the wizard delivered is vendored source — the project owns every
line (shadcn philosophy). There is no upstream package to fight: edit the
files directly. Per-module ideas live in each module's own
`playbooks/customize.md`.

## Where things live

- Standalone scaffold: modules under `src/modules/<id>/`, design system under
  `src/vendor/ui/`, API client under `src/vendor/api/`.
- Embed: the same tree under `src/chatfuel/` (`modules/<id>/`, `vendor/ui/`,
  `vendor/api/`).

## Rebranding (colors, fonts, radii)

All visual identity is CSS tokens in `vendor/ui/styles/tokens.css`:
`@theme static { … }` for anything that should generate a utility, plain
`:root` for raw constants, then the dark blocks, then the custom utilities.

Beside it, `vendor/ui/styles/base.css` holds the rules that paint the DOCUMENT
rather than a component — `<body>`, `h1`–`h6`, `::selection`, the scrollbars.
Two files because an embed host imports the theme without wanting its own page
repainted; `src/index.css` imports both.

What is in there: `--color-*` (surfaces, borders, text, accent, the four
status tones, two alpha fills `--color-translucent{,-strong}`, interaction
colors like `focus`/`scrim`/`row-hover`, a six-value pipeline ramp),
`--radius-{control,card,chip,bubble,island,pill}`,
`--shadow-{raised,overlay,modal,drag,island,card-inset,secondary-button}`,
`--transition-duration-*` + `--ease-*`, a `--z-index-*` ladder, density
heights (`--height-row-*`, `--height-field*`), `--font-{sans,mono,display}`,
the `--text-*` ramp, and `--animate-*` keyframes.

Change a token and every component follows. Two facts that will otherwise
cost you an afternoon:

- **Two curves live in two places.** `--ease-*` and `--transition-duration-*`
  drive CSS, and `vendor/ui/lib/interaction/motion.ts` mirrors them for the
  `element.animate()` paths, which cannot read custom properties. Retune one and
  retune the other; nothing checks.
- **The variable namespace decides the utility, and a wrong one generates
  nothing, silently.** It is `--z-index-sticky` (not `--z-sticky`),
  `--transition-duration-fast` (not `--duration-fast`), `--height-*` for
  `h-*` and `--width-*` for `w-*` — `--height-field` does *not* give you
  `w-field`.
- **`@theme static`, not `@theme`.** Plain `@theme` lets Tailwind tree-shake
  unused variables out of `:root`, and anything reading them back with
  `getComputedStyle` then sees nothing.
- **The type ramp has one set of numbers under two sets of names.** The roles
  are `--text-{title,heading,body,label,meta,micro,nano}`; Tailwind's stock
  `--text-{xs,sm,base,lg,xl,2xl}` are declared as `var()` aliases of them, so
  `text-sm` and `text-label` are the same size by construction. Retune a role
  and both names move. Above `title` sit `--text-title-{1..4}` and
  `--text-display` for auth screens and empty states.
- **Fonts are self-hosted npm packages, and they are wired in the APP, not
  here.** `src/index.css` imports `@fontsource-variable/{geist,geist-mono,
  manrope}`; `tokens.css` only names the families. Swapping a face is a
  dependency swap plus one line in each place. Nothing is fetched from a
  third-party origin at runtime, which is what lets a deployed app work behind
  an egress proxy.

Dark mode is in the same file, as three unlayered blocks: a
`prefers-color-scheme` block for the system default, `[data-theme='dark']`
for an explicit choice, and `[data-theme='light']` which exists to set
`color-scheme` (without it, native `<select>` popups and scrollbars stay
light). The dark palette is declared once as `--dark-*` and only re-mapped in
the two blocks — if you add a color, add it in **both**. The same is true of the
handful of raw `:root` constants the dark blocks flip: `--elevation-tint*`,
`--elevation-ring`, `--hairline-{inset,ring}`, `--selection-bg` and the four
`--avatar-*` numbers.

`ThemeToggle` + `useTheme` ship with the system; `useTheme` takes `target`
and `persist` so an embed can scope the attribute to a wrapper element or
disable storage entirely.

## Changing components

`vendor/ui/` is a readable, dependency-free design system: primitives
(Button, Input, Card, Alert, Skeleton, Progress, Kbd, …), forms (Field,
Select, Checkbox, RadioGroup, Combobox, SegmentedControl, DateField, …),
floating surfaces (Popover, DropdownMenu, Tooltip, Command palette), overlays
(Dialog, Drawer), `DataTable`, a Pointer-Events drag-and-drop primitive under
`dnd/`, and the chat set. Edit props/markup/classes directly; the modules
consume them through `~ui`, so a change lands everywhere at once.

Two conventions worth keeping when you edit:

- Geometry and state arithmetic live in `vendor/ui/lib/*.ts` as pure
  functions (positioning, roving focus, table selection, drag hit-testing).
  Change behaviour there rather than in the component, and it stays testable.
- Components use only the semantic utilities the tokens define. A raw hex in a
  component is a color that can never follow the theme.

## Changing module behavior

Module code is plain React + the typed client. The app carries the documents it
generates from at `src/vendor/api/operations/<module>.graphql` — the same text
this skill bundles as `examples/operations.graphql` — and the client generated
from them at `src/vendor/api/generated/<module>/graphql.ts`. To add or change an
operation:

1. Write it against the bundled schema (`references/schema.graphql`), which is
   the same SDL the app holds at `src/vendor/schema/schema.graphql`.
2. Validate it with the validator script in this skill's `scripts/`.
3. Run the cycle in the app:

   1. Edit the document: `src/vendor/api/operations/<module>.graphql`
   2. Run `npm run codegen` — the first run prints the one command that installs the generator, and stops.
   3. Commit the regenerated files under `src/vendor/api/generated/` together with the document you edited.

   The generator is 265 packages the app does not otherwise carry, which is why
   the first run installs nothing and prints the line instead. Copy that line
   exactly — the versions are pinned because the plugins decide the shape of
   the generated code — and run the command again.

   Hand-typing the document instead also works and needs no toolchain: the
   vendored client only wants a `TypedDoc` (from `~api`), the operation's text
   with its result and variable types attached, which is what the generated
   `TypedDocumentString` is. It is the right move for one small addition and
   the wrong one for a module you keep editing.

   Never edit `src/vendor/api/generated/` by hand either way. It is output, and
   the next run overwrites it without a trace.
4. **Export it from a namespace `src/operationDocs.ts` imports.** That barrel is
   the app's operation surface: the proxy walks those namespaces at startup and
   refuses any document that is not one of them with
   `403 OperationNotInRegistry`. Regenerating into `vendor/api/generated/<module>/`
   is enough — the barrel already imports that namespace. A document written by
   hand somewhere else needs a namespace of its own added to the barrel.

   Reformatting is safe: the proxy also matches on the document with whitespace,
   commas and comments stripped, and forwards its own copy of the text. Adding a
   field is not — that is a different document, and it has to be regenerated or
   the request is refused on the first try.

## Hiding features / trimming surface

Delete what you do not need — components, module subtrees, sidebar entries
(standalone: `src/modules/index.ts` registry). The import-boundary rule
(modules import only react/`~ui`/`~api`/own files) keeps deletions local.

## Rules that keep future you sane

- Never print or commit `CHATFUEL_TOKEN`; it stays in `.env`.
- Validate new GraphQL before shipping it — production has introspection off.
- Keep the chatfuel manifest (the created-asset registry at the project root) out of manual edits.
