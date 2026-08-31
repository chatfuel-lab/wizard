// ---------------------------------------------------------------------------
// Pass 1 — module manifests: ajv against module.schema.json + semantic checks
// (id == dirname, unique installAs, known deps, no requires-cycles, SKILL.md
// frontmatter)
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import Ajv2020Import from 'ajv/dist/2020.js';
import type { ModuleManifest, ValidateContext } from '../context.ts';

// Node's CJS interop binds the default import to `module.exports`; the class
// sits there and on its own `default` property, and the latter is the spelling
// the type system and the runtime agree on.
const Ajv2020 = Ajv2020Import.default;
import { fail } from '../report.ts';

/**
 * Directories under content/modules/ that are allowed to carry no module.json.
 * Empty on purpose: every directory there is a module today, and the point of
 * the list is that adding one is a diff a reviewer sees rather than a silence.
 */
const NO_MANIFEST: ReadonlySet<string> = new Set();

export function checkManifests(ctx: ValidateContext): void {
  const { modulesDir, manifests, installMap } = ctx;

  const ajv = new Ajv2020({ allErrors: true });
  const validateManifest = ajv.compile(
    JSON.parse(readFileSync(join(ctx.root, 'packages', 'module-manifest', 'module.schema.json'), 'utf8')),
  );

  for (const entry of readdirSync(modulesDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    /* A dot-directory is never a module: it is a tool's scratch state, dropped
       here because something happened to run with this as its cwd, and it is
       gitignored. Naming each one in NO_MANIFEST would be chasing tools. */
    if (entry.name.startsWith('.')) continue;
    const manifestPath = join(modulesDir, entry.name, 'module.json');
    /* A directory here with no manifest used to be skipped, and a skip is
       invisible: the module left `manifests` and `installMap`, and with it the
       reference lint (pass 2), the migration hygiene (pass 12) and the codegen
       coverage (pass 9) — deleting content/modules/core/module.json took the
       lint off the largest skill in the repo without a word. An exception, if
       one is ever right, goes in NO_MANIFEST by name. */
    if (!existsSync(manifestPath)) {
      if (!NO_MANIFEST.has(entry.name)) {
        fail(
          `content/modules/${entry.name}/ has no module.json — the skill lint, the migration hygiene and the codegen coverage all read this directory through its manifest, and would have skipped it in silence`,
        );
      }
      continue;
    }
    const label = `content/modules/${entry.name}/module.json`;
    let m: ModuleManifest;
    try {
      m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      fail(`${label}: invalid JSON: ${(e as Error).message}`);
      continue;
    }
    // Shape via the single source of truth (module.schema.json).
    if (!validateManifest(m)) {
      for (const err of validateManifest.errors ?? []) {
        fail(`${label}: ${err.instancePath || '/'} ${err.message}`);
      }
    }
    // Semantic checks ajv cannot express.
    if (m.id !== entry.name) fail(`${label}: id "${m.id}" does not match directory name "${entry.name}"`);
    const installAs = m.skill?.installAs;
    if (installAs) {
      if (installMap.has(installAs))
        fail(`${label}: installAs "${installAs}" already used by module "${installMap.get(installAs)!.id}"`);
      installMap.set(installAs, { id: entry.name, skillDir: join(modulesDir, entry.name, m.skill?.dir ?? 'skill') });
    }
    manifests.set(entry.name, m);
  }

  for (const [id, m] of manifests) {
    for (const kind of ['requires', 'recommends'] as const) {
      for (const dep of m[kind] ?? []) {
        if (dep === id) fail(`content/modules/${id}/module.json: ${kind} lists itself`);
        else if (!manifests.has(dep))
          fail(`content/modules/${id}/module.json: ${kind} references unknown module "${dep}"`);
      }
    }
  }

  // Cycle detection over `requires` edges only (mutual `recommends` is legal).
  const visiting = new Set<string>();
  const done = new Set<string>();
  const dfs = (id: string, path: string[]): void => {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      fail(`requires cycle: ${[...path, id].join(' -> ')}`);
      return;
    }
    visiting.add(id);
    for (const dep of manifests.get(id)?.requires ?? []) {
      if (manifests.has(dep)) dfs(dep, [...path, id]);
    }
    visiting.delete(id);
    done.add(id);
  };
  for (const id of manifests.keys()) dfs(id, []);

  // SKILL.md frontmatter name must equal installAs.
  for (const { id, skillDir } of installMap.values()) {
    // Every entry here is a manifest that declared a skill, and the wizard
    // copies that directory into the user's project. Absent, the copy is what
    // discovers it; skipping the check quietly let a manifest promise a skill
    // that was never in the tree.
    if (!existsSync(skillDir)) {
      fail(`content/modules/${id}/module.json declares a skill, but ${relative(ctx.root, skillDir)} is not there`);
      continue;
    }
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      fail(`content/modules/${id}/skill/ exists but has no SKILL.md`);
      continue;
    }
    const fm = readFileSync(skillMd, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    const name = fm?.[1].match(/^name:\s*(\S+)\s*$/m)?.[1];
    const installAs = manifests.get(id)!.skill!.installAs;
    if (name !== installAs) {
      fail(
        `content/modules/${id}/skill/SKILL.md: frontmatter name "${name ?? '(missing)'}" != installAs "${installAs}"`,
      );
    }
  }
}
