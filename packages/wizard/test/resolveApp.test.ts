import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execaSync } from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The catalog page promises ONE copy-paste command, so the whole app path is
 * held to the same standard as the other flag paths: contradictions answered
 * before the first prompt, and — with an app resolved — the mode, module and
 * brand steps asking nothing at all (their prompts THROW here).
 */
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted in a non-interactive run: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: prompted('confirm'),
    isCancel: () => false,
    note: () => undefined,
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      success: () => undefined,
      message: () => undefined,
    },
    spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined }),
  };
});

const { createContext } = await import('../src/run');
const { assertAppFlags, resolveApp } = await import('../src/steps/resolveApp');
const { mode } = await import('../src/steps/mode');
const { selectModules } = await import('../src/steps/selectModules');
const { brand } = await import('../src/steps/brand');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

let dir: string;
let catalogDir: string;
const cleanups: Array<() => void> = [];

/** A one-commit catalog repo with one complete app in it. */
function seedCatalog(appJson: Record<string, unknown>): void {
  const appDir = join(catalogDir, 'apps', 'insta');
  mkdirSync(join(appDir, 'listing'), { recursive: true });
  mkdirSync(join(appDir, 'overlay', 'src'), { recursive: true });
  writeFileSync(join(appDir, 'app.json'), JSON.stringify(appJson));
  writeFileSync(join(appDir, 'playbook.md'), '# Build plan\n\nDo the thing.');
  writeFileSync(join(appDir, 'listing', 'icon.png'), Buffer.alloc(64, 1));
  writeFileSync(join(appDir, 'overlay', 'src', 'appPreset.ts'), 'export const preset = true;');
  const env = {
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com',
  };
  execaSync('git', ['init', '-q', '-b', 'main'], { cwd: catalogDir, env });
  execaSync('git', ['add', '-A'], { cwd: catalogDir, env });
  execaSync('git', ['commit', '-q', '-m', 'seed'], { cwd: catalogDir, env });
}

/** The same catalog, with one of its files replaced by a symlink before the commit. */
function catalogWithLink(rel: string, target: string): void {
  seedCatalog(validAppJson());
  const path = join(catalogDir, 'apps', 'insta', rel);
  unlinkSync(path);
  symlinkSync(target, path);
  execaSync('git', ['add', '-A'], { cwd: catalogDir });
  execaSync('git', ['commit', '-q', '-m', 'link', '--no-gpg-sign'], {
    cwd: catalogDir,
    env: {
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@example.com',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@example.com',
    },
  });
}

const validAppJson = () => ({
  id: 'insta',
  name: 'Comments for Instagram',
  tagline: 'Reply to every comment.',
  description: 'Auto-replies plus an inbox.',
  category: 'instagram',
  status: 'draft',
  modules: ['livechat'],
  brand: { appName: 'Comments for Instagram', logo: 'listing/icon.png' },
  env: [{ name: 'VITE_IG_DEFAULT_REPLY', optional: true }],
  listing: { icon: 'listing/icon.png', screenshots: [] },
});

function ctxWith(flags: Partial<WizardFlags>): WizardContext {
  return createContext({ yes: true, dryRun: true, verbose: false, appsRepo: catalogDir, ...flags });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-resolveapp-'));
  catalogDir = join(dir, 'catalog');
  mkdirSync(catalogDir, { recursive: true });
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  rmSync(dir, { recursive: true, force: true });
});

async function resolved(flags: Partial<WizardFlags> = {}): Promise<WizardContext> {
  const ctx = ctxWith({ app: 'insta', ...flags });
  await resolveApp(ctx);
  cleanups.push(ctx.answers.app!.cleanup);
  return ctx;
}

describe('assertAppFlags', () => {
  it('answers a contradiction before the first prompt', () => {
    expect(() => assertAppFlags(ctxWith({ app: 'x', embed: true }))).toThrow(/--embed/);
    expect(() => assertAppFlags(ctxWith({ app: 'x', modules: 'livechat' }))).toThrow(/--modules/);
    expect(() => assertAppFlags(ctxWith({ app: 'Not A Slug' }))).toThrow(/not an app slug/);
    expect(() => assertAppFlags(ctxWith({ appsRepo: catalogDir }))).toThrow(/only make sense with --app/);
  });

  it('lets --app-name and --logo through — the person outranks the preset', () => {
    expect(() => assertAppFlags(ctxWith({ app: 'x', appName: 'Mine' }))).not.toThrow();
  });
});

describe('resolveApp', () => {
  it('is a no-op without --app', async () => {
    const ctx = createContext({ yes: true, dryRun: true, verbose: false });
    await resolveApp(ctx);
    expect(ctx.answers.app).toBeUndefined();
  });

  it('resolves the manifest, the playbook and the provenance', async () => {
    seedCatalog(validAppJson());
    const ctx = await resolved();
    const app = ctx.answers.app!;
    expect(app.manifest.name).toBe('Comments for Instagram');
    expect(app.playbook).toContain('Build plan');
    expect(app.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(app.repo).toBe(catalogDir);
  });

  it('an unknown slug lists what the catalog actually has', async () => {
    seedCatalog(validAppJson());
    const ctx = ctxWith({ app: 'nope' });
    await expect(resolveApp(ctx)).rejects.toMatchObject({ hint: expect.stringContaining('insta') });
  });

  it('a missing playbook fails at resolve time, not at handoff', async () => {
    seedCatalog({ ...validAppJson(), playbook: 'missing.md' });
    await expect(resolveApp(ctxWith({ app: 'insta' }))).rejects.toThrow(/playbook/);
  });

  it('refuses a playbook that is a symlink out of the catalog', async () => {
    // The playbook is copied verbatim into CLAUDE.md and AGENTS.md and
    // committed. A catalog that links it at the person's own files reads them
    // out into a repository they are about to push, and a lexical
    // `startsWith(appDir)` says the path is fine the whole way.
    const secret = join(dir, 'id_rsa');
    writeFileSync(secret, 'PRIVATE KEY');
    // Absolute, so it still points at the file after the catalog is cloned to
    // a temp directory - and lexically the playbook is exactly where it should
    // be, `<appDir>/playbook.md`.
    catalogWithLink('playbook.md', secret);
    await expect(resolveApp(ctxWith({ app: 'insta' }))).rejects.toThrow(/playbook/);
  });

  it('refuses a logo that is a symlink out of the catalog', async () => {
    // Same link, different ending: the logo is copied into `public/` and
    // deployed, so the file it points at is published rather than committed.
    const secret = join(dir, 'id_rsa');
    writeFileSync(secret, 'PRIVATE KEY');
    catalogWithLink('listing/icon.png', secret);
    await expect(resolveApp(ctxWith({ app: 'insta' }))).rejects.toMatchObject({
      hint: expect.stringContaining('escapes the app directory'),
    });
  });

  it('an id that disagrees with the directory is refused', async () => {
    seedCatalog({ ...validAppJson(), id: 'other' });
    await expect(resolveApp(ctxWith({ app: 'insta' }))).rejects.toThrow(/inconsistent/);
  });
});

describe('the steps an app answers', () => {
  it('mode, modules and brand are settled without a single prompt', async () => {
    seedCatalog(validAppJson());
    const ctx = await resolved({ yes: false });
    await mode(ctx);
    expect(ctx.answers.mode).toBe('standalone');
    await selectModules(ctx);
    expect(ctx.answers.modules).toContain('livechat');
    expect(ctx.answers.modules).toContain('core');
    await brand(ctx);
    expect(ctx.answers.brand?.name).toBe('Comments for Instagram');
    expect(ctx.answers.brand?.logoSource).toBe(join(ctx.answers.app!.dir, 'listing', 'icon.png'));
  });

  it('the person’s own --app-name and --logo outrank the preset', async () => {
    seedCatalog(validAppJson());
    const logo = join(dir, 'mine.png');
    writeFileSync(logo, Buffer.alloc(32, 1));
    const ctx = await resolved({ yes: false, appName: 'My Own Name', logo });
    await mode(ctx);
    await brand(ctx);
    expect(ctx.answers.brand).toEqual({ name: 'My Own Name', logoSource: logo });
  });

  it('a module the app wants but the build lacks names the app, not a flag', async () => {
    seedCatalog({ ...validAppJson(), modules: ['livechat', 'no-such-module'] });
    const ctx = await resolved();
    await expect(selectModules(ctx)).rejects.toThrow(/App "insta" wants/);
  });

  it('a WizardError inside resolution still cleans the clone up', async () => {
    seedCatalog({ ...validAppJson(), id: 'other' });
    const ctx = ctxWith({ app: 'insta' });
    await expect(resolveApp(ctx)).rejects.toThrow();
    expect(ctx.answers.app).toBeUndefined();
  });
});
