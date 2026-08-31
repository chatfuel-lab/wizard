import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execa } from 'execa';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/run';
import { appendEnvMissing, collectEnv, envLine, gitignoreGuard, writeEnv } from '../src/scaffold/env';
import { scrub } from '../src/log';
import type { WizardContext } from '../src/context';

/**
 * .env is where every step's answers land. The workspace and auth steps resolve
 * their values generically (`answers.env`) rather than through named branches,
 * so these tests pin the precedence and the one rule that is easy to get wrong:
 * an OPTIONAL var with no value must be a commented placeholder, not `NAME=` —
 * an empty string is a value to dotenv, and every reader downstream takes "set"
 * for "the operator configured this".
 */

let dir: string;

function ctxWith(modules: string[], mutate: (ctx: WizardContext) => void = () => undefined): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir });
  ctx.answers.modules = modules;
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.workspace = { id: 'ws-1', title: 'Test workspace', botsLimit: 5, botCount: 2 };
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  mutate(ctx);
  return ctx;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-env-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('collectEnv', () => {
  it('carries the token and the workspace step’s value', () => {
    const entries = collectEnv(ctxWith(['core', 'livechat']));
    expect(entries).toContainEqual({ name: 'CHATFUEL_TOKEN', value: 'a'.repeat(64) });
    expect(entries).toContainEqual({ name: 'VITE_CHATFUEL_WORKSPACE_ID', value: 'ws-1' });
    // manifest default
    expect(entries).toContainEqual({ name: 'CHATFUEL_API_BASE', value: 'https://panel.chatfuel.com' });
  });

  it('lets answers.env win over the manifest default', () => {
    const entries = collectEnv(
      ctxWith(['core', 'livechat'], (ctx) => {
        ctx.answers.env.CHATFUEL_API_BASE = 'https://staging.example.com';
      }),
    );
    expect(entries).toContainEqual({ name: 'CHATFUEL_API_BASE', value: 'https://staging.example.com' });
  });

  it('writes both workspace names on an auth deployment', () => {
    // The same id doing two jobs: the browser opens on it, and the server
    // creates each new account's bot in it.
    const entries = collectEnv(
      ctxWith(['core', 'livechat', 'auth'], (ctx) => {
        ctx.answers.env.CHATFUEL_WORKSPACE_ID = 'ws-1';
      }),
    );
    expect(entries).toContainEqual({ name: 'VITE_CHATFUEL_WORKSPACE_ID', value: 'ws-1' });
    expect(entries).toContainEqual({ name: 'CHATFUEL_WORKSPACE_ID', value: 'ws-1' });
  });

  it('carries the auth step’s values and comments out the unresolved optional ones', () => {
    const entries = collectEnv(
      ctxWith(['core', 'auth'], (ctx) => {
        ctx.answers.env.VITE_SUPABASE_URL = 'https://abc.supabase.co';
        ctx.answers.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_x';
      }),
    );
    expect(entries).toContainEqual({ name: 'VITE_SUPABASE_URL', value: 'https://abc.supabase.co' });
    // Required and unresolved → an empty line to fill in, not a comment: without
    // this key the server cannot create a bot for anybody who signs up.
    expect(entries).toContainEqual({ name: 'SUPABASE_SERVICE_ROLE_KEY', value: '' });
    expect(entries).toContainEqual({ name: 'CHATFUEL_WORKSPACE_ID', value: '' });
    // Declared optional, never resolved → a commented placeholder.
    expect(entries).toContainEqual({ name: 'SUPABASE_PROJECT_REF', value: '', commented: true });
  });

  it('does not comment out an optional var that DID resolve', () => {
    const entries = collectEnv(
      ctxWith(['core', 'auth'], (ctx) => {
        ctx.answers.env.SUPABASE_PROJECT_REF = 'abcdefghij';
      }),
    );
    expect(entries).toContainEqual({ name: 'SUPABASE_PROJECT_REF', value: 'abcdefghij' });
  });

  it('declares each name once, first module wins', () => {
    const names = collectEnv(ctxWith(['core', 'livechat', 'contacts'])).map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('appends an app preset’s vars after the modules', () => {
    const entries = collectEnv(
      ctxWith(['core', 'livechat'], (ctx) => {
        ctx.answers.app = {
          slug: 'demo',
          manifest: {
            id: 'demo',
            name: 'Demo',
            tagline: 't',
            description: 'd',
            category: 'other',
            status: 'draft',
            modules: ['livechat'],
            brand: { appName: 'Demo' },
            env: [
              { name: 'VITE_IG_DEFAULT_REPLY', optional: true },
              { name: 'APP_MODE', default: 'comments' },
            ],
            listing: { icon: '', screenshots: [] },
          },
          dir: '/tmp/none',
          repo: 'local',
          sha: 'a'.repeat(40),
          playbook: '',
          cleanup: () => undefined,
        };
      }),
    );
    expect(entries).toContainEqual({ name: 'VITE_IG_DEFAULT_REPLY', value: '', commented: true });
    expect(entries).toContainEqual({ name: 'APP_MODE', value: 'comments' });
  });

  it('an app declaration loses to a module’s — it cannot redefine the token', () => {
    const entries = collectEnv(
      ctxWith(['core', 'livechat'], (ctx) => {
        ctx.answers.app = {
          slug: 'demo',
          manifest: {
            id: 'demo',
            name: 'Demo',
            tagline: 't',
            description: 'd',
            category: 'other',
            status: 'draft',
            modules: ['livechat'],
            brand: { appName: 'Demo' },
            // parseAppManifest would refuse `secret`; this bypasses it on
            // purpose to prove the ORDERING is a defense of its own.
            env: [{ name: 'CHATFUEL_TOKEN', default: 'stolen' }],
            listing: { icon: '', screenshots: [] },
          },
          dir: '/tmp/none',
          repo: 'local',
          sha: 'a'.repeat(40),
          playbook: '',
          cleanup: () => undefined,
        };
      }),
    );
    expect(entries).toContainEqual({ name: 'CHATFUEL_TOKEN', value: 'a'.repeat(64) });
    expect(entries.filter((e) => e.name === 'CHATFUEL_TOKEN')).toHaveLength(1);
  });
});

describe('envLine', () => {
  it('writes a commented placeholder without a value', () => {
    expect(envLine({ name: 'A', value: '1' })).toBe('A=1');
    expect(envLine({ name: 'A', value: '', commented: true })).toBe('# A=');
  });

  it('refuses a value that would become a second variable', () => {
    // A .env is one variable per line and has no escape, so a line break in a
    // value declares rather than fills.
    expect(() => envLine({ name: 'VITE_APP_NAME', value: 'Acme\nADMIN_PASSWORD=hunter2' })).toThrow(
      /VITE_APP_NAME contains a line break/,
    );
    expect(() => envLine({ name: 'VITE_APP_NAME', value: 'Acme\rADMIN_PASSWORD=hunter2' })).toThrow();
  });

  it('refuses a name no reader would accept', () => {
    expect(() => envLine({ name: 'A B', value: '1' })).toThrow(/not a usable environment variable name/);
    expect(() => envLine({ name: '1A', value: '1' })).toThrow();
  });
});

describe('writeEnv', () => {
  it('emits the commented optional line into the scaffold .env', () => {
    const ctx = ctxWith(['core', 'auth'], (c) => {
      c.answers.env.VITE_SUPABASE_URL = 'https://abc.supabase.co';
      c.answers.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_x';
    });
    writeEnv(ctx, dir);
    const content = readFileSync(join(dir, '.env'), 'utf8');
    expect(content).toContain('VITE_SUPABASE_URL=https://abc.supabase.co');
    expect(content).toContain('# SUPABASE_PROJECT_REF=');
    // Required: an empty line to fill in, never commented away.
    expect(content).toMatch(/^SUPABASE_SERVICE_ROLE_KEY=$/m);
  });
});

describe('appendEnvMissing with commented entries', () => {
  it('appends the placeholder once and never reports it as a conflict', () => {
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'EXISTING=1\n');
    const entries = [
      { name: 'EXISTING', value: '', commented: true },
      { name: 'NEW_OPTIONAL', value: '', commented: true },
      { name: 'NEW_VALUE', value: 'v' },
    ];
    const first = appendEnvMissing(envPath, entries);
    expect(first.added).toEqual(['NEW_OPTIONAL', 'NEW_VALUE']);
    expect(first.conflicting).toEqual([]);

    const second = appendEnvMissing(envPath, entries);
    expect(second.added).toEqual([]);
    const content = readFileSync(envPath, 'utf8');
    expect(content.match(/# NEW_OPTIONAL=/g)).toHaveLength(1);
    expect(content).toContain('EXISTING=1');
  });

  it('still reports a real conflict', () => {
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'K=old\n');
    expect(appendEnvMissing(envPath, [{ name: 'K', value: 'new' }])).toEqual({
      added: [],
      conflicting: ['K'],
    });
  });

  // The host's own file, not one the wizard made — and now holding a token the
  // wizard put there. Windows has no such modes, so the claim is only made
  // where it means something.
  it.skipIf(process.platform === 'win32')('tightens a world-readable host .env to 0600', () => {
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'EXISTING=1\n', { mode: 0o644 });
    chmodSync(envPath, 0o644);
    appendEnvMissing(envPath, [{ name: 'CHATFUEL_TOKEN', value: 'a'.repeat(64) }]);
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === 'win32')('narrows a group-readable file too, and leaves 0600 as it is', () => {
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'EXISTING=1\n');
    chmodSync(envPath, 0o640);
    appendEnvMissing(envPath, [{ name: 'K', value: 'v' }]);
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
    chmodSync(envPath, 0o600);
    appendEnvMissing(envPath, [{ name: 'K2', value: 'v' }]);
    expect(statSync(envPath).mode & 0o777).toBe(0o600);
  });
});

/**
 * `gitignoreGuard` in a real repository.
 *
 * The guard exists to keep the token out of a commit, and the only authority on
 * what a commit will carry is git: a `.env` that is already tracked stays
 * tracked whatever an ignore file says, and a rule can live somewhere this
 * package never reads. So these run git rather than mock it — the answers being
 * pinned are git's, and a stub would pin this file's guess at them instead.
 */
describe('gitignoreGuard, with git as the authority', () => {
  const initRepo = async (): Promise<void> => {
    await execa('git', ['init', '-q'], { cwd: dir });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: dir });
    await execa('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir });
  };

  it('refuses when git already tracks .env — the line would change nothing', async () => {
    await initRepo();
    writeFileSync(join(dir, '.env'), 'PLACEHOLDER=1\n');
    await execa('git', ['add', '.env'], { cwd: dir });
    await execa('git', ['commit', '-qm', 'placeholder'], { cwd: dir });

    const guard = await gitignoreGuard(ctxWith(['core']), dir);
    expect(guard).toEqual({ ok: false, appended: false });
    // And it did not quietly write the line that would have looked like a fix.
    expect(existsSync(join(dir, '.gitignore'))).toBe(false);
  });

  it('takes an ignore rule the text of this .gitignore never mentions', async () => {
    await initRepo();
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    writeFileSync(join(dir, '.git', 'info', 'exclude'), '.env\n');
    const guard = await gitignoreGuard(ctxWith(['core']), dir);
    expect(guard).toEqual({ ok: true, appended: false });
  });

  it('adds the line and reads back what git says before letting the token be written', async () => {
    await initRepo();
    writeFileSync(join(dir, '.gitignore'), 'node_modules\n');
    const guard = await gitignoreGuard(ctxWith(['core']), dir);
    expect(guard).toEqual({ ok: true, appended: true });
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toContain('.env');
    // Read back the same way the guard does: git, not the text.
    await expect(execa('git', ['check-ignore', '-q', '--', '.env'], { cwd: dir })).resolves.toBeTruthy();
  });

  it('still reads the file when the directory is in no repository at all', async () => {
    writeFileSync(join(dir, '.gitignore'), '.env\n');
    const guard = await gitignoreGuard(ctxWith(['core']), dir);
    expect(guard).toEqual({ ok: true, appended: false });
  });
});

/*
 * The steps mask the secrets they resolve themselves, one call at a time. A
 * secret a module DECLARES has no such step: adminSetup writes ADMIN_PASSWORD
 * into `answers.env` the way every other step writes a plain value, and the
 * scrubber had never heard of it — so the password appeared in whatever the run
 * printed afterwards.
 */
describe('collectEnv masks what it resolves', () => {
  it('registers a declared secret, whatever step filled it in', () => {
    const password = `admin-${'p'.repeat(24)}`;
    collectEnv(
      ctxWith(['core', 'admin'], (ctx) => {
        ctx.answers.env.ADMIN_PASSWORD = password;
      }),
    );
    expect(scrub(`ADMIN_PASSWORD=${password}`)).not.toContain(password);
  });
});
