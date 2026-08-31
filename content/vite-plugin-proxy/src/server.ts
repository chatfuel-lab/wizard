/**
 * The production server: static `dist/` + the same Chatfuel proxy core the
 * Vite dev server mounts (HTTP forward, REST passthrough, WS relay, auth
 * gate). One node:http server, no framework, no `vite` import — this file is
 * bundled by `vite build -c vite.server.config.ts` into `server/dist/entry.js`
 * and started with `node server/dist/entry.js`.
 *
 * Request order: <healthPath> (`/chatfuel/healthz`) → proxy.handleRequest →
 * static files. Static
 * serving is GET/HEAD only, path-contained inside distDir twice over: `..`,
 * an absolute segment, and a leading-dot segment are refused lexically before
 * any filesystem call, and the file `stat` found is then `realpath`'d and
 * re-checked against distDir's own realpath, so a symlink planted under
 * distDir cannot serve whatever it points at outside it. `immutable` under
 * `/assets/` (Vite hashes those names), `no-cache` for index.html, and an
 * unknown path that is not asset-shaped falls back to index.html — the app
 * routes in the path, so `/deals/board` is a page and the server is the one
 * that has to say so. A path under `/assets/`, or one whose extension is a
 * type this serves, keeps its 404: a renamed bundle must never receive HTML.
 *
 * `basePath` mounts all of that under a sub-path ('/app/'), for an app served
 * somewhere other than a domain root. Anything outside it is a 404.
 *
 * VITE_* values are baked into `dist/` at build time while this server reads
 * its env at start — the startup line prints the gate state so a mismatch
 * (client built with Supabase, server started without it) is visible.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import {
  configWarnings,
  createChatfuelProxy,
  describeAuthMode,
  describeEgress,
  describeProblem,
  guardUnhandledRejections,
  reachableBeyondLoopback,
  serveHealth,
  HEALTH_PATH,
  reportAuthSettingsWarnings,
  serveRefusals,
  type ChatfuelProxy,
  type ChatfuelProxyOptions,
  type ProxyEnv,
} from './core.js';
import { setSecurityHeaders } from './securityHeaders.js';

export interface ChatfuelServerOptions {
  /** Absolute path of the built client (`dist/`). */
  distDir: string;
  /** Default: Number(process.env.PORT ?? 3000). */
  port?: number;
  /** Default '0.0.0.0'. */
  host?: string;
  /** Default process.env — the proxy reads CHATFUEL_TOKEN, VITE_SUPABASE_*, … from it. */
  env?: ProxyEnv;
  /** Proxy options (upstream, paths, allowedBotIds, auth override…). */
  proxy?: ChatfuelProxyOptions;
  /** Default `/chatfuel/healthz` — the path every host answers on. */
  healthPath?: string;
  /** Where the app is mounted; default '/'. Must match the build's `base`. */
  basePath?: string;
  /** Startup / problem lines. Default console.log / console.error. */
  log?: (line: string) => void;
  logError?: (line: string) => void;
}

export interface ChatfuelServer {
  server: Server;
  proxy: ChatfuelProxy;
  listen(): Promise<{ port: number; host: string }>;
  close(): Promise<void>;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

export { CSP, SECURITY_HEADERS, setSecurityHeaders } from './securityHeaders.js';

/**
 * Map a request path onto a file inside distDir. Undefined = refused (a `..`
 * segment, a backslash, an absolute/UNC-looking segment, a leading-dot
 * segment, a NUL byte, or a decode error) — checked on the RAW path before
 * any normalisation, so `/../etc/passwd` is a 404 even though URL parsing
 * would fold it away.
 *
 * The leading-dot refusal is not about dotfiles Vite would ever emit — it
 * would not — it is about `distDir` being wherever the host checked the
 * build out to, which can be a project root that also holds a `.env` or a
 * `.git`. Nothing in this build ever names one, so refusing the whole class
 * costs nothing real and closes the file a build tool did not think to hide.
 *
 * This function is lexical only, on purpose: it is exported and exercised
 * against paths that do not exist on disk. What it decides is containment of
 * the NAME; `serveFile` is where containment of the actual inode — the file a
 * symlink under distDir might point at — gets checked, because that needs a
 * `realpath` and this function must stay synchronous.
 */
export function resolveStaticPath(distDir: string, rawPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return undefined;
  }
  if (decoded.includes('\0') || decoded.includes('\\')) return undefined;
  const segments = decoded.split('/');
  if (segments.some((s) => s === '..' || /^[A-Za-z]:$/.test(s))) return undefined;
  if (segments.some((s) => s !== '' && s.startsWith('.'))) return undefined;
  if (decoded.startsWith('//')) return undefined;
  const root = resolve(distDir);
  const abs = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
  if (abs !== root && !abs.startsWith(root + sep)) return undefined;
  return abs;
}

/** '/app' and 'app/' alike become '/app/'; nothing becomes '/'. */
export function normalizeBasePath(raw: string | undefined): string {
  const value = (raw ?? '/').trim();
  if (value === '' || value === '/' || value === '.' || value === './') return '/';
  const withLead = value.startsWith('/') ? value : `/${value}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

/**
 * The request path below the mount point, or undefined when it is outside it.
 * '/app' (the mount point without its slash) is the app's own root.
 */
export function pathUnderBase(requestPath: string, basePath: string): string | undefined {
  if (basePath === '/') return requestPath;
  if (requestPath === basePath.slice(0, -1)) return '/';
  if (!requestPath.startsWith(basePath)) return undefined;
  return requestPath.slice(basePath.length - 1);
}

/**
 * Asset-shaped: under `/assets/`, or carrying an extension this server has a
 * content type for. Those keep their 404 instead of being served the app —
 * everything else is a route.
 */
export function looksLikeAsset(path: string): boolean {
  if (path.startsWith('/assets/')) return true;
  const last = path.split('/').pop() ?? '';
  const dot = last.lastIndexOf('.');
  return dot > 0 && MIME[last.slice(dot).toLowerCase()] !== undefined;
}

export function createChatfuelServer(options: ChatfuelServerOptions): ChatfuelServer {
  const env = options.env ?? (process.env as ProxyEnv);
  const port = options.port ?? Number(env.PORT ?? 3000);
  const host = options.host ?? '0.0.0.0';
  const healthPath = options.healthPath ?? HEALTH_PATH;
  const basePath = normalizeBasePath(options.basePath);
  const distDir = resolve(options.distDir);
  const indexHtml = resolve(distDir, 'index.html');
  const log = options.log ?? ((line: string) => console.log(line));
  const logError = options.logError ?? ((line: string) => console.error(line));

  guardUnhandledRejections(logError);

  /* The bind is known here and nowhere inside the proxy, and it is half the
     answer to "is a name other than ours even possible?" — see hostAllowed. */
  const proxy = createChatfuelProxy({ loopbackOnly: !reachableBeyondLoopback(host), ...(options.proxy ?? {}) }, env);

  /* distDir resolved once, not per request: it does not move while the
     process is up, and computing it again on every static request would be a
     second symlink resolution paid for nothing. */
  let realRootPromise: Promise<string> | undefined;
  const realRoot = (): Promise<string> => {
    realRootPromise ??= realpath(distDir).catch(() => distDir);
    return realRootPromise;
  };

  async function serveFile(req: IncomingMessage, res: ServerResponse, file: string, cache: string): Promise<boolean> {
    let info;
    try {
      info = await stat(file);
    } catch {
      return false;
    }
    if (!info.isFile()) return false;
    /* `stat` follows symlinks, so passing containment on the lexical path
       (resolveStaticPath) is not the same as passing it on disk: a symlink
       planted under distDir can name a file anywhere the process can read.
       realpath resolves what `file` actually points at and the prefix check
       runs again against it. */
    let real: string;
    try {
      real = await realpath(file);
    } catch {
      return false;
    }
    const root = await realRoot();
    if (real !== root && !real.startsWith(root + sep)) return false;
    res.statusCode = 200;
    res.setHeader('content-type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('content-length', String(info.size));
    res.setHeader('cache-control', cache);
    setSecurityHeaders(res);
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }
    await new Promise<void>((done) => {
      const stream = createReadStream(file);
      stream.on('error', () => {
        if (!res.headersSent) res.statusCode = 500;
        res.end();
        done();
      });
      stream.on('close', done);
      stream.pipe(res);
    });
    return true;
  }

  async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('allow', 'GET, HEAD');
      res.end();
      return;
    }
    const rawUrl = req.url ?? '/';
    const qs = rawUrl.indexOf('?');
    const requestPath = qs >= 0 ? rawUrl.slice(0, qs) : rawUrl;
    const rawPath = pathUnderBase(requestPath, basePath);
    if (rawPath === undefined) {
      res.statusCode = 404;
      setSecurityHeaders(res);
      res.end('Not found');
      return;
    }
    const file = resolveStaticPath(distDir, rawPath);
    if (!file) {
      res.statusCode = 404;
      setSecurityHeaders(res);
      res.end('Not found');
      return;
    }
    const isIndex = file === indexHtml || file === distDir;
    const immutable = rawPath.startsWith('/assets/');
    const target = file === distDir ? indexHtml : file;
    if (
      await serveFile(
        req,
        res,
        target,
        immutable ? 'public, max-age=31536000, immutable' : isIndex ? 'no-cache' : 'public, max-age=0, must-revalidate',
      )
    ) {
      return;
    }
    /* Not a file. The app routes in the path, so an unknown path is a page:
       '/deals/board' and '/team/ann@acme.co' alike. Only an asset-shaped path
       keeps its 404, so a bundle that was renamed never receives HTML. */
    if (!looksLikeAsset(rawPath) && (await serveFile(req, res, indexHtml, 'no-cache'))) return;
    res.statusCode = 404;
    setSecurityHeaders(res);
    res.end('Not found');
  }

  const server = createServer((req, res) => {
    const pathname = (req.url ?? '/').split('?')[0];
    if (pathname === healthPath) {
      serveHealth(proxy.config, res);
      return;
    }
    if (proxy.handleRequest(req, res)) return;
    void serveStatic(req, res);
  });

  server.on('upgrade', (req, socket, head) => {
    if (!proxy.handleUpgrade(req, socket, head)) socket.destroy();
  });

  let onSigterm: (() => void) | undefined;

  function close(): Promise<void> {
    if (onSigterm) {
      process.off('SIGTERM', onSigterm);
      onSigterm = undefined;
    }
    proxy.close();
    return new Promise<void>((done) => {
      server.close(() => done());
      // Idle keep-alive connections would otherwise hold close() open.
      server.closeAllConnections?.();
    });
  }

  function listen(): Promise<{ port: number; host: string }> {
    /* Before the socket, not after it. A refusal printed next to a server that
       is already answering is a log line; a refusal that never binds is the
       fence it was written to be. */
    const refusals = serveRefusals(proxy.config, host);
    if (refusals.length > 0) {
      for (const refusal of refusals) logError(`chatfuel server: ${refusal}`);
      return Promise.reject(new Error(refusals[0]));
    }
    return new Promise((done, fail) => {
      server.once('error', fail);
      server.listen(port, host, () => {
        server.off('error', fail);
        const address = server.address();
        const boundPort = typeof address === 'object' && address !== null ? address.port : port;
        for (const problem of proxy.config.problems) {
          logError(`chatfuel server: ${describeProblem(problem, proxy.config)}`);
        }
        const at = basePath === '/' ? '' : ` at ${basePath}`;
        log(
          `chatfuel server: listening on http://${host}:${boundPort}${at} — serving ${distDir}; ${describeAuthMode(proxy.config)}${describeEgress(env)}`,
        );
        /* After the listening line rather than before it: these say what this
           deployment's shape costs, and they read as an answer to the line
           above. The ones that follow from the env are printed here; the one
           that needs Supabase to answer is not waited for, because a slow
           project must not be a server that is slow to serve. */
        for (const warning of configWarnings(proxy.config, host)) {
          logError(`chatfuel server: ${warning}`);
        }
        void reportAuthSettingsWarnings(proxy.config, (line) => logError(`chatfuel server: ${line}`));
        onSigterm = () => {
          void close();
        };
        process.once('SIGTERM', onSigterm);
        done({ port: boundPort, host });
      });
    });
  }

  return { server, proxy, listen, close };
}
