import { connect } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { createServer as createViteServer, type Plugin, type ViteDevServer } from 'vite';
import {
  ChatfuelAuthError,
  ChatfuelGraphQLError,
  ChatfuelSessionError,
  createChatfuelClient,
} from '@chatfuel/api-client';
import * as core from '@chatfuel/api-client/generated/core';
import { BotsListDocument, CurrentUserDocument, MyBotRoleDocument } from '@chatfuel/api-client/generated/core';
import { UnseenOpenDialogsCountChangedDocument } from '@chatfuel/api-client/generated/livechat';
import { InstagramPublishReelDocument } from '@chatfuel/api-client/generated/publishing';
import { chatfuelProxy } from '../src/index';
import { MALFORMED_QUERY_MESSAGE } from '../src/queryAnalysis';
import { startMockUpstream, type MockUpstream } from './mock-upstream';
import { fakeJwt, startMockSupabase, type MockSupabase } from './mock-supabase';

const TOKEN = 'a1b2'.repeat(16); // a legacy 64-hex dashboard token

async function waitFor(cond: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timeout');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

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

/**
 * A raw graphql-transport-ws socket. createChatfuelClient always sends its
 * connection_init first and waits for the ack, so the frame orders a hostile
 * client can produce — a subscribe before the init, or one pipelined behind it
 * without waiting — are only reachable by driving the socket by hand.
 */
async function rawSocket(url: string) {
  const ws = new WebSocket(url, 'graphql-transport-ws');
  const frames: Array<{ id?: string; type?: string; payload?: unknown }> = [];
  const closed = new Promise<{ code: number; reason: string }>((resolve) => {
    ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
  });
  ws.on('error', () => undefined); // the close that follows carries the verdict
  ws.on('message', (data) => frames.push(JSON.parse(data.toString()) as (typeof frames)[number]));
  await new Promise<void>((resolve) => ws.on('open', resolve));
  return {
    frames,
    closed,
    send: (frame: unknown) => ws.send(JSON.stringify(frame)),
    /** For the frames a JSON serialiser cannot produce. */
    sendRaw: (frame: string) => ws.send(frame),
    close: () => ws.close(),
    /** Drop the connection without a closing handshake, the way a lost link does. */
    terminate: () => ws.terminate(),
    /** The code of the first `error` frame the relay answered with, if any. */
    errorCode: () => {
      const refusal = frames.find((frame) => frame.type === 'error');
      return (refusal?.payload as Array<{ extensions?: { code?: string } }> | undefined)?.[0]?.extensions?.code;
    },
  };
}

/** The one subscription the mock upstream answers, as text a raw socket can send. */
const UNSEEN_SUBSCRIPTION = 'subscription ($botID: BotID!) { unseenOpenDialogsCountChanged(botID: $botID) }';

let upstream: MockUpstream;
let vite: ViteDevServer;
let httpUrl: string;
let wsUrl: string;

beforeAll(async () => {
  upstream = await startMockUpstream();
  const booted = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN })]);
  vite = booted.vite;
  httpUrl = `http://127.0.0.1:${booted.port}/chatfuel/graphql`;
  wsUrl = `ws://127.0.0.1:${booted.port}/chatfuel/graphql`;
});

afterAll(async () => {
  await vite?.close();
  await upstream?.close();
});

describe('HTTP forward', () => {
  it('injects the real token and strips client Authorization/cookies', async () => {
    const hostile = createChatfuelClient({
      url: httpUrl,
      headers: { authorization: 'Bearer wrong', cookie: 'session=evil' },
    });
    await hostile.query(CurrentUserDocument, {});
    const seen = upstream.httpRequests.at(-1)!;
    expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(seen.headers.cookie).toBeUndefined();
    expect(seen.url).toBe('/graphql?op=CurrentUser');
    const body = JSON.parse(seen.body) as { operationName: string };
    expect(body.operationName).toBe('CurrentUser');
  });

  it('passes status and body through untouched (200-with-errors and non-2xx envelopes)', async () => {
    const client = createChatfuelClient({ url: httpUrl });
    upstream.respondWith(200, { data: null, errors: [{ message: 'nope', extensions: { code: 'X' } }] });
    const envelope = await client.execute(CurrentUserDocument, {});
    expect(envelope.errors?.[0]?.message).toBe('nope');

    upstream.respondWith(418, { data: null, errors: [{ message: 'teapot' }] });
    const teapot = await client.execute(CurrentUserDocument, {});
    expect(teapot.errors?.[0]?.message).toBe('teapot');
    upstream.respondWith(200, { data: { ok: true } });
  });

  it('forwards the REST api path with injected auth', async () => {
    const res = await fetch(
      `${httpUrl.replace('/chatfuel/graphql', '')}/chatfuel/api/filestorage/upload/livechat?fileType=Image&botID=b1`,
      {
        method: 'POST',
        body: 'file-bytes',
      },
    );
    expect(res.status).toBe(200);
    const seen = upstream.httpRequests.at(-1)!;
    expect(seen.url).toBe('/api/filestorage/upload/livechat?fileType=Image&botID=b1');
    expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(seen.body).toBe('file-bytes');
  });

  /*
   * Everything under {upstream}/api answers to the master token, and the fence
   * on this route reads one `botID` query parameter — so a path that carries
   * its bot some other way, or none at all, used to be forwarded with the
   * deployment's full authority and nothing to check it against.
   */
  it('forwards only the REST paths the app actually uses', async () => {
    const base = httpUrl.replace('/chatfuel/graphql', '');
    const before = upstream.httpRequests.length;
    for (const path of ['/chatfuel/api/bots', '/chatfuel/api/filestorage/upload', '/chatfuel/api/admin/accounts']) {
      const res = await fetch(`${base}${path}`, { method: 'POST', body: 'x' });
      expect(res.status).toBe(403);
      const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('RestPathNotAllowed');
    }
    expect(upstream.httpRequests.length).toBe(before);

    const upload = await fetch(`${base}/chatfuel/api/filestorage/upload/bot?fileType=Image&botID=b1`, {
      method: 'POST',
      body: 'file-bytes',
    });
    expect(upload.status).toBe(200);
    expect(upstream.httpRequests.at(-1)!.url).toBe('/api/filestorage/upload/bot?fileType=Image&botID=b1');
  });

  /*
   * …and an allowlisted path is only half of it: the fence reads `botID`, so a
   * bot-scoped upload that names no bot was forwarded under the master token
   * with nothing to check it against, landing wherever Chatfuel decided.
   */
  it('refuses a bot-scoped upload that names no bot', async () => {
    const base = httpUrl.replace('/chatfuel/graphql', '');
    const before = upstream.httpRequests.length;
    for (const path of ['/filestorage/upload/bot', '/filestorage/upload/livechat', '/filestorage/upload/widget']) {
      const res = await fetch(`${base}/chatfuel/api${path}?fileType=Image`, { method: 'POST', body: 'x' });
      expect(res.status, path).toBe(400);
      const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('InvalidRequest');
    }
    expect(upstream.httpRequests.length).toBe(before);
  });

  /* Every upload is a POST; anything else was forwarded as it arrived. */
  it('answers 405 for a REST method that is not POST, and forwards nothing', async () => {
    const base = httpUrl.replace('/chatfuel/graphql', '');
    const before = upstream.httpRequests.length;
    for (const method of ['GET', 'DELETE', 'PATCH']) {
      const res = await fetch(`${base}/chatfuel/api/filestorage/upload/bot?botID=b1`, { method });
      expect(res.status, method).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    }
    expect(upstream.httpRequests.length).toBe(before);
  });

  /*
   * A body a browser can send with no preflight is the whole cross-site
   * problem, so a GraphQL request has to look like one a preflight was asked
   * about: `application/json` and nothing else.
   */
  it('answers 415 for a GraphQL body that is not application/json', async () => {
    const before = upstream.httpRequests.length;
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
      const res = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'content-type': type },
        body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
      });
      expect(res.status, type).toBe(415);
      const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('UnsupportedMediaType');
    }
    expect(upstream.httpRequests.length).toBe(before);

    // The parameters of the one type that is allowed are not the type.
    const ok = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
    });
    expect(ok.status).toBe(200);
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  // A POST with no content-type at all is itself a simple request — the one
  // shape a page sends cross-site with no preflight and no header to declare.
  it('answers 415 for a GraphQL body with no content-type at all', async () => {
    const before = upstream.httpRequests.length;
    const res = await fetch(httpUrl, {
      method: 'POST',
      // undici sets text/plain for a string body, so the header is removed.
      headers: { 'content-type': '' },
      body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
    });
    expect(res.status).toBe(415);
    const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
    expect(envelope.errors[0]!.extensions.code).toBe('UnsupportedMediaType');
    expect(upstream.httpRequests.length).toBe(before);
  });

  /*
   * The proxy answers on the app's own origin under the master token, so a page
   * the operator happens to have open could drive it — a cross-site request
   * forgery against the deployment's full authority. Nothing downstream asks
   * which page sent a request; this is where it is asked.
   */
  describe('origin policy', () => {
    const base = () => httpUrl.replace('/chatfuel/graphql', '');
    const graphql = (headers: Record<string, string>) =>
      fetch(httpUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
      });

    it('refuses an origin this deployment does not serve, on every route', async () => {
      const before = upstream.httpRequests.length;
      const res = await graphql({ origin: 'https://evil.example.net' });
      expect(res.status).toBe(403);
      const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('ProxyOriginForbidden');

      const upload = await fetch(`${base()}/chatfuel/api/filestorage/upload/bot?botID=b1`, {
        method: 'POST',
        body: 'x',
        headers: { origin: 'https://evil.example.net' },
      });
      expect(upload.status).toBe(403);
      expect(upstream.httpRequests.length).toBe(before);
    });

    /* Fetch Metadata is written by the browser and script cannot forge it. */
    it('reads sec-fetch-site, and refuses a cross-site request that hides its origin', async () => {
      const before = upstream.httpRequests.length;
      const hidden = await graphql({ 'sec-fetch-site': 'cross-site' });
      expect(hidden.status).toBe(403);
      expect(upstream.httpRequests.length).toBe(before);

      // The browser's own word that this is not cross-site is enough.
      const same = await graphql({ origin: 'https://evil.example.net', 'sec-fetch-site': 'same-origin' });
      expect(same.status).toBe(200);
      expect(upstream.httpRequests.length).toBe(before + 1);
    });

    /* A request with no Origin and no Fetch Metadata is not a browser at all. */
    it('leaves a non-browser caller alone', async () => {
      expect((await graphql({})).status).toBe(200);
      expect(
        (await graphql({ origin: `http://127.0.0.1${new URL(base()).port ? `:${new URL(base()).port}` : ''}` })).status,
      ).toBe(200);
    });

    it('serves a listed origin, with the CORS headers that let it read the answer', async () => {
      const { vite: listed, port } = await bootVite([
        chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedOrigins: 'https://app.example.com' }),
      ]);
      try {
        const url = `http://127.0.0.1:${port}/chatfuel/graphql`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://app.example.com' },
          body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }' }),
        });
        expect(res.status).toBe(200);
        expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
        expect(res.headers.get('access-control-allow-credentials')).toBe('true');
        expect(res.headers.get('vary')).toBe('origin');

        // …and its preflight is answered without the route ever running.
        const before = upstream.httpRequests.length;
        const preflight = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            origin: 'https://app.example.com',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'authorization, content-type',
          },
        });
        expect(preflight.status).toBe(204);
        expect(preflight.headers.get('access-control-allow-headers')).toContain('authorization');
        expect(upstream.httpRequests.length).toBe(before);

        // Another origin is still refused, listed neighbour or not.
        const other = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://app.example.com.evil.net' },
          body: '{}',
        });
        expect(other.status).toBe(403);
      } finally {
        await listed.close();
      }
    });
  });

  /*
   * The origin check above cannot answer for the host, and this is why.
   *
   * A name the caller owns, pointed at this server, arrives with an `Origin`
   * and a `Host` that agree with each other honestly — the page really was
   * served from `evil.example`, and the socket really was opened to it. That is
   * DNS rebinding, and the origin check passes it. Only knowing our own names
   * refuses it, and the dev server knows them because it is bound to loopback.
   */
  describe('host policy', () => {
    /* fetch() writes Host from the URL, so a rebound request has to be spelled
       out by hand — which is also the only way to reach the upgrade listener. */
    const raw = (port: number, headers: Record<string, string>): Promise<string> =>
      new Promise((resolveLine, reject) => {
        const socket = connect(port, '127.0.0.1', () => {
          const lines = Object.entries(headers).map(([k, v]) => `${k}: ${v}`);
          socket.write(`GET /chatfuel/graphql HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`);
        });
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error('raw request timeout'));
        });
        socket.once('data', (chunk: Buffer) => {
          resolveLine(chunk.toString('utf8').split('\r\n')[0] ?? '');
          socket.destroy();
        });
        socket.once('error', reject);
      });

    const upgradeHeaders = (host: string) => ({
      host,
      origin: `http://${host}`,
      upgrade: 'websocket',
      connection: 'Upgrade',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'sec-websocket-version': '13',
      'sec-websocket-protocol': 'graphql-transport-ws',
    });

    it('refuses a rebound WebSocket upgrade — the listener middleware never sees', async () => {
      const { vite, port } = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN })]);
      try {
        const before = upstream.wsConnections;
        expect(await raw(port, upgradeHeaders('evil.example'))).toContain('403');
        // And the same socket, addressed honestly, is upgraded.
        expect(await raw(port, upgradeHeaders(`127.0.0.1:${port}`))).toContain('101');
        // Refused before the relay, so no upstream socket was ever opened for it.
        expect(upstream.wsConnections).toBe(before);
      } finally {
        await vite.close();
      }
    });

    /* `Host` is a forbidden header name to fetch(), so this one is spelled out
       by hand as well — which is the point: only a client that is not a browser
       API can write it, and an attacker's page is driving a real browser. */
    const rawPost = (port: number, host: string): Promise<string> =>
      new Promise((resolveBody, reject) => {
        const body = JSON.stringify({ query: 'query { bot(id: "b1") { id } }' });
        const chunks: Buffer[] = [];
        const socket = connect(port, '127.0.0.1', () => {
          socket.write(
            `POST /chatfuel/graphql HTTP/1.1\r\nhost: ${host}\r\norigin: http://${host}\r\n` +
              `content-type: application/json\r\ncontent-length: ${Buffer.byteLength(body)}\r\n` +
              `connection: close\r\n\r\n${body}`,
          );
        });
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error('raw post timeout'));
        });
        socket.on('data', (chunk: Buffer) => chunks.push(chunk));
        socket.once('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
        socket.once('error', reject);
      });

    /*
     * On this host the HTTP side was never the hole: Vite runs its own host
     * check in middleware and answers the rebound request itself, which is
     * exactly why the upgrade above was the one that got through — that
     * listener is on the bare httpServer and no middleware runs for it.
     *
     * The refusal is still asserted here rather than assumed, because "Vite
     * covers it" is a fact about a dependency, and the day it stops being true
     * is a day this suite should fail. What the proxy's own answer looks like
     * is a unit test (units.test.ts), where the other two hosts live.
     */
    it('is refused on the HTTP side too, whoever answers first', async () => {
      const { vite, port } = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN })]);
      try {
        const before = upstream.httpRequests.length;
        expect(await rawPost(port, 'evil.example')).toContain('403');
        expect(upstream.httpRequests.length).toBe(before);

        // The same request to a name this server does answer to goes through.
        expect(await rawPost(port, `127.0.0.1:${port}`)).toContain('200');
        expect(upstream.httpRequests.length).toBe(before + 1);
      } finally {
        await vite.close();
      }
    });

    it('answers to a name the deployment claimed, and to loopback whatever it claimed', async () => {
      const { vite, port } = await bootVite([
        chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedHosts: 'app.example.com' }),
      ]);
      try {
        expect(await raw(port, upgradeHeaders('app.example.com'))).toContain('101');
        expect(await raw(port, upgradeHeaders(`localhost:${port}`))).toContain('101');
        expect(await raw(port, upgradeHeaders('evil.example'))).toContain('403');
      } finally {
        await vite.close();
      }
    });

    /* A tunnel changes its name every run, so there is an off switch — and it
       is off for both ways in at once, never for one of them. */
    it("takes '*' as the operator turning the check off", async () => {
      const { vite, port } = await bootVite([
        chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedHosts: '*' }),
      ]);
      try {
        expect(await raw(port, upgradeHeaders('anything.ngrok.io'))).toContain('101');
      } finally {
        await vite.close();
      }
    });

    /* PUBLIC_URL and ALLOWED_ORIGINS already name hosts this deployment answers
       to. Making the operator write them a third time is how a list goes stale. */
    it('reads the names ALLOWED_ORIGINS and PUBLIC_URL already gave it', async () => {
      const { vite, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          allowedOrigins: 'https://app.example.com',
          publicUrl: 'https://posts.example.com',
        }),
      ]);
      try {
        expect(await raw(port, upgradeHeaders('app.example.com'))).toContain('101');
        expect(await raw(port, upgradeHeaders('posts.example.com'))).toContain('101');
        expect(await raw(port, upgradeHeaders('evil.example'))).toContain('403');
      } finally {
        await vite.close();
      }
    });
  });

  /*
   * An upload is read into memory before it is forwarded, so N uploads is N
   * bodies the proxy is holding. The cap is what keeps "a lot of uploads" from
   * being "the process is out of memory".
   */
  it('answers 503 ProxyBusy past the REST concurrency cap, and asks the caller to come back', async () => {
    const { vite: capped, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, restMaxConcurrent: 1 }),
    ]);
    upstream.respondAfter(300);
    try {
      const url = `http://127.0.0.1:${port}/chatfuel/api/filestorage/upload/bot?botID=b1`;
      const first = fetch(url, { method: 'POST', body: 'file-bytes' });
      await waitFor(() => upstream.httpRequests.at(-1)?.url.includes('/filestorage/upload/bot') === true);
      const second = await fetch(url, { method: 'POST', body: 'file-bytes' });
      expect(second.status).toBe(503);
      expect(second.headers.get('retry-after')).toBe('5');
      const envelope = (await second.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('ProxyBusy');
      expect((await first).status).toBe(200);

      // The slot is given back, so the next caller is not refused forever.
      const third = await fetch(url, { method: 'POST', body: 'file-bytes' });
      expect(third.status).toBe(200);
    } finally {
      upstream.respondAfter(0);
      await capped.close();
    }
  });

  /*
   * The same ceiling on the other route. A GraphQL body is small, but the
   * request holds an upstream connection for as long as Chatfuel takes to
   * answer, and how many of those there are was the caller's to decide.
   */
  it('answers 503 ProxyBusy past the GraphQL concurrency cap, and gives the slot back', async () => {
    const { vite: capped, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, graphqlMaxConcurrent: 1 }),
    ]);
    upstream.respondAfter(300);
    try {
      const url = `http://127.0.0.1:${port}/chatfuel/graphql`;
      const send = () =>
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: '{ bot(id: "b1") { id } }' }),
        });
      const first = send();
      await waitFor(() => upstream.httpRequests.at(-1)?.url.includes('/graphql') === true);
      const second = await send();
      expect(second.status).toBe(503);
      expect(second.headers.get('retry-after')).toBe('5');
      const envelope = (await second.json()) as { errors: Array<{ extensions: { code: string } }> };
      expect(envelope.errors[0]!.extensions.code).toBe('ProxyBusy');
      expect((await first).status).toBe(200);

      const third = await send();
      expect(third.status).toBe(200);
    } finally {
      upstream.respondAfter(0);
      await capped.close();
    }
  });

  /*
   * The body is held in memory to be parsed before any fence can speak for it,
   * so an uncapped read let the caller decide how much memory the proxy spent —
   * before it had been admitted, fenced, or even understood.
   */
  it('refuses a GraphQL body past the ceiling, and forwards nothing', async () => {
    const before = upstream.httpRequests.length;
    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'query { bot(id: "b1") { id } }',
        variables: { padding: 'x'.repeat(3 * 1024 * 1024) },
      }),
    });
    expect(res.status).toBe(413);
    const envelope = (await res.json()) as { errors: Array<{ extensions: { code: string } }> };
    expect(envelope.errors[0]!.extensions.code).toBe('RequestTooLarge');
    expect(upstream.httpRequests.length).toBe(before);

    // …and an ordinary body of the same shape still goes through.
    const ok = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'query { bot(id: "b1") { id } }', variables: { padding: 'x'.repeat(1024) } }),
    });
    expect(ok.status).toBe(200);
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  it('accepts a token of any shape — the token page decides, not this plugin', async () => {
    const opaque = 'cf-tok_9zQx.Ab-Cd~2026';
    const { vite: other, port } = await bootVite([chatfuelProxy({ upstream: upstream.url, token: opaque })]);
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      await client.query(CurrentUserDocument, {});
      expect(upstream.httpRequests.at(-1)!.headers.authorization).toBe(`Bearer ${opaque}`);
    } finally {
      await other.close();
    }
  });

  it('answers with a synthetic envelope when the token is missing', async () => {
    const { vite: bare, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, tokenEnv: 'CHATFUEL_TOKEN_TEST_MISSING' }),
    ]);
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      const err = await client.query(CurrentUserDocument, {}).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ChatfuelGraphQLError);
      expect((err as ChatfuelGraphQLError).code).toBe('ProxyTokenMissing');
    } finally {
      await bare.close();
    }
  });
});

describe('slow upstream budget', () => {
  /**
   * A publish that waits on Instagram's transcoder gets `slowTimeoutMs`; every
   * other operation keeps the ordinary one. Both numbers are shrunk here so the
   * difference can be seen in under a second — what is being tested is which
   * budget the request picked, not how long either of them is.
   */
  let slowUpstream: MockUpstream;
  let slowVite: ViteDevServer;
  let slowUrl: string;

  beforeAll(async () => {
    slowUpstream = await startMockUpstream();
    const booted = await bootVite([
      // 'any' — the fence is not what is under test here, and it would
      // otherwise be asking this same delayed upstream who owns the bot.
      chatfuelProxy({
        upstream: slowUpstream.url,
        token: TOKEN,
        allowedBotIds: 'any',
        timeoutMs: 100,
        slowTimeoutMs: 4000,
      }),
    ]);
    slowVite = booted.vite;
    slowUrl = `http://127.0.0.1:${booted.port}/chatfuel/graphql`;
    slowUpstream.respondAfter(600);
  });

  afterAll(async () => {
    await slowVite?.close();
    await slowUpstream?.close();
  });

  it('gives up on an ordinary operation that outruns timeoutMs', async () => {
    const client = createChatfuelClient({ url: slowUrl });
    const err = await client.query(CurrentUserDocument, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelGraphQLError);
    expect((err as ChatfuelGraphQLError).code).toBe('ProxyUpstreamUnavailable');
  });

  it('waits out a publish mutation that would have outrun it', async () => {
    const client = createChatfuelClient({ url: slowUrl });
    slowUpstream.respondWith(200, {
      data: { instagramAccountPublishReel: { id: 'media-1', permalink: 'https://example.com/p/1' } },
    });
    const data = await client.mutate(InstagramPublishReelDocument, {
      botID: 'bot-1',
      input: { videoURL: 'https://example.com/reel.mp4' },
    });
    expect(data.instagramAccountPublishReel.id).toBe('media-1');
  });
});

/**
 * Every shape here reached the upstream unfenced while the fence read the query
 * as text. The master token is account-wide, so an unfenced request is another
 * customer's bot answered under the deployment's own authority.
 */
describe('crafted operations cannot slip past the fence', () => {
  const VICTIM = 'bot-foreign';

  async function withFencedProxy(run: (base: string, port: number) => Promise<void>): Promise<void> {
    const { vite: fenced, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedBotIds: ['bot-allowed'] }),
    ]);
    try {
      await run(`http://127.0.0.1:${port}/chatfuel/graphql`, port);
    } finally {
      await fenced.close();
    }
  }

  async function post(base: string, body: unknown) {
    const seen = upstream.httpRequests.length;
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const payload = (await res.json()) as { errors?: { extensions?: { code?: string } }[] };
    return {
      status: res.status,
      code: payload.errors?.[0]?.extensions?.code,
      forwarded: upstream.httpRequests.length - seen,
    };
  }

  it('refuses a bot named by an inline literal, a renamed variable, a default, or an input object', async () => {
    await withFencedProxy(async (base) => {
      const crafted: [string, unknown][] = [
        ['inline literal', { query: `query { bot(id: "${VICTIM}") { id title } }` }],
        [
          'renamed variable on a field argument',
          { query: 'mutation M($z: BotID!) { botDisconnectContactScope(botID: $z) { id } }', variables: { z: VICTIM } },
        ],
        ['variable default value', { query: `query Q($b: BotID! = "${VICTIM}") { bot(id: $b) { id } }` }],
        [
          'bot id nested in an input object',
          {
            query: 'mutation M($input: I!) { botUpdate(input: $input) { id } }',
            variables: { input: { botID: VICTIM } },
          },
        ],
        [
          'bot id named inside a fragment',
          { query: `query { ...f } fragment f on Query { bot(id: "${VICTIM}") { id } }` },
        ],
        [
          // Three fields in the schema take a BotID under a name that is not
          // `botID`, and all three call it `id`. Only one of them is `bot`.
          'a BotID argument the schema does not call botID',
          { query: `mutation { botInstagramRefetchLatestMedias(id: "${VICTIM}", count: 5) { id } }` },
        ],
      ];
      for (const [what, body] of crafted) {
        const answer = await post(base, body);
        expect(answer, what).toMatchObject({ status: 403, code: 'BotNotAllowed', forwarded: 0 });
      }
    });
  });

  it('refuses a bot id written as a number, and one no fence can be asked about', async () => {
    await withFencedProxy(async (base) => {
      // A literal number is read as the digits it was written with, so the
      // fence gets a real question and answers it.
      expect(await post(base, { query: 'query { bot(id: 999) { id } }' })).toMatchObject({
        status: 403,
        code: 'BotNotAllowed',
        forwarded: 0,
      });
      // A runtime value that is not a string is not a bot id the fence can
      // hold — it stops here rather than going upstream unchecked.
      expect(
        await post(base, { query: 'query Q($b: BotID!) { bot(id: $b) { id } }', variables: { b: 999 } }),
      ).toMatchObject({ status: 400, code: 'ProxyMalformedQuery', forwarded: 0 });
    });
  });

  it('refuses a body it cannot read instead of forwarding it under the token', async () => {
    await withFencedProxy(async (base) => {
      expect(await post(base, 'not json at all')).toMatchObject({
        status: 400,
        code: 'ProxyMalformedQuery',
        forwarded: 0,
      });
      expect(await post(base, { query: 'query { bot(id: ' })).toMatchObject({
        status: 400,
        code: 'ProxyMalformedQuery',
        forwarded: 0,
      });
    });
  });

  it('refuses a subscription whose bot argument the schema does not call botID', async () => {
    await withFencedProxy(async (_base, port) => {
      const sock = await rawSocket(`ws://127.0.0.1:${port}/chatfuel/graphql`);
      sock.send({ type: 'connection_init', payload: {} });
      sock.send({
        id: '1',
        type: 'subscribe',
        payload: { query: `subscription { botInstagramMediaAdded(id: "${VICTIM}") { id } }` },
      });
      await waitFor(() => sock.errorCode() !== undefined);
      expect(sock.errorCode()).toBe('BotNotAllowed');
      expect(sock.frames.some((frame) => frame.type === 'next')).toBe(false);
      sock.close();
    });
  });

  /*
   * The fence answers one question — is this bot yours — so an operation that
   * names no bot passes it. For the operations addressed to the Chatfuel
   * ACCOUNT behind the deployment that is the master token being handed over:
   * createPublicAPIToken alone mints a credential outliving every session.
   */
  it('refuses an account-level operation, however it is written', async () => {
    await withFencedProxy(async (base) => {
      const crafted: [string, unknown][] = [
        ['plain', { query: 'mutation { createPublicAPIToken { token } }' }],
        ['aliased', { query: 'mutation { mine: createPublicAPIToken { token } }' }],
        ['behind a fragment spread', { query: 'mutation { ...f } fragment f on Mutation { revokePublicAPIToken }' }],
        ['membership, addressed by member id', { query: 'mutation { removeMemberFromBot(memberID: "m-1") }' }],
        ['batched behind an innocent entry', [{ query: 'query { me { id } }' }, { query: 'mutation { logout }' }]],
      ];
      for (const [what, body] of crafted) {
        const answer = await post(base, body);
        expect(answer, what).toMatchObject({ status: 403, code: 'AccountOperationBlocked', forwarded: 0 });
      }
    });
  });

  /*
   * Introspection names no bot either, so the fence passes it — and what it
   * answers with is the shape of the whole API behind the master token, not
   * anything this deployment's caller owns. Nothing in the repository asks the
   * proxy for it: the client is generated from the bundled SDL snapshot
   * (content/api-client/codegen.ts reads the core skill's references/schema.graphql).
   */
  it('refuses introspection, however it is written', async () => {
    await withFencedProxy(async (base) => {
      const crafted: [string, unknown][] = [
        ['plain', { query: 'query { __schema { types { name } } }' }],
        ['aliased', { query: 'query { s: __schema { queryType { name } } }' }],
        ['a single type', { query: 'query { __type(name: "Bot") { fields { name } } }' }],
        ['behind a fragment spread', { query: 'query { ...f } fragment f on Query { __schema { types { name } } }' }],
        [
          'batched behind an innocent entry',
          [{ query: 'query { me { id } }' }, { query: 'query { __schema { types { name } } }' }],
        ],
      ];
      for (const [what, body] of crafted) {
        const answer = await post(base, body);
        expect(answer, what).toMatchObject({ status: 403, code: 'IntrospectionBlocked', forwarded: 0 });
      }
    });
  });

  // __typename is not introspection: every generated operation selects it, so a
  // check that caught it would refuse the whole app.
  it('still forwards __typename', async () => {
    await withFencedProxy(async (base) => {
      expect(await post(base, { query: 'query { __typename }' })).toMatchObject({ status: 200, forwarded: 1 });
    });
  });

  // The denylist must not become a blanket refusal of everything unfenced: an
  // operation that names no bot because it needs none is still the app's.
  it('still forwards an ordinary operation that names no bot', async () => {
    await withFencedProxy(async (base) => {
      expect(await post(base, { query: 'mutation { setUserStorageItem(id: "seen-tour", value: "1") }' })).toMatchObject(
        { status: 200, forwarded: 1 },
      );
    });
  });

  // The other half of the same fence: knowing those three fields must not turn
  // into refusing the one the app calls on every screen.
  it('still forwards bot(id:) for a bot the fence allows', async () => {
    await withFencedProxy(async (base) => {
      expect(await post(base, { query: 'query { bot(id: "bot-allowed") { id title } }' })).toMatchObject({
        status: 200,
        forwarded: 1,
      });
    });
  });

  it('refuses a crafted WS subscribe, which the relay used to pass through unread', async () => {
    await withFencedProxy(async (_base, port) => {
      const code = await new Promise<string | undefined>((resolve, reject) => {
        const sock = new WebSocket(`ws://127.0.0.1:${port}/chatfuel/graphql`, 'graphql-transport-ws');
        const fail = setTimeout(() => reject(new Error('no answer from the relay')), 5000);
        sock.on('open', () => sock.send(JSON.stringify({ type: 'connection_init' })));
        sock.on('message', (raw) => {
          const msg = JSON.parse(raw.toString()) as { type?: string; payload?: { extensions?: { code?: string } }[] };
          if (msg.type === 'connection_ack') {
            sock.send(
              JSON.stringify({
                id: '1',
                type: 'subscribe',
                payload: {
                  query: 'subscription S($z: BotID!) { unseenOpenDialogsCountChanged(botID: $z) }',
                  variables: { z: VICTIM },
                },
              }),
            );
            return;
          }
          if (msg.type === 'error') {
            clearTimeout(fail);
            sock.close();
            resolve(msg.payload?.[0]?.extensions?.code);
          }
        });
        sock.on('error', reject);
      });
      expect(code).toBe('BotNotAllowed');
    });
  });
});

describe('allowedBotIds fence', () => {
  it('blocks HTTP operations and WS subscribes for bots outside the allowlist', async () => {
    const { vite: fenced, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedBotIds: ['bot-allowed'] }),
    ]);
    try {
      const base = `http://127.0.0.1:${port}/chatfuel/graphql`;
      const client = createChatfuelClient({
        url: base,
        wsUrl: `ws://127.0.0.1:${port}/chatfuel/graphql`,
        webSocketImpl: WebSocket,
      });

      // HTTP: allowed botID forwards, foreign botID gets a 403 envelope.
      const httpSeen = upstream.httpRequests.length;
      await client
        .query(UnseenOpenDialogsCountChangedDocument as never, { botID: 'bot-allowed' } as never)
        .catch(() => undefined);
      expect(upstream.httpRequests.length).toBe(httpSeen + 1);
      const err = await client
        .query(UnseenOpenDialogsCountChangedDocument as never, { botID: 'bot-foreign' } as never)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ChatfuelGraphQLError);
      expect((err as ChatfuelGraphQLError).code).toBe('BotNotAllowed');
      expect(upstream.httpRequests.length).toBe(httpSeen + 1); // never forwarded

      // Ops without botID (CurrentUser) pass the fence.
      await client.query(CurrentUserDocument, {});

      // WS: foreign-bot subscribe answered with a per-subscription error frame.
      const wsErr = await new Promise<unknown>((resolve) => {
        client.subscribe(
          UnseenOpenDialogsCountChangedDocument,
          { botID: 'bot-foreign' },
          {
            next: () => undefined,
            error: resolve,
          },
        );
      });
      expect(wsErr).toBeInstanceOf(ChatfuelGraphQLError);
      expect((wsErr as ChatfuelGraphQLError).code).toBe('BotNotAllowed');

      // Allowed-bot subscribe still streams from the mock upstream.
      const value = await new Promise<unknown>((resolve, reject) => {
        client.subscribe(
          UnseenOpenDialogsCountChangedDocument,
          { botID: 'bot-allowed' },
          {
            next: (d) => resolve(d.unseenOpenDialogsCountChanged),
            error: reject,
          },
        );
      });
      expect(value).toBe(1);
      await client.dispose();
    } finally {
      await fenced.close();
    }
  });

  it('blocks REST api calls whose botID query param is foreign', async () => {
    const { vite: fenced, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedBotIds: ['bot-allowed'] }),
    ]);
    try {
      const blocked = await fetch(
        `http://127.0.0.1:${port}/chatfuel/api/filestorage/upload/livechat?fileType=Image&botID=bot-foreign`,
        { method: 'POST', body: 'x' },
      );
      expect(blocked.status).toBe(403);
      const ok = await fetch(
        `http://127.0.0.1:${port}/chatfuel/api/filestorage/upload/livechat?fileType=Image&botID=bot-allowed`,
        { method: 'POST', body: 'x' },
      );
      expect(ok.status).toBe(200);
    } finally {
      await fenced.close();
    }
  });

  it('refuses a REST call that names two bots, and fences the lower-cased spelling too', async () => {
    const { vite: fenced, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, allowedBotIds: ['bot-allowed'] }),
    ]);
    const rest = (query: string) =>
      fetch(`http://127.0.0.1:${port}/chatfuel/api/filestorage/upload/livechat?${query}`, {
        method: 'POST',
        body: 'x',
      });
    try {
      // Allowed first so a first-match read would wave it through, then the
      // other way round so a last-match read would too.
      const smuggled = await rest('fileType=Image&botID=bot-allowed&botID=bot-foreign');
      expect(smuggled.status).toBe(400);
      const reversed = await rest('fileType=Image&botID=bot-foreign&botID=bot-allowed');
      expect(reversed.status).toBe(400);
      // A spelling the old regex did not recognise at all.
      const lower = await rest('fileType=Image&botid=bot-foreign');
      expect(lower.status).toBe(403);
      expect((await rest('fileType=Image&botid=bot-allowed')).status).toBe(200);
      // Percent-encoding is decoded once, the way the receiver decodes it.
      expect((await rest('fileType=Image&botID=bot%2Dforeign')).status).toBe(403);
    } finally {
      await fenced.close();
    }
  });
});

describe('deployment fence (the account\u2019s own workspaces)', () => {
  /**
   * With no explicit allowlist the fence is the deployer's account: every bot
   * in every workspace it owns, asked for at request time. The point of the
   * whole arrangement is the third test — a bot created after the app went up.
   */
  const bootFenced = () =>
    bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN, fence: { ttlMs: 50, retryMs: 10 } })]);

  afterEach(() => {
    upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1', 'bot-owner', 'bot-colleague'] }]);
  });

  it('forwards a bot of the account and refuses one outside it', async () => {
    upstream.setWorkspaces([
      { id: 'ws-1', bots: ['b1'] },
      { id: 'ws-2', bots: ['b2'] },
    ]);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      const seen = upstream.httpRequests.length;
      // Either workspace of the account is fine — this is not a one-workspace fence.
      await client.query(MyBotRoleDocument, { botID: 'b2' });
      expect(upstream.httpRequests.length).toBe(seen + 1);

      const err = await client.query(MyBotRoleDocument, { botID: 'bot-foreign' }).catch((e: unknown) => e);
      expect((err as ChatfuelGraphQLError).code).toBe('BotNotAllowed');
      expect(upstream.httpRequests.length).toBe(seen + 1); // never forwarded
    } finally {
      await fenced.close();
    }
  });

  it('asks once for a burst of requests', async () => {
    upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1'] }]);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      await Promise.all([
        client.query(MyBotRoleDocument, { botID: 'b1' }),
        client.query(MyBotRoleDocument, { botID: 'b1' }),
        client.query(MyBotRoleDocument, { botID: 'b1' }),
      ]);
      expect(upstream.fenceRequests).toBe(1);
    } finally {
      await fenced.close();
    }
  });

  it('picks up a bot created after the deployment went up', async () => {
    upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1'] }]);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      const before = await client.query(MyBotRoleDocument, { botID: 'bot-new' }).catch((e: unknown) => e);
      expect((before as ChatfuelGraphQLError).code).toBe('BotNotAllowed');

      upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1', 'bot-new'] }]);
      await new Promise((resolve) => setTimeout(resolve, 60)); // past the TTL
      await client.query(MyBotRoleDocument, { botID: 'bot-new' });
    } finally {
      await fenced.close();
    }
  });

  it('refuses rather than guessing when the account cannot be asked at all', async () => {
    upstream.setWorkspaces(null);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      const err = await client.query(MyBotRoleDocument, { botID: 'b1' }).catch((e: unknown) => e);
      expect((err as ChatfuelGraphQLError).code).toBe('ProxyFenceUnavailable');
    } finally {
      await fenced.close();
    }
  });

  it('still forwards a query that names no bot when the account cannot be asked', async () => {
    // The picker's own query is how the app recovers from this state; refusing
    // it would turn a Chatfuel blip into a dead app.
    upstream.setWorkspaces(null);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({ url: `http://127.0.0.1:${port}/chatfuel/graphql` });
      const seen = upstream.httpRequests.length;
      await client.query(CurrentUserDocument, {});
      expect(upstream.httpRequests.length).toBe(seen + 1);
    } finally {
      await fenced.close();
    }
  });

  it('refuses a WS subscribe for a bot outside the account', async () => {
    upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1'] }]);
    const { vite: fenced, port } = await bootFenced();
    try {
      const client = createChatfuelClient({
        url: `http://127.0.0.1:${port}/chatfuel/graphql`,
        wsUrl: `ws://127.0.0.1:${port}/chatfuel/graphql`,
        webSocketImpl: WebSocket,
      });
      const wsErr = await new Promise<unknown>((resolve) => {
        client.subscribe(
          UnseenOpenDialogsCountChangedDocument,
          { botID: 'bot-foreign' },
          {
            next: () => undefined,
            error: resolve,
          },
        );
      });
      expect((wsErr as ChatfuelGraphQLError).code).toBe('BotNotAllowed');

      const value = await new Promise<unknown>((resolve, reject) => {
        client.subscribe(
          UnseenOpenDialogsCountChangedDocument,
          { botID: 'b1' },
          {
            next: (d) => resolve(d.unseenOpenDialogsCountChanged),
            error: reject,
          },
        );
      });
      expect(value).toBe(1);
      await client.dispose();
    } finally {
      await fenced.close();
    }
  });
});

describe('WS relay', () => {
  /*
   * The frames a client pipelines behind its connection_init are held until the
   * upstream socket is open. Flushing them there put them on the master-token
   * socket having passed no fence at all: the fence is not known until the gate
   * has answered, which is after the held frame arrived.
   */
  it('a subscribe sent BEFORE connection_init closes the socket, and opens none upstream', async () => {
    const before = upstream.wsConnections;
    const sock = await rawSocket(wsUrl);
    sock.send({
      id: '1',
      type: 'subscribe',
      payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'bot-foreign' } },
    });
    expect(await sock.closed).toEqual({ code: 4401, reason: 'Unauthorized' });
    expect(sock.frames).toEqual([]);
    expect(upstream.wsConnections).toBe(before);
  });

  /*
   * The per-socket subscription ceiling counted entries in a map keyed by the
   * client's own id, and it was consulted only for a `subscribe` whose id was a
   * string — while the relay forwarded the frame either way. So a client that
   * left the id off opened live streams upstream, under the master token, that
   * nothing on this side ever counted.
   */
  it('a subscribe with no id is refused and opens nothing upstream', async () => {
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
    const before = upstream.wsFrames.length;
    sock.send({ type: 'subscribe', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
    expect((await sock.closed).code).toBe(4400);
    expect(upstream.wsFrames.slice(before).filter((frame) => frame.includes('"subscribe"'))).toHaveLength(0);
  });

  it('and neither does one whose id is a number', async () => {
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
    const before = upstream.wsFrames.length;
    sock.send({ id: 7, type: 'subscribe', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
    expect((await sock.closed).code).toBe(4400);
    expect(upstream.wsFrames.slice(before).filter((frame) => frame.includes('"subscribe"'))).toHaveLength(0);
  });

  it('a subscribe pipelined behind connection_init is fenced when it is flushed', async () => {
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    sock.send({
      id: '1',
      type: 'subscribe',
      payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'bot-foreign' } },
    });
    await waitFor(() => sock.errorCode() !== undefined);
    expect(sock.errorCode()).toBe('BotNotAllowed');
    expect(sock.frames.some((frame) => frame.type === 'next')).toBe(false);
    sock.close();
  });

  it('the same pipelining still relays a bot the fence allows', async () => {
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    sock.send({ id: '1', type: 'subscribe', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
    await waitFor(() => sock.frames.filter((frame) => frame.type === 'next').length === 2);
    expect(sock.errorCode()).toBeUndefined();
    sock.close();
  });

  /*
   * Every path that relays an upstream envelope runs it through the same scrub,
   * the socket included: a failing subscription is exactly when the upstream
   * produces a message written for the account rather than for the caller.
   */
  it('keeps an internal service name out of the frames it relays', async () => {
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });

    upstream.answerNextSubscribeWith({
      type: 'error',
      payload: [{ message: "Failed to fetch from Subgraph 'svc-alpha'." }],
    });
    sock.send({ id: '1', type: 'subscribe', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
    await waitFor(() => sock.frames.some((frame) => frame.type === 'error'));
    const refusal = sock.frames.find((frame) => frame.type === 'error')!;
    expect(JSON.stringify(refusal)).not.toContain('svc-alpha');
    const entries = refusal.payload as Array<{ message: string; extensions?: { code?: string } }>;
    expect(entries[0]!.message).toBe('The upstream service rejected the request.');
    expect(entries[0]!.extensions?.code).toBe('UpstreamServiceError');

    // The same name inside an ordinary `next` envelope's errors array.
    upstream.answerNextSubscribeWith({
      type: 'next',
      payload: { data: null, errors: [{ message: "Failed to fetch from Subgraph 'svc-beta'." }] },
    });
    sock.send({ id: '2', type: 'subscribe', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
    await waitFor(() => sock.frames.some((frame) => frame.id === '2'));
    const next = sock.frames.find((frame) => frame.id === '2')!;
    expect(JSON.stringify(next)).not.toContain('svc-beta');
    expect(JSON.stringify(next)).toContain('The upstream service rejected the request.');
    sock.close();
  });

  /*
   * The relay's own invariant — what it cannot read it does not forward under
   * the master token — held for binary frames and for the HTTP path, but text
   * frames were filtered by `type !== 'subscribe'`: an unreadable one parsed to
   * {}, missed the fence, and went upstream unread.
   */
  describe('only frames this relay can read reach the master-token socket', () => {
    /** A socket past the gate, with the upstream's ack already relayed back. */
    async function initialised() {
      const sock = await rawSocket(wsUrl);
      sock.send({ type: 'connection_init', payload: {} });
      await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
      return sock;
    }

    it('closes 4400 on a frame that is not JSON, and forwards nothing', async () => {
      const sock = await initialised();
      const before = upstream.wsFrames.length;
      sock.sendRaw('{');
      expect(await sock.closed).toEqual({ code: 4400, reason: MALFORMED_QUERY_MESSAGE });
      expect(upstream.wsFrames.length).toBe(before);
    });

    it('closes 4400 on a type it does not know, however well-formed the payload', async () => {
      const sock = await initialised();
      const before = upstream.wsFrames.length;
      sock.send({ id: '1', type: 'mutate', payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: 'b1' } } });
      expect(await sock.closed).toEqual({ code: 4400, reason: MALFORMED_QUERY_MESSAGE });
      expect(upstream.wsFrames.length).toBe(before);
    });

    it('still relays the rest of the protocol: ping and complete', async () => {
      const sock = await initialised();
      sock.send({ type: 'ping' });
      await waitFor(() => sock.frames.some((frame) => frame.type === 'pong'));
      sock.send({ id: '1', type: 'complete' });
      await waitFor(() => upstream.wsFrames.some((frame) => frame.includes('"complete"')));
      expect(sock.frames.some((frame) => frame.type === 'error')).toBe(false);
      sock.close();
    });
  });

  it('discards the browser connection_init, injects its own, relays events', async () => {
    const client = createChatfuelClient({ url: httpUrl, wsUrl, webSocketImpl: WebSocket });
    const values: unknown[] = [];
    for await (const data of client.iterate(UnseenOpenDialogsCountChangedDocument, { botID: 'b1' })) {
      values.push(data.unseenOpenDialogsCountChanged);
      if (values.length === 2) break;
    }
    expect(values).toEqual([1, 2]);
    // The upstream saw exactly the relay's init payload, not the browser's {}.
    expect(upstream.initPayloads.at(-1)).toEqual({ authToken: `Bearer ${TOKEN}` });
    await client.dispose();
  });

  /*
   * A close reason is upstream text on the same socket and the same browser as
   * `next` and `error`, so it goes through the same scrub as they do — a string
   * the connection carries out is a string the caller was not written for.
   */
  it('scrubs the reason an upstream closes with, like every other frame', async () => {
    upstream.failNextInitWith(4401, "Failed to fetch from Subgraph 'svc-gamma'.");
    const sock = await rawSocket(wsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    const closed = await sock.closed;
    expect(closed.code).toBe(4401);
    expect(closed.reason).toBe('The upstream service rejected the request.');
    expect(closed.reason).not.toContain('svc-gamma');
  });

  it('passes fatal upstream closes (4401) through so the client does not retry', async () => {
    upstream.failNextInitWith(4401, 'Unauthorized');
    const client = createChatfuelClient({ url: httpUrl, wsUrl, webSocketImpl: WebSocket });
    const before = upstream.wsConnections;
    const err = await new Promise<unknown>((resolve) => {
      client.subscribe(
        UnseenOpenDialogsCountChangedDocument,
        { botID: 'b1' },
        {
          next: () => undefined,
          error: resolve,
        },
      );
    });
    expect(err).toBeInstanceOf(ChatfuelAuthError);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(upstream.wsConnections).toBe(before + 1);
    await client.dispose();
  });

  it('reconnects through a fresh relay after upstream death and fires onReconnect', { timeout: 20_000 }, async () => {
    const client = createChatfuelClient({ url: httpUrl, wsUrl, webSocketImpl: WebSocket });
    let reconnected = false;
    client.onReconnect(() => {
      reconnected = true;
    });
    const events: unknown[] = [];
    client.subscribe(
      UnseenOpenDialogsCountChangedDocument,
      { botID: 'b1' },
      {
        next: (data) => events.push(data.unseenOpenDialogsCountChanged),
        error: () => undefined,
      },
    );
    await waitFor(() => events.length >= 2);

    const before = upstream.wsConnections;
    upstream.killAllSockets();

    // Browser socket gets 1012, graphql-ws retries with the spec backoff
    // (2.5-5s for attempt 0) and resubscribes through a fresh relay.
    await waitFor(() => upstream.wsConnections > before, 15_000);
    await waitFor(() => reconnected, 2_000);
    await waitFor(() => events.length >= 4, 2_000);
    await client.dispose();
  });

  /*
   * Every browser socket the relay accepts is a second socket it opens upstream
   * and a buffer it holds, and `new WebSocket()` costs the other side nothing.
   * The cap is what makes the number of them the deployment's decision.
   */
  it('refuses an upgrade past the socket cap, and takes them again once one goes', async () => {
    const { vite: capped, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, wsMaxSockets: 1 }),
    ]);
    const url = `ws://127.0.0.1:${port}/chatfuel/graphql`;
    const first = new WebSocket(url, 'graphql-transport-ws');
    first.on('error', () => undefined);
    try {
      await new Promise<void>((resolve) => first.on('open', resolve));

      const second = new WebSocket(url, 'graphql-transport-ws');
      const failed = new Promise<Error>((resolve) => second.on('error', resolve));
      expect((await failed).message).toContain('503');

      const closed = new Promise<void>((resolve) => first.on('close', () => resolve()));
      first.close();
      await closed;
      const third = new WebSocket(url, 'graphql-transport-ws');
      third.on('error', () => undefined);
      await new Promise<void>((resolve) => third.on('open', resolve));
      third.close();
    } finally {
      first.close();
      await capped.close();
    }
  });
  /*
   * A socket that has not sent its connection_init has shown nothing to be
   * counted against — no session, no tenant, only the cost of being held. The
   * cap above counts it the same as an admitted one, so a client that opens
   * sockets and stays silent fills the deployment with nothing. The unadmitted
   * get a budget of their own, and spending it costs the silent their next
   * upgrade rather than the sockets already through.
   */
  it('refuses an upgrade past the unadmitted budget, and takes them again once one is admitted', async () => {
    const { vite: capped, port } = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, wsPreAuthSockets: 2 }),
    ]);
    const url = `ws://127.0.0.1:${port}/chatfuel/graphql`;
    const silent = [await rawSocket(url), await rawSocket(url)];
    try {
      const third = new WebSocket(url, 'graphql-transport-ws');
      const failed = new Promise<Error>((resolve) => third.on('error', resolve));
      expect((await failed).message).toContain('503');

      // No gate on this deployment, so the init is admitted as it is read, and
      // the socket that sent it is no longer one of the unadmitted.
      silent[0]!.send({ type: 'connection_init', payload: {} });
      await waitFor(() => silent[0]!.frames.some((frame) => frame.type === 'connection_ack'));

      const fourth = new WebSocket(url, 'graphql-transport-ws');
      fourth.on('error', () => undefined);
      await new Promise<void>((resolve) => fourth.on('open', resolve));
      fourth.close();
    } finally {
      for (const sock of silent) sock.close();
      await capped.close();
    }
  });
});

// ---------------------------------------------------------------------------
// Auth gate ON — the proxy in front of a Supabase-authenticated deployment
// ---------------------------------------------------------------------------
describe('auth gate', () => {
  const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;
  const OWNER_BOT = 'bot-owner';
  const COLLEAGUE_BOT = 'bot-colleague';
  /** The Chatfuel workspace this deployment bills to. */
  const WORKSPACE = 'ws-agency';
  const codeOfEnvelope = async (res: Response) =>
    ((await res.json()) as { errors: Array<{ extensions: { code: string } }> }).errors[0]!.extensions.code;
  let supabase: MockSupabase;
  let gated: ViteDevServer;
  let gatedHttp: string;
  let gatedWs: string;
  let gatedBase: string;
  let ownerJwt: string;
  let memberJwt: string;
  let strangerJwt: string;
  let plainMemberJwt: string;
  let adminJwt: string;
  let expiredJwt: string;

  beforeAll(async () => {
    supabase = await startMockSupabase();
    ownerJwt = fakeJwt({ sub: 'owner', exp: inOneHour(), email: 'owner@example.com' });
    memberJwt = fakeJwt({ sub: 'member', exp: inOneHour(), email: 'member@example.com' });
    strangerJwt = fakeJwt({ sub: 'stranger', exp: inOneHour(), email: 'stranger@example.com' });
    plainMemberJwt = fakeJwt({ sub: 'plain', exp: inOneHour(), email: 'plain@example.com' });
    expiredJwt = fakeJwt({ sub: 'owner', exp: Math.floor(Date.now() / 1000) - 60 });
    // owner: their own workspace. member: their own, plus an invite into the
    // owner's. stranger: signed in, no workspace yet.
    supabase.answers.set(ownerJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'owner', name: 'Owner' });
    supabase.answers.set(memberJwt, {
      tenantId: 't-member',
      botId: COLLEAGUE_BOT,
      role: 'owner',
      name: 'Member',
      alsoBotIds: [OWNER_BOT],
    });
    supabase.answers.set(strangerJwt, {});
    // Invited into the owner's workspace as a plain member — no workspace of their own.
    supabase.answers.set(plainMemberJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'member', name: 'Owner' });
    supabase.answers.set(expiredJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'owner' }); // the gate must never ask
    adminJwt = fakeJwt({ sub: 'admin', exp: inOneHour(), email: 'admin@example.com' });
    supabase.answers.set(adminJwt, { tenantId: 't-owner', botId: OWNER_BOT, role: 'admin', name: 'Admin' });
    supabase.members.push(
      { user_id: 'owner', role: 'owner', email: 'owner@example.com' },
      { user_id: 'admin', role: 'admin', email: 'admin@example.com' },
      // The one account that stands in a second workspace: `memberJwt` above
      // owns t-member. A recovery link resets the account, so issuing one here
      // would reach into a workspace this one's admins hold no role in.
      { user_id: 'member', role: 'member', email: 'member@example.com', otherTenants: ['t-member'] },
      // Invited into this workspace and nowhere else — the one a link may name.
      // Mixed case on purpose: the route lowercases before it asks.
      { user_id: 'plain', role: 'member', email: 'Plain@Example.com' },
    );
    const booted = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        workspaceId: WORKSPACE,
        publicUrl: 'https://inbox.example.com',
        // The route's delivery channel is the server log, and it is opt-in.
        recoveryLinkLogging: true,
        auth: {
          supabaseUrl: supabase.url,
          anonKey: supabase.anonKey,
          serviceRoleKey: supabase.serviceKey,
        },
      }),
    ]);
    gated = booted.vite;
    gatedBase = `http://127.0.0.1:${booted.port}`;
    gatedHttp = `${gatedBase}/chatfuel/graphql`;
    gatedWs = `ws://127.0.0.1:${booted.port}/chatfuel/graphql`;
  });

  afterAll(async () => {
    await gated?.close();
    await supabase?.close();
  });

  it('HTTP without a session → 401 AuthSessionRequired as a ChatfuelSessionError; nothing reaches upstream', async () => {
    const before = upstream.httpRequests.length;
    const sessionErrors: unknown[] = [];
    const client = createChatfuelClient({ url: gatedHttp, onSessionError: (e) => sessionErrors.push(e) });
    const err = await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelSessionError);
    expect((err as ChatfuelSessionError).code).toBe('AuthSessionRequired');
    expect((err as ChatfuelSessionError).reason).toBe('sessionRequired');
    expect(sessionErrors).toHaveLength(1);
    // Second failure in the same lapse does not re-fire.
    await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch(() => undefined);
    expect(sessionErrors).toHaveLength(1);
    expect(upstream.httpRequests.length).toBe(before);
    expect(supabase.gateCalls).toBe(0); // no bearer → no RPC either
  });

  it('HTTP with an expired session → 401 without an RPC call', async () => {
    const before = supabase.gateCalls;
    const client = createChatfuelClient({ url: gatedHttp, token: () => expiredJwt });
    const err = await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelSessionError);
    expect(supabase.gateCalls).toBe(before);
  });

  it('HTTP with a member session forwards with the Chatfuel token; the JWT never reaches upstream', async () => {
    const client = createChatfuelClient({ url: gatedHttp, token: () => memberJwt });
    await client.query(MyBotRoleDocument, { botID: OWNER_BOT });
    const seen = upstream.httpRequests.at(-1)!;
    expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.stringify(seen.headers)).not.toContain(memberJwt);
    expect(seen.headers.cookie).toBeUndefined();
    // The gate asked Supabase which bots this session may touch.
    const rpc = supabase.calls.find(
      (c) => c.path === '/rest/v1/rpc/cf_my_bot_ids' && c.authorization === `Bearer ${memberJwt}`,
    )!;
    expect(rpc.apikey).toBe(supabase.anonKey);
    // Cached: a second call costs no RPC.
    const calls = supabase.gateCalls;
    await client.query(MyBotRoleDocument, { botID: OWNER_BOT });
    expect(supabase.gateCalls).toBe(calls);
  });

  it('HTTP from a session with no workspace → 403 AuthTenantForbidden, nothing upstream', async () => {
    const before = upstream.httpRequests.length;
    const client = createChatfuelClient({ url: gatedHttp, token: () => strangerJwt });
    const err = await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ChatfuelSessionError);
    expect((err as ChatfuelSessionError).code).toBe('AuthTenantForbidden');
    expect((err as ChatfuelSessionError).reason).toBe('forbidden');
    expect(upstream.httpRequests.length).toBe(before);
  });

  // The isolation promise, in one test: one customer naming another's bot.
  it('HTTP naming somebody else’s bot → 403 BotNotAllowed, nothing upstream', async () => {
    const before = upstream.httpRequests.length;
    const client = createChatfuelClient({ url: gatedHttp, token: () => ownerJwt });
    const err = (await client.query(MyBotRoleDocument, { botID: COLLEAGUE_BOT }).catch((e: unknown) => e)) as {
      code?: string;
    };
    expect(err.code).toBe('BotNotAllowed');
    expect(upstream.httpRequests.length).toBe(before);
    // …while the bot they were invited into is theirs to use.
    const colleague = createChatfuelClient({ url: gatedHttp, token: () => memberJwt });
    await colleague.query(MyBotRoleDocument, { botID: OWNER_BOT });
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  // The deployer's Chatfuel account is not the customer's business: its bot list
  // is every other customer, and its name and email are the deployer's own.
  it('refuses account-scope queries but keeps currentUser { id botRole }', async () => {
    const before = upstream.httpRequests.length;
    const client = createChatfuelClient({ url: gatedHttp, token: () => ownerJwt });
    const err = (await client.query(CurrentUserDocument, {}).catch((e: unknown) => e)) as { code?: string };
    expect(err.code).toBe('AccountScopeBlocked');
    const listErr = (await client.query(BotsListDocument, { first: 50 }).catch((e: unknown) => e)) as { code?: string };
    expect(listErr.code).toBe('AccountScopeBlocked');
    expect(upstream.httpRequests.length).toBe(before);
    await client.query(MyBotRoleDocument, { botID: OWNER_BOT });
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  // Coworker hangs its conversation list and its thread read off `currentUser`,
  // which is where the deployer's own account lives. Both are scoped by an
  // argument, so both are checked by a fence rather than refused by name.
  it('lets a bot-scoped currentUser field through, and refuses the account-wide one', async () => {
    const ask = (query: string, variables: Record<string, unknown> = {}) =>
      fetch(gatedHttp, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${ownerJwt}` },
        body: JSON.stringify({ query, variables }),
      }).then(async (res) => {
        const body = (await res.json()) as { errors?: Array<{ extensions?: { code?: string } }> };
        return body.errors?.[0]?.extensions?.code;
      });

    const before = upstream.httpRequests.length;
    // No bot named: upstream would answer with every bot the master token holds.
    expect(
      await ask('query { currentUser { id coworkerConversationsConnection(first: 20) { edges { cursor } } } }'),
    ).toBe('AccountScopeBlocked');
    // A bot named, but not this caller's: the bot fence has it now.
    expect(
      await ask(
        `query { currentUser { id coworkerConversationsConnection(botID: "${COLLEAGUE_BOT}", first: 20) { edges { cursor } } } }`,
      ),
    ).toBe('BotNotAllowed');
    expect(upstream.httpRequests.length).toBe(before);
    // Their own bot: forwarded.
    expect(
      await ask(
        `query { currentUser { id coworkerConversationsConnection(botID: "${OWNER_BOT}", first: 20) { edges { cursor } } } }`,
      ),
    ).toBeUndefined();
    expect(upstream.httpRequests.length).toBe(before + 1);
  });

  it('gates the REST passthrough too', async () => {
    const before = upstream.httpRequests.length;
    const blocked = await fetch(
      `${gatedBase}/chatfuel/api/filestorage/upload/livechat?fileType=Image&botID=${OWNER_BOT}`,
      { method: 'POST', body: 'x' },
    );
    expect(blocked.status).toBe(401);
    const blockedBody = (await blocked.json()) as { errors: Array<{ extensions: { code: string } }> };
    expect(blockedBody.errors[0]!.extensions.code).toBe('AuthSessionRequired');
    expect(upstream.httpRequests.length).toBe(before);
    const ok = await fetch(`${gatedBase}/chatfuel/api/filestorage/upload/livechat?fileType=Image&botID=${OWNER_BOT}`, {
      method: 'POST',
      body: 'file-bytes',
      headers: { authorization: `Bearer ${ownerJwt}` },
    });
    expect(ok.status).toBe(200);
    const seen = upstream.httpRequests.at(-1)!;
    expect(seen.url).toBe(`/api/filestorage/upload/livechat?fileType=Image&botID=${OWNER_BOT}`);
    expect(seen.headers.authorization).toBe(`Bearer ${TOKEN}`);
    expect(seen.body).toBe('file-bytes');
  });

  /*
   * Frames sent behind a connection_init are held until the gate has answered
   * and the upstream socket is open — so an unanswered init was a buffer the
   * caller could fill at will, on a socket the proxy had admitted nobody on.
   */
  it('closes 4400 when a client pipelines more frames than the relay will hold', async () => {
    const before = upstream.wsConnections;
    const framesBefore = upstream.wsFrames.length;
    const sock = await rawSocket(gatedWs);
    sock.send({ type: 'connection_init', payload: { authToken: `Bearer ${ownerJwt}` } });
    for (let i = 0; i < 200; i += 1) {
      sock.send({
        id: String(i),
        type: 'subscribe',
        payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: OWNER_BOT } },
      });
    }
    const { code } = await sock.closed;
    expect(code).toBe(4400);
    expect(upstream.wsFrames.slice(framesBefore).filter((frame) => frame.includes('"subscribe"'))).toHaveLength(0);
    expect(upstream.wsConnections).toBeLessThanOrEqual(before + 1);
  });

  it('WS with a session streams through the relay; upstream sees the relay init only', async () => {
    const client = createChatfuelClient({
      url: gatedHttp,
      wsUrl: gatedWs,
      webSocketImpl: WebSocket,
      token: () => memberJwt,
    });
    const values: unknown[] = [];
    for await (const data of client.iterate(UnseenOpenDialogsCountChangedDocument, { botID: OWNER_BOT })) {
      values.push(data.unseenOpenDialogsCountChanged);
      if (values.length === 2) break;
    }
    expect(values).toEqual([1, 2]);
    expect(upstream.initPayloads.at(-1)).toEqual({ authToken: `Bearer ${TOKEN}` });
    expect(JSON.stringify(upstream.initPayloads)).not.toContain(memberJwt);
    await client.dispose();
  });

  it('WS without a session → 4401 AuthSessionRequired → ChatfuelSessionError, no retry, ZERO upstream sockets', async () => {
    const before = upstream.wsConnections;
    const sessionErrors: unknown[] = [];
    const client = createChatfuelClient({
      url: gatedHttp,
      wsUrl: gatedWs,
      webSocketImpl: WebSocket,
      onSessionError: (e) => sessionErrors.push(e),
    });
    const err = await new Promise<unknown>((resolve) => {
      client.subscribe(
        UnseenOpenDialogsCountChangedDocument,
        { botID: OWNER_BOT },
        {
          next: () => undefined,
          error: resolve,
        },
      );
    });
    expect(err).toBeInstanceOf(ChatfuelSessionError);
    expect((err as ChatfuelSessionError).reason).toBe('sessionRequired');
    expect(sessionErrors).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(upstream.wsConnections).toBe(before);
    await client.dispose();
  });

  /*
   * A valid session may open the socket even with nothing to subscribe to yet —
   * it is the SUBSCRIPTION that names a bot, so the refusal is per-subscription
   * and the shared socket stays healthy. Upstream is still never contacted,
   * which is the part that matters.
   */
  it('WS subscribing to a bot that is not yours → refused per subscription, ZERO upstream sockets', async () => {
    const before = upstream.wsConnections;
    const client = createChatfuelClient({
      url: gatedHttp,
      wsUrl: gatedWs,
      webSocketImpl: WebSocket,
      token: () => strangerJwt,
    });
    const err = (await new Promise<unknown>((resolve) => {
      client.subscribe(
        UnseenOpenDialogsCountChangedDocument,
        { botID: OWNER_BOT },
        {
          next: () => undefined,
          error: resolve,
        },
      );
    })) as { code?: string };
    expect(err.code).toBe('AuthTenantForbidden');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(upstream.wsConnections).toBe(before);
    await client.dispose();

    const other = createChatfuelClient({
      url: gatedHttp,
      wsUrl: gatedWs,
      webSocketImpl: WebSocket,
      token: () => ownerJwt,
    });
    const foreign = (await new Promise<unknown>((resolve) => {
      other.subscribe(
        UnseenOpenDialogsCountChangedDocument,
        { botID: COLLEAGUE_BOT },
        {
          next: () => undefined,
          error: resolve,
        },
      );
    })) as { code?: string };
    expect(foreign.code).toBe('BotNotAllowed');
    await other.dispose();
  });

  // The same refusal with a valid session behind it: an account-level operation
  // is the deployment's own authority being asked for, not this caller's, so
  // being signed in and owning a bot buys nothing here.
  it('a signed-in caller cannot run an account-level operation either', async () => {
    const before = upstream.httpRequests.length;
    const res = await fetch(gatedHttp, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ownerJwt}` },
      body: JSON.stringify({ query: 'mutation { createPublicAPIToken { token } }' }),
    });
    expect(res.status).toBe(403);
    expect(await codeOfEnvelope(res)).toBe('AccountOperationBlocked');
    expect(upstream.httpRequests.length).toBe(before);
  });

  // The socket is the other way to ask, so it is refused there too.
  it('WS: a gated socket cannot introspect either', async () => {
    const before = upstream.httpRequests.length;
    const sock = await rawSocket(gatedWs);
    sock.send({ type: 'connection_init', payload: { authToken: `Bearer ${ownerJwt}` } });
    sock.send({ id: '1', type: 'subscribe', payload: { query: 'query { __schema { types { name } } }' } });
    await waitFor(() => sock.errorCode() !== undefined);
    expect(sock.errorCode()).toBe('IntrospectionBlocked');
    expect(sock.frames.some((frame) => frame.type === 'next')).toBe(false);
    expect(upstream.httpRequests.length).toBe(before);
    sock.close();
  });

  /*
   * A `subscribe` frame carries whatever operation the client puts in it, a
   * query included, so the account-wide selection handleGraphql answers with
   * AccountScopeBlocked has to be answered the same way here — otherwise the
   * socket is the way around it.
   */
  it('WS: a gated socket cannot read the deployment’s account either', async () => {
    const sock = await rawSocket(gatedWs);
    sock.send({ type: 'connection_init', payload: { authToken: `Bearer ${ownerJwt}` } });
    sock.send({ id: '1', type: 'subscribe', payload: { query: 'query { currentUser { botsV2 { id } } }' } });
    await waitFor(() => sock.errorCode() !== undefined);
    expect(sock.errorCode()).toBe('AccountScopeBlocked');
    // The socket is the caller's own — it is this SUBSCRIPTION that is refused,
    // so the refusal is a frame on it and nothing was relayed for that id.
    expect(sock.frames.some((frame) => frame.type === 'next')).toBe(false);

    // The row that is the caller's own is still theirs to read.
    sock.send({ id: '2', type: 'subscribe', payload: { query: 'query { currentUser { id botRole } }' } });
    await waitFor(() => sock.frames.some((frame) => frame.id === '2'));
    expect(sock.frames.find((frame) => frame.id === '2')!.type).toBe('next');
    sock.close();
  });

  /*
   * Cross-tenant by frame order: the owner's session may open the socket, but
   * every frame on it is still their own tenant's fence to pass — whether it
   * arrived before the connection_init or was pipelined behind it.
   */
  it('WS: a subscribe before or behind connection_init cannot cross the tenant fence', async () => {
    const before = upstream.wsConnections;
    const early = await rawSocket(gatedWs);
    early.send({
      id: '1',
      type: 'subscribe',
      payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: COLLEAGUE_BOT } },
    });
    expect(await early.closed).toEqual({ code: 4401, reason: 'Unauthorized' });
    expect(early.frames).toEqual([]);
    expect(upstream.wsConnections).toBe(before);

    const pipelined = await rawSocket(gatedWs);
    pipelined.send({ type: 'connection_init', payload: { authToken: `Bearer ${ownerJwt}` } });
    pipelined.send({
      id: '1',
      type: 'subscribe',
      payload: { query: UNSEEN_SUBSCRIPTION, variables: { botID: COLLEAGUE_BOT } },
    });
    await waitFor(() => pipelined.errorCode() !== undefined);
    expect(pipelined.errorCode()).toBe('BotNotAllowed');
    expect(pipelined.frames.some((frame) => frame.type === 'next')).toBe(false);
    pipelined.close();
  });

  it('WS: a socket that never sends connection_init is closed 4408, no upstream socket', async () => {
    const { vite: quick, port } = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        wsInitTimeoutMs: 200,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey },
      }),
    ]);
    try {
      const before = upstream.wsConnections;
      const ws = new WebSocket(`ws://127.0.0.1:${port}/chatfuel/graphql`, 'graphql-transport-ws');
      const close = await new Promise<{ code: number; reason: string }>((resolve) => {
        ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
      });
      expect(close).toEqual({ code: 4408, reason: 'Connection initialisation timeout' });
      expect(upstream.wsConnections).toBe(before);
    } finally {
      await quick.close();
    }
  });

  it('partial Supabase env → fail closed: every proxied request answers 500 ProxyAuthMisconfigured', async () => {
    process.env.VITE_SUPABASE_URL = supabase.url; // only one of the three
    let bare: ViteDevServer | undefined;
    try {
      const booted = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN })]);
      bare = booted.vite;
      const before = upstream.httpRequests.length;
      const client = createChatfuelClient({
        url: `http://127.0.0.1:${booted.port}/chatfuel/graphql`,
        token: () => ownerJwt,
      });
      const err = await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ChatfuelGraphQLError);
      expect((err as ChatfuelGraphQLError).code).toBe('ProxyAuthMisconfigured');
      expect(upstream.httpRequests.length).toBe(before);
      const rest = await fetch(`http://127.0.0.1:${booted.port}/chatfuel/api/x`, { method: 'POST', body: 'x' });
      expect(rest.status).toBe(500);
      // WS: closed 4500 ProxyAuthMisconfigured after the browser init, no upstream socket.
      const wsBefore = upstream.wsConnections;
      const ws = new WebSocket(`ws://127.0.0.1:${booted.port}/chatfuel/graphql`, 'graphql-transport-ws');
      const close = await new Promise<{ code: number; reason: string }>((resolve) => {
        ws.on('open', () => ws.send(JSON.stringify({ type: 'connection_init', payload: {} })));
        ws.on('close', (code, reason) => resolve({ code, reason: reason.toString() }));
      });
      expect(close).toEqual({ code: 4500, reason: 'ProxyAuthMisconfigured' });
      expect(upstream.wsConnections).toBe(wsBefore);
    } finally {
      delete process.env.VITE_SUPABASE_URL;
      await bare?.close();
    }
  });

  it('auth: false never gates, even with the full Supabase env present', async () => {
    process.env.VITE_SUPABASE_URL = supabase.url;
    process.env.VITE_SUPABASE_ANON_KEY = supabase.anonKey;
    let open: ViteDevServer | undefined;
    try {
      const booted = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN, auth: false })]);
      open = booted.vite;
      const client = createChatfuelClient({ url: `http://127.0.0.1:${booted.port}/chatfuel/graphql` });
      await client.query(MyBotRoleDocument, { botID: OWNER_BOT });
      expect(upstream.httpRequests.at(-1)!.headers.authorization).toBe(`Bearer ${TOKEN}`);
    } finally {
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_ANON_KEY;
      await open?.close();
    }
  });

  it('env-resolved gate (both vars) is on — the same 401 without a session', async () => {
    process.env.VITE_SUPABASE_URL = supabase.url;
    process.env.VITE_SUPABASE_ANON_KEY = supabase.anonKey;
    let envGated: ViteDevServer | undefined;
    try {
      const booted = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN })]);
      envGated = booted.vite;
      const client = createChatfuelClient({ url: `http://127.0.0.1:${booted.port}/chatfuel/graphql` });
      const err = await client.query(MyBotRoleDocument, { botID: OWNER_BOT }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ChatfuelSessionError);
      const okClient = createChatfuelClient({
        url: `http://127.0.0.1:${booted.port}/chatfuel/graphql`,
        token: () => ownerJwt,
      });
      await okClient.query(MyBotRoleDocument, { botID: OWNER_BOT });
    } finally {
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_ANON_KEY;
      await envGated?.close();
    }
  });

  /*
   * Provisioning is the second half of signing up: the account exists in
   * Supabase, and this is where it gets a Chatfuel bot to work in. It runs on
   * the server because only the server has the master token.
   */
  interface BotJson {
    id: string;
    botId: string | null;
    name: string;
  }

  describe('bots route', () => {
    /*
     * Deleting one asks Chatfuel whether it is the last bot in the deployment's
     * workspace, because Chatfuel deletes a workspace when its last bot goes.
     * These tests want the answer to be "no", so the workspace is scripted with
     * room to spare; the one test that wants "yes" narrows it itself.
     */
    beforeEach(() => {
      upstream.setWorkspaces([{ id: WORKSPACE, bots: ['keeps-the-workspace-alive', 'and-another'] }]);
    });
    afterEach(() => {
      upstream.setWorkspaces([{ id: 'ws-1', bots: ['b1', 'bot-owner', 'bot-colleague'] }]);
    });

    /** A session of its own per test, so one test's bots never decide another's. */
    const signIn = (who: string, session: Record<string, unknown>): string => {
      const jwt = fakeJwt({ sub: who, exp: inOneHour(), email: `${who}@example.com` });
      supabase.answers.set(jwt, session);
      return jwt;
    };
    const addBot = (jwt: string | undefined, name: unknown = 'Another bot') =>
      fetch(`${gatedBase}/chatfuel/auth/bots`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify(name === undefined ? {} : { name }),
      });
    const editBot = (jwt: string, slot: string, method: string, body?: unknown) =>
      fetch(`${gatedBase}/chatfuel/auth/bots/${slot}`, {
        method,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    /**
     * A second bot in the same workspace, so a delete is not refused by the
     * TENANT's own last-bot fence — which is what these tests would otherwise
     * all hit, never reaching the behaviour each was written for. Seeded in
     * full (the session's own row first) so the mock's lazy seeding leaves the
     * order alone.
     */
    const withSpare = (tenantId: string, botId: string, spare: string, name = 'Workspace') => {
      supabase.tenantBots.set(tenantId, [
        { id: `slot-${botId}`, botId, name },
        { id: `slot-${spare}`, botId: spare, name: 'Spare' },
      ]);
    };

    it('adds a second bot to a workspace that already has one', async () => {
      const jwt = signIn('grower', { tenantId: 't-grow', botId: 'bot-grow-1', role: 'owner', name: 'Grow Co' });
      const created = upstream.botsCreated;

      const res = await addBot(jwt, 'Second bot');
      expect(res.status).toBe(200);
      const bot = (await res.json()) as BotJson;
      expect(bot.botId).toBe(`bot-new-${created + 1}`);
      expect(bot.name).toBe('Second bot');
      // Into the deployment's own workspace, like every other bot.
      expect(upstream.lastCreateVariables).toEqual({ workspaceID: WORKSPACE, title: 'Second bot' });
      expect(supabase.tenantBots.get('t-grow')!.map((row) => row.botId)).toEqual(['bot-grow-1', bot.botId]);
    });

    it('the new bot passes the fence at once, without waiting out the gate cache', async () => {
      const jwt = signIn('cacher', { tenantId: 't-cache', botId: 'bot-cache-1', role: 'owner', name: 'Cache Co' });
      // Warm the cache on the old set, the way a signed-in session always has.
      await fetch(`${gatedBase}/chatfuel/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          query: 'query Q($botID: BotID!) { bot(id: $botID) { id } }',
          variables: { botID: 'bot-cache-1' },
        }),
      });

      const bot = (await (await addBot(jwt, 'Fresh one')).json()) as BotJson;
      const res = await fetch(`${gatedBase}/chatfuel/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          query: 'query Q($botID: BotID!) { bot(id: $botID) { id } }',
          variables: { botID: bot.botId },
        }),
      });
      expect(res.status).toBe(200);
    });

    it('a member may not add, rename or delete a bot — the database says so, and it is passed on', async () => {
      const jwt = signIn('worker', { tenantId: 't-worker', botId: 'bot-worker-1', role: 'member', name: 'Worker Co' });
      const created = upstream.botsCreated;

      const added = await addBot(jwt);
      expect(added.status).toBe(403);
      expect(await codeOfEnvelope(added)).toBe('BotAdminRequired');
      expect(upstream.botsCreated).toBe(created);

      const renamed = await editBot(jwt, 'slot-bot-worker-1', 'PATCH', { name: 'Mine now' });
      expect(renamed.status).toBe(403);
      expect(await codeOfEnvelope(renamed)).toBe('BotAdminRequired');

      const deletedBots = upstream.botsDeleted;
      const deleted = await editBot(jwt, 'slot-bot-worker-1', 'DELETE');
      expect(deleted.status).toBe(403);
      expect(upstream.botsDeleted).toBe(deletedBots);
    });

    it('refuses a nameless bot before it asks Chatfuel for anything', async () => {
      const jwt = signIn('nameless', { tenantId: 't-name', botId: 'bot-name-1', role: 'owner' });
      const created = upstream.botsCreated;
      const res = await addBot(jwt, '   ');
      expect(res.status).toBe(422);
      expect(await codeOfEnvelope(res)).toBe('BadBotName');
      expect(upstream.botsCreated).toBe(created);
    });

    it('says the workspace is full, and leaves no reservation behind', async () => {
      const jwt = signIn('crowded', { tenantId: 't-crowd', botId: 'bot-crowd-1', role: 'owner' });
      upstream.failCreateWith('TooManyBotsInWorkspace');
      try {
        const res = await addBot(jwt, 'One too many');
        expect(res.status).toBe(409);
        expect(await codeOfEnvelope(res)).toBe('WorkspaceFull');
      } finally {
        upstream.failCreateWith(null);
      }
      expect(supabase.tenantBots.get('t-crowd')!.map((row) => row.botId)).toEqual(['bot-crowd-1']);
    });

    it('rolls the bot back when the database will not record it', async () => {
      const jwt = signIn('unrecorded', { tenantId: 't-unrec', botId: 'bot-unrec-1', role: 'owner' });
      const created = upstream.botsCreated;
      const deleted = upstream.botsDeleted;
      supabase.failAttach(true);
      try {
        const res = await addBot(jwt, 'Doomed');
        expect(res.status).toBe(503);
      } finally {
        supabase.failAttach(false);
      }
      expect(upstream.botsCreated).toBe(created + 1);
      expect(upstream.botsDeleted).toBe(deleted + 1);
      expect(supabase.tenantBots.get('t-unrec')!.map((row) => row.botId)).toEqual(['bot-unrec-1']);
    });

    it('renames a bot here and in Chatfuel', async () => {
      const jwt = signIn('renamer', { tenantId: 't-rename', botId: 'bot-rename-1', role: 'owner', name: 'Rename Co' });
      const res = await editBot(jwt, 'slot-bot-rename-1', 'PATCH', { name: 'Better name' });
      expect(res.status).toBe(200);
      expect((await res.json()) as BotJson).toMatchObject({ botId: 'bot-rename-1', name: 'Better name' });
      expect(supabase.tenantBots.get('t-rename')![0]!.name).toBe('Better name');
      const sent = upstream.httpRequests.filter((r) => r.body.includes('CfRenameBot')).at(-1)!;
      expect(JSON.parse(sent.body).variables).toEqual({ botID: 'bot-rename-1', title: 'Better name' });
    });

    it('puts the old name back when Chatfuel will not rename the bot', async () => {
      const jwt = signIn('halfway', { tenantId: 't-half', botId: 'bot-half-1', role: 'owner', name: 'Half Co' });
      upstream.failRename(true);
      try {
        const res = await editBot(jwt, 'slot-bot-half-1', 'PATCH', { name: 'Never applied' });
        expect(res.status).toBe(502);
        expect(await codeOfEnvelope(res)).toBe('BotRenameFailed');
      } finally {
        upstream.failRename(false);
      }
      expect(supabase.tenantBots.get('t-half')![0]!.name).toBe('Half Co');
    });

    it('deletes the bot in Chatfuel first, then here', async () => {
      const jwt = signIn('deleter', { tenantId: 't-del', botId: 'bot-del-1', role: 'owner', name: 'Del Co' });
      withSpare('t-del', 'bot-del-1', 'bot-del-2', 'Del Co');
      const deleted = upstream.botsDeleted;
      const res = await editBot(jwt, 'slot-bot-del-1', 'DELETE');
      expect(res.status).toBe(200);
      expect(upstream.botsDeleted).toBe(deleted + 1);
      expect(supabase.tenantBots.get('t-del')!.map((row) => row.botId)).toEqual(['bot-del-2']);
    });

    /*
     * Chatfuel answers NotEnoughPermissions about a bot it has already deleted,
     * not "no such bot" — so a delete whose second half failed once would never
     * be able to finish, and the row would be undeletable forever.
     */
    it('finishes a half-done delete: a bot Chatfuel has already dropped still clears the row', async () => {
      const jwt = signIn('again', { tenantId: 't-again', botId: 'bot-again-1', role: 'owner', name: 'Again Co' });
      withSpare('t-again', 'bot-again-1', 'bot-again-2', 'Again Co');
      upstream.failDeleteWith('NotEnoughPermissions');
      try {
        const res = await editBot(jwt, 'slot-bot-again-1', 'DELETE');
        expect(res.status).toBe(200);
      } finally {
        upstream.failDeleteWith(null);
      }
      expect(supabase.tenantBots.get('t-again')!.map((row) => row.botId)).toEqual(['bot-again-2']);
    });

    it('a delete Chatfuel refuses for any other reason leaves the row alone', async () => {
      const jwt = signIn('stuck', { tenantId: 't-stuck', botId: 'bot-stuck-1', role: 'owner', name: 'Stuck Co' });
      withSpare('t-stuck', 'bot-stuck-1', 'bot-stuck-2', 'Stuck Co');
      upstream.failDeleteWith('SomethingElse');
      try {
        const res = await editBot(jwt, 'slot-bot-stuck-1', 'DELETE');
        expect(res.status).toBe(502);
        expect(await codeOfEnvelope(res)).toBe('BotDeleteFailed');
      } finally {
        upstream.failDeleteWith(null);
      }
      expect(supabase.tenantBots.get('t-stuck')!.map((row) => row.botId)).toEqual(['bot-stuck-1', 'bot-stuck-2']);
    });

    /*
     * A workspace with nothing openable in it means one thing now — that
     * provisioning never finished — and the app answers it by asking for
     * another bot. So this must not be a state somebody can walk into: they
     * would delete their bot and be handed a fresh one on the deployment's
     * plan. Refused before Chatfuel is asked anything.
     */
    it('a workspace cannot delete its own last bot, even when the deployment’s has room', async () => {
      const jwt = signIn('solo', { tenantId: 't-solo', botId: 'bot-solo-1', role: 'owner', name: 'Solo Co' });
      const deleted = upstream.botsDeleted;
      const asked = upstream.fenceRequests;
      const res = await editBot(jwt, 'slot-bot-solo-1', 'DELETE');
      expect(res.status).toBe(409);
      expect(await codeOfEnvelope(res)).toBe('LastBotInWorkspace');
      expect(upstream.botsDeleted).toBe(deleted);
      expect(upstream.fenceRequests).toBe(asked);
      expect(supabase.tenantBots.get('t-solo')!.map((row) => row.botId)).toEqual(['bot-solo-1']);
    });

    it('a reservation is not a replacement: it may never finish', async () => {
      const jwt = signIn('half', { tenantId: 't-halfspare', botId: 'bot-halfspare-1', role: 'owner', name: 'Half Co' });
      supabase.tenantBots.set('t-halfspare', [
        { id: 'slot-bot-halfspare-1', botId: 'bot-halfspare-1', name: 'Half Co' },
        { id: 'slot-pending', botId: null, name: 'On its way' },
      ]);
      try {
        const res = await editBot(jwt, 'slot-bot-halfspare-1', 'DELETE');
        expect(res.status).toBe(409);
        expect(await codeOfEnvelope(res)).toBe('LastBotInWorkspace');
      } finally {
        // Other tests assert that no reservation is left anywhere; this one
        // seeded a permanent one on purpose.
        supabase.tenantBots.delete('t-halfspare');
      }
    });

    /*
     * The whole deployment lives in one Chatfuel workspace, and Chatfuel drops a
     * workspace the moment its last bot does. One customer deleting the wrong
     * bot would take sign-up away from every other customer, permanently.
     */
    it('refuses to delete the last bot in the deployment’s Chatfuel workspace', async () => {
      const jwt = signIn('lastone', { tenantId: 't-last', botId: 'bot-last-1', role: 'owner', name: 'Last Co' });
      /* A spare in the TENANT, so the tenant's own fence lets this through and
         the deployment's is what refuses — otherwise this would pass without
         ever exercising setWorkspaces. */
      withSpare('t-last', 'bot-last-1', 'bot-last-2', 'Last Co');
      upstream.setWorkspaces([{ id: WORKSPACE, bots: ['bot-last-1'] }]);
      const deleted = upstream.botsDeleted;
      const res = await editBot(jwt, 'slot-bot-last-1', 'DELETE');
      expect(res.status).toBe(409);
      expect(await codeOfEnvelope(res)).toBe('LastBotInWorkspace');
      // Nothing was touched on either side.
      expect(upstream.botsDeleted).toBe(deleted);
      expect(supabase.tenantBots.get('t-last')!.map((row) => row.botId)).toEqual(['bot-last-1', 'bot-last-2']);
    });

    it('refuses rather than guesses when Chatfuel cannot be asked', async () => {
      const jwt = signIn('unknowable', { tenantId: 't-unk', botId: 'bot-unk-1', role: 'owner', name: 'Unk Co' });
      withSpare('t-unk', 'bot-unk-1', 'bot-unk-2', 'Unk Co');
      upstream.setWorkspaces(null);
      const deleted = upstream.botsDeleted;
      const res = await editBot(jwt, 'slot-bot-unk-1', 'DELETE');
      expect(res.status).toBe(503);
      expect(await codeOfEnvelope(res)).toBe('BotDeleteUnavailable');
      expect(upstream.botsDeleted).toBe(deleted);
      expect(supabase.tenantBots.get('t-unk')!.map((row) => row.botId)).toEqual(['bot-unk-1', 'bot-unk-2']);
    });

    it('a bot in another workspace is not there to rename or delete', async () => {
      const jwt = signIn('nosy', { tenantId: 't-nosy', botId: 'bot-nosy-1', role: 'owner' });
      signIn('neighbour', { tenantId: 't-neighbour', botId: 'bot-neighbour-1', role: 'owner' });
      const deleted = upstream.botsDeleted;
      const res = await editBot(jwt, 'slot-bot-neighbour-1', 'DELETE');
      expect(res.status).toBe(404);
      expect(await codeOfEnvelope(res)).toBe('BotNotFound');
      expect(upstream.botsDeleted).toBe(deleted);
    });

    it('needs a session, like everything else behind the gate', async () => {
      const res = await addBot(undefined, 'Anonymous bot');
      expect(res.status).toBe(401);
      expect(await codeOfEnvelope(res)).toBe('AuthSessionRequired');
    });

    /* Anyone with a session can reach this, and in a deployment with open
       sign-up a session costs an email address. */
    it('refuses a name past the ceiling, and creates nothing', async () => {
      const jwt = signIn('verbose', { tenantId: 't-verbose', botId: 'bot-verbose-1', role: 'owner' });
      const created = upstream.botsCreated;
      const res = await addBot(jwt, 'x'.repeat(3 * 1024 * 1024));
      expect(res.status).toBe(413);
      expect(await codeOfEnvelope(res)).toBe('RequestTooLarge');
      expect(upstream.botsCreated).toBe(created);
    });

    it('answers 405 for a method the route does not have', async () => {
      const jwt = signIn('curious', { tenantId: 't-curious', botId: 'bot-curious-1', role: 'owner' });
      const res = await fetch(`${gatedBase}/chatfuel/auth/bots`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${jwt}` },
      });
      expect(res.status).toBe(405);
      expect(res.headers.get('allow')).toBe('POST');
    });
  });

  describe('provision route', () => {
    const provision = (jwt: string | undefined, body: unknown = {}) =>
      fetch(`${gatedBase}/chatfuel/auth/provision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(jwt ? { authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify(body),
      });

    it('refuses a body past the ceiling, and provisions nothing', async () => {
      const roomy = fakeJwt({ sub: 'roomy', exp: inOneHour(), email: 'roomy@example.com' });
      supabase.answers.set(roomy, {});
      const created = upstream.botsCreated;
      const res = await provision(roomy, { name: 'x'.repeat(3 * 1024 * 1024) });
      expect(res.status).toBe(413);
      expect(await codeOfEnvelope(res)).toBe('RequestTooLarge');
      expect(upstream.botsCreated).toBe(created);
    });

    it('gives a fresh account a workspace and a first bot, and says so again on a retry', async () => {
      const fresh = fakeJwt({ sub: 'fresh', exp: inOneHour(), email: 'fresh@example.com' });
      supabase.answers.set(fresh, {});
      const created = upstream.botsCreated;

      const first = await provision(fresh, { name: 'Fresh Co' });
      expect(first.status).toBe(200);
      const body = (await first.json()) as { tenantId: string; role: string; bots: BotJson[] };
      expect(body.bots).toHaveLength(1);
      expect(body.bots[0]!.botId).toBe(`bot-new-${created + 1}`);
      expect(body.role).toBe('owner');
      expect(upstream.botsCreated).toBe(created + 1);

      // The row was reserved as the CALLER (so the database decides who may) and
      // the bot named to Supabase with the SERVICE key, never the anon one.
      const reserve = supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_new_bot').at(-1)!;
      expect(reserve.apikey).toBe(supabase.anonKey);
      expect(reserve.authorization).toBe(`Bearer ${fresh}`);
      const recorded = supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_bot_created').at(-1)!;
      expect(recorded.apikey).toBe(supabase.serviceKey);
      expect(recorded.body).toEqual({ p_slot: body.bots[0]!.id, p_bot_id: body.bots[0]!.botId });

      // Idempotent: the second call creates nothing.
      const again = await provision(fresh);
      expect(again.status).toBe(200);
      expect(((await again.json()) as { bots: BotJson[] }).bots).toEqual(body.bots);
      expect(upstream.botsCreated).toBe(created + 1);
    });

    /*
     * Signing up asks twice, milliseconds apart — the SIGNED_IN membership
     * fetch and the sign-up screen's own await. Both used to be stopped by an
     * accident: the second saw the first's RESERVATION (a row with no bot id
     * yet) and read it as a finished bot, so it answered 200 with a workspace
     * holding nothing openable. That answer is what the app believed, and a
     * customer sat on "No bots yet" for ever with a real failure nowhere on
     * screen. A reservation no longer counts — so the second call has to be
     * stopped on purpose, or it buys the deployment a second bot.
     */
    it('two sign-up calls at once create ONE bot, and both are told about it', async () => {
      const twice = fakeJwt({ sub: 'twice', exp: inOneHour(), email: 'twice@example.com' });
      supabase.answers.set(twice, {});
      const created = upstream.botsCreated;
      const reservations = () => supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_new_bot').length;
      const before = reservations();

      const release = upstream.holdCreateBot();
      const first = provision(twice, { name: 'Twice Co' });
      await waitFor(() => upstream.createsStarted > 0);
      const second = provision(twice);
      // The joiner gets as far as claiming the workspace before it waits.
      await waitFor(() => supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_claim_workspace').length >= 2);
      release();

      const [a, b] = await Promise.all([first, second]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      const bodyA = (await a.json()) as { bots: BotJson[] };
      const bodyB = (await b.json()) as { bots: BotJson[] };
      expect(bodyA.bots).toHaveLength(1);
      expect(bodyB.bots).toEqual(bodyA.bots);
      expect(upstream.botsCreated).toBe(created + 1);
      expect(reservations()).toBe(before + 1);
      // And nothing half-made was left behind for the app to trip over.
      expect([...supabase.tenantBots.values()].flat().filter((row) => row.botId === null)).toEqual([]);
    });

    /* The other half of the same fix: when the one run fails, the failure is
       what BOTH callers are told — the silence is what made this undebuggable. */
    it('a creation that fails is reported to both callers, and leaves nothing behind', async () => {
      const doomed = fakeJwt({ sub: 'doomed', exp: inOneHour(), email: 'doomed@example.com' });
      supabase.answers.set(doomed, {});
      const created = upstream.botsCreated;

      const release = upstream.holdCreateBot();
      const first = provision(doomed, { name: 'Doomed Co' });
      await waitFor(() => upstream.createsStarted > 0);
      const second = provision(doomed);
      await waitFor(() => supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_claim_workspace').length >= 2);
      upstream.failCreateWith('TooManyBotsInWorkspace');
      try {
        release();
        const [a, b] = await Promise.all([first, second]);
        expect(a.status).toBe(409);
        expect(b.status).toBe(409);
        expect(await codeOfEnvelope(a)).toBe('WorkspaceFull');
        expect(await codeOfEnvelope(b)).toBe('WorkspaceFull');
      } finally {
        upstream.failCreateWith(null);
      }
      expect(upstream.botsCreated).toBe(created);
      expect([...supabase.tenantBots.values()].flat().filter((row) => row.botId === null)).toEqual([]);
    });

    /*
     * The cross-process half. On Vercel two concurrent calls can land in two
     * instances, which share no memory — so the loser is settled in the
     * database instead: it reserves, sees an older LIVE reservation, drops its
     * own and waits for the winner rather than answering with a workspace the
     * app cannot open anything in.
     */
    it('stands down for another process’s run and answers with its bot', async () => {
      const shared = fakeJwt({ sub: 'shared', exp: inOneHour(), email: 'shared@example.com' });
      supabase.answers.set(shared, { tenantId: 't-shared', role: 'owner', name: 'Shared Co' });
      // Somebody else's run, a moment ahead of ours and still going.
      supabase.tenantBots.set('t-shared', [
        { id: 'slot-elsewhere', botId: null, name: 'Shared Co', createdAt: new Date(Date.now() - 1_000).toISOString() },
      ]);
      const created = upstream.botsCreated;

      const answer = provision(shared);
      // …which finishes while we are waiting, exactly as the other instance would.
      setTimeout(() => {
        const rows = supabase.tenantBots.get('t-shared')!;
        rows.find((row) => row.id === 'slot-elsewhere')!.botId = 'bot-elsewhere';
      }, 400);

      const res = await answer;
      expect(res.status).toBe(200);
      const body = (await res.json()) as { bots: BotJson[] };
      expect(body.bots.map((bot) => bot.botId)).toEqual(['bot-elsewhere']);
      // Nothing of ours was created, and our reservation was dropped again.
      expect(upstream.botsCreated).toBe(created);
      expect(supabase.tenantBots.get('t-shared')!.filter((row) => row.botId === null)).toEqual([]);
      supabase.tenantBots.delete('t-shared');
    });

    /* A run whose process died left a reservation behind. It is not a bot, and
       the account must not be stuck behind it for ever. */
    it('provisions again for a workspace whose only row is a dead reservation', async () => {
      const stalled = fakeJwt({ sub: 'stalled', exp: inOneHour(), email: 'stalled@example.com' });
      supabase.answers.set(stalled, { tenantId: 't-stalled', role: 'owner', name: 'Stalled Co' });
      supabase.tenantBots.set('t-stalled', [
        // Older than any run could still be going — the process that reserved
        // it died, and nothing is coming to fill it in.
        {
          id: 'slot-dead',
          botId: null,
          name: 'Stalled Co',
          createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        },
      ]);
      const created = upstream.botsCreated;

      try {
        const res = await provision(stalled);
        expect(res.status).toBe(200);
        const body = (await res.json()) as { bots: BotJson[] };
        expect(body.bots.some((bot) => typeof bot.botId === 'string' && bot.botId)).toBe(true);
        expect(upstream.botsCreated).toBe(created + 1);
      } finally {
        // The dead row outlives this test in the mock (the real cf_new_bot
        // sweeps it after ten minutes); other tests count pending rows.
        supabase.tenantBots.delete('t-stalled');
      }
    });

    it('an invited colleague lands in the workspace they were invited to, and nothing is created', async () => {
      const invited = fakeJwt({ sub: 'invited', exp: inOneHour(), email: 'invited@example.com' });
      supabase.answers.set(invited, { tenantId: 't-owner', botId: OWNER_BOT, role: 'member', name: 'Owner' });
      const created = upstream.botsCreated;
      const res = await provision(invited);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { role: string; bots: BotJson[] };
      expect(body.role).toBe('member');
      expect(body.bots.map((bot) => bot.botId)).toEqual([OWNER_BOT]);
      expect(upstream.botsCreated).toBe(created);
    });

    it('rolls the bot back when Supabase will not take it — no orphans in the deployer’s account', async () => {
      const unlucky = fakeJwt({ sub: 'unlucky', exp: inOneHour(), email: 'unlucky@example.com' });
      supabase.answers.set(unlucky, {});
      const created = upstream.botsCreated;
      const deleted = upstream.botsDeleted;
      supabase.failAttach(true);
      try {
        const res = await provision(unlucky);
        expect(res.status).toBe(503);
      } finally {
        supabase.failAttach(false);
      }
      expect(upstream.botsCreated).toBe(created + 1);
      expect(upstream.botsDeleted).toBe(deleted + 1);
    });

    it('creates the bot inside the deployment’s Chatfuel workspace', async () => {
      const billed = fakeJwt({ sub: 'billed', exp: inOneHour(), email: 'billed@example.com' });
      supabase.answers.set(billed, {});
      const res = await provision(billed, { name: 'Billed Co' });
      expect(res.status).toBe(200);
      // Not createBot: a bot outside the workspace draws on nobody's plan.
      expect(upstream.lastCreateVariables).toEqual({ workspaceID: WORKSPACE, title: 'Billed Co' });
    });

    it('says the workspace is full instead of half-creating an account', async () => {
      const late = fakeJwt({ sub: 'late', exp: inOneHour(), email: 'late@example.com' });
      supabase.answers.set(late, {});
      const recorded = supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_bot_created').length;
      upstream.failCreateWith('TooManyBotsInWorkspace');
      try {
        const res = await provision(late);
        expect(res.status).toBe(409);
        expect(await codeOfEnvelope(res)).toBe('WorkspaceFull');
      } finally {
        upstream.failCreateWith(null);
      }
      // Nothing was recorded, and the reservation was dropped: the account keeps
      // no half-made bot that would show as "being set up" forever.
      expect(supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_bot_created').length).toBe(recorded);
      expect(supabase.calls.filter((c) => c.path === '/rest/v1/rpc/cf_drop_bot_slot').length).toBeGreaterThan(0);
      const pending = [...supabase.tenantBots.values()].flat().filter((row) => row.botId === null);
      expect(pending).toEqual([]);
    });

    it('names the env var when the workspace id is wrong for this token', async () => {
      const wrong = fakeJwt({ sub: 'wrong', exp: inOneHour(), email: 'wrong@example.com' });
      supabase.answers.set(wrong, {});
      upstream.failCreateWith('NotEnoughPermissions');
      try {
        const res = await provision(wrong);
        expect(res.status).toBe(500);
        expect(await codeOfEnvelope(res)).toBe('ProxyAuthMisconfigured');
      } finally {
        upstream.failCreateWith(null);
      }
    });

    it('refuses to provision at all without CHATFUEL_WORKSPACE_ID', async () => {
      const { vite: workspaceless, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          auth: {
            supabaseUrl: supabase.url,
            anonKey: supabase.anonKey,
            serviceRoleKey: supabase.serviceKey,
          },
        }),
      ]);
      const homeless = fakeJwt({ sub: 'homeless', exp: inOneHour(), email: 'homeless@example.com' });
      supabase.answers.set(homeless, {});
      const created = upstream.botsCreated;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/provision`, {
          method: 'POST',
          headers: { authorization: `Bearer ${homeless}`, 'content-type': 'application/json' },
          body: '{}',
        });
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).toContain('CHATFUEL_WORKSPACE_ID');
      } finally {
        await workspaceless.close();
      }
      expect(upstream.botsCreated).toBe(created);
    });

    it('refuses without a session', async () => {
      const res = await provision(undefined);
      expect(res.status).toBe(401);
    });

    it('is not mounted without a service key', async () => {
      const { vite: keyless, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey },
        }),
      ]);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/provision`, {
          method: 'POST',
          headers: { authorization: `Bearer ${ownerJwt}`, 'content-type': 'application/json' },
          body: '{}',
        });
        expect(res.status).toBe(404);
      } finally {
        await keyless.close();
      }
    });
  });

  describe('recovery-link route', () => {
    const post = (jwt: string | undefined, body: unknown, extra: Record<string, string> = {}) =>
      fetch(`${gatedBase}/chatfuel/auth/recovery-link`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
          ...extra,
        },
        body: JSON.stringify(body),
      });
    const codeOf = async (res: Response) =>
      ((await res.json()) as { errors: Array<{ extensions: { code: string } }> }).errors[0]!.extensions.code;

    let errorLog: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => {
      errorLog.mockRestore();
    });
    // `RECOVERY-LINK` is the marker the line carries on purpose: an operator
    // redacting or auditing logs has to be able to find every credential that
    // ever passed through them.
    const loggedLink = (): string | undefined =>
      errorLog.mock.calls.map((c) => String(c[0])).find((line) => line.includes('RECOVERY-LINK'));

    it('refuses a body past the ceiling, and asks the database for nobody', async () => {
      const before = supabase.calls.length;
      const res = await post(ownerJwt, { email: 'plain@example.com', pad: 'x'.repeat(3 * 1024 * 1024) });
      expect(res.status).toBe(413);
      expect(await codeOf(res)).toBe('RequestTooLarge');
      expect(loggedLink()).toBeUndefined();
      const asked = supabase.calls.slice(before).filter((c) => c.path === '/rest/v1/rpc/cf_recovery_authorize');
      expect(asked).toHaveLength(0);
    });

    it('the link goes to the server log, never the response; the service key never leaves the server', async () => {
      // The Origin is the app's own — a foreign one is refused a route above
      // this one — and the link must be built from PUBLIC_URL regardless.
      const res = await post(ownerJwt, { email: 'plain@example.com' }, { origin: gatedBase });
      expect(res.status).toBe(200);
      const json = (await res.json()) as Record<string, unknown>;
      // The body carries no token and no link — only that it went to the log.
      expect(json).toEqual({ delivered: 'server-log' });
      const serialized = JSON.stringify(json);
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('reset-password');
      // The working link is in the server log instead.
      const hashed = supabase.hashedTokenFor('plain@example.com');
      const line = loggedLink();
      expect(line).toContain(
        `https://inbox.example.com/reset-password?token_hash=${encodeURIComponent(hashed)}&type=recovery`,
      );
      // …and it says whose account and on whose authority, for a log read
      // later without the audit table open.
      expect(line).toContain('plain@example.com');
      expect(line).toContain('owner');
      expect(line).toContain('t-owner');
      // The whole decision was the database's, asked with the CALLER's JWT +
      // anon key; generate_link with the service key.
      const authorize = supabase.calls.find((c) => c.path === '/rest/v1/rpc/cf_recovery_authorize')!;
      expect(authorize.authorization).toBe(`Bearer ${ownerJwt}`);
      expect(authorize.apikey).toBe(supabase.anonKey);
      expect(authorize.body).toEqual({ p_tenant_id: 't-owner', p_email: 'plain@example.com' });
      const gen = supabase.calls.find((c) => c.path === '/auth/v1/admin/generate_link')!;
      expect(gen.apikey).toBe(supabase.serviceKey);
      expect(gen.authorization).toBe(`Bearer ${supabase.serviceKey}`);
      expect(gen.body).toEqual({ type: 'recovery', email: 'plain@example.com' });
      expect(serialized).not.toContain(supabase.serviceKey);
      // And it left a trail: the log holds the link, not the fact that somebody
      // asked for one.
      const event = supabase.recoveryEvents.at(-1)!;
      expect(event).toMatchObject({ tenant_id: 't-owner', issuer: 'owner', target: 'plain' });
      expect(event.target_email).toBe('plain@example.com');
    });

    it('takes the address from PUBLIC_URL alone — not Origin, not X-Forwarded-Host, not Host', async () => {
      const res = await post(
        ownerJwt,
        { email: 'plain@example.com' },
        { origin: gatedBase, 'x-forwarded-host': 'collector.example.net' },
      );
      expect(res.status).toBe(200);
      const link = loggedLink();
      expect(link).toContain('https://inbox.example.com/reset-password?token_hash=');
      expect(link).not.toContain('collector.example.net');
      expect(link).not.toContain('127.0.0.1');
    });

    /* And the Origin a caller picks does not get this far at all. */
    it('refuses an origin this deployment does not serve, before the route', async () => {
      const before = supabase.calls.length;
      const res = await post(ownerJwt, { email: 'plain@example.com' }, { origin: 'https://collector.example.net' });
      expect(res.status).toBe(403);
      expect(await codeOf(res)).toBe('ProxyOriginForbidden');
      expect(loggedLink()).toBeUndefined();
      expect(supabase.calls.slice(before)).toHaveLength(0);
    });

    it('refuses rather than guesses when PUBLIC_URL is not set', async () => {
      const { vite: addressless, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          recoveryLinkLogging: true,
          auth: {
            supabaseUrl: supabase.url,
            anonKey: supabase.anonKey,
            serviceRoleKey: supabase.serviceKey,
          },
        }),
      ]);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/recovery-link`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${ownerJwt}`,
            'content-type': 'application/json',
            origin: `http://127.0.0.1:${port}`,
          },
          body: JSON.stringify({ email: 'member@example.com' }),
        });
        expect(res.status).toBe(409);
        expect(await codeOf(res)).toBe('ProxyPublicUrlMissing');
        expect(loggedLink()).toBeUndefined();
      } finally {
        await addressless.close();
      }
    });

    it('forbidden: no session → 401; a member → 403; a non-member target → 403; bad body → 400', async () => {
      const generated = supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length;
      expect((await post(undefined, { email: 'member@example.com' })).status).toBe(401);
      const asMember = await post(plainMemberJwt, { email: 'owner@example.com' });
      expect(asMember.status).toBe(403);
      expect(await codeOf(asMember)).toBe('NotEnoughPermissions');
      const target = await post(ownerJwt, { email: 'nobody@example.com' });
      expect(target.status).toBe(403);
      expect(await codeOf(target)).toBe('RecoveryTargetNotMember');
      const bad = await post(ownerJwt, { nope: 1 });
      expect(bad.status).toBe(400);
      expect(await codeOf(bad)).toBe('InvalidRequest');
      // Not one link was minted — nor logged — for any of them.
      expect(supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length).toBe(generated);
      expect(loggedLink()).toBeUndefined();
    });

    it('rank guard: an admin may not mint a link for the owner or a peer admin, only for someone below', async () => {
      const generated = supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length;
      // admin → owner: refused (target outranks the caller).
      const toOwner = await post(adminJwt, { email: 'owner@example.com' });
      expect(toOwner.status).toBe(403);
      expect(await codeOf(toOwner)).toBe('NotEnoughPermissions');
      // admin → admin (a peer of equal rank): refused.
      const toPeer = await post(adminJwt, { email: 'admin@example.com' });
      expect(toPeer.status).toBe(403);
      expect(await codeOf(toPeer)).toBe('NotEnoughPermissions');
      // Neither minted nor logged a link.
      expect(supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length).toBe(generated);
      expect(loggedLink()).toBeUndefined();
      // admin → member: allowed (member is below the admin).
      expect((await post(adminJwt, { email: 'plain@example.com' })).status).toBe(200);
      // owner → admin: allowed (owner outranks the admin).
      expect((await post(ownerJwt, { email: 'admin@example.com' })).status).toBe(200);
      // owner → owner (self, equal rank): refused — nobody may mint their own.
      expect((await post(ownerJwt, { email: 'owner@example.com' })).status).toBe(403);
    });

    it('refuses a target who stands in another workspace too — the link resets the account, not the membership', async () => {
      // member@example.com is a plain member here and the owner of t-member.
      // Both gates above let this through: they are a member of this workspace
      // and they rank below the caller. The one that matters is the third —
      // taking their account takes t-member, where this workspace's owner holds
      // no role at all.
      const generated = supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length;
      const events = supabase.recoveryEvents.length;
      const res = await post(ownerJwt, { email: 'member@example.com' });
      expect(res.status).toBe(403);
      expect(await codeOf(res)).toBe('RecoveryTargetCrossTenant');
      // Nothing was minted, nothing logged, and no row claims it was authorized.
      expect(supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length).toBe(generated);
      expect(loggedLink()).toBeUndefined();
      expect(supabase.recoveryEvents.length).toBe(events);
    });

    it('writes nothing and says so when the server log has not been opted in', async () => {
      // The default. The link is a working credential for the target's account
      // and the log is the only place it would go, so a deployment that has not
      // said its logs are a fit place for one gets a 501 instead of a link.
      const { vite: quiet, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          publicUrl: 'https://inbox.example.com',
          auth: {
            supabaseUrl: supabase.url,
            anonKey: supabase.anonKey,
            serviceRoleKey: supabase.serviceKey,
          },
        }),
      ]);
      try {
        const minted = supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length;
        const res = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/recovery-link`, {
          method: 'POST',
          headers: { authorization: `Bearer ${ownerJwt}`, 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'member@example.com' }),
        });
        // 501, not 200: the app reads it as "not enabled on this deployment"
        // rather than as a link that was delivered somewhere.
        expect(res.status).toBe(501);
        expect(await codeOf(res)).toBe('RecoveryLinkNotEnabled');
        // Nothing in the log, and nothing minted upstream either.
        expect(loggedLink()).toBeUndefined();
        expect(supabase.calls.filter((c) => c.path === '/auth/v1/admin/generate_link').length).toBe(minted);
        // And the 501 is only for callers the route would have admitted:
        // whether this deployment writes links to its log is a fact about its
        // configuration, so a caller with no session cannot read it off the
        // answer. Both deployments say the same thing to the same stranger.
        const anonymous = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/recovery-link`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'plain@example.com' }),
        });
        expect(anonymous.status).toBe(401);
        expect(await codeOf(anonymous)).toBe(await codeOf(await post(undefined, { email: 'plain@example.com' })));
      } finally {
        await quiet.close();
      }
    });

    it('is not mounted without a service key (falls through to the host)', async () => {
      const { vite: keyless, port } = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey },
        }),
      ]);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/chatfuel/auth/recovery-link`, {
          method: 'POST',
          headers: { authorization: `Bearer ${ownerJwt}`, 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'member@example.com' }),
        });
        expect(res.status).toBe(404);
      } finally {
        await keyless.close();
      }
    });
  });
});

/**
 * The fences that stand between two tenants of ONE deployment: what a query may
 * read through a bot it holds, what it may not rearrange, whose flow ids it may
 * name, and how much of the deployment it may take. The gate is what makes them
 * meaningful — with a single fence for everybody there is nobody to be foreign
 * to — so this suite runs its own gated proxy.
 */
describe('one tenant against another', () => {
  const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;
  const ALICE_BOT = 'bot-alice';
  const BOB_BOT = 'bot-bob';
  /** A flow id shaped the way Chatfuel writes them: 24 hex. */
  const FLOW = 'a'.repeat(24);
  /* Shaped the way the app really writes them — everything inside a bot hangs
     off `bot(id:)`, which is what the operation allowlist forwards. */
  const FLOWS_QUERY = 'query Q($botID: BotID!) { bot(id: $botID) { id flowsWithoutGroup { id } } }';
  const FLOW_QUERY = 'query Q($botID: BotID!, $flowID: FlowID!) { bot(id: $botID) { flow(flowID: $flowID) { id } } }';

  let supabase: MockSupabase;
  let gated: ViteDevServer;
  let gatedUrl: string;
  let gatedWsUrl: string;
  let aliceJwt: string;
  let bobJwt: string;

  const post = async (jwt: string, body: unknown) => {
    const seen = upstream.httpRequests.length;
    const res = await fetch(gatedUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { errors?: { extensions?: { code?: string } }[] };
    return {
      status: res.status,
      code: payload.errors?.[0]?.extensions?.code,
      forwarded: upstream.httpRequests.length - seen,
    };
  };

  beforeAll(async () => {
    supabase = await startMockSupabase();
    aliceJwt = fakeJwt({ sub: 'alice', exp: inOneHour(), email: 'alice@example.com' });
    bobJwt = fakeJwt({ sub: 'bob', exp: inOneHour(), email: 'bob@example.com' });
    supabase.answers.set(aliceJwt, { tenantId: 't-alice', botId: ALICE_BOT, role: 'owner', name: 'Alice' });
    supabase.answers.set(bobJwt, { tenantId: 't-bob', botId: BOB_BOT, role: 'owner', name: 'Bob' });
    const booted = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
      }),
    ]);
    gated = booted.vite;
    gatedUrl = `http://127.0.0.1:${booted.port}/chatfuel/graphql`;
    gatedWsUrl = `ws://127.0.0.1:${booted.port}/chatfuel/graphql`;
  });

  afterAll(async () => {
    await gated?.close();
    await supabase?.close();
    upstream.respondWith(200, { data: { ok: true } });
  });

  it('refuses the account this deployment runs on, read through a bot the caller does hold', async () => {
    for (const query of [
      `query { bot(id: "${ALICE_BOT}") { apiToken } }`,
      `query { bot(id: "${ALICE_BOT}") { invites { id } } }`,
      `query { bot(id: "${ALICE_BOT}") { workspace { bots { id } botsLimit } } }`,
    ]) {
      expect(await post(aliceJwt, { query }), query).toMatchObject({
        status: 403,
        code: 'AccountScopeBlocked',
        forwarded: 0,
      });
    }
  });

  it('still forwards what a bot’s own page reads', async () => {
    expect(
      await post(aliceJwt, { query: `query { bot(id: "${ALICE_BOT}") { id title members { id } } }` }),
    ).toMatchObject({ status: 200, forwarded: 1 });
  });

  it('refuses the mutations that would rearrange the deployment’s own workspaces and bots', async () => {
    for (const query of [
      'mutation { createWorkspaceAndBot(input: {}) { id } }',
      'mutation { workspaceCreate(input: {}) { id } }',
      `mutation { deleteBot(botID: "${ALICE_BOT}") { id } }`,
    ]) {
      expect(await post(aliceJwt, { query }), query).toMatchObject({
        status: 403,
        code: 'AccountStructureBlocked',
        forwarded: 0,
      });
    }
  });

  it('refuses a flow id it watched being handed to somebody else', async () => {
    upstream.respondWith(200, { data: { flows: [{ id: FLOW }] } });
    // Alice reads her own flows: this is where the proxy learns whose FLOW is.
    expect(await post(aliceJwt, { query: FLOWS_QUERY, variables: { botID: ALICE_BOT } })).toMatchObject({
      status: 200,
      forwarded: 1,
    });
    // Bob names it. Upstream would answer him — behind the master token it is
    // one account's flow — so the refusal has to happen here.
    expect(await post(bobJwt, { query: FLOW_QUERY, variables: { botID: BOB_BOT, flowID: FLOW } })).toMatchObject({
      status: 403,
      code: 'ResourceNotAllowed',
      forwarded: 0,
    });
    // Alice's own read of her own flow is untouched.
    expect(await post(aliceJwt, { query: FLOW_QUERY, variables: { botID: ALICE_BOT, flowID: FLOW } })).toMatchObject({
      status: 200,
      forwarded: 1,
    });
    // An id this proxy never saw handed out is forwarded: `bound` cannot turn a
    // legitimate request away.
    expect(
      await post(bobJwt, { query: FLOW_QUERY, variables: { botID: BOB_BOT, flowID: '0'.repeat(24) } }),
    ).toMatchObject({
      status: 200,
      forwarded: 1,
    });
    upstream.respondWith(200, { data: { ok: true } });
  });

  it('forwards nothing this app does not send, over HTTP or over a socket', async () => {
    // In the schema, reachable behind the master token, and named by no
    // document in the repository — which is the whole of the reason.
    expect(
      await post(aliceJwt, {
        query: 'query Q($botID: BotID!) { bot(id: $botID) { id } botTemplates { id } }',
        variables: { botID: ALICE_BOT },
      }),
    ).toMatchObject({ status: 403, code: 'OperationNotAllowed', forwarded: 0 });
    // The allowlist is a name check on the root, so an operation the app does
    // send is untouched by it.
    expect(
      await post(aliceJwt, {
        query: 'query Q($botID: BotID!) { bot(id: $botID) { id } }',
        variables: { botID: ALICE_BOT },
      }),
    ).toMatchObject({ status: 200, forwarded: 1 });

    // A socket is the same door: `subscribe` carries any operation at all.
    const sock = await rawSocket(gatedWsUrl);
    sock.send({ type: 'connection_init', payload: { authToken: `Bearer ${aliceJwt}` } });
    await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
    sock.send({
      id: '1',
      type: 'subscribe',
      payload: {
        query: 'subscription ($botID: BotID!) { botTemplatesChanged(botID: $botID) }',
        variables: { botID: ALICE_BOT },
      },
    });
    await waitFor(() => sock.errorCode() !== undefined);
    expect(sock.errorCode()).toBe('OperationNotAllowed');
    sock.close();
    await sock.closed;
  });

  it('carries a binding from the instance that learned it to one that never saw it', async () => {
    /* The point of the shared store, in one test: a second process of the same
       deployment, which answered none of Alice's requests and so remembers
       nothing at all, refuses Bob the id she was handed. Without the table it
       would forward it — its memory is empty, and an unknown id is a forwarded
       id in `bound` mode. */
    const HTTP_FLOW = 'b'.repeat(24);
    const SOCKET_FLOW = 'c'.repeat(24);
    const second = await bootVite([
      chatfuelProxy({
        upstream: upstream.url,
        token: TOKEN,
        auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
      }),
    ]);
    const secondUrl = `http://127.0.0.1:${second.port}/chatfuel/graphql`;
    const secondWs = `ws://127.0.0.1:${second.port}/chatfuel/graphql`;
    const askSecond = async (jwt: string, body: unknown) => {
      const seen = upstream.httpRequests.length;
      const res = await fetch(secondUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { errors?: { extensions?: { code?: string } }[] };
      return {
        status: res.status,
        code: payload.errors?.[0]?.extensions?.code,
        forwarded: upstream.httpRequests.length - seen,
      };
    };
    try {
      upstream.respondWith(200, { data: { flows: [{ id: HTTP_FLOW }, { id: SOCKET_FLOW }] } });
      // The first instance watches both ids being handed to Alice…
      expect(await post(aliceJwt, { query: FLOWS_QUERY, variables: { botID: ALICE_BOT } })).toMatchObject({
        status: 200,
      });
      // …and writes each one down when she NAMES it, which is the only moment
      // a binding is worth a row: an answer carries thousands of ids and a
      // session names a handful.
      for (const flowID of [HTTP_FLOW, SOCKET_FLOW]) {
        expect(await post(aliceJwt, { query: FLOW_QUERY, variables: { botID: ALICE_BOT, flowID } })).toMatchObject({
          status: 200,
        });
      }
      await vi.waitFor(
        () => {
          expect(supabase.resourceOwners.get(HTTP_FLOW)).toBe(ALICE_BOT);
          expect(supabase.resourceOwners.get(SOCKET_FLOW)).toBe(ALICE_BOT);
        },
        { timeout: 4_000 },
      );

      expect(
        await askSecond(bobJwt, { query: FLOW_QUERY, variables: { botID: BOB_BOT, flowID: HTTP_FLOW } }),
      ).toMatchObject({ status: 403, code: 'ResourceNotAllowed', forwarded: 0 });

      // A socket on that instance reads the same table. The lookup is the one
      // thing on the frame path that is not already in memory, so the frame
      // waits for it rather than going upstream unfenced.
      const cold = await rawSocket(secondWs);
      cold.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      await waitFor(() => cold.frames.some((frame) => frame.type === 'connection_ack'));
      cold.send({
        id: '1',
        type: 'subscribe',
        payload: { query: FLOW_QUERY, variables: { botID: BOB_BOT, flowID: SOCKET_FLOW } },
      });
      await waitFor(() => cold.errorCode() !== undefined);
      expect(cold.errorCode()).toBe('ResourceNotAllowed');
      cold.close();
      await cold.closed;
    } finally {
      await second.vite.close();
      upstream.respondWith(200, { data: { ok: true } });
    }
  });

  /*
   * Open mode has no tenants to tell apart: the fence names the deployment's
   * bots, the same set for everybody. Keying the socket ceiling on it gave
   * every caller one key, so `tenantMaxSockets` stopped being a per-tenant
   * share and became a deployment-wide ceiling an eighth the size of
   * `wsMaxSockets` — eight anonymous connects and nobody else got a socket.
   */
  it('does not put every open-mode socket under one tenant key', async () => {
    const booted = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN, tenantMaxSockets: 1 })]);
    const openWs = `ws://127.0.0.1:${booted.port}/chatfuel/graphql`;
    upstream.respondWith(200, {
      data: { currentUser: { id: 'u1', workspaces: [{ id: 'w1', bots: [{ id: 'b1' }] }] } },
    });
    const first = await rawSocket(openWs);
    const second = await rawSocket(openWs);
    try {
      for (const sock of [first, second]) {
        sock.send({ type: 'connection_init', payload: {} });
        await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
        expect(sock.frames.some((frame) => frame.type === 'connection_ack')).toBe(true);
      }
    } finally {
      first.close();
      second.close();
      await Promise.all([first.closed, second.closed]);
      await booted.vite.close();
      upstream.respondWith(200, { data: { ok: true } });
    }
  });

  describe('the ceilings one tenant may spend', () => {
    let small: ViteDevServer;
    let smallUrl: string;
    let smallWs: string;

    beforeAll(async () => {
      const booted = await bootVite([
        chatfuelProxy({
          upstream: upstream.url,
          token: TOKEN,
          tenantRequestsPerMinute: 2,
          tenantMaxSockets: 1,
          auth: { supabaseUrl: supabase.url, anonKey: supabase.anonKey, serviceRoleKey: supabase.serviceKey },
        }),
      ]);
      small = booted.vite;
      smallUrl = `http://127.0.0.1:${booted.port}/chatfuel/graphql`;
      smallWs = `ws://127.0.0.1:${booted.port}/chatfuel/graphql`;
    });

    afterAll(async () => {
      await small?.close();
    });

    const ask = async (jwt: string) => {
      const seen = upstream.httpRequests.length;
      const res = await fetch(smallUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ query: 'query Q($botID: BotID!) { bot(id: $botID) { id } }', variables: {} }),
      });
      const payload = (await res.json()) as { errors?: { extensions?: { code?: string } }[] };
      return {
        status: res.status,
        code: payload.errors?.[0]?.extensions?.code,
        forwarded: upstream.httpRequests.length - seen,
      };
    };

    it('spends one tenant’s request budget without spending another’s', async () => {
      expect(await ask(aliceJwt)).toMatchObject({ status: 200 });
      expect(await ask(aliceJwt)).toMatchObject({ status: 200 });
      expect(await ask(aliceJwt)).toMatchObject({ status: 429, code: 'TenantBusy', forwarded: 0 });
      expect(await ask(bobJwt)).toMatchObject({ status: 200 });
    });

    it('ends a socket when the session it was gated for would have expired', async () => {
      const soonJwt = fakeJwt({ sub: 'alice', exp: Math.floor(Date.now() / 1000) + 2, email: 'alice@example.com' });
      supabase.answers.set(soonJwt, { tenantId: 't-alice', botId: ALICE_BOT, role: 'owner', name: 'Alice' });
      const sock = await rawSocket(smallWs);
      sock.send({ type: 'connection_init', payload: { authToken: `Bearer ${soonJwt}` } });
      await waitFor(() => sock.frames.some((frame) => frame.type === 'connection_ack'));
      // 1012, not an auth code: graphql-ws reconnects, asks for a token again,
      // and the fresh socket is gated from scratch.
      expect((await sock.closed).code).toBe(1012);
    });

    /*
     * The slot is counted after the gate has answered, and the gate is awaited:
     * a socket that went away in that window ran its close handler with nothing
     * counted yet, and the count made afterwards had no second close to release
     * it. One leaked slot per dropped connect, and the sweep frees an entry only
     * once its sockets are back to zero — so the tenant never got the slot back.
     */
    it('releases the slot when the socket is dropped while the gate is still out', async () => {
      supabase.holdGate(200);
      const dropped = await rawSocket(smallWs);
      dropped.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      dropped.terminate();
      await dropped.closed;
      // Past the hold, so the count the relay makes on the answer has been made.
      await new Promise((resolve) => setTimeout(resolve, 500));
      supabase.holdGate(0);

      const next = await rawSocket(smallWs);
      next.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      await waitFor(() => next.frames.some((frame) => frame.type === 'connection_ack'));
      expect(next.frames.some((frame) => frame.type === 'connection_ack')).toBe(true);
      next.close();
      await next.closed;
    });

    it('holds one tenant to its share of the sockets', async () => {
      const first = await rawSocket(smallWs);
      first.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      await waitFor(() => first.frames.some((frame) => frame.type === 'connection_ack'));
      const second = await rawSocket(smallWs);
      second.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      expect((await second.closed).code).toBe(4429);
      // Released on close: the same tenant connects again once the first is gone.
      first.close();
      await first.closed;
      const third = await rawSocket(smallWs);
      third.send({ type: 'connection_init', payload: { authToken: `Bearer ${bobJwt}` } });
      await waitFor(() => third.frames.some((frame) => frame.type === 'connection_ack'));
      third.close();
      await third.closed;
    });
  });
});

/**
 * The registry, over HTTP. Every other fence here answers "may this caller name
 * that field?"; this one answers "is this document one the app ships at all?",
 * which is the question a caller composing their own document out of permitted
 * root fields walks straight past.
 */
describe('the documents this app ships', () => {
  const CURRENT_USER = String(CurrentUserDocument);
  const BOTS_LIST = String(BotsListDocument);
  /* In the schema, reachable behind the master token, and written by nobody. */
  const UNSHIPPED = 'query TheirOwn { user { id email apiToken } }';

  /* The socket half needs a subscription the mock upstream answers, and the
     generated core namespace holds none — so the app here ships core plus this
     one document. A module is an object of document strings and nothing more,
     which is exactly what a generated namespace is. */
  const SHIPPED_SUB = 'subscription Unseen($botID: BotID!) { unseenOpenDialogsCountChanged(botID: $botID) }';
  const UNSHIPPED_SUB = 'subscription TheirOwn($botID: BotID!) { unseenOpenDialogsCountChanged(botID: $botID) }';

  let registryUrl: string;
  let registryWsUrl: string;
  let emptyUrl: string;
  let servers: ViteDevServer[] = [];

  beforeAll(async () => {
    const withDocs = await bootVite([
      chatfuelProxy({ upstream: upstream.url, token: TOKEN, operations: [core, { UnseenDocument: SHIPPED_SUB }] }),
    ]);
    const withNone = await bootVite([chatfuelProxy({ upstream: upstream.url, token: TOKEN, operations: [] })]);
    servers = [withDocs.vite, withNone.vite];
    registryUrl = `http://127.0.0.1:${withDocs.port}/chatfuel/graphql`;
    registryWsUrl = `ws://127.0.0.1:${withDocs.port}/chatfuel/graphql`;
    emptyUrl = `http://127.0.0.1:${withNone.port}/chatfuel/graphql`;
  });

  afterAll(async () => {
    for (const server of servers) await server.close();
  });

  async function send(base: string, body: unknown) {
    const seen = upstream.httpRequests.length;
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { errors?: { message?: string; extensions?: { code?: string } }[] };
    return {
      status: res.status,
      code: payload.errors?.[0]?.extensions?.code,
      message: payload.errors?.[0]?.message,
      forwarded: upstream.httpRequests.length - seen,
      sent: upstream.httpRequests.at(-1),
    };
  }

  // Test 1 (the HTTP half) — the shipped client's own bytes, unchanged.
  it('forwards a document the app ships, byte for byte', async () => {
    const answer = await send(registryUrl, { query: CURRENT_USER, operationName: 'CurrentUser' });
    expect(answer).toMatchObject({ status: 200, forwarded: 1 });
    expect((JSON.parse(answer.sent!.body) as { query: string }).query).toBe(CURRENT_USER);
  });

  // Test 2 — the case the operation allowlist cannot see: same root, more asked of it.
  it('refuses the same operation with a field added to it', async () => {
    const widened = CURRENT_USER.replace('currentUser {', 'currentUser { apiToken ');
    expect(widened).not.toBe(CURRENT_USER);
    expect(await send(registryUrl, { query: widened, operationName: 'CurrentUser' })).toMatchObject({
      status: 403,
      code: 'OperationNotInRegistry',
      forwarded: 0,
    });
  });

  // Test 3 — refused, and the refusal says which document by name.
  it('refuses a document the app never wrote, and names it', async () => {
    const answer = await send(registryUrl, { query: UNSHIPPED, operationName: 'TheirOwn' });
    expect(answer).toMatchObject({ status: 403, code: 'OperationNotInRegistry', forwarded: 0 });
    expect(answer.message).toContain('TheirOwn');
  });

  it('keeps a caller-supplied name out of its own sentence when it is not a name', async () => {
    const answer = await send(registryUrl, { query: UNSHIPPED, operationName: 'not a name <b>' });
    expect(answer.message).not.toContain('<b>');
    expect(answer.message).toContain('This document');
  });

  // Test 9 / 13 — the canonical lane, and what it forwards.
  it('takes the same document reformatted, and sends the app’s text rather than the caller’s', async () => {
    const reformatted = `\n\n  # a bundler moved this\n  ${CURRENT_USER.replaceAll(' ', '\n  ')}\n`;
    expect(reformatted).not.toBe(CURRENT_USER);
    const answer = await send(registryUrl, { query: reformatted, operationName: 'CurrentUser' });
    expect(answer).toMatchObject({ status: 200, forwarded: 1 });
    // The whole point of the second lane: what runs is the app's document.
    expect((JSON.parse(answer.sent!.body) as { query: string }).query).toBe(CURRENT_USER);
  });

  it('reads the operation name off the document, never off the body', async () => {
    // A name belonging to another of the app's operations, beside a document
    // that defines one. Upstream must be told what the document says.
    const answer = await send(registryUrl, { query: CURRENT_USER, operationName: 'BotsList' });
    expect(answer).toMatchObject({ status: 200, forwarded: 1 });
    expect((JSON.parse(answer.sent!.body) as { operationName: string }).operationName).toBe('CurrentUser');
  });

  // Test 8 — a batch is admitted whole or not at all.
  it('refuses a whole batch for one entry the app does not ship', async () => {
    expect(await send(registryUrl, [{ query: CURRENT_USER }, { query: BOTS_LIST }])).toMatchObject({
      status: 200,
      forwarded: 1,
    });
    expect(await send(registryUrl, [{ query: CURRENT_USER }, { query: UNSHIPPED }])).toMatchObject({
      status: 403,
      code: 'OperationNotInRegistry',
      forwarded: 0,
    });
    expect(await send(registryUrl, [{ query: UNSHIPPED }, { query: CURRENT_USER }])).toMatchObject({
      status: 403,
      code: 'OperationNotInRegistry',
      forwarded: 0,
    });
  });

  /* The ceiling on how many operations one body may carry. A batch is one
     request to the in-flight ceiling and one token to the tenant's minute
     whatever its length, so the count needed a limit of its own. */
  it('takes a batch at the ceiling and refuses the one past it', async () => {
    const atLimit = Array.from({ length: 25 }, () => ({ query: CURRENT_USER }));
    expect(await send(registryUrl, atLimit)).toMatchObject({ status: 200, forwarded: 1 });
    expect(await send(registryUrl, [...atLimit, { query: CURRENT_USER }])).toMatchObject({
      status: 413,
      code: 'BatchTooLarge',
      forwarded: 0,
    });
  });

  it('counts the entries before it reads any of them', async () => {
    // Every entry here is a syntax error, and the answer is still the batch
    // refusal: the count is checked before the first document is parsed, which
    // is the whole reason the ceiling is worth having.
    const unparseable = Array.from({ length: 26 }, () => ({ query: 'query {' }));
    expect(await send(registryUrl, unparseable)).toMatchObject({
      status: 413,
      code: 'BatchTooLarge',
      forwarded: 0,
    });
  });

  // Test 4 (the HTTP half) — fail-closed, checked rather than assumed.
  it('forwards nothing at all for an app that declared it ships nothing', async () => {
    expect(await send(emptyUrl, { query: CURRENT_USER, operationName: 'CurrentUser' })).toMatchObject({
      status: 403,
      code: 'OperationNotInRegistry',
      forwarded: 0,
    });
  });

  it('is distinguishable from a body that would not parse', async () => {
    // An app developer whose document missed the barrel must not spend the
    // afternoon looking for a syntax error.
    const answer = await send(registryUrl, { query: 'query {' });
    expect(answer.code).toBe('ProxyMalformedQuery');
    expect(answer.code).not.toBe('OperationNotInRegistry');
  });

  it('asks nothing of a host that passed no operations at all', async () => {
    // The migration path: an app scaffolded before the barrel existed boots and
    // serves, and says so on its startup line instead.
    expect(await send(httpUrl, { query: UNSHIPPED, operationName: 'TheirOwn' })).toMatchObject({
      status: 200,
      forwarded: 1,
    });
  });

  /*
   * Test 7, the other half. A `subscribe` frame carries any document at all, so
   * a socket is the same door the HTTP route is: everything above has a twin
   * here, on the frames rather than on the body.
   */
  async function subscribe(query: string, id = '1') {
    const seen = upstream.wsFrames.length;
    const sock = await rawSocket(registryWsUrl);
    sock.send({ type: 'connection_init', payload: {} });
    sock.send({ id, type: 'subscribe', payload: { query, variables: { botID: 'b1' } } });
    await waitFor(() => sock.errorCode() !== undefined || sock.frames.some((frame) => frame.type === 'next'));
    const relayed = upstream.wsFrames
      .slice(seen)
      .map((frame) => JSON.parse(frame) as { type?: string; payload?: { query?: string; operationName?: string } })
      .filter((frame) => frame.type === 'subscribe');
    sock.close();
    return { code: sock.errorCode(), streamed: sock.frames.some((frame) => frame.type === 'next'), relayed };
  }

  it('relays a subscription the app ships, and sends the app’s own text', async () => {
    const answer = await subscribe(SHIPPED_SUB);
    expect(answer).toMatchObject({ code: undefined, streamed: true });
    expect(answer.relayed).toHaveLength(1);
    expect(answer.relayed[0]!.payload?.query).toBe(SHIPPED_SUB);
    expect(answer.relayed[0]!.payload?.operationName).toBe('Unseen');
  });

  it('refuses a subscription the app never wrote, and opens nothing upstream', async () => {
    // Same shape, same field, same variables — a different document. A check on
    // the operation's root field could not tell these two apart.
    const answer = await subscribe(UNSHIPPED_SUB);
    expect(answer).toMatchObject({ code: 'OperationNotInRegistry', streamed: false });
    expect(answer.relayed).toHaveLength(0);
  });

  it('takes the same subscription reformatted, and still sends the app’s text', async () => {
    const reformatted = `# a bundler moved this\n${SHIPPED_SUB.replaceAll(' ', '\n  ')}`;
    expect(reformatted).not.toBe(SHIPPED_SUB);
    const answer = await subscribe(reformatted);
    expect(answer).toMatchObject({ code: undefined, streamed: true });
    expect(answer.relayed[0]!.payload?.query).toBe(SHIPPED_SUB);
  });

  it('holds across a reconnect, which is when a subscription is re-sent', async () => {
    // graphql-ws answers a dropped socket by resubscribing on a fresh one, so
    // the check that matters is the one a second socket gets.
    expect(await subscribe(SHIPPED_SUB, '1')).toMatchObject({ code: undefined, streamed: true });
    expect(await subscribe(UNSHIPPED_SUB, '1')).toMatchObject({ code: 'OperationNotInRegistry', streamed: false });
    expect(await subscribe(SHIPPED_SUB, '2')).toMatchObject({ code: undefined, streamed: true });
  });

  it('tells an unparseable frame apart from an unshipped one on the socket too', async () => {
    expect(await subscribe('subscription {')).toMatchObject({ code: 'ProxyMalformedQuery', streamed: false });
  });
});

/**
 * The dev server is the third host, and until now the only one that would
 * serve a configuration the other two refuse. `vite dev` binds loopback by
 * default, so this is reachable only with `--host` — which is exactly the case
 * the refusals were written for.
 */
describe('the dev server refuses what the other two hosts refuse', () => {
  const bootOn = (host: string | boolean, options: Parameters<typeof chatfuelProxy>[0] = {}) =>
    createViteServer({
      configFile: false,
      envFile: false,
      logLevel: 'silent',
      appType: 'custom',
      server: { host, port: 0 },
      plugins: [chatfuelProxy({ token: TOKEN, ...options })],
    });

  it('refuses open mode on a host that is not loopback', async () => {
    await expect(bootOn(true)).rejects.toThrow(/REFUSING TO SERVE: open mode/);
  });

  it('serves the same configuration on loopback, which is nobody else\u2019s business', async () => {
    const vite = await bootOn('127.0.0.1');
    await vite.close();
  });

  it('reads Vite\u2019s host tri-state the way Vite does', async () => {
    // `false` and unset both mean loopback; a string means itself.
    const off = await bootOn(false);
    await off.close();
    await expect(bootOn('0.0.0.0')).rejects.toThrow(/REFUSING TO SERVE/);
  });
});

describe('the dev server answers the same health route as the other two hosts', () => {
  it('answers /chatfuel/healthz instead of leaving it to the SPA fallback', async () => {
    const { vite, port } = await bootVite([chatfuelProxy({ upstream: 'https://example.invalid', token: TOKEN })]);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/chatfuel/healthz`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/json');
      expect(await res.json()).toEqual({ ok: true });
    } finally {
      await vite.close();
    }
  });

  it('says 503 when the configuration has a problem, and still says nothing else', async () => {
    const { vite, port } = await bootVite([chatfuelProxy({ upstream: 'https://example.invalid', token: '' })]);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/chatfuel/healthz`);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ ok: false });
    } finally {
      await vite.close();
    }
  });
});
