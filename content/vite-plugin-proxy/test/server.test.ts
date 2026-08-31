/**
 * The production server: static dist/ + the same proxy core the dev plugin
 * mounts. Everything here runs against a real node:http server on a real
 * port with a throwaway dist directory.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { createChatfuelClient } from '@chatfuel/api-client';
import { CurrentUserDocument } from '@chatfuel/api-client/generated/core';
import * as core from '@chatfuel/api-client/generated/core';
import * as livechat from '@chatfuel/api-client/generated/livechat';
import { UnseenOpenDialogsCountChangedDocument } from '@chatfuel/api-client/generated/livechat';
import {
  CSP,
  createChatfuelServer,
  looksLikeAsset,
  normalizeBasePath,
  pathUnderBase,
  resolveStaticPath,
  type ChatfuelServer,
} from '../src/server';
import { startMockUpstream, type MockUpstream } from './mock-upstream';

const TOKEN = 'a1b2'.repeat(16); // 64 hex chars

let dist: string;
let outsideDist: string;
let upstream: MockUpstream;
let app: ChatfuelServer;
let base: string;
let port = 0;

/** GET a path written verbatim onto the socket (no URL normalisation). */
function rawGetStatus(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write(`GET ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n`);
    });
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
    });
    socket.on('error', reject);
    socket.on('close', () => {
      const status = /^HTTP\/1\.\d (\d{3})/.exec(buffer)?.[1];
      if (status) resolve(Number(status));
      else reject(new Error(`no status line in ${JSON.stringify(buffer.slice(0, 80))}`));
    });
  });
}

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'chatfuel-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>shell</title>', 'utf8');
  writeFileSync(join(dist, 'assets', 'a.js'), 'export const a = 1;\n', 'utf8');
  writeFileSync(join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>', 'utf8');

  /* A file outside distDir, and a symlink inside it pointing there — the
     shape resolveStaticPath's lexical check cannot see, because the name it
     is handed never leaves distDir; only realpath sees where it actually
     points. */
  outsideDist = mkdtempSync(join(tmpdir(), 'chatfuel-outside-'));
  writeFileSync(join(outsideDist, 'secret.txt'), 'not for the browser', 'utf8');
  symlinkSync(join(outsideDist, 'secret.txt'), join(dist, 'escape.txt'));

  upstream = await startMockUpstream();
  app = createChatfuelServer({
    distDir: dist,
    port: 0,
    host: '127.0.0.1',
    env: { CHATFUEL_TOKEN: TOKEN },
    proxy: { upstream: upstream.url },
    log: () => undefined,
    logError: () => undefined,
  });
  port = (await app.listen()).port;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await app?.close();
  await upstream?.close();
  rmSync(dist, { recursive: true, force: true });
  rmSync(outsideDist, { recursive: true, force: true });
});

describe('resolveStaticPath', () => {
  it('refuses traversal, backslashes, drive letters, NUL and protocol-relative paths', () => {
    expect(resolveStaticPath('/dist', '/index.html')).toBe('/dist/index.html');
    expect(resolveStaticPath('/dist', '/')).toBe('/dist');
    expect(resolveStaticPath('/dist', '/../etc/passwd')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/assets/../../etc/passwd')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/%2e%2e/etc/passwd')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/a\\b')).toBeUndefined();
    expect(resolveStaticPath('/dist', '//evil.example.com/x')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/C:/windows')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/a%00.js')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/%zz')).toBeUndefined();
  });

  it('refuses a leading-dot segment anywhere in the path', () => {
    expect(resolveStaticPath('/dist', '/.env')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/.git/config')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/assets/.env')).toBeUndefined();
    expect(resolveStaticPath('/dist', '/%2e%65nv')).toBeUndefined();
  });
});

describe('static serving', () => {
  it('serves index.html with no-cache at /', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.text()).toContain('<title>shell</title>');
  });

  /* The headers are the deployment's, not a page's: whatever a module renders,
     the browser is told the same thing about scripts, framing and the referrer.
     Vercel sends this set from vercel.json and this server sends it from
     SECURITY_HEADERS — the check is that both a page and a 404 carry it, since
     an injected path that misses is the one that matters. */
  it('sends the security headers on a page and on a 404 alike', async () => {
    for (const path of ['/', '/team', '/assets/missing.js']) {
      const res = await fetch(`${base}${path}`);
      expect(res.headers.get('content-security-policy')).toBe(CSP);
      expect(res.headers.get('strict-transport-security')).toBe('max-age=63072000; includeSubDomains');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin');
      expect(res.headers.get('permissions-policy')).toContain('microphone=(self)');
      await res.arrayBuffer();
    }
  });

  /* No inline script survives `script-src 'self'`, and the app has none to
     lose — Vite emits a module tag. The directives that are wide (img, media,
     connect) are wide because the media CDN and the Supabase project are not
     knowable here; the scheme is still pinned to https/wss. */
  it('pins the script origin and refuses framing in the policy itself', () => {
    expect(CSP).toContain("script-src 'self'");
    expect(CSP).toContain("object-src 'none'");
    expect(CSP).toContain("base-uri 'self'");
    expect(CSP).toContain("frame-ancestors 'none'");
    expect(CSP).not.toContain("'unsafe-eval'");
    expect(CSP).not.toContain('http:');
  });

  it('serves hashed assets immutable', async () => {
    const res = await fetch(`${base}/assets/a.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await res.text()).toContain('export const a');
  });

  it('serves other files with a revalidating cache header and the right mime', async () => {
    const res = await fetch(`${base}/favicon.svg`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/svg+xml');
    expect(res.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
  });

  it('answers HEAD without a body', async () => {
    const res = await fetch(`${base}/assets/a.js`, { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-length')).toBe(String('export const a = 1;\n'.length));
    expect(await res.text()).toBe('');
  });

  it('falls back to index.html for unknown routes but 404s missing assets', async () => {
    const spa = await fetch(`${base}/team`);
    expect(spa.status).toBe(200);
    expect(spa.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(spa.headers.get('cache-control')).toBe('no-cache');
    const missing = await fetch(`${base}/assets/missing.js`);
    expect(missing.status).toBe(404);
    expect((await fetch(`${base}/bundle-that-moved.js`)).status).toBe(404);
  });

  /* The app routes in the path, so a route can end in anything a person can
     type — an email address, a domain. Reading the last segment for a dot sent
     every one of those to a 404. */
  it('serves a route whose last segment contains a dot', async () => {
    for (const path of ['/contacts/acme.io', '/team/ann@acme.co', '/deals/board']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status, path).toBe(200);
      expect(res.headers.get('content-type'), path).toBe('text/html; charset=utf-8');
    }
  });

  /* resolveStaticPath only ever sees the request path, never the disk — a
     symlink inside dist that resolves outside it looks exactly like any
     other file to the lexical check. The realpath re-check in serveFile is
     what has to catch this one. */
  it('404s a symlink inside distDir that resolves outside it', async () => {
    const res = await fetch(`${base}/escape.txt`);
    expect(res.status).toBe(404);
  });

  it('404s a traversal attempt sent verbatim on the wire', async () => {
    // fetch()/WHATWG URL fold '..' (and '%2e%2e') away before the request is
    // sent, so a real traversal has to be written onto the socket by hand.
    for (const path of ['/../etc/passwd', '/assets/../../etc/passwd', '/%2e%2e/etc/passwd']) {
      expect(await rawGetStatus(path)).toBe(404);
    }
  });

  it('405s non-GET/HEAD requests that are not proxy routes', async () => {
    const res = await fetch(`${base}/`, { method: 'POST', body: 'x' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });

  it('answers /chatfuel/healthz with liveness and nothing else', async () => {
    const res = await fetch(`${base}/chatfuel/healthz`);
    expect(res.status).toBe(200);
    // No `auth` field: the route is open to anyone who can reach the
    // deployment, and naming the gate's state told them whether it is off
    // before they tried a request.
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe('proxying through the prod server', () => {
  it('forwards POST /chatfuel/graphql with the injected token', async () => {
    const client = createChatfuelClient({ url: `${base}/chatfuel/graphql` });
    await client.query(CurrentUserDocument, {});
    const seen = upstream.httpRequests.at(-1)!;
    expect(seen.url).toBe('/graphql?op=CurrentUser');
    expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('survives a POST whose body never arrives', async () => {
    // The caller promises 5000 bytes, sends eight and hangs up. The body stream
    // then errors, `readBodyCapped` rejects, and that rejection had nobody to
    // catch it: Node ends the process for an unhandled one, so a single caller
    // dropping a connection took the proxy down for everyone on it.
    await new Promise<void>((done) => {
      const socket = connect(port, '127.0.0.1', () => {
        socket.write(
          'POST /chatfuel/graphql HTTP/1.1\r\nHost: 127.0.0.1\r\n' +
            'Content-Type: application/json\r\nContent-Length: 5000\r\n\r\n{"query"',
        );
        setTimeout(() => {
          socket.destroy();
          done();
        }, 50);
      });
      socket.on('error', () => done());
    });
    await new Promise((settled) => setTimeout(settled, 100));

    const client = createChatfuelClient({ url: `${base}/chatfuel/graphql` });
    await expect(client.query(CurrentUserDocument, {})).resolves.toBeDefined();
  });

  it('relays the WebSocket', async () => {
    const client = createChatfuelClient({
      url: `${base}/chatfuel/graphql`,
      wsUrl: `${base.replace('http', 'ws')}/chatfuel/graphql`,
      webSocketImpl: WebSocket,
    });
    const values: unknown[] = [];
    for await (const data of client.iterate(UnseenOpenDialogsCountChangedDocument, { botID: 'b1' })) {
      values.push(data.unseenOpenDialogsCountChanged);
      if (values.length === 2) break;
    }
    expect(values).toEqual([1, 2]);
    expect(upstream.initPayloads.at(-1)).toEqual({ authToken: `Bearer ${TOKEN}` });
    await client.dispose();
  });

  it('destroys upgrades that are not the relay path', async () => {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/somewhere-else`);
    const err = await new Promise<Error>((resolve) => {
      ws.on('error', resolve);
      ws.on('open', () => resolve(new Error('unexpectedly opened')));
    });
    expect(err.message).not.toBe('unexpectedly opened');
  });
});

/*
 * Test 6, the second runtime. `createChatfuelServer` takes the same `proxy`
 * options the plugin does and passes them on, so what is checked here is that
 * the registry survives the trip — on both doors this server opens.
 */
describe('the documents this app ships, through the standalone server', () => {
  let shipping: ChatfuelServer;
  let shippingBase: string;

  beforeAll(async () => {
    shipping = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '127.0.0.1',
      env: { CHATFUEL_TOKEN: TOKEN },
      proxy: { upstream: upstream.url, operations: [core, livechat] },
      log: () => undefined,
      logError: () => undefined,
    });
    shippingBase = `http://127.0.0.1:${(await shipping.listen()).port}`;
  });

  afterAll(async () => {
    await shipping?.close();
  });

  async function post(body: unknown) {
    const seen = upstream.httpRequests.length;
    const res = await fetch(`${shippingBase}/chatfuel/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { errors?: Array<{ extensions?: { code?: string } }> };
    return {
      status: res.status,
      code: payload.errors?.[0]?.extensions?.code,
      forwarded: upstream.httpRequests.length - seen,
    };
  }

  it('forwards its own document and refuses one it never wrote', async () => {
    expect(await post({ query: String(CurrentUserDocument) })).toMatchObject({ status: 200, forwarded: 1 });
    expect(await post({ query: 'query TheirOwn { user { id apiToken } }' })).toMatchObject({
      status: 403,
      code: 'OperationNotInRegistry',
      forwarded: 0,
    });
  });

  it('asks the same of a subscribe frame', async () => {
    const client = createChatfuelClient({
      url: `${shippingBase}/chatfuel/graphql`,
      wsUrl: `${shippingBase.replace('http', 'ws')}/chatfuel/graphql`,
      webSocketImpl: WebSocket,
    });
    // The app ships this one, so it streams.
    const values: unknown[] = [];
    for await (const data of client.iterate(UnseenOpenDialogsCountChangedDocument, { botID: 'b1' })) {
      values.push(data.unseenOpenDialogsCountChanged);
      if (values.length === 2) break;
    }
    expect(values).toEqual([1, 2]);
    await client.dispose();

    const sock = new WebSocket(`${shippingBase.replace('http', 'ws')}/chatfuel/graphql`, 'graphql-transport-ws');
    const frames: Array<{ type?: string; payload?: unknown }> = [];
    sock.on('error', () => undefined);
    sock.on('message', (data) => frames.push(JSON.parse(data.toString()) as (typeof frames)[number]));
    await new Promise<void>((open) => sock.on('open', open));
    sock.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    sock.send(
      JSON.stringify({
        id: '1',
        type: 'subscribe',
        payload: {
          query: 'subscription TheirOwn($botID: BotID!) { unseenOpenDialogsCountChanged(botID: $botID) }',
          variables: { botID: 'b1' },
        },
      }),
    );
    await new Promise<void>((done) => {
      const timer = setInterval(() => {
        if (frames.some((frame) => frame.type === 'error')) {
          clearInterval(timer);
          done();
        }
      }, 10);
    });
    const refusal = frames.find((frame) => frame.type === 'error')!;
    const entries = refusal.payload as Array<{ extensions?: { code?: string } }>;
    expect(entries[0]!.extensions?.code).toBe('OperationNotInRegistry');
    expect(frames.some((frame) => frame.type === 'next')).toBe(false);
    sock.close();
  });
});

describe('server lifecycle', () => {
  it('reads PORT from env and reports the bound port; close() is idempotent-safe', async () => {
    const other = createChatfuelServer({
      distDir: dist,
      host: '127.0.0.1',
      env: { PORT: '0', CHATFUEL_TOKEN: TOKEN },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: () => undefined,
    });
    const { port } = await other.listen();
    expect(port).toBeGreaterThan(0);
    expect((await fetch(`http://127.0.0.1:${port}/chatfuel/healthz`)).status).toBe(200);
    await other.close();
    await expect(fetch(`http://127.0.0.1:${port}/chatfuel/healthz`)).rejects.toThrow();
  });

  it('keeps the gate state off /chatfuel/healthz even when the gate is on', async () => {
    const gated = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '127.0.0.1',
      env: {
        CHATFUEL_TOKEN: TOKEN,
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_publishable_x',
        VITE_AUTH_TENANT_ID: '3d1f0d5a-2c31-5f2a-9d51-8f0b8ad0a3f1',
      },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: () => undefined,
    });
    const { port } = await gated.listen();
    try {
      expect(await (await fetch(`http://127.0.0.1:${port}/chatfuel/healthz`)).json()).toEqual({ ok: true });
      // …and the gate is really in front of the proxy: no session → 401.
      const res = await fetch(`http://127.0.0.1:${port}/chatfuel/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      expect(res.status).toBe(401);
    } finally {
      await gated.close();
    }
  });

  it('refuses to bind a socket strangers can reach while open mode is unacknowledged', async () => {
    const errors: string[] = [];
    const exposed = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '0.0.0.0',
      env: { CHATFUEL_TOKEN: TOKEN },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: (line) => errors.push(line),
    });
    await expect(exposed.listen()).rejects.toThrow(/REFUSING TO SERVE/);
    await exposed.close();
    expect(errors.some((line) => line.includes('open mode'))).toBe(true);

    // Acknowledged, the same server serves — and says once that it was meant to.
    const meant: string[] = [];
    const acknowledged = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '0.0.0.0',
      env: { CHATFUEL_TOKEN: TOKEN, CHATFUEL_OPEN_PROXY: '1' },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: (line) => meant.push(line),
    });
    await acknowledged.listen();
    await acknowledged.close();
    expect(meant.some((line) => line.includes('CHATFUEL_OPEN_PROXY=1'))).toBe(true);

    // The same server on loopback is the shape the refusal exists to distinguish.
    const local: string[] = [];
    const quiet = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '127.0.0.1',
      env: { CHATFUEL_TOKEN: TOKEN },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: (line) => local.push(line),
    });
    await quiet.listen();
    await quiet.close();
    expect(local).toEqual([]);
  });
});

describe('a sub-path mount', () => {
  let mounted: ChatfuelServer;
  let mountedBase: string;

  beforeAll(async () => {
    mounted = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '127.0.0.1',
      basePath: '/app',
      env: { CHATFUEL_TOKEN: TOKEN },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: () => undefined,
    });
    mountedBase = `http://127.0.0.1:${(await mounted.listen()).port}`;
  });

  afterAll(async () => {
    await mounted?.close();
  });

  it('normalizes whatever it is given', () => {
    expect(normalizeBasePath(undefined)).toBe('/');
    expect(normalizeBasePath('/app')).toBe('/app/');
    expect(normalizeBasePath('app/')).toBe('/app/');
  });

  it('reads a path below the mount point and refuses one outside it', () => {
    expect(pathUnderBase('/app/assets/a.js', '/app/')).toBe('/assets/a.js');
    expect(pathUnderBase('/app', '/app/')).toBe('/');
    expect(pathUnderBase('/apple/x', '/app/')).toBeUndefined();
    expect(pathUnderBase('/x', '/')).toBe('/x');
  });

  it('serves the app, its assets and its routes under the mount point', async () => {
    expect((await fetch(`${mountedBase}/app/`)).status).toBe(200);
    expect((await fetch(`${mountedBase}/app`)).status).toBe(200);
    expect((await fetch(`${mountedBase}/app/deals/board`)).status).toBe(200);
    const asset = await fetch(`${mountedBase}/app/assets/a.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('answers nothing outside the mount point', async () => {
    expect((await fetch(`${mountedBase}/`)).status).toBe(404);
    expect((await fetch(`${mountedBase}/deals`)).status).toBe(404);
  });

  it('leaves the proxy and the health route where they are', async () => {
    expect((await fetch(`${mountedBase}/chatfuel/healthz`)).status).toBe(200);
  });
});

describe('looksLikeAsset', () => {
  it('is true for hashed bundles and for extensions this server has a type for', () => {
    expect(looksLikeAsset('/assets/index-a1b2.js')).toBe(true);
    expect(looksLikeAsset('/favicon.svg')).toBe(true);
    expect(looksLikeAsset('/robots.txt')).toBe(true);
  });
  it('is false for a route, whatever it ends in', () => {
    expect(looksLikeAsset('/deals/board')).toBe(false);
    expect(looksLikeAsset('/contacts/acme.io')).toBe(false);
    expect(looksLikeAsset('/team/ann@acme.co')).toBe(false);
    expect(looksLikeAsset('/')).toBe(false);
  });
});

/*
 * The panel's origin, on the host that owns its own preflights. The Vite dev
 * server answers OPTIONS itself before any plugin sees it, so the assertion
 * that a neighbour is never handed the preflight blessing `x-cf-admin` belongs
 * here rather than beside the rest of the admin tests.
 */
describe('the admin panel answers its own origin only', () => {
  let panel: ChatfuelServer;
  let panelBase: string;

  beforeAll(async () => {
    panel = createChatfuelServer({
      distDir: dist,
      port: 0,
      host: '127.0.0.1',
      env: { CHATFUEL_TOKEN: TOKEN, ADMIN_PASSWORD: 'a-long-enough-admin-password', ALLOWED_ORIGINS: '*' },
      proxy: { upstream: upstream.url },
      log: () => undefined,
      logError: () => undefined,
    });
    panelBase = `http://127.0.0.1:${(await panel.listen()).port}`;
  });

  afterAll(async () => {
    await panel?.close();
  });

  it('refuses a neighbour on an admin route, and answers its preflight with the same refusal', async () => {
    const get = await fetch(`${panelBase}/chatfuel/admin/overview`, {
      headers: { 'x-cf-admin': '1', origin: 'https://old.example.com' },
    });
    expect(get.status).toBe(403);
    expect(get.headers.get('access-control-allow-origin')).toBe(null);

    const preflight = await fetch(`${panelBase}/chatfuel/admin/overview`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://old.example.com',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-cf-admin',
      },
    });
    expect(preflight.status).toBe(403);
    expect(preflight.headers.get('access-control-allow-headers')).toBe(null);
  });

  it('still answers the same neighbour on the app routes ALLOWED_ORIGINS opened', async () => {
    const preflight = await fetch(`${panelBase}/chatfuel/graphql`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://old.example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')).toContain('content-type');
  });
});
