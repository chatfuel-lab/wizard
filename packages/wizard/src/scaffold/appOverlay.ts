import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import * as p from '@clack/prompts';
import { WizardError } from '../errors';
import { insideProblem } from '../insidePath';
import { mergeAppDependencies } from './transforms';
import type { WizardContext } from '../context';

/**
 * Files an app overlay may never replace — everything the scaffold step's own
 * transforms write, everything that decides what code RUNS at install or build
 * time before a person has seen the app, and the secrets file. The catalog
 * repo's validator enforces the same list at PR time (scripts/validate.mjs in
 * the catalog); this copy is the one that protects a user whose catalog is
 * not ours. Changes to these files belong in the playbook, where the user's
 * own agent applies them in the open.
 */
export const OVERLAY_DENY = [
  'package.json',
  '.gitignore',
  '_gitignore',
  'index.html',
  /* All three spellings, not just the one the template ships: vite reads its
     DEFAULT_CONFIG_FILES in order and finds `vite.config.js` and
     `vite.config.mjs` BEFORE the `vite.config.ts` next to them, so denying
     only the template's own name leaves the config open to an overlay that
     simply picks another extension. `vite.server.config.ts` is named by the
     build script rather than resolved, and runs the same plugins. */
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'vite.server.config.ts',
  'tsconfig.json',
  'server/entry.ts',
  'api/chatfuel.ts',
  'src/index.css',
  'src/modules/index.ts',
  'src/modules/navGroups.tsx',
  /* The package manager's own instructions, and the reason they are here: the
     install runs in this directory moments after the overlay lands, and the
     token has already been written into it. An `.npmrc` chooses the registry
     the install pulls from and can carry a credential of its own;
     `.pnpmfile.cjs` is not configuration at all but JavaScript that pnpm loads
     and calls while it resolves dependencies, so an overlay that lands one
     runs its code without a single package having an install script. */
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  '.pnpmfile.cjs',
  'pnpm-workspace.yaml',
  '.node-version',
  '.nvmrc',
  /* A lockfile decides which bytes the install resolves to, whatever the
     ranges in package.json say — for pnpm and yarn it can also name the
     resolved tarball's URL. The scaffold ships none, so any of these can only
     have come from the overlay. */
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  /* The scripts `package.json` names: `npm run deploy` and `npm run codegen`
     are run by the wizard and by the handoff playbook with the token already
     in `.env`. */
  'scripts/deploy-vercel.mjs',
  'scripts/connect-git.mjs',
  'scripts/codegen.mjs',
];

/** Prefix-matched: any path under these is refused too. */
// `patches/` for the same reason as `.pnpmfile.cjs`: it rewrites the contents
// of packages that were already resolved, after the lockfile has been read.
//
// `scripts/deploy/` because the three denied scripts above are three entry
// points over one library: `deploy-vercel.mjs` and `connect-git.mjs` import
// `runners.mjs`, `steps.mjs`, `env.mjs` and the rest from it. Denying the
// entry point and leaving what it imports open denies nothing — an overlay
// that lands its own `scripts/deploy/runners.mjs` chooses what the deploy
// spawns, with the token already in `.env`.
export const OVERLAY_DENY_PREFIXES = ['.env', 'node_modules/', '.git/', 'patches/', 'scripts/deploy/'];

/**
 * The comparison is case-INSENSITIVE, and that is not tidiness.
 *
 * macOS and Windows both ship case-insensitive filesystems by default, so an
 * overlay declaring `.NPMRC` passes an exact-match denylist and then lands on
 * the very file the list exists to protect. Lowercasing here costs nothing on
 * Linux, where the two names really are two files: an overlay carrying a
 * genuinely distinct `.NPMRC` is refused rather than copied, which is the safe
 * direction to be wrong in.
 */
const DENIED = new Set(OVERLAY_DENY.map((name) => name.toLowerCase()));

/** Whether the overlay is allowed to write this path at all. */
export function overlayDenies(rel: string): boolean {
  const name = rel.toLowerCase();
  if (DENIED.has(name)) return true;
  return OVERLAY_DENY_PREFIXES.some(
    (prefix) => name === prefix.replace(/\/$/, '') || name.startsWith(prefix.toLowerCase()),
  );
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    // lstat, not the dirent: a symlinked directory must be caught as a
    // symlink, not walked through into wherever it points.
    if (lstatSync(path).isSymbolicLink()) yield path;
    else if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const refused = (rel: string, why: string): WizardError =>
  new WizardError(
    `The app overlay is not allowed to write ${rel}`,
    `${why} Wizard-owned files change through the playbook instead — report this app to the catalog.`,
  );

/** What the overlay wrote, for the app lock: who wrote which file, and why. */
export interface OverlayResult {
  /** Template files the overlay wrote over — they still have an upstream. */
  replaced: string[];
  /** Files that exist only because the app brought them. */
  added: string[];
  /** Package names merged into the scaffold's package.json. */
  dependencies: string[];
}

const NOTHING: OverlayResult = { replaced: [], added: [], dependencies: [] };

/**
 * Copy the app's overlay/ tree over the scaffold, file by file, after every
 * template transform has run — the drift checks judge template files, never
 * overlay ones. The overlay wins over the template on a collision, and the
 * replaced paths are said out loud: a scaffold whose files silently differ
 * from the template it claims to be is a scaffold nobody can debug.
 *
 * What it wrote is returned rather than only printed, because the app lock has
 * to say so: a replaced file whose bytes no longer match its upstream reads to
 * `update` as an edit the person made, and an added one has no upstream to
 * compare against at all.
 */
export function applyAppOverlay(ctx: WizardContext, target: string): OverlayResult {
  const app = ctx.answers.app;
  if (!app) return NOTHING;
  const overlayDir = join(app.dir, 'overlay');
  if (!existsSync(overlayDir)) return NOTHING;

  const targetRoot = resolve(target);
  const replaced: string[] = [];
  const added: string[] = [];

  for (const path of walk(overlayDir)) {
    const rel = relative(overlayDir, path).split(sep).join('/');
    if (lstatSync(path).isSymbolicLink()) {
      throw refused(rel, 'It is a symlink; overlays carry regular files only.');
    }
    if (overlayDenies(rel)) {
      throw refused(rel, 'It is a wizard-owned file.');
    }
    const destination = resolve(targetRoot, rel);
    // Belt and braces: `rel` came from a walk so it cannot climb. What it can
    // do is land on a directory the scaffold already holds as a symlink, and
    // then `cpSync` writes through it - so the check is against real paths.
    const escape = insideProblem(targetRoot, destination);
    if (escape) throw refused(rel, `It resolves outside the scaffold directory: ${escape}.`);
    if (existsSync(destination)) replaced.push(rel);
    else added.push(rel);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(path, destination);
  }

  if (replaced.length > 0) p.log.info(`App overlay replaced: ${replaced.join(', ')}`);
  const merged = mergeAppDependencies(join(target, 'package.json'), app.manifest.npmDependencies ?? {});
  if (merged.length > 0) p.log.info(`App dependencies added: ${merged.join(', ')}`);
  p.log.success(`App "${app.manifest.name}": overlay applied (${added.length + replaced.length} file(s))`);
  return { replaced, added, dependencies: merged };
}
