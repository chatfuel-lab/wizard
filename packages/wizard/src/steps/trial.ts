import * as p from '@clack/prompts';
import pc from 'picocolors';
import { execa } from 'execa';
import { hasErrorCode } from '@chatfuel/api-client';
import { stepArt } from '../art';
import {
  BillingProductsDocument,
  pickMonthlyPricing,
  StripePaymentLinkDocument,
  StripeTrialLinkDocument,
  WorkspaceSubscriptionDocument,
} from '../billing';
import { ApiWizardError, WizardError } from '../errors';
import { COUPON_CODE, COUPON_VALUE, DASHBOARD_URL } from '../constants';
import type { WizardContext } from '../context';

/**
 * Starting the workspace's trial.
 *
 * A workspace with no subscription has no AI: the bot answers nothing, and the
 * finished app looks broken in a way that has nothing to do with the code the
 * wizard just wrote. Nothing attaches a trial on the way in, so this is where
 * it gets attached — and it is worth blocking on, because a person who leaves
 * here without it will spend the evening debugging a scaffold that is fine.
 *
 * The trial's length is the server's business; this step never sends one.
 *
 * The wait is not open-ended. Checkout wants a card even for a trial, so
 * somebody without one at hand must be able to walk away and still finish.
 * After PATIENCE_MS the step offers exactly that, and says plainly what the
 * app will do until they come back.
 *
 * A trial is not offered for every workspace: `TrialNotAllowed` is an ordinary
 * answer, not a failure, and the step falls back to the plain checkout, because
 * a workspace with no plan has no AI either way. What gets printed is the same
 * for both - the reader has the same thing to do, and which mutation answered
 * is not something they can act on.
 *
 * --dry-run ends the step early and without ending the run: it may create
 * nothing, and a checkout session is something.
 */

/** How often the subscription is re-read while the browser is on Checkout. */
const POLL_INTERVAL_MS = 3_000;
/** How long to wait before offering a way out. */
const PATIENCE_MS = 5 * 60_000;
/** The catalogue is a plain read; a few retries cover a slow moment, not an outage. */
const CATALOGUE_ATTEMPTS = 3;
const CATALOGUE_RETRY_MS = 2_000;
/**
 * A browser that opens the instant the link is printed takes the screen with
 * it, and the coupon is never read — which is the one line here that is worth
 * money to whoever is reading. So the terminal gets a beat first.
 */
const READ_FIRST_MS = 6_000;

const NO_PLAN_WARNING = 'The AI will not answer until the workspace has a plan.';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Best-effort browser open. The URL is printed before this runs, so a machine
 * with no display, no opener, or no permission to spawn one loses nothing —
 * and that is also why a refusal here is silent: the link is already on screen.
 *
 * The address comes back from a mutation, so it is the server's string and not
 * this process's. `open` and `xdg-open` both take whatever they are handed and
 * ask the desktop what it is registered to: `file://` opens a file manager,
 * and on a Linux desktop a URL scheme is a line in a .desktop entry, which is
 * to say an arbitrary command. https is the only answer that means a browser,
 * so it is the only one that gets passed on.
 *
 * On Windows it is not the scheme but the opener: `cmd /c start` re-parses its
 * argument, and `&`, `^` and `|` are all legal in a query string. rundll32
 * hands the address to the shell as one string and does not go through cmd at
 * all, which is what makes the checkout URL — several hundred characters of
 * Stripe query — arrive whole.
 */
async function openInBrowser(url: string): Promise<boolean> {
  try {
    if (new URL(url).protocol !== 'https:') return false;
  } catch {
    return false;
  }
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
        : ['xdg-open', [url]];
  const result = await execa(command, args as string[], { reject: false, timeout: 10_000, stdio: 'ignore' });
  return result.exitCode === 0;
}

/** null = never been through checkout. */
async function readSubscription(ctx: WizardContext, workspaceId: string): Promise<unknown | null> {
  const data = await ctx.client!.query(WorkspaceSubscriptionDocument, { workspaceID: workspaceId });
  return data.currentUser.workspace.subscription;
}

export async function trial(ctx: WizardContext): Promise<void> {
  if (!ctx.client) throw new WizardError('internal: trial before token step');
  const workspace = ctx.answers.workspace;
  if (!workspace) throw new WizardError('internal: trial before workspacePick');

  const spinner = p.spinner();
  spinner.start('Checking the workspace subscription…');
  let existing: unknown | null;
  try {
    existing = await readSubscription(ctx, workspace.id);
  } catch (err) {
    spinner.stop('Could not read the workspace subscription');
    throw new ApiWizardError(
      `Could not read the subscription of “${workspace.title}”`,
      err,
      'The token must belong to the account that owns the workspace.',
    );
  }

  if (existing != null) {
    spinner.stop(`${workspace.title} is subscribed`);
    ctx.answers.trialStarted = true;
    return;
  }
  spinner.stop(`${workspace.title} has no subscription yet`);

  if (ctx.flags.dryRun) {
    // Reading the subscription above creates nothing, but the link below opens
    // a Stripe checkout session on the workspace — which is an account asset,
    // and --dry-run promises none are made. So the step stops here.
    p.log.info(`--dry-run: would start a trial on “${workspace.title}”.`);
    ctx.answers.trialStarted = false;
    return;
  }

  p.log.message(stepArt('trial'));

  const pricing = await loadMonthlyPricing(ctx);
  if (!pricing) {
    // A catalogue the wizard cannot read is not a reason to throw away the run.
    p.log.warn(`Could not load the Chatfuel plans. Start the trial at ${DASHBOARD_URL}.`);
    p.log.warn(NO_PLAN_WARNING);
    ctx.answers.trialStarted = false;
    return;
  }

  // Checkout insists on absolute URLs and the wizard has no address of its own,
  // so both ends land on the dashboard. Neither is how the wizard finds out
  // what happened - it asks the API.
  const linkVars = {
    workspaceID: workspace.id,
    pricingID: pricing.id,
    successURL: DASHBOARD_URL,
    cancelURL: DASHBOARD_URL,
  };

  const linkSpinner = p.spinner();
  linkSpinner.start('Preparing your trial…');
  let url: string;
  try {
    const data = await ctx.client.mutate(StripeTrialLinkDocument, linkVars);
    url = data.stripeCreatePaymentLinkWithTrial;
    linkSpinner.stop('Trial ready');
  } catch (err) {
    if (hasErrorCode(err, 'TrialNotAllowed')) {
      // The trial belongs to the account, not to the workspace: whoever has had
      // one already gets no second one here, and this is the ordinary case for
      // every workspace after the first. The workspace still needs a plan for
      // the AI to answer anything, so the step offers the same checkout without
      // the free days rather than leaving somebody with a mute app.
      linkSpinner.message('Preparing checkout…');
      try {
        const data = await ctx.client.mutate(StripePaymentLinkDocument, linkVars);
        url = data.stripeCreatePaymentLink;
        linkSpinner.stop('Checkout ready');
      } catch (inner) {
        linkSpinner.stop('Could not prepare checkout');
        throw billingError(inner, workspace.title, 'Could not prepare checkout');
      }
    } else {
      linkSpinner.stop('Could not prepare the trial');
      throw billingError(err, workspace.title, 'Could not prepare the trial');
    }
  }

  // Not a note: a checkout URL is hundreds of characters long and a boxed one
  // stretches the frame past the width of any terminal. Bare lines wrap, and a
  // wrapped URL is still one thing to copy.
  // One heading for both links. Which mutation answered is the server's
  // business; whoever is reading has the same thing to do either way, and a
  // line about what this account has already used tells them nothing they can
  // act on.
  p.log.message(
    [
      pc.bold(`Activate your trial, and use promo code ${COUPON_CODE} for an additional ${COUPON_VALUE} in credits:`),
      pc.cyan(url),
      '',
      ...couponBlock(),
    ].join('\n'),
  );

  if (ctx.flags.yes) {
    p.log.warn(NO_PLAN_WARNING);
    ctx.answers.trialStarted = false;
    return;
  }

  const opening = p.spinner();
  opening.start('Opening checkout in your browser…');
  await sleep(READ_FIRST_MS);
  const opened = await openInBrowser(url);
  opening.stop(opened ? 'Checkout is open in your browser' : 'Open the link above in your browser');

  ctx.answers.trialStarted = await waitForSubscription(ctx, workspace.id, workspace.title);
  if (!ctx.answers.trialStarted) p.log.warn(NO_PLAN_WARNING);
}

/**
 * The failures the two link mutations share. Each names something to go and do,
 * which is why they end the run rather than being warned about: the workspace
 * is billed elsewhere, holds more bots than the plan allows, or belongs to
 * somebody else's account.
 */
function billingError(err: unknown, title: string, fallback: string): WizardError {
  if (hasErrorCode(err, 'BillingPlatformNotAllowed')) {
    return new ApiWizardError(
      `“${title}” is not billed through Stripe`,
      err,
      `Start its plan at ${DASHBOARD_URL}, then re-run.`,
    );
  }
  if (hasErrorCode(err, 'TooManyBotsInWorkspace')) {
    return new ApiWizardError(
      `“${title}” holds more bots than this plan allows`,
      err,
      `Remove a bot or pick a bigger plan at ${DASHBOARD_URL}, then re-run.`,
    );
  }
  if (hasErrorCode(err, 'NotEnoughPermissions')) {
    return new ApiWizardError(
      `This account cannot start a trial on “${title}”`,
      err,
      'The token must belong to the account that pays for the workspace.',
    );
  }
  return new ApiWizardError(fallback, err);
}

/**
 * The coupon, framed. The heading above already makes the offer, so the box
 * carries only the thing to type: a frame around a whole sentence makes the
 * sentence look like the code.
 */
function couponBlock(): string[] {
  const rule = '─'.repeat(COUPON_CODE.length + 4);
  return [
    pc.green(`  ╭${rule}╮`),
    `  ${pc.green('│')}  ${pc.bold(pc.green(COUPON_CODE))}  ${pc.green('│')}`,
    pc.green(`  ╰${rule}╯`),
    'Enter it in the promo field at checkout.',
  ];
}

/** The monthly plan, or undefined when the catalogue will not answer. */
async function loadMonthlyPricing(ctx: WizardContext) {
  for (let attempt = 1; attempt <= CATALOGUE_ATTEMPTS; attempt += 1) {
    try {
      const data = await ctx.client!.query(BillingProductsDocument, {});
      const pricing = pickMonthlyPricing(data.env.stripeProductsSchema.business);
      if (pricing) return pricing;
    } catch {
      // Falls through to the retry; the last failure is reported by the caller.
    }
    if (attempt < CATALOGUE_ATTEMPTS) await sleep(CATALOGUE_RETRY_MS);
  }
  return undefined;
}

/**
 * Waits for the subscription to appear, offering a way out every PATIENCE_MS.
 * Returns whether it appeared.
 */
async function waitForSubscription(ctx: WizardContext, workspaceId: string, title: string): Promise<boolean> {
  const waiting = 'Waiting for the workspace to be subscribed…';
  const spinner = p.spinner();
  spinner.start(waiting);
  let waitedMs = 0;
  for (;;) {
    await sleep(POLL_INTERVAL_MS);
    waitedMs += POLL_INTERVAL_MS;
    try {
      if ((await readSubscription(ctx, workspaceId)) != null) {
        spinner.stop(`${title} is subscribed`);
        return true;
      }
    } catch {
      // A blip mid-checkout is not an answer; the next tick asks again.
    }
    if (waitedMs < PATIENCE_MS) continue;

    spinner.stop('Still waiting');
    const giveUp = await p.confirm({
      message: 'Continue without a plan?',
      initialValue: false,
    });
    if (p.isCancel(giveUp)) throw new WizardError('Cancelled.');
    if (giveUp) return false;
    waitedMs = 0;
    spinner.start(waiting);
  }
}
