import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContext } from '../src/run';
import { appendEnvMissing } from '../src/scaffold/env';
import { collectNpmDependencies, embedScaffold, EMBED_DIR } from '../src/steps/embed';
import { handoff } from '../src/steps/handoff';
import type { WizardContext } from '../src/context';

/**
 * Runs the REAL embed scaffold against the real repo content into a scratch
 * host project — the guard for the non-clobber contract: only additive
 * writes, a complete namespaced footprint, no shell/registry files.
 */

let host: string;

function embedContext(modules: string[]): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, embed: true, dir: host });
  ctx.answers.mode = 'embed';
  ctx.answers.modules = modules;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.workspace = { id: 'ws-1', title: 'Test workspace', botsLimit: 5, botCount: 2 };
  ctx.answers.env.VITE_CHATFUEL_WORKSPACE_ID = 'ws-1';
  ctx.answers.packageManager = 'npm';
  return ctx;
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), 'wizard-embed-'));
  writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: { react: '^19.0.0' } }));
  writeFileSync(join(host, '.env'), 'CHATFUEL_TOKEN=preexisting-value\n');
  writeFileSync(join(host, 'CLAUDE.md'), '# Host project\n\nHost notes stay.\n');
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe('embedScaffold', () => {
  it('copies the namespaced footprint and nothing shell-shaped', async () => {
    const ctx = embedContext(['core', 'livechat', 'flow-builder']);
    await embedScaffold(ctx);

    const root = join(host, EMBED_DIR);
    for (const path of [
      'modules/types.ts',
      'modules/livechat/index.tsx',
      'modules/flow-builder/FlowBuilderApp.tsx',
      'vendor/ui/index.ts',
      'vendor/api/index.ts',
      'vendor/chatfuel-proxy/index.ts',
      // core.ts imports it as './gate.js'; the recursive copy is what keeps the
      // pair together without anybody listing it.
      'vendor/chatfuel-proxy/gate.ts',
      'client.ts',
    ]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
    // Shell parts are skipped by construction — embed copies an allowlist.
    expect(existsSync(join(root, 'App.tsx'))).toBe(false);
    expect(existsSync(join(root, 'modules/index.ts'))).toBe(false);
    expect(existsSync(join(root, 'modules/contacts'))).toBe(false); // unselected

    // appDir anchors skills/recipes/handoff at the host root.
    expect(ctx.answers.appDir).toBe(host);
    expect(existsSync(join(host, '.claude', 'skills', 'chatfuel-livechat', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(host, '.claude', 'skills', 'chatfuel-core', 'playbooks', 'embed.md'))).toBe(true);
  });

  it('appends only missing .env keys and preserves the host token', async () => {
    const ctx = embedContext(['core', 'livechat']);
    await embedScaffold(ctx);

    const env = readFileSync(join(host, '.env'), 'utf8');
    expect(env).toContain('CHATFUEL_TOKEN=preexisting-value'); // never overwritten
    expect(env).not.toContain('a'.repeat(64)); // wizard token NOT written over it
    expect(env).toContain('# Added by chatfuel-wizard');
    expect(env).toContain('VITE_CHATFUEL_WORKSPACE_ID=ws-1');
    expect(readFileSync(join(host, '.gitignore'), 'utf8')).toMatch(/^\.env$/m);
  });

  it('vendors the proxy as a directory, every source file of it', async () => {
    const ctx = embedContext(['core', 'livechat']);
    await embedScaffold(ctx);
    const proxyDir = join(host, EMBED_DIR, 'vendor', 'chatfuel-proxy');
    const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const sources = readdirSync(join(repoRoot, 'content', 'vite-plugin-proxy', 'src')).filter(
      (name) => !/\.test\.tsx?$/.test(name),
    );
    for (const name of sources) expect(existsSync(join(proxyDir, name)), name).toBe(true);
    // Track B splits the plugin; whichever layout is on disk, the entry exists.
    expect(existsSync(join(proxyDir, 'vite.ts')) || existsSync(join(proxyDir, 'index.ts'))).toBe(true);
  });

  it('copies the auth module and its SQL under supabase/chatfuel/', async () => {
    const ctx = embedContext(['core', 'auth']);
    ctx.answers.auth = {
      method: 'manual',
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb_publishable_x',
      anonKeyKind: 'publishable',
      migrationApplied: false,
      authConfigured: false,
    };
    await embedScaffold(ctx);

    expect(existsSync(join(host, EMBED_DIR, 'modules', 'auth', 'AuthGate.tsx'))).toBe(true);
    const sqlDir = join(host, 'supabase', 'chatfuel');
    expect(existsSync(join(sqlDir, 'migrations', '0001_chatfuel_auth.sql'))).toBe(true);
    expect(existsSync(join(sqlDir, 'README.md'))).toBe(true);
    // Nothing else: workspaces are created at sign-up, so there is no seed.
    expect(existsSync(join(sqlDir, 'seed.tenant.sql'))).toBe(false);
    const migration = readFileSync(join(sqlDir, 'migrations', '0001_chatfuel_auth.sql'), 'utf8');
    expect(migration).toContain('function public.cf_bot_created(');
  });

  it('leaves supabase/ alone when auth is not selected', async () => {
    await embedScaffold(embedContext(['core', 'livechat']));
    expect(existsSync(join(host, 'supabase'))).toBe(false);
  });

  it('refuses to re-embed over an existing footprint', async () => {
    await embedScaffold(embedContext(['core', 'livechat']));
    await expect(embedScaffold(embedContext(['core', 'livechat']))).rejects.toThrow(/already exists/);
  });

  it('requires a host package.json', async () => {
    rmSync(join(host, 'package.json'));
    await expect(embedScaffold(embedContext(['core', 'livechat']))).rejects.toThrow(/package\.json/);
  });
});

describe('embed handoff', () => {
  it('appends a marked CLAUDE.md section without clobbering host content, idempotently', async () => {
    const ctx = embedContext(['core', 'livechat']);
    await embedScaffold(ctx);
    await handoff(ctx);
    await handoff(ctx); // re-run must replace the section, not duplicate it

    const claude = readFileSync(join(host, 'CLAUDE.md'), 'utf8');
    expect(claude).toContain('Host notes stay.');
    expect(claude.match(/<!-- chatfuel:begin -->/g)).toHaveLength(1);
    expect(claude.match(/<!-- chatfuel:end -->/g)).toHaveLength(1);

    const prompt = readFileSync(join(host, '.claude', 'commands', 'chatfuel', 'finish-setup.md'), 'utf8');
    expect(prompt).toContain('playbooks/embed.md');
    expect(prompt).toContain('LivechatApp');
    expect(prompt).not.toContain('a'.repeat(64)); // never leak the token
  });
});

describe('handoff with auth', () => {
  it('prints the claim link, names every secret, and never deep-links the hidden module', async () => {
    const ctx = embedContext(['core', 'livechat', 'auth']);
    ctx.answers.auth = {
      method: 'pat',
      projectRef: 'abcdefghijklmnopqrst',
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb_publishable_x',
      anonKeyKind: 'publishable',
      secretKey: 'sb_secret_x',
      migrationApplied: true,
      authConfigured: true,
    };
    await embedScaffold(ctx);
    await handoff(ctx);

    const prompt = readFileSync(join(host, '.claude', 'commands', 'chatfuel', 'finish-setup.md'), 'utf8');
    expect(prompt).toContain('/sign-up');
    expect(prompt).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(prompt).toContain('CHATFUEL_TOKEN');
    expect(prompt).not.toContain('sb_secret_x'); // the key itself never appears
    // auth is hidden in the shell: /auth is not a route, so it is never linked.
    expect(prompt).not.toContain('/auth ');
    expect(prompt).not.toMatch(/#\/auth$/m);
    // …but it is still mounted as an entry component in embed mode.
    expect(prompt).toContain('<AuthGate />');
  });

  it('tells the user to run the SQL by hand on the manual path', async () => {
    const ctx = embedContext(['core', 'auth']);
    ctx.answers.auth = {
      method: 'manual',
      projectRef: 'abcdefghijklmnopqrst',
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb_publishable_x',
      anonKeyKind: 'publishable',
      migrationApplied: false,
      authConfigured: false,
    };
    await embedScaffold(ctx);
    await handoff(ctx);

    const prompt = readFileSync(join(host, '.claude', 'commands', 'chatfuel', 'finish-setup.md'), 'utf8');
    expect(prompt).toContain('https://supabase.com/dashboard/project/abcdefghijklmnopqrst/sql');
    expect(prompt).toContain('Confirm email');
  });

  it('tells the installer that every account gets its own bot', async () => {
    const ctx = embedContext(['core', 'auth']);
    ctx.answers.auth = {
      method: 'pat',
      projectRef: 'abcdefghijklmnopqrst',
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb_publishable_x',
      anonKeyKind: 'publishable',
      migrationApplied: true,
      authConfigured: true,
    };
    await embedScaffold(ctx);
    await handoff(ctx);

    const prompt = readFileSync(join(host, '.claude', 'commands', 'chatfuel', 'finish-setup.md'), 'utf8');
    expect(prompt).toContain('a Chatfuel bot of its own');
    expect(prompt).not.toContain('Ebx4cKArcLopHMxJ7jbKX2MReHsHJqQ1'); // a stale link is worse than none
  });
});

describe('collectNpmDependencies', () => {
  /* Synthetic rather than a real module, and that is the point of the test
     below it: no module in the repo declares a dependency any more. Flow
     builder was the last one — it needed `@xyflow/react` until the canvas
     became `~ui`'s own — so a test that reached for a real manifest would be
     asserting on an accident of who happens to depend on what this week. */
  it('unions module npmDependencies over the base set', () => {
    const ctx = embedContext(['core', 'livechat']);
    const livechat = ctx.registry.manifests.get('livechat');
    if (!livechat?.app?.embed) throw new Error('livechat has no embed block');
    ctx.registry.manifests.set('livechat', {
      ...livechat,
      app: { ...livechat.app, embed: { ...livechat.app.embed, npmDependencies: { 'some-lib': '^1.2.3' } } },
    });

    const { deps } = collectNpmDependencies(ctx);
    expect(deps).toContain('some-lib@^1.2.3');
    expect(deps).toContain('graphql');
    expect(collectNpmDependencies(embedContext(['core', 'livechat'])).deps).not.toContain('some-lib@^1.2.3');
  });

  it('exactly one module declares an npm dependency: auth (@supabase/supabase-js)', () => {
    const ctx = embedContext(['core']);
    const declaring = [...ctx.registry.manifests.entries()]
      .filter(([, manifest]) => Object.keys(manifest.app?.embed?.npmDependencies ?? {}).length > 0)
      .map(([id]) => id);
    /* Not a rule against declaring one — `collectNpmDependencies` exists
       precisely so a module can. It is a record of the current count, so the
       next one to appear is a decision somebody made rather than something
       that drifted in. As of 2026-08-18, auth brings supabase-js. */
    expect(declaring).toEqual(['auth']);
  });
});

describe('appendEnvMissing', () => {
  it('is idempotent and reports conflicts without touching them', () => {
    const envPath = join(host, 'idempotence.env');
    writeFileSync(envPath, 'EXISTING=zzz\n');
    const first = appendEnvMissing(envPath, [
      { name: 'EXISTING', value: 'other' },
      { name: 'FRESH', value: '1' },
    ]);
    expect(first).toEqual({ added: ['FRESH'], conflicting: ['EXISTING'] });
    const second = appendEnvMissing(envPath, [
      { name: 'EXISTING', value: 'other' },
      { name: 'FRESH', value: '1' },
    ]);
    expect(second.added).toEqual([]);
    const content = readFileSync(envPath, 'utf8');
    expect(content).toContain('EXISTING=zzz');
    expect(content.match(/FRESH=1/g)).toHaveLength(1);
  });

  it('creates a fresh file when none exists', () => {
    const envPath = join(host, 'sub', 'new.env');
    mkdirSync(join(host, 'sub'), { recursive: true });
    const result = appendEnvMissing(envPath, [{ name: 'A', value: '1' }]);
    expect(result.added).toEqual(['A']);
    expect(readFileSync(envPath, 'utf8')).toContain('A=1');
  });
});
