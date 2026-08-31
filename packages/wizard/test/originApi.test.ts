import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startOriginServer, type OriginServer } from '../scripts/origin-server';
import { API_ENV, resolveContentRef } from '../src/contentRef';
import { ORIGIN_ENV } from '../src/contentOrigin';
import { WizardError } from '../src/errors';

/**
 * Following a branch, against real git rather than against a table.
 *
 * contentRef.test.ts fixes the API's answers and checks what the wizard does
 * with them; this fixes nothing and checks that the answers themselves are the
 * ones GitHub would give. A branch is really moved, a fork is really made, and
 * the run really lands on the commit somebody pushed — which is the behaviour
 * the whole design exists for, and the one no mocked fetch can demonstrate.
 */
const REPO = 'chatfuel-lab/origin-api';

let repo: string;
let cache: string;
let server: OriginServer;
let first: string;
let head: string;
let forked: string;

const git = (...args: string[]): string =>
  execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' },
  }).trim();

function commit(message: string): string {
  writeFileSync(join(repo, 'file.txt'), `${message}\n`);
  git('add', 'file.txt');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-m', message);
  return git('rev-parse', 'HEAD');
}

beforeAll(async () => {
  repo = mkdtempSync(join(tmpdir(), 'chatfuel-origin-'));
  cache = mkdtempSync(join(tmpdir(), 'chatfuel-origin-cache-'));
  git('init', '-q', '-b', 'main');
  first = commit('one');
  head = commit('two');
  /* A branch that left the line the floor is on: a force-push, seen from the
     only side a published wizard can see it from. */
  git('checkout', '-q', '-b', 'forked', first);
  forked = commit('elsewhere');
  git('checkout', '-q', 'main');
  server = await startOriginServer({ repo: REPO, cwd: repo });
});

afterAll(async () => {
  await server.close();
  rmSync(repo, { recursive: true, force: true });
  rmSync(cache, { recursive: true, force: true });
});

const api = (path: string) => `${server.url}/api/repos/${REPO}/${path}`;

describe('the API half of the origin', () => {
  it('turns a branch name into the commit it points at', async () => {
    const response = await fetch(api('commits/main'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sha: head });
  });

  it('answers 404 for a ref this checkout does not have', async () => {
    expect((await fetch(api('commits/no-such-branch'))).status).toBe(404);
  });

  it('names the relationship the way compare does', async () => {
    const status = async (from: string, to: string) =>
      ((await (await fetch(api(`compare/${from}...${to}`))).json()) as { status: string }).status;
    expect(await status(first, head)).toBe('ahead');
    expect(await status(head, first)).toBe('behind');
    expect(await status(head, head)).toBe('identical');
    expect(await status(head, forked)).toBe('diverged');
  });
});

describe('a run following that branch', () => {
  const env = () => ({
    CHATFUEL_WIZARD_CACHE: mkdtempSync(join(cache, 'run-')),
    [ORIGIN_ENV]: server.url,
    [API_ENV]: `${server.url}/api`,
  });

  it('lands on the commit the branch was moved to', async () => {
    const resolution = await resolveContentRef({ pin: { repo: REPO, commit: first }, env: env() });
    expect(resolution).toEqual({ commit: head, how: 'resolved' });
  });

  /* The floor doing its job. This wizard was published against a commit that
     the branch no longer descends from, so there is no content here it can
     honestly install — and saying so beats silently serving the old one. */
  it('refuses a branch that no longer descends from its floor', async () => {
    const attempt = resolveContentRef({ pin: { repo: REPO, commit: forked }, env: env() });
    await expect(attempt).rejects.toBeInstanceOf(WizardError);
    await expect(attempt).rejects.toThrow(/diverged/);
  });
});
