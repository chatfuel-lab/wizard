import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyBrandHtml,
  pruneModuleDependencies,
  pruneNavGroups,
  pruneTsconfigFallbacks,
  repointMarkedImport,
  rewriteMarkedBlock,
} from '../src/scaffold/transforms';
import { WizardError } from '../src/errors';

/**
 * Runs the real transforms against the REAL content/shell template files — the
 * guard against silent template drift (an alias-depth change that the prune
 * regex no longer matches would otherwise surface only at scaffold runtime).
 */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const shellDir = join(repoRoot, 'content', 'shell');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-transforms-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('pruneTsconfigFallbacks against the real template', () => {
  it('strips every workspace fallback path', () => {
    const target = join(dir, 'tsconfig.json');
    cpSync(join(shellDir, 'tsconfig.json'), target);
    pruneTsconfigFallbacks(target);
    const pruned = readFileSync(target, 'utf8');
    expect(pruned).not.toContain('../');
    // Still valid JSON with the vendored entries intact.
    const parsed = JSON.parse(pruned) as { compilerOptions: { paths: Record<string, string[]> } };
    expect(parsed.compilerOptions.paths['~ui']).toEqual(['./src/vendor/ui/index.ts']);
    expect(parsed.compilerOptions.paths['~api']).toEqual(['./src/vendor/api/index.ts']);
  });
});

describe('rewriteMarkedBlock against the real template', () => {
  it('rewrites the proxy-import block in vite.config.ts', () => {
    const target = join(dir, 'vite.config.ts');
    cpSync(join(shellDir, 'vite.config.ts'), target);
    rewriteMarkedBlock(target, 'proxy-import', "import { chatfuelProxy } from './vendor/chatfuel-proxy/vite';");
    const out = readFileSync(target, 'utf8');
    expect(out).toContain("from './vendor/chatfuel-proxy/vite'");
    expect(out).not.toContain('content/vite-plugin-proxy');
    expect(out).toContain('@chatfuel:proxy-import');
    expect(out).toContain('@chatfuel:end-proxy-import');
  });

  it('rewrites the ui-css block in src/index.css', () => {
    const target = join(dir, 'index.css');
    cpSync(join(shellDir, 'src', 'index.css'), target);
    rewriteMarkedBlock(target, 'ui-css', '@import "./vendor/ui/styles/tokens.css";');
    const out = readFileSync(target, 'utf8');
    expect(out).toContain('./vendor/ui/styles/tokens.css');
    expect(out).not.toContain('content/ui');
  });

  it('throws on a missing marker (template drift)', () => {
    const target = join(dir, 'plain.ts');
    cpSync(join(shellDir, 'src', 'main.tsx'), target);
    expect(() => rewriteMarkedBlock(target, 'proxy-import', 'x')).toThrow(/template drift/);
  });
});

/**
 * The scaffold repoints these imports; it does not rewrite them. What the
 * template imports is what the template uses, and the wizard is not a second
 * copy of that list — api/chatfuel.ts calls five names out of the proxy core,
 * and a wizard that wrote three of them out shipped a Vercel function that
 * throws ReferenceError on its first cold start.
 */
describe('repointMarkedImport against the real templates', () => {
  const names = (source: string): string[] =>
    (/import\s*\{([^}]*)\}/.exec(source)?.[1] ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '');

  it('keeps every name the Vercel function imports, and only moves the path', () => {
    const real = join(shellDir, 'api', 'chatfuel.ts');
    const target = join(dir, 'chatfuel.ts');
    cpSync(real, target);
    const before = readFileSync(target, 'utf8');
    expect(repointMarkedImport(target, 'proxy-vercel-import', '../vendor/chatfuel-proxy/core.js')).toBe(true);
    const after = readFileSync(target, 'utf8');

    const imported = names(after.slice(after.indexOf('@chatfuel:proxy-vercel-import')));
    expect(imported).toEqual(names(before.slice(before.indexOf('@chatfuel:proxy-vercel-import'))));
    // Every name it imports is a name it uses, and every name it uses is imported.
    for (const name of imported) {
      expect(after.split(new RegExp(`\\b${name}\\b`)).length - 1).toBeGreaterThan(1);
    }
    expect(after).toContain("from '../vendor/chatfuel-proxy/core.js'");
    expect(after).not.toContain('vite-plugin-proxy');
    expect(after).toContain('@chatfuel:end-proxy-vercel-import');
  });

  it('repoints the prod server entry the same way', () => {
    const real = join(shellDir, 'server', 'entry.ts');
    const target = join(dir, 'entry.ts');
    cpSync(real, target);
    expect(repointMarkedImport(target, 'proxy-server-import', '../vendor/chatfuel-proxy/server.js')).toBe(true);
    const out = readFileSync(target, 'utf8');
    expect(out).toContain("from '../vendor/chatfuel-proxy/server.js'");
    expect(out).toContain('createChatfuelServer');
    expect(out).not.toContain('vite-plugin-proxy');
  });

  it('repoints vite.config.ts', () => {
    const target = join(dir, 'vite.config.ts');
    cpSync(join(shellDir, 'vite.config.ts'), target);
    expect(repointMarkedImport(target, 'proxy-import', './vendor/chatfuel-proxy/vite.js')).toBe(true);
    const out = readFileSync(target, 'utf8');
    expect(out).toContain("from './vendor/chatfuel-proxy/vite.js'");
    expect(out).toContain('chatfuelProxy');
    expect(out).not.toContain('vite-plugin-proxy/src');
  });

  it('is a no-op when the file is not there', () => {
    expect(repointMarkedImport(join(dir, 'nope.ts'), 'proxy-server-import', 'x')).toBe(false);
  });

  it('refuses a marked block that is not an import', () => {
    const target = join(dir, 'index.css');
    cpSync(join(shellDir, 'src', 'index.css'), target);
    expect(() => repointMarkedImport(target, 'ui-css', './x.css')).toThrow(/imports from nowhere/);
  });
});

describe('pruneModuleDependencies', () => {
  const pkg = (deps: Record<string, string>) => {
    const target = join(dir, 'package.json');
    writeFileSync(target, JSON.stringify({ name: 'app', dependencies: deps }, null, 2), 'utf8');
    return target;
  };
  const mod = (npmDependencies: Record<string, string>) => ({ app: { embed: { npmDependencies } } });

  it('drops an unselected module’s dependency', () => {
    const target = pkg({ react: '^19.0.0', '@supabase/supabase-js': '^2.49.0' });
    expect(pruneModuleDependencies(target, [mod({ '@supabase/supabase-js': '^2.49.0' })])).toEqual([
      '@supabase/supabase-js',
    ]);
    const after = JSON.parse(readFileSync(target, 'utf8')) as { dependencies: Record<string, string> };
    expect(after.dependencies).toEqual({ react: '^19.0.0' });
  });

  it('keeps a dependency a SELECTED module also declares', () => {
    const target = pkg({ react: '^19.0.0', shared: '^1.0.0' });
    expect(pruneModuleDependencies(target, [mod({ shared: '^1.0.0' })], [mod({ shared: '^1.0.0' })])).toEqual([]);
    const after = JSON.parse(readFileSync(target, 'utf8')) as { dependencies: Record<string, string> };
    expect(after.dependencies.shared).toBe('^1.0.0');
  });

  it('does not rewrite the file when there is nothing to drop', () => {
    const target = pkg({ react: '^19.0.0' });
    const before = readFileSync(target, 'utf8');
    expect(pruneModuleDependencies(target, [{ app: undefined }])).toEqual([]);
    expect(readFileSync(target, 'utf8')).toBe(before);
  });

  it('prunes the real template: no auth means no @supabase/supabase-js', () => {
    const target = join(dir, 'shell-package.json');
    cpSync(join(shellDir, 'package.json'), target);
    const authManifest = JSON.parse(
      readFileSync(join(repoRoot, 'content', 'modules', 'auth', 'module.json'), 'utf8'),
    ) as Parameters<typeof pruneModuleDependencies>[1][number];
    expect(pruneModuleDependencies(target, [authManifest])).toContain('@supabase/supabase-js');
    expect(readFileSync(target, 'utf8')).not.toContain('@supabase/supabase-js');
  });
});

describe('pruneNavGroups against the real template', () => {
  /** Every module the template's table names, which is every visible module. */
  const ALL = [
    'automations',
    'flow-builder',
    'knowledge-base',
    'livechat',
    'coworker',
    'contacts',
    'deals',
    'bookings',
    'ads-optimization',
    'publishing',
    'channels',
  ];
  const navGroups = join(shellDir, 'src', 'modules', 'navGroups.tsx');

  const copy = () => {
    const target = join(dir, 'navGroups.tsx');
    cpSync(navGroups, target);
    return target;
  };
  /** The ids the table still names, group by group. */
  const table = (source: string) =>
    [...source.matchAll(/items: \[([^\]]*)\]/g)].map((m) => [...m[1].matchAll(/'([^']+)'/g)].map((id) => id[1]));

  it('keeps the selected ids in every group, in the table’s order', () => {
    const target = copy();
    const removed = pruneNavGroups(target, ['livechat', 'contacts', 'knowledge-base']);
    expect(removed.sort()).toEqual(
      [
        'ads-optimization',
        'automations',
        'bookings',
        'channels',
        'coworker',
        'deals',
        'flow-builder',
        'publishing',
      ].sort(),
    );
    const after = readFileSync(target, 'utf8');
    expect(table(after)).toEqual([['knowledge-base'], ['livechat'], ['contacts']]);
    for (const id of removed) expect(after).not.toContain(`'${id}'`);
    expect(after).toContain('/* @chatfuel:nav-groups');
    expect(after).toContain('/* @chatfuel:end-nav-groups */');
    expect(after).toContain('export const NAV_GROUPS: readonly NavGroupDef[] = [');
  });

  it('drops a group that emptied out, and the icon that left with it', () => {
    const target = copy();
    pruneNavGroups(target, ['livechat', 'coworker']);
    const after = readFileSync(target, 'utf8');
    /* Two survivors in two different groups: neither group empties, and each
       is left holding the one id that was selected out of it. */
    expect(table(after)).toEqual([['livechat'], ['coworker']]);
    expect(after).not.toContain("id: 'ai'");
    expect(after).not.toContain("title: 'CRM'");
    expect(after).not.toContain('IconSparkles');
    expect(after).not.toContain('IconUsers');
    // The surviving groups' icons and the return type outlive the rest.
    expect(after).toContain('IconInbox');
    expect(after).toContain('IconMegaphone');
    expect(after).toContain('IconLayoutGrid');
    expect(after).toContain('type SideNavGroup');
    expect(after).toContain('FALLBACK_GROUP');
    // No blank line where the groups were.
    expect(after).not.toMatch(/\[\n\n/);
  });

  it('leaves a table naming only modules that exist — the assertion the app ships', () => {
    for (const selected of [['livechat'], ['contacts', 'deals'], ['automations', 'bookings', 'coworker']]) {
      const target = copy();
      pruneNavGroups(target, selected);
      const named = table(readFileSync(target, 'utf8')).flat();
      expect(named.filter((id) => !selected.includes(id))).toEqual([]);
    }
  });

  it('leaves the file untouched when every module is installed', () => {
    const target = copy();
    const before = readFileSync(target, 'utf8');
    expect(pruneNavGroups(target, ALL)).toEqual([]);
    expect(readFileSync(target, 'utf8')).toBe(before);
  });

  it('refuses to guess when the template drifted', () => {
    const target = join(dir, 'drifted.tsx');
    const source = readFileSync(navGroups, 'utf8');
    writeFileSync(target, source.replace(/\/\* @chatfuel:(end-)?nav-groups[^*]*\*\/\n/g, ''), 'utf8');
    expect(() => pruneNavGroups(target, ['livechat'])).toThrow(WizardError);
    expect(() => pruneNavGroups(target, ['livechat'])).toThrow(/nav-groups/);

    // The shape the transform reads, renamed out from under it.
    const renamed = join(dir, 'renamed.tsx');
    writeFileSync(renamed, source.replace(/items: \[/g, 'entries: ['), 'utf8');
    expect(() => pruneNavGroups(renamed, ['livechat'])).toThrow(/template drift/);
  });
});

describe('applyBrandHtml', () => {
  it('rewrites both tags of the real index.html', () => {
    const target = join(dir, 'index.html');
    cpSync(join(shellDir, 'index.html'), target);
    applyBrandHtml(target, { title: 'Acme Desk', href: '%BASE_URL%logo.png', type: 'image/png' });
    const out = readFileSync(target, 'utf8');
    expect(out).toContain('<title>Acme Desk</title>');
    expect(out).toContain('<link rel="icon" type="image/png" href="%BASE_URL%logo.png" />');
    expect(out).not.toContain('Chatfuel App');
    // The rest of the head is left exactly as it was.
    expect(out).toContain('<script type="module" src="/src/main.tsx"></script>');
  });

  it('refuses a head with no icon link rather than silently leaving one out', () => {
    const target = join(dir, 'index.html');
    writeFileSync(target, '<html><head><title>x</title></head></html>', 'utf8');
    expect(() => applyBrandHtml(target, { title: 'a', href: 'b', type: 'c' })).toThrow(WizardError);
  });

  it('refuses a head with no title', () => {
    const target = join(dir, 'index.html');
    writeFileSync(target, '<html><head><link rel="icon" href="x" /></head></html>', 'utf8');
    expect(() => applyBrandHtml(target, { title: 'a', href: 'b', type: 'c' })).toThrow(WizardError);
  });
});
