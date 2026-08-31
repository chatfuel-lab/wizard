import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { digestOf } from '../src/lockFormat';
import { createContext } from '../src/run';
import {
  amendAppLock,
  APP_LOCK_REL,
  appLockPath,
  buildAppLock,
  copied,
  generated,
  newLockDraft,
  rewrote,
  writeAppLock,
} from '../src/scaffold/appLock';
import { scaffold } from '../src/steps/scaffold';
import { embedScaffold, EMBED_DIR } from '../src/steps/embed';
import type { AppLock } from '../src/scaffold/appLock';
import type { WizardContext } from '../src/context';

/**
 * The lock is what `chatfuel-wizard update` reads a year from now, so the tests
 * here are about completeness and honesty rather than shape: a file the
 * scaffold wrote and the lock does not mention is a file no update can ever
 * touch, and a `from` that names nothing upstream sends the update to fetch a
 * path the origin does not have.
 *
 * Every scaffold below is the real one against the real repo content. Only the
 * dependency install is faked — the run does not need node_modules to prove
 * what it wrote.
 */
vi.mock('execa', () => ({ execa: () => Promise.resolve({ stdout: '' }) }));

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

/** Every file in the app, as the lock spells paths. */
function walk(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP_DIRS.has(entry.name) ? [] : walk(root, path);
    if (!entry.isFile()) return [];
    const rel = relative(root, path);
    return [sep === '/' ? rel : rel.split(sep).join('/')];
  });
}

let parent: string;
let target: string;

function context(dir: string, modules: string[]): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = modules;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.brand = { name: 'Test app' };
  ctx.answers.env.CHATFUEL_TOKEN = 'a'.repeat(64);
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  return ctx;
}

const lockOf = (root: string): AppLock => JSON.parse(readFileSync(appLockPath(root), 'utf8')) as AppLock;

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), 'wizard-lock-'));
  target = join(parent, 'app');
});

afterEach(() => {
  rmSync(parent, { recursive: true, force: true });
});

describe('the lock a standalone scaffold writes', () => {
  it('describes every file it wrote, and nothing it did not', async () => {
    await scaffold(context(target, ['core', 'auth', 'publishing']));
    const lock = lockOf(target);

    const onDisk = walk(target).filter((path) => path !== '.env' && path !== APP_LOCK_REL);
    expect([...Object.keys(lock.files)].sort()).toEqual([...onDisk].sort());
  });

  it('names what each copied file came from, and hashes what landed on disk', async () => {
    await scaffold(context(target, ['core', 'auth']));
    const lock = lockOf(target);

    const copied = Object.entries(lock.files).filter(([, entry]) => entry.from);
    expect(copied.length).toBeGreaterThan(100);
    /* Nothing in a fresh app came from nowhere: every file is either copied
       from a path upstream or produced by a named generator. An entry with
       neither is a file `update` will never touch again — which is how a
       forgotten tree would hide instead of failing. */
    const orphans = Object.entries(lock.files).filter(([, entry]) => !entry.from && !entry.generated);
    expect(orphans.map(([path]) => path)).toEqual([]);
    for (const [path, entry] of copied) {
      expect(existsSync(join(repoRoot, entry.from!)), `${path} <- ${entry.from!}`).toBe(true);
      expect(entry.sha256, path).toMatch(/^[A-Za-z0-9+/]+=*$/);
    }
    // The digest is of the app's bytes, not the upstream's: a file the wizard
    // rewrote has to hash differently from what it was copied from.
    const vite = lock.files['vite.config.ts']!;
    expect(vite.rewritten).toEqual(['proxy-import']);
    expect(readFileSync(join(target, 'vite.config.ts'), 'utf8')).not.toEqual(
      readFileSync(join(repoRoot, vite.from!), 'utf8'),
    );
  });

  /* `update` asks two different questions of a copied file — did the person
     edit it, and did upstream move — and one digest can only answer the first.
     A rewritten file carries both; a plain copy needs only one, because for it
     the two are the same number. */
  it("carries the upstream digest exactly where it differs from the app's", async () => {
    await scaffold(context(target, ['core', 'auth']));
    const lock = lockOf(target);

    const vite = lock.files['vite.config.ts']!;
    expect(vite.upstream).toBe(digestOf(readFileSync(join(repoRoot, vite.from!))));
    expect(vite.upstream).not.toBe(vite.sha256);

    for (const [path, entry] of Object.entries(lock.files)) {
      if (!entry.from || entry.rewritten) continue;
      expect(entry.upstream, path).toBeUndefined();
      expect(entry.sha256, path).toBe(digestOf(readFileSync(join(repoRoot, entry.from))));
    }
  });

  it('marks a generated file as generated, with nothing upstream to point at', async () => {
    await scaffold(context(target, ['core', 'auth']));
    const lock = lockOf(target);

    expect(lock.files['src/modules/index.ts']).toEqual({ generated: expect.any(String) });
  });

  it('marks the pruned nav table as a rewrite, so an update can still reach it', async () => {
    await scaffold(context(target, ['core', 'auth']));
    const nav = lockOf(target).files['src/modules/navGroups.tsx']!;

    /* Generated files are skipped by every update there will ever be. The nav
       table is upstream's, minus rows — a module added to it upstream has to be
       able to arrive. */
    expect(nav.generated).toBeUndefined();
    expect(nav.rewritten).toEqual(['navGroups']);
    expect(nav.from).toBe('content/shell/src/modules/navGroups.tsx');
    expect(nav.upstream).toBe(digestOf(readFileSync(join(repoRoot, nav.from!))));
    expect(nav.upstream).not.toBe(nav.sha256);
  });

  it('ties a migration to the module file it was rendered from', async () => {
    await scaffold(context(target, ['core', 'auth', 'publishing']));
    const lock = lockOf(target);

    expect(lock.files['supabase/migrations/0001_chatfuel_auth.sql']!.from).toBe(
      'content/modules/auth/supabase/migrations/0001_auth.sql',
    );
    const publishing = lock.files['supabase/migrations/0010_chatfuel_publishing.sql']!;
    expect(publishing.from).toBe('content/modules/publishing/supabase/migrations/0001_publishing.sql');
    // The publishing secret's hash was filled in, so the bytes are not upstream's.
    expect(publishing.rewritten).toEqual(['publishingSecret']);
  });

  it('carries the skills it installed, and their files', async () => {
    await scaffold(context(target, ['core', 'auth']));
    const lock = lockOf(target);

    expect(lock.skills['chatfuel-core']).toEqual({ module: 'core', from: 'content/modules/core/skill', scope: 'app' });
    expect(lock.files['.claude/skills/chatfuel-core/SKILL.md']!.from).toBe('content/modules/core/skill/SKILL.md');

    /* The update skill belongs to no module, so it names none — and it is a
       copied file with a digest like any other, which is what lets the next
       update maintain the skill the way it maintains the app. */
    expect(lock.skills['chatfuel-update']).toEqual({ from: 'content/skills/chatfuel-update', scope: 'app' });
    expect(lock.files['.claude/skills/chatfuel-update/SKILL.md']!.from).toBe('content/skills/chatfuel-update/SKILL.md');
  });

  /* The app's own name and the file name of its logo, which are written to the
     environment and are not secrets — the logo is a file the lock has to name.
     Everything else in .env is checked, so a new key is covered by default. */
  const NOT_SECRET = ['VITE_APP_NAME', 'VITE_APP_LOGO'];

  it('holds no value from the environment it wrote', async () => {
    const ctx = context(target, ['core', 'auth', 'publishing']);
    await scaffold(ctx);

    const text = readFileSync(appLockPath(target), 'utf8');
    const secrets = Object.entries(ctx.answers.env).filter(
      ([name, value]) => value.length > 0 && !NOT_SECRET.includes(name),
    );
    expect(secrets.length).toBeGreaterThan(2);
    for (const [name, value] of secrets) expect(text, name).not.toContain(value);
    expect(Object.keys(lockOf(target).files)).not.toContain('.env');
  });

  /* `.env` is the one the wizard writes; `.env.local` is where the next person
     puts a key, and the app is theirs from the moment it exists. The `.example`
     is the committed half of the pair and belongs in the lock like any other
     file the scaffold wrote. */
  it('says nothing about the other env files either, but keeps the example', () => {
    const root = mkdtempSync(join(parent, 'envs-'));
    for (const name of [
      '.env',
      '.env.local',
      '.env.production',
      '.envrc',
      '.env.example',
      '.env.local.example',
      'src.ts',
    ]) {
      writeFileSync(join(root, name), 'x\n');
    }
    const draft = newLockDraft();
    copied(draft, '', 'content/shell');

    const lock = buildAppLock(
      { content: { root: repoRoot }, answers: { mode: 'standalone', modules: ['core'] } } as never,
      root,
      draft,
    );

    expect(Object.keys(lock.files).sort()).toEqual(['.env.example', '.env.local.example', 'src.ts']);
  });

  /* Two marks on one path used to be one mark: `generated` assigned a fresh
     entry over whatever `rewrote` had put there. `update` skips on `generated`
     before it looks at `rewritten`, so nothing read the lost field — which is
     exactly why it could stay lost. */
  it('keeps both marks when a path is generated and rewritten', () => {
    const root = mkdtempSync(join(parent, 'marks-'));
    writeFileSync(join(root, 'src.ts'), 'x\n');
    const draft = newLockDraft();
    copied(draft, '', 'content/shell');
    rewrote(draft, 'src.ts', 'marked-block');
    generated(draft, 'src.ts', 'scaffold');

    const lock = buildAppLock(
      { content: { root: repoRoot }, answers: { mode: 'standalone', modules: ['core'] } } as never,
      root,
      draft,
    );

    expect(lock.files['src.ts']).toEqual({ generated: 'scaffold', rewritten: ['marked-block'] });
  });

  /* The read side refuses a lock naming a file outside the app, and the write
     side has to refuse the same thing — otherwise the first run to relayout
     skills into a global directory would write one key with `../` in it and
     the next run would reject the lock entire, every file in it with it. */
  it('will not write a lock naming a file outside the app', () => {
    const root = mkdtempSync(join(parent, 'escape-'));
    expect(() =>
      writeAppLock(root, {
        mode: 'standalone',
        wizardVersion: '0.2.0',
        modules: ['core'],
        skills: {},
        files: { '../../elsewhere/SKILL.md': { sha256: 'a' } },
      }),
    ).toThrow(/outside it/);
    expect(existsSync(appLockPath(root))).toBe(false);
  });

  /* Not having a lock is an embed dry run. Having one that will not parse is
     an app whose record of itself is broken, and amending it silently would
     report success while the lock quietly stopped describing the app. */
  it('will not quietly skip an amendment to a lock it cannot read', async () => {
    await scaffold(context(target, ['core', 'auth', 'publishing']));
    writeFileSync(appLockPath(target), '{ half a lock', 'utf8');

    expect(() => amendAppLock(target, (lock) => (lock.modules = ['core']))).toThrow(/not valid JSON/);
    expect(() => amendAppLock(join(parent, 'no-app'), () => undefined)).not.toThrow();
  });

  /* The same distinction one step earlier: a lock that is there and will not
     open is not a lock that is absent. A bare catch around the read made the
     two come out the same way, so a handoff whose amendment never landed said
     it had landed. */
  it('says so when the lock is there and cannot be read at all', async () => {
    await scaffold(context(target, ['core', 'auth']));
    rmSync(appLockPath(target));
    // Something at the path that is not a readable file.
    mkdirSync(appLockPath(target), { recursive: true });

    expect(() => amendAppLock(target, (lock) => (lock.modules = ['core']))).toThrow(/could not be read/);
  });

  it('is a file git will commit, not one the app ignores', async () => {
    await scaffold(context(target, ['core', 'auth']));

    // What prepareLocalRepo does before the wizard's first commit.
    execFileSync('git', ['init', '-q'], { cwd: target });
    execFileSync('git', ['add', '-A'], { cwd: target });
    const tracked = execFileSync('git', ['ls-files'], { cwd: target, encoding: 'utf8' }).split('\n');
    expect(tracked).toContain(APP_LOCK_REL);
    expect(tracked).not.toContain('.env');
  });

  it('says which wizard and which modules made the app', async () => {
    await scaffold(context(target, ['core', 'auth']));
    const lock = lockOf(target);

    expect(lock.mode).toBe('standalone');
    expect(lock.wizardVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(lock.modules).toEqual(['core', 'auth']);
    /* A run from a checkout has no commit the rest of the world can resolve,
       and says so by omission rather than by writing this machine's HEAD. */
    expect(lock.commit).toBeUndefined();
    expect(lock.repo).toBeUndefined();
  });
});

describe('an app scaffolded from a published wizard', () => {
  it('records the pin its content came from, so update knows what to fetch', () => {
    const root = mkdtempSync(join(parent, 'pinned-'));
    writeFileSync(join(root, 'brought-by-the-user.md'), 'hello\n');
    const draft = newLockDraft();
    copied(draft, '', 'content/shell');

    const lock = buildAppLock(
      {
        content: { root: repoRoot, lock: { repo: 'chatfuel-lab/wizard', commit: 'a'.repeat(40) } },
        answers: { mode: 'standalone', modules: ['core'] },
      } as never,
      root,
      draft,
    );

    expect(lock.repo).toBe('chatfuel-lab/wizard');
    expect(lock.commit).toBe('a'.repeat(40));
    // Nothing upstream is called that, so there is nothing to point at and the
    // entry says only that the file is there — which update reads as leave it.
    expect(lock.files['brought-by-the-user.md']).toEqual({ sha256: expect.any(String) });
  });
});

describe('the lock an embed writes', () => {
  let host: string;

  beforeEach(() => {
    host = mkdtempSync(join(tmpdir(), 'wizard-lock-host-'));
    writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: { react: '^19' } }));
    writeFileSync(join(host, 'src-of-theirs.ts'), 'export const theirs = 1;\n');
  });

  afterEach(() => {
    rmSync(host, { recursive: true, force: true });
  });

  it('describes its own footprint and leaves the host project out of it', async () => {
    const ctx = createContext({ yes: true, dryRun: false, verbose: false, embed: true, dir: host });
    ctx.answers.mode = 'embed';
    ctx.answers.modules = ['core', 'livechat'];
    ctx.answers.skillsTarget = 'project';
    ctx.answers.token = 'a'.repeat(64);
    await embedScaffold(ctx);

    const lock = lockOf(host);
    expect(lock.mode).toBe('embed');
    expect(lock.files['src-of-theirs.ts']).toBeUndefined();
    expect(lock.files['package.json']).toBeUndefined();
    expect(lock.files[`${EMBED_DIR}/client.ts`]!.from).toBe('content/shell/src/client.ts');
    expect(lock.files[`${EMBED_DIR}/modules/livechat/index.tsx`]!.from).toBe(
      'content/shell/src/modules/livechat/index.tsx',
    );
    expect(lock.files[`${EMBED_DIR}/vendor/ui/index.ts`]!.from).toBe('content/ui/src/index.ts');

    const footprint = walk(join(host, EMBED_DIR)).map((path) => `${EMBED_DIR}/${path}`);
    for (const path of footprint) expect(Object.keys(lock.files), path).toContain(path);
  });
});
