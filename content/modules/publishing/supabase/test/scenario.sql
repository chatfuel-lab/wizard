-- Exercises every cf_pub_* RPC the way PostgREST would: as the `anon`,
-- `authenticated` or `service_role` role. Expected failures are asserted by
-- SQLSTATE, so a silent behaviour change fails the run.
\set ON_ERROR_STOP on
\set QUIET on

/* The shared secret exists only here: the database is only ever given its
   sha256, and the app is the only side that holds the value itself. */
create or replace function secret() returns text language sql immutable as $$
  select 'not-a-real-secret-only-this-file-knows-it' $$;
create or replace function secret_hash() returns text language sql immutable as $$
  select encode(sha256(convert_to(secret(), 'UTF8')), 'base64') $$;

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

create or replace function post_id(p_bot text, p_caption text) returns uuid
language sql security definer as $$
  select id from public.cf_pub_posts where bot_id = p_bot and caption = p_caption $$;
create or replace function post_col(p_id uuid, p_col text) returns text
language plpgsql security definer as $$
declare v text; begin
  execute format('select %I::text from public.cf_pub_posts where id = %L', p_col, p_id) into v;
  return v;
end $$;
create or replace function requests() returns int language sql security definer as $$
  select count(*)::int from net._http_request_log $$;
create or replace function last_request() returns net._http_request_log
language sql security definer as $$
  select * from net._http_request_log order by id desc limit 1 $$;
create or replace function job_schedule(p_name text) returns text language sql security definer as $$
  select schedule from cron.job where jobname = p_name $$;

-- ---------------------------------------------------------------- the jobs and the bucket
do $$ begin
  if job_schedule('cf-pub-claim-due') is distinct from '* * * * *' then
    raise exception 'FAIL the due job is not scheduled every minute';
  end if;
  if job_schedule('cf-pub-reap') is distinct from '* * * * *' then
    raise exception 'FAIL the reaper is not scheduled every minute';
  end if;
  if (select count(*) from cron.job) <> 2 then
    raise exception 'FAIL re-running the migration piled up % jobs', (select count(*) from cron.job);
  end if;
  raise notice 'ok   two jobs, one minute each, and re-running the migration re-points them';
end $$;

do $$ declare v_public boolean; begin
  select public into v_public from storage.buckets where id = 'cf-pub-media';
  if v_public is distinct from true then
    raise exception 'FAIL the media bucket is missing or not public';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
             and policyname like 'cf_pub_%') then
    raise exception 'FAIL the bucket carries a policy; reads come from the public path, and a policy only adds listing';
  end if;
  raise notice 'ok   a public media bucket served from its public path, with no policy of its own';
end $$;

-- ---------------------------------------------------------------- anon reaches nothing
set role anon;
select test_expect('select * from public.cf_pub_posts', '42501', 'anon cannot read cf_pub_posts');
select test_expect('select * from public.cf_pub_config', '42501', 'anon cannot read cf_pub_config');
select test_expect('select * from public.cf_pub_migrations', '42501', 'anon cannot read cf_pub_migrations');
select test_expect('select public.cf_pub_list(''bot-1'')', '42501', 'anon cannot list posts');
select test_expect('select public.cf_pub_create(''bot-1'', ''{}''::jsonb)', '42501', 'anon cannot create a post');
select test_expect('select public.cf_pub_update(''bot-1'', gen_random_uuid(), ''{}''::jsonb)', '42501', 'anon cannot change a post');
select test_expect('select public.cf_pub_delete(''bot-1'', gen_random_uuid())', '42501', 'anon cannot delete a post');
select test_expect('select public.cf_pub_config_json()', '42501', 'anon cannot read the configuration');
select test_expect('select public.cf_pub_register(''https://x.test'')', '42501', 'anon cannot register a callback');
select test_expect('select public.cf_pub_take(gen_random_uuid())', '42501', 'anon cannot take a post');
select test_expect('select public.cf_pub_claim_due()', '42501', 'anon cannot run the scheduler');
select test_expect('select public.cf_pub_reap()', '42501', 'anon cannot run the reaper');
select test_expect('select public.cf_pub_hash(''x'')', '42501', 'anon cannot use the hash helper');
reset role;

set role authenticated;
select test_expect('select * from public.cf_pub_posts', '42501', 'a signed-in browser cannot read cf_pub_posts');
select test_expect('select public.cf_pub_list(''bot-1'')', '42501', 'a signed-in browser cannot list posts');
select test_expect('select public.cf_pub_create(''bot-1'', ''{}''::jsonb)', '42501', 'a signed-in browser cannot create a post');
select test_expect('select public.cf_pub_config_json()', '42501', 'a signed-in browser cannot read the configuration');
reset role;

-- ---------------------------------------------------------------- registering
set role service_role;
select test_expect('select public.cf_pub_register(null)', 'PT422', 'a callback with no address');
select test_expect('select public.cf_pub_register(''app.example.com'')', 'PT422', 'a callback address that is not a URL');
-- The shared secret rides this address once a minute, so plain http is refused
-- everywhere except a server on this machine, which has no wire to read it off.
select test_expect('select public.cf_pub_register(''http://app.example.com/hook'')', 'PT422', 'a cleartext callback address');
do $$ declare v json; begin
  v := public.cf_pub_config_json();
  if (v ->> 'publish_url') is not null then raise exception 'FAIL a fresh project already has a callback'; end if;
  if (v ->> 'has_secret')::boolean then raise exception 'FAIL a fresh project already has a secret'; end if;
  raise notice 'ok   a fresh project is not registered and holds no secret';
end $$;
reset role;

set role service_role;
do $$ declare v json; begin
  v := public.cf_pub_register('https://app.example.test/chatfuel/publishing/publish-due', 'bypass-token', secret_hash());
  if (v ->> 'publish_url') <> 'https://app.example.test/chatfuel/publishing/publish-due' then
    raise exception 'FAIL the callback address was not recorded';
  end if;
  if not (v ->> 'has_secret')::boolean or not (v ->> 'has_bypass')::boolean then
    raise exception 'FAIL registering did not record both secrets';
  end if;
  if v::text like '%bypass-token%' or v::text like '%' || secret_hash() || '%' then
    raise exception 'FAIL the configuration answer carries a secret';
  end if;
  raise notice 'ok   registering records the address and both secrets, and answers with neither';
end $$;
-- A second call with nothing but the address keeps what is already there: a
-- redeploy re-registers, it does not wipe the scheduler's credentials.
do $$ declare v json; begin
  v := public.cf_pub_register('https://app.example.test/chatfuel/publishing/publish-due');
  if not (v ->> 'has_secret')::boolean or not (v ->> 'has_bypass')::boolean then
    raise exception 'FAIL re-registering dropped the secrets';
  end if;
  raise notice 'ok   re-registering with no secrets keeps the ones already recorded';
end $$;
-- A development server on this machine is the one place plain http is allowed,
-- because there is no wire between the database and the app to read it off.
do $$ declare v json; begin
  v := public.cf_pub_register('http://localhost:5173/chatfuel/publishing/publish-due');
  if (v ->> 'publish_url') <> 'http://localhost:5173/chatfuel/publishing/publish-due' then
    raise exception 'FAIL a local development callback was refused: %', v;
  end if;
  raise notice 'ok   http is refused unless it is this machine';
end $$;
-- and back to the address the rest of this file expects.
select public.cf_pub_register('https://app.example.test/chatfuel/publishing/publish-due');
reset role;

-- ---------------------------------------------------------------- posts
set role service_role;
select test_expect('select public.cf_pub_create('''', ''{"kind":"post"}''::jsonb)', 'PT422', 'a post belonging to no bot');
select test_expect('select public.cf_pub_create(''bot-1'', ''{"kind":"story-ish"}''::jsonb)', 'PT422', 'a post of an unknown kind');
select test_expect('select public.cf_pub_create(''bot-1'', ''{"kind":"post","media":{}}''::jsonb)', 'PT422', 'media that is not a list');
select test_expect('select public.cf_pub_create(''bot-1'', ''{"kind":"post","scheduledAt":"soonish"}''::jsonb)', 'PT422', 'a time that is not a time');

/* The caption ceiling is 2200 CODEPOINTS. An astral character is two UTF-16
   units, so a limit counted the other way would let this one through at 1100
   and refuse it at 1101. */
do $$ begin
  perform public.cf_pub_create('bot-cap', jsonb_build_object('kind', 'post', 'caption', repeat(U&'\+01F600', 2200)));
  raise notice 'ok   2200 astral characters is a caption';
end $$;
select test_expect(
  format('select public.cf_pub_create(''bot-cap'', jsonb_build_object(''kind'', ''post'', ''caption'', repeat(%L, 2201)))', U&'\+01F600'),
  'PT422', '2201 characters is not');

do $$ declare v json; begin
  v := public.cf_pub_create('bot-1', '{"kind":"post","caption":"A draft","media":[{"id":"m1","type":"image","url":"https://cdn.test/a.jpg","source":"upload"}]}'::jsonb);
  if (v ->> 'status') <> 'draft' then raise exception 'FAIL a post with no time is not a draft: %', v ->> 'status'; end if;
  if (v ->> 'scheduledAt') is not null then raise exception 'FAIL a draft carries a time'; end if;
  if (v ->> 'attempts')::int <> 0 then raise exception 'FAIL a new post has attempts'; end if;
  if jsonb_exists(v::jsonb, 'reel') then raise exception 'FAIL a post that is not a reel carries reel settings'; end if;
  if json_array_length(v -> 'media') <> 1 then raise exception 'FAIL the media list did not round-trip'; end if;
  raise notice 'ok   a post with no time is a draft, and its media round-trips';
end $$;

do $$ declare v json; begin
  v := public.cf_pub_create('bot-1', '{"kind":"reel","caption":"Tomorrow","scheduledAt":"2030-04-01T09:30:00.000Z","reel":{"shareToFeed":true}}'::jsonb);
  if (v ->> 'status') <> 'scheduled' then raise exception 'FAIL a post with a time is not scheduled'; end if;
  if (v ->> 'scheduledAt') <> '2030-04-01T09:30:00.000Z' then
    raise exception 'FAIL the time did not come back as it went in: %', v ->> 'scheduledAt';
  end if;
  if not ((v -> 'reel') ->> 'shareToFeed')::boolean then raise exception 'FAIL reel settings did not round-trip'; end if;
  raise notice 'ok   a post with a time is scheduled, and comes back in UTC exactly as it went in';
end $$;

-- Another tenant's post is not this one's to see, change or delete.
do $$ declare v json; begin
  perform public.cf_pub_create('bot-2', '{"kind":"post","caption":"Someone else"}'::jsonb);
  v := public.cf_pub_list('bot-1');
  if json_array_length(v) <> 2 then raise exception 'FAIL cf_pub_list crossed a bot boundary: %', json_array_length(v); end if;
  raise notice 'ok   a list holds only that bot''s posts';
end $$;
do $$ declare v_other uuid; begin
  v_other := post_id('bot-2', 'Someone else');
  perform test_expect(format('select public.cf_pub_update(''bot-1'', %L, ''{"caption":"mine now"}''::jsonb)', v_other),
                      'PT404', 'changing another bot''s post');
  perform test_expect(format('select public.cf_pub_delete(''bot-1'', %L)', v_other),
                      'PT404', 'deleting another bot''s post');
end $$;

-- The invariant: a time makes a draft scheduled, and taking it away puts it back.
do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-1', 'A draft');
  v := public.cf_pub_update('bot-1', v_id, '{"scheduledAt":"2030-05-05T08:00:00Z"}'::jsonb);
  if (v ->> 'status') <> 'scheduled' then raise exception 'FAIL giving a draft a time left it a draft'; end if;
  v := public.cf_pub_update('bot-1', v_id, '{"scheduledAt":null}'::jsonb);
  if (v ->> 'status') <> 'draft' then raise exception 'FAIL taking the time away left it scheduled'; end if;
  -- A key that is absent is not a key set to null: the caption survives.
  v := public.cf_pub_update('bot-1', v_id, '{"error":"something"}'::jsonb);
  if (v ->> 'caption') <> 'A draft' then raise exception 'FAIL an absent key was treated as a null one'; end if;
  raise notice 'ok   a time and a status stay in step, and an absent key changes nothing';
end $$;
select test_expect(format('select public.cf_pub_update(''bot-1'', %L, ''{"status":"halfway"}''::jsonb)', post_id('bot-1', 'A draft')),
                   'PT422', 'a status that does not exist');

-- Naming a status the time contradicts is refused rather than repaired: the
-- half the caller did not send is the half that would otherwise have moved.
select test_expect(format('select public.cf_pub_update(''bot-1'', %L, ''{"status":"scheduled"}''::jsonb)', post_id('bot-1', 'A draft')),
                   'PT422', 'scheduling a post that has no time');
do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-1', 'A draft');
  perform public.cf_pub_update('bot-1', v_id, '{"scheduledAt":"2030-05-05T08:00:00Z"}'::jsonb);
  perform test_expect(format('select public.cf_pub_update(''bot-1'', %L, ''{"status":"draft"}''::jsonb)', v_id),
                      'PT422', 'drafting a post that still holds a time');
  -- Sending both halves is the way through, and leaves the draft as it was.
  v := public.cf_pub_update('bot-1', v_id, '{"status":"draft","scheduledAt":null}'::jsonb);
  if (v ->> 'status') <> 'draft' then raise exception 'FAIL both halves together did not make it a draft'; end if;
  if (v ->> 'scheduledAt') is not null then raise exception 'FAIL the time survived a draft'; end if;
  raise notice 'ok   a status the time contradicts is refused, and both halves together are not';
end $$;
reset role;

-- ---------------------------------------------------------------- the scheduler
set role service_role;
do $$ begin
  perform public.cf_pub_create('bot-1', '{"kind":"post","caption":"Due now","scheduledAt":"2020-01-01T00:00:00Z"}'::jsonb);
end $$;
reset role;

do $$ declare v_before int; v_row net._http_request_log; v_id uuid; begin
  v_before := requests();
  if public.cf_pub_claim_due() <> 1 then raise exception 'FAIL the scheduler did not take exactly the one due post'; end if;
  if requests() <> v_before + 1 then raise exception 'FAIL the scheduler did not knock'; end if;
  v_id := post_id('bot-1', 'Due now');
  if post_col(v_id, 'status') <> 'publishing' then raise exception 'FAIL a claimed post is not publishing'; end if;
  if post_col(v_id, 'claimed_at') is null then raise exception 'FAIL a claimed post has no claim time'; end if;
  if post_col(v_id, 'taken_at') is not null then raise exception 'FAIL a post is taken before it is answered'; end if;
  if post_col(v_id, 'attempts')::int <> 1 then raise exception 'FAIL the claim did not count as an attempt'; end if;

  v_row := last_request();
  if v_row.url <> 'https://app.example.test/chatfuel/publishing/publish-due' then
    raise exception 'FAIL the scheduler knocked at %', v_row.url;
  end if;
  if (v_row.body ->> 'id')::uuid <> v_id then raise exception 'FAIL the callback names the wrong post'; end if;
  if v_row.timeout_milliseconds <> 300000 then
    raise exception 'FAIL the callback budget is %, which cannot outlast a transcode', v_row.timeout_milliseconds;
  end if;
  if (v_row.headers ->> 'x-chatfuel-publish-key') <> secret_hash() then
    raise exception 'FAIL the callback does not carry the stored hash as its credential';
  end if;
  if v_row.headers::text like '%' || secret() || '%' then
    raise exception 'FAIL the callback carries the secret itself';
  end if;
  if (v_row.headers ->> 'x-vercel-protection-bypass') <> 'bypass-token' then
    raise exception 'FAIL the callback would be bounced by deployment protection';
  end if;
  raise notice 'ok   the scheduler claims what is due and knocks with the hash, the bypass and a five-minute budget';
end $$;

-- A second run finds nothing: the status change, not the lock, is what makes a
-- claimed post invisible.
do $$ begin
  if public.cf_pub_claim_due() <> 0 then raise exception 'FAIL a claimed post was claimed again'; end if;
  raise notice 'ok   a claimed post is not claimed twice';
end $$;

-- ---------------------------------------------------------------- taking and reporting
set role service_role;
do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-1', 'Due now');
  v := public.cf_pub_take(v_id);
  if (v ->> 'botId') <> 'bot-1' or (v ->> 'kind') <> 'post' then raise exception 'FAIL take answered the wrong shape'; end if;
  raise notice 'ok   the app takes the post it was knocked about';
  -- Delivered twice is a thing HTTP does; published twice must not be.
  perform test_expect(format('select public.cf_pub_take(%L)', v_id), 'PT409', 'the same callback arriving twice');
end $$;
reset role;

set role anon;
do $$ declare v_id uuid; begin
  v_id := post_id('bot-1', 'Due now');
  -- Reporting needs the secret and the bot the post belongs to — no session and
  -- no service key, which is the point: the key that can do everything never
  -- has to go near whatever answers callbacks.
  perform test_expect(format('select public.cf_pub_report(''wrong'', %L, ''bot-1'', ''published'')', v_id),
                      'PT401', 'reporting with the wrong secret');
  perform test_expect(format('select public.cf_pub_report(null, %L, ''bot-1'', ''published'')', v_id),
                      'PT401', 'reporting with no secret at all');
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-1'', ''halfway'')', secret(), v_id),
                      'PT422', 'reporting an outcome that is not one');
  perform test_expect(format('select public.cf_pub_report(%L, %L, null, ''published'')', secret(), v_id),
                      'PT422', 'reporting without saying which bot');
  -- The secret is one value for the whole deployment. Naming the wrong bot is
  -- the case that matters: holding it must not be enough to write an outcome
  -- onto a post of a bot the caller never had.
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-2'', ''published'')', secret(), v_id),
                      'PT404', 'reporting a post as if it belonged to another bot');
  raise notice 'ok   the secret alone does not reach another bot''s post';
end $$;

do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-1', 'Due now');
  v := public.cf_pub_report(secret(), v_id, 'bot-1', 'published', 'media-9', 'https://example.test/p/9');
  if (v ->> 'status') <> 'published' then raise exception 'FAIL the outcome was not recorded'; end if;
  if (v ->> 'mediaId') <> 'media-9' then raise exception 'FAIL the media id was not recorded'; end if;
  if (v ->> 'permalink') <> 'https://example.test/p/9' then raise exception 'FAIL the permalink was not recorded'; end if;
  if (v ->> 'error') is not null then raise exception 'FAIL a published post carries an error'; end if;
  raise notice 'ok   the app reports the outcome with the secret and the bot, from the role a browser has';
end $$;
reset role;

-- A success arrives late, after the reaper has already put the post back. The
-- post IS on the network, so the report wins — the alternative is publishing it
-- a second time.
set role service_role;
do $$ begin
  perform public.cf_pub_create('bot-1', '{"kind":"post","caption":"Late report","scheduledAt":"2020-01-01T00:00:00Z"}'::jsonb);
end $$;
reset role;
-- Put the row into the state a late report actually finds it in, by the path
-- that produces it: the scheduler claims it (attempts 1), the publish runs long,
-- and the reaper puts it back before the outcome arrives. `attempts` survives
-- the reaper, and that is what separates this from a post nobody ever sent.
do $$ declare v_id uuid; begin
  if public.cf_pub_claim_due() <> 1 then raise exception 'FAIL the scheduler did not take the late post'; end if;
  v_id := post_id('bot-1', 'Late report');
  update public.cf_pub_posts set claimed_at = now() - interval '20 minutes' where id = v_id;
  if public.cf_pub_reap() <> 1 then raise exception 'FAIL the reaper did not put the late post back'; end if;
  if post_col(v_id, 'status') <> 'scheduled' then
    raise exception 'FAIL the late post is %, not back in the queue', post_col(v_id, 'status');
  end if;
end $$;
set role anon;
do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-1', 'Late report');
  v := public.cf_pub_report(secret(), v_id, 'bot-1', 'published', 'media-late', null);
  if (v ->> 'status') <> 'published' then raise exception 'FAIL a late success was refused'; end if;
  -- A late FAILURE is refused instead: it must not overwrite work somebody has
  -- since edited or put back in the queue by hand. `cf_pub_report` only takes a
  -- 'failed' outcome while the row is still `status = 'publishing'`, and the
  -- success just above already moved it to 'published'.
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-1'', ''failed'', ''media-late'', null, ''too late'')', secret(), v_id),
                      'PT404', 'a late failure does not overwrite a recorded success');
end $$;
do $$ declare v_id uuid; begin
  v_id := post_id('bot-1', 'A draft');
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-1'', ''failed'', null, null, ''too late'')', secret(), v_id),
                      'PT404', 'a failure reported about a post nobody claimed');
  -- And a SUCCESS about one is refused too. Holding the callback secret says
  -- what happened to a post the scheduler sent out; it does not get to declare
  -- a draft published, with a permalink of the caller's choosing, on an id it
  -- guessed. `attempts` is 0 on every row the scheduler never claimed.
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-1'', ''published'', ''media-x'', ''https://evil.test/p/1'')', secret(), v_id),
                      'PT404', 'a success reported about a post nobody queued');
  raise notice 'ok   a late success is accepted, and a report about an unqueued post is not';
end $$;
-- The permalink is handed back to a browser as the link to the live post.
do $$ declare v_id uuid; begin
  v_id := post_id('bot-1', 'Late report');
  perform test_expect(format('select public.cf_pub_report(%L, %L, ''bot-1'', ''published'', null, ''javascript:alert(1)'')', secret(), v_id),
                      'PT422', 'a permalink that is not an https URL');
  raise notice 'ok   a permalink must be an https URL';
end $$;
reset role;

-- ---------------------------------------------------------------- the reaper
-- A claim nobody came back for. The two cases differ: one never started, one
-- may already be on the network.
do $$ declare v_never uuid; v_started uuid; v_spent uuid; begin
  set role service_role;
  perform public.cf_pub_create('bot-3', '{"kind":"post","caption":"Never taken","scheduledAt":"2020-01-01T00:00:00Z"}'::jsonb);
  perform public.cf_pub_create('bot-3', '{"kind":"post","caption":"Taken then silent","scheduledAt":"2020-01-01T00:00:00Z"}'::jsonb);
  perform public.cf_pub_create('bot-3', '{"kind":"post","caption":"Out of attempts","scheduledAt":"2020-01-01T00:00:00Z"}'::jsonb);
  reset role;
  v_never := post_id('bot-3', 'Never taken');
  v_started := post_id('bot-3', 'Taken then silent');
  v_spent := post_id('bot-3', 'Out of attempts');
  update public.cf_pub_posts set status = 'publishing', claimed_at = now() - interval '20 minutes',
    taken_at = null, attempts = 1 where id = v_never;
  update public.cf_pub_posts set status = 'publishing', claimed_at = now() - interval '20 minutes',
    taken_at = now() - interval '19 minutes', attempts = 1 where id = v_started;
  update public.cf_pub_posts set status = 'publishing', claimed_at = now() - interval '20 minutes',
    taken_at = null, attempts = 3 where id = v_spent;

  if public.cf_pub_reap() <> 3 then raise exception 'FAIL the reaper did not sweep all three'; end if;
  if post_col(v_never, 'status') <> 'scheduled' then
    raise exception 'FAIL a callback that never arrived was not put back: %', post_col(v_never, 'status');
  end if;
  if post_col(v_never, 'claimed_at') is not null then raise exception 'FAIL a swept post keeps its claim'; end if;
  if post_col(v_started, 'status') <> 'failed' then
    raise exception 'FAIL a publish that may already have gone out was queued again';
  end if;
  if post_col(v_started, 'error') is null then raise exception 'FAIL a failed post says nothing about why'; end if;
  if post_col(v_spent, 'status') <> 'failed' then raise exception 'FAIL a post past the attempt cap was queued again'; end if;
  raise notice 'ok   the reaper puts back what never started and fails what may already be out';
end $$;

do $$ begin
  if public.cf_pub_reap() <> 0 then raise exception 'FAIL the reaper swept a fresh claim'; end if;
  raise notice 'ok   the reaper leaves a claim younger than ten minutes alone';
end $$;

-- ---------------------------------------------------------------- deleting
set role service_role;
do $$ declare v_id uuid; v json; begin
  v_id := post_id('bot-2', 'Someone else');
  v := public.cf_pub_delete('bot-2', v_id);
  if (v ->> 'id')::uuid <> v_id then raise exception 'FAIL delete answered about another post'; end if;
  perform test_expect(format('select public.cf_pub_delete(''bot-2'', %L)', v_id), 'PT404', 'deleting the same post twice');
end $$;
reset role;

-- ---------------------------------------------------------------- structural guarantees
-- The one function this module hands to anon, and the reason the whole shape
-- holds: everything else is reachable only with the service key. A forgotten
-- revoke publishes an admin RPC silently, so the set is asserted, not reviewed.
do $$ declare bad text; begin
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'cf\_pub\_%'
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname not in ('cf_pub_report');
  if bad is not null then raise exception 'FAIL anon can execute: %', bad; end if;
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'cf\_pub\_%'
    and has_function_privilege('authenticated', p.oid, 'execute');
  if bad is not null then raise exception 'FAIL a signed-in browser can execute: %', bad; end if;
  raise notice 'ok   cf_pub_report is the only RPC anon may execute, and authenticated has none';
end $$;

-- ---------------------------------------------------------------- the bucket stays the operator's
-- Last, because it re-runs the whole migration: everything above has had its
-- turn by now and nothing below depends on the state this leaves.
--
-- The migration used to assert `public = true` on every run, so an operator who
-- made the bucket private got it re-opened by the next one. Making it private
-- here and running the file again is the only honest way to ask.
update storage.buckets set public = false where id = 'cf-pub-media';
\ir ../migrations/0001_publishing.sql
do $$ declare v_public boolean; begin
  select public into v_public from storage.buckets where id = 'cf-pub-media';
  if v_public is distinct from false then
    raise exception 'FAIL re-running the migration re-opened a bucket the operator had made private';
  end if;
  raise notice 'ok   a bucket the operator made private is left private, not re-opened';
end $$;
update storage.buckets set public = true where id = 'cf-pub-media';

\echo '--- scenario complete'
