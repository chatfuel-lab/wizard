import { WizardError } from './errors';
import { registerSecret } from './log';

/**
 * Where the content the wizard installs is fetched from, and under which name.
 *
 * The wizard ships a lock, not the files: an index of paths to sha256 plus the
 * commit they were taken at. This module turns that pin into URLs. Nothing else
 * may build one, because the two properties that make the scheme safe live here
 * — the commit is a full sha (an abbreviation is a name that can come to mean a
 * different object) and the path cannot climb out of the tree.
 *
 * The host is deliberately not a constant. Tests, `pack-smoke` and anyone
 * working on a fork need an origin that answers without the internet, and a
 * scheme whose integrity rests on the digests in the lock does not lose
 * anything by letting the bytes arrive from somewhere else. Nor is the
 * repository name: it travels in the lock, written there from the one place
 * that already records it, `package.json`'s `repository` field.
 */
const DEFAULT_ORIGIN = 'https://raw.githubusercontent.com';

export const ORIGIN_ENV = 'CHATFUEL_CONTENT_ORIGIN';

export interface ContentPin {
  /** `owner/name`. */
  readonly repo: string;
  /** Full 40-character sha. */
  readonly commit: string;
}

/* The two shapes a pin has to have, in one place: a lock, an app's own lock
   and the URL builder all check the same thing, and a fourth spelling of
   either would be a rule that could come to mean something else. */
export const FULL_SHA = /^[0-9a-f]{40}$/;
export const REPO_NAME = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
/* What `fetch` can actually retrieve. `file:` is not on the list because Node's
   fetch answers it with "not implemented... yet...", so allowing it would only
   move the failure from the check to the first download. A mirror with no
   internet is served over http by scripts/origin-server.ts. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * A host the user named in the environment, parsed once and made safe to print.
 *
 * Two variables carry one: the origin the bytes come from, and the API a mirror
 * brings with it (`CHATFUEL_CONTENT_API`, contentRef.ts). Both end up in a URL
 * this wizard prints back at the user the first time a fetch fails, so the
 * scheme allowlist and the credential registration are one function rather than
 * two — a rule that holds for the origin cannot come to mean something else for
 * the API next to it.
 */
export function checkedHostEnv(name: string, value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new WizardError(
      `${name} is not a URL: ${value}`,
      'Give it an absolute http or https origin, such as http://127.0.0.1:8080.',
    );
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new WizardError(
      `${name} uses an unsupported scheme: ${parsed.protocol}`,
      `Supported schemes: ${[...ALLOWED_SCHEMES].join(' ')}`,
    );
  }
  /* A mirror behind basic auth carries its credentials in the origin, and the
     origin is printed back at the user the moment a fetch fails. Username as
     well as password: a token-in-the-username origin is the shape a corporate
     proxy hands out, and it is a credential wherever it appears. The proxy URL
     is masked for the same reason, in net.ts. */
  if (parsed.username) registerSecret(parsed.username);
  if (parsed.password) registerSecret(parsed.password);
  /* Those two on their own are not enough: the scrubber ignores anything under
     twelve characters, because a short "secret" is usually a word and masking
     words corrupts the output. A password can be shorter than that and still be
     a password. What is never short is the part of the URL that carries them,
     so it is registered whole — and the origin, which is the string that
     actually gets printed, cannot come out with the credentials in it. */
  if (parsed.username || parsed.password) {
    registerSecret(`${parsed.protocol}//${parsed.username}:${parsed.password}@`);
  }
  return parsed;
}

/** The origin, with any trailing slashes removed so joining is unambiguous. */
export function resolveOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[ORIGIN_ENV]?.trim();
  if (!override) return DEFAULT_ORIGIN;
  checkedHostEnv(ORIGIN_ENV, override);
  return override.replace(/\/+$/, '');
}

/**
 * Everything before the file path. The repository name is part of it even for a
 * local origin: one shape for every origin means a mirror that is pointed at
 * the wrong repository answers 404 instead of quietly serving the wrong files.
 */
export function contentBase(pin: ContentPin, env: NodeJS.ProcessEnv = process.env): string {
  if (!REPO_NAME.test(pin.repo)) {
    throw new WizardError(`Not a repository name: ${pin.repo}`, 'Expected owner/name.');
  }
  // An abbreviated sha resolves against whatever objects the server happens to
  // hold, so it is a name and not a pin.
  if (!FULL_SHA.test(pin.commit)) {
    throw new WizardError(
      `Not a full commit sha: ${pin.commit}`,
      'The content lock must pin a 40-character sha; abbreviations are not stable.',
    );
  }
  return `${resolveOrigin(env)}/${pin.repo}/${pin.commit}`;
}

/**
 * Whether a path stays inside the tree it is joined onto.
 *
 * Two different files ask this — a content lock about the paths it will fetch,
 * an app's own lock about the paths it will overwrite — and both of them are
 * read from disk before anything has looked at them. One predicate, so a rule
 * that holds for one lock cannot come to mean something else for the other.
 */
export function isInsideTree(path: string): boolean {
  if (path === '' || path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  return !path.split(/[/\\]/).some((segment) => segment === '..' || segment === '');
}

/** Reject anything that could reach outside the pinned tree. */
export function assertContentPath(path: string): void {
  if (!isInsideTree(path)) throw new WizardError(`Not a path inside the content tree: ${path || '(empty)'}`);
}

export function contentUrl(pin: ContentPin, path: string, env: NodeJS.ProcessEnv = process.env): string {
  assertContentPath(path);
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${contentBase(pin, env)}/${encoded}`;
}
