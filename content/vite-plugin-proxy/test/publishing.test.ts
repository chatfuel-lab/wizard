import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createServer as createViteServer, type Plugin, type ViteDevServer } from 'vite';
import { chatfuelProxy } from '../src/index';
import { publishOperation, parseMultipartFile } from '../src/core';
import { startMockUpstream, type MockUpstream } from './mock-upstream';
import { fakeJwt, startMockSupabase, type MockSupabase } from './mock-supabase';

/**
 * The Instagram publish queue: the routes, the fences around them, and the
 * callback the deployment's own database knocks on.
 *
 * The shape being tested is not "does a post get saved" — it is the four
 * properties the rest of the system leans on:
 *
 *   1. no service key, no routes, and the host's 404 is the app's signal to
 *      keep its queue in the browser instead;
 *   2. a signed-in caller reaches only their own bot's posts and media;
 *   3. the callback is a shared secret and nothing else, so a wrong one is a
 *      401 whoever sent it;
 *   4. the outcome is written back by the route, and therefore lands even when
 *      whatever asked for the publish has long since stopped listening.
 */

const TOKEN = 'a1b2'.repeat(16);
const SECRET = 'queue-secret-for-tests';
const SECRET_HASH = createHash('sha256').update(SECRET, 'utf8').digest('base64');
const BYPASS = 'bypass-token-for-tests';
const OWNER_BOT = 'bot-owner';
const OTHER_BOT = 'bot-other';

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

/** A post id is a uuid on both sides, and the routes refuse anything that is not. */
const uid = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;

async function bootVite(plugins: Plugin[], server: Record<string, unknown> = {}) {
  const vite = await createViteServer({
    configFile: false,
    envFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { host: '127.0.0.1', port: 0, ...server },
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
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/**
 * node's Buffer IS a Uint8Array, but it may sit on a SharedArrayBuffer as far as
 * the type system knows, and `fetch` will not take one of those. Copying into a
 * plainly-backed array is the cheap way to say it is not.
 */
const asBody = (buffer: Buffer): Uint8Array<ArrayBuffer> => {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy;
};

/** A multipart/form-data body with one file part, the way a browser sends one. */
function multipart(
  field: string,
  filename: string,
  contentType: string,
  bytes: Buffer,
): { body: Buffer; contentType: string } {
  const boundary = '----cftest0123456789';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}

let upstream: MockUpstream;
let supabase: MockSupabase;
let vite: ViteDevServer;
let base: string;
let ownerJwt: string;
let strangerJwt: string;
let plainMemberJwt: string;

beforeAll(async () => {
  upstream = await startMockUpstream();
  supabase = await startMockSupabase();
  ownerJwt = fakeJwt({ sub: 'owner', exp: inOneHour(), email: 'owner@example.com' });
  strangerJwt = fakeJwt({ sub: 'stranger', exp: inOneHour(), email: 'stranger@example.com' });
  plainMemberJwt = fakeJwt({ sub: 'plain', exp: inOneHour(), email: 'plain@example.com' });
  supabase.answers.set(ownerJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'owner', name: 'Owner' });
  supabase.answers.set(strangerJwt, { tenantId: 't-other', botId: OTHER_BOT, role: 'owner', name: 'Other' });
  supabase.answers.set(plainMemberJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'member', name: 'Owner' });

  const booted = await bootVite([
    chatfuelProxy({
      upstream: upstream.url,
      token: TOKEN,
      workspaceId: 'ws-1',
      publishingSecret: SECRET,
      bypassSecret: BYPASS,
      // Small enough to reach with a test file, and short enough that a seeded
      // object can be older than it.
      mediaQuotaMb: 1,
      mediaTtlDays: 1,
      auth: {
        supabaseUrl: supabase.url,
        anonKey: supabase.anonKey,
        serviceRoleKey: supabase.serviceKey,
      },
    }),
  ]);
  vite = booted.vite;
  base = `http://127.0.0.1:${booted.port}`;
});

afterAll(async () => {
  await vite?.close();
  await supabase?.close();
  await upstream?.close();
});

beforeEach(() => {
  supabase.igPosts.clear();
  supabase.storage.clear();
  supabase.igConfig.publishUrl = null;
  supabase.igConfig.bypassSecret = null;
  supabase.igConfig.callbackSecretHash = null;
  supabase.failStorage(false);
  upstream.respondAfter(0);
  upstream.respondWith(200, { data: { ok: true } });
});

const asOwner = (path: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${ownerJwt}`, ...(init.headers as Record<string, string> | undefined) },
  });

describe('whether the routes are there at all', () => {
  /**
   * The 404 is the contract. A deployment scaffolded without the database half
   * has no queue routes, the host answers 404, and the app reads that as "keep
   * the posts in this browser and offer no schedule control". Anything else —
   * a 500, a hang — is a fault and must NOT be mistaken for that.
   */
  it('are absent, and answer 404, without a service key', async () => {
    const { vite: keyless, port } = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey },
      }),
    ]);
    try {
      for (const path of ['/chatfuel/publishing/config', '/chatfuel/publishing/posts?botID=bot-owner']) {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          headers: { authorization: `Bearer ${ownerJwt}` },
        });
        expect(res.status).toBe(404);
      }
    } finally {
      await keyless.close();
    }
  });

  it('need a session, like everything else behind the gate', async () => {
    const res = await fetch(`${base}/chatfuel/publishing/config`);
    expect(res.status).toBe(401);
  });

  it('say scheduling is off until somebody has registered where this deployment answers', async () => {
    const res = await asOwner('/chatfuel/publishing/config');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ scheduling: false });
  });
});

describe('registering the callback', () => {
  /**
   * What this row decides is where the database posts a credential every
   * minute, forever — the callback key and this deployment's protection
   * bypass — and there is ONE of it for the whole deployment. So the address
   * comes from configuration and the caller has to be whoever configures the
   * deployment, not whoever holds an account inside it.
   *
   * `role = 'owner'` used to be the check here and it guarded nothing:
   * cf_claim_workspace makes every sign-up the owner of the workspace it opens
   * for them, so the set it named was "anybody who registered an account".
   */
  const ADMIN_PASSWORD = 'admin-password-for-tests';
  const PUBLIC_URL = 'https://posts.example.com';
  const REGISTERED = `${PUBLIC_URL}/chatfuel/publishing/publish-due`;

  /** A deployment configured the way registering now requires: a panel, and a name of its own. */
  async function bootRegistrar(overrides: Record<string, unknown> = {}) {
    const { vite: server, port } = await bootVite(
      [
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          publishingSecret: SECRET,
          bypassSecret: BYPASS,
          adminPassword: ADMIN_PASSWORD,
          publicUrl: PUBLIC_URL,
          auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
          ...overrides,
        }),
        // The dev server turns away a Host it does not serve before any of this
        // runs. A server run directly does not, which is the case the Host test
        // below is about — so that protection is stood down here on purpose.
      ],
      { allowedHosts: true },
    );
    const at = `http://127.0.0.1:${port}`;
    const session = await fetch(`${at}/chatfuel/admin/session`, {
      method: 'POST',
      headers: { 'x-cf-admin': '1', 'content-type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });
    const cookie = session.headers.getSetCookie().join('; ');
    /** Registering as the admin. `init.headers` wins, so a test can take the session away. */
    const register = (init: RequestInit = {}): Promise<Response> =>
      fetch(`${at}/chatfuel/publishing/register`, {
        method: 'POST',
        ...init,
        headers: {
          'x-cf-admin': '1',
          cookie,
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    return { server, at, port, cookie, register };
  }

  /**
   * The one request that has to be made with node's own client: `Host` is a
   * forbidden header to fetch, and this test is precisely about a caller who
   * writes it anyway.
   */
  function postWithHost(port: number, path: string, host: string, headers: Record<string, string>): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        { host: '127.0.0.1', port, path, method: 'POST', headers: { ...headers, host } },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        },
      );
      req.on('error', reject);
      req.end();
    });
  }

  it('records PUBLIC_URL, the bypass, and the HASH of the secret', async () => {
    const { server, register } = await bootRegistrar();
    try {
      const res = await register();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { scheduling: boolean; publishUrl: string };
      expect(body.scheduling).toBe(true);
      expect(body.publishUrl).toBe(REGISTERED);

      expect(supabase.igConfig.publishUrl).toBe(REGISTERED);
      expect(supabase.igConfig.bypassSecret).toBe(BYPASS);
      // The database is told the hash and never the secret: it sends the hash
      // back as its credential, and this side proves itself with the value the
      // hash was made from.
      expect(supabase.igConfig.callbackSecretHash).toBe(SECRET_HASH);
      expect(JSON.stringify([...supabase.calls])).not.toContain(SECRET);

      const config = await asOwner('/chatfuel/publishing/config');
      expect(await config.json()).toEqual({ scheduling: true });
    } finally {
      await server.close();
    }
  });

  it('takes nothing from the request: not the body, not x-forwarded-host, not host', async () => {
    const { server, port, cookie, register } = await bootRegistrar();
    try {
      const fromBody = await register({
        headers: { 'content-type': 'application/json', 'x-forwarded-host': 'attacker.example' },
        body: JSON.stringify({ url: 'https://attacker.example/collect' }),
      });
      expect(fromBody.status).toBe(200);
      expect(supabase.igConfig.publishUrl).toBe(REGISTERED);

      supabase.igConfig.publishUrl = null;
      const status = await postWithHost(port, '/chatfuel/publishing/register', 'attacker.example', {
        'x-cf-admin': '1',
        cookie,
      });
      expect(status).toBe(200);
      expect(supabase.igConfig.publishUrl).toBe(REGISTERED);
    } finally {
      await server.close();
    }
  });

  it('refuses a deployment that has not said which name it answers to', async () => {
    const { server, register } = await bootRegistrar({ publicUrl: '' });
    try {
      const res = await register();
      expect(res.status).toBe(409);
      expect(JSON.stringify(await res.json())).toContain('PUBLIC_URL');
      expect(supabase.igConfig.publishUrl).toBeNull();
    } finally {
      await server.close();
    }
  });

  it('refuses a signed-in workspace owner — the row belongs to the deployment', async () => {
    const { server, at } = await bootRegistrar();
    try {
      for (const jwt of [ownerJwt, plainMemberJwt]) {
        const res = await fetch(`${at}/chatfuel/publishing/register`, {
          method: 'POST',
          headers: { authorization: `Bearer ${jwt}` },
        });
        expect(res.status).toBe(401);
      }
      expect(supabase.igConfig.publishUrl).toBeNull();
    } finally {
      await server.close();
    }
  });

  it('refuses an admin header with no session behind it', async () => {
    const { server, register } = await bootRegistrar();
    try {
      const res = await register({ headers: { 'x-cf-admin': '1', cookie: 'cf_admin=v1.99999999999999.deadbeef' } });
      expect(res.status).toBe(401);
      expect(supabase.igConfig.publishUrl).toBeNull();
    } finally {
      await server.close();
    }
  });

  it('refuses a deployment with no admin panel at all', async () => {
    const { server, register } = await bootRegistrar({ adminPassword: '' });
    try {
      const res = await register();
      expect(res.status).toBe(401);
      expect(supabase.igConfig.publishUrl).toBeNull();
    } finally {
      await server.close();
    }
  });

  it('refuses when this deployment has no shared secret to register', async () => {
    const { server, register } = await bootRegistrar({ publishingSecret: '' });
    try {
      const res = await register();
      expect(res.status).toBe(500);
      expect(JSON.stringify(await res.json())).toContain('PUBLISHING_SECRET');
    } finally {
      await server.close();
    }
  });

  /**
   * The panel's own view of the same row.
   *
   * Whether the routes are mounted and whether the queue can fire are different
   * questions, and only the server can answer the second one: the panel cannot
   * ask `/publishing/config`, which admits a signed-in user rather than an
   * admin. So `/admin/health` answers it, and these tests pin the three states
   * apart — the button that registers is drawn from them.
   */
  const health = async (at: string, cookie: string): Promise<{ publishingQueue: boolean; scheduling: unknown }> => {
    const res = await fetch(`${at}/chatfuel/admin/health`, { headers: { 'x-cf-admin': '1', cookie } });
    expect(res.status).toBe(200);
    return (await res.json()) as { publishingQueue: boolean; scheduling: unknown };
  };

  it('is reported to the panel as off before registering and on after', async () => {
    const { server, at, cookie, register } = await bootRegistrar();
    try {
      const before = await health(at, cookie);
      expect(before.publishingQueue).toBe(true);
      expect(before.scheduling).toBe(false);

      expect((await register()).status).toBe(200);

      expect((await health(at, cookie)).scheduling).toBe(true);
    } finally {
      await server.close();
    }
  });

  /* Registered, and still off: the row's credential was derived from a secret
     this deployment no longer holds, so the callback it receives would be
     refused. Reporting that as "on" would send somebody looking at the wrong
     half of the system. */
  it('is reported as off when the row survives a deployment that lost the secret', async () => {
    const { server, register } = await bootRegistrar();
    try {
      expect((await register()).status).toBe(200);
    } finally {
      await server.close();
    }
    const secretless = await bootRegistrar({ publishingSecret: '' });
    try {
      const state = await health(secretless.at, secretless.cookie);
      expect(state.publishingQueue).toBe(true);
      expect(state.scheduling).toBe(false);
    } finally {
      await secretless.server.close();
    }
  });

  /* No queue here at all: null rather than false, because there is nothing to
     turn on and the panel draws no button for it. */
  it('is not reported at all where there is no queue', async () => {
    const { server, at, cookie } = await bootRegistrar({ auth: false });
    try {
      const state = await health(at, cookie);
      expect(state.publishingQueue).toBe(false);
      expect(state.scheduling).toBeNull();
    } finally {
      await server.close();
    }
  });
});

describe('the posts themselves', () => {
  const posts = (query: string, init: RequestInit = {}) => asOwner(`/chatfuel/publishing/posts${query}`, init);
  const json = (value: unknown): RequestInit => ({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });

  it('round-trip through create, list, change and delete', async () => {
    const created = await posts(`?botID=${OWNER_BOT}`, {
      method: 'POST',
      ...json({
        kind: 'reel',
        caption: 'Tomorrow',
        media: [{ id: 'm1', type: 'video', url: 'https://cdn.test/a.mp4', source: 'upload' }],
        reel: { shareToFeed: true },
        scheduledAt: '2030-04-01T09:30:00.000Z',
      }),
    });
    expect(created.status).toBe(200);
    const { post } = (await created.json()) as { post: { id: string; status: string; scheduledAt: string } };
    expect(post.status).toBe('scheduled');
    expect(post.scheduledAt).toBe('2030-04-01T09:30:00.000Z');

    const listed = await posts(`?botID=${OWNER_BOT}`);
    expect(((await listed.json()) as { posts: unknown[] }).posts).toHaveLength(1);

    const patched = await posts(`/${post.id}?botID=${OWNER_BOT}`, { method: 'PATCH', ...json({ caption: 'Changed' }) });
    expect(((await patched.json()) as { post: { caption: string } }).post.caption).toBe('Changed');

    const removed = await posts(`/${post.id}?botID=${OWNER_BOT}`, { method: 'DELETE' });
    expect(removed.status).toBe(200);
    // The client parses every answer as JSON, including this one.
    expect(await removed.json()).toBeTruthy();
    expect(supabase.igPosts.size).toBe(0);
  });

  /**
   * The fence, and the whole reason these routes hold the service-role key
   * instead of the browser: naming somebody else's bot must not work, however
   * valid the session is.
   */
  it('refuse a bot the caller does not own — read and write alike', async () => {
    supabase.seedPost({ id: uid(8), botId: OTHER_BOT, caption: 'Not yours' });
    for (const init of [{ method: 'GET' }, { method: 'POST', ...json({ kind: 'post' }) }]) {
      const res = await posts(`?botID=${OTHER_BOT}`, init);
      expect(res.status).toBe(403);
      expect(JSON.stringify(await res.json())).toContain('BotNotAllowed');
    }
    const patched = await posts(`/${uid(8)}?botID=${OTHER_BOT}`, { method: 'PATCH', ...json({ caption: 'mine' }) });
    expect(patched.status).toBe(403);
    expect(supabase.igPosts.get(uid(8))!.caption).toBe('Not yours');
  });

  /* And the same fence from the other side: a perfectly valid session in
     ANOTHER tenant reaching for this one's posts. */
  it('refuse a session from another tenant reaching for these posts', async () => {
    supabase.seedPost({ id: uid(9), botId: OWNER_BOT, caption: 'Mine' });
    const res = await fetch(`${base}/chatfuel/publishing/posts?botID=${OWNER_BOT}`, {
      headers: { authorization: `Bearer ${strangerJwt}` },
    });
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain('Mine');
  });

  /* The ceiling is enforced while the body is being read, so a caller cannot
     decide how much memory the proxy spends on their behalf. */
  it('refuse a post past the ceiling without writing it', async () => {
    const res = await posts(`?botID=${OWNER_BOT}`, {
      method: 'POST',
      ...json({ kind: 'post', caption: 'x'.repeat(3 * 1024 * 1024) }),
    });
    expect(res.status).toBe(413);
    expect(JSON.stringify(await res.json())).toContain('RequestTooLarge');
    expect(supabase.igPosts.size).toBe(0);
  });

  it('refuse a request that names no bot at all', async () => {
    const res = await posts('');
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain('botID');
  });

  /* An id that is not one names no post — said here, rather than sent to the
     database to come back as a type-cast failure in its own words. */
  it('refuse an id that is not the shape of a post id, without asking', async () => {
    const before = supabase.calls.length;
    const res = await posts(`/not-an-id?botID=${OWNER_BOT}`, { method: 'DELETE' });
    expect(res.status).toBe(404);
    expect(supabase.calls.length).toBe(before);
  });

  it('pass the database refusal on in its own words', async () => {
    const res = await posts(`/${uid(5)}?botID=${OWNER_BOT}`, { method: 'PATCH', ...json({ caption: 'x' }) });
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).toContain('PostNotFound');
  });
});

describe('durable media', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  it('stores the bytes and answers a public address', async () => {
    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(200);
    const answered = (await res.json()) as { url: string; key: string };
    // Keyed by bot, so one tenant's media is separable from another's.
    expect(answered.key.startsWith(`${OWNER_BOT}/`)).toBe(true);
    expect(answered.url).toBe(`${supabase.url}/storage/v1/object/public/cf-pub-media/${answered.key}`);
    expect(supabase.storage.get(answered.key)!.bytes.equals(png)).toBe(true);
    expect(supabase.storage.get(answered.key)!.contentType).toBe('image/png');
  });

  it('refuse a kind of file that has no business in a published post', async () => {
    const { body, contentType } = multipart('file', 'notes.html', 'text/html', Buffer.from('<script>'));
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(415);
    expect(supabase.storage.size).toBe(0);
  });

  it('refuse bytes that are not the kind of file they claim to be', async () => {
    const { body, contentType } = multipart('file', 'shot.jpg', 'image/jpeg', Buffer.from('<script>alert(1)</script>'));
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(415);
    expect(JSON.stringify(await res.json())).toContain('MediaTypeMismatch');
    expect(supabase.storage.size).toBe(0);
  });

  it('take the other four kinds when the bytes agree', async () => {
    const jpeg = Buffer.concat([Buffer.from('ffd8ff', 'hex'), Buffer.alloc(8)]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    const mp4 = Buffer.concat([Buffer.from('00000018', 'hex'), Buffer.from('ftypisom'), Buffer.alloc(8)]);
    const mov = Buffer.concat([Buffer.from('00000014', 'hex'), Buffer.from('ftypqt  '), Buffer.alloc(8)]);
    const cases: [string, string, Buffer][] = [
      ['a.jpg', 'image/jpeg', jpeg],
      ['a.webp', 'image/webp', webp],
      ['a.mp4', 'video/mp4', mp4],
      ['a.mov', 'video/quicktime', mov],
    ];
    for (const [name, type, bytes] of cases) {
      const { body, contentType } = multipart('file', name, type, bytes);
      const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: asBody(body),
      });
      expect(res.status, type).toBe(200);
    }
  });

  it('refuse a body that is not a file at all', async () => {
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"file":"nice try"}',
    });
    expect(res.status).toBe(400);
  });

  /* The ceiling is enforced while the body is being read, not after: a limit
     checked on a buffer somebody has already been given is not a limit. */
  it('refuse a file past the ceiling without keeping it', async () => {
    const { body, contentType } = multipart('file', 'huge.mp4', 'video/mp4', Buffer.alloc(26 * 1024 * 1024));
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(413);
    expect(supabase.storage.size).toBe(0);
  });

  it('are fenced the same way the posts are', async () => {
    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OTHER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(403);
    expect(supabase.storage.size).toBe(0);
  });

  it('delete only inside the caller’s own prefix', async () => {
    supabase.storage.set(`${OTHER_BOT}/theirs.png`, { contentType: 'image/png', bytes: png });
    supabase.storage.set(`${OWNER_BOT}/mine.png`, { contentType: 'image/png', bytes: png });

    const trespass = await asOwner(
      `/chatfuel/publishing/media?botID=${OWNER_BOT}&key=${encodeURIComponent(`${OTHER_BOT}/theirs.png`)}`,
      { method: 'DELETE' },
    );
    expect(trespass.status).toBe(404);
    expect(supabase.storage.has(`${OTHER_BOT}/theirs.png`)).toBe(true);

    const own = await asOwner(
      `/chatfuel/publishing/media?botID=${OWNER_BOT}&key=${encodeURIComponent(`${OWNER_BOT}/mine.png`)}`,
      { method: 'DELETE' },
    );
    expect(own.status).toBe(200);
    expect(supabase.storage.has(`${OWNER_BOT}/mine.png`)).toBe(false);
  });

  /* The per-file ceiling says nothing about how many files there are, and the
     bucket is billed by the byte. */
  it('refuse an upload that would take this bot past what the deployment keeps', async () => {
    supabase.storage.set(`${OWNER_BOT}/already.png`, { contentType: 'image/png', bytes: Buffer.alloc(1024 * 1024) });
    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(507);
    expect(JSON.stringify(await res.json())).toContain('MediaQuotaExceeded');
    // Nothing was written, and nothing was taken away either.
    expect(supabase.storage.size).toBe(1);
  });

  /* Old AND unreferenced is the pair that makes an object safe to let go. An
     abandoned compose leaves the first; a post from last spring is the second
     and must survive. */
  it('let go of old media no post mentions, and keep what one still does', async () => {
    const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const url = (name: string) => `${supabase.url}/storage/v1/object/public/cf-pub-media/${OWNER_BOT}/${name}`;
    supabase.storage.set(`${OWNER_BOT}/orphan.png`, {
      contentType: 'image/png',
      bytes: Buffer.alloc(900 * 1024),
      createdAt: old,
    });
    supabase.storage.set(`${OWNER_BOT}/kept.png`, {
      contentType: 'image/png',
      bytes: Buffer.alloc(50 * 1024),
      createdAt: old,
    });
    supabase.storage.set(`${OTHER_BOT}/theirs.png`, {
      contentType: 'image/png',
      bytes: Buffer.alloc(900 * 1024),
      createdAt: old,
    });
    supabase.seedPost({
      id: uid(9),
      botId: OWNER_BOT,
      media: [{ id: 'm1', type: 'image', url: url('kept.png'), source: 'upload' }],
    });

    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    // Without the sweep those 900 KB plus the new file are over the quota.
    expect(res.status).toBe(200);
    expect(supabase.storage.has(`${OWNER_BOT}/orphan.png`)).toBe(false);
    expect(supabase.storage.has(`${OWNER_BOT}/kept.png`)).toBe(true);
    // Another bot's prefix is not this bot's to sweep.
    expect(supabase.storage.has(`${OTHER_BOT}/theirs.png`)).toBe(true);
  });

  /* A file uploaded a minute ago belongs to the post being written right now. */
  it('leave recent media alone even when no post mentions it yet', async () => {
    supabase.storage.set(`${OWNER_BOT}/fresh.png`, { contentType: 'image/png', bytes: Buffer.alloc(1024) });
    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(200);
    expect(supabase.storage.has(`${OWNER_BOT}/fresh.png`)).toBe(true);
  });

  it('say so when the bucket refuses the write', async () => {
    supabase.failStorage(true);
    const { body, contentType } = multipart('file', 'shot.png', 'image/png', png);
    const res = await asOwner(`/chatfuel/publishing/media?botID=${OWNER_BOT}`, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: asBody(body),
    });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).toContain('MediaUploadFailed');
  });
});

describe('the scheduler’s callback', () => {
  const claim = (id: string, kind = 'post', media: unknown[] = [{ type: 'image', url: 'https://cdn.test/a.jpg' }]) =>
    supabase.seedPost({ id, botId: OWNER_BOT, kind, media, status: 'publishing', attempts: 1, caption: 'Hello' });

  /** `null` sends no key at all — which is not the same as sending a wrong one. */
  const knock = (id: string, key: string | null = SECRET_HASH, init: RequestInit = {}) =>
    fetch(`${base}/chatfuel/publishing/publish-due`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key === null ? {} : { 'x-chatfuel-publish-key': key }),
      },
      body: JSON.stringify({ id }),
      ...init,
    });

  beforeEach(() => {
    supabase.igConfig.callbackSecretHash = SECRET_HASH;
    supabase.igConfig.publishUrl = `${base}/chatfuel/publishing/publish-due`;
  });

  /**
   * There is no session on a callback — nothing signed in sent it — so the
   * shared secret is the whole of its authentication, and a session is not an
   * alternative to it.
   */
  it('refuses a wrong key, a missing key, and a valid session with no key', async () => {
    claim(uid(1));
    for (const key of ['not-the-key', SECRET, '', null]) {
      const res = await knock(uid(1), key);
      expect(res.status).toBe(401);
    }
    const withSession = await knock(uid(1), null, { headers: { authorization: `Bearer ${ownerJwt}` } });
    expect(withSession.status).toBe(401);
    expect(upstream.httpRequests.filter((r) => r.body.includes('instagramAccountPublish'))).toHaveLength(0);
    expect(supabase.igPosts.get(uid(1))!.status).toBe('publishing');
  });

  it('refuses a callback body past the ceiling, and publishes nothing', async () => {
    claim(uid(20));
    const res = await fetch(`${base}/chatfuel/publishing/publish-due`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-chatfuel-publish-key': SECRET_HASH },
      body: JSON.stringify({ id: uid(20), pad: 'x'.repeat(3 * 1024 * 1024) }),
    });
    expect(res.status).toBe(413);
    expect(JSON.stringify(await res.json())).toContain('RequestTooLarge');
    expect(upstream.httpRequests.filter((r) => r.body.includes('instagramAccountPublish'))).toHaveLength(0);
    expect(supabase.igPosts.get(uid(20))!.status).toBe('publishing');
  });

  it('publishes the claimed post and writes the outcome back itself', async () => {
    claim(uid(2));
    upstream.respondWith(200, {
      data: { instagramAccountPublishImage: { id: 'media-7', permalink: 'https://example.test/p/7' } },
    });
    const res = await knock(uid(2));
    expect(res.status).toBe(200);

    const sent = upstream.httpRequests.at(-1)!;
    expect(sent.headers.authorization).toBe(`Bearer ${TOKEN}`);
    const body = JSON.parse(sent.body) as {
      query: string;
      variables: { botID: string; input: Record<string, unknown> };
    };
    expect(body.query).toContain('instagramAccountPublishImage');
    expect(body.variables.botID).toBe(OWNER_BOT);
    expect(body.variables.input).toEqual({ imageURL: 'https://cdn.test/a.jpg', caption: 'Hello' });

    const row = supabase.igPosts.get(uid(2))!;
    expect(row.status).toBe('published');
    expect(row.mediaId).toBe('media-7');
    expect(row.permalink).toBe('https://example.test/p/7');
  });

  /**
   * The callback secret is one value for the whole deployment, so the report
   * carries the bot as well — and the bot it carries is the one cf_pub_take
   * handed back, never anything the caller of this route said. A body that
   * names another bot changes nothing.
   */
  it('reports the outcome against the bot the queue named, not the one the body did', async () => {
    claim(uid(21));
    upstream.respondWith(200, {
      data: { instagramAccountPublishImage: { id: 'media-21', permalink: 'https://example.test/p/21' } },
    });
    const res = await fetch(`${base}/chatfuel/publishing/publish-due`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-chatfuel-publish-key': SECRET_HASH },
      body: JSON.stringify({ id: uid(21), botID: OTHER_BOT, p_bot_id: OTHER_BOT }),
    });
    expect(res.status).toBe(200);

    const reported = supabase.calls.filter(
      (c) => c.path === '/rest/v1/rpc/cf_pub_report' && (c.body as { p_id?: unknown } | null)?.p_id === uid(21),
    );
    expect(reported).toHaveLength(1);
    expect(reported[0]!.body).toMatchObject({ p_bot_id: OWNER_BOT, p_status: 'published' });
    expect(supabase.igPosts.get(uid(21))!.status).toBe('published');
  });

  /**
   * The request that started the publish is fire-and-forget and can easily be
   * gone before a transcode finishes — so the write-back, not the response, is
   * what records the outcome. Here the caller walks away mid-publish and the
   * row still ends up correct.
   */
  it('records the outcome even when nobody is left to hear the answer', async () => {
    claim(uid(3));
    upstream.respondWith(200, {
      data: { instagramAccountPublishImage: { id: 'media-8', permalink: 'https://example.test/p/8' } },
    });
    upstream.respondAfter(400);

    const abort = new AbortController();
    const inFlight = knock(uid(3), SECRET_HASH, { signal: abort.signal }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 80));
    abort.abort();
    await inFlight;
    expect(supabase.igPosts.get(uid(3))!.status).toBe('publishing');

    await waitFor(() => supabase.igPosts.get(uid(3))!.status === 'published');
    expect(supabase.igPosts.get(uid(3))!.mediaId).toBe('media-8');
  });

  /** Delivered twice is a thing HTTP does. Published twice must not be. */
  it('publishes once when the same callback arrives twice', async () => {
    claim(uid(4));
    upstream.respondWith(200, { data: { instagramAccountPublishImage: { id: 'media-9', permalink: '' } } });
    const before = upstream.httpRequests.length;
    expect((await knock(uid(4))).status).toBe(200);
    const again = await knock(uid(4));
    expect(again.status).toBe(409);
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  /**
   * The platform's own code, kept word for word: it names the thing that is
   * wrong better than a sentence of ours would, and it arrives two `extensions`
   * deep inside a router wrapper.
   */
  it('records the platform’s own error code, from two levels down', async () => {
    claim(uid(5));
    upstream.respondWith(200, {
      data: null,
      errors: [
        {
          message: "Failed to fetch from Subgraph 'upstream'.",
          extensions: {
            errors: [
              {
                message: 'permissions',
                extensions: { code: 'InstagramMissingPermissionsOrExpiredToken', service: 'upstream' },
              },
            ],
          },
        },
      ],
    });
    await knock(uid(5));
    const row = supabase.igPosts.get(uid(5))!;
    expect(row.status).toBe('failed');
    expect(row.error).toBe('InstagramMissingPermissionsOrExpiredToken');
  });

  it('fails a post that could never have been published, without asking the platform', async () => {
    claim(uid(6), 'carousel', [{ type: 'image', url: 'https://cdn.test/one.jpg' }]);
    const before = upstream.httpRequests.length;
    await knock(uid(6));
    expect(upstream.httpRequests.length).toBe(before);
    expect(supabase.igPosts.get(uid(6))!.error).toContain('two and ten');
  });

  it('answers 409 for a post nothing has claimed', async () => {
    supabase.seedPost({ id: uid(7), botId: OWNER_BOT, status: 'draft' });
    expect((await knock(uid(7))).status).toBe(409);
  });
});

describe('publishOperation', () => {
  const image = { type: 'image', url: 'https://cdn.test/a.jpg' };
  const video = { type: 'video', url: 'https://cdn.test/a.mp4' };

  it('builds each of the four inputs the way its own type is shaped', () => {
    const feed = publishOperation({ kind: 'post', caption: 'Hi', media: [image], reel: null });
    expect(feed).toMatchObject({ variables: { input: { imageURL: image.url, caption: 'Hi' } } });

    const reel = publishOperation({
      kind: 'reel',
      caption: 'Hi',
      media: [video],
      reel: { shareToFeed: true, thumbOffset: 1500, coverURL: 'https://cdn.test/c.jpg' },
    });
    expect(reel).toMatchObject({
      variables: {
        input: { videoURL: video.url, shareToFeed: true, thumbOffset: 1500, coverURL: 'https://cdn.test/c.jpg' },
      },
    });

    // A story has no caption on its input type at all, so none is sent.
    const story = publishOperation({ kind: 'story', caption: 'Hi', media: [video], reel: null });
    expect(story).toMatchObject({ variables: { input: { mediaType: 'Video', mediaURL: video.url } } });
    expect(JSON.stringify(story)).not.toContain('caption');

    const carousel = publishOperation({ kind: 'carousel', caption: 'Hi', media: [image, video], reel: null });
    expect(carousel).toMatchObject({
      variables: {
        input: {
          items: [
            { mediaType: 'Image', mediaURL: image.url },
            { mediaType: 'Video', mediaURL: video.url },
          ],
          caption: 'Hi',
        },
      },
    });
  });

  /* Every publish field is one the forwarded path already treats as slow, so
     the same rule gives the callback the transcode-sized budget. */
  it('names an upstream field the slow budget is matched on', () => {
    const usable: Record<string, unknown[]> = {
      post: [image],
      reel: [video],
      story: [video],
      carousel: [image, video],
    };
    for (const [kind, media] of Object.entries(usable)) {
      const built = publishOperation({ kind, caption: '', media, reel: null });
      expect('query' in built && /instagramAccountPublish(?:Image|Reel|Story|Carousel)\s*\(/.test(built.query)).toBe(
        true,
      );
    }
  });

  it('refuses what the platform would only refuse later, in words worth reading', () => {
    expect(publishOperation({ kind: 'post', caption: '', media: [], reel: null })).toEqual({
      error: 'This post has nothing to publish',
    });
    expect(publishOperation({ kind: 'post', caption: '', media: [video], reel: null })).toMatchObject({
      error: expect.stringContaining('image'),
    });
    expect(publishOperation({ kind: 'reel', caption: '', media: [image], reel: null })).toMatchObject({
      error: expect.stringContaining('video'),
    });
    expect(
      publishOperation({ kind: 'carousel', caption: '', media: new Array(11).fill(image), reel: null }),
    ).toMatchObject({ error: expect.stringContaining('two and ten') });
    expect(publishOperation({ kind: 'story-ish', caption: '', media: [image], reel: null })).toMatchObject({
      error: expect.stringContaining('cannot be published'),
    });
  });

  /* The network fetches these bytes itself, so an address here is this
     deployment asking a third party to open it. A carousel with one bad item
     used to go out one item short and say nothing. */
  it('refuses a media address that is not https, and says which one', () => {
    for (const url of ['http://cdn.test/a.jpg', 'http://169.254.169.254/latest/meta-data/', 'file:///etc/passwd']) {
      expect(
        publishOperation({ kind: 'post', caption: '', media: [{ type: 'image', url }], reel: null }),
      ).toMatchObject({ error: expect.stringContaining(url) });
    }
    expect(
      publishOperation({ kind: 'post', caption: '', media: [{ type: 'image', url: 'not a url' }], reel: null }),
    ).toMatchObject({ error: expect.stringContaining('not a web address') });

    // Not filtered out of the carousel: the whole post stops.
    expect(
      publishOperation({
        kind: 'carousel',
        caption: '',
        media: [image, { type: 'image', url: 'http://cdn.test/b.jpg' }, video],
        reel: null,
      }),
    ).toMatchObject({ error: expect.stringContaining('http://cdn.test/b.jpg') });

    // The reel cover goes nowhere near asMediaItem, so it is checked on its own.
    expect(
      publishOperation({ kind: 'reel', caption: '', media: [video], reel: { coverURL: 'http://cdn.test/c.jpg' } }),
    ).toMatchObject({ error: expect.stringContaining('http://cdn.test/c.jpg') });
  });
});

describe('parseMultipartFile', () => {
  const bytes = Buffer.from([0, 1, 2, 3, 0xff, 0x0d, 0x0a, 4]);

  it('finds the named part and hands back its bytes untouched', () => {
    const { body, contentType } = multipart('file', 'a.mp4', 'video/mp4', bytes);
    const part = parseMultipartFile(body, contentType, 'file');
    expect(part).not.toBeNull();
    expect(part!.filename).toBe('a.mp4');
    expect(part!.contentType).toBe('video/mp4');
    // Binary that happens to contain a CRLF must survive intact.
    expect(part!.bytes.equals(bytes)).toBe(true);
  });

  it('walks past parts with other names', () => {
    const boundary = 'zzz';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nhello\r\n`),
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="b.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const part = parseMultipartFile(body, `multipart/form-data; boundary=${boundary}`, 'file');
    expect(part!.filename).toBe('b.png');
    expect(part!.bytes.equals(bytes)).toBe(true);
  });

  it('answers null for a body it cannot read as multipart', () => {
    expect(parseMultipartFile(Buffer.from('{}'), 'application/json', 'file')).toBeNull();
    expect(parseMultipartFile(Buffer.from('{}'), 'multipart/form-data', 'file')).toBeNull();
    const { body, contentType } = multipart('other', 'a.png', 'image/png', bytes);
    expect(parseMultipartFile(body, contentType, 'file')).toBeNull();
  });
});
