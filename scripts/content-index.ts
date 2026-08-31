/**
 * Writes `content.index.json`: what every file under the content trees is made
 * of, at this commit.
 *
 * The tarball's `content.lock` cannot answer that question any more. A published
 * wizard follows a branch, so the set of files it will fetch is whatever that
 * branch holds now — a set no tarball packed months earlier could have known.
 * This file is how each commit answers it for itself: the wizard fetches it
 * from the commit it resolved, and every digest check downstream reads exactly
 * the same way it did when the answer came out of the tarball.
 *
 * Generated, committed, and checked by `pnpm validate`. Committing content
 * without regenerating it produces a commit no wizard can fetch from, which is
 * why the check is a gate and not a warning.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentIndex } from '../packages/wizard/scripts/content-lock.ts';
import { INDEX_FILE } from '../packages/wizard/src/lockFormat.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The bytes of the index, so the validate pass compares what would be written. */
export function serialiseContentIndex(repoRoot: string): string {
  return `${JSON.stringify({ files: buildContentIndex(repoRoot) }, null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const bytes = serialiseContentIndex(repoRoot);
  writeFileSync(join(repoRoot, INDEX_FILE), bytes);
  const count = Object.keys(JSON.parse(bytes).files).length;
  console.log(`${INDEX_FILE}: ${count} files, ${(bytes.length / 1024).toFixed(0)} KB`);
}
