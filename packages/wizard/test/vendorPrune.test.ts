import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contentPathsFor } from '../src/content';
import { createContext } from '../src/run';
import { appLockPath } from '../src/scaffold/appLock';
import { apiCopyFilter, scaffold } from '../src/steps/scaffold';
import { embedScaffold, EMBED_DIR } from '../src/steps/embed';
import type { ContentLock } from '../src/contentLock';
import type { AppLock } from '../src/scaffold/appLock';
import type { WizardContext } from '../src/context';

/**
 * The vendored API client is per-module twice over — a generated GraphQL
 * client per module and a domain file beside it — and an app that took two
 * modules has no use for the other nine. livechat's generated client alone is
 * 1.7 MB of types the user would carry in their history forever.
 *
 * Two things have to agree for the cut to be safe: nobody left imports what
 * went, and the fetch does not go and get bytes the copy will drop.
 */
vi.mock('execa', () => ({ execa: () => Promise.resolve({ stdout: '' }) }));

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const apiSrc = join(repoRoot, 'content', 'api-client', 'src');

let parent: string;

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), 'wizard-prune-'));
});

afterEach(() => {
  rmSync(parent, { recursive: true, force: true });
});

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

describe('what the vendored API client carries', () => {
  it('leaves out the modules the app did not take', async () => {
    const target = join(parent, 'app');
    await scaffold(context(target, ['core', 'auth', 'contacts']));

    const api = join(target, 'src', 'vendor', 'api');
    expect(existsSync(join(api, 'generated', 'livechat'))).toBe(false);
    expect(existsSync(join(api, 'domain', 'livechat.ts'))).toBe(false);
    expect(existsSync(join(api, 'generated', 'flow-builder'))).toBe(false);
    // What it did take, and the shared half it always takes.
    expect(existsSync(join(api, 'generated', 'contacts'))).toBe(true);
    expect(existsSync(join(api, 'generated', 'core'))).toBe(true);
    expect(existsSync(join(api, 'index.ts'))).toBe(true);
  });

  it('keeps both halves of a module it did take', async () => {
    const target = join(parent, 'app');
    await scaffold(context(target, ['core', 'livechat']));

    const api = join(target, 'src', 'vendor', 'api');
    expect(existsSync(join(api, 'generated', 'livechat', 'graphql.ts'))).toBe(true);
    expect(existsSync(join(api, 'domain', 'livechat.ts'))).toBe(true);
  });

  it('says nothing in the lock about what it never wrote', async () => {
    const target = join(parent, 'app');
    await scaffold(context(target, ['core', 'auth', 'contacts']));
    const lock = JSON.parse(readFileSync(appLockPath(target), 'utf8')) as AppLock;

    const pruned = Object.keys(lock.files).filter((path) => path.includes('vendor/api/generated/livechat'));
    expect(pruned).toEqual([]);
    expect(lock.files['src/vendor/api/generated/contacts/graphql.ts']).toBeDefined();
  });

  it('cuts the same way when the app is embedded in somebody else’s project', async () => {
    const host = join(parent, 'host');
    mkdirSync(host);
    writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: {} }));
    const ctx = createContext({ yes: true, dryRun: false, verbose: false, embed: true, dir: host });
    ctx.answers.mode = 'embed';
    ctx.answers.modules = ['core', 'contacts'];
    ctx.answers.skillsTarget = 'project';
    ctx.answers.token = 'a'.repeat(64);
    ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
    ctx.answers.packageManager = 'npm';
    await embedScaffold(ctx);

    const api = join(host, EMBED_DIR, 'vendor', 'api');
    expect(existsSync(join(api, 'generated', 'livechat'))).toBe(false);
    expect(existsSync(join(api, 'generated', 'contacts'))).toBe(true);
  });
});

/**
 * The packaged wizard fetches before it copies, and the two decide separately
 * what a module set needs. A path the fetch skips and the copy wants is a
 * scaffold reaching for a file that was never downloaded — which would only
 * show up on a user's machine, with no repo checkout to fall back on.
 */
describe('what the packaged wizard downloads', () => {
  const lockOf = (...trees: string[]): ContentLock => ({
    repo: 'chatfuel-lab/wizard',
    commit: '0'.repeat(40),
    wizardVersion: '0.1.0',
    files: Object.fromEntries(
      execFileSync('git', ['ls-files', '--', ...trees], { cwd: repoRoot, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .map((path) => [path, 'digest']),
    ),
  });
  const lockOfRepo = (): ContentLock => lockOf('content/api-client/src');

  it('skips the modules nobody picked, and keeps every module in the closure', () => {
    const paths = contentPathsFor(lockOfRepo(), ['core', 'contacts']);

    expect(paths.some((path) => path.startsWith('content/api-client/src/generated/livechat/'))).toBe(false);
    expect(paths).not.toContain('content/api-client/src/domain/livechat.ts');
    expect(paths.some((path) => path.startsWith('content/api-client/src/generated/core/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('content/api-client/src/generated/contacts/'))).toBe(true);
    expect(paths).toContain('content/api-client/src/index.ts');
  });

  /**
   * A barrel one directory up from the module directories is the shape that
   * used to split the two rules apart: the fetch downloaded it and the copy
   * read `index.ts` as a module nobody picked. Both now ask `apiModuleOf`.
   */
  /* cpSync asks this filter before it stats the entry, so a link pointing at
     nothing has to be answered rather than thrown over. */
  it('answers for a symlink that points at nothing', () => {
    const root = join(parent, 'dangling');
    mkdirSync(join(root, 'generated'), { recursive: true });
    symlinkSync(join(root, 'generated', 'absent'), join(root, 'generated', 'livechat'));
    const keeps = apiCopyFilter(root, ['core']);

    expect(() => keeps(join(root, 'generated', 'livechat'))).not.toThrow();
  });

  /* Following the link and not describing it: a module directory reached
     through a symlink is still that module's 1.7 MB. */
  it('turns away a module directory that is reached through a link', () => {
    const root = join(parent, 'linked');
    mkdirSync(join(root, 'elsewhere', 'livechat'), { recursive: true });
    mkdirSync(join(root, 'generated'), { recursive: true });
    symlinkSync(join(root, 'elsewhere', 'livechat'), join(root, 'generated', 'livechat'));
    const keeps = apiCopyFilter(root, ['core']);

    expect(keeps(join(root, 'generated', 'livechat'))).toBe(false);
  });

  it('keeps a shared file sitting where a module directory would', () => {
    const root = join(parent, 'api');
    mkdirSync(join(root, 'generated', 'livechat'), { recursive: true });
    writeFileSync(join(root, 'generated', 'index.ts'), 'export {};');
    writeFileSync(join(root, 'generated', 'livechat', 'graphql.ts'), 'export {};');
    const keeps = apiCopyFilter(root, ['core']);

    expect(keeps(join(root, 'generated', 'index.ts'))).toBe(true);
    expect(keeps(join(root, 'generated', 'livechat'))).toBe(false);

    const shared = 'content/api-client/src/generated/index.ts';
    expect(contentPathsFor({ ...lockOfRepo(), files: { [shared]: 'digest' } }, ['core'])).toContain(shared);
  });

  /* The shell's module subtrees are three quarters of the transfer, and
     `buildAppDirectory` deletes the unpicked ones the moment they land. */
  it('skips the shell subtree of a module nobody picked', () => {
    const lock = lockOf('content/shell/src/modules', 'content/modules/*/module.json');
    const paths = contentPathsFor(lock, ['core', 'contacts']);

    expect(paths.some((path) => path.startsWith('content/shell/src/modules/contacts/'))).toBe(true);
    expect(paths.some((path) => path.startsWith('content/shell/src/modules/livechat/'))).toBe(false);
    expect(paths.some((path) => path.startsWith('content/shell/src/modules/bookings/'))).toBe(false);
    // The shell's own files sit in that directory too, and belong to no module.
    expect(paths).toContain('content/shell/src/modules/types.ts');
    expect(paths).toContain('content/shell/src/modules/navGroups.tsx');
  });

  /* `app.embed.roots` is validated as a shell-relative path, not as a module
     id, so a directory there that no manifest names is not a module tree to
     drop — it travels, as everything the rules say nothing about does. */
  it('keeps a shell directory that belongs to no module', () => {
    const lock = lockOf('content/modules/*/module.json');
    const shared = 'content/shell/src/modules/shared/helpers.ts';
    const paths = contentPathsFor({ ...lock, files: { ...lock.files, [shared]: 'digest' } }, ['core']);

    expect(paths).toContain(shared);
  });

  /* The delete loop reads what it prunes off the disk, so it tolerates a
     subtree that never arrived — but only as long as everything it KEEPS did
     arrive. It keeps `present ∩ ctx.answers.modules`, and embed.ts copies the
     roots of the same list, so both are checked against the closure here. */
  it('gets every shell subtree the scaffold and the embed will keep', () => {
    const modules = ['core', 'contacts', 'auth'];
    const lock = lockOf('content/shell/src/modules', 'content/modules');
    const fetched = new Set(contentPathsFor(lock, modules));

    for (const id of modules) {
      const manifest = JSON.parse(readFileSync(join(repoRoot, 'content', 'modules', id, 'module.json'), 'utf8')) as {
        app?: { embed?: { roots?: string[] } };
      };
      for (const root of manifest.app?.embed?.roots ?? []) {
        const under = Object.keys(lock.files).filter((path) => path.startsWith(`content/shell/${root}/`));
        expect(under.length).toBeGreaterThan(0);
        expect(under.filter((path) => !fetched.has(path))).toEqual([]);
      }
    }
    // And nothing else's: the saving is the point of the rule.
    const trees = new Set(
      [...fetched]
        .filter((path) => path.startsWith('content/shell/src/modules/'))
        .map((path) => path.slice('content/shell/src/modules/'.length).split('/'))
        .filter((parts) => parts.length > 1)
        .map((parts) => parts[0]),
    );
    expect([...trees].sort()).toEqual(['auth', 'contacts']);
  });

  it('gets everything the copy is going to want', () => {
    const modules = ['core', 'contacts', 'auth'];
    const fetched = new Set(contentPathsFor(lockOfRepo(), modules));
    const keeps = apiCopyFilter(apiSrc, modules);

    const wanted = Object.keys(lockOfRepo().files).filter(
      (path) => !/\.test\.tsx?$/.test(path) && keeps(join(repoRoot, path)),
    );
    expect(wanted.filter((path) => !fetched.has(path))).toEqual([]);
    expect(wanted.length).toBeGreaterThan(10);
  });
});
