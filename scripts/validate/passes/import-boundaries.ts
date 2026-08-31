// ---------------------------------------------------------------------------
// Pass 10 — import boundaries in content/shell/src and the vendored trees
// ---------------------------------------------------------------------------
// Module code stays self-contained (the contract in content/shell/src/modules/types.ts):
// react + the module's own declared npm deps, ~ui, ~api (generated docs from its own
// namespace or core), the ../types contract file, and its own subtree. Shell-level
// files may not reach into module subtrees except through the registry.
//
// The three trees the wizard COPIES into an app — content/ui, content/api-client,
// content/vite-plugin-proxy — answer to the same question one step further out:
// their imports are resolved on a user's disk, against a package.json the wizard
// wrote, in a repository that has no workspace behind it. A package that is only
// a devDependency here, or a relative path that leaves the tree, resolves in this
// monorepo and is a broken scaffold there — a failure that surfaces in somebody
// else's `npm install`, which is the worst place to find it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

const packageName = (spec: string): string => {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const specifiersOf = (text: string): { specs: string[]; hasRequire: boolean } => {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const specs: string[] = [];
  // The keyword must not be sitting INSIDE a string literal. Without the
  // lookbehind, a module that ships `'import'` as a command id or a URL key
  // reads as `import ' | '` — the side-effect form, with the text between two
  // unrelated quotes as its specifier — and the pass fails a file that has no
  // such import at all. (Comments are stripped above; strings are not, and
  // stripping them properly is a parser, not a regex.)
  for (const re of [
    /(?<!['"\w$])(?:import|export)\s[^'"]*?\bfrom\s*['"]([^'"\n]+)['"]/g, // import … from / export … from
    /(?<!['"\w$])import\s*['"]([^'"\n]+)['"]/g, // side-effect import
    /(?<!['"\w$])import\s*\(\s*['"]([^'"\n]+)['"]/g, // dynamic import()
  ]) {
    for (const m of stripped.matchAll(re)) specs.push(m[1]);
  }
  return { specs, hasRequire: /\brequire\s*\(/.test(stripped) };
};

const stripExt = (p: string): string => p.replace(/\.(tsx|ts)$/, '');

/**
 * The trees the wizard copies, and what each may reach for beyond node's own
 * built-ins and its declared runtime dependencies.
 *
 * `vite` is on the proxy's list because the tree IS a Vite plugin: the app it
 * lands in has vite or it has nothing to run, and the plugin entry has to name
 * the type it implements. Nothing else is host-provided by that argument.
 */
const VENDORED_EXTRA: Readonly<Record<string, readonly string[]>> = {
  'content/ui': [],
  'content/api-client': [],
  'content/vite-plugin-proxy': ['vite'],
};

/** The names a package.json section holds, or nothing when it has none. */
const namesIn = (manifest: Record<string, unknown>, section: string): string[] =>
  Object.keys((manifest[section] as Record<string, string> | undefined) ?? {});

/**
 * Each vendored tree against the package.json that travels with it.
 *
 * Two rules, both about the copy rather than about this repository:
 *   - a bare import names a runtime dependency of that tree, a node built-in,
 *     or one of the host packages above. A devDependency is not one of those:
 *     it is installed here and absent there. Test files are the exception —
 *     they do not ship, and the tree's own suite runs on its devDependencies.
 *   - a relative import stays inside the tree. One that climbs out reaches a
 *     sibling package that is a workspace link here and nothing at all there.
 */
function checkVendoredTrees(root: string): void {
  for (const [tree, extra] of Object.entries(VENDORED_EXTRA)) {
    const treeDir = join(root, ...tree.split('/'));
    const manifest = JSON.parse(readFileSync(join(treeDir, 'package.json'), 'utf8')) as Record<string, unknown>;
    const shipped = new Set([...namesIn(manifest, 'dependencies'), ...namesIn(manifest, 'peerDependencies'), ...extra]);
    const dev = new Set(namesIn(manifest, 'devDependencies'));

    for (const file of walkAll(treeDir)) {
      if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) continue;
      const label = relative(root, file);
      // Tests and the tree's own scripts stay behind; only src is copied.
      const offStage = /\.test\.tsx?$/.test(file) || relative(treeDir, file).split(sep)[0] !== 'src';
      const { specs } = specifiersOf(readFileSync(file, 'utf8'));

      for (const spec of specs) {
        if (spec.startsWith('.')) {
          /* Both rules are about the copy, so both stop at the copy's edge: an
             off-stage file is not in it, and the repository it does live in has
             the sibling trees right there. `codegen.ts` reaching into
             content/codegen for the generator body is the case in point. */
          if (offStage) continue;
          const resolved = resolve(dirname(file), spec);
          if (!(resolved + sep).startsWith(treeDir + sep)) {
            fail(`${label}: import "${spec}" leaves ${tree} — the wizard copies this tree on its own`);
          }
          continue;
        }
        if (spec.startsWith('~') || spec.startsWith('/')) {
          fail(`${label}: import "${spec}" uses an unknown alias or absolute path`);
          continue;
        }
        if (spec.startsWith('node:')) continue;
        const pkg = packageName(spec);
        if (shipped.has(pkg)) continue;
        if (offStage && dev.has(pkg)) continue;
        fail(
          `${label}: bare import "${spec}" is not a dependency of ${tree}` +
            `${dev.has(pkg) ? ' (a devDependency does not travel with the copy)' : ''} — ` +
            'an app the wizard scaffolds would not resolve it',
        );
      }
    }
  }
}

/**
 * content/codegen — copied into every app as `scripts/codegen/`, and held to a
 * shorter list than any other tree.
 *
 * It runs in two places that have different things installed. Here, and in an
 * app whose owner has fetched the codegen toolchain, `@graphql-codegen/*` is
 * present; in every other app it is not, and that app still typechecks its
 * `scripts/` directory. So the body may reach for `graphql` — a runtime
 * dependency of the generated client, therefore always there — and node's own
 * built-ins, and nothing else. An `import type` from `@graphql-codegen/cli`
 * would compile here and fail there, which is why the shape of the config is
 * written out in `types.ts` instead.
 */
function checkCodegenTree(root: string): void {
  const treeDir = join(root, 'content', 'codegen');
  const ALLOWED = new Set(['graphql']);
  for (const file of walkAll(treeDir)) {
    if (!/\.ts$/.test(file) || file.endsWith('.d.ts')) continue;
    const label = relative(root, file);
    for (const spec of specifiersOf(readFileSync(file, 'utf8')).specs) {
      if (spec.startsWith('.')) {
        const resolved = resolve(dirname(file), spec);
        if (!(resolved + sep).startsWith(treeDir + sep)) {
          fail(`${label}: import "${spec}" leaves content/codegen — the wizard copies this tree on its own`);
        }
        continue;
      }
      if (spec.startsWith('node:')) continue;
      if (ALLOWED.has(packageName(spec))) continue;
      fail(
        `${label}: bare import "${spec}" is not one an app without the codegen toolchain can resolve ` +
          '(graphql and node: built-ins only)',
      );
    }
  }
}

export function checkImportBoundaries(ctx: ValidateContext): void {
  const { root, shellDir, manifests } = ctx;

  const shellSrc = join(shellDir, 'src');
  const shellModulesDir = join(shellSrc, 'modules');
  const registryFile = join(shellModulesDir, 'index.ts');
  // The shell ↔ module contract, extensionless. Four files: `types.ts` (types
  // only), `shellApi.ts` (the runtime half — screen-context publishing and the
  // dock/action bridge), `shellConfig.ts` (the deployment's own settings) and
  // `testClient.ts` (the inert client the render smoke tests mount over). A
  // module may import those and nothing else outside its own subtree.
  const contractFiles = new Set([
    join(shellModulesDir, 'types'),
    join(shellModulesDir, 'shellApi'),
    join(shellModulesDir, 'shellConfig'),
    join(shellModulesDir, 'testClient'),
  ]);
  // The codegen package is not on this list on purpose: a module annotates a
  // document as `TypedDoc` from ~api, so the generated shape can change again
  // (AST → string did) without any module noticing.
  const SHARED_BARE = new Set(['react', 'react-dom']);

  const moduleDirs = new Set(
    readdirSync(shellModulesDir).filter((e) => statSync(join(shellModulesDir, e)).isDirectory()),
  );

  for (const file of walkAll(shellSrc)) {
    if (!/\.(ts|tsx)$/.test(file) || file.endsWith('.d.ts')) continue;
    const rel = relative(shellSrc, file);
    if (rel.split(sep)[0] === 'vendor') continue; // scaffold-time vendored copies, not shell source
    const label = relative(root, file);
    const insideModules = rel.startsWith(`modules${sep}`);
    const seg = insideModules ? rel.split(sep)[1] : null;
    const moduleId = seg !== null && moduleDirs.has(seg) ? seg : null;
    const { specs, hasRequire } = specifiersOf(readFileSync(file, 'utf8'));
    if (hasRequire) fail(`${label}: require() is not allowed in shell source — use import`);

    for (const spec of specs) {
      if (spec.startsWith('~ui')) continue;
      if (spec.startsWith('~api')) {
        /* Both halves of the per-module API surface: the generated GraphQL
           client and the hand-written domain types beside it. The wizard drops
           the ones an app did not pick, so a file reaching across here would
           only fail later, in a scaffold, where nobody is watching. */
        const owned = spec.match(/^~api\/(?:generated|domain)\/([a-z0-9-]+)/);
        if (owned) {
          const allowed = moduleId ? owned[1] === moduleId || owned[1] === 'core' : owned[1] === 'core';
          if (!allowed) {
            fail(
              `${label}: import "${spec}" crosses the module boundary (per-module API: ${moduleId ? 'own module or core' : 'core'} only)`,
            );
          }
        }
        continue;
      }
      if (spec.startsWith('.')) {
        const resolved = stripExt(resolve(dirname(file), spec));
        if (moduleId) {
          const moduleRoot = join(shellModulesDir, moduleId);
          const inOwn = (resolved + sep).startsWith(moduleRoot + sep) || resolved === moduleRoot;
          if (!inOwn && !contractFiles.has(resolved)) {
            fail(
              `${label}: import "${spec}" leaves the module's subtree ` +
                `(allowed: own files, ../types, ../shellApi, ../shellConfig, ../testClient)`,
            );
          }
        } else {
          const relToModules = relative(shellModulesDir, resolved);
          if (!relToModules.startsWith('..')) {
            const parts = relToModules.split(sep);
            const targetsModuleDir = moduleDirs.has(parts[0]);
            const registryRootImport = file === registryFile && parts.length === 1;
            if (targetsModuleDir && !registryRootImport) {
              fail(`${label}: import "${spec}" reaches into a module subtree — go through the registry`);
            }
          }
        }
        continue;
      }
      if (spec.startsWith('~') || spec.startsWith('/')) {
        fail(`${label}: import "${spec}" uses an unknown alias or absolute path`);
        continue;
      }
      // Bare specifier. Shell-level files are unrestricted (their deps are the
      // shell's own package.json); module files must stay on the declared set.
      if (moduleId) {
        const pkg = packageName(spec);
        const ownDeps = manifests.get(moduleId)?.app?.embed?.npmDependencies ?? {};
        const isTest = /\.test\.tsx?$/.test(file);
        if (!SHARED_BARE.has(pkg) && !(pkg in ownDeps) && !(isTest && pkg === 'vitest')) {
          fail(
            `${label}: bare import "${spec}" is not allowed in module code (react, declared embed.npmDependencies${isTest ? ', vitest' : ''} only)`,
          );
        }
      }
    }
  }

  checkVendoredTrees(root);
  checkCodegenTree(root);
}
