import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Directories no pass reads: dependencies, git's own store, build output and
 * the agent scratch state that lands beside it. Named one by one on purpose —
 * this used to be `entry.startsWith('.')`, which took every dot-directory at
 * every level out of seven passes' sight while the publishability gate's own
 * walk (scripts/check-publishable.ts) scanned them. A file the publish gate
 * reads and the structural gates cannot see is the worst of the two.
 */
const SKIP: ReadonlySet<string> = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.next',
  '.cache',
  '.omc',
  '.claude',
]);

/**
 * Every file under `dir`, skipping dependencies, build output and scratch state.
 *
 * `withFileTypes` rather than a stat, because a stat follows the link: a symlink
 * pointing at one of its own ancestors sends the walk round for ever, and one
 * pointing outside the tree hands the passes files that are not in this
 * repository. The publishability gate walks the same tree this way already
 * (scripts/check-publishable.ts) — two walkers with different answers are a
 * source of bugs by themselves.
 */
export function* walkAll(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkAll(path);
    else yield path;
  }
}

/** The .graphql operations documents under `dir` (schema.graphql is SDL, not operations). */
export function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.graphql') && entry.name !== 'schema.graphql') yield path;
  }
}
