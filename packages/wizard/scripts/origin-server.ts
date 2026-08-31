import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

/**
 * A content origin backed by this repository's own git objects.
 *
 * Everything that fetches pinned content is tested against this rather than
 * against GitHub. It answers from `git show <sha>:<path>`, so it can serve any
 * commit that exists locally — including one made seconds ago by a test, which
 * is what makes an update scenario (generate an app, push a fix upstream, ask
 * the wizard to update) something a test can act out at all. It also gives the
 * one thing a real origin cannot: a byte that can be corrupted on purpose, to
 * prove the digest check catches it.
 *
 * URL shape is the same as the real one: `/<owner>/<name>/<sha>/<path>`.
 *
 * Under `/api` it also answers the two GitHub endpoints a run uses to turn a
 * branch into a commit, so the dynamic path can be acted out end to end: make
 * a commit, and the wizard follows it here exactly as it would follow `main`
 * on github.com. Pass that prefix as CHATFUEL_CONTENT_API.
 */
const run = promisify(execFile);

const FULL_SHA = /^[0-9a-f]{40}$/;

export interface OriginServer {
  /** Origin only — pass it as CHATFUEL_CONTENT_ORIGIN. */
  readonly url: string;
  /** Every path asked for, in order, so a test can prove a cache was used. */
  readonly requests: string[];
  /** Paths to answer 404 for, or to answer with these bytes instead of git's. */
  readonly overrides: Map<string, Buffer | null>;
  close(): Promise<void>;
}

export interface OriginServerOptions {
  /** `owner/name`, matched against the request path. */
  repo: string;
  /** A checkout holding the objects to serve. */
  cwd: string;
}

async function blob(cwd: string, sha: string, path: string): Promise<Buffer | null> {
  try {
    // `cat-file blob` and not `show`: `show` prints a listing for a directory,
    // where the real origin answers 404.
    const { stdout } = await run('git', ['cat-file', 'blob', `${sha}:${path}`], {
      cwd,
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  } catch {
    // A missing path, a missing commit and a path that is a directory all land
    // here, and the caller has no use for the difference: none of them is a file.
    return null;
  }
}

/** The commit a ref names, or null if this checkout does not have it. */
async function commitOf(cwd: string, ref: string): Promise<string | null> {
  try {
    const { stdout } = await run('git', ['rev-parse', `${ref}^{commit}`], { cwd, encoding: 'utf8' });
    const sha = stdout.trim();
    return FULL_SHA.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

const ancestor = async (cwd: string, of: string, to: string): Promise<boolean> => {
  try {
    await run('git', ['merge-base', '--is-ancestor', of, to], { cwd });
    return true;
  } catch {
    return false;
  }
};

/** What GitHub's compare endpoint would call the relationship between two commits. */
async function compareStatus(cwd: string, from: string, to: string): Promise<string> {
  if (from === to) return 'identical';
  if (await ancestor(cwd, from, to)) return 'ahead';
  if (await ancestor(cwd, to, from)) return 'behind';
  return 'diverged';
}

export function startOriginServer(options: OriginServerOptions): Promise<OriginServer> {
  const requests: string[] = [];
  const overrides = new Map<string, Buffer | null>();

  const server: Server = createServer((req, res) => {
    const refuse = () => {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    };

    /* `%zz` makes decodeURIComponent throw, and a throw inside this handler
       kills the process — which pack-smoke runs in the background, where a dead
       server reads as a hang rather than as an error. */
    let decoded: string;
    try {
      decoded = decodeURIComponent((req.url ?? '').split('?')[0]!);
    } catch {
      return refuse();
    }
    const answer = (body: unknown) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    const api = decoded.startsWith(`/api/repos/${options.repo}/`)
      ? decoded.slice(`/api/repos/${options.repo}/`.length)
      : null;
    if (api !== null) {
      requests.push(`api/${api}`);
      const compared = /^compare\/([^/]+)\.\.\.([^/]+)$/.exec(api);
      if (compared) {
        void compareStatus(options.cwd, compared[1]!, compared[2]!).then((status) => answer({ status }));
        return;
      }
      const named = /^commits\/(.+)$/.exec(api);
      if (!named) return refuse();
      void commitOf(options.cwd, named[1]!).then((sha) => (sha ? answer({ sha }) : refuse()));
      return;
    }

    const parts = decoded.replace(/^\//, '').split('/');
    const [owner, name, sha, ...rest] = parts;
    const path = rest.join('/');

    if (`${owner}/${name}` !== options.repo || !sha || !FULL_SHA.test(sha) || path === '') return refuse();
    // git refuses a path that leaves the tree on its own, so this changes no
    // answer — it keeps an attacker-shaped string from reaching a subprocess
    // argument at all, which is the part that would not survive a change of
    // backend.
    if (rest.some((segment) => segment === '..' || segment === '')) return refuse();

    requests.push(path);
    const override = overrides.get(path);
    if (override !== undefined) {
      if (override === null) return refuse();
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      return res.end(override);
    }

    void blob(options.cwd, sha, path).then((bytes) => {
      if (!bytes) return refuse();
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(bytes);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        requests,
        overrides,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

/**
 * Standalone, for a caller that cannot share an event loop with it.
 *
 * `pack-smoke` drives the packaged wizard through `execFileSync`, which blocks
 * the process it runs in — a server living there would accept the connection
 * and answer it only once the child it is serving had already given up. So it
 * runs as its own process and says where it is on the first line of stdout.
 *
 *   node origin-server.ts <owner/name> <checkout>
 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repo, cwd] = process.argv.slice(2);
  if (!repo || !cwd) {
    console.error('usage: origin-server.ts <owner/name> <checkout>');
    process.exit(2);
  }
  const server = await startOriginServer({ repo, cwd });
  console.log(server.url);
}
