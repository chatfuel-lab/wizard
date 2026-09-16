import { TypedDocumentString } from '@chatfuel/api-client/generated/core';

/**
 * The subscription reads the wizard makes, hand-written.
 *
 * These documents are not in the SDL the core skill bundles, so codegen cannot
 * produce them, and they must never be added to an operations.graphql: a
 * scaffolded app has no business reading anybody's plan, and these belong to
 * the wizard alone. Written by hand against the same TypedDocumentString the
 * generated ones use, they still ride the ordinary client and keep its
 * throttle, its nested-error unwrapping and its Unauthorized handling.
 *
 * Why the wizard needs them at all: a workspace with no subscription has no
 * AI, so the finished app answers nothing until somebody has been through
 * checkout.
 */

export interface WorkspaceRef {
  id: string;
  title: string;
  botsLimit: number;
}

export interface WorkspaceCreateData {
  workspaceCreate: WorkspaceRef;
}

/**
 * Creates an empty workspace with a default title. The account's own limit
 * applies (TooManyWorkspaces).
 *
 * `bots` is deliberately not selected. Reading it back on a workspace this new
 * can answer with an error and no data, and the workspace is created either
 * way — so selecting a field that is certain to be empty would cost a real
 * workspace, orphaned, on every run.
 */
export const WorkspaceCreateDocument = new TypedDocumentString(`
mutation WizardWorkspaceCreate {
  workspaceCreate {
    id
    title
    botsLimit
  }
}`) as unknown as TypedDocumentString<WorkspaceCreateData, Record<string, never>>;

/** Every status the API can report. Any of them means checkout has happened. */
export type SubscriptionStatus = 'Active' | 'PaymentFailed' | 'Ended' | 'Pause' | 'Canceled' | 'WillCanceled';

export interface WorkspaceSubscriptionData {
  currentUser: {
    id: string;
    workspace: {
      id: string;
      subscription: {
        id: string;
        status: SubscriptionStatus;
        isOnTrialPeriod: boolean;
      } | null;
    };
  };
}

export interface WorkspaceSubscriptionVars {
  workspaceID: string;
}

/**
 * `workspace(id:)` hangs off currentUser — there is no root workspace field —
 * and `subscription` is null for a workspace that has never been through
 * checkout. Null is the whole question this step exists to ask.
 */
export const WorkspaceSubscriptionDocument = new TypedDocumentString(`
query WizardWorkspaceSubscription($workspaceID: WorkspaceID!) {
  currentUser {
    id
    workspace(id: $workspaceID) {
      id
      subscription {
        id
        status
        isOnTrialPeriod
      }
    }
  }
}`) as unknown as TypedDocumentString<WorkspaceSubscriptionData, WorkspaceSubscriptionVars>;

export interface Pricing {
  id: string;
  intervalUnit: 'Day' | 'Week' | 'Month' | 'Year';
  intervalCount: number;
  /** The whole period's price. */
  price: string;
  /** The price per interval unit — the same number as `price` on a monthly plan. */
  intervalPrice: string;
  /** The API's own casing, e.g. `Usd`. */
  currency: string;
  /** AI credits, in USD, granted by the base subscription for the whole period. */
  credits: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  /** How many bots the workspace may hold on this plan; 0 = no limit. */
  workspaceBotsLimit: number;
  pricingList: Pricing[];
}

/** The two lists the catalogue sells from. `free` exists too, and is never offered. */
export type PlanGroup = 'business' | 'agency';

export type ProductsSchema = Record<PlanGroup, Product[]>;

export interface BillingProductsData {
  env: {
    stripeProductsSchema: ProductsSchema;
  };
}

/**
 * The catalogue the checkout link is built from: one Business product and the
 * Agency tiers, which is what the website's paywall offers too.
 *
 * Nothing about availability is selected. `Product.isActive`, `isSelectable`
 * and `featureSet`, and `Pricing.isActive`, are all deprecated in the SDL, and
 * the API has already dropped the first two: a query that asked for them
 * stopped validating, and every run finished with a workspace that had no
 * plan. What the API lists is what it sells.
 */
export const BillingProductsDocument = new TypedDocumentString(`
query WizardBillingProducts {
  env {
    stripeProductsSchema {
      business {
        ...WizardPlanProduct
      }
      agency {
        ...WizardPlanProduct
      }
    }
  }
}
fragment WizardPlanProduct on Product {
  id
  name
  description
  workspaceBotsLimit
  pricingList {
    id
    intervalUnit
    intervalCount
    price
    intervalPrice
    currency
    credits
  }
}`) as unknown as TypedDocumentString<BillingProductsData, Record<string, never>>;

export interface StripeTrialLinkData {
  stripeCreatePaymentLinkWithTrial: string;
}

export interface StripeTrialLinkVars {
  workspaceID: string;
  pricingID: string;
  successURL: string;
  cancelURL: string;
}

/**
 * The Checkout URL comes back as the scalar itself. `trialDays` is deliberately
 * not sent: the server holds the trial length, and a number written here would
 * be a second copy of it, free to drift.
 */
export const StripeTrialLinkDocument = new TypedDocumentString(`
mutation WizardStripeCreatePaymentLinkWithTrial(
  $workspaceID: WorkspaceID!
  $pricingID: PricingID!
  $successURL: String!
  $cancelURL: String!
) {
  stripeCreatePaymentLinkWithTrial(
    workspaceID: $workspaceID
    pricingID: $pricingID
    successURL: $successURL
    cancelURL: $cancelURL
  )
}`) as unknown as TypedDocumentString<StripeTrialLinkData, StripeTrialLinkVars>;

export interface StripePaymentLinkData {
  stripeCreatePaymentLink: string;
}

/**
 * The same checkout, without the free days. A trial belongs to the ACCOUNT, not
 * to the workspace: once it has been used, every workspace opened afterwards is
 * answered `TrialNotAllowed`, and the only way to switch the AI on there is to
 * pay. The variables are the trial mutation's, minus the trial.
 */
export const StripePaymentLinkDocument = new TypedDocumentString(`
mutation WizardStripeCreatePaymentLink(
  $workspaceID: WorkspaceID!
  $pricingID: PricingID!
  $successURL: String!
  $cancelURL: String!
) {
  stripeCreatePaymentLink(
    workspaceID: $workspaceID
    pricingID: $pricingID
    successURL: $successURL
    cancelURL: $cancelURL
  )
}`) as unknown as TypedDocumentString<StripePaymentLinkData, StripeTrialLinkVars>;

/** One line of the plan picker: a product at its monthly price. */
export interface PlanOption {
  group: PlanGroup;
  product: Product;
  pricing: Pricing;
}

const GROUP_ORDER: PlanGroup[] = ['business', 'agency'];

const isMonthly = (pricing: Pricing): boolean => pricing.intervalUnit === 'Month' && pricing.intervalCount === 1;

/**
 * Every plan the picker offers, in the order it offers them: the Business
 * product first, then the Agency tiers, each group cheapest first — the order
 * the website's paywall uses, so a person who has seen one recognises the
 * other. Monthly prices only; a year priced as twelve months is a year.
 *
 * One price per product. A product carrying two monthly prices (a
 * grandfathered one next to the current) is still one tier, and the first
 * entry is the one billing sells. A product with no monthly price is not
 * offered at all.
 *
 * Nothing but `pricingList` is consulted on the way in — see the document
 * above for what happened when a field was.
 */
export function monthlyPlans(schema: ProductsSchema): PlanOption[] {
  return GROUP_ORDER.flatMap((group) =>
    (schema[group] ?? [])
      .flatMap((product) => {
        const pricing = product.pricingList.find(isMonthly);
        return pricing ? [{ group, product, pricing }] : [];
      })
      .sort((a, b) => Number(a.pricing.price) - Number(b.pricing.price)),
  );
}

/**
 * `$20`, `$48.25`, `€15`. The API spells currencies its own way (`Usd`), and a
 * code the runtime does not know falls back to the number and the code, which
 * is still a price somebody can read.
 */
export function formatMoney(amount: string | number, currency: string): string {
  const code = currency.toUpperCase();
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${amount} ${code}`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${code}`;
  }
}

/** `1 bot`, `5 bots`, `unlimited bots` — the limit as a phrase. */
export function botsPhrase(limit: number): string {
  if (limit === 0) return 'unlimited bots';
  return `${limit} bot${limit === 1 ? '' : 's'}`;
}

/** The monthly price, as printed. */
export const planPrice = ({ pricing }: PlanOption): string => formatMoney(pricing.price, pricing.currency);

/** The monthly AI credits, as printed. Credits are denominated in USD. */
export const planCredits = ({ pricing }: PlanOption): string => formatMoney(pricing.credits, 'usd');

/** What a line of the picker says after the name: `$20/mo · $20 AI credits/mo · 1 bot`. */
export function planHint(option: PlanOption): string {
  return `${planPrice(option)}/mo · ${planCredits(option)} AI credits/mo · ${botsPhrase(option.product.workspaceBotsLimit)}`;
}

/** The plan in one breath: `Business — $20/mo, $20 AI credits/mo`. */
export function planSummary(option: PlanOption): string {
  return `${option.product.name} — ${planPrice(option)}/mo, ${planCredits(option)} AI credits/mo`;
}
