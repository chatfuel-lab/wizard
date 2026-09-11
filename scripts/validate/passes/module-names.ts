// ---------------------------------------------------------------------------
// Pass 20 — module names: a module has ONE display name, and every layer that
// shows one shows that name. The manifest's `name`, the shell descriptor's
// `title` (what the navigation rail renders), the third-level heading that
// opens handoff.md, and the first heading of SKILL.md.
//
// Four files with four different audiences, which is exactly why they drift:
// the automations module shipped calling itself "Automations" in the rail and
// "AI Automations" on its own page header, and nothing in the repository could
// see that a running app disagreed with itself.
//
// Page header titles are deliberately NOT checked here. Five of them are built
// as expressions rather than string literals — the knowledge base and the ads
// module hang the open record off the name, the contacts record page opens with
// its own back button, and the flow builder draws the flow's name, with a
// skeleton in its place for the frame before it loads — so a grep for one would
// have to become a parser. Every module's render suite asserts the header it
// draws except the flow builder's, whose header holds no module name to assert:
// it asserts the rail and the loading canvas instead.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

/**
 * The layers allowed to say something other than the module's name, and why.
 *
 * Keyed `<module id>.<layer>`, and the reason is half the entry: an exception
 * with nothing written next to it is indistinguishable from a name somebody
 * forgot to change, which is the failure this pass exists to catch. It is
 * printed with the failure it explains — the person who hits this is editing
 * the layer, not reading this file, and an unexplained "it has to say Team"
 * reads as a bug in the pass.
 */
const EXCEPTIONS: ReadonlyMap<string, { readonly says: string; readonly reason: string }> = new Map([
  [
    'auth.title',
    {
      says: 'Team',
      reason:
        'The auth module is hidden from the navigation rail and renders exactly one page: the list of the people in a workspace. "Accounts" is what the module produces — the thing your own customers sign up to — and it is the right name everywhere the module is described. It is the wrong name for a roster.',
    },
  ],
  [
    'core.skill',
    {
      says: 'Chatfuel GraphQL API — core',
      reason:
        'core is the foundation every other skill builds on rather than a surface anybody opens, so its heading names what it documents. It has no app either, so there is no rail item and no handoff for it to disagree with.',
    },
  ],
]);

/** `title: 'Deals',` in a module descriptor. */
const TITLE_RE = /^\s*title: '([^']*)',?\s*$/m;

/** The first `# ` heading of a SKILL.md. */
const SKILL_HEADING_RE = /^# (.+)$/m;

export function checkModuleNames(ctx: ValidateContext): void {
  const { shellDir, modulesDir, manifests } = ctx;

  for (const [id, m] of [...manifests.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (m.status !== 'ready') continue;
    const name = m.name;
    // A manifest with no name at all is pass 1's failure (the schema requires
    // the field); reporting it twice would only bury the first one.
    if (!name) continue;
    const manifestLabel = `content/modules/${id}/module.json`;

    /**
     * One layer against what the manifest says it should read. `found` is the
     * string as it stands in the file, so both halves of a mismatch are
     * printed and neither has to be looked up.
     */
    const agree = (layer: string, file: string, what: string, found: string | null, expected: string): void => {
      if (found === null) {
        fail(`${file}: could not read the ${what} — this pass reads it to check the module's display name`);
        return;
      }
      const exception = EXCEPTIONS.get(`${id}.${layer}`);
      if (exception) {
        // An exception that has outlived its reason. The layer now says what
        // the manifest asks for, and the entry would quietly force the old
        // string back the next time somebody renamed the module — the same
        // silence this pass was written against, with the map as the place it
        // hides instead of the file.
        if (found === expected) {
          fail(
            `${file}: the ${what} is "${found}", which is what ${manifestLabel} asks for, but ${id}.${layer} is a ` +
              `named exception saying "${exception.says}". The exception is stale — delete it from EXCEPTIONS in ` +
              `scripts/validate/passes/module-names.ts. It was there because: ${exception.reason}`,
          );
          return;
        }
        if (found === exception.says) return;
        fail(
          `${file}: the ${what} is "${found}" — ${id}.${layer} is a named exception and says "${exception.says}". ` +
            `Why it is allowed to differ: ${exception.reason}`,
        );
        return;
      }
      if (found === expected) return;
      const because =
        expected === name
          ? `${manifestLabel} names the module "${name}"`
          : `${manifestLabel} names the module "${name}", so this reads "${expected}"`;
      fail(
        `${file}: the ${what} is "${found}" — ${because}. One display name per module; a layer that has to differ ` +
          `goes in EXCEPTIONS in scripts/validate/passes/module-names.ts with the reason next to it.`,
      );
    };

    // The skill heading. Every ready module has a skill, whether or not it has
    // an app, and every one of them is prefixed with the product's own name.
    //
    // The existence check below is not a way of passing quietly: the schema
    // makes `skill` mandatory, and pass 1 fails when the directory it names or
    // the SKILL.md inside it is not on disk. Same for the two layers further
    // down, which pass 7 insists on. Every guard here is "somebody else has
    // already reported this", never "there is nothing to check".
    const skillDir = m.skill?.dir ?? 'skill';
    const skillFile = `content/modules/${id}/${skillDir}/SKILL.md`;
    const skillPath = join(modulesDir, id, skillDir, 'SKILL.md');
    if (existsSync(skillPath)) {
      const heading = readFileSync(skillPath, 'utf8').match(SKILL_HEADING_RE)?.[1].trim() ?? null;
      agree('skill', skillFile, 'first heading', heading, `Chatfuel ${name}`);
    }

    // The other two layers exist only for a module the shell mounts. `core`
    // has neither, and pass 7 is what insists the rest do (and what reports the
    // descriptor or the handoff missing from a module that should have one).
    if (!m.app) continue;

    const descriptorFile = `content/shell/src/modules/${id}/index.tsx`;
    const descriptorPath = join(shellDir, 'src', 'modules', id, 'index.tsx');
    if (existsSync(descriptorPath)) {
      const title = readFileSync(descriptorPath, 'utf8').match(TITLE_RE)?.[1] ?? null;
      agree('title', descriptorFile, 'descriptor title', title, name);
    }

    const handoffFile = `content/modules/${id}/handoff.md`;
    const handoffPath = join(modulesDir, id, 'handoff.md');
    if (existsSync(handoffPath)) {
      const first = readFileSync(handoffPath, 'utf8').split('\n', 1)[0].trim();
      // The heading names the module and then its id, and the id is what the
      // reader types — so a heading that has lost either shape is reported as
      // the line it actually is.
      const found = new RegExp(`^### (.+) \\(${id}\\)$`).exec(first)?.[1] ?? null;
      agree('handoff', handoffFile, 'heading', found ?? (first || null), name);
    }
  }
}
