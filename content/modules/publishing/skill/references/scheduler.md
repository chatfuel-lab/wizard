# Scheduling

## Why this exists at all

The Chatfuel API publishes immediately. No input takes a time, there is no draft
entity, and the only `scheduledPublishTime` in the schema belongs to
`FbPagePost` and is read-only. A content calendar is therefore not a view over
something the platform holds — it is a view over a queue the deployment holds,
and the queue has to be built.

That leaves one honest question: **what is going to run when the time comes?** A
browser is not an answer. A queue that only fires while somebody has a tab open
is a reminder, and calling it a schedule is a lie a customer discovers at
midnight.

So a queue has exactly two shapes, and which one a deployment has decides what
its composer may offer.

## Shape one: local, and honest about it

`setUserStorageItem` is the only persistence this API offers a client — an
arbitrary id holding an arbitrary string, scoped to the **signed-in user**. It
serves one person's drafts perfectly well and nothing else:

- a colleague opening the same bot sees their own drafts, not these;
- nothing reads it but a browser, so a time written into it is a note to self.

An app on this shape offers **save** and **publish now**, and no time control at
all. Not a disabled one with a sentence beside it — absent. The rewrite of a
whole JSON document on every change is fine at queue sizes and needs a cap, so
that a long-running account does not grow a value nobody can save; drop the
oldest already-published entries first, since those are on Instagram anyway.

## Shape two: a database, with something running beside it

The durable shape is a table on the deployment's own Postgres, a job that wakes
up on a timer, and a route that does the publishing. The browser never touches
the database: it calls routes the app's own server serves, that server checks
the caller's session with the gate everything else goes through, and only then
reads or writes.

```
browser ── session bearer ──▶ server routes ── service key ──▶ table
                                     ▲                            │
                                     └──── shared secret ─────  timer job
```

Nine things that this arrangement gets right and a simpler one does not:

1. **Claim before publishing.** Select due rows `for update skip locked`, mark
   them, and only then fire. Two ticks that overlap must not publish the same
   post twice, and a publish here can run for five minutes, so they will
   overlap.
2. **Reap stale claims.** A serverless function killed mid-publish leaves a row
   marked in-flight forever. A second job puts a claim older than about ten
   minutes back, or fails it past a small attempt cap. Without this a single
   killed function is a post that never goes out and never says why.
3. **The response is not the result.** An asynchronous HTTP call from inside
   Postgres records its response separately and can be given up on long before a
   five-minute publish finishes. So the route writes the outcome back itself.
   Design for the request being lost and the work completing.
4. **The callback is authenticated by a secret, not by a session.** There is no
   signed-in user on a timer. One shared secret, stored hashed, compared in
   constant time — and stored as base64 rather than hex, because a scrubber that
   masks 64-hex strings in logs would make it invisible in exactly the logs
   somebody would need.
5. **A protected deployment blocks its own timer.** A host that puts
   authentication in front of every URL blocks an unauthenticated call from a
   database as readily as one from a stranger. Whatever bypass the host offers
   has to be recorded alongside the URL when the deployment registers itself,
   and sent on every callback.
6. **The address is configuration, not something a request says.** Registering
   records where a credential will be posted every minute from then on — the
   callback key, and the bypass above. Deriving that address from the request
   that registered means whoever makes the request chooses it. So the address is
   `PUBLIC_URL` and nothing else: a body field for it is refused,
   `x-forwarded-host` is never read, and `host` is not read either. A platform
   routes by `host` and will usually not deliver a request for a name it does
   not serve, but that is the platform's property rather than this code's, and a
   server run directly answers to whatever name it is handed. A deployment that
   has not said which name it answers to cannot register, and is told so.
7. **The address has to be one the secret survives.** It is registered as
   `https://` and refused otherwise, because the secret rides it in a header
   once a minute for as long as the deployment lives, and over plain http that
   is the credential in the clear on every tick. The one exception is a server
   on this machine (`localhost`, `127.0.0.1`), where there is no wire to read it
   off.
8. **The secret says what happened; it does not say what exists.** The callback
   authenticates a report about a post the scheduler sent out — `attempts` is
   raised by `cf_pub_claim_due` alone and survives the reaper, so a post that
   was never queued cannot be reported published, whatever id the caller names.
   The permalink it stores is handed straight back to a browser as the link to
   the live post, so it is required to be an `https` URL rather than any text at
   all. And the report names the bot the post belongs to, because the secret is
   one value for the whole deployment: without that, the pair of a leaked secret
   and a guessed id writes an outcome onto any post of any bot in the project,
   and with it the reach is the posts of a bot the caller already knew. That is
   what keeps the one `anon`-granted function in this deployment narrow: a
   leaked secret misreports outcomes of one bot, and does not write posts.
9. **Who may register is a question about the deployment, not about a
   workspace.** There is one config row for the whole deployment, so the
   credential is one credential and pointing it somewhere else points it for
   everybody. `role = 'owner'` looks like the right check and guards nothing:
   `cf_claim_workspace` makes every sign-up the owner of the workspace it opens
   for them, so that set is "anybody who registered an account" — and in a
   deployment serving an agency's clients it was the clients from the start. The
   check is `ADMIN_PASSWORD`, the same credential the panel takes: a row that
   belongs to the deployment is written by whoever runs the deployment.

Where the URL comes from is worth stating: it is not known when the app is
scaffolded, because the app has not been deployed yet. It is known once the
deployment has a name, and that is when it goes into `PUBLIC_URL` — after which
an admin opens `/admin`, and the route writes the configured address, the
bypass, and the hash of the shared secret into the config row.

Which is to say that this shape is not publishing's alone. The table and the
functions come with this module, but `ADMIN_PASSWORD` and the page that
registers the deployment are the `admin` module's, and the database under it is
the `auth` module's. An app with publishing and neither of those two composes
and publishes on the spot and has nowhere to put a queue; one with `auth` and no
`admin` has the queue and no way to point the timer at itself. Both are
recommended in the manifest for that reason — the wizard offers them and the
user may decline, and declining is what shape one is for.

## The tables

`cf_pub_posts` holds one row per post: the bot, the kind, the caption, the media
as JSON, the time, the status (`draft | scheduled | publishing | published |
failed`), the claim, the attempts, and — once it exists — Instagram's own id and
permalink. `cf_pub_config` holds one row: where to call back, how to get past the
host's protection, and the hash of the shared secret.

Both follow the same rules as the rest of this project's SQL, and those rules
are not stylistic:

- row-level security on with **no policies**, grants revoked, and `security
  definer` functions as the entire read and write surface. A table PostgREST can
  reach directly is a table a browser can reach directly.
- every function `set search_path = ''`, `execute` revoked from `public`, `anon`
  and `authenticated` and granted back deliberately. New public functions are
  granted to `anon` by default — skipping the revoke is how a private function
  becomes a public one.
- errors raised as `PT4xx` with the machine code in `HINT`, so a client switches
  on a code rather than on a sentence.
- idempotent, so the migration can be re-run over a project that already has it.

## What a schedule still cannot promise

- A timer that skips a tick does not catch up on its own; that is what the reaper
  is for.
- Instagram's own publishing rate limit is not visible from here, so a schedule
  that fires into a throttled account fails at the platform and the failure is
  reported rather than predicted.
- The media URL has to still resolve when the post fires, which may be hours
  later. A link somebody pasted is theirs to keep alive; a bucket the deployment
  controls is the one that will still be there.
