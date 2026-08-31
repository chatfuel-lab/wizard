#!/usr/bin/env node
/**
 * The gate for "nothing has to be installed by hand".
 *
 * Builds the tarball, installs it with **npm** into a temp directory **outside
 * the repo**, and runs it there. If this passes, neither pnpm nor a checkout of
 * this monorepo is on the user's path — which is the whole point of the
 * packaged content source.
 *
 *   node scripts/pack-smoke.mjs [--keep] [--offline]
 *
 * With CHATFUEL_TOKEN set it goes further and scaffolds two real apps — every
 * module, and a subset — lets the wizard install their dependencies, then
 * builds and tests both. Without a token it stops after `doctor`, which is
 * hermetic.
 *
 * The content itself is fetched, not carried, so this run needs an origin. It
 * gets a local one backed by a clone of this checkout: the branch under test
 * is usually not pushed anywhere, and a smoke pass that could only run against
 * a published commit would be a smoke pass nobody runs before publishing. The
 * clone carries one commit the tarball has never heard of, so the pass can show
 * the two halves of the content scheme separately — pinned to the floor, and
 * following a branch that has moved past it.
 *
 * Every wizard process here runs sealed: a proxy pointing at a closed port, so
 * anything the wizard tries to send off this machine fails at connect instead
 * of quietly succeeding. Loopback is exempt from the proxy by design, so the
 * local origin still answers. `--offline` seals npm too, which needs a warm npm
 * cache and is therefore opt-in — npm reaching the registry to install the
 * tarball is the one network step, and it is the thing being tested.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialiseContentIndex } from '../../../scripts/content-index.ts';
import { digestOf, INDEX_FILE } from '../src/lockFormat.ts';

/** A one-pixel PNG — the smallest thing that is unmistakably an image file. */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgAAAAAgABVeK3WAAAAABJRU5ErkJggg==',
  'base64',
);

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
const offline = process.argv.includes('--offline');

const work = mkdtempSync(join(tmpdir(), 'chatfuel-wizard-smoke-'));
const host = join(work, 'host');

/**
 * The environment a wizard process gets: outbound HTTP pointed at a port
 * nothing listens on. The egress layer exempts loopback, so the content origin
 * is reachable and the internet is not — a run that needs the network fails
 * here rather than passing on somebody's laptop and failing in CI.
 */
const SEALED = {
  http_proxy: 'http://127.0.0.1:1',
  https_proxy: 'http://127.0.0.1:1',
  HTTP_PROXY: 'http://127.0.0.1:1',
  HTTPS_PROXY: 'http://127.0.0.1:1',
  no_proxy: '127.0.0.1,localhost',
  NO_PROXY: '127.0.0.1,localhost',
  /* A cache of its own, empty at the start: content that came from a previous
     run on this machine is content this pass did not fetch, and a pass that
     proves nothing about the origin is the pass that lets it break. */
  CHATFUEL_WIZARD_CACHE: join(work, 'content-cache'),
};

const repoRoot = resolve(pkgRoot, '..', '..');

/* Every command the packaged wizard runs is pointed at the local origin, and
   at nothing else. Pointing it there also stands the wizard down from resolving
   a branch — an origin with no API in front of it means the floor — so most of
   this pass runs against the commit in the tarball, and the one run that
   follows a branch says so by naming an API of its own. */
let originUrl;

/**
 * The origin runs as its own process, because this one spends most of its life
 * inside `execFileSync`: a server sharing this event loop would accept the
 * wizard's connection and answer it after the wizard had given up.
 */
const startOrigin = (repo, cwd) =>
  new Promise((resolveUrl, reject) => {
    const child = spawn('node', [join(pkgRoot, 'scripts', 'origin-server.ts'), repo, cwd], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`the content origin exited with ${code}`)));
    child.stdout.setEncoding('utf8');
    child.stdout.once('data', (line) => resolveUrl({ url: line.trim(), close: () => child.kill() }));
  });

const run = (cmd, args, cwd, opts = {}) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}   ${cwd === pkgRoot ? '' : `(in ${cwd})`}`);
  return execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    ...opts,
    env: { ...process.env, ...(originUrl ? { CHATFUEL_CONTENT_ORIGIN: originUrl } : {}), ...(opts.env ?? {}) },
  });
};

/**
 * Claude Code reads .claude/skills and Codex reads .agents/skills, and neither
 * looks in the other's directory — a scaffold in the wrong layout is one whose
 * skills are silently never loaded. Nothing else in this smoke pass would
 * notice, because the app builds and tests either way.
 */
const assertAgentLayout = (appDir, { skills, checklist, instructions, absent }) => {
  for (const rel of [`${skills}/chatfuel-core/SKILL.md`, checklist, instructions]) {
    if (!existsSync(join(appDir, rel))) throw new Error(`the scaffold has no ${rel}`);
  }
  if (existsSync(join(appDir, absent))) {
    throw new Error(`the scaffold carries ${absent}/ — it was written for the other agent as well`);
  }
};

/**
 * The promise every module document makes: edit a document, re-run codegen.
 *
 * Nothing else in this repository runs the app's own generator. The wizard
 * copies the generator body in and the app's type check compiles it, but only
 * a real app with real node_modules can execute it — and the two things worth
 * proving about it are that it refuses to guess (an app without the toolchain
 * is told the one command to run, and stops) and that it reproduces exactly
 * what the wizard shipped, byte for byte, rather than something close.
 */
function assertCodegenRoundTrip(appDir) {
  const generated = join(appDir, 'src', 'vendor', 'api', 'generated');
  const before = new Map();
  const walkGenerated = (dir = generated) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walkGenerated(join(dir, entry.name)) : [join(dir, entry.name)],
    );
  for (const path of walkGenerated()) before.set(relative(generated, path), readFileSync(path));
  if (before.size === 0) throw new Error('the scaffold wrote no generated client to regenerate');

  // Without the toolchain: the exact install line, and a non-zero exit.
  let refusal;
  try {
    execFileSync('npm', ['run', 'codegen'], { cwd: appDir, encoding: 'utf8', stdio: 'pipe' });
    throw new Error('npm run codegen succeeded before the generator was installed');
  } catch (err) {
    if (err.status === undefined) throw err;
    refusal = `${err.stdout ?? ''}${err.stderr ?? ''}`;
  }
  /* The refusal names the install line the way a person would type it: one
     command wrapped over several lines with backslashes, because it pins six
     packages at once. Unwrap it and run exactly that, so what is tested here
     is the line the reader is given and not a paraphrase of it. */
  const lines = refusal.split('\n');
  const start = lines.findIndex((line) => /^\s*(?:npm|pnpm|yarn|bun)\s/.test(line));
  let install = '';
  for (let i = start; start !== -1 && i < lines.length; i += 1) {
    const line = lines[i].trim();
    const continues = line.endsWith('\\');
    install += `${continues ? line.slice(0, -1) : line} `;
    if (!continues) break;
  }
  install = install.trim();
  if (!install.includes('@graphql-codegen/cli@')) {
    throw new Error(`npm run codegen refused without naming the install command:\n${refusal}`);
  }

  const [cmd, ...args] = install.split(/\s+/);
  run(cmd, args, appDir);
  run('npm', ['run', 'codegen'], appDir);

  const after = walkGenerated();
  if (after.length !== before.size) {
    throw new Error(`codegen wrote ${after.length} files where the scaffold shipped ${before.size}`);
  }
  for (const path of after) {
    const rel = relative(generated, path);
    if (!before.get(rel)?.equals(readFileSync(path))) {
      throw new Error(`codegen did not reproduce ${rel} — an app cannot regenerate what the wizard gave it`);
    }
  }
  run('npm', ['run', 'check'], appDir);
}

/**
 * Nothing in the scaffold points back at this checkout.
 *
 * The app builds here because npm installed its dependencies here — and it
 * would build just as well while quietly resolving a package through the
 * workspace it was scaffolded from, or a path that only exists on this machine.
 * On a user's disk that is a project that cannot install. Two ways it could
 * happen, both cheap to rule out: a dependency written as a workspace/link/file
 * specifier, and this repository's own path written into a file.
 */
const assertStandalone = (appDir) => {
  const manifest = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8'));
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
      if (/^(workspace:|link:|file:|portal:)/.test(spec)) {
        throw new Error(
          `the scaffold depends on ${name} as "${spec}" — that resolves in this monorepo and nowhere else`,
        );
      }
    }
  }
  const local = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        local(path);
        continue;
      }
      /* Text only: a logo is bytes, and reading it as utf8 to search for a path
         would find nothing either way. */
      if (!/\.(ts|tsx|js|mjs|cjs|json|md|html|css|sql|env|yml|yaml)$/.test(entry.name) && entry.name !== '.env') {
        continue;
      }
      if (readFileSync(path, 'utf8').includes(repoRoot)) {
        throw new Error(`${relative(appDir, path)} names this checkout (${repoRoot}) — the scaffold is not standalone`);
      }
    }
  };
  local(appDir);
};

/**
 * The update path, end to end, from the published tarball and without an API.
 *
 * It is the one flow that reaches the origin with no Chatfuel account in the
 * picture, which makes it the flow that proves the content scheme works
 * offline: an app pinned to an earlier commit, one file whose bytes upstream
 * has moved past, and an update that has to fetch it, check it against the
 * digest in the lock, and write it. What lands is compared against the object
 * the origin's own git repository holds, so a byte out of place is caught here
 * rather than on somebody's machine.
 */
/**
 * An upstream that has moved on, which is what a published wizard actually
 * meets.
 *
 * The tarball is pinned to this checkout's HEAD; the clone gets `main` one
 * commit further along, with `content.index.json` regenerated for it. That one
 * commit is the difference between testing the fallback and testing the
 * feature: with the branch sitting on the floor there is no resolution to make
 * and no index to fetch, and every assertion below would pass against a wizard
 * that never learned to follow a branch at all.
 *
 * A clone rather than this checkout, because the commit has to be made
 * somewhere and it is not going to be made in somebody's working tree.
 */
const buildUpstream = () => {
  const at = join(work, 'upstream');
  const git = (...args) => execFileSync('git', args, { cwd: at, encoding: 'utf8' }).trim();
  execFileSync('git', ['clone', '--quiet', '--local', repoRoot, at], { stdio: 'inherit' });
  /* `-C` rather than `-c`: a clone carries one local branch, the one the source
     had checked out, and on CI that branch is already `main`. Creating it there
     is a name clash; resetting it to the commit just cloned is what was meant
     either way. */
  git('switch', '--quiet', '-C', 'main');

  /* The file `doctor` verifies, and it is edited on purpose. A wizard that
     resolved the branch and then checked the bytes against the tarball's own
     digests would fail here, which is the difference between proving that the
     index was fetched from the resolved commit and merely hoping so. */
  const manifest = join(at, 'content', 'modules', 'core', 'module.json');
  const core = JSON.parse(readFileSync(manifest, 'utf8'));
  core.description = `${core.description} One commit past the tarball.`;
  writeFileSync(manifest, `${JSON.stringify(core, null, 2)}\n`);

  /* The index describes the commit, so it is built from the staged tree and
     committed with it — the rule CONTRIBUTING gives contributors, kept here for
     the same reason. It is built by calling the generator rather than by
     running the clone's copy of it, so this pass exercises the generator in
     this working tree and not the one HEAD happens to hold. */
  git('add', '-A');
  writeFileSync(join(at, INDEX_FILE), serialiseContentIndex(at));
  git('add', '-A');
  git('-c', 'user.email=smoke@example.com', '-c', 'user.name=Smoke', 'commit', '--no-gpg-sign', '-q', '-m', 'move');
  return { at, head: git('rev-parse', 'HEAD') };
};

/**
 * The packaged wizard, following a branch it was not published against.
 *
 * `doctor` is the whole assertion. It resolves the ref through the origin's API
 * half, fetches `content.index.json` from what it resolved, and then checks a
 * real file against a digest that came out of that index — so a green line here
 * means every piece of the dynamic path worked through an installed tarball,
 * outside the repo, with the internet sealed off.
 */
const assertFollowsBranch = (cli, upstream) => {
  const out = execFileSync(cli, ['doctor'], {
    cwd: host,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...SEALED,
      CHATFUEL_CONTENT_ORIGIN: originUrl,
      CHATFUEL_CONTENT_API: `${originUrl}/api`,
      /* Its own cache: the offline half above filled one at the floor commit,
         and a resolution that read those files would prove nothing. */
      CHATFUEL_WIZARD_CACHE: join(work, 'followed-cache'),
      /* picocolors paints whenever `CI` is set, pipe or no pipe, so on a runner
         these lines arrive with escapes between the status and its label and
         the checks below match nothing. This is the one place that reads the
         output rather than showing it, so it is the one place that asks for
         plain text. */
      NO_COLOR: '1',
    },
  });
  console.log(out);
  const expected = `main → ${upstream.head.slice(0, 12)} (resolved)`;
  if (!out.includes(expected)) {
    throw new Error(`doctor did not follow the branch — expected "${expected}" in its output`);
  }
  if (!/ok\s+content pin/.test(out)) {
    throw new Error('doctor followed the branch and then could not verify a file at the commit it resolved');
  }
};

const assertOfflineUpdate = (cli, appDir) => {
  const AT = 'content/shell/README.md';
  const lock = JSON.parse(readFileSync(join(host, 'node_modules', '@chatfuel', 'wizard', 'content.lock'), 'utf8'));
  const stale = Buffer.from('# The app, one commit ago\n');

  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, 'README.md'), stale);
  mkdirSync(join(appDir, '.chatfuel'), { recursive: true });
  writeFileSync(
    join(appDir, '.chatfuel', 'lock.json'),
    `${JSON.stringify(
      {
        mode: 'standalone',
        wizardVersion: '0.0.0',
        repo: lock.repo,
        /* Any commit but the target's: what the update is about is the move.
           Derived from the target rather than read with `git rev-parse HEAD~1`,
           which needs a parent commit — and actions/checkout clones at depth 1,
           so on the machine that runs this gate there is none and the whole
           step died at `fatal: ambiguous argument`. Nothing resolves the app's
           old pin: `update` compares it, prints it, and fetches everything from
           the target, so "a full sha that is not the target's" is the entire
           requirement. */
        commit: lock.commit.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')),
        modules: ['core'],
        skills: {},
        files: { 'README.md': { from: AT, sha256: digestOf(stale) } },
      },
      null,
      2,
    )}\n`,
  );
  // The update refuses to write where `git checkout .` could not take it back.
  for (const args of [
    ['init', '-q', '-b', 'main'],
    ['add', '-A'],
    ['-c', 'user.email=smoke@example.com', '-c', 'user.name=Smoke', 'commit', '--no-gpg-sign', '-q', '-m', 'app'],
  ]) {
    execFileSync('git', args, { cwd: appDir, stdio: 'ignore' });
  }

  run(cli, ['update', '--dir', appDir], host, { env: SEALED });

  const landed = readFileSync(join(appDir, 'README.md'));
  const upstream = execFileSync('git', ['cat-file', 'blob', `${lock.commit}:${AT}`], { cwd: repoRoot });
  if (!landed.equals(upstream)) {
    throw new Error('update wrote something other than the bytes the origin holds for that commit');
  }
  if (JSON.parse(readFileSync(join(appDir, '.chatfuel', 'lock.json'), 'utf8')).commit !== lock.commit) {
    throw new Error('update wrote the file and left the app pinned to the old commit');
  }
};

/**
 * Objects, not files: the origin serves commits, so content that is not
 * committed is not in this run — which makes uncommitted work under `content/`
 * fatal here, and everywhere else either the point of the run or irrelevant.
 * `pack-content.mjs` runs here with `CHATFUEL_PACK_LOCAL=1`, which digests the
 * WORKING TREE while stamping HEAD as the lock's commit — so one uncommitted
 * content file makes a lock that names bytes the origin cannot serve, and the
 * run dies four minutes later inside the wizard, as a digest mismatch on
 * whichever file `update` happened to verify first. Said here instead, before
 * anything is built, and naming the files.
 */
const assertContentCommitted = () => {
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' });
  if (!dirty.trim()) return;
  /* Every line is `XY path`, two status columns and a space — so the lines are
     not trimmed, individually or as a block: a file staged in the index and
     clean on disk reads ` M path`, and eating that leading space would eat a
     character of the path with it. A rename is `XY old -> new`; the new name is
     the one on disk. */
  const paths = dirty
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).trim().split(' -> ').pop());
  const packed = paths.filter((at) => at.startsWith('content/') || at === INDEX_FILE);
  if (packed.length === 0) {
    /* Everywhere else, uncommitted work is not a hazard — in two directories it
       is the point. `packages/wizard` is what `tsdown` builds into the tarball a
       few lines below, and `scripts/` holds the index generator this pass runs
       against the clone on purpose; testing a change there before committing it
       is what somebody runs this gate for. Anything dirty outside those three
       places never reaches the run, so there is nothing to say about it. */
    const built = paths.filter((at) => at.startsWith('packages/wizard/') || at.startsWith('scripts/'));
    if (built.length > 0) {
      console.log(`\nthe tarball is built from ${built.length} uncommitted file(s) — which is what this gate is for`);
    }
    return;
  }
  const shown = packed.slice(0, 5).join('\n  ');
  const rest = packed.length > 5 ? `\n  ...and ${packed.length - 5} more` : '';
  throw new Error(
    `the content tree has uncommitted changes, which this pass cannot test:\n  ${shown}${rest}\n` +
      'The tarball is digested from the working tree and the origin serves HEAD, so those files ' +
      'would be fetched as their committed bytes and refused against the lock. Commit or stash ' +
      'them first (and run `pnpm content-index` if any of them is under content/).',
  );
};

let failed = false;
let origin;
let upstream;

try {
  assertContentCommitted();
  const repo = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
    .repository.url.replace(/^.*github\.com[/:]/, '')
    .replace(/\.git$/, '');
  /* The origin is backed by the clone rather than by this checkout, because it
     has to be able to serve both commits: the one the tarball pins, which the
     clone carries, and the one past it, which only the clone has. */
  upstream = buildUpstream();
  origin = await startOrigin(repo, upstream.at);
  originUrl = origin.url;
  console.log(`\ncontent origin: ${originUrl} (a clone of this checkout, as ${repo})`);
  console.log(`upstream main:  ${upstream.head.slice(0, 12)} (one commit past the tarball)`);

  run(join(pkgRoot, 'node_modules', '.bin', 'tsdown'), [], pkgRoot);
  // Says what CHATFUEL_CONTENT_ORIGIN must not: this tarball is pinned to
  // whatever HEAD is, pushed or not, because only this run will install it.
  run('node', ['scripts/pack-content.mjs'], pkgRoot, { env: { CHATFUEL_PACK_LOCAL: '1' } });

  // --ignore-scripts: the build above IS the prepack, and prepack would need pnpm.
  const packed = execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', work, '--json'], {
    cwd: pkgRoot,
    encoding: 'utf8',
  });
  const { filename, size } = JSON.parse(packed)[0];
  const tarball = join(work, filename);
  console.log(`\npacked ${filename} (${(size / 1024 / 1024).toFixed(1)} MB)`);

  // A bare npm project — no workspace, no lockfile of ours, no pnpm anywhere.
  mkdirSync(host, { recursive: true });
  writeFileSync(
    join(host, 'package.json'),
    `${JSON.stringify({ name: 'chatfuel-wizard-smoke-host', private: true, version: '0.0.0' }, null, 2)}\n`,
  );
  run('npm', ['install', tarball, '--no-audit', '--no-fund', ...(offline ? ['--offline'] : [])], host);

  const cli = join(host, 'node_modules', '.bin', 'chatfuel-wizard');
  run(cli, ['doctor'], host, { env: SEALED });
  assertFollowsBranch(cli, upstream);
  assertOfflineUpdate(cli, join(work, 'app-update'));

  const token = process.env.CHATFUEL_TOKEN;
  if (!token) {
    console.log('\nCHATFUEL_TOKEN not set — stopping after the offline half (the scaffold pass needs the API).');
  } else {
    const workspace = process.env.CHATFUEL_SMOKE_WORKSPACE;
    const workspaceArgs = workspace ? ['--workspace', workspace] : [];

    const appDir = join(work, 'app');
    run(cli, ['--yes', '--dry-run', '--dir', appDir, ...workspaceArgs], host);
    // No agent on PATH and no --agent: Claude's layout is the default, and the
    // instructions file has to be the one Claude Code reads.
    assertAgentLayout(appDir, {
      skills: '.claude/skills',
      checklist: '.claude/commands/chatfuel/finish-setup.md',
      instructions: 'CLAUDE.md',
      absent: '.agents',
    });
    assertStandalone(appDir);
    // The wizard installs the dependencies itself; this proves what it installed
    // builds, and that the suite and type check it hands over are green before
    // anybody edits it.
    run('npm', ['run', 'build'], appDir);
    run('npm', ['test'], appDir);
    run('npm', ['run', 'check'], appDir);

    // --yes takes every module, so it is the one configuration that exercises
    // none of the per-selection transforms. Most people take a subset, and a
    // subset is a different app: a filtered nav table, a shorter dependency
    // list. livechat,contacts empties a whole nav group, which is the case that
    // deletes an entry from the table rather than shortening one.
    // A logo and a name ride along here for the same reason: --yes alone keeps
    // the mark the template ships and never copies a file, rewrites the head or
    // deletes the default. This is the run that does all three.
    // --agent codex rides along too: it is the other skills layout, and a
    // scaffold that writes it into the directory Codex does not read is an app
    // whose skills are never loaded.
    const logo = join(work, 'smoke-logo.png');
    writeFileSync(logo, PNG_1PX);
    /* A space in the path, on purpose. `codegen.ts` in the scaffold resolves
       its own directory out of `import.meta.url`, and the wrong way to do that
       — `.pathname` — hands back a percent-encoded string that reads no file.
       That is a Windows bug first (`/C:/…`) and a bug for anybody with a space
       in a directory name second, and the second half reproduces here. The
       whole scaffold runs out of this directory, so the check covers the build
       and the app's own scripts as well, not only the generator. */
    const partialDir = join(work, 'app partial');
    run(
      cli,
      [
        '--yes',
        '--dry-run',
        '--modules',
        'livechat,contacts',
        '--agent',
        'codex',
        '--dir',
        partialDir,
        '--app-name',
        'Smoke Desk',
        '--logo',
        logo,
        ...workspaceArgs,
      ],
      host,
    );
    assertAgentLayout(partialDir, {
      skills: '.agents/skills',
      checklist: '.agents/skills/chatfuel-finish-setup/SKILL.md',
      instructions: 'AGENTS.md',
      absent: '.claude',
    });
    const branded = readFileSync(join(partialDir, 'index.html'), 'utf8');
    if (!branded.includes('<title>Smoke Desk</title>') || !branded.includes('href="%BASE_URL%logo.png"')) {
      throw new Error('the scaffold kept the template head — the brand transform did not run');
    }
    if (existsSync(join(partialDir, 'public', 'logo.svg'))) {
      throw new Error('the scaffold carries two marks — the replaced default was not removed');
    }
    assertStandalone(partialDir);
    run('npm', ['run', 'build'], partialDir);
    run('npm', ['test'], partialDir);
    run('npm', ['run', 'check'], partialDir);
    // The build output is what a deployment serves; the mark has to be in it.
    if (!existsSync(join(partialDir, 'dist', 'logo.png'))) {
      throw new Error('dist/ has no logo.png — public/ did not survive the build');
    }
    assertCodegenRoundTrip(partialDir);

    // An opt-in module, which --yes never takes: the only run that proves the
    // admin step writes a password a deployment will accept, and that a
    // scaffold taking the panel WITHOUT auth carries no supabase/ it cannot use.
    const adminDir = join(work, 'app-admin');
    run(cli, ['--yes', '--dry-run', '--modules', 'livechat,admin', '--dir', adminDir, ...workspaceArgs], host);
    const adminEnv = readFileSync(join(adminDir, '.env'), 'utf8');
    const password = /^ADMIN_PASSWORD=(.+)$/m.exec(adminEnv)?.[1] ?? '';
    if (password.length < 16) {
      throw new Error('the scaffold has no usable ADMIN_PASSWORD — the panel would refuse to run');
    }
    if (!existsSync(join(adminDir, 'src', 'modules', 'admin'))) {
      throw new Error('the admin module was selected and its subtree is not there');
    }
    if (existsSync(join(adminDir, 'supabase'))) {
      throw new Error('a scaffold without auth carries supabase/ — its migrations have no tables to read');
    }
    if (readFileSync(join(adminDir, 'src', 'modules', 'navGroups.tsx'), 'utf8').includes("'admin'")) {
      throw new Error('the nav table names the admin panel — it is reached by address and never from the rail');
    }
    assertStandalone(adminDir);
    run('npm', ['run', 'build'], adminDir);
    run('npm', ['test'], adminDir);
    run('npm', ['run', 'check'], adminDir);
  }

  console.log('\npack-smoke: PASS');
} catch (err) {
  failed = true;
  console.error(`\npack-smoke: FAIL — ${err instanceof Error ? err.message : err}`);
} finally {
  origin?.close();
  if (keep || failed) console.log(`\nartefacts kept in ${work}`);
  else rmSync(work, { recursive: true, force: true });
}

/* `process.exit` and not an exit code would be a truncated report: stdout to a
   file or a pipe is asynchronous, and the last lines of a failure are the ones
   that say why. Setting the code lets the process end when its output has
   actually left. */
process.exitCode = failed ? 1 : 0;
