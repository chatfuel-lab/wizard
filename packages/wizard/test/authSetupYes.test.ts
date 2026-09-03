import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `--yes` is a promise: the wizard finishes without ever asking. For the auth
 * module that promise has teeth — it must NOT be auto-selected (it needs a
 * Supabase project), it must NOT create a project unless --supabase-create
 * asked for one by name, and when the credentials are there it must run end to
 * end silently.
 *
 * The prompts are replaced with ones that THROW: any interactive call in a
 * --yes run fails the test rather than hanging it.
 */
vi.mock('../src/prompts/checklist', () => ({
  checklist: () => {
    throw new Error('prompted in a --yes run: checklist');
  },
}));

const warnings = vi.hoisted(() => [] as string[]);

vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted in a --yes run: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: prompted('confirm'),
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: (message: string) => warnings.push(message),
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
    spinner: () => ({
      start: () => undefined,
      message: () => undefined,
      stop: () => undefined,
      error: () => undefined,
    }),
  };
});

const { createContext } = await import('../src/run');
const { authSetup, assertNonInteractiveAuthCredentials, assertAuthFlags, projectRefFromUrl } =
  await import('../src/steps/authSetup');
const { selectModules } = await import('../src/steps/selectModules');
const { WizardError } = await import('../src/errors');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

const REF = 'abcdefghijklmnopqrst';

function ctxWith(flags: Partial<WizardFlags>): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, ...flags });
  ctx.answers.modules = ['core', 'auth'];
  // With auth the wizard picks a Chatfuel workspace instead of bots — that is
  // what authSetup runs after, and what names the default project.
  ctx.answers.workspace = { id: 'ws-1', title: "Bob's Agency", botsLimit: 20, botCount: 3 };
  return ctx;
}

/**
 * Answers the exact PAT-path sequence: project → keys → migrations → auth
 * config (settings, then the recovery template).
 *
 * `freeTierTemplates` reproduces a real free-plan project: the template PATCH
 * is refused with a 400 while the settings PATCH is accepted.
 */
function patFetch({
  freeTierTemplates = false,
  authConfig = { site_url: '', uri_allow_list: '' } as Record<string, unknown>,
} = {}) {
  const urls: string[] = [];
  const patches: Array<Record<string, unknown>> = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    urls.push(`${init?.method ?? 'GET'} ${url.replace('https://api.supabase.com', '')}`);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/v1/organizations')) return json([{ id: 'acme', name: 'Acme' }]);
    if (url.endsWith(`/v1/projects/${REF}`)) {
      return json({ id: REF, name: 'App', status: 'ACTIVE_HEALTHY', region: 'eu-west-1', organization_slug: 'acme' });
    }
    if (url.includes('/api-keys')) {
      return json([
        { type: 'publishable', api_key: 'sb_publishable_test' },
        { type: 'secret', api_key: 'sb_secret_test' },
      ]);
    }
    if (url.includes('/database/query')) {
      const body = JSON.parse(String(init?.body)) as { query: string };
      return json(body.query.includes('cf_tenants') ? [{ owner_claimed: false }] : []);
    }
    if (url.includes('/config/auth')) {
      const isTemplatePatch =
        init?.method === 'PATCH' && String(init.body).includes('mailer_templates_recovery_content');
      if (isTemplatePatch && freeTierTemplates) {
        return json(
          {
            message:
              'Email template modification is not available for free tier projects using the default email provider.',
          },
          400,
        );
      }
      if (init?.method === 'PATCH') patches.push(JSON.parse(String(init.body)) as Record<string, unknown>);
      return json(authConfig);
    }
    throw new Error(`unexpected request: ${url}`);
  }) as unknown as typeof fetch;
  return { fetchImpl, urls, patches };
}

const NEW_REF = 'newprojectrefaaaaaaa';

const REGIONS = {
  recommendations: { smartGroup: { code: 'eu' } },
  all: {
    smartGroup: [
      { code: 'eu', name: 'Europe' },
      { code: 'us', name: 'United States' },
    ],
    specific: [{ code: 'eu-west-1', name: 'London' }],
  },
};

const health = [
  { name: 'auth', healthy: true },
  { name: 'db', healthy: true },
  { name: 'rest', healthy: true },
];

/**
 * The create path: organizations → the project list → regions → POST
 * /v1/projects → the status poll → health, then the same keys / migration /
 * auth-config tail every PAT run has. `projects` is the account as it stands
 * before the run, and a created project is pushed into it — which is how the
 * second call in a re-run finds it.
 */
function createFetch({
  orgs = [{ id: 'acme', name: 'Acme' }] as Record<string, unknown>[],
  projects = [] as Record<string, unknown>[],
} = {}) {
  const urls: string[] = [];
  const created: Record<string, unknown>[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input).replace('https://api.supabase.com', '');
    const method = init?.method ?? 'GET';
    urls.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

    if (path === '/v1/organizations') return json(orgs);
    if (path.startsWith('/v1/projects/available-regions')) return json(REGIONS);
    if (path === '/v1/projects' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      created.push(body);
      const project = {
        id: NEW_REF,
        name: body.name,
        status: 'ACTIVE_HEALTHY',
        region: (body.region_selection as Record<string, string>).code,
        organization_slug: body.organization_slug,
      };
      projects.push(project);
      return json({ ...project, status: 'COMING_UP' });
    }
    if (path === '/v1/projects') return json(projects);
    if (path.includes('/health')) return json(health);
    if (path.includes('/api-keys')) {
      return json([
        { type: 'publishable', api_key: 'sb_publishable_test' },
        { type: 'secret', api_key: 'sb_secret_test' },
      ]);
    }
    if (path.includes('/database/query')) return json([]);
    if (path.includes('/config/auth')) return json({ site_url: '', uri_allow_list: '' });

    const ref = /^\/v1\/projects\/([^/?]+)$/.exec(path)?.[1];
    const found = projects.find((project) => project.id === ref);
    if (found) return json(found);
    return json({ message: 'not found' }, 404);
  }) as unknown as typeof fetch;
  return { fetchImpl, urls, created, projects };
}

const ORIGINAL_PAT = process.env.SUPABASE_ACCESS_TOKEN;
beforeEach(() => {
  delete process.env.SUPABASE_ACCESS_TOKEN;
});
afterEach(() => {
  if (ORIGINAL_PAT === undefined) delete process.env.SUPABASE_ACCESS_TOKEN;
  else process.env.SUPABASE_ACCESS_TOKEN = ORIGINAL_PAT;
});

describe('--yes without Supabase credentials', () => {
  it('refuses with an actionable hint', async () => {
    const err = await authSetup(ctxWith({})).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WizardError);
    expect((err as InstanceType<typeof WizardError>).message).toContain('needs Supabase credentials');
    expect((err as InstanceType<typeof WizardError>).hint).toMatch(/--supabase-project/);
  });

  it('refuses a PAT that names no project — neither an existing ref nor one to create', async () => {
    process.env.SUPABASE_ACCESS_TOKEN = 'sbp_token00000000000000000000';
    await expect(authSetup(ctxWith({}))).rejects.toThrow(/needs Supabase credentials/);
  });

  it('accepts either credential pair', () => {
    process.env.SUPABASE_ACCESS_TOKEN = 'sbp_token00000000000000000000';
    expect(assertNonInteractiveAuthCredentials(ctxWith({ supabaseProject: REF }))).toBe('pat');
    expect(assertNonInteractiveAuthCredentials(ctxWith({ supabaseCreate: 'Acme app' }))).toBe('pat');
    delete process.env.SUPABASE_ACCESS_TOKEN;
    expect(
      assertNonInteractiveAuthCredentials(ctxWith({ supabaseUrl: `https://${REF}.supabase.co`, supabaseAnonKey: 'k' })),
    ).toBe('manual');
  });
});

describe('--supabase-create', () => {
  beforeEach(() => {
    process.env.SUPABASE_ACCESS_TOKEN = 'sbp_token00000000000000000000';
  });

  it('creates the project when nothing carries the name, and finishes the run', async () => {
    const { fetchImpl, urls, created } = createFetch();
    const ctx = ctxWith({ supabaseCreate: 'Acme app' });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    expect(created).toEqual([
      expect.objectContaining({
        name: 'Acme app',
        organization_slug: 'acme',
        region_selection: { type: 'smartGroup', code: 'eu' },
      }),
    ]);
    // db_pass is generated, never prompted — present, and not the name.
    expect(String(created[0]!.db_pass).length).toBeGreaterThan(20);
    expect(urls).toEqual([
      'GET /v1/organizations',
      'GET /v1/projects',
      'GET /v1/projects/available-regions?organization_slug=acme',
      'POST /v1/projects',
      `GET /v1/projects/${NEW_REF}`,
      `GET /v1/projects/${NEW_REF}/health?services=auth,db,rest`,
      `GET /v1/projects/${NEW_REF}/api-keys?reveal=true`,
      `POST /v1/projects/${NEW_REF}/database/query`, // 0001, the schema
      `GET /v1/projects/${NEW_REF}/config/auth`,
      `PATCH /v1/projects/${NEW_REF}/config/auth`,
      `GET /v1/projects/${NEW_REF}/config/auth`,
      `PATCH /v1/projects/${NEW_REF}/config/auth`,
    ]);
    expect(ctx.answers.env).toEqual({
      VITE_SUPABASE_URL: `https://${NEW_REF}.supabase.co`,
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
      SUPABASE_PROJECT_REF: NEW_REF,
    });
  });

  // The whole point of the flag in a script: run it twice, get one project.
  it('reuses the project that already carries the name', async () => {
    const account = [
      { id: REF, name: 'Acme app', status: 'ACTIVE_HEALTHY', region: 'eu-west-1', organization_slug: 'acme' },
    ];
    const { fetchImpl, urls, created } = createFetch({ projects: account });
    const ctx = ctxWith({ supabaseCreate: 'Acme app' });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    expect(created).toEqual([]);
    expect(urls).not.toContain('POST /v1/projects');
    expect(urls).not.toContain('GET /v1/projects/available-regions?organization_slug=acme');
    expect(ctx.answers.auth).toMatchObject({ projectRef: REF, migrationApplied: true });
  });

  it('refuses a paused project of that name rather than making a second one', async () => {
    const account = [{ id: REF, name: 'Acme app', status: 'INACTIVE', region: 'eu-west-1', organization_slug: 'acme' }];
    const { fetchImpl, created } = createFetch({ projects: account });
    await expect(
      authSetup(ctxWith({ supabaseCreate: 'Acme app' }), { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 }),
    ).rejects.toThrow(/is paused/);
    expect(created).toEqual([]);
  });

  it('refuses when two projects share the name, and names both refs', async () => {
    const twin = 'zyxwvutsrqponmlkjihg';
    const account = [
      { id: REF, name: 'Acme app', status: 'ACTIVE_HEALTHY', region: 'eu-west-1', organization_slug: 'acme' },
      { id: twin, name: 'Acme app', status: 'ACTIVE_HEALTHY', region: 'us-east-1', organization_slug: 'acme' },
    ];
    const { fetchImpl } = createFetch({ projects: account });
    const err = (await authSetup(ctxWith({ supabaseCreate: 'Acme app' }), {
      fetch: fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    }).catch((e: unknown) => e)) as InstanceType<typeof WizardError>;
    expect(err.message).toMatch(/2 Supabase projects are called/);
    expect(err.hint).toContain(REF);
    expect(err.hint).toContain(twin);
  });

  it('needs --supabase-org when the token sees several, and takes it when given', async () => {
    const orgs = [
      { id: 'acme', name: 'Acme' },
      { id: 'globex', name: 'Globex' },
    ];
    const err = (await authSetup(ctxWith({ supabaseCreate: 'Acme app' }), {
      fetch: createFetch({ orgs }).fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    }).catch((e: unknown) => e)) as InstanceType<typeof WizardError>;
    expect(err.message).toMatch(/sees 2 organizations/);
    expect(err.hint).toMatch(/--supabase-org/);
    expect(err.hint).toContain('globex');

    const second = createFetch({ orgs });
    await authSetup(ctxWith({ supabaseCreate: 'Acme app', supabaseOrg: 'globex' }), {
      fetch: second.fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    });
    expect(second.created[0]).toMatchObject({ organization_slug: 'globex' });
  });

  it('refuses an organization the token cannot see', async () => {
    const { fetchImpl } = createFetch();
    const err = (await authSetup(ctxWith({ supabaseCreate: 'Acme app', supabaseOrg: 'nowhere' }), {
      fetch: fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    }).catch((e: unknown) => e)) as InstanceType<typeof WizardError>;
    expect(err.message).toMatch(/no organization "nowhere"/);
    expect(err.hint).toContain('acme');
  });

  it('takes --supabase-region, and refuses one Supabase does not offer', async () => {
    const ok = createFetch();
    await authSetup(ctxWith({ supabaseCreate: 'Acme app', supabaseRegion: 'eu-west-1' }), {
      fetch: ok.fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    });
    expect(ok.created[0]).toMatchObject({ region_selection: { type: 'specific', code: 'eu-west-1' } });

    const err = (await authSetup(ctxWith({ supabaseCreate: 'Acme app', supabaseRegion: 'mars-north-1' }), {
      fetch: createFetch().fetchImpl,
      sleep: async () => undefined,
      pollMs: 0,
    }).catch((e: unknown) => e)) as InstanceType<typeof WizardError>;
    expect(err.message).toMatch(/no region "mars-north-1"/);
    expect(err.hint).toContain('eu-west-1');
  });

  it('--dry-run says what it would create and creates nothing', async () => {
    const { fetchImpl, urls, created } = createFetch();
    const ctx = ctxWith({ supabaseCreate: 'Acme app', dryRun: true });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    expect(created).toEqual([]);
    expect(urls.filter((u) => u.startsWith('POST') || u.startsWith('PATCH'))).toEqual([]);
    // No project, so no values at all. An empty VITE_SUPABASE_URL is not
    // "auth is off" to the app — it is a configured URL that happens to be
    // nothing, and it would be written into a real .env by a run whose whole
    // promise is that it changes nothing.
    expect(ctx.answers.env).not.toHaveProperty('VITE_SUPABASE_URL');
    expect(ctx.answers.env).not.toHaveProperty('VITE_SUPABASE_ANON_KEY');
  });

  it('refuses --supabase-project and --supabase-create together, before any request', async () => {
    const fetchImpl = (async () => {
      throw new Error('a contradictory command line must not reach the network');
    }) as unknown as typeof fetch;
    await expect(
      authSetup(ctxWith({ supabaseProject: REF, supabaseCreate: 'Acme app' }), { fetch: fetchImpl }),
    ).rejects.toThrow(/name two different projects/);
  });

  it('refuses an empty or over-long name', () => {
    expect(() => assertAuthFlags(ctxWith({ supabaseCreate: '   ' }))).toThrow(/is not a project name/);
    expect(() => assertAuthFlags(ctxWith({ supabaseCreate: 'x'.repeat(65) }))).toThrow(/is not a project name/);
    expect(() => assertAuthFlags(ctxWith({ supabaseCreate: 'Acme app' }))).not.toThrow();
  });
});

describe('--yes on the PAT path', () => {
  it('runs the whole sequence with no prompts and fills answers + env', async () => {
    process.env.SUPABASE_ACCESS_TOKEN = 'sbp_token00000000000000000000';
    const { fetchImpl, urls } = patFetch();
    const ctx = ctxWith({ supabaseProject: REF });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    expect(urls).toEqual([
      'GET /v1/organizations',
      `GET /v1/projects/${REF}`,
      `GET /v1/projects/${REF}/api-keys?reveal=true`,
      `POST /v1/projects/${REF}/database/query`, // is somebody already living here?
      `POST /v1/projects/${REF}/database/query`, // 0001, the schema
      `GET /v1/projects/${REF}/config/auth`,
      `PATCH /v1/projects/${REF}/config/auth`, // settings
      `GET /v1/projects/${REF}/config/auth`,
      `PATCH /v1/projects/${REF}/config/auth`, // recovery template, on its own
    ]);

    expect(ctx.answers.auth).toMatchObject({
      method: 'pat',
      projectRef: REF,
      url: `https://${REF}.supabase.co`,
      anonKey: 'sb_publishable_test',
      anonKeyKind: 'publishable',
      secretKey: 'sb_secret_test',
      migrationApplied: true,
      authConfigured: true,
    });
    expect(ctx.answers.env).toEqual({
      VITE_SUPABASE_URL: `https://${REF}.supabase.co`,
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test',
      SUPABASE_PROJECT_REF: REF,
    });
  });

  // A free-plan project refuses email-template edits. That must cost us the
  // template and nothing else — above all not `mailer_autoconfirm`, without
  // which sign-up cannot complete at all.
  it('survives a free-plan refusal of the recovery template', async () => {
    process.env.SUPABASE_ACCESS_TOKEN = 'sbp_token00000000000000000000';
    const { fetchImpl, urls } = patFetch({ freeTierTemplates: true });
    const ctx = ctxWith({ supabaseProject: REF });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });
    expect(ctx.answers.auth).toMatchObject({ authConfigured: true, migrationApplied: true });
    expect(urls.filter((u) => u.startsWith('PATCH'))).toHaveLength(2);
  });

  /**
   * `--supabase-project` names a project the wizard did not make: it has users
   * on it, and every one of these three settings is something somebody went
   * into the dashboard and chose. The wizard used to assert all three on every
   * run — so pointing it at a live project turned email confirmation off and
   * re-opened sign-ups, silently, as a side effect of setting up an app.
   */
  it('adds to a project it did not create, and takes nothing away', async () => {
    const { fetchImpl, patches } = patFetch({
      authConfig: {
        site_url: 'https://theirs.example.com',
        uri_allow_list: 'https://theirs.example.com/**',
        disable_signup: true,
        mailer_autoconfirm: false,
        external_email_enabled: false,
      },
    });
    const ctx = ctxWith({
      supabaseProject: REF,
      supabaseToken: 'sbp_token00000000000000000000',
      appUrl: 'https://app.example.com',
    });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    const settings = patches.find((body) => 'uri_allow_list' in body)!;
    expect(settings).not.toHaveProperty('disable_signup');
    expect(settings).not.toHaveProperty('mailer_autoconfirm');
    expect(settings).not.toHaveProperty('external_email_enabled');
    // The app URL is still added — that is the one thing the run is entitled to.
    expect(settings.uri_allow_list).toContain('https://app.example.com/**');
    // localhost is not: it is an entry nobody would come back and remove.
    expect(settings.uri_allow_list).not.toContain('localhost:5173');
    // And their site_url is left where it is.
    expect(settings).not.toHaveProperty('site_url');
  });

  it('--dry-run resolves env but sends no mutating call', async () => {
    const { fetchImpl, urls } = patFetch();
    const ctx = ctxWith({ supabaseProject: REF, supabaseToken: 'sbp_token00000000000000000000', dryRun: true });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });

    expect(urls.filter((u) => u.startsWith('POST') || u.startsWith('PATCH'))).toEqual([]);
    expect(ctx.answers.auth).toMatchObject({ migrationApplied: false, authConfigured: false });
    expect(ctx.answers.env.VITE_SUPABASE_URL).toBe(`https://${REF}.supabase.co`);
  });

  it('keeps going when the migration fails — the SQL files still ship', async () => {
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
      if (url.endsWith('/v1/organizations')) return json([{ id: 'acme', name: 'Acme' }]);
      if (url.endsWith(`/v1/projects/${REF}`)) return json({ id: REF, name: 'App', status: 'ACTIVE_HEALTHY' });
      if (url.includes('/api-keys')) return json([{ type: 'publishable', api_key: 'sb_publishable_test' }]);
      if (url.includes('/database/query')) return json({ message: 'permission denied' }, 403);
      if (url.includes('/config/auth')) return json({ site_url: '' });
      throw new Error(`unexpected request: ${url}`);
    }) as unknown as typeof fetch;

    const ctx = ctxWith({ supabaseProject: REF, supabaseToken: 'sbp_token00000000000000000000' });
    await authSetup(ctx, { fetch: fetchImpl, sleep: async () => undefined, pollMs: 0 });
    expect(ctx.answers.auth).toMatchObject({ migrationApplied: false });
    expect(ctx.answers.env.VITE_SUPABASE_URL).toBe(`https://${REF}.supabase.co`);
  });
});

describe('--yes on the manual path', () => {
  it('takes the flags, derives the ref, and touches no network', async () => {
    const fetchImpl = (async () => {
      throw new Error('the manual path must not make a request');
    }) as unknown as typeof fetch;
    const ctx = ctxWith({
      supabaseUrl: `https://${REF}.supabase.co/`,
      supabaseAnonKey: 'sb_publishable_manual',
      appUrl: 'https://app.example.com/',
    });
    await authSetup(ctx, { fetch: fetchImpl });

    expect(ctx.answers.auth).toMatchObject({
      method: 'manual',
      projectRef: REF,
      url: `https://${REF}.supabase.co`,
      anonKey: 'sb_publishable_manual',
      anonKeyKind: 'publishable',
      appUrl: 'https://app.example.com',
      migrationApplied: false,
      authConfigured: false,
    });
    expect(ctx.answers.env.SUPABASE_PROJECT_REF).toBe(REF);
    expect(ctx.answers.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it('rejects a malformed --supabase-url and a non-https --app-url', async () => {
    await expect(authSetup(ctxWith({ supabaseUrl: 'not-a-url', supabaseAnonKey: 'k' }))).rejects.toThrow(
      /is not an https:\/\/ URL/,
    );
    await expect(
      authSetup(
        ctxWith({
          supabaseUrl: `https://${REF}.supabase.co`,
          supabaseAnonKey: 'k',
          appUrl: 'http://insecure.example.com',
        }),
      ),
    ).rejects.toThrow(/https/);
  });

  /**
   * The failure mode a strict URL rule would have caught and broken at the
   * same time: a working https address that Supabase does not serve. It is a
   * custom domain as often as it is a typo, so it is said out loud and taken.
   */
  it('says a custom domain is not a supabase.co address, and takes it anyway', async () => {
    warnings.length = 0;
    const ctx = ctxWith({ supabaseUrl: 'https://auth.mycompany.com', supabaseAnonKey: 'sb_publishable_manual' });

    await authSetup(ctx, {
      fetch: (async () => {
        throw new Error('the manual path must not make a request');
      }) as unknown as typeof fetch,
    });

    expect(ctx.answers.auth).toMatchObject({ method: 'manual', url: 'https://auth.mycompany.com' });
    expect(ctx.answers.auth?.projectRef).toBeUndefined();
    expect(ctx.answers.env.SUPABASE_PROJECT_REF).toBeUndefined();
    expect(warnings.join('\n')).toContain('not a supabase.co address');
  });

  it('reads the ref out of a project URL, and gives up on a custom domain', () => {
    expect(projectRefFromUrl(`https://${REF}.supabase.co`)).toBe(REF);
    expect(projectRefFromUrl('https://auth.mycompany.com')).toBeUndefined();
  });
});

describe('module selection', () => {
  it('--yes never auto-selects the opt-in auth module', async () => {
    const ctx = createContext({ yes: true, dryRun: true, verbose: false });
    await selectModules(ctx);
    expect(ctx.answers.modules).not.toContain('auth');
    expect(ctx.answers.modules).toContain('livechat');
  });

  it('--modules can still ask for it explicitly', async () => {
    const ctx = createContext({ yes: true, dryRun: true, verbose: false, modules: 'auth' });
    await selectModules(ctx);
    expect(ctx.answers.modules).toContain('auth');
  });
});
