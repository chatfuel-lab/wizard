// ---------------------------------------------------------------------------
// Pass 17b — the shell's operation barrel names every generated namespace
// ---------------------------------------------------------------------------
// content/shell/src/operationDocs.ts is what the proxy builds its operation
// registry from: a document that is in no namespace it names is refused. In a
// scaffolded app the wizard writes the file from the directories it just
// copied, so it cannot drift; in the repository it is committed, and a module
// that gained a generated namespace without gaining a line here would be a
// module whose every request 403s in the shell — discovered by running it, not
// by reading it. So it is re-derived, the same way the allowlist is.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const BARREL = 'content/shell/src/operationDocs.ts';

export function checkOperationDocs(ctx: ValidateContext): void {
  const generatedDir = join(ctx.root, 'content/api-client/src/generated');
  const expected = readdirSync(generatedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const source = readFileSync(join(ctx.root, BARREL), 'utf8');
  const named = [
    ...source.matchAll(
      /^import \* as \w+ from '\.\.\/\.\.\/api-client\/src\/generated\/([a-z0-9-]+)\/graphql\.js';$/gm,
    ),
  ]
    .map((match) => match[1]!)
    .sort();

  for (const id of expected) {
    if (!named.includes(id)) {
      fail(`${BARREL} does not import generated/${id} — the proxy would refuse every operation that module sends`);
    }
  }
  for (const id of named) {
    if (!expected.includes(id)) fail(`${BARREL} imports generated/${id}, which does not exist`);
  }

  // A namespace imported and not listed is the same silence as one never
  // imported: the barrel exports the array, not the bindings.
  /* `export * from` is the natural way to write this file and the wrong one:
     two namespaces that export the same name — contacts and livechat both
     export FileInfoFragmentDoc — make that name ambiguous, and an ambiguous
     star export is dropped without a word rather than reported. */
  if (/^export \* from /m.test(source)) {
    fail(`${BARREL} uses \`export *\`, which silently drops a name two namespaces share — import * as instead`);
  }

  const listed = /export const operations = \[([^\]]*)\]/s.exec(source)?.[1] ?? '';
  const bindings = new Set(
    listed
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  for (const [, binding, id] of source.matchAll(
    /^import \* as (\w+) from '.*generated\/([a-z0-9-]+)\/graphql\.js';$/gm,
  )) {
    if (!bindings.has(binding!)) fail(`${BARREL} imports generated/${id} but does not put it in \`operations\``);
  }
}
