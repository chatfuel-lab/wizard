# The proxy gate

The one call that decides whether a request reaches Chatfuel, and how to reproduce it in a stack
that is neither the Vite plugin nor the bundled prod server. Model and rationale:
`references/guide.md`; threat notes: `references/security.md`.

## The call

```
POST {VITE_SUPABASE_URL}/rest/v1/rpc/cf_my_bot_ids
apikey:        {VITE_SUPABASE_ANON_KEY}
Authorization: Bearer {the browser's Supabase access token}
Content-Type:  application/json

{}
```

Response body is a JSON array of bot ids: every bot this session may open, across every workspace
it belongs to — for an owner or admin every bot of the workspace, for a member the ones granted to
them.

It answers one question: **which bots may this session touch?** Behind the proxy there is a single
Chatfuel account holding every customer's bot, so that array is the isolation boundary. An empty
array is a valid answer: the account has no workspace yet (which is what
`/chatfuel/auth/provision` is for), its first bot is still being created, or it is a member nobody
has granted a bot to.

**The set changes while a session lives**, so a host that caches it must be able to drop the entry:
creating, deleting or being granted a bot all move it, and the routes below call `forget(jwt)` on
the caller's cache for exactly that reason. A colleague granted a bot elsewhere waits out the TTL.

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_my_bot_ids" \
  -H "apikey: $ANON" -H "Authorization: Bearer $USER_JWT" \
  -H 'Content-Type: application/json' -d '{}'
```

`cf_gate_for_bot(p_bot_id)` answers the same question for one bot (`"owner" | "admin" | "member"` or
`null`) and exists for hosts that would rather ask per request than cache a set.

PostgREST verifies the JWT signature against the project's secret, so **the proxy needs no JWT
secret and does no crypto**. It reads `exp` out of the payload only to avoid a pointless round-trip
and to bound its cache.

## The mapping

| Outcome | Status | Envelope code | Cached? |
|---|---|---|---|
| every bot named in the request is in the set | — forward the request | — | the set, 30 s |
| the request names a bot outside the set | 403 | `BotNotAllowed` | — |
| the set is empty (signed in, no workspace) **and the request names a bot** | 403 | `AuthTenantForbidden` | — |
| the query reaches for the Chatfuel account | 403 | `AccountScopeBlocked` | — |
| no bearer, or `exp` in the past | 401 | `AuthSessionRequired` | not even a request is made |
| PostgREST answers 401 | 401 | `AuthSessionRequired` | no |
| anything else (5xx, network, timeout) | 503 | `ProxyAuthUnavailable` | no |

An empty set on its own is not a refusal. The whole bot fence is only entered by a request that
names a bot (or a fenced resource); one that names neither is decided by the account-scope and
operation checks like any other. Over a WebSocket it is different — see below.

Where the bot id is read from: `variables.botID` (the convention every operation in this repo
follows) **and** the root `bot(id: $x)` field, whose argument is `id` — a crafted request could name
that variable anything, so the query text is read for it. A request that names no bot at all is
weighed by the resource fence instead: most operations address a flow, a contact or a conversation
by id, and the proxy refuses an id it has watched being handed out to another tenant
(`403 ResourceNotAllowed`). An id it has never seen is forwarded unless the fence is `strict`
(`references/security.md`).

`AccountScopeBlocked` is the other half. `currentUser` is the DEPLOYER's account: `botsV2`, `email`,
`name` and the rest describe it, and the bot list is every customer. So the default under
`currentUser` is refusal, and a field gets through only on one of three grounds:

- it says nothing about the account — `id`, `__typename`;
- it names a bot, and the bot fence checks which — `botRole(botID:)`, and Coworker's
  `coworkerConversationsConnection(botID:)`;
- it names one resource inside a bot, and the resource fence checks it — Coworker's
  `coworkerGetConversation(id:)`.

The last two are read off the **resolved value** of the scoping argument, not off the field name.
`coworkerConversationsConnection`'s `botID` is optional upstream, and omitted it lists every bot the
master token holds — so the form without it, and the form passing a variable that arrives null, are
both refused.

Field names cannot be aliased away in GraphQL, so reading the selection set out of the query text is
sound; a fragment spread directly under `currentUser` is followed into its definition, and one whose
definition is not in the document is refused rather than guessed at.

Two shapes a request can take that a reimplementation is easy to lose the fence on, and this one
does not: a **batch** (a JSON array of operations) is fenced operation by operation, and every one of
them has to pass — an empty array is refused rather than waved through. And an **automatic persisted
query** — a request carrying only a hash and no `query` text — is refused too, because the fence
reads the query text and text that is not there cannot be read.

The api-client turns `AuthSessionRequired` and `AuthTenantForbidden` into `ChatfuelSessionError`,
which the app's `onSessionError` handler uses — and which the auth module ignores when nobody is
signed in (`lib/sessionLapse.ts`).

Only after the fence passes does the proxy forward: the browser's `Authorization` header is
**dropped** (outgoing headers are built from scratch) and `CHATFUEL_TOKEN` is injected. An
unauthenticated caller never causes an upstream connection.

## WebSocket

The subscription transport carries the token in the `graphql-transport-ws` handshake, not in a
header:

```jsonc
// browser → proxy, first frame
{ "type": "connection_init", "payload": { "authToken": "Bearer eyJ..." } }
```

The proxy accepts the socket, **waits for that frame** (5 s, else close `4408`), gates it, and only
then opens the upstream socket with its own `connection_init` carrying the Chatfuel token. Then
every `subscribe` frame is fenced on its own `variables.botID` — that is where a bot is actually
named — and a refused subscription gets an `error` frame instead of killing the shared socket.

| Code | Meaning |
|---|---|
| `4401` | `AuthSessionRequired` — no/expired/invalid token |
| `4403` | `AuthTenantForbidden` — valid session with no workspace. Unlike the HTTP path, this is refused at connect and needs no bot to be named: a socket with an empty set can only ever be told "not yours", so it is never opened |
| `1013` | `ProxyAuthUnavailable` — Supabase unreachable; the client retries with backoff |
| `4408` | no `connection_init` arrived in time |
| `4500` | `ProxyAuthMisconfigured` — the gate is half-configured (see below) |

`graphql-ws` re-reads `connectionParams()` on every reconnect, so a refreshed access token is used
automatically. **The set is read at connect time only** — an open socket outlives a membership
change until it drops.

## Gate on/off

On iff both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

- neither set → open mode — every caller drives Chatfuel under the deployment's own token. The
  server serves that only on loopback: on any other host it refuses to start (`npm start`) or
  answers `503 ProxyRefusedToServe` (the Vercel function) unless `CHATFUEL_OPEN_PROXY=1` says
  the deployment meant it, and `ALLOWED_ORIGINS='*'` with no gate is refused whatever that says
- both set → gated
- **one of them → fail closed**: every request answers 500 `ProxyAuthMisconfigured`

`SUPABASE_SERVICE_ROLE_KEY` additionally mounts `/chatfuel/auth/provision` (an account's first
bot), `/chatfuel/auth/bots` (`POST` for another, `PATCH` / `DELETE` on `/bots/<id>` to rename and
delete) and `/chatfuel/auth/recovery-link`. Without it the gate still works, but nobody can finish
signing up. Those routes also need `CHATFUEL_WORKSPACE_ID` — the Chatfuel workspace whose plan the
new bots draw on, ALL of them, for every account. They are mounted without one and answer 500
`ProxyAuthMisconfigured` naming the variable, rather than creating bots that bill to nothing.

The server prints `auth gate: on (bots per account, …)` or `auth gate: off` at startup. `VITE_*`
values are baked into the browser bundle at build time but read from the environment at run time by
the proxy — if the two disagree, that startup line is where it shows.

## Reimplementing it elsewhere

A host that already has its own proxy (Next.js route handler, Express, a Cloudflare Worker) needs
the same steps. Pseudocode:

```ts
const cache = new Map<string, { botIds: Set<string>; until: number }>();

async function gate(bearer: string | undefined) {
  if (!bearer) return { ok: false, status: 401, code: 'AuthSessionRequired' } as const;
  const jwt = bearer.replace(/^Bearer\s+/i, '');
  // No verification here — PostgREST does that. This only reads `exp`, to keep
  // the cache below from outliving the session. A JWT payload is base64URL, so
  // atob() on it as-is throws on any token containing - or _; decode it the way
  // the real gate does (Buffer.from(part, 'base64url')) or translate first, and
  // treat a payload that will not parse as no session rather than as no expiry.
  let exp: number | undefined;
  try {
    const part = (jwt.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
    exp = (JSON.parse(atob(part)) as { exp?: number }).exp;
  } catch {
    return { ok: false, status: 401, code: 'AuthSessionRequired' } as const;
  }
  // A missing `exp` is refused, not waved through: `exp &&` would be false for a
  // token that carries no expiry at all, skipping the check entirely. The shipped
  // gate refuses it (vendor/chatfuel-proxy/gate.ts, `verify`) — no test
  // covers this document, so keep the pointer next to the line.
  if (exp === undefined || exp * 1000 <= Date.now())
    return { ok: false, status: 401, code: 'AuthSessionRequired' } as const;

  const key = await sha256(jwt);
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return { ok: true, botIds: hit.botIds } as const;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cf_my_bot_ids`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) return { ok: false, status: 401, code: 'AuthSessionRequired' } as const;
  if (!res.ok) return { ok: false, status: 503, code: 'ProxyAuthUnavailable' } as const;

  const list = JSON.parse(await res.text()) as unknown;
  if (!Array.isArray(list)) return { ok: false, status: 503, code: 'ProxyAuthUnavailable' } as const;
  const botIds = new Set(list.filter((id): id is string => typeof id === 'string'));

  cache.set(key, { botIds, until: Math.min(Date.now() + 30_000, exp * 1000) });
  return { ok: true, botIds } as const;
}
```

Then fence the request against `botIds`, and only then forward with the Chatfuel token. Rules that
are easy to get wrong:

1. **Build outgoing headers from scratch.** Never pass the browser's `Authorization`, cookies or
   `apikey` upstream.
2. **Key the cache by a hash of the token**, not by user id — and bound every entry by `exp`, so a
   token cannot outlive itself in your cache.
3. **Fence every path.** GraphQL bodies, the REST `?botID=` param and WS `subscribe` frames all name
   bots; missing one of the three is missing the boundary.
4. **Refuse account-scope queries.** Without that, one customer reads the list of all the others out
   of `currentUser { botsV2 }`.
5. **Fail closed on a partial configuration.** "Supabase vars missing" and "Supabase vars half
   present" are different situations; only the first one means "no auth wanted".
6. **Sweep the cache** (or bound it) — one entry per token, and tokens rotate hourly.

## Sanity checks

```bash
# no token → 401
curl -sS -o /dev/null -w '%{http_code}\n' -X POST localhost:5173/chatfuel/graphql \
  -H 'Content-Type: application/json' -d '{"query":"{__typename}"}'

# somebody else's bot → 403 BotNotAllowed
curl -sS -X POST localhost:5173/chatfuel/graphql \
  -H "Authorization: Bearer $MY_JWT" -H 'Content-Type: application/json' \
  -d "{\"query\":\"query(\$botID: BotID!){ bot(id: \$botID){ id } }\",\"variables\":{\"botID\":\"$SOMEBODY_ELSES_BOT\"}}"

# the account behind the token → 403 AccountScopeBlocked
curl -sS -X POST localhost:5173/chatfuel/graphql \
  -H "Authorization: Bearer $MY_JWT" -H 'Content-Type: application/json' \
  -d '{"query":"{ currentUser { id email } }"}'

# my own bot → 200, and the response never contains the Chatfuel token
curl -sS -X POST localhost:5173/chatfuel/graphql \
  -H "Authorization: Bearer $MY_JWT" -H 'Content-Type: application/json' \
  -d "{\"query\":\"query(\$botID: BotID!){ bot(id: \$botID){ id title } }\",\"variables\":{\"botID\":\"$MY_BOT\"}}"
```
