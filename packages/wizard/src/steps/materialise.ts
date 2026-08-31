import * as p from '@clack/prompts';
import { contentPathsFor } from '../content';
import { materialise } from '../contentStore';
import type { WizardContext } from '../context';

/**
 * Fetch the content this run needs, before the run writes anything.
 *
 * A repo checkout has it all already and there is nothing to say. From a
 * published package the files come from the commit the lock pins, are checked
 * against its digests, and land in a cache named after that commit — so this
 * step is silent on the second run against the same pin, and a run that dies
 * here dies before an app directory exists.
 */
export async function materialiseContent(ctx: WizardContext): Promise<void> {
  const lock = ctx.content.lock;
  if (!lock) return;

  const paths = contentPathsFor(lock, ctx.registry.closure(ctx.answers.modules));
  const spinner = p.spinner();
  spinner.start('Fetching the app template');
  try {
    const result = await materialise({
      lock,
      root: ctx.content.root,
      paths,
      onProgress: (done, total) => spinner.message(`Fetching the app template (${done}/${total})`),
    });
    spinner.stop(
      result.fetched === 0
        ? `App template ready (${result.cached} files, already downloaded)`
        : `App template ready (${result.fetched} files fetched, ${result.cached} already here)`,
    );
  } catch (err) {
    spinner.stop('Could not fetch the app template', 1);
    throw err;
  }
}
