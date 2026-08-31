# Your Chatfuel app

Sidebar navigation hosting every module you installed as an embeddable root
under `src/modules/<id>/`.

```
npm run dev      # http://localhost:5173
npm run build    # client -> dist/, then server -> server/dist/entry.js
npm test         # the suite that ships with the app
```

## How it is wired

- **Routing**: hand-rolled path routes, `/<moduleId>[/<view>]?<params>`
  (`src/lib/route.ts`) — `/contacts/fields`, `/bookings/calendar?mode=week`.
  The module is the first segment, its own surface is the second, and
  everything else is a query parameter. `/` opens the first installed module.
  Modules receive `view` / `setView` / `params` / `setParams` / `navigate` via
  props and never touch `window.location`; a plain `<a href="/livechat?c=1">`
  inside the app is caught by the shell and navigated, not reloaded.
  Addresses from an older build (`#/livechat?c=1`) are rewritten on load, so
  invite mail, reset mail and bookmarks keep working.
- **Module contract** (`src/modules/types.ts`): each module dir exports
  `moduleDescriptor` from its `index.tsx` — id, title, icon, the root
  component (`{ botId, client, params, setParams, view, setView, navigate }`
  props). `src/App.tsx` is the only file that knows about env vars, bot
  switching and routing.
- **Dual-mode `~ui` / `~api` aliases**: a scaffolded app resolves them to
  `src/vendor/{ui,api}` — the design system and the API client, vendored into
  this project as sources you can read and change. `vite.config.ts` and
  `tsconfig.json` both point at them.
- **Dev proxy**: `chatfuelProxy()` in `vite.config.ts` injects the token
  server-side (`CHATFUEL_TOKEN` in `.env`), relays the WebSocket, and
  forwards `/chatfuel/api/*` REST (file uploads).
- **The documents this app ships** (`src/operationDocs.ts`): a barrel of
  namespace imports over `src/vendor/api/generated/*`, handed to the proxy by
  all three hosts — `vite.config.ts`, `server/entry.ts` and `api/chatfuel.ts`.
  The proxy forwards those documents and refuses every other one with
  `403 OperationNotInRegistry`, so **an operation you add has to be exported
  from a namespace this file imports.** Regenerating into
  `vendor/api/generated/<module>/` is enough; a document written by hand
  elsewhere needs its own line here. Reformatting is safe — the check ignores
  whitespace, commas and comments — but a field added to an existing operation
  is a different document, and refused.

## Extending the API

Every GraphQL request this app makes is generated from two inputs it carries,
and you can regenerate the client from them without leaving the repository.

**Where the pieces are.**

| path | what it is |
| --- | --- |
| `src/vendor/schema/schema.graphql` | the Chatfuel SDL — the schema everything is checked against |
| `src/vendor/api/operations/<module>.graphql` | the documents, one file per module. **These are the inputs you edit.** |
| `src/vendor/api/generated/` | the output: typed documents, one namespace per module |
| `codegen.ts` | the config, at the root of the app |
| `scripts/codegen/` | the generator itself — config body, fragment hoisting, the stamp |

**Install the toolchain once.** It is not a dependency of this app: the four
plugins and their loader pull in 265 packages and 62 MB that nothing but this
command needs, and an app that never edits a document would carry all of it for
nothing. So the first run prints this and stops:

```bash
npm install --save-dev --save-exact \
  @graphql-codegen/cli@5.0.7 \
  @graphql-codegen/typescript@4.1.6 \
  @graphql-codegen/typescript-operations@4.6.1 \
  @graphql-codegen/typed-document-node@5.1.2 \
  @graphql-codegen/visitor-plugin-common@5.8.0 \
  tsx@4.23.12
```

Copy the line the run prints rather than this one: it is filled in for whichever
package manager wrote your lockfile. The versions are exact on purpose — a patch
release that renames a generated type is not a break for graphql-codegen, but it
is a break for every file here that imports one. Do not widen them.

**The cycle.**

1. Edit the document: `src/vendor/api/operations/<module>.graphql`
2. Run `npm run codegen` — the first run prints the one command that installs the generator, and stops.
3. Commit the regenerated files under `src/vendor/api/generated/` together with the document you edited.

Then `npm run check`. That is the whole loop, and it is the same three lines the
`chatfuel-core` skill gives an agent and the same three `chatfuel-wizard update`
prints when it has moved an input.

**Never edit `src/vendor/api/generated/` by hand.** It is output. The next run
overwrites it and the edit is gone with no trace. Edit the document and
regenerate.

**Regenerating reproduces the same bytes.** Everything that decides the shape of
the output is pinned exactly — the four plugins above, and `graphql` itself,
whose printer does the formatting. Running codegen on an app you have not
touched leaves an empty diff, so a diff you did not expect is a real difference
in the inputs and worth reading.

**`src/vendor/api/generated/.codegen-inputs.json`** is the stamp: the digest of
the schema and of every operation document, as they were when the client beside
them was generated. It answers "are these types current?" without regenerating
to find out — digest the inputs and compare. Both the wizard and `npm run
codegen` write it, so it is never one of them describing the other's work.

**`chatfuel-wizard update` does not bring the types with it.** Every file under
`src/vendor/api/generated/` is marked `generated` in `.chatfuel/lock.json`, with
no digest and nothing upstream to fetch, so the update never writes one. When it
moves the schema or a document it says so under `regenerate the client` and
leaves the run to you. The second diff, the one codegen makes, is expected.

**The inputs are the upstream ones, byte for byte.** The schema and the
documents came out of the commit `.chatfuel/lock.json` pins and were checked
against the digests recorded there. You are generating from the same SDL the
vendored client was generated from, not from a copy that may have drifted.

**A forgotten regeneration shows up as a refusal, not a type error.** The proxy
serves only the documents `src/operationDocs.ts` exports, and refuses everything
else with `403 OperationNotInRegistry`. An operation you added to a `.graphql`
file but never generated is not in a namespace that barrel imports, so the
request is refused on the first try.

## Env

See `.env.example`: `CHATFUEL_TOKEN` (server-side only),
`VITE_CHATFUEL_WORKSPACE_ID` (the workspace the app opens on),
`CHATFUEL_API_BASE` (upstream override, read by the proxy), optional `PORT`,
and the two that say what this app is: `VITE_APP_NAME` and `VITE_APP_LOGO`.

`VITE_APP_LOGO` is a file in `public/` — `logo.svg` is the one shipped, and
replacing that file is all it takes to change the mark. Point it at a different
name (or an absolute URL) to use another. It is drawn in the top bar and on the
sign-in screen; the browser tab reads `index.html`, which the head is parsed too
early to take from the environment, so the icon link and the `<title>` there are
edited directly.

No bot is named anywhere. The topbar lists every workspace the token's account
owns and the bots inside each, read live — a bot created after the app went up
is in the list without a rebuild — and the proxy fences requests against the
same set. The last workspace and bot chosen are remembered per browser; the
address bar stays out of it, so a link opens in the recipient's own bot.

With the `auth` module the workspace picker disappears — every account that
signs up gets a workspace of its own, with a bot in it and as many more as they
add — and the topbar switches between the bots that account may open instead.
Four more variables appear: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(both or neither: they switch the gate on), `SUPABASE_SERVICE_ROLE_KEY`, which
is **server-side only** and not optional — it is what lets the server register
a bot it just created — and `CHATFUEL_WORKSPACE_ID`, the Chatfuel workspace
every one of those bots is created in, whose plan pays for them all.
`VITE_APP_NAME` and `VITE_APP_LOGO` name and mark the app on the sign-in screen.

## Production

Two ways: Vercel (managed, one command) or run the bundled Node server yourself
(a box you own, or the included Dockerfile). Both run the same proxy core, so
the auth gate, the bot fence and the error codes are identical.

Before any of them, settle who is allowed to reach the deployment. Without the
`auth` module this app has no sign-in, so the proxy admits every request that
arrives and the URL is the credential — see
[the auth gate](#the-auth-gate) below.

### Vercel

```
npm run deploy
```

`scripts/deploy-vercel.mjs` does the whole thing with the Vercel CLI: finds or
installs the CLI, signs you in, asks what to call the project, links the
directory to it, pushes the variables from `.env` into the project environment,
deploys to production, then asks the deployment itself whether it came up
configured. No GitHub repo and no dashboard visit.

The name is the address (`<name>.vercel.app` when it is free), so it is asked
rather than taken from the directory — and if you already have a project by
that name, it says so and offers to pick another, because `vercel link` would
otherwise link to it and deploy over whatever is live there. Pass
`--project <name>` or set `VERCEL_PROJECT_NAME` to skip the question.

**Shipping an update is the same command.** Re-running is the normal case: the
link is reused, variables are overwritten (`vercel env add --force`) rather than
duplicated, and the production address moves to the new deployment. Local edits
are not live until you run it.

**Behind a proxy or an allowlist**, a deploy from this machine needs
`api.vercel.com`, and `registry.npmjs.org` as well when the Vercel CLI is not
already installed and has to be fetched to run. Nothing else: the build itself
downloads what it needs on Vercel's side, and the CLI's telemetry upload is
switched off for every call the script makes, so a blocked telemetry host cannot
stop a deploy. If something does not get through, the script names the host it
could not reach rather than blaming the build.

There, Vercel serves `dist/` and `api/chatfuel.ts` is the proxy: `vercel.json`
rewrites `/chatfuel/:cfpath*` onto it, and it exports an `http.Server`, which is
what lets Vercel Functions accept the WebSocket upgrade for subscriptions. A
plain rewrite straight to `panel.chatfuel.com` would be simpler and is not
usable: a rewrite forwards the browser's headers and cannot add one, so the
Chatfuel token would have to be sent by the client.

One static filename, not a catch-all `api/chatfuel/[...path].ts`, because
Vercel's zero-config `api/` directory compiles a catch-all into a route that
matches a single path segment — `/chatfuel/graphql` survives it and
`/chatfuel/auth/provision` does not. So the requested path travels as the
`cfpath` query parameter and `restoreUrl()` puts it back before the core sees
it. The name of that parameter is a contract between `vercel.json` and
`api/chatfuel.ts`; the two must not drift.

Three more Vercel specifics. A WebSocket closes when the function hits its
duration limit (300 s on Hobby) and the client reconnects — subscriptions
survive it, that is what `onReconnect` refetching is for. `.env` is never
uploaded (`.vercelignore`), so the project environment is the only source of
configuration. And `vercel deploy` prints the *deployment* URL, which under
Vercel's default Deployment Protection sits behind an SSO wall — fine for you,
a dead link for everybody else; the production domain assigned alongside it is
the public one. Which alias is which is not derivable from the name, so the
script asks each in turn and hands you the first that answers without the SSO
wall. Only if none of them do is there anything to change in the dashboard, and
it says so.

### Your own server

```
npm run build     # client → dist/, then server → server/dist/entry.js
npm start         # node server/dist/entry.js   (PORT, default 3000)
```

`server/entry.ts` boots the same proxy the dev server runs, in front of the
built client: `/chatfuel/healthz` → the Chatfuel routes (`POST /chatfuel/graphql`, WS
`/chatfuel/graphql`, `/chatfuel/api/*`) → static files from `dist/` (hashed
`/assets/*` immutable, `index.html` `no-cache`, and an unknown path that is not
asset-shaped gets `index.html`, because it is a route). `npm run build:client` /
`build:server` build the halves separately.

Any other host has to do the same one thing: **answer an unknown path with
`index.html`**. On Vercel that is the last rewrite in `vercel.json`; on nginx
`try_files $uri /index.html`; on a static host, its SPA-fallback setting.
Without it a reload of `/deals/board` is a 404 while clicking to the same page
works — the failure looks like a routing bug and is not one.

### The response headers

Both hosts send the same set, and they have to: the bundle is identical, so a
policy it survives on one host and not the other is a bug you only meet in
production. Vercel sends them from the `headers` block in `vercel.json`, the
node server from `SECURITY_HEADERS` in the proxy package, on every page and
every 404 alike.

`Content-Security-Policy` is strict exactly where it can be. `script-src
'self'` costs nothing — Vite emits one module tag and no inline script — and it
is what turns a surviving injection into a dead string: no origin to load from,
no inline block to run. `object-src 'none'`, `base-uri 'self'` and `form-action
'self'` close the ways around that. `style-src` keeps `'unsafe-inline'` because
React writes `style={…}` as an attribute.

`img-src`, `media-src` and `connect-src` are wide on purpose: they face the
Chatfuel media CDN, your Supabase project and whatever host an attachment came
from, none of which are knowable when a config file is written. A wrong guess
there does not fail loudly — it blanks an avatar or kills a subscription. So
the scheme is pinned (`https:`/`wss:`, never `http:`) and the host is not. If
your deployment has one known media origin and one Supabase project, narrowing
these two directives to those hosts is the single most useful edit you can make
to the policy.

`frame-ancestors 'none'` and `X-Frame-Options: DENY` say the app is never
framed — modules are embeddable inside the shell, the shell itself is a
top-level page, and clickjacking a livechat means sending messages as the bot.
`Referrer-Policy: no-referrer` matters more than it looks: an operator can be on
`/reset-password?token_hash=…`, and every image and outbound link on that page
would otherwise carry the recovery token to a third party.
`Permissions-Policy` switches off the powerful features the app never asks for
and keeps `microphone=(self)`, which the voice-note composer uses.

### Serving it from a sub-path

If the app does not own the domain root — `https://example.com/app/` — build and
run it with the same value on both sides:

```
VITE_BASE_PATH=/app/ npm run build
BASE_PATH=/app npm start
```

`VITE_BASE_PATH` is Vite's `base`: it rewrites the asset URLs in `index.html`
and the router reads it back, so every address the app builds sits below it.
`BASE_PATH` tells the server which prefix is the app; anything outside it is a
404. The two must agree — a client built for `/app/` served at the root loads a
page whose scripts all 404. The Chatfuel proxy routes (`/chatfuel/*`) stay where
they are, above the mount point. Vercel is root-only.

Docker, where the same two sides are a build arg and a runtime variable:

```
docker build -t chatfuel-app \
  --build-arg VITE_BASE_PATH=/app/ \
  --build-arg VITE_CHATFUEL_WORKSPACE_ID=<workspace> \
  --build-arg VITE_SUPABASE_URL=<url> \
  --build-arg VITE_SUPABASE_ANON_KEY=<key> \
  --build-arg VITE_APP_NAME="Your app" .
docker run -p 3000:3000 -e BASE_PATH=/app --env-file .env chatfuel-app
```

`VITE_BASE_PATH` has to be on the `build` line and nowhere else: it is read
while the bundle is written, and an image built without it is pinned to `/`
however the container is later run. Leave both out for a root-mounted app.

**`VITE_*` are baked into the client at build time; the proxy reads its env at
runtime.** They must agree. Symptoms when they do not: the app renders the
sign-in screen but every request comes back `ProxyAuthMisconfigured` or
`AuthSessionRequired` (client built with Supabase, server started without it);
or the app never asks anyone to sign in while the server rejects every request
(server gated, client built without the auth env). The startup line prints
which mode the server is in; `/chatfuel/healthz` answers `{"ok":true}` and
nothing more, because it is open to anyone who can reach the app.

### The auth gate

With `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
set, every proxied request must carry the caller's Supabase access token
(HTTP `Authorization: Bearer`, WS `connection_init {authToken}`), and the proxy
asks the project's own `cf_my_bot_ids` RPC which bots that session may open
before injecting `CHATFUEL_TOKEN` and forwarding. That set is the isolation
boundary — an owner or admin reaches every bot of their own workspace, a member
the ones granted to them: a request naming somebody
else's bot answers `403 BotNotAllowed`, and account-wide queries (`botsV2`, and
`currentUser` beyond the handful of fields that name the bot or the resource they
answer about) answer `403 AccountScopeBlocked` — they would list every customer. Other failures answer `401 AuthSessionRequired` /
`403 AuthTenantForbidden` (signed in, no workspace) / `503 ProxyAuthUnavailable`
(WS: close 4401 / 4403 / 1013). Answers are cached 30 s per token, so a removed
member keeps working for at most half a minute of HTTP calls and until their
socket drops. Some but not all of
them set = every request fails closed with `500 ProxyAuthMisconfigured`.

**Neither var set = open mode, and open mode has no callers.** There is nobody
to sign in and nothing to tell one visitor from another, so the proxy attaches
`CHATFUEL_TOKEN` to whatever arrives. Anyone who can reach the URL acts as the
Chatfuel account behind this deployment, inside whatever bot fence it was
given: reading conversations and contacts, sending messages as the bot,
changing flows and automations. The token itself stays on the server and never
reaches the page — but every request it can make, an anonymous visitor can make
through the proxy.

That is the right shape for a tool your own team uses, and it is only safe
while the deployment is not reachable from the public internet: keep it on
`localhost`, behind a VPN or Tailscale, behind an IP allowlist, or behind your
host's own access control (Vercel's password protection, nginx `auth_basic`,
Cloudflare Access). If the app is meant to be opened by customers, or by staff
signing in as themselves, it needs the `auth` module — `npx @chatfuel/wizard
--embed` adds it.

**So the server will not do it by accident.** Open mode on a host that is not
loopback refuses to serve: `npm start` logs the reason and never binds, and the
Vercel function answers `503 ProxyRefusedToServe` to everything but the health
route. Three ways past it, and only the first two are fixes — install the auth
module, or bind loopback (`HOST=127.0.0.1`). The third is a signature rather
than a fix: `CHATFUEL_OPEN_PROXY=1` says the deployment is meant to answer
strangers under one token, because something in front of it does the
authenticating. It buys silence on that one question and nothing else — with
`ALLOWED_ORIGINS='*'` and no gate the server still refuses, since that pair
lets any page on the internet script the proxy out of a visitor's browser, and
naming your own origins costs one variable.

Which mode you are in is printed at startup, and nowhere else:
`/chatfuel/healthz` answers `{"ok":true}` only.

With `SUPABASE_SERVICE_ROLE_KEY` also set, `POST /chatfuel/auth/recovery-link`
is mounted: an owner/admin can mint a password-reset link for a member of their
workspace (`{"email": …}`) on a deployment with no SMTP. The link is never
returned to the caller — the response is `{ "delivered": "server-log" }` and the
link goes to the server log, for whoever runs the deployment to pass on.

Who may be named is decided by the database, not the route (`cf_recovery_authorize`),
and it is narrower than "a member": the target must rank strictly below the
caller **and belong to no other workspace on this deployment**. A recovery link
resets a Supabase *account*, not a membership — so a target who also stands in a
second workspace would carry this workspace's admin into one they were never
admitted to. Every issue writes a row to `cf_recovery_events`, readable by the
workspace's admins (`cf_list_recovery_events`) and by the person it names
(`cf_my_recovery_events`), because the log holds the link and not the fact that
somebody asked for one.

The link is a working account-takeover token for whoever can read that log, so
writing it is off unless you ask for it: set `AUTH_RECOVERY_LINK_LOG=true` and
the route delivers, leave it unset and the route answers 501 and mints nothing.
Configuring SMTP in Supabase is the way not to use this route at all. Set
`PUBLIC_URL` too: the route builds the link from that and refuses without it,
because a link built from a request header would point wherever the caller
chose.

## License

The code the wizard generated here is provided under the MIT License — see [LICENSE](LICENSE).
