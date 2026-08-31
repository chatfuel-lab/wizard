-- ============================================================================
-- chatfuel-wizard · Instagram · migration 0001
--
-- The publish queue this deployment runs for itself, because the Chatfuel API
-- has none. Its publish mutations go out immediately and it stores no post: the
-- only scheduledPublishTime in the whole schema belongs to another network and
-- is read-only. So a post written today and due tomorrow morning has to live
-- somewhere that is awake at that hour, and this file is that somewhere:
--
--   cf_pub_posts    the posts themselves, in every state from draft to published
--   cf_pub_config   where this deployment answers, and how the scheduler proves
--                  to it that a callback really came from here
--   cf_pub_claim_due()  every minute: take what is due and knock on that door
--   cf_pub_reap()       every minute: rescue a claim nobody ever came back for
--   cf_pub_report()     the app writing the outcome back
--
-- Everything is prefixed cf_pub_ because this project may also be carrying the
-- deployer's own tables, and the other modules' cf_ objects.
--
-- Contract:
--   * Idempotent — safe to re-run on the same project (create … if not exists,
--     create or replace, drop policy if exists).
--   * Tables are RPC-ONLY: RLS is on with no policies and grants are revoked;
--     the cf_pub_* SECURITY DEFINER functions below are the whole read/write
--     surface. Nothing reaches these rows through PostgREST's table endpoints.
--   * Every function: security definer, set search_path = '' (so only pg_catalog
--     resolves implicitly and every other name is written out in full), execute
--     REVOKED from public/anon/authenticated and granted back explicitly.
--     Supabase default-grants EXECUTE on new public functions to anon — do not
--     skip the revoke when adding a function.
--   * Errors: raise sqlstate 'PT4xx' with the machine code in HINT; PostgREST
--     maps PTnnn to HTTP nnn (401 unauthenticated · 403 not allowed · 404 not
--     found · 409 conflict · 422 invalid). Clients switch on the hint.
--   * Secrets are stored as sha256, base64. Never 64-hex: a log scrubber that
--     masks 64-hex strings would make such a secret invisible in exactly the
--     logs somebody would need to read.
--
-- THE SHARED SECRET, AND WHY IT TRAVELS IN TWO SHAPES.
-- One secret is generated at install time and written into the app's own
-- environment. The database never learns it — it stores only sha256(secret),
-- base64 — and that single stored value does both jobs:
--
--   database to app   cf_pub_claim_due() sends the HASH as the callback's
--                     credential. The app hashes the secret it holds and
--                     compares, in constant time.
--   app to database   cf_pub_report() is given the RAW secret and hashes it to
--                     compare with the stored value.
--
-- What that buys, exactly: the database's storage does not yield the app's
-- credential. The hash is the database's own credential, so whoever reads
-- cf_pub_config can call the app as the database - which is a request to record
-- an outcome, and nothing more. The raw secret, which is what cf_pub_report
-- takes, is only ever in the app's environment. So no second high-value key has
-- to be handed to the part of the system that only ever records an outcome. (The comparison inside
-- cf_pub_report is a plain one on digests: an attacker chooses the pre-image, not
-- the digest, so there is nothing for a timing difference to reveal.)
--
-- THE CALLBACK IS FIRE-AND-FORGET. net.http_post returns as soon as the request
-- is queued and its answer lands later in net._http_response — which a publish
-- that takes five minutes can easily outlive. So the HTTP response is never the
-- source of truth: the app writes the outcome back itself through cf_pub_report,
-- and this file is written for a callback that is simply lost (cf_pub_reap).
--
-- DURABLE MEDIA. Files uploaded to the platform's own storage are deleted two
-- hours after they arrive, and nothing in its API exposes that deadline. A post
-- scheduled for tomorrow would therefore be published from a URL that has
-- stopped resolving, and the failure would arrive from the network with nothing
-- useful in it. So a bucket on this project holds the bytes instead: public,
-- because the network fetches them itself and cannot present a credential, and
-- keyed by bot id so one tenant's media is separable from another's.
-- ============================================================================

-- ---------------------------------------------------------------- extensions
-- pg_cron runs the two jobs; pg_net is how the database reaches the app. Both
-- ship enabled on every Supabase project, the free plan included. pg_cron is not
-- relocatable and belongs in pg_catalog (it puts its own functions in a `cron`
-- schema regardless); pg_net names its own schema, so it is created without one.
-- Guarded on availability so a project without them still gets the tables and
-- the routes — it just has no scheduler, which is exactly what the app's
-- "can this deployment schedule?" answer is for.
do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
  end if;
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- ---------------------------------------------------------------- tables
-- One post, in whatever state it has reached.
--
-- `status` and `scheduled_at` are kept in step by the functions below: a post
-- with a time is `scheduled`, a post without one is a `draft`. The partial index
-- that finds what is due depends on that, and so does every retry. A patch that
-- names a status the time contradicts is refused, not quietly repaired.
create table if not exists public.cf_pub_posts (
  id            uuid primary key default gen_random_uuid(),
  bot_id        text not null,
  kind          text not null check (kind in ('post', 'reel', 'story', 'carousel')),
  caption       text not null default '',
  -- The composer's media list, verbatim: id, type, url, and where the url came
  -- from. Stored whole because the app owns its shape and this side only ever
  -- reads `type` and `url` out of it, at publish time.
  media         jsonb not null default '[]'::jsonb,
  -- Reel-only settings (cover, share-to-feed, thumbnail offset). Null on
  -- everything else.
  reel          jsonb,
  scheduled_at  timestamptz,
  status        text not null default 'draft'
                check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  -- When the scheduler took this row and sent a callback for it.
  claimed_at    timestamptz,
  -- When the app answered that callback and started publishing. The two are
  -- separate because they fail differently: a claim never taken means the
  -- request was lost and nothing ran, which is safe to retry; a claim taken and
  -- then silent means the publish may already be on the network, which is not.
  taken_at      timestamptz,
  attempts      int not null default 0,
  media_id      text,
  permalink     text,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cf_pub_posts_bot_idx on public.cf_pub_posts (bot_id, updated_at desc);
-- What is due, which is the only question the scheduler asks.
create index if not exists cf_pub_posts_due_idx on public.cf_pub_posts (scheduled_at)
  where status = 'scheduled';
-- What has been claimed too long, which is the only question the reaper asks.
create index if not exists cf_pub_posts_claimed_idx on public.cf_pub_posts (claimed_at)
  where status = 'publishing';

-- Where this deployment answers, and what the scheduler must present to be let
-- in. One row, forever: `singleton` is the primary key and is checked true.
--
-- `bypass_secret` is the one value here kept in the clear, and it has to be:
-- it is the host's own deployment-protection token, sent verbatim as a request
-- header, and a hash of it would not open anything. It is written by the app
-- from its own environment and never read back out — cf_pub_config_json() answers
-- whether it is set, not what it is.
create table if not exists public.cf_pub_config (
  singleton             boolean primary key default true,
  publish_url           text,
  bypass_secret         text,
  callback_secret_hash  text,
  updated_at            timestamptz not null default now(),
  constraint cf_pub_config_single_row check (singleton)
);
insert into public.cf_pub_config (singleton) values (true) on conflict (singleton) do nothing;

create table if not exists public.cf_pub_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);

alter table public.cf_pub_posts      enable row level security;
alter table public.cf_pub_config     enable row level security;
alter table public.cf_pub_migrations enable row level security;

revoke all on table public.cf_pub_posts, public.cf_pub_migrations from anon, authenticated;
-- The config row holds the host's bypass token, so it is taken away from the
-- service role as well: everything that needs it goes through a function that
-- knows what may be answered, and nothing needs to read the table itself.
revoke all on table public.cf_pub_config from anon, authenticated, service_role;

-- ---------------------------------------------------------------- helpers (no grants)
-- sha256, base64. In the core catalog, so this needs no extension.
create or replace function public.cf_pub_hash(p_secret text)
returns text language sql immutable security definer set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'base64')
$$;
revoke execute on function public.cf_pub_hash(text) from public, anon, authenticated;

/* ISO 8601 in UTC, with a Z rather than an offset: the app sorts these as plain
   strings, so every timestamp it is given has to be written the same way. */
create or replace function public.cf_pub_iso(p_at timestamptz)
returns text language sql immutable security definer set search_path = '' as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;
revoke execute on function public.cf_pub_iso(timestamptz) from public, anon, authenticated;

/* One post in the shape the app reads. `reel` is dropped rather than sent as
   null — it is the one genuinely optional field, and the rest are declared
   nullable on the other side. */
create or replace function public.cf_pub_post_json(p_row public.cf_pub_posts)
returns json language sql stable security definer set search_path = '' as $$
  select (
    jsonb_build_object(
      'id', p_row.id,
      'kind', p_row.kind,
      'caption', p_row.caption,
      'media', p_row.media,
      'scheduledAt', public.cf_pub_iso(p_row.scheduled_at),
      'status', p_row.status,
      'attempts', p_row.attempts,
      'mediaId', p_row.media_id,
      'permalink', p_row.permalink,
      'error', p_row.error,
      'createdAt', public.cf_pub_iso(p_row.created_at),
      'updatedAt', public.cf_pub_iso(p_row.updated_at)
    )
    || case when p_row.reel is null then '{}'::jsonb else jsonb_build_object('reel', p_row.reel) end
  )::json
$$;
revoke execute on function public.cf_pub_post_json(public.cf_pub_posts) from public, anon, authenticated;

/* The caption ceiling the network enforces, counted the way it counts: in
   CODEPOINTS, not UTF-16 units — 2200 astral characters are accepted and 2201
   are refused. Postgres length() already counts characters, which is why this
   is one call and not a conversion. Checked here so a post that could never go
   out is refused while somebody is still looking at it, rather than at six
   tomorrow morning with nothing on screen to read. */
create or replace function public.cf_pub_check_caption(p_caption text)
returns text language plpgsql immutable security definer set search_path = '' as $$
begin
  if length(coalesce(p_caption, '')) > 2200 then
    raise sqlstate 'PT422' using message = 'That caption is too long', hint = 'caption_too_long';
  end if;
  return coalesce(p_caption, '');
end $$;
revoke execute on function public.cf_pub_check_caption(text) from public, anon, authenticated;

/* A timestamp the app sent, or null. Anything unparseable is the caller's
   mistake and is said as one — without this it surfaces as a 500. */
create or replace function public.cf_pub_time(p_value text)
returns timestamptz language plpgsql immutable security definer set search_path = '' as $$
begin
  return nullif(trim(coalesce(p_value, '')), '')::timestamptz;
exception when others then
  raise sqlstate 'PT422' using message = 'That is not a valid time', hint = 'bad_time';
end $$;
revoke execute on function public.cf_pub_time(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- the app's own reads and writes
/* What the app may know about its own configuration: whether it is registered
   and whether the two secrets are there — never the secrets. */
create or replace function public.cf_pub_config_json()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'publish_url', c.publish_url,
    'has_bypass', c.bypass_secret is not null,
    'has_secret', c.callback_secret_hash is not null,
    'updated_at', public.cf_pub_iso(c.updated_at)
  )
  from public.cf_pub_config c where c.singleton
$$;
revoke execute on function public.cf_pub_config_json() from public, anon, authenticated;
grant execute on function public.cf_pub_config_json() to service_role;

/* Where to knock. Called by the app with a URL derived from a request it
   actually received, so the value can only ever be somewhere this deployment
   really answers. A null argument leaves what is already recorded alone, which
   is what makes re-registering after a redeploy cheap. */
create or replace function public.cf_pub_register(p_url text, p_bypass text default null, p_secret_hash text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_url is null or trim(p_url) = '' then
    raise sqlstate 'PT422' using message = 'A callback address is required', hint = 'bad_url';
  end if;
  if p_url !~ '^https?://' then
    raise sqlstate 'PT422' using message = 'The callback address must be an http or https URL', hint = 'bad_url';
  end if;
  -- The shared secret rides this address in a header, once a minute, forever.
  -- Over plain http that is the credential in the clear on every tick, which is
  -- a worse trade than any deployment gets out of it. The exception is a server
  -- on this machine, where there is no wire to read it off.
  if p_url !~ '^https://' and p_url !~ '^http://(localhost|127\.0\.0\.1)([:/]|$)' then
    raise sqlstate 'PT422'
      using message = 'The callback address must be https — the shared secret travels on it',
            hint = 'insecure_url';
  end if;
  insert into public.cf_pub_config (singleton, publish_url, bypass_secret, callback_secret_hash)
    values (true, trim(p_url), p_bypass, p_secret_hash)
  on conflict (singleton) do update set
    publish_url = excluded.publish_url,
    bypass_secret = coalesce(excluded.bypass_secret, public.cf_pub_config.bypass_secret),
    callback_secret_hash = coalesce(excluded.callback_secret_hash, public.cf_pub_config.callback_secret_hash),
    updated_at = now();
  return public.cf_pub_config_json();
end $$;
revoke execute on function public.cf_pub_register(text, text, text) from public, anon, authenticated;
grant execute on function public.cf_pub_register(text, text, text) to service_role;

/* Everything one bot has, newest activity first.
 *
 * Capped, because the whole list is held in a browser: an account posting daily
 * for three years would otherwise send back a document that grows forever and a
 * calendar that renders all of it. What falls off the end is the oldest already
 * published work, which is on the network and readable there.
 */
create or replace function public.cf_pub_list(p_bot_id text)
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x.post order by x.updated_at desc, x.id), '[]'::json)
  from (
    select public.cf_pub_post_json(p) as post, p.updated_at, p.id
    from public.cf_pub_posts p
    where p.bot_id = p_bot_id
    order by p.updated_at desc, p.id
    limit 1000
  ) x
$$;
revoke execute on function public.cf_pub_list(text) from public, anon, authenticated;
grant execute on function public.cf_pub_list(text) to service_role;

/* A new post. The caller does not send a status: a post with a time is
   scheduled and a post without one is a draft, and that is the invariant the
   due index is built on. */
create or replace function public.cf_pub_create(p_bot_id text, p_post jsonb)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_row public.cf_pub_posts%rowtype; v_kind text; v_media jsonb; v_at timestamptz;
begin
  if p_bot_id is null or trim(p_bot_id) = '' then
    raise sqlstate 'PT422' using message = 'A bot is required', hint = 'bad_bot_id';
  end if;
  v_kind := p_post ->> 'kind';
  if v_kind is null or v_kind not in ('post', 'reel', 'story', 'carousel') then
    raise sqlstate 'PT422' using message = 'That is not a kind of post', hint = 'bad_kind';
  end if;
  v_media := coalesce(p_post -> 'media', '[]'::jsonb);
  if jsonb_typeof(v_media) <> 'array' then
    raise sqlstate 'PT422' using message = 'Media must be a list', hint = 'bad_media';
  end if;
  v_at := public.cf_pub_time(p_post ->> 'scheduledAt');
  insert into public.cf_pub_posts (bot_id, kind, caption, media, reel, scheduled_at, status)
  values (
    trim(p_bot_id),
    v_kind,
    public.cf_pub_check_caption(p_post ->> 'caption'),
    v_media,
    case when jsonb_typeof(p_post -> 'reel') = 'object' then p_post -> 'reel' end,
    v_at,
    case when v_at is null then 'draft' else 'scheduled' end
  )
  returning * into v_row;
  return public.cf_pub_post_json(v_row);
end $$;
revoke execute on function public.cf_pub_create(text, jsonb) from public, anon, authenticated;
grant execute on function public.cf_pub_create(text, jsonb) to service_role;

/* A partial change: only the keys actually present are applied, so clearing a
 * time (scheduledAt: null) and not mentioning it are different requests.
 *
 * The bot id is part of the WHERE clause and not merely checked by the caller —
 * naming another tenant's post reads as no such post, here as well as one layer
 * up.
 */
create or replace function public.cf_pub_update(p_bot_id text, p_id uuid, p_patch jsonb)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_row public.cf_pub_posts%rowtype; v_kind text; v_status text;
begin
  if jsonb_typeof(p_patch) <> 'object' then
    raise sqlstate 'PT422' using message = 'That is not a change', hint = 'bad_patch';
  end if;
  select * into v_row from public.cf_pub_posts where id = p_id and bot_id = p_bot_id for update;
  if not found then
    raise sqlstate 'PT404' using message = 'No such post', hint = 'post_not_found';
  end if;

  if jsonb_exists(p_patch, 'kind') then
    v_kind := p_patch ->> 'kind';
    if v_kind is null or v_kind not in ('post', 'reel', 'story', 'carousel') then
      raise sqlstate 'PT422' using message = 'That is not a kind of post', hint = 'bad_kind';
    end if;
    v_row.kind := v_kind;
  end if;
  if jsonb_exists(p_patch, 'caption') then
    v_row.caption := public.cf_pub_check_caption(p_patch ->> 'caption');
  end if;
  if jsonb_exists(p_patch, 'media') then
    if jsonb_typeof(p_patch -> 'media') <> 'array' then
      raise sqlstate 'PT422' using message = 'Media must be a list', hint = 'bad_media';
    end if;
    v_row.media := p_patch -> 'media';
  end if;
  if jsonb_exists(p_patch, 'reel') then
    v_row.reel := case when jsonb_typeof(p_patch -> 'reel') = 'object' then p_patch -> 'reel' end;
  end if;
  if jsonb_exists(p_patch, 'scheduledAt') then
    v_row.scheduled_at := public.cf_pub_time(p_patch ->> 'scheduledAt');
  end if;
  if jsonb_exists(p_patch, 'status') then
    v_status := p_patch ->> 'status';
    if v_status is null or v_status not in ('draft', 'scheduled', 'publishing', 'published', 'failed') then
      raise sqlstate 'PT422' using message = 'That is not a status', hint = 'bad_status';
    end if;
    v_row.status := v_status;
    -- A caller who names the status names half of a pair, and the row holds the
    -- other half. Repairing it underneath them would rewrite a field they never
    -- sent, so the contradiction is refused and they send both or neither.
    if v_row.status = 'scheduled' and v_row.scheduled_at is null then
      raise sqlstate 'PT422' using message = 'A scheduled post needs a time', hint = 'bad_time';
    end if;
    if v_row.status = 'draft' and v_row.scheduled_at is not null then
      raise sqlstate 'PT422' using message = 'A draft cannot keep a time', hint = 'bad_time';
    end if;
  else
    -- The invariant, kept for a caller that only moved the time: a post with a
    -- time is scheduled, a post without one is a draft. Anything further along
    -- than that (publishing, published, failed) is left where it is.
    if v_row.scheduled_at is null and v_row.status = 'scheduled' then
      v_row.status := 'draft';
    elsif v_row.scheduled_at is not null and v_row.status = 'draft' then
      v_row.status := 'scheduled';
    end if;
  end if;
  if jsonb_exists(p_patch, 'mediaId') then v_row.media_id := p_patch ->> 'mediaId'; end if;
  if jsonb_exists(p_patch, 'permalink') then v_row.permalink := p_patch ->> 'permalink'; end if;
  if jsonb_exists(p_patch, 'error') then v_row.error := p_patch ->> 'error'; end if;
  if jsonb_exists(p_patch, 'attempts') then
    v_row.attempts := greatest(coalesce((p_patch ->> 'attempts')::int, 0), 0);
  end if;

  update public.cf_pub_posts p set
    kind         = v_row.kind,
    caption      = v_row.caption,
    media        = v_row.media,
    reel         = v_row.reel,
    scheduled_at = v_row.scheduled_at,
    status       = v_row.status,
    media_id     = v_row.media_id,
    permalink    = v_row.permalink,
    error        = v_row.error,
    attempts     = v_row.attempts,
    -- A post moved out of publishing by hand is no longer anybody's claim. One
    -- moved IN by hand (a patch naming "publishing" on a draft/scheduled row,
    -- p.claimed_at null) must still get a claim, or cf_pub_reap's `claimed_at
    -- is not null` filter never sees it and the post sits in "publishing"
    -- forever with nothing to rescue it.
    claimed_at   = case when v_row.status = 'publishing' then coalesce(p.claimed_at, now()) end,
    taken_at     = case when v_row.status = 'publishing' then p.taken_at end,
    updated_at   = now()
  where p.id = p_id
  returning * into v_row;
  return public.cf_pub_post_json(v_row);
end $$;
revoke execute on function public.cf_pub_update(text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.cf_pub_update(text, uuid, jsonb) to service_role;

create or replace function public.cf_pub_delete(p_bot_id text, p_id uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_row public.cf_pub_posts%rowtype;
begin
  delete from public.cf_pub_posts where id = p_id and bot_id = p_bot_id returning * into v_row;
  if not found then
    raise sqlstate 'PT404' using message = 'No such post', hint = 'post_not_found';
  end if;
  return public.cf_pub_post_json(v_row);
end $$;
revoke execute on function public.cf_pub_delete(text, uuid) from public, anon, authenticated;
grant execute on function public.cf_pub_delete(text, uuid) to service_role;

-- ---------------------------------------------------------------- the scheduler
/*
 * Every minute: take what is due, mark it, and knock once per post.
 *
 * `for update skip locked` is what makes a second copy of this — an overlapping
 * run, a second instance — take the next rows rather than the same ones. The
 * status change is what makes the post invisible to the next run even after the
 * lock is gone.
 *
 * The request carries the stored HASH as its credential, and the host's
 * deployment-protection token when there is one: a protected deployment bounces
 * an unauthenticated request at the edge, before any of the app's code runs, and
 * that failure looks exactly like a working app that decided not to publish.
 *
 * Nothing is read from the answer. net.http_post returns as soon as the request
 * is queued, and five minutes of transcoding will outlive any record of it — so
 * the app reports the outcome itself and this function's only job is the knock.
 */
create or replace function public.cf_pub_claim_due()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare
  v_url text; v_bypass text; v_key text; v_headers jsonb; v_count int := 0; v_row record;
begin
  select c.publish_url, c.bypass_secret, c.callback_secret_hash
    into v_url, v_bypass, v_key
    from public.cf_pub_config c where c.singleton;
  -- Not registered yet, or installed without a secret: there is nowhere to
  -- knock, and a knock nobody can authenticate is worse than none.
  if v_url is null or v_key is null then
    return 0;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'net' and p.proname = 'http_post'
  ) then
    return 0;
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json', 'x-chatfuel-publish-key', v_key);
  if v_bypass is not null then
    v_headers := v_headers || jsonb_build_object('x-vercel-protection-bypass', v_bypass);
  end if;

  for v_row in
    update public.cf_pub_posts p
       set status = 'publishing',
           claimed_at = now(),
           taken_at = null,
           attempts = p.attempts + 1,
           updated_at = now()
     where p.id in (
       select q.id from public.cf_pub_posts q
        where q.status = 'scheduled' and q.scheduled_at is not null and q.scheduled_at <= now()
        order by q.scheduled_at
        limit 20
        for update skip locked
     )
    returning p.id
  loop
    perform net.http_post(
      url => v_url,
      body => jsonb_build_object('id', v_row.id),
      headers => v_headers,
      -- The publish sits inside the app's request while the network transcodes,
      -- so this budget has to clear that rather than an ordinary API call's.
      timeout_milliseconds => 300000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.cf_pub_claim_due() from public, anon, authenticated;

/*
 * Every minute: a claim nobody came back for.
 *
 * Without this, one function killed halfway through leaves a post saying
 * "publishing" until somebody notices, which for a queue that runs unattended
 * means forever.
 *
 * The two cases are not the same and must not be treated the same. A claim that
 * was never TAKEN means the callback never arrived and no publish was ever
 * started: that goes back in the queue. A claim that was taken and then went
 * silent means a publish was started and may well have finished on the network
 * — retrying that is how an account ends up posting the same thing twice — so it
 * is marked failed and left for a person to look at.
 */
create or replace function public.cf_pub_reap()
returns int language plpgsql volatile security definer set search_path = '' as $$
declare v_count int;
begin
  with stale as (
    select p.id, p.attempts, p.taken_at
    from public.cf_pub_posts p
    where p.status = 'publishing'
      and p.claimed_at is not null
      and p.claimed_at < now() - interval '10 minutes'
    for update skip locked
  )
  update public.cf_pub_posts p
     set status = case
           when s.taken_at is not null then 'failed'
           when s.attempts >= 3 then 'failed'
           else 'scheduled'
         end,
         error = case
           when s.taken_at is not null
             then 'Publishing started but never finished — check the account before trying again'
           when s.attempts >= 3
             then 'Publishing was attempted several times and never got through'
           else p.error
         end,
         claimed_at = null,
         taken_at = null,
         updated_at = now()
    from stale s
   where s.id = p.id;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.cf_pub_reap() from public, anon, authenticated;

/*
 * The app answering a callback: hand me the post I was knocked about.
 *
 * Single-shot per claim. A queued request that is delivered twice — which is a
 * thing HTTP does — must not turn into two publishes, so taking the post is
 * itself a write and the second attempt finds nothing to take.
 */
create or replace function public.cf_pub_take(p_id uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_row public.cf_pub_posts%rowtype;
begin
  update public.cf_pub_posts
     set taken_at = now(), updated_at = now()
   where id = p_id and status = 'publishing' and taken_at is null
  returning * into v_row;
  if not found then
    raise sqlstate 'PT409' using message = 'This post is not waiting to be published', hint = 'not_claimed';
  end if;
  return json_build_object(
    'id', v_row.id,
    'botId', v_row.bot_id,
    'kind', v_row.kind,
    'caption', v_row.caption,
    'media', v_row.media,
    'reel', v_row.reel,
    'attempts', v_row.attempts
  );
end $$;
revoke execute on function public.cf_pub_take(uuid) from public, anon, authenticated;
grant execute on function public.cf_pub_take(uuid) to service_role;

/*
 * The outcome, written by the side that actually knows it.
 *
 * Authenticated by the shared secret alone, and therefore reachable without the
 * project's high-value key: recording that one post went out is all it can do,
 * and the alternative — handing that key to whatever answers callbacks — is a
 * far larger thing to hand over.
 *
 * A SUCCESS IS ACCEPTED WHATEVER THE ROW NOW SAYS. If the reaper has already put
 * the post back while the publish was still running, the post is nonetheless on
 * the network, and refusing the report would schedule it a second time. A
 * failure is only accepted while the row is still the one that was claimed —
 * a late failure must not overwrite work somebody has since edited or retried.
 *
 * THE BOT IS PART OF THE REPORT. The secret is one value for the whole
 * deployment, so without it the pair (secret, guessed uuid) writes an outcome
 * onto any post of any bot in the project. The caller states which bot the post
 * it published belongs to, and a row that says otherwise is not found — the
 * secret stops being a key to every row and becomes a key to the rows of the
 * bot the caller already had to know.
 */
-- An earlier version of this function took the post id alone. `create or
-- replace` does not replace a function whose argument list changed — it adds an
-- overload — so on a project that ran that version the unbound six-argument
-- form would stay callable by anon, and PostgREST, which resolves by argument
-- names, would have two candidates for the same call. Dropped by its old
-- signature, once, before the new one is created.
drop function if exists public.cf_pub_report(text, uuid, text, text, text, text);
create or replace function public.cf_pub_report(p_secret text, p_id uuid, p_bot_id text, p_status text, p_media_id text default null, p_permalink text default null, p_error text default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_hash text; v_row public.cf_pub_posts%rowtype;
begin
  select c.callback_secret_hash into v_hash from public.cf_pub_config c where c.singleton;
  if v_hash is null or p_secret is null or public.cf_pub_hash(p_secret) is distinct from v_hash then
    raise sqlstate 'PT401' using message = 'Not allowed', hint = 'bad_secret';
  end if;
  if p_bot_id is null or trim(p_bot_id) = '' then
    raise sqlstate 'PT422' using message = 'A bot is required', hint = 'bad_bot_id';
  end if;
  if p_status is null or p_status not in ('published', 'failed') then
    raise sqlstate 'PT422' using message = 'That is not an outcome', hint = 'bad_status';
  end if;
  -- The permalink is handed straight back to a browser as the link to the live
  -- post. Whatever else a caller may write here, it will not be a scheme.
  if p_permalink is not null and p_permalink !~ '^https://' then
    raise sqlstate 'PT422' using message = 'A permalink must be an https URL', hint = 'bad_permalink';
  end if;

  update public.cf_pub_posts p
     set status = p_status,
         media_id = coalesce(p_media_id, p.media_id),
         permalink = coalesce(p_permalink, p.permalink),
         error = case when p_status = 'failed' then p_error end,
         claimed_at = null,
         taken_at = null,
         updated_at = now()
   where p.id = p_id
     -- Stored trimmed by cf_pub_create, so compared trimmed here.
     and p.bot_id = trim(p_bot_id)
     -- A success is accepted whatever the row now says, but only for a post the
     -- scheduler actually sent out: attempts counts claims, cf_pub_claim_due is
     -- the only thing that raises it, and the reaper leaves it standing. So a
     -- late report still lands, and a draft nobody queued cannot be declared
     -- published by anyone who has the callback secret and an id to guess.
     and p.attempts > 0
     and (p_status = 'published' or p.status = 'publishing')
  returning * into v_row;
  if not found then
    raise sqlstate 'PT404' using message = 'No such post', hint = 'post_not_found';
  end if;
  return public.cf_pub_post_json(v_row);
end $$;
revoke execute on function public.cf_pub_report(text, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.cf_pub_report(text, uuid, text, text, text, text, text) to anon, service_role;

-- ---------------------------------------------------------------- durable media
-- The bucket the composer's uploads go into, and the only storage in this
-- deployment whose contents outlive the afternoon.
--
-- Public, because the network fetches the bytes from its own servers and has no
-- credential to present — a URL that needs a header is a URL it cannot read.
-- What that costs is that anybody holding a URL can read that object, which is
-- true of every published post anyway.
--
-- CREATED public, never FLIPPED back to it. An earlier version asserted
-- `public = true` on every run, so a bucket an operator had deliberately made
-- private was re-opened by the next migration — and this file is meant to be
-- re-run, which made that a decision undone on a schedule. A private bucket
-- does break publishing (the network is handed a URL it gets a 400 for), so it
-- is said out loud instead of corrected.
--
-- Writes are a different matter: there is NO insert, update or delete policy
-- below, and that is deliberate. Only the service role — which bypasses these
-- policies — can put anything in here, which means every write goes through the
-- app's own route, with its session check, its bot fence, its size ceiling and
-- its content-type list.
--
-- The NAME is the installer's to choose, because one Supabase project can carry
-- two deployments of this app and a shared bucket means each one's composer can
-- read the other's media. It has to match what the app was given in
-- PUBLISHING_MEDIA_BUCKET: the app builds the public URL it hands the network,
-- and a bucket only this file knows about is a 400 at publish time. Left
-- unfilled — this file re-run by hand from the SQL editor — it is the same
-- default the app falls back to, so the two still agree.
--
-- There is no READ policy either, and that is a decision of the same kind. A
-- public bucket serves its bytes from /object/public/<bucket>/<key>, which is
-- the URL this app builds and the only one the network is ever handed, and that
-- path does not consult these policies at all. A select policy would add
-- nothing to it and would grant one thing more: the listing endpoint, which
-- answers with every key in the bucket. The keys are <botId>/<uuid>, so that is
-- every bot id in the deployment and the address of every file behind them,
-- drafts included, to anybody holding the anon key - and the anon key ships in
-- the app's bundle. An earlier version created that policy; the drop below is
-- what takes it back off a deployment that already ran it.
do $$
declare
  v_bucket text := '__CHATFUEL_MEDIA_BUCKET__';
  v_public boolean;
begin
  if v_bucket ~ '^__' then
    v_bucket := 'cf-pub-media';
  end if;
  if to_regclass('storage.buckets') is null then
    return; -- no storage on this project; the queue works, uploads do not
  end if;
  select public into v_public from storage.buckets where id = v_bucket;
  if v_public is null then
    insert into storage.buckets (id, name, public) values (v_bucket, v_bucket, true);
  elsif not v_public then
    raise notice 'the % bucket is private - Instagram cannot fetch what it is handed, so scheduled posts will fail until it is public again', v_bucket;
  end if;
  execute 'drop policy if exists cf_pub_media_read on storage.objects';
end $$;

-- ---------------------------------------------------------------- the two jobs
-- One minute each. cron.schedule(name, …) replaces a job of the same name, so
-- re-running this file re-points the jobs rather than piling up duplicates —
-- and, for the same reason, so does a SECOND deployment on this project, which
-- would silently take over the first one's two jobs. The prefix is what keeps
-- them apart; unfilled, it is the name this file has always used.
do $$
declare
  v_prefix text := '__CHATFUEL_CRON_PREFIX__';
begin
  if v_prefix ~ '^__' then
    v_prefix := 'cf-pub';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron' and p.proname = 'schedule'
  ) then
    raise notice 'pg_cron is not installed on this project - scheduled posts will not go out on their own';
    return;
  end if;
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'postgres') then
    execute 'grant usage on schema cron to postgres';
  end if;
  perform cron.schedule(v_prefix || '-claim-due', '* * * * *', 'select public.cf_pub_claim_due()');
  perform cron.schedule(v_prefix || '-reap', '* * * * *', 'select public.cf_pub_reap()');
end $$;

-- ---------------------------------------------------------------- the shared secret
-- The installer replaces the literal below with sha256(secret), base64, of the
-- value it wrote into the app's environment. Left as it is, nothing is recorded
-- and whatever the row already holds is kept — which is what happens when this
-- file is re-run by hand from the SQL editor.
do $$
declare v_hash text := '__CHATFUEL_PUBLISHING_SECRET_SHA256__';
begin
  if v_hash !~ '^__' then
    update public.cf_pub_config set callback_secret_hash = v_hash, updated_at = now() where singleton;
  end if;
end $$;

-- ---------------------------------------------------------------- bookkeeping
insert into public.cf_pub_migrations (name) values ('0001_instagram') on conflict (name) do nothing;
notify pgrst, 'reload schema';
