/**
 * Everything sent out, and how it gets past a company proxy.
 *
 * Node's built-in fetch ignores HTTP_PROXY and HTTPS_PROXY unless the process
 * was started with a flag nobody types, and `ws` never reads them at all. On a
 * machine that can only reach the internet through a proxy, that is the whole
 * app failing to load with a timeout that looks like an outage. So the HTTP
 * outbound path is built here: reading the environment, and `outboundFetch`.
 * The WebSocket half is `egress-ws.ts`, split off because of what it imports
 * — an HTTP-layer agent library that this entry's consumers must not inherit.
 *
 * NO_PROXY is honoured, and loopback is always exempt — a dev server on this
 * machine is not the proxy's business.
 */

/** The variables, in the order they win. Lowercase before uppercase, as everywhere else; an empty value means unset. */
const PROXY_VARS = ['https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY', 'all_proxy', 'ALL_PROXY'] as const;

const LOOPBACK = ['localhost', '127.0.0.1', '::1', '[::1]'];

/** Just enough of an environment to read: the real `process.env` satisfies it, and so does a plain object in a test. */
export type ProxyReadableEnv = Record<string, string | undefined>;

export interface ProxySetting {
  /** The value as written, credentials and all. Never logged — see describeProxy. */
  url: string;
  /** The variable it came from, so a message can name the thing to fix. */
  source: string;
}

export function proxyEnv(env: ProxyReadableEnv = process.env): ProxySetting | undefined {
  for (const source of PROXY_VARS) {
    const url = env[source]?.trim();
    if (url) return { url, source };
  }
  return undefined;
}

/**
 * `http://user:pass@host:8080` → `http://***:***@host:8080`. What cannot be
 * parsed keeps only what follows the `@`.
 *
 * The username goes too, and that is not caution: Squid and Zscaler are
 * routinely handed `HTTPS_PROXY=http://<token>@proxy:8080`, where the whole
 * credential IS the username and there is no password at all. This string is
 * printed by `doctor` and by every "could not reach" message, which is output
 * people paste into tickets.
 */
export function maskProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.username && !parsed.password) return url;
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    const at = url.lastIndexOf('@');
    return at === -1 ? url : `***@${url.slice(at + 1)}`;
  }
}

/** `HTTPS_PROXY=http://proxy.example:8080`, safe to print. The only proxy string that ever reaches a log line. */
export function describeProxy(env: ProxyReadableEnv = process.env): string | undefined {
  const setting = proxyEnv(env);
  return setting && `${setting.source}=${maskProxyUrl(setting.url)}`;
}

/** The startup line's tail: ` — outbound via HTTPS_PROXY=…`, or nothing at all when the machine talks to the internet directly. */
export function describeEgress(env: ProxyReadableEnv = process.env): string {
  const proxy = describeProxy(env);
  return proxy ? ` — outbound via ${proxy}` : '';
}

/** The one sentence that separates "a proxy is in the way" from "your token is bad". Undefined when no proxy is configured. */
export function proxyHint(host: string, env: ProxyReadableEnv = process.env): string | undefined {
  const proxy = describeProxy(env);
  return proxy && `Sent through ${proxy} — check that the proxy allows ${host}.`;
}

/** NO_PROXY, as every other client reads it: a comma list of hosts, each matching itself and its subdomains, or `*` for all of them. */
export function proxyBypassed(host: string, env: ProxyReadableEnv): boolean {
  const listed = `${env.no_proxy ?? ''},${env.NO_PROXY ?? ''}`
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (listed.includes('*')) return true;
  const name = host.toLowerCase();
  return [...listed, ...LOOPBACK].some((entry) => {
    const bare = entry.replace(/^\./, '').replace(/:\d+$/, '');
    return name === bare || name.endsWith(`.${bare}`);
  });
}

/**
 * The proxy library, loaded only when there is a proxy to talk to — and never
 * fatal. If it cannot be loaded the call goes direct and fails the way it did
 * before, which is better than a server that will not start.
 */
interface UndiciModule {
  fetch: (input: string | URL, init?: Record<string, unknown>) => Promise<unknown>;
  EnvHttpProxyAgent: new (options?: { noProxy?: string }) => unknown;
}

let undiciPromise: Promise<UndiciModule | undefined> | undefined;

function loadUndici(): Promise<UndiciModule | undefined> {
  undiciPromise ??= import('undici').then((mod) => mod as unknown as UndiciModule).catch(() => undefined);
  return undiciPromise;
}

/** Keyed by the environment it was built from, so a changed variable builds a new one instead of using the stale agent. */
let dispatcherCache: { key: string; dispatcher: unknown } | undefined;

async function dispatcherFor(env: ProxyReadableEnv): Promise<unknown | undefined> {
  const setting = proxyEnv(env);
  if (!setting) return undefined;
  const noProxy = [env.no_proxy?.trim(), env.NO_PROXY?.trim(), ...LOOPBACK].filter(Boolean).join(',');
  const key = `${setting.source}=${setting.url}|${noProxy}`;
  if (dispatcherCache?.key === key) return dispatcherCache.dispatcher;
  const undici = await loadUndici();
  if (!undici) return undefined;
  const dispatcher = new undici.EnvHttpProxyAgent({ noProxy });
  dispatcherCache = { key, dispatcher };
  return dispatcher;
}

/**
 * `fetch`, through the proxy when the environment names one.
 *
 * The types are cast in this one place: the proxy library brings its own
 * Response and its own request shape, and every caller should keep working
 * with the platform types.
 */
export const outboundFetch: typeof globalThis.fetch = async (input, init) => {
  const dispatcher = await dispatcherFor(process.env);
  if (!dispatcher) return globalThis.fetch(input, init);
  const undici = await loadUndici();
  if (!undici) return globalThis.fetch(input, init);
  const response = await undici.fetch(input as string | URL, {
    ...(init as Record<string, unknown> | undefined),
    dispatcher,
  });
  return response as Response;
};
