/**
 * Post-codegen pass: print every fragment ONCE per generated file.
 *
 * `documentMode: 'string'` makes each document a `TypedDocumentString`, and in
 * that mode `@graphql-codegen/typed-document-node` inlines the full text of
 * every fragment an operation spreads — transitively — into that operation's
 * string. There is no option that does otherwise: the string branch of
 * `_includeFragments` runs before the `documentNodeImportFragments` and
 * `dedupeFragments` branches ever get a look-in. The flow-builder document has
 * 233 operations over 16 fragments; `ElementParts` alone (5.5 KB) was printed
 * 153 times, and 75 % of a 1.9 MB file was repeated fragment text — a
 * source-size, parse-time and tsc-heap cost, since gzip already folds it.
 *
 * What this pass does to each `graphql.ts`:
 *
 * - a fragment constant (`XFragmentDoc`, recognisable by its `fragmentName`
 *   meta) keeps ONLY its own definition — codegen had inlined its nested
 *   fragments into it too;
 * - an operation constant keeps its operation definition and, for every
 *   fragment definition codegen had inlined (which is exactly the operation's
 *   transitive closure), interpolates that fragment's constant instead:
 *   `${XFragmentDoc}`. `TypedDocumentString extends String`, so the template
 *   literal reads its text.
 *
 * Why this is safe:
 * - codegen emits fragment constants before operation constants, and after
 *   this pass fragments interpolate nothing, so no constant is read before it
 *   is initialised;
 * - the operation stays FIRST in the text — the only thing `getDocMeta` in
 *   `transport/http.ts` relies on;
 * - each fragment appears exactly once per operation text, so no server sees
 *   "There can be only one fragment named X";
 * - `*FragmentDoc` constants are used nowhere outside the generated files.
 *
 * Idempotent: a constant whose text already interpolates is left alone, so
 * running the pass twice is a no-op. Verified by `test/generated-documents.test.ts`.
 *
 * `graphql` is the only import here that is not `node:*`, and it is a runtime
 * dependency of the generated client itself — which is what lets this pass run
 * in an app that has not installed the codegen toolchain.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Kind, parse, print } from 'graphql';

const CONST_RE =
  /export const (\w+) = new TypedDocumentString\(`([\s\S]*?)`(?:, (\{"fragmentName":"([^"]+)"\}))?\) as unknown as (TypedDocumentString<[^;]+>);/g;

export interface HoistStats {
  file: string;
  before: number;
  after: number;
  fragments: number;
  operations: number;
}

export function hoist(source: string): { output: string; fragments: number; operations: number } {
  /* Pass 1: fragment name → constant name, from the metas codegen wrote. The
     constant's name is codegen's own casing (`WABtn` → `WaBtnFragmentDoc`),
     which is why it cannot be derived from the fragment name. */
  const constByFragment = new Map<string, string>();
  for (const match of source.matchAll(CONST_RE)) {
    const [, constName, , , fragmentName] = match;
    if (fragmentName) constByFragment.set(fragmentName, constName!);
  }

  let fragments = 0;
  let operations = 0;
  const output = source.replace(
    CONST_RE,
    (
      whole,
      constName: string,
      text: string,
      meta: string | undefined,
      fragmentName: string | undefined,
      cast: string,
    ) => {
      if (text.includes('${')) return whole; // already hoisted
      const doc = parse(text, { noLocation: true });
      const own = doc.definitions.filter((d) => d.kind !== Kind.FRAGMENT_DEFINITION);
      const inlined = doc.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION);

      if (fragmentName) {
        const self = inlined.find((d) => d.kind === Kind.FRAGMENT_DEFINITION && d.name.value === fragmentName);
        if (!self) throw new Error(`${constName}: fragment ${fragmentName} not found in its own text`);
        fragments += 1;
        return `export const ${constName} = new TypedDocumentString(\`\n${print(self)}\`, ${meta}) as unknown as ${cast};`;
      }

      if (own.length !== 1 || own[0]!.kind !== Kind.OPERATION_DEFINITION) {
        throw new Error(`${constName}: expected exactly one operation definition`);
      }
      const refs = inlined.map((d) => {
        const name = (d as { name: { value: string } }).name.value;
        const ref = constByFragment.get(name);
        if (!ref) throw new Error(`${constName}: no constant for fragment ${name}`);
        return `\${${ref}}`;
      });
      operations += 1;
      const body = [print(own[0]!), ...refs].join('\n');
      return `export const ${constName} = new TypedDocumentString(\`\n${body}\`) as unknown as ${cast};`;
    },
  );
  return { output, fragments, operations };
}

/**
 * Run the pass over every `<namespace>/graphql.ts` under a generated root.
 *
 * The namespaces come from the directory rather than a list, for the same
 * reason the operation barrel does: whatever codegen wrote is what needs
 * hoisting, including a module added after this code was written.
 */
export function hoistDirectory(generatedRoot: string): HoistStats[] {
  const stats: HoistStats[] = [];
  for (const id of readdirSync(generatedRoot)) {
    const file = join(generatedRoot, id, 'graphql.ts');
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const before = statSync(file).size;
    const { output, fragments, operations } = hoist(source);
    if (output !== source) writeFileSync(file, output);
    stats.push({ file: `${id}/graphql.ts`, before, after: Buffer.byteLength(output), fragments, operations });
  }
  return stats;
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

/** One line per file: what it weighed, what it weighs, and what was hoisted. */
export function formatHoistReport(stats: HoistStats[]): string {
  return stats
    .map(
      (s) =>
        `${s.file.padEnd(28)} ${kb(s.before).padStart(9)} → ${kb(s.after).padStart(9)}   ${s.operations} ops, ${s.fragments} fragments`,
    )
    .join('\n');
}
