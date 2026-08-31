import { createServer, type Server } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { describeEgress, describeProxy, outboundFetch, proxyEnv } from '../src/egress';
import { upstreamAgent } from '../src/egress-ws';

/**
 * The proxy's own outbound side. Two separate paths have to be covered, and
 * only one of them is fetch: the relay dials its upstream WebSocket with an
 * HTTP-layer agent, which no fetch dispatcher can reach.
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
    const tunnel = connect((inside.address() as AddressInfo).port, '127.0.0.1', () => {
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
        resolve({
          url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
          seen,
          close: () => new Promise<void>((done) => server.close(() => inside.close(() => done()))),
        });
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

describe('reading the environment', () => {
  it('prefers the lowercase spelling, and https over http', () => {
    expect(proxyEnv({ HTTPS_PROXY: 'http://upper:1', https_proxy: 'http://lower:1' })?.url).toBe('http://lower:1');
    expect(proxyEnv({ http_proxy: 'http://plain:1', https_proxy: 'http://secure:1' })?.source).toBe('https_proxy');
  });

  it('reads an empty value as unset', () => {
    expect(proxyEnv({ HTTPS_PROXY: '  ' })).toBeUndefined();
  });

  it('hides the password everywhere it is printed', () => {
    const env = { HTTPS_PROXY: 'http://sam:hunter2@proxy.example:8080' };
    expect(describeProxy(env)).not.toContain('hunter2');
    expect(describeEgress(env)).toContain('outbound via HTTPS_PROXY=');
    expect(describeEgress({})).toBe('');
  });
});

describe('upstreamAgent', () => {
  const env = { HTTPS_PROXY: 'http://proxy.example:8080' };

  it('tunnels a secure upstream', () => {
    expect(upstreamAgent('wss://panel.chatfuel.com/graphql', env)).toBeDefined();
  });

  it('leaves a plain-ws upstream alone — that one is local, and local is never proxied', () => {
    expect(upstreamAgent('ws://127.0.0.1:5173/graphql', env)).toBeUndefined();
  });

  it('honours NO_PROXY and loopback', () => {
    expect(upstreamAgent('wss://panel.chatfuel.com/graphql', { ...env, NO_PROXY: 'chatfuel.com' })).toBeUndefined();
    expect(upstreamAgent('wss://localhost/graphql', env)).toBeUndefined();
  });

  it('is nothing at all when no proxy is configured', () => {
    expect(upstreamAgent('wss://panel.chatfuel.com/graphql', {})).toBeUndefined();
  });
});

describe('outboundFetch', () => {
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

  it('leaves loopback alone, so a local upstream still answers', async () => {
    const proxy = await startProxy();
    const upstream = createServer((_req, res) => res.end('direct'));
    await new Promise<void>((done) => upstream.listen(0, '127.0.0.1', () => done()));
    try {
      process.env.HTTP_PROXY = proxy.url;
      const res = await outboundFetch(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}/`);
      expect(await res.text()).toBe('direct');
      expect(proxy.seen).toEqual([]);
    } finally {
      await new Promise<void>((done) => upstream.close(() => done()));
      await proxy.close();
    }
  });
});
