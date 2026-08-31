// ---------------------------------------------------------------------------
// Pass 7 — shell integrity: every ready module with app has
// content/shell/src/modules/<id>/index.tsx (and its manifest's `hidden` flag
// matches the descriptor's) exporting moduleDescriptor, is listed in the shell
// registry (exactly), has handoff.md, and its embed.roots resolve under
// content/shell
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

export function checkShellIntegrity(ctx: ValidateContext): void {
  const { shellDir, modulesDir, manifests } = ctx;

  const readyWithApp = [...manifests.entries()].filter(([, m]) => m.status === 'ready' && m.app);
  const registrySource = readFileSync(join(shellDir, 'src', 'modules', 'index.ts'), 'utf8');
  const registryIds = new Set(
    [...registrySource.matchAll(/import \{ moduleDescriptor as \w+ \} from '\.\/([a-z0-9-]+)'/g)].map((m) => m[1]),
  );

  for (const [id, m] of readyWithApp) {
    const descriptorPath = join(shellDir, 'src', 'modules', id, 'index.tsx');
    if (!existsSync(descriptorPath)) {
      fail(`content/shell/src/modules/${id}/index.tsx is missing for ready module "${id}"`);
    } else {
      const descriptor = readFileSync(descriptorPath, 'utf8');
      if (!descriptor.includes('export const moduleDescriptor')) {
        fail(
          `content/shell/src/modules/${id}/index.tsx must export const moduleDescriptor (fixed name — the wizard regenerates the registry from it)`,
        );
      }
      // `hidden` is read from the manifest by the wizard (the agent handoff is
      // written from manifests alone) and from the descriptor by the shell.
      // Split truth would print a deep link to a route that does not exist.
      const descriptorHidden = /\bhidden:\s*true\b/.test(descriptor);
      if (descriptorHidden !== Boolean(m.hidden)) {
        fail(
          `content/modules/${id}/module.json says hidden: ${Boolean(m.hidden)} but ` +
            `content/shell/src/modules/${id}/index.tsx says ${descriptorHidden} — they must agree`,
        );
      }
    }
    if (!registryIds.has(id)) {
      fail(`content/shell/src/modules/index.ts: ready module "${id}" is not in the registry`);
    }
    if (!existsSync(join(modulesDir, id, 'handoff.md'))) {
      fail(`content/modules/${id}/handoff.md is missing — every ready module with an app needs a handoff fragment`);
    }
    /* An embed with no roots at all: the schema now refuses it, and this pass
       reads manifests the schema has not necessarily seen. Named here because
       the entry-component check below resolves `roots[0]` against the shell
       directory, and an empty list resolved to the shell itself — the export
       was then looked for across every module in it, and found. */
    if (m.app?.embed && (m.app.embed.roots ?? []).length === 0) {
      fail(`content/modules/${id}/module.json: app.embed declares no roots`);
    }
    for (const embedRoot of m.app?.embed?.roots ?? []) {
      if (!existsSync(join(shellDir, embedRoot))) {
        fail(`content/modules/${id}/module.json: embed root "${embedRoot}" does not exist under content/shell/`);
      }
    }
    if (m.app?.embed) {
      // Embed mode is agent-driven — the playbook is the wiring guide, so a
      // ready embeddable module without one would strand the agent.
      const playbook = m.app.embed.playbook;
      if (!playbook) {
        fail(
          `content/modules/${id}/module.json: app.embed.playbook is missing (ready modules must ship playbooks/embed.md)`,
        );
      } else if (!existsSync(join(modulesDir, id, m.skill?.dir ?? 'skill', playbook))) {
        fail(`content/modules/${id}/module.json: embed playbook "${playbook}" does not exist in the skill dir`);
      }
      // The handoff prompt tells the agent to mount <entryComponent /> — it
      // must actually be exported from the module's shell subtree.
      const entry = m.app.embed.entryComponent;
      if (entry) {
        const root = m.app.embed.roots?.[0];
        // Both cases are already failures above: no roots at all, and a root
        // that is not there. Resolving either against the shell would search
        // the whole of it and pass on somebody else's export.
        if (!root) continue;
        const rootDir = join(shellDir, root);
        if (!existsSync(rootDir)) continue;
        const exportRe = new RegExp(`export\\s+(async\\s+)?(function|const|class)\\s+${entry}\\b`);
        const found = [...walkAll(rootDir)].some(
          (file) => /\.(ts|tsx)$/.test(file) && exportRe.test(readFileSync(file, 'utf8')),
        );
        if (!found) {
          fail(
            `content/modules/${id}/module.json: embed.entryComponent "${entry}" is not exported anywhere under ${root}`,
          );
        }
      }
    }
  }
  // The shared walkthroughs every per-module playbook links to.
  for (const name of ['embed.md', 'customize.md']) {
    if (!existsSync(join(modulesDir, 'core', 'skill', 'playbooks', name))) {
      fail(`content/modules/core/skill/playbooks/${name} is missing — the per-module playbooks link to it`);
    }
  }
  for (const id of registryIds) {
    if (!manifests.get(id)?.app || manifests.get(id)?.status !== 'ready') {
      fail(`content/shell/src/modules/index.ts: registry lists "${id}" which is not a ready module with an app`);
    }
  }
}
