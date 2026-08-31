import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkedHostEnv, contentUrl, FULL_SHA, ORIGIN_ENV, type ContentPin } from './contentOrigin';
import { cacheBase } from './contentStore';
import { type ContentIndex, type ContentLock, INDEX_FILE } from './lockFormat';
import { parseContentIndex } from './contentLock';
import { WizardError } from './errors';
import { type FetchLike, outboundFetch } from './net';

/**
 * Which commit a run actually installs from.
 *
 * The tarball pins a commit; this module decides whether the run uses it. It
 * does not, normally — the wizard follows a branch, so a fix to a module or a
 * whole new module reaches people on the next `npx` rather than on the next
 * publish. What the tarball's commit means, then, is a floor: the oldest
 * content this wizard's own code is known to work against, and the thing a
 * resolution is checked for descending from.
 *
 * The price is named where it is paid, in CONTRIBUTING.md: whatever is on the
 * branch is what people get, so the branch's own CI is the last gate before a
 * user, and a bad commit is undone by another commit rather than by holding
 * back a release.
 */

/** The branch a published wizard follows when nobody says otherwise. */
export const DEFAULT_CONTENT_REF = 'main';

export const REF_ENV = 'CHATFUEL_CONTENT_REF';
/**
 * Mirror and smoke-test infrastructure, not a setting.
 *
 * `CHATFUEL_CONTENT_ORIGIN` is documented (architecture.md, CONTRIBUTING.md)
 * because a fork or an air-gapped run needs it. This one is not, deliberately:
 * it exists so an origin serving the content can also answer the two API calls
 * a resolution makes — `pack-smoke` asserts through it that a published tarball
 * really follows a branch — and it is honoured only alongside that origin, and
 * only when it points at it. Nothing else should ever set it.
 */
export const API_ENV = 'CHATFUEL_CONTENT_API';
const DEFAULT_API = 'https://api.github.com';

/**
 * How long a resolution is reused before the API is asked again.
 *
 * Unauthenticated GitHub allows 60 requests an hour from an address, and a
 * resolution costs two of them. Ten minutes is short enough that a fix pushed
 * while somebody is working reaches their next run, and long enough that the
 * six runs it takes to get a scaffold right cost one resolution rather than
 * twelve requests.
 */
const RESOLUTION_TTL_MS = 10 * 60 * 1000;

/**
 * A refusal about the repository, not about this machine.
 *
 * Everything else that can go wrong on the way to a commit ends at the floor,
 * so the one thing that must not is marked rather than inferred. The mark used
 * to be "this error carries a hint", which was true only because no other error
 * on the path happened to have one — a property of today's messages rather than
 * of what the error means, and one that turns the next hint anybody adds into a
 * silent hard failure.
 */
class BranchRefusal extends WizardError {
  constructor(message: string, hint: string) {
    super(message, hint);
    this.name = 'BranchRefusal';
  }
}

export interface Resolution {
  /** The commit the run will fetch from. */
  readonly commit: string;
  /** How it was arrived at, for `doctor` and for the failure messages. */
  readonly how: 'floor' | 'resolved' | 'cached' | 'pinned';
  /** Why the floor was used, when it was. */
  readonly why?: string;
}

export function refFrom(env: NodeJS.ProcessEnv = process.env): string {
  return env[REF_ENV]?.trim() || DEFAULT_CONTENT_REF;
}

/**
 * Which API the resolution asks, and why it is almost always GitHub's.
 *
 * The var is only honoured next to `CHATFUEL_CONTENT_ORIGIN`, and only when it
 * names that same origin. Both halves are the same argument: an API on its own
 * would resolve a branch somewhere the bytes are not coming from, and an API at
 * a different host than the origin is a second host to send this repository's
 * name to for no gain — the mirror the var exists for serves both from one
 * place. It goes through what the origin goes through (`checkedHostEnv`), so a
 * mirror behind basic auth has its credentials registered with the scrubber
 * before `json()` can print the URL back in an HTTP error.
 */
function apiBase(env: NodeJS.ProcessEnv): string {
  const override = env[API_ENV]?.trim();
  const origin = env[ORIGIN_ENV]?.trim();
  if (!override || !origin) return DEFAULT_API;

  const api = checkedHostEnv(API_ENV, override);
  const mirror = checkedHostEnv(ORIGIN_ENV, origin);
  if (api.origin !== mirror.origin) {
    throw new WizardError(
      `${API_ENV} is not on the same origin as ${ORIGIN_ENV}: ${api.origin} is not ${mirror.origin}`,
      `${API_ENV} names the API half of the mirror ${ORIGIN_ENV} points at. It cannot send the resolution elsewhere.`,
    );
  }
  return override.replace(/\/+$/, '');
}

/**
 * A mirror does not speak the GitHub API.
 *
 * `CHATFUEL_CONTENT_ORIGIN` exists so tests, `pack-smoke` and a fork can serve
 * the content from somewhere with no internet in front of it. Asking api.github
 * .com to resolve a branch for a run whose bytes come from `127.0.0.1` would
 * resolve to a commit that mirror does not hold, so a mirror means the floor
 * unless it says otherwise by setting an API of its own.
 */
const mirrored = (env: NodeJS.ProcessEnv): boolean => Boolean(env[ORIGIN_ENV]?.trim()) && !env[API_ENV]?.trim();

/**
 * No credential, ever.
 *
 * This is a public repository read anonymously, and the rate limit it buys is
 * already enough: 60 requests an hour is 30 resolutions against the handful a
 * person can cause in that hour, the cache above spends one per ten minutes,
 * and a run that does hit the limit lands on the floor with a `why` `doctor`
 * prints. Attaching the ambient `GITHUB_TOKEN` — the user's own, from
 * `gh auth login` or from CI — would send a credential to whatever host
 * `CHATFUEL_CONTENT_API` names, to fetch bytes that are public either way.
 * `apps/fetch.ts` keeps its token: that catalog can be private.
 */
const apiHeaders = (): Record<string, string> => ({ accept: 'application/vnd.github+json' });

/**
 * Keyed by the floor as well as by the ref, because the answer depends on both.
 *
 * Two wizards on one machine share this directory, and a resolution one of them
 * accepted is not one the other may reuse: a commit that is ahead of an older
 * floor can be behind a newer one, which is exactly the case the compare call
 * refuses. Without the floor in the name that refusal is skipped for ten
 * minutes at a time by whichever wizard asks second.
 */
const resolutionCache = (pin: ContentPin, ref: string, env: NodeJS.ProcessEnv): string =>
  join(
    cacheBase(env),
    'refs',
    `${pin.repo.replace('/', '__')}__${ref.replace(/[/\\]/g, '__')}__${pin.commit.slice(0, 12)}.json`,
  );

function readCachedResolution(at: string): string | null {
  try {
    const held = JSON.parse(readFileSync(at, 'utf8')) as { commit?: string; at?: number };
    if (typeof held.commit !== 'string' || !FULL_SHA.test(held.commit)) return null;
    if (typeof held.at !== 'number' || Date.now() - held.at > RESOLUTION_TTL_MS) return null;
    return held.commit;
  } catch {
    return null;
  }
}

function writeCachedResolution(at: string, commit: string): void {
  try {
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, JSON.stringify({ commit, at: Date.now() }));
  } catch {
    /* A cache that cannot be written costs two API requests on the next run and
       nothing else. It is not a reason to refuse to scaffold. */
  }
}

async function json(fetchImpl: FetchLike, url: string, headers: Record<string, string>): Promise<unknown> {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new WizardError(`${url} answered HTTP ${response.status}`);
  return response.json();
}

/**
 * Turn the ref into a commit, and refuse one the floor does not lead to.
 *
 * Two requests, not one. The compare endpoint carries both answers, but the
 * commit list it returns is truncated at 250 and truncated from the far end, so
 * reading the head sha out of it is right until the day the branch is 251
 * commits ahead of the floor — and then it is silently wrong, which is the
 * worst kind of right.
 *
 * `behind` and `diverged` are refusals rather than fallbacks. Both mean the
 * branch no longer contains the commit this wizard was built against: a reset,
 * a force-push, or an origin pointed at somebody else's fork. Serving the floor
 * instead would install content while hiding that the branch is not what it
 * claims to be.
 *
 * The check does not care which ref was asked for. A commit named by name is
 * already gone by here — `resolveContentRef` answers a full sha without a
 * request, precisely so that reproducing an old run stays possible — so every
 * ref that reaches this function is a branch or a tag, and a branch is a branch
 * whether the user typed its name or took the default.
 */
async function resolveThroughApi(
  pin: ContentPin,
  ref: string,
  env: NodeJS.ProcessEnv,
  fetchImpl: FetchLike,
): Promise<string> {
  const api = apiBase(env);
  const headers = apiHeaders();

  const head = (await json(fetchImpl, `${api}/repos/${pin.repo}/commits/${encodeURIComponent(ref)}`, headers)) as {
    sha?: unknown;
  };
  if (typeof head.sha !== 'string' || !FULL_SHA.test(head.sha)) {
    throw new WizardError(`${pin.repo} resolved ${ref} to something that is not a commit sha`);
  }
  if (head.sha === pin.commit) return head.sha;

  const compared = (await json(fetchImpl, `${api}/repos/${pin.repo}/compare/${pin.commit}...${head.sha}`, headers)) as {
    status?: unknown;
  };
  if (compared.status !== 'ahead' && compared.status !== 'identical') {
    throw new BranchRefusal(
      `${pin.repo}@${ref} is ${String(compared.status)} relative to the commit this wizard requires`,
      `This wizard needs content descending from ${pin.commit.slice(0, 12)}. Pass ${REF_ENV}=${pin.commit} to install exactly that, and report the branch — it was reset or force-pushed.`,
    );
  }
  return head.sha;
}

/**
 * The commit to install from, and never an exception the caller has to survive.
 *
 * Everything that can go wrong here — no network, a rate limit, a mirror, a
 * proxy that eats the API — has the same correct answer: use the floor. That is
 * a commit whose digests are in the tarball, so a run that falls back installs
 * the content the wizard was published with, which is exactly what every run
 * did before this module existed. The one exception is the refusal above: a
 * branch that has moved backwards is a fact about the repository, not about
 * this machine's network, and it is said out loud.
 */
export async function resolveContentRef(options: {
  pin: ContentPin;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<Resolution> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? outboundFetch;
  const ref = refFrom(env);

  /* A full sha asked for by name is the answer already. No request, and no
     floor check either: reproducing a run from before the floor moved is what
     naming a commit is for. */
  if (FULL_SHA.test(ref)) return { commit: ref, how: 'pinned' };
  if (mirrored(env)) return { commit: options.pin.commit, how: 'floor', why: `${ORIGIN_ENV} is set` };

  const at = resolutionCache(options.pin, ref, env);
  const cached = readCachedResolution(at);
  if (cached) return { commit: cached, how: 'cached' };

  let commit: string;
  try {
    commit = await resolveThroughApi(options.pin, ref, env, fetchImpl);
  } catch (err) {
    if (err instanceof BranchRefusal) throw err;
    return {
      commit: options.pin.commit,
      how: 'floor',
      why: err instanceof Error ? err.message : String(err),
    };
  }
  writeCachedResolution(at, commit);
  return { commit, how: 'resolved' };
}

/**
 * The digests for a commit, read from the commit itself.
 *
 * `content.index.json` is committed for this: the tarball's own file list
 * describes the floor and nothing else, and a branch that has moved holds files
 * the floor never had. Everything downstream — which paths exist, which bytes
 * are the right bytes — reads exactly as it did when that list came out of the
 * tarball.
 */
export async function fetchContentIndex(options: {
  pin: ContentPin;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<ContentIndex> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? outboundFetch;
  const url = contentUrl(options.pin, INDEX_FILE, env);

  const response = await fetchImpl(url);
  if (!response.ok)
    throw new WizardError(`${INDEX_FILE} is not available at ${options.pin.commit} (HTTP ${response.status})`);
  /* Through the same gate a lock goes through, and for a stronger reason: this
     one came off a branch. Its keys are joined onto the cache directory by code
     that runs before any URL is built, so a key that climbs out of the tree has
     to be refused here or not at all. */
  return parseContentIndex(await response.text(), url);
}

/**
 * The lock a run works from: the floor's, or the resolved commit's.
 *
 * Falling back on a failed index fetch is the same argument as falling back on
 * a failed resolution, one step later — and it has to be made again here,
 * because the two failures are different. A resolution can succeed against a
 * commit whose index is missing (someone committed content without running
 * `pnpm content-index`), and the run that meets that should install what the
 * wizard shipped with rather than nothing at all.
 */
export async function lockForRun(options: {
  floor: ContentLock;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}): Promise<{ lock: ContentLock; resolution: Resolution }> {
  const { floor } = options;
  const pin: ContentPin = { repo: floor.repo, commit: floor.commit };
  const resolution = await resolveContentRef({ pin, env: options.env, fetchImpl: options.fetchImpl });
  if (resolution.commit === floor.commit) return { lock: floor, resolution };

  try {
    const index = await fetchContentIndex({
      pin: { repo: floor.repo, commit: resolution.commit },
      env: options.env,
      fetchImpl: options.fetchImpl,
    });
    return { lock: { ...floor, commit: resolution.commit, files: index.files }, resolution };
  } catch (err) {
    return {
      lock: floor,
      resolution: { commit: floor.commit, how: 'floor', why: err instanceof Error ? err.message : String(err) },
    };
  }
}
