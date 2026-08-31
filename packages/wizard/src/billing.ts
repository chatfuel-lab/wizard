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
  price: string;
  intervalPrice: string;
  currency: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  featureSet: 'NoAI' | 'All';
  isActive: boolean;
  isSelectable: boolean;
  pricingList: Pricing[];
}

export interface BillingProductsData {
  env: {
    stripeProductsSchema: {
      business: Product[];
    };
  };
}

/**
 * The catalogue the checkout link is built from. `business` is the list this
 * wizard reads.
 */
export const BillingProductsDocument = new TypedDocumentString(`
query WizardBillingProducts {
  env {
    stripeProductsSchema {
      business {
        id
        name
        featureSet
        isActive
        isSelectable
        pricingList {
          id
          intervalUnit
          intervalCount
          price
          intervalPrice
          currency
          isActive
        }
      }
    }
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

/**
 * The monthly plan out of the catalogue, or undefined when the catalogue holds
 * none. Archived and unsubscribable entries are dropped, and so is anything
 * without the AI feature set — a plan the AI cannot run on is not a plan worth
 * starting a trial of. Cheapest first, so a catalogue carrying several monthly
 * tiers offers the one somebody would actually try.
 */
export function pickMonthlyPricing(products: Product[]): Pricing | undefined {
  return products
    .filter((product) => product.isActive && product.isSelectable && product.featureSet === 'All')
    .flatMap((product) => product.pricingList)
    .filter((pricing) => pricing.isActive)
    .sort((a, b) => Number(a.intervalPrice) - Number(b.intervalPrice))
    .find((pricing) => pricing.intervalUnit === 'Month' && pricing.intervalCount === 1);
}
