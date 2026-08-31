import { readFileSync } from 'node:fs';
import {
  CONTENT_TREE,
  MANIFEST_DIR,
  OPERATIONS_IN_API,
  SCHEMA_FILES,
  SCHEMA_IN_SKILL,
  SCHEMA_IN_VENDOR,
} from '../../../scripts/content-trees.ts';
import { LOCK_FILE, type ContentIndex, type ContentLock } from './lockFormat';
import { assertContentPath, FULL_SHA, REPO_NAME } from './contentOrigin';
import { WizardError } from './errors';

export { CONTENT_TREE, MANIFEST_DIR, LOCK_FILE, OPERATIONS_IN_API, SCHEMA_FILES, SCHEMA_IN_SKILL, SCHEMA_IN_VENDOR };
export type { ContentLock };

/*
 * What a published wizard knows about the content it does not carry.
 *
 * The tarball holds the lock and the module manifests; everything else is
 * fetched from the commit named there and checked against the digests. The lock
 * is written at prepack by `scripts/content-lock.ts`, from the files git
 * tracks — the same list, in the same order, is what a consumer resolves. The
 * shape itself lives in `lockFormat.ts`, where that script can have it too.
 */

/**
 * Every field is checked before anything is fetched with it. A lock is the one
 * input that decides which URLs this process asks for and which bytes it then
 * accepts, so a malformed one has to fail here rather than halfway through a
 * download with a directory already half written.
 */
export function parseContentLock(text: string, where: string): ContentLock {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new WizardError(`${where} is not valid JSON`, 'Reinstall the wizard.', err);
  }
  const lock = raw as Partial<ContentLock>;
  const bad = (what: string): never => {
    throw new WizardError(`${where} ${what}`, 'Reinstall the wizard.');
  };

  if (typeof lock.repo !== 'string' || !REPO_NAME.test(lock.repo)) bad('does not name a repository');
  if (typeof lock.commit !== 'string' || !FULL_SHA.test(lock.commit)) bad('does not name a full commit sha');
  if (typeof lock.wizardVersion !== 'string' || lock.wizardVersion === '') bad('does not name a wizard version');
  checkedFiles(lock.files, where, 'Reinstall the wizard.');
  return lock as ContentLock;
}

/**
 * The file half of a lock, checked.
 *
 * Split out because the same map now arrives two ways: inside the tarball, as
 * part of a lock, and over the network as `content.index.json` from a commit
 * resolved at run time. The second is the one that makes these checks
 * load-bearing rather than defensive — a lock came off this machine's disk,
 * an index came off a branch — and both are joined onto a cache directory by
 * the same code afterwards.
 */
function checkedFiles(files: unknown, where: string, hint?: string): Record<string, string> {
  const bad = (what: string): never => {
    throw new WizardError(`${where} ${what}`, hint);
  };
  if (!files || typeof files !== 'object' || Array.isArray(files)) bad('lists no files');

  const map = files as Record<string, unknown>;
  const paths = Object.keys(map);
  if (paths.length === 0) bad('lists no files');
  for (const path of paths) {
    /* Every consumer joins these keys onto a directory — the cache reads one
       before anything else has looked at it. Checking here is what makes "a key
       cannot climb out of the tree" a property of the map rather than of the
       order in which two functions happen to be called. */
    assertContentPath(path);
    if (typeof map[path] !== 'string' || map[path] === '') bad(`has no digest for ${path}`);
  }
  return map as Record<string, string>;
}

/**
 * `content.index.json`, as fetched from a resolved commit.
 *
 * A lock without the three fields that describe the wizard rather than the
 * files: the repository and the version come from the tarball's own lock, and
 * the commit is the one that was just resolved. What is left is the part that
 * decides which URLs get asked for and which bytes get accepted, so it goes
 * through the same gate.
 */
export function parseContentIndex(text: string, where: string): ContentIndex {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new WizardError(`${where} is not valid JSON`, undefined, err);
  }
  /* No hint: the only caller falls back to the floor when this throws, so the
     message is a `doctor` line rather than something a user has to act on. */
  return { files: checkedFiles((raw as { files?: unknown } | null)?.files, where) };
}

export function readContentLock(path: string): ContentLock {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new WizardError(
      `The wizard cannot find its content lock (${path})`,
      'Reinstall the wizard — the published package ships one.',
      err,
    );
  }
  return parseContentLock(text, path);
}
