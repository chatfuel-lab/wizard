/* Pass 11(k) — no raw NUL byte in source.
   ---------------------------------------------------------------------------
   A literal NUL inside a template string is a real and reasonable-looking
   trick: it makes a composite sort key whose separator cannot occur in either
   half and sorts below every printable character. It runs correctly. It
   type-checks. It builds. And it arrived in this repository exactly that way.

   What it also does is turn the file BINARY as far as git is concerned — git's
   test is a NUL in the first 8000 bytes and nothing else. No diff, no blame, no
   three-way merge; a reviewer opening the pull request is shown
   `Bin 0 -> 13411 bytes` where the code should be. The byte is invisible in
   every editor too, so the next person to touch that line deletes it without
   ever learning it was there.

   The escape `\u0000` is the same value at runtime and none of the above.
   The rule is about the file staying readable, not about the character being
   the wrong choice.

   NUL and only NUL, deliberately. Other C0 characters are odd but git does not
   care about them, and `packages/wizard/src/art.ts` shows the legitimate use:
   a raw ESC is how you write an ANSI sequence. A pass that needs an exemption
   list on the day it lands is a pass that will collect exemptions forever. */
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';
import { walkAll } from '../walk.ts';

export function checkNulBytes(ctx: ValidateContext): void {
  const { root } = ctx;
  // Both directories are checked to exist by pass -1, before any pass runs.
  for (const dir of [join(root, 'packages'), join(root, 'content')]) {
    for (const file of walkAll(dir)) {
      if (!/\.(ts|tsx|mjs|js|css|json|md|graphql)$/.test(file)) continue;
      if (file.includes(`${sep}generated${sep}`) || file.includes(`${sep}dist${sep}`)) continue;
      const source = readFileSync(file, 'utf8');
      const at = source.indexOf('\u0000');
      if (at < 0) continue;
      fail(
        `${relative(root, file)}:${source.slice(0, at).split('\n').length}: a raw NUL byte sits ` +
          `in the source. Git calls the whole file binary for it — no diff, no blame, no merge, ` +
          `and a reviewer is shown a byte count instead of the code. Write it as \\u0000; the ` +
          `runtime value is identical.`,
      );
    }
  }
}
