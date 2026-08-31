import { describe, expect, it } from 'vitest';
import { cacheRoot, checksumFor, ghAssetFor, ghChecksumsUrl, ghDownloadUrl } from '../src/github/release';

/**
 * The asset table is the part of the download that cannot be checked at
 * runtime: a wrong archive downloads with a 200, unpacks, and then fails to
 * execute — which reads as a corrupt install rather than as the wrong file. So
 * the mapping is pure, and tested for every platform from whichever one is
 * running the suite.
 */
describe('ghAssetFor', () => {
  it('picks the zip on macOS, per architecture', () => {
    expect(ghAssetFor('darwin', 'arm64', '2.98.0')).toEqual({ name: 'gh_2.98.0_macOS_arm64.zip', kind: 'zip' });
    expect(ghAssetFor('darwin', 'x64', '2.98.0')).toEqual({ name: 'gh_2.98.0_macOS_amd64.zip', kind: 'zip' });
  });

  it('picks the tarball on Linux', () => {
    expect(ghAssetFor('linux', 'x64', '2.98.0')).toEqual({ name: 'gh_2.98.0_linux_amd64.tar.gz', kind: 'tar.gz' });
    expect(ghAssetFor('linux', 'arm', '2.98.0')).toEqual({ name: 'gh_2.98.0_linux_armv6.tar.gz', kind: 'tar.gz' });
  });

  it('picks the zip on Windows', () => {
    expect(ghAssetFor('win32', 'x64', '2.98.0')).toEqual({ name: 'gh_2.98.0_windows_amd64.zip', kind: 'zip' });
  });

  it('answers null rather than guessing when nothing is published', () => {
    expect(ghAssetFor('darwin', 'ia32', '2.98.0')).toBeNull();
    expect(ghAssetFor('freebsd', 'x64', '2.98.0')).toBeNull();
    expect(ghAssetFor('linux', 'ppc64', '2.98.0')).toBeNull();
  });
});

describe('the download URLs', () => {
  it('point at the tagged release', () => {
    const asset = ghAssetFor('linux', 'x64', '2.98.0')!;
    expect(ghDownloadUrl('2.98.0', asset)).toBe(
      'https://github.com/cli/cli/releases/download/v2.98.0/gh_2.98.0_linux_amd64.tar.gz',
    );
    expect(ghChecksumsUrl('2.98.0')).toBe(
      'https://github.com/cli/cli/releases/download/v2.98.0/gh_2.98.0_checksums.txt',
    );
  });
});

describe('checksumFor', () => {
  const file = [
    `${'a'.repeat(64)}  gh_2.98.0_linux_amd64.tar.gz`,
    `${'b'.repeat(64)}  gh_2.98.0_macOS_arm64.zip`,
    '',
  ].join('\n');

  it('matches on the name, not the position', () => {
    expect(checksumFor(file, 'gh_2.98.0_macOS_arm64.zip')).toBe('b'.repeat(64));
  });

  it('answers null for an asset the file does not list', () => {
    expect(checksumFor(file, 'gh_2.98.0_windows_amd64.zip')).toBeNull();
  });

  it('ignores a line whose hash is not a sha256', () => {
    expect(checksumFor('nothex  gh_2.98.0_macOS_arm64.zip', 'gh_2.98.0_macOS_arm64.zip')).toBeNull();
  });
});

describe('cacheRoot', () => {
  it('honours XDG_CACHE_HOME where the platform has one', () => {
    if (process.platform === 'win32') return;
    expect(cacheRoot({ XDG_CACHE_HOME: '/somewhere/cache' })).toBe('/somewhere/cache/chatfuel-wizard');
  });

  it('never lands on PATH', () => {
    expect(cacheRoot({})).not.toContain('/usr/local/bin');
  });
});
