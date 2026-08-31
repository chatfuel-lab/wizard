import type { Agent } from 'node:http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { proxyEnv, proxyBypassed, type ProxyReadableEnv } from './egress.js';

/**
 * The WebSocket half of egress, in its own file because of what it imports:
 * `ws` speaks node:http, so tunnelling the relay needs an HTTP-layer agent
 * from `https-proxy-agent` — a dependency of this package that consumers of
 * the plain `./egress` entry (env reading + outbound fetch) must not inherit.
 */

/**
 * The agent the WebSocket relay dials through, or undefined for a direct
 * connection. The fetch dispatcher in `egress.ts` covers nothing here.
 *
 * Only a secure upstream is tunnelled: a plain-ws upstream is a local one, and
 * a local one is never proxied anyway.
 */
export function upstreamAgent(target: string, env: ProxyReadableEnv = process.env): Agent | undefined {
  const setting = proxyEnv(env);
  if (!setting) return undefined;
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'wss:' && url.protocol !== 'https:') return undefined;
  if (proxyBypassed(url.hostname, env)) return undefined;
  return new HttpsProxyAgent(setting.url);
}
