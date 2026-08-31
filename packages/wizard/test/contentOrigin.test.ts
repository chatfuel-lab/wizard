import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startOriginServer, type OriginServer } from '../scripts/origin-server';
import { contentBase, contentUrl, ORIGIN_ENV, resolveOrigin } from '../src/contentOrigin';
import { scrub } from '../src/log';

const CONTENT_REPO = 'chatfuel-lab/wizard';

const COMMIT = 'a'.repeat(40);
const pin = { repo: CONTENT_REPO, commit: COMMIT };
const at = (origin?: string) => (origin === undefined ? {} : { [ORIGIN_ENV]: origin });

describe('the origin', () => {
  it('is raw.githubusercontent when nothing overrides it', () => {
    expect(resolveOrigin(at())).toBe('https://raw.githubusercontent.com');
    expect(contentUrl(pin, 'content/modules/core/module.json', at())).toBe(
      `https://raw.githubusercontent.com/${CONTENT_REPO}/${COMMIT}/content/modules/core/module.json`,
    );
  });

  it('is whatever the environment names, without its trailing slash', () => {
    expect(contentBase(pin, at('http://127.0.0.1:8080/'))).toBe(`http://127.0.0.1:8080/${CONTENT_REPO}/${COMMIT}`);
    expect(contentBase(pin, at('https://mirror.example//'))).toBe(`https://mirror.example/${CONTENT_REPO}/${COMMIT}`);
  });

  /* `file:` reads like it ought to work — a mirror is a directory, after all —
     which is why it is named here: Node's fetch does not implement it, and an
     origin the wizard accepts and then cannot download from is worse than one
     it refuses on sight. */
  it('refuses a scheme nothing can fetch, and a value that is not a URL at all', () => {
    expect(() => resolveOrigin(at('file:///srv/mirror'))).toThrow(/unsupported scheme/);
    expect(() => resolveOrigin(at('ftp://mirror.example'))).toThrow(/unsupported scheme/);
    expect(() => resolveOrigin(at('mirror.example'))).toThrow(/not a URL/);
  });

  /* An abbreviated sha is resolved by whoever holds the objects, so two servers
     can disagree about what it names. A pin that can drift is not a pin. */
  /* The origin is printed back at the user the moment a download fails, and a
     mirror behind basic auth carries its password in it. Same treatment the
     proxy URL gets, for the same reason. */
  it('masks a password carried in the origin, before anything can print it', () => {
    const secret = 'sup3rsecretpassword';
    resolveOrigin(at(`https://mirror:${secret}@mirror.invalid/`));
    expect(scrub(`Could not reach https://mirror:${secret}@mirror.invalid/x`)).not.toContain(secret);
  });

  /* Where a token IS the username: `https://<token>@mirror.invalid`, the shape
     a corporate mirror and a corporate proxy both hand out. Registering only
     the password left this one printed in full. */
  it('masks a credential that sits in the username instead', () => {
    const secret = 'mirror-token-000111222';
    resolveOrigin(at(`https://${secret}@mirror.invalid/`));
    expect(scrub(`Could not reach https://${secret}@mirror.invalid/x`)).not.toContain(secret);
  });

  it('refuses anything but a full sha', () => {
    expect(() => contentBase({ repo: CONTENT_REPO, commit: 'a1b2c3d' }, at())).toThrow(/full commit sha/);
    expect(() => contentBase({ repo: 'not-a-repo', commit: COMMIT }, at())).toThrow(/repository name/);
  });

  it('refuses a path that could leave the pinned tree', () => {
    for (const path of ['../secrets', 'apps/../../etc/passwd', '/etc/passwd', '', 'apps//shell']) {
      expect(() => contentUrl(pin, path, at())).toThrow(/inside the content tree/);
    }
  });

  it('encodes what a path may legally contain', () => {
    expect(contentUrl(pin, 'content/shell/a b.txt', at())).toContain('/content/shell/a%20b.txt');
  });
});

describe('the local origin server', () => {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  let origin: OriginServer;

  beforeAll(async () => {
    origin = await startOriginServer({ repo: CONTENT_REPO, cwd: repoRoot });
  });
  afterAll(() => origin.close());

  const get = (path: string, sha = head) => fetch(`${origin.url}/${CONTENT_REPO}/${sha}/${path}`);

  it('serves a file out of the commit it was asked for', async () => {
    const res = await get('content/modules/core/module.json');
    expect(res.status).toBe(200);
    expect(JSON.parse(await res.text())).toMatchObject({ id: 'core' });
  });

  it('answers 404 for a path the commit does not hold, and for a commit it does not have', async () => {
    expect((await get('content/modules/core/nothing-here.json')).status).toBe(404);
    expect((await get('content/modules/core/module.json', 'b'.repeat(40))).status).toBe(404);
  });

  it('answers 404 for a directory, which is not a file however real it is', async () => {
    expect((await get('content/modules/core')).status).toBe(404);
  });

  /* It stands in for an origin that cannot be walked out of. One that could
     would make every fetcher test weaker than the thing it is testing.

     Percent-encoded, because `fetch` resolves a literal `..` away before the
     request leaves — so a plain one would prove nothing about the server, and
     an origin that decodes before it joins is exactly where this bites. */
  it('refuses a traversal that survives to the wire, and a sha that is not one', async () => {
    expect((await get('%2e%2e/%2e%2e/etc/passwd')).status).toBe(404);
    expect((await get('content/modules/core/module.json', 'HEAD')).status).toBe(404);
  });

  /* A handler that throws takes the process with it, and pack-smoke runs this
     server in the background — where a dead one reads as a hang. The second
     request is the point of the test: the server is still there. */
  it('survives a percent-escape that is not one', async () => {
    expect((await get('content/modules/%zz/module.json')).status).toBe(404);
    expect((await get('content/modules/core/module.json')).status).toBe(200);
  });

  it('answers 404 when the repository in the path is not the one it serves', async () => {
    expect((await fetch(`${origin.url}/someone/else/${head}/content/modules/core/module.json`)).status).toBe(404);
  });

  it('records what was asked for, so a test can prove a second run used a cache', async () => {
    origin.requests.length = 0;
    await get('content/modules/core/module.json');
    expect(origin.requests).toEqual(['content/modules/core/module.json']);
  });
});
