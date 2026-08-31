// ---------------------------------------------------------------------------
// Pass 3 — cross-file name collisions (operations must be globally unique;
// fragments may repeat only with identical bodies — self-contained-by-design
// duplicates)
// ---------------------------------------------------------------------------
import { relative } from 'node:path';
import { print } from 'graphql';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

export function checkNameCollisions(ctx: ValidateContext): void {
  const opsSeen = new Map<string, string>(); // name -> label
  const fragsSeen = new Map<string, { label: string; body: string }>();
  for (const [file, doc] of ctx.docs) {
    const label = relative(ctx.root, file);
    for (const def of doc.definitions) {
      if (def.kind === 'OperationDefinition' && def.name) {
        const prev = opsSeen.get(def.name.value);
        if (prev) fail(`${label}: duplicate operation name "${def.name.value}" (also in ${prev})`);
        else opsSeen.set(def.name.value, label);
      } else if (def.kind === 'FragmentDefinition') {
        const body = print(def);
        const prev = fragsSeen.get(def.name.value);
        if (prev && prev.body !== body) {
          fail(
            `${label}: fragment "${def.name.value}" differs from the copy in ${prev.label} — identical bodies required`,
          );
        } else if (!prev) {
          fragsSeen.set(def.name.value, { label, body });
        }
      }
    }
  }
}
