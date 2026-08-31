// ---------------------------------------------------------------------------
// Pass 4b — a module's shipped asset and the copy compiled into its app must
//           be the same bytes
// ---------------------------------------------------------------------------
// The contacts import wizard offers a sample CSV as a download, and the same
// file ships in the skill so an agent can point at it on disk. They are twins:
// the app cannot read `modules/` (import boundaries forbid `node:fs` in module
// code, and in a scaffolded app that tree does not exist), so the app carries
// a string literal. Three documents say "change one and change the other" and
// nothing enforced it, which is exactly the kind of promise that rots.
//
// Declared as data so a second module with the same shape is one line.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

interface AssetTwin {
  asset: string;
  source: string;
  literal: RegExp;
  what: string;
}

export function checkAssetTwins(ctx: ValidateContext): void {
  const ASSET_TWINS: AssetTwin[] = [
    {
      asset: join(ctx.modulesDir, 'contacts', 'skill', 'assets', 'contacts-sample.csv'),
      source: join(ctx.root, 'content', 'shell', 'src', 'modules', 'contacts', 'lib', 'importPlan.ts'),
      literal: /export const SAMPLE_CSV = `([\s\S]*?)`;/,
      what: "contacts' sample CSV",
    },
  ];

  for (const twin of ASSET_TWINS) {
    /* A twin is two files that have to agree. One of them missing is not a
       reason to stop asking - it is the answer, and `continue` reported it as
       agreement. */
    for (const side of [twin.asset, twin.source] as const) {
      if (!existsSync(side)) fail(`${relative(ctx.root, side)}: gone, so ${twin.what} is no longer checked against it`);
    }
    if (!existsSync(twin.asset) || !existsSync(twin.source)) continue;
    const match = twin.literal.exec(readFileSync(twin.source, 'utf8'));
    if (!match) {
      fail(
        `${relative(ctx.root, twin.source)}: could not find the SAMPLE_CSV literal that mirrors ${relative(ctx.root, twin.asset)}`,
      );
      continue;
    }
    /* Trailing whitespace is the one difference allowed: an editor keeps a final
       newline in the file, a template literal usually does not. */
    const onDisk = readFileSync(twin.asset, 'utf8').replace(/\s+$/, '');
    const inApp = match[1].replace(/\s+$/, '');
    if (onDisk !== inApp) {
      fail(
        `${twin.what} drifted: ${relative(ctx.root, twin.asset)} and the SAMPLE_CSV literal in ` +
          `${relative(ctx.root, twin.source)} are no longer the same rows. Change one, change the other.`,
      );
    }
  }
}
