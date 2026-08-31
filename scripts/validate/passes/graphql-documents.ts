// ---------------------------------------------------------------------------
// Pass 0 (original) — GraphQL documents vs schema; collect ASTs for pass 3
// ---------------------------------------------------------------------------
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse, specifiedRules, validate } from 'graphql';
import type { DocumentNode } from 'graphql';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walk } from '../walk.ts';

export function checkGraphqlDocuments(ctx: ValidateContext): void {
  const roots = process.argv.slice(2).map((p) => join(process.cwd(), p));
  if (roots.length === 0 && existsSync(ctx.modulesDir)) roots.push(ctx.modulesDir);

  const files = roots.flatMap((p) => (statSync(p).isDirectory() ? [...walk(p)] : [p]));
  ctx.graphqlFileCount = files.length;
  /* Zero is not a small number here, it is a broken run: a moved tree, a
     renamed extension, an argument naming a directory with no documents in it.
     This pass then says nothing, pass 3 iterates an empty `docs`, and the
     summary reports "All checks passed. Measured: 0 GraphQL files". Narrowing
     the set with an argument is legitimate; narrowing it to nothing is not. */
  if (files.length === 0) {
    fail(
      `no .graphql operations document under ${roots.map((p) => relative(ctx.root, p) || p).join(', ')} — ` +
        'this pass and the name-collision pass after it were handed nothing to check',
    );
  }

  for (const file of files) {
    const label = relative(ctx.root, file);
    const source = readFileSync(file, 'utf8');
    let doc: DocumentNode;
    try {
      doc = parse(source);
    } catch (e) {
      fail(`${label}: parse error: ${(e as Error).message}`);
      continue;
    }
    ctx.docs.set(file, doc);
    const errors = validate(ctx.schema, doc, specifiedRules);
    if (errors.length === 0) {
      const ops = doc.definitions.filter((d) => d.kind === 'OperationDefinition').length;
      const frags = doc.definitions.filter((d) => d.kind === 'FragmentDefinition').length;
      ctx.opCount += ops;
      ctx.fragCount += frags;
      console.log(`✓ ${label}: ${ops} operations, ${frags} fragments — valid`);
    } else {
      for (const e of errors) {
        const loc = e.locations?.[0];
        fail(`${label}${loc ? `:${loc.line}` : ''}: ${e.message}`);
      }
    }
  }
}
