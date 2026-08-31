# @chatfuel/ui

Source-only design system, vendored into scaffolded apps as `src/vendor/ui`. Apps reach it
through the `~ui` alias in both workspace and vendored modes — never through `node_modules`.

## The vendoring contract

The wizard copies the whole `src/` tree onto a user's disk, so the tree has to survive the
move byte-for-byte:

- every internal import is **relative**;
- only `react` and `react-dom` may be imported;
- components use only the semantic Tailwind utilities defined by `styles/tokens.css`;
- apps never depend on this package via `node_modules` — the `~ui` alias resolves to the
  workspace source here and to `src/vendor/ui` in a scaffolded app.

## Layout

Each top-level directory keeps its own barrel — `<dir>/index.ts` names exactly what it
exports, so the export list for a component lives beside the component. The root
`src/index.ts` only stitches those barrels together; every name reaches consumers through it.

`lib/` is the headless layer — pure functions grouped by domain (geometry, time, chat, data,
interaction, app, markdown). Its barrel deliberately exports a chosen subset: a lib module
absent from `lib/index.ts` is package-internal on purpose.

The component directories: `primitives`, `shell`, `layout`, `chat`, `forms`, `data`,
`feedback`, `overlay`, `nav`, `dnd`, `canvas`, `calendar`, `floating`, `hooks`, `theme`,
`icons`, `app`.

## The library surface

Exports not currently used by this repository's own modules are still public surface.
Scaffolded apps own the vendored source and build against all of it — a user's app may call
anything the barrels name. Do not prune "unused" exports.

## Development

```bash
pnpm --filter @chatfuel/ui check    # tsc
pnpm --filter @chatfuel/ui test     # vitest
```

The visual gallery is `packages/design-system` — every exported component in its states, and the
tokens rendered from the live CSS custom properties:

```bash
pnpm --filter @chatfuel/design-system-gallery dev
```
