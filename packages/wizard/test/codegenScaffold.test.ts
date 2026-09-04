import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPERATIONS_IN_API, SCHEMA_FILES, SCHEMA_IN_SKILL, SCHEMA_IN_VENDOR } from '../src/contentLock';
import { digestOf } from '../src/lockFormat';
import { createContext } from '../src/run';
import { appLockPath } from '../src/scaffold/appLock';
import { CODEGEN_STAMP } from '../src/scaffold/apiOperations';
import { scaffold } from '../src/steps/scaffold';
import { embedScaffold, EMBED_DIR } from '../src/steps/embed';
import type { AppLock } from '../src/scaffold/appLock';
import type { WizardContext } from '../src/context';

/**
 * The inputs the generated client is generated from, and the record of which
 * revision of them it came from.
 *
 * A scaffolded app can regenerate its client, which means it has to carry the
 * schema, the operation documents and a way to tell whether the client beside
 * them is still the one they produce. Each of those three is a file `update`
 * has to reason about a year from now, so what is checked here is mostly the
 * lock: what a file is said to have come from, and whether it is said to be
 * generated. Every scaffold below is the real one against the real repository
 * content — only the dependency install is faked.
 */
vi.mock('execa', () => ({ execa: () => Promise.resolve({ stdout: '' }) }));

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');

/** The eleven of the fourteen modules that call an API of their own. */
const MODULES_WITH_OPERATIONS = readdirSync(join(repoRoot, 'content/modules'))
  .filter((id) => existsSync(join(repoRoot, 'content/modules', id, 'skill/examples/operations.graphql')))
  .sort();

let parent: string;
let target: string;

function context(dir: string, modules: string[]): WizardContext {
  const ctx = createContext({ yes: true, dryRun: false, verbose: false, dir });
  ctx.answers.mode = 'standalone';
  ctx.answers.modules = modules;
  ctx.answers.skillsTarget = 'project';
  ctx.answers.token = 'a'.repeat(64);
  ctx.answers.brand = { name: 'Test app' };
  return ctx;
}

const lockOf = (root: string): AppLock => JSON.parse(readFileSync(appLockPath(root), 'utf8')) as AppLock;

beforeEach(() => {
  parent = mkdtempSync(join(tmpdir(), 'wizard-codegen-'));
  target = join(parent, 'app');
});

afterEach(() => {
  rmSync(parent, { recursive: true, force: true });
});

describe('the schema an app is given', () => {
  it('lands in the app and in the core skill, byte for byte the same', async () => {
    const home = mkdtempSync(join(tmpdir(), 'wizard-home-'));
    const previous = process.env.HOME;
    process.env.HOME = home;
    try {
      const ctx = context(target, ['core', 'livechat']);
      ctx.answers.skillsTarget = 'global';
      await scaffold(ctx);

      for (const name of SCHEMA_FILES) {
        const inApp = join(target, 'src/vendor', SCHEMA_IN_VENDOR, name);
        const inSkill = join(home, '.claude/skills/chatfuel-core', SCHEMA_IN_SKILL, name);
        expect(existsSync(inApp), inApp).toBe(true);
        expect(existsSync(inSkill), inSkill).toBe(true);
        expect(readFileSync(inSkill)).toEqual(readFileSync(inApp));
        // And both are the repository's own copy, not a rewrite of it.
        expect(readFileSync(inApp)).toEqual(readFileSync(join(repoRoot, 'content/schema', name)));
      }
    } finally {
      process.env.HOME = previous;
      rmSync(home, { recursive: true, force: true });
    }
  });

  /* A skill directory the wizard did not write is the user's. Completing it
     with two reference files would be exactly the overwrite they declined. */
  it('is not written into a core skill the run was told to keep', async () => {
    const home = mkdtempSync(join(tmpdir(), 'wizard-home-'));
    const previous = process.env.HOME;
    process.env.HOME = home;
    try {
      const theirs = join(home, '.claude/skills/chatfuel-core');
      mkdirSync(theirs, { recursive: true });
      writeFileSync(join(theirs, 'SKILL.md'), 'mine\n');

      const ctx = context(target, ['core', 'livechat']);
      ctx.answers.skillsTarget = 'global';
      await scaffold(ctx);

      expect(readFileSync(join(theirs, 'SKILL.md'), 'utf8')).toBe('mine\n');
      expect(existsSync(join(theirs, SCHEMA_IN_SKILL))).toBe(false);
      expect(lockOf(target).skills['chatfuel-core']!.managed).toBe(false);
    } finally {
      process.env.HOME = previous;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('the operation documents an app is given', () => {
  it('carries one per selected module that has any, and no more', async () => {
    await scaffold(context(target, ['core', 'auth']));

    // auth talks to Supabase over RPC and ships no operations of its own.
    expect(readdirSync(join(target, 'src/vendor/api', OPERATIONS_IN_API))).toEqual(['core.graphql']);
  });

  it('carries all eleven when every module is selected', async () => {
    await scaffold(context(target, readdirSync(join(repoRoot, 'content/modules'))));

    expect(readdirSync(join(target, 'src/vendor/api', OPERATIONS_IN_API)).sort()).toEqual(
      MODULES_WITH_OPERATIONS.map((id) => `${id}.graphql`),
    );
  });

  /* The registration is per file rather than per directory, and this is the
     assertion that says so: a directory entry would give every document the
     same `from`, and an update would go looking for them under a path upstream
     does not have. */
  it('points each document at the module skill it was taken from', async () => {
    await scaffold(context(target, ['core', 'livechat', 'deals']));
    const files = lockOf(target).files;

    for (const id of ['core', 'livechat', 'deals']) {
      const at = `src/vendor/api/${OPERATIONS_IN_API}/${id}.graphql`;
      const entry = files[at];
      expect(entry, at).toBeDefined();
      expect(entry!.from).toBe(`content/modules/${id}/skill/examples/operations.graphql`);
      expect(entry!.sha256).toBe(digestOf(readFileSync(join(repoRoot, entry!.from!))));
    }
  });
});

describe('the client generated from them', () => {
  it('is marked generated, with no digest and nothing upstream to fetch', async () => {
    await scaffold(context(target, ['core', 'livechat']));
    const files = lockOf(target).files;

    const generated = Object.keys(files).filter((at) => at.startsWith('src/vendor/api/generated/'));
    expect(generated.length).toBeGreaterThan(0);
    for (const at of generated) {
      expect(files[at], at).toEqual({ generated: 'codegen' });
    }
    // Every namespace on disk is one of them, so none is left for update to touch.
    for (const namespace of readdirSync(join(target, 'src/vendor/api/generated'), { withFileTypes: true })) {
      if (!namespace.isDirectory()) continue;
      expect(generated).toContain(`src/vendor/api/generated/${namespace.name}/graphql.ts`);
    }
  });
});

describe('the stamp that says what the client was generated from', () => {
  it('digests the schema and every document the app holds', async () => {
    await scaffold(context(target, ['core', 'livechat']));
    const stamp = JSON.parse(
      readFileSync(join(target, 'src/vendor/api/generated', CODEGEN_STAMP), 'utf8'),
    ) as StampShape;

    expect(stamp.schema).toBe(digestOf(readFileSync(join(target, 'src/vendor', SCHEMA_IN_VENDOR, 'schema.graphql'))));
    expect(Object.keys(stamp.operations).sort()).toEqual(['core', 'livechat']);
    for (const [id, digest] of Object.entries(stamp.operations)) {
      expect(digest, id).toBe(
        digestOf(readFileSync(join(target, 'src/vendor/api', OPERATIONS_IN_API, `${id}.graphql`))),
      );
    }
  });

  /* The stamp and the lock are two records of the same bytes, written by two
     different passes. They disagreeing would mean one of them is describing an
     app nobody has. */
  it('agrees with the digests the lock recorded for the same files', async () => {
    await scaffold(context(target, ['core', 'livechat']));
    const files = lockOf(target).files;
    const stamp = JSON.parse(
      readFileSync(join(target, 'src/vendor/api/generated', CODEGEN_STAMP), 'utf8'),
    ) as StampShape;

    expect(stamp.schema).toBe(files[`src/vendor/${SCHEMA_IN_VENDOR}/schema.graphql`]!.sha256);
    for (const [id, digest] of Object.entries(stamp.operations)) {
      expect(digest, id).toBe(files[`src/vendor/api/${OPERATIONS_IN_API}/${id}.graphql`]!.sha256);
    }
  });

  it('is itself generated, so an update never carries one app’s stamp to another', async () => {
    await scaffold(context(target, ['core', 'livechat']));

    expect(lockOf(target).files[`src/vendor/api/generated/${CODEGEN_STAMP}`]).toEqual({ generated: 'codegen' });
  });

  /* Editing a document without regenerating is the state the stamp exists to
     name: the client on disk is no longer the one those bytes produce. */
  it('goes stale the moment a document is edited under it', async () => {
    await scaffold(context(target, ['core', 'livechat']));
    const document = join(target, 'src/vendor/api', OPERATIONS_IN_API, 'core.graphql');
    const stampPath = join(target, 'src/vendor/api/generated', CODEGEN_STAMP);
    const before = JSON.parse(readFileSync(stampPath, 'utf8')) as StampShape;

    writeFileSync(document, `${readFileSync(document, 'utf8')}\n# a query somebody added\n`);

    expect(before.operations.core).not.toBe(digestOf(readFileSync(document)));
  });
});

describe('the inputs an embed is given', () => {
  let host: string;

  beforeEach(() => {
    host = mkdtempSync(join(tmpdir(), 'wizard-codegen-host-'));
    writeFileSync(join(host, 'package.json'), JSON.stringify({ name: 'host-app', dependencies: { react: '^19' } }));
  });

  afterEach(() => {
    rmSync(host, { recursive: true, force: true });
  });

  /* An embed host gets the documents and the stamp but no generator: a file
     importing node:fs in somebody else's src/ is a file their own tsc has to
     accept. What it gets is enough to wire up a generator of their own, and
     enough for `update` to tell them their client is behind. */
  it('are the documents and the stamp, and no generator to run', async () => {
    const ctx = createContext({ yes: true, dryRun: false, verbose: false, embed: true, dir: host });
    ctx.answers.mode = 'embed';
    ctx.answers.modules = ['core', 'livechat'];
    ctx.answers.skillsTarget = 'project';
    ctx.answers.token = 'a'.repeat(64);
    await embedScaffold(ctx);

    const api = join(host, EMBED_DIR, 'vendor/api');
    expect(readdirSync(join(api, OPERATIONS_IN_API)).sort()).toEqual(['core.graphql', 'livechat.graphql']);
    expect(existsSync(join(api, 'generated', CODEGEN_STAMP))).toBe(true);
    expect(existsSync(join(host, 'codegen.ts'))).toBe(false);
    expect(existsSync(join(host, 'scripts/codegen'))).toBe(false);

    const files = lockOf(host).files;
    expect(files[`${EMBED_DIR}/vendor/api/${OPERATIONS_IN_API}/core.graphql`]!.from).toBe(
      'content/modules/core/skill/examples/operations.graphql',
    );
    expect(files[`${EMBED_DIR}/vendor/api/generated/${CODEGEN_STAMP}`]).toEqual({ generated: 'codegen' });
    for (const namespace of readdirSync(join(api, 'generated'), { withFileTypes: true })) {
      if (!namespace.isDirectory()) continue;
      expect(files[`${EMBED_DIR}/vendor/api/generated/${namespace.name}/graphql.ts`]).toEqual({
        generated: 'codegen',
      });
    }
  });
});

interface StampShape {
  schema: string;
  operations: Record<string, string>;
}
