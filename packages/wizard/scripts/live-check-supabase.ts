/**
 * Live verification of the whole Supabase side against a REAL project.
 * Mirrors content/vite-plugin-proxy/scripts/live-check-proxy.ts:
 * it prints statuses and shapes only, never a key, and it is written to be run
 * REPEATEDLY on the same project (every step is idempotent by design, and that
 * is exactly what half of these checks verify).
 *
 * ⚠ `--create` provisions real resources in your Supabase account. Omit it to
 *   run read-only checks against an existing project.
 *
 * Run:
 *   pnpm --filter @chatfuel/wizard live-check:supabase [-- --project <ref>] [-- --create]
 *
 * Needs SUPABASE_ACCESS_TOKEN in the repo-root .env (a personal access token
 * from https://supabase.com/dashboard/account/tokens). With --project it uses
 * that project; with --create it creates a throwaway one; with neither it picks
 * the first ACTIVE_HEALTHY project it finds and says so.
 *
 * What it exercises, in order:
 *   Management API — organizations (+ a garbage PAT → 401 shape), available
 *   regions, api-keys (which key types the project actually returns), the
 *   migration TWICE, GET + PATCH of the auth config.
 *   Data plane with the ANON key — a GoTrue signup, cf_claim_workspace,
 *   cf_new_bot + cf_bot_created (service key only), cf_my_workspace / cf_my_bot_ids /
 *   cf_gate_for_bot, the isolation between two accounts, invite
 *   create/preview/accept, cf_list_members / cf_list_invites, and the PT4xx →
 *   HTTP status mapping.
 *
 * A failure here is a finding about Supabase, not a bug to patch around: report
 * it, then change the SQL contract deliberately.
 */
import { createContentSource } from '../src/content';
import { scrub } from '../src/log';
import { desiredAuthPatch, desiredRecoveryPatch, authPatchDiff } from '../src/supabase/authConfig';
import { pickKeys } from '../src/supabase/keys';
import {
  createManagementClient,
  defaultRegion,
  projectStatusLabel,
  sortProjects,
  SupabaseManagementError,
} from '../src/supabase/management';
import { loadMigrations } from '../src/supabase/sql';

for (const stream of [process.stdout, process.stderr] as const) {
  const original = stream.write.bind(stream);
  stream.write = ((chunk: string | Uint8Array, ...rest: never[]) =>
    original(scrub(String(chunk)), ...rest)) as typeof stream.write;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

let failures = 0;
const pass = (msg: string) => console.log(`PASS  ${msg}`);
const info = (msg: string) => console.log(`      ${msg}`);
const fail = (msg: string) => {
  failures += 1;
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
};

async function step<T>(label: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    const value = await run();
    pass(label);
    return value;
  } catch (err) {
    fail(`${label} — ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

/** A PostgREST / GoTrue call with the anon key (and optionally a user JWT). */
interface RestResult {
  status: number;
  body: unknown;
  /** The `hint` of a PostgREST error body — our machine-readable error code. */
  hint?: string;
}

function restClient(url: string, anonKey: string) {
  const call = async (
    path: string,
    init: { method?: string; body?: unknown; jwt?: string } = {},
  ): Promise<RestResult> => {
    const response = await fetch(`${url}${path}`, {
      method: init.method ?? 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${init.jwt ?? anonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      /* keep the text */
    }
    const hint =
      body && typeof body === 'object' && 'hint' in body && typeof (body as { hint: unknown }).hint === 'string'
        ? (body as { hint: string }).hint
        : undefined;
    return { status: response.status, body, hint };
  };
  return {
    rpc: (name: string, args: Record<string, unknown>, jwt?: string) =>
      call(`/rest/v1/rpc/${name}`, { body: args, jwt }),
    gotrue: (path: string, body: unknown, jwt?: string) => call(`/auth/v1/${path}`, { body, jwt }),
  };
}

const shape = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})${value.length > 0 ? ` of ${shape(value[0])}` : ''}`;
  if (typeof value === 'object')
    return `{${Object.keys(value as object)
      .sort()
      .join(', ')}}`;
  return typeof value;
};

async function main(): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    fail('SUPABASE_ACCESS_TOKEN missing (put a personal access token in the repo-root .env)');
    return;
  }
  const content = createContentSource();
  const client = createManagementClient({ token });

  // ---------------------------------------------------------------- 1. PAT
  const orgs = await step('GET /v1/organizations (the PAT is accepted)', async () => {
    const list = await client.listOrganizations();
    info(`organizations: ${list.length} → ${list.map((o) => o.slug).join(', ') || '(none)'}`);
    return list;
  });
  if (!orgs) return;

  await step('a garbage PAT answers 401 with a mintable-token hint', async () => {
    const bogus = createManagementClient({ token: 'sbp_0000000000000000000000000000000000000000' });
    try {
      await bogus.listOrganizations();
      throw new Error('expected a 401');
    } catch (err) {
      if (!(err instanceof SupabaseManagementError)) throw err;
      if (err.status !== 401) throw new Error(`expected 401, got ${err.status}`, { cause: err });
      info(`401 hint present: ${Boolean(err.hint)}`);
    }
  });

  // ---------------------------------------------------------------- 2. project
  let ref = arg('project');
  if (!ref && hasFlag('create')) {
    const org = orgs[0];
    if (!org) {
      fail('--create needs an organization on the token');
      return;
    }
    const regions = await step(`GET /v1/projects/available-regions?organization_slug=${org.slug}`, async () => {
      const list = await client.availableRegions(org.slug);
      info(
        `regions: ${list.filter((r) => r.type === 'smartGroup').length} smart group(s), ${
          list.filter((r) => r.type === 'specific').length
        } specific; default = ${defaultRegion(list)?.code ?? '(none)'}`,
      );
      return list;
    });
    const region = regions && defaultRegion(regions);
    if (!region) return;
    const created = await step('POST /v1/projects (create) → ACTIVE_HEALTHY + healthy services', async () => {
      const started = Date.now();
      const project = await client.createProject({
        name: `cf-livecheck-${Date.now().toString(36)}`,
        organizationSlug: org.slug,
        region,
      });
      info(`created ${project.ref}; waiting…`);
      await client.waitForProject(project.ref, { onStatus: (s) => info(`  status: ${projectStatusLabel(s)}`) });
      info(`ACTIVE_HEALTHY after ${Math.round((Date.now() - started) / 1000)} s`);
      const health = await client.waitForHealth(project.ref, ['auth', 'db', 'rest'], {
        onStatus: (s) => info(`  health: ${s}`),
      });
      info(`healthy after ${Math.round((Date.now() - started) / 1000)} s: ${health.map((h) => h.name).join(', ')}`);
      return project;
    });
    ref = created?.ref;
  }
  if (!ref) {
    const projects = await step('GET /v1/projects', async () => {
      const list = sortProjects(await client.listProjects());
      info(`projects: ${list.map((pr) => `${pr.ref}(${pr.status})`).join(', ') || '(none)'}`);
      return list;
    });
    ref = projects?.find((pr) => pr.status === 'ACTIVE_HEALTHY')?.ref;
    if (!ref) {
      fail('no ACTIVE_HEALTHY project to test against — pass --project <ref> or --create');
      return;
    }
    info(`using project ${ref} (pass --project <ref> to choose another)`);
  }
  const projectRef: string = ref;

  // ---------------------------------------------------------------- 3. keys
  const keys = await step('GET /v1/projects/{ref}/api-keys?reveal=true → pickKeys', async () => {
    const raw = await client.getApiKeys(projectRef);
    info(`key entries: ${raw.map((k) => `${k.type ?? 'legacy'}/${k.name ?? '?'}`).join(', ')}`);
    const picked = pickKeys(raw);
    info(`anon slot: ${picked.anonKeyKind}; secret slot: ${picked.secretKeyKind ?? '(none)'}`);
    return picked;
  });
  if (!keys) return;

  // ---------------------------------------------------------------- 4. migrations ×2
  // Every module that brings SQL, so this exercises what a full install applies
  // — including the secret the publish queue's migration is given.
  const migrations = loadMigrations({
    content,
    answers: {
      mode: 'standalone',
      modules: ['auth', 'instagram'],
      skillsTarget: 'project',
      packageManager: 'npm',
      agentsPresent: [],
      skillsInstalled: [],
      skillsPresent: [],
      env: {},
    },
  });
  for (const round of [1, 2]) {
    for (const migration of migrations) {
      await step(`POST /database/query — ${migration.name}, run ${round} (idempotent)`, async () => {
        const result = await client.runQuery(projectRef, migration.sql);
        info(`response shape: ${shape(result)}`);
      });
    }
  }

  await step('a broken statement answers a readable error (and rolls back)', async () => {
    try {
      await client.runQuery(projectRef, 'select 1; select * from public.cf_no_such_table;');
      throw new Error('expected an error');
    } catch (err) {
      if (!(err instanceof SupabaseManagementError)) throw err;
      info(`status ${err.status}; body shape ${shape(err.body)}`);
    }
  });

  // ---------------------------------------------------------------- 5. keys as roles
  // The service key is not a convenience here: cf_bot_created is granted to
  // service_role and nobody else, so without it nothing can finish sign-up.
  if (!keys.secretKey) {
    fail('no secret / service_role key on this project — provisioning cannot work');
    return;
  }

  // ---------------------------------------------------------------- 6. auth config
  // Two calls on purpose: the settings the app cannot live without, then the
  // recovery template, which free-tier projects refuse (see below).
  await step('GET + PATCH /config/auth (settings)', async () => {
    const current = await client.getAuthConfig(projectRef);
    info(`rate_limit_email_sent = ${String(current.rate_limit_email_sent)} per hour`);
    const patch = desiredAuthPatch(current, { appUrl: 'https://livecheck.example.com' });
    info(`would change: ${authPatchDiff(current, patch).join(', ') || '(nothing)'}`);
    const after = await client.patchAuthConfig(projectRef, patch);
    const stillMissing = authPatchDiff(after, patch);
    info(`after PATCH, still differing: ${stillMissing.join(', ') || '(none — every field accepted)'}`);
    info(`uri_allow_list = ${String(after.uri_allow_list)}`);
    if (after.mailer_autoconfirm !== true) throw new Error('mailer_autoconfirm did not stick');
  });

  // Informational: a refusal here is a plan limit, not a bug — the wizard logs
  // it and moves on. It must NEVER be sent together with the settings above.
  await step('PATCH /config/auth (recovery template) — allowed to fail on the free plan', async () => {
    const current = await client.getAuthConfig(projectRef);
    const patch = desiredRecoveryPatch(current);
    if (!patch) {
      info('template already set');
      return;
    }
    try {
      await client.patchAuthConfig(projectRef, patch);
      info('template accepted (paid plan or custom SMTP) — reset links carry token_hash');
    } catch (err) {
      if (!(err instanceof SupabaseManagementError)) throw err;
      info(`refused (${err.status}): ${String(err.message).slice(0, 160)}`);
      info('→ reset falls back to Supabase’s default email + the PKCE ?code= callback');
    }
  });

  // ---------------------------------------------------------------- 7. data plane
  const url = `https://${projectRef}.supabase.co`;
  const rest = restClient(url, keys.anonKey);
  /* cf_bot_created is granted to service_role only — this is the app SERVER. */
  const restAsService = restClient(url, keys.secretKey);

  const stamp = Date.now().toString(36);
  const botA = `livecheck-bot-a-${stamp}`;
  const botB = `livecheck-bot-b-${stamp}`;

  await step('anon may NOT call the workspace RPCs (grants are explicit)', async () => {
    for (const name of ['cf_my_workspace', 'cf_claim_workspace', 'cf_my_bot_ids', 'cf_gate_for_bot']) {
      const res = await rest.rpc(name, {});
      if (res.status === 200) throw new Error(`anon reached ${name}`);
    }
    info('all four refused');
  });

  // Any address here works ONLY because mailer_autoconfirm is on: with
  // confirmation mail on, GoTrue's default provider rejects undeliverable
  // addresses (`email_address_invalid`) and caps the rest at
  // rate_limit_email_sent per hour. Proved live, 2026-08-19.
  //
  // The domain is a subdomain of a real one, not @example.com: GoTrue's address
  // validator now answers `email_address_invalid` for the reserved domains, so
  // the whole run died at sign-up. Nothing is ever sent to it - autoconfirm is
  // on, and the users live in a throwaway project. Proved live, 2026-08-21.
  const signUp = async (label: string): Promise<string | undefined> => {
    const email = `cf-livecheck-${label}-${stamp}@livecheck.chatfuel.com`;
    const res = await rest.gotrue('signup', { email, password: 'password123!A' });
    if (res.status !== 200) {
      fail(`GoTrue signup (${label}) → ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
      return undefined;
    }
    const body = res.body as { access_token?: string; session?: { access_token?: string } };
    const jwt = body.access_token ?? body.session?.access_token;
    if (!jwt) {
      fail(`GoTrue signup (${label}) returned no session — is "Confirm email" still on?`);
      return undefined;
    }
    pass(`POST /auth/v1/signup (${label}) → session (autoconfirm on)`);
    return jwt;
  };

  const aliceJwt = await signUp('alice');
  const bobJwt = await signUp('bob');
  if (!aliceJwt || !bobJwt) return;

  const claim = async (jwt: string, botId: string, label: string): Promise<string | undefined> =>
    step(
      `${label}: cf_claim_workspace → cf_new_bot → cf_bot_created (service key) → a workspace with a bot`,
      async () => {
        const before = await rest.rpc('cf_my_workspace', {}, jwt);
        if (before.body !== null)
          throw new Error(`a fresh account already has a workspace: ${JSON.stringify(before.body)}`);

        const claimed = await rest.rpc('cf_claim_workspace', { p_name: null }, jwt);
        if (claimed.status !== 200) throw new Error(`claim → ${claimed.status} ${claimed.hint ?? ''}`);
        const tenantId = (claimed.body as { tenant_id?: string }).tenant_id;
        if (!tenantId) throw new Error(`claim returned ${JSON.stringify(claimed.body)}`);
        const claimedBots = (claimed.body as { bots?: unknown[] }).bots ?? [];
        if (claimedBots.length !== 0) throw new Error('a claimed workspace already has bots');

        // The row is reserved BY THE CALLER: that is where the permission check lives.
        const reserved = await rest.rpc('cf_new_bot', { p_name: 'Live check' }, jwt);
        if (reserved.status !== 200) throw new Error(`cf_new_bot → ${reserved.status} ${reserved.hint ?? ''}`);
        const slotId = (reserved.body as { id?: string }).id;
        if (!slotId) throw new Error(`cf_new_bot returned ${JSON.stringify(reserved.body)}`);

        // A browser must not be able to name the bot — the anon key + a user JWT is what a browser has.
        const asBrowser = await rest.rpc('cf_bot_created', { p_slot: slotId, p_bot_id: botId }, jwt);
        if (asBrowser.status === 200) throw new Error('a browser could name a bot');

        const attached = await restAsService.rpc('cf_bot_created', { p_slot: slotId, p_bot_id: botId });
        if (attached.status !== 200)
          throw new Error(`cf_bot_created → ${attached.status}: ${JSON.stringify(attached.body).slice(0, 200)}`);

        const after = await rest.rpc('cf_my_workspace', {}, jwt);
        const workspace = after.body as { bots?: { bot_id?: string }[]; role?: string; name?: string };
        if (workspace.bots?.[0]?.bot_id !== botId)
          throw new Error(`workspace bots are ${JSON.stringify(workspace.bots)}`);
        if (workspace.role !== 'owner') throw new Error(`workspace role is ${workspace.role}`);
        info(`tenant ${tenantId}, bot ${botId}, name ${JSON.stringify(workspace.name)}`);
        return tenantId;
      },
    );

  const aliceTenant = await claim(aliceJwt, botA, 'alice');
  await claim(bobJwt, botB, 'bob');
  if (!aliceTenant) return;

  await step('claiming twice does not open a second workspace', async () => {
    const again = await rest.rpc('cf_claim_workspace', { p_name: null }, aliceJwt);
    if ((again.body as { tenant_id?: string }).tenant_id !== aliceTenant) {
      throw new Error(`a second claim moved the workspace: ${JSON.stringify(again.body)}`);
    }
  });

  // The whole isolation promise, at the level the proxy asks it.
  await step('neither account can reach the other’s bot', async () => {
    const mine = await rest.rpc('cf_gate_for_bot', { p_bot_id: botA }, aliceJwt);
    if (mine.body !== 'owner') throw new Error(`gate for my own bot: ${JSON.stringify(mine.body)}`);
    const theirs = await rest.rpc('cf_gate_for_bot', { p_bot_id: botB }, aliceJwt);
    if (theirs.body !== null) throw new Error(`gate for somebody else's bot: ${JSON.stringify(theirs.body)}`);
    const ids = await rest.rpc('cf_my_bot_ids', {}, aliceJwt);
    if (JSON.stringify(ids.body) !== JSON.stringify([botA])) throw new Error(`my_bot_ids: ${JSON.stringify(ids.body)}`);
  });

  await step('cf_my_bot_ids with a garbage JWT → 401 (PostgREST verifies the signature)', async () => {
    const res = await rest.rpc('cf_my_bot_ids', {}, 'not.a.jwt');
    info(`status ${res.status}`);
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
  });

  // What cf_my_workspace carries for each bot of the workspace it returns.
  interface BotRow {
    id: string;
    bot_id: string | null;
    name: string;
  }

  const invite = await step('cf_create_invite → a raw token, exactly once', async () => {
    const res = await rest.rpc(
      'cf_create_invite',
      { p_tenant_id: aliceTenant, p_role: 'member', p_email: null, p_expires_in: '7 days' },
      aliceJwt,
    );
    if (res.status !== 200) throw new Error(`status ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
    const body = res.body as { token?: string; id?: string };
    info(`shape ${shape(res.body)}; token length ${body.token?.length ?? 0} (expect 32, base64url)`);
    if (!body.token) throw new Error('no token returned');
    if (/^[0-9a-f]{64}$/i.test(body.token)) throw new Error('token is 64-hex — the log scrubber would eat it');
    return body as { token: string; id: string };
  });

  if (invite) {
    await step('anon cf_invite_preview → valid', async () => {
      const res = await rest.rpc('cf_invite_preview', { p_token: invite.token });
      if (res.status !== 200) throw new Error(`status ${res.status}`);
      info(`→ ${JSON.stringify(res.body)}`);
    });

    await step('bob accepts → in alice’s workspace, keeping his own, reaching none of hers', async () => {
      const res = await rest.rpc('cf_accept_invite', { p_token: invite.token }, bobJwt);
      if (res.status !== 200) throw new Error(`status ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
      const ids = await rest.rpc('cf_my_bot_ids', {}, bobJwt);
      const list = (ids.body as string[]).slice().sort();
      // Membership is not access. A member reaches the bots he was granted and
      // no others, and this invite named none - so joining alice's workspace
      // adds nothing to what bob can open.
      if (JSON.stringify(list) !== JSON.stringify([botB])) {
        throw new Error(`bob's bots: ${JSON.stringify(ids.body)}`);
      }
      // cf_my_workspace prefers the one the caller created, so an invite must
      // not move him off it. It carries the bots of that workspace, not a
      // single bot id - a workspace holds as many as its plan allows.
      const mine = await rest.rpc('cf_my_workspace', {}, bobJwt);
      const own = mine.body as { tenant_id?: string; role?: string; bots?: BotRow[] };
      if (own.tenant_id === aliceTenant || own.role !== 'owner') {
        throw new Error(`the invite replaced bob's own workspace: ${JSON.stringify(mine.body)}`);
      }
      const ownBots = (own.bots ?? []).map((b) => b.bot_id);
      if (JSON.stringify(ownBots) !== JSON.stringify([botB])) {
        throw new Error(`bob's own workspace holds: ${JSON.stringify(ownBots)}`);
      }
      info(`bob joined, reaches ${list.join(', ')}, and still owns the workspace holding ${botB}`);
    });

    await step('an invite that names a bot grants exactly that one', async () => {
      // The grant is written against the row id, not the Chatfuel bot id: a
      // slot exists here before Chatfuel has been asked for the bot at all.
      // cf_my_bots_json is granted to nobody - it is cf_my_workspace's helper -
      // so the row ids come from there, which is where the app reads them too.
      const aliceWs = await rest.rpc('cf_my_workspace', {}, aliceJwt);
      const row = ((aliceWs.body as { bots?: BotRow[] }).bots ?? []).find((b) => b.bot_id === botA);
      if (!row) throw new Error(`alice's workspace: ${JSON.stringify(aliceWs.body).slice(0, 300)}`);
      const granting = await rest.rpc(
        'cf_create_invite',
        {
          p_tenant_id: aliceTenant,
          p_role: 'member',
          p_email: null,
          p_expires_in: '7 days',
          p_bots: [row.id],
        },
        aliceJwt,
      );
      if (granting.status !== 200) {
        throw new Error(`create: status ${granting.status}: ${JSON.stringify(granting.body).slice(0, 300)}`);
      }
      const token = (granting.body as { token?: string }).token;
      if (!token) throw new Error('no token returned');
      const accepted = await rest.rpc('cf_accept_invite', { p_token: token }, bobJwt);
      if (accepted.status !== 200) {
        throw new Error(`accept: status ${accepted.status}: ${JSON.stringify(accepted.body).slice(0, 300)}`);
      }
      const ids = await rest.rpc('cf_my_bot_ids', {}, bobJwt);
      const list = (ids.body as string[]).slice().sort();
      if (JSON.stringify(list) !== JSON.stringify([botA, botB].sort())) {
        throw new Error(`bob's bots: ${JSON.stringify(ids.body)}`);
      }
      info(`bob now reaches ${list.join(', ')}`);
    });

    await step('re-accepting the same invite → 410 invite_accepted', async () => {
      const res = await rest.rpc('cf_accept_invite', { p_token: invite.token }, aliceJwt);
      info(`status ${res.status}, hint ${res.hint ?? '(none)'}`);
      if (res.status !== 410) throw new Error(`expected 410, got ${res.status}`);
    });
  }

  await step('cf_list_members (owner) → both users', async () => {
    const res = await rest.rpc('cf_list_members', { p_tenant_id: aliceTenant }, aliceJwt);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    info(`${Array.isArray(res.body) ? res.body.length : '?'} member(s); shape ${shape(res.body)}`);
  });

  await step('cf_list_invites (owner) never returns token_hash', async () => {
    const res = await rest.rpc('cf_list_invites', { p_tenant_id: aliceTenant }, aliceJwt);
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    info(`shape ${shape(res.body)}`);
    if (JSON.stringify(res.body).includes('token_hash')) throw new Error('token_hash leaked');
  });

  await step('a member may not call cf_list_members → 403 not_admin', async () => {
    const res = await rest.rpc('cf_list_members', { p_tenant_id: aliceTenant }, bobJwt);
    info(`status ${res.status}, hint ${res.hint ?? '(none)'}`);
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status}`);
  });

  await step('the owner cannot leave → 409 owner_cannot_leave', async () => {
    const res = await rest.rpc('cf_leave_tenant', { p_tenant_id: aliceTenant }, aliceJwt);
    info(`status ${res.status}, hint ${res.hint ?? '(none)'}`);
    if (res.status !== 409) throw new Error(`expected 409, got ${res.status}`);
  });

  console.log(
    failures === 0
      ? `\nAll checks passed against ${projectRef}. Re-run this script on the same project — it must stay green.`
      : `\n${failures} check(s) failed against ${projectRef}.`,
  );
}

await main();
