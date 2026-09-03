# Contributing

Before it is a pull request, it can be a question. Ask in the Discord:
<https://discord.gg/TmrgcjVqFf>

## Setup

- pnpm 10.x
- Node 22.19.0 or newer (the same floor the published CLI itself runs on)

```bash
pnpm install
```

`pnpm-workspace.yaml` lists `content/*` alongside `packages/*`, because four of the eight
directories under `content/` are workspace packages — `shell`, `ui`, `api-client` and
`vite-plugin-proxy`: they have to be built and tested here before they are copied anywhere. pnpm
ignores the other four (`codegen`, `modules`, `schema`, `skills`), which carry no `package.json`. The npm scope is
unrelated to the tree: a package's name lives in its own `package.json`, so `@chatfuel/wizard`
publishing from `packages/wizard` is not a coincidence worth removing.

Two of those three go one further and are compiled into the wizard as well: it talks to the same
API its scaffolds do (`@chatfuel/api-client`) and honours the same proxy settings
(`@chatfuel/vite-plugin-proxy/egress`), so both are `devDependencies` of `packages/wizard` and
tsdown bundles them into `dist/`. That is why they carry tests of their own here rather than
being treated as template files. `@chatfuel/module-manifest` is a `devDependency` too, but it is
types only, so nothing of it survives the build.

## The seven gates

Every PR must pass all seven, in this order — CI runs exactly these
(`.github/workflows/ci.yml`):

```bash
pnpm validate        # schema, manifests, references, boundaries, publishability, …
pnpm codegen:check   # the committed generated client still matches the operations
pnpm check           # tsc across the workspace
pnpm lint            # eslint + prettier --check
pnpm test            # all suites
pnpm build           # the three packages that have one: content/shell (client + server),
                     # the wizard, the design-system gallery — what Rollup rejects and tsc
                     # accepts
pnpm --filter @chatfuel/wizard pack-smoke    # build the tarball, install it with npm outside
                                             # the repo, and run it there
```

The smoke pass runs the wizard sealed: outbound HTTP points at a closed port, so the only
thing it can reach is the local content origin (a server over this checkout's git objects).
Add `--offline` — `pnpm --filter @chatfuel/wizard pack-smoke --offline` — to seal npm as
well, which needs a warm npm cache and is why it is not the default.

`pnpm format` fixes what prettier finds. Markdown is prettier-exempt (`*.md` is in
`.prettierignore`) — prose is not reformatted.

## One commit, one PR

A PR contains **exactly one commit**. Squash before opening. No work-in-progress PRs, no
"part 1 of N".

Review feedback is folded into that same commit — amend and force-push — never stacked on top
as fix-up commits. The history should read as the list of things that shipped, one commit
each.

Green CI is the entry condition for review, not for merging: a maintainer's review gates the
merge.

Commit messages carry three things: the problem, the reasoning, what changed.

## What may leave the building

Every top-level directory splits on one question: **does this end up on a user's disk?**
`content/` is the answer, and that is what the directory is for: nothing outside it reaches a
user's disk. `content/shell` becomes their project root, the three package `src/` trees become
their `vendor/`, `content/modules/<id>/skill/` becomes their installed skills, and
`content/modules/<id>/handoff.md` is inlined verbatim into their own instructions file. A word
written for us is a word written for them.

Read `scripts/content-trees.ts` before assuming a file travels: the three vendored packages
send their `src/` and keep their tests, configs and build scripts here, so `content/ui/src` is
under the rules below and `content/ui/package.json` is not.

The split is worth stating the other way round too, because it is the one thing about this
layout that is not guessable: `packages/` is not "the libraries". It holds what is built here
and goes nowhere near a user's project:

- `packages/wizard` — the published CLI, and the only package in this repository that is not
  `private`.
- `packages/module-manifest` — the JSON Schema every `module.json` is written against, and the
  TypeScript type for it. No runtime code at all: the wizard imports the type, `pnpm validate`
  feeds the schema to ajv, and each manifest names it in `$schema` so an editor can complete it.
- `packages/design-system` — dev-only gallery for `content/ui`; never shipped.

Four of the trees under `content/` are workspace packages as well, and two of them are also
compiled into the wizard itself, but that is a build detail; what decides where a directory
lives is whether a copy of it ends up in someone's project.

Three rules, and they hold for every module and every change:

1. **English only** in the shipped trees. Code, identifiers, comments, docs, UI copy and data
   tables. Users write in whatever language they like and the app renders it, but nothing we
   ship is written in anything but English.
2. **Nothing that names what only this repository can see.** No internal tooling, internal
   environments, people, or other repositories. In the shipped trees, additionally: no
   references to pnpm, to its gate scripts, or to a path in this repository written as though
   the reader had it checked out — the scaffolded project has none of them, and an instruction
   that names a tool the reader does not have is worse than no instruction. Where a comment
   explains a live rule, keep the rule and drop the name — the reasoning stays, the private
   noun goes. Pointing at this repository *as* a separate thing the reader may go and clone is
   allowed where they gain something by it — the `auth` module's SQL harness is the standing
   example — provided the sentence says plainly that it is not part of their app.
3. **No credentials, and nothing outside the declared trees.** No unfinished-work markers
   either — a known gap is either fixed or written up as an issue, never left as a comment
   flag.

`scripts/check-publishable.ts` enforces what a pattern can decide: rule 1 by script range, rule
3 by shape, and the private-noun half of rule 2 from the list below. The other half — whether a
sentence in a shipped tree assumes the reader has this repository — stays a review question,
because the words that give it away are ordinary ones and a pattern for them would fire on
every honest use. The gate runs three times: inside `pnpm validate` over the sources, during
packing over the packed bytes, and again at `prepublishOnly`.

Rule 2 has a shape a public file cannot hold. The words most worth banning are the ones no
reader outside can see, and writing them down here in order to ban them would publish exactly
what the rule exists to keep unpublished. So the tracked rule list names nothing private, and
an untracked `scripts/check-publishable.private.json` — gitignored, skipped by the scan — adds
patterns to your own copy:

```json
{ "banned": [{ "pattern": "\\bAcme-\\d+\\b", "flags": "gi", "reason": "a ticket id" }] }
```

There need not be one. A fresh clone has none — that much stays true. But CI does not skip
the full list just because your checkout never carried it: a `CHECK_PUBLISHABLE_OVERLAY`
secret supplies it from outside the tree, applied in a job of its own
(`.github/workflows/ci.yml`) — so the list is enforced without ever being committed here.

That job runs on every pull request from this repository, on the push to `main`, and in the
merge queue where the repository has one. The exception is a pull request from a fork, which
GitHub hands no secret at all; there the job says so and stops, and the whole list is enforced
before the branch becomes `main` instead. Where the secret does arrive, an empty or missing
overlay now fails the job (`CHECK_PUBLISHABLE_REQUIRE_OVERLAY`) rather than passing it on the
tracked half.

A red gate is never cleared by quietly adding an entry to its `ALLOW` list. An exception is a
decision: it goes in the list with the reason written next to it, and it is called out in the
PR.

## UI copy: no explanatory captions

We do not put explanatory small print in the interface. Not under a number, not under a card,
not over a table, not in an empty state, not as a "for your information" line anywhere.

Banned outright, with examples:

- coverage lines under figures — "Server counts, as of 05:29 PM"
- engine and freshness explainers — "This list is a snapshot — the API has no live feed for a
  filtered list"
- arithmetic asides — "23 of your 67 contacts have never chatted"

What replaces them: **nothing**. A figure stands on its own. If a limit is real and a person
genuinely has to know it, the answer is a control that behaves correctly, a plain label of two
or three words, or an error message at the moment the thing fails — never a paragraph parked
on the screen forever.

Where the reasoning does belong, and where it must keep going:

- the module's skill docs (`content/modules/<id>/skill/**`) — that is what they are for;
- code comments — a rule that a comment explains stays explained;
- an actual error or refusal, said once, at the moment it happens.

## What a push reaches, and what it does not

**A commit on `main` reaches users. Read this section before merging one.**

The wizard on npm is a program that fetches content; the content itself lives in this
repository and is fetched at run time. Every run asks GitHub what `main` points at now, and
installs from that commit. So a fix to a module, a new module, a change to the shell — all of it
reaches the next `npx @chatfuel/wizard` in the world, with no release and no version bump.

| what changed | reaches users without a release |
| --- | --- |
| `content/**` — shell, ui, api-client, proxy, modules, skills, schema, codegen | **yes, on the next run** |
| `packages/wizard/**` — the CLI itself | no — that is the tarball |
| `scripts/**`, `.github/**`, and the tests that stay here | no, and never will |
| `README.md`, `docs/**`, issue templates | yes, to whoever reads them on GitHub |
| the `chatfuel-apps` catalog, which is a separate repository | yes — see [docs/apps.md](docs/apps.md) |

That last row is narrower than it looks. `content/shell` travels whole, so the suite beside
the shell's own source is the *app's* suite: it reaches users like any other content file, and
`npm test` in a generated app is what runs it. The tests that stay here are this repository's —
`packages/**`, the three `content/*/test/` directories, and the `*.test.tsx?` files inside the
vendored `src/` trees, which the copy filter strips on the way out (`vendorCopyFilter` in
`packages/wizard/src/steps/scaffold.ts`). A test under `content/shell` is a file a user will
read and run; write it that way.

Two things follow, and both are the cost of the design:

- **`main`'s CI is the last gate before a user.** Not the release. Not the packing step. A red
  `main` is a broken `npx` for everyone who runs it while it is red.
- **A bad commit is undone by another commit.** There is no version to hold back, and nothing
  to unpublish. Revert, push, and the next run is correct.

The commit inside the tarball is still there and still checked; what it means is a floor. A
resolution is refused unless it descends from it, so a branch that was reset or force-pushed —
or an origin pointed at somebody else's fork — is a loud failure rather than a quiet install of
whatever that branch holds. Everything else that can go wrong (offline, rate-limited, a proxy
that eats `api.github.com`) falls back to the floor, which is the content the tarball was
published with and a working install.

Because the branch moves, the file list has to come from the commit rather than from the
tarball: `content.index.json` is committed alongside the trees and is what a run reads to know
which files exist and what bytes they should be. `pnpm validate` fails if it does not match, so
a content change lands with `pnpm content-index` run or it does not land.

`update` works the same way. `npx @chatfuel/wizard@latest update` resolves `main`, so an
existing app moves to whatever is on the branch — which is what makes running it twice in a week
do something the second time.

Anyone who needs a run not to move can say so: `CHATFUEL_CONTENT_REF=<full sha>` installs
exactly that commit and skips the branch entirely, and `CHATFUEL_CONTENT_REF=<branch>` follows
somebody else's. Neither is compared to the floor. The ancestry check above is what guards the
branch a run follows when nobody said otherwise; naming a ref by hand is saying you know what
you are asking for, and reproducing an old run — a commit from before the floor moved — is
exactly what it is for.

## If you changed X, run Y

One rule covers most of it: **a commit that touches `content/` also carries a regenerated
`content.index.json`.** That file is how a commit tells a wizard what it holds and what the bytes
should be. A content change without it is a commit nothing can be installed from — every file
whose digest moved fails its check, and every file that was added is one no wizard asks for. It is
a gate rather than a note for that reason.

| you changed | run, before you commit | notes |
| --- | --- | --- |
| anything under `content/` | `pnpm content-index` | commit the regenerated index in the same commit |
| `content/schema/schema.graphql` | `pnpm codegen`, then `pnpm content-index` | the generated client is committed, so it moves with the schema |
| `content/modules/<id>/skill/examples/operations.graphql` | `pnpm codegen`, then `pnpm content-index` | one generated file per module, and only that module's is rewritten |
| a new `content/modules/<id>/` | `pnpm content-index` | nothing else — an installed wizard fetches a manifest it never shipped with |
| `packages/wizard/` | nothing extra | it reaches nobody until a maintainer publishes a version |
| `scripts/content-trees.ts` | `pnpm content-index` | it names the trees, so the index moves with it — and it is compiled into the CLI |
| `scripts/`, `.github/`, `packages/*/test/`, `content/*/test/`, any config | nothing extra | none of these ship |
| `README.md`, `docs/`, this file | nothing extra | markdown is prettier-exempt |

Then, in every case: **the seven gates**, one commit, one pull request, against `main`. There is
no second branch and no publish step to remember — `npx @chatfuel/wizard` reads `main` at run
time, so merging is the delivery.

The two commands worth knowing by what they fix rather than by name:

- **`pnpm content-index`** — after any content change. Rewrites the file list and the digests for
  the commit you are about to make.
- **`pnpm codegen`** — after any change to the schema or to an operation document. Rewrites
  `content/api-client/src/generated/`, which is committed.

Neither runs on its own. There is no hook, and CI does not fix it for you — it fails.

### Does CI check this?

Yes, on every pull request, again on `main` after the merge, and in the merge queue where the
repository has one (`.github/workflows/ci.yml`). What each gate actually catches:

| forgotten | caught by | how |
| --- | --- | --- |
| `pnpm content-index` | `pnpm validate`, pass 19 | compares the committed bytes against what the generator would write now |
| `pnpm codegen` | `pnpm codegen:check` | regenerates and fails on a non-empty `git diff` |
| a break in the branch-following path | `pnpm test`, then `pack-smoke` | the suites cover resolution, the floor check and both refusals; `pack-smoke` packs the tarball, installs it with npm outside the repo, stands up a local origin holding one commit past that tarball, and runs `doctor` against it with the internet sealed off |
| something that must not ship | `check-publishable`, three times | over the sources in `pnpm validate`, over the packed bytes at pack time, and once more against the full ban list in a job of its own |

The one thing CI cannot check is the ordering. `main`'s run happens **after** the push, and a
wizard reads `main` on the next `npx`. In the window between them a red `main` is a broken
install for whoever runs it. That is why the gate that matters is the pull request's own run,
green before the merge — `main`'s run is a regression alarm, not a gate.

## Releases (maintainer-only)

### Cutting a release

A release moves the CLI, not the content. Merging a pull request publishes nothing to npm, and
the maintainer names the version explicitly — it is never inferred from the size of a diff.

A release is its own one-commit pull request: the version bump in
`packages/wizard/package.json` and the
[changelog](packages/wizard/CHANGELOG.md) section that goes with it — `## Unreleased`
becomes `## <version> — <date>` — and nothing else.

Two preconditions the packing step enforces rather than assumes. Both are about the
commit being reachable by somebody who is not you:

- **The commit is pushed.** `content.lock` pins the sha every installed wizard fetches
  content from, so packing refuses a HEAD that is on no remote branch. A package pinned to
  a sha one machine holds is inert on every other one, and the only person who finds that
  out is whoever installs it.
- **The repository is public.** The tarball carries digests and no trees — every file a run
  installs arrives over the network from here, and the fallback to the floor is a fetch as
  well. A private repository is not a degraded install; it is no install at all.

Then, on `main`, with a clean tree and all seven gates green:

```bash
git tag v<version> && git push origin v<version>
cd packages/wizard && npm publish --access public
```

The tag is what publishes the release notes: `.github/workflows/release.yml` re-runs five of the
seven gates — `validate`, `check`, `lint`, `test` and the wizard's `pack-smoke` — checks that the
tag matches the version in the manifest, and turns that changelog section into a GitHub Release.
`codegen:check` and `build` are not repeated there: both passed on the pull request that put the
commit on `main`, and neither reads anything a tag changes. It deliberately does **not** publish to npm — the thing every `npx` in
the world downloads is not the side effect of a git push.

`npm`, not `pnpm`, so `prepack` and `prepublishOnly` fire the same way `pack-smoke` exercises
them. Never `--ignore-scripts` — that is exactly the flag that skips the gate.

For 0.x: a breaking change to what gets scaffolded is a minor bump, a fix is a patch.
