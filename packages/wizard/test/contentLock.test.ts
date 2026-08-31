import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertPinnable,
  buildContentLock,
  repoFromManifest,
  serialiseLock,
  trackedContentFiles,
} from '../scripts/content-lock';
import { parseContentLock } from '../src/contentLock';
import { digestOf } from '../src/lockFormat';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/**
 * A repository of its own, because what is being tested is what git says about
 * a tree: dirty or clean, pushed or not. None of that can be staged inside the
 * repository the tests run in without changing it.
 */
function fixture(): { dir: string; remote: string; git: (...args: string[]) => string; clean: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'content-lock-'));
  const remote = mkdtempSync(join(tmpdir(), 'content-lock-remote-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();

  execFileSync('git', ['init', '--bare', '-b', 'main', remote]);
  git('init', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('remote', 'add', 'origin', remote);

  mkdirSync(join(dir, 'content', 'modules', 'core'), { recursive: true });
  mkdirSync(join(dir, 'content', 'shell', 'src'), { recursive: true });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  writeFileSync(join(dir, 'content', 'modules', 'core', 'module.json'), '{"id":"core"}\n');
  writeFileSync(join(dir, 'content', 'shell', 'src', 'App.tsx'), 'export const App = () => null;\n');
  writeFileSync(join(dir, 'docs', 'notes.md'), 'outside the content trees\n');
  writeFileSync(join(dir, '.gitignore'), '.omc/\n');
  git('add', '-A');
  git('commit', '-m', 'first');

  return { dir, remote, git, clean: () => [dir, remote].forEach((d) => rmSync(d, { recursive: true, force: true })) };
}

describe('what the lock pins', () => {
  const repo = fixture();
  afterAll(repo.clean);

  it('is the tracked files of the content trees, and nothing outside them', () => {
    expect(trackedContentFiles(repo.dir)).toEqual(['content/modules/core/module.json', 'content/shell/src/App.tsx']);
  });

  /* The reason the list comes from git rather than a walk of the directory. On
     a machine where agents work, the trees hold their scratch state — session
     ids, replay logs — and a walk would pin, and then publish, every byte of it. */
  it('is not what happens to be lying in the directory', () => {
    mkdirSync(join(repo.dir, 'content', 'shell', '.omc', 'state'), { recursive: true });
    writeFileSync(join(repo.dir, 'content', 'shell', '.omc', 'state', 'session.json'), '{"id":"secret"}\n');
    expect(trackedContentFiles(repo.dir).join(' ')).not.toContain('.omc');
  });

  it('carries a digest of every file, the commit, and the version', () => {
    const lock = buildContentLock({ repoRoot: repo.dir, repo: 'owner/name', wizardVersion: '9.9.9' });
    expect(lock.commit).toBe(repo.git('rev-parse', 'HEAD'));
    expect(lock.repo).toBe('owner/name');
    expect(lock.wizardVersion).toBe('9.9.9');
    expect(lock.files['content/modules/core/module.json']).toBe(digestOf(Buffer.from('{"id":"core"}\n')));
  });

  /* A sha256 in hex is 64 hex characters, which is also the shape of a Chatfuel
     token — so a lock written that way is a shipped file that trips the secret
     scanner on every one of its lines, and the way out is always to stop
     scanning something. The encoding is load-bearing; this says so where the
     next person to reach for `digest('hex')` will read it. */
  it('writes digests in an encoding that is not the shape of a credential', () => {
    const lock = buildContentLock({ repoRoot: repo.dir, repo: 'owner/name', wizardVersion: '9.9.9' });
    for (const digest of Object.values(lock.files)) expect(digest).not.toMatch(/^[0-9a-f]{64}$/i);
  });

  /* The whole point of a digest: bytes that changed after the lock was written
     are bytes the lock does not describe, whoever they came from. */
  it('describes the bytes, so a file edited afterwards no longer matches', () => {
    const lock = buildContentLock({ repoRoot: repo.dir, repo: 'owner/name', wizardVersion: '9.9.9' });
    const tampered = digestOf(Buffer.from('{"id":"core","extra":true}\n'));
    expect(tampered).not.toBe(lock.files['content/modules/core/module.json']);
  });

  it('serialises to JSON with a trailing newline, so a diff of two locks reads', () => {
    const lock = buildContentLock({ repoRoot: repo.dir, repo: 'owner/name', wizardVersion: '9.9.9' });
    expect(serialiseLock(lock).endsWith('}\n')).toBe(true);
    expect(JSON.parse(serialiseLock(lock))).toEqual(lock);
  });
});

describe('what may be pinned at all', () => {
  const repo = fixture();
  afterAll(repo.clean);

  /* A commit on no remote is one nobody else can resolve. The package would
     install and then fail on the first fetch, on every machine but this one. */
  it('refuses a commit that is on no remote branch', () => {
    expect(() => assertPinnable(repo.dir)).toThrow(/on no remote branch/);
  });

  it('accepts it once it is pushed', () => {
    repo.git('push', '-u', 'origin', 'main');
    expect(() => assertPinnable(repo.dir)).not.toThrow();
  });

  /* Digests taken from a dirty tree describe bytes that exist on one machine
     and in no commit, so nothing could ever fetch them back. */
  it('refuses a dirty working tree', () => {
    writeFileSync(join(repo.dir, 'content', 'modules', 'core', 'module.json'), '{"id":"core","edited":true}\n');
    expect(() => assertPinnable(repo.dir)).toThrow(/working tree is dirty/);
  });
});

describe('the repository name', () => {
  it('comes from the manifest npm already records it in', () => {
    expect(repoFromManifest(join(repoRoot, 'packages', 'wizard', 'package.json'))).toBe('chatfuel-lab/wizard');
  });

  it('reads both url shapes, and refuses a manifest that names none', () => {
    const dir = mkdtempSync(join(tmpdir(), 'manifest-'));
    const at = (repository: unknown) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ repository }));
      return join(dir, 'package.json');
    };
    expect(repoFromManifest(at({ url: 'git+https://github.com/a/b.git' }))).toBe('a/b');
    expect(repoFromManifest(at({ url: 'git@github.com:a/b.git' }))).toBe('a/b');
    expect(() => repoFromManifest(at({ url: 'https://gitlab.com/a/b.git' }))).toThrow(/no GitHub repository url/);
    expect(() => repoFromManifest(at(undefined))).toThrow(/no GitHub repository url/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('this repository, locked', () => {
  let lock: ReturnType<typeof buildContentLock>;
  beforeAll(() => {
    lock = buildContentLock({ repoRoot, repo: 'chatfuel-lab/wizard', wizardVersion: '0.0.0-test' });
  });

  /* A skip list is a list of the names somebody thought of, so the lock does
     not use one: it is built from `git ls-files`, and an untracked path is not
     a path that returns, whatever it is called. This test states the property
     rather than the names. */
  it('holds no agent scratch state, and needs no list of its names to say so', () => {
    const untracked = Object.keys(lock.files).filter((path) => /(^|\/)\.(omc|claude)(\/|$)/.test(path));
    expect(untracked).toEqual([]);
  });

  it('holds every module manifest, which the wizard needs before it can fetch anything', () => {
    expect(
      Object.keys(lock.files).filter((path) => /^content\/modules\/[^/]+\/module\.json$/.test(path)).length,
    ).toBeGreaterThan(5);
  });

  it('stays small enough to ship in the tarball', () => {
    expect(Buffer.byteLength(serialiseLock(lock))).toBeLessThan(250 * 1024);
  });
});

/**
 * The reading half, which runs on a user's machine rather than ours.
 *
 * A lock decides which URLs the wizard asks for and which bytes it then
 * accepts, so a malformed one has to be refused before any of that starts —
 * not discovered halfway through a download.
 */
describe('reading a lock back', () => {
  const good = serialiseLock(buildContentLock({ repoRoot, repo: 'owner/name', wizardVersion: '1.2.3' }));

  it('accepts what the packer writes', () => {
    const lock = parseContentLock(good, 'content.lock');
    expect(lock.repo).toBe('owner/name');
    expect(lock.wizardVersion).toBe('1.2.3');
    expect(Object.keys(lock.files).length).toBeGreaterThan(100);
  });

  const refused: [string, string][] = [
    ['not json at all', '{'],
    ['a branch name where a commit belongs', good.replace(/"commit": "[0-9a-f]{40}"/, '"commit": "main"')],
    ['an abbreviated sha', good.replace(/"commit": "([0-9a-f]{12})[0-9a-f]{28}"/, '"commit": "$1"')],
    ['a repo name with a path in it', good.replace(/"repo": "[^"]+"/, '"repo": "owner/name/../../etc"')],
    ['no files', good.replace(/"files": \{[\s\S]*\}\n\}/, '"files": {}\n}')],
  ];

  for (const [what, text] of refused) {
    it(`refuses ${what}`, () => {
      expect(() => parseContentLock(text, 'content.lock')).toThrow();
    });
  }

  /* Every consumer joins these keys onto a directory, and the cache reads one
     before anything else has looked at it. Refusing them here is what makes
     "a key stays inside the tree" a property of the lock rather than of the
     order in which two functions happen to be called. */
  it.each(['../../../../etc/passwd', '/etc/passwd', 'apps/../../escape.txt', 'apps//shell.ts'])(
    'refuses the key %s',
    (key) => {
      const lock = JSON.parse(good) as { files: Record<string, string> };
      lock.files[key] = 'ZGlnZXN0';
      expect(() => parseContentLock(JSON.stringify(lock), 'content.lock')).toThrow(/content tree/);
    },
  );

  /* Named in the message, because the person reading it is holding an install
     that a reinstall may well fix and has no other way to tell which file. */
  it('names the file it could not read', () => {
    expect(() => parseContentLock('{', '/home/someone/.npm/x/content.lock')).toThrow(
      /\/home\/someone\/\.npm\/x\/content\.lock/,
    );
  });
});
