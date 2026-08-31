import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startOriginServer, type OriginServer } from '../scripts/origin-server';
import { digestOf } from '../src/lockFormat';
import { WizardError } from '../src/errors';
import { appLockPath, writeAppLock } from '../src/scaffold/appLock';
import { CODEGEN_AFTER_UPDATE, CODEGEN_COMMAND } from '../src/codegen';
import { planUpdate, readAppLock, update } from '../src/commands/update';
import { installInterruptHandler, onInterrupt } from '../src/interrupt';
import type { UpdateOptions } from '../src/commands/update';
import type { AppLock } from '../src/scaffold/appLock';
import type { ContentLock } from '../src/contentLock';

/**
 * An app on commit A, content that moved on to commit B, and the three states
 * every file lands in.
 *
 * Both repositories here are made by the test: the content one so its two
 * commits differ exactly where the states need them to, and the app one because
 * the update refuses to write where `git checkout .` could not take it back.
 * The origin serves the content repo's own objects, so the bytes an update
 * fetches are the bytes commit B holds — including its digests, which is what
 * `materialise` checks them against.
 */
const REPO = 'chatfuel-lab/wizard';
const UNCHANGED = 'content/shell/README.md';
const EDITED = 'content/shell/src/app.tsx';
const REWRITTEN = 'content/shell/vite.config.ts';
const VENDORED = 'content/ui/src/Button.tsx';
const SDL = 'content/schema/schema.graphql';
const OPERATIONS = 'content/modules/core/skill/examples/operations.graphql';

/**
 * Ctrl+C in the middle of the copy loop, delivered for real.
 *
 * No `catch` and no `finally` runs when a signal ends the process, so the
 * repair the loop's `catch` performs has to be reachable from the handler as
 * well. `insideProblem` is asked once per file, immediately before that file is
 * copied, which makes it the one place a test can put the signal at a moment
 * the loop is genuinely halfway through. Off unless a test arms it.
 */
let interruptBeforeFile: number | null = null;
let filesSeen = 0;
vi.mock('../src/insidePath', async (importActual) => {
  const actual = await importActual<typeof import('../src/insidePath')>();
  return {
    ...actual,
    insideProblem: (root: string, to: string): string | undefined => {
      filesSeen += 1;
      if (interruptBeforeFile === filesSeen) {
        interruptBeforeFile = null;
        process.emit('SIGINT', 'SIGINT');
      }
      return actual.insideProblem(root, to);
    },
  };
});

const git = (cwd: string, args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function commitAll(dir: string, message: string): string {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--no-gpg-sign', '-q', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']);
}

function initRepo(dir: string): void {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
}

function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text, 'utf8');
}

/** The content lock a wizard pinned to this commit would carry. */
function lockAt(dir: string, commit: string): ContentLock {
  const files: Record<string, string> = {};
  for (const path of git(dir, ['ls-tree', '-r', '--name-only', commit]).split('\n').filter(Boolean)) {
    files[path] = digestOf(execFileSync('git', ['cat-file', 'blob', `${commit}:${path}`], { cwd: dir }));
  }
  return { repo: REPO, commit, wizardVersion: '0.3.0', files };
}

const at = (dir: string, commit: string, path: string): string =>
  execFileSync('git', ['cat-file', 'blob', `${commit}:${path}`], { cwd: dir, encoding: 'utf8' });

let server: OriginServer;
let content: string;
let cache: string;
let app: string;
let A: string;
let B: string;
let lockB: ContentLock;

beforeEach(async () => {
  interruptBeforeFile = null;
  filesSeen = 0;
  const parent = mkdtempSync(join(tmpdir(), 'wizard-update-'));
  content = join(parent, 'content');
  app = join(parent, 'app');
  cache = join(parent, 'cache');

  initRepo(content);
  write(content, UNCHANGED, '# The app\n');
  write(content, EDITED, 'export const App = () => <main>one</main>;\n');
  write(content, REWRITTEN, "// chatfuel:proxy-import\nimport {} from 'placeholder';\nexport default {};\n");
  write(content, VENDORED, 'export const Button = () => null;\n');
  write(content, SDL, 'type Query {\n  one: Int\n}\n');
  write(content, OPERATIONS, 'query One {\n  one\n}\n');
  A = commitAll(content, 'a');

  write(content, EDITED, 'export const App = () => <main>two</main>;\n');
  write(
    content,
    REWRITTEN,
    "// chatfuel:proxy-import\nimport {} from 'placeholder';\nexport default { fixed: true };\n",
  );
  write(content, VENDORED, 'export const Button = () => null; // fixed\n');
  write(content, SDL, 'type Query {\n  one: Int\n  two: Int\n}\n');
  B = commitAll(content, 'b');

  lockB = lockAt(content, B);
  server = await startOriginServer({ repo: REPO, cwd: content });
});

afterEach(async () => {
  await server.close();
  rmSync(dirname(content), { recursive: true, force: true });
  vi.restoreAllMocks();
});

const env = (): NodeJS.ProcessEnv => ({ CHATFUEL_CONTENT_ORIGIN: server.url, CHATFUEL_WIZARD_CACHE: cache });

/**
 * The app as the scaffold would have left it on commit A: four files it copied
 * and one it generated, and a lock that says so.
 *
 * `vite.config.ts` is the rewritten one — on disk it carries the import the
 * wizard wrote into the marked block, so its `sha256` is of bytes no commit
 * holds and `upstream` is what commit A did hold.
 */
function makeApp(options: { rewritten?: boolean } = {}): AppLock {
  const rewritten = options.rewritten ?? true;
  initRepo(app);

  const files: AppLock['files'] = {};
  const copy = (to: string, from: string): void => {
    const bytes = at(content, A, from);
    write(app, to, bytes);
    files[to] = { from, sha256: digestOf(Buffer.from(bytes)) };
  };
  copy('README.md', UNCHANGED);
  copy('src/app.tsx', EDITED);
  copy('src/vendor/ui/Button.tsx', VENDORED);
  copy('vite.config.ts', REWRITTEN);

  if (rewritten) {
    const upstream = at(content, A, REWRITTEN);
    const wired = upstream.replace(
      "import {} from 'placeholder';",
      "import { chatfuelProxy } from './vendor/chatfuel-proxy/vite.js';",
    );
    write(app, 'vite.config.ts', wired);
    files['vite.config.ts'] = {
      from: REWRITTEN,
      sha256: digestOf(Buffer.from(wired)),
      upstream: digestOf(Buffer.from(upstream)),
      rewritten: ['proxy-import'],
    };
  }

  write(app, 'src/modules/index.ts', 'export const modules = [];\n');
  files['src/modules/index.ts'] = { generated: 'moduleRegistry' };

  const lock: AppLock = {
    mode: 'standalone',
    wizardVersion: '0.2.0',
    repo: REPO,
    commit: A,
    modules: ['core'],
    skills: {},
    files,
  };
  writeAppLock(app, lock);
  commitAll(app, 'scaffold');
  return lock;
}

const read = (path: string): string => readFileSync(join(app, path), 'utf8');
const lockNow = (): AppLock => JSON.parse(readFileSync(appLockPath(app), 'utf8')) as AppLock;

describe('the three states', () => {
  it('overwrites what nobody touched, keeps what somebody did, and leaves the rest', async () => {
    makeApp();
    write(app, 'src/app.tsx', 'export const App = () => <main>mine</main>;\n');
    commitAll(app, 'my edit');

    await update({ dir: app, target: lockB, env: env() });

    // Untouched here and moved upstream: the new bytes, exactly.
    expect(read('src/vendor/ui/Button.tsx')).toBe(at(content, B, VENDORED));
    // Edited here: theirs, and the update said so rather than taking it.
    expect(read('src/app.tsx')).toBe('export const App = () => <main>mine</main>;\n');
    // Unchanged upstream, and generated: neither was a candidate at all.
    expect(read('README.md')).toBe(at(content, A, UNCHANGED));
    expect(read('src/modules/index.ts')).toBe('export const modules = [];\n');
  });

  it('classifies each file for one reason each', () => {
    const lock = makeApp();
    write(app, 'src/app.tsx', 'export const App = () => <main>mine</main>;\n');
    const plan = planUpdate(app, lock, lockB);

    expect(plan.update.map((item) => item.at)).toEqual(['src/vendor/ui/Button.tsx']);
    expect(plan.conflicts).toEqual([
      { at: 'src/app.tsx', from: EDITED, why: 'edited here' },
      { at: 'vite.config.ts', from: REWRITTEN, why: 'wizard rewrote it', rewritten: ['proxy-import'] },
    ]);
    expect(plan.skipped).toEqual([
      { at: 'README.md', why: 'unchanged' },
      { at: 'src/modules/index.ts', why: 'generated' },
    ]);
  });

  /* The other half of the same question. A rewritten file's `sha256` is of
     bytes no commit holds, so comparing the target's digest against it would
     call every rewritten file changed forever — `upstream` is what says
     whether the upstream itself actually moved. */
  it('leaves a rewritten file alone while its upstream stands still', () => {
    const lock = makeApp();
    const upstream = at(content, A, UNCHANGED);
    const branded = upstream.replace('# The app', '# My app');
    write(app, 'README.md', branded);
    lock.files['README.md'] = {
      from: UNCHANGED,
      sha256: digestOf(Buffer.from(branded)),
      upstream: digestOf(Buffer.from(upstream)),
      rewritten: ['brandHtml'],
    };

    const plan = planUpdate(app, lock, lockB);
    expect(plan.conflicts.map((item) => item.at)).not.toContain('README.md');
    expect(plan.skipped).toContainEqual({ at: 'README.md', why: 'unchanged' });
  });

  /* A file the wizard edited on the way in cannot be replaced by the upstream
     bytes alone — that drops the import the app runs on. It is a conflict even
     though nobody here touched it, and the transform to re-apply is named. */
  it('never blind-overwrites a file the wizard rewrote', async () => {
    makeApp();
    const before = read('vite.config.ts');
    await update({ dir: app, target: lockB, env: env() });
    expect(read('vite.config.ts')).toBe(before);
    expect(before).toContain('./vendor/chatfuel-proxy/vite.js');
  });

  it('records what it wrote, and only that', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    const lock = lockNow();

    expect(lock.commit).toBe(B);
    expect(lock.wizardVersion).toBe('0.3.0');
    expect(lock.files['src/vendor/ui/Button.tsx']).toEqual({ from: VENDORED, sha256: lockB.files[VENDORED] });
    // Untouched by this run, so still describing the bytes on disk.
    expect(lock.files['vite.config.ts']!.sha256).toBe(digestOf(Buffer.from(read('vite.config.ts'))));
    expect(lock.files['src/modules/index.ts']).toEqual({ generated: 'moduleRegistry' });
  });
});

describe('what it refuses to do', () => {
  it('writes nothing into a tree with uncommitted changes', async () => {
    makeApp();
    write(app, 'src/app.tsx', 'half-finished\n');

    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/uncommitted changes/);
    expect(read('src/vendor/ui/Button.tsx')).toBe(at(content, A, VENDORED));
    expect(lockNow().commit).toBe(A);
    expect(read('src/app.tsx')).toBe('half-finished\n');
  });

  it('says so when there is no lock to read', async () => {
    initRepo(app);
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/\.chatfuel\/lock\.json/);
  });

  /* An app scaffolded from a checkout carries no commit at all: there is
     nothing the rest of the world can resolve, and fetching against it would
     404 halfway through. */
  it('refuses an app whose lock pins no resolvable commit', async () => {
    const lock = makeApp();
    writeAppLock(app, { ...lock, commit: undefined, repo: undefined });
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/no content repository and commit/);

    writeAppLock(app, { ...lock, commit: 'abc123' });
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/full commit sha/);
  });

  it('refuses content from a different repository than the app was built from', async () => {
    makeApp();
    const elsewhere = { ...lockB, repo: 'someone/else' };
    await expect(update({ dir: app, target: elsewhere, env: env() })).rejects.toBeInstanceOf(WizardError);
  });

  /* Every key in the lock is a destination the update writes to, and the lock
     arrives with the repository somebody cloned. The digests are no help here:
     matching one takes knowing what the target already holds. */
  it('refuses a lock naming a file outside the app', async () => {
    const lock = makeApp();
    for (const escape of ['../escaped.txt', '/etc/escaped.txt', 'src/../../escaped.txt']) {
      /* Written as bytes, not through `writeAppLock`: this is the lock that
         arrived with somebody's repository, and the wizard's own writer refuses
         to produce one. */
      const hostile = { ...lock, files: { ...lock.files, [escape]: { from: UNCHANGED, sha256: 'x' } } };
      writeFileSync(appLockPath(app), JSON.stringify(hostile), 'utf8');
      await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/outside the app/);
    }
    expect(existsSync(join(dirname(app), 'escaped.txt'))).toBe(false);
  });

  it('refuses a lock naming a file inside .git', async () => {
    const lock = makeApp();
    const hook = '.git/hooks/pre-commit';
    const hostile = { ...lock, files: { ...lock.files, [hook]: { from: UNCHANGED, sha256: 'x' } } };
    writeFileSync(appLockPath(app), JSON.stringify(hostile), 'utf8');
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/inside \.git/);
    expect(existsSync(join(app, hook))).toBe(false);
  });

  it('writes nothing through a directory that is a symlink out of the app', async () => {
    const lock = makeApp();
    const outside = mkdtempSync(join(tmpdir(), 'wizard-outside-'));
    const bytesAtA = at(content, A, VENDORED);
    mkdirSync(join(outside, 'ui'));
    writeFileSync(join(outside, 'ui', 'Button.tsx'), bytesAtA, 'utf8');
    rmSync(join(app, 'src', 'vendor'), { recursive: true, force: true });
    symlinkSync(outside, join(app, 'src', 'vendor'));
    commitAll(app, 'vendor moved out of the tree');

    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/does not resolve to a file/);
    expect(readFileSync(join(outside, 'ui', 'Button.tsx'), 'utf8')).toBe(bytesAtA);

    /* And the lock describes what did land before the refusal, not the whole
       plan: a file already overwritten must not read as an edit next time. */
    const now = lockNow();
    expect(now.files['src/app.tsx']!.sha256).toBe(lockB.files[EDITED]);
    expect(now.files['src/vendor/ui/Button.tsx']!.sha256).toBe(lock.files['src/vendor/ui/Button.tsx']!.sha256);
    rmSync(outside, { recursive: true, force: true });
  });

  it('reports the copy failure even when the lock cannot be written afterwards', async () => {
    /* The lock is written whether or not the copy loop finished. If that write
       fails too, the disk error about the lock must not replace the reason the
       copy stopped — that is the one that says what happened to the app. */
    const lock = makeApp();
    const outside = mkdtempSync(join(tmpdir(), 'wizard-outside-'));
    mkdirSync(join(outside, 'ui'));
    writeFileSync(join(outside, 'ui', 'Button.tsx'), at(content, A, VENDORED), 'utf8');
    rmSync(join(app, 'src', 'vendor'), { recursive: true, force: true });
    symlinkSync(outside, join(app, 'src', 'vendor'));
    commitAll(app, 'vendor moved out of the tree');
    chmodSync(appLockPath(app), 0o444); // readable at the start, unwritable at the end

    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/does not resolve to a file/);
    expect(errors.join('\n')).toMatch(/Could not write/);
    expect(lock).toBeDefined();
    chmodSync(appLockPath(app), 0o644);
    rmSync(outside, { recursive: true, force: true });
  });

  it('refuses a directory that is not in a git repository', async () => {
    makeApp();
    rmSync(join(app, '.git'), { recursive: true, force: true });
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/not inside a git repository/);
  });
});

describe('Ctrl+C in the middle of the copy loop', () => {
  /** The exit a signal ends in, without ending the test runner with it. */
  class Exited extends Error {}

  it('leaves a lock describing what was actually copied', async () => {
    const lock = makeApp();
    const stop = installInterruptHandler(() => {
      throw new Exited('the process would have exited');
    });
    /* Registered before the update's own, so it runs after it: what it reads
       is the lock the SIGNAL left. An undo that only happened on the way out
       through a `catch` would be an undo that never happens in production. */
    let lockAtSignal: AppLock | null = null;
    onInterrupt(() => {
      lockAtSignal = JSON.parse(readFileSync(appLockPath(app), 'utf8')) as AppLock;
    });

    interruptBeforeFile = 2;
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toBeInstanceOf(Exited);
    stop();

    const atSignal = lockAtSignal as AppLock | null;
    expect(atSignal).not.toBeNull();
    // The first file landed and is recorded as upstream's; the second never
    // did and is still recorded as commit A's. Without this, every byte the
    // loop had already written would read to the next run as an edit the
    // person made, and become a conflict nothing resolves.
    expect(atSignal!.files['src/app.tsx']!.sha256).toBe(lockB.files[EDITED]);
    expect(atSignal!.files['src/vendor/ui/Button.tsx']!.sha256).toBe(lock.files['src/vendor/ui/Button.tsx']!.sha256);
    expect(read('src/app.tsx')).toBe(at(content, B, EDITED));
    expect(read('src/vendor/ui/Button.tsx')).toBe(at(content, A, VENDORED));
  });

  it('is not still armed once the copy loop is over', async () => {
    makeApp();
    const stop = installInterruptHandler(() => {
      throw new Exited('the process would have exited');
    });
    await update({ dir: app, target: lockB, env: env() });
    const sealed = readFileSync(appLockPath(app), 'utf8');

    // The window is closed, so a signal now must not rewrite the lock the run
    // just finished — a cleanup left registered is a cleanup that fires long
    // after it stopped being right.
    expect(() => process.emit('SIGINT', 'SIGINT')).toThrow(Exited);
    stop();

    expect(readFileSync(appLockPath(app), 'utf8')).toBe(sealed);
  });
});

describe('--dry-run', () => {
  it('prints the three lists and writes not one byte', async () => {
    makeApp();
    const printed: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });

    await update({ dir: app, target: lockB, dryRun: true, env: env() });
    const out = printed.join('\n');

    expect(out).toMatch(/would update \(2\)/);
    expect(out).toContain('src/vendor/ui/Button.tsx');
    expect(out).toMatch(/conflicts \(1\)/);
    expect(out).toContain('vite.config.ts');
    expect(out).toMatch(/skipped \(2\)/);

    expect(read('src/vendor/ui/Button.tsx')).toBe(at(content, A, VENDORED));
    expect(lockNow().commit).toBe(A);
    // The tree is exactly as the scaffold's commit left it.
    expect(git(app, ['status', '--porcelain'])).toBe('');
  });

  it('answers on a dirty tree, because it changes nothing there either', async () => {
    makeApp();
    write(app, 'src/app.tsx', 'half-finished\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(update({ dir: app, target: lockB, dryRun: true, env: env() })).resolves.toBe(0);
  });
});

/* A rename upstream reaches an app as a disappearance and nothing else: the
   old path is gone and the new one was never in this app's lock, so the file
   stays as it is for good. A count cannot be acted on, so the paths are said. */
describe('a file that is gone upstream', () => {
  it('names it rather than folding it into the skipped count', async () => {
    const lock = makeApp();
    write(app, 'src/renamed.tsx', 'export const Old = () => null;\n');
    writeAppLock(app, {
      ...lock,
      files: { ...lock.files, 'src/renamed.tsx': { from: 'content/shell/src/gone.tsx', sha256: 'whatever' } },
    });
    commitAll(app, 'seed');

    const printed: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });
    await update({ dir: app, target: lockB, dryRun: true, env: env() });
    const out = printed.join('\n');

    expect(out).toMatch(/gone upstream \(1\)/);
    expect(out).toContain('src/renamed.tsx');
    expect(out).not.toMatch(/skipped \(\d+\).*gone upstream/);
  });
});

describe('running it twice', () => {
  it('is a no-op the second time, and needs no commit in between', async () => {
    makeApp({ rewritten: false });
    await update({ dir: app, target: lockB, env: env() });

    const after = { lock: readFileSync(appLockPath(app), 'utf8'), button: read('src/vendor/ui/Button.tsx') };
    expect(planUpdate(app, readAppLock(app), lockB)).toEqual({
      update: [],
      conflicts: [],
      skipped: [
        { at: 'README.md', why: 'unchanged' },
        { at: 'src/app.tsx', why: 'unchanged' },
        { at: 'src/vendor/ui/Button.tsx', why: 'unchanged' },
        { at: 'vite.config.ts', why: 'unchanged' },
        { at: 'src/modules/index.ts', why: 'generated' },
      ],
      codegen: null,
    });

    await update({ dir: app, target: lockB, env: env() });
    expect(readFileSync(appLockPath(app), 'utf8')).toBe(after.lock);
    expect(read('src/vendor/ui/Button.tsx')).toBe(after.button);
  });
});

describe('what it fetches', () => {
  it('asks the origin only for the files it is going to write', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    expect([...server.requests].sort()).toEqual([EDITED, VENDORED].sort());
  });

  /* The digests in the target lock are checked by `materialise` on the way in,
     so bytes that are not the ones commit B holds never reach the app. */
  it('leaves the app alone when the origin answers with something else', async () => {
    makeApp();
    server.overrides.set(VENDORED, Buffer.from('export const Button = () => "not it";\n'));
    await expect(update({ dir: app, target: lockB, env: env() })).rejects.toThrow(/digest/);
    expect(read('src/vendor/ui/Button.tsx')).toBe(at(content, A, VENDORED));
  });
});

/**
 * The changelog the wizard being updated to would carry. `0.3.0` is the target
 * version everywhere in this file, `0.2.0` the version the app was made by.
 */
const CHANGELOG = `# Changelog

## Unreleased

- nothing yet

## 0.3.0 — 2026-09-01

- \`vite.config.ts\` gained the proxy plugin.

## 0.2.0 — 2026-08-01

- first one
`;

/**
 * The client an app generates is not a file an update can carry: it is the
 * output of the schema and the documents beside it, and both of those the
 * update does move. So the update owes the person the one thing it cannot do
 * itself — the regeneration — and it has to say so by name rather than as a
 * count somebody has to interpret.
 */
describe('the regeneration an update leaves owing', () => {
  /* The two inputs and one output of the generator, added to the app the same
     way the scaffold adds them: the documents with a `from` and a digest, the
     client marked generated so no update ever reaches for it. */
  function withCodegenInputs(lock: AppLock, options: { schemaAt?: string } = {}): AppLock {
    const sdl = at(content, options.schemaAt ?? A, SDL);
    const operations = at(content, A, OPERATIONS);
    write(app, 'src/vendor/schema/schema.graphql', sdl);
    write(app, 'src/vendor/api/operations/core.graphql', operations);
    write(app, 'src/vendor/api/generated/core/graphql.ts', 'export const generated = 1;\n');

    const next: AppLock = {
      ...lock,
      skills: { 'chatfuel-core': { module: 'core', from: 'content/modules/core/skill', scope: 'app' } },
      files: {
        ...lock.files,
        'src/vendor/schema/schema.graphql': { from: SDL, sha256: digestOf(Buffer.from(sdl)) },
        'src/vendor/api/operations/core.graphql': { from: OPERATIONS, sha256: digestOf(Buffer.from(operations)) },
        'src/vendor/api/generated/core/graphql.ts': { generated: 'codegen' },
      },
    };
    writeAppLock(app, next);
    commitAll(app, 'codegen inputs');
    return next;
  }

  it('names the inputs that moved, the command, and the skill that documents them', () => {
    const lock = withCodegenInputs(makeApp());

    expect(planUpdate(app, lock, lockB).codegen).toEqual({
      inputs: ['src/vendor/schema/schema.graphql'],
      skills: ['chatfuel-core'],
      command: CODEGEN_COMMAND,
      steps: [...CODEGEN_AFTER_UPDATE],
    });
  });

  /* The schema moving on its own is the ordinary case — a field is added
     upstream and no document in this app mentions it yet — and it is exactly
     the one where nothing in the diff looks like it needs a command run. */
  it('asks for it when only the schema moved and the person touched nothing', () => {
    const lock = withCodegenInputs(makeApp());
    const plan = planUpdate(app, lock, lockB);

    expect(plan.update.map((item) => item.at)).toContain('src/vendor/schema/schema.graphql');
    expect(plan.codegen).not.toBeNull();
  });

  it('says nothing when the inputs are already the ones upstream has', () => {
    const lock = withCodegenInputs(makeApp(), { schemaAt: B });
    const plan = planUpdate(app, lock, lockB);

    expect(plan.skipped).toContainEqual({ at: 'src/vendor/schema/schema.graphql', why: 'unchanged' });
    expect(plan.codegen).toBeNull();
  });

  it('prints it as a named block rather than folding it into a count', async () => {
    withCodegenInputs(makeApp());
    const printed: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });

    await update({ dir: app, target: lockB, dryRun: true, env: env() });

    const out = printed.join('\n');
    expect(out).toContain('regenerate the client (1)');
    expect(out).toContain('src/vendor/schema/schema.graphql');
    expect(out).toContain(CODEGEN_COMMAND);
    expect(out).toContain('chatfuel-core');
    for (const step of CODEGEN_AFTER_UPDATE) expect(out).toContain(step);
  });

  it('reaches the skill through --json as well as the terminal', async () => {
    withCodegenInputs(makeApp());
    const printed: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });

    await update({ dir: app, target: lockB, json: true, dryRun: true, env: env() });

    const json = JSON.parse(printed.join('\n')) as Record<string, unknown>;
    expect(json.codegen).toMatchObject({
      inputs: ['src/vendor/schema/schema.graphql'],
      skills: ['chatfuel-core'],
      command: CODEGEN_COMMAND,
    });
  });
});

describe('--json', () => {
  const output = async (options: Partial<UpdateOptions> = {}): Promise<Record<string, unknown>> => {
    const printed: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      printed.push(args.map(String).join(' '));
    });
    await update({ dir: app, target: lockB, json: true, env: env(), ...options });
    return JSON.parse(printed.join('\n')) as Record<string, unknown>;
  };

  /* A conflict is the one thing the skill has to decide, and it cannot decide
     it holding only one side. These are the files the run itself does not
     fetch, so JSON mode goes and gets them. */
  it('fetches the upstream side of every conflict and says where it put it', async () => {
    makeApp();
    const json = await output({ dryRun: true });
    const conflicts = json.conflicts as { at: string; theirs: string }[];

    expect(conflicts.map((item) => item.at)).toEqual(['vite.config.ts']);
    expect(readFileSync(conflicts[0]!.theirs, 'utf8')).toBe(at(content, B, REWRITTEN));
    expect(server.requests).toContain(REWRITTEN);
    // Upstream's copy went to the cache, not over the person's file.
    expect(read('vite.config.ts')).toContain('./vendor/chatfuel-proxy/vite.js');
  });

  it('names both ends of the move, in commits and in versions', async () => {
    const lock = makeApp();
    const json = await output({ dryRun: true });
    expect(json).toMatchObject({ from: lock.commit, to: B, fromVersion: '0.2.0', toVersion: '0.3.0' });
  });

  it('carries the notes for the range the app is crossing', async () => {
    makeApp();
    const json = await output({ dryRun: true, changelog: CHANGELOG });
    expect(json.notes).toContain('gained the proxy plugin');
    // The version the app is already on is not news, and neither is Unreleased.
    expect(json.notes).not.toContain('first one');
    expect(json.notes).not.toContain('nothing yet');
  });

  /* The skill reads the plan before it takes the safe half, and this is why:
     the update moves the pin, and the range the notes are cut from is the range
     between the two pins. Ask afterwards and there is nothing between them. */
  it('has notes to give only while the app is still on the old pin', async () => {
    const lock = makeApp();
    const before = await output({ dryRun: true, changelog: CHANGELOG });
    expect(before).toMatchObject({ from: lock.commit, to: B });
    expect(before.notes).toContain('gained the proxy plugin');

    vi.restoreAllMocks();
    await update({ dir: app, target: lockB, env: env() });

    const after = await output({ dryRun: true, changelog: CHANGELOG });
    expect(after).toMatchObject({ from: B, to: B });
    expect(after.notes).toBeNull();
  });

  it('says null rather than inventing notes when the changelog has none', async () => {
    makeApp();
    expect((await output({ dryRun: true, changelog: '# Changelog\n\n## 0.1.0\n\n- old\n' })).notes).toBeNull();
  });
});

describe('--resolved', () => {
  const resolve = async (...paths: string[]): Promise<number> => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    return update({ dir: app, target: lockB, resolved: paths, env: env() });
  };

  /* The merge is uncommitted work by definition — that is why this branch does
     not ask for a clean tree the way the update itself does. */
  it('takes both digests from the merged file, so the conflict is not reported again', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    const merged = at(content, B, REWRITTEN).replace(
      "import {} from 'placeholder';",
      "import { chatfuelProxy } from './vendor/chatfuel-proxy/vite.js';",
    );
    write(app, 'vite.config.ts', merged);

    expect(await resolve('vite.config.ts')).toBe(0);
    expect(lockNow().files['vite.config.ts']).toEqual({
      from: REWRITTEN,
      sha256: digestOf(Buffer.from(merged)),
      upstream: lockB.files[REWRITTEN],
      rewritten: ['proxy-import'],
    });
    expect(planUpdate(app, readAppLock(app), lockB).conflicts).toEqual([]);
  });

  /* Taking the upstream bytes wholesale is a resolution too, and the honest
     record of it is one digest: there is nothing left that differs. */
  it('records a file merged back to upstream with no second digest', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    write(app, 'vite.config.ts', at(content, B, REWRITTEN));

    await resolve('vite.config.ts');
    expect(lockNow().files['vite.config.ts']).toEqual({
      from: REWRITTEN,
      sha256: lockB.files[REWRITTEN],
      rewritten: ['proxy-import'],
    });
  });

  it('drops the entry when the resolution was to leave the file deleted', async () => {
    makeApp();
    write(app, 'src/app.tsx', 'export const App = () => <main>mine</main>;\n');
    commitAll(app, 'my edit');
    await update({ dir: app, target: lockB, env: env() });
    rmSync(join(app, 'src/app.tsx'));

    await resolve('src/app.tsx');
    expect(lockNow().files['src/app.tsx']).toBeUndefined();
    const plan = planUpdate(app, readAppLock(app), lockB);
    expect([...plan.conflicts, ...plan.skipped].map((item) => item.at)).not.toContain('src/app.tsx');
  });

  it('refuses to record anything while the app is still on the old commit', async () => {
    makeApp();
    await expect(resolve('vite.config.ts')).rejects.toThrow(/still pinned to/);
    expect(lockNow().commit).toBe(A);
  });

  it('refuses a path the lock says nothing about', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    await expect(resolve('src/mine.ts')).rejects.toThrow(/is not in \.chatfuel\/lock\.json/);
  });

  /**
   * A path that was not a conflict is a path the update either took or left
   * alone on purpose. Recording a digest for one would tell every future
   * update that whatever is on disk is what the wizard wrote — adopting an
   * edit nobody was asked about.
   */
  it('refuses a file the update was not holding back', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    write(app, 'README.md', '# mine now\n');
    await expect(resolve('README.md')).rejects.toThrow(/is not one of the conflicts/);
    expect(lockNow().files['README.md']!.sha256).toBe(lockB.files[UNCHANGED]);
  });

  /* The caller settles several conflicts in one command and the merges are
     already on disk. Stopping at the first bad path would leave the rest
     merged and unrecorded — the exact state this command exists to leave. */
  it('records none of them when one path in the call is wrong, and says which', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    const before = lockNow();

    await expect(
      update({ dir: app, target: lockB, resolved: ['vite.config.ts', 'README.md', 'nowhere.ts'], env: env() }),
    ).rejects.toThrow(/2 of the 3 files cannot be resolved/);

    expect(lockNow()).toEqual(before);
    const err = await update({
      dir: app,
      target: lockB,
      resolved: ['vite.config.ts', 'README.md', 'nowhere.ts'],
      env: env(),
    }).catch((e: WizardError) => e);
    expect((err as WizardError).hint).toContain('README.md is not one of the conflicts');
    expect((err as WizardError).hint).toContain('nowhere.ts is not in');
  });

  it('refuses a file that never had an upstream to conflict with', async () => {
    makeApp();
    await update({ dir: app, target: lockB, env: env() });
    await expect(resolve('src/modules/index.ts')).rejects.toThrow(/has no upstream/);
  });
});
