# Design-system gallery

The dev-only gallery for `@chatfuel/ui`: the tokens rendered from the live CSS custom
properties, and every exported component in its states.

Explicitly **not shipped**. It is not part of the wizard's scaffold template — `content/shell`
is — and it exists only inside this repository. Nothing here may be imported by a module or
by the shell.

## Run it

```bash
pnpm --filter @chatfuel/design-system-gallery dev
```

## Why it exists

To eyeball a component or token change before it lands in modules. A new variant, a spacing
tweak, a dark-mode fix — open the gallery, see it in every state next to its siblings, then
go change the module that needed it.

## Layout

- `src/Tokens.tsx` — the token sheet, read from the CSS custom properties at render time, so
  what you see is what the stylesheet actually says.
- `src/Gallery.tsx` — the gallery frame and navigation.
- `src/demos/` — one file per area (`Primitives`, `Forms`, `DataDisplay`, `Feedback`,
  `Layout`, `ChatShell`, `Calendar`, `Canvas`, `Dnd`, `Floating`, `Media`, `Assistant`,
  `Auth`), each rendering its components in their states.

```bash
pnpm --filter @chatfuel/design-system-gallery check    # tsc
```
