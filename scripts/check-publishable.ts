#!/usr/bin/env node
/**
 * The gate on what leaves the building.
 *
 * Everything the wizard ships is also copied onto the client's disk: `content/shell`
 * becomes their project root, the three package `src/` trees become their
 * `vendor/`, `content/modules/<id>/skill/` becomes their installed skills, and
 * `content/modules/<id>/handoff.md` is inlined verbatim into their own instructions file.
 * A word written for us is therefore a word written for them.
 *
 * Three rules, enforced here rather than remembered:
 *   1. the package is English only;
 *   2. no text that names something the reader cannot see - a tool that is not in
 *      their project, or anything private to whoever maintains this copy;
 *   3. no credentials, and nothing outside the declared trees.
 *
 * The repository is public too, so the gate also walks its own trees - with rule 2
 * split into two tiers. Universal bans (non-English text, unfinished-work markers,
 * credentials) hold everywhere. Shipped-only bans cover words that are true facts
 * of this repository but poison in a client's project - the package manager, the
 * repo layout, the validator's name - and apply only to the trees a client
 * receives. Private vocabulary is banned through the untracked overlay below, so
 * that the tracked rule list spells out nothing private of its own.
 *
 * Two modes, and which script takes which is worth having right, because the
 * two read different bytes. `--source` walks the repo trees - what `validate`
 * wants, and what this file does when it is run with no flags at all, which is
 * how `prepublishOnly` runs it: those trees are what a client fetches, it is
 * fast, and it points at the file you would edit. `--packed` walks
 * `packages/wizard/` through its own `files` allowlist - the actual bytes npm
 * uploads, `dist/` and `bin/` included - and nothing on a command line asks for
 * it: `pack-content.mjs` calls checkPublishable({ mode: 'packed' }) directly,
 * and npm runs that from `prepack`, on `npm pack` and `npm publish` alike.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_TREES, MANIFEST_DIR } from './content-trees.ts';
import {
  ALLOW,
  MATH_SYMBOLS,
  NON_LATIN,
  SCHEMA_ONLY_BANNED,
  SDL,
  SECRETS,
  SHIPPED_BANNED,
  UNIVERSAL_BANNED,
  type Rule,
} from './rules.ts';

/**
 * The tree to scan, which is normally the repository this file sits in.
 *
 * `CHECK_PUBLISHABLE_ROOT` points it somewhere else, and CI is the reason it
 * exists: the job that holds the private ban list checks out the gate from a
 * branch no pull request can rewrite and the branch under test beside it, then
 * scans the second with the first. The alternative is running a contributor's
 * copy of this file in a job that has the secret in its environment.
 */
const repoRoot = process.env.CHECK_PUBLISHABLE_ROOT
  ? resolve(process.env.CHECK_PUBLISHABLE_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wizardRoot = join(repoRoot, 'packages', 'wizard');

/**
 * Repo-internal trees: never copied to a client's disk, but public all the
 * same, so the universal bans hold in them. The shipped `src/` trees are
 * already walked above with the full rule set, and `manifests/` is packaging
 * output whose real bytes `--packed` reads. Root-level files (README, configs,
 * LICENSE) are scanned by their own loop below; `.claude/` stays out -
 * untracked machine-local agent state whose worktrees hold stale full
 * checkouts of this repo.
 */
const REPO_TREES: readonly { readonly tree: string; readonly skip?: readonly string[] }[] = [
  { tree: 'scripts' },
  { tree: 'packages/design-system' },
  { tree: 'content/ui', skip: ['src'] },
  { tree: 'content/api-client', skip: ['src'] },
  { tree: 'content/vite-plugin-proxy', skip: ['src'] },
  { tree: 'packages/wizard', skip: [MANIFEST_DIR] },
  { tree: 'packages/module-manifest' },
  { tree: '.github' },
  { tree: 'docs' },
  /* One file: the editor's map from a manifest to the schema that judges it.
     It lives here because the manifests themselves no longer carry a `$schema`
     pointing three levels up - that path is meaningless to anything at runtime
     and travels into the published tarball, where it describes the layout of
     this repository to somebody who does not have it. */
  { tree: '.vscode' },
];

/**
 * Root-level files the root loop never reads: CLAUDE.md and PLAN.md, untracked
 * local working documents (gitignored); packed mode refuses them by name if they
 * ever reach the package.
 *
 * `pnpm-lock.yaml` used to be here too, as machine-written and prose-free. It is
 * neither of those where it counts: a registry URL, a tarball host, a package
 * name out of a private scope all land in it without anyone typing them, and it
 * was the largest tracked file nobody was reading. ~200 KB a run is the cost.
 */
const ROOT_SKIP: ReadonlySet<string> = new Set(['CLAUDE.md', 'PLAN.md']);

/**
 * The same, by shape rather than by name: an audit report is written in whatever
 * language its reader speaks and quotes every banned literal it found, so left
 * in the walk it turns the gate solid red and nobody reads a gate that is always
 * red. `.gitignore` refuses to track these; this refuses to scan them. Neither
 * makes them shippable - no content tree and no `files` entry reaches the repo
 * root, so packed mode never sees one either.
 */
const ROOT_SKIP_SHAPE = /security[_-]audit/i;

/**
 * Exempt by exact path, not by directory - the rest of `scripts/` is scanned like
 * everything else. The overlay is untracked and local to one machine. This file
 * is not on the list: it holds no literals any more, and prose that exempts
 * itself is prose nothing reads.
 */
const SELF_PATHS = new Set(['scripts/check-publishable.private.json']);

/**
 * `rules.ts` was on that list, and should not have been.
 *
 * Its claim to exemption is real but narrow: it carries the banned phrases
 * themselves, so the phrase pass would fail it for holding the list it exists to
 * hold. Nothing about that says a token, a key, or a sentence in another language
 * belongs in it - and a file the gate never opens is the best place in the tree
 * for one to sit. So it is scanned like everything else, minus the one pass it
 * cannot pass: the shapes still apply, the words do not.
 */
const SELF_RULES = 'scripts/rules.ts';

/**
 * Where a coding agent keeps its working state, wherever its cwd happened to be.
 *
 * Never scanned — none of it is this repository's — and, inside a content tree,
 * never allowed either: those trees are copied onto a user's disk and are the
 * one place where an untracked directory is one `git add -f` from being
 * published. `agentState` below is the check that says so out loud.
 */
const AGENT_DIRS: ReadonlySet<string> = new Set(['.omc', '.claude', '.codex', '.agents']);

/** Never scanned: build output, dependencies, secrets, git, agent scratch state. */
const SKIP_DIRS: ReadonlySet<string> = new Set(['node_modules', '.git', '.DS_Store', ...AGENT_DIRS]);
/** Skipped in source mode only: pack-content drops both, so neither can reach the package. */
const SOURCE_SKIP_DIRS: ReadonlySet<string> = new Set([...SKIP_DIRS, 'dist', '.env']);

const MAX_BYTES = 4 * 1024 * 1024;

/** Every `[start, end)` this pattern matches on the line. */
function spans(pattern: RegExp, line: string): [number, number][] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const found: [number, number][] = [];
  for (const match of line.matchAll(new RegExp(pattern.source, flags))) {
    if (match.index !== undefined) found.push([match.index, match.index + match[0].length]);
  }
  return found;
}

/**
 * Whether an exception covers this exact hit.
 *
 * The span is the point. This used to ask only whether some rule matched the
 * path and the line, so one waiver disarmed every other rule on that line: the
 * pinned-action-SHA exception for `.github/workflows` also cleared the
 * credential rules, and `uses: actions/checkout@<sha> # <64 hex>` passed. An
 * exception now has to cover the offending text itself, which is what the
 * reviewer who granted it thought they were granting.
 */
function allowed(relPath: string, line: string, [from, to]: [number, number]): boolean {
  return ALLOW.some(
    (rule) => rule.path.test(relPath) && spans(rule.pattern, line).some(([a, b]) => a <= from && b >= to),
  );
}

/**
 * A rule matched against one line at a time is a rule a line break switches
 * off, and nothing here has to be deliberate for that to happen: prettier
 * reflows a comment, a paragraph is rewrapped at the margin, and a banned
 * sentence is two halves that match nothing. That is how a banned phrase got
 * into this tree in the first place - a grep for it, line by line, could not
 * see it either.
 *
 * So every run of lines a formatter could have split one sentence across is
 * also glued back into a single string and scanned again: comment blocks in
 * code, paragraphs in markdown. `map` carries each character back to its
 * offset in the file, which is what turns a hit into a line number, and a hit
 * that begins and ends on the same line is dropped - the per-line pass already
 * reported it.
 */
type Block = { readonly text: string; readonly map: readonly number[] };

const MARKDOWN = /\.mdx?$/;
const FENCE = /^\s*(?:```|~~~)/;
/** A markdown line that starts a new block rather than continuing the last one. */
const MD_BLOCK = /^(?:\s{4,}|\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>|\|))/;

const GRAPHQL = /\.graphql$/;
/**
 * A GraphQL description is not a comment, and `#` was the only leader this file
 * knew for a `.graphql`. So every """ description - the prose in an SDL, and the
 * one part of that file written in sentences - went through the per-line pass
 * alone, and a phrase a formatter had wrapped went through nothing at all. Which
 * is the case the wrapped pass exists for.
 */
const TRIPLE = /"""/g;

const SLASH_LEADER = /^\s*(?:\/{2,}|\/\*+|\*(?!\/))\s?/;
const HASH_LEADER = /^\s*#+\s?/;
const DASH_LEADER = /^\s*--\s?/;

function leaderFor(relPath: string): RegExp | undefined {
  if (/\.(?:tsx?|jsx?|mjs|cjs|css)$/.test(relPath)) return SLASH_LEADER;
  if (/\.(?:ya?ml|sh|toml|graphql)$/.test(relPath)) return HASH_LEADER;
  if (/\.sql$/.test(relPath)) return DASH_LEADER;
  return undefined;
}

function lineStarts(lines: readonly string[]): number[] {
  const starts: number[] = [];
  let at = 0;
  for (const line of lines) {
    starts.push(at);
    at += line.length + 1;
  }
  return starts;
}

function lineAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if ((starts[mid] as number) <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

function blocks(text: string, relPath: string): Block[] {
  const markdown = MARKDOWN.test(relPath);
  const sdl = GRAPHQL.test(relPath);
  const leader = markdown ? undefined : leaderFor(relPath);
  if (!markdown && leader === undefined) return [];

  const found: Block[] = [];
  let chars = '';
  let map: number[] = [];
  let joined = 0;
  let fenced = false;
  let described = false;

  const flush = (): void => {
    if (joined > 1) found.push({ text: chars, map });
    chars = '';
    map = [];
    joined = 0;
  };

  const take = (line: string, start: number, strip: RegExp | undefined): void => {
    const body = strip ? line.replace(strip, '') : line;
    const offset = start + (line.length - body.length);
    if (joined > 0 && !chars.endsWith(' ')) {
      chars += ' ';
      map.push(offset);
    }
    for (let index = 0; index < body.length; index += 1) {
      const char = body[index] as string;
      const space = char === ' ' || char === '\t';
      if (space && chars.endsWith(' ')) continue;
      chars += space ? ' ' : char;
      map.push(offset + index);
    }
    joined += 1;
  };

  let start = 0;
  for (const line of text.split('\n')) {
    const at = start;
    start += line.length + 1;

    if (markdown) {
      if (FENCE.test(line)) {
        flush();
        fenced = !fenced;
        continue;
      }
      if (fenced || line.trim() === '') {
        flush();
        continue;
      }
      if (joined > 0 && MD_BLOCK.test(line)) flush();
      take(line, at, undefined);
      continue;
    }

    if (sdl) {
      const fences = line.match(TRIPLE)?.length ?? 0;
      if (described) {
        take(line, at, undefined);
        if (fences > 0) {
          flush();
          described = false;
        }
        continue;
      }
      if (fences === 1) {
        flush();
        described = true;
        take(line, at, /^[^"]*"""/);
        continue;
      }
      if (fences > 1) {
        /* Opened and closed on the same line: no line break in it for the
           per-line pass to have missed. */
        flush();
        continue;
      }
    }

    if (!(leader as RegExp).test(line)) {
      flush();
      continue;
    }
    take(line, at, leader);
  }
  flush();
  return found;
}

// ---------------------------------------------------------------------------

/** Every directory the two lists above claim to account for. */
const COVERED: readonly string[] = [...CONTENT_TREES, ...REPO_TREES.map(({ tree }) => tree)];

const toPosix = (path: string): string => path.split(sep).join('/');

/**
 * Refuse a directory no tree list accounts for.
 *
 * The lists are allowlists, and an allowlist nothing checks stops covering the
 * repository the first time somebody adds a package: the gate walks the trees
 * it knows and reports `clean`, having never opened the new one. That is the
 * single failure this gate cannot have, because the repository goes public on
 * its word - so the claim that the lists are complete is made here rather than
 * in a comment. `design-system.ts` makes the same assertion for `content/ui/src`.
 *
 * A directory is covered when a tree names it or an ancestor of it; it is a
 * container when a tree sits somewhere beneath it, and then the question moves
 * down a level. Anything else is unaccounted for and names itself.
 */
function checkCoverage(dir: string, failures: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SOURCE_SKIP_DIRS.has(entry.name) || !entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    const rel = toPosix(relative(repoRoot, full));
    if (COVERED.some((tree) => tree === rel || rel.startsWith(`${tree}/`))) continue;
    if (COVERED.some((tree) => tree.startsWith(`${rel}/`))) {
      checkCoverage(full, failures);
      continue;
    }
    failures.push(
      `${rel}: no tree list covers this directory - add it to CONTENT_TREES or REPO_TREES, or skip it by name`,
    );
  }
}

/**
 * Refuse agent scratch state that has settled inside a content tree.
 *
 * `SKIP_DIRS` keeps these out of the scan, which is right — and is exactly what
 * makes them quiet. A tree under `content/` is not this repository's private
 * working copy: the wizard copies it to a user's disk and the lock digests what
 * it copies, so a directory sitting there is one forced add, or one skip-list
 * edit, away from travelling. Out of `content/` it is nobody's problem.
 */
function agentState(dir: string, failures: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (AGENT_DIRS.has(entry.name)) {
      failures.push(
        `${toPosix(relative(repoRoot, join(dir, entry.name)))}: agent scratch state inside a tree the wizard copies to a user's disk - move it out of content/`,
      );
      continue;
    }
    if (SOURCE_SKIP_DIRS.has(entry.name)) continue;
    agentState(join(dir, entry.name), failures);
  }
}

function* walk(dir: string, skip: ReadonlySet<string>, base: string, failures: string[]): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    /* A symlink is neither `isFile()` nor `isDirectory()`, so it used to leave
       this loop without a trace: unread by the gate, and still listed by the
       `git ls-files` that builds the content lock - a file nobody scanned,
       shipped. Named rather than followed, because what it points at need not
       be inside the tree being walked. */
    if (entry.isSymbolicLink()) {
      failures.push(`${toPosix(relative(base, full))}: a symlink - the gate cannot scan what it points at`);
    } else if (entry.isDirectory()) yield* walk(full, skip, base, failures);
    else if (entry.isFile()) yield full;
  }
}

/** Binary by extension. Most carry a NUL byte and would be caught below anyway; a
 * small GIF or WOFF need not, and a screenshot read as UTF-8 is noise at best. */
const BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|mp4)$/i;

/**
 * What a file with one of those extensions has to begin with.
 *
 * The extension is a claim the filename makes, and this gate used to take it: a
 * `.png` was skipped because it said it was a `.png`. Renaming a text file is
 * then the whole of the trick, and the one file shaped to avoid the scan is the
 * one file that avoids it. So the claim is checked against the first bytes, and a
 * file that does not begin the way its name promises is reported instead of
 * skipped. A `?` stands for any byte: mp4 puts `ftyp` at offset 4, behind a
 * length nobody can predict.
 */
const MAGIC: readonly (readonly [string, RegExp, readonly string[]])[] = [
  ['a PNG', /\.png$/i, ['\x89PNG\r\n\x1a\n']],
  ['a JPEG', /\.jpe?g$/i, ['\xff\xd8\xff']],
  ['a GIF', /\.gif$/i, ['GIF87a', 'GIF89a']],
  ['a WebP', /\.webp$/i, ['RIFF????WEBP']],
  ['an icon', /\.ico$/i, ['\x00\x00\x01\x00', '\x00\x00\x02\x00']],
  ['a WOFF font', /\.woff$/i, ['wOFF']],
  ['a WOFF2 font', /\.woff2$/i, ['wOF2']],
  ['an MP4', /\.mp4$/i, ['????ftyp']],
];

/** Whether the file's first bytes match one of the signatures its name allows. */
function magicHolds(file: string, signatures: readonly string[]): boolean {
  const longest = Math.max(...signatures.map((signature) => signature.length));
  const head = readFileSync(file).subarray(0, longest).toString('latin1');
  return signatures.some((signature) => [...signature].every((char, index) => char === '?' || head[index] === char));
}

/**
 * Text as far as this gate is concerned: readable as UTF-8, no NUL byte, not
 * enormous. `null` is a file whose extension already said it was never text.
 * Everything else that cannot be read comes back as the reason it could not,
 * and the caller reports it: a .ts carrying a NUL byte, or a .md grown past the
 * ceiling, is exactly the file this gate would want to have read, and returning
 * the same `null` for it meant the one file nobody scanned was the one file
 * shaped to avoid being scanned.
 */
function readText(file: string): { text: string } | { unreadable: string } | null {
  if (BINARY.test(file)) {
    const claim = MAGIC.find(([, extension]) => extension.test(file));
    if (claim && !magicHolds(file, claim[2])) {
      return { unreadable: `named as ${claim[0]} but does not begin like one` };
    }
    return null;
  }
  const size = statSync(file).size;
  if (size > MAX_BYTES)
    return {
      unreadable: `${(size / 1024 / 1024).toFixed(1)}MB, past the ${MAX_BYTES / 1024 / 1024}MB this gate reads`,
    };
  const buffer = readFileSync(file);
  if (buffer.includes(0)) return { unreadable: 'a NUL byte - binary content under a text extension' };
  return { text: buffer.toString('utf8') };
}

function scanFile(file: string, root: string, failures: string[], banned: readonly Rule[]): void {
  /* Forward slashes, once, here: every SELF_PATHS entry and every ALLOW[].path
     regex in `rules.ts` is written POSIX-style, and on Windows `relative` hands back
     `scripts\check-publishable.ts` — which matches none of them, so this file
     would fail its own rules and every waiver would switch itself off. */
  const relPath = toPosix(relative(root, file));
  if (SELF_PATHS.has(relPath)) return;
  const self = relPath === SELF_RULES;
  const read = readText(file);
  if (read === null) return;
  if ('unreadable' in read) {
    failures.push(`${relPath}: ${read.unreadable} - the gate cannot scan it, and it ships`);
    return;
  }
  const lines = read.text.split('\n');
  const rules = self ? [] : SDL.test(relPath) ? [...banned, ...SCHEMA_ONLY_BANNED] : banned;

  for (const [index, line] of lines.entries()) {
    /** The first thing this pattern catches that no exception covers. */
    const offending = (pattern: RegExp): [number, number] | undefined =>
      spans(pattern, line).find((at) => !allowed(relPath, line, at));

    for (const at of spans(NON_LATIN, line)) {
      const foreign = line.slice(at[0], at[1]);
      if (MATH_SYMBOLS.has(foreign) || allowed(relPath, line, at)) continue;
      failures.push(`${relPath}:${index + 1}: "${foreign}" is not a Latin letter - the package is English only`);
      break;
    }

    for (const [pattern, why] of rules) {
      const at = offending(pattern);
      if (at) failures.push(`${relPath}:${index + 1}: "${line.slice(at[0], at[1]).trim()}" names ${why}`);
    }
    for (const [pattern, why] of SECRETS) {
      const at = offending(pattern);
      if (at) failures.push(`${relPath}:${index + 1}: ${why} (${line.slice(at[0], at[0] + 12)}...)`);
    }
  }

  const starts = lineStarts(lines);
  for (const block of blocks(read.text, relPath)) {
    /** The first hit this pattern has that spans a line break and no exception covers. */
    const wrapped = (pattern: RegExp): [number, number] | undefined =>
      spans(pattern, block.text).find((at) => {
        const from = block.map[at[0]] as number;
        const to = block.map[at[1] - 1] as number;
        return lineAt(starts, from) !== lineAt(starts, to) && !allowed(relPath, block.text, at);
      });
    const where = (at: [number, number]): number => lineAt(starts, block.map[at[0]] as number) + 1;

    for (const [pattern, why] of rules) {
      const at = wrapped(pattern);
      if (at)
        failures.push(
          `${relPath}:${where(at)}: "${block.text.slice(at[0], at[1]).trim()}" names ${why}, wrapped across lines`,
        );
    }
    for (const [pattern, why] of SECRETS) {
      const at = wrapped(pattern);
      if (at)
        failures.push(
          `${relPath}:${where(at)}: ${why}, wrapped across lines (${block.text.slice(at[0], at[0] + 12)}...)`,
        );
    }
  }
}

/**
 * `mode: 'source'` walks the repo trees the wizard installs with the full rule
 * set, then the repo-internal trees with the universal rules only; `mode:
 * 'packed'` walks `packages/wizard/` through its own `files` allowlist plus the
 * two files npm always adds, and reads the manifest that ships with them.
 * Returns the failures rather than printing them, so the validator can fold them
 * into its own report.
 */
export function checkPublishable({ mode = 'source' }: { mode?: 'source' | 'packed' } = {}): string[] {
  const failures: string[] = [];

  if (mode === 'source') {
    for (const tree of CONTENT_TREES) {
      const dir = join(repoRoot, tree);
      if (!existsSync(dir)) {
        failures.push(`${tree}: missing from the repo - the lock would not describe it`);
        continue;
      }
      agentState(dir, failures);
      for (const file of walk(dir, SOURCE_SKIP_DIRS, repoRoot, failures)) {
        scanFile(file, repoRoot, failures, SHIPPED_BANNED);
      }
    }
    for (const { tree, skip } of REPO_TREES) {
      const dir = join(repoRoot, tree);
      if (!existsSync(dir)) {
        failures.push(`${tree}: missing from the repo - the gate expects to scan it`);
        continue;
      }
      const skipSet = skip ? new Set([...SOURCE_SKIP_DIRS, ...skip]) : SOURCE_SKIP_DIRS;
      for (const file of walk(dir, skipSet, repoRoot, failures)) {
        scanFile(file, repoRoot, failures, UNIVERSAL_BANNED);
      }
    }
    // Root-level files: README, LICENSE, configs. Directories are covered by the
    // tree lists, and `checkCoverage` is what holds them to that.
    for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
      if (SOURCE_SKIP_DIRS.has(entry.name) || ROOT_SKIP.has(entry.name) || ROOT_SKIP_SHAPE.test(entry.name)) continue;
      if (entry.isSymbolicLink()) {
        failures.push(`${entry.name}: a symlink - the gate cannot scan what it points at`);
      } else if (entry.isFile()) {
        scanFile(join(repoRoot, entry.name), repoRoot, failures, UNIVERSAL_BANNED);
      }
    }
    checkCoverage(repoRoot, failures);
    return failures;
  }

  const manifest = JSON.parse(readFileSync(join(wizardRoot, 'package.json'), 'utf8')) as {
    files?: string[];
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

  /*
   * A range that is an address on the machine which packed the tarball.
   *
   * npm publishes `workspace:*` verbatim: this is a pnpm workspace, so npm sees
   * no workspace to take a version from, and the string reaches the registry
   * unchanged. Every `npm i @chatfuel/wizard` then fails on resolution, for
   * everyone, and nothing before the publish says so - the file list is right,
   * the bytes are right, and the package is inert.
   *
   * devDependencies are deliberately not checked. Nobody installs those from a
   * published package, and the workspace packages listed there are bundled into
   * `dist` at build time rather than resolved at run time, so a local address is
   * the honest thing for them to carry.
   */
  const LOCAL_PROTOCOL = /^(?:workspace|link|file|portal|catalog):/;
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (LOCAL_PROTOCOL.test(range)) {
        failures.push(`package.json "${field}" ${name}: ${range} - a local address no registry can resolve`);
      }
    }
  }

  const shipped = [...(manifest.files ?? []), 'package.json', 'README.md', 'LICENSE'];
  /* An entry of `files` that is not on disk shipped nothing, and for a
     CHANGELOG that is a fact about the release rather than a problem. For these
     four it is the mode losing its subject: they are the bytes that run on the
     user's machine and the lock that decides what content is fetched, and this
     walk is the only thing that ever reads them. Missing, the whole packed mode
     becomes a walk over nothing that prints the same success. */
  const REQUIRED = new Set(['bin', 'dist', 'manifests', 'content.lock']);
  for (const entry of new Set(shipped)) {
    const target = join(wizardRoot, entry);
    if (!existsSync(target)) {
      if (REQUIRED.has(entry))
        failures.push(`${entry}: listed in package.json "files" and not there - nothing scanned it`);
      continue;
    }
    if (statSync(target).isDirectory()) {
      for (const file of walk(target, SKIP_DIRS, wizardRoot, failures))
        scanFile(file, wizardRoot, failures, SHIPPED_BANNED);
    } else {
      scanFile(target, wizardRoot, failures, SHIPPED_BANNED);
    }
  }

  /*
   * The package used to carry the content trees, and this is what watched them.
   * It watches the manifests now, and the rule is narrower because the directory
   * is: a module manifest is the only kind of file prepack puts there, so
   * anything else arrived by a route nobody designed.
   */
  const manifests = join(wizardRoot, MANIFEST_DIR);
  if (existsSync(manifests)) {
    for (const file of walk(manifests, SKIP_DIRS, wizardRoot, failures)) {
      const name = toPosix(relative(wizardRoot, file));
      const inside = toPosix(relative(manifests, file));
      if (!/^content\/modules\/[^/]+\/module\.json$/.test(inside)) {
        failures.push(`${name}: not a module manifest`);
      }
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const mode = process.argv.includes('--packed') ? 'packed' : 'source';
  const failures = checkPublishable({ mode });
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    console.error(`\ncheck-publishable (${mode}): ${failures.length} problem(s).`);
    process.exit(1);
  }
  console.log(`check-publishable (${mode}): clean.`);
}
