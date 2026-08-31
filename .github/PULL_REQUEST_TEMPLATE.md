## What

<!-- What changed, in a sentence or two. -->

## Why

<!-- The problem, and the reasoning behind this shape of the change. -->

## Checklist

- [ ] Exactly one commit, squashed
- [ ] `pnpm validate` green
- [ ] `pnpm check` green
- [ ] `pnpm lint` green
- [ ] `pnpm test` green
- [ ] `pnpm --filter @chatfuel/wizard pack-smoke` green
- [ ] Nothing in shipped trees names internal-only tools or layout — check-publishable is
      green without new `ALLOW` entries (any new entry is explained in this PR)
- [ ] No unfinished-work markers
- [ ] `packages/wizard/CHANGELOG.md` has an entry under `## Unreleased`, if this changes
      what a user gets

See [CONTRIBUTING.md](../CONTRIBUTING.md) for what each of these means.
