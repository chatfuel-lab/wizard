import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';

/**
 * Pins repo reality to module.schema.json: every modules/<id>/module.json in
 * the repo must validate. (scripts/validate.ts runs the same check in CI;
 * this test keeps it enforced from inside the package too.)
 */
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(packageRoot, '..', '..');
const schema = JSON.parse(readFileSync(join(packageRoot, 'module.schema.json'), 'utf8'));
const manifestType = readFileSync(join(packageRoot, 'src', 'moduleManifest.ts'), 'utf8');

/** Every `"enum"` in the schema, by the property that carries it. */
function schemaEnums(node: unknown, name = '', found = new Map<string, string[]>()): Map<string, string[]> {
  if (node === null || typeof node !== 'object') return found;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.enum) && name) found.set(name, obj.enum as string[]);
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'properties' && value !== null && typeof value === 'object') {
      for (const [prop, sub] of Object.entries(value as Record<string, unknown>)) schemaEnums(sub, prop, found);
    } else schemaEnums(value, name, found);
  }
  return found;
}

describe('module.schema.json', () => {
  const ajv = new Ajv2020({ allErrors: true });
  const validate = ajv.compile(schema);

  const modulesDir = join(repoRoot, 'content', 'modules');
  const ids = readdirSync(modulesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);

  it.each(ids)('content/modules/%s/module.json validates', (id) => {
    const manifest = JSON.parse(readFileSync(join(modulesDir, id, 'module.json'), 'utf8'));
    const valid = validate(manifest);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  /* The wizard joins name and version into a single `npm install` argument
     (packages/wizard/src/steps/embed.ts) and runs it inside the user's own
     project with install scripts enabled, so the version is argv, not a label:
     an unconstrained string let a manifest name a git remote, a tarball URL or
     a directory on the machine as the source of the package. */
  it.each([
    'git+ssh://git@example.com/evil/pkg#main',
    'git+https://github.com/evil/pkg',
    'file:../../../.ssh',
    'link:../elsewhere',
    'portal:../elsewhere',
    'workspace:*',
    'npm:other-package@1.0.0',
    'https://example.com/pkg.tgz',
    'evil/pkg',
  ])('an npmDependencies version of %s is rejected', (version) => {
    const manifest = {
      id: 'probe',
      name: 'Probe',
      description: 'A manifest that names a package source instead of a version.',
      status: 'ready',
      skill: { installAs: 'chatfuel-probe' },
      app: {
        embed: { roots: ['src/modules/probe'], entryComponent: 'Probe', npmDependencies: { pkg: version } },
      },
    };
    expect(validate(manifest)).toBe(false);
    expect((validate.errors ?? []).some((e) => e.instancePath === '/app/embed/npmDependencies/pkg')).toBe(true);
  });

  it('an npmDependencies version that is a semver range or a dist-tag is accepted', () => {
    for (const version of ['^2.49.0', '>=1.2.3 <2.0.0', '^2 || ^3', '1.x', '*', 'latest']) {
      const manifest = {
        id: 'probe',
        name: 'Probe',
        description: 'A manifest whose embed pins its package the way a manifest may.',
        status: 'ready',
        skill: { installAs: 'chatfuel-probe' },
        app: {
          embed: { roots: ['src/modules/probe'], entryComponent: 'Probe', npmDependencies: { pkg: version } },
        },
      };
      expect(validate(manifest), `${version} should validate: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  // ModuleManifest says the schema is the authority and that the two are
  // reviewed together, but nothing made that true: `resolve` gained
  // "adminSetup" in the schema and in modules/admin/module.json while the type
  // kept the older pair, so a manifest the validator accepts failed to typecheck.
  const enums = [...schemaEnums(schema)];
  it.each(enums)('the ModuleManifest type spells out every value of %s', (name, values) => {
    const line = new RegExp(`^\\s*${name}\\??: ((?:'[^']*'(?: \\| )?)+);`, 'm').exec(manifestType);
    expect(line, `ModuleManifest has no single-line union for ${name}`).not.toBeNull();
    expect([...line![1].matchAll(/'([^']*)'/g)].map((m) => m[1]).sort()).toEqual([...values].sort());
  });
});
