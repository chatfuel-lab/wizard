# @chatfuel/module-manifest

The module-manifest contract, in two forms that must never drift apart:

- `module.schema.json` — the JSON Schema every `content/modules/<id>/module.json` names as its
  `$schema`;
- `ModuleManifest` — the TypeScript shape of the same document
  (`src/moduleManifest.ts`, exported through `src/index.ts`).

The schema is the authority; the type lives next to it so the two are reviewed together.

## Consumers

- **`@chatfuel/wizard`** — the type is bundled into the CLI at build time. This package never
  ships independently: it has no build, no dist, and is not published.
- **The repo gates** — `scripts/validate.ts` checks every `content/modules/<id>/module.json`
  against
  the schema (ajv) plus semantic rules, and `test/` proves the schema itself behaves.

## Changing a manifest field

Update the schema and the type **together** in one change. `pnpm validate` fails on drift —
a manifest that satisfies one form but not the other is a red gate, not a style choice.

Node-side only. Nothing here is vendored into scaffolded apps — manifests are read at
scaffold time, not at runtime.

## Development

```bash
pnpm --filter @chatfuel/module-manifest check    # tsc
pnpm --filter @chatfuel/module-manifest test     # vitest
```
