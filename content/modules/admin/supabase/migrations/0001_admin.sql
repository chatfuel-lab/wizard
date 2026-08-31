-- ============================================================================
-- chatfuel-wizard · Admin · migration 0020
--
-- The database half of the admin panel, for a deployment that ALSO runs the auth
-- module. It adds no tables: everything here reads and writes the tables
-- 0001_chatfuel_auth.sql already created (cf_tenants, cf_members, cf_bots,
-- cf_bot_members). Applying it to a project without those tables fails, which is
-- why the wizard only writes it when auth is selected too.
--
-- Every function here is granted to `service_role` AND NOBODY ELSE. That is the
-- whole difference from the cf_* functions next door: those run as the caller so
-- the database re-decides what a signed-in person may do, and they are scoped to
-- the one workspace that person belongs to. The admin panel has no Supabase
-- session at all — it is authorized by a password held beside the master token —
-- so its calls arrive on the service-role key and are deliberately NOT scoped to
-- a tenant. A browser must never be able to reach any of them.
--
-- Contract, the same as 0001: idempotent (create or replace), security definer,
-- set search_path = '' on every function, execute revoked from
-- public/anon/authenticated and granted back only to service_role, errors as
-- sqlstate PT4xx with the machine code in HINT, and a schema reload at the end.
-- ============================================================================

-- ---------------------------------------------------------------- health
/* Answers the panel's "is the database reachable?" tile and nothing else. It
   reads no rows on purpose: a reachability probe that depends on the shape of
   the schema reports a migration problem as an outage. */
create or replace function public.cf_admin_ping()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('ok', true)
$$;
revoke execute on function public.cf_admin_ping() from public, anon, authenticated;
grant execute on function public.cf_admin_ping() to service_role;

-- ---------------------------------------------------------------- the account, whole
/*
 * Every workspace in this deployment, with its people and its bots — the view
 * no signed-in person has, because no signed-in person belongs to more than one.
 *
 * `granted` lists the people holding an explicit grant on a bot. Owners and
 * admins are NOT in it and must not be added: they reach every bot of their
 * workspace by role, and a panel that showed them as grant-holders would invite
 * somebody to "revoke" an access that is not stored anywhere.
 */
create or replace function public.cf_admin_tenants_json()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(row order by row->>'name'), '[]'::json) from (
    select json_build_object(
      'id', t.id,
      'name', t.name,
      'createdAt', t.created_at,
      'members', coalesce((
        select json_agg(json_build_object(
          'userId', m.user_id,
          'role', m.role,
          'email', p.email,
          'name', p.full_name,
          'joinedAt', m.created_at
        ) order by public.cf_role_rank(m.role) desc, m.created_at asc)
        from public.cf_members m
        left join public.cf_profiles p on p.id = m.user_id
        where m.tenant_id = t.id
      ), '[]'::json),
      'bots', coalesce((
        select json_agg(json_build_object(
          'slotId', b.id,
          'botId', b.bot_id,
          'name', b.name,
          'createdAt', b.created_at,
          'granted', coalesce((
            select json_agg(g.user_id order by g.user_id)
            from public.cf_bot_members g where g.bot = b.id
          ), '[]'::json)
        ) order by b.created_at asc)
        from public.cf_bots b where b.tenant_id = t.id
      ), '[]'::json)
    ) as row
    from public.cf_tenants t
  ) rows
$$;
revoke execute on function public.cf_admin_tenants_json() from public, anon, authenticated;
grant execute on function public.cf_admin_tenants_json() to service_role;

/*
 * The bots that belong to no workspace yet — the rows cf_admin_new_bot reserves
 * when the panel says "I will assign it later".
 *
 * Separate from cf_admin_tenants_json because that one is a list OF workspaces
 * and these have none; folding them in would mean either repeating them under
 * every workspace or changing a shape the installed panel already reads. Their
 * only route back into the product is this list, so leaving them out of both is
 * what made "assign later" a one-way door.
 */
create or replace function public.cf_admin_unassigned_bots_json()
returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object(
    'slotId', b.id,
    'botId', b.bot_id,
    'name', b.name,
    'createdAt', b.created_at
  ) order by b.created_at asc), '[]'::json)
  from public.cf_bots b where b.tenant_id is null and b.bot_id is not null
$$;
revoke execute on function public.cf_admin_unassigned_bots_json() from public, anon, authenticated;
grant execute on function public.cf_admin_unassigned_bots_json() to service_role;

-- ---------------------------------------------------------------- bots
-- The panel creates bots the app cannot: ones no workspace has claimed yet. A
-- row with no tenant is reachable by nobody — every rule in 0001 joins through
-- cf_members on tenant_id — so it waits, unreadable, until a grant says whose
-- it is.
alter table public.cf_bots alter column tenant_id drop not null;

/*
 * Step one of adding a bot from the panel: reserve a row, in the chosen
 * workspace or in none. The server then creates the bot in Chatfuel and
 * finishes with `cf_bot_created` (0001), or drops the slot again with
 * `cf_drop_bot_slot`.
 *
 * The same two-step order the app uses, kept for the same reason — a bot that
 * exists in Chatfuel and in no workspace here is invisible to the people it was
 * made for, and only this side knows which tenant was meant.
 *
 * A null p_tenant_id is the panel saying "I will assign it later", not a
 * missing argument: the row is still reserved, and cf_admin_grant_bot settles
 * the workspace on the first grant.
 */
create or replace function public.cf_admin_new_bot(p_tenant_id uuid, p_name text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_name text;
begin
  if p_tenant_id is not null and not exists (select 1 from public.cf_tenants where id = p_tenant_id) then
    raise sqlstate 'PT404' using message = 'No such workspace', hint = 'tenant_not_found';
  end if;
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise sqlstate 'PT422' using message = 'A name is required', hint = 'bad_name';
  end if;
  if length(v_name) > 80 then
    raise sqlstate 'PT422' using message = 'That name is too long', hint = 'name_too_long';
  end if;
  -- The same sweep cf_new_bot does: a slot whose server died mid-way would sit
  -- in the workspace as "being set up" forever. `is not distinct from` so the
  -- unassigned slots sweep each other; `=` never matches null and would leave
  -- them for good.
  delete from public.cf_bots
    where tenant_id is not distinct from p_tenant_id and bot_id is null and created_at < now() - interval '10 minutes';
  insert into public.cf_bots (tenant_id, name) values (p_tenant_id, v_name) returning id into v_id;
  return json_build_object('id', v_id, 'tenant_id', p_tenant_id, 'name', v_name);
end $$;
revoke execute on function public.cf_admin_new_bot(uuid, text) from public, anon, authenticated;
grant execute on function public.cf_admin_new_bot(uuid, text) to service_role;

/*
 * Rename by CHATFUEL id, because that is the only id the panel has: it is
 * looking at the account, where a bot is a Chatfuel bot, not at one workspace's
 * rows. `previous_name` is what the server puts back when Chatfuel then refuses.
 *
 * A bot with no row here — one created outside the app — renames to nothing and
 * says so with a null id rather than failing: the Chatfuel rename is the part
 * that matters, and this half is bookkeeping.
 */
create or replace function public.cf_admin_rename_bot(p_bot_id text, p_name text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_previous text; v_name text;
begin
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise sqlstate 'PT422' using message = 'A name is required', hint = 'bad_name';
  end if;
  if length(v_name) > 80 then
    raise sqlstate 'PT422' using message = 'That name is too long', hint = 'name_too_long';
  end if;
  select id, name into v_id, v_previous from public.cf_bots where bot_id = p_bot_id for update;
  if v_id is null then
    return json_build_object('id', null, 'bot_id', p_bot_id, 'previous_name', null);
  end if;
  update public.cf_bots set name = v_name, updated_at = now() where id = v_id;
  return json_build_object('id', v_id, 'bot_id', p_bot_id, 'previous_name', v_previous);
end $$;
revoke execute on function public.cf_admin_rename_bot(text, text) from public, anon, authenticated;
grant execute on function public.cf_admin_rename_bot(text, text) to service_role;

/* Called AFTER Chatfuel has deleted the bot. A bot that was never in a workspace
   here is not an error — there is simply nothing to forget. Grants go with the
   row through the cascade on cf_bot_members. */
create or replace function public.cf_admin_forget_bot(p_bot_id text)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  delete from public.cf_bots where bot_id = p_bot_id returning id into v_id;
  return json_build_object('id', v_id, 'bot_id', p_bot_id);
end $$;
revoke execute on function public.cf_admin_forget_bot(text) from public, anon, authenticated;
grant execute on function public.cf_admin_forget_bot(text) to service_role;

-- ---------------------------------------------------------------- access
/*
 * Hand a bot to one person, addressed the way the panel addresses everything:
 * by Chatfuel bot id and by user id.
 *
 * The workspace check is the one rule that survives having no caller — a grant
 * that crossed workspaces would let somebody open a bot their account has no
 * relationship to, which is precisely what cf_bot_members exists to prevent.
 *
 * A bot reserved with no workspace is the one case with nothing to check
 * against, so the first grant settles it. p_tenant_id is the caller saying
 * which workspace it meant: the panel grants from a row that is already inside
 * one, so it always knows, and a caller that does not pass it falls back to the
 * person's own workspace. Two workspaces and no p_tenant_id is a question
 * rather than a default — picking one would put the bot somewhere nobody asked
 * for. The membership check runs either way: a named workspace the person is
 * not in is refused like any other cross-workspace grant.
 */
-- The two-argument form this replaces: "create or replace" cannot change a
-- signature, so re-running this file on a project that ran an earlier 0001
-- would leave both, and a two-argument call would then be ambiguous.
drop function if exists public.cf_admin_grant_bot(text, uuid);
create or replace function public.cf_admin_grant_bot(p_bot_id text, p_user_id uuid, p_tenant_id uuid default null)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_slot uuid; v_tenant uuid; v_tenants uuid[];
begin
  select id, tenant_id into v_slot, v_tenant from public.cf_bots where bot_id = p_bot_id for update;
  if v_slot is null then
    raise sqlstate 'PT404' using message = 'This bot is not in any workspace of this app', hint = 'bot_not_found';
  end if;
  if v_tenant is null then
    if p_tenant_id is not null then
      if not exists (select 1 from public.cf_tenants where id = p_tenant_id) then
        raise sqlstate 'PT404' using message = 'No such workspace', hint = 'tenant_not_found';
      end if;
      v_tenant := p_tenant_id;
    else
      select array_agg(tenant_id) into v_tenants from public.cf_members where user_id = p_user_id;
      if v_tenants is null then
        raise sqlstate 'PT404' using message = 'That person is in no workspace of this app', hint = 'member_not_found';
      end if;
      if array_length(v_tenants, 1) > 1 then
        raise sqlstate 'PT409' using message = 'This bot has no workspace yet, and that person is in several',
          hint = 'tenant_ambiguous';
      end if;
      v_tenant := v_tenants[1];
    end if;
    if not exists (select 1 from public.cf_members where tenant_id = v_tenant and user_id = p_user_id) then
      raise sqlstate 'PT404' using message = 'That person is not in this bot''s workspace', hint = 'member_not_found';
    end if;
    update public.cf_bots set tenant_id = v_tenant, updated_at = now() where id = v_slot;
  elsif not exists (select 1 from public.cf_members where tenant_id = v_tenant and user_id = p_user_id) then
    raise sqlstate 'PT404' using message = 'That person is not in this bot''s workspace', hint = 'member_not_found';
  end if;
  insert into public.cf_bot_members (bot, user_id) values (v_slot, p_user_id)
    on conflict (bot, user_id) do nothing;
  return json_build_object('bot_id', p_bot_id, 'user_id', p_user_id, 'tenant_id', v_tenant);
end $$;
revoke execute on function public.cf_admin_grant_bot(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.cf_admin_grant_bot(text, uuid, uuid) to service_role;

/* Take it back. Removing a grant that is not there is a no-op, so a double
   click on a slow connection does not become an error. */
create or replace function public.cf_admin_revoke_bot(p_bot_id text, p_user_id uuid)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare v_slot uuid;
begin
  select id into v_slot from public.cf_bots where bot_id = p_bot_id;
  if v_slot is null then
    raise sqlstate 'PT404' using message = 'This bot is not in any workspace of this app', hint = 'bot_not_found';
  end if;
  delete from public.cf_bot_members where bot = v_slot and user_id = p_user_id;
  return json_build_object('bot_id', p_bot_id, 'user_id', p_user_id);
end $$;
revoke execute on function public.cf_admin_revoke_bot(text, uuid) from public, anon, authenticated;
grant execute on function public.cf_admin_revoke_bot(text, uuid) to service_role;

-- ---------------------------------------------------------------- bookkeeping
insert into public.cf_migrations (name) values ('0020_admin') on conflict (name) do nothing;
notify pgrst, 'reload schema';
