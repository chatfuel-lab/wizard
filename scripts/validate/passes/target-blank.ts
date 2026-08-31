/* Pass 15 — every target="_blank" carries a rel.
   ---------------------------------------------------------------------------
   An anchor that opens a new browsing context without `rel` hands the opened
   page a live `window.opener` back to ours. That page can then navigate this
   tab wherever it likes — a sign-in screen wearing the deployment's own
   address is the usual demonstration — and the user has no way to tell, having
   never left the tab they trusted. Browsers now imply `noopener` for
   `target="_blank"` on their own, but a repository that ships its source onto
   other people's disks cannot decide which browser reads it, and a mixed
   codebase where some anchors say it and others rely on a default teaches the
   next reader that saying it is optional.

   Every anchor in the tree already carries one. The pass exists so the next
   one cannot land without: what is easy to remember today is exactly what a
   reviewer stops noticing after the twentieth identical anchor.

   `rel` and not a specific value, deliberately. `noreferrer` implies `noopener`
   per the HTML spec, `noopener` alone withholds the handle without withholding
   the Referer header, and both are correct answers to a different question —
   whether the destination should learn where the click came from. Pinning one
   of them here would be this pass overruling that choice.

   This pass is the only thing checking it. eslint's react/jsx-no-target-blank
   would be the same rule, but eslint-plugin-react is not configured here — the
   config carries react-hooks and nothing else — and content/modules/, where
   most of these anchors live, is a globalIgnores entry anyway because it is
   shipped content rather than code this repo runs. */
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

/** `target="_blank"`, `target={'_blank'}`, and the same with the other quotes. */
const TARGET_BLANK = /target=(?:"_blank"|'_blank'|\{\s*(?:"_blank"|'_blank'|`_blank`)\s*\})/g;
/* An attribute boundary, not a word boundary: `\brel` also matches the tail of
   `data-related=`, `aria-relevant=` and a prop named `related`, any of which
   sharing an opening tag with target="_blank" would wave the anchor through. */
const REL_ATTRIBUTE = /(?:^|[\s{])rel\s*=/;

/**
 * The opening tag the attribute at `at` belongs to, as source text.
 *
 * Backwards to the `<` that starts the tag, then forwards to the `>` that ends
 * it — counting `{}` on the way out, so a className holding a template literal
 * with a `>` in it does not end the tag early. Returns the whole rest of the
 * file if the tag never closes, which only a truncated file can do and which
 * the caller then reports honestly rather than silently passing.
 */
function openingTag(source: string, at: number): string {
  let start = at;
  while (start > 0 && source[start - 1] !== '<') start -= 1;
  let depth = 0;
  for (let i = at; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return source.slice(start, i);
  }
  return source.slice(start);
}

export function checkTargetBlank(ctx: ValidateContext): void {
  const { root } = ctx;
  // Both directories are checked to exist by pass -1, before any pass runs.
  for (const dir of [join(root, 'packages'), join(root, 'content')]) {
    for (const file of walkAll(dir)) {
      if (!/\.(tsx|ts|jsx|js|html)$/.test(file)) continue;
      if (file.includes(`${sep}dist${sep}`)) continue;
      const source = readFileSync(file, 'utf8');
      if (!source.includes('_blank')) continue;
      for (const match of source.matchAll(TARGET_BLANK)) {
        if (REL_ATTRIBUTE.test(openingTag(source, match.index))) continue;
        fail(
          `${relative(root, file)}:${source.slice(0, match.index).split('\n').length}: ` +
            `target="_blank" with no rel. The opened page keeps a handle on this tab through ` +
            `window.opener and can navigate it anywhere. Add rel="noreferrer" (which implies ` +
            `noopener), or rel="noopener" if the destination should still see the Referer.`,
        );
      }
    }
  }
}
