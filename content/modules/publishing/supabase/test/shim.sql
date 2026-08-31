-- Minimal stand-in for the parts of a Supabase project the Instagram migration
-- touches, so 0001_publishing.sql can be dry-run on a plain Postgres before the
-- live pass.
--
-- pg_cron and pg_net are not installable here, and installing them would not
-- help: what has to be checked is WHAT gets scheduled and WHAT gets posted, not
-- that a background worker fires. So both are stubs that write down the call —
-- and because the migration looks the two up in the catalog by name rather than
-- by extension, it takes these for the real thing and exercises the same path.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- ---------------------------------------------------------------- storage
create schema if not exists storage;
create table if not exists storage.buckets (
  id      text primary key,
  name    text not null,
  public  boolean not null default false
);
create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text not null,
  owner      uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.objects to anon, authenticated;

-- ---------------------------------------------------------------- pg_cron stub
create schema if not exists cron;
create table if not exists cron.job (
  jobid    bigserial primary key,
  jobname  text unique,
  schedule text not null,
  command  text not null
);
create or replace function cron.schedule(job_name text, schedule text, command text)
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
  returning jobid into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------- pg_net stub
-- The same named parameters the real one takes, so the call in the migration is
-- the call that would go out.
create schema if not exists net;
create table if not exists net._http_request_log (
  id                    bigserial primary key,
  url                   text,
  body                  jsonb,
  headers               jsonb,
  timeout_milliseconds  int,
  created_at            timestamptz not null default now()
);
create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{"Content-Type": "application/json"}'::jsonb,
  timeout_milliseconds int default 5000
) returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into net._http_request_log (url, body, headers, timeout_milliseconds)
    values (url, body, headers, timeout_milliseconds)
  returning id into v_id;
  return v_id;
end $$;

-- Supabase default-grants on new objects in public; reproduce them so the
-- migration's REVOKEs are actually doing something here too.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
