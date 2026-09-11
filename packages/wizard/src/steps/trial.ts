import * as p from '@clack/prompts';
import pc from 'picocolors';
import { hasErrorCode } from '@chatfuel/api-client';
import { stepArt } from '../art';
import {
  BillingProductsDocument,
  pickMonthlyPricing,
  type Pricing,
  StripePaymentLinkDocument,
  StripeTrialLinkDocument,
  WorkspaceSubscriptionDocument,
} from '../billing';
import { ApiWizardError, WizardError } from '../errors';
import { COUPON_CODE, COUPON_VALUE, DASHBOARD_URL } from '../constants';
import { link } from '../link';
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
 * The checkout link is printed as a name where the terminal renders one and as
 * the address wherever it does not. Either way it is the same single-use
 * session, so the address is printed as well on the two paths that never reach
 * a browser: a run with no questions, and an open that reported failure.
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
const NO_PLAN_WARNING = 'The AI will not answer until the workspace has a plan.';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

  const { pricing, why } = await loadMonthlyPricing(ctx);
  if (!pricing) {
    // A catalogue the wizard cannot read is not a reason to throw away the run.
    p.log.warn(`Could not load the Chatfuel plans. Start the trial at ${link(DASHBOARD_URL)}.`);
    if (why) p.log.warn(why);
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

  /* Nothing here opens a browser: whoever is reading follows this link when
     they are ready, and a window that takes the screen mid-run takes the coupon
     with it. So this line is the only way in, and it is either a name the
     terminal can be clicked on or, where it cannot, the address itself —
     `clickable !== url` is the whole of that difference. The heading already
     says what to do, so the name is a noun and not a verb, and it is as true of
     the plain checkout as of the trial. */
  const clickable = link(url, 'Chatfuel checkout');

  // Not a note: what this line holds is sometimes a name and sometimes hundreds
  // of characters of Stripe query, and a boxed one of those stretches the frame
  // past the width of any terminal. Bare lines wrap, and a wrapped URL is still
  // one thing to copy.
  // One heading for both links. Which mutation answered is the server's
  // business; whoever is reading has the same thing to do either way, and a
  // line about what this account has already used tells them nothing they can
  // act on.
  p.log.message(
    [
      pc.bold(`Activate your trial, and use promo code ${COUPON_CODE} for an additional ${COUPON_VALUE} in credits:`),
      // Cyan is the house style for a standalone URL; the underline goes on
      // only where a label is what got printed, because a word that is not an
      // address does not otherwise read as something to click. With hyperlinks
      // off this line is byte for byte the line it always was.
      clickable === url ? pc.cyan(url) : pc.cyan(pc.underline(clickable)),
      '',
      ...couponBlock(),
    ].join('\n'),
  );

  if (ctx.flags.yes) {
    p.log.warn(NO_PLAN_WARNING);
    ctx.answers.trialStarted = false;
    return;
  }

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
      `Start its plan at ${link(DASHBOARD_URL)}, then re-run.`,
    );
  }
  if (hasErrorCode(err, 'TooManyBotsInWorkspace')) {
    return new ApiWizardError(
      `“${title}” holds more bots than this plan allows`,
      err,
      `Remove a bot or pick a bigger plan at ${link(DASHBOARD_URL)}, then re-run.`,
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

/**
 * The monthly plan, and why there is none when there is none.
 *
 * The reason is carried out rather than swallowed: this read is hand-written
 * against an API this repository does not generate from, so the way it fails is
 * a field that stopped existing — and a run that only says the catalogue would
 * not load sends whoever is reading to look at their account, which is the one
 * place the answer is not.
 */
async function loadMonthlyPricing(ctx: WizardContext): Promise<{ pricing?: Pricing; why?: string }> {
  let why: string | undefined;
  for (let attempt = 1; attempt <= CATALOGUE_ATTEMPTS; attempt += 1) {
    try {
      const data = await ctx.client!.query(BillingProductsDocument, {});
      const pricing = pickMonthlyPricing(data.env.stripeProductsSchema.business);
      if (pricing) return { pricing };
      why = 'the catalogue holds no monthly plan with the AI on it';
    } catch (err) {
      why = err instanceof Error ? err.message : String(err);
    }
    if (attempt < CATALOGUE_ATTEMPTS) await sleep(CATALOGUE_RETRY_MS);
  }
  return { why };
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
