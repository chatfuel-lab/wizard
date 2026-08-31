# `cf_*` RPC calls

Every RPC a client can call, twice: as `supabase-js` (what `adapters/supabaseAdapter.ts` does) and as
raw PostgREST (what the proxy, a script or another stack does). Signatures, permissions and error
codes are in `references/guide.md`.

The list below is the whole callable surface. The migration also defines helpers
(`cf_require_admin`, `cf_require_owner`, `cf_require_bot_admin`, `cf_my_bots_json`,
`cf_workspace_name_for`, `cf_hash_token`, `cf_new_token`, `cf_role_rank`, `cf_mask_email`,
`cf_auth_email`) with **no grants at all** — they exist for the
functions here to call and answer `42501 insufficient_privilege` to anyone else.

Setup used by every `supabase-js` snippet below:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'chatfuel-auth',
  },
});
// The workspace is discovered after signing in, never configured:
const TENANT = (await supabase.rpc('cf_my_workspace')).data?.tenant_id;
```

…and by every `curl`:

```bash
SUPABASE_URL=https://<ref>.supabase.co
ANON=sb_publishable_...          # public
SECRET=sb_secret_...             # server only
TENANT=$(curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_my_workspace" -H "apikey: $ANON" \
  -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' -d '{}' | jq -r .tenant_id)
JWT=$ANON                        # anon calls; otherwise the user's access token
```

## Reading the errors

PostgREST turns `PT4nn` into HTTP `nnn` and puts the machine code in `hint`:

```jsonc
// HTTP 403
{ "code": "PT403", "message": "This invite is for a different email address", "hint": "email_mismatch", "details": null }
```

```ts
// supabase-js: the same fields, on `error`
const { data, error } = await supabase.rpc('cf_accept_invite', { p_token: token });
if (error) throw mapHint(error.hint, error.code); // never show `message` raw — it is not localised
```

## Anonymous

### `cf_invite_preview`

```ts
const { data } = await supabase.rpc('cf_invite_preview', { p_token: token });
// { status: 'valid'|'expired'|'revoked'|'accepted'|'not_found', tenant_name, role,
//   inviter_name: 'Olga Owner'|null, email_hint: 'j***@corp.com'|null,
//   email_restricted, expires_at }
// inviter_name is a display name or null — never the inviter's email address.
// 60 lookups a minute across the whole deployment; past that, 429 with hint 'rate_limited'.
```

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_invite_preview" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"p_token":"3Qk8...32chars"}'
```

## Sessions (GoTrue, not RPC)

```ts
await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` });
await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }); // the reset link
await supabase.auth.updateUser({ password });
await supabase.auth.signOut();
const { data: { session } } = await supabase.auth.getSession(); // session.access_token → the proxy
```

```bash
# sign up (autoconfirm on → a session comes back immediately)
curl -sS "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON" -H 'Content-Type: application/json' \
  -d '{"email":"owner@example.com","password":"correct horse battery staple"}'
```

`full_name` travels in `raw_user_meta_data` and the `auth.users` trigger mirrors it into
`cf_profiles`. Creating the account is only half of getting in — the provisioning route below is
the other half, and it is the very next call.

## Getting a workspace

### `cf_my_workspace` — which bots may I open?

```ts
const { data } = await supabase.rpc('cf_my_workspace');
// data: { tenant_id, name, role, joined_at, bots: [{ id, bot_id, name }] }
//       — or null when this account has no workspace yet.
// bots is what the topbar switches between: every bot of the workspace for an owner or
// admin, the granted ones for a member. A bot with bot_id null is still being created.
// An EMPTY list is not the same as no workspace, and neither is a list holding only
// reservations: for an owner or admin both mean provisioning has not finished, and the app
// asks the route again. For a member it means they were granted nothing — ask an admin.
```

### `POST /chatfuel/auth/provision` — sign-up's second half (not an RPC)

```ts
const { data: { session } } = await supabase.auth.getSession();
const res = await fetch('/chatfuel/auth/provision', {
  method: 'POST',
  headers: { authorization: `Bearer ${session!.access_token}`, 'content-type': 'application/json' },
  body: JSON.stringify({}),            // or { name: 'Acme' } to name the workspace
});
// 200 { tenantId, name, role, bots: [{ id, botId, name }] } · 401 no session
// · 404 route not mounted (no service key) · 409 the Chatfuel workspace is full
// · 502 Chatfuel would not create a bot · 503 Supabase would not take it (the bot is rolled back)
```

Idempotent: an account that already has a workspace — their own, or one they were invited into —
gets it back, and one that already holds a bot WITH AN ID gets no new one. A reservation does not
count, so two calls racing each other still make one bot: the second joins the first's run, or
(across processes) drops its own reservation and waits for the winner's. The browser cannot do this
itself; creating the bot needs the master Chatfuel token and recording it needs the service-role
key.

### `POST|PATCH|DELETE /chatfuel/auth/bots` — the bots after the first (not RPCs)

```ts
const auth = { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' };

// another bot in this workspace
await fetch('/chatfuel/auth/bots', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Sales' }) });
// 200 { id, botId, name } · 403 not an admin · 409 the Chatfuel workspace is full · 422 bad name

// rename it — here and in Chatfuel, or neither
await fetch(`/chatfuel/auth/bots/${id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ name: 'Sales EU' }) });
// 200 { id, botId, name } · 404 not a bot of this workspace · 502 Chatfuel refused (the old name is back)

// delete it in Chatfuel, then here — but never the workspace's last one
await fetch(`/chatfuel/auth/bots/${id}`, { method: 'DELETE', headers: auth });
// 200 { id, botId } · 403 not an admin · 409 LastBotInWorkspace (this workspace's last bot,
// or the deployment's) · 502 Chatfuel refused (nothing was removed here)
```

`id` is the ROW id from `cf_my_workspace().bots[].id`, not the Chatfuel bot id — a browser never
names a Chatfuel bot to these routes.

### `cf_claim_workspace` — what the server calls first

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_claim_workspace" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"p_name": null}'
# → the same shape as cf_my_workspace: { tenant_id, name, role: "owner", joined_at, bots: [] }
```

### `cf_new_bot` — the caller reserves the row

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_new_bot" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"p_name": "Sales"}'
# → { id, tenant_id, name } · 403 not_admin · 404 tenant_not_found · 422 bad_name / name_too_long
```

### `cf_bot_created` — service key only

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_bot_created" \
  -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
  -H 'Content-Type: application/json' \
  -d "{\"p_slot\":\"$ROW\",\"p_bot_id\":\"000000000000000000000001\"}"
# → { id, tenant_id, bot_id } · 409 bot_already_attached for a DIFFERENT bot · a retry with the same one is a no-op
```

The same call with the anon key and a user JWT answers `42501` — that is the whole point of it.
`cf_drop_bot_slot` is its undo and is service-key-only for the same reason; it refuses a row that
already holds a bot.

### `cf_accept_invite`

```ts
const { data, error } = await supabase.rpc('cf_accept_invite', { p_token: token });
// hints: invite_not_found (404) | invite_revoked / invite_accepted / invite_expired (410)
//      | email_mismatch (403) | unauthenticated (401)
// decides the ROLE, not the admission: a non-member arrives as the invited role,
// an existing member is upgraded to it, and it never downgrades anyone
```

### `cf_my_membership`

```ts
const { data } = await supabase.rpc('cf_my_membership', { p_tenant_id: TENANT });
// null → signed in but not a member (→ /no-access); else { role, joined_at, tenant: { id, name } }
```

### `cf_leave_tenant`

```ts
await supabase.rpc('cf_leave_tenant', { p_tenant_id: TENANT });
// hints: owner_cannot_leave (409) | member_not_found (404) | unauthenticated (401)
```

## The gate

### `cf_my_bot_ids` / `cf_gate_for_bot`

```bash
# what the proxy asks once per session
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_my_bot_ids" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{}'
# → ["000000000000000000000001"]   (every bot this session may touch; [] = no workspace yet)

# the same question for one bot
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_gate_for_bot" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"p_bot_id":"000000000000000000000001"}'
# → "owner" | "admin" | "member" | null
```

Full contract, caching and the failure mapping: `examples/proxy-gate.md`.

## Team management (admin/owner)

### `cf_list_members`

```ts
const { data } = await supabase.rpc('cf_list_members', { p_tenant_id: TENANT });
// [{ user_id, role, email, full_name, avatar_url, joined_at, bots }] — owner first, then by join date
// bots: row ids of the bots granted to them. EMPTY for an owner or admin, who reach all of them
// by role — read `role` before you read `bots`, or an admin looks like somebody with no access.
```

### `cf_list_bots` / `cf_grant_bot` / `cf_revoke_bot`

```ts
const { data } = await supabase.rpc('cf_list_bots', { p_tenant_id: TENANT });
// [{ id, bot_id, name, created_at, members }] — every bot of the workspace, which is wider
// than cf_my_workspace().bots: an admin may hand out a bot they have not opened themselves.

await supabase.rpc('cf_grant_bot', { p_slot: botRowId, p_user_id: userId });
await supabase.rpc('cf_revoke_bot', { p_slot: botRowId, p_user_id: userId });
// hints: not_admin (403) | bot_not_found (404) | member_not_found (404, granting to a
// non-member). Granting twice is a no-op; owners and admins need neither call.
```

### `cf_list_invites`

```ts
const { data } = await supabase.rpc('cf_list_invites', { p_tenant_id: TENANT });
// [{ id, role, email, created_by, created_by_name, created_at, expires_at,
//    status: 'pending'|'expired'|'revoked'|'accepted', bot_ids }]  — never a token or its hash
```

### `cf_create_invite` — the raw token, exactly once

```ts
const { data } = await supabase.rpc('cf_create_invite', {
  p_tenant_id: TENANT,
  p_role: 'member',          // 'admin' | 'member'  → bad_role (422)
  p_email: null,             // or 'someone@corp.com' to restrict it
  p_expires_in: '168 hours', // postgres interval; 0 < x ≤ 30 days → bad_expiry (422)
  p_bots: [botRowId],        // granted when it is accepted; a foreign bot → bot_not_found (404).
                             // Pointless for an admin, who reaches every bot anyway.
});
const link = `${location.origin}/invite/${data.token}`;
// data.token is unreadable after this response — show the link now or lose it
```

```bash
curl -sS "$SUPABASE_URL/rest/v1/rpc/cf_create_invite" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ADMIN_JWT" \
  -H 'Content-Type: application/json' \
  -d "{\"p_tenant_id\":\"$TENANT\",\"p_role\":\"admin\",\"p_email\":null,\"p_expires_in\":\"30 days\",\"p_bots\":[]}"
```

### `cf_revoke_invite`

```ts
await supabase.rpc('cf_revoke_invite', { p_invite_id: inviteId });
// idempotent: revoking an accepted or already-revoked invite changes nothing
```

### `cf_change_member_role`

```ts
await supabase.rpc('cf_change_member_role', { p_tenant_id: TENANT, p_user_id: userId, p_role: 'admin' });
// hints: self_target (422) | is_owner (409) | member_not_found (404) | bad_role (422) | rank (403)
// rank: the target is not BELOW the caller — an admin does not demote a fellow admin,
// because that would put them below and a recovery link may be issued for anyone below
```

### `cf_remove_member`

```ts
await supabase.rpc('cf_remove_member', { p_tenant_id: TENANT, p_user_id: userId });
// hints: self_target (422 — use cf_leave_tenant) | is_owner (409) | member_not_found (404) | rank (403)
// removes the ROLE, not the account: with open sign-up they can rejoin as a member
```

### `cf_transfer_ownership`

```ts
await supabase.rpc('cf_transfer_ownership', { p_tenant_id: TENANT, p_new_owner: userId });
// owner only; one transaction: caller → admin, target → owner
// hints: not_owner (403) | self_target (422) | member_not_found (404)
```

## Admin recovery link (server-side, not an RPC)

Needs `SUPABASE_SERVICE_ROLE_KEY`; the app calls the proxy route, never GoTrue directly.

```bash
# what the server does, once it has gated the caller as owner/admin
curl -sS "$SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"type":"recovery","email":"member@example.com"}'
# → { properties: { hashed_token, ... } }
# the server returns: <origin>/reset-password?token_hash=<hashed_token>&type=recovery
```

```ts
// the app, from the Team row menu
const result = await adapter.generateRecoveryLink!(member.email);
// result is { delivered: 'server-log' } — there is no `url`. The link itself is
// written to the server log, never returned to the caller, by design: handing it
// back over the API would turn a deliberately log-only credential into an account
// takeover primitive for any authenticated admin (`recoveryLink.ts:159-161`).
// Do not "fix" the server to return the link — that is the vulnerability, not a bug.
```
