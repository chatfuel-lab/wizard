import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveContentSource, type ContentSource } from '../src/content';
import type { ContentLock } from '../src/contentLock';
import { contentUrl } from '../src/contentOrigin';
import { digestOf } from '../src/lockFormat';

/**
 * What a run installs from once the branch has been resolved.
 *
 * The interesting case is the one in the middle: the API answered, the index
 * came back, and only then did the network go. A run that got that far has a
 * working install in its hands — the floor — and stopping there would be a run
 * that refuses to do offline what it does offline every day.
 */
const REPO = 'chatfuel-lab/wizard';
const FLOOR = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const API = 'https://api.github.com';

const MANIFEST = 'content/modules/new/module.json';
const MANIFEST_BODY = '{}\n';

const floorLock: ContentLock = {
  repo: REPO,
  commit: FLOOR,
  wizardVersion: '0.4.0',
  files: { 'content/shell/package.json': 'Zmxvb3I=' },
};

/** Only `lock` and `root` decide anything below; the rest is the interface. */
const sourceOf = (lock: ContentLock): ContentSource => ({
  root: '/floor',
  packaged: true,
  lock,
  modulePath: (id, ...rest) => join('/floor', 'content', 'modules', id, ...rest),
  vendorPath: (name, ...rest) => join('/floor', 'content', name, ...rest),
  shellPath: (...rest) => join('/floor', 'content', 'shell', ...rest),
  skillPath: (name, ...rest) => join('/floor', 'content', 'skills', name, ...rest),
  schemaPath: (...rest) => join('/floor', 'content', 'schema', ...rest),
  codegenPath: (...rest) => join('/floor', 'content', 'codegen', ...rest),
});

let cache: string;
let env: NodeJS.ProcessEnv;

beforeEach(() => {
  cache = mkdtempSync(join(tmpdir(), 'chatfuel-content-'));
  env = { CHATFUEL_WIZARD_CACHE: cache };
});

afterEach(() => {
  rmSync(cache, { recursive: true, force: true });
});

/** Resolves `main` to HEAD and serves an index that adds one module manifest. */
function serving(manifest: Response | (() => never)) {
  const table: Record<string, unknown> = {
    [`${API}/repos/${REPO}/commits/main`]: { sha: HEAD },
    [`${API}/repos/${REPO}/compare/${FLOOR}...${HEAD}`]: { status: 'ahead' },
    [contentUrl({ repo: REPO, commit: HEAD }, 'content.index.json', {})]: {
      files: { ...floorLock.files, [MANIFEST]: digestOf(Buffer.from(MANIFEST_BODY)) },
    },
  };
  return async (url: string): Promise<Response> => {
    if (url === contentUrl({ repo: REPO, commit: HEAD }, MANIFEST, {})) {
      if (typeof manifest === 'function') manifest();
      return manifest as Response;
    }
    if (!(url in table)) return new Response('', { status: 404 });
    return new Response(JSON.stringify(table[url]), { status: 200 });
  };
}

describe('the source a run installs from', () => {
  it('is the floor when a manifest on the resolved commit cannot be fetched', async () => {
    const { content, resolution } = await resolveContentSource(sourceOf(floorLock), {
      env,
      fetchImpl: serving(new Response('', { status: 503 })),
    });
    expect(content.root).toBe('/floor');
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution?.why).toContain('HTTP 503');
  });

  it('is the floor when the network goes between the index and the manifest', async () => {
    const { content, resolution } = await resolveContentSource(sourceOf(floorLock), {
      env,
      fetchImpl: serving(() => {
        throw new Error('getaddrinfo ENOTFOUND raw.githubusercontent.com');
      }),
    });
    expect(content.root).toBe('/floor');
    expect(resolution).toMatchObject({ commit: FLOOR, how: 'floor' });
    expect(resolution?.why).toContain('Could not reach');
  });

  it('is the resolved commit when every manifest arrives', async () => {
    const { content, resolution } = await resolveContentSource(sourceOf(floorLock), {
      env,
      fetchImpl: serving(new Response(MANIFEST_BODY, { status: 200 })),
    });
    expect(resolution).toMatchObject({ commit: HEAD, how: 'resolved' });
    expect(content.root).toBe(join(cache, HEAD));
    expect(content.lock?.files).toHaveProperty(MANIFEST);
  });

  /* No lock is a repo checkout: it is pinned to nothing, and the files being
     edited are the point of running it there. */
  it('is left alone when there is no lock to resolve against', async () => {
    const source = { ...sourceOf(floorLock), lock: undefined };
    const { content, resolution } = await resolveContentSource(source, { env });
    expect(content).toBe(source);
    expect(resolution).toBeNull();
  });
});
