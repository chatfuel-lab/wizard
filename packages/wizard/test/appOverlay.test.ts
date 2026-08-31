import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The overlay is the one place catalog content writes into a user's scaffold,
 * so this file tests the trust boundary more than the copying: symlinks and
 * wizard-owned paths are refused with the path named, and what IS copied is
 * exactly the overlay tree, overlay winning on a collision.
 */
vi.mock('@clack/prompts', () => ({
  log: { info: () => undefined, warn: () => undefined, error: () => undefined, success: () => undefined },
}));

const { applyAppOverlay, OVERLAY_DENY } = await import('../src/scaffold/appOverlay');
const { mergeAppDependencies } = await import('../src/scaffold/transforms');
const { createContext } = await import('../src/run');
const { WizardError } = await import('../src/errors');
type WizardContext = import('../src/context').WizardContext;
type AppManifest = import('@chatfuel/module-manifest').AppManifest;

let dir: string;
let appDir: string;
let target: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-overlay-'));
  appDir = join(dir, 'catalog', 'apps', 'demo');
  target = join(dir, 'scaffold');
  mkdirSync(join(appDir, 'overlay'), { recursive: true });
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'package.json'), '{\n  "name": "demo",\n  "dependencies": {}\n}\n');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ctxWithApp(manifest: Partial<AppManifest> = {}): WizardContext {
  const ctx = createContext({ yes: true, dryRun: true, verbose: false });
  ctx.answers.app = {
    slug: 'demo',
    manifest: {
      id: 'demo',
      name: 'Demo',
      tagline: 'A demo.',
      description: 'A demo.',
      category: 'other',
      status: 'draft',
      modules: ['livechat'],
      brand: { appName: 'Demo' },
      listing: { icon: '', screenshots: [] },
      ...manifest,
    },
    dir: appDir,
    repo: 'local',
    sha: 'a'.repeat(40),
    playbook: 'Build the demo.',
    cleanup: () => undefined,
  };
  return ctx;
}

const overlayFile = (rel: string, content = 'overlay') => {
  const path = join(appDir, 'overlay', ...rel.split('/'));
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
};

describe('applyAppOverlay', () => {
  it('does nothing without an app, or without an overlay directory', () => {
    const noApp = createContext({ yes: true, dryRun: true, verbose: false });
    expect(() => applyAppOverlay(noApp, target)).not.toThrow();
    rmSync(join(appDir, 'overlay'), { recursive: true });
    expect(() => applyAppOverlay(ctxWithApp(), target)).not.toThrow();
  });

  it('copies new files and lets the overlay win an existing one', () => {
    mkdirSync(join(target, 'src'), { recursive: true });
    writeFileSync(join(target, 'src', 'App.tsx'), 'template');
    overlayFile('src/App.tsx', 'overlay wins');
    overlayFile('src/appPreset.ts', 'preset');

    applyAppOverlay(ctxWithApp(), target);

    expect(readFileSync(join(target, 'src', 'App.tsx'), 'utf8')).toBe('overlay wins');
    expect(readFileSync(join(target, 'src', 'appPreset.ts'), 'utf8')).toBe('preset');
  });

  it('refuses every wizard-owned path, naming it', () => {
    for (const rel of [...OVERLAY_DENY, '.env', '.env.local']) {
      rmSync(join(appDir, 'overlay'), { recursive: true, force: true });
      overlayFile(rel);
      expect(() => applyAppOverlay(ctxWithApp(), target)).toThrow(new RegExp(rel.replace(/[./]/g, '\\$&')));
    }
  });

  // The loop above only proves the list agrees with itself. These names are
  // written out so that dropping one from OVERLAY_DENY fails a test instead of
  // quietly reopening the path it closed: the vite config under a name vite
  // resolves BEFORE the template's own `.ts`, a lockfile that decides which
  // bytes `<pm> install` fetches, and the scripts `package.json` runs with the
  // token already written into `.env`.
  it('refuses the paths that run code the wizard did not write', () => {
    for (const rel of [
      'vite.config.js',
      'vite.config.mjs',
      'vite.server.config.ts',
      'package-lock.json',
      'npm-shrinkwrap.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'bun.lockb',
      'scripts/deploy-vercel.mjs',
      'scripts/connect-git.mjs',
      'scripts/codegen.mjs',
      // What the two denied deploy scripts import. Denying only the entry
      // point leaves the code it runs open.
      'scripts/deploy/runners.mjs',
      'scripts/deploy/steps.mjs',
      'scripts/deploy/env.mjs',
    ]) {
      rmSync(join(appDir, 'overlay'), { recursive: true, force: true });
      overlayFile(rel);
      expect(() => applyAppOverlay(ctxWithApp(), target)).toThrow(new RegExp(rel.replace(/[./]/g, '\\$&')));
    }
  });

  // macOS and Windows write `.NPMRC` and `.npmrc` into the same file, so an
  // exact-match denylist protects nothing on the machines most users are on.
  it('refuses a wizard-owned path spelled in another case', () => {
    for (const rel of ['.NPMRC', 'Package.json', '.PNPMfile.cjs', 'PATCHES/react.patch', '.ENV.local']) {
      rmSync(join(appDir, 'overlay'), { recursive: true, force: true });
      overlayFile(rel);
      expect(() => applyAppOverlay(ctxWithApp(), target)).toThrow(/not allowed to write/);
    }
  });

  it('refuses a symlink even when its target is harmless', () => {
    overlayFile('src/real.ts');
    symlinkSync(join(appDir, 'overlay', 'src', 'real.ts'), join(appDir, 'overlay', 'src', 'link.ts'));
    try {
      applyAppOverlay(ctxWithApp(), target);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WizardError);
      expect((err as Error).message).toContain('src/link.ts');
      expect((err as InstanceType<typeof WizardError>).hint).toMatch(/symlink/);
    }
  });

  it('merges the manifest dependencies after the copy', () => {
    overlayFile('src/appPreset.ts');
    applyAppOverlay(ctxWithApp({ npmDependencies: { nanoid: '^5.0.0' } }), target);
    const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
    expect(pkg.dependencies.nanoid).toBe('^5.0.0');
  });
});

describe('mergeAppDependencies', () => {
  it('adds, overwrites with the app’s range, and reports only what changed', () => {
    const pkgPath = join(target, 'package.json');
    writeFileSync(pkgPath, JSON.stringify({ name: 'demo', dependencies: { react: '^19.0.0', nanoid: '^4.0.0' } }));
    const changed = mergeAppDependencies(pkgPath, { nanoid: '^5.0.0', zod: '^3.23.0', react: '^19.0.0' });
    expect(changed.sort()).toEqual(['nanoid', 'zod']);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(pkg.dependencies).toEqual({ react: '^19.0.0', nanoid: '^5.0.0', zod: '^3.23.0' });
  });

  it('touches nothing when there is nothing to merge', () => {
    const pkgPath = join(target, 'package.json');
    const before = readFileSync(pkgPath, 'utf8');
    expect(mergeAppDependencies(pkgPath, {})).toEqual([]);
    expect(readFileSync(pkgPath, 'utf8')).toBe(before);
  });
});
