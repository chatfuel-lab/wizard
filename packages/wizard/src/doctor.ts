import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { detectAgents } from './agents';
import { outboundFetch, describeProxy, readBytesCapped } from './net';
import { createContentSource, type ContentSource } from './content';
import { contentUrl } from './contentOrigin';
import { lockForRun, refFrom } from './contentRef';
import { CONTENT_TREE, type ContentLock } from './contentLock';
import { CONTENT_FILE_MAX_BYTES } from './contentStore';
import { digestOf } from './lockFormat';
import { MIN_NODE, nodeIsSupported } from './node';
import { loadRegistry } from './registry';

/**
 * `chatfuel-wizard doctor` — what the wizard can see before it asks anything.
 *
 * It doubles as the packaging gate: a tarball that installs but cannot reach
 * the content it is pinned to looks perfectly healthy until someone reaches the
 * scaffold step, ten questions in. This asks the questions up front — is the
 * pin resolvable, is the cache writable, do the manifests parse — so
 * `pack-smoke` can fail the build instead of the user's evening.
 */
interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * Can this machine write where the fetched content goes? The cache is created
 * on the first run and never mentioned again, so a directory that cannot be
 * written — a read-only HOME, a stale root-owned cache from a `sudo npx` — is
 * a failure the wizard would otherwise hit halfway through its questions.
 */
function cacheCheck(root: string): Check {
  const probe = join(root, '.doctor-probe');
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(probe, '');
    return { label: 'content cache', ok: true, detail: root };
  } catch (err) {
    return { label: 'content cache', ok: false, detail: `${root} — ${err instanceof Error ? err.message : err}` };
  } finally {
    rmSync(probe, { force: true });
  }
}

/**
 * One real file, fetched and checked against its digest.
 *
 * Whether the pin resolves is not something a lock can answer about itself: the
 * commit has to exist at the origin and be readable without credentials. This
 * asks for the smallest file in it, which makes the answer cheap enough to ask
 * every time.
 */
/**
 * Which commit this machine would install from, and how it got there.
 *
 * The pin in the package is a floor, so the question `doctor` has to answer is
 * no longer "is the pin reachable" but "where does following the branch from
 * here land". Both halves are printed because the difference between them is
 * the whole story: same commit means an unresolved branch, and a resolution
 * that fell back says which wall it hit.
 *
 * A fallback is reported and not failed. The floor is a working install — it
 * is what every run did before the branch was followed at all — and a machine
 * behind a proxy that eats api.github.com is not a broken machine. The refusal
 * is the failure: a branch that no longer descends from the floor throws, and
 * arrives here as a red line naming the repository.
 */
async function refCheck(floor: ContentLock): Promise<{ check: Check; lock: ContentLock }> {
  const ref = refFrom();
  try {
    const { lock, resolution } = await lockForRun({ floor });
    const at = `${ref} → ${resolution.commit.slice(0, 12)} (${resolution.how})`;
    return {
      check: { label: 'content ref', ok: true, detail: resolution.why ? `${at} — ${resolution.why}` : at },
      lock,
    };
  } catch (err) {
    return {
      check: { label: 'content ref', ok: false, detail: err instanceof Error ? err.message : String(err) },
      lock: floor,
    };
  }
}

async function pinCheck(lock: ContentLock | undefined): Promise<Check> {
  if (!lock) return { label: 'content pin', ok: true, detail: 'repo checkout — nothing to fetch' };
  const path = `${CONTENT_TREE.modules}/core/module.json`;
  const url = contentUrl({ repo: lock.repo, commit: lock.commit }, path);
  try {
    const response = await outboundFetch(url);
    if (!response.ok) return { label: 'content pin', ok: false, detail: `${url} — HTTP ${response.status}` };
    const digest = digestOf(await readBytesCapped(response, CONTENT_FILE_MAX_BYTES, path));
    return digest === lock.files[path]
      ? { label: 'content pin', ok: true, detail: `${lock.repo}@${lock.commit.slice(0, 12)}` }
      : { label: 'content pin', ok: false, detail: `${path} does not match the digest in the lock` };
  } catch (err) {
    return { label: 'content pin', ok: false, detail: `${url} — ${err instanceof Error ? err.message : err}` };
  }
}

function contentChecks(content: ContentSource): Check[] {
  const checks: Check[] = [];

  /* A repo checkout has the files and no pin; a package has a pin and fetches
     the files. The one question worth asking of a checkout is whether the trees
     the wizard installs are all there. */
  if (!content.lock) {
    const must = (label: string, path: string) => checks.push({ label, ok: existsSync(path), detail: path });
    must('app template', content.shellPath('package.json'));
    must('ui sources', content.vendorPath('ui', 'src', 'index.ts'));
    must('api-client sources', content.vendorPath('api-client', 'src'));
    must('proxy sources', content.vendorPath('vite-plugin-proxy', 'src'));
  } else {
    checks.push({ label: 'content lock', ok: true, detail: `${Object.keys(content.lock.files).length} files pinned` });
    checks.push(cacheCheck(content.root));
  }

  try {
    const registry = loadRegistry(content);
    const ready = registry.ready();
    checks.push({
      label: 'module registry',
      ok: ready.length > 0,
      detail: `${ready.length} ready of ${registry.manifests.size}`,
    });
    /* Only where the skills are already on disk. From a package they arrive
       with everything else, once the run knows which modules were picked, and
       a check that failed until then would be reporting the design. */
    if (!content.lock) {
      for (const manifest of ready) {
        const dir = content.modulePath(manifest.id, manifest.skill.dir ?? 'skill');
        checks.push({ label: `skill: ${manifest.id}`, ok: existsSync(dir), detail: dir });
      }
    }
  } catch (err) {
    checks.push({
      label: 'module registry',
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
  return checks;
}

export async function doctor(): Promise<number> {
  const agents = await detectAgents();

  const checks: Check[] = [
    { label: 'node', ok: nodeIsSupported(), detail: `${process.versions.node} (need >= ${MIN_NODE})` },
    { label: 'outbound proxy', ok: true, detail: describeProxy() ?? 'none' },
    {
      label: 'coding agent',
      ok: agents.length > 0,
      detail:
        agents.length > 0
          ? agents.map((a) => `${a.name} (skills in ${a.skillsSubdir})`).join(', ')
          : 'none — the wizard offers to install one',
    },
  ];

  let content: ContentSource | null = null;
  try {
    content = createContentSource();
    checks.push({
      label: 'content',
      ok: true,
      detail: `${content.packaged ? 'packaged' : 'repo'} — ${content.root}`,
    });
  } catch (err) {
    checks.push({ label: 'content', ok: false, detail: err instanceof Error ? err.message : String(err) });
  }
  if (content) {
    checks.push(...contentChecks(content));
    let pinned = content.lock;
    if (pinned) {
      const resolved = await refCheck(pinned);
      checks.push(resolved.check);
      pinned = resolved.lock;
    }
    checks.push(await pinCheck(pinned));
  }

  // A missing agent is a nudge, not a failure — everything else is a hard stop.
  const failed = checks.filter((c) => !c.ok && c.label !== 'coding agent');
  for (const check of checks) {
    const mark = check.ok ? pc.green('ok  ') : check.label === 'coding agent' ? pc.yellow('warn') : pc.red('FAIL');
    console.log(`  ${mark}  ${check.label.padEnd(22)} ${pc.dim(check.detail)}`);
  }
  console.log('');
  console.log(
    failed.length === 0
      ? pc.green('  Everything the wizard needs is present.')
      : pc.red(`  ${failed.length} check(s) failed.`),
  );
  return failed.length === 0 ? 0 : 1;
}
