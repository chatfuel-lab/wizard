# Supabase — the database side of this app

These files are yours. They were copied here by the Chatfuel wizard, and if you used the
access-token path the wizard has already run them against your project.

| File | What it is |
|---|---|
| `migrations/0001_chatfuel_auth.sql` | The schema: `cf_profiles`, `cf_tenants`, `cf_members`, `cf_bots`, `cf_bot_members`, `cf_invites`, `cf_recovery_events`, `cf_resource_owner`, `cf_admin_attempts`, `cf_migrations` and every `cf_*` RPC — including the two ceilings on how many bots may be created, one for the whole deployment and one per workspace. Idempotent — running it twice changes nothing. |
| `migrations/0010_chatfuel_publishing.sql` | Only if you installed the Instagram module: the publish queue — `cf_pub_posts`, `cf_pub_config`, their `cf_pub_*` RPCs, a media bucket and two jobs. See below. |
| `migrations/0020_chatfuel_admin.sql` | Only if you installed the admin module: the `cf_admin_*` functions the admin panel calls. It creates no tables — it reads and writes the ones 0001 already made — and it is granted to `service_role` and to nobody else, because the panel has no Supabase session of its own. |

Apply them in **name order**: everything above 0001 reads what 0001 makes, and applying one of them to a project without it fails. There is
nothing to seed. A workspace is created when somebody signs up, and the app's
server fills in the Chatfuel bot it just made for them.

## Running it by hand

1. Open the SQL editor: `https://supabase.com/dashboard/project/<ref>/sql`
   (`<ref>` is the 20-letter id in your project URL, also in `.env` as `SUPABASE_PROJECT_REF`).
2. Paste each file in `migrations/`, in name order, and run it.

Re-run them whenever you like: they are `create … if not exists` / `create or replace`
throughout, so a second run does nothing. Your own schema changes go in a **new** file
(`migrations/0002_….sql`) — never edit one of these, or the next wizard run will write
over them.

## Three settings the app needs

In the Supabase dashboard (the wizard sets the first two on the access-token path):

- **Authentication → Providers → Email**: turn **OFF** "Confirm email". There is no SMTP on a
  fresh project, so a confirmation mail would never arrive and nobody could sign in. It is
  also what makes sign-up work at all on the free plan: with confirmation on, the default
  provider rejects undeliverable addresses and caps the rest at two emails per hour.

  **This is a development default, and it has a price.** With confirmation off nobody proves
  they own the address they signed up with — anyone can register under anyone else's — and
  every flow underneath is addressed by email: invites, password resets, who a Team row is.
  Before real users touch it, configure SMTP (Project Settings → Auth → SMTP) and put
  *Confirm email* back **on**. See `skill/references/security.md`.
- **Authentication → URL configuration**: the redirect allowlist must contain
  `http://localhost:5173/**` and your deployed origin (`https://app.example.com/**`).
- **`SUPABASE_SERVICE_ROLE_KEY` in the app's `.env`** (Project Settings → API Keys → secret).
  Server-side only. `cf_bot_created` is granted to `service_role` and to nobody else, so
  without this key the server cannot register the bot it just created and sign-up ends on
  "your workspace is not ready".
- **`CHATFUEL_WORKSPACE_ID` in the app's `.env`** — not Supabase's side, but the same sign-up
  step: the Chatfuel workspace the new bots are created in, and therefore the plan they draw
  on. The wizard asks for it; without it the server refuses to create bots at all.

Password-reset emails need your own SMTP (**Authentication → SMTP**). Until you configure it,
admins can issue reset links from the row menu on the Team page — those work in any browser —
but only once `AUTH_RECOVERY_LINK_LOG` is set on the server; it is off by default, and a stock
install answers 501 there instead. The emailed link on a free project does not: custom email
templates are a paid feature, so the mail Supabase sends carries a PKCE code that only opens in
the browser that asked for the reset.

## Who gets what

Anyone who can open the app can create an account, and that account gets a bot
of its own — and can create more. That is the point — it is a SaaS sign-up.
Three consequences worth knowing before you share the URL:

- **Every sign-up creates a Chatfuel bot in YOUR account**, with your master token, and so
  does every extra bot an account adds later. They all come out of one workspace's plan.
  `cf_bot_total_cap()` and `cf_bot_cap()` bound the total and the per-workspace count;
  set `CHATFUEL_BOT_TOTAL_CAP` / `CHATFUEL_BOT_CAP` before a run, or re-run the two
  one-line functions with your own numbers. Keep both under `CHATFUEL_WORKSPACE_ID`'s own
  bot limit.
- **Only owners and admins may create, rename or delete bots.** A member uses the ones they
  were granted.
- **An invited colleague gets no workspace.** They join the inviter's, with the role the
  invite names; which bots they may open is granted to them, on the Team page or by the
  invite itself. An admin needs no grant — they administer the workspace and reach all of it.

To restrict who may sign up, add a `migrations/0002_….sql` with a check inside
`cf_claim_workspace` — the `chatfuel-auth` skill's customize playbook has a worked example.

If somebody's account is deleted in **Authentication → Users**, their membership goes with
it. Their workspace stays (so the colleagues they invited keep working) and an admin inside
it can take ownership with `cf_claim_ownership`. The Chatfuel bot is never deleted from here.

## Scheduled Instagram posts

Only if you installed the Instagram module, and only worth reading if you want posts
to go out while nobody has the app open.

Chatfuel publishes to Instagram immediately: there is no scheduled publish in its
API and no draft to keep. So the queue is this project's own —
`migrations/0010_chatfuel_publishing.sql` creates `cf_pub_posts`, and two `pg_cron`
jobs beside it run every minute:

- `cf-pub-claim-due` takes what is due, marks it, and asks the app to publish it
  (over `pg_net`, at the address in `cf_pub_config`).
- `cf-pub-reap` rescues a post whose publish never reported back — putting it in the
  queue again if nothing had started, and failing it if something had.

Two things have to be true before anything goes out:

1. **`PUBLISHING_SECRET` is in the app's `.env`** (the wizard puts it there).
   The database is given only its sha256, by the migration; that hash is what the
   job presents when it calls back, and the secret is what the app presents when it
   writes the outcome down. Change one and you must re-run the migration.
2. **Somebody has turned scheduling on from the deployed app**, as an owner or an
   admin. That is what records where this deployment answers — `cf_pub_config` starts
   empty on purpose, because an address is only trustworthy if it came from a
   request that really arrived. Until then the app composes and publishes on the
   spot and offers no schedule at all.

Uploaded pictures and videos go in a **public storage bucket** on this project
(`cf-pub-media`), not in the platform's own file storage, which deletes what you
upload shortly after — long before tomorrow morning. Public because Instagram fetches
the bytes from its own servers and can present no credential; writes are the
service role's alone, so everything that gets in went through the app.

**Public means public, drafts included.** A file is readable by anyone who has its
address, from the moment it is uploaded — before the post is scheduled, and whether or
not it is ever published. The address is unguessable (a random uuid under the bot's
own prefix) and it is not secret: whoever it is sent to keeps it. Deleting the post
does not delete the file. Nothing that must not travel belongs in a draft.

Two things bound what the bucket can grow to. One bot may keep
`PUBLISHING_MEDIA_QUOTA_MB` megabytes (512 by default) — past that an upload is
refused with a 507 rather than stored. And a file older than
`PUBLISHING_MEDIA_TTL_DAYS` days (30 by default) that **no post of that bot refers to
any more** is let go on the next upload: an abandoned compose is the case that leaves
those behind. A file a post still names is kept however old it is.

`pg_cron` and `pg_net` are enabled on every Supabase project, the free plan
included. On a project without them the migration still applies and the queue still
stores posts — it just never fires, and the app says so by offering no schedule.

## Keys

`.env` holds the project URL, the anon/publishable key (public by design, it ships in the
browser bundle) and the secret/service_role key, which is **server-side only**: it bypasses
every check. Never commit `.env`, never paste the secret key into the app code, never print
it in logs.
