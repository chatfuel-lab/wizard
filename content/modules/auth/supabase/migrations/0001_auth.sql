-- ============================================================================
-- chatfuel-wizard · Auth & Team · migration 0001
--
-- Supabase Auth (email + password) in front of a Chatfuel-wizard app, multi-tenant:
-- ONE WORKSPACE PER ACCOUNT, MANY BOTS INSIDE IT. Somebody signs up, the server
-- creates a Chatfuel bot for them with the deployment's master token, and they can
-- create more later and move between them. Colleagues arrive by invite and join the
-- inviter's workspace instead of getting one of their own; which bots they may open
-- is granted per person, except for owners and admins, who see all of them.
-- Every object is prefixed cf_ because this project may be shared with the
-- deployer's own tables.
--
-- Contract:
--   * Idempotent — safe to re-run on the same project (create … if not exists,
--     create or replace, drop policy if exists).
--   * Tables are RPC-ONLY: RLS is on with no policies and grants are revoked;
--     the cf_* SECURITY DEFINER functions below are the whole read/write surface.
--     (This sidesteps the RLS-recursion trap on cf_members and keeps token hashes
--     out of reach of PostgREST.)
--   * Every function: security definer, set search_path = '' (so only pg_catalog
--     resolves implicitly — pgcrypto is called as extensions.*), execute REVOKED
--     from public/anon/authenticated and granted back explicitly. Supabase
--     default-grants EXECUTE on new public functions to anon — do not skip the
--     revoke when adding a function.
--   * Errors: raise sqlstate 'PT4xx' with the machine code in HINT; PostgREST maps
--     PTnnn to HTTP nnn (401 unauthenticated · 403 not allowed · 404 not found ·
--     409 conflict · 410 gone · 422 invalid · 429 over a limit). Clients switch
--     on the hint.
--   * Tokens: raw = 24 random bytes as base64url (32 chars); stored = sha256 as
--     base64. Never 64-hex — the wizard's log scrubber masks any 64-hex string.
--   * Tenant ids are random. A tenant is created with no bots by
--     `cf_claim_workspace`; `created_by` is UNIQUE, which is what makes claiming
--     one idempotent under a retry or two parallel tabs.
--   * A bot is added in two steps, so that a browser can never point a row at an
--     arbitrary bot: the caller reserves a SLOT (`cf_bots` row, `bot_id` null)
--     with `cf_new_bot`, then the server — which holds the master token — fills
--     the Chatfuel id in with `cf_bot_created`. A workspace with a slot and no id
--     is briefly "being set up": the Team page marks the row, and the provision
--     route waits for it rather than reserving a second one.
--   * `cf_bot_created` and `cf_drop_bot_slot` are the two functions granted to
--     `service_role` and nobody else.
--
-- Sign-up is plain SaaS sign-up: anyone who reaches the deployed app can create
-- an account, and the app then claims a workspace for them and adds their first
-- bot. Invites exist to hand somebody a role in a workspace that already exists —
-- an invited person joins it and gets no workspace of their own.
--
-- The profiles trigger must never make sign-up fail ("Database error saving new
-- user"), hence the exception swallow. Deleting a user's auth row leaves the
-- workspace standing (`created_by` goes null) so the colleagues they invited keep
-- working; the Chatfuel bot itself is never deleted from here.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables
create table if not exists public.cf_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cf_tenants (
  id          uuid primary key default gen_random_uuid(),
  -- One workspace per account, enforced by the database rather than by the
  -- server remembering to check: two parallel provision calls cannot both win.
  created_by  uuid unique references public.cf_profiles (id) on delete set null,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cf_members (
  tenant_id   uuid not null references public.cf_tenants (id) on delete cascade,
  user_id     uuid not null references public.cf_profiles (id) on delete cascade,
  role        text not null check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create unique index if not exists cf_members_single_owner_idx
  on public.cf_members (tenant_id) where role = 'owner';
create index if not exists cf_members_user_idx on public.cf_members (user_id);

-- The bots of a workspace. `bot_id` is null between reserving the row and the
-- server reporting what Chatfuel created; unique once it is there, so the same
-- bot can never hang off two workspaces.
create table if not exists public.cf_bots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.cf_tenants (id) on delete cascade,
  bot_id      text unique,
  name        text not null,
  created_by  uuid references public.cf_profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists cf_bots_tenant_idx on public.cf_bots (tenant_id, created_at asc);

-- Who may open which bot. Owners and admins are NOT listed here: they administer
-- the workspace, so they see every bot in it — a row here only ever widens what a
-- member can reach.
create table if not exists public.cf_bot_members (
  bot         uuid not null references public.cf_bots (id) on delete cascade,
  user_id     uuid not null references public.cf_profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (bot, user_id)
);
create index if not exists cf_bot_members_user_idx on public.cf_bot_members (user_id);

create table if not exists public.cf_invites (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.cf_tenants (id) on delete cascade,
  token_hash   text not null unique,
  role         text not null check (role in ('admin', 'member')),
  email        text,
  created_by   uuid references public.cf_profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  accepted_at  timestamptz,
  accepted_by  uuid references public.cf_profiles (id) on delete set null
);
create index if not exists cf_invites_tenant_idx on public.cf_invites (tenant_id, created_at desc);
-- Added after the fact, so a project created before bots were plural heals itself.
alter table public.cf_invites add column if not exists bot_ids uuid[] not null default '{}';

create table if not exists public.cf_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);

-- Enabled, not FORCED, and deliberately: `force row level security` also binds
-- the table's OWNER, and the owner here is the role that applies this file. On
-- Supabase that is `postgres`, which bypasses RLS regardless, so forcing buys
-- nothing and can break a re-run. Add `force` if the owning role is ever handed
-- to a person or a background job — then the bypass stops being ours alone.
alter table public.cf_profiles   enable row level security;
alter table public.cf_tenants    enable row level security;
alter table public.cf_members    enable row level security;
alter table public.cf_bots       enable row level security;
alter table public.cf_bot_members enable row level security;
alter table public.cf_invites    enable row level security;
alter table public.cf_migrations enable row level security;

revoke all on table public.cf_tenants, public.cf_members, public.cf_bots, public.cf_bot_members,
  public.cf_invites, public.cf_migrations from anon, authenticated;
revoke all on table public.cf_profiles from anon, authenticated;
grant select on public.cf_profiles to authenticated;
grant update (full_name, avatar_url) on public.cf_profiles to authenticated;

drop policy if exists cf_profiles_self_select on public.cf_profiles;
create policy cf_profiles_self_select on public.cf_profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists cf_profiles_self_update on public.cf_profiles;
create policy cf_profiles_self_update on public.cf_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- profiles mirror
create or replace function public.cf_handle_auth_user_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cf_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(excluded.full_name, public.cf_profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.cf_profiles.avatar_url),
    updated_at = now();
  return new;
exception when others then
  return new; -- never block sign-up or an email change
end $$;
revoke execute on function public.cf_handle_auth_user_change() from public, anon, authenticated;

create or replace trigger cf_on_auth_user_change
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.cf_handle_auth_user_change();

insert into public.cf_profiles (id, email)
  select id, lower(email) from auth.users
  on conflict (id) do nothing; -- backfill on re-run / existing project

-- ---------------------------------------------------------------- helpers (no grants)
create or replace function public.cf_auth_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(auth.jwt() ->> 'email')
$$;
revoke execute on function public.cf_auth_email() from public, anon, authenticated;

create or replace function public.cf_hash_token(p_token text)
returns text language sql immutable security definer set search_path = '' as $$
  select encode(extensions.digest(p_token, 'sha256'), 'base64')
$$;
revoke execute on function public.cf_hash_token(text) from public, anon, authenticated;

create or replace function public.cf_new_token()
returns text language sql volatile security definer set search_path = '' as $$
  select translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_')
$$;
revoke execute on function public.cf_new_token() from public, anon, authenticated;

/* alice.smith@acme.io → "Alice Smith". The workspace and the bot get this name;
   nothing depends on it, and Team can rename neither today. */
create or replace function public.cf_workspace_name_for(p_email text)
returns text language sql immutable security definer set search_path = '' as $$
  select coalesce(
    nullif(initcap(trim(replace(replace(split_part(coalesce(p_email, ''), '@', 1), '.', ' '), '_', ' '))), ''),
    'My workspace')
$$;
revoke execute on function public.cf_workspace_name_for(text) from public, anon, authenticated;

create or replace function public.cf_role_rank(p_role text)
returns int language sql immutable security definer set search_path = '' as $$
  select case p_role when 'owner' then 3 when 'admin' then 2 when 'member' then 1 else 0 end
$$;
revoke execute on function public.cf_role_rank(text) from public, anon, authenticated;

create or replace function public.cf_mask_email(p_email text)
returns text language sql immutable security definer set search_path = '' as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else left(p_email, 1) || '***@' || split_part(p_email, '@', 2)
  end
$$;
revoke execute on function public.cf_mask_email(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- gate + role guards
/*
 * What the proxy asks on every request, and the whole isolation boundary for
 * bot-scoped calls: may this caller open this bot? The proxy holds the master
 * token, so without this check any signed-in person could name somebody else's
 * bot id and be served.
 *
 * THE RULE, written once here and repeated by cf_my_bot_ids and cf_my_bots_json:
 * a member of the workspace that holds the bot, who either administers the
 * workspace (owner/admin see every bot in it) or was granted this one.
 */
create or replace function public.cf_gate_for_bot(p_bot_id text)
returns text language sql stable security definer set search_path = '' as $$
  select m.role
  from public.cf_bots b
  join public.cf_members m on m.tenant_id = b.tenant_id and m.user_id = auth.uid()
  where b.bot_id = p_bot_id
    and (m.role in ('owner', 'admin')
         or exists (select 1 from public.cf_bot_members g
                    where g.bot = b.id and g.user_id = auth.uid()))
$$;
revoke execute on function public.cf_gate_for_bot(text) from public, anon, authenticated;
grant execute on function public.cf_gate_for_bot(text) to authenticated;

/*
 * The same answer for a whole session, in one round trip: every bot the caller
 * may touch. The proxy caches this next to the session and fences each request
 * against it, so a request never costs a database call.
 */
create or replace function public.cf_my_bot_ids()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(b.bot_id order by b.bot_id), '{}')
  from public.cf_bots b
  join public.cf_members m on m.tenant_id = b.tenant_id and m.user_id = auth.uid()
  where b.bot_id is not null
    and (m.role in ('owner', 'admin')
         or exists (select 1 from public.cf_bot_members g
                    where g.bot = b.id and g.user_id = auth.uid()))
$$;
revoke execute on function public.cf_my_bot_ids() from public, anon, authenticated;
grant execute on function public.cf_my_bot_ids() to authenticated;

/* The same rule again, as the list the app renders: every bot of one workspace
   this caller may open, oldest first. A slot still waiting for Chatfuel carries a
   null `bot_id` and the app shows it as being set up. */
create or replace function public.cf_my_bots_json(p_tenant_id uuid)
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object('id', x.id, 'bot_id', x.bot_id, 'name', x.name)
                           order by x.created_at), '[]'::json)
  from (
    select b.id, b.bot_id, b.name, b.created_at
    from public.cf_bots b
    join public.cf_members m on m.tenant_id = b.tenant_id and m.user_id = auth.uid()
    where b.tenant_id = p_tenant_id
      and (m.role in ('owner', 'admin')
           or exists (select 1 from public.cf_bot_members g
                      where g.bot = b.id and g.user_id = auth.uid()))
  ) x
$$;
revoke execute on function public.cf_my_bots_json(uuid) from public, anon, authenticated;

/* Admin+ on one bot, by the row id the app carries. Returns the workspace it
   belongs to, so the caller does not have to be trusted for that either. */
create or replace function public.cf_require_bot_admin(p_slot uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  select tenant_id into v_tenant from public.cf_bots where id = p_slot;
  if v_tenant is null then
    raise sqlstate 'PT404' using message = 'Bot not found', hint = 'bot_not_found';
  end if;
  perform public.cf_require_admin(v_tenant);
  return v_tenant;
end $$;
revoke execute on function public.cf_require_bot_admin(uuid) from public, anon, authenticated;

create or replace function public.cf_require_admin(p_tenant_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select role into v_role from public.cf_members
    where tenant_id = p_tenant_id and user_id = auth.uid();
  if v_role is null or v_role not in ('owner', 'admin') then
    raise sqlstate 'PT403' using message = 'Only admins can do that', hint = 'not_admin';
  end if;
  return v_role;
end $$;
revoke execute on function public.cf_require_admin(uuid) from public, anon, authenticated;

create or replace function public.cf_require_owner(p_tenant_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select role into v_role from public.cf_members
    where tenant_id = p_tenant_id and user_id = auth.uid();
  if v_role is distinct from 'owner' then
    raise sqlstate 'PT403' using message = 'Only the owner can do that', hint = 'not_owner';
  end if;
  return v_role;
end $$;
revoke execute on function public.cf_require_owner(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- public (anon) reads
/*
 * What has been spent on the only function anon may execute.
 *
 * A preview is a lookup by token, so the entropy of the token is the real
 * fence — 24 random bytes is not guessed. This is the second one: it costs an
 * enumerator a ceiling per minute instead of a connection, and it costs an
 * ordinary visitor nothing, because a visitor previews the one link they were
 * sent.
 *
 * `probe` is the first two characters of the token's hash, and the caller does
 * not get to choose it. It used to be the client address out of
 * `x-forwarded-for`, which is the caller's header to write: a fresh random one
 * per request bought a fresh bucket, so the ceiling was never reached, and
 * every attempt left a row behind — an insert path with no bound, reachable by
 * `anon`. Reading the last hop instead is what the proxy's own throttle does,
 * but it can do that because it knows how many hops it sits behind; this
 * function is called through Supabase's edge, whose chain length is not this
 * deployment's to fix. So the header is not read at all.
 *
 * The bucket after that was a single deployment-wide 'all', which held the
 * insert path to one row and was the wrong ceiling for a different reason: it
 * is one counter every visitor shares, so 60 calls a minute from anybody
 * answered PT429 to every real invitee for the rest of that minute. A script
 * with the anon key — which ships in the bundle by design — kept invite
 * acceptance shut for the whole deployment.
 *
 * The hash prefix is the way out because the only thing a caller here cannot
 * forge is the token they are presenting: a bucket derived from it is a bucket
 * they cannot pick, and every row is still one of a fixed 4096, so the insert
 * path stays bounded. An invitee lands in the same bucket every time and is not
 * knocked out by traffic aimed elsewhere; shutting the deployment now means
 * filling all 4096, some four orders of magnitude more work than before. One
 * specific link can still be kept at PT429 by whoever holds it — there is no
 * defence against that without an identity this caller does not have, and the
 * link's own holder is who they would be locking out.
 *
 * The ceiling per bucket is what an unauthenticated route can afford: normal
 * traffic is a handful of calls per invite sent.
 *
 * RPC-only like every other table here: RLS on, no policies, grants revoked.
 */
create table if not exists public.cf_invite_probes (
  probe     text primary key,
  window_at timestamptz not null,
  n         integer not null
);
create index if not exists cf_invite_probes_window_idx on public.cf_invite_probes (window_at);
alter table public.cf_invite_probes enable row level security;
revoke all on table public.cf_invite_probes from anon, authenticated;

/*
 * The one thing an unauthenticated caller may ask: is this invite link good.
 *
 * `inviter_name` is the profile's display name and NEVER the email behind it.
 * Whoever holds the link is nobody yet — the address of the person who sent it
 * is not theirs to have, and an invite that reaches the wrong inbox would hand
 * over an admin's address for free. A profile with no name answers null, and
 * the page says "you were invited" without a by-line.
 *
 * The invited address is masked for the same reason, by cf_mask_email: enough
 * to say "sign in as this one", not enough to harvest.
 */
create or replace function public.cf_invite_preview(p_token text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  delete from public.cf_invite_probes where window_at < now() - interval '10 minutes';
  /* One of 4096 buckets, no header read: see the table's comment for why the
     bucket comes from the token the caller is already presenting and not from
     anything they could vary.

     The refusal below aborts the transaction and takes this row's increment
     with it, which is the behaviour wanted: the counter stops at the ceiling
     and every further call in the same minute recomputes past it and raises. */
  insert into public.cf_invite_probes as pr (probe, window_at, n)
    values (substring(public.cf_hash_token(coalesce(p_token, '')) from 1 for 2), date_trunc('minute', now()), 1)
    on conflict (probe) do update set
      window_at = excluded.window_at,
      n = case when pr.window_at = excluded.window_at then pr.n + 1 else 1 end
    returning n into v_n;
  if v_n > 60 then
    raise sqlstate 'PT429' using message = 'Too many invite lookups — wait a minute', hint = 'rate_limited';
  end if;

  return (select json_build_object(
    'status', case
      when i.id is null then 'not_found'
      when i.revoked_at is not null then 'revoked'
      when i.accepted_at is not null then 'accepted'
      when i.expires_at <= now() then 'expired'
      else 'valid' end,
    'tenant_name', t.name,
    'role', i.role,
    'inviter_name', nullif(p.full_name, ''),
    'email_hint', public.cf_mask_email(i.email),
    'email_restricted', i.email is not null,
    'expires_at', i.expires_at
  )
  from (select 1) as one
  left join public.cf_invites i on i.token_hash = public.cf_hash_token(p_token)
  left join public.cf_tenants t on t.id = i.tenant_id
  left join public.cf_profiles p on p.id = i.created_by);
end $$;
revoke execute on function public.cf_invite_preview(text) from public, anon, authenticated;
grant execute on function public.cf_invite_preview(text) to anon, authenticated;

-- ---------------------------------------------------------------- joining a tenant
create or replace function public.cf_my_membership(p_tenant_id uuid)
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'role', m.role,
    'joined_at', m.created_at,
    'tenant', json_build_object('id', t.id, 'name', t.name, 'bots', public.cf_my_bots_json(t.id))
  )
  from public.cf_members m
  join public.cf_tenants t on t.id = m.tenant_id
  where m.tenant_id = p_tenant_id and m.user_id = auth.uid()
$$;
revoke execute on function public.cf_my_membership(uuid) from public, anon, authenticated;
grant execute on function public.cf_my_membership(uuid) to authenticated;

/*
 * The caller's workspace, and the only place the app learns which bots it may
 * run on — it never asks Chatfuel, whose account-wide answer belongs to the
 * deployer. An empty `bots` means the first one is still being created (the app
 * shows that and polls) or every one of them was deleted. Somebody who owns a
 * workspace AND was invited to another sees the one they own; a person belongs
 * to one workspace and switches BOTS inside it, not workspaces.
 */
create or replace function public.cf_my_workspace()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'tenant_id', t.id,
    'name', t.name,
    'role', m.role,
    'joined_at', m.created_at,
    'bots', public.cf_my_bots_json(t.id)
  )
  from public.cf_members m
  join public.cf_tenants t on t.id = m.tenant_id
  where m.user_id = auth.uid()
  order by (t.created_by = auth.uid()) desc, m.created_at asc
  limit 1
$$;
revoke execute on function public.cf_my_workspace() from public, anon, authenticated;
grant execute on function public.cf_my_workspace() to authenticated;

/*
 * Sign-up's second half. A caller who is already in a workspace — because they
 * arrived through an invite, or because they simply came back — gets that one
 * and nothing is created. Otherwise a workspace is opened for them with no bots
 * yet, and the SERVER adds the first one through cf_new_bot / cf_bot_created.
 *
 * `created_by` is unique, so two tabs racing produce one workspace: the loser's
 * insert raises unique_violation and reads the winner's row.
 */
create or replace function public.cf_claim_workspace(p_name text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_tenant uuid; v_name text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select m.tenant_id into v_tenant from public.cf_members m where m.user_id = auth.uid()
    order by (select t.created_by = auth.uid() from public.cf_tenants t where t.id = m.tenant_id) desc,
             m.created_at asc
    limit 1;
  if v_tenant is not null then
    return public.cf_my_workspace();
  end if;
  v_name := coalesce(nullif(trim(p_name), ''), public.cf_workspace_name_for(public.cf_auth_email()));
  begin
    insert into public.cf_tenants (created_by, name) values (auth.uid(), v_name)
      returning id into v_tenant;
  exception when unique_violation then
    select id into v_tenant from public.cf_tenants where created_by = auth.uid();
  end;
  insert into public.cf_members (tenant_id, user_id, role) values (v_tenant, auth.uid(), 'owner')
    on conflict (tenant_id, user_id) do nothing;
  return public.cf_my_workspace();
end $$;
revoke execute on function public.cf_claim_workspace(text) from public, anon, authenticated;
grant execute on function public.cf_claim_workspace(text) to authenticated;

-- ---------------------------------------------------------------- bots
-- The function the one-bot-per-account version had. A project that ran that
-- version still carries it; nothing calls it any more.
drop function if exists public.cf_attach_bot(uuid, text);

/*
 * THE TWO CEILINGS ON BOT CREATION, and why they are functions rather than
 * literals inside cf_new_bot: every bot a caller reserves here is a bot the
 * DEPLOYMENT's master token then creates in Chatfuel, on the deployment's own
 * plan and at the operator's expense. Sign-up is open to anyone who reaches the
 * app and already creates one bot per new account (handleProvision), so without
 * a ceiling the bill has no upper bound that this project controls.
 *
 * Each is one line an operator rewrites in the Supabase SQL editor to tune the
 * deployment — re-run the create or replace with a different number and the
 * change is live; nothing else reads the value. The installer can set them at
 * install time instead (CHATFUEL_BOT_TOTAL_CAP, CHATFUEL_BOT_CAP in the
 * environment the wizard is run with), which is why the number is written as a
 * guarded literal: unfilled, this file is still valid to paste and the default
 * beside the guard is what stands.
 *
 * The guard is a `substring` and not a `case`, and that is not a style choice.
 * Postgres resolves a cast on a string constant while it is still parsing the
 * function body, so `'__CHATFUEL_BOT_CAP__'::integer` fails at CREATE FUNCTION
 * even inside a branch nothing reaches - the whole file was unpasteable until
 * the placeholder was filled. `substring` answers NULL when the placeholder is
 * still a placeholder, NULL casts to integer fine, and coalesce hands back the
 * default beside it.
 *
 * They are NOT granted to anyone. cf_new_bot is security definer, so it calls
 * them as the owner; a browser has no reason to learn the deployment's limits.
 */
create or replace function public.cf_bot_total_cap()
returns integer language sql immutable security definer set search_path = '' as $$
  select coalesce(substring('__CHATFUEL_BOT_TOTAL_CAP__' from '^[0-9]+$')::integer, 200);
$$;
revoke execute on function public.cf_bot_total_cap() from public, anon, authenticated;

create or replace function public.cf_bot_cap()
returns integer language sql immutable security definer set search_path = '' as $$
  select coalesce(substring('__CHATFUEL_BOT_CAP__' from '^[0-9]+$')::integer, 20);
$$;
revoke execute on function public.cf_bot_cap() from public, anon, authenticated;

/*
 * Step one of adding a bot, run AS THE CALLER so the permission check is the
 * database's and not the server's: reserve a row with no Chatfuel id in it. The
 * server then creates the bot with the master token and comes back to
 * cf_bot_created; if it never does, the slot is swept by the next attempt.
 *
 * Capped both ways, deployment-wide and per workspace. The per-workspace cap is
 * the one a person meets; the deployment-wide one is the one that actually
 * bounds the bill, because the cheap abuse is many accounts holding one bot
 * each rather than one account holding many. The admin panel's own
 * cf_admin_new_bot is deliberately NOT capped: whoever holds ADMIN_PASSWORD is
 * the operator paying for the bots, and a limit they can lift by editing a
 * function is not a limit on them.
 */
create or replace function public.cf_new_bot(p_name text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_tenant uuid; v_id uuid; v_name text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select m.tenant_id into v_tenant from public.cf_members m
    join public.cf_tenants t on t.id = m.tenant_id
    where m.user_id = auth.uid()
    order by (t.created_by = auth.uid()) desc, m.created_at asc
    limit 1;
  if v_tenant is null then
    raise sqlstate 'PT404' using message = 'You are not in a workspace yet', hint = 'tenant_not_found';
  end if;
  perform public.cf_require_admin(v_tenant);
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise sqlstate 'PT422' using message = 'A name is required', hint = 'bad_name';
  end if;
  if length(v_name) > 80 then
    raise sqlstate 'PT422' using message = 'That name is too long', hint = 'name_too_long';
  end if;
  -- Both ceilings below are count-then-insert, and PostgREST runs every RPC in
  -- its own READ COMMITTED transaction: without a lock, N concurrent requests
  -- read one snapshot, all pass the counts and all insert. `<authPath>/bots`
  -- deliberately does not stand down in front of this (see botRoutes.ts), so
  -- the ceiling has to hold here or nowhere. Two locks, because the two
  -- ceilings have two different scopes.
  --
  -- Deployment-wide, and taken first so every caller takes them in one order:
  -- no row stands for "the deployment", so a transaction-scoped advisory lock
  -- on a fixed key stands in for one. 8_431_001 is that key and means nothing
  -- else; Postgres releases it at commit or rollback, so a failed insert
  -- cannot strand it.
  perform pg_advisory_xact_lock(8431001);
  -- Per workspace: the tenant's own row, the idiom cf_claim_ownership already
  -- uses further down this file.
  perform 1 from public.cf_tenants where id = v_tenant for update;
  -- A slot whose server died mid-way would otherwise sit in the list as "being
  -- set up" forever. Swept BEFORE the caps are counted: a dead slot must not
  -- hold a place against the ceiling it never used.
  delete from public.cf_bots
    where tenant_id = v_tenant and bot_id is null and created_at < now() - interval '10 minutes';
  -- Counts only bots that exist: a reservation still waiting on Chatfuel has
  -- cost nothing yet, and the sweep above has already dropped the dead ones.
  if (select count(*) from public.cf_bots where bot_id is not null) >= public.cf_bot_total_cap() then
    raise sqlstate 'PT429'
      using message = 'This app has reached its bot limit', hint = 'deployment_bot_cap';
  end if;
  -- Every row of this workspace, reservations included: the in-flight ones are
  -- at most ten minutes old and are about to become bots.
  if (select count(*) from public.cf_bots where tenant_id = v_tenant) >= public.cf_bot_cap() then
    raise sqlstate 'PT429'
      using message = 'This workspace has reached its bot limit', hint = 'workspace_bot_cap';
  end if;
  insert into public.cf_bots (tenant_id, name, created_by)
    values (v_tenant, v_name, auth.uid())
    returning id into v_id;
  return json_build_object('id', v_id, 'tenant_id', v_tenant, 'name', v_name);
end $$;
revoke execute on function public.cf_new_bot(text) from public, anon, authenticated;
grant execute on function public.cf_new_bot(text) to authenticated;

/*
 * Step two, and the reason a browser can never reach it: the server, holding the
 * master token, says which bot Chatfuel just made for that slot. If a browser
 * could call this, one account could point its own row at another account's bot
 * and the gate would wave it through. Idempotent — a retry that finds the same
 * bot is a no-op, a slot already holding a DIFFERENT bot is a conflict.
 */
create or replace function public.cf_bot_created(p_slot uuid, p_bot_id text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_current text; v_tenant uuid;
begin
  if p_bot_id is null or trim(p_bot_id) = '' then
    raise sqlstate 'PT422' using message = 'A bot id is required', hint = 'bad_bot_id';
  end if;
  select bot_id, tenant_id into v_current, v_tenant from public.cf_bots where id = p_slot for update;
  if not found then
    raise sqlstate 'PT404' using message = 'Bot not found', hint = 'bot_not_found';
  end if;
  if v_current is not null and v_current is distinct from p_bot_id then
    raise sqlstate 'PT409' using message = 'This row already has a bot', hint = 'bot_already_attached';
  end if;
  update public.cf_bots set bot_id = p_bot_id, updated_at = now() where id = p_slot;
  return json_build_object('id', p_slot, 'tenant_id', v_tenant, 'bot_id', p_bot_id);
end $$;
revoke execute on function public.cf_bot_created(uuid, text) from public, anon, authenticated;
grant execute on function public.cf_bot_created(uuid, text) to service_role;

/* The undo for step two: a slot that never got its bot. Never touches a row that
   already holds one, so a mistaken call cannot delete a working bot. */
create or replace function public.cf_drop_bot_slot(p_slot uuid)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.cf_bots where id = p_slot and bot_id is null
$$;
revoke execute on function public.cf_drop_bot_slot(uuid) from public, anon, authenticated;
grant execute on function public.cf_drop_bot_slot(uuid) to service_role;

/*
 * The mirror of cf_bot_created, server-only for the same reason: only the
 * server, holding the master token, can know that Chatfuel no longer has this
 * bot, and letting go of the id is that fact written down.
 *
 * It exists because the row must outlive the bot in exactly one direction. A
 * caller reaches Supabase directly — the anon key is in the bundle by design,
 * and PostgREST is not behind the proxy — so `cf_remove_bot` is callable
 * without the server's delete ever running. If that call dropped the row, the
 * bot would stay in Chatfuel, on the deployment's plan, with nothing left
 * pointing at it, and both ceilings in cf_new_bot (which count rows) would be
 * free again: delete the row, ask for another bot, repeat. So the row holds the
 * id until the server says otherwise, and cf_remove_bot refuses while it does.
 *
 * The row left behind is a slot with no bot — the same shape a reservation
 * waiting on Chatfuel has, and swept by the same sweep in cf_new_bot if the
 * caller's delete never finishes.
 */
create or replace function public.cf_bot_deleted(p_slot uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_bot text;
begin
  select bot_id into v_bot from public.cf_bots where id = p_slot for update;
  update public.cf_bots set bot_id = null, updated_at = now() where id = p_slot;
  return json_build_object('id', p_slot, 'bot_id', v_bot);
end $$;
revoke execute on function public.cf_bot_deleted(uuid) from public, anon, authenticated;
grant execute on function public.cf_bot_deleted(uuid) to service_role;

/* What the server needs before it touches Chatfuel: is this caller allowed to
   administer this bot, and which bot is it? */
create or replace function public.cf_bot_for_admin(p_slot uuid)
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_row public.cf_bots%rowtype;
begin
  perform public.cf_require_bot_admin(p_slot);
  select * into v_row from public.cf_bots where id = p_slot;
  return json_build_object('id', v_row.id, 'tenant_id', v_row.tenant_id,
                           'bot_id', v_row.bot_id, 'name', v_row.name);
end $$;
revoke execute on function public.cf_bot_for_admin(uuid) from public, anon, authenticated;
grant execute on function public.cf_bot_for_admin(uuid) to authenticated;

/* The name shown in the app. The server renames the bot in Chatfuel too, and
   puts `previous_name` back if that fails. */
create or replace function public.cf_rename_bot(p_slot uuid, p_name text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_name text; v_previous text; v_bot text;
begin
  perform public.cf_require_bot_admin(p_slot);
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise sqlstate 'PT422' using message = 'A name is required', hint = 'bad_name';
  end if;
  if length(v_name) > 80 then
    raise sqlstate 'PT422' using message = 'That name is too long', hint = 'name_too_long';
  end if;
  select name, bot_id into v_previous, v_bot from public.cf_bots where id = p_slot for update;
  update public.cf_bots set name = v_name, updated_at = now() where id = p_slot;
  return json_build_object('id', p_slot, 'bot_id', v_bot, 'name', v_name, 'previous_name', v_previous);
end $$;
revoke execute on function public.cf_rename_bot(uuid, text) from public, anon, authenticated;
grant execute on function public.cf_rename_bot(uuid, text) to authenticated;

/* Called AFTER Chatfuel has deleted the bot, so the row never outlives it in the
   other direction: a bot still listed here but gone upstream answers every query
   with an error, while a bot gone from here is simply out of reach. The grants
   go with the row.

   "After" is enforced and not merely documented: the row still holding a
   Chatfuel id is a bot that still exists, and dropping the row then would strand
   it on the deployment's plan and hand the caller its place back under both of
   cf_new_bot's ceilings. The server releases the id through cf_bot_deleted once
   Chatfuel has confirmed the delete, and only then is there a row to remove.
   Reachable by a caller talking to PostgREST directly, which is why the check
   is here rather than in the route. */
create or replace function public.cf_remove_bot(p_slot uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_bot text; v_name text;
begin
  perform public.cf_require_bot_admin(p_slot);
  select bot_id, name into v_bot, v_name from public.cf_bots where id = p_slot for update;
  if v_bot is not null then
    raise sqlstate 'PT409' using message = 'This bot has not been deleted from Chatfuel yet',
      hint = 'bot_still_upstream';
  end if;
  delete from public.cf_bots where id = p_slot;
  return json_build_object('id', p_slot, 'bot_id', v_bot, 'name', v_name);
end $$;
revoke execute on function public.cf_remove_bot(uuid) from public, anon, authenticated;
grant execute on function public.cf_remove_bot(uuid) to authenticated;

/* Per-bot access for a member of the same workspace. Owners and admins are never
   listed: they administer the workspace and see every bot in it. */
create or replace function public.cf_grant_bot(p_slot uuid, p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  v_tenant := public.cf_require_bot_admin(p_slot);
  if not exists (select 1 from public.cf_members where tenant_id = v_tenant and user_id = p_user_id) then
    raise sqlstate 'PT404' using message = 'Member not found', hint = 'member_not_found';
  end if;
  insert into public.cf_bot_members (bot, user_id) values (p_slot, p_user_id)
    on conflict (bot, user_id) do nothing;
end $$;
revoke execute on function public.cf_grant_bot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cf_grant_bot(uuid, uuid) to authenticated;

create or replace function public.cf_revoke_bot(p_slot uuid, p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.cf_require_bot_admin(p_slot);
  delete from public.cf_bot_members where bot = p_slot and user_id = p_user_id;
end $$;
revoke execute on function public.cf_revoke_bot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cf_revoke_bot(uuid, uuid) to authenticated;

/* Every bot of the workspace with who was granted it — the administrator's view,
   which is wider than cf_my_bots_json: an admin may hand out a bot they have not
   opened themselves. */
drop function if exists public.cf_list_bots(uuid);
create or replace function public.cf_list_bots(p_tenant_id uuid)
returns table (id uuid, bot_id text, name text, created_at timestamptz, members uuid[])
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cf_require_admin(p_tenant_id);
  return query
    select b.id, b.bot_id, b.name, b.created_at,
      coalesce((select array_agg(g.user_id order by g.user_id)
                from public.cf_bot_members g where g.bot = b.id), '{}'::uuid[])
    from public.cf_bots b
    where b.tenant_id = p_tenant_id
    order by b.created_at asc;
end $$;
revoke execute on function public.cf_list_bots(uuid) from public, anon, authenticated;
grant execute on function public.cf_list_bots(uuid) to authenticated;

create or replace function public.cf_accept_invite(p_token text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_invite public.cf_invites%rowtype; v_current text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select * into v_invite from public.cf_invites
    where token_hash = public.cf_hash_token(p_token) for update;
  if not found then
    raise sqlstate 'PT404' using message = 'This invite link is not valid', hint = 'invite_not_found';
  end if;
  if v_invite.revoked_at is not null then
    raise sqlstate 'PT410' using message = 'This invite was revoked', hint = 'invite_revoked';
  end if;
  if v_invite.accepted_at is not null then
    raise sqlstate 'PT410' using message = 'This invite was already used', hint = 'invite_accepted';
  end if;
  if v_invite.expires_at <= now() then
    raise sqlstate 'PT410' using message = 'This invite link has expired', hint = 'invite_expired';
  end if;
  if v_invite.email is not null and lower(v_invite.email) is distinct from public.cf_auth_email() then
    raise sqlstate 'PT403' using message = 'This invite is for a different email address', hint = 'email_mismatch';
  end if;
  select role into v_current from public.cf_members
    where tenant_id = v_invite.tenant_id and user_id = auth.uid();
  if v_current is null then
    insert into public.cf_members (tenant_id, user_id, role)
      values (v_invite.tenant_id, auth.uid(), v_invite.role);
  elsif public.cf_role_rank(v_invite.role) > public.cf_role_rank(v_current) then
    update public.cf_members set role = v_invite.role
      where tenant_id = v_invite.tenant_id and user_id = auth.uid();
  end if;
  -- The bots the invite carries. Harmless for an admin, who reaches all of them
  -- anyway; it matters the day they are demoted to member.
  insert into public.cf_bot_members (bot, user_id)
    select b.id, auth.uid() from public.cf_bots b
    where b.tenant_id = v_invite.tenant_id and b.id = any(v_invite.bot_ids)
    on conflict (bot, user_id) do nothing;
  update public.cf_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;
  return public.cf_my_membership(v_invite.tenant_id);
end $$;
revoke execute on function public.cf_accept_invite(text) from public, anon, authenticated;
grant execute on function public.cf_accept_invite(text) to authenticated;

-- ---------------------------------------------------------------- team management (admin+)
-- The `bots` column arrived after the fact, which changes the return type.
drop function if exists public.cf_list_members(uuid);
create or replace function public.cf_list_members(p_tenant_id uuid)
returns table (
  user_id uuid, role text, email text, full_name text, avatar_url text, joined_at timestamptz,
  bots uuid[]
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cf_require_admin(p_tenant_id);
  return query
    select m.user_id, m.role, p.email, p.full_name, p.avatar_url, m.created_at,
      -- Empty for an owner or admin, who reach every bot without a grant.
      coalesce((select array_agg(g.bot order by g.bot)
                from public.cf_bot_members g
                join public.cf_bots b on b.id = g.bot
                where g.user_id = m.user_id and b.tenant_id = p_tenant_id), '{}'::uuid[])
    from public.cf_members m
    left join public.cf_profiles p on p.id = m.user_id
    where m.tenant_id = p_tenant_id
    order by public.cf_role_rank(m.role) desc, m.created_at asc;
end $$;
revoke execute on function public.cf_list_members(uuid) from public, anon, authenticated;
grant execute on function public.cf_list_members(uuid) to authenticated;

drop function if exists public.cf_list_invites(uuid);
create or replace function public.cf_list_invites(p_tenant_id uuid)
returns table (
  id uuid, role text, email text, created_by uuid, created_by_name text,
  created_at timestamptz, expires_at timestamptz, status text, bot_ids uuid[]
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cf_require_admin(p_tenant_id);
  return query
    select i.id, i.role, i.email, i.created_by, coalesce(p.full_name, p.email),
      i.created_at, i.expires_at,
      case
        when i.revoked_at is not null then 'revoked'
        when i.accepted_at is not null then 'accepted'
        when i.expires_at <= now() then 'expired'
        else 'pending' end,
      i.bot_ids
    from public.cf_invites i
    left join public.cf_profiles p on p.id = i.created_by
    where i.tenant_id = p_tenant_id
    order by i.created_at desc;
end $$;
revoke execute on function public.cf_list_invites(uuid) from public, anon, authenticated;
grant execute on function public.cf_list_invites(uuid) to authenticated;

-- `p_bots` arrived after the fact; the four-argument version has to go, or the
-- two of them are an ambiguous overload.
drop function if exists public.cf_create_invite(uuid, text, text, interval);
create or replace function public.cf_create_invite(
  p_tenant_id uuid, p_role text default 'member', p_email text default null,
  p_expires_in interval default interval '7 days', p_bots uuid[] default '{}'
) returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_token text; v_id uuid; v_expires timestamptz; v_bots uuid[];
begin
  perform public.cf_require_admin(p_tenant_id);
  if p_role not in ('admin', 'member') then
    raise sqlstate 'PT422' using message = 'Role must be admin or member', hint = 'bad_role';
  end if;
  if p_expires_in is null or p_expires_in <= interval '0' or p_expires_in > interval '30 days' then
    raise sqlstate 'PT422' using message = 'Expiry must be between 1 hour and 30 days', hint = 'bad_expiry';
  end if;
  -- Silently dropping a foreign bot id would hand somebody a link that grants
  -- less than the person writing it meant.
  select coalesce(array_agg(b.id order by b.id), '{}'::uuid[]) into v_bots
    from public.cf_bots b where b.id = any(coalesce(p_bots, '{}'::uuid[])) and b.tenant_id = p_tenant_id;
  if coalesce(array_length(p_bots, 1), 0) <> coalesce(array_length(v_bots, 1), 0) then
    raise sqlstate 'PT404' using message = 'That bot is not in this workspace', hint = 'bot_not_found';
  end if;
  v_token := public.cf_new_token();
  v_expires := now() + p_expires_in;
  insert into public.cf_invites (tenant_id, token_hash, role, email, created_by, expires_at, bot_ids)
    values (p_tenant_id, public.cf_hash_token(v_token), p_role,
            nullif(lower(trim(p_email)), ''), auth.uid(), v_expires, v_bots)
    returning id into v_id;
  return json_build_object(
    'id', v_id, 'token', v_token, 'role', p_role,
    'email', nullif(lower(trim(p_email)), ''), 'expires_at', v_expires, 'bot_ids', v_bots
  );
end $$;
revoke execute on function public.cf_create_invite(uuid, text, text, interval, uuid[]) from public, anon, authenticated;
grant execute on function public.cf_create_invite(uuid, text, text, interval, uuid[]) to authenticated;

create or replace function public.cf_revoke_invite(p_invite_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_tenant uuid;
begin
  select tenant_id into v_tenant from public.cf_invites where id = p_invite_id;
  if v_tenant is null then
    raise sqlstate 'PT404' using message = 'Invite not found', hint = 'invite_not_found';
  end if;
  perform public.cf_require_admin(v_tenant);
  update public.cf_invites set revoked_at = now()
    where id = p_invite_id and revoked_at is null and accepted_at is null;
end $$;
revoke execute on function public.cf_revoke_invite(uuid) from public, anon, authenticated;
grant execute on function public.cf_revoke_invite(uuid) to authenticated;

create or replace function public.cf_change_member_role(p_tenant_id uuid, p_user_id uuid, p_role text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_caller text; v_target text;
begin
  v_caller := public.cf_require_admin(p_tenant_id);
  if p_role not in ('admin', 'member') then
    raise sqlstate 'PT422' using message = 'Role must be admin or member', hint = 'bad_role';
  end if;
  if p_user_id = auth.uid() then
    raise sqlstate 'PT422' using message = 'You cannot change your own role', hint = 'self_target';
  end if;
  select role into v_target from public.cf_members where tenant_id = p_tenant_id and user_id = p_user_id;
  if v_target is null then
    raise sqlstate 'PT404' using message = 'Member not found', hint = 'member_not_found';
  end if;
  if v_target = 'owner' then
    raise sqlstate 'PT409' using message = 'The owner''s role changes only by transferring ownership', hint = 'is_owner';
  end if;
  -- An admin may act on people BELOW them and not on their equals. Without this
  -- an admin demotes a fellow admin and is then above them for every rule that
  -- reads a rank — cf_recovery_authorize among them, which is a password-reset
  -- link for the account they just lowered.
  if public.cf_role_rank(v_target) >= public.cf_role_rank(v_caller) then
    raise sqlstate 'PT403'
      using message = 'You can only change the role of members below your own', hint = 'rank';
  end if;
  update public.cf_members set role = p_role where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;
revoke execute on function public.cf_change_member_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.cf_change_member_role(uuid, uuid, text) to authenticated;

create or replace function public.cf_remove_member(p_tenant_id uuid, p_user_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_caller text; v_target text;
begin
  v_caller := public.cf_require_admin(p_tenant_id);
  if p_user_id = auth.uid() then
    raise sqlstate 'PT422' using message = 'Use "Leave workspace" to remove yourself', hint = 'self_target';
  end if;
  select role into v_target from public.cf_members where tenant_id = p_tenant_id and user_id = p_user_id;
  if v_target is null then
    raise sqlstate 'PT404' using message = 'Member not found', hint = 'member_not_found';
  end if;
  if v_target = 'owner' then
    raise sqlstate 'PT409' using message = 'The owner cannot be removed', hint = 'is_owner';
  end if;
  -- The same rank rule as cf_change_member_role: an admin does not get to throw
  -- out the admin standing beside them. Only the owner outranks an admin.
  if public.cf_role_rank(v_target) >= public.cf_role_rank(v_caller) then
    raise sqlstate 'PT403'
      using message = 'You can only remove members below your own role', hint = 'rank';
  end if;
  delete from public.cf_bot_members g using public.cf_bots b
    where g.bot = b.id and b.tenant_id = p_tenant_id and g.user_id = p_user_id;
  delete from public.cf_members where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;
revoke execute on function public.cf_remove_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cf_remove_member(uuid, uuid) to authenticated;

create or replace function public.cf_transfer_ownership(p_tenant_id uuid, p_new_owner uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.cf_require_owner(p_tenant_id);
  if p_new_owner = auth.uid() then
    raise sqlstate 'PT422' using message = 'You already own this workspace', hint = 'self_target';
  end if;
  if not exists (select 1 from public.cf_members where tenant_id = p_tenant_id and user_id = p_new_owner) then
    raise sqlstate 'PT404' using message = 'The new owner must already be a member', hint = 'member_not_found';
  end if;
  -- order matters for the single-owner partial unique index
  update public.cf_members set role = 'admin' where tenant_id = p_tenant_id and user_id = auth.uid();
  update public.cf_members set role = 'owner' where tenant_id = p_tenant_id and user_id = p_new_owner;
end $$;
revoke execute on function public.cf_transfer_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cf_transfer_ownership(uuid, uuid) to authenticated;

/*
 * A workspace can lose its owner — their auth user was deleted — and only an
 * owner may transfer ownership, so without this an ownerless workspace could
 * never have one again. An admin who is already inside takes it; nobody new
 * can walk in this way.
 */
create or replace function public.cf_claim_ownership(p_tenant_id uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.cf_require_admin(p_tenant_id);
  perform 1 from public.cf_tenants where id = p_tenant_id for update;
  if exists (select 1 from public.cf_members where tenant_id = p_tenant_id and role = 'owner') then
    raise sqlstate 'PT409' using message = 'This workspace already has an owner', hint = 'owner_exists';
  end if;
  update public.cf_members set role = 'owner'
    where tenant_id = p_tenant_id and user_id = auth.uid();
  return public.cf_my_membership(p_tenant_id);
end $$;
revoke execute on function public.cf_claim_ownership(uuid) from public, anon, authenticated;
grant execute on function public.cf_claim_ownership(uuid) to authenticated;

create or replace function public.cf_leave_tenant(p_tenant_id uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_role text;
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  select role into v_role from public.cf_members where tenant_id = p_tenant_id and user_id = auth.uid();
  if v_role is null then
    raise sqlstate 'PT404' using message = 'You are not a member of this workspace', hint = 'member_not_found';
  end if;
  if v_role = 'owner' then
    raise sqlstate 'PT409' using message = 'Transfer ownership before leaving', hint = 'owner_cannot_leave';
  end if;
  delete from public.cf_bot_members g using public.cf_bots b
    where g.bot = b.id and b.tenant_id = p_tenant_id and g.user_id = auth.uid();
  delete from public.cf_members where tenant_id = p_tenant_id and user_id = auth.uid();
end $$;
revoke execute on function public.cf_leave_tenant(uuid) from public, anon, authenticated;
grant execute on function public.cf_leave_tenant(uuid) to authenticated;

-- (The workspace name comes from the wizard; there is no in-app settings surface.)

-- ---------------------------------------------------------------- recovery links (admin+)
/*
 * Who may mint a password-recovery link for whom, and the trail one leaves.
 *
 * The proxy's POST /chatfuel/auth/recovery-link asks GoTrue for a link and
 * writes it to the server log. That link resets an ACCOUNT, not a membership,
 * and the route can only see ONE workspace's slice of cf_members — so the
 * decision does not belong there. An account that stands in two workspaces
 * would carry an admin of the first into the second, where they hold no role
 * at all, and the route would never learn the second exists.
 */
create table if not exists public.cf_recovery_events (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.cf_tenants (id) on delete cascade,
  issuer        uuid references public.cf_profiles (id) on delete set null,
  target        uuid references public.cf_profiles (id) on delete set null,
  -- Kept beside `target`, which goes null when the profile does: the row has to
  -- still say who was reset after the account it names is gone.
  target_email  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists cf_recovery_events_tenant_idx on public.cf_recovery_events (tenant_id, created_at desc);
create index if not exists cf_recovery_events_target_idx on public.cf_recovery_events (target, created_at desc);
alter table public.cf_recovery_events enable row level security;
revoke all on table public.cf_recovery_events from anon, authenticated;

/*
 * The whole authorization for one link, run AS THE CALLER: it raises on refusal
 * and writes the audit row on success, in one transaction. So a refused attempt
 * leaves no row, and a row that exists was authorized.
 *
 * The row records the AUTHORIZATION, not the delivery — the proxy mints the
 * link after this returns, and that can still fail. An event with no link is
 * the safe direction to be wrong in.
 */
create or replace function public.cf_recovery_authorize(p_tenant_id uuid, p_email text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_caller text; v_target uuid; v_target_role text; v_email text;
begin
  v_caller := public.cf_require_admin(p_tenant_id);
  v_email := lower(trim(coalesce(p_email, '')));
  select m.user_id, m.role into v_target, v_target_role
    from public.cf_members m
    join public.cf_profiles p on p.id = m.user_id
    where m.tenant_id = p_tenant_id and lower(p.email) = v_email;
  if v_target is null then
    raise sqlstate 'PT403' using message = 'That email is not a member of this workspace', hint = 'not_member';
  end if;
  -- A link is a working credential for the target's account, so the caller may
  -- issue one only for somebody strictly below them: an admin who could mint
  -- the owner's link would be the owner.
  if public.cf_role_rank(v_target_role) >= public.cf_role_rank(v_caller) then
    raise sqlstate 'PT403'
      using message = 'You can only issue recovery links for members below your role', hint = 'rank';
  end if;
  -- The rank above is this workspace's; the credential is not. Only a workspace
  -- that has the account to itself may reset it.
  if exists (select 1 from public.cf_members
             where user_id = v_target and tenant_id <> p_tenant_id) then
    raise sqlstate 'PT403'
      using message = 'That member belongs to another workspace too — only their own workspace can reset them',
            hint = 'cross_tenant';
  end if;
  insert into public.cf_recovery_events (tenant_id, issuer, target, target_email)
    values (p_tenant_id, auth.uid(), v_target, v_email);
end $$;
revoke execute on function public.cf_recovery_authorize(uuid, text) from public, anon, authenticated;
grant execute on function public.cf_recovery_authorize(uuid, text) to authenticated;

/* What a workspace's admins can see of the trail. */
create or replace function public.cf_list_recovery_events(p_tenant_id uuid)
returns table (issuer_email text, target_email text, issued_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cf_require_admin(p_tenant_id);
  return query
    select p.email, e.target_email, e.created_at
      from public.cf_recovery_events e
      left join public.cf_profiles p on p.id = e.issuer
      where e.tenant_id = p_tenant_id
      order by e.created_at desc
      limit 200;
end $$;
revoke execute on function public.cf_list_recovery_events(uuid) from public, anon, authenticated;
grant execute on function public.cf_list_recovery_events(uuid) to authenticated;

/*
 * And what the TARGET can see, across every workspace at once and without being
 * an admin of any. Somebody who had a reset link minted for their account is
 * the person with the most reason to know it happened, and the least standing
 * to ask the admin who did it.
 */
create or replace function public.cf_my_recovery_events()
returns table (issuer_email text, issued_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise sqlstate 'PT401' using message = 'Sign in first', hint = 'unauthenticated';
  end if;
  return query
    select p.email, e.created_at
      from public.cf_recovery_events e
      left join public.cf_profiles p on p.id = e.issuer
      where e.target = auth.uid()
      order by e.created_at desc
      limit 200;
end $$;
revoke execute on function public.cf_my_recovery_events() from public, anon, authenticated;
grant execute on function public.cf_my_recovery_events() to authenticated;

-- ------------------------------------------------- the fence's shared memory
--
-- The proxy fences the ids INSIDE a bot — flowID, blockElementID, contactID,
-- conversationID — against a memory of its own traffic: every one of those ids
-- reaches a browser inside an answer the bot fence had already checked, so the
-- proxy writes down which bot each was handed out under and refuses a later
-- request that names somebody else's.
--
-- That memory is a Map in one Node process, so it is per-instance and does not
-- outlive a restart. This table is the same memory, shared by every instance of
-- the deployment. The proxy still learns for free, in memory, from every answer
-- it relays; what it writes here is only the ids a caller actually NAMES in a
-- request — a handful per session, against the thousands in a canvas — so the
-- table stays the size of what is in use rather than the size of what exists.
--
-- Nothing here is a customer's data: a 24-hex id and the bot it was seen under.
-- It is written and read by the SERVER only (service_role), because a caller
-- who could read it could ask which bot an id belongs to, which is the question
-- the fence exists to refuse.

/*
 * One id, and the bot it was handed out under.
 *
 * `bot_id` null means SHARED — the id was seen under a second bot, so it
 * belongs to no one of them and the fence refuses nobody for it. That is the
 * same rule the in-memory store follows, and it is what makes a mistaken
 * binding self-healing: the rightful owner's own next read writes the second
 * bot, the row goes shared, and the fence stops refusing.
 *
 * `updated_at` is the whole of the retention policy. A row older than a day is
 * invisible to a lookup and deleted by the next write; a binding that expires
 * only ever costs the fence knowledge, never access.
 */
create table if not exists public.cf_resource_owner (
  resource_id  text primary key,
  bot_id       text,
  updated_at   timestamptz not null default now()
);
create index if not exists cf_resource_owner_age_idx on public.cf_resource_owner (updated_at);
alter table public.cf_resource_owner enable row level security;
revoke all on table public.cf_resource_owner from anon, authenticated;

/*
 * What the deployment knows about these ids, for the proxy that is holding a
 * request open on the answer.
 *
 * Ids the table has never seen are simply absent from the result — the caller
 * reads "unknown", which is the state the fence already has a rule for. The
 * age filter is the TTL: an old row is not an answer, and the write below is
 * what eventually removes it.
 */
create or replace function public.cf_resource_owner_lookup(p_ids text[])
returns table (resource_id text, bot_id text)
language sql stable security definer set search_path = '' as $$
  select o.resource_id, o.bot_id
    from public.cf_resource_owner o
    join unnest(coalesce(p_ids, '{}'::text[])) as q(id) on q.id = o.resource_id
   where o.updated_at > now() - interval '24 hours'
   limit 1000
$$;
revoke execute on function public.cf_resource_owner_lookup(text[]) from public, anon, authenticated;
grant execute on function public.cf_resource_owner_lookup(text[]) to service_role;

/*
 * Record what one instance learned, so the others need not learn it again.
 *
 * `p_bot_id` null or empty means SHARED — the proxy saw this id under two bots
 * and is saying so, which is the correction that undoes a wrong binding
 * anywhere in the deployment.
 *
 * The conflict rule is the in-memory store's, written once here: an id already
 * held for a DIFFERENT bot goes shared rather than changing hands, so no
 * sequence of writes can move a resource from its owner to somebody else. The
 * arguments are filtered rather than rejected — this is a machine caller on a
 * request's critical path, and refusing a whole batch for one odd id would turn
 * a fence into an outage.
 */
create or replace function public.cf_resource_bind(p_bot_id text, p_ids text[])
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_bot text;
begin
  v_bot := lower(trim(coalesce(p_bot_id, '')));
  if v_bot <> '' and v_bot !~ '^[0-9a-f]{24}$' then
    raise sqlstate 'PT400' using message = 'That is not a bot id', hint = 'bad_bot_id';
  end if;
  insert into public.cf_resource_owner as o (resource_id, bot_id)
  select s.id, nullif(v_bot, '')
    from (
      select distinct lower(t.id) as id
        from unnest(coalesce(p_ids, '{}'::text[])) as t(id)
       where lower(t.id) ~ '^[0-9a-f]{24}$'
       limit 500
    ) s
   -- The bot's own id travels in its answers. Binding it would refuse the very
   -- request that names it, so it is not a resource here.
   where s.id <> v_bot
      on conflict (resource_id) do update
         set bot_id = case
               when o.bot_id is distinct from excluded.bot_id then null
               else excluded.bot_id
             end,
             updated_at = now();
  -- The retention policy, paid for by the writes rather than by a job: a
  -- bounded bite of what a lookup can no longer see. Nothing depends on it
  -- running — an expired row is already invisible above.
  delete from public.cf_resource_owner
   where resource_id in (
     select r.resource_id
       from public.cf_resource_owner r
      where r.updated_at < now() - interval '24 hours'
      limit 200
   );
end $$;
revoke execute on function public.cf_resource_bind(text, text[]) from public, anon, authenticated;
grant execute on function public.cf_resource_bind(text, text[]) to service_role;

-- ------------------------------------------ the admin door's attempt counter
--
/*
 * How many times a caller has got ADMIN_PASSWORD wrong, kept somewhere every
 * instance can see it.
 *
 * The proxy counts attempts in memory, and on a server that stays up that is
 * the whole story. On a host that answers each request from a fresh instance
 * it is not: the counter a guess landed on is gone before the next guess
 * arrives, and an attacker who opens enough connections at once is never
 * counted twice in the same place. What is left in front of the door is a
 * 250 ms pause and the length of the password. This table is that counter with
 * somewhere to live, shared by every instance of the deployment.
 *
 * `key` is whatever the proxy decided to count against — the socket address,
 * or the edge's hop where the deployment trusts one (`throttleKey` in
 * adminSession.ts). It is opaque here and never read back out: the functions
 * below answer in milliseconds and nothing else.
 *
 * `seen_at` is the whole retention policy. An hour after the last wrong answer
 * the row means nothing, and the next write deletes a bite of what has aged
 * out; a row that survives longer costs nothing but its own bytes.
 *
 * The lock is the upsert's. Two instances answering two guesses at once
 * contend on the one row, and the second waits for the first — which is the
 * point, since a counter that both of them increment from the same starting
 * value is the counter they each had in memory.
 *
 * RPC-only and service-role-only: the caller is the proxy holding the master
 * credentials, never a browser.
 */
create table if not exists public.cf_admin_attempts (
  key     text primary key,
  fails   integer not null,
  until   timestamptz not null,
  seen_at timestamptz not null default now()
);
create index if not exists cf_admin_attempts_age_idx on public.cf_admin_attempts (seen_at);
alter table public.cf_admin_attempts enable row level security;
revoke all on table public.cf_admin_attempts from anon, authenticated;

/* How much longer this key must wait. No row is no wait, which the proxy reads
   as zero — a null here is "never got one wrong", not an error. */
create or replace function public.cf_admin_attempt_wait(p_key text)
returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0, ceil(extract(epoch from (a.until - now())) * 1000))::integer
    from public.cf_admin_attempts a
   where a.key = left(coalesce(p_key, ''), 100)
$$;
revoke execute on function public.cf_admin_attempt_wait(text) from public, anon, authenticated;
grant execute on function public.cf_admin_attempt_wait(text) to service_role;

/*
 * Record a wrong password and answer with the wait it earned.
 *
 * The curve is the in-memory throttle's, written once more here so the two
 * agree: three wrong answers cost nothing, and every one after that doubles
 * the wait up to the ceiling the caller passes — which is lower when the
 * bucket is shared by everybody behind an untrusted edge, because there the
 * long wait is something one caller imposes on the admin.
 *
 * The exponent is capped before it is raised: a counter that has been climbing
 * all day must not turn into a number too large to hold, and past the ceiling
 * the answer is the ceiling either way.
 */
create or replace function public.cf_admin_attempt_fail(p_key text, p_max_ms integer)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  v_key   text := left(coalesce(p_key, ''), 100);
  v_max   integer := least(greatest(coalesce(p_max_ms, 0), 0), 3600000);
  v_fails integer;
  v_wait  integer;
begin
  insert into public.cf_admin_attempts as a (key, fails, until)
    values (v_key, 1, now())
    on conflict (key) do update set
      fails = case when a.seen_at < now() - interval '1 hour' then 1 else a.fails + 1 end,
      seen_at = now()
    returning a.fails into v_fails;
  v_wait := case
    when v_fails > 3 then least(1000 * power(2, least(v_fails - 4, 20))::bigint, v_max)::integer
    else 0 end;
  update public.cf_admin_attempts
     set until = now() + make_interval(secs => v_wait / 1000.0)
   where key = v_key;
  -- The retention policy, paid for by the writes rather than by a job.
  delete from public.cf_admin_attempts
   where key in (
     select t.key from public.cf_admin_attempts t
      where t.seen_at < now() - interval '1 hour'
      limit 200
   );
  return v_wait;
end $$;
revoke execute on function public.cf_admin_attempt_fail(text, integer) from public, anon, authenticated;
grant execute on function public.cf_admin_attempt_fail(text, integer) to service_role;

/* A right password forgets the history, exactly as the in-memory one does. */
create or replace function public.cf_admin_attempt_clear(p_key text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.cf_admin_attempts where key = left(coalesce(p_key, ''), 100)
$$;
revoke execute on function public.cf_admin_attempt_clear(text) from public, anon, authenticated;
grant execute on function public.cf_admin_attempt_clear(text) to service_role;

-- ------------------------------------------------- a bot held on the workspace
--
-- A workspace holds its bots in `cf_bots`. A project that still carries
-- `cf_tenants.bot_id` has one there instead, so the whole block is guarded on
-- that column: on a project this file created it does nothing at all, and it
-- stays a no-op on every later re-run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cf_tenants' and column_name = 'bot_id'
  ) then
    -- The workspace's name was the bot's name too, so it carries over.
    insert into public.cf_bots (tenant_id, bot_id, name, created_by, created_at)
      select t.id, t.bot_id, t.name, t.created_by, t.created_at
      from public.cf_tenants t
      where t.bot_id is not null
        and not exists (select 1 from public.cf_bots b where b.bot_id = t.bot_id);

    -- A bot held on the workspace is reachable by every member of it, and the
    -- move must not take that away: the members who had it are granted the row
    -- it became, owners and admins excepted — they need no grant. Inside the
    -- guard on purpose: run again later and it would hand back access that
    -- somebody has since deliberately revoked.
    insert into public.cf_bot_members (bot, user_id)
      select b.id, m.user_id
      from public.cf_bots b
      join public.cf_members m on m.tenant_id = b.tenant_id
      where m.role = 'member'
      on conflict (bot, user_id) do nothing;

    alter table public.cf_tenants drop column bot_id;
  end if;
end $$;

-- ---------------------------------------------------------------- bookkeeping
insert into public.cf_migrations (name) values ('0001_auth') on conflict (name) do nothing;
notify pgrst, 'reload schema';
