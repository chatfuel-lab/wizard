#!/usr/bin/env node
/**
 * Writes the two things a published wizard carries about content it does not
 * contain: `content.lock`, which names the commit and a digest for every file,
 * and `manifests/`, the module manifests it needs before it can fetch anything.
 *
 * Run by `prepack`; both outputs are gitignored.
 *
 * The trees themselves used to be copied in here — `content/shell` and three
 * package sources, fifteen megabytes of them — because `ContentSource` needed
 * them on disk. It still does, but the disk is now a cache named after the
 * commit, filled from that commit at run time and checked against these
 * digests. A tarball that carries the files can only ever be fixed by
 * publishing another one; a tarball that carries a pin can be pointed at a
 * newer commit.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPublishable } from '../../../scripts/check-publishable.ts';
import { MANIFEST_DIR } from '../../../scripts/content-trees.ts';
import { assertPinnable, buildContentLock, repoFromManifest, serialiseLock } from './content-lock.ts';
import { LOCK_FILE } from '../src/lockFormat.ts';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(pkgRoot, '..', '..');

/*
 * The pinnable check asks whether the rest of the world can resolve this
 * commit, and `pack-smoke` needs a tarball from a branch that was never pushed,
 * so there is an exemption. It has a variable of its own on purpose: keying it
 * on CHATFUEL_CONTENT_ORIGIN would mean a developer who exported that once, to
 * point a run at a local mirror, silently publishes a package pinned to a
 * commit nobody else can fetch. Nobody leaves this one in a shell.
 */
if (!process.env.CHATFUEL_PACK_LOCAL) assertPinnable(repoRoot);

/*
 * The gate reads the repo, because the repo is now what ships. Once the files
 * are fetched from the commit, the bytes a user receives ARE these bytes, and
 * the digests written a moment later are what carry this verdict to them.
 */
const sourceProblems = checkPublishable({ mode: 'source' });
if (sourceProblems.length > 0) {
  for (const problem of sourceProblems) console.error(problem);
  throw new Error(`pack-content: ${sourceProblems.length} problem(s) in the tree the lock would pin`);
}

const manifestPath = join(pkgRoot, 'package.json');
const version = JSON.parse(readFileSync(manifestPath, 'utf8')).version;
const lock = buildContentLock({ repoRoot, repo: repoFromManifest(manifestPath), wizardVersion: version });
writeFileSync(join(pkgRoot, LOCK_FILE), serialiseLock(lock));

/*
 * The manifests travel because the module picker draws before anything has been
 * fetched. They are copied from the same tree the lock was taken from, and the
 * wizard checks each one against its digest on the way into the cache — a file
 * that shipped is not a file that is trusted.
 */
const manifests = join(pkgRoot, MANIFEST_DIR);
rmSync(manifests, { recursive: true, force: true });
let copied = 0;
for (const path of Object.keys(lock.files)) {
  if (!/^content\/modules\/[^/]+\/module\.json$/.test(path)) continue;
  const target = join(manifests, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(join(repoRoot, path)));
  copied += 1;
}
if (!existsSync(join(manifests, 'content', 'modules', 'core', 'module.json'))) {
  throw new Error('pack-content: modules/core/module.json missing — the wizard would have no registry to draw');
}

/*
 * The last gate before a tarball exists, reading what would be in it rather
 * than what it came from. Small now, and still the only pass that reads the
 * package the way npm will.
 */
const problems = checkPublishable({ mode: 'packed' });
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  throw new Error(`pack-content: ${problems.length} problem(s) in what would be published`);
}

const lockBytes = statSync(join(pkgRoot, LOCK_FILE)).size;
console.log(
  `${LOCK_FILE}: ${Object.keys(lock.files).length} files at ${lock.commit.slice(0, 12)}, ${(lockBytes / 1024).toFixed(0)} KB\n` +
    `${MANIFEST_DIR}/: ${copied} module manifests`,
);
