// ---------------------------------------------------------------------------
// Pass 8 — template invariants the wizard transforms depend on: marked blocks
// present; tsconfig fallback paths match the pruneTsconfigFallbacks regex shape
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const shellPkgScripts = (dir: string): string[] =>
  Object.keys(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {});

export function checkTemplateInvariants(ctx: ValidateContext): void {
  const { root, shellDir, manifests } = ctx;

  const viteConfig = readFileSync(join(shellDir, 'vite.config.ts'), 'utf8');
  for (const marker of ['@chatfuel:proxy-import', '@chatfuel:end-proxy-import']) {
    if (!viteConfig.includes(marker))
      fail(`content/shell/vite.config.ts: marked block "${marker}" is missing — scaffold would fail`);
  }
  // The tab icon and the tab name are rewritten on disk by the wizard, because
  // the head is parsed long before any VITE_* value could be read. Both tags
  // have to be there for applyBrandHtml to find them, and the icon has to keep
  // resolving when the app is mounted under a sub-path.
  const indexHtml = readFileSync(join(shellDir, 'index.html'), 'utf8');
  if (!/<link rel="icon"[^>]*>/.test(indexHtml)) {
    fail('content/shell/index.html: no <link rel="icon"> — applyBrandHtml would throw (template drift?)');
  }
  if (!/<title>[^<]*<\/title>/.test(indexHtml)) {
    fail('content/shell/index.html: no <title> — applyBrandHtml would throw (template drift?)');
  }
  if (!indexHtml.includes('%BASE_URL%')) {
    fail('content/shell/index.html: the icon href must go through %BASE_URL% — a sub-path mount would 404 on it');
  }
  if (!existsSync(join(shellDir, 'public', 'logo.svg'))) {
    fail('content/shell/public/logo.svg is missing — a scaffold nobody branded would ship no mark at all');
  }
  const indexCss = readFileSync(join(shellDir, 'src', 'index.css'), 'utf8');
  for (const marker of ['@chatfuel:ui-css', '@chatfuel:end-ui-css']) {
    if (!indexCss.includes(marker))
      fail(`content/shell/src/index.css: marked block "${marker}" is missing — scaffold would fail`);
  }
  // The nav table is curated for every module and filtered by the wizard to the
  // ones a scaffold installed, so both its markers and the shape pruneNavGroups
  // reads have to survive any edit to it.
  const navGroups = readFileSync(join(shellDir, 'src', 'modules', 'navGroups.tsx'), 'utf8');
  for (const marker of ['@chatfuel:nav-groups', '@chatfuel:end-nav-groups']) {
    if (!navGroups.includes(marker))
      fail(`content/shell/src/modules/navGroups.tsx: marked block "${marker}" is missing — scaffold would fail`);
  }
  const navBlock = navGroups.slice(
    navGroups.indexOf('@chatfuel:nav-groups'),
    navGroups.indexOf('@chatfuel:end-nav-groups'),
  );
  const navItems = [...navBlock.matchAll(/items: \[([^\]]*)\]/g)];
  if (navItems.length === 0) {
    fail(
      'content/shell/src/modules/navGroups.tsx: no "items" list in the nav table — pruneNavGroups would throw (template drift?)',
    );
  }
  // An id nobody can resolve used to be visible: it landed in the fallback
  // group. The wizard now filters it out of the scaffold's table instead, so a
  // typo here would leave no trace anywhere downstream. This is the only check.
  for (const id of navItems.flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((hit) => hit[1]))) {
    const manifest = manifests.get(id);
    if (!manifest || manifest.status !== 'ready' || !manifest.app) {
      fail(
        `content/shell/src/modules/navGroups.tsx: the nav table names "${id}", which is not a ready module with an app`,
      );
    } else if (manifest.hidden) {
      fail(
        `content/shell/src/modules/navGroups.tsx: the nav table names "${id}", which is hidden — it has no nav item`,
      );
    }
  }
  // The prune regex in packages/wizard/src/scaffold/transforms.ts must match
  // the template's fallback entries — encode the same shape here.
  const tsconfig = readFileSync(join(shellDir, 'tsconfig.json'), 'utf8');
  const fallbacks = tsconfig.match(/,\s*"\.\.\/[^"]*"/g) ?? [];
  if (fallbacks.length === 0) {
    fail(
      'content/shell/tsconfig.json: no "../…" fallback paths found — pruneTsconfigFallbacks would be a no-op (template drift?)',
    );
  }
  if (/,\s*"\.\.\/\.\.\//.test(tsconfig)) {
    fail(
      'content/shell/tsconfig.json: a fallback reaches above content/ — the vendored packages are siblings of the template',
    );
  }
  /* The codegen entry point is the one file the template cannot type-check
     itself: it imports the generator body out of content/codegen, which the
     scaffold copies in beside it and this directory does not have. So the
     template lists only `scripts`, includeCodegenInScriptsTsconfig adds the
     file, and the shape both of them agree on is checked here. */
  const scriptsTsconfigPath = join(shellDir, 'tsconfig.scripts.json');
  const scriptsTsconfig = existsSync(scriptsTsconfigPath) ? readFileSync(scriptsTsconfigPath, 'utf8') : '';
  if (!/"include":\s*\["scripts"\]/.test(scriptsTsconfig)) {
    fail(
      'content/shell/tsconfig.scripts.json: include is not exactly ["scripts"] — includeCodegenInScriptsTsconfig would throw at scaffold time',
    );
  }
  if (!/"allowImportingTsExtensions":\s*true/.test(scriptsTsconfig)) {
    fail(
      'content/shell/tsconfig.scripts.json: allowImportingTsExtensions is off — codegen.ts imports scripts/codegen/config.ts by its extension',
    );
  }
  if (!existsSync(join(shellDir, 'codegen.ts'))) {
    fail('content/shell/codegen.ts is missing — a scaffolded app could not regenerate its client');
  }
  if (!existsSync(join(shellDir, 'scripts', 'codegen.mjs'))) {
    fail('content/shell/scripts/codegen.mjs is missing — `npm run codegen` has nothing to run');
  }
  // The production server: its import is marked (the wizard repoints it at the
  // vendored proxy), its build config exists, and the scripts + runtime dep
  // that make `npm run build && npm start` work are in package.json.
  const serverEntryPath = join(shellDir, 'server', 'entry.ts');
  if (!existsSync(serverEntryPath)) {
    fail('content/shell/server/entry.ts is missing — the scaffold has no production server');
  } else {
    const serverEntry = readFileSync(serverEntryPath, 'utf8');
    for (const marker of ['@chatfuel:proxy-server-import', '@chatfuel:end-proxy-server-import']) {
      if (!serverEntry.includes(marker))
        fail(`content/shell/server/entry.ts: marked block "${marker}" is missing — scaffold would fail`);
    }
  }
  if (!existsSync(join(shellDir, 'vite.server.config.ts'))) {
    fail('content/shell/vite.server.config.ts is missing — `npm run build` could not build the server');
  }
  // The Vercel target: the function, the config that routes to it, and the
  // three things that are silently catastrophic when they drift — a rewrite
  // whose wildcard is not the query parameter the function reads (every
  // multi-segment route 404s while GraphQL keeps working, so it reads as
  // "sign-up is broken"), a destination that is not where the function lives,
  // and a .vercelignore that stops excluding .env (the Chatfuel token and the
  // Supabase secret key ride along into the build container).
  const vercelEntryPath = join(shellDir, 'api', 'chatfuel.ts');
  if (!existsSync(vercelEntryPath)) {
    fail('content/shell/api/chatfuel.ts is missing — the scaffold has no Vercel proxy');
  } else {
    const vercelEntry = readFileSync(vercelEntryPath, 'utf8');
    for (const marker of ['@chatfuel:proxy-vercel-import', '@chatfuel:end-proxy-vercel-import']) {
      if (!vercelEntry.includes(marker))
        fail(`content/shell/api/chatfuel.ts: marked block "${marker}" is missing — scaffold would fail`);
    }
    if (!vercelEntry.includes("'../../vite-plugin-proxy/src/core.js'")) {
      fail(
        'content/shell/api/chatfuel.ts: the workspace-mode proxy import must be ' +
          "'../../vite-plugin-proxy/src/core.js' — right depth for api/, and the .js " +
          'extension is what stops the deployed function dying with ERR_MODULE_NOT_FOUND',
      );
    }
    const publicPrefix = /PUBLIC_PREFIX = '([^']+)'/.exec(vercelEntry)?.[1];
    const pathParam = /PATH_PARAM = '([^']+)'/.exec(vercelEntry)?.[1];
    const vercelJsonPath = join(shellDir, 'vercel.json');
    if (!existsSync(vercelJsonPath)) {
      fail('content/shell/vercel.json is missing — nothing would route /chatfuel/* to the function');
    } else {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf8'));
      const rewrite = (vercelJson.rewrites ?? [])[0];
      if (!rewrite) {
        fail('content/shell/vercel.json: no rewrite at all — the browser paths would 404');
      } else {
        if (rewrite.source !== `${publicPrefix}/:${pathParam}*`) {
          fail(
            `content/shell/vercel.json: rewrite source "${rewrite.source}" does not match the function's ` +
              `PUBLIC_PREFIX "${publicPrefix}" + PATH_PARAM "${pathParam}" — multi-segment routes would 404`,
          );
        }
        if (rewrite.destination !== '/api/chatfuel') {
          fail(
            `content/shell/vercel.json: rewrite destination "${rewrite.destination}" is not the function at /api/chatfuel`,
          );
        }
      }
      // The app routes in the path, so every deep link is a request Vercel has
      // never heard of. Without a fallback LAST in the list, a reload of
      // /deals/board is a 404 that no test and no local server reproduces.
      const rewrites = vercelJson.rewrites ?? [];
      const fallback = rewrites[rewrites.length - 1];
      if (rewrites.length < 2 || fallback?.source !== '/(.*)' || fallback?.destination !== '/index.html') {
        fail(
          'content/shell/vercel.json: the last rewrite must be { "source": "/(.*)", "destination": "/index.html" } — ' +
            'without it a reload of any path below the root 404s on Vercel',
        );
      }
      // A catch-all filename would come back as a one-segment route
      // (^/api/chatfuel/([^/]+)$) and drop /chatfuel/auth/provision.
      if (Object.keys(vercelJson.functions ?? {}).some((glob) => glob.includes('['))) {
        fail(
          'content/shell/vercel.json: a dynamic function filename cannot serve multi-segment proxy paths — keep api/chatfuel.ts static',
        );
      }
      if (vercelJson.outputDirectory !== 'dist') {
        fail('content/shell/vercel.json: outputDirectory must be "dist" — that is where vite build writes');
      }
      if (!shellPkgScripts(shellDir).includes(vercelJson.buildCommand?.replace(/^npm run /, ''))) {
        fail(
          `content/shell/vercel.json: buildCommand "${vercelJson.buildCommand}" is not a script in content/shell/package.json`,
        );
      }
    }
  }
  // Vercel's Node builder transpiles the proxy sources per file and leaves the
  // specifiers alone, so an extensionless relative import there is a runtime
  // ERR_MODULE_NOT_FOUND that no build can catch.
  // Recursive, and matching dynamic import('./x') too, so no future file or
  // subdirectory escapes the gate while still deploying per-file.
  const proxySrc = resolve(root, 'content/vite-plugin-proxy/src');
  for (const entry of readdirSync(proxySrc, { recursive: true }) as string[]) {
    if (!entry.endsWith('.ts')) continue;
    const text = readFileSync(join(proxySrc, entry), 'utf8');
    for (const match of text.matchAll(/(?:from|import\s*\()\s*'(\.[^']*)'/g)) {
      if (!match[1].endsWith('.js')) {
        fail(
          `content/vite-plugin-proxy/src/${entry}: relative import "${match[1]}" has no .js extension — ` +
            'the deployed Vercel function would fail to resolve it at runtime',
        );
      }
    }
  }
  // The Vercel entry imports these three names from core.js by name, so a
  // facade regression must be a validate failure, not a shell tsc surprise.
  const proxyCorePath = join(proxySrc, 'core.ts');
  if (!existsSync(proxyCorePath)) {
    // Named as a failure rather than left to throw: a renamed or deleted file
    // here ends the whole validate run with an ENOENT stack and no pass name.
    fail('content/vite-plugin-proxy/src/core.ts is missing — content/shell/api/chatfuel.ts imports it as core.js');
    return;
  }
  const proxyCore = readFileSync(proxyCorePath, 'utf8');
  for (const name of ['createChatfuelProxy', 'describeAuthMode', 'describeProblem']) {
    if (!new RegExp(`export[^;]*\\b${name}\\b`).test(proxyCore)) {
      fail(
        `content/vite-plugin-proxy/src/core.ts: "${name}" is no longer exported — ` +
          'content/shell/api/chatfuel.ts imports exactly that name from core.js',
      );
    }
  }
  const vercelIgnorePath = join(shellDir, '.vercelignore');
  if (!existsSync(vercelIgnorePath)) {
    fail('content/shell/.vercelignore is missing — .env would be uploaded with the deployment');
  } else if (!/^\.env$/m.test(readFileSync(vercelIgnorePath, 'utf8'))) {
    fail('content/shell/.vercelignore does not exclude .env — the Chatfuel token would be uploaded');
  }
  if (!tsconfig.includes('"api"')) {
    fail('content/shell/tsconfig.json: "api" is not in include — the Vercel function would never be type-checked');
  }
  if (!tsconfig.includes('"server"')) {
    fail('content/shell/tsconfig.json: "server" is not in include — the production entry would never be type-checked');
  }
  const shellPkg = JSON.parse(readFileSync(join(shellDir, 'package.json'), 'utf8'));
  if (shellPkg.scripts?.codegen !== 'node scripts/codegen.mjs') {
    fail(
      'content/shell/package.json: script "codegen" does not run scripts/codegen.mjs — every document that says "re-run codegen" means that command',
    );
  }
  /* The generated client is the same bytes at both ends only while both ends
     parse the SDL with the same graphql. A caret would let the two float apart
     on whichever machine installed later, and the difference would show up as
     a diff in a file nobody edited. */
  const apiPkg = JSON.parse(readFileSync(join(root, 'content/api-client/package.json'), 'utf8'));
  const pins = {
    'content/shell/package.json': shellPkg.dependencies?.graphql,
    'content/api-client/package.json': apiPkg.dependencies?.graphql,
  };
  for (const [where, pin] of Object.entries(pins)) {
    if (typeof pin !== 'string' || !/^\d+\.\d+\.\d+$/.test(pin)) {
      fail(
        `${where}: "graphql" is "${pin}" — it must be pinned exactly, with no range, so both ends generate the same client`,
      );
    }
  }
  if (pins['content/shell/package.json'] !== pins['content/api-client/package.json']) {
    fail(
      `content/shell/package.json pins graphql ${pins['content/shell/package.json']} and content/api-client/package.json pins ${pins['content/api-client/package.json']} — an app regenerating its client would not reproduce this repository's`,
    );
  }
  for (const script of ['build', 'build:client', 'start', 'deploy']) {
    if (!shellPkg.scripts?.[script])
      fail(
        `content/shell/package.json: script "${script}" is missing — the production path is documented as npm run build && npm start`,
      );
  }
  if (!shellPkg.scripts?.build?.includes('vite.server.config.ts')) {
    fail(
      'content/shell/package.json: "build" does not build the server (vite build -c vite.server.config.ts) — npm start would find no server/dist/entry.js',
    );
  }
  if (!shellPkg.dependencies?.ws) {
    fail(
      'content/shell/package.json: "ws" must be a runtime dependency — the production server relays WebSockets (npm ci --omit=dev in the Dockerfile)',
    );
  }
  for (const name of ['undici', 'https-proxy-agent']) {
    if (!shellPkg.dependencies?.[name]) {
      fail(
        `content/shell/package.json: "${name}" must be a runtime dependency — the proxy's outbound side needs it to honour HTTPS_PROXY (npm ci --omit=dev in the Dockerfile)`,
      );
    }
  }
  const serverExternals = readFileSync(join(shellDir, 'vite.server.config.ts'), 'utf8');
  for (const name of ['ws', 'undici', 'https-proxy-agent']) {
    if (!new RegExp(`external:[^\\]]*'${name}'`).test(serverExternals)) {
      fail(
        `content/shell/vite.server.config.ts: "${name}" is missing from rollupOptions.external — the SSR build would bundle a runtime dependency`,
      );
    }
  }
  for (const name of ['Dockerfile', '.dockerignore']) {
    if (!existsSync(join(shellDir, name)))
      fail(`content/shell/${name} is missing — the documented container path would not build`);
  }
}
