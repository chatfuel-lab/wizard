# @chatfuel/api-client

Source-only Chatfuel API client. Everything under `src/` is browser-safe
(relative imports only, no Node built-ins) and is vendored into scaffolded
apps as `src/vendor/api` — apps reach it through the `~api` alias in both
workspace and vendored modes.

## Vendoring contract (template package.json must satisfy this)

`src/` imports exactly these packages, so a scaffolded app must declare them
as **dependencies**:

- `graphql`
- `graphql-ws`
- `@graphql-typed-document-node/core`

Node consumers below Node 22 must pass the `ws` package's `WebSocket` as
`webSocketImpl` (the browser and Node 22+ have a global one). `ws` is never
imported from `src/`.

## Usage

```ts
import { createChatfuelClient, BATCH_THROTTLE, newClientId } from '@chatfuel/api-client';
import { CurrentUserDocument } from '@chatfuel/api-client/generated/core';

// Node (wizard/recipes): real token + throttle.
const node = createChatfuelClient({ token: process.env.CHATFUEL_TOKEN!, throttle: BATCH_THROTTLE });

// Browser behind the dev proxy: NO token — the proxy injects it server-side.
const browser = createChatfuelClient({ url: '/chatfuel/graphql', wsUrl: '/chatfuel/graphql' });

const { currentUser } = await node.query(CurrentUserDocument, {});
const unsubscribe = browser.subscribe(SomeSubscriptionDocument, vars, { next: console.log });
const offReconnect = browser.onReconnect(() => {/* refetch queries backing live views */});
```

- `query`/`mutate` throw (`ChatfuelGraphQLError` / `ChatfuelAuthError`) when
  `errors[]` is present — classification scans `extensions.code` and the
  nested entries in `extensions.errors[]`, never the HTTP status. `execute` returns the raw envelope for partial-data views.
- Variables are recursively stripped of `__typename`.
- `newClientId()` — fresh UUID per outgoing message (must be unique across
  all clients of the account).
- Generated typed documents live in `src/generated/<module>/graphql.ts` — see
  **Codegen** below.

### What it refuses at construction

- **A token over plaintext.** With `token` set, `url` and `wsUrl` must be
  `https`/`wss`, relative, or loopback. Anything else throws before a request
  is made — a token on the wire in the clear is not something to warn about
  once and then do. Token-less browser-behind-proxy mode is unaffected.
- **A timeout that is not a positive number.** `timeoutMs: 0` used to mean
  "abort immediately"; it now names itself as the config mistake it is. The
  same check runs on the per-request `timeoutMs`.
- **A throttle that cannot run.** Non-positive `rps`, `concurrency` under 1 or
  fractional, negative or fractional `maxRetries`.

Responses are read through a byte cap — `maxResponseBytes`, 32 MB by default,
1 MB for the upload endpoint — and a body over it fails as
`ChatfuelNetworkError` instead of growing a string until the process dies.
`ChatfuelHttpError` keeps the first 200 bytes of an error body on
`bodySnippet`, deliberately not in `message`: the message is what apps render
and log.

## Codegen

`pnpm codegen` from the repo root writes `src/generated/<module>/graphql.ts` from
two inputs, both of them files in this repository: the SDL at
`content/schema/schema.graphql` and each module's
`content/modules/<id>/skill/examples/operations.graphql`. Regenerate after
editing either.

The output is committed and `pnpm codegen:check` fails on drift, so a scaffolded
app vendors a client that is already built and never has to generate one to
start. It can generate one all the same: the wizard copies both inputs into the
app (`src/vendor/schema/` and `src/vendor/api/operations/`) along with this
config, and the app's `npm run codegen` runs the same cycle over them. What it
does not copy is the toolchain — 265 packages that only somebody editing a
document needs — so the first run there prints the exact install line and stops.
Everything that decides the shape of the output is pinned exactly, `graphql`
included, so both ends generate the same bytes.

The script is two commands, and the second is not optional. `documentMode:
'string'` makes codegen inline the full text of every fragment an operation
spreads, transitively, with no way to turn it off: flow-builder came out at
2.1 MB, most of it the same fragments printed again. `scripts/hoist-fragments.ts`
gives each fragment one constant and has the operations interpolate it
(`${XFragmentDoc}` — the shape codegen itself emits in every other document
mode), which takes that file to 689 KB. `test/generated-documents.test.ts` guards
the rewrite. The script sits outside `src/`, so it is not vendored.

## Env contract

- `CHATFUEL_TOKEN` — the Chatfuel dashboard token (repo-root `.env` for the
  live checks; scaffolded apps get their own `.env` written by the wizard).

## Live check

```
pnpm --filter @chatfuel/api-client live-check              # HTTP + WS against production
pnpm --filter @chatfuel/api-client live-check -- --send --contact <id>   # + mutating echo test
```

⚠ `--send` writes to your live Chatfuel account (creates a conversation and
sends a message). Omit it for read-only checks.
