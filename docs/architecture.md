# Architecture

## Three things, not one

`npx @chatfuel/wizard` is a CLI that writes an app. After it runs, the CLI is gone and what
you have is an ordinary React + Vite project you own, with no dependency on the wizard and no
framework of ours between you and your code.

```
@chatfuel/wizard  ──writes──▶  your app  ──talks to──▶  Chatfuel
   (npx, once)                (yours, forever)          (GraphQL + WebSocket)
```

The repository holds all three sides: `packages/wizard` is the CLI, `content/shell` is the app it
writes — and the dev app this repository itself runs — and `content/{ui,api-client,vite-plugin-proxy}`
are the source trees it copies in.

## The token boundary

A Chatfuel token can read and change every bot in an account. It therefore never reaches the
browser. Every call from the app goes to its own origin under `/chatfuel/*`, and a proxy that
runs on the server side attaches the token there.

That proxy is one source tree (`content/vite-plugin-proxy/src`) with three hosts:

| Where | What runs it |
| --- | --- |
| Development | a Vite plugin, inside the dev server |
| Your own server | `server/entry.ts`, a Node HTTP server that also serves the built client |
| Vercel | `api/chatfuel.ts`, a serverless function behind a rewrite |

All three share the same request handling, the same WebSocket relay for subscriptions, and the
same log scrubber. The consequence worth remembering: **anything named `VITE_*` is baked into
the browser bundle at build time**, and anything else is read by the proxy at runtime. A
secret with a `VITE_` prefix is not a secret.

With the `auth` module the proxy also becomes a gate: a request must carry a Supabase session
whose user belongs to this tenant, or it is refused. The gate fails closed — a half-configured
deployment refuses requests rather than letting them through (`ProxyAuthMisconfigured`).

`/admin` is not behind that gate, with the module or without it. It has one of its own —
`ADMIN_PASSWORD`, a cookie, and a wrong-password counter — and what it opens is the whole
account behind `CHATFUEL_TOKEN`, so a Supabase user who may open nothing in the app can still
try that password. Unset, the routes are not mounted at all; set, the value is the only thing
in front of them ([the variable](configuration.md#the-admin-module)).

Without that module there is no gate, and the boundary is only half of one: the token stays on
the server, but the proxy has no callers to tell apart, so it forwards whatever arrives.
Anyone who can reach the URL acts as the deployment's own Chatfuel account, within its bot
fence. That is fine for a tool on a private network and wrong on a public one — see
[who is allowed to reach it](deployment.md#who-is-allowed-to-reach-it).

## Vendoring, not depending

The design system, the API client and the proxy are copied into your project as **source**:

| Repository | Your app | Imported as |
| --- | --- | --- |
| `content/ui/src` | `src/vendor/ui` | `~ui` |
| `content/api-client/src` | `src/vendor/api` | `~api` |
| `content/vite-plugin-proxy/src` | `vendor/chatfuel-proxy` | relative paths |

Nothing in your `package.json` points back at this repository, so nothing we publish can break
your app, and a component you disagree with is a file you can edit. The cost is that upgrades
are not `npm update` — they are a re-run of the wizard, or a diff you apply yourself.

Each row is a workspace package here whose `src/` alone travels; the configs, README and build
scripts beside it stay in the repository, and so do the `*.test.tsx?` files inside `src/` — the
copy filter drops those on the way out, because a test of ours is a failing `vitest` run in an
app nobody wrote it for. The shell is the exception and travels whole, tests included: that
suite is the app's own. Two more trees travel whole without being
libraries of yours — `content/schema` arrives as `src/vendor/schema/`, and `content/codegen` is
copied in beside the client it produces. Both are covered under [talking to
Chatfuel](#talking-to-chatfuel).

Two rules keep the vendored trees portable: every internal import is relative, and `~ui`
imports nothing but `react` and `react-dom`. Both hold in the code today, and neither is
checked by anything — `pnpm validate` reads `content/ui/src` for tokens, barrels and class
names, never for import specifiers, and its one import-boundary pass is scoped to
`content/shell/src/modules/<id>/`. They are conventions you have to keep by hand; break one and
you find out when the tree lands in somebody's app and does not resolve.

## Where the content comes from

The wizard on npm is small on purpose: it carries the module manifests, a commit and a sha256
for every file — `content.lock` — and none of the trees themselves. The files arrive over the
network on the run that needs them, into a cache keyed by commit, and every byte is checked
against its digest before it is written.

The commit in that lock is a floor, not a destination. A run asks GitHub what `main` points at
now and installs from there, refusing any answer the floor is not an ancestor of — a branch that
was reset or force-pushed is a loud failure, never a quiet install. That is what makes a fix to a
module reach people without a release, and it is why the digests cannot come from the tarball:
the branch holds files the tarball never listed, so a run reads `content.index.json` from the
commit it resolved and checks against that.

Everything that can go wrong on the way — offline, rate-limited, a proxy that eats
`api.github.com` — ends at the floor, which is the content the tarball was published with and a
working install. Two overrides exist for anyone who needs the other behaviour:
`CHATFUEL_CONTENT_REF=<full sha>` installs exactly that commit, and `CHATFUEL_CONTENT_ORIGIN`
points the byte fetches at a mirror.

Whichever commit a run lands on is written into the app's own `.chatfuel/lock.json`, beside the
digest of every file the wizard wrote. That is the file `chatfuel-wizard update` reads later,
and it is what turns "upgrade" into a diff somebody can look at.

## Modules

A module is a directory in `content/modules/<id>/` holding a manifest, an agent skill, a handoff
note and, where the module needs them, database migrations, plus a matching React tree at
`content/shell/src/modules/<id>/`. It is not a package: no build, no dependencies, nothing pnpm
looks at. The manifest
(`module.json`, validated against `packages/module-manifest/module.schema.json`) declares the id,
the status, whether it is picked by default, what it requires and recommends, the skill it
installs, and the environment variables it needs. Where a module appears in the navigation is
not its to declare: the nav table lives in the shell, and scaffolding filters it by id.

Scaffolding is subtractive: the wizard copies `content/shell` whole, deletes the modules you did
not pick, regenerates `src/modules/index.ts`, filters the navigation table, and prunes the
`tsconfig` paths that no longer resolve. What you get is not a template with holes in it — it
is a project where the code you did not ask for was never written.

One additive exception: `--app <slug>` fetches a preset from the apps catalog (a separate git
repository) and, after every template transform has run, copies the preset's overlay over the
scaffold and hands its playbook to the coding agent as the build plan. The preset decides the
modules and the brand, so the run stays prompt-free; the overlay is walked through a deny list
that keeps wizard-owned files untouchable — see [apps](apps.md). The catalog is outside the
content lock: module content is fetched from a resolved commit and checked against that commit's
digests, while a preset is the catalog branch as it stands at run time, verified against nothing
— which is what `--apps-ref` is for.

Inside a module the conventions are deliberately small:

- `lib/<name>Store.ts` — a pure reducer, no React, directly testable;
- `hooks/use<Name>Store.ts` — the `useReducer` binding;
- `<Name>Context.ts` — a throwing accessor, so a component outside the provider fails loudly.

There is no state library, and modules do not import each other except through a declared
`requires` (only `deals` → `contacts` today).

## Talking to Chatfuel

`~api` is a generated, typed GraphQL client: queries and mutations over HTTP, live updates over
`graphql-ws`, and REST only for uploads. The schema snapshot lives in
`content/schema/schema.graphql` — the one source the core skill's `references/` and every
scaffolded app's `src/vendor/schema/` are both written from, so there is no pair to drift. The
skill gets a copy at all because a skill directory is installed whole, and the agent reads the
schema from inside it rather than asking a server for it. Beside the SDL sits
`possible-types.json`: the interface and union implementations a normalized cache has to be told
about, derived from the SDL rather than written, and a `pnpm validate` pass fails if the
derivation does not reproduce.

The generated documents live in `content/api-client/src/generated/`, refreshed by `pnpm codegen`
from that snapshot rather than hand-edited. They are committed already built, so a scaffolded app
arrives with a typed client it never had to generate.

A scaffolded app can still run the same generation. It carries the schema, the operation
documents, the config and the generator body — `content/codegen`, shared by this repository and
every scaffolded app, which imports nothing from `@graphql-codegen/*`: the config is a local
interface, so an app's `tsc` type-checks it whether or not the toolchain is installed — and
`npm run codegen` regenerates
`src/vendor/api/generated/` from them. The graphql-codegen packages are not among its
dependencies — they are 265 packages an app that never edits a document would carry for
nothing — so that first run prints the one install line and stops. `chatfuel-wizard update`
moves the inputs and never the output: generated files are marked `generated` in the app's
lock, and the update reports what needs regenerating instead of writing it.

Errors arrive in one envelope shape, so a module never parses a transport error itself — it
gets a typed refusal with a code it can branch on.

## The agent skills

Each module ships a skill (`content/modules/<id>/skill/`) that the wizard installs into
`.claude/skills/` or `.agents/skills/` depending on the coding agent you chose, and a
`handoff.md` that is inlined into that agent's instructions file. This is why the app arrives
extensible rather than merely generated: the agent that continues the work has the same notes
about the API's edges that we do.

Not every skill hangs off a module. `content/skills/<name>` holds the ones that belong to none
and are installed with every app: a module's skill installs only if the user picked that module,
and `chatfuel-update` is about the app's relationship to the wizard rather than anything the app
does, so it cannot hang off a pick. It lives there rather than in the tarball so that the update
flow can update it too.
