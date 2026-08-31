import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildContentLock } from '../scripts/content-lock';
import { startOriginServer, type OriginServer } from '../scripts/origin-server';
import type { ContentLock } from '../src/contentLock';
import { cacheRoot, materialise, seedManifests } from '../src/contentStore';
import { digestOf } from '../src/lockFormat';
import { WizardError } from '../src/errors';
import { loadMigrations } from '../src/supabase/sql';

/**
 * The fetch half of the content source, against an origin backed by this
 * repository's own git objects.
 *
 * Not against GitHub, and the reason is not only speed: the digest check is the
 * thing being tested, and no real origin will corrupt a byte on request.
 */
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const REPO = 'chatfuel-lab/wizard';
const MANIFEST = 'content/modules/core/module.json';
const TEMPLATE = 'content/shell/package.json';

let server: OriginServer;
let lock: ContentLock;
let cache: string;

/**
 * A commit that holds the working tree, rather than HEAD.
 *
 * The lock takes its digests from the files on disk and the origin answers out
 * of git objects, so the two only agree while the content trees are committed.
 * Pinning the fixture to HEAD would therefore make every test here fail from
 * the moment somebody edits a content file until the moment they commit it —
 * which is most of the time anybody is working on the content. `stash create`
 * writes the current tree as a commit and touches nothing: not the branch, not
 * the stash list, not the working tree. On a clean tree it prints nothing, and
 * HEAD is already the right answer.
 */
function worktreeCommit(): string {
  const created = execFileSync('git', ['stash', 'create'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  return created || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

beforeAll(async () => {
  server = await startOriginServer({ repo: REPO, cwd: repoRoot });
  lock = buildContentLock({ repoRoot, repo: REPO, wizardVersion: '0.0.0-test', commit: worktreeCommit() });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  cache = mkdtempSync(join(tmpdir(), 'wizard-cache-'));
  server.requests.length = 0;
  server.overrides.clear();
});

afterEach(() => {
  rmSync(cache, { recursive: true, force: true });
});

const fetchOptions = (paths: string[]) => ({
  lock,
  root: cache,
  paths,
  env: { CHATFUEL_CONTENT_ORIGIN: server.url },
});

describe('materialising the pinned content', () => {
  it('writes the bytes the commit holds', async () => {
    await materialise(fetchOptions([MANIFEST, TEMPLATE]));
    expect(readFileSync(join(cache, MANIFEST))).toEqual(readFileSync(join(repoRoot, MANIFEST)));
    expect(readFileSync(join(cache, TEMPLATE))).toEqual(readFileSync(join(repoRoot, TEMPLATE)));
  });

  /* The point of a cache keyed by commit: the second run of the wizard against
     the same pin is the same app, and asking again could only make it differ. */
  it('asks the origin nothing on a second run against the same commit', async () => {
    const first = await materialise(fetchOptions([MANIFEST, TEMPLATE]));
    expect(first.fetched).toBe(2);
    server.requests.length = 0;

    const second = await materialise(fetchOptions([MANIFEST, TEMPLATE]));
    expect(second.fetched).toBe(0);
    expect(second.cached).toBe(2);
    expect(server.requests).toEqual([]);
  });

  it('refuses bytes that do not match the digest, and keeps them off the disk', async () => {
    server.overrides.set(MANIFEST, Buffer.from('{"id":"core","extra":true}\n'));
    await expect(materialise(fetchOptions([MANIFEST]))).rejects.toThrow(new RegExp(MANIFEST));
    expect(existsSync(join(cache, MANIFEST))).toBe(false);
  });

  /* A refused file must not leave a shorter one behind either: the next run
     reads the cache before it reads the network, and a truncated file that
     survived would be served as content from then on. */
  it('leaves no partial file behind when a fetch is refused', async () => {
    server.overrides.set(TEMPLATE, Buffer.from('{'));
    await expect(materialise(fetchOptions([TEMPLATE]))).rejects.toBeInstanceOf(WizardError);
    expect(existsSync(join(cache, TEMPLATE))).toBe(false);
    expect(existsSync(join(cache, `${TEMPLATE}.${process.pid}.part`))).toBe(false);
  });

  it('says which file the origin does not have', async () => {
    server.overrides.set(MANIFEST, null);
    await expect(materialise(fetchOptions([MANIFEST]))).rejects.toThrow(/modules\/core\/module\.json.*404/s);
  });

  it('refuses a path the lock does not describe, before asking for it', async () => {
    await expect(materialise(fetchOptions(['content/shell/nothing-here.ts']))).rejects.toThrow(/content lock/);
    expect(server.requests).toEqual([]);
  });

  /* A cache entry that lost bytes — a full disk, a killed process before this
     code wrote through a temporary name — is not a cache hit. */
  it('re-fetches a cached file whose bytes no longer match', async () => {
    await materialise(fetchOptions([MANIFEST]));
    writeFileSync(join(cache, MANIFEST), '{');
    server.requests.length = 0;

    const again = await materialise(fetchOptions([MANIFEST]));
    expect(again.fetched).toBe(1);
    expect(readFileSync(join(cache, MANIFEST))).toEqual(readFileSync(join(repoRoot, MANIFEST)));
  });
});

describe('the manifests that ship in the tarball', () => {
  let shipped: string;

  beforeEach(() => {
    shipped = mkdtempSync(join(tmpdir(), 'wizard-manifests-'));
    const target = join(shipped, MANIFEST);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(repoRoot, MANIFEST)));
  });

  afterEach(() => {
    rmSync(shipped, { recursive: true, force: true });
  });

  it('reach the cache without the network', () => {
    const only = { ...lock, files: { [MANIFEST]: lock.files[MANIFEST] } };
    expect(seedManifests(only, shipped, cache)).toEqual([]);
    expect(readFileSync(join(cache, MANIFEST))).toEqual(readFileSync(join(repoRoot, MANIFEST)));
    expect(server.requests).toEqual([]);
  });

  /* A file that shipped is not a file that is trusted: it goes through the same
     digest as a fetched one, so a tarball built from a tree that moved on can
     never seed an app nobody can reproduce. What happens to the file that fails
     is the caller's decision — against the floor a name coming back means a
     broken package, and against a resolved commit it means one more download. */
  it('are checked against the same digests as a fetched file', () => {
    writeFileSync(join(shipped, MANIFEST), '{"id":"core","extra":true}\n');
    const only = { ...lock, files: { [MANIFEST]: lock.files[MANIFEST] } };
    expect(seedManifests(only, shipped, cache)).toEqual([MANIFEST]);
    expect(existsSync(join(cache, MANIFEST))).toBe(false);
  });

  it('are reported, not invented, when the package shipped none', () => {
    rmSync(join(shipped, MANIFEST));
    const only = { ...lock, files: { [MANIFEST]: lock.files[MANIFEST] } };
    expect(seedManifests(only, shipped, cache)).toEqual([MANIFEST]);
  });

  /* The case the return value exists for: a module added to the branch after
     this wizard was published. Its manifest is in the resolved commit's index
     and in no tarball, and naming it is what lets the caller fetch it before
     the picker is drawn. */
  it('name a manifest the package could not have shipped', () => {
    const added = 'content/modules/added-later/module.json';
    const only = { ...lock, files: { [added]: digestOf(Buffer.from('{"id":"added-later"}\n')) } };
    expect(seedManifests(only, shipped, cache)).toEqual([added]);
  });
});

describe('where the cache lives', () => {
  /* Named after the commit, so two wizard versions pinned to different commits
     cannot read each other's files and nothing has to be invalidated. */
  it('is one directory per commit', () => {
    const env = { XDG_CACHE_HOME: '/tmp/xdg' };
    expect(cacheRoot('a'.repeat(40), env)).toBe(join('/tmp/xdg', 'chatfuel-wizard', 'a'.repeat(40)));
    expect(cacheRoot('a'.repeat(40), env)).not.toBe(cacheRoot('b'.repeat(40), env));
  });

  it('digests the way the lock does', () => {
    const bytes = readFileSync(join(repoRoot, MANIFEST));
    expect(digestOf(bytes)).toBe(lock.files[MANIFEST]);
    /* And the commit it names holds the bytes it digested. A lock whose files
       and whose commit disagree is one no origin can answer. */
    const fromGit = execFileSync('git', ['cat-file', 'blob', `${lock.commit}:${MANIFEST}`], { cwd: repoRoot });
    expect(digestOf(fromGit)).toBe(lock.files[MANIFEST]);
  });
});

/**
 * The scaffold reads every file it copies through `ContentSource`, so an app
 * built from the cache differs from one built in the repo exactly where the
 * bytes differ — nowhere else. This checks the bytes, on the awkward files
 * rather than the average ones: dotfiles npm used to eat, images that must not
 * be transcoded, and a spread across the whole lock.
 */
describe('what a client receives, against what the repo holds', () => {
  const awkward = ['content/shell/.gitignore', 'content/shell/.env.example', 'content/shell/public/logo.svg'];

  it('is the same bytes, dotfiles and binaries included', async () => {
    const all = Object.keys(lock.files);
    const sample = [
      ...new Set([...awkward.filter((path) => path in lock.files), ...all.filter((_, i) => i % 40 === 0)]),
    ];
    expect(sample.length).toBeGreaterThan(30);

    await materialise({ ...fetchOptions(sample), concurrency: 24 });
    for (const path of sample) {
      expect(readFileSync(join(cache, path)), path).toEqual(readFileSync(join(repoRoot, path)));
    }
  });

  /* The template's `.gitignore` used to travel as `_gitignore`, because npm
     reads a nested one as ignore rules and would drop files from the tarball.
     Nothing is nested in a tarball any more, and `gitignoreGuard` refuses to
     write the token without a real `.gitignore` — so it has to arrive named. */
  it('carries the template gitignore under its own name', () => {
    expect(lock.files['content/shell/.gitignore']).toBeDefined();
    expect(Object.keys(lock.files).some((path) => path.endsWith('_gitignore'))).toBe(false);
  });
});

/**
 * Two readers that do not copy a directory but open a named file, and would
 * therefore be the ones to notice if a path only worked because the whole tree
 * happened to be there: the migrations the auth step runs, and the skill the
 * scaffold installs.
 */
describe('the files opened by name rather than copied', () => {
  it('finds the auth migrations in the cache, byte for byte', async () => {
    const migrations = Object.keys(lock.files).filter((path) =>
      /^content\/modules\/(auth|admin|publishing)\/supabase\/migrations\//.test(path),
    );
    expect(migrations.length).toBeGreaterThan(0);
    await materialise(fetchOptions(migrations));

    const answers = { modules: ['auth'], env: {} };
    const fromCache = loadMigrations({
      content: sourceAt(cache),
      answers,
    } as never);
    const fromRepo = loadMigrations({
      content: sourceAt(repoRoot),
      answers,
    } as never);
    expect(fromCache.map((m) => m.name)).toEqual(fromRepo.map((m) => m.name));
    expect(fromCache.map((m) => m.sql)).toEqual(fromRepo.map((m) => m.sql));
  });

  it('finds a module skill in the cache', async () => {
    const skill = Object.keys(lock.files).filter((path) => path.startsWith('content/modules/core/skill/'));
    expect(skill.length).toBeGreaterThan(0);
    await materialise({ ...fetchOptions(skill), concurrency: 24 });
    for (const path of skill) {
      expect(readFileSync(join(cache, path)), path).toEqual(readFileSync(join(repoRoot, path)));
    }
  });
});

/** The path joins `ContentSource` makes, over a root a test chooses. */
const sourceAt = (root: string) => ({
  root,
  packaged: root !== repoRoot,
  modulePath: (id: string, ...segments: string[]) => join(root, 'content', 'modules', id, ...segments),
  vendorPath: (name: string, ...segments: string[]) => join(root, 'content', name, ...segments),
  shellPath: (...segments: string[]) => join(root, 'content', 'shell', ...segments),
});
