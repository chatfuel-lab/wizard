import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { embedScaffold, EMBED_DIR } from '../src/steps/embed';
import { handoff } from '../src/steps/handoff';
import { launch } from '../src/steps/launch';
import { scaffold } from '../src/steps/scaffold';
import type { WizardContext } from '../src/context';

/**
 * What `--plan` is allowed to leave behind: nothing.
 *
 * The flag reads as "show me what this would do", and in embed mode the
 * directory it was pointed at is somebody else's project — a preview that
 * creates src/chatfuel/, appends to their .gitignore and their .env and drops a
 * .chatfuel/lock.json in has converted their repository into a wizard-managed
 * app, which is the opposite of previewing it. Standalone is the same promise
 * with the person's own new directory.
 *
 * So these tests do not check the printed plan's wording. They check the disk.
 */
const lines: string[] = [];
vi.mock('@clack/prompts', () => ({
  isCancel: (value: unknown) => typeof value === 'symbol',
  text: () => Promise.resolve('./chatfuel-app'),
  confirm: () => Promise.resolve(true),
  select: (opts: { initialValue?: unknown }) => Promise.resolve(opts.initialValue),
  password: () => Promise.resolve(''),
  note: (message: string) => lines.push(message),
  intro: () => undefined,
  outro: () => undefined,
  log: {
    info: (m: string) => lines.push(m),
    warn: (m: string) => lines.push(m),
    error: (m: string) => lines.push(m),
    success: (m: string) => lines.push(m),
    message: () => undefined,
    step: () => undefined,
  },
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined }),
}));

vi.mock('execa', () => ({
  execa: () => {
    throw new Error('shelled out on a planning run');
  },
}));

let host: string;
let parent: string;

const HOST_GITIGNORE = 'node_modules\n';
const HOST_ENV = 'HOST_ONLY=1\n';

function embedContext(): WizardContext {
  const ctx = createContext({ yes: true, dryRun: true, plan: true, verbose: false, embed: true, dir: host });
  ctx.answers.mode = 'embed';
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.workspace = { id: 'ws-1', title: 'Test workspace', botsLimit: 5, botCount: 2 };
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  ctx.answers.packageManager = 'npm';
  return ctx;
}

function standaloneContext(dir: string): WizardContext {
  const ctx = createContext({ yes: true, dryRun: true, plan: true, verbose: false, dir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = ['core', 'livechat'];
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.packageManager = 'npm';
  return ctx;
}

beforeEach(() => {
  lines.length = 0;
  host = mkdtempSync(join(tmpdir(), 'wizard-dry-host-'));
  parent = mkdtempSync(join(tmpdir(), 'wizard-dry-'));
  writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: { react: '^19.0.0' } }));
  writeFileSync(join(host, '.gitignore'), HOST_GITIGNORE);
  writeFileSync(join(host, '.env'), HOST_ENV);
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
  rmSync(parent, { recursive: true, force: true });
});

describe('--plan, into somebody else’s project', () => {
  it('writes nothing at all into the host', async () => {
    const before = readdirSync(host).sort();

    await embedScaffold(embedContext());

    expect(readdirSync(host).sort()).toEqual(before);
    expect(existsSync(join(host, EMBED_DIR))).toBe(false);
    expect(existsSync(join(host, '.chatfuel'))).toBe(false);
    expect(existsSync(join(host, '.claude'))).toBe(false);
    expect(existsSync(join(host, 'supabase'))).toBe(false);
  });

  it('leaves the host’s own .gitignore and .env byte for byte', async () => {
    await embedScaffold(embedContext());

    expect(readFileSync(join(host, '.gitignore'), 'utf8')).toBe(HOST_GITIGNORE);
    expect(readFileSync(join(host, '.env'), 'utf8')).toBe(HOST_ENV);
  });

  it('says what it would have done, with the paths it would have written', async () => {
    await embedScaffold(embedContext());

    const said = lines.join('\n');
    expect(said).toContain('--plan');
    expect(said).toContain(join(host, EMBED_DIR));
    expect(said).toContain(join(host, '.chatfuel', 'lock.json'));
    expect(said).toContain(join(host, '.env'));
    expect(said).toContain(join(host, '.gitignore'));
  });

  it('writes no instructions file and no checklist on the way out', async () => {
    const ctx = embedContext();
    await embedScaffold(ctx);
    await handoff(ctx);

    expect(existsSync(join(host, 'CLAUDE.md'))).toBe(false);
    expect(existsSync(join(host, '.claude'))).toBe(false);
    expect(lines.join('\n')).toContain('would write');
  });
});

describe('--plan, into a directory of the person’s own', () => {
  it('creates no app directory', async () => {
    const target = join(parent, 'chatfuel-app');
    const ctx = standaloneContext(target);

    await scaffold(ctx);

    expect(ctx.answers.appDir).toBe(target);
    expect(existsSync(target)).toBe(false);
  });

  it('prints the plan in the order a real run would do it', async () => {
    const target = join(parent, 'chatfuel-app');
    await scaffold(standaloneContext(target));

    const said = lines.join('\n');
    for (const fragment of ['create', 'app template', 'vendor', '.env', 'lock.json', 'dependencies']) {
      expect(said, fragment).toContain(fragment);
    }
    // The plan names the directory it is talking about, every time.
    expect(said).toContain(target);
  });

  it('does not put the app directory back in the steps that follow', async () => {
    const target = join(parent, 'chatfuel-app');
    const ctx = standaloneContext(target);

    await scaffold(ctx);
    await handoff(ctx);
    // execa throws in this file, so a launch that got as far as spawning would
    // fail the test rather than pass it quietly.
    await launch(ctx);

    expect(existsSync(target)).toBe(false);
  });
});
