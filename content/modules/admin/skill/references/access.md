# Getting in

The panel's credential is a password, and that is a deliberate choice over the
two identities already in the app.

**Not a Chatfuel identity.** The deployment holds one master token for one
Chatfuel account. There is no second Chatfuel login to check, and asking the
operator to sign in to Chatfuel from inside their own app would only prove they
hold an account the token already speaks for.

**Not a Supabase role.** The auth module is opt-in. A deployment without it has
no accounts at all, and one with it belongs to its customers — the operator
frequently has no account in their own product, and giving themselves one would
put them in somebody's workspace.

So: `ADMIN_PASSWORD`, unprefixed, beside `CHATFUEL_TOKEN` in the server half of
the environment. Whoever can read that file already holds the token, so the
panel grants nothing the credential did not.

## The session

`POST /chatfuel/admin/session` with `{ password }`. The comparison is
`timingSafeEqual` over the SHA-256 of both sides — hashed first so the buffers
are always the same length, because a length check in front of a constant-time
compare gives away how long the real password is.

On success ONE cookie is set:

    cf_admin = v3.<issuedAtMs>.<expiresAtMs>.<hmacSHA256(key, payload)>

where `payload` is everything before the last dot. `issuedAtMs` is not
decoration: it is the field sign-out compares against, and a reimplementation
that drops it silently loses the ability to sign out at all.

`Path=/`, HttpOnly, SameSite=Strict, and Secure whenever the request arrived
over TLS.

The HMAC key is derived from the password by **scrypt**, salted per deployment
— it is not the password, and not an HMAC of it. What forces that is the
payload: it is entirely predictable, so anyone who has seen one cookie holds a
known plaintext and its MAC — a reverse proxy's log, a shared browser, a backup
— and can guess `ADMIN_PASSWORD` offline, with no request to this server and
nothing to throttle. The key must therefore be one a guess is expensive to
test, which is what scrypt is here for; the password itself as the key would
not be.

The salt is `ADMIN_COOKIE_SALT` when it is set, and otherwise a hash of the
deployment's own token and Supabase URL — see `adminCookieSalt` in
`proxyConfig.ts`. Per deployment and not fixed in the source, because one salt
shared by every deployment that runs this code is one table built once against a
published constant, and the expense scrypt was chosen for gets paid by the
attacker once rather than once per target.

The key is derived once per process and kept: a KDF per request is a denial of
service pointed at ourselves. Nothing is stored, so a serverless deployment that
answers each request from a fresh instance works unchanged — and rotating the
password invalidates every live session, because the key that signed them is
gone.

`Path=/` and not `/chatfuel`: a deployment mounted under a base path sends the
proxy `/app/chatfuel/…` from the browser and would never see the narrower one.

**Revocation is limited.** Signing out does revoke — every session the instance
that served it had issued, because `issuedAtMs` is in the payload and the
sign-out route remembers the instant everything older than it stopped counting.
But that watermark lives in one process's memory. On a host that answers each
request from a fresh instance, no other instance has heard of it, so a stolen
cookie is good there until it expires (two hours) or `ADMIN_PASSWORD` changes.
Rotating the password is the only revocation that holds everywhere. That is the
cost of a stateless session and it is stated rather than hidden.

## One cookie, and why not two

An earlier draft set a second, readable cookie so the nav rail could decide
whether to draw an Admin item. The panel is never in the rail — it is reached by
address and by nothing else — so that flag had no reader left, and a cookie
nobody reads is a cookie somebody will one day mistake for a credential.

## What the routes require

Every `/chatfuel/admin/*` call must carry the signed cookie **and** an
`x-cf-admin` header. With `SameSite=Strict` the cookie should never ride a
cross-site request; the header is the second lock on the same door, because a
form posted from another origin can send a cookie but cannot set a header.

## What the panel bypasses, on purpose

The admin routes do not call the proxy's admission sequence, do not consult the
auth gate and do not apply the workspace fence. Those exist to keep a request
away from bots that are not the caller's, and the panel's entire purpose is the
account-wide view they are built to withhold. This is the only place in the
proxy where a fence is skipped, and the route module says so at the top.

## Failing closed, and failing loudly

| Configuration | What happens |
|---|---|
| `ADMIN_PASSWORD` unset | The routes are not claimed. The host answers its own 404 and the module says there is no panel here. |
| Shorter than 16 characters | Every route answers `500 AdminMisconfigured`, and the module names the reason. |
| Set and long enough | The panel runs. |

The floor exists because the throttle is not the whole of the protection.
Where the auth module is installed, the wrong-answer count is kept in the
database — `cf_admin_attempts`, written by the service key on each wrong answer
and read before the next one is even looked at — so every instance shares one
count and a run spread across them is counted as one. Install it wherever the
panel runs on more than one instance; without a shared store the counter is
best-effort, and the password is what the design leans on. Pick one a password
manager generated, not one a person typed, and treat the floor as a floor rather
than a target. A flat pause on every attempt, right or wrong, sits in front of
the counter so a wrong answer costs the same as a right one from the outside.

The other way to make a guess expensive — deriving the cookie key on a wrong
password too, so both paths cost the same scrypt — is deliberately not taken.
It would turn an unauthenticated route into scrypt on demand, billed to
whoever owns the deployment.

Every admin route also caps the request body and answers `413 AdminBodyTooLarge`
past it — 64 KiB for the credentialed routes, but `POST <adminPath>/session`
gets its own, tighter 4 KiB ceiling (`ADMIN_SESSION_BODY_MAX_BYTES`), and that
route is the reason a cap exists at all: it is reached before any credential is
checked, so whatever it reads is read on an anonymous caller's say-so, and the
throttle only starts refusing after the first few attempts. Every body the
panel accepts is a handful of short fields, so either ceiling costs a real
caller nothing.
