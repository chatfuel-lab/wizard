import * as p from '@clack/prompts';
import { resolveContentSource } from '../content';
import { loadRegistry } from '../registry';
import type { WizardContext } from '../context';

/**
 * Decide which commit this run installs from.
 *
 * The package pins a commit, but that pin is a floor rather than a
 * destination: the run asks the repository what `main` is now, refuses
 * anything the floor is not an ancestor of, and installs from the answer. A
 * fix to a module reaches people the day it lands, and the wizard on npm is
 * only the program that fetches it.
 *
 * Placed before `resolveApp`, `mode` and `selectModules` because the module
 * picker reads manifests: resolve after them and a module added since the
 * release is a module nobody can choose.
 *
 * A failure here is not a failure of the run. Offline, rate-limited, behind a
 * proxy that eats api.github.com — every one of those ends at the floor, which
 * is the commit this wizard was published against and a working install.
 */
export async function resolveContent(ctx: WizardContext): Promise<void> {
  const { content, resolution } = await resolveContentSource(ctx.content);
  ctx.content = content;
  ctx.registry = loadRegistry(content);
  if (!resolution) return;
  if (resolution.how === 'floor' && resolution.why) {
    p.log.info(`Using the content this wizard shipped with — ${resolution.why}`);
  }
}
