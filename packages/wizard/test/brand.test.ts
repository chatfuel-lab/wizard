import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The brand step is the one that decides what every screen of the app is
 * called and what it wears. Two promises are tested here:
 *
 *   1. a command line that carries the answers never asks a question — the
 *      prompts are replaced with ones that THROW;
 *   2. a `--logo` that cannot work is refused BEFORE the run starts, not after
 *      a token prompt and two minutes of scaffolding.
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
const { brand, assertBrandFlags, DEFAULT_APP_NAME } = await import('../src/steps/brand');
const { applyBrand, logoProblem, DEFAULT_LOGO_FILE, MAX_LOGO_BYTES } = await import('../src/scaffold/brandAssets');
const { collectEnv } = await import('../src/scaffold/env');
const { WizardError } = await import('../src/errors');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const shellDir = join(repoRoot, 'content', 'shell');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-brand-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ctxWith(flags: Partial<WizardFlags>): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, ...flags });
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.workspace = { id: 'ws-1', title: "Bob's Agency", botsLimit: 20, botCount: 3 };
  return ctx;
}

/** The parts of a scaffold this step writes into: the head, and public/. */
function fakeScaffold(): string {
  const target = join(dir, 'app');
  mkdirSync(join(target, 'public'), { recursive: true });
  cpSync(join(shellDir, 'index.html'), join(target, 'index.html'));
  cpSync(join(shellDir, 'public', 'logo.svg'), join(target, 'public', 'logo.svg'));
  return target;
}

const writeLogo = (name: string, bytes = 32): string => {
  const path = join(dir, name);
  writeFileSync(path, Buffer.alloc(bytes, 1));
  return path;
};

describe('logoProblem', () => {
  it('says nothing about a real image', () => {
    expect(logoProblem(writeLogo('mark.png'))).toBeNull();
    expect(logoProblem(writeLogo('mark.svg'))).toBeNull();
  });

  it('names the reason it cannot be used', () => {
    expect(logoProblem(join(dir, 'nope.png'))).toMatch(/does not exist/);
    expect(logoProblem(dir)).toMatch(/not a file/);
    expect(logoProblem(writeLogo('mark.txt'))).toMatch(/not an image/);
    expect(logoProblem(writeLogo('huge.png', MAX_LOGO_BYTES + 1))).toMatch(/under/);
  });
});

describe('assertBrandFlags', () => {
  it('accepts a real image', () => {
    expect(() => assertBrandFlags(ctxWith({ logo: writeLogo('mark.png') }))).not.toThrow();
  });

  it('refuses a logo the run could not use, before anything is asked', () => {
    for (const logo of [join(dir, 'nope.png'), dir, writeLogo('mark.txt'), writeLogo('huge.png', MAX_LOGO_BYTES + 1)]) {
      expect(() => assertBrandFlags(ctxWith({ logo }))).toThrow(WizardError);
    }
  });

  it('refuses a name that cannot fit a tab', () => {
    expect(() => assertBrandFlags(ctxWith({ appName: '  ' }))).toThrow(WizardError);
    expect(() => assertBrandFlags(ctxWith({ appName: 'x'.repeat(61) }))).toThrow(WizardError);
  });
});

describe('brand under --yes', () => {
  it('names the app after the workspace and keeps the shipped mark', async () => {
    const ctx = ctxWith({});
    await brand(ctx);
    expect(ctx.answers.brand).toEqual({ name: "Bob's Agency", logoSource: undefined });
  });

  it('falls back to a name of its own when there is no workspace', async () => {
    const ctx = ctxWith({});
    ctx.answers.workspace = undefined;
    await brand(ctx);
    expect(ctx.answers.brand?.name).toBe(DEFAULT_APP_NAME);
  });

  it('takes both answers from the command line', async () => {
    const logo = writeLogo('mark.png');
    const ctx = ctxWith({ appName: 'Acme Desk', logo });
    await brand(ctx);
    expect(ctx.answers.brand).toEqual({ name: 'Acme Desk', logoSource: logo });
  });

  it('asks nothing in embed mode — the host owns its own chrome', async () => {
    const ctx = ctxWith({});
    ctx.answers.mode = 'embed';
    await brand(ctx);
    expect(ctx.answers.brand).toBeUndefined();
  });
});

describe('applyBrand against the real template', () => {
  it('writes the name into the tab and leaves the default mark alone', async () => {
    const ctx = ctxWith({ appName: 'Acme Desk' });
    await brand(ctx);
    const target = fakeScaffold();
    applyBrand(ctx, target);

    const html = readFileSync(join(target, 'index.html'), 'utf8');
    expect(html).toContain('<title>Acme Desk</title>');
    expect(html).toContain(`href="%BASE_URL%${DEFAULT_LOGO_FILE}"`);
    expect(html).toContain('type="image/svg+xml"');
    expect(ctx.answers.env.VITE_APP_NAME).toBe('Acme Desk');
    expect(ctx.answers.env.VITE_APP_LOGO).toBe(DEFAULT_LOGO_FILE);
  });

  it('copies a chosen logo in and removes the mark it replaces', async () => {
    const ctx = ctxWith({ appName: 'Acme Desk', logo: writeLogo('mark.png') });
    await brand(ctx);
    const target = fakeScaffold();
    applyBrand(ctx, target);

    expect(readFileSync(join(target, 'public', 'logo.png')).length).toBe(32);
    expect(() => readFileSync(join(target, 'public', DEFAULT_LOGO_FILE))).toThrow();
    const html = readFileSync(join(target, 'index.html'), 'utf8');
    expect(html).toContain('href="%BASE_URL%logo.png"');
    expect(html).toContain('type="image/png"');
    expect(ctx.answers.env.VITE_APP_LOGO).toBe('logo.png');
  });

  it('keeps an SVG under the name the template already uses', async () => {
    const ctx = ctxWith({ appName: 'Acme Desk', logo: writeLogo('mark.svg') });
    await brand(ctx);
    const target = fakeScaffold();
    applyBrand(ctx, target);
    expect(readFileSync(join(target, 'public', DEFAULT_LOGO_FILE)).length).toBe(32);
    expect(ctx.answers.env.VITE_APP_LOGO).toBe(DEFAULT_LOGO_FILE);
  });

  it('escapes a name that would otherwise close the tag', async () => {
    const ctx = ctxWith({ appName: 'Tom & </title>Jerry' });
    await brand(ctx);
    const target = fakeScaffold();
    applyBrand(ctx, target);
    const html = readFileSync(join(target, 'index.html'), 'utf8');
    expect(html).toContain('<title>Tom &amp; &lt;/title&gt;Jerry</title>');
  });

  it('puts both values in .env, ahead of the modules', async () => {
    const ctx = ctxWith({ appName: 'Acme Desk', logo: writeLogo('mark.png') });
    await brand(ctx);
    applyBrand(ctx, fakeScaffold());
    const names = collectEnv(ctx).map((entry) => entry.name);
    expect(names.slice(0, 2)).toEqual(['VITE_APP_NAME', 'VITE_APP_LOGO']);
    expect(names).toContain('CHATFUEL_TOKEN');
  });

  it('documents the two vars, unset, when the step never ran', () => {
    const ctx = ctxWith({});
    const entries = collectEnv(ctx);
    expect(entries.slice(0, 2)).toEqual([
      { name: 'VITE_APP_NAME', value: '', commented: true },
      { name: 'VITE_APP_LOGO', value: '', commented: true },
    ]);
  });
});
