/**
 * The index that replaces shipping the files themselves.
 *
 * A published wizard carries this and not the content: a commit, and a sha256
 * for every file that commit holds. Everything else follows from those two —
 * the URL to fetch a file from, and the answer to whether the bytes that came
 * back are the ones that were meant.
 *
 * That commit is a floor rather than a destination. The run resolves a branch
 * and fetches `content.index.json` from whatever it resolved to, which is where
 * the digests for that commit live; what is written here is the oldest commit
 * this wizard will accept, and the index it falls back to when the resolution
 * cannot be made. Both are built by `buildContentIndex` for that reason.
 *
 * The list is built from `git ls-files`, not from a walk of the directory. That
 * is the whole safety property. A walk ships whatever happens to be lying in
 * the tree on the machine that ran it, which on a machine where agents work
 * means their scratch state: session ids, replay logs, checkpoints. A tracked
 * file, by contrast, is one somebody committed on purpose, and it is also the
 * only kind that can be fetched back from the commit later — a lock naming an
 * untracked file would be a lock nobody can resolve.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_TREES } from '../../../scripts/content-trees.ts';
import { digestOf } from '../src/lockFormat.ts';
import type { ContentLock } from '../src/lockFormat.ts';

/**
 * `owner/name` out of the package manifest, which is where npm already records
 * it. Writing it down a second time would be a second thing to keep in step.
 */
export function repoFromManifest(manifestPath: string): string {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { repository?: { url?: string } };
  const url = manifest.repository?.url ?? '';
  const match = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (!match) throw new Error(`content-lock: package.json has no GitHub repository url to pin against (${url})`);
  return match[1]!;
}

const git = (repoRoot: string, args: string[]): string =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

/**
 * Refuse to pin anything the world cannot fetch.
 *
 * A dirty tree would mean the digests are of bytes that exist on one machine
 * and in no commit. An unpushed commit would mean a published package points at
 * a sha nobody else can resolve — inert on every disk but this one, and only
 * discovered by whoever installs it.
 */
export function assertPinnable(repoRoot: string): void {
  const dirty = git(repoRoot, ['status', '--porcelain']);
  if (dirty) {
    throw new Error(
      `content-lock: the working tree is dirty, so the digests would be of bytes no commit holds:\n${dirty}`,
    );
  }
  if (!git(repoRoot, ['branch', '-r', '--contains', 'HEAD'])) {
    throw new Error('content-lock: HEAD is on no remote branch — a package pinned to it could not be resolved');
  }
}

/**
 * Directories that are somebody's local state, wherever they turn up.
 *
 * The trees are listed with `git ls-files`, so whatever is tracked under them
 * ships: it goes into the lock, gets fetched by every installed wizard, and is
 * written into every generated app. `.gitignore` is the first line against
 * that and this is the second, because the two failures it catches are the ones
 * .gitignore cannot: a file force-added, and a rule someone loosens later.
 * Dotfiles as such are fine — `content/shell/.env.example` and `.gitignore`
 * are part of the scaffold — so this names directories, not a leading dot.
 */
const LOCAL_STATE_DIRS = ['.claude', '.omc', '.cursor', '.vscode', '.idea', '.git', 'node_modules'];

/** Tracked files under the content trees, in a stable order. */
export function trackedContentFiles(repoRoot: string): string[] {
  const listed = git(repoRoot, ['ls-files', '-z', '--', ...CONTENT_TREES]);
  const files = listed
    .split('\0')
    .filter((path) => path !== '')
    .sort();
  const local = files.filter((path) => path.split('/').some((segment) => LOCAL_STATE_DIRS.includes(segment)));
  if (local.length > 0) {
    throw new Error(
      `content-lock: these are tracked under the content trees and would be published to every app:\n${local.map((path) => `  ${path}`).join('\n')}`,
    );
  }
  return files;
}

/**
 * Path to digest for every tracked file under the content trees.
 *
 * One function rather than two because the same map is written to two places
 * that must agree: `content.lock` inside the tarball, and `content.index.json`
 * committed to the repository. A wizard checks bytes fetched from a commit
 * against whichever of them it has, so a second implementation that rounded a
 * digest differently would fail every download and say nothing about why.
 *
 * Digests are taken from the working tree. For the tarball `assertPinnable` has
 * just established that the tree is the commit; for the committed index the
 * validate pass establishes the same thing the other way round, by rebuilding
 * this map and comparing. Reading 1700 blobs back out of git instead would cost
 * a great deal to learn what the tree already says.
 */
export function buildContentIndex(repoRoot: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const path of trackedContentFiles(repoRoot)) {
    files[path] = digestOf(readFileSync(join(repoRoot, path)));
  }
  return files;
}

export function buildContentLock(options: {
  repoRoot: string;
  repo: string;
  wizardVersion: string;
  commit?: string;
}): ContentLock {
  const { repoRoot, repo, wizardVersion } = options;
  const commit = options.commit ?? git(repoRoot, ['rev-parse', 'HEAD']);
  return { repo, commit, wizardVersion, files: buildContentIndex(repoRoot) };
}

export const serialiseLock = (lock: ContentLock): string => `${JSON.stringify(lock, null, 2)}\n`;
