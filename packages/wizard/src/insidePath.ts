import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

/**
 * Whether a path is really inside a root — the question about the disk, not
 * about the text.
 *
 * `startsWith(root + sep)` answers a different question than it looks like it
 * answers. It is true of a path whose every segment spells out something under
 * the root, and any one of those segments can be a symlink pointing anywhere:
 * `apps/demo/playbook.md` reads `~/.ssh/id_rsa` and passes the test on the way.
 * Reading follows the link, and so does writing — `copyFileSync` onto a symlink
 * writes through it, outside the tree the caller believed it was confined to.
 *
 * So the comparison is made between real paths. The destination need not exist
 * yet: the deepest ancestor that does is resolved, and the segments that are
 * still missing are put back on. They cannot be links, because they are not
 * anything yet, and the parent that will hold them has already been checked.
 *
 * A symlink at the end is refused outright, whatever it points at. Every caller
 * here copies regular files between trees it controls, and none of them has a
 * reason to want the link instead of the file — `update` already refused it,
 * and the overlay refuses it a few lines earlier.
 */

/** The real path of the deepest existing ancestor, with the missing tail put back. */
function realPathOfNearest(path: string): string {
  let current = resolve(path);
  const missing: string[] = [];
  for (;;) {
    if (existsSync(current)) return join(realpathSync(current), ...missing);
    const parent = dirname(current);
    if (parent === current) return join(current, ...missing);
    missing.unshift(basename(current));
    current = parent;
  }
}

/** `lstat`, not `stat`: the question is what this name is, not what it points at. A path that is not there is not a symlink. */
function isSymlink(target: string): boolean {
  try {
    return lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Why `path` is not inside `root`, or `undefined` when it is. A reason rather
 * than a boolean, because the callers phrase their own refusals and the two
 * cases do not read alike.
 */
export function insideProblem(root: string, path: string): string | undefined {
  const target = resolve(path);
  if (isSymlink(target)) return 'it is a symlink';
  const realRoot = realPathOfNearest(root);
  const real = realPathOfNearest(target);
  if (real !== realRoot && !real.startsWith(realRoot + sep)) return 'it resolves outside';
  return undefined;
}
