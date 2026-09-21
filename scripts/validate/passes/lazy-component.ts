// ---------------------------------------------------------------------------
// Pass 21 — lazy components: a module's descriptor names its root as a
// `React.lazy` component, so the module is a chunk fetched on the first visit
// rather than part of the first load.
//
// `ModuleDescriptor.Component` is typed `ComponentType`, which an eagerly
// imported component satisfies just as well — the rule lives in a comment in
// content/shell/src/modules/types.ts and nowhere a compiler looks. Every module
// keeps it today, and the day one does not, nothing fails: the app works, the
// rail works, and the first load quietly carries that module's code and its
// generated GraphQL documents for every person who never opens it.
// ---------------------------------------------------------------------------
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

/** `Component: lazy(() => import('./LivechatApp')…` — the path is the capture. */
const LAZY_COMPONENT_RE = /^\s*Component:\s*lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)/m;

/** Any `Component:` line at all, to tell "eager" apart from "not declared here". */
const COMPONENT_RE = /^\s*Component:\s*(.+)$/m;

/** A value import of `path`. `import type` is erased and costs the chunk nothing. */
const staticImportOf = (path: string): RegExp =>
  new RegExp(`^import\\s+(?!type\\b)[^;]*?from\\s+'${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'm');

export function checkLazyComponents(ctx: ValidateContext): void {
  const { shellDir, manifests } = ctx;

  for (const [id, m] of [...manifests.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (m.status !== 'ready') continue;
    if (!m.app) continue;
    const file = `content/shell/src/modules/${id}/index.tsx`;
    const path = join(shellDir, 'src', 'modules', id, 'index.tsx');
    // A ready module with an app and no index.tsx is pass 7's failure.
    if (!existsSync(path)) continue;
    const source = readFileSync(path, 'utf8');

    const lazy = LAZY_COMPONENT_RE.exec(source);
    if (!lazy) {
      const found = COMPONENT_RE.exec(source)?.[1]?.trim().replace(/,$/, '');
      fail(
        `${file}: ${found ? `Component is "${found}"` : "could not read the descriptor's Component"} — it has to be ` +
          "`lazy(() => import('./<Root>').then((m) => ({ default: m.<Root> })))`, so the module is its own chunk. " +
          'An eager component typechecks and ships in the first load (scripts/validate/passes/lazy-component.ts).',
      );
      continue;
    }

    // The other way to lose the chunk: lazy() in the descriptor, and the same
    // file imported statically a few lines up.
    const root = lazy[1]!;
    if (staticImportOf(root).test(source)) {
      fail(
        `${file}: imports "${root}" statically as well as through lazy() — the static import pulls the module into ` +
          'the first load and the lazy() around it splits nothing. Import types from it with `import type`.',
      );
    }
  }
}
