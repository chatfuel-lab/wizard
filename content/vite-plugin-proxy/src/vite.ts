/**
 * The Vite dev-server face of the Chatfuel proxy — the only file in this
 * package that imports `vite`. Everything that matters lives in core.ts; this
 * plugin only (a) builds the env bag the way Vite users expect (`.env` files
 * via loadEnv with an EMPTY prefix, so unprefixed secrets stay out of the
 * client bundle, then process.env on top) and (b) mounts the core's
 * handleRequest / handleUpgrade on the dev server.
 */
import { loadEnv, type Plugin } from 'vite';
import {
  createChatfuelProxy,
  describeAuthMode,
  describeEgress,
  describeProblem,
  serveHealth,
  reachableBeyondLoopback,
  serveRefusals,
  HEALTH_PATH,
  type ChatfuelProxy,
  type ChatfuelProxyOptions,
} from './core.js';

/**
 * The address this dev server will answer on, in the terms `serveRefusals`
 * asks in.
 *
 * Vite's `server.host` is a tri-state and the default is the safe one: unset
 * or `false` means loopback, `true` means every interface (`vite --host`), a
 * string means itself. Guessing wrong in the safe direction would be the wrong
 * way round — the refusals exist for the host that strangers can reach.
 */
function boundHost(host: string | boolean | undefined): string {
  if (host === undefined || host === false) return '127.0.0.1';
  if (host === true) return '0.0.0.0';
  return host;
}

export function chatfuelProxy(options: ChatfuelProxyOptions = {}): Plugin {
  let proxy: ChatfuelProxy | undefined;

  return {
    name: 'chatfuel-proxy',
    apply: 'serve',

    configResolved(config) {
      // Empty prefix: reads unprefixed vars from .env without ever exposing
      // them to the client bundle (import.meta.env only gets VITE_*).
      // process.env wins over .env, an explicit option wins over both.
      const env = { ...loadEnv(config.mode, config.envDir ?? config.root, ''), ...process.env };
      /* Vite already answers "which names is this dev server reachable as" for
         its own middleware; the proxy's upgrade listener never sees that answer,
         so it is handed the same one rather than a second list to keep in sync.
         `true` there means the operator turned the check off, and turning it off
         once is turning it off for both. */
      const viteHosts = config.server.allowedHosts;
      proxy = createChatfuelProxy(
        {
          loopbackOnly: !reachableBeyondLoopback(boundHost(config.server.host)),
          allowedHosts: viteHosts === true ? '*' : viteHosts,
          ...options,
        },
        env,
      );
      for (const problem of proxy.config.problems) {
        // Do not crash the dev server — requests answer with a synthetic
        // envelope instead so the problem is visible in the app UI.
        config.logger.error(`[chatfuel-proxy] ${describeProblem(problem, proxy.config)}`);
      }
      config.logger.info(`chatfuel proxy: ${describeAuthMode(proxy.config)}${describeEgress(env)}`);
    },

    configureServer(server) {
      const active = proxy;
      if (!active) return;
      /* The same refusals the standalone server and the Vercel function make,
         and for the same reason: a configuration two of the three hosts will
         not serve is not one the third may serve either. Thrown rather than
         logged, and before the middleware is mounted — `vite dev --host` on an
         open proxy must not reach the point of answering. */
      const refusals = serveRefusals(active.config, boundHost(server.config.server.host));
      if (refusals.length > 0) {
        for (const refusal of refusals) server.config.logger.error(`[chatfuel-proxy] ${refusal}`);
        throw new Error(refusals[0]);
      }
      server.middlewares.use((req, res, next) => {
        /* Before the proxy and long before Vite's SPA fallback, which is what
           answered this path until now: a health check written against the dev
           server got `index.html` with a 200 and never checked anything. */
        if ((req.url ?? '/').split('?')[0] === HEALTH_PATH) {
          serveHealth(active.config, res);
          return;
        }
        if (!active.handleRequest(req, res)) next();
      });
      server.httpServer?.on('upgrade', (req, socket, head) => {
        // A pure no-op for non-matching sockets (Vite's HMR included).
        active.handleUpgrade(req, socket, head);
      });
      server.httpServer?.once('close', () => active.close());
    },
  };
}

export default chatfuelProxy;
