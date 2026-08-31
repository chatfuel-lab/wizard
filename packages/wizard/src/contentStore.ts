import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { digestOf } from './lockFormat';
import { contentUrl, type ContentPin } from './contentOrigin';
import type { ContentLock } from './contentLock';
import { WizardError } from './errors';
import { type FetchLike, outboundFetch } from './net';

/**
 * The disk the fetched content lands on.
 *
 * Keyed by commit, so two wizard versions pinned to different commits do not
 * share a directory and nothing has to be invalidated: a new pin is a new path,
 * and the old one stays valid for anyone still running it.
 */
export function cacheBase(env: NodeJS.ProcessEnv = process.env): string {
  return env.CHATFUEL_WIZARD_CACHE ?? join(env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'chatfuel-wizard');
}

export function cacheRoot(commit: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(cacheBase(env), commit);
}

/**
 * Write only after the bytes are the bytes the lock describes, and write
 * through a temporary name.
 *
 * Both halves matter for the same reason: this cache is read on the next run
 * without asking the network again, so anything that reaches it is trusted from
 * then on. A partial file from an interrupted download would be indistinguishable
 * from a complete one.
 */
function store(root: string, path: string, bytes: Buffer, expected: string): void {
  const actual = digestOf(bytes);
  if (actual !== expected) {
    throw new WizardError(
      `${path} does not match the digest the wizard has for it`,
      'The content was changed in transit or the lock is stale. Reinstall the wizard, and report this if it repeats.',
    );
  }
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.part`;
  try {
    writeFileSync(temp, bytes);
    renameSync(temp, target);
  } finally {
    rmSync(temp, { force: true });
  }
}

/** Already on disk and still the right bytes. A truncated cache entry re-fetches. */
function cached(root: string, path: string, expected: string): boolean {
  const target = join(root, path);
  if (!existsSync(target)) return false;
  try {
    return digestOf(readFileSync(target)) === expected;
  } catch {
    return false;
  }
}

/**
 * Put the module manifests in the cache from the copy that shipped in the
 * tarball.
 *
 * They travel in the package for one reason: the module picker draws before
 * anything has been fetched, and a wizard that needs the network to show its
 * first list is a wizard that cannot say what it offers while a proxy is being
 * sorted out. They go through the same digest check as a fetched file — a copy
 * from the tarball is still a copy, and the lock is what says what it should be.
 *
 * Returns the manifests it could not seed, rather than refusing over them. At
 * the floor commit that list is empty and a caller that gets a name back has a
 * broken package to report. Against a resolved commit it is the ordinary case:
 * a module added on the branch since this wizard was published has a manifest
 * no tarball could contain, and fetching those few files is what puts it in
 * front of the person.
 */
export function seedManifests(lock: ContentLock, from: string, root: string): string[] {
  const unseeded: string[] = [];
  for (const [path, expected] of Object.entries(lock.files)) {
    if (!/^content\/modules\/[^/]+\/module\.json$/.test(path)) continue;
    if (cached(root, path, expected)) continue;
    const source = join(from, path);
    if (!existsSync(source) || digestOf(readFileSync(source)) !== expected) {
      unseeded.push(path);
      continue;
    }
    store(root, path, readFileSync(source), expected);
  }
  return unseeded;
}

export interface MaterialiseOptions {
  readonly lock: ContentLock;
  readonly root: string;
  /** Which of the lock's paths this run needs. Everything, for `doctor`. */
  readonly paths: readonly string[];
  readonly concurrency?: number;
  readonly onProgress?: (done: number, total: number) => void;
  readonly fetchImpl?: FetchLike;
  readonly env?: NodeJS.ProcessEnv;
}

export interface MaterialiseResult {
  readonly fetched: number;
  readonly cached: number;
}

/**
 * Bring every path this run needs onto the disk, from the cache where it is
 * already there and from the origin where it is not.
 *
 * Whole-then-use, on purpose: the caller runs this before it creates the app
 * directory, so a run that loses the network halfway through leaves a partly
 * filled cache — which the next attempt continues from — and no half-written
 * app anywhere near the user's disk.
 */
export async function materialise(options: MaterialiseOptions): Promise<MaterialiseResult> {
  const { lock, root, paths, onProgress } = options;
  const fetchImpl = options.fetchImpl ?? outboundFetch;
  const pin: ContentPin = { repo: lock.repo, commit: lock.commit };

  const missing: string[] = [];
  let alreadyHere = 0;
  for (const path of paths) {
    const expected = lock.files[path];
    if (expected === undefined) {
      throw new WizardError(
        `The wizard asked for ${path}, which its content lock does not describe`,
        'Reinstall the wizard.',
      );
    }
    if (cached(root, path, expected)) alreadyHere += 1;
    else missing.push(path);
  }

  let done = alreadyHere;
  const total = paths.length;
  onProgress?.(done, total);

  const queue = [...missing];
  const worker = async (): Promise<void> => {
    for (let path = queue.pop(); path !== undefined; path = queue.pop()) {
      const url = contentUrl(pin, path, options.env);
      let response: Response;
      try {
        response = await fetchImpl(url);
      } catch (err) {
        throw new WizardError(
          `Could not reach ${url}`,
          'Check the network (and HTTPS_PROXY, if this machine uses one) and run the wizard again — what it already downloaded is kept.',
          err,
        );
      }
      if (!response.ok) {
        throw new WizardError(
          `${path} is not available at the commit this wizard is pinned to (HTTP ${response.status})`,
          'Reinstall the wizard, and report this if it repeats — a published pin should always resolve.',
        );
      }
      store(root, path, Buffer.from(await response.arrayBuffer()), lock.files[path]);
      done += 1;
      onProgress?.(done, total);
    }
  };

  const workers = Math.max(1, Math.min(options.concurrency ?? 16, queue.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));

  return { fetched: missing.length, cached: alreadyHere };
}
