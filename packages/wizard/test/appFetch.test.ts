import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execaSync } from 'execa';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { catalogFetchHint, fetchAppsRepo } from '../src/apps/fetch';
import { DEFAULT_APPS_REPO } from '../src/constants';
import { WizardError } from '../src/errors';

/**
 * Fetching is tested against a real git repo built on disk — no network, the
 * same way the github step already assumes a git binary. What matters: the
 * clone lands, the SHA is real, a named ref is honored, and failure is a
 * WizardError with the access hint rather than a raw git trace or a hang.
 */

let dir: string;
let repoDir: string;
const checkouts: Array<() => void> = [];

const git = (...args: string[]) =>
  execaSync('git', args, {
    cwd: repoDir,
    env: {
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@example.com',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@example.com',
    },
  });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wizard-fetch-'));
  repoDir = join(dir, 'catalog');
  mkdirSync(join(repoDir, 'apps', 'demo'), { recursive: true });
  writeFileSync(join(repoDir, 'apps', 'demo', 'app.json'), '{}');
  git('init', '-b', 'main');
  git('add', '-A');
  git('commit', '-q', '-m', 'seed');
});

afterEach(() => {
  for (const cleanup of checkouts.splice(0)) cleanup();
  rmSync(dir, { recursive: true, force: true });
});

describe('fetchAppsRepo', () => {
  it('shallow-clones and reports the commit it is at', async () => {
    const checkout = await fetchAppsRepo(repoDir);
    checkouts.push(checkout.cleanup);
    expect(checkout.sha).toMatch(/^[0-9a-f]{40}$/);
    expect(checkout.sha).toBe(git('rev-parse', 'HEAD').stdout.trim());
    expect(() => execaSync('test', ['-f', join(checkout.dir, 'apps', 'demo', 'app.json')])).not.toThrow();
  });

  it('honors a named ref', async () => {
    git('checkout', '-q', '-b', 'next');
    writeFileSync(join(repoDir, 'apps', 'demo', 'app.json'), '{"next": true}');
    git('commit', '-q', '-am', 'next');
    git('checkout', '-q', 'main');

    const checkout = await fetchAppsRepo(repoDir, 'next');
    checkouts.push(checkout.cleanup);
    expect(checkout.sha).toBe(git('rev-parse', 'next').stdout.trim());
  });

  it('cleanup removes the clone', async () => {
    const checkout = await fetchAppsRepo(repoDir);
    checkout.cleanup();
    expect(() => execaSync('test', ['-d', checkout.dir])).toThrow();
  });

  it('turns an unreachable repo into a WizardError with the access hint', async () => {
    await expect(fetchAppsRepo(join(dir, 'nowhere'))).rejects.toThrow(WizardError);
    await expect(fetchAppsRepo(join(dir, 'nowhere'))).rejects.toThrow(/Could not fetch the apps catalog/);
    await expect(fetchAppsRepo(join(dir, 'nowhere'))).rejects.toMatchObject({
      hint: expect.stringContaining('gh auth login'),
    });
  });

  it('turns an unknown ref into the same error shape', async () => {
    await expect(fetchAppsRepo(repoDir, 'no-such-branch')).rejects.toThrow(/ref no-such-branch/);
  });

  /* The official catalog answers 404 the same way a private one does, and the
     access advice is wrong for it: no login opens a repository that is not there.
     Someone who never passed --apps-repo has not overridden anything either, so
     both halves of the other hint are addressed to a different person. */
  it('does not send someone to log in when it is the official catalog that would not come down', () => {
    const hint = catalogFetchHint(DEFAULT_APPS_REPO);
    expect(hint).not.toMatch(/gh auth login|GITHUB_TOKEN/);
    expect(hint).toContain('--app');
    expect(hint).toContain('--apps-repo');
    expect(catalogFetchHint('https://example.com/someone-elses.git')).toContain('gh auth login');
  });
});
