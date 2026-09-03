# Troubleshooting

## The wizard

**`npx @chatfuel/wizard` prints a Node version message and stops.** The floor is Node 22.19.0.
The launcher is deliberately old-style JavaScript so that it parses on a version too old to run
the rest, and can say so instead of throwing a syntax error.

**It refuses to write into the directory.** Scaffolding into a non-empty directory is refused
outright. Use `--dir <path>`, or `--embed` to add the modules to a project that already exists.

**`--yes` finished and there is no app.** Most prompts have a non-interactive answer; a missing
or rejected `CHATFUEL_TOKEN` is not one of them. Export the token, or pass the flag the question
wanted. `npx @chatfuel/wizard doctor` reports what the wizard can see before it asks anything.
One thing `--yes` will not do on its own: replace a skill directory the app's lock does not
record as the wizard's — it leaves it alone and says so.

**The run stopped saying nothing is attached to the terminal.** A run without `--yes` has
questions, and a pipe, a redirect from `/dev/null` or a CI job cannot answer them. The wizard
says so before it spends anything, rather than exiting `0` in the middle of the first prompt.

**`--yes` did not deploy and did not push to GitHub.** By design, both are interactive-only. A
deployment is a public URL with somebody's Chatfuel token behind it.

**The trial step went to a plain checkout.** A trial belongs to the Chatfuel account, not to a
workspace, so the second workspace of the same account has already used it. The checkout that
follows is the same offer minus the trial days.

**Ctrl+C during a run.** It stops the run and undoes what was half-written: a target directory
the wizard created for this run is removed, so the same command can be run again. A directory
that was already there is never deleted — what was written into it is named instead, and nothing
in it is touched. Same for `--embed`: the `src/chatfuel/` root this run created goes, the host's
own files stay. The exit code is 130, as it is for any process a shell interrupts.

**A step failed behind a corporate proxy.** `HTTPS_PROXY` is honoured for every outbound call,
including WebSockets. What must be reachable: `panel.chatfuel.com` always,
`registry.npmjs.org` to install anything, `api.vercel.com` to deploy, `api.github.com` to push.

## The app

**A reload of `/deals/board` is a 404 while clicking to the same page works.** The host is not
answering unknown paths with `index.html`. See [deployment](deployment.md#the-one-rule-every-host-must-obey).

**The server logs `REFUSING TO SERVE` and never binds** — or, on Vercel, everything answers
`503 ProxyRefusedToServe`. There is no auth gate and the host is not loopback, so the master
token would answer whoever finds the URL. Install the auth module (`npx @chatfuel/wizard
--embed`), bind loopback (`HOST=127.0.0.1`), or set `CHATFUEL_OPEN_PROXY=1` if answering
strangers under one token is what this deployment is for. The second refusal, `ALLOWED_ORIGINS`
set to `*` with no gate, has no acknowledgement — name the origins that serve your app.

**Every request answers `ProxyAuthMisconfigured`.** Some of the Supabase variables are set and
some are not. The gate fails closed rather than guessing which half you meant. The startup log
names the mode; the health route answers `{"ok":true}` and is only good for liveness. It is
`/chatfuel/healthz` on every host. A bare `/healthz` on Vercel matches the SPA fallback in
`vercel.json` and answers `200` with `index.html`, so HTML back means the wrong path, not a
dead server.

**The sign-in screen renders but every request is `AuthSessionRequired`** — or nobody is ever
asked to sign in while the server rejects everything. The client was built with a different
environment than the server is running with. `VITE_*` is compiled in at build time; everything
else is read at runtime. Rebuild with the same values.

**`403 BotNotAllowed` / `403 AccountScopeBlocked`.** The auth gate working as intended: a
request named a bot this session may not open, or asked an account-wide question that would
list every tenant.

**A removed member could still act for half a minute.** Gate answers are cached 30 s per token,
and a WebSocket keeps working until it drops. That window is deliberate — the alternative is an
RPC on every proxied call.

**Subscriptions drop every few minutes on Vercel.** A serverless function has a duration limit
(300 s on Hobby) and the socket closes with it. The client reconnects and refetches; nothing is
lost. On your own server the socket is unbounded.

**The app is served from `/app/` and every script 404s.** `VITE_BASE_PATH` (build) and
`BASE_PATH` (runtime) must carry the same value, and Vercel does not support sub-paths at all.

**`/admin` says there is no panel here.** `ADMIN_PASSWORD` is unset, so the routes are not
mounted. It must also be at least 16 characters, and it is never in the navigation rail — the
URL is the whole way in.

## Limits that are not bugs

- **A contact created seconds ago may not appear in a filtered list.** A filtered list and a
  contact with no conversation yet do not always agree. The list says where its answer came
  from.
- **Deals segments cannot be narrowed by stage.** The segment API has no sales-stage predicate,
  so an export covers the segment, not the column.
- **Publishing schedules need a database.** The Chatfuel API publishes immediately and has no
  scheduled publish of its own. Without the deployment's own database the module still composes
  and publishes on the spot; the queue and the calendar are what it cannot offer.
- **The media library only knows what this app published.** It cannot place a post on a
  calendar unless the app itself recorded when it went out.
- **`507 MediaQuotaExceeded` on an upload** means this bot is already holding
  `PUBLISHING_MEDIA_QUOTA_MB` megabytes (512 by default). Delete media the composer no longer
  needs, or raise the value. Files older than `PUBLISHING_MEDIA_TTL_DAYS` that no post refers
  to are let go automatically on the next upload; ones a post still names are not.
- **Re-granting the Meta conversions permission has to be done in Chatfuel.** It is an
  interactive consent; an app on the public API cannot give it on someone's behalf, so the UI
  links out.

## Reporting something else

Open an issue with the output of `npx @chatfuel/wizard doctor`. Redact anything token-shaped
first — the templates say so too, and a token that reaches an issue is a token to rotate.
