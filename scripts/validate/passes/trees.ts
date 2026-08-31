// ---------------------------------------------------------------------------
// Pass -1 — the trees every other pass reads
//   Eight passes below open one of three directories and return quietly when it
//   is not there. That is the right shape for a pass — a missing tree is not
//   ITS finding to report, and thirteen copies of the same complaint help
//   nobody — but it left the whole run able to pass by having nothing to check:
//   a moved directory, a bad merge, a `validate` run from the wrong root, and
//   the summary line says every check passed.
//
//   So the question is asked once, before anything else runs, and a missing
//   tree ends the run there rather than letting twenty passes report their own
//   silence as success.
//
//   The list has to hold every tree a pass reads, or the summary's promise is
//   only true of the ones somebody remembered: the proxy and api-client sources
//   and content/skills were missing, and the template-invariants pass turned
//   two of its checks off in silence when it could not find the first of them.
// ---------------------------------------------------------------------------
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

/** True when every tree is there — false means nothing below may run. */
export function checkTrees(ctx: ValidateContext): boolean {
  const required: [dir: string, what: string][] = [
    [ctx.modulesDir, 'the manifests, skills and migrations of every module'],
    [ctx.shellDir, 'the scaffold template — integrity, invariants, imports, cycles and design'],
    [join(ctx.shellDir, 'src', 'modules'), "the modules' React trees — import cycles and the provider/consumer split"],
    [ctx.uiSrc, 'the design system the modules are checked against'],
    [join(ctx.root, 'packages'), 'the wizard, the manifest schema and the design-system gallery'],
    [join(ctx.root, 'packages', 'design-system', 'src'), 'the gallery, held to the same class rules as the app'],
    [
      join(ctx.root, 'content', 'vite-plugin-proxy', 'src'),
      "the proxy — the bot fence, and the template's own imports",
    ],
    [join(ctx.root, 'content', 'api-client', 'src'), 'the generated-client surface the template invariants read'],
    [join(ctx.root, 'content', 'skills'), "the wizard's own skill, held to the same reference lint as a module's"],
    [
      join(ctx.root, 'content', 'schema'),
      'the SDL and its possible types — the schema every generated document is checked against',
    ],
    [join(ctx.root, 'content', 'codegen'), 'the generator body this repository and every generated app both run'],
    [join(ctx.root, 'docs'), 'the contributor documentation, scanned for GraphQL examples the schema no longer has'],
  ];
  let missing = false;
  for (const [dir, what] of required) {
    if (existsSync(dir)) continue;
    fail(`${relative(ctx.root, dir) || dir} is not there — it holds ${what}, and nothing below can check it`);
    missing = true;
  }
  return !missing;
}
