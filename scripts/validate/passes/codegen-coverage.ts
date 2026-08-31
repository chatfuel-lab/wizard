// ---------------------------------------------------------------------------
// Pass 9 — codegen coverage: the generated namespaces are exactly the modules
//          that have operations, and the package exports are exactly those
// ---------------------------------------------------------------------------
// This used to read a hand-kept `const modules = [...]` out of codegen.ts and
// compare it against the manifests. That list is gone: the config derives the
// set from the `operations.graphql` files on disk, so the drift the pass was
// built to catch can no longer be written down.
//
// Two ways to be out of step survive the change, and both are silent:
//   - a module gains or loses operations and nobody re-runs codegen, so
//     `src/generated/` still describes the old set;
//   - codegen writes a new namespace and `package.json` never learns of it, so
//     `@chatfuel/api-client/generated/<id>` does not resolve — a failure that
//     surfaces in an app, not here.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

const listed = (items: Iterable<string>): string => [...items].sort().join(', ');

export function checkCodegenCoverage(ctx: ValidateContext): void {
  const { root, modulesDir, manifests } = ctx;
  const clientDir = join(root, 'content', 'api-client');

  /* What the config will generate, derived the same way the config derives it:
     from the files, not from a list either of us keeps. */
  const withOperations = new Set(
    readdirSync(modulesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((id) => existsSync(join(modulesDir, id, 'skill', 'examples', 'operations.graphql'))),
  );

  const generatedDir = join(clientDir, 'src', 'generated');
  if (!existsSync(generatedDir)) {
    fail('content/api-client/src/generated: not there, so no module has a typed client at all');
    return;
  }
  const generated = new Set(
    readdirSync(generatedDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );

  for (const id of withOperations) {
    if (!generated.has(id)) {
      fail(`content/api-client/src/generated/${id}: missing — "${id}" has operations, so run \`pnpm codegen\``);
    } else if (!existsSync(join(generatedDir, id, 'graphql.ts'))) {
      fail(`content/api-client/src/generated/${id}/graphql.ts: missing — run \`pnpm codegen\``);
    }
  }
  for (const id of generated) {
    if (!withOperations.has(id)) {
      fail(
        `content/api-client/src/generated/${id}: "${id}" has no skill/examples/operations.graphql — ` +
          'stale output that codegen will not rewrite',
      );
    }
  }

  /* A module that is ready and has an app but no operations is fine (auth
     talks to Supabase over RPC and nothing else). One that has operations but
     is not ready is fine too. The pair is only reported when the manifests say
     a shipping module should have a client and the files say it has none. */
  for (const [id, manifest] of manifests) {
    if (manifest.status === 'ready' && manifest.app && withOperations.has(id) && !generated.has(id)) {
      fail(`content/api-client: ready module "${id}" ships without a generated client`);
    }
  }

  const exportsMap = (
    JSON.parse(readFileSync(join(clientDir, 'package.json'), 'utf8')) as { exports?: Record<string, string> }
  ).exports;
  const exported = new Set(
    Object.keys(exportsMap ?? {})
      .filter((key) => key.startsWith('./generated/'))
      .map((key) => key.slice('./generated/'.length)),
  );
  if (listed(exported) !== listed(generated)) {
    fail(
      'content/api-client/package.json: the ./generated/* exports do not match src/generated — ' +
        `exports have [${listed(exported)}], the directory has [${listed(generated)}]`,
    );
  }
}
