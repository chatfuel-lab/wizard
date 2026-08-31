/**
 * The Vercel face of the Chatfuel proxy — the third host for the same core.
 *
 * `vite.ts` mounts that core on the dev server, `server.ts` mounts it on a
 * node:http server that also serves `dist/`. Here Vercel serves `dist/` itself
 * (it is a static build) and this function is only the proxy: HTTP forward,
 * REST passthrough, the auth routes, and the graphql-transport-ws relay.
 * Vercel Functions accept incoming WebSocket upgrades when the module's
 * default export IS an http.Server, which is why this file exports one rather
 * than the usual (req, res) handler.
 *
 * WHY A FUNCTION AND NOT A PLAIN REWRITE. `vercel.json` can rewrite a path
 * straight to an external origin, and that would be the cheap way to reach
 * panel.chatfuel.com. It cannot work here: a rewrite forwards the BROWSER's
 * headers and has no way to add one, so the Chatfuel token would have to be
 * sent by the client — the single thing this proxy exists to prevent. The
 * `headers` block in vercel.json sets RESPONSE headers, not request ones. So
 * the rewrite in vercel.json is an internal path map and everything that
 * reaches Chatfuel goes through the core below, with the same gate and the
 * same fences as in dev.
 *
 * WHY ONE FILE AND NOT api/chatfuel/[...path].ts. Vercel's zero-config `api/`
 * directory compiles a catch-all filename into a route that matches ONE path
 * segment: `^/api/chatfuel/([^/]+)$`. `/chatfuel/graphql` survives that;
 * `/chatfuel/auth/provision` and `/chatfuel/api/filestorage/upload/bot` do not
 * — they 404 before any code runs. So the function is a single static
 * filename, and the path the browser asked for travels as a query parameter:
 *
 *   vercel.json:  /chatfuel/:cfpath*  ->  /api/chatfuel
 *   Vercel emits: /api/chatfuel?cfpath=auth/provision
 *   restoreUrl(): /chatfuel/auth/provision
 *
 * after which the core sees exactly the paths it serves in dev, and its route
 * table needs no per-host variant.
 *
 * WHY THE IMPORT BELOW CARRIES A `.js` EXTENSION. Vercel's Node builder does
 * not bundle: it transpiles each `.ts` next to the others and leaves the
 * specifiers exactly as written. The app is `"type": "module"`, so Node ESM
 * refuses an extensionless relative specifier at runtime and the function dies
 * with ERR_MODULE_NOT_FOUND on its first invocation — a 500 the build cannot
 * predict, because the build never loads it. Every relative import in the
 * proxy core carries the extension for the same reason. Vite and tsc both
 * resolve `./x.js` back to `x.ts`, so dev and the type check are unaffected.
 *
 * Env is read at module scope, once per cold start, from process.env alone:
 * on Vercel there is no .env to load, `vercel env` is the only source.
 */
import { createServer, type IncomingMessage } from 'node:http';
/* @chatfuel:proxy-vercel-import (the wizard rewrites this to the vendored copy) */
import {
  createChatfuelProxy,
  describeAuthMode,
  describeProblem,
  guardUnhandledRejections,
  serveHealth,
  HEALTH_PATH,
  serveRefusals,
} from '../../vite-plugin-proxy/src/core.js';
/* @chatfuel:end-proxy-vercel-import */
/* The app's own operation surface — see src/operationDocs.ts. Static, so the
   builder's tracer follows it into the function bundle by itself. */
import { operations } from '../src/operationDocs.js';

/** The paths the browser uses — the proxy core's own defaults, unchanged. */
export const PUBLIC_PREFIX = '/chatfuel';

/** The query parameter Vercel fills from the `:cfpath*` wildcard in vercel.json. */
export const PATH_PARAM = 'cfpath';

/* The health route belongs to the core, so that the three hosts cannot drift
   apart on it again. Re-exported because the deploy script and the tests here
   ask this file for it. */
export { HEALTH_PATH };

/**
 * Turn what Vercel routed here back into what the browser asked for, or null
 * for a parameter no rewrite of ours produced.
 *
 * A request that arrives WITHOUT the parameter is passed through untouched, so
 * the same file also answers a direct hit on `/chatfuel/...` — routing details
 * are Vercel's to change, and the WebSocket path is the same string as the
 * HTTP one, so a mismatch there is a livechat with no live in it.
 *
 * `/api/chatfuel` is reachable directly, so the caller can write this parameter
 * themselves: the input that decides which route runs is the caller's, and it
 * is decoded once on the way in. Nothing here gives that any privilege today —
 * the core routes on `new URL(...).pathname`, where a `..` collapses to a route
 * that does not exist — but the next check hung on this path would be the one
 * it got past. So the shapes the rewrite cannot produce are refused rather than
 * normalised:
 *
 * - the parameter written twice, where `get` takes the first and an upstream
 *   reading the last would act on the other one;
 * - a value that decodes to a leading `/`, a `..` or `.` segment, a `?` or a
 *   `#` — each of which means something other than "one path under /chatfuel";
 * - anything else is re-encoded segment by segment, so what the core parses is
 *   a string this file wrote rather than one it passed along.
 */
export function restoreUrl(url: string | undefined): string | null {
  const parsed = new URL(url ?? '/', 'http://proxy.invalid');
  const named = parsed.searchParams.getAll(PATH_PARAM);
  if (named.length > 1) return null;
  const cfpath = named[0];
  if (cfpath === undefined) return url ?? '/';
  if (cfpath.startsWith('/') || cfpath.includes('?') || cfpath.includes('#')) return null;
  const segments = cfpath.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  parsed.searchParams.delete(PATH_PARAM);
  const query = parsed.searchParams.toString();
  return `${PUBLIC_PREFIX}/${segments.map(encodeURIComponent).join('/')}${query ? `?${query}` : ''}`;
}

const proxy = createChatfuelProxy({ operations }, process.env);

// One line per cold start. Never includes a key — describeAuthMode says the
// mode and nothing else, and describeProblem names the env var, not its value.
for (const problem of proxy.config.problems) {
  console.error(`chatfuel proxy: ${describeProblem(problem, proxy.config)}`);
}
console.log(`chatfuel proxy: ${describeAuthMode(proxy.config)}`);

/*
 * A deployment has no loopback to bind, so the host argument is what this
 * function always is: a public hostname. Open mode here means the master token
 * answers whoever finds the URL, and that has to be said on purpose - see
 * serveRefusals. Refused, the function still boots and still answers the health
 * route, because a deployment that cannot say why it is refusing is a deployment
 * nobody can fix.
 */
const refusals = serveRefusals(proxy.config, 'vercel');
for (const refusal of refusals) console.error(`chatfuel proxy: ${refusal}`);

// This module owns its process on Vercel, and an unhandled rejection would end
// it mid-request for whoever else is on the same instance.
guardUnhandledRejections();

/* The core's own notion of a path (envelope.ts), rather than a second one that
   splits the string on `?`. Two answers to "what path is this?" in one request
   is how a check ends up guarding a spelling instead of a route. */
const pathOf = (req: IncomingMessage): string => new URL(req.url ?? '/', 'http://proxy.invalid').pathname;

const server = createServer((req, res) => {
  const restored = restoreUrl(req.url);
  if (restored === null) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ errors: [{ message: 'Bad proxy route', extensions: { code: 'InvalidRequest' } }] }));
    return;
  }
  req.url = restored;
  if (pathOf(req) === HEALTH_PATH) {
    serveHealth(proxy.config, res);
    return;
  }
  if (refusals.length > 0) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.end(
      JSON.stringify({
        errors: [
          { message: 'This deployment is not configured to serve', extensions: { code: 'ProxyRefusedToServe' } },
        ],
      }),
    );
    return;
  }
  if (proxy.handleRequest(req, res)) return;
  res.statusCode = 404;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ errors: [{ message: 'No such proxy route', extensions: { code: 'NotFound' } }] }));
});

server.on('upgrade', (req, socket, head) => {
  const restored = restoreUrl(req.url);
  if (restored === null) {
    socket.destroy();
    return;
  }
  req.url = restored;
  if (refusals.length > 0) {
    socket.destroy();
    return;
  }
  if (!proxy.handleUpgrade(req, socket, head)) socket.destroy();
});

export default server;
