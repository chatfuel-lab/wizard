/**
 * Everything that leaves this machine goes through here: the proxy variables
 * and how they are read, the environment every Vercel CLI call runs with, and
 * a fetch that honours the proxy the way Node's own does not.
 *
 * The Vercel CLI's own traffic cannot be routed through a dispatcher from
 * here: childEnv passes the proxy variables through, and the CLI honours them
 * or it does not. What this script owns is narrower — its own probes go
 * through the proxy (outboundFetch), and every failure line names the proxy
 * the requests went through (describeProxy), so a proxy that refused a host
 * is named instead of invisible.
 */

/**
 * The proxy variables, in the order they win, and the two things this script
 * needs from them.
 *
 * Node's own fetch ignores them, so on a machine that reaches the internet only
 * through a company proxy both checks below would time out and report a
 * perfectly healthy deployment as unreachable.
 */
const PROXY_VARS = ['https_proxy', 'HTTPS_PROXY', 'http_proxy', 'HTTP_PROXY', 'all_proxy', 'ALL_PROXY'];

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ url: string, source: string } | undefined}
 */
export function proxyEnv(env = process.env) {
  for (const source of PROXY_VARS) {
    const url = env[source]?.trim();
    if (url) return { url, source };
  }
  return undefined;
}

/**
 * `HTTPS_PROXY=http://user:***@host:8080` — the password never reaches the terminal.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | undefined}
 */
export function describeProxy(env = process.env) {
  const setting = proxyEnv(env);
  if (!setting) return undefined;
  let shown = setting.url;
  try {
    const parsed = new URL(setting.url);
    if (parsed.password) {
      parsed.password = '***';
      shown = parsed.toString();
    }
  } catch {
    const at = shown.lastIndexOf('@');
    if (at !== -1) shown = `***@${shown.slice(at + 1)}`;
  }
  return `${setting.source}=${shown}`;
}

/** Environment names that never reach a child, whatever case they arrive in. */
const DROPPED = new Set(['vercel_telemetry_disabled', 'npm_config_package', 'npm_config_call']);

/**
 * The environment every Vercel CLI call runs with: this process's, minus the two
 * variables that steer `npm exec`, plus the one flag that keeps the CLI's
 * telemetry upload out of the way.
 *
 * Shipping the app does not depend on that upload, so it is not left to chance:
 * on a machine whose egress policy allows only the hosts it was told about, the
 * blocked telemetry host ended a deploy in a bare `fetch failed` seconds after
 * the upload finished, and the same run went green once telemetry was off.
 *
 * Three decisions worth keeping:
 *   - a COPY of the environment plus one key, never a hand-picked list. A child
 *     started through a shell on Windows needs SystemRoot, ComSpec and PATHEXT,
 *     and a list that forgets one breaks every call here for a reason that
 *     looks nothing like the missing variable.
 *   - an existing value is overwritten rather than honoured. The CLI reads this
 *     variable as "set at all", so `VERCEL_TELEMETRY_DISABLED=0` in somebody's
 *     shell already means off to it - honouring that string would only put the
 *     failure back for the person who typed it hoping for the opposite.
 *   - any case variant is dropped first. Environment names are case-insensitive
 *     on Windows, so a lowercase copy sitting next to ours is a coin flip.
 *
 * The two npm variables go for a different reason. `npx --package=X ...` and
 * `npx -c ...` export npm_config_package / npm_config_call to everything they
 * start, and npm exec reads its OWN config from those - so a nested
 * `npx vercel@latest whoami` sees a package list it never asked for, skips
 * swapping the spec for the package's bin name, and runs `sh -c 'vercel@latest
 * whoami'`: `sh: vercel@latest: command not found`, from a CLI that is
 * perfectly installable. Only those two are dropped; npm_config_registry,
 * _cache and _proxy are what lets npx fetch the CLI at all.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export function childEnv(env = process.env) {
  /** @type {NodeJS.ProcessEnv} */
  const next = {};
  for (const [key, value] of Object.entries(env)) {
    if (!DROPPED.has(key.toLowerCase())) next[key] = value;
  }
  next.VERCEL_TELEMETRY_DISABLED = '1';
  return next;
}

/** @type {{ fetch: typeof import('undici').fetch, agent: import('undici').EnvHttpProxyAgent } | null | undefined} */
let dispatcher;

/**
 * `fetch`, through the proxy when one is configured. A proxy library that will not load is not fatal: the call goes direct and fails the way it did before.
 *
 * The init shape is the sliver this script sends, not the full RequestInit:
 * Node's and the proxy library's request types disagree about bodies, and no
 * call here has one.
 *
 * @param {string} url
 * @param {{ method?: string, redirect?: 'error' | 'follow' | 'manual', signal?: AbortSignal }} [init]
 */
export async function outboundFetch(url, init) {
  if (!proxyEnv()) return fetch(url, init);
  if (dispatcher === undefined) {
    dispatcher = await import('undici')
      .then((undici) => ({
        fetch: undici.fetch,
        agent: new undici.EnvHttpProxyAgent({
          noProxy: [process.env.no_proxy, process.env.NO_PROXY, 'localhost,127.0.0.1,::1'].filter(Boolean).join(','),
        }),
      }))
      .catch(() => null);
  }
  if (!dispatcher) return fetch(url, init);
  return dispatcher.fetch(url, { ...init, dispatcher: dispatcher.agent });
}
