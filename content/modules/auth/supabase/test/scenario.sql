-- Exercises every cf_* RPC the way PostgREST would: as the `authenticated`
-- (or `anon`) role, with request.jwt.claims set. Expected failures are asserted
-- by SQLSTATE, so a silent behaviour change fails the run.
\set ON_ERROR_STOP on
\set QUIET on

/* The workspace under test: the one owner@acme.com claimed. Ownership moves
   during the run, so this follows `created_by`, not the current owner. */
create or replace function tid() returns uuid language sql stable security definer as $$
  select id from public.cf_tenants where created_by = (select id from auth.users where email = 'owner@acme.com') $$;

create or replace function test_expect(p_sql text, p_state text, p_label text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
    raise exception 'FAIL %: expected % but the call succeeded', p_label, p_state;
  exception
    when sqlstate 'P0001' then raise;
    when others then
      if sqlstate = p_state then raise notice 'ok   % → %', p_label, p_state;
      else raise exception 'FAIL %: expected % got % (%)', p_label, p_state, sqlstate, sqlerrm;
      end if;
  end;
end $$;

create or replace function test_login(p_email text) returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is null then raise exception 'no such user %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'email', p_email)::text, false);
end $$;
create or replace function test_logout() returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', '', false); end $$;
create or replace function uid_of(p_email text) returns uuid language sql security definer as $$
  select id from auth.users where email = p_email $$;
create or replace function role_of(p_email text) returns text language sql security definer as $$
  select m.role from public.cf_members m where m.tenant_id = tid() and m.user_id = uid_of(p_email) $$;
create or replace function owner_count() returns int language sql security definer as $$
  select count(*)::int from public.cf_members where tenant_id = tid() and role = 'owner' $$;
create or replace function tenant_of(p_email text) returns uuid language sql security definer as $$
  select id from public.cf_tenants where created_by = uid_of(p_email) $$;
create or replace function bot_slot(p_name text) returns uuid language sql security definer as $$
  select id from public.cf_bots where tenant_id = tid() and name = p_name $$;
create or replace function slot_row_of(p_bot_id text) returns uuid language sql security definer as $$
  select id from public.cf_bots where bot_id = p_bot_id $$;
create or replace function pending_slots() returns int language sql security definer as $$
  select count(*)::int from public.cf_bots where tenant_id = tid() and bot_id is null $$;
create or replace function bot_names_of(p_email text) returns text language sql security definer as $$
  select coalesce(string_agg(b.name, ', ' order by b.name), '')
  from public.cf_bots b
  join public.cf_bot_members g on g.bot = b.id
  where b.tenant_id = tid() and g.user_id = uid_of(p_email) $$;
create or replace function tenant_col(p_col text) returns text language plpgsql security definer as $$
declare v text; begin
  execute format('select %I::text from public.cf_tenants where id = tid()', p_col) into v; return v;
end $$;

-- ---------------------------------------------------------------- users (GoTrue would do this)
insert into auth.users (email, raw_user_meta_data) values
  ('owner@acme.com',    '{"full_name":"Olga Owner"}'),
  ('admin@acme.com',    '{"full_name":"Andrei Admin"}'),
  ('member@acme.com',   '{}'),
  ('outsider@other.io', '{}')
on conflict (email) do nothing;

do $$ begin
  if (select count(*) from public.cf_profiles) <> 4 then
    raise exception 'FAIL trigger: cf_profiles has % rows, expected 4', (select count(*) from public.cf_profiles);
  end if;
  if (select full_name from public.cf_profiles where email = 'owner@acme.com') <> 'Olga Owner' then
    raise exception 'FAIL trigger: full_name not mirrored';
  end if;
  raise notice 'ok   profiles trigger mirrored 4 users';
end $$;

-- ---------------------------------------------------------------- anon reads
set role anon;
select test_expect('select public.cf_list_members(tid())', '42501', 'anon cannot call cf_list_members');
select test_expect('select public.cf_gate_for_bot(''bot-123'')', '42501', 'anon cannot call cf_gate_for_bot');
select test_expect('select public.cf_claim_workspace(null)', '42501', 'anon cannot claim a workspace');
select test_expect('select public.cf_my_bot_ids()', '42501', 'anon cannot list bot ids');
select test_expect('select public.cf_new_bot(''x'')', '42501', 'anon cannot add a bot');
select test_expect('select public.cf_list_bots(tid())', '42501', 'anon cannot list the workspace bots');
select test_expect('select * from public.cf_tenants', '42501', 'anon cannot read cf_tenants directly');
select test_expect('select * from public.cf_bots', '42501', 'anon cannot read cf_bots directly');
select test_expect('select * from public.cf_bot_members', '42501', 'anon cannot read cf_bot_members directly');
select test_expect('select * from public.cf_invites', '42501', 'anon cannot read cf_invites directly');
reset role;

-- ---------------------------------------------------------------- signing up = getting your own bot
select test_login('owner@acme.com');
set role authenticated;
do $$ declare v json; begin
  if public.cf_my_workspace() is not null then raise exception 'FAIL a fresh account already has a workspace'; end if;
  v := public.cf_claim_workspace(null);
  if v ->> 'role' <> 'owner' then raise exception 'FAIL claim got %, expected owner', v ->> 'role'; end if;
  if json_array_length(v -> 'bots') <> 0 then raise exception 'FAIL a claimed workspace already has bots'; end if;
  if v ->> 'name' <> 'Owner' then raise exception 'FAIL workspace name from the email: %', v ->> 'name'; end if;
  raise notice 'ok   claim_workspace opens a workspace with no bots yet, named from the email';
end $$;
-- Step one is the caller's: reserve a row. A nameless bot is refused.
select test_expect('select public.cf_new_bot(null)', 'PT422', 'a bot with no name');
select test_expect(format('select public.cf_new_bot(%L)', repeat('x', 81)), 'PT422', 'a bot name over 80 characters');
create temporary table t_bot1 as select public.cf_new_bot('First bot') as v;
grant select on t_bot1 to public;
-- Step two is the server's alone: only it holds the master token, so only it can
-- say which Chatfuel bot a row points at.
do $$ declare v_slot uuid; begin
  select (t_bot1.v ->> 'id')::uuid into v_slot from t_bot1;
  perform test_expect(format('select public.cf_bot_created(%L, ''bot-123'')', v_slot), '42501', 'a browser naming the bot');
  perform test_expect(format('select public.cf_drop_bot_slot(%L)', v_slot), '42501', 'a browser dropping a slot');
end $$;
do $$ declare v json; begin
  v := public.cf_my_workspace();
  if json_array_length(v -> 'bots') <> 1 then raise exception 'FAIL the reserved slot is not listed'; end if;
  if (v -> 'bots' -> 0 ->> 'bot_id') is not null then raise exception 'FAIL a slot already has a bot id'; end if;
  if public.cf_my_bot_ids() <> '{}'::text[] then raise exception 'FAIL a slot with no bot id is in the gate set'; end if;
  raise notice 'ok   a reserved slot shows in the list, and never in the gate set';
end $$;
reset role;

set role service_role;
do $$ declare v_slot uuid; begin
  select (t_bot1.v ->> 'id')::uuid into v_slot from t_bot1;
  perform public.cf_bot_created(v_slot, 'bot-123');
  perform public.cf_bot_created(v_slot, 'bot-123');  -- a retry is a no-op
  perform test_expect(format('select public.cf_bot_created(%L, ''bot-999'')', v_slot), 'PT409', 'pointing one row at a second bot');
  perform public.cf_drop_bot_slot(v_slot);           -- refuses a row that holds a bot
end $$;
reset role;

select test_login('owner@acme.com');
set role authenticated;
do $$ declare v json; begin
  v := public.cf_my_workspace();
  if v -> 'bots' -> 0 ->> 'bot_id' <> 'bot-123' then raise exception 'FAIL the bot id did not land: %', v -> 'bots'; end if;
  if public.cf_gate_for_bot('bot-123') <> 'owner' then raise exception 'FAIL gate for my own bot'; end if;
  if public.cf_my_bot_ids() <> array['bot-123'] then raise exception 'FAIL my_bot_ids: %', public.cf_my_bot_ids(); end if;
  if pending_slots() <> 0 then
    raise exception 'FAIL a slot is still pending after the bot id landed';
  end if;
  -- Claiming twice must not open a second workspace.
  v := public.cf_claim_workspace(null);
  if json_array_length(v -> 'bots') <> 1 then raise exception 'FAIL claiming twice made a second workspace'; end if;
  raise notice 'ok   the bot id lands, the gate answers for it, claiming twice is idempotent';
end $$;
reset role;

-- The second account is NOT a member of the first one's workspace: it gets its own.
select test_login('admin@acme.com');
set role authenticated;
do $$ declare v json; begin
  if public.cf_gate_for_bot('bot-123') is not null then
    raise exception 'FAIL another account reached bot-123';
  end if;
  v := public.cf_claim_workspace(null);
  if (v ->> 'tenant_id')::uuid = tid() then raise exception 'FAIL the second account landed in the first workspace'; end if;
  if v ->> 'role' <> 'owner' then raise exception 'FAIL the second account is not the owner of its own workspace'; end if;
  raise notice 'ok   a second sign-up gets a workspace of its own, and cannot see the first';
end $$;
reset role;
select test_login('admin@acme.com');
set role authenticated;
create temporary table t_bot777 as select public.cf_new_bot('Second account bot') as v;
grant select on t_bot777 to public;
reset role;
set role service_role;
do $$ declare v_slot uuid; begin
  select (t_bot777.v ->> 'id')::uuid into v_slot from t_bot777;
  perform public.cf_bot_created(v_slot, 'bot-777');
end $$;
reset role;
select test_login('owner@acme.com');
set role authenticated;
do $$ begin
  if public.cf_gate_for_bot('bot-777') is not null then raise exception 'FAIL the first account reached the second one''s bot'; end if;
  if 'bot-777' = any (public.cf_my_bot_ids()) then raise exception 'FAIL my_bot_ids leaked another workspace'; end if;
  raise notice 'ok   neither account can reach the other''s bot';
end $$;
reset role;

-- Colleagues arrive by invite. admin@acme.com already owns a workspace, so this
-- also proves that accepting an invite does not take the one you own away.
select test_login('owner@acme.com');
set role authenticated;
create temporary table t_inv0 as select public.cf_create_invite(tid(), 'member', null, interval '1 day') as v;
grant select on t_inv0 to public;
reset role;
select test_login('admin@acme.com');
set role authenticated;
do $$ declare tok text; v json; begin
  select t_inv0.v ->> 'token' into tok from t_inv0;
  v := public.cf_accept_invite(tok);
  if v ->> 'role' <> 'member' then raise exception 'FAIL invited colleague got %', v ->> 'role'; end if;
  v := public.cf_my_workspace();
  if v -> 'bots' -> 0 ->> 'bot_id' <> 'bot-777' then raise exception 'FAIL an invite replaced my own workspace: %', v -> 'bots'; end if;
  -- Joining as a MEMBER carries no bot with it: the invite named none, so the
  -- only bot they reach is still the one in the workspace they own.
  if public.cf_my_bot_ids() <> array['bot-777'] then
    raise exception 'FAIL my_bot_ids after the invite: %', public.cf_my_bot_ids();
  end if;
  if public.cf_gate_for_bot('bot-123') is not null then
    raise exception 'FAIL joining a workspace as a member opened a bot nobody granted';
  end if;
  raise notice 'ok   an invite adds a workspace without replacing the one you own, and grants no bot on its own';
end $$;
reset role;

-- member@acme.com is invited below and never claims a workspace: an invited
-- person gets no bot of their own.

-- ---------------------------------------------------------------- invites
select test_login('owner@acme.com');
set role authenticated;
select test_expect('select public.cf_create_invite(tid(), ''owner'', null, interval ''7 days'')', 'PT422', 'invite with role owner');
select test_expect('select public.cf_create_invite(tid(), ''member'', null, interval ''31 days'')', 'PT422', 'invite expiring in 31 days');
create temporary table t_inv as
  select public.cf_create_invite(tid(), 'member', 'Member@Acme.com', interval '2 days') as v;
grant select on t_inv to public;  -- the temp table is owned by `authenticated`; anon reads it below
do $$ declare v json; begin
  select t_inv.v into v from t_inv;
  if length(v ->> 'token') <> 32 then raise exception 'FAIL invite token length %', length(v ->> 'token'); end if;
  if (v ->> 'token') ~ '[+/=]' then raise exception 'FAIL invite token is not base64url: %', v ->> 'token'; end if;
  if v ->> 'email' <> 'member@acme.com' then raise exception 'FAIL invite email not normalised: %', v ->> 'email'; end if;
  raise notice 'ok   create_invite → 32-char base64url token, email lowercased';
end $$;
reset role;

set role anon;
do $$ declare v json; tok text; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  v := public.cf_invite_preview(tok);
  if v ->> 'status' <> 'valid' then raise exception 'FAIL preview status %', v ->> 'status'; end if;
  if v ->> 'email_hint' <> 'm***@acme.com' then raise exception 'FAIL preview hint %', v ->> 'email_hint'; end if;
  if v ->> 'inviter_name' <> 'Olga Owner' then raise exception 'FAIL preview inviter %', v ->> 'inviter_name'; end if;
  -- The display name or nothing: an address here would be the inviter's, handed
  -- to whoever holds the link, who is nobody yet.
  if (v ->> 'inviter_name') like '%@%' then raise exception 'FAIL preview leaks an email as the inviter'; end if;
  if v ->> 'tenant_name' <> 'Owner' then raise exception 'FAIL preview tenant %', v ->> 'tenant_name'; end if;
  if (public.cf_invite_preview('no-such-token') ->> 'status') <> 'not_found' then raise exception 'FAIL preview not_found'; end if;
  -- The bucket comes from the token, not from anything the caller writes. A
  -- caller giving itself a fresh address lands in the same row every time.
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9"}', true);
  perform public.cf_invite_preview(tok);
  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.4"}', true);
  perform public.cf_invite_preview(tok);
  raise notice 'ok   anon invite_preview (valid, masked email, inviter, not_found)';
end $$;
reset role;
-- Counted as the owner and not as anon: the bucket table is revoked from anon,
-- and so is cf_hash_token, so asking anon to do either would fail on the grant
-- rather than on the count.
do $$ declare tok text; v_probe text; v_n integer; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  v_probe := substring(public.cf_hash_token(tok) from 1 for 2);
  if (select count(*) from public.cf_invite_probes where probe = v_probe) <> 1 then
    raise exception 'FAIL the probe table grew a row per forwarded address';
  end if;
  select n into v_n from public.cf_invite_probes where probe = v_probe;
  -- Three previews of that one token above, whatever address each claimed.
  if v_n < 3 then
    raise exception 'FAIL three previews of one token did not share a bucket (n = %)', v_n;
  end if;
  raise notice 'ok   one bucket row per token, whatever address is claimed';
end $$;

set role anon;
do $$ declare tok text; i integer; limited boolean := false; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  begin
    -- A different claimed address on every call: the header buys nothing, so all
    -- of these land in the one bucket and the ceiling still arrives.
    for i in 1..70 loop
      perform set_config('request.headers', format('{"x-forwarded-for":"203.0.113.%s"}', i), true);
      perform public.cf_invite_preview(tok);
    end loop;
  exception when sqlstate 'PT429' then limited := true;
  end;
  if not limited then raise exception 'FAIL preview is not rate limited'; end if;
  raise notice 'ok   anon invite_preview stops an enumerator (PT429)';
end $$;
reset role;
-- The bucket is per minute and the rest of this file previews again inside it.
delete from public.cf_invite_probes;

/*
 * One exhausted bucket is not the whole deployment.
 *
 * The ceiling used to be a single shared counter, so 60 calls a minute from
 * anybody holding the anon key — which ships in the bundle — answered PT429 to
 * every real invitee for the rest of that minute. The bucket is derived from
 * the token being presented instead, which is the one thing this caller cannot
 * vary, so two tokens are two counters. Run as the owner because cf_hash_token
 * is revoked from anon, and the property under test is the key, not the grant.
 */
do $$ declare a text := 'bucket-a'; b text; i integer; begin
  for i in 1..200 loop
    b := 'bucket-b-' || i;
    exit when substring(public.cf_hash_token(b) from 1 for 2)
           <> substring(public.cf_hash_token(a) from 1 for 2);
  end loop;
  perform public.cf_invite_preview(a);
  perform public.cf_invite_preview(b);
  if (select count(*) from public.cf_invite_probes) <> 2 then
    raise exception 'FAIL two tokens shared one bucket';
  end if;
  raise notice 'ok   two tokens are two buckets, so one of them cannot shut the other';
end $$;
delete from public.cf_invite_probes;

select test_login('outsider@other.io');
set role authenticated;
do $$ declare tok text; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  perform test_expect(format('select public.cf_accept_invite(%L)', tok), 'PT403', 'accept an invite addressed to someone else');
end $$;
reset role;
select test_login('member@acme.com');
set role authenticated;
do $$ declare tok text; v json; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  v := public.cf_accept_invite(tok);
  if v ->> 'role' <> 'member' then raise exception 'FAIL accept role %', v ->> 'role'; end if;
  perform test_expect(format('select public.cf_accept_invite(%L)', tok), 'PT410', 'accept the same invite twice');
  raise notice 'ok   accept_invite honours the email restriction and burns the token';
end $$;
select test_expect('select public.cf_list_members(tid())', 'PT403', 'a member cannot list the team');
select test_expect('select public.cf_create_invite(tid(), ''member'', null, interval ''1 day'')', 'PT403', 'a member cannot invite');
reset role;

-- ---------------------------------------------------------------- team management
select test_login('owner@acme.com');
set role authenticated;
do $$ declare n int; begin
  select count(*) into n from public.cf_list_members(tid());
  if n <> 3 then raise exception 'FAIL list_members has % rows, expected 3', n; end if;
  if (select role from public.cf_list_members(tid()) limit 1) <> 'owner' then
    raise exception 'FAIL list_members is not ordered owner-first';
  end if;
  -- two by now: the colleague's invite above and the email-restricted one.
  select count(*) into n from public.cf_list_invites(tid()) where status = 'accepted';
  if n <> 2 then raise exception 'FAIL list_invites accepted count %', n; end if;
  raise notice 'ok   list_members / list_invites';
end $$;
select test_expect('select public.cf_change_member_role(tid(), uid_of(''owner@acme.com''), ''member'')', 'PT422', 'change my own role');
select test_expect('select public.cf_remove_member(tid(), uid_of(''owner@acme.com''))', 'PT422', 'remove myself');
select public.cf_change_member_role(tid(), uid_of('admin@acme.com'), 'admin');
do $$ begin
  if role_of('admin@acme.com') <> 'admin' then raise exception 'FAIL change_member_role did not apply'; end if;
  raise notice 'ok   change_member_role';
end $$;
reset role;

-- ---------------------------------------------------------------- many bots, granted per person
-- The workspace holds owner@acme.com (owner), admin@acme.com (admin) and
-- member@acme.com (member) by now.
select test_login('member@acme.com');
set role authenticated;
select test_expect('select public.cf_new_bot(''Sneaky bot'')', 'PT403', 'a member adding a bot');
reset role;

select test_login('owner@acme.com');
set role authenticated;
create temporary table t_bot2 as select public.cf_new_bot('Second bot') as v;
grant select on t_bot2 to public;
reset role;
set role service_role;
do $$ declare v_slot uuid; begin
  select (t_bot2.v ->> 'id')::uuid into v_slot from t_bot2;
  perform public.cf_bot_created(v_slot, 'bot-456');
end $$;
reset role;

select test_login('owner@acme.com');
set role authenticated;
do $$ begin
  if public.cf_my_bot_ids() <> array['bot-123', 'bot-456'] then
    raise exception 'FAIL the owner does not see both bots: %', public.cf_my_bot_ids();
  end if;
  if public.cf_gate_for_bot('bot-456') <> 'owner' then raise exception 'FAIL the gate for the second bot'; end if;
  raise notice 'ok   a second bot, and the gate answers for both';
end $$;
reset role;

-- An admin needs no grant: administering the workspace means seeing every bot.
select test_login('admin@acme.com');
set role authenticated;
do $$ begin
  -- bot-777 is their own workspace's; the point is that bot-456 is there without
  -- anybody having granted it.
  if public.cf_my_bot_ids() <> array['bot-123', 'bot-456', 'bot-777'] then
    raise exception 'FAIL an admin does not see every bot: %', public.cf_my_bot_ids();
  end if;
  raise notice 'ok   an admin sees every bot of the workspace without a grant';
end $$;
reset role;

-- A member sees exactly what was granted, and nothing before that.
select test_login('member@acme.com');
set role authenticated;
do $$ begin
  if public.cf_my_bot_ids() <> '{}'::text[] then
    raise exception 'FAIL an ungranted member sees bots: %', public.cf_my_bot_ids();
  end if;
  raise notice 'ok   a member with no grant reaches no bot';
end $$;
select test_expect('select public.cf_list_bots(tid())', 'PT403', 'a member listing the workspace bots');
reset role;

select test_login('owner@acme.com');
set role authenticated;
select test_expect('select public.cf_grant_bot(bot_slot(''First bot''), uid_of(''outsider@other.io''))', 'PT404',
                   'granting a bot to somebody outside the workspace');
select test_expect('select public.cf_grant_bot(gen_random_uuid(), uid_of(''member@acme.com''))', 'PT404',
                   'granting a bot that does not exist');
select public.cf_grant_bot(bot_slot('First bot'), uid_of('member@acme.com'));
select public.cf_grant_bot(bot_slot('First bot'), uid_of('member@acme.com'));  -- twice is once
reset role;

select test_login('member@acme.com');
set role authenticated;
do $$ declare v json; begin
  if public.cf_my_bot_ids() <> array['bot-123'] then
    raise exception 'FAIL a granted member sees %, expected bot-123 alone', public.cf_my_bot_ids();
  end if;
  if public.cf_gate_for_bot('bot-456') is not null then
    raise exception 'FAIL a grant on one bot opened another';
  end if;
  if public.cf_gate_for_bot('bot-123') <> 'member' then
    raise exception 'FAIL the gate does not report the granted member''s role';
  end if;
  v := public.cf_my_workspace();
  if json_array_length(v -> 'bots') <> 1 then raise exception 'FAIL my_workspace lists ungranted bots: %', v -> 'bots'; end if;
  raise notice 'ok   a grant opens one bot and only that one';
end $$;
reset role;

select test_login('owner@acme.com');
set role authenticated;
do $$ declare n int; v_bots uuid[]; begin
  select count(*) into n from public.cf_list_bots(tid());
  if n <> 2 then raise exception 'FAIL list_bots has % rows, expected 2', n; end if;
  select b.members into v_bots from public.cf_list_bots(tid()) b where b.name = 'First bot';
  if v_bots <> array[uid_of('member@acme.com')] then raise exception 'FAIL list_bots members: %', v_bots; end if;
  select m.bots into v_bots from public.cf_list_members(tid()) m where m.user_id = uid_of('member@acme.com');
  if v_bots <> array[bot_slot('First bot')] then raise exception 'FAIL list_members bots: %', v_bots; end if;
  select m.bots into v_bots from public.cf_list_members(tid()) m where m.user_id = uid_of('admin@acme.com');
  if v_bots <> '{}'::uuid[] then raise exception 'FAIL an admin carries grant rows: %', v_bots; end if;
  raise notice 'ok   list_bots and list_members agree on who was granted what';
end $$;

-- Renaming: the app's name, which the server mirrors into Chatfuel.
select test_expect('select public.cf_rename_bot(bot_slot(''Second bot''), ''  '')', 'PT422', 'renaming a bot to nothing');
select test_expect('select public.cf_rename_bot(gen_random_uuid(), ''Ghost'')', 'PT404', 'renaming a bot that does not exist');
do $$ declare v json; begin
  v := public.cf_rename_bot(bot_slot('Second bot'), 'Renamed bot');
  if v ->> 'previous_name' <> 'Second bot' then raise exception 'FAIL rename does not report the old name: %', v; end if;
  if v ->> 'bot_id' <> 'bot-456' then raise exception 'FAIL rename does not report the bot id: %', v; end if;
  v := public.cf_bot_for_admin(bot_slot('Renamed bot'));
  if v ->> 'bot_id' <> 'bot-456' then raise exception 'FAIL bot_for_admin: %', v; end if;
  raise notice 'ok   rename_bot reports the old name and the bot id for the server to mirror';
end $$;
reset role;

select test_login('member@acme.com');
set role authenticated;
select test_expect('select public.cf_rename_bot(bot_slot(''Renamed bot''), ''Mine now'')', 'PT403', 'a member renaming a bot');
select test_expect('select public.cf_remove_bot(bot_slot(''Renamed bot''))', 'PT403', 'a member deleting a bot');
reset role;

-- Deleting: the row goes after Chatfuel has deleted the bot, and takes the
-- grants with it. Two steps and two roles on purpose. The row keeps its
-- Chatfuel id until the server lets it go, so an admin talking to PostgREST
-- without the server cannot drop a row whose bot is still alive upstream —
-- which would strand the bot on the deployment's plan and hand its place back
-- under both of cf_new_bot's ceilings.
select test_login('owner@acme.com');
set role authenticated;
select public.cf_grant_bot(bot_slot('Renamed bot'), uid_of('member@acme.com'));
select test_expect('select public.cf_remove_bot(bot_slot(''Renamed bot''))', 'PT409',
                   'an admin deleting a row whose bot still exists');
reset role;

set role service_role;
do $$ declare v json; begin
  v := public.cf_bot_deleted(bot_slot('Renamed bot'));
  if v ->> 'bot_id' <> 'bot-456' then
    raise exception 'FAIL bot_deleted does not report the id it let go: %', v;
  end if;
  raise notice 'ok   only the server lets go of the Chatfuel id';
end $$;
reset role;

set role authenticated;
do $$ declare v json; begin
  v := public.cf_remove_bot(bot_slot('Renamed bot'));
  if v ->> 'name' <> 'Renamed bot' then raise exception 'FAIL remove_bot does not report the row: %', v; end if;
  if public.cf_my_bot_ids() <> array['bot-123'] then
    raise exception 'FAIL the deleted bot is still in the gate set: %', public.cf_my_bot_ids();
  end if;
  if bot_names_of('member@acme.com') <> 'First bot' then
    raise exception 'FAIL the deleted bot left its grants behind: %', bot_names_of('member@acme.com');
  end if;
  raise notice 'ok   remove_bot takes the bot out of the gate set and its grants with it';
end $$;

-- An invite can carry the bots the person arrives with.
select test_expect(
  format('select public.cf_create_invite(tid(), ''member'', null, interval ''1 day'', array[%L]::uuid[])',
         slot_row_of('bot-777')),
  'PT404', 'an invite naming a bot from another workspace');
select public.cf_revoke_bot(bot_slot('First bot'), uid_of('member@acme.com'));
create temporary table t_inv_bots as
  select public.cf_create_invite(tid(), 'member', 'member@acme.com', interval '1 day',
                                 array[bot_slot('First bot')]) as v;
grant select on t_inv_bots to public;
do $$ declare v_ids uuid[]; begin
  select i.bot_ids into v_ids from public.cf_list_invites(tid()) i
    where i.id = (select (t_inv_bots.v ->> 'id')::uuid from t_inv_bots);
  if v_ids <> array[bot_slot('First bot')] then raise exception 'FAIL list_invites bot_ids: %', v_ids; end if;
end $$;
reset role;
select test_login('member@acme.com');
set role authenticated;
do $$ declare tok text; begin
  if public.cf_my_bot_ids() <> '{}'::text[] then
    raise exception 'FAIL revoke_bot left the bot reachable: %', public.cf_my_bot_ids();
  end if;
  select t_inv_bots.v ->> 'token' into tok from t_inv_bots;
  perform public.cf_accept_invite(tok);
  if public.cf_my_bot_ids() <> array['bot-123'] then
    raise exception 'FAIL accepting an invite did not grant the bots it named: %', public.cf_my_bot_ids();
  end if;
  raise notice 'ok   revoke_bot closes the gate, and an invite grants the bots it names';
end $$;
reset role;

-- an admin may manage members but not the owner
select test_login('admin@acme.com');
set role authenticated;
select test_expect('select public.cf_change_member_role(tid(), uid_of(''owner@acme.com''), ''member'')', 'PT409', 'change the owner''s role');
select test_expect('select public.cf_remove_member(tid(), uid_of(''owner@acme.com''))', 'PT409', 'remove the owner');
select test_expect('select public.cf_transfer_ownership(tid(), uid_of(''member@acme.com''))', 'PT403', 'an admin transferring ownership');
reset role;

-- transfer: the partial unique index makes the ORDER of the two updates load-bearing
select test_login('owner@acme.com');
set role authenticated;
select test_expect('select public.cf_leave_tenant(tid())', 'PT409', 'the owner leaving');
select test_expect('select public.cf_transfer_ownership(tid(), uid_of(''outsider@other.io''))', 'PT404', 'transfer to a non-member');
select public.cf_transfer_ownership(tid(), uid_of('admin@acme.com'));
do $$ begin
  if role_of('admin@acme.com') <> 'owner' or role_of('owner@acme.com') <> 'admin' then
    raise exception 'FAIL transfer_ownership did not swap the roles';
  end if;
  if owner_count() <> 1 then raise exception 'FAIL more than one owner after the transfer'; end if;
  raise notice 'ok   transfer_ownership swaps owner ↔ admin, single-owner index holds';
end $$;
-- the previous owner is an admin now and may leave
select public.cf_leave_tenant(tid());
do $$ begin
  if public.cf_gate_for_bot('bot-123') is not null then raise exception 'FAIL leave_tenant did not remove the membership'; end if;
  raise notice 'ok   leave_tenant';
end $$;
select test_expect('select public.cf_leave_tenant(tid())', 'PT404', 'leaving twice');
reset role;

-- ---------------------------------------------------------------- invite revoke
select test_login('admin@acme.com');
set role authenticated;
create temporary table t_inv2 as select public.cf_create_invite(tid(), 'admin', null, interval '1 day') as v;
grant select on t_inv2 to public;
do $$ declare v_id uuid; v_status text; begin
  select (t_inv2.v ->> 'id')::uuid into v_id from t_inv2;
  perform public.cf_revoke_invite(v_id);
  select i.status into v_status from public.cf_list_invites(tid()) i where i.id = v_id;
  if v_status is distinct from 'revoked' then raise exception 'FAIL revoke_invite: status %', v_status; end if;
  raise notice 'ok   revoke_invite';
end $$;
reset role;

-- an accepted invite must never come back to life
set role anon;
do $$ declare tok text; begin
  select t_inv.v ->> 'token' into tok from t_inv;
  if (public.cf_invite_preview(tok) ->> 'status') <> 'accepted' then raise exception 'FAIL preview after accept'; end if;
  raise notice 'ok   preview of a used invite says accepted';
end $$;
reset role;

-- ---------------------------------------------------------------- structural guarantees
do $$ declare bad text; begin
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'cf\_%'
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('cf_invite_preview');
  if bad is not null then raise exception 'FAIL anon can execute: %', bad; end if;
  raise notice 'ok   cf_invite_preview is the only RPC anon may execute';
end $$;
do $$ declare bad text; begin
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'cf\_%'
    and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'insert'))
    and c.relname <> 'cf_profiles';
  if bad is not null then raise exception 'FAIL tables reachable without an RPC: %', bad; end if;
  raise notice 'ok   cf_ tables are RPC-only (cf_profiles keeps its own-row policy)';
end $$;
do $$ declare bad text; begin
  select string_agg(c.relname, ', ') into bad from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'cf\_%' and not c.relrowsecurity;
  if bad is not null then raise exception 'FAIL RLS is off on: %', bad; end if;
  raise notice 'ok   RLS enabled on every cf_ table';
end $$;

-- ---------------------------------------------------------------- invariants that only bite later
-- An invite must never DOWNGRADE someone who already holds a higher role.
select test_login('admin@acme.com');   -- the owner, after the transfer above
set role authenticated;
create temporary table t_inv3 as select public.cf_create_invite(tid(), 'member', null, interval '1 day') as v;
grant select on t_inv3 to public;
do $$ declare tok text; v json; begin
  select t_inv3.v ->> 'token' into tok from t_inv3;
  v := public.cf_accept_invite(tok);           -- accepted by the owner themselves
  if v ->> 'role' <> 'owner' then raise exception 'FAIL a member invite downgraded the owner to %', v ->> 'role'; end if;
  raise notice 'ok   accept_invite never downgrades an existing role';
end $$;
-- An invite decides the ROLE somebody arrives with: this outsider is not a
-- member at all right now (they left above) and comes back in as an admin.
create temporary table t_inv4 as
  select public.cf_create_invite(tid(), 'admin', 'outsider@other.io', interval '1 day') as v;
grant select on t_inv4 to public;
select public.cf_change_member_role(tid(), uid_of('member@acme.com'), 'admin');
reset role;
select test_login('outsider@other.io');
set role authenticated;
do $$ declare tok text; v json; begin
  select t_inv4.v ->> 'token' into tok from t_inv4;
  v := public.cf_accept_invite(tok);
  if v ->> 'role' <> 'admin' then raise exception 'FAIL invited outsider got %', v ->> 'role'; end if;
  raise notice 'ok   an invite grants the role it names';
end $$;
reset role;
-- An admin does not outrank an admin. Both of these act on people BELOW the
-- caller only, because a demotion is the first half of taking a peer's account:
-- cf_recovery_authorize hands out a reset link for anyone below the caller, and
-- an admin who could demote an equal would put them there.
select test_login('member@acme.com');   -- promoted to admin two statements ago
set role authenticated;
select test_expect('select public.cf_change_member_role(tid(), uid_of(''outsider@other.io''), ''member'')', 'PT403', 'an admin demoting a fellow admin');
select test_expect('select public.cf_remove_member(tid(), uid_of(''outsider@other.io''))', 'PT403', 'an admin removing a fellow admin');
select test_expect('select public.cf_recovery_authorize(tid(), ''outsider@other.io'')', 'PT403', 'an admin resetting a fellow admin');
reset role;
-- The owner outranks them both, and still may.
select test_login('admin@acme.com');    -- the owner since the transfer above
set role authenticated;
select public.cf_change_member_role(tid(), uid_of('outsider@other.io'), 'member');
do $$ begin
  if role_of('outsider@other.io') <> 'member' then raise exception 'FAIL the owner could not demote an admin'; end if;
  raise notice 'ok   an admin may not touch an equal, and the owner may';
end $$;
reset role;

-- The profiles mirror follows an email / metadata change on auth.users.
update auth.users set email = 'renamed@acme.com', raw_user_meta_data = '{"full_name":"Renamed"}'
  where email = 'member@acme.com';
do $$ begin
  if (select full_name from public.cf_profiles where email = 'renamed@acme.com') <> 'Renamed' then
    raise exception 'FAIL the profiles trigger did not follow the update';
  end if;
  raise notice 'ok   profiles trigger follows email / metadata updates';
end $$;

-- Deleting the owner's auth user cascades their membership away. The workspace
-- itself stays — the people they invited keep working — and an admin who is
-- already inside can take ownership. Nobody new arrives this way.
delete from auth.users where email = 'admin@acme.com';
do $$ begin
  if (select count(*) from public.cf_tenants where id = tid()) <> 1 then
    raise exception 'FAIL the workspace died with its owner';
  end if;
  if owner_count() <> 0 then raise exception 'FAIL the owner membership survived the user delete'; end if;
  raise notice 'ok   deleting the owner leaves the workspace and its members standing';
end $$;
select test_login('renamed@acme.com');   -- an admin of this workspace
set role authenticated;
do $$ declare v json; begin
  v := public.cf_claim_ownership(tid());
  if v ->> 'role' <> 'owner' then raise exception 'FAIL an admin could not adopt an ownerless workspace'; end if;
  perform test_expect('select public.cf_claim_ownership(tid())', 'PT409', 'claiming an owned workspace');
  raise notice 'ok   an admin takes over an ownerless workspace, and only while it is ownerless';
end $$;
reset role;

-- The admin door's attempt counter: the proxy's, and only the proxy's.
set role anon;
select test_expect('select public.cf_admin_attempt_wait(''203.0.113.1'')', '42501', 'anon reading the admin counter');
select test_expect('select public.cf_admin_attempt_clear(''203.0.113.1'')', '42501', 'anon clearing the admin counter');
reset role;

set role service_role;
do $$ declare i integer; v integer; begin
  if public.cf_admin_attempt_wait('203.0.113.1') is not null then
    raise exception 'FAIL a caller with no history is already waiting';
  end if;
  for i in 1..3 loop
    if public.cf_admin_attempt_fail('203.0.113.1', 300000) <> 0 then
      raise exception 'FAIL one of the first three wrong answers cost a wait';
    end if;
  end loop;
  v := public.cf_admin_attempt_fail('203.0.113.1', 300000);
  if v <> 1000 then raise exception 'FAIL the fourth wrong answer waits % ms', v; end if;
  if public.cf_admin_attempt_wait('203.0.113.1') <= 0 then
    raise exception 'FAIL the wait another instance would read is not there';
  end if;
  -- The ceiling is the caller's, and it is the caller's because a bucket
  -- everybody shares must not lock the admin out for five minutes.
  v := public.cf_admin_attempt_fail('203.0.113.1', 1500);
  if v <> 1500 then raise exception 'FAIL the wait passed the ceiling it was given: %', v; end if;
  -- One caller's history is not another's.
  if public.cf_admin_attempt_wait('203.0.113.2') is not null then
    raise exception 'FAIL a second caller inherited the first one''s wait';
  end if;
  perform public.cf_admin_attempt_clear('203.0.113.1');
  if public.cf_admin_attempt_wait('203.0.113.1') is not null then
    raise exception 'FAIL a right password did not forget the history';
  end if;
  raise notice 'ok   admin attempts: three free, then doubling to the ceiling, cleared by a right answer';
end $$;
reset role;

\echo '--- scenario complete'
