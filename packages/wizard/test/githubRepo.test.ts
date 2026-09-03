import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContext } from '../src/run';
import { forbiddenPaths, prepareLocalRepo, secretValues } from '../src/github/repo';
import type { WizardContext } from '../src/context';

/**
 * The one failure mode in this feature that cannot be walked back: a Chatfuel
 * token pushed to GitHub. Everything else here is a bad afternoon; that is a
 * rotated credential and somebody's bot in a stranger's hands.
 *
 * So this suite runs the real thing — real git, real files, real index — and
 * asserts the refusal, not the happy path. The prompts are the only mock; git
 * is deliberately not, because a mocked `git ls-files` proves nothing about
 * what a real one would have staged.
 *
 * Both git config layers are pointed at /dev/null so the machine running the
 * suite cannot make it pass or fail: no inherited identity, no commit signing,
 * no ignore file from somebody's home directory.
 */
vi.mock('@clack/prompts', () => ({
  confirm: () => Promise.resolve(true),
  text: (opts: { message: string }) =>
    Promise.resolve(opts.message.toLowerCase().includes('email') ? 'wizard@example.com' : 'Wizard'),
  select: (opts: { initialValue?: unknown }) => Promise.resolve(opts.initialValue),
  isCancel: (value: unknown) => typeof value === 'symbol',
  note: () => undefined,
  password: () => Promise.resolve(''),
  intro: () => undefined,
  outro: () => undefined,
  log: {
    info: (m: string) => lines.push(m),
    warn: (m: string) => lines.push(m),
    error: (m: string) => lines.push(m),
    success: () => undefined,
    message: (m: string) => lines.push(m),
  },
  spinner: () => ({ start: () => undefined, message: () => undefined, stop: () => undefined, error: () => undefined }),
}));

const TOKEN = 'f'.repeat(64);
const lines: string[] = [];
let appDir: string;
const savedGlobal = process.env.GIT_CONFIG_GLOBAL;
const savedSystem = process.env.GIT_CONFIG_SYSTEM;

const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function context(): WizardContext {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false });
  ctx.answers.mode = 'standalone';
  ctx.answers.appDir = appDir;
  ctx.answers.token = TOKEN;
  return ctx;
}

/** A scaffold, as the wizard leaves it: a token on disk and a rule hiding it. */
function scaffold(ignore: string): void {
  writeFileSync(join(appDir, '.gitignore'), ignore);
  writeFileSync(join(appDir, '.env'), `CHATFUEL_TOKEN=${TOKEN}\n`);
  writeFileSync(join(appDir, '.env.example'), '# CHATFUEL_TOKEN=\n');
  writeFileSync(join(appDir, 'package.json'), '{ "name": "app" }\n');
  mkdirSync(join(appDir, 'src'), { recursive: true });
  writeFileSync(join(appDir, 'src', 'main.ts'), 'export const app = true;\n');
}

beforeEach(() => {
  appDir = mkdtempSync(join(tmpdir(), 'wizard-repo-'));
  lines.length = 0;
  process.env.GIT_CONFIG_GLOBAL = devNull;
  process.env.GIT_CONFIG_SYSTEM = devNull;
});

afterEach(() => {
  rmSync(appDir, { recursive: true, force: true });
  if (savedGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
  else process.env.GIT_CONFIG_GLOBAL = savedGlobal;
  if (savedSystem === undefined) delete process.env.GIT_CONFIG_SYSTEM;
  else process.env.GIT_CONFIG_SYSTEM = savedSystem;
});

describe('the secret gate', () => {
  it('refuses when .env is not ignored, and leaves no repository behind', async () => {
    scaffold('node_modules/\ndist/\n');

    expect(await prepareLocalRepo(context(), appDir)).toBe('stop');
    expect(existsSync(join(appDir, '.git'))).toBe(false);
    expect(lines.join('\n')).toContain('.env');
  });

  it('refuses when the token was pasted into a file that IS committed', async () => {
    scaffold('node_modules/\ndist/\n.env\n');
    writeFileSync(join(appDir, 'src', 'main.ts'), `export const token = '${TOKEN}';\n`);

    expect(await prepareLocalRepo(context(), appDir)).toBe('stop');
    expect(existsSync(join(appDir, '.git'))).toBe(false);
    expect(lines.join('\n')).toContain('src/main.ts');
  });

  /* The panel's password is not the Chatfuel token, and the gate used to look
     for the token alone: a deployment whose admin door stood open shipped
     green. */
  it('refuses when a module’s credential was pasted into a committed file', async () => {
    scaffold('node_modules/\ndist/\n.env\n');
    const ctx = context();
    ctx.answers.env.ADMIN_PASSWORD = 'admin-password-long-enough';
    writeFileSync(join(appDir, 'src', 'main.ts'), `export const password = '${ctx.answers.env.ADMIN_PASSWORD}';\n`);

    expect(await prepareLocalRepo(ctx, appDir)).toBe('stop');
    expect(existsSync(join(appDir, '.git'))).toBe(false);
    expect(lines.join('\n')).toContain('src/main.ts');
  });

  /* The brand step writes the app's name into index.html on purpose. Scanned
     as a credential, it stopped the first commit of every app named at any
     length — the gate refusing the ordinary run it exists to protect. */
  it('commits an app whose name is long enough to look like a secret', async () => {
    scaffold('node_modules/\ndist/\n.env\n.env.*\n!.env.example\n.vercel/\n');
    const ctx = context();
    ctx.answers.env.VITE_APP_NAME = 'Awesome Customer Support Bot';
    writeFileSync(join(appDir, 'index.html'), `<title>${ctx.answers.env.VITE_APP_NAME}</title>\n`);

    expect(await prepareLocalRepo(ctx, appDir)).toBe('ready');
    expect(git(appDir, 'ls-files').split('\n')).toContain('index.html');
  });

  it('commits when the token is properly ignored', async () => {
    scaffold('node_modules/\ndist/\n.env\n.env.*\n!.env.example\n.vercel/\n');

    expect(await prepareLocalRepo(context(), appDir)).toBe('ready');
    const tracked = git(appDir, 'ls-files').split('\n');
    expect(tracked).toContain('src/main.ts');
    // The example file is the one .env* that is meant to be published.
    expect(tracked).toContain('.env.example');
    expect(tracked).not.toContain('.env');
    expect(git(appDir, 'log', '--oneline')).toContain('Chatfuel');
    expect(git(appDir, 'symbolic-ref', '--short', 'HEAD')).toBe('main');
  });
});

/**
 * The gate is only worth having if it fails closed.
 *
 * `git grep --cached` answers "nothing matched" with exit 1 and empty stdout,
 * and it answers "I could not look" — a broken index, a pattern file it cannot
 * read — with exit 128 and empty stdout. The two are indistinguishable by their
 * output, so a scan that reads stdout alone blesses the push it exists to stop.
 */
describe('a secret scan that could not run', () => {
  it('stops the push instead of reading git’s silence as a clean tree', async () => {
    scaffold('node_modules/\ndist/\n.env\n.env.*\n!.env.example\n.vercel/\n');
    git(appDir, 'init');
    // What a broken index looks like from git's side: every command that reads
    // it exits 128 with nothing on stdout.
    writeFileSync(join(appDir, '.git', 'index'), 'this is not a git index');

    const err = (await prepareLocalRepo(context(), appDir).catch((e: unknown) => e)) as Error & { hint?: string };
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/could not run/i);
    expect(err.hint).toContain('Nothing was pushed');
    // The repository was already there, so it stays — and nothing was committed.
    expect(existsSync(join(appDir, '.git'))).toBe(true);
    expect(() => git(appDir, 'rev-parse', 'HEAD')).toThrow();
  });
});

describe('directories that are already somebody else’s repository', () => {
  it('leaves a subdirectory of a bigger repository alone', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'wizard-parent-'));
    try {
      git(parent, 'init');
      const nested = join(parent, 'app');
      mkdirSync(nested);
      writeFileSync(join(nested, 'package.json'), '{}');
      const ctx = context();
      ctx.answers.appDir = nested;

      expect(await prepareLocalRepo(ctx, nested)).toBe('stop');
      expect(existsSync(join(nested, '.git'))).toBe(false);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  /**
   * The refusal removes the repository it created — but in one it did not
   * create there is nothing to remove, and `git add -A` has already run. Left
   * staged, the secret this branch exists to catch sits in the index of a
   * repository somebody is about to commit by hand.
   */
  it('unstages what it staged when the repository was already there', async () => {
    scaffold('node_modules/\n');
    git(appDir, 'init');

    expect(await prepareLocalRepo(context(), appDir)).toBe('stop');
    expect(existsSync(join(appDir, '.git'))).toBe(true);
    expect(git(appDir, 'ls-files', '--cached')).toBe('');
  });

  it('reports a repository that already has an origin instead of taking it over', async () => {
    scaffold('.env\n');
    git(appDir, 'init');
    git(appDir, 'remote', 'add', 'origin', 'https://github.com/someone/theirs.git');

    expect(await prepareLocalRepo(context(), appDir)).toBe('has-remote');
  });
});

/**
 * The three things an `origin` can mean, kept apart.
 *
 * `pushWithToken` sets `origin` before the push it can be killed in the middle
 * of, so an `origin` on its own says nothing about whether anything was ever
 * pushed. Every remote here is a bare repository on disk: the states have to be
 * real for `ls-remote` to answer honestly, and no test may reach the network.
 */
describe('an origin that may be the wizard’s own unfinished push', () => {
  const SAFE_IGNORE = 'node_modules/\ndist/\n.env\n.env.*\n!.env.example\n.vercel/\n';
  let bare: string;

  const commitLocally = (): void => {
    git(appDir, 'init');
    git(appDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    git(appDir, 'config', 'user.name', 'Wizard');
    git(appDir, 'config', 'user.email', 'wizard@example.com');
    git(appDir, 'add', '-A');
    git(appDir, 'commit', '-m', 'first');
  };

  beforeEach(() => {
    bare = mkdtempSync(join(tmpdir(), 'wizard-bare-'));
    git(bare, 'init', '--bare');
    // A bare repository points HEAD at whatever this machine's git calls the
    // default branch, and `ls-remote origin HEAD` answers about HEAD.
    git(bare, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    scaffold(SAFE_IGNORE);
    commitLocally();
    git(appDir, 'remote', 'add', 'origin', bare);
  });

  afterEach(() => {
    rmSync(bare, { recursive: true, force: true });
  });

  it('offers to finish the push when the remote has nothing in it', async () => {
    expect(await prepareLocalRepo(context(), appDir)).toBe('unpushed');
    expect(lines.join('\n')).not.toContain('Already pushed');
  });

  it('says “Already pushed” only when the remote carries this commit', async () => {
    git(appDir, 'push', '-u', 'origin', 'HEAD');

    expect(await prepareLocalRepo(context(), appDir)).toBe('has-remote');
    expect(lines.join('\n')).toContain('Already pushed');
  });

  it('leaves a remote whose history is not ours alone, and claims nothing', async () => {
    git(appDir, 'push', '-u', 'origin', 'HEAD');
    const theirs = git(bare, 'rev-parse', 'HEAD');
    writeFileSync(join(appDir, 'src', 'later.ts'), 'export const later = true;\n');
    git(appDir, 'add', '-A');
    git(appDir, 'commit', '-m', 'second');

    expect(await prepareLocalRepo(context(), appDir)).toBe('has-remote');
    expect(lines.join('\n')).not.toContain('Already pushed');
    expect(git(bare, 'rev-parse', 'HEAD')).toBe(theirs);
  });

  it('claims nothing about a remote it could not reach', async () => {
    git(appDir, 'remote', 'set-url', 'origin', join(bare, 'gone-missing.git'));

    expect(await prepareLocalRepo(context(), appDir)).toBe('has-remote');
    expect(lines.join('\n')).not.toContain('Already pushed');
  });
});

describe('forbiddenPaths', () => {
  it('names every shape of a leaked environment file', () => {
    expect(forbiddenPaths(['.env', '.env.local', 'packages/app/.env.production'])).toHaveLength(3);
  });

  it('leaves the example file alone — it holds names, not values', () => {
    expect(forbiddenPaths(['.env.example', '.env.local.example', '.env.sample', '.env.template'])).toEqual([]);
  });

  /* direnv's file is a `.env*` that does not start with `.env.`, and it is where
     a person keeps `export AWS_SECRET_ACCESS_KEY=`. The lock has always counted
     it; this gate used to not. */
  it('names the direnv file too', () => {
    expect(forbiddenPaths(['.envrc', 'infra/.envrc.local'])).toHaveLength(2);
  });

  it('catches the Vercel link directory at any depth', () => {
    expect(forbiddenPaths(['.vercel/project.json', 'apps/web/.vercel/README.txt'])).toHaveLength(2);
  });

  it('catches private keys', () => {
    expect(forbiddenPaths(['certs/server.pem', 'id_rsa', '.ssh/id_ed25519'])).toHaveLength(3);
  });

  it('passes an ordinary tree', () => {
    expect(forbiddenPaths(['src/main.ts', 'README.md', 'public/logo.svg'])).toEqual([]);
  });
});

describe('secretValues', () => {
  it('is the credentials, not everything the run happens to know', () => {
    const ctx = context();
    ctx.answers.modules = ['auth', 'contacts'];
    ctx.answers.env = {
      VITE_SUPABASE_URL: 'https://abcdefghijklmno.supabase.co',
      VITE_CHATFUEL_WORKSPACE_ID: 'w'.repeat(36),
    };
    ctx.answers.auth = {
      method: 'pat',
      url: 'https://abcdefghijklmno.supabase.co',
      anonKey: 'a'.repeat(40),
      anonKeyKind: 'publishable',
      secretKey: 's'.repeat(40),
      migrationApplied: true,
      authConfigured: true,
    };

    const values = secretValues(ctx);
    expect(values).toContain(TOKEN);
    expect(values).toContain('s'.repeat(40));
    // Public by design: grepping for these would block real pushes over files
    // that are supposed to contain them.
    expect(values).not.toContain('a'.repeat(40));
    expect(values).not.toContain('w'.repeat(36));
  });

  /* The two the run collects for modules rather than holding itself. Both open
     the deployment, and a literal listing "the token and the service key" saw
     neither. */
  it('covers a credential a module asked for, not only the two the wizard holds', () => {
    const ctx = context();
    ctx.answers.env = { ADMIN_PASSWORD: 'p'.repeat(24), PUBLISHING_SECRET: 'q'.repeat(32) };

    expect(secretValues(ctx)).toEqual(expect.arrayContaining(['p'.repeat(24), 'q'.repeat(32)]));
  });

  /* Default-deny: a name no manifest has declared is scanned rather than
     waved through, so the next credential is covered before anyone edits
     this file. */
  it('scans a value under a name no manifest declares', () => {
    const ctx = context();
    ctx.answers.env = { SOMETHING_NEW: 'n'.repeat(20) };

    expect(secretValues(ctx)).toContain('n'.repeat(20));
  });

  /* The app's own two vars belong to no manifest (scaffold/env.ts declares
     them), so a gate that asked only the manifests read the brand name as a
     credential and stopped the first commit of any app named at length. */
  it('lets the brand through, which no manifest declares', () => {
    const ctx = context();
    ctx.answers.env = { VITE_APP_NAME: 'Awesome Customer Support Bot', VITE_APP_LOGO: 'logo-with-a-long-name.svg' };

    expect(secretValues(ctx)).toEqual([TOKEN]);
  });

  /* Every public var a manifest declares, in one go: a false refusal here
     would stop a push over the file that is supposed to hold them. */
  it('lets every declared public var through', () => {
    const ctx = context();
    ctx.answers.modules = [...ctx.registry.manifests.keys()];
    const published = [...ctx.registry.manifests.values()]
      .flatMap((manifest) => manifest.app?.env ?? [])
      .filter((env) => !env.secret)
      .map((env) => env.name);
    expect(published.length).toBeGreaterThan(0);
    ctx.answers.env = Object.fromEntries(published.map((name, at) => [name, `${name}-${'v'.repeat(20 + at)}`]));

    expect(secretValues(ctx)).toEqual([TOKEN]);
  });
});

/**
 * The half of a push the staged scan never sees.
 *
 * A repository that was already here arrives on GitHub whole: every commit on
 * every branch, including the one that added a `.env` before somebody thought
 * better of it and deleted it. `git show` reads that file out of the published
 * history in one command, so the deletion buys nothing.
 */
describe('a history that already holds a secret', () => {
  const IGNORE = 'node_modules/\n.env\n.env.*\n!.env.example\n';

  /** A repository where `.env` was committed once and removed later. */
  function leakedThenDeleted(): void {
    scaffold(IGNORE);
    git(appDir, 'init');
    git(appDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    git(appDir, 'config', 'user.name', 'Wizard');
    git(appDir, 'config', 'user.email', 'wizard@example.com');
    git(appDir, 'add', '-f', '.env');
    git(appDir, 'commit', '-m', 'oops');
    git(appDir, 'rm', '--cached', '.env');
    git(appDir, 'commit', '-m', 'remove the env file');
  }

  it('refuses without asking under --yes, and leaves the index as it found it', async () => {
    leakedThenDeleted();
    const ctx = context();
    ctx.flags.yes = true;

    expect(await prepareLocalRepo(ctx, appDir)).toBe('stop');
    expect(lines.some((line) => line.includes('.env'))).toBe(true);
    expect(lines.some((line) => line.includes('git filter-repo'))).toBe(true);
    // `git reset` put the index back at HEAD, which is the empty tree the
    // second commit left: nothing the wizard staged survived the refusal.
    expect(git(appDir, 'ls-files', '--cached')).toBe('');
    expect(git(appDir, 'rev-list', '--count', 'HEAD')).toBe('2');
  });

  /* Interactively it is the person's own history to weigh, and the prompt mock
     here answers yes to everything — so this is the branch where they accept. */
  it('commits when the person watching says to push it anyway', async () => {
    leakedThenDeleted();

    expect(await prepareLocalRepo(context(), appDir)).toBe('ready');
    expect(git(appDir, 'rev-list', '--count', 'HEAD')).toBe('3');
  });

  /* The name scan sees `.env` and sees nothing at all here: the file is a
     README, its name is unremarkable, and the paste was undone in the very next
     commit — so the working tree is clean and the push would publish the token
     anyway. */
  it('refuses a token pasted into a file whose name gives nothing away', async () => {
    scaffold(IGNORE);
    git(appDir, 'init');
    git(appDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    git(appDir, 'config', 'user.name', 'Wizard');
    git(appDir, 'config', 'user.email', 'wizard@example.com');
    writeFileSync(join(appDir, 'README.md'), `Run it with CHATFUEL_TOKEN=${TOKEN}\n`);
    git(appDir, 'add', 'README.md');
    git(appDir, 'commit', '-m', 'notes to self');
    writeFileSync(join(appDir, 'README.md'), 'Run it with the token in .env\n');
    git(appDir, 'add', 'README.md');
    git(appDir, 'commit', '-m', 'take the token back out');

    const ctx = context();
    ctx.flags.yes = true;

    expect(await prepareLocalRepo(ctx, appDir)).toBe('stop');
    expect(lines.some((line) => line.includes('README.md'))).toBe(true);
    expect(lines.some((line) => line.includes('git filter-repo'))).toBe(true);
    // The token itself is never printed back — the offender is named by path.
    expect(lines.some((line) => line.includes(TOKEN))).toBe(false);
  });

  /* A bounded scan that found nothing is not a clean history, so the count is
     printed whenever a blob went unread — and only then, or it would be noise
     on every push. */
  it('says how much of the history it read when a file was too big to read', async () => {
    scaffold(IGNORE);
    git(appDir, 'init');
    git(appDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    git(appDir, 'config', 'user.name', 'Wizard');
    git(appDir, 'config', 'user.email', 'wizard@example.com');
    writeFileSync(join(appDir, 'bundle.js'), 'x'.repeat(1024 * 1024 + 1));
    git(appDir, 'add', 'bundle.js');
    git(appDir, 'commit', '-m', 'a build output somebody committed');

    const ctx = context();
    ctx.flags.yes = true;

    expect(await prepareLocalRepo(ctx, appDir)).toBe('ready');
    expect(lines.some((line) => /Read the contents of \d+ of this repository's \d+ committed files/.test(line))).toBe(
      true,
    );
  });

  it('says nothing about a history that never held one', async () => {
    scaffold(IGNORE);
    git(appDir, 'init');
    git(appDir, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    git(appDir, 'config', 'user.name', 'Wizard');
    git(appDir, 'config', 'user.email', 'wizard@example.com');
    const ctx = context();
    ctx.flags.yes = true;

    expect(await prepareLocalRepo(ctx, appDir)).toBe('ready');
    expect(lines.some((line) => line.includes('git filter-repo'))).toBe(false);
    // Nothing went unread, so no count is printed either.
    expect(lines.some((line) => line.includes('Read the contents of'))).toBe(false);
    expect(git(appDir, 'ls-files', '--cached')).toContain('src/main.ts');
  });

  /* An existing repository with everything already committed stages nothing,
     and `git commit` on an empty index fails. That is not a failure of the
     push, and the caller has to be told the repository is ready. */
  it('is ready when there was nothing new to commit', async () => {
    leakedThenDeleted();
    git(appDir, 'add', '-A');
    git(appDir, 'commit', '-m', 'everything else');
    const before = git(appDir, 'rev-parse', 'HEAD');

    expect(await prepareLocalRepo(context(), appDir)).toBe('ready');
    expect(git(appDir, 'rev-parse', 'HEAD')).toBe(before);
  });
});
