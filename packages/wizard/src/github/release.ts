import { createHash, randomBytes } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { onInterrupt } from '../interrupt';
import { outboundFetch } from '../net';

/**
 * The GitHub CLI without a package manager.
 *
 * Every other route to `gh` on a machine that does not have it needs either a
 * package manager the person happens to have (Homebrew, winget, scoop) or
 * `sudo` — and escalating to sudo on somebody's behalf is a line the wizard
 * does not cross anywhere else (see installAgent in agents.ts). What is left is
 * the release the GitHub CLI team publishes: one archive, no privileges, into a
 * cache directory this process owns.
 *
 * The archive is checked against the checksums file published beside it before
 * anything is unpacked. A binary fetched over the network and then run is the
 * one download in this wizard where "probably fine" is not good enough.
 *
 * That check runs on EVERY use, not only on the download. What the cache holds
 * is the archive, and the digest it is measured against is fetched from the
 * release each time — because a cache entry is a file in a directory anything
 * else on this machine can write, and the wizard hands the binary a GitHub
 * token. A cached path that is merely present proves nothing about its
 * contents; a sha256 that still matches the published one does. The extracted
 * binary is rewritten from those verified bytes each run, so a swapped `gh` is
 * replaced rather than executed. contentStore.ts re-checks its cache the same
 * way and for the same reason.
 */

/** The upstream repository the official binaries come from. */
const GH_REPO = 'cli/cli';

export type ArchiveKind = 'tar.gz' | 'zip';

export interface GhAsset {
  /** Exact release asset file name. */
  name: string;
  kind: ArchiveKind;
}

/**
 * Which release asset this machine needs, or null when the CLI publishes none
 * for it — a null is the answer, not a guess: a wrong archive downloads fine
 * and then fails to execute, which reads like a corrupt install.
 *
 * Kept pure and exported so the table can be tested on every platform from any
 * one of them.
 */
export function ghAssetFor(platform: string, arch: string, version: string): GhAsset | null {
  if (platform === 'darwin') {
    const cpu = { x64: 'amd64', arm64: 'arm64' }[arch];
    return cpu ? { name: `gh_${version}_macOS_${cpu}.zip`, kind: 'zip' } : null;
  }
  if (platform === 'linux') {
    const cpu = { x64: 'amd64', arm64: 'arm64', ia32: '386', arm: 'armv6' }[arch];
    return cpu ? { name: `gh_${version}_linux_${cpu}.tar.gz`, kind: 'tar.gz' } : null;
  }
  if (platform === 'win32') {
    const cpu = { x64: 'amd64', arm64: 'arm64', ia32: '386' }[arch];
    return cpu ? { name: `gh_${version}_windows_${cpu}.zip`, kind: 'zip' } : null;
  }
  return null;
}

export const ghDownloadUrl = (version: string, asset: GhAsset): string =>
  `https://github.com/${GH_REPO}/releases/download/v${version}/${asset.name}`;

export const ghChecksumsUrl = (version: string): string =>
  `https://github.com/${GH_REPO}/releases/download/v${version}/gh_${version}_checksums.txt`;

/**
 * The sha256 the checksums file claims for one asset.
 *
 * The file is `<hex>  <name>` per line. Matched on the name rather than by
 * position, because the order of the assets is the release tooling's business
 * and not a contract.
 */
export function checksumFor(checksums: string, assetName: string): string | null {
  for (const line of checksums.split('\n')) {
    const [hex, name] = line.trim().split(/\s+/);
    if (name === assetName && /^[0-9a-f]{64}$/.test(hex)) return hex;
  }
  return null;
}

/** Where downloaded tools live. Per-user, never on PATH, safe to delete. */
export function cacheRoot(env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === 'win32') {
    return join(env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'chatfuel-wizard', 'cache');
  }
  return join(env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'chatfuel-wizard');
}

const binaryName = (): string => (process.platform === 'win32' ? 'gh.exe' : 'gh');

/** The extracted archives nest the binary differently per platform — find it. */
function findBinary(dir: string, depth = 0): string | null {
  if (depth > 4) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findBinary(full, depth + 1);
      if (found) return found;
    } else if (entry.isFile() && entry.name === binaryName()) {
      return full;
    }
  }
  return null;
}

/** The newest published version, without the `v`. */
export async function latestGhVersion(): Promise<string> {
  const response = await outboundFetch(`https://api.github.com/repos/${GH_REPO}/releases/latest`, {
    headers: { accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`the release feed answered ${response.status}`);
  const body = (await response.json()) as { tag_name?: string };
  const version = (body.tag_name ?? '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('the release feed named no version');
  return version;
}

/** The cached archive, if it is still byte for byte what the release publishes. */
function verifiedArchive(path: string, expected: string): Buffer | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const bytes = readFileSync(path);
    return createHash('sha256').update(bytes).digest('hex') === expected ? bytes : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Written under a temporary name and renamed, so a killed run leaves no half
 * file to be trusted next time.
 *
 * The name is random rather than the pid: this writes an executable, and a
 * predictable path is one somebody else on the machine can create first — as a
 * symlink to a file of theirs, which the write would then follow and the rename
 * would install as `gh`.
 */
function writeAtomic(target: string, write: (temp: string) => void): void {
  const temp = `${target}.${randomBytes(8).toString('hex')}.part`;
  try {
    write(temp);
    renameSync(temp, target);
  } finally {
    rmSync(temp, { force: true });
  }
}

async function download(url: string): Promise<Buffer> {
  const response = await outboundFetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Put the official `gh` binary under the cache directory and hand back its
 * absolute path, or null when this platform has no published build.
 *
 * `tar` does the unpacking for both archive kinds: it is on macOS and Linux by
 * definition, and Windows 10 and later ship bsdtar as `tar.exe`, which reads
 * zip. That is one dependency instead of a zip implementation in here.
 */
export async function installGhFromRelease(): Promise<string | null> {
  const version = await latestGhVersion();
  const asset = ghAssetFor(process.platform, process.arch, version);
  if (!asset) return null;

  const home = join(cacheRoot(), 'gh', version);
  const cached = join(home, binaryName());
  const cachedArchive = join(home, asset.name);

  // The checksums file is a few kilobytes and the version lookup above already
  // needed the network, so asking for the published digest costs nothing that
  // was not already being spent — and it is the only thing on this machine that
  // has not been sitting where somebody else could edit it.
  const checksums = (await download(ghChecksumsUrl(version))).toString('utf8');
  const expected = checksumFor(checksums, asset.name);
  if (!expected) throw new Error(`the checksums file does not list ${asset.name}`);

  let archive = verifiedArchive(cachedArchive, expected);
  if (!archive) {
    rmSync(cachedArchive, { force: true });
    archive = await download(ghDownloadUrl(version, asset));
    const actual = createHash('sha256').update(archive).digest('hex');
    if (actual !== expected) throw new Error(`${asset.name} does not match its published checksum`);
    mkdirSync(home, { recursive: true });
    const bytes = archive;
    writeAtomic(cachedArchive, (temp) => writeFileSync(temp, bytes));
  }

  /* The name has to be unguessable, not merely unique. Version and pid make a
     path anyone on the machine can predict, and a world-writable /tmp lets them
     create it first - as a symlink, or as a directory holding a `gh` of their
     own for `findBinary` to pick up and `chmod 0755`. `mkdtempSync` fails rather
     than adopts when the path already exists, and creates it 0700. */
  const staging = mkdtempSync(join(tmpdir(), 'chatfuel-gh-'));
  // Ctrl+C during the download or the extract does not unwind. See ../interrupt.
  const releaseStaging = onInterrupt(() => rmSync(staging, { recursive: true, force: true }));
  try {
    const archivePath = join(staging, asset.name);
    writeFileSync(archivePath, archive);
    await execa('tar', ['-xf', archivePath, '-C', staging], { timeout: 5 * 60_000 });
    const extracted = findBinary(staging);
    if (!extracted) throw new Error('the archive contained no gh binary');
    mkdirSync(home, { recursive: true });
    /* Rewritten from the verified archive on every run, so whatever was at this
       path is replaced rather than trusted. Copied into the cache and renamed
       there: the staging directory is in the temp filesystem, which is not
       always the same device, and a cross-device rename fails with EXDEV. */
    writeAtomic(cached, (temp) => {
      copyFileSync(extracted, temp);
      chmodSync(temp, 0o755);
    });
  } finally {
    releaseStaging();
    rmSync(staging, { recursive: true, force: true });
  }

  if (!statSync(cached).size) throw new Error('the extracted gh binary is empty');
  return cached;
}
