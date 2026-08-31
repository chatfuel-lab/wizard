# Configuration

Two surfaces: the flags the wizard takes when it writes the app, and the environment the app
reads once it exists. The wizard writes a `.env` (mode `0600`) and a `.env.example` beside it;
this page is the reference for what goes in them.

## Wizard flags

`npx @chatfuel/wizard [command] [flags]`

| Flag | What it does |
| --- | --- |
| `--dir <path>` | Where to write the app. Refuses a directory that is not empty. |
| `--embed` | Add modules to a project you already have instead of scaffolding a new one. |
| `--modules <ids>` | Comma-separated module ids; skips the picker. |
| `--app <slug>` | Scaffold a preset app from the [apps catalog](apps.md) — the app decides the modules and the brand, so it excludes `--modules` and `--embed`. |
| `--apps-repo <url>` | Git URL of the apps catalog (else `CHATFUEL_APPS_REPO` env; default: the official repo). |
| `--apps-ref <ref>` | Branch or tag of the catalog to clone (default: its default branch). |
| `--agent <claude\|codex>` | Which coding agent's skill layout to install. |
| `--workspace <id>` | The Chatfuel workspace the app opens on. |
| `--app-name <name>` | Browser tab, top bar, sign-in screen. |
| `--logo <path>` | An image file; becomes the tab icon and the mark beside the name. |
| `--yes` | Accept every default and ask nothing. Never deploys, never pushes to GitHub. |
| `--dry-run` | Stop before anything is created in your Chatfuel or Supabase account — no bot, no project, no trial. The app itself is still written, so you get the scaffold without the account side of it. |
| `--plan` | Print what the run would do and write none of it: no scaffold directory, no files copied into an embed host, no `.gitignore` or `.env` line appended, no `.chatfuel/lock.json`, no skills installed. Implies `--dry-run`, so nothing is created in your accounts either. |
| `--verbose` | Full output instead of a summary. |
| `--supabase-create <name>` | Create a Supabase project with this name. |
| `--supabase-project <ref>` | Use an existing Supabase project. |
| `--supabase-org <slug>`, `--supabase-region <code>` | Where to create it. |
| `--supabase-token <pat>` | Supabase personal access token, instead of `SUPABASE_ACCESS_TOKEN` in the environment. A PAT carries everything your Supabase account can do — there are no scopes on it — so make one for this run at <https://supabase.com/dashboard/account/tokens> and revoke it when the run is done. The wizard never writes it to the app. |
| `--supabase-url <url>`, `--supabase-anon-key <key>` | The manual path: no Supabase API call, and the app ships SQL for you to run. |
| `--admin-password <value>` | The `admin` module's password. At least 16 characters. |
| `--signup <open\|confirm-email\|closed>` | Who may open an account, asserted on a Supabase project this run creates — and only on one it creates. `open` takes email addresses on trust; `confirm-email` makes a new account wait for a link; `closed` turns the sign-up form off and leaves you to add people in the dashboard. On a project you brought, the project's own setting is left alone. |
| `--allowed-origins <list>` | Browser origins besides the app's own that may call the proxy, comma-separated; also readable as `ALLOWED_ORIGINS` in the environment. `'*'` allows every origin, and with no auth gate that combination is one the server refuses to start under — see [Deployment](deployment.md#who-is-allowed-to-reach-it). |
| `--app-url <url>` | The origin the app will be served from, added to the Supabase project's redirect allowlist so a sign-in or password-reset link can come back to it. `https://` only — `http://` is accepted for `localhost` and nothing else. |

Commands: no command scaffolds; `doctor` reports what the wizard can see before it asks
anything; `update` brings an app the wizard made up to this wizard's content (`--dry-run` to
plan, `--json` for the machine-readable plan the `chatfuel-update` skill reads,
`--resolved <paths…>` to record a conflict as settled); `auth` replaces the stored Chatfuel
token in an app that already exists.

Four environment variables are read instead of prompted, which is what makes `--yes` usable
in CI: `CHATFUEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` for the manual
path, where the wizard makes no Supabase API call and so cannot fetch the key itself, and
`ADMIN_PASSWORD` for the `admin` module. Each is the same value as the matching flag and is
judged by the same rules — `ADMIN_PASSWORD` from the environment has to clear the floor
`--admin-password` clears, at least 16 characters and no whitespace, and the run stops saying
so if it does not.

**Prefer the environment over the flag for anything secret.** `--supabase-token` and
`--admin-password` put their value in the command line, and a command line is not private: it
is in `ps` output for every user on the machine, in your shell's history file, and in the log
of most CI runners. The wizard's own output masks these values; the shell that invoked it does
not. Neither of those two flags is ever the only way in: `SUPABASE_ACCESS_TOKEN` and
`ADMIN_PASSWORD` take the same values, and a secret only the process sees is out of `ps` and
out of the history. Put them in a file the shell sources (`set -a; . ./secrets.env; set +a`),
read them from a password manager per command, or let CI inject them — and note that an
`export` typed at a prompt lands in the history file like anything else.

Two more are read only by `--app`: `GITHUB_TOKEN`/`GH_TOKEN`, a fallback for when ambient git
credentials cannot clone the catalog, and `CHATFUEL_APPS_REPO`, which overrides the catalog URL
the way `--apps-repo` does.

Three more control where the wizard's own content — the modules and the shell it scaffolds
from — comes from, and are not meant for everyday use. `CHATFUEL_CONTENT_REF` is the branch or
full commit sha to install from instead of the wizard's default (`main`), so a fix merged after
this wizard was published still reaches the next `npx` run. `CHATFUEL_CONTENT_ORIGIN` points at a
mirror to fetch that content from instead of `https://raw.githubusercontent.com`, for tests,
`pack-smoke`, or a fork with no path to the internet. `CHATFUEL_WIZARD_CACHE` overrides the
directory the fetched content and its branch-resolution cache are kept in, instead of
`~/.cache/chatfuel-wizard` (or `$XDG_CACHE_HOME/chatfuel-wizard` when that is set).

## App environment

`VITE_*` values are compiled into the browser bundle **at build time**; everything else is read
by the server at runtime. Keep the two identical — a build made with one `VITE_SUPABASE_URL`
and a server running with another fails at the gate, not at the point of the mismatch.

### Always

| Name | Side | What it is |
| --- | --- | --- |
| `CHATFUEL_TOKEN` | server | The dashboard token, from <https://panel.chatfuel.com/integration/auth/token>. Never sent to the browser. |
| `VITE_CHATFUEL_WORKSPACE_ID` | client | The workspace the app opens on. Not a fence: every workspace the token's account owns is in the picker. Unused when the `auth` module is installed. |
| `CHATFUEL_API_BASE` | server | Upstream API base. `https://panel.chatfuel.com` unless you are pointed somewhere else. |
| `VITE_APP_NAME` | client | Browser tab, top bar, sign-in screen. |
| `VITE_APP_LOGO` | client | A file in `public/`, or an absolute URL. The tab icon itself is in `index.html` — the head is parsed before any of this is read. |
| `VITE_CHATFUEL_DASHBOARD_URL` | client | Where the app's empty states send someone to do what it deliberately does not do — create a workspace, create a bot, look at the bill. It follows `CHATFUEL_API_BASE` rather than defaulting from it: that variable is unprefixed and so unreadable from the bundle, and an API base and the page someone signs in to are only the same host by convention. Unset, those states point at `https://panel.chatfuel.com`, which is a dead end on a deployment pointed at another Chatfuel. |
| `PORT` | server | Port for `npm start`. Default `3000`. |
| `HOST` | server | Interface `npm start` binds. Default `0.0.0.0` — every interface. `127.0.0.1` makes the deployment this machine's own, which is what open mode (no auth gate) is allowed on without further ceremony. Vercel does not read it: a function has no interface to choose. |
| `ALLOWED_ORIGINS` | server | Optional. Origins besides the app's own that may call the proxy from a browser, comma- or space-separated (`*` allows every origin, credentials and all). The proxy forwards under the master token, so a request from a page you did not write is a request that page gets to make with your Chatfuel account: anything not on this list, and not same-origin, answers `403 ProxyOriginForbidden` before the route runs, and a WebSocket upgrade is refused before a socket exists. A listed origin also gets the CORS headers that let it read the answer. Leave it unset unless another origin genuinely serves your app. |
| `ALLOWED_HOSTS` | server | Optional. The host names this deployment answers to, comma- or space-separated (`app.example.com`, or `app.example.com:8080` when the port is part of the claim; `*` turns the check off). It is the answer to DNS rebinding and nothing else: `ALLOWED_ORIGINS` says which page may call, this says whether the address that page used is one of yours. A name someone else owns, pointed at this deployment, arrives with an `Origin` and a `Host` that agree honestly — so the origin check passes it, and only a list of your own names does not. You rarely set it: the hosts named by `ALLOWED_ORIGINS` and `PUBLIC_URL` are added for you, loopback is always allowed, and a deployment that named none of them and is not on loopback is not checked at all rather than guessed at. Set it for a tunnel whose name is not in either (ngrok, a preview URL), and prefer naming that one host to `*`. Refused requests answer `403 ProxyHostForbidden`, and a WebSocket upgrade is refused before a socket exists. |
| `CHATFUEL_OPEN_PROXY` | server | Optional, `1` or unset. Says out loud that this deployment is meant to answer strangers under one token. With no Supabase pair there is no auth gate, so a host anyone can reach is a master token anyone can drive: the server refuses to bind and the Vercel function answers `503 ProxyRefusedToServe` to everything but the health route until you install the auth module (`npx @chatfuel/wizard --embed`), bind loopback (`HOST=127.0.0.1`), or set this. It is a signature, not a fix — keep whatever authenticates in front of the deployment in front of it — and it does not cover `ALLOWED_ORIGINS='*'` with no gate, which is refused either way. |
| `REST_MAX_CONCURRENT` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many `/chatfuel/api/*` uploads may be in flight at once. Each is held in memory while it is forwarded, so this is the ceiling on what uploads can cost the process; past it callers get `503 ProxyBusy` with `retry-after: 5`. |
| `GRAPHQL_MAX_CONCURRENT` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many `/chatfuel/graphql` requests may be in flight at once. Each holds an upstream connection until Chatfuel answers, so the body limit was never a limit on the process; past it callers get `503 ProxyBusy` with `retry-after: 5`. Higher than the upload ceiling because this is the route the whole app talks through. |
| `GRAPHQL_MAX_BATCH` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many operations one `/chatfuel/graphql` body may carry. A batch is one request to every ceiling here — one of the `GRAPHQL_MAX_CONCURRENT` slots, one token from the tenant's minute — and one POST upstream, while the work is proportional to the number of entries rather than to the bytes the body limit bounds. Past it the answer is `413 BatchTooLarge`, counted before any document in the body is read. The app itself sends no batches; the array form is accepted because the GraphQL spec has it. |
| `WS_MAX_SOCKETS` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many browser WebSockets one process will hold. Each one is a second socket opened upstream, and `new WebSocket()` costs the other side nothing; past the cap the upgrade is refused `503`. |
| `WS_PRE_AUTH_SOCKETS` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many of those sockets may sit unadmitted at once — open, but not yet past the `connection_init` the gate reads. A tenant ceiling cannot count a socket whose tenant is still unknown, so that window needs a budget of its own; the initialisation deadline bounds it in time as well. Past it the upgrade is refused `503`, leaving the sockets already admitted alone. |
| `TENANT_REQUESTS_PER_MINUTE` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many requests one **tenant** may send per minute, as a token bucket that also holds a minute's worth as burst; past it the answer is `429 TenantBusy` with `retry-after: 5`. The two ceilings above are the deployment's, and with the gate on the deployment serves many customers — this is what stops one of them spending the others' share. Per-tenant counting needs a tenant to count: it is a mechanism of the gated, multi-tenant deployment, and a deployment running in open mode wants its ceilings in front of it instead. A signed-in account with no bot yet shares a bucket with every other such account, at a fraction of these two ceilings: they are fenced but indistinguishable, and finishing a sign-up costs a handful of calls. |
| `TENANT_MAX_SOCKETS` | server | Optional; its default is in `content/vite-plugin-proxy/src/proxyConfig.ts`. How many browser WebSockets one tenant may hold at once, out of `WS_MAX_SOCKETS`; past it the socket is closed `4429`. |
| `CHATFUEL_RESOURCE_FENCE` | server | Optional, `bound` (default with the gate on), `strict`, or `off` (default without it). Whether a request naming a resource INSIDE a bot — a flow, a block, a contact — is checked against the bot that resource was handed out under. The proxy learns those bindings from its own traffic, so `bound` refuses only an id it knows to be another tenant's (`403 ResourceNotAllowed`) and forwards one it has never seen. `strict` refuses the unknown too, which is what the shared store below makes usable: without it the memory is one process's, and a client holding ids from before a restart is refused its own data. |
| `CHATFUEL_RESOURCE_STORE` | server | Optional, `on` (default with the gate on and a service-role key) or `off`. Whether the bindings above are shared through the deployment's own Supabase — one table, read when this process holds no answer and written lazily, only for the ids a caller actually names. It is what makes `bound` survive a restart and `strict` safe to run on more than one instance. The table is reachable with the service key alone, since a caller who could read it could ask the question the fence exists to refuse. If Supabase does not answer, the fence falls back to this process's memory for a few seconds rather than making the caller wait. |
| `CHATFUEL_OPERATION_ALLOWLIST` | server | Optional, `on` (default with the gate on) or `off` (default without it). Whether an operation this app does not send is refused before any other question about it is asked. The account schema is far wider than any one app; the shipped modules use 348 fields, and the list is generated from their own documents. A root field that is not on it answers `403 OperationNotAllowed` — the widest of the fences, and the one that closes the holes nobody has thought of yet. Without the gate the caller is the deployer, so it is off by default: refusing them a field of their own account's schema costs something and protects nobody. |
| `CHATFUEL_OPERATION_ALLOWLIST_EXTRA` | server | Optional, comma-separated. Root fields to allow beside the generated list. It widens the fence by NAME, and a name says nothing about what the document under it selects — an app that writes operations of its own should add them to `src/operationDocs.ts` (see below) and keep this for what that cannot cover. Either way, add rather than turning the allowlist off. |
| `CHATFUEL_OPERATION_ALLOWLIST_OFF` | server | Optional, `1` or unset. The second half of turning the allowlist off behind the auth gate. With the gate on every caller is a stranger, so `off` there hands the master token's full account schema to whoever asks. That is a deliberate choice, never an inherited one, so it asks to be said twice: `CHATFUEL_OPERATION_ALLOWLIST=off` alone is ignored, the startup line says it was ignored, and this variable is what makes it hold. Without the gate nothing is acknowledged — the caller is the deployer and `off` is already the default. |

### The documents this app ships

Not an env var: it travels in the code, because it is the code. `src/operationDocs.ts`
is a barrel of namespace imports over the generated GraphQL modules, and all three
hosts hand it to the proxy — `chatfuelProxy({ operations })` in `vite.config.ts`,
`proxy: { operations }` in `server/entry.ts`, `createChatfuelProxy({ operations }, env)`
in `api/chatfuel.ts`.

The proxy then forwards those documents and no others. A document is admitted by
its exact text, or failing that by `sha256(stripIgnoredCharacters(text))` so a
bundler that moved a newline is not a refusal; what goes upstream is the app's own
text and the app's own operation name, read off the document rather than off the
request. Anything else answers `403 OperationNotInRegistry`, on HTTP and on the
socket alike. This is the fence the name allowlist cannot be: `CurrentUser` and a
`CurrentUser` with `apiToken` added to it share a root field.

Add an operation of your own by exporting it from a namespace the barrel imports.
A host that passes no `operations` serves with the check off and says `operations:
NO REGISTRY` on its startup line — the migration path for an app scaffolded before
the barrel existed, which `chatfuel-update` fills in. `operations: []` means the
app ships nothing, and nothing is forwarded.

### The `auth` module

All three together turn the gate on. None of them is open mode. Some but not all is
`ProxyAuthMisconfigured` — the proxy refuses every request rather than guessing.

| Name | Side | What it is |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | both | Project URL. |
| `VITE_SUPABASE_ANON_KEY` | both | Publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Secret key. Not optional under `auth`: it registers each bot the server creates, and it mounts the password-recovery route. |
| `AUTH_RECOVERY_LINK_LOG` | server | Optional. `true` (or `1`) lets `/chatfuel/auth/recovery-link` write the reset link it mints to the server log, which is that route's only delivery channel. The link takes over the account it names, and a server log is read by more people than the owners and admins the route admits — so it is off by default, and the route answers `501 RecoveryLinkNotEnabled` rather than logging. Configuring SMTP in Supabase is the alternative that needs no log. The 501 is only for callers the route would have admitted — a request with no session gets 401 whichever way this is set. Turning it on does not widen who may be named: `cf_recovery_authorize` requires the target to rank below the caller **and** belong to no other workspace on this deployment, and records every issue in `cf_recovery_events`. |
| `CHATFUEL_WORKSPACE_ID` | server | The one workspace every customer's bot is created in — the one whose plan pays for them all, so its bot limit is the ceiling for the whole deployment. Unrelated to `VITE_CHATFUEL_WORKSPACE_ID`. |
| `SUPABASE_PROJECT_REF` | bookkeeping | The project's ref — the 20-letter id in its URL — written to `.env` when the wizard creates or links the project over an access token. Nothing in the app or the wizard reads it back; it is there so the id is on hand for the Supabase CLI or dashboard without going to look it up. |

**Two of them are read once, by the wizard, and never by the app.** `CHATFUEL_BOT_CAP` and
`CHATFUEL_BOT_TOTAL_CAP` are substituted into `0001_auth.sql` as it is applied — the per-workspace
ceiling and the whole-deployment one, `cf_bot_cap()` and `cf_bot_total_cap()`. Set them in the
environment of the wizard run that installs `auth`; afterwards they are SQL in your own database,
and re-running the two `create or replace` statements is what changes them. Their defaults, and
what they are for, are in [Deployment](deployment.md#what-auth-on-a-public-url-still-lets-a-stranger-do).

**The project's database password is not here, and not anywhere.** A project the
wizard creates gets a random one that goes straight to the Management API and is
never written down — not to `.env`, not to the terminal. Nothing needs it: the app
and the wizard both reach Supabase over the keys above and neither connects to
Postgres directly. If you want one — for `psql`, or for a migration you are running
by hand — reset it under Database settings in the Supabase dashboard.

### The `publishing` module

Needed only for posts that go out unattended. Without them the module still composes and
publishes on the spot; it just offers no schedule.

Turning scheduling on is an `/admin` action, so `ADMIN_PASSWORD` is needed too. It writes one
row that belongs to the whole deployment rather than to any workspace in it, and a workspace
role is the wrong credential for that: every sign-up is the owner of the workspace it opens.
The route is also mounted only where the gate is: scheduling needs the `auth` module and its
`SUPABASE_SERVICE_ROLE_KEY`, since the schedule lives in the same Supabase project.

| Name | Side | What it is |
| --- | --- | --- |
| `PUBLISHING_SECRET` | server | What the app and its database use to prove a request came from the other. The database stores only its `sha256`. |
| `PUBLIC_URL` | server | Where this deployment answers from outside, e.g. `https://posts.example.com`. **Required to turn scheduling on, and to issue a password-recovery link**: each names an address a credential is attached to — the one the database posts a secret to every minute, and the one a reset link sends the member to — and nothing in the request is allowed to decide it. Without this, both are refused rather than guessed. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | server | Set automatically on deployments whose production URL is protected, so the scheduling callback is not bounced at the edge. |
| `PUBLISHING_MEDIA_BUCKET` | server | Optional, default `cf-pub-media`. The Supabase Storage bucket the composer's uploads go into. The app and the migration must name the same one; the wizard fills both from this value. It is **public** — Instagram fetches the bytes itself and can present no credential — so a draft's media is readable by whoever has its address from the moment it is uploaded. |
| `PUBLISHING_MEDIA_QUOTA_MB` | server | Optional; its default is in `proxyConfig.ts`. How much of that bucket **one bot** may hold. The per-file ceiling says nothing about how many files there are: without this, an authenticated caller can fill the operator's storage a legal upload at a time. Past it an upload answers `507 MediaQuotaExceeded` and nothing is stored. |
| `PUBLISHING_MEDIA_TTL_DAYS` | server | Optional; its default is in `proxyConfig.ts`. How long a file **no post of that bot refers to any more** is kept. The composer uploads before it saves, so an abandoned compose leaves bytes nothing will ever name; old and unreferenced together are what make one safe to let go, and the next upload for that bot does the letting go. A file a post still names is kept however old it is. |

### The `admin` module

| Name | Side | What it is |
| --- | --- | --- |
| `ADMIN_PASSWORD` | server | The only thing that opens `/admin`, which reads and changes the whole account behind `CHATFUEL_TOKEN`. At least 16 characters or the panel refuses to run and says why — the wrong-password counter lives in one process's memory, and with the auth module in your database as well (`cf_admin_attempts`, shared by every instance); without a database there is nowhere to share it, so on a host that answers each request from a fresh instance the length of this value is the defence that survives. A session lasts two hours, and on such a host rotating this value is the only revocation that reaches every instance. Unset means the admin routes are not mounted at all. Changing it signs every open session out. |
| `ADMIN_COOKIE_SALT` | server | Optional. The salt the admin session cookie is signed under. Unset, it is derived from this deployment's own token and Supabase URL, which is stable across instances and different per deployment — set it explicitly when you want to invalidate every open admin session without changing `ADMIN_PASSWORD`, or when two deployments share a password and must not share cookies. |
| `TRUST_FORWARDED_FOR` | server | Optional, default off. `true` (or `1`) makes the server believe the `x-forwarded-*` headers: `x-forwarded-for` becomes the key the wrong-password counter throttles on, and `x-forwarded-proto` decides whether the admin cookie is `Secure`. Turn it on **only** behind an edge that sets those headers itself — Vercel, or a reverse proxy you run. The counter is only as trustworthy as the header it keys on, and a header nobody in front of you sets is written by the caller. Leave this off unless an edge you control overwrites it. Off, the counter keys on the socket address and the cookie is `Secure` everywhere but loopback. |

`/admin` is never in the navigation rail. The URL is the whole way in.

### Sub-path serving

| Name | Side | What it is |
| --- | --- | --- |
| `VITE_BASE_PATH` | client | Build-time base, e.g. `/app/`. |
| `BASE_PATH` | server | The same value at runtime. |

Both or neither, and not on Vercel — see
[the app's own README](../content/shell/README.md#serving-it-from-a-sub-path).

## Where the values go on a deployment

`npm run deploy` copies your `.env` into the Vercel project with `vercel env add --force`, for
production only. Not the whole file: it pushes the names on a fixed list
(`scripts/deploy/env.mjs`, `DEPLOY_ENV`) and only those that your `.env` actually fills in — a
name you added yourself, and a name that is there but commented out or empty, are both left
behind, and the deployment then runs without them. The file itself is never uploaded, so the
project environment is the only source there. `CHATFUEL_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISHING_SECRET`,
`ADMIN_PASSWORD` and `ADMIN_COOKIE_SALT` go up as sensitive — write-only, unreadable afterwards even by you; the rest
stay readable in the dashboard, because a workspace id nobody can look at is a debugging tax
for no security.

**Preview is left empty on purpose.** A preview build runs the code of whatever branch
triggered it, with the project's preview environment in `process.env`. Give preview the
production values and every branch — a pull request from outside your team included — executes
unreviewed code holding the master Chatfuel token, the production admin password and the
Supabase service-role key, which is the one credential that switches row-level security off
entirely. A build step can send them anywhere.

Vercel's deployment protection does not cover this. It decides who may open a preview URL, not
what the code inside the build may read, and the credentials are read at build time.

If you want working previews, give them their own values: a separate Chatfuel token, a separate
Supabase project and a separate admin password. Two ways to put them there — set them by hand
in the Vercel dashboard under Preview, or write a preview-only `.env` and run the deploy with
`DEPLOY_PREVIEW_ENV=1`, which adds preview to the targets the script pushes to. That flag pushes
whatever `.env` it is given, so pointing it at the production one is exactly the mistake it
exists to make deliberate. `--force` overwrites what is already there, either way.
