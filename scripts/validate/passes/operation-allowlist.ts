// ---------------------------------------------------------------------------
// Pass 17 — the proxy's operation allowlist must be what the modules derive to
// ---------------------------------------------------------------------------
// content/vite-plugin-proxy/src/allowedOperations.ts is a pure function of the
// operations.graphql files: the root fields of everything the app sends. So it
// is checked by re-deriving it, which catches a hand edit and a stale copy
// alike — and a stale copy is the failure that matters, because a module that
// gained an operation and a list that did not is a feature that 403s in a
// deployment with the fence on.
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { ALLOWED_OPERATIONS_FILE, deriveAllowedOperations, renderAllowedOperations } from '../../allowed-operations.ts';
import type { ValidateContext } from '../context.ts';
import { fail } from '../report.ts';

export function checkOperationAllowlist(ctx: ValidateContext): void {
  const label = relative(ctx.root, ALLOWED_OPERATIONS_FILE);
  if (!existsSync(ALLOWED_OPERATIONS_FILE)) {
    fail(`${label} is missing — it is generated: run \`node scripts/allowed-operations.ts\``);
    return;
  }
  const derived = renderAllowedOperations(deriveAllowedOperations(ctx.modulesDir));
  if (readFileSync(ALLOWED_OPERATIONS_FILE, 'utf8') !== derived) {
    fail(
      `${label} is not what the modules' operations.graphql derive to — it is generated, so ` +
        're-run `node scripts/allowed-operations.ts` rather than editing it',
    );
  }
}
