/**
 * Production entry point: serves the built client (`dist/`) and proxies
 * Chatfuel traffic (HTTP + WS) with the token injected server-side, behind the
 * Supabase auth gate when the auth module is installed.
 *
 * Built by `vite build -c vite.server.config.ts` into `server/dist/entry.js`
 * and started with `npm start`. Everything configurable is env:
 *   CHATFUEL_TOKEN            the dashboard token (server-side only)
 *   CHATFUEL_API_BASE         upstream override
 *   VITE_CHATFUEL_WORKSPACE_ID the workspace the app opens on (client-side)
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 *                             all three → the auth gate is on; none → off;
 *                             some → the server fails closed and says so
 *   SUPABASE_SERVICE_ROLE_KEY optional; mounts the admin recovery-link route
 *   PORT                      default 3000
 *   BASE_PATH                 where the app is mounted ('/app'); default '/'.
 *                             Must match the `base` the client was built with
 *                             (VITE_BASE_PATH), or the page loads and the
 *                             assets 404.
 *
 * A .env next to the app is loaded on start (real env vars win over it), so
 * `npm run build && npm start` behaves like `npm run dev` on a dev machine.
 *
 * The VITE_* values above are ALSO baked into `dist/` at build time, so the
 * build and the runtime env must agree — the startup line prints the gate
 * state so a mismatch is visible immediately.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * `vite dev` reads .env through Vite's loadEnv; a plain node process reads
 * nothing, so `npm start` right after `npm build` would come up with no
 * Chatfuel token and the auth gate off — working locally, silently degraded in
 * production. Load .env here, if there is one. Real environment variables
 * (Docker, compose, a PaaS) are NOT overwritten: they win over the file, which
 * is why this is safe to keep in the deployed image. Node < 20.12 has no
 * loadEnvFile — such a deployment simply has to set real env vars.
 */
try {
  process.loadEnvFile?.(resolve(process.cwd(), '.env'));
} catch {
  /* no .env next to the app — env vars are expected to come from the platform */
}
/* @chatfuel:proxy-server-import (the wizard rewrites this to the vendored copy) */
import { createChatfuelServer } from '../../vite-plugin-proxy/src/server';
/* @chatfuel:end-proxy-server-import */
/* The app's own operation surface — see src/operationDocs.ts. */
import { operations } from '../src/operationDocs.js';

// This file runs from server/dist/entry.js, so dist/ is two levels up.
const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist');

const app = createChatfuelServer({
  distDir,
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST,
  basePath: process.env.BASE_PATH,
  env: process.env,
  proxy: { operations },
});

/* listen() refuses some configurations outright, and the refusal is already on
   stderr in full sentences by the time it rejects. A stack trace on top of it
   would bury the one line worth reading, so this exits on the message. */
let port: number;
try {
  ({ port } = await app.listen());
} catch (error) {
  console.error(`chatfuel app: not started — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const basePath = process.env.BASE_PATH ?? '';
console.log(`chatfuel app: http://localhost:${port}${basePath.replace(/\/+$/, '')}`);
