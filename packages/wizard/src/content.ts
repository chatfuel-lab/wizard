import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_TREE, type ContentLock, LOCK_FILE, MANIFEST_DIR, readContentLock } from './contentLock';
import { cacheRoot, materialise, seedManifests } from './contentStore';
import { lockForRun, type Resolution } from './contentRef';
import { WizardError } from './errors';
import type { FetchLike } from './net';

/**
 * Where module content (skills, app templates, package sources) comes from.
 *
 * Two shapes, one layout: in the repo the root IS the workspace root; from a
 * published tarball it is a cache directory named after the commit the package
 * is pinned to, filled from that commit before anything is written. Every
 * consumer joins paths the same way either side of that line, which is why the
 * content could stop travelling in the tarball without a single call site
 * changing.
 */
export interface ContentSource {
  readonly root: string;
  readonly packaged: boolean;
  /** What the packaged wizard must fetch, and the digests it checks it against. */
  readonly lock?: ContentLock;
  modulePath(moduleId: string, ...segments: string[]): string;
  /** content/<name> — a package whose `src/` is vendored into the generated app. */
  vendorPath(packageName: string, ...segments: string[]): string;
  /** content/shell — the scaffold template and in-repo dev app. */
  shellPath(...segments: string[]): string;
  /** skills/<name> — a skill that belongs to no module. */
  skillPath(name: string, ...segments: string[]): string;
  /**
   * content/schema — the SDL and its possible types.
   *
   * A form of its own rather than a `vendorPath('schema', …)` call, because this
   * tree has no `src/` and is not a package: the two files in it are data, read
   * by the codegen at both ends and copied into every app.
   */
  schemaPath(...segments: string[]): string;
  /**
   * content/codegen — the generator body shared by this repository and every app.
   *
   * Same reason as `schemaPath` for having a form of its own: not a package,
   * no `src/`. It is copied whole into the app as `scripts/codegen/`.
   */
  codegenPath(...segments: string[]): string;
}

function sourceAt(root: string, packaged: boolean, lock?: ContentLock): ContentSource {
  return {
    root,
    packaged,
    lock,
    modulePath: (moduleId, ...segments) => join(root, 'content', 'modules', moduleId, ...segments),
    vendorPath: (packageName, ...segments) => join(root, 'content', packageName, ...segments),
    shellPath: (...segments) => join(root, 'content', 'shell', ...segments),
    skillPath: (name, ...segments) => join(root, 'content', 'skills', name, ...segments),
    schemaPath: (...segments) => join(root, 'content', 'schema', ...segments),
    codegenPath: (...segments) => join(root, 'content', 'codegen', ...segments),
  };
}

/** Walk up from this file looking for a directory that satisfies `holds`. */
function walkUp(levels: number, holds: (dir: string) => boolean): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i <= levels; i += 1) {
    if (holds(dir)) return dir;
    dir = resolve(dir, '..');
  }
  return null;
}

/** Whether this file is running out of an installed package rather than a checkout. */
function installed(): boolean {
  return dirname(fileURLToPath(import.meta.url))
    .split(/[\\/]/)
    .includes('node_modules');
}

/**
 * The marker is deliberately narrow. `pnpm-workspace.yaml` alone would also
 * match the user's OWN monorepo when they run the packaged wizard inside one —
 * and we would then scaffold from their `content/shell`.
 */
function isRepoRoot(dir: string): boolean {
  return (
    existsSync(join(dir, 'pnpm-workspace.yaml')) &&
    existsSync(join(dir, 'content', 'modules', 'core', 'module.json')) &&
    existsSync(join(dir, 'content', 'shell', 'package.json'))
  );
}

/**
 * Repo first, on purpose: a dev machine keeps a checkout of the very files
 * being edited, and a cache from an earlier run would win over them. Works from
 * src (tsx) and dist (tsdown) alike.
 *
 * Nothing here touches the network. The manifests are seeded from the tarball,
 * so the module picker draws and the registry loads on a machine that has not
 * reached the origin yet — `materialiseContent` is what goes and gets the rest,
 * once the run knows which modules it needs.
 */
export function createContentSource(): ContentSource {
  /* "Repo first" means the repo this file lives in, and an installed wizard
     lives in node_modules. Without that test, `npm i @chatfuel/wizard` inside a
     checkout of this repository — or inside anything laid out like one — makes
     the published wizard scaffold from those working files instead of from the
     commit it is pinned to, with no lock and so no digest checked. */
  const repo = installed() ? null : walkUp(6, isRepoRoot);
  if (repo) return sourceAt(repo, false);

  const pkg = packagedRoot();
  if (pkg) {
    const lock = readContentLock(join(pkg, LOCK_FILE));
    const root = cacheRoot(lock.commit);
    const unseeded = seedManifests(lock, join(pkg, MANIFEST_DIR), root);
    if (unseeded.length > 0) {
      throw new WizardError(
        `The wizard package is missing ${unseeded[0]}`,
        'Reinstall the wizard — the published package ships every module manifest of the commit it pins.',
      );
    }
    return sourceAt(root, true, lock);
  }

  throw new WizardError(
    'Could not locate the wizard content (neither a repo checkout nor a packaged copy)',
    'Reinstall the wizard, or run it from inside the chatfuel-wizard repo.',
  );
}

/**
 * A file that travels in the published package itself, beside `content.lock`.
 *
 * The changelog is the one of these: it is the wizard's own text, not content,
 * so it ships rather than being fetched — and `update` needs it on a machine
 * that may not be able to reach the origin at all.
 */
export function packagedFile(name: string): string | null {
  const pkg = packagedRoot();
  return pkg ? join(pkg, name) : null;
}

/** The installed package's own directory, or null in a repo checkout. */
function packagedRoot(): string | null {
  return walkUp(4, (dir) => existsSync(join(dir, LOCK_FILE)));
}

/**
 * The source this run installs from, once the branch has been resolved.
 *
 * `createContentSource` cannot do this itself: it is called while the context
 * is built, before a single question has been asked, and going to the network
 * there would put a request in front of `--help`. So the sync call establishes
 * the floor — which commit, which digests, which manifests are already on disk
 * — and this one, called once the run is definitely happening, decides whether
 * that floor is what gets installed.
 *
 * A repo checkout resolves to itself. It is pinned to nothing, and the files
 * being edited are the point of running it there.
 *
 * The manifests are re-seeded and then topped up from the resolved commit,
 * because the picker is the first thing that reads them and a module added on
 * the branch since this wizard was published has a manifest the tarball cannot
 * hold. Thirteen small files, fetched before the first list is drawn.
 */
export async function resolveContentSource(
  source: ContentSource,
  options: { env?: NodeJS.ProcessEnv; fetchImpl?: FetchLike } = {},
): Promise<{ content: ContentSource; resolution: Resolution | null }> {
  const floor = source.lock;
  if (!floor) return { content: source, resolution: null };

  const { lock, resolution } = await lockForRun({ floor, env: options.env, fetchImpl: options.fetchImpl });
  if (lock.commit === floor.commit) return { content: source, resolution };

  const root = cacheRoot(lock.commit, options.env);
  const pkg = packagedRoot();
  const unseeded = pkg
    ? seedManifests(lock, join(pkg, MANIFEST_DIR), root)
    : Object.keys(lock.files).filter(isManifest);
  if (unseeded.length > 0) {
    try {
      await materialise({ lock, root, paths: unseeded, env: options.env, fetchImpl: options.fetchImpl });
    } catch (err) {
      /* The same argument the resolution itself makes, one step later. The
         network held long enough to answer two API calls and then did not, and
         the floor is a working install — a run that got this far and stopped
         would be a run that refused to do offline what it does offline. */
      return {
        content: source,
        resolution: { commit: floor.commit, how: 'floor', why: err instanceof Error ? err.message : String(err) },
      };
    }
  }
  return { content: sourceAt(root, true, lock), resolution };
}

const isManifest = (path: string): boolean => /^content\/modules\/[^/]+\/module\.json$/.test(path);

const MODULES = `${CONTENT_TREE.modules}/`;
const API_SRC = `${CONTENT_TREE.apiClient}/`;
/* Where a module's UI lives inside the template. `app.embed.roots` names the
   same directory from the other end (`src/modules/<id>`), and embed.ts resolves
   it against the shell. */
const SHELL_MODULES = `${CONTENT_TREE.shell}/src/modules/`;

/**
 * The module a FILE inside the vendored API client belongs to, if it belongs to
 * one: the generated GraphQL client is a directory per module, the domain types
 * a file per module. Anything else — the client, the transport, a barrel — is
 * shared and belongs to no module.
 *
 * One function, because the fetch and the copy both ask this question and a
 * path one of them keeps and the other drops would only surface on a user's
 * machine. `apiCopyFilter` in steps/scaffold.ts is the other caller.
 */
export function apiModuleOf(rel: string): string | undefined {
  return /^generated\/([^/]+)\//.exec(rel)?.[1] ?? /^domain\/([^/]+)\.tsx?$/.exec(rel)?.[1];
}

/**
 * Which of the lock's paths a run with these modules actually needs.
 *
 * Three things are per-module, and none of them is wanted for a module nobody
 * picked: everything under `content/modules/`, the shell's UI subtree for a
 * module (`content/shell/src/modules/<id>/`), and the slices of the vendored
 * API client that the scaffold would prune on the way in anyway. Everything
 * else is the app itself and is needed whatever was chosen. `core` comes in
 * with the closure, so the shared half of the API client travels without a rule
 * of its own.
 *
 * The shell rule is the one that pays: those subtrees are three quarters of
 * every run's transfer, and `scaffold.ts` deleted the unpicked ones seconds
 * after they landed. It asks the lock which names are modules rather than
 * assuming every directory there is one — `app.embed.roots` is validated as a
 * shell-relative path, not as a module id, so a shell directory belonging to no
 * module keeps travelling instead of being silently dropped from an embed.
 *
 * This is where the fetch and the copy have to agree: a path dropped here and
 * kept by `apiCopyFilter`, or by the delete loop in `buildAppDirectory`, would
 * be a scaffold reaching for a file that was never downloaded. Both directions
 * hold. `buildAppDirectory` reads what it prunes from `readdirSync` and keeps
 * `present ∩ ctx.answers.modules`, which is the closure this function is given,
 * so a subtree that never arrives is simply one it never sees; and `embed.ts`
 * copies the roots of `ctx.answers.modules` only.
 */
export function contentPathsFor(lock: ContentLock, moduleIds: readonly string[]): string[] {
  const wanted = new Set(moduleIds);
  const known = new Set(
    Object.keys(lock.files)
      .filter(isManifest)
      .map((path) => path.slice(MODULES.length).split('/')[0]),
  );
  return Object.keys(lock.files).filter((path) => {
    if (path.startsWith(MODULES)) return wanted.has(path.slice(MODULES.length).split('/')[0]);
    if (path.startsWith(SHELL_MODULES)) {
      const [id, ...rest] = path.slice(SHELL_MODULES.length).split('/');
      // `rest` empty means a file sitting where a module directory would —
      // `types.ts`, the registry barrel, the nav table. Those are the shell's.
      return rest.length === 0 || !known.has(id) || wanted.has(id);
    }
    if (!path.startsWith(API_SRC)) return true;
    const owner = apiModuleOf(path.slice(API_SRC.length));
    return owner === undefined || wanted.has(owner);
  });
}
