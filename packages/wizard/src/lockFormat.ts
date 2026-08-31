import { createHash } from 'node:crypto';

/**
 * What both ends of the content scheme have to agree on: the name of the lock
 * file, its shape, and the encoding of the digests in it.
 *
 * The wizard reads a lock and the prepack script writes one, and they run in
 * different worlds — the wizard through a bundler, the script through plain
 * node. So this module imports nothing but `node:crypto`: the script can take
 * it directly, and neither end can drift from what the other expects.
 *
 * Two things keep that working. The syntax here has to be erasable — node
 * strips types, it does not compile them, so an enum or a parameter property
 * would parse on this machine and fail at prepack on another; `tsconfig.
 * stripping.json` holds this file and the scripts to that rule, since the
 * ordinary project cannot, the generated GraphQL client being full of enums
 * that never go near stripping. And every import of this file from
 * `packages/wizard/scripts/` spells the `.ts` extension, because those run
 * under node's own resolution rather than the bundler's — that half has no
 * check and is undone by dropping four characters.
 *
 * Stripping without a flag arrived in node 22.18, which is the repository's
 * floor (`.nvmrc`, and `engines.node` in the root package.json) and the version
 * prepack runs under. This package's own `engines.node` is lower on purpose: it
 * describes what a user needs to run the built CLI, which is bundled JavaScript
 * and never strips anything, and CI runs the tarball on exactly that floor.
 */

/** The file a published wizard carries in place of the content itself. */
export const LOCK_FILE = 'content.lock';

/**
 * The same index, committed to the repository rather than packed into a tarball.
 *
 * A published wizard follows a branch, so the files it will fetch are the ones
 * that branch holds now — a set the tarball could not have known. This file is
 * how the commit describes itself: the wizard reads it from the commit it
 * resolved, and every digest check downstream is unchanged. It is generated,
 * committed, and checked by `pnpm validate`; a content change that lands
 * without it is a commit no wizard can fetch from.
 */
export const INDEX_FILE = 'content.index.json';

/** What `INDEX_FILE` holds: the `files` half of a lock, and nothing else. */
export interface ContentIndex {
  /** Repo-relative path to sha256, base64. */
  readonly files: Readonly<Record<string, string>>;
}

export interface ContentLock {
  /** `owner/name` the files are fetched from. */
  readonly repo: string;
  /**
   * Full sha the files are pinned to.
   *
   * In an app's own lock this is exactly what it says. In the lock a published
   * wizard carries it is the *oldest* commit that wizard will work against:
   * the run resolves a branch, and refuses a resolution this commit is not an
   * ancestor of. See `contentRef.ts`.
   */
  readonly commit: string;
  readonly wizardVersion: string;
  /** Repo-relative path to sha256, base64. */
  readonly files: Readonly<Record<string, string>>;
}

/**
 * The digest every lock in this package speaks: sha256 of the bytes, base64.
 *
 * base64 and deliberately not hex. A sha256 in hex is 64 hex characters, which
 * is the exact shape of a Chatfuel token — so a lock written that way sets off
 * the secret scanner on all 1676 of its lines, and the only ways out are to
 * exempt a shipped file from the credential rules or to stop reading it. The
 * same argument is made the other way round for the publishing secret in
 * `supabase/sql.ts`: an encoding that collides with a secret's shape costs a
 * gate.
 *
 * Two of these that drifted in encoding would fail every download with nothing
 * saying why.
 */
export const digestOf = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('base64');
