import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OPERATIONS_IN_API } from '../contentLock';
import { digestOf } from '../lockFormat';
import { copied, generated } from './appLock';
import type { LockDraft } from './appLock';
import type { WizardContext } from '../context';

/**
 * Put each selected module's GraphQL documents beside the client generated
 * from them.
 *
 * In this repository a module's `operations.graphql` lives under its skill, and
 * that is where the skill tells an agent to edit it. An app cannot rely on
 * that: the skills may have been installed into the user's home directory, or
 * declined, and then the app holds a generated client whose source it cannot
 * see — which makes "add a field and re-run codegen", the thing every document
 * here promises, impossible in the app the wizard just wrote.
 *
 * Each file is recorded on its own rather than under the api tree that
 * surrounds it, because it did not come from there. `buildAppLock` resolves
 * the most specific tree first, so the per-file entry is what sends `update`
 * back to the module's skill for the new version — and, when the user has
 * edited their copy, what lets it say so instead of overwriting them.
 */
export function copyModuleOperations(ctx: WizardContext, draft: LockDraft, apiDir: string, at: string): string[] {
  const dir = join(apiDir, OPERATIONS_IN_API);
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];
  for (const id of [...ctx.answers.modules].sort()) {
    const manifest = ctx.registry.manifests.get(id);
    if (!manifest) continue;
    const skillDir = manifest.skill.dir ?? 'skill';
    const source = ctx.content.modulePath(id, skillDir, 'examples', 'operations.graphql');
    // Two of the modules have none — auth talks to Supabase over RPC, admin
    // to the app's own routes — and that is not a gap to report.
    if (!existsSync(source)) continue;
    cpSync(source, join(dir, `${id}.graphql`));
    copied(
      draft,
      `${at}/${OPERATIONS_IN_API}/${id}.graphql`,
      `content/modules/${id}/${skillDir}/examples/operations.graphql`,
    );
    written.push(id);
  }
  return written;
}

/** The generator's record of what it last read, beside what it wrote. */
export const CODEGEN_STAMP = '.codegen-inputs.json';

/**
 * Hand the generated client over to the app, and write down what it was
 * generated from.
 *
 * The files are marked `generated`, not `copied`: they arrived as a copy, but
 * from here on the app produces them. An `update` that refreshed them from
 * upstream would throw away the client the user regenerated after editing
 * their own documents — and it would do it silently, because a generated file
 * looks like every other file in the tree. What `update` refreshes instead are
 * the inputs, which are recorded with digests, and then it says so out loud.
 *
 * The stamp is what makes "out of date" answerable without the toolchain
 * installed: the digests of the SDL and of every operation document as they
 * were when this client was generated. `npm run codegen` rewrites it with what
 * it actually read, so the two go out of step exactly when a regeneration is
 * owed.
 */
export function recordGeneratedClient(
  draft: LockDraft,
  apiDir: string,
  at: string,
  schemaFile: string,
  namespaces: readonly string[],
): void {
  for (const namespace of namespaces) {
    generated(draft, `${at}/generated/${namespace}/graphql.ts`, 'codegen');
  }
  const operationsDir = join(apiDir, OPERATIONS_IN_API);
  const operations = existsSync(operationsDir)
    ? readdirSync(operationsDir)
        .filter((name) => name.endsWith('.graphql'))
        .sort()
    : [];
  const stamp = {
    schema: digestOf(readFileSync(schemaFile)),
    operations: Object.fromEntries(
      operations.map((name) => [name.slice(0, -'.graphql'.length), digestOf(readFileSync(join(operationsDir, name)))]),
    ),
  };
  writeFileSync(join(apiDir, 'generated', CODEGEN_STAMP), `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');
  generated(draft, `${at}/generated/${CODEGEN_STAMP}`, 'codegen');
}
