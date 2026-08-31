// ---------------------------------------------------------------------------
// Pass 19 — content.index.json describes the tree it was committed with
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serialiseContentIndex } from '../../content-index.ts';
import { INDEX_FILE } from '../../../packages/wizard/src/lockFormat.ts';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

/**
 * The index is what a published wizard reads to learn which files this commit
 * holds and what they are made of, so a commit whose index has drifted is a
 * commit nothing can be scaffolded from: every file whose digest moved fails
 * its check, and every file that was added is one the wizard will not ask for.
 *
 * Compared as bytes rather than as parsed objects, because the bytes are what
 * gets fetched. A file that parses to the same map but was written by another
 * hand — key order, indentation — is one the next `pnpm content-index` would
 * rewrite, and a diff that reappears on its own is a diff nobody trusts.
 */
export function checkContentIndex(ctx: ValidateContext): void {
  const at = join(ctx.root, INDEX_FILE);
  if (!existsSync(at)) {
    fail(`${INDEX_FILE} is missing — run pnpm content-index`);
    return;
  }
  if (readFileSync(at, 'utf8') !== serialiseContentIndex(ctx.root)) {
    fail(`${INDEX_FILE} does not describe the content trees as they stand — run pnpm content-index`);
  }
}
