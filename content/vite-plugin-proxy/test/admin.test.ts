import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createServer as createViteServer, type Plugin, type ViteDevServer } from 'vite';
import { WebSocket } from 'ws';
import { chatfuelProxy } from '../src/index';
import {
  ADMIN_COOKIE,
  ADMIN_MIN_PASSWORD_LENGTH,
  MAX_WAIT_MS,
  SHARED_MAX_WAIT_MS,
  createAdminThrottle,
  parseCookies,
  passwordMatches,
  signAdminSession,
  throttleKey,
  verifyAdminSession,
} from '../src/adminSession';
import { createHmac } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { startMockUpstream, type MockUpstream } from './mock-upstream';
import { fakeJwt, startMockSupabase, UNASSIGNED, type MockSupabase } from './mock-supabase';

const TOKEN = 'a1b2'.repeat(16);
const PASSWORD = 'a-long-enough-admin-password';
/** Any deployment salt will do here; what matters is that it is the same one twice. */
const SALT = 'test-deployment-salt';
const HOME = 'ws-1';

async function bootVite(plugins: Plugin[]) {
  const vite = await createViteServer({
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { host: '127.0.0.1', port: 0 },
    plugins,
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  return { vite, port };
}

async function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

let upstream: MockUpstream;
let vite: ViteDevServer;
let base: string;

/** Every admin call carries the header; the cookie is passed where a session is wanted. */
const adminFetch = (origin: string, path: string, init: RequestInit = {}, cookie?: string): Promise<Response> =>
  fetch(`${origin}/chatfuel/admin${path}`, {
    ...init,
    headers: {
      'x-cf-admin': '1',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });

/** The cookie a fresh unlock hands back, for the server at this origin. */
const adminUnlock = async (origin: string, password = PASSWORD): Promise<string> => {
  const res = await adminFetch(origin, '/session', { method: 'POST', body: JSON.stringify({ password }) });
  return res.headers.getSetCookie().join('; ');
};

const call = (path: string, init: RequestInit = {}, cookie?: string): Promise<Response> =>
  adminFetch(base, path, init, cookie);

const unlock = (password = PASSWORD): Promise<string> => adminUnlock(base, password);

beforeAll(async () => {
  upstream = await startMockUpstream();
  const booted = await bootVite([
    chatfuelProxy({ upstream: upstream.url, token: TOKEN, adminPassword: PASSWORD, workspaceId: HOME, auth: false }),
  ]);
  vite = booted.vite;
  base = `http://127.0.0.1:${booted.port}`;
});

afterAll(async () => {
  await vite?.close();
  await upstream?.close();
});

beforeEach(() => {
  upstream.setWorkspaces([
    { id: HOME, bots: ['b1', 'b2'] },
    { id: 'ws-2', bots: ['solo'] },
  ]);
});

/* -------------------------------------------------------------------------- */
/* The door                                                                   */
/* -------------------------------------------------------------------------- */

describe('the session', () => {
  it('refuses every route without one', async () => {
    for (const path of ['/overview', '/health', '/bots', '/tenants', '/grants']) {
      const res = await call(path);
      expect(res.status).toBe(401);
      const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
      expect(body.errors[0]?.extensions.code).toBe('AdminSessionRequired');
    }
  });

  it('refuses a wrong password and takes the right one', async () => {
    const wrong = await call('/session', { method: 'POST', body: JSON.stringify({ password: 'nope' }) });
    expect(wrong.status).toBe(401);
    expect(wrong.headers.getSetCookie()).toHaveLength(0);

    const right = await call('/session', { method: 'POST', body: JSON.stringify({ password: PASSWORD }) });
    expect(right.status).toBe(200);
    const cookies = right.headers.getSetCookie();
    /* One cookie and no other: nothing readable is set beside it, so nothing in
       the browser can be mistaken later for a credential. */
    expect(cookies).toHaveLength(1);
    const session = cookies[0]!;
    expect(session).toContain(`${ADMIN_COOKIE}=`);
    expect(session).toContain('HttpOnly');
    expect(session).toContain('SameSite=Strict');
    expect(session).toContain('Path=/;');
  });

  it('lets a cookie it issued through, and nothing else', async () => {
    const cookie = await unlock();
    expect((await call('/session', {}, cookie)).status).toBe(200);

    /* A cookie signed with another password: the shape is right and the
       signature is not. */
    const forged = `${ADMIN_COOKIE}=${signAdminSession('another-long-admin-password', SALT, Date.now(), Date.now() + 60_000)}`;
    expect((await call('/session', {}, forged)).status).toBe(401);
    expect((await call('/session', {}, `${ADMIN_COOKIE}=garbage`)).status).toBe(401);
  });

  it('insists on the header as well as the cookie', async () => {
    const cookie = await unlock();
    const bare = await fetch(`${base}/chatfuel/admin/overview`, { headers: { cookie } });
    expect(bare.status).toBe(401);
  });

  /* The sign-out moves a watermark every open session is measured against, so
     an anonymous caller allowed to send it signs out every admin there is. */
  it('refuses a sign-out from a caller without a session', async () => {
    const cookie = await unlock();
    const anonymous = await call('/session', { method: 'DELETE' });
    expect(anonymous.status).toBe(401);
    expect((await call('/overview', {}, cookie)).status).toBe(200);
  });

  it('clears the cookie on the way out', async () => {
    const cookie = await unlock();
    const res = await call('/session', { method: 'DELETE' }, cookie);
    expect(res.status).toBe(200);
    for (const one of res.headers.getSetCookie()) expect(one).toContain('Max-Age=0');
  });

  /* The unlock route is reached before any credential is checked, so whatever
     body it reads is read on an anonymous caller's say-so. */
  it('refuses an oversized unlock body before it reads it, right password and all', async () => {
    const huge = JSON.stringify({ password: PASSWORD, pad: 'x'.repeat(80 * 1024) });
    const res = await call('/session', { method: 'POST', body: huge });
    expect(res.status).toBe(413);
    const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('AdminBodyTooLarge');
    /* The password inside it was the right one and it still bought nothing. */
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it('refuses an oversized body on a route behind the session too', async () => {
    const cookie = await unlock();
    const huge = JSON.stringify({ name: 'x'.repeat(80 * 1024), workspaceId: HOME });
    const res = await call('/bots', { method: 'POST', body: huge }, cookie);
    expect(res.status).toBe(413);
    const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('AdminBodyTooLarge');
  });

  it('still takes a body of the size the panel actually sends', async () => {
    const cookie = await unlock();
    const ok = await call('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Still fine' }) }, cookie);
    expect(ok.status).toBe(200);
  });
});

/* -------------------------------------------------------------------------- */
/* The account                                                                */
/* -------------------------------------------------------------------------- */

describe('the account', () => {
  it('answers with every workspace and which one this deployment is about', async () => {
    const cookie = await unlock();
    const res = await call('/overview', {}, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      account: { id: string };
      homeWorkspaceId: string;
      workspaces: { id: string; bots: unknown[] }[];
      capabilities: { access: boolean };
    };
    expect(body.account.id).toBe('account');
    expect(body.homeWorkspaceId).toBe(HOME);
    expect(body.workspaces.map((w) => w.id)).toEqual([HOME, 'ws-2']);
    /* No database in this deployment, so the panel is told not to offer the
       access surface rather than left to guess from the browser. */
    expect(body.capabilities.access).toBe(false);
  });

  it('reads one bot without ever asking for its api token', async () => {
    const cookie = await unlock();
    const res = await call('/bots/b1', {}, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; role: { roleTypeV2: string } };
    expect(body.id).toBe('b1');
    expect(body.role.roleTypeV2).toBe('Admin');
    const asked = upstream.httpRequests.map((one) => one.body).join('');
    expect(asked).not.toContain('apiToken');
  });
});

/* -------------------------------------------------------------------------- */
/* Bots                                                                       */
/* -------------------------------------------------------------------------- */

describe('creating a bot', () => {
  it('creates it in the workspace it was told to, and forgets the fence', async () => {
    const cookie = await unlock();
    /* Warm the fence so the clearing below is visible as a fresh ask. */
    await fetch(`${base}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query Q { bot(id: "b1") { id } }', variables: { botID: 'b1' } }),
    });
    const before = upstream.fenceRequests;

    const created = await call(
      '/bots',
      { method: 'POST', body: JSON.stringify({ workspaceId: 'ws-2', name: 'New' }) },
      cookie,
    );
    expect(created.status).toBe(200);
    expect(upstream.lastCreateVariables?.workspaceID).toBe('ws-2');

    await fetch(`${base}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query Q { bot(id: "b1") { id } }', variables: { botID: 'b1' } }),
    });
    /* Without the clear, the 60-second snapshot would answer and the bot just
       created would be refused for the rest of it. */
    expect(upstream.fenceRequests).toBeGreaterThan(before);
  });

  it('refuses a nameless bot and one with no workspace', async () => {
    const cookie = await unlock();
    const noName = await call('/bots', { method: 'POST', body: JSON.stringify({ workspaceId: 'ws-2' }) }, cookie);
    expect(noName.status).toBe(422);
    const noWorkspace = await call('/bots', { method: 'POST', body: JSON.stringify({ name: 'x' }) }, cookie);
    expect(noWorkspace.status).toBe(422);
  });

  it('passes a full workspace on as the operator’s problem, not a retry', async () => {
    const cookie = await unlock();
    upstream.failCreateWith('TooManyBotsInWorkspace');
    const res = await call(
      '/bots',
      { method: 'POST', body: JSON.stringify({ workspaceId: 'ws-2', name: 'x' }) },
      cookie,
    );
    upstream.failCreateWith(null);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('WorkspaceFull');
  });
});

describe('deleting a bot', () => {
  it('never empties the workspace this deployment is built on', async () => {
    const cookie = await unlock();
    upstream.setWorkspaces([
      { id: HOME, bots: ['b1'] },
      { id: 'ws-2', bots: ['solo'] },
    ]);
    const res = await call('/bots/b1', { method: 'DELETE' }, cookie);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('LastBotInWorkspace');

    /* And not with force either — the refusal is the whole point. */
    const forced = await call('/bots/b1?force=1', { method: 'DELETE' }, cookie);
    expect(forced.status).toBe(409);
  });

  it('asks twice before taking another workspace down with its last bot', async () => {
    const cookie = await unlock();
    const first = await call('/bots/solo', { method: 'DELETE' }, cookie);
    expect(first.status).toBe(409);
    const body = (await first.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('WorkspaceGoesWithIt');

    const second = await call('/bots/solo?force=1', { method: 'DELETE' }, cookie);
    expect(second.status).toBe(200);
    const answer = (await second.json()) as { workspaceDeleted: boolean };
    expect(answer.workspaceDeleted).toBe(true);
  });

  it('deletes an ordinary bot without asking anything', async () => {
    const cookie = await unlock();
    const res = await call('/bots/b2', { method: 'DELETE' }, cookie);
    expect(res.status).toBe(200);
  });

  it('treats a bot Chatfuel says is not ours as one it has already deleted', async () => {
    /* Asked about a bot it has already deleted, Chatfuel answers
       NotEnoughPermissions. Reading that as a failure leaves a delete that can
       never finish. */
    const cookie = await unlock();
    upstream.failDeleteWith('NotEnoughPermissions');
    const res = await call('/bots/b2', { method: 'DELETE' }, cookie);
    upstream.failDeleteWith(null);
    expect(res.status).toBe(200);
  });

  it('refuses when Chatfuel cannot say which workspace the bot is in', async () => {
    const cookie = await unlock();
    upstream.setWorkspaces(null);
    const res = await call('/bots/b2', { method: 'DELETE' }, cookie);
    expect(res.status).toBe(503);
  });

  it('refuses a bot id that is not one', async () => {
    const cookie = await unlock();
    expect((await call('/bots/..%2Fsecret', { method: 'DELETE' }, cookie)).status).toBe(404);
  });
});

describe('renaming a bot', () => {
  it('renames it, and reports a Chatfuel refusal rather than swallowing it', async () => {
    const cookie = await unlock();
    const ok = await call('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Renamed' }) }, cookie);
    expect(ok.status).toBe(200);
    expect(upstream.botsRenamed).toBeGreaterThan(0);

    upstream.failRename(true);
    const refused = await call('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Again' }) }, cookie);
    upstream.failRename(false);
    expect(refused.status).toBe(502);
  });
});

/**
 * Rename with a database behind it.
 *
 * The suite above runs without one, so the half of this route that can be told
 * "no" was never exercised. The database is asked FIRST here, and its three
 * answers — a refusal, an outage, and "no such row" — used to arrive as one
 * null: a name the deployment had just rejected was renamed in Chatfuel
 * anyway, permanently, with `cf_bots.name` left behind and no way back.
 */
describe('renaming a bot the database has an opinion about', () => {
  let supabase: MockSupabase;
  let dbVite: ViteDevServer;
  let dbBase: string;

  const dbCall = (path: string, init: RequestInit, cookie: string): Promise<Response> =>
    adminFetch(dbBase, path, init, cookie);

  const dbUnlock = (): Promise<string> => adminUnlock(dbBase);

  beforeAll(async () => {
    supabase = await startMockSupabase();
    const booted = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        adminPassword: PASSWORD,
        workspaceId: HOME,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
      }),
    ]);
    dbVite = booted.vite;
    dbBase = `http://127.0.0.1:${booted.port}`;
  });

  afterAll(async () => {
    await dbVite?.close();
    await supabase?.close();
  });

  beforeEach(() => {
    supabase.tenantBots.set(HOME, [{ id: 'slot-1', botId: 'b1', name: 'First' }]);
  });

  it('passes the refusal on, and leaves Chatfuel alone', async () => {
    const cookie = await dbUnlock();
    const before = upstream.botsRenamed;

    const res = await dbCall('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'x'.repeat(81) }) }, cookie);

    expect(res.status).toBe(422);
    expect(await res.text()).toContain('That name is too long');
    expect(upstream.botsRenamed).toBe(before);
    expect(supabase.tenantBots.get(HOME)?.[0].name).toBe('First');
  });

  it('refuses an empty name before either side is touched', async () => {
    const cookie = await dbUnlock();
    const before = upstream.botsRenamed;

    const res = await dbCall('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: '   ' }) }, cookie);

    expect(res.status).toBe(422);
    expect(upstream.botsRenamed).toBe(before);
  });

  it('renames both sides when the database agrees', async () => {
    const cookie = await dbUnlock();

    const res = await dbCall('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Second' }) }, cookie);

    expect(res.status).toBe(200);
    expect(supabase.tenantBots.get(HOME)?.[0].name).toBe('Second');
  });

  it('puts the old name back when Chatfuel then refuses', async () => {
    const cookie = await dbUnlock();
    upstream.failRename(true);

    const res = await dbCall('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Third' }) }, cookie);
    upstream.failRename(false);

    expect(res.status).toBe(502);
    expect(supabase.tenantBots.get(HOME)?.[0].name).toBe('First');
  });

  it('renames a bot this deployment has no row for — 200 with a null row is not a refusal', async () => {
    const cookie = await dbUnlock();
    const before = upstream.botsRenamed;

    const res = await dbCall('/bots/b2', { method: 'PATCH', body: JSON.stringify({ name: 'Unknown here' }) }, cookie);

    expect(res.status).toBe(200);
    expect(upstream.botsRenamed).toBe(before + 1);
  });

  it('answers 503, not 422, when the database is not there to say anything', async () => {
    const cookie = await dbUnlock();
    const before = upstream.botsRenamed;
    await supabase.close();

    const res = await dbCall('/bots/b1', { method: 'PATCH', body: JSON.stringify({ name: 'Fourth' }) }, cookie);

    expect(res.status).toBe(503);
    expect(upstream.botsRenamed).toBe(before);
  });
});

/**
 * /tenants and /grants — the two routes whose cross-workspace rule lives
 * nowhere but in SQL.
 *
 * Every other admin route can be reasoned about from this file. These two hand
 * the whole question to the database: the panel calls them with the service
 * key, which is above row-level security, so the only thing standing between a
 * grant and somebody else's workspace is the membership check inside
 * `cf_admin_grant_bot`. What is pinned here is that the proxy passes that
 * refusal through instead of turning it into a success — an edit to the
 * migration that dropped the check would otherwise reach production green.
 *
 * The mock answers these three RPCs with the migration's own rules; the rules
 * themselves are tested against a real Postgres.
 */
describe('the workspaces and who reaches which bot', () => {
  let supabase: MockSupabase;
  let dbVite: ViteDevServer;
  let dbBase: string;

  const HERE = 'ws-here';
  const THERE = 'ws-there';
  const INSIDER = '11111111-1111-1111-1111-111111111111';
  const OUTSIDER = '22222222-2222-2222-2222-222222222222';

  const dbCall = (path: string, init: RequestInit, cookie: string): Promise<Response> =>
    adminFetch(dbBase, path, init, cookie);

  const dbUnlock = (): Promise<string> => adminUnlock(dbBase);

  const codeOf = async (res: Response): Promise<string | undefined> => {
    const body = (await res.json()) as { errors?: { extensions?: { code?: string } }[] };
    return body.errors?.[0]?.extensions?.code;
  };

  beforeAll(async () => {
    supabase = await startMockSupabase();
    const booted = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        adminPassword: PASSWORD,
        workspaceId: HOME,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
      }),
    ]);
    dbVite = booted.vite;
    dbBase = `http://127.0.0.1:${booted.port}`;
  });

  afterAll(async () => {
    await dbVite?.close();
    await supabase?.close();
  });

  beforeEach(() => {
    supabase.tenantBots.set(HERE, [{ id: 'slot-here', botId: 'b1', name: 'Ours' }]);
    supabase.tenantBots.set(THERE, [{ id: 'slot-there', botId: 'solo', name: 'Theirs' }]);
    supabase.tenantMembers.set(HERE, [{ userId: INSIDER, role: 'owner', email: 'here@example.com' }]);
    supabase.tenantMembers.set(THERE, [{ userId: OUTSIDER, role: 'owner', email: 'there@example.com' }]);
    supabase.tenantBots.delete(UNASSIGNED);
    supabase.botGrants.clear();
  });

  it('lists the workspaces with their bots and who holds a grant on each', async () => {
    const cookie = await dbUnlock();
    supabase.botGrants.set('slot-here', new Set([INSIDER]));

    const res = await dbCall('/tenants', {}, cookie);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenants: Array<{ id: string; bots: Array<{ granted: string[] }> }> };
    expect(body.tenants.map((t) => t.id)).toEqual([HERE, THERE]);
    expect(body.tenants[0]?.bots[0]?.granted).toEqual([INSIDER]);
  });

  it('answers a method neither route has with the ones it does', async () => {
    const cookie = await dbUnlock();

    const tenants = await dbCall('/tenants', { method: 'POST', body: '{}' }, cookie);
    expect(tenants.status).toBe(405);
    expect(tenants.headers.get('allow')).toBe('GET');

    const grants = await dbCall('/grants', {}, cookie);
    expect(grants.status).toBe(405);
    expect(grants.headers.get('allow')).toBe('POST, DELETE');
  });

  it('hands a bot to somebody in its own workspace', async () => {
    const cookie = await dbUnlock();

    const res = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b1', userId: INSIDER }) },
      cookie,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ botId: 'b1', userId: INSIDER, granted: true });
    expect([...(supabase.botGrants.get('slot-here') ?? [])]).toEqual([INSIDER]);
  });

  /*
   * A grant taken away used to hold for the next request and no longer: an open
   * subscription had already been admitted, and kept streaming that bot's live
   * data under the master token for as long as the socket stayed up.
   */
  it('closes the live sockets of a session whose grant was just taken away', async () => {
    const cookie = await dbUnlock();
    const jwt = fakeJwt({ sub: INSIDER, exp: Math.floor(Date.now() / 1000) + 3600 });
    supabase.answers.set(jwt, { tenantId: HERE, botId: 'b1', role: 'owner' });
    supabase.botGrants.set('slot-here', new Set([INSIDER]));

    const ws = new WebSocket(`${dbBase.replace('http://', 'ws://')}/chatfuel/graphql`, 'graphql-transport-ws');
    ws.on('error', () => undefined);
    const frames: Array<{ type?: string }> = [];
    ws.on('message', (data) => frames.push(JSON.parse(data.toString()) as { type?: string }));
    const closed = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
    });
    try {
      await new Promise<void>((resolve) => ws.on('open', resolve));
      ws.send(JSON.stringify({ type: 'connection_init', payload: { authToken: `Bearer ${jwt}` } }));
      await waitFor(() => frames.some((frame) => frame.type === 'connection_ack'));

      const res = await dbCall(`/grants?botId=b1&userId=${INSIDER}`, { method: 'DELETE' }, cookie);
      expect(res.status).toBe(200);

      // 4401 is the client's "do not retry with this session" — the same close
      // the gate answers a socket with no session at all.
      expect(await closed).toEqual({ code: 4401, reason: 'Unauthorized' });
    } finally {
      ws.close();
    }
  });

  /*
   * `new WebSocket()` is not bound by the same-origin policy and the frames come
   * back readable, so the relay is the one place a cross-site page could have
   * driven the master token with nothing to stop it.
   */
  it('refuses the upgrade for an origin this deployment does not serve', async () => {
    const before = upstream.wsConnections;
    const ws = new WebSocket(`${dbBase.replace('http://', 'ws://')}/chatfuel/graphql`, 'graphql-transport-ws', {
      headers: { origin: 'https://evil.example.net' },
    });
    const failed = new Promise<Error>((resolve) => ws.on('error', resolve));
    expect((await failed).message).toContain('403');
    expect(upstream.wsConnections).toBe(before);
  });

  it('refuses to hand a bot to somebody from another workspace, and stores nothing', async () => {
    const cookie = await dbUnlock();

    const res = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b1', userId: OUTSIDER }) },
      cookie,
    );

    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('MemberNotFound');
    expect(supabase.botGrants.get('slot-here')?.has(OUTSIDER) ?? false).toBe(false);
  });

  /*
   * "Give it to: nobody yet" is an option the create form offers. It used to
   * mean no row at all: the bot appeared in Chatfuel and in no table here, so
   * no grant could ever name it. The reservation happens either way now, and
   * the first grant is what settles the workspace.
   */
  it('reserves a row for a bot given to nobody yet, and the first grant settles the workspace', async () => {
    const cookie = await dbUnlock();

    const created = await dbCall(
      '/bots',
      { method: 'POST', body: JSON.stringify({ workspaceId: 'ws-2', name: 'Unclaimed' }) },
      cookie,
    );
    expect(created.status).toBe(200);
    const botId = ((await created.json()) as { id: string }).id;
    const reserve = supabase.calls.find((c) => c.path === '/rest/v1/rpc/cf_admin_new_bot');
    expect((reserve?.body as { p_tenant_id?: unknown }).p_tenant_id).toBeNull();
    expect(supabase.tenantBots.get(UNASSIGNED)?.map((row) => row.botId)).toEqual([botId]);

    const granted = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId, userId: INSIDER }) },
      cookie,
    );

    expect(granted.status).toBe(200);
    expect(supabase.tenantBots.get(UNASSIGNED)).toEqual([]);
    expect(supabase.tenantBots.get(HERE)?.map((row) => row.botId)).toContain(botId);
  });

  it('refuses to pick between the two workspaces a person stands in', async () => {
    const cookie = await dbUnlock();
    supabase.tenantMembers.set(THERE, [
      { userId: OUTSIDER, role: 'owner', email: 'there@example.com' },
      { userId: INSIDER, role: 'admin', email: 'here@example.com' },
    ]);
    supabase.tenantBots.set(UNASSIGNED, [{ id: 'slot-nobody', botId: 'b-nobody', name: 'Unclaimed' }]);

    const res = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b-nobody', userId: INSIDER }) },
      cookie,
    );

    expect(res.status).toBe(409);
    expect(await codeOf(res)).toBe('BotWorkspaceAmbiguous');
    expect(supabase.tenantBots.get(UNASSIGNED)?.map((row) => row.botId)).toEqual(['b-nobody']);
  });

  /* The panel's own path out of the workspace-less bucket: /tenants lists the
     bot, and the grant carries the workspace of the row it was started from —
     so the two the person stands in stop being a question. */
  it('lists a bot no workspace has claimed, and grants it into the one the caller names', async () => {
    const cookie = await dbUnlock();
    supabase.tenantMembers.set(THERE, [
      { userId: OUTSIDER, role: 'owner', email: 'there@example.com' },
      { userId: INSIDER, role: 'admin', email: 'here@example.com' },
    ]);
    supabase.tenantBots.set(UNASSIGNED, [{ id: 'slot-nobody', botId: 'b-nobody', name: 'Unclaimed' }]);

    const listed = await dbCall('/tenants', {}, cookie);
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { unassigned: Array<{ botId: string; name: string }> };
    expect(body.unassigned.map((bot) => bot.botId)).toEqual(['b-nobody']);

    const granted = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b-nobody', userId: INSIDER, tenantId: THERE }) },
      cookie,
    );

    expect(granted.status).toBe(200);
    expect(supabase.tenantBots.get(UNASSIGNED)).toEqual([]);
    expect(supabase.tenantBots.get(THERE)?.map((row) => row.botId)).toContain('b-nobody');
  });

  /* Naming the workspace is a convenience for a person who stands in several,
     not a way into one they stand in none of — and the refusal has to come
     before the bot moves, or a refused grant would still have adopted it. */
  it('refuses a named workspace the person is not in, and leaves the bot unclaimed', async () => {
    const cookie = await dbUnlock();
    supabase.tenantMembers.set(THERE, [{ userId: OUTSIDER, role: 'owner', email: 'there@example.com' }]);
    supabase.tenantBots.set(UNASSIGNED, [{ id: 'slot-nobody', botId: 'b-nobody', name: 'Unclaimed' }]);

    const res = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b-nobody', userId: INSIDER, tenantId: THERE }) },
      cookie,
    );

    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('MemberNotFound');
    expect(supabase.tenantBots.get(UNASSIGNED)?.map((row) => row.botId)).toEqual(['b-nobody']);
    expect((supabase.tenantBots.get(THERE) ?? []).map((row) => row.botId)).not.toContain('b-nobody');
  });

  it('refuses a bot no workspace here has ever heard of', async () => {
    const cookie = await dbUnlock();

    const res = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'nope', userId: INSIDER }) },
      cookie,
    );

    expect(res.status).toBe(404);
    expect(await codeOf(res)).toBe('BotNotFound');
  });

  it('takes a grant back from the query string, because a DELETE body is not carried', async () => {
    const cookie = await dbUnlock();
    supabase.botGrants.set('slot-here', new Set([INSIDER]));

    const res = await dbCall(
      `/grants?botId=b1&userId=${INSIDER}`,
      { method: 'DELETE', body: JSON.stringify({ botId: 'b1', userId: 'somebody-else' }) },
      cookie,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ botId: 'b1', userId: INSIDER, granted: false });
    expect([...(supabase.botGrants.get('slot-here') ?? [])]).toEqual([]);
  });

  it('will not act on half an instruction', async () => {
    const cookie = await dbUnlock();

    const noUser = await dbCall('/grants', { method: 'POST', body: JSON.stringify({ botId: 'b1' }) }, cookie);
    expect(noUser.status).toBe(422);
    expect(await codeOf(noUser)).toBe('AdminGrantIncomplete');

    const noBot = await dbCall('/grants?userId=x', { method: 'DELETE' }, cookie);
    expect(noBot.status).toBe(422);
    expect(await codeOf(noBot)).toBe('AdminGrantIncomplete');
  });

  it('says the database is not there rather than answering for it', async () => {
    const cookie = await dbUnlock();
    await supabase.close();

    const tenants = await dbCall('/tenants', {}, cookie);
    expect(tenants.status).toBe(503);
    expect(await codeOf(tenants)).toBe('AdminDatabaseUnavailable');

    const grants = await dbCall(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b1', userId: INSIDER }) },
      cookie,
    );
    expect(grants.status).toBe(503);
    expect(await codeOf(grants)).toBe('AdminDatabaseUnavailable');
  });
});

describe('a panel with no database behind it', () => {
  it('says so on both access routes rather than answering with an empty one', async () => {
    const cookie = await unlock();

    const tenants = await call('/tenants', {}, cookie);
    expect(tenants.status).toBe(500);

    const grants = await call(
      '/grants',
      { method: 'POST', body: JSON.stringify({ botId: 'b1', userId: 'u1' }) },
      cookie,
    );
    expect(grants.status).toBe(500);

    for (const res of [tenants, grants]) {
      const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
      expect(body.errors[0]?.extensions.code).toBe('ProxyAuthMisconfigured');
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

describe('health', () => {
  it('reports what is configured without reporting any of the values', async () => {
    const cookie = await unlock();
    const res = await call('/health', {}, cookie);
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).toContain('"tokenEnv":"CHATFUEL_TOKEN"');
    expect(raw).toContain('"accepted":true');
    /* The one assertion this endpoint exists to keep. */
    expect(raw).not.toContain(TOKEN);
    expect(raw).not.toContain(PASSWORD);
  });
});

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

describe('a deployment with no panel', () => {
  it('does not claim the routes at all', async () => {
    const bare = await startMockUpstream();
    const booted = await bootVite([chatfuelProxy({ upstream: bare.url, token: TOKEN, auth: false })]);
    const res = await fetch(`http://127.0.0.1:${booted.port}/chatfuel/admin/overview`, {
      headers: { 'x-cf-admin': '1' },
    });
    expect(res.status).toBe(404);
    await booted.vite.close();
    await bare.close();
  });

  it('answers loudly rather than quietly when the password is too short', async () => {
    const bare = await startMockUpstream();
    const booted = await bootVite([
      chatfuelProxy({ upstream: bare.url, token: TOKEN, adminPassword: 'short', auth: false }),
    ]);
    const res = await fetch(`http://127.0.0.1:${booted.port}/chatfuel/admin/session`, {
      method: 'POST',
      headers: { 'x-cf-admin': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'short' }),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { errors: { extensions: { code: string } }[] };
    expect(body.errors[0]?.extensions.code).toBe('AdminMisconfigured');
    await booted.vite.close();
    await bare.close();
  });
});

/* -------------------------------------------------------------------------- */
/* The pieces, on their own                                                   */
/* -------------------------------------------------------------------------- */

describe('the cookie', () => {
  it('verifies only what this password signed, and only until it expires', () => {
    const value = signAdminSession(PASSWORD, SALT, 500, 2_000);
    expect(verifyAdminSession(PASSWORD, SALT, value, 1_000)).toBe(true);
    expect(verifyAdminSession(PASSWORD, SALT, value, 2_001)).toBe(false);
    expect(verifyAdminSession('another-long-admin-password', SALT, value, 1_000)).toBe(false);
  });

  /**
   * The salt is per deployment, so one deployment's cookie is not another's —
   * which is the whole point of it: a table precomputed against a constant baked
   * into the source would otherwise answer for every deployment at once.
   */
  it('verifies only under the salt it was signed with', () => {
    const value = signAdminSession(PASSWORD, SALT, 500, 2_000);
    expect(verifyAdminSession(PASSWORD, 'another-deployment', value, 1_000)).toBe(false);
  });

  /**
   * Signing out has to reach the copy of the cookie somebody else kept, and the
   * only thing in the payload that can say so is when it was issued.
   */
  it('refuses a session issued at or before the revocation watermark', () => {
    const value = signAdminSession(PASSWORD, SALT, 1_000, 9_000);
    expect(verifyAdminSession(PASSWORD, SALT, value, 2_000, 999)).toBe(true);
    expect(verifyAdminSession(PASSWORD, SALT, value, 2_000, 1_000)).toBe(false);
    expect(verifyAdminSession(PASSWORD, SALT, value, 2_000, 5_000)).toBe(false);
  });

  /**
   * The cookie carries the version it was signed under, and the version moved
   * when the key stopped being the password itself. An admin holding a session
   * from before that is refused by the version — the reason they actually have
   * — rather than by a signature that only happens not to match.
   */
  it('refuses a cookie the previous version signed, and issues only the current one', () => {
    const payload = 'v1.2000';
    const legacyKey = Buffer.from(`cf-admin-v1:${PASSWORD}`, 'utf8');
    const legacy = `${payload}.${createHmac('sha256', legacyKey).update(payload).digest('hex')}`;
    expect(verifyAdminSession(PASSWORD, SALT, legacy, 1_000)).toBe(false);
    /* v2 is a well-formed cookie of the previous shape: three parts, signed
       with the same scheme. It is refused by the version, not by luck. */
    expect(verifyAdminSession(PASSWORD, SALT, 'v2.2000.abc', 1_000)).toBe(false);
    expect(signAdminSession(PASSWORD, SALT, 1_000, 2_000).startsWith('v3.')).toBe(true);
  });

  it('rejects everything that is not one, without throwing on any of it', () => {
    const junk = [undefined, '', 'v1', 'v1.2000', 'v2.2000.abc', 'v3.2000.abc', `v3.nope.nope.${'0'.repeat(64)}`];
    for (const value of junk) {
      expect(verifyAdminSession(PASSWORD, SALT, value, 1_000)).toBe(false);
    }
  });
});

describe('the password check', () => {
  it('takes the password and nothing near it', () => {
    expect(passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(passwordMatches(PASSWORD, `${PASSWORD} `)).toBe(false);
    expect(passwordMatches(PASSWORD, PASSWORD.slice(0, -1))).toBe(false);
    for (const candidate of [undefined, null, '', 42, {}]) {
      expect(passwordMatches(PASSWORD, candidate)).toBe(false);
    }
  });

  it('has a floor worth the name', () => {
    expect(ADMIN_MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(16);
  });
});

describe('the throttle', () => {
  it('forgives a typo and then makes waiting cost something', () => {
    let now = 0;
    const throttle = createAdminThrottle(() => now);
    for (let i = 0; i < 3; i += 1) {
      throttle.fail('ip');
      expect(throttle.waitMs('ip')).toBe(0);
    }
    throttle.fail('ip');
    expect(throttle.waitMs('ip')).toBe(1_000);
    throttle.fail('ip');
    expect(throttle.waitMs('ip')).toBe(2_000);
    now = 10_000;
    expect(throttle.waitMs('ip')).toBe(0);
  });

  it('forgets a caller that got it right', () => {
    const throttle = createAdminThrottle(() => 0);
    for (let i = 0; i < 5; i += 1) throttle.fail('ip');
    expect(throttle.waitMs('ip')).toBeGreaterThan(0);
    throttle.succeed('ip');
    expect(throttle.waitMs('ip')).toBe(0);
  });

  it('counts callers apart', () => {
    const throttle = createAdminThrottle(() => 0);
    for (let i = 0; i < 5; i += 1) throttle.fail('a');
    expect(throttle.waitMs('b')).toBe(0);
  });
});

describe('throttleKey', () => {
  const reqWith = (forwarded: string | undefined, remote: string | undefined) =>
    ({
      headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
      socket: { remoteAddress: remote },
    }) as unknown as IncomingMessage;

  it('ignores a forged x-forwarded-for by default, keying on the socket', () => {
    // Untrusted: a caller rotating a fake chain per request must still land in
    // the same bucket, so the header is not allowed to move the key.
    expect(throttleKey(reqWith('1.2.3.4', '198.51.100.9'), false).key).toBe('198.51.100.9');
    expect(throttleKey(reqWith('9.9.9.9', '198.51.100.9'), false).key).toBe('198.51.100.9');
  });

  it('trusts the hop the edge itself wrote — the last one, not the first', () => {
    // '1.2.3.4' is whatever the caller sent; '198.51.100.1' is what the trusted
    // edge appended. Keying on the first would give a caller a fresh bucket
    // per request under the very flag meant to make the bucket reliable.
    expect(throttleKey(reqWith('1.2.3.4, 198.51.100.1', '198.51.100.9'), true)).toEqual({
      key: '198.51.100.1',
      shared: false,
    });
    expect(throttleKey(reqWith('203.0.113.7', '198.51.100.9'), true)).toEqual({ key: '203.0.113.7', shared: false });
  });

  it('does not let a rotated chain buy a fresh bucket even when trusted', () => {
    const keys = new Set(
      ['a1, 198.51.100.1', 'b2, 198.51.100.1', 'c3, d4, 198.51.100.1'].map(
        (chain) => throttleKey(reqWith(chain, '198.51.100.9'), true).key,
      ),
    );
    expect([...keys]).toEqual(['198.51.100.1']);
  });

  it('reads repeated header lines as one chain, in arrival order', () => {
    const req = {
      headers: { 'x-forwarded-for': ['1.2.3.4', '198.51.100.1'] },
      socket: { remoteAddress: '198.51.100.9' },
    } as unknown as IncomingMessage;
    expect(throttleKey(req, true)).toEqual({ key: '198.51.100.1', shared: false });
    expect(throttleKey(req, false)).toEqual({ key: '198.51.100.9', shared: true });
  });

  it('falls back to the socket when the chain is present but empty', () => {
    expect(throttleKey(reqWith('  ,  ', '198.51.100.9'), true)).toEqual({ key: '198.51.100.9', shared: false });
  });

  it('falls back to the socket when a trusted header is absent', () => {
    expect(throttleKey(reqWith(undefined, '198.51.100.9'), true).key).toBe('198.51.100.9');
  });

  it('answers a stable placeholder when nothing identifies the caller', () => {
    expect(throttleKey(reqWith(undefined, undefined), false).key).toBe('unknown');
  });

  /**
   * An untrusted forwarded chain means there IS an edge in front and every
   * caller lands in one bucket — so the lockout is something one caller can
   * point at everybody else, and the ceiling comes down accordingly.
   */
  it('reports a bucket that is not the caller’s own', () => {
    expect(throttleKey(reqWith('1.2.3.4', '198.51.100.9'), false).shared).toBe(true);
    expect(throttleKey(reqWith(undefined, '198.51.100.9'), false).shared).toBe(false);
    expect(throttleKey(reqWith('1.2.3.4', '198.51.100.9'), true).shared).toBe(false);
  });

  it('caps a shared bucket well short of the per-caller lockout', () => {
    const throttle = createAdminThrottle(() => 0);
    for (let i = 0; i < 20; i += 1) throttle.fail('edge', SHARED_MAX_WAIT_MS);
    expect(throttle.waitMs('edge')).toBeLessThanOrEqual(SHARED_MAX_WAIT_MS);
    const mine = createAdminThrottle(() => 0);
    for (let i = 0; i < 20; i += 1) mine.fail('caller');
    expect(mine.waitMs('caller')).toBe(MAX_WAIT_MS);
  });
});

describe('cookie parsing', () => {
  it('reads a header, and answers empty for anything that is not one', () => {
    const map = parseCookies('a=1; b=two; =bad; c');
    expect(map.get('a')).toBe('1');
    expect(map.get('b')).toBe('two');
    expect(parseCookies(undefined).size).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The panel's origin                                                          */
/* -------------------------------------------------------------------------- */

describe('the panel answers its own origin only', () => {
  /* A deployment that named a second origin, or every origin. The panel reaches
     past the auth gate and the bot fence, so what ALLOWED_ORIGINS opens for the
     app it must not open for the panel — SameSite=Strict is a site boundary and
     a neighbouring subdomain is inside it. */
  let wide: ViteDevServer;
  let wideBase: string;

  beforeAll(async () => {
    const booted = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        adminPassword: PASSWORD,
        workspaceId: HOME,
        auth: false,
        allowedOrigins: '*',
      }),
    ]);
    wide = booted.vite;
    wideBase = `http://127.0.0.1:${booted.port}`;
  });

  afterAll(async () => {
    await wide?.close();
  });

  it('serves the app to the wildcard origin it was told to serve', async () => {
    const res = await fetch(`${wideBase}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://old.example.com' },
      body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://old.example.com');
  });

  it('refuses the same origin on an admin route, wildcard or not', async () => {
    const cookie = await adminUnlock(wideBase);
    expect(cookie).toContain(ADMIN_COOKIE);

    const res = await adminFetch(wideBase, '/overview', { headers: { origin: 'https://old.example.com' } }, cookie);
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBe(null);
    const body = (await res.json()) as { errors: { message: string }[] };
    expect(body.errors[0]?.message).toContain('origin this deployment does not serve');
  });

  it('still serves the panel to the app itself', async () => {
    const cookie = await adminUnlock(wideBase);
    const res = await adminFetch(wideBase, '/overview', { headers: { origin: wideBase } }, cookie);
    expect(res.status).toBe(200);
  });
});

/* -------------------------------------------------------------------------- */
/* The door, from more than one instance                                      */
/* -------------------------------------------------------------------------- */

/**
 * The throttle in `adminSession.ts` counts in one process's memory, which is
 * the whole of it on a server that stays up and none of it on a host that
 * answers each request from a fresh function. Two proxies over one database
 * stand in for that host: what one of them learns about a caller, the other
 * must already know.
 */
describe('the admin door across instances', () => {
  let supabase: MockSupabase;
  let firstVite: ViteDevServer;
  let secondVite: ViteDevServer;
  let firstBase: string;
  let secondBase: string;

  /* `trustForwardedFor` so each test can be its own caller: the socket address
     is 127.0.0.1 for all of them, and the memory counter of a long-lived
     process is not cleared between tests any more than it would be in life. */
  const guess = (origin: string, password: string, from: string): Promise<Response> =>
    adminFetch(origin, '/session', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'x-forwarded-for': from },
    });

  beforeAll(async () => {
    supabase = await startMockSupabase();
    const auth = { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey };
    const options = {
      upstream: upstream.url,
      token: TOKEN,
      adminPassword: PASSWORD,
      workspaceId: HOME,
      trustForwardedFor: true,
      auth,
    };
    const one = await bootVite([chatfuelProxy(options)]);
    const two = await bootVite([chatfuelProxy(options)]);
    firstVite = one.vite;
    secondVite = two.vite;
    firstBase = `http://127.0.0.1:${one.port}`;
    secondBase = `http://127.0.0.1:${two.port}`;
  });

  afterAll(async () => {
    await firstVite?.close();
    await secondVite?.close();
    await supabase?.close();
  });

  beforeEach(() => {
    supabase.adminAttempts.clear();
  });

  it('makes the wait one instance imposed hold on the next', async () => {
    for (let i = 0; i < 4; i += 1) {
      expect((await guess(firstBase, 'not-the-admin-password', '203.0.113.5')).status).toBe(401);
    }

    /* The right password, at an instance that has never heard of this caller.
       Nothing in its memory says to wait — the shared counter does. */
    const res = await guess(secondBase, PASSWORD, '203.0.113.5');
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('lets the first few through, so a typo still costs nothing anywhere', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await guess(secondBase, 'not-the-admin-password', '203.0.113.6')).status).toBe(401);
    }

    const res = await guess(firstBase, PASSWORD, '203.0.113.6');
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().join('; ')).toContain(ADMIN_COOKIE);
    /* A right answer forgets the history, and forgets it for every instance. */
    expect(supabase.adminAttempts.size).toBe(0);
  });

  it('stops asking the database once memory alone already refuses', async () => {
    const waitCalls = () => supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_admin_attempt_wait').length;

    for (let i = 0; i < 4; i += 1) {
      expect((await guess(firstBase, 'not-the-admin-password', '203.0.113.7')).status).toBe(401);
    }
    const afterFreeGuesses = waitCalls();

    /* Memory on this instance now holds a wait for this caller on its own —
       the request must not spend a `cf_admin_attempt_wait` RPC to learn what
       it already knows. */
    const res = await guess(firstBase, 'not-the-admin-password', '203.0.113.7');
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(waitCalls()).toBe(afterFreeGuesses);
  });
});
