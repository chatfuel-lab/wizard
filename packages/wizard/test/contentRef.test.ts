import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contentUrl, ORIGIN_ENV } from '../src/contentOrigin';
import { API_ENV, fetchContentIndex, lockForRun, REF_ENV, resolveContentRef } from '../src/contentRef';
import type { ContentLock } from '../src/contentLock';
import { WizardError } from '../src/errors';

/**
 * Which commit a run installs from, decided against a fetch that answers from
 * a table rather than from the network.
 *
 * The point of every case below is the same one: a wizard on npm follows a
 * branch, so the interesting behaviour is not the happy path but what happens
 * when the branch cannot be reached, or has moved somewhere the tarball cannot
 * follow. Both answers have to be exactly right — one silently installs old
 * content, the other silently installs somebody else's.
 */
const REPO = 'chatfuel-lab/wizard';
const FLOOR = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const API = 'https://api.github.com';

const floorLock: ContentLock = {
  repo: REPO,
  commit: FLOOR,
  wizardVersion: '0.4.0',
  files: { 'content/shell/package.json': 'Zmxvb3I=' },
};

let cache: string;
let env: NodeJS.ProcessEnv;
let asked: string[];

beforeEach(() => {
  cache = mkdtempSync(join(tmpdir(), 'chatfuel-ref-'));
  env = { CHATFUEL_WIZARD_CACHE: cache };
  asked = [];
});

afterEach(() => {
  rmSync(cache, { recursive: true, force: true });
});

/** A fetch that serves a fixed table of URLs and records what it was asked. */
function serving(table: Record<string, unknown>, status: Record<string, number> = {}) {
  return async (url: string): Promise<Response> => {
    asked.push(url);
    if (status[url]) return new Response('', { status: status[url] });
    if (!(url in table)) return new Response('', { status: 404 });
    const body = table[url];
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 });
  };
}

const commitsUrl = (ref: string) => `${API}/repos/${REPO}/commits/${encodeURIComponent(ref)}`;
const compareUrl = (from: string, to: string) => `${API}/repos/${REPO}/compare/${from}...${to}`;

const branchAt = (head: string, status: string) =>
  serving({ [commitsUrl('main')]: { sha: head }, [compareUrl(FLOOR, head)]: { status } });

describe('resolving the ref', () => {
  it('follows main and takes what the branch has moved to', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: branchAt(HEAD, 'ahead'),
    });
    expect(resolution).toEqual({ commit: HEAD, how: 'resolved' });
    /* Two requests on purpose: compare's commit list is truncated at 250 from
       the far end, so the head sha comes from the endpoint that cannot lie. */
    expect(asked).toEqual([commitsUrl('main'), compareUrl(FLOOR, HEAD)]);
  });

  it('asks nothing more when the branch is still on the floor', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: serving({ [commitsUrl('main')]: { sha: FLOOR } }),
    });
    expect(resolution).toEqual({ commit: FLOOR, how: 'resolved' });
    expect(asked).toEqual([commitsUrl('main')]);
  });

  /* The one failure that is not answered with the floor. Behind or diverged
     means the branch no longer contains the commit this wizard was built
     against — a reset, a force-push, or an origin pointed at a fork — and
     installing the floor anyway would hide that. */
  for (const status of ['behind', 'diverged'] as const) {
    it(`refuses a branch that is ${status} relative to the floor`, async () => {
      const attempt = resolveContentRef({
        pin: { repo: REPO, commit: FLOOR },
        env,
        fetchImpl: branchAt(HEAD, status),
      });
      await expect(attempt).rejects.toBeInstanceOf(WizardError);
      await expect(attempt).rejects.toThrow(new RegExp(status));
      /* And it says how to get a working install out of the situation. */
      await expect(attempt).rejects.toMatchObject({ hint: expect.stringContaining(REF_ENV) });
    });
  }

  it('falls back to the floor when the API cannot be reached', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: async () => {
        throw new Error('getaddrinfo ENOTFOUND api.github.com');
      },
    });
    expect(resolution.commit).toBe(FLOOR);
    expect(resolution.how).toBe('floor');
    expect(resolution.why).toContain('ENOTFOUND');
  });

  it('falls back to the floor when the API answers with a rate limit', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: serving({}, { [commitsUrl('main')]: 403 }),
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution.why).toContain('403');
  });

  it('reuses a resolution rather than spending two requests an hour on it', async () => {
    const fetchImpl = branchAt(HEAD, 'ahead');
    await resolveContentRef({ pin: { repo: REPO, commit: FLOOR }, env, fetchImpl });
    asked = [];
    const again = await resolveContentRef({ pin: { repo: REPO, commit: FLOOR }, env, fetchImpl });
    expect(again).toEqual({ commit: HEAD, how: 'cached' });
    expect(asked).toEqual([]);
  });

  /* A full sha is the answer already, and deliberately skips the floor check:
     naming a commit is how a run from before the floor moved is reproduced. */
  it('takes a full sha as given, without a request', async () => {
    const old = 'c'.repeat(40);
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [REF_ENV]: old },
      fetchImpl: serving({}),
    });
    expect(resolution).toEqual({ commit: old, how: 'pinned' });
    expect(asked).toEqual([]);
  });

  /* A branch named by hand is still a branch: it can be reset or force-pushed
     under the same name, which is the whole case the compare call exists for.
     Only a full sha skips it, and that one is answered above without a request
     at all — so exempting a named ref here would have let anybody turn the
     refusal off by spelling out the branch they were already on. */
  it('compares a named branch to the floor like any other', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [REF_ENV]: 'release/1.x' },
      fetchImpl: serving({
        [commitsUrl('release/1.x')]: { sha: HEAD },
        [compareUrl(FLOOR, HEAD)]: { status: 'ahead' },
      }),
    });
    expect(resolution).toEqual({ commit: HEAD, how: 'resolved' });
    expect(asked).toEqual([commitsUrl('release/1.x'), compareUrl(FLOOR, HEAD)]);
  });

  it('refuses a named branch that no longer descends from the floor', async () => {
    const attempt = resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [REF_ENV]: 'release/1.x' },
      fetchImpl: serving({
        [commitsUrl('release/1.x')]: { sha: HEAD },
        [compareUrl(FLOOR, HEAD)]: { status: 'diverged' },
      }),
    });
    await expect(attempt).rejects.toBeInstanceOf(WizardError);
    await expect(attempt).rejects.toThrow(/diverged/);
  });

  /* A mirror serves bytes, not the GitHub API. Resolving a branch against
     github and then fetching from 127.0.0.1 would name a commit the mirror
     does not hold. */
  it('stays on the floor when the origin is a mirror', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [ORIGIN_ENV]: 'http://127.0.0.1:8080' },
      fetchImpl: serving({}),
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution.why).toContain(ORIGIN_ENV);
    expect(asked).toEqual([]);
  });

  it('resolves against a mirror that brings its own API', async () => {
    const mirror = { ...env, [ORIGIN_ENV]: 'http://127.0.0.1:8080', [API_ENV]: 'http://127.0.0.1:8080/api' };
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: mirror,
      fetchImpl: serving({
        [`http://127.0.0.1:8080/api/repos/${REPO}/commits/main`]: { sha: HEAD },
        [`http://127.0.0.1:8080/api/repos/${REPO}/compare/${FLOOR}...${HEAD}`]: { status: 'ahead' },
      }),
    });
    expect(resolution).toEqual({ commit: HEAD, how: 'resolved' });
  });

  /* The API half is the mirror's, or it is nothing. On its own it would resolve
     a branch at a host the bytes are not coming from; at another host it is a
     second place this repository's name gets sent for no gain. */
  it('ignores an API with no origin beside it', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [API_ENV]: 'http://127.0.0.1:8080/api' },
      fetchImpl: branchAt(HEAD, 'ahead'),
    });
    expect(resolution).toEqual({ commit: HEAD, how: 'resolved' });
    expect(asked).toEqual([commitsUrl('main'), compareUrl(FLOOR, HEAD)]);
  });

  it('refuses an API that is not on the origin, and stays on the floor', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [ORIGIN_ENV]: 'http://127.0.0.1:8080', [API_ENV]: 'https://example.invalid/api' },
      fetchImpl: serving({}),
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution.why).toContain(API_ENV);
    expect(asked).toEqual([]);
  });

  it('refuses an API that is not http or https', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, [ORIGIN_ENV]: 'http://127.0.0.1:8080', [API_ENV]: 'ftp://127.0.0.1:8080/api' },
      fetchImpl: serving({}),
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution.why).toContain('scheme');
  });

  /* The repository is public and read anonymously. A token in the environment
     is the user's own — `gh auth login`, or CI's — and the API this run talks
     to is whatever the mirror named, so it must never travel. */
  it('sends no credential, whatever the environment is carrying', async () => {
    let sent: Record<string, string> | undefined;
    await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env: { ...env, GITHUB_TOKEN: 'ghp_secret', GH_TOKEN: 'gho_secret' },
      fetchImpl: async (url, init) => {
        sent = init?.headers;
        return branchAt(HEAD, 'ahead')(url);
      },
    });
    expect(sent).toEqual({ accept: 'application/vnd.github+json' });
  });

  /* The refusal above is a fact about the repository; every other failure is a
     fact about this machine, and the difference has to be carried by the error
     rather than by whether somebody wrote a hint next to it. */
  it('still falls back when a failure deeper down arrives with a hint', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: async () => {
        throw new WizardError('the proxy ate it', 'Check HTTPS_PROXY.');
      },
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution.why).toContain('the proxy ate it');
  });

  it('refuses an answer that is not a commit sha', async () => {
    const resolution = await resolveContentRef({
      pin: { repo: REPO, commit: FLOOR },
      env,
      fetchImpl: serving({ [commitsUrl('main')]: { sha: 'refs/heads/main' } }),
    });
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
  });
});

describe('the index at the resolved commit', () => {
  const indexUrl = (commit: string) => contentUrl({ repo: REPO, commit }, 'content.index.json', {});
  const index = { files: { 'content/shell/package.json': 'aGVhZA==' } };

  it('is read from the commit itself', async () => {
    const held = await fetchContentIndex({
      pin: { repo: REPO, commit: HEAD },
      env,
      fetchImpl: serving({ [indexUrl(HEAD)]: index }),
    });
    expect(held).toEqual(index);
  });

  it('refuses a body that is not an index', async () => {
    const attempt = fetchContentIndex({
      pin: { repo: REPO, commit: HEAD },
      env,
      fetchImpl: serving({ [indexUrl(HEAD)]: { files: [1, 2] } }),
    });
    await expect(attempt).rejects.toThrow(/lists no files/);
  });

  it('refuses a path whose digest is not a digest', async () => {
    const attempt = fetchContentIndex({
      pin: { repo: REPO, commit: HEAD },
      env,
      fetchImpl: serving({ [indexUrl(HEAD)]: { files: { 'content/shell/package.json': 7 } } }),
    });
    await expect(attempt).rejects.toThrow(/has no digest for content\/shell\/package\.json/);
  });

  /* The keys of this map are joined onto the cache directory before anything
     builds a URL out of them, so a key that climbs out of the content tree is
     an arbitrary read on the machine that fetched it. It came off a branch,
     which is exactly the reason to check it here rather than downstream. */
  it('refuses a key that climbs out of the content tree', async () => {
    const attempt = fetchContentIndex({
      pin: { repo: REPO, commit: HEAD },
      env,
      fetchImpl: serving({ [indexUrl(HEAD)]: { files: { '../../../../etc/shadow': 'aGVhZA==' } } }),
    });
    await expect(attempt).rejects.toThrow(WizardError);
    await expect(attempt).rejects.toThrow(/Not a path inside the content tree/);
  });
});

describe('the lock a run works from', () => {
  const indexUrl = (commit: string) => contentUrl({ repo: REPO, commit }, 'content.index.json', {});
  const headFiles = { 'content/shell/package.json': 'aGVhZA==', 'content/modules/new/module.json': 'bmV3' };

  it('is the resolved commit and its own digests', async () => {
    const { lock, resolution } = await lockForRun({
      floor: floorLock,
      env,
      fetchImpl: serving({
        [commitsUrl('main')]: { sha: HEAD },
        [compareUrl(FLOOR, HEAD)]: { status: 'ahead' },
        [indexUrl(HEAD)]: { files: headFiles },
      }),
    });
    expect(resolution.how).toBe('resolved');
    expect(lock.commit).toBe(HEAD);
    expect(lock.files).toEqual(headFiles);
    /* Everything else is the tarball's: the repo it fetches from and the
       version that will be written into the app's own lock. */
    expect(lock.repo).toBe(floorLock.repo);
    expect(lock.wizardVersion).toBe(floorLock.wizardVersion);
  });

  /* A commit can resolve and still have no index — content committed without
     `pnpm content-index`. That is a broken commit, not a broken machine, and
     the run that meets it installs what the wizard shipped with. */
  it('is the floor when the resolved commit has no index', async () => {
    const { lock, resolution } = await lockForRun({
      floor: floorLock,
      env,
      fetchImpl: serving({ [commitsUrl('main')]: { sha: HEAD }, [compareUrl(FLOOR, HEAD)]: { status: 'ahead' } }),
    });
    expect(lock).toEqual(floorLock);
    expect(resolution.how).toBe('floor');
    expect(resolution.why).toContain('content.index.json');
  });

  /* And the run that meets one installs the tarball's content rather than
     failing: the same fallback a missing index gets, for the same reason. */
  it('is the floor when the resolved commit lists a path outside the tree', async () => {
    const { lock, resolution } = await lockForRun({
      floor: floorLock,
      env,
      fetchImpl: serving({
        [commitsUrl('main')]: { sha: HEAD },
        [compareUrl(FLOOR, HEAD)]: { status: 'ahead' },
        [indexUrl(HEAD)]: { files: { '../../../../etc/shadow': 'aGVhZA==' } },
      }),
    });
    expect(lock).toEqual(floorLock);
    expect(resolution.how).toBe('floor');
    expect(resolution.why).toContain('Not a path inside the content tree');
  });

  it('is the floor, untouched, when the branch has not moved', async () => {
    const { lock } = await lockForRun({
      floor: floorLock,
      env,
      fetchImpl: serving({ [commitsUrl('main')]: { sha: FLOOR } }),
    });
    expect(lock).toBe(floorLock);
  });
});
