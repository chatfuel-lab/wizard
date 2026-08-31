import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DEFAULT_MEDIA_BUCKET as PROXY_DEFAULT_MEDIA_BUCKET } from '@chatfuel/vite-plugin-proxy/core';
import { createContentSource } from '../src/content';
import {
  DEFAULT_MEDIA_BUCKET,
  loadMigrations,
  mediaBucket,
  MEDIA_BUCKET_ENV,
  projectNameFor,
  publishSecret,
  PUBLISH_SECRET_ENV,
  type MigrationContext,
} from '../src/supabase/sql';

/**
 * The migrations are executed on somebody's production database, and they are
 * the whole SQL surface now: workspaces are created at sign-up by the app's
 * server, so the wizard renders nothing and there is nothing to escape.
 */

const content = createContentSource();

/** The text of one function, from its header to the grant that closes it. */
const block = (sql: string, from: string, to: string): string => {
  const start = sql.indexOf(from);
  const end = sql.indexOf(to);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end + to.length);
};

/** A run with these modules selected and nothing resolved yet. */
const runWith = (...modules: string[]): MigrationContext =>
  ({
    content,
    answers: { mode: 'standalone', modules, skillsTarget: 'project', packageManager: 'npm', env: {} },
  }) as MigrationContext;

describe('the migration files themselves', () => {
  const migrations = loadMigrations(runWith('auth'));
  const schema = migrations[0]!.sql;

  // One file, and it is the whole schema: the module's contract with the shell
  // is the shape a fresh project ends up in, not the order it got there.
  it('are ordered, and 0001 is the whole schema', () => {
    expect(migrations.map((m) => m.name)).toEqual(['0001_chatfuel_auth.sql']);
    expect(schema).toContain('create table if not exists public.cf_tenants');
    expect(schema).toContain('create table if not exists public.cf_bots');
    expect(schema).toContain('create table if not exists public.cf_bot_members');
    for (const sql of migrations.map((m) => m.sql)) {
      expect(sql).toContain("notify pgrst, 'reload schema'");
    }
  });

  // The functions the rest of the system is built on. A rename here silently
  // breaks the proxy gate, the adapter and the server routes at once.
  it('carry the RPCs the gate and the bot routes call by name', () => {
    const named = [
      'cf_my_bot_ids',
      'cf_gate_for_bot',
      'cf_my_workspace',
      'cf_claim_workspace',
      'cf_new_bot',
      'cf_bot_created',
      'cf_drop_bot_slot',
      'cf_bot_deleted',
      'cf_bot_for_admin',
      'cf_rename_bot',
      'cf_remove_bot',
      'cf_grant_bot',
      'cf_revoke_bot',
      'cf_list_bots',
    ];
    for (const fn of named) {
      expect(schema).toContain(`function public.${fn}(`);
    }
  });

  // Naming a bot decides which workspace may reach which customer's data: a
  // browser holding the anon key must never be able to do it.
  it('grant the server-only functions to service_role and to nobody else', () => {
    expect(schema).toContain('grant execute on function public.cf_bot_created(uuid, text) to service_role');
    expect(schema).toContain('grant execute on function public.cf_drop_bot_slot(uuid) to service_role');
    expect(schema).toContain('grant execute on function public.cf_bot_deleted(uuid) to service_role');
    for (const fn of ['cf_bot_created', 'cf_drop_bot_slot', 'cf_bot_deleted']) {
      expect(schema).not.toMatch(
        new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to (anon|authenticated)`),
      );
    }
  });

  it('contain no 64-hex literal', () => {
    expect(migrations.map((m) => m.sql).join('\n')).not.toMatch(/[0-9a-f]{64}/i);
  });
});

/**
 * Every bot a caller reserves is a bot the deployment's master token then
 * creates in Chatfuel, on the deployment's plan. Sign-up is open, so the two
 * ceilings are what keeps that bill bounded.
 */
describe('the ceiling on bot creation', () => {
  const migrations = loadMigrations(runWith('auth'));
  const schema = migrations[0]!.sql;

  it('refuses past both caps, and counts them where a swept slot cannot hold a place', () => {
    expect(schema).toContain("raise sqlstate 'PT429'");
    expect(schema).toContain("hint = 'deployment_bot_cap'");
    expect(schema).toContain("hint = 'workspace_bot_cap'");
    // Order is the contract: sweep the dead slots, then count, then insert.
    const fn = block(
      schema,
      'create or replace function public.cf_new_bot(p_name text default null)',
      'grant execute on function public.cf_new_bot(text) to authenticated;',
    );
    const lockAll = fn.indexOf('pg_advisory_xact_lock(');
    const lockTenant = fn.indexOf('from public.cf_tenants where id = v_tenant for update');
    const sweep = fn.indexOf('delete from public.cf_bots');
    const total = fn.indexOf('public.cf_bot_total_cap()');
    const perTenant = fn.indexOf('public.cf_bot_cap()');
    const insert = fn.indexOf('insert into public.cf_bots');
    expect(sweep).toBeGreaterThan(-1);
    expect(total).toBeGreaterThan(sweep);
    expect(perTenant).toBeGreaterThan(sweep);
    expect(insert).toBeGreaterThan(total);
    expect(insert).toBeGreaterThan(perTenant);
    // And both locks are held before anything is counted: the counts are only
    // a ceiling if a second caller cannot read the same snapshot.
    expect(lockAll).toBeGreaterThan(-1);
    expect(lockTenant).toBeGreaterThan(lockAll);
    expect(total).toBeGreaterThan(lockTenant);
    expect(perTenant).toBeGreaterThan(lockTenant);
  });

  /*
   * Both ceilings count rows, so a row a caller can drop is a place a caller
   * can win back — and the bot it named would still be alive on the plan,
   * unreferenced. PostgREST is reachable without the proxy (the anon key ships
   * in the bundle), so cf_remove_bot has to refuse that itself: the row keeps
   * its Chatfuel id until the server, and only the server, lets it go.
   */
  it('cannot be freed by deleting a row whose bot still exists', () => {
    const fn = block(
      schema,
      'create or replace function public.cf_remove_bot(p_slot uuid)',
      'grant execute on function public.cf_remove_bot(uuid) to authenticated;',
    );
    expect(fn).toContain("hint = 'bot_still_upstream'");
    // The refusal is before the delete, not beside it.
    expect(fn.indexOf('if v_bot is not null then')).toBeLessThan(fn.indexOf('delete from public.cf_bots'));
    // And the one function that clears the id is the server's alone.
    expect(schema).toContain('revoke execute on function public.cf_bot_deleted(uuid) from public, anon, authenticated');
    expect(schema).toContain('grant execute on function public.cf_bot_deleted(uuid) to service_role');
    expect(schema).not.toMatch(/grant execute on function public\.cf_bot_deleted\([^)]*\) to (anon|authenticated)/);
  });

  // A browser has no reason to learn the deployment's limits, and cf_new_bot
  // is security definer, so it reaches them as the owner without a grant.
  it('keeps the two cap functions unreachable from a browser', () => {
    for (const fn of ['cf_bot_total_cap', 'cf_bot_cap']) {
      expect(schema).toContain(`revoke execute on function public.${fn}() from public, anon, authenticated`);
      expect(schema).not.toMatch(new RegExp(`grant execute on function public\\.${fn}\\(\\) to`));
    }
  });

  /**
   * The numbers bound the operator's bill, and the right one is a fact about a
   * Chatfuel plan the wizard cannot see — so they are asked for the way the
   * service-role key is, off the environment the run was started with.
   */
  describe('the two ceilings', () => {
    // Not `block`: both functions end on the same line, so an index found from
    // the top of the file would close the second one before it opened.
    const capsOf = (sql: string): string[] =>
      ['cf_bot_total_cap', 'cf_bot_cap'].map((fn) => {
        const start = sql.indexOf(`create or replace function public.${fn}()`);
        expect(start).toBeGreaterThan(-1);
        return sql.slice(start, sql.indexOf('$$;', start));
      });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('ships numbers that need nothing filled in', () => {
      const [total, perTenant] = capsOf(schema);
      expect(total).toContain(', 200)');
      expect(perTenant).toContain(', 20)');
      // Unfilled, the file is still the upstream's — and still valid to paste.
      // The guard is a `substring` and not a `case` for exactly that reason:
      // Postgres resolves `'__CHATFUEL_BOT_CAP__'::integer` while it parses the
      // function body, so a cast inside an unreachable branch still refuses the
      // whole file. `substring` answers NULL, and NULL casts.
      expect(total).toContain("substring('__CHATFUEL_BOT_TOTAL_CAP__' from '^[0-9]+$')::integer");
      expect(loadMigrations(runWith('auth'))[0]!.rendered).toBe(false);
    });

    it('takes the numbers the run was given', () => {
      vi.stubEnv('CHATFUEL_BOT_TOTAL_CAP', '40');
      vi.stubEnv('CHATFUEL_BOT_CAP', '3');
      const [total, perTenant] = capsOf(loadMigrations(runWith('auth'))[0]!.sql);
      expect(total).toContain("coalesce(substring('40' from '^[0-9]+$')::integer, 200)");
      expect(perTenant).toContain("coalesce(substring('3' from '^[0-9]+$')::integer, 20)");
    });

    /* Left alone rather than refused: the guard means an unfilled literal is a
       working default, so a junk value costs the run nothing. */
    it('leaves a number that is not one where it was', () => {
      vi.stubEnv('CHATFUEL_BOT_TOTAL_CAP', "20'); drop table public.cf_bots; --");
      const [total] = capsOf(loadMigrations(runWith('auth'))[0]!.sql);
      expect(total).toContain('__CHATFUEL_BOT_TOTAL_CAP__');
      expect(total).not.toContain('drop table');
    });
  });

  /* The admin panel is the operator's own door: whoever holds ADMIN_PASSWORD is
     paying for the bots, and a cap they lift by editing a function is not one. */
  it('leaves the admin panel’s own creation uncapped', () => {
    const admin = loadMigrations(runWith('admin')).find((m) => m.name.includes('admin'))!.sql;
    const fn = block(
      admin,
      'create or replace function public.cf_admin_new_bot',
      'grant execute on function public.cf_admin_new_bot(uuid, text) to service_role;',
    );
    expect(fn).not.toContain('cf_bot_cap');
    expect(fn).not.toContain('cf_bot_total_cap');
  });
});

/**
 * A recovery link resets an ACCOUNT, so who may mint one for whom cannot be
 * decided from one workspace's slice of cf_members. The decision lives in the
 * database, and every issue leaves a row behind.
 */
describe('who may reset whose password', () => {
  const migrations = loadMigrations(runWith('auth'));
  const schema = migrations[0]!.sql;

  it('refuses a target who stands in a second workspace, and says which refusal is which', () => {
    expect(schema).toContain("hint = 'not_member'");
    expect(schema).toContain("hint = 'rank'");
    expect(schema).toContain("hint = 'cross_tenant'");
    // The cross-tenant test is the one the route could not make for itself.
    expect(schema).toContain('where user_id = v_target and tenant_id <> p_tenant_id');
  });

  it('writes the audit row in the same call that authorizes, so a refusal leaves none', () => {
    const fn = schema.slice(
      schema.indexOf('create or replace function public.cf_recovery_authorize'),
      schema.indexOf('grant execute on function public.cf_recovery_authorize(uuid, text) to authenticated;'),
    );
    // The insert is last: every raise above it rolls the transaction back.
    expect(fn.indexOf('insert into public.cf_recovery_events')).toBeGreaterThan(fn.indexOf("hint = 'cross_tenant'"));
  });

  // The target is the person with the most reason to know a link was minted for
  // their account, and the least standing to ask the admin who did it.
  it('lets the target read their own events without being an admin of anything', () => {
    expect(schema).toContain('function public.cf_my_recovery_events(');
    expect(schema).toContain('grant execute on function public.cf_my_recovery_events() to authenticated');
    expect(schema).toContain('function public.cf_list_recovery_events(');
  });
});

/**
 * An admin who may demote an equal is an admin who may reset that equal's
 * password: the demotion puts them below, and every rank check in this schema —
 * cf_recovery_authorize first among them — then lets the caller through. So the
 * two member RPCs act on people BELOW the caller and on nobody else.
 */
describe('an admin is not above an admin', () => {
  const migrations = loadMigrations(runWith('auth'));
  const schema = migrations[0]!.sql;

  it('reads the caller’s own rank rather than only refusing the owner', () => {
    for (const fn of ['cf_change_member_role', 'cf_remove_member']) {
      const body = block(schema, `create or replace function public.${fn}(`, `grant execute on function public.${fn}(`);
      expect(body).toContain('v_caller := public.cf_require_admin(p_tenant_id)');
      expect(body).toContain('public.cf_role_rank(v_target) >= public.cf_role_rank(v_caller)');
      expect(body).toContain("hint = 'rank'");
    }
  });

  // is_owner comes first so the owner still gets the sentence about ownership
  // rather than a rank refusal that says less.
  it('keeps the owner’s own refusal ahead of the rank one', () => {
    const body = block(
      schema,
      'create or replace function public.cf_remove_member(',
      'grant execute on function public.cf_remove_member(',
    );
    expect(body.indexOf("hint = 'is_owner'")).toBeLessThan(body.indexOf("hint = 'rank'"));
  });
});

/**
 * Migrations come from more than one module now, and the target names carry a
 * single sequence across all of them: they land in one directory and are applied
 * in name order.
 */
describe('which migrations a run brings', () => {
  it('takes only the selected modules’, in the order they must be applied', () => {
    expect(loadMigrations(runWith('auth', 'publishing')).map((m) => m.name)).toEqual([
      '0001_chatfuel_auth.sql',
      '0010_chatfuel_publishing.sql',
    ]);
    const names = loadMigrations(runWith('auth', 'publishing')).map((m) => m.name);
    expect([...names].sort()).toEqual(names);
  });

  it('carries the admin panel’s in the 0020s, after everything it reads', () => {
    expect(loadMigrations(runWith('auth', 'admin')).map((m) => m.name)).toEqual([
      '0001_chatfuel_auth.sql',
      '0020_chatfuel_admin.sql',
    ]);
  });

  it('brings none of a module that was not selected', () => {
    expect(loadMigrations(runWith('auth')).map((m) => m.name)).not.toContain('0010_chatfuel_publishing.sql');
    expect(loadMigrations(runWith('livechat')).map((m) => m.name)).toEqual([]);
  });
});

describe('the publish queue’s migration', () => {
  const of = (ctx: MigrationContext) => loadMigrations(ctx).find((m) => m.name === '0010_chatfuel_publishing.sql')!.sql;

  it('carries the objects the routes and the scheduler call by name', () => {
    const sql = of(runWith('publishing'));
    expect(sql).toContain('create table if not exists public.cf_pub_posts');
    expect(sql).toContain('create table if not exists public.cf_pub_config');
    for (const fn of [
      'cf_pub_config_json',
      'cf_pub_register',
      'cf_pub_list',
      'cf_pub_create',
      'cf_pub_update',
      'cf_pub_delete',
      'cf_pub_take',
      'cf_pub_report',
      'cf_pub_claim_due',
      'cf_pub_reap',
    ]) {
      expect(sql).toContain(`function public.${fn}(`);
    }
    expect(sql).toContain("notify pgrst, 'reload schema'");
    // Both jobs, one minute each, under the prefix that keeps two deployments
    // on one project from taking each other's scheduler over.
    expect(sql).toContain("v_prefix text := 'cf-pub'");
    expect(sql).toContain("cron.schedule(v_prefix || '-claim-due', '* * * * *'");
    expect(sql).toContain("cron.schedule(v_prefix || '-reap', '* * * * *'");
  });

  /**
   * One Supabase project, two deployments: a shared bucket means each one's
   * composer reads the other's media, and `cron.schedule(name, …)` replaces a
   * job of that name rather than adding one, so the second install silently
   * takes the first's scheduler.
   */
  describe('the names a project cannot lend to two deployments', () => {
    it('defaults to the bucket the app falls back to, and leaves the job names alone', () => {
      const ctx = runWith('publishing');
      const sql = of(ctx);
      expect(sql).toContain("v_bucket text := 'cf-pub-media'");
      expect(sql).toContain("v_prefix text := 'cf-pub'");
      expect(sql).not.toContain('__CHATFUEL_MEDIA_BUCKET__');
      expect(sql).not.toContain('__CHATFUEL_CRON_PREFIX__');
      // Written back, so .env is built from the same string the SQL got.
      expect(ctx.answers.env[MEDIA_BUCKET_ENV]).toBe(DEFAULT_MEDIA_BUCKET);
    });

    it('carries a chosen name into the bucket and the jobs together', () => {
      const ctx = runWith('publishing');
      ctx.answers.env[MEDIA_BUCKET_ENV] = 'cf-pub-media-two';
      const sql = of(ctx);
      expect(sql).toContain("v_bucket text := 'cf-pub-media-two'");
      expect(sql).toContain("v_prefix text := 'cf-pub-media-two'");
    });

    /**
     * The value is substituted into a single-quoted SQL literal, and the proxy
     * resolves the same variable through the same rule. Refusing on one side
     * and falling back on the other is the divergence this is here to stop:
     * the app would write into a bucket the database never made public.
     */
    it('falls back rather than writing a name that is not one', () => {
      for (const bad of ["cf'; drop table cf_pub_posts; --", 'has space', '']) {
        const ctx = runWith('publishing');
        ctx.answers.env[MEDIA_BUCKET_ENV] = bad;
        expect(of(ctx)).toContain("v_bucket text := 'cf-pub-media'");
      }
    });

    it('reads the name off the environment the wizard was run with', () => {
      const ctx = runWith('publishing');
      expect(mediaBucket(ctx, { PUBLISHING_MEDIA_BUCKET: 'cf-pub-media-two' })).toBe('cf-pub-media-two');
      expect(ctx.answers.env[MEDIA_BUCKET_ENV]).toBe('cf-pub-media-two');
    });

    /**
     * Three copies of one string: the manifest default that .env is written
     * from, the migration's fallback, and the proxy's. They are read by
     * different processes at different times and nothing but this pins them.
     */
    it('is the same default in the manifest, the migration and the proxy', () => {
      const manifest = JSON.parse(readFileSync(content.modulePath('publishing', 'module.json'), 'utf8')) as {
        app: { env: { name: string; default?: string }[] };
      };
      const declared = manifest.app.env.find((entry) => entry.name === MEDIA_BUCKET_ENV);
      expect(declared?.default).toBe(DEFAULT_MEDIA_BUCKET);
      expect(PROXY_DEFAULT_MEDIA_BUCKET).toBe(DEFAULT_MEDIA_BUCKET);
    });
  });

  /**
   * The one function a browser's key may reach is the one a shared secret
   * guards; everything that can read or write a post needs the server's.
   */
  it('opens only the outcome report to anything but the service role', () => {
    const sql = of(runWith('publishing'));
    expect(sql).toMatch(/grant execute on function public\.cf_pub_report\([^)]*\) to anon, service_role/);
    expect(sql).not.toMatch(/grant execute on function public\.cf_pub_report\([^)]*\) to [^;]*authenticated/);
    for (const fn of [
      'cf_pub_list',
      'cf_pub_create',
      'cf_pub_update',
      'cf_pub_delete',
      'cf_pub_take',
      'cf_pub_register',
    ]) {
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));
      expect(sql).not.toMatch(
        new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to (anon|authenticated)`),
      );
    }
    // The two jobs are the database's own and are granted to nobody at all.
    for (const fn of ['cf_pub_claim_due', 'cf_pub_reap']) {
      expect(sql).not.toMatch(new RegExp(`grant execute on function public\\.${fn}\\(`));
    }
  });

  /**
   * The secret is made once per run, written into the app's environment, and
   * reaches the database only as a hash — the file is copied into the user's
   * project and is meant to be re-runnable from the SQL editor, so what it
   * carries must open nothing on its own.
   */
  it('is given the hash of the run’s secret, never the secret', () => {
    const ctx = runWith('auth', 'publishing');
    const sql = of(ctx);
    const secret = ctx.answers.env[PUBLISH_SECRET_ENV]!;
    expect(secret).toBeTruthy();
    expect(sql).not.toContain('__CHATFUEL_PUBLISHING_SECRET_SHA256__');
    expect(sql).not.toContain(secret);
    expect(sql).toContain(createHash('sha256').update(secret, 'utf8').digest('base64'));
  });

  it('gets the same secret however many times a run asks', () => {
    const ctx = runWith('auth', 'publishing');
    const first = publishSecret(ctx);
    of(ctx);
    expect(publishSecret(ctx)).toBe(first);
    expect(ctx.answers.env[PUBLISH_SECRET_ENV]).toBe(first);
  });

  // A log scrubber masks any 64-hex string, so a hex secret would be invisible
  // in exactly the logs somebody would need to read.
  it('makes a secret that is not hex-shaped, and long enough to be one', () => {
    const secret = publishSecret(runWith('publishing'));
    expect(secret).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(secret).not.toMatch(/^[0-9a-f]+$/i);
  });

  it('leaves the placeholder alone in a run that installs nothing else', () => {
    // Nothing generates a secret for a module that was not selected.
    const ctx = runWith('auth');
    loadMigrations(ctx);
    expect(ctx.answers.env[PUBLISH_SECRET_ENV]).toBeUndefined();
  });
});

/**
 * The queue's own invariant: a post with a time is scheduled, a post without one
 * is a draft. A patch that would break the pair is refused rather than repaired.
 */
describe('a status the time contradicts', () => {
  const schema = loadMigrations(runWith('publishing'))[0]!.sql;

  it('refuses the pair rather than rewriting the half the caller did not send', () => {
    expect(schema).toContain("message = 'A scheduled post needs a time', hint = 'bad_time'");
    expect(schema).toContain("message = 'A draft cannot keep a time', hint = 'bad_time'");
  });

  it('keeps the report away from every signed-in account', () => {
    expect(schema).toMatch(/grant execute on function public\.cf_pub_report\([^)]*\) to anon, service_role;/);
  });
});

/**
 * The two functions reachable with the shared secret rather than with a session.
 * A late success still has to land — the reaper may have put the row back while
 * the publish was finishing — but "any row at all" is wider than that needs.
 */
describe('what the callback pair accepts', () => {
  const schema = loadMigrations(runWith('publishing'))[0]!.sql;

  it('accepts a report only about a post the scheduler actually sent out', () => {
    const body = block(
      schema,
      'create or replace function public.cf_pub_report(',
      'grant execute on function public.cf_pub_report(',
    );
    expect(body).toContain('and p.attempts > 0');
    // A published report still ignores status, so a late success lands.
    expect(body).toContain("and (p_status = 'published' or p.status = 'publishing')");
    expect(body).toContain("hint = 'bad_permalink'");
  });

  /* The secret is one value for the whole deployment, so on the post id alone
     it reaches every row in the project. The bot the report names is what
     narrows it to rows the caller already had to know about. */
  it('accepts a report only about a post of the bot the caller names', () => {
    const body = block(
      schema,
      'create or replace function public.cf_pub_report(',
      'grant execute on function public.cf_pub_report(',
    );
    expect(body).toContain('and p.bot_id = trim(p_bot_id)');
    expect(body).toContain("hint = 'bad_bot_id'");
  });

  /* Same reason as cf_admin_grant_bot: "create or replace" cannot change a
     signature, and this file is re-run on a project that ran the copy taking
     the post id alone — an overload left standing there is the unbound form,
     still granted to anon. */
  it('drops the form that did not name a bot before replacing it', () => {
    expect(schema).toContain('drop function if exists public.cf_pub_report(text, uuid, text, text, text, text);');
    expect(schema).toMatch(
      /grant execute on function public\.cf_pub_report\(text, uuid, text, text, text, text, text\)/,
    );
  });

  // attempts is what separates the two, so only the scheduler may raise it and
  // the reaper must leave it alone.
  it('leaves attempts to the scheduler alone', () => {
    const claim = block(
      schema,
      'create or replace function public.cf_pub_claim_due(',
      'revoke execute on function public.cf_pub_claim_due(',
    );
    expect(claim).toContain('attempts = p.attempts + 1');
    const reap = block(
      schema,
      'create or replace function public.cf_pub_reap(',
      'revoke execute on function public.cf_pub_reap(',
    );
    expect(reap).not.toContain('attempts =');
  });

  it('refuses a cleartext callback address unless it is this machine', () => {
    expect(schema).toContain("hint = 'insecure_url'");
    expect(schema).toContain("p_url !~ '^http://(localhost|127\\.0\\.0\\.1)([:/]|$)'");
  });

  it('registers itself as applied, like every other migration', () => {
    expect(schema).toContain("insert into public.cf_pub_migrations (name) values ('0001_instagram')");
    expect(schema).toContain("notify pgrst, 'reload schema'");
  });
});

/**
 * "Give it to: nobody yet" is an option the panel's create form offers, so a bot
 * has to be storable before any workspace owns it: cf_bots.tenant_id is
 * nullable, and the unassigned ones have a list of their own.
 */
describe('a bot before it has a workspace', () => {
  /** The drop belongs to the replacement, so the block is read with it. */
  const GRANT_BLOCK = [
    'drop function if exists public.cf_admin_grant_bot(text, uuid);',
    'grant execute on function public.cf_admin_grant_bot(text, uuid, uuid) to service_role;',
  ] as const;
  const schema = loadMigrations(runWith('admin'))[0]!.sql;

  it('leaves tenant_id nullable, so an unassigned bot is storable', () => {
    expect(schema).toContain('alter table public.cf_bots alter column tenant_id drop not null;');
  });

  it('sweeps the unassigned slots with a comparison that matches null', () => {
    const fn = block(
      schema,
      'create or replace function public.cf_admin_new_bot',
      'grant execute on function public.cf_admin_new_bot(uuid, text) to service_role;',
    );
    expect(fn).toContain('where tenant_id is not distinct from p_tenant_id and bot_id is null');
    expect(fn).not.toContain('where tenant_id = p_tenant_id and bot_id is null');
  });

  /* The only route back out of the unassigned bucket: they belong to no
     workspace, so cf_admin_tenants_json — a list OF workspaces — cannot carry
     them, and a panel that saw neither would make "assign it later" a one-way
     door. */
  it('lists the slots no workspace has claimed', () => {
    const fn = block(
      schema,
      'create or replace function public.cf_admin_unassigned_bots_json',
      'grant execute on function public.cf_admin_unassigned_bots_json() to service_role;',
    );
    expect(fn).toContain('where b.tenant_id is null and b.bot_id is not null');
  });

  it('settles the workspace on the first grant, and refuses to pick between two', () => {
    const fn = block(schema, ...GRANT_BLOCK);
    expect(fn).toContain('update public.cf_bots set tenant_id = v_tenant');
    expect(fn).toContain("hint = 'tenant_ambiguous'");
    expect(fn).toContain("hint = 'member_not_found'");
    // The caller may name the workspace, which is the answer the database
    // cannot work out for a person who stands in more than one.
    expect(fn).toContain('p_tenant_id uuid default null');
    expect(fn).toContain("hint = 'tenant_not_found'");
  });

  /* "create or replace" cannot change a signature, and the file is re-run on a
     project that ran an earlier copy of it — so a two-argument form left behind
     there would survive alongside this one and make a two-argument call
     ambiguous. */
  it('drops the two-argument grant before replacing it', () => {
    expect(schema).toContain('drop function if exists public.cf_admin_grant_bot(text, uuid);');
  });

  it('registers itself as applied, like every other migration', () => {
    expect(schema).toContain("insert into public.cf_migrations (name) values ('0020_admin')");
    expect(schema).toContain("notify pgrst, 'reload schema'");
  });
});

describe('projectNameFor', () => {
  it('slugs the bot title', () => {
    expect(projectNameFor('Acme Support Bot', 'b1')).toBe('chatfuel-acme-support-bot');
    expect(projectNameFor('  Ünïcødé!!  ', 'b1')).toBe('chatfuel-unic-de'); // NFKD strips marks; ø is not one
    expect(projectNameFor(undefined, 'b1')).toBe('chatfuel-b1');
    expect(projectNameFor('', 'b1')).toBe('chatfuel-b1');
  });

  it('stays inside Supabase’s name length and never ends in a dash', () => {
    const name = projectNameFor('x'.repeat(80), 'b1');
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).not.toMatch(/-$/);
  });
});
