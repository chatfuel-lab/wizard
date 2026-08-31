import { createServer, type Server } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { describeProxy, maskProxyUrl, outboundFetch, proxyEnv, proxyHint } from '../src/net';

/**
 * The wizard's outbound side. Node's own fetch ignores the proxy variables, so
 * everything here is about the one question a person behind a company proxy
 * asks: did the request go through the proxy, and if it failed, does the
 * message say so.
 *
 * The proxy is a real one-file server on loopback rather than a stub, because
 * what is being tested is whether a library talks to it at all.
 */

/**
 * A proxy that answers every tunnel itself and records what it was asked for.
 * The request library opens a CONNECT tunnel even for a plain-http target, so
 * a proxy that only handled absolute-form requests would never see anything.
 */
function startProxy(): Promise<{ url: string; seen: string[]; close: () => Promise<void> }> {
  const seen: string[] = [];
  const inside = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('through the proxy');
  });
  const server: Server = createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`);
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('through the proxy');
  });
  server.on('connect', (req, socket, head) => {
    seen.push(`CONNECT ${req.url}`);
    const insidePort = (inside.address() as AddressInfo).port;
    const tunnel = connect(insidePort, '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head?.length) tunnel.write(head);
      socket.pipe(tunnel).pipe(socket);
    });
    tunnel.on('error', () => socket.destroy());
    socket.on('error', () => tunnel.destroy());
  });
  return new Promise((resolve) => {
    inside.listen(0, '127.0.0.1', () => {
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address() as AddressInfo;
        resolve({
          url: `http://127.0.0.1:${port}`,
          seen,
          close: () => new Promise<void>((done) => server.close(() => inside.close(() => done()))),
        });
      });
    });
  });
}

function startEcho(): Promise<{ url: string; hits: number; close: () => Promise<void> }> {
  const state = { hits: 0 };
  const server = createServer((_req, res) => {
    state.hits += 1;
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('direct');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        get hits() {
          return state.hits;
        },
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

const PROXY_KEYS = [
  'https_proxy',
  'HTTPS_PROXY',
  'http_proxy',
  'HTTP_PROXY',
  'all_proxy',
  'ALL_PROXY',
  'no_proxy',
  'NO_PROXY',
];

afterEach(() => {
  for (const key of PROXY_KEYS) delete process.env[key];
});

describe('proxyEnv', () => {
  it('prefers the lowercase spelling, and https over http', () => {
    expect(proxyEnv({ HTTPS_PROXY: 'http://upper:1', https_proxy: 'http://lower:1' })?.url).toBe('http://lower:1');
    expect(proxyEnv({ http_proxy: 'http://plain:1', https_proxy: 'http://secure:1' })?.source).toBe('https_proxy');
    expect(proxyEnv({ ALL_PROXY: 'http://any:1' })?.source).toBe('ALL_PROXY');
  });

  it('reads an empty or blank value as unset — an exported empty variable means no proxy', () => {
    expect(proxyEnv({ HTTPS_PROXY: '', HTTP_PROXY: '   ' })).toBeUndefined();
    expect(proxyEnv({})).toBeUndefined();
  });
});

describe('describeProxy', () => {
  it('names the variable and hides both halves of the credential', () => {
    const shown = describeProxy({ HTTPS_PROXY: 'http://sam:hunter2@proxy.example:8080' });
    expect(shown).toContain('HTTPS_PROXY=');
    expect(shown).toContain('proxy.example:8080');
    expect(shown).not.toContain('hunter2');
    expect(shown).not.toContain('sam');
  });

  /* The shape a corporate proxy actually hands out: the whole credential is the
     username and there is no password at all. Masking only the password would
     print it in full. */
  it('hides a credential that is only a username', () => {
    const shown = describeProxy({ HTTPS_PROXY: 'http://a1b2c3d4e5f6a7b8@proxy.example:8080' });
    expect(shown).not.toContain('a1b2c3d4e5f6a7b8');
    expect(shown).toContain('proxy.example:8080');
  });

  it('leaves a plain proxy URL alone', () => {
    expect(describeProxy({ HTTP_PROXY: 'http://proxy.example:8080' })).toBe('HTTP_PROXY=http://proxy.example:8080');
  });

  it('drops everything before the @ when the URL cannot be parsed', () => {
    expect(maskProxyUrl('not a url with sam:hunter2@proxy.example')).toBe('***@proxy.example');
  });
});

describe('proxyHint', () => {
  it('is the sentence that separates a blocked proxy from a bad token', () => {
    expect(proxyHint('panel.chatfuel.com', { HTTPS_PROXY: 'http://proxy.example:8080' })).toBe(
      'Sent through HTTPS_PROXY=http://proxy.example:8080 — check that the proxy allows panel.chatfuel.com.',
    );
  });

  it('says nothing when there is no proxy to blame', () => {
    expect(proxyHint('panel.chatfuel.com', {})).toBeUndefined();
  });
});

describe('outboundFetch', () => {
  it('goes direct when no proxy is configured', async () => {
    const echo = await startEcho();
    try {
      const res = await outboundFetch(echo.url);
      expect(await res.text()).toBe('direct');
      expect(echo.hits).toBe(1);
    } finally {
      await echo.close();
    }
  });

  it('goes through the proxy when one is configured', async () => {
    const proxy = await startProxy();
    try {
      process.env.HTTP_PROXY = proxy.url;
      const res = await outboundFetch('http://not-a-real-host.invalid/graphql');
      expect(await res.text()).toBe('through the proxy');
      expect(proxy.seen.join(' ')).toContain('not-a-real-host.invalid');
    } finally {
      await proxy.close();
    }
  });

  it('leaves loopback alone — a server on this machine is not the proxy business', async () => {
    const proxy = await startProxy();
    const echo = await startEcho();
    try {
      process.env.HTTP_PROXY = proxy.url;
      const res = await outboundFetch(echo.url);
      expect(await res.text()).toBe('direct');
      expect(proxy.seen).toEqual([]);
    } finally {
      await echo.close();
      await proxy.close();
    }
  });

  it('honours NO_PROXY', async () => {
    const proxy = await startProxy();
    try {
      process.env.HTTP_PROXY = proxy.url;
      process.env.NO_PROXY = 'not-a-real-host.invalid';
      await expect(outboundFetch('http://not-a-real-host.invalid/graphql')).rejects.toThrow();
      expect(proxy.seen).toEqual([]);
    } finally {
      await proxy.close();
    }
  });
});
