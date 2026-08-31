import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ContentLock } from '../src/contentLock';
import type { ContentSource } from '../src/content';
import { loadRegistry } from '../src/registry';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function sourceWith(modules: Record<string, unknown>, locked?: string[]): ContentSource {
  const root = mkdtempSync(join(tmpdir(), 'registry-trust-'));
  roots.push(root);
  const files: Record<string, string> = {};
  for (const [dir, manifest] of Object.entries(modules)) {
    const at = join(root, 'content', 'modules', dir);
    mkdirSync(at, { recursive: true });
    writeFileSync(join(at, 'module.json'), JSON.stringify(manifest));
    if (!locked || locked.includes(dir)) files[`content/modules/${dir}/module.json`] = 'sha';
  }
  const lock = { repo: 'x/y', commit: 'a'.repeat(40), wizardVersion: '0.0.0', files } as ContentLock;
  return {
    root,
    packaged: true,
    lock,
    modulePath: (moduleId, ...segments) => join(root, 'content', 'modules', moduleId, ...segments),
    vendorPath: (name, ...segments) => join(root, 'content', name, ...segments),
    shellPath: (...segments) => join(root, 'content', 'shell', ...segments),
    skillPath: (name, ...segments) => join(root, 'content', 'skills', name, ...segments),
    schemaPath: (...segments) => join(root, 'content', 'schema', ...segments),
    codegenPath: (...segments) => join(root, 'content', 'codegen', ...segments),
  };
}

const manifest = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: id,
  description: `the ${id} module`,
  status: 'ready',
  skill: { installAs: `chatfuel-${id}` },
  ...extra,
});

describe('loadRegistry, against a cache directory', () => {
  it('loads what the lock names', () => {
    const registry = loadRegistry(sourceWith({ core: manifest('core'), livechat: manifest('livechat') }));
    expect([...registry.manifests.keys()].sort()).toEqual(['core', 'livechat']);
  });

  it('ignores a module directory the lock does not name', () => {
    // Anything that can write to ~/.cache could leave one there; only the lock says what is content.
    const source = sourceWith({ core: manifest('core'), planted: manifest('planted') }, ['core']);
    const registry = loadRegistry(source);
    expect([...registry.manifests.keys()]).toEqual(['core']);
    expect(() => registry.closure(['planted'])).toThrow(/Unknown module "planted"/);
  });

  it('names the file when its JSON does not parse', () => {
    // A truncated download is exactly how one gets here, and a bare SyntaxError
    // names no file — leaving nothing to act on but "position 412".
    const source = sourceWith({ core: manifest('core') });
    writeFileSync(source.modulePath('core', 'module.json'), '{"id": "core",');
    expect(() => loadRegistry(source)).toThrow(/module\.json is not valid JSON/);
  });

  it('keeps a manifest that declares everything the run reads', () => {
    const registry = loadRegistry(sourceWith({ core: manifest('core') }));
    expect(registry.manifests.get('core')!.skill.installAs).toBe('chatfuel-core');
  });

  it('refuses a manifest whose id is not its directory', () => {
    // Every path is built from the directory and every lookup goes through the
    // id: a manifest answering for another module points the run elsewhere.
    expect(() => loadRegistry(sourceWith({ core: manifest('core'), livechat: manifest('core') }))).toThrow(
      /declares id "core" but sits in "livechat"/,
    );
  });
});

/**
 * A manifest reaches the run from a checkout or from CHATFUEL_CONTENT_ORIGIN,
 * neither of which CI has ever seen, and every later step reads these fields
 * without asking whether they are there. What used to happen instead was a
 * TypeError three steps further on, naming a property rather than a file.
 */
describe('loadRegistry, against a manifest that is not one', () => {
  const cases: Array<[string, unknown, RegExp]> = [
    ['is not an object at all', ['core'], /is not a JSON object/],
    [
      'declares no id',
      { name: 'Core', description: 'd', status: 'ready', skill: { installAs: 'c' } },
      /declares no id/,
    ],
    [
      'declares no name',
      { id: 'core', description: 'd', status: 'ready', skill: { installAs: 'c' } },
      /declares no name/,
    ],
    [
      'declares no description',
      { id: 'core', name: 'Core', status: 'ready', skill: { installAs: 'c' } },
      /declares no description/,
    ],
    [
      'declares a status nobody handles',
      { id: 'core', name: 'Core', description: 'd', status: 'soon', skill: { installAs: 'c' } },
      /neither "ready" nor "planned"/,
    ],
    [
      'declares no skill',
      { id: 'core', name: 'Core', description: 'd', status: 'ready' },
      /declares no skill\.installAs/,
    ],
    [
      'declares a skill with no installAs',
      { id: 'core', name: 'Core', description: 'd', status: 'ready', skill: {} },
      /declares no skill\.installAs/,
    ],
    [
      'declares an id that is not a string',
      { id: 7, name: 'Core', description: 'd', status: 'ready', skill: { installAs: 'c' } },
      /declares no id/,
    ],
  ];

  for (const [what, value, message] of cases) {
    it(`refuses one that ${what}, by file`, () => {
      let thrown: Error | undefined;
      try {
        loadRegistry(sourceWith({ core: value }));
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).toBeDefined();
      expect(thrown!.message).toMatch(message);
      // Named by path, so the person knows which file to look at.
      expect(thrown!.message).toContain('module.json');
    });
  }

  it('refuses two manifests that would install into the same skill directory', () => {
    // The second copy wins and the first module silently loses its skill.
    expect(() =>
      loadRegistry(
        sourceWith({
          core: manifest('core'),
          livechat: manifest('livechat', { skill: { installAs: 'chatfuel-core' } }),
        }),
      ),
    ).toThrow(/already claims/);
  });
});
