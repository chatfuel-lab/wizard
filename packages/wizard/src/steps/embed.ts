import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as p from '@clack/prompts';
import { execa } from 'execa';
import { CONTENT_TREE, OPERATIONS_IN_API, SCHEMA_IN_VENDOR } from '../contentLock';
import { resolveFromUserCwd } from '../cwd';
import { stepArt } from '../art';
import { WizardError } from '../errors';
import { onInterrupt } from '../interrupt';
import { appendEnvMissing, collectEnv, gitignoreGuard } from '../scaffold/env';
import { copyModuleOperations, recordGeneratedClient } from '../scaffold/apiOperations';
import { copyAuthSql } from '../scaffold/authAssets';
import {
  appLockPath,
  buildAppLock,
  copied,
  generated,
  newLockDraft,
  recordSkills,
  rewrote,
  writeAppLock,
} from '../scaffold/appLock';
import { installSkills, skillsRoot } from '../scaffold/skills';
import { COPY_SKIP, apiCopyFilter, generatedApiNamespaces, vendorCopyFilter } from './scaffold';
import { generateOperationDocs } from '../scaffold/operationDocs';
import type { WizardContext } from '../context';

/** Everything the wizard copies lands under this one namespaced dir. */
export const EMBED_DIR = 'src/chatfuel';

/**
 * Base deps the vendored ui/api sources need in ANY host, beyond react.
 * Kept in sync with content/shell/package.json (the validator does not guard
 * this list — it is printed, not installed, so drift surfaces immediately).
 */
const BASE_DEPS = [
  'graphql',
  'graphql-ws',
  '@graphql-typed-document-node/core',
  // The three faces tokens.css names. Without them --font-sans/--font-display
  // resolve to nothing and the embedded UI falls back to the system stack.
  '@fontsource-variable/geist',
  '@fontsource-variable/geist-mono',
  '@fontsource-variable/manrope',
];
const BASE_DEV_DEPS = ['ws', '@types/ws', 'tailwindcss', '@tailwindcss/vite'];

/**
 * Union of app.embed.npmDependencies across the selected modules + base.
 * Raw specs, not shell-quoted: these are handed to execa as argv now, and a
 * literal `"` inside an argument is part of the version range, not quoting.
 */
export function collectNpmDependencies(ctx: WizardContext): { deps: string[]; devDeps: string[] } {
  const deps = new Map<string, string>();
  for (const moduleId of ctx.answers.modules) {
    const declared = ctx.registry.manifests.get(moduleId)?.app?.embed?.npmDependencies ?? {};
    for (const [name, version] of Object.entries(declared)) deps.set(name, version);
  }
  return {
    deps: [...BASE_DEPS, ...[...deps.entries()].map(([name, version]) => `${name}@${version}`)],
    devDeps: BASE_DEV_DEPS,
  };
}

/** A range like ^1.2.3 needs quoting once it is printed for a shell. */
const forShell = (specs: string[]) => specs.map((spec) => (/[\^~><|*\s]/.test(spec) ? `"${spec}"` : spec)).join(' ');

type HostPm = 'npm' | 'pnpm' | 'yarn' | 'bun';

const ADD: Record<HostPm, { add: string[]; dev: string[] }> = {
  npm: { add: ['install'], dev: ['install', '--save-dev'] },
  pnpm: { add: ['add'], dev: ['add', '-D'] },
  yarn: { add: ['add'], dev: ['add', '-D'] },
  bun: { add: ['add'], dev: ['add', '--dev'] },
};

/**
 * Skipped when the wizard runs the install itself: npm's audit and funding
 * round trips are POSTs, and a network that lets only GETs through hangs on
 * them for minutes instead of refusing. They stay out of the printed commands,
 * which are somebody else's project to run as they like.
 */
const QUIET: Record<HostPm, string[]> = {
  npm: ['--no-audit', '--no-fund'],
  pnpm: [],
  yarn: [],
  bun: [],
};

/**
 * The host's lockfile decides — installing with the wrong package manager
 * would leave a second lockfile behind in someone else's project.
 */
function hostPackageManager(host: string, fallback: HostPm): HostPm {
  if (existsSync(join(host, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(host, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(host, 'bun.lockb')) || existsSync(join(host, 'bun.lock'))) return 'bun';
  if (existsSync(join(host, 'package-lock.json'))) return 'npm';
  return fallback;
}

/**
 * The one host mutation the wizard will make, and only when asked to: without
 * it the run ends with two commands the user has to paste, which is exactly
 * the manual step this flow exists to remove. Never under --yes — an
 * unattended run must not write to a project it did not create.
 */
async function offerHostInstall(ctx: WizardContext, host: string, deps: string[], devDeps: string[]): Promise<boolean> {
  if (ctx.flags.yes || ctx.flags.dryRun) return false;
  const pm = hostPackageManager(host, ctx.answers.packageManager);
  const go = await p.confirm({
    message: `Install ${deps.length + devDeps.length} dependencies into this project with ${pm}?`,
    initialValue: true,
  });
  if (p.isCancel(go) || !go) return false;

  const spinner = p.spinner({ indicator: 'timer' });
  spinner.start(`Installing with ${pm}…`);
  try {
    await execa(pm, [...ADD[pm].add, ...deps, ...QUIET[pm]], { cwd: host, timeout: 15 * 60_000 });
    await execa(pm, [...ADD[pm].dev, ...devDeps, ...QUIET[pm]], { cwd: host, timeout: 15 * 60_000 });
    spinner.stop(`Dependencies installed with ${pm}`);
    return true;
  } catch (err) {
    spinner.error(`${pm} could not install them`);
    p.log.warn(err instanceof Error ? err.message.split('\n').slice(-3).join(' ').slice(0, 300) : String(err));
    return false;
  }
}

function detectHostStack(host: string): 'vite' | 'next' | 'unknown' {
  const has = (...names: string[]) => names.some((name) => existsSync(join(host, name)));
  if (has('next.config.js', 'next.config.mjs', 'next.config.ts')) return 'next';
  if (has('vite.config.ts', 'vite.config.js', 'vite.config.mjs')) return 'vite';
  return 'unknown';
}

/**
 * Embed = copy a self-contained, namespaced footprint into the host project
 * and hand the wiring to the agent (playbooks/embed.md). The host is NEVER
 * clobbered: the only writes are the new src/chatfuel/ tree, append-missing
 * .env keys, a .gitignore line, the skills and the agent's handoff files —
 * no vite.config/tsconfig/CSS edits (PLAN.md: embed mode is agent-driven).
 * The single exception is the dependency install, which the user confirms and
 * the host's own package manager performs (package.json + lockfile).
 *
 * Layout in the host (preserves the ../types relative import every module
 * file relies on):
 *   src/chatfuel/modules/types.ts        the module contract
 *   src/chatfuel/modules/<id>/…          every selected module with app.embed
 *   src/chatfuel/vendor/{ui,api}/…       the vendored design system + client
 *   src/chatfuel/vendor/chatfuel-proxy/… the dev proxy + prod server sources
 *   src/chatfuel/client.ts               createAppClient()
 *   supabase/chatfuel/…                  (auth only) the migration + rendered seed
 */
export async function embedScaffold(ctx: WizardContext): Promise<void> {
  const host = resolveFromUserCwd(ctx.flags.dir ?? '.');
  if (!existsSync(join(host, 'package.json'))) {
    throw new WizardError(
      `${host} has no package.json — embed mode installs into an existing project`,
      'Run from your project root, or pass --dir <project>. Use standalone mode for a fresh app.',
    );
  }
  const embedRoot = join(host, EMBED_DIR);
  if (existsSync(embedRoot)) {
    throw new WizardError(
      `${embedRoot} already exists`,
      'Remove it (or let your agent migrate it) before re-embedding.',
    );
  }
  ctx.answers.appDir = host; // skills and the handoff files all anchor here
  ctx.answers.hostStack = detectHostStack(host);
  p.log.message(stepArt('scaffold'));

  const hostPackage = JSON.parse(readFileSync(join(host, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (!hostPackage.dependencies?.react && !hostPackage.devDependencies?.react) {
    p.log.warn('The host project does not declare react — the modules are React components.');
  }

  /* A --plan walks this whole step and writes none of it. The root here is
     somebody else's project: a "preview" that creates src/chatfuel/, appends to
     their .gitignore and their .env and drops a .chatfuel/lock.json in is a
     preview that converts their repository into a wizard-managed app. Every
     would-be write says what it would have done, in the order it would have
     happened and with the path it would have written. */
  const dry = ctx.flags.plan;
  const wouldWrite = (what: string): void => {
    p.log.info(`--plan: would ${what}`);
  };
  const makeDir = (at: string): void => {
    if (dry) wouldWrite(`create ${at}`);
    else mkdirSync(at, { recursive: true });
  };
  const copyTo = (from: string, to: string, options?: Parameters<typeof cpSync>[2]): void => {
    if (dry) wouldWrite(`copy ${from} → ${to}`);
    else cpSync(from, to, options);
  };

  const spinner = dry ? undefined : p.spinner();
  spinner?.start('Copying the Chatfuel footprint…');
  const withUi = ctx.answers.modules.filter((id) => ctx.registry.manifests.get(id)?.app?.embed);
  if (withUi.length === 0) {
    spinner?.stop('Nothing to copy');
    throw new WizardError('internal: no selected module declares app.embed');
  }

  /* The lock names every path the wizard writes, and in this mode that is the
     only way to tell them from the host's own files: the root here belongs to
     somebody else, so nothing is discovered by walking it. */
  const draft = newLockDraft();
  let authSql: ReturnType<typeof copyAuthSql> = [];
  /* This root did not exist a moment ago — the check at the top of this
     function refuses to run against a host that already has one — so
     everything under it came from here and removing it is exactly an undo.
     Without it a half-written directory stays, and that same check then
     refuses every retry, in somebody else's project. `supabase/chatfuel/` is
     the one thing written outside it, and the host may keep migrations in that
     tree, so it is named rather than deleted. A dry run wrote nothing, so
     there is nothing of ours under it to remove. */
  const undoEmbed = (): void => {
    if (dry) return;
    rmSync(embedRoot, { recursive: true, force: true });
    p.log.info(`Removed the half-written ${embedRoot} — run the same command again.`);
    if (authSql.length > 0)
      p.log.warn(`${join(host, 'supabase', 'chatfuel')} was written before the run stopped and was left alone.`);
  };
  /* Registered for Ctrl+C as well as for a throw: a signal in this window does
     not unwind, so a `catch` alone would leave the half-written root behind.
     See ../interrupt. */
  const releaseUndo = onInterrupt(undoEmbed);
  try {
    makeDir(join(embedRoot, 'modules'));
    copyTo(ctx.content.shellPath('src', 'modules', 'types.ts'), join(embedRoot, 'modules', 'types.ts'));
    copied(draft, `${EMBED_DIR}/modules/types.ts`, `${CONTENT_TREE.shell}/src/modules/types.ts`);
    for (const id of withUi) {
      for (const root of ctx.registry.manifests.get(id)!.app!.embed!.roots) {
        // roots are shell-relative ("src/modules/<id>") — mirror under modules/.
        copyTo(ctx.content.shellPath(root), join(embedRoot, 'modules', basename(root)), {
          recursive: true,
          filter: (src) => !COPY_SKIP.has(basename(src)),
        });
        copied(draft, `${EMBED_DIR}/modules/${basename(root)}`, `content/shell/${root}`);
      }
    }
    copyTo(ctx.content.vendorPath('ui', 'src'), join(embedRoot, 'vendor', 'ui'), {
      recursive: true,
      filter: vendorCopyFilter,
    });
    const apiSrc = ctx.content.vendorPath('api-client', 'src');
    copyTo(apiSrc, join(embedRoot, 'vendor', 'api'), {
      recursive: true,
      filter: apiCopyFilter(apiSrc, ctx.answers.modules),
    });
    /* The whole proxy src/ recursively — dev plugin, prod server, shared core,
       and whatever a module adds beside them, so nothing has to be listed here
       twice. */
    copyTo(ctx.content.vendorPath('vite-plugin-proxy', 'src'), join(embedRoot, 'vendor', 'chatfuel-proxy'), {
      recursive: true,
      filter: vendorCopyFilter,
    });
    /* The SDL beside the client it generated, as in a standalone app. It is
       data and nothing imports it, which is what makes it safe to leave in
       somebody else's src/ — unlike the codegen entry point a standalone app
       gets, whose `node:fs` import the host's own tsc would have to accept. */
    copyTo(ctx.content.schemaPath(), join(embedRoot, 'vendor', SCHEMA_IN_VENDOR), { recursive: true });
    copyTo(ctx.content.shellPath('src', 'client.ts'), join(embedRoot, 'client.ts'));
    /* The operation barrel sits beside vendor/api here exactly as it does in a
       scaffolded app, so the generated specifiers are the same string in both
       layouts. Written from the directories the filter left rather than from
       the answers — see generatedApiNamespaces. */
    const namespaces = dry ? [] : generatedApiNamespaces(join(embedRoot, 'vendor', 'api', 'generated'));
    if (dry) wouldWrite(`write ${join(embedRoot, 'operationDocs.ts')}`);
    else writeFileSync(join(embedRoot, 'operationDocs.ts'), generateOperationDocs(namespaces), 'utf8');
    /* Named as its own tree because nothing else covers it: in embed mode the
       root is the host's project and the lock is built from declared paths
       only, so a file no tree names is a file the lock does not know the wizard
       wrote. `generated` is what keeps `update` off it, the same as scaffold. */
    copied(draft, `${EMBED_DIR}/operationDocs.ts`, `${CONTENT_TREE.shell}/src/operationDocs.ts`);
    generated(draft, `${EMBED_DIR}/operationDocs.ts`, 'operationDocs');
    copied(draft, `${EMBED_DIR}/vendor/ui`, CONTENT_TREE.ui);
    copied(draft, `${EMBED_DIR}/vendor/api`, CONTENT_TREE.apiClient);
    copied(draft, `${EMBED_DIR}/vendor/${SCHEMA_IN_VENDOR}`, CONTENT_TREE.schema);
    copied(draft, `${EMBED_DIR}/vendor/chatfuel-proxy`, CONTENT_TREE.proxy);
    /* The documents the vendored client was generated from, and the stamp that
       says which revision of them. An embed host gets no `codegen.ts` — a file
       importing node:fs in somebody else's src/ is a file their own tsc has to
       accept — so this is data for a host that wires up its own generator, and
       the record `update` reads to tell them their client is behind. */
    if (dry) wouldWrite(`copy the operation documents → ${join(embedRoot, 'vendor', 'api', OPERATIONS_IN_API)}`);
    else {
      copyModuleOperations(ctx, draft, join(embedRoot, 'vendor', 'api'), `${EMBED_DIR}/vendor/api`);
      recordGeneratedClient(
        draft,
        join(embedRoot, 'vendor', 'api'),
        `${EMBED_DIR}/vendor/api`,
        join(embedRoot, 'vendor', SCHEMA_IN_VENDOR, 'schema.graphql'),
        namespaces,
      );
    }
    copied(draft, `${EMBED_DIR}/client.ts`, `${CONTENT_TREE.shell}/src/client.ts`);
    // The host may have a supabase/ of its own — ours lives in its own subdir.
    authSql = ctx.answers.modules.includes('auth') ? copyAuthSql(ctx, join(host, 'supabase', 'chatfuel')) : [];
    for (const sql of authSql) {
      if (dry) wouldWrite(`write ${join(host, 'supabase', 'chatfuel', sql.name)}`);
      copied(draft, `supabase/chatfuel/${sql.name}`, sql.from);
      if (sql.rendered) rewrote(draft, `supabase/chatfuel/${sql.name}`, 'publishingSecret');
    }
  } catch (err) {
    spinner?.error('The Chatfuel footprint was not written');
    undoEmbed();
    throw err;
  } finally {
    releaseUndo();
  }

  spinner?.stop(
    `Copied ${EMBED_DIR}/ (modules: ${withUi.join(', ')}; host stack: ${ctx.answers.hostStack}${authSql.length > 0 ? `; supabase/chatfuel/: ${authSql.map((sql) => sql.name).join(', ')}` : ''})`,
  );

  const gitignore = await gitignoreGuard(ctx, host);
  ctx.answers.envWritten = gitignore.ok;
  if (gitignore.ok) {
    const { added, conflicting } = appendEnvMissing(join(host, '.env'), collectEnv(ctx), { dryRun: dry });
    if (added.length > 0) {
      if (dry) wouldWrite(`add ${added.join(', ')} to ${join(host, '.env')}`);
      else p.log.success(`.env: added ${added.join(', ')}`);
    }
    for (const name of conflicting) {
      p.log.warn(`.env already defines ${name} with a different value — left untouched.`);
    }
  }

  /* Not thrown from, for the standalone scaffold's reason and one more: the
     host project is the person's own, the wizard has already written into it,
     and stopping here would leave those writes with nothing that explains
     them. */
  let skills: Awaited<ReturnType<typeof installSkills>> = { installed: [], kept: [] };
  try {
    skills = await installSkills(ctx);
  } catch (err) {
    p.log.error(`The skills could not be installed into ${skillsRoot(ctx)}`);
    p.log.message(err instanceof Error ? err.message : String(err));
    p.log.warn('Everything else was written. Re-run the wizard here to install them.');
  }
  if (skills.installed.length > 0) p.log.success(`Skills installed: ${skills.installed.join(', ')}`);

  recordSkills(ctx, draft, host, skillsRoot(ctx), skills.kept);
  if (dry) wouldWrite(`write ${appLockPath(host)}`);
  else writeAppLock(host, buildAppLock(ctx, host, draft));

  const { deps, devDeps } = collectNpmDependencies(ctx);
  const installed = await offerHostInstall(ctx, host, deps, devDeps);
  const pm = hostPackageManager(host, ctx.answers.packageManager);
  p.note(
    [
      installed
        ? `Dependencies installed with ${pm}. Your agent wires the modules in`
        : 'No host files were modified — your agent wires the modules in',
      '(playbooks/embed.md inside each installed skill).',
      ...(installed
        ? []
        : [
            'Dependencies to add:',
            '',
            `  ${pm} ${ADD[pm].add.join(' ')} ${forShell(deps)}`,
            `  ${pm} ${ADD[pm].dev.join(' ')} ${forShell(devDeps)}`,
          ]),
    ].join('\n'),
    dry ? 'Embed footprint — dry run, nothing was written' : 'Embed footprint ready',
  );
}
