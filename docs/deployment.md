# Deployment

The app that the wizard writes ships its own deployment guide at
[`content/shell/README.md`](../content/shell/README.md) — commands, flags, and the reasoning behind
each Vercel specific. This page is the part above it: which host to pick, and the rules that
hold whichever you pick.

## Picking a host

| | Vercel | Your own server | Docker |
| --- | --- | --- | --- |
| Command | `npm run deploy` | `npm run build && npm start` | `docker build` + `docker run` |
| Needs an account | Vercel | none | none |
| TLS, domain | managed | yours | yours |
| Sub-path (`/app/`) | no, root only | yes | yes |
| WebSocket lifetime | capped by the function duration (300 s on Hobby); the client reconnects | unbounded | unbounded |
| Where the env lives | the Vercel project (`.env` is never uploaded) | your process | `--env-file` and build args |

All three run the same proxy source, so the auth gate, the bot fence and the error codes are
identical between them. Nothing about the app is Vercel-specific except `vercel.json` and
`api/chatfuel.ts`; deleting both leaves a working Node app.

## Who is allowed to reach it

**Without the `auth` module the deployment has no sign-in and no callers of its own: the
proxy admits every request that arrives.** That is the intended shape for a tool you run for
your own team — there is one Chatfuel account behind it, and the app is the interface to it —
but it means the URL *is* the credential. Anyone who can reach it acts as the deployment's own
Chatfuel account, within whatever bot fence the deployment was given: reading conversations
and contacts, sending messages as the bot, changing flows and automations. The Chatfuel token
never leaves the server, so it cannot be stolen from the page — but every request the token
can make, an anonymous visitor can make through the proxy.

So an open deployment must not be reachable from the public internet. Put it behind something
that decides who gets through:

- a VPN, a Tailscale/WireGuard network, or an office IP allowlist;
- your host's own access control — Vercel's password protection or deployment protection,
  nginx `auth_basic`, an identity-aware proxy (Cloudflare Access, IAP);
- `localhost` only, which is what `npm run dev` gives you.

If the app is meant to be reached from the open internet — by your customers, or by staff who
sign in with their own identities — it needs the `auth` module. That is what makes callers a
concept at all: each one signs in against your Supabase project, and the proxy resolves the
bots that caller may open before it forwards anything ([the auth gate in the app's own
README](../content/shell/README.md#the-auth-gate)). Adding it later is `npx @chatfuel/wizard
--embed`; it is not a setting to flip in production.

The mode is not a guess: the server prints it on startup. A health route answers `{"ok":true}`
and the status code (`200`, or `503` when the configuration has a problem) — and nothing about
the mode, because it is open to anyone who can reach the deployment. The startup log is where
the mode is named, and an auth mode of `off` on a public hostname is the thing to fix.

That route is `/chatfuel/healthz`, and it is the same path on all three hosts — the bundled
Node server, the Vite dev server and the Vercel function. It sits inside the proxy's prefix
rather than at the root because on Vercel `vercel.json` rewrites only `/chatfuel/*` to the
function and sends everything else to `index.html`: a bare `/healthz` there is not a health
check at all, it is the SPA answering `200` with HTML. If you get a page instead of JSON, you
asked the wrong path.

**And the server refuses two of them outright.** Both are the same fact — the master token
answering whoever asks — and a startup warning is the wrong instrument for it: the boot line is
read once, by the person who already knows, and never again by the deployment that outlived
them. So `npm start` fails to bind, and the Vercel function answers `503 ProxyRefusedToServe`
to everything but the health route:

- **Open mode on a host that is not loopback.** No gate, and a socket somebody other than you
  can reach: every caller drives Chatfuel under the master token, so no identity is asked for,
  none is checked, and none is in the log either. Three ways out: install the auth module
  (`npx @chatfuel/wizard --embed`), bind loopback (`HOST=127.0.0.1`), or — if answering
  strangers under one token is what this deployment is for, because something in front of it
  authenticates — say so with `CHATFUEL_OPEN_PROXY=1`. That last one is not a fix, it is a
  signature; the deployment then prints one line saying it was meant.
- **`ALLOWED_ORIGINS=*` with no gate.** The proxy answers any origin *with credentials*, so any
  page a visitor opens may script it out of their browser under that same token. There is no
  acknowledgement for this one — `CHATFUEL_OPEN_PROXY` does not cover it — because naming the
  origins that actually serve your app costs one variable.

**And it says the rest unprompted.** Beside the listening line, `npm start` writes a warning to
stderr for each remaining shape below — a shape is not a defect, and none of these refuses
anything, but each is invisible from inside a running deployment and the boot is the one moment
somebody is reading:

- **Sign-ups open on the Supabase project**, and separately **sign-ups open with email
  confirmation off** — the two facts the section below is about. The server asks the project
  for these at startup (`/auth/v1/settings`, the unauthenticated document the browser SDK reads
  anyway), does not wait for the answer, and stays quiet if it does not get one.

## What `auth` on a public URL still lets a stranger do

Turning `auth` on makes callers a concept; it does not decide who may become one. A fresh
Supabase project accepts sign-ups from anyone who reaches the page, and each new account gets
a workspace of its own.

**And the email address is not verified.** A project the wizard creates has no SMTP, and a
confirmation mail nobody receives is a sign-up that never finishes — so unless the run was told
otherwise the wizard sets `mailer_autoconfirm`, and an account works the moment the form is
submitted. `--signup confirm-email` and `--signup closed` are how a run says otherwise. Nothing proves the
address exists, let alone that the person typing it owns it: `someone@your-company.com` is
available to anyone. The fix is a real mail sender. Configure SMTP in the Supabase dashboard
(**Authentication → Emails → SMTP Settings**), then turn confirmation back on
(**Authentication → Sign In / Providers → Email → Confirm email**, which is
`mailer_autoconfirm` off), and a new account has to open a link sent to the address it claimed.

That workspace can create bots — and every bot it creates is created in Chatfuel by the
*deployment's* token, on the deployment's plan, at the operator's expense.

Two ceilings bound that bill, both of them ordinary SQL functions
([`0001_auth.sql`](../content/modules/auth/supabase/migrations/0001_auth.sql)):
`cf_bot_cap()` — 20 bots per workspace, the one a person meets — and `cf_bot_total_cap()` —
200 bots across the whole deployment, the one that actually bounds the bill, because a
per-workspace ceiling says nothing about how many workspaces there are. Re-run the
`create or replace` with a different number and the new ceiling is live. Raising them past
what your Chatfuel plan holds only moves the refusal to Chatfuel.

So before a deployment with `auth` is reachable from the open internet, decide who may sign
up. In the Supabase dashboard, under **Authentication → Sign In / Providers → Email**, the
**Allow new users to sign up** toggle is the switch:

- **off** — the app's sign-up form stops working, because it calls `supabase.auth.signUp()`
  like any other. Accounts then come from you, in **Authentication → Users**, and the app's
  invite link becomes what it joins an existing account to a workspace with, not what creates
  one. This is the setting for a deployment whose users you know by name.
- **on** — anyone who reaches the page gets an account and a workspace. Lower the two caps to
  what you are willing to pay for, and read the total cap as your bill's ceiling.

**The toggle survives a later wizard run**, which is the reason it is worth using. The wizard
asserts email sign-in only on a Supabase project it created itself, in the run that created it,
and `--signup` is what it asserts there: `open` — the default, sign-ups on and addresses taken
on trust — or `confirm-email`, or `closed`. Choosing at that moment is cheaper than the
dashboard afterwards, and it is the same two settings either way. On a project you brought (`--supabase-project`, the
picker, or a `--supabase-create` name that already existed) it merges the app origin into the
redirect allow list, and fills in the Site URL only while that is still empty or Supabase's own
default — a value you have set yourself is left alone, as is everything else: a closed sign-up
stays closed, a turned-on email confirmation stays on, and the local dev origin is not added to
a project you use in production. So re-running the wizard next month to add a module does not quietly reopen the
door you shut.

The caps hold either way, and no wizard run has ever touched them: they are SQL in your own
database, and the only thing that changes them is you re-running the `create or replace`.

Leaving both alone is a choice too, and it is the one that ends with 200 bots on your plan.

## The admin panel's door, on a host with more than one instance

**Protecting `/admin` is yours to do, and nothing in this template does it for you.** The panel
is one password in front of the whole Chatfuel account behind `CHATFUEL_TOKEN` — there is no
second factor, no IP allowlist, no lockout that outlives a process, and no owner to appeal to
if it is guessed. Everything below is the material you have to work with; choosing to run the
panel on a public host is a decision, and it is yours.

`ADMIN_PASSWORD` opens that panel, so the door has a wrong-answer counter in front of it. Where
the `auth` module is installed, that count is kept in your database (`cf_admin_attempts`), so
every instance of the proxy shares one count and a run of guesses spread across them is counted
as one.

Install `auth` if you run the panel anywhere with more than one instance — Vercel, or any host
that answers a request from whichever instance happens to be warm. Without it the counter is
best-effort, and **the password itself is what the door rests on**: sixteen characters is the
floor the proxy refuses to start below, and the floor is not the recommendation. Use what a
password manager generates, not what a person types.

Installing `auth` is not enough on its own: the shared counter is written with
`SUPABASE_SERVICE_ROLE_KEY`, which the proxy treats as optional. With the module on and that key
unset there is still nowhere to keep a shared count, so a stateless host is back to a
best-effort counter in one process's memory. If you run the panel on such a host, set the key.
If you cannot, keep the panel off it — leave `ADMIN_PASSWORD` unset there and run the panel
somewhere you control, or put your own authentication in front of it.

Two other things about that door are worth knowing before it matters. A session expires on its
own, and signing out revokes the cookie on the instance that served it. **Rotating
`ADMIN_PASSWORD` is the revocation that holds everywhere**, and it is what to do the moment a
cookie or the password may have gone astray — not signing out, and not waiting.

There is a second lever if the password itself is fine and only the sessions are not: the cookie
is signed under a salt, and setting `ADMIN_COOKIE_SALT` to a new value invalidates every open
admin session without changing the password. Unset, that salt is derived from this deployment's
own token and Supabase URL — stable across instances, different per deployment — so setting it
explicitly is also what to do when two deployments share a password and must not share cookies.

## The one rule every host must obey

**An unknown path must answer with `index.html`.** The router is path-based, so
`/deals/board` is a real address, and a host that 404s it will look like a routing bug while
clicking to the same page works fine.

- Vercel — the last rewrite in `vercel.json`.
- nginx — `try_files $uri /index.html;`
- Static hosts — their SPA-fallback or "rewrite everything to index.html" setting.
- The bundled Node server does it already.

## The rule that catches everyone once

`VITE_*` variables are compiled into the browser bundle **at build time**. Everything else is
read by the server **at runtime**. A deployment where those two disagree does not fail at the
mismatch; it fails later, at the gate:

- client built with Supabase, server started without → the sign-in screen renders and every
  request comes back `ProxyAuthMisconfigured` or `AuthSessionRequired`;
- server gated, client built without → nobody is ever asked to sign in, and the server rejects
  everything.

The server prints its mode on startup, and that startup line is where the mode is named. The
health route — `/chatfuel/healthz`, the same on every host — answers
`{"ok":true}` and nothing else: it is open to anyone who can reach the deployment, and an
unauthenticated caller has no business learning whether the gate is off or misconfigured before
trying a single request. Read the startup log for the mode, and the health route for liveness.

## Deploying without the wizard

`npm run deploy` is a convenience, not a dependency: it is `scripts/deploy-vercel.mjs` inside
your own project, driving the Vercel CLI. Any pipeline that builds the client, builds the
server and sets the environment produces the same result — and any CI that can run
`npm run build` can deploy this app.
