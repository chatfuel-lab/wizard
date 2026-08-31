import { describe, expect, it, vi } from 'vitest';
import {
  createManagementClient,
  defaultRegion,
  HINT_401,
  HINT_403,
  parseRegions,
  projectStatusLabel,
  sortProjects,
  SupabaseManagementError,
} from '../src/supabase/management';
import { classifyAnonKey, pickKeys, type ManagementApiKey } from '../src/supabase/keys';
import {
  authPatchDiff,
  desiredAuthPatch,
  desiredRecoveryPatch,
  DEV_ORIGIN,
  inviteEmailCaveat,
  keptAuthDefences,
  mergeAllowList,
  normalizeAppUrl,
  SUPABASE_DEFAULT_SITE_URL,
} from '../src/supabase/authConfig';

/**
 * The Management API is the one part of the wizard that talks to a service we
 * do not own, over a beta endpoint, with a token whose scopes vary. These tests
 * pin the contract we depend on: which call is made, what a failure turns into
 * for the user, and that a rate-limited call is retried exactly once.
 */

interface MockCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

function mockFetch(handlers: Array<{ match: RegExp | string; status?: number; body?: unknown }>) {
  const calls: MockCall[] = [];
  const queue = [...handlers];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    });
    const index = queue.findIndex((h) => (typeof h.match === 'string' ? url.includes(h.match) : h.match.test(url)));
    if (index < 0) throw new Error(`unexpected request: ${init?.method ?? 'GET'} ${url}`);
    const handler = queue[index]!;
    // Handlers are consumed in order so a second identical call can answer differently.
    queue.splice(index, 1);
    const status = handler.status ?? 200;
    return new Response(handler.body === undefined ? '' : JSON.stringify(handler.body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const client = (handlers: Parameters<typeof mockFetch>[0], extra: Record<string, unknown> = {}) => {
  const { fetchImpl, calls } = mockFetch(handlers);
  return {
    calls,
    client: createManagementClient({
      token: 'sbp_testtoken000000000000000000000000000000',
      fetch: fetchImpl,
      sleep: async () => undefined,
      retryDelayMs: () => 0,
      pollMs: 0,
      ...extra,
    }),
  };
};

describe('management client — happy path', () => {
  it('lists organizations with a bearer token', async () => {
    const { client: api, calls } = client([{ match: '/v1/organizations', body: [{ id: 'acme', name: 'Acme' }] }]);
    expect(await api.listOrganizations()).toEqual([{ slug: 'acme', name: 'Acme' }]);
    expect(calls[0]!.url).toBe('https://api.supabase.com/v1/organizations');
    expect(calls[0]!.headers.Authorization).toMatch(/^Bearer sbp_/);
  });

  it('normalises the project shape and runs SQL against the right project', async () => {
    const { client: api, calls } = client([
      {
        match: '/v1/projects/abc',
        body: { id: 'abc', name: 'App', region: 'eu-west-1', status: 'ACTIVE_HEALTHY', organization_slug: 'acme' },
      },
      { match: '/database/query', body: [{ owner_claimed: false }] },
    ]);
    expect(await api.getProject('abc')).toEqual({
      ref: 'abc',
      name: 'App',
      organizationSlug: 'acme',
      region: 'eu-west-1',
      status: 'ACTIVE_HEALTHY',
      createdAt: undefined,
    });
    await api.runQuery('abc', 'select 1');
    expect(calls[1]!.url).toContain('/v1/projects/abc/database/query');
    expect(calls[1]!.body).toEqual({ query: 'select 1' });
  });

  it('sends bound parameters when given', async () => {
    const { client: api, calls } = client([{ match: '/database/query', body: [] }]);
    await api.runQuery('abc', 'select $1', ['x']);
    expect(calls[0]!.body).toEqual({ query: 'select $1', parameters: ['x'] });
  });

  it('asks for the revealed api keys', async () => {
    const { client: api, calls } = client([
      { match: '/api-keys', body: [{ type: 'publishable', api_key: 'sb_publishable_x' }] },
    ]);
    await api.getApiKeys('abc');
    expect(calls[0]!.url).toContain('/api-keys?reveal=true');
  });
});

describe('management client — failures the user actually hits', () => {
  it('401 carries the "mint a token" hint', async () => {
    const { client: api } = client([{ match: '/v1/organizations', status: 401, body: { message: 'Unauthorized' } }]);
    const err = await api.listOrganizations().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SupabaseManagementError);
    expect((err as SupabaseManagementError).status).toBe(401);
    expect((err as SupabaseManagementError).hint).toBe(HINT_401);
  });

  it('403 names the fine-grained scopes', async () => {
    const { client: api } = client([{ match: '/api-keys', status: 403, body: { message: 'forbidden' } }]);
    const err = await api.getApiKeys('abc').catch((e: unknown) => e);
    expect((err as SupabaseManagementError).hint).toBe(HINT_403);
    expect((err as SupabaseManagementError).hint).toContain('secrets read');
  });

  it('retries a 429 exactly once and succeeds', async () => {
    const { client: api, calls } = client([
      { match: '/v1/projects', status: 429, body: { message: 'rate limited' } },
      { match: '/v1/projects', body: [{ id: 'abc', name: 'App', status: 'ACTIVE_HEALTHY' }] },
    ]);
    const projects = await api.listProjects();
    expect(projects).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it('gives up after the single retry', async () => {
    const { client: api, calls } = client([
      { match: '/v1/projects', status: 503, body: {} },
      { match: '/v1/projects', status: 503, body: {} },
    ]);
    await expect(api.listProjects()).rejects.toThrow(/503/);
    expect(calls).toHaveLength(2);
  });

  it('does not retry a 400', async () => {
    const { client: api, calls } = client([
      { match: '/database/query', status: 400, body: { message: 'syntax error' } },
    ]);
    await expect(api.runQuery('abc', 'nope')).rejects.toThrow(/syntax error/);
    expect(calls).toHaveLength(1);
  });
});

describe('waiting for a project', () => {
  it('polls until ACTIVE_HEALTHY', async () => {
    const { client: api } = client([
      { match: '/v1/projects/abc', body: { id: 'abc', status: 'COMING_UP' } },
      { match: '/v1/projects/abc', body: { id: 'abc', status: 'COMING_UP' } },
      { match: '/v1/projects/abc', body: { id: 'abc', status: 'ACTIVE_HEALTHY' } },
    ]);
    const seen: string[] = [];
    const project = await api.waitForProject('abc', { onStatus: (s) => seen.push(s) });
    expect(project.status).toBe('ACTIVE_HEALTHY');
    expect(seen).toEqual(['COMING_UP', 'ACTIVE_HEALTHY']); // deduped
  });

  it('fails fast on a terminal status', async () => {
    const { client: api } = client([{ match: '/v1/projects/abc', body: { id: 'abc', status: 'INIT_FAILED' } }]);
    await expect(api.waitForProject('abc')).rejects.toThrow(/INIT_FAILED/);
  });

  it('times out with an actionable hint', async () => {
    const handlers = Array.from({ length: 20 }, () => ({
      match: '/v1/projects/abc',
      body: { id: 'abc', status: 'COMING_UP' },
    }));
    const { client: api } = client(handlers);
    const err = await api.waitForProject('abc', { capMs: 0 }).catch((e: unknown) => e);
    expect((err as SupabaseManagementError).message).toMatch(/Timed out/);
    expect((err as SupabaseManagementError).hint).toMatch(/--supabase-project/);
  });

  it('waits for every requested service to report healthy', async () => {
    const { client: api, calls } = client([
      {
        match: '/health',
        body: [
          { name: 'auth', healthy: false, status: 'COMING_UP' },
          { name: 'db', healthy: true },
          { name: 'rest', healthy: true },
        ],
      },
      {
        match: '/health',
        body: [
          { name: 'auth', healthy: true },
          { name: 'db', healthy: true },
          { name: 'rest', healthy: true },
        ],
      },
    ]);
    const health = await api.waitForHealth('abc');
    expect(health.every((s) => s.healthy)).toBe(true);
    expect(calls[0]!.url).toContain('services=auth,db,rest');
  });
});

describe('regions', () => {
  it('parses smart groups and specific regions, preferring the recommended smart group', () => {
    const regions = parseRegions({
      smartGroups: [
        { code: 'eu', name: 'Europe' },
        { code: 'us', name: 'United States' },
      ],
      specific: [{ code: 'eu-west-1', name: 'Ireland' }],
      recommendation: { smartGroup: 'us' },
    });
    expect(regions).toHaveLength(3);
    expect(defaultRegion(regions)).toMatchObject({ code: 'us', type: 'smartGroup' });
  });

  // The shape the API actually answers: the lists
  // live under `all`, the key is SINGULAR, and the recommendations are a
  // sibling object. Parsing it wrongly is not cosmetic — the create-project
  // step then says "Supabase returned no regions" and the wizard stops.
  it('reads today’s shape: lists under `all`, singular `smartGroup`, `recommendations`', () => {
    const regions = parseRegions({
      recommendations: {
        smartGroup: { code: 'americas', name: 'Americas', type: 'smartGroup' },
        specific: [{ code: 'us-east-1', name: 'East US (North Virginia)', type: 'specific' }],
      },
      all: {
        smartGroup: [
          { code: 'americas', name: 'Americas', type: 'smartGroup' },
          { code: 'emea', name: 'Europe', type: 'smartGroup' },
        ],
        specific: [
          { code: 'us-west-2', name: 'West US (Oregon)', type: 'specific' },
          { code: 'us-east-1', name: 'East US (North Virginia)', type: 'specific' },
        ],
      },
    });
    expect(regions.map((r) => r.code)).toEqual(['americas', 'emea', 'us-west-2', 'us-east-1']);
    expect(defaultRegion(regions)).toMatchObject({ code: 'americas', type: 'smartGroup' });
    expect(regions.find((r) => r.code === 'us-east-1')?.recommended).toBe(true);
  });

  it('tolerates a bare array of codes', () => {
    const regions = parseRegions(['eu-west-1', 'us-east-1']);
    expect(regions.map((r) => r.code)).toEqual(['eu-west-1', 'us-east-1']);
    expect(regions.every((r) => r.type === 'specific')).toBe(true);
  });
});

describe('project listing ergonomics', () => {
  it('sorts healthy first and paused last', () => {
    const make = (ref: string, status: string, name = ref) => ({
      ref,
      name,
      status,
      region: 'eu',
      organizationSlug: 'acme',
    });
    const sorted = sortProjects([make('c', 'INACTIVE'), make('b', 'COMING_UP'), make('a', 'ACTIVE_HEALTHY')]);
    expect(sorted.map((p) => p.ref)).toEqual(['a', 'b', 'c']);
  });

  it('explains a paused project in the picker hint', () => {
    expect(projectStatusLabel('INACTIVE')).toMatch(/paused/);
    expect(projectStatusLabel('ACTIVE_HEALTHY')).toBe('active');
  });
});

describe('pickKeys', () => {
  const legacy: ManagementApiKey[] = [
    { type: 'legacy', name: 'anon', api_key: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig' },
    { type: 'legacy', name: 'service_role', api_key: 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic3IifQ.sig' },
  ];

  it('prefers publishable/secret over the legacy pair', () => {
    const picked = pickKeys([
      ...legacy,
      { type: 'publishable', api_key: 'sb_publishable_abc' },
      { type: 'secret', api_key: 'sb_secret_abc' },
    ]);
    expect(picked).toMatchObject({
      anonKey: 'sb_publishable_abc',
      anonKeyKind: 'publishable',
      secretKey: 'sb_secret_abc',
      secretKeyKind: 'secret',
    });
  });

  it('falls back to the legacy anon / service_role keys', () => {
    const picked = pickKeys(legacy);
    expect(picked.anonKeyKind).toBe('legacy');
    expect(picked.secretKeyKind).toBe('legacy');
    expect(picked.anonKey).toContain('eyJ');
  });

  it('works without any secret key (admin reset links simply stay off)', () => {
    const picked = pickKeys([{ type: 'publishable', api_key: 'sb_publishable_abc' }]);
    expect(picked.secretKey).toBeUndefined();
  });

  it('throws when nothing anon-shaped came back', () => {
    expect(() => pickKeys([{ type: 'secret', api_key: 'sb_secret_only' }])).toThrow(/anon/i);
    expect(() => pickKeys([{ type: 'publishable', api_key: null }])).toThrow(/anon/i);
  });

  it('classifies a pasted key on the manual path', () => {
    expect(classifyAnonKey('sb_publishable_x')).toBe('publishable');
    expect(classifyAnonKey('eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig')).toBe('legacy');
    expect(classifyAnonKey('whatever')).toBe('unknown');
  });
});

describe('auth config patch', () => {
  it('merges the allow list into one comma string without duplicates', () => {
    expect(mergeAllowList('https://a.com/**, https://b.com/**', ['https://a.com/**', 'http://localhost:5173/**'])).toBe(
      'https://a.com/**,https://b.com/**,http://localhost:5173/**',
    );
    expect(mergeAllowList(null, ['x'])).toBe('x');
    expect(mergeAllowList('  ', [])).toBe('');
  });

  it('sets site_url only when it is empty or Supabase’s default', () => {
    expect(desiredAuthPatch({ site_url: '' }).site_url).toBe(DEV_ORIGIN);
    expect(
      desiredAuthPatch({ site_url: SUPABASE_DEFAULT_SITE_URL }, { appUrl: 'https://app.example.com' }).site_url,
    ).toBe('https://app.example.com');
    // Somebody else's project, somebody else's site_url — never clobbered.
    expect(desiredAuthPatch({ site_url: 'https://other.example.com' }).site_url).toBeUndefined();
  });

  it('turns email sign-in on and allowlists the origins, on a project this run created', () => {
    const patch = desiredAuthPatch({}, { appUrl: 'https://app.example.com/', createdProject: true });
    expect(patch).toMatchObject({ mailer_autoconfirm: true, external_email_enabled: true, disable_signup: false });
    expect(patch.uri_allow_list).toBe('http://localhost:5173/**,https://app.example.com/**');
  });

  /* The wizard is pointed at a project that already has users on it more often
     than it makes one. Every assertion below is something a person went into
     the dashboard and turned on, and a setup wizard that silently turns it back
     off is worse than one that does nothing. */
  it('never weakens sign-in settings on a project it did not create', () => {
    const locked = { mailer_autoconfirm: false, external_email_enabled: false, disable_signup: true };
    const patch = desiredAuthPatch(locked, { appUrl: 'https://app.example.com' });
    // Not written back as they were found — not written at all. A PATCH body
    // that names a setting is a PATCH that can lose a race with the dashboard.
    expect(patch).not.toHaveProperty('mailer_autoconfirm');
    expect(patch).not.toHaveProperty('external_email_enabled');
    expect(patch).not.toHaveProperty('disable_signup');
    const changed = authPatchDiff(locked, patch);
    expect(changed).not.toContain('mailer_autoconfirm');
    expect(changed).not.toContain('external_email_enabled');
    expect(changed).not.toContain('disable_signup');
  });

  it('keeps localhost out of a pre-existing project’s allow list, and still adds the app URL', () => {
    const patch = desiredAuthPatch(
      { uri_allow_list: 'https://old.example.com/**' },
      { appUrl: 'https://app.example.com' },
    );
    expect(patch.uri_allow_list).toBe('https://old.example.com/**,https://app.example.com/**');
    expect(patch.uri_allow_list).not.toContain(DEV_ORIGIN);
  });

  it('leaves a pre-existing project’s permissive settings permissive', () => {
    const open = {
      mailer_autoconfirm: true,
      external_email_enabled: true,
      disable_signup: false,
      site_url: 'https://app.example.com',
      uri_allow_list: 'https://app.example.com/**',
    };
    const patch = desiredAuthPatch(open);
    expect(patch).not.toHaveProperty('mailer_autoconfirm');
    expect(patch).not.toHaveProperty('external_email_enabled');
    expect(patch).not.toHaveProperty('disable_signup');
    expect(authPatchDiff(open, patch)).toEqual([]);
  });

  it('names each defence it left alone, and nothing it did not', () => {
    expect(keptAuthDefences({ disable_signup: true })).toEqual(['sign-ups stay CLOSED (disable_signup)']);
    // Nothing the API did not report: an absent field is not a defence, and not an invitation.
    expect(keptAuthDefences({})).toEqual([]);

    // A project the wizard did not create keeps every one of the three, whatever they are.
    const locked = { mailer_autoconfirm: false, external_email_enabled: false, disable_signup: true };
    expect(authPatchDiff(locked, desiredAuthPatch(locked))).toEqual(['uri_allow_list', 'site_url']);
    // Nor is an unknown one written on a guess.
    const unknown = desiredAuthPatch({});
    expect(unknown).not.toHaveProperty('mailer_autoconfirm');
    expect(unknown).not.toHaveProperty('disable_signup');
  });

  // A free-plan project refuses email-template edits with a 400. Carrying the
  // template in the settings PATCH would take `mailer_autoconfirm` down with
  // it — and without autoconfirm nobody can sign up at all.
  it('keeps the recovery template out of the settings patch', () => {
    const patch = desiredAuthPatch({}, { appUrl: 'https://app.example.com' });
    expect(patch).not.toHaveProperty('mailer_templates_recovery_content');
    expect(patch).not.toHaveProperty('mailer_subjects_recovery');
  });

  it('offers the recovery template as its own patch, and only while it differs', () => {
    const patch = desiredRecoveryPatch({});
    expect(patch?.mailer_templates_recovery_content).toContain(
      '{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery',
    );
    expect(desiredRecoveryPatch({ ...patch })).toBeUndefined();
  });

  it('reports which fields a PATCH would actually change', () => {
    const current = { mailer_autoconfirm: true, uri_allow_list: 'http://localhost:5173/**' };
    const patch = desiredAuthPatch(current, { createdProject: true });
    const changed = authPatchDiff(current, patch);
    expect(changed).not.toContain('mailer_autoconfirm');
    expect(changed).not.toContain('uri_allow_list');
    expect(changed).toContain('external_email_enabled');
  });

  it('normalises app URLs to an origin and rejects junk', () => {
    expect(normalizeAppUrl('https://app.example.com/path/')).toBe('https://app.example.com');
    expect(normalizeAppUrl('not a url')).toBeUndefined();
    expect(normalizeAppUrl(undefined)).toBeUndefined();
  });

  it('refuses a plain-HTTP origin that is not loopback', () => {
    // This value becomes a redirect target: Supabase mails recovery and
    // confirmation links to it with the token in the URL.
    expect(normalizeAppUrl('http://app.example.com')).toBeUndefined();
    expect(normalizeAppUrl('http://localhost:5173')).toBe('http://localhost:5173');
    expect(normalizeAppUrl('http://127.0.0.1:5173/')).toBe('http://127.0.0.1:5173');
  });

  it('says what an email-restricted invite is worth when confirmation is off', () => {
    /* The address on an invite reads as a second factor, and on a project the
       wizard just opened it is not one. The patch answers for the project the
       run is about to leave behind, not the one it found. */
    const open = desiredAuthPatch({ site_url: '', uri_allow_list: '' }, { createdProject: true, signup: 'open' });
    expect(inviteEmailCaveat({ uri_allow_list: '' }, open)).toContain('addressing, not proof');

    const confirming = desiredAuthPatch(
      { site_url: '', uri_allow_list: '' },
      { createdProject: true, signup: 'confirm-email' },
    );
    expect(inviteEmailCaveat({ uri_allow_list: '' }, confirming)).toBeNull();
  });

  it('says nothing about invites on a project whose confirmation setting it never read', () => {
    // A project the wizard did not create reports no such field; a guess
    // printed as a fact is worse than a line not printed.
    expect(inviteEmailCaveat({ uri_allow_list: '' }, { uri_allow_list: '' })).toBeNull();
    expect(inviteEmailCaveat({ uri_allow_list: '', mailer_autoconfirm: true }, { uri_allow_list: '' })).toContain(
      'Email confirmation is OFF',
    );
  });

  it('keeps an http app URL out of the allow list and the site URL', () => {
    const patch = desiredAuthPatch(
      { site_url: '', uri_allow_list: '' },
      { appUrl: 'http://app.example.com', createdProject: true },
    );
    expect(patch.uri_allow_list).toBe('http://localhost:5173/**');
    expect(patch.site_url).toBe('http://localhost:5173');
  });
});

describe('patchAuthConfig', () => {
  it('PATCHes the computed body', async () => {
    const { client: api, calls } = client([
      { match: '/config/auth', body: { site_url: '', uri_allow_list: '' } },
      { match: '/config/auth', body: { site_url: DEV_ORIGIN } },
    ]);
    const current = await api.getAuthConfig('abc');
    await api.patchAuthConfig('abc', desiredAuthPatch(current, { createdProject: true }));
    expect(calls[1]!.method).toBe('PATCH');
    expect(calls[1]!.body).toMatchObject({ mailer_autoconfirm: true, site_url: DEV_ORIGIN });
  });
});

describe('network failures', () => {
  it('turns an aborted request into a readable error', async () => {
    const fetchImpl = vi.fn(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'TimeoutError';
      throw err;
    }) as unknown as typeof fetch;
    const api = createManagementClient({ token: 'sbp_x', fetch: fetchImpl });
    const err = await api.listOrganizations().catch((e: unknown) => e);
    expect((err as SupabaseManagementError).message).toMatch(/did not answer within 30 s/);
  });
});
