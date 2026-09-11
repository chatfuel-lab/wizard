import { stripVTControlCharacters } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A workspace with no subscription has no AI, so the finished app answers
 * nothing. What is worth pinning here is the shape of that guarantee: the step
 * must not ask anything of a workspace that already pays, must not let a run
 * end quietly unsubscribed without saying so, and must always leave a way out —
 * checkout wants a card, and somebody without one still has to be able to
 * finish.
 *
 * clack is replaced with prompts that THROW, except `confirm`, which is
 * scripted: the only question this step may ever ask is the way out.
 */
const warnings: string[] = [];
const notes: string[] = [];
const confirmAnswers: boolean[] = [];
vi.mock('@clack/prompts', () => {
  const prompted = (name: string) => () => {
    throw new Error(`prompted when it should not have: ${name}`);
  };
  return {
    text: prompted('text'),
    password: prompted('password'),
    select: prompted('select'),
    multiselect: prompted('multiselect'),
    confirm: async () => {
      if (confirmAnswers.length === 0) throw new Error('confirm asked more often than scripted');
      return confirmAnswers.shift()!;
    },
    isCancel: () => false,
    note: () => {
      throw new Error('a checkout URL is too long to box');
    },
    intro: () => undefined,
    outro: () => undefined,
    log: {
      info: () => undefined,
      warn: (m: string) => warnings.push(m),
      error: () => undefined,
      success: () => undefined,
      message: (m: string) => notes.push(m),
    },
    spinner: () => ({
      start: () => undefined,
      message: () => undefined,
      stop: () => undefined,
      error: () => undefined,
    }),
  };
});

const { ChatfuelGraphQLError } = await import('@chatfuel/api-client');
const { createContext } = await import('../src/run');
const { trial } = await import('../src/steps/trial');
type WizardContext = import('../src/context').WizardContext;
type WizardFlags = import('../src/context').WizardFlags;

const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_wizard';
// Deliberately not a superstring of CHECKOUT_URL: the paid test asserts the
// trial link is absent, and a shared prefix would make that assertion pass
// whichever link was printed.
const PAID_URL = 'https://checkout.stripe.com/c/pay/cs_test_paidplan';

const PRODUCTS = {
  env: {
    stripeProductsSchema: {
      business: [
        {
          id: 'p1',
          name: 'Pro',
          featureSet: 'All',
          pricingList: [
            {
              id: 'pricing-annual',
              intervalUnit: 'Month',
              intervalCount: 12,
              price: '579',
              intervalPrice: '48.25',
              currency: 'Usd',
              isActive: true,
            },
            {
              id: 'pricing-monthly',
              intervalUnit: 'Month',
              intervalCount: 1,
              price: '69',
              intervalPrice: '69',
              currency: 'Usd',
              isActive: true,
            },
          ],
        },
        {
          // No AI on this one, so its cheaper monthly plan must be ignored.
          id: 'p0',
          name: 'Lite',
          featureSet: 'NoAI',
          pricingList: [
            {
              id: 'pricing-noai',
              intervalUnit: 'Month',
              intervalCount: 1,
              price: '9',
              intervalPrice: '9',
              currency: 'Usd',
              isActive: true,
            },
          ],
        },
      ],
    },
  },
};

const SUBSCRIPTION = { id: 's1', status: 'Active', isOnTrialPeriod: true };

interface Calls {
  linkVariables?: Record<string, string>;
  linkKind?: 'trial' | 'paid';
  subscriptionReads: number;
}

/** The trial link this run's server answers with, when it is not the usual one. */
let trialLink: string | undefined;

/**
 * @param appearsAfter how many subscription reads return null before one comes
 *   back with a subscription; Infinity = the person never finishes checkout.
 */
function ctxWith(
  appearsAfter: number,
  flags: Partial<WizardFlags> = {},
  linkError?: unknown,
  paidError?: unknown,
): { ctx: WizardContext; calls: Calls } {
  const ctx = createContext({ yes: false, dryRun: false, verbose: false, ...flags });
  ctx.answers.workspace = { id: 'w1', title: 'Agency', botsLimit: 5, botCount: 0 };
  const calls: Calls = { subscriptionReads: 0 };
  ctx.client = {
    query: async (doc: unknown) => {
      if (String(doc).includes('WizardBillingProducts')) return PRODUCTS;
      calls.subscriptionReads += 1;
      return {
        currentUser: {
          id: 'u1',
          workspace: {
            id: 'w1',
            subscription: calls.subscriptionReads > appearsAfter ? SUBSCRIPTION : null,
          },
        },
      };
    },
    mutate: async (doc: unknown, variables: Record<string, string>) => {
      // The step asks for the trial link first and falls back to the plain one,
      // so the fake has to answer as two different mutations.
      const wantsTrial = String(doc).includes('WithTrial');
      if (wantsTrial && linkError) throw linkError;
      if (!wantsTrial && paidError) throw paidError;
      calls.linkVariables = variables;
      calls.linkKind = wantsTrial ? 'trial' : 'paid';
      const link = trialLink ?? CHECKOUT_URL;
      return wantsTrial ? { stripeCreatePaymentLinkWithTrial: link } : { stripeCreatePaymentLink: PAID_URL };
    },
  } as unknown as WizardContext['client'];
  return { ctx, calls };
}

beforeEach(() => {
  warnings.length = 0;
  notes.length = 0;
  trialLink = undefined;
  confirmAnswers.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('trial', () => {
  it('leaves a subscribed workspace alone', async () => {
    const { ctx, calls } = ctxWith(0);
    await trial(ctx);
    expect(ctx.answers.trialStarted).toBe(true);
    expect(calls.linkVariables).toBeUndefined();
    expect(notes).toHaveLength(0);
  });

  it('prints checkout on the monthly AI plan and waits for the trial', async () => {
    const { ctx, calls } = ctxWith(3);
    const done = trial(ctx);
    // The link is on screen before anything is waited for.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(notes.join('\n')).toContain(CHECKOUT_URL);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    expect(calls.linkVariables).toMatchObject({ workspaceID: 'w1', pricingID: 'pricing-monthly' });
    expect(notes.join('\n')).toContain(CHECKOUT_URL);
    expect(ctx.answers.trialStarted).toBe(true);
    expect(warnings).toHaveLength(0);
  });

  it('prints an address it will not dress up as a name', async () => {
    // The link is the server's string, and a name is only ever put on an https
    // one: a word that hides where it goes is worth nothing on a scheme the
    // terminal would hand to the desktop.
    vi.stubEnv('FORCE_HYPERLINK', '1');
    trialLink = 'file:///etc/passwd';
    const { ctx } = ctxWith(3);
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    expect(notes.join('\n')).not.toContain('Chatfuel checkout');
    expect(notes.join('\n')).toContain('file:///etc/passwd');
  });

  it('puts the coupon where it cannot be missed', async () => {
    const { ctx } = ctxWith(1);
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    const printed = notes.join('\n');
    expect(printed).toContain('additional $100 in credits');
    expect(printed).toContain('Enter it in the promo field at checkout.');
    // Only the code is framed — a boxed sentence reads as the thing to type.
    const framed = printed.split('\n').find((line) => line.includes('│') && line.includes('SDK'));
    // eslint-disable-next-line no-control-regex -- the escape byte is exactly what an ANSI sequence starts with
    expect(framed?.replace(/\u001b\[[0-9;]*m/g, '').replace(/[│\s]/g, '')).toBe('SDK');
  });

  it('offers a way out, and keeps waiting when it is declined', async () => {
    const { ctx } = ctxWith(Number.POSITIVE_INFINITY);
    confirmAnswers.push(false, true);
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(12 * 60_000);
    await done;
    expect(confirmAnswers).toHaveLength(0);
    expect(ctx.answers.trialStarted).toBe(false);
    expect(warnings.join('\n')).toMatch(/will not answer until the workspace has a plan/);
  });

  it('never blocks a non-interactive run', async () => {
    const { ctx, calls } = ctxWith(Number.POSITIVE_INFINITY, { yes: true });
    await trial(ctx);
    expect(calls.linkVariables).toBeDefined();
    expect(notes.join('\n')).toContain(CHECKOUT_URL);
    expect(ctx.answers.trialStarted).toBe(false);
    expect(warnings.join('\n')).toMatch(/will not answer until the workspace has a plan/);
  });

  it('creates nothing on a --dry-run', async () => {
    const { ctx, calls } = ctxWith(Number.POSITIVE_INFINITY, { dryRun: true });
    await trial(ctx);
    // The subscription read is free; the checkout session is not.
    expect(calls.subscriptionReads).toBe(1);
    expect(calls.linkVariables).toBeUndefined();
    expect(ctx.answers.trialStarted).toBe(false);
  });

  it('sells the plan when the account has already had its trial', async () => {
    // The trial is the account's, not the workspace's, so this is the ordinary
    // second-workspace case: the same checkout, minus the free days.
    const { ctx, calls } = ctxWith(
      2,
      {},
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'TrialNotAllowed' } }]),
    );
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    expect(calls.linkKind).toBe('paid');
    const printed = notes.join('\n');
    expect(printed).toContain(PAID_URL);
    expect(printed).not.toContain(CHECKOUT_URL);
    // Same offer either way: which mutation answered is not the reader's problem.
    expect(printed).toContain('Activate your trial, and use promo code SDK');
    expect(printed).toContain('additional $100 in credits');
    expect(ctx.answers.trialStarted).toBe(true);
  });

  it('says the workspace has no plan when checkout is left unfinished', async () => {
    const { ctx } = ctxWith(
      Number.POSITIVE_INFINITY,
      { yes: true },
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'TrialNotAllowed' } }]),
    );
    await trial(ctx);
    expect(ctx.answers.trialStarted).toBe(false);
    expect(warnings.join('\n')).toMatch(/will not answer until the workspace has a plan/);
  });

  it('stops when checkout is refused for a reason somebody must go and fix', async () => {
    const { ctx } = ctxWith(
      Number.POSITIVE_INFINITY,
      {},
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'TrialNotAllowed' } }]),
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'BillingPlatformNotAllowed' } }]),
    );
    await expect(trial(ctx)).rejects.toThrow(/not billed through Stripe/);
  });

  it('stops when the workspace is not billed through Stripe', async () => {
    const { ctx } = ctxWith(
      Number.POSITIVE_INFINITY,
      {},
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'BillingPlatformNotAllowed' } }]),
    );
    await expect(trial(ctx)).rejects.toThrow(/not billed through Stripe/);
  });

  it('stops when the workspace holds more bots than the plan allows', async () => {
    const { ctx } = ctxWith(
      Number.POSITIVE_INFINITY,
      {},
      new ChatfuelGraphQLError([{ message: 'nope', extensions: { code: 'TooManyBotsInWorkspace' } }]),
    );
    await expect(trial(ctx)).rejects.toThrow(/more bots than this plan allows/);
  });
});

/**
 * The same block through a terminal that renders OSC 8, where the address is
 * replaced by a name. Nothing opens a browser, so that name is the way in: it
 * is printed only where the terminal can be clicked on, and everywhere else the
 * address itself is what goes out.
 */
describe('the checkout link, named', () => {
  const ESC = String.fromCharCode(27);
  /** What a person actually reads, with the escapes taken back out. */
  const visible = (): string => stripVTControlCharacters(notes.join('\n'));

  it('prints a name where the terminal can follow one', async () => {
    vi.stubEnv('FORCE_HYPERLINK', '1');
    const { ctx } = ctxWith(1);
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    expect(notes.join('\n')).toContain('Chatfuel checkout');
    expect(notes.join('\n')).toContain(ESC);
    // The address is behind the name, not beside it.
    expect(visible()).not.toContain(CHECKOUT_URL);
  });

  it('prints the address where it cannot', async () => {
    vi.stubEnv('FORCE_HYPERLINK', '0');
    const { ctx } = ctxWith(1);
    const done = trial(ctx);
    await vi.advanceTimersByTimeAsync(30_000);
    await done;
    expect(notes.join('\n')).not.toContain('Chatfuel checkout');
    expect(visible()).toContain(CHECKOUT_URL);
  });

  it('says the same thing on a run that asks nothing', async () => {
    vi.stubEnv('FORCE_HYPERLINK', '1');
    const { ctx } = ctxWith(Number.POSITIVE_INFINITY, { yes: true });
    await trial(ctx);
    expect(notes.join('\n')).toContain('Chatfuel checkout');
    expect(visible()).not.toContain(CHECKOUT_URL);
  });
});
